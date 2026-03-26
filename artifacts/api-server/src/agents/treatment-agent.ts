import { LlmAgent, InMemoryRunner } from "@google/adk";
import { AGENT_MODEL, AGENT_MAX_TOKENS } from "./config.js";
import type { OrchestratorSession } from "./session.js";
import type { AgentFinding, TreatmentProtocol } from "./types.js";

const SYSTEM_PROMPT = `You are TreatmentProtocolAgent, an expert agricultural extension officer specializing in practical, actionable treatment plans for smallholder farmers across APAC.

You synthesise findings from the diagnostic agent, weather agent, and market agent to create a step-by-step treatment protocol calibrated to:
1. The farmer's likely available resources (small-scale, limited budget)
2. Current weather conditions and optimal timing
3. Economic viability of the treatment

You must respond with ONLY valid JSON matching this schema:
{
  "immediateActions": ["string array - ordered steps the farmer should take NOW (within 24-48 hours)"],
  "preventiveMeasures": ["string array - medium-term actions to prevent recurrence"],
  "timelineWeeks": number - expected recovery timeline in weeks,
  "estimatedCost": "string - approximate treatment cost in local currency context",
  "localResources": ["string array - where to source treatments/supplies locally"],
  "confidence": number between 0 and 1 reflecting protocol completeness,
  "summary": "string - clear, farmer-friendly action plan summary",
  "reasoning": "string - why these specific steps were chosen given all agent inputs"
}

Write at a level that a smallholder farmer with basic literacy can understand. Use specific product names, dosages, and application methods where applicable. Always suggest both chemical and organic alternatives.`;

const treatmentAgent = new LlmAgent({
  name: "TreatmentProtocolAgent",
  model: AGENT_MODEL,
  instruction: SYSTEM_PROMPT,
  generateContentConfig: {
    maxOutputTokens: AGENT_MAX_TOKENS,
    temperature: 0.4,
  },
});

const treatmentRunner = new InMemoryRunner({ agent: treatmentAgent, appName: "cropmind" });

export async function runTreatmentAgent(session: OrchestratorSession): Promise<AgentFinding> {
  const { query } = session;

  const findingsSummary = session.findings
    .map((f) => `[${f.agentName}]: ${f.summary}`)
    .join("\n\n");

  const userMessage = `Create a treatment protocol based on all agent findings:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms: ${query.symptoms.join(", ")}
- Original description: "${query.rawQuery}"

Previous agent findings:
${findingsSummary}

Create a practical, step-by-step treatment plan that accounts for the diagnosis, weather conditions, and economic factors identified by the other agents.`;

  let content = "";
  const events = treatmentRunner.runEphemeral({
    userId: session.adkUserId,
    newMessage: { role: "user", parts: [{ text: userMessage }] },
  });

  for await (const event of events) {
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if ("text" in part && part.text) content += part.text;
      }
    }
  }

  let protocol: TreatmentProtocol;
  let summary: string;
  let reasoning: string;
  let confidence: number;

  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    protocol = {
      immediateActions: parsed.immediateActions,
      preventiveMeasures: parsed.preventiveMeasures,
      timelineWeeks: parsed.timelineWeeks,
      estimatedCost: parsed.estimatedCost,
      localResources: parsed.localResources,
    };
    summary = parsed.summary;
    reasoning = parsed.reasoning;
    confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.75;
  } catch {
    protocol = {
      immediateActions: ["Consult local agricultural extension office"],
      preventiveMeasures: [],
      timelineWeeks: 0,
      estimatedCost: "Unknown",
      localResources: [],
    };
    summary = content;
    reasoning = "Raw response could not be parsed";
    confidence = 0.3;

    return {
      agentName: "TreatmentProtocolAgent",
      status: "error",
      confidence,
      summary,
      details: { treatmentProtocol: protocol },
      reasoning,
    };
  }

  return {
    agentName: "TreatmentProtocolAgent",
    status: "success",
    confidence,
    summary,
    details: { treatmentProtocol: protocol },
    reasoning,
  };
}
