import { openai } from "@workspace/integrations-openai-ai-server";
import { AGENT_MODEL, AGENT_MAX_TOKENS } from "./config.js";
import type { AgentSession, AgentFinding, WeatherAssessment } from "./types.js";

const SYSTEM_PROMPT = `You are WeatherAdaptationAgent, an expert agricultural meteorologist specializing in APAC climate patterns and their impact on crop health and treatment timing.

Given crop symptoms and a region, assess how current and forecast weather conditions affect:
1. The likelihood and progression of the diagnosed condition
2. The optimal timing for treatment application
3. Any weather-related risks that could worsen the situation

You must respond with ONLY valid JSON matching this schema:
{
  "currentConditions": "string - description of typical current weather for this region and season",
  "forecast": "string - 7-day outlook relevant to agriculture",
  "weatherRisk": "string - how weather affects the crop condition",
  "adaptations": ["string array of weather-specific recommendations"],
  "summary": "string - one paragraph summary",
  "reasoning": "string - your meteorological reasoning"
}

Use your knowledge of APAC seasonal patterns (monsoons, dry seasons, typhoon seasons) for the given region.`;

export async function runWeatherAgent(session: AgentSession): Promise<AgentFinding> {
  const { query } = session;
  const diseaseFindings = session.findings.find((f) => f.agentName === "CropDiseaseAgent");

  const userMessage = `Assess weather impact on this agricultural situation:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms observed: ${query.symptoms.join(", ")}
${diseaseFindings ? `- Preliminary diagnosis: ${diseaseFindings.summary}` : ""}
- Original description: "${query.rawQuery}"

Consider the current month/season for this APAC region and how weather patterns affect this crop condition.`;

  const response = await openai.chat.completions.create({
    model: AGENT_MODEL,
    max_completion_tokens: AGENT_MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  let assessment: WeatherAssessment;
  let summary: string;
  let reasoning: string;

  try {
    const parsed = JSON.parse(content);
    assessment = {
      currentConditions: parsed.currentConditions,
      forecast: parsed.forecast,
      weatherRisk: parsed.weatherRisk,
      adaptations: parsed.adaptations,
    };
    summary = parsed.summary;
    reasoning = parsed.reasoning;
  } catch {
    assessment = {
      currentConditions: "Unable to assess",
      forecast: "Unable to assess",
      weatherRisk: "Unknown",
      adaptations: [],
    };
    summary = content;
    reasoning = "Raw response could not be parsed";

    return {
      agentName: "WeatherAdaptationAgent",
      status: "error",
      confidence: 0.3,
      summary,
      details: { weatherAssessment: assessment },
      reasoning,
    };
  }

  return {
    agentName: "WeatherAdaptationAgent",
    status: "success",
    confidence: 0.8,
    summary,
    details: { weatherAssessment: assessment },
    reasoning,
  };
}
