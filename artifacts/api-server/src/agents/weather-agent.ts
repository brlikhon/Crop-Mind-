import { LlmAgent, FunctionTool, InMemoryRunner } from "@google/adk";
import { z } from "zod";
import { AGENT_MODEL, AGENT_MAX_TOKENS } from "./config.js";
import { callTool } from "../mcp/registry.js";
import type { OrchestratorSession } from "./session.js";
import type { AgentFinding, WeatherAssessment, McpToolCallEntry } from "./types.js";

const SYSTEM_PROMPT = `You are WeatherAdaptationAgent, an expert agricultural meteorologist specializing in APAC climate patterns and their impact on crop health and treatment timing.

Given crop symptoms and a region, you MUST use the provided tools to fetch real weather data and active crop alerts. Then assess how current and forecast weather conditions affect:
1. The likelihood and progression of the diagnosed condition
2. The optimal timing for treatment application
3. Any weather-related risks that could worsen the situation

After calling tools and analyzing the data, respond with ONLY valid JSON matching this schema:
{
  "currentConditions": "string - description of current weather based on tool data",
  "forecast": "string - 7-day outlook relevant to agriculture",
  "weatherRisk": "string - how weather affects the crop condition",
  "adaptations": ["string array of weather-specific recommendations"],
  "confidence": number between 0 and 1 reflecting data quality and relevance,
  "summary": "string - one paragraph summary",
  "reasoning": "string - your meteorological reasoning"
}

Always call the get_weather tool first, then get_crop_alerts. Base your analysis on actual data returned by tools.`;

const mcpCallLog: McpToolCallEntry[] = [];

function pushMcpCall(entry: McpToolCallEntry) {
  mcpCallLog.push(entry);
}

export function drainMcpCalls(): McpToolCallEntry[] {
  return mcpCallLog.splice(0, mcpCallLog.length);
}

const getWeatherTool = new FunctionTool({
  name: "get_weather",
  description: "Fetches current weather conditions and 7-day agricultural forecast for an APAC region using the Open-Meteo API. Returns temperature, rainfall, humidity, wind, and UV data.",
  parameters: z.object({
    region: z.string().describe("Region name (e.g., 'Punjab', 'Central Luzon')"),
    country: z.string().describe("Country name (e.g., 'India', 'Thailand')"),
  }) as any,
  execute: async ({ region, country }: { region: string; country: string }) => {
    const result = await callTool("WeatherTool", { region, country });
    pushMcpCall({
      toolName: "WeatherTool",
      params: { region, country },
      success: result.success,
      data: result.data,
      error: result.error,
      durationMs: result.durationMs,
      timestamp: Date.now(),
      calledBy: "WeatherAdaptationAgent",
    });
    return result.success ? result.data : { error: result.error };
  },
});

const getCropAlertsTool = new FunctionTool({
  name: "get_crop_alerts",
  description: "Queries active pest and disease outbreak alerts from the CropMind agricultural intelligence database. Returns alerts filtered by crop type and country with severity levels.",
  parameters: z.object({
    country: z.string().describe("Country name to filter alerts"),
    cropType: z.string().describe("Crop type to filter alerts (e.g., 'rice', 'wheat')"),
  }) as any,
  execute: async ({ country, cropType }: { country: string; cropType: string }) => {
    const result = await callTool("CropAlertTool", { country, cropType });
    pushMcpCall({
      toolName: "CropAlertTool",
      params: { country, cropType },
      success: result.success,
      data: result.data,
      error: result.error,
      durationMs: result.durationMs,
      timestamp: Date.now(),
      calledBy: "WeatherAdaptationAgent",
    });
    return result.success ? result.data : { error: result.error };
  },
});

const weatherAgent = new LlmAgent({
  name: "WeatherAdaptationAgent",
  model: AGENT_MODEL,
  instruction: SYSTEM_PROMPT,
  tools: [getWeatherTool, getCropAlertsTool],
  generateContentConfig: {
    maxOutputTokens: AGENT_MAX_TOKENS,
    temperature: 0.3,
  },
});

const weatherRunner = new InMemoryRunner({ agent: weatherAgent, appName: "cropmind" });

export async function runWeatherAgent(session: OrchestratorSession): Promise<AgentFinding> {
  const { query } = session;
  const diseaseFindings = session.findings.find((f) => f.agentName === "CropDiseaseAgent");

  const userMessage = `Assess weather impact on this agricultural situation:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms observed: ${query.symptoms.join(", ")}
${diseaseFindings ? `- Preliminary diagnosis: ${diseaseFindings.summary}` : ""}
- Original description: "${query.rawQuery}"

Use the get_weather and get_crop_alerts tools to fetch real data, then provide your assessment.`;

  let content = "";
  const events = weatherRunner.runEphemeral({
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

  const mcpCalls = drainMcpCalls();

  let assessment: WeatherAssessment;
  let summary: string;
  let reasoning: string;
  let confidence: number;

  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    assessment = {
      currentConditions: parsed.currentConditions,
      forecast: parsed.forecast,
      weatherRisk: parsed.weatherRisk,
      adaptations: parsed.adaptations,
    };
    summary = parsed.summary;
    reasoning = parsed.reasoning;
    confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;
  } catch {
    assessment = {
      currentConditions: "Unable to assess",
      forecast: "Unable to assess",
      weatherRisk: "Unknown",
      adaptations: [],
    };
    summary = content;
    reasoning = "Raw response could not be parsed";
    confidence = 0.3;

    return {
      agentName: "WeatherAdaptationAgent",
      status: "error",
      confidence,
      summary,
      details: { weatherAssessment: assessment, mcpToolCalls: mcpCalls },
      reasoning,
    };
  }

  return {
    agentName: "WeatherAdaptationAgent",
    status: "success",
    confidence,
    summary,
    details: { weatherAssessment: assessment, mcpToolCalls: mcpCalls },
    reasoning,
  };
}
