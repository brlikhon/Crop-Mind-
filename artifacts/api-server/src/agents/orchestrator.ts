import { LlmAgent, InMemoryRunner } from "@google/adk";
import { ORCHESTRATOR_MODEL, ORCHESTRATOR_MAX_TOKENS } from "./config.js";
import {
  createOrchestratorSession,
  addFinding,
  addTrace,
  type OrchestratorSession,
} from "./session.js";
import type {
  FarmerQuery,
  OrchestratorResult,
  OrchestratorDecision,
  ConflictResolution,
  DiagnosisResult,
  WeatherAssessment,
  MarketIntelligence,
  TreatmentProtocol,
  McpToolCallEntry,
  AgentFinding,
  AgentTrace,
  ImageInput,
} from "./types.js";
import { runCropDiseaseAgent } from "./crop-disease-agent.js";
import { runWeatherAgent } from "./weather-agent.js";
import { runMarketAgent } from "./market-agent.js";
import { runTreatmentAgent } from "./treatment-agent.js";

const PARSE_PROMPT = `You are a query parser for an agricultural intelligence system. Extract structured information from a farmer's natural language query.

You must respond with ONLY valid JSON matching this schema:
{
  "cropType": "string - the type of crop mentioned (e.g., rice, tomato, wheat)",
  "region": "string - the specific region or area mentioned, or 'unspecified' if not stated",
  "country": "string - the country mentioned or inferred, or 'unspecified' if unclear",
  "symptoms": ["string array - list of individual symptoms or problems described"],
  "additionalContext": "string - any other relevant details (planting date, soil type, previous treatments, etc.)",
  "queryIntent": "string - one of: 'disease_diagnosis', 'general_advice', 'market_inquiry', 'weather_concern', 'treatment_request'"
}

If any field is not mentioned, make a reasonable inference based on context or use 'unspecified'. Always extract at least one symptom from the description.`;

const parserAgent = new LlmAgent({
  name: "QueryParser",
  model: ORCHESTRATOR_MODEL,
  instruction: PARSE_PROMPT,
  generateContentConfig: {
    maxOutputTokens: ORCHESTRATOR_MAX_TOKENS,
    temperature: 0.1,
  },
});

const parserRunner = new InMemoryRunner({ agent: parserAgent, appName: "cropmind" });

const SYNTHESIS_PROMPT = `You are the Chief Agricultural Advisor synthesising findings from specialised agents into a final, unified recommendation for a smallholder farmer.

You may receive findings from up to four agents: CropDiseaseAgent, WeatherAdaptationAgent, MarketSubsidyAgent, and TreatmentProtocolAgent. Some agents may have been skipped if their analysis was not relevant to the query.

You will also receive orchestrator decisions explaining why certain agents were invoked, skipped, or overridden, and any conflict resolutions between agents.

Structure your response as a single coherent paragraph (3-5 sentences) that:
1. States the diagnosis clearly (if available)
2. Acknowledges weather and economic factors (if assessed)
3. Notes any conflicts that were resolved and how
4. Gives the single most important action to take first
5. Provides reassurance and next steps

Write at a level that any farmer can understand. Be direct and practical.`;

const synthesisAgent = new LlmAgent({
  name: "SynthesisAgent",
  model: ORCHESTRATOR_MODEL,
  instruction: SYNTHESIS_PROMPT,
  generateContentConfig: {
    maxOutputTokens: ORCHESTRATOR_MAX_TOKENS,
    temperature: 0.5,
  },
});

const synthesisRunner = new InMemoryRunner({ agent: synthesisAgent, appName: "cropmind" });

interface ParsedQuery extends FarmerQuery {
  queryIntent: string;
}

async function parseQuery(rawQuery: string, preferredLanguage: string): Promise<ParsedQuery> {
  let content = "";
  const events = parserRunner.runEphemeral({
    userId: `parser-${Date.now()}`,
    newMessage: { role: "user", parts: [{ text: rawQuery }] },
  });

  for await (const event of events) {
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if ("text" in part && part.text) content += part.text;
      }
    }
  }

  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return {
      rawQuery,
      preferredLanguage,
      cropType: parsed.cropType ?? "unspecified",
      region: parsed.region ?? "unspecified",
      country: parsed.country ?? "unspecified",
      symptoms: parsed.symptoms ?? ["unspecified symptoms"],
      additionalContext: parsed.additionalContext ?? "",
      queryIntent: parsed.queryIntent ?? "disease_diagnosis",
    };
  } catch {
    return {
      rawQuery,
      preferredLanguage,
      cropType: "unspecified",
      region: "unspecified",
      country: "unspecified",
      symptoms: [rawQuery],
      additionalContext: "",
      queryIntent: "disease_diagnosis",
    };
  }
}

