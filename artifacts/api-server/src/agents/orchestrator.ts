import { openai } from "@workspace/integrations-openai-ai-server";
import { AGENT_MODEL, ORCHESTRATOR_MAX_TOKENS } from "./config.js";
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
} from "./types.js";
import { createSession, runAgentWithTrace } from "./session.js";
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

interface ParsedQuery extends FarmerQuery {
  queryIntent: string;
}

async function parseQuery(rawQuery: string): Promise<ParsedQuery> {
  const response = await openai.chat.completions.create({
    model: AGENT_MODEL,
    max_completion_tokens: ORCHESTRATOR_MAX_TOKENS,
    messages: [
      { role: "system", content: PARSE_PROMPT },
      { role: "user", content: rawQuery },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content);
    return {
      rawQuery,
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
      rationale: "No region or country specified in the query — weather assessment would lack geographic context and produce unreliable results.",
    };
  }
  if (query.queryIntent === "market_inquiry") {
    return {
      invoke: false,
      rationale: "Query intent is purely market-focused — weather assessment is not relevant to a pricing/subsidy inquiry.",
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
      rationale: "No crop type specified — cannot provide meaningful market pricing or subsidy information without knowing the commodity.",
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
    rationale: `Crop type (${query.cropType}) and country (${query.country}) are known — market pricing and subsidy data can inform treat-vs-replant decision.`,
  };
}

function shouldInvokeTreatment(query: ParsedQuery, hasDiagnosis: boolean): { invoke: boolean; rationale: string } {
  if (!hasDiagnosis) {
    return {
      invoke: false,
      rationale: "Crop disease diagnosis failed or returned no actionable finding — cannot generate a treatment protocol without a diagnosis.",
    };
  }
  if (query.queryIntent === "market_inquiry") {
    return {
      invoke: false,
      rationale: "Query intent is market-focused — farmer is asking about pricing/subsidies, not treatment protocols.",
    };
  }
  return {
    invoke: true,
    rationale: "Diagnosis is available — treatment protocol can synthesise findings from all preceding agents into actionable steps.",
  };
}

function resolveConflicts(
  decisions: OrchestratorDecision[],
  diagnosisFinding: ReturnType<typeof findAgent>,
  weatherFinding: ReturnType<typeof findAgent>,
  marketFinding: ReturnType<typeof findAgent>
): ConflictResolution[] {
  const conflicts: ConflictResolution[] = [];

  if (
    diagnosisFinding?.status === "success" &&
    weatherFinding?.status === "success"
  ) {
    const diagnosisText = diagnosisFinding.summary.toLowerCase();
    const weatherText = weatherFinding.summary.toLowerCase();

    const diagnosisSuggestsDry =
      diagnosisText.includes("dry") || diagnosisText.includes("drought") || diagnosisText.includes("wilt");
    const weatherSuggestsWet =
      weatherText.includes("rain") || weatherText.includes("monsoon") || weatherText.includes("flood") || weatherText.includes("humid");

    if (diagnosisSuggestsDry && weatherSuggestsWet) {
      conflicts.push({
        conflictType: "moisture_contradiction",
        agentA: "CropDiseaseAgent",
        agentB: "WeatherAdaptationAgent",
        resolution: "Weather data takes precedence for current conditions; diagnosis may indicate historical stress rather than current state.",
        rationale: "Real-time weather data is more reliable than symptom-inferred moisture conditions. The disease diagnosis remains valid but treatment timing should defer to actual weather.",
        chosenAgent: "WeatherAdaptationAgent",
      });

      decisions.push({
        agentName: "CropDiseaseAgent",
        action: "overridden",
        rationale: "Moisture-related aspects of diagnosis overridden by current weather data — treatment timing adjusted to actual conditions.",
        details: { conflictType: "moisture_contradiction" },
      });
    }
  }

  if (
    diagnosisFinding?.status === "success" &&
    marketFinding?.status === "success"
  ) {
    const marketText = marketFinding.summary.toLowerCase();
    const diagnosisConfidence = diagnosisFinding.confidence;

    const marketSaysReplant =
      marketText.includes("replant") || marketText.includes("abandon");
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
              ? "High-confidence diagnosis favors treatment — crop can likely be saved. Market replant recommendation overridden."
              : "Market economics favor replanting despite treatable diagnosis — cost-benefit analysis suggests replanting is more viable.",
          rationale: `Disease diagnosis confidence is ${(diagnosisConfidence * 100).toFixed(0)}%. ${chosenAgent === "CropDiseaseAgent" ? "At this confidence level, treatment is likely successful and economically justified." : "At this confidence level, treatment outcome is uncertain and replanting is economically safer."}`,
          chosenAgent,
        });

        decisions.push({
          agentName: chosenAgent === "CropDiseaseAgent" ? "MarketSubsidyAgent" : "CropDiseaseAgent",
          action: "overridden",
          rationale: `${chosenAgent === "CropDiseaseAgent" ? "Market replant" : "Diagnosis treatment"} recommendation overridden in favor of ${chosenAgent}'s assessment based on confidence weighting.`,
          details: { conflictType: "treat_vs_replant", diagnosisConfidence },
        });
      }
    }
  }

  return conflicts;
}

