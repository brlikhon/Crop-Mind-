import { openai } from "@workspace/integrations-openai-ai-server";
import { AGENT_MODEL, AGENT_MAX_TOKENS } from "./config.js";
import type { AgentSession, AgentFinding, DiagnosisResult } from "./types.js";

const SYSTEM_PROMPT = `You are CropDiseaseAgent, an expert agricultural pathologist specializing in crop diseases across APAC regions. You analyze symptom descriptions and provide differential diagnoses.

You must respond with ONLY valid JSON matching this schema:
{
  "primaryDiagnosis": "string - name of the most likely disease or condition",
  "confidence": number between 0 and 1,
  "differentialDiagnoses": [
    {
      "name": "string",
      "probability": number between 0 and 1,
      "reasoning": "string explaining why this is a possibility"
    }
  ],
  "summary": "string - one paragraph summary for the farmer",
  "reasoning": "string - your step-by-step diagnostic reasoning"
}

Consider common diseases for the given crop type in the specified APAC region. Factor in seasonal patterns, regional prevalence, and symptom combinations. Always provide at least 2 differential diagnoses.`;

export async function runCropDiseaseAgent(session: AgentSession): Promise<AgentFinding> {
  const { query } = session;

  const userMessage = `Analyze these crop symptoms:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms: ${query.symptoms.join(", ")}
- Additional context: ${query.additionalContext}
- Original farmer description: "${query.rawQuery}"`;

  const response = await openai.chat.completions.create({
    model: AGENT_MODEL,
    max_completion_tokens: AGENT_MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  let diagnosis: DiagnosisResult;
  let summary: string;
  let reasoning: string;

  try {
    const parsed = JSON.parse(content);
    diagnosis = {
      primaryDiagnosis: parsed.primaryDiagnosis,
      confidence: parsed.confidence,
      differentialDiagnoses: parsed.differentialDiagnoses,
    };
    summary = parsed.summary;
    reasoning = parsed.reasoning;
  } catch {
    diagnosis = {
      primaryDiagnosis: "Unable to parse diagnosis",
      confidence: 0.3,
      differentialDiagnoses: [],
    };
    summary = content;
    reasoning = "Raw response could not be parsed into structured format";

    return {
      agentName: "CropDiseaseAgent",
      status: "error",
      confidence: 0.3,
      summary,
      details: { diagnosis },
      reasoning,
    };
  }

  return {
    agentName: "CropDiseaseAgent",
    status: "success",
    confidence: diagnosis.confidence,
    summary,
    details: { diagnosis },
    reasoning,
  };
}