function shouldInvokeWeather(query: ParsedQuery): { invoke: boolean; rationale: string } {
  if (query.region === "unspecified" && query.country === "unspecified") {
    return {
      invoke: false,
      rationale: "No region or country specified — weather assessment would lack geographic context.",
    };
  }
  if (query.queryIntent === "market_inquiry") {
    return {
      invoke: false,
      rationale: "Query intent is purely market-focused — weather assessment is not relevant.",
    };
  }
  return {
    invoke: true,
    rationale: `Region (${query.region}, ${query.country}) is known — weather conditions are relevant to diagnosis and treatment timing.`,
  };
}

function shouldInvokeMarket(query: ParsedQuery): { invoke: boolean; rationale: string } {
  if (query.cropType === "unspecified") {
    return {
      invoke: false,
      rationale: "No crop type specified — cannot provide meaningful market pricing without knowing the commodity.",
    };
  }
  if (query.queryIntent === "weather_concern") {
    return {
      invoke: false,
      rationale: "Query intent is purely weather-focused — market analysis is not relevant.",
    };
  }
  return {
    invoke: true,
    rationale: `Crop type (${query.cropType}) and country (${query.country}) are known — market pricing and subsidy data can inform the decision.`,
  };
}

function shouldInvokeTreatment(query: ParsedQuery, hasDiagnosis: boolean): { invoke: boolean; rationale: string } {
  if (!hasDiagnosis) {
    return {
      invoke: false,
      rationale: "Crop disease diagnosis failed — cannot generate treatment protocol without a diagnosis.",
    };
  }
  if (query.queryIntent === "market_inquiry") {
    return {
      invoke: false,
      rationale: "Query intent is market-focused — farmer is asking about pricing, not treatment.",
    };
  }
  return {
    invoke: true,
    rationale: "Diagnosis is available — treatment protocol can synthesise findings into actionable steps.",
  };
}

type FindAgentResult = { status: string; confidence: number; summary: string; details: Record<string, unknown> } | undefined;

function findAgent(findings: AgentFinding[], name: string): FindAgentResult {
  return findings.find((f) => f.agentName === name);
}