type FindAgentResult = { status: string; confidence: number; summary: string; details: Record<string, unknown> } | undefined;

function findAgent(findings: Array<{ agentName: string; status: string; confidence: number; summary: string; details: Record<string, unknown> }>, name: string): FindAgentResult {
  return findings.find((f) => f.agentName === name);
}

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

export type OrchestratorEvent =
  | { type: "agent_started"; agentName: string }
  | { type: "agent_completed"; agentName: string; trace: AgentTrace }
  | { type: "mcp_tool_call"; call: McpToolCallEntry }
  | { type: "synthesis_started" }
  | { type: "complete"; result: OrchestratorResult };

export async function runOrchestrator(rawQuery: string, onEvent?: (event: OrchestratorEvent) => void): Promise<OrchestratorResult> {
  const emit = onEvent ?? (() => {});
  const startTime = Date.now();
  const decisions: OrchestratorDecision[] = [];

  const parsedQuery = await parseQuery(rawQuery);
  const farmerQuery: FarmerQuery = {
    rawQuery: parsedQuery.rawQuery,
    cropType: parsedQuery.cropType,
    region: parsedQuery.region,
    country: parsedQuery.country,
    symptoms: parsedQuery.symptoms,
    additionalContext: parsedQuery.additionalContext,
  };
  const session = createSession(farmerQuery);

  decisions.push({
    agentName: "CropDiseaseAgent",
    action: "invoked",
    rationale: "CropDiseaseAgent is always invoked as the primary diagnostic agent — it provides the foundation for all other agent decisions.",
  });
  emit({ type: "agent_started", agentName: "CropDiseaseAgent" });
  const diseaseFinding = await runAgentWithTrace(session, "CropDiseaseAgent", runCropDiseaseAgent);
  emit({ type: "agent_completed", agentName: "CropDiseaseAgent", trace: session.traces[session.traces.length - 1] });

  const diagnosisSucceeded = diseaseFinding.status === "success";
  if (diagnosisSucceeded) {
    decisions.push({
      agentName: "CropDiseaseAgent",
      action: "accepted",
      rationale: `Diagnosis completed with ${(diseaseFinding.confidence * 100).toFixed(0)}% confidence. Finding accepted as basis for downstream agents.`,
      details: { confidence: diseaseFinding.confidence },
    });
  } else {
    decisions.push({
      agentName: "CropDiseaseAgent",
      action: "accepted",
      rationale: "Diagnosis returned with errors but partial findings may still inform other agents. Proceeding with available information.",
    });
  }

  const weatherDecision = shouldInvokeWeather(parsedQuery);
  const marketDecision = shouldInvokeMarket(parsedQuery);

  const parallelTasks: Promise<void>[] = [];

  if (weatherDecision.invoke) {
    decisions.push({
      agentName: "WeatherAdaptationAgent",
      action: "invoked",
      rationale: weatherDecision.rationale,
    });
    emit({ type: "agent_started", agentName: "WeatherAdaptationAgent" });
    parallelTasks.push(
      runAgentWithTrace(session, "WeatherAdaptationAgent", runWeatherAgent).then((f) => {
        emit({ type: "agent_completed", agentName: "WeatherAdaptationAgent", trace: session.traces.find(t => t.agentName === "WeatherAdaptationAgent")! });
        const mcpCalls = (f.details?.mcpToolCalls as McpToolCallEntry[]) ?? [];
        mcpCalls.forEach(c => emit({ type: "mcp_tool_call", call: c }));
        if (f.status === "success") {
          decisions.push({
            agentName: "WeatherAdaptationAgent",
            action: "accepted",
            rationale: "Weather assessment completed successfully. Findings incorporated into treatment timing considerations.",
          });
        } else {
          decisions.push({
            agentName: "WeatherAdaptationAgent",
            action: "accepted",
            rationale: `Weather assessment returned with status '${f.status}'. Partial findings may still be used but will not gate downstream agents.`,
            details: { errorStatus: f.status },
          });
        }
      })
    );
  } else {
    decisions.push({
      agentName: "WeatherAdaptationAgent",
      action: "skipped",
      rationale: weatherDecision.rationale,
    });
  }

  if (marketDecision.invoke) {
    decisions.push({
      agentName: "MarketSubsidyAgent",
      action: "invoked",
      rationale: marketDecision.rationale,
    });
    emit({ type: "agent_started", agentName: "MarketSubsidyAgent" });
    parallelTasks.push(
      runAgentWithTrace(session, "MarketSubsidyAgent", runMarketAgent).then((f) => {
        emit({ type: "agent_completed", agentName: "MarketSubsidyAgent", trace: session.traces.find(t => t.agentName === "MarketSubsidyAgent")! });
        const mcpCalls = (f.details?.mcpToolCalls as McpToolCallEntry[]) ?? [];
        mcpCalls.forEach(c => emit({ type: "mcp_tool_call", call: c }));
        if (f.status === "success") {
          decisions.push({
            agentName: "MarketSubsidyAgent",
            action: "accepted",
            rationale: "Market intelligence completed successfully. Economic factors incorporated into recommendation.",
          });
        } else {
          decisions.push({
            agentName: "MarketSubsidyAgent",
            action: "accepted",
            rationale: `Market analysis returned with status '${f.status}'. Partial findings noted but economic factors may be incomplete.`,
            details: { errorStatus: f.status },
          });
        }
      })
    );
  } else {
    decisions.push({
      agentName: "MarketSubsidyAgent",
      action: "skipped",
      rationale: marketDecision.rationale,
    });
  }

  await Promise.all(parallelTasks);

  const diagnosisFindingRef = findAgent(session.findings, "CropDiseaseAgent");
  const weatherFindingRef = findAgent(session.findings, "WeatherAdaptationAgent");
  const marketFindingRef = findAgent(session.findings, "MarketSubsidyAgent");

  const conflictResolutions = resolveConflicts(decisions, diagnosisFindingRef, weatherFindingRef, marketFindingRef);

  const treatmentDecision = shouldInvokeTreatment(parsedQuery, diagnosisSucceeded);
  if (treatmentDecision.invoke) {
    decisions.push({
      agentName: "TreatmentProtocolAgent",
      action: "invoked",
      rationale: treatmentDecision.rationale,
    });
    emit({ type: "agent_started", agentName: "TreatmentProtocolAgent" });
    const treatmentFinding = await runAgentWithTrace(session, "TreatmentProtocolAgent", runTreatmentAgent);
    emit({ type: "agent_completed", agentName: "TreatmentProtocolAgent", trace: session.traces.find(t => t.agentName === "TreatmentProtocolAgent")! });
    if (treatmentFinding.status === "success") {
      decisions.push({
        agentName: "TreatmentProtocolAgent",
        action: "accepted",
        rationale: "Treatment protocol synthesised from all available agent findings. Protocol accepted for final recommendation.",
      });
    } else {
      decisions.push({
        agentName: "TreatmentProtocolAgent",
        action: "accepted",
        rationale: `Treatment protocol returned with status '${treatmentFinding.status}'. Final recommendation will rely on diagnosis and other available findings.`,
        details: { errorStatus: treatmentFinding.status },
      });
    }
  } else {
    decisions.push({
      agentName: "TreatmentProtocolAgent",
      action: "skipped",
      rationale: treatmentDecision.rationale,
    });
  }

  const findingsSummary = session.findings
    .map((f) => `[${f.agentName}] (confidence: ${(f.confidence * 100).toFixed(0)}%, status: ${f.status}): ${f.summary}`)
    .join("\n\n");

  const decisionsSummary = decisions
    .map((d) => `[Orchestrator → ${d.agentName}] ${d.action}: ${d.rationale}`)
    .join("\n");

  const conflictsSummary = conflictResolutions.length > 0
    ? "\n\nConflict Resolutions:\n" + conflictResolutions.map((c) => `- ${c.conflictType}: ${c.resolution}`).join("\n")
    : "";

  emit({ type: "synthesis_started" });

  const synthesisResponse = await openai.chat.completions.create({
    model: AGENT_MODEL,
    max_completion_tokens: ORCHESTRATOR_MAX_TOKENS,
    messages: [
      { role: "system", content: SYNTHESIS_PROMPT },
      {
        role: "user",
        content: `Farmer's question: "${rawQuery}"\n\nAgent findings:\n${findingsSummary}\n\nOrchestrator decisions:\n${decisionsSummary}${conflictsSummary}`,
      },
    ],
  });

  const finalRecommendation =
    synthesisResponse.choices[0]?.message?.content ?? "Unable to generate recommendation.";

  function clampConfidence(val: unknown): number {
    const n = typeof val === "number" ? val : 0;
    if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  const validConfidences = session.findings
    .map((f) => clampConfidence(f.confidence))
    .filter((c) => c > 0);
  const avgConfidence =
    validConfidences.length > 0
      ? validConfidences.reduce((sum, c) => sum + c, 0) / validConfidences.length
      : 0;

  const treatmentFindingRef = findAgent(session.findings, "TreatmentProtocolAgent");

  const allMcpCalls: McpToolCallEntry[] = [];
  for (const finding of session.findings) {
    const calls = finding.details?.mcpToolCalls as McpToolCallEntry[] | undefined;
    if (calls && Array.isArray(calls)) {
      allMcpCalls.push(...calls);
    }
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
