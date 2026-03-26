import { createChatCompletion } from "@workspace/integrations-google-vertex-ai-server";
import { AGENT_MODEL, AGENT_MAX_TOKENS } from "./config.js";
import { callTool } from "../mcp/registry.js";
import type { AgentSession, AgentFinding, WeatherAssessment, McpToolCallEntry } from "./types.js";

const SYSTEM_PROMPT = `You are WeatherAdaptationAgent, an expert agricultural meteorologist specializing in APAC climate patterns and their impact on crop health and treatment timing.

Given crop symptoms and a region, assess how current and forecast weather conditions affect:
1. The likelihood and progression of the diagnosed condition
2. The optimal timing for treatment application
3. Any weather-related risks that could worsen the situation

You will be provided with REAL weather data from the Open-Meteo API and any active crop alerts for the region. Use this data to ground your assessment.

You must respond with ONLY valid JSON matching this schema:
{
  "currentConditions": "string - description of current weather based on provided data",
  "forecast": "string - 7-day outlook relevant to agriculture",
  "weatherRisk": "string - how weather affects the crop condition",
  "adaptations": ["string array of weather-specific recommendations"],
  "summary": "string - one paragraph summary",
  "reasoning": "string - your meteorological reasoning"
}

Base your analysis on the actual weather data provided, not general knowledge.`;

export async function runWeatherAgent(session: AgentSession): Promise<AgentFinding> {
  const { query } = session;
  const diseaseFindings = session.findings.find((f) => f.agentName === "CropDiseaseAgent");

  const mcpCalls: McpToolCallEntry[] = [];

  const weatherResult = await callTool("WeatherTool", {
    region: query.region,
    country: query.country,
    cropType: query.cropType,
  });
  mcpCalls.push({
    toolName: "WeatherTool",
    params: { region: query.region, country: query.country, cropType: query.cropType },
    success: weatherResult.success,
    data: weatherResult.data,
    error: weatherResult.error,
    durationMs: weatherResult.durationMs,
    timestamp: Date.now(),
    calledBy: "WeatherAdaptationAgent",
  });

  const alertResult = await callTool("CropAlertTool", {
    country: query.country,
    cropType: query.cropType,
  });
  mcpCalls.push({
    toolName: "CropAlertTool",
    params: { country: query.country, cropType: query.cropType },
    success: alertResult.success,
    data: alertResult.data,
    error: alertResult.error,
    durationMs: alertResult.durationMs,
    timestamp: Date.now(),
    calledBy: "WeatherAdaptationAgent",
  });

  const weatherContext = weatherResult.success
    ? `\n\nREAL WEATHER DATA (from Open-Meteo API):\n${JSON.stringify(weatherResult.data, null, 2)}`
    : "\n\nWeather API unavailable — use seasonal knowledge for this region.";

  const alertContext = alertResult.success
    ? `\n\nACTIVE CROP ALERTS:\n${JSON.stringify(alertResult.data, null, 2)}`
    : "";

  const userMessage = `Assess weather impact on this agricultural situation:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms observed: ${query.symptoms.join(", ")}
${diseaseFindings ? `- Preliminary diagnosis: ${diseaseFindings.summary}` : ""}
- Original description: "${query.rawQuery}"
${weatherContext}${alertContext}

Analyze how the actual weather conditions affect this crop condition and treatment timing.`;

  const response = await createChatCompletion({
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
      details: { weatherAssessment: assessment, mcpToolCalls: mcpCalls },
      reasoning,
    };
  }

  return {
    agentName: "WeatherAdaptationAgent",
    status: "success",
    confidence: 0.8,
    summary,
    details: { weatherAssessment: assessment, mcpToolCalls: mcpCalls },
    reasoning,
  };
}