function resolveConflicts(
  decisions: OrchestratorDecision[],
  diagnosisFinding: FindAgentResult,
  weatherFinding: FindAgentResult,
  marketFinding: FindAgentResult
): ConflictResolution[] {
  const conflicts: ConflictResolution[] = [];

  if (diagnosisFinding?.status === "success" && weatherFinding?.status === "success") {
    const diagnosisText = diagnosisFinding.summary.toLowerCase();
    const weatherText = weatherFinding.summary.toLowerCase();

    const diagnosisSuggestsDry = diagnosisText.includes("dry") || diagnosisText.includes("drought") || diagnosisText.includes("wilt");
    const weatherSuggestsWet = weatherText.includes("rain") || weatherText.includes("monsoon") || weatherText.includes("flood") || weatherText.includes("humid");

    if (diagnosisSuggestsDry && weatherSuggestsWet) {
      conflicts.push({
        conflictType: "moisture_contradiction",
        agentA: "CropDiseaseAgent",
        agentB: "WeatherAdaptationAgent",
        resolution: "Weather data takes precedence for current conditions; diagnosis may indicate historical stress.",
        rationale: "Real-time weather data is more reliable than symptom-inferred moisture conditions.",
        chosenAgent: "WeatherAdaptationAgent",
      });

      decisions.push({
        agentName: "CropDiseaseAgent",
        action: "overridden",
        rationale: "Moisture-related aspects overridden by current weather data — treatment timing adjusted.",
        details: { conflictType: "moisture_contradiction" },
      });
    }
  }

  if (diagnosisFinding?.status === "success" && marketFinding?.status === "success") {
    const marketText = marketFinding.summary.toLowerCase();
    const diagnosisConfidence = diagnosisFinding.confidence;

    const marketSaysReplant = marketText.includes("replant") || marketText.includes("abandon");
    const diagnosisIsHighConfidence = diagnosisConfidence >= 0.7;

    if (marketSaysReplant && diagnosisIsHighConfidence) {
      const treatmentLikely = diagnosisFinding.summary.toLowerCase().includes("treat");
      if (treatmentLikely) {
        const chosenAgent = diagnosisConfidence >= 0.8 ? "CropDiseaseAgent" : "MarketSubsidyAgent";
        conflicts.push({
          conflictType: "treat_vs_replant",
          agentA: "CropDiseaseAgent",
          agentB: "MarketSubsidyAgent",
          resolution:
            chosenAgent === "CropDiseaseAgent"
              ? "High-confidence diagnosis favors treatment — crop can likely be saved."
              : "Market economics favor replanting despite treatable diagnosis.",
          rationale: `Disease diagnosis confidence is ${(diagnosisConfidence * 100).toFixed(0)}%. ${chosenAgent === "CropDiseaseAgent" ? "Treatment is likely successful and economically justified." : "Treatment outcome is uncertain and replanting is economically safer."}`,
          chosenAgent,
        });

        decisions.push({
          agentName: chosenAgent === "CropDiseaseAgent" ? "MarketSubsidyAgent" : "CropDiseaseAgent",
          action: "overridden",
          rationale: `Overridden in favor of ${chosenAgent}'s assessment based on confidence weighting.`,
          details: { conflictType: "treat_vs_replant", diagnosisConfidence },
        });
      }
    }
  }

  return conflicts;
}

