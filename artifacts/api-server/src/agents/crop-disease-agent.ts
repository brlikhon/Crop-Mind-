import { LlmAgent, InMemoryRunner, GOOGLE_SEARCH } from "@google/adk";
import { AGENT_MODEL, AGENT_MAX_TOKENS } from "./config.js";
import type { OrchestratorSession } from "./session.js";
import type { AgentFinding, DiagnosisResult, ImageInput } from "./types.js";

const SYSTEM_PROMPT = `You are CropDiseaseAgent, an expert agricultural pathologist specializing in crop diseases across APAC regions. You analyze symptom descriptions (and crop photos when provided) to generate differential diagnoses.

You have access to Google Search. Use it to look up the latest information about crop diseases in the specified region. Ground your diagnosis in verifiable agricultural research from extension services, ICAR, PhilRice, IRRI, or equivalent institutions. Include source URLs in your response.

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
  "sources": ["string array - URLs of agricultural research or extension service pages that support your diagnosis"],
  "summary": "string - one paragraph summary for the farmer",
  "reasoning": "string - your step-by-step diagnostic reasoning"
}

Consider common diseases for the given crop type in the specified APAC region. Factor in seasonal patterns, regional prevalence, and symptom combinations. If a photo is provided, analyze visible symptoms alongside the text description. Always provide at least 2 differential diagnoses. Keep JSON keys in English, but write farmer-facing values such as summary and reasoning in the preferred response language when provided.`;

const diseaseAgent = new LlmAgent({
  name: "CropDiseaseAgent",
  model: AGENT_MODEL,
  instruction: SYSTEM_PROMPT,
  tools: [GOOGLE_SEARCH],
  generateContentConfig: {
    maxOutputTokens: AGENT_MAX_TOKENS,
    temperature: 0.4,
  },
});

const diseaseRunner = new InMemoryRunner({ agent: diseaseAgent, appName: "cropmind" });

export async function runCropDiseaseAgent(session: OrchestratorSession, imageData?: ImageInput): Promise<AgentFinding> {
  const { query } = session;

  const textPrompt = `Analyze these crop symptoms:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms: ${query.symptoms.join(", ")}
- Additional context: ${query.additionalContext}
- Preferred response language: ${query.preferredLanguage}
- Original farmer description: "${query.rawQuery}"${imageData ? "\n\nA photo of the affected crop has been attached. Analyze the visual symptoms in the image alongside the text description." : ""}`;

  const parts: Array<Record<string, unknown>> = [{ text: textPrompt }];
  if (imageData) {
    parts.push({
      inlineData: { mimeType: imageData.mimeType, data: imageData.base64 },
    });
  }

  let content = "";
  const events = diseaseRunner.runEphemeral({
    userId: session.adkUserId,
    newMessage: { role: "user", parts },
  });

  for await (const event of events) {
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if ("text" in part && part.text) content += part.text;
      }
    }
  }

  let diagnosis: DiagnosisResult;
  let summary: string;
  let reasoning: string;

  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    diagnosis = {
      primaryDiagnosis: parsed.primaryDiagnosis,
      confidence: parsed.confidence,
      differentialDiagnoses: parsed.differentialDiagnoses,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
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
