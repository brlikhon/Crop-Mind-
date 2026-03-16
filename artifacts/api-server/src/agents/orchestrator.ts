import { openai } from "@workspace/integrations-openai-ai-server";
import type {
  FarmerQuery,
  OrchestratorResult,
  DiagnosisResult,
  WeatherAssessment,
  MarketIntelligence,
  TreatmentProtocol,
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
  "additionalContext": "string - any other relevant details (planting date, soil type, previous treatments, etc.)"
}

If any field is not mentioned, make a reasonable inference based on context or use 'unspecified'. Always extract at least one symptom from the description.`;

async function parseQuery(rawQuery: string): Promise<FarmerQuery> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2048,
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
    };
  } catch {
    return {
      rawQuery,
      cropType: "unspecified",
      region: "unspecified",
      country: "unspecified",
      symptoms: [rawQuery],
      additionalContext: "",
    };
  }
}

const SYNTHESIS_PROMPT = `You are the Chief Agricultural Advisor synthesising findings from four specialised agents into a final, unified recommendation for a smallholder farmer.

Given the findings from CropDiseaseAgent, WeatherAdaptationAgent, MarketSubsidyAgent, and TreatmentProtocolAgent, write a clear, compassionate, actionable final recommendation.

Structure your response as a single coherent paragraph (3-5 sentences) that:
1. States the diagnosis clearly
2. Acknowledges weather and economic factors
3. Gives the single most important action to take first
4. Provides reassurance and next steps

Write at a level that any farmer can understand. Be direct and practical.`;

export async function runOrchestrator(rawQuery: string): Promise<OrchestratorResult> {
  const startTime = Date.now();

  const farmerQuery = await parseQuery(rawQuery);
  const session = createSession(farmerQuery);

  await runAgentWithTrace(session, "CropDiseaseAgent", runCropDiseaseAgent);

  const [weatherResult, marketResult] = await Promise.all([
    runAgentWithTrace(session, "WeatherAdaptationAgent", runWeatherAgent),
    runAgentWithTrace(session, "MarketSubsidyAgent", runMarketAgent),
  ]);

  await runAgentWithTrace(session, "TreatmentProtocolAgent", runTreatmentAgent);

  const findingsSummary = session.findings
    .map((f) => `[${f.agentName}] (confidence: ${f.confidence}): ${f.summary}`)
    .join("\n\n");

  const synthesisResponse = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2048,
    messages: [
      { role: "system", content: SYNTHESIS_PROMPT },
      {
        role: "user",
        content: `Farmer's question: "${rawQuery}"\n\nAgent findings:\n${findingsSummary}`,
      },
    ],
  });

  const finalRecommendation =
    synthesisResponse.choices[0]?.message?.content ?? "Unable to generate recommendation.";

  const diagnosisFinding = session.findings.find((f) => f.agentName === "CropDiseaseAgent");
  const weatherFinding = session.findings.find((f) => f.agentName === "WeatherAdaptationAgent");
  const marketFinding = session.findings.find((f) => f.agentName === "MarketSubsidyAgent");
  const treatmentFinding = session.findings.find((f) => f.agentName === "TreatmentProtocolAgent");

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
    totalDurationMs: Date.now() - startTime,
  };

  if (diagnosisFinding?.status === "success" && diagnosisFinding.details?.diagnosis) {
    result.diagnosis = diagnosisFinding.details.diagnosis as DiagnosisResult;
  }
  if (weatherFinding?.status === "success" && weatherFinding.details?.weatherAssessment) {
    result.weatherAssessment = weatherFinding.details.weatherAssessment as WeatherAssessment;
  }
  if (marketFinding?.status === "success" && marketFinding.details?.marketIntelligence) {
    result.marketIntelligence = marketFinding.details.marketIntelligence as MarketIntelligence;
  }
  if (treatmentFinding?.status === "success" && treatmentFinding.details?.treatmentProtocol) {
    result.treatmentProtocol = treatmentFinding.details.treatmentProtocol as TreatmentProtocol;
  }

  return result;
}