async function runAgentWithTrace(
  session: OrchestratorSession,
  agentName: string,
  agentFn: (session: OrchestratorSession) => Promise<AgentFinding>
): Promise<AgentFinding> {
  const startedAt = Date.now();
  const input = {
    query: session.query,
    existingFindings: session.findings.map((f) => ({
      agentName: f.agentName,
      summary: f.summary,
    })),
  };

  let finding: AgentFinding;
  try {
    finding = await agentFn(session);
  } catch (error) {
    finding = {
      agentName,
      status: "error",
      confidence: 0,
      summary: `Agent ${agentName} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      details: {},
      reasoning: "Agent execution failed",
    };
  }

  const completedAt = Date.now();
  const trace: AgentTrace = {
    agentName,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
    input,
    output: finding,
  };

  addFinding(session, finding);
  addTrace(session, trace);

  return finding;
}

export type OrchestratorEvent =
  | { type: "agent_started"; agentName: string }
  | { type: "agent_completed"; agentName: string; trace: AgentTrace }
  | { type: "mcp_tool_call"; call: McpToolCallEntry }
  | { type: "synthesis_started" }
  | { type: "complete"; result: OrchestratorResult };

export async function runOrchestrator(
  rawQuery: string,
  onEvent?: (event: OrchestratorEvent) => void,
  imageData?: ImageInput,
  preferredLanguage = "English"
): Promise<OrchestratorResult> {
  const emit = onEvent ?? (() => {});
  const startTime = Date.now();
  const decisions: OrchestratorDecision[] = [];

  const parsedQuery = await parseQuery(rawQuery, preferredLanguage);
  const farmerQuery: FarmerQuery = {
    rawQuery: parsedQuery.rawQuery,
    preferredLanguage: parsedQuery.preferredLanguage,
    cropType: parsedQuery.cropType,
    region: parsedQuery.region,
    country: parsedQuery.country,
    symptoms: parsedQuery.symptoms,
    additionalContext: parsedQuery.additionalContext,
  };
  const session = createOrchestratorSession(farmerQuery);

  // Phase 1: Disease diagnosis (always first)
  decisions.push({
    agentName: "CropDiseaseAgent",
    action: "invoked",
    rationale: "CropDiseaseAgent is always invoked as the primary diagnostic agent.",
  });
  emit({ type: "agent_started", agentName: "CropDiseaseAgent" });
  const diseaseFinding = await runAgentWithTrace(session, "CropDiseaseAgent", (s) => runCropDiseaseAgent(s, imageData));
  emit({ type: "agent_completed", agentName: "CropDiseaseAgent", trace: session.traces[session.traces.length - 1] });

  const diagnosisSucceeded = diseaseFinding.status === "success";
  decisions.push({
    agentName: "CropDiseaseAgent",
    action: "accepted",
    rationale: diagnosisSucceeded
      ? `Diagnosis completed with ${(diseaseFinding.confidence * 100).toFixed(0)}% confidence.`
      : "Diagnosis returned with errors but partial findings may still inform other agents.",
    details: { confidence: diseaseFinding.confidence },
  });

  // Phase 2: Weather + Market agents in parallel
  const weatherDecision = shouldInvokeWeather(parsedQuery);
  const marketDecision = shouldInvokeMarket(parsedQuery);

  const parallelTasks: Promise<void>[] = [];

  if (weatherDecision.invoke) {
    decisions.push({ agentName: "WeatherAdaptationAgent", action: "invoked", rationale: weatherDecision.rationale });
    emit({ type: "agent_started", agentName: "WeatherAdaptationAgent" });
    parallelTasks.push(
      runAgentWithTrace(session, "WeatherAdaptationAgent", runWeatherAgent).then((f) => {
        emit({ type: "agent_completed", agentName: "WeatherAdaptationAgent", trace: session.traces.find(t => t.agentName === "WeatherAdaptationAgent")! });
        const mcpCalls = (f.details?.mcpToolCalls as McpToolCallEntry[]) ?? [];
        mcpCalls.forEach(c => emit({ type: "mcp_tool_call", call: c }));
        decisions.push({
          agentName: "WeatherAdaptationAgent",
          action: "accepted",
          rationale: f.status === "success"
            ? `Weather assessment completed (${(f.confidence * 100).toFixed(0)}% confidence).`
            : `Weather assessment returned with status '${f.status}'.`,
        });
      })
    );
  } else {
    decisions.push({ agentName: "WeatherAdaptationAgent", action: "skipped", rationale: weatherDecision.rationale });
  }

  if (marketDecision.invoke) {
    decisions.push({ agentName: "MarketSubsidyAgent", action: "invoked", rationale: marketDecision.rationale });
    emit({ type: "agent_started", agentName: "MarketSubsidyAgent" });
    parallelTasks.push(
      runAgentWithTrace(session, "MarketSubsidyAgent", runMarketAgent).then((f) => {
        emit({ type: "agent_completed", agentName: "MarketSubsidyAgent", trace: session.traces.find(t => t.agentName === "MarketSubsidyAgent")! });
        const mcpCalls = (f.details?.mcpToolCalls as McpToolCallEntry[]) ?? [];
        mcpCalls.forEach(c => emit({ type: "mcp_tool_call", call: c }));
        decisions.push({
          agentName: "MarketSubsidyAgent",
          action: "accepted",
          rationale: f.status === "success"
            ? `Market intelligence completed (${(f.confidence * 100).toFixed(0)}% confidence).`
            : `Market analysis returned with status '${f.status}'.`,
        });
      })
    );
  } else {
    decisions.push({ agentName: "MarketSubsidyAgent", action: "skipped", rationale: marketDecision.rationale });
  }

  await Promise.all(parallelTasks);

  // Phase 3: Conflict resolution
  const diagnosisFindingRef = findAgent(session.findings, "CropDiseaseAgent");
  const weatherFindingRef = findAgent(session.findings, "WeatherAdaptationAgent");
  const marketFindingRef = findAgent(session.findings, "MarketSubsidyAgent");
  const conflictResolutions = resolveConflicts(decisions, diagnosisFindingRef, weatherFindingRef, marketFindingRef);

  // Phase 4: Treatment protocol (depends on diagnosis)
  const treatmentDecision = shouldInvokeTreatment(parsedQuery, diagnosisSucceeded);
  if (treatmentDecision.invoke) {
    decisions.push({ agentName: "TreatmentProtocolAgent", action: "invoked", rationale: treatmentDecision.rationale });
    emit({ type: "agent_started", agentName: "TreatmentProtocolAgent" });
    const treatmentFinding = await runAgentWithTrace(session, "TreatmentProtocolAgent", runTreatmentAgent);
    emit({ type: "agent_completed", agentName: "TreatmentProtocolAgent", trace: session.traces.find(t => t.agentName === "TreatmentProtocolAgent")! });
    decisions.push({
      agentName: "TreatmentProtocolAgent",
      action: "accepted",
      rationale: treatmentFinding.status === "success"
        ? `Treatment protocol synthesised (${(treatmentFinding.confidence * 100).toFixed(0)}% confidence).`
        : `Treatment protocol returned with status '${treatmentFinding.status}'.`,
    });
  } else {
    decisions.push({ agentName: "TreatmentProtocolAgent", action: "skipped", rationale: treatmentDecision.rationale });
  }

  // Phase 5: Synthesis via ADK runner
  emit({ type: "synthesis_started" });

  const findingsSummary = session.findings
    .map((f) => `[${f.agentName}] (confidence: ${(f.confidence * 100).toFixed(0)}%, status: ${f.status}): ${f.summary}`)
    .join("\n\n");

  const decisionsSummary = decisions
    .map((d) => `[Orchestrator → ${d.agentName}] ${d.action}: ${d.rationale}`)
    .join("\n");

  const conflictsSummary = conflictResolutions.length > 0
    ? "\n\nConflict Resolutions:\n" + conflictResolutions.map((c) => `- ${c.conflictType}: ${c.resolution}`).join("\n")
    : "";

  let finalRecommendation = "";
  const synthesisEvents = synthesisRunner.runEphemeral({
    userId: `synthesis-${Date.now()}`,
    newMessage: {
      role: "user",
      parts: [{ text: `Farmer's question: "${rawQuery}"\n\nPreferred response language: ${preferredLanguage}. Write the farmer-facing final recommendation in this language while keeping crop names, product names, and source URLs clear.\n\nAgent findings:\n${findingsSummary}\n\nOrchestrator decisions:\n${decisionsSummary}${conflictsSummary}` }],
    },
  });

  for await (const event of synthesisEvents) {
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if ("text" in part && part.text) finalRecommendation += part.text;
      }
    }
  }

  if (!finalRecommendation) {
    finalRecommendation = "Unable to generate recommendation. Please consult your local agricultural extension office.";
  }

  // Build result
  function clampConfidence(val: unknown): number {
    const n = typeof val === "number" ? val : 0;
    if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  const validConfidences = session.findings.map((f) => clampConfidence(f.confidence)).filter((c) => c > 0);
  const avgConfidence = validConfidences.length > 0
    ? validConfidences.reduce((sum, c) => sum + c, 0) / validConfidences.length
    : 0;

  const treatmentFindingRef = findAgent(session.findings, "TreatmentProtocolAgent");

  const allMcpCalls: McpToolCallEntry[] = [];
  for (const finding of session.findings) {
    const calls = finding.details?.mcpToolCalls as McpToolCallEntry[] | undefined;
    if (calls && Array.isArray(calls)) allMcpCalls.push(...calls);
  }

  const result: OrchestratorResult = {
    sessionId: session.id,
    query: farmerQuery,
    diagnosis: null,
    weatherAssessment: null,
    marketIntelligence: null,
    treatmentProtocol: null,
    finalRecommendation,
    confidenceScore: Math.round(avgConfidence * 100) / 100,
    traces: session.traces,
    orchestratorDecisions: decisions,
    conflictResolutions,
    mcpToolCalls: allMcpCalls,
    totalDurationMs: Date.now() - startTime,
  };

  if (diagnosisFindingRef?.status === "success" && diagnosisFindingRef.details?.diagnosis) {
    result.diagnosis = diagnosisFindingRef.details.diagnosis as DiagnosisResult;
  }
  if (weatherFindingRef?.status === "success" && weatherFindingRef.details?.weatherAssessment) {
    result.weatherAssessment = weatherFindingRef.details.weatherAssessment as WeatherAssessment;
  }
  if (marketFindingRef?.status === "success" && marketFindingRef.details?.marketIntelligence) {
    result.marketIntelligence = marketFindingRef.details.marketIntelligence as MarketIntelligence;
  }
  if (treatmentFindingRef?.status === "success" && treatmentFindingRef.details?.treatmentProtocol) {
    result.treatmentProtocol = treatmentFindingRef.details.treatmentProtocol as TreatmentProtocol;
  }

  emit({ type: "complete", result });
  return result;
}
