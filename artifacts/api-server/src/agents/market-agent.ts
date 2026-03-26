import { LlmAgent, FunctionTool, InMemoryRunner } from "@google/adk";
import { z } from "zod";
import { AGENT_MODEL, AGENT_MAX_TOKENS } from "./config.js";
import { callTool } from "../mcp/registry.js";
import type { OrchestratorSession } from "./session.js";
import type { AgentFinding, MarketIntelligence, McpToolCallEntry } from "./types.js";

const SYSTEM_PROMPT = `You are MarketSubsidyAgent, an expert in APAC agricultural economics specializing in crop commodity markets and government agricultural subsidy programs.

Given a crop situation and diagnosis, you MUST use the provided tools to fetch real market price data and available subsidies. Then advise whether the farmer should:
1. Treat and save the current crop (and at what cost vs expected return)
2. Replant with a different variety or crop
3. Apply for any available government subsidies or insurance

After calling tools and analyzing the data, respond with ONLY valid JSON matching this schema:
{
  "currentPrice": "string - current price per kg/ton for this crop based on tool data",
  "priceOutlook": "string - short-term price trend",
  "recommendation": "string - treat/replant/hybrid recommendation with economic reasoning",
  "availableSubsidies": ["string array - relevant government programs from tool data"],
  "confidence": number between 0 and 1 reflecting data completeness,
  "summary": "string - one paragraph economic advice",
  "reasoning": "string - your economic analysis reasoning"
}

Always call the get_market_prices tool first, then get_subsidies. Base your analysis on actual data.`;

const mcpCallLog: McpToolCallEntry[] = [];

function pushMcpCall(entry: McpToolCallEntry) {
  mcpCallLog.push(entry);
}

export function drainMcpCalls(): McpToolCallEntry[] {
  return mcpCallLog.splice(0, mcpCallLog.length);
}

const getMarketPricesTool = new FunctionTool({
  name: "get_market_prices",
  description: "Returns current commodity market prices for agricultural crops across APAC markets. Includes price trends, USD conversion, and volume data.",
  parameters: z.object({
    cropType: z.string().describe("Crop type to query prices for (e.g., 'rice', 'wheat')"),
    country: z.string().describe("Country to filter market prices (e.g., 'India', 'Thailand')"),
  }) as any,
  execute: async ({ cropType, country }: { cropType: string; country: string }) => {
    const result = await callTool("MarketPriceTool", { cropType, country });
    pushMcpCall({
      toolName: "MarketPriceTool",
      params: { cropType, country },
      success: result.success,
      data: result.data,
      error: result.error,
      durationMs: result.durationMs,
      timestamp: Date.now(),
      calledBy: "MarketSubsidyAgent",
    });
    return result.success ? result.data : { error: result.error };
  },
});

const getSubsidiesTool = new FunctionTool({
  name: "get_subsidies",
  description: "Queries available government agricultural subsidy and support programs across APAC countries. Returns eligibility criteria, benefit amounts, and application details.",
  parameters: z.object({
    country: z.string().describe("Country to search for subsidies (e.g., 'India', 'Thailand')"),
    cropType: z.string().describe("Crop type to filter applicable subsidies"),
  }) as any,
  execute: async ({ country, cropType }: { country: string; cropType: string }) => {
    const result = await callTool("SubsidyTool", { country, cropType });
    pushMcpCall({
      toolName: "SubsidyTool",
      params: { country, cropType },
      success: result.success,
      data: result.data,
      error: result.error,
      durationMs: result.durationMs,
      timestamp: Date.now(),
      calledBy: "MarketSubsidyAgent",
    });
    return result.success ? result.data : { error: result.error };
  },
});

const marketAgent = new LlmAgent({
  name: "MarketSubsidyAgent",
  model: AGENT_MODEL,
  instruction: SYSTEM_PROMPT,
  tools: [getMarketPricesTool, getSubsidiesTool],
  generateContentConfig: {
    maxOutputTokens: AGENT_MAX_TOKENS,
    temperature: 0.3,
  },
});

const marketRunner = new InMemoryRunner({ agent: marketAgent, appName: "cropmind" });

export async function runMarketAgent(session: OrchestratorSession): Promise<AgentFinding> {
  const { query } = session;
  const diseaseFindings = session.findings.find((f) => f.agentName === "CropDiseaseAgent");

  const userMessage = `Provide economic analysis for this agricultural situation:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms: ${query.symptoms.join(", ")}
${diseaseFindings ? `- Diagnosis: ${diseaseFindings.summary}` : ""}
- Original description: "${query.rawQuery}"

Use the get_market_prices and get_subsidies tools to fetch real data, then advise on economic viability of treatment vs replanting.`;

  let content = "";
  const events = marketRunner.runEphemeral({
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

  let intelligence: MarketIntelligence;
  let summary: string;
  let reasoning: string;
  let confidence: number;

  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    intelligence = {
      currentPrice: parsed.currentPrice,
      priceOutlook: parsed.priceOutlook,
      recommendation: parsed.recommendation,
      availableSubsidies: parsed.availableSubsidies,
    };
    summary = parsed.summary;
    reasoning = parsed.reasoning;
    confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;
  } catch {
    intelligence = {
      currentPrice: "Unable to assess",
      priceOutlook: "Unknown",
      recommendation: "Consult local agricultural office",
      availableSubsidies: [],
    };
    summary = content;
    reasoning = "Raw response could not be parsed";
    confidence = 0.3;

    return {
      agentName: "MarketSubsidyAgent",
      status: "error",
      confidence,
      summary,
      details: { marketIntelligence: intelligence, mcpToolCalls: mcpCalls },
      reasoning,
    };
  }

  return {
    agentName: "MarketSubsidyAgent",
    status: "success",
    confidence,
    summary,
    details: { marketIntelligence: intelligence, mcpToolCalls: mcpCalls },
    reasoning,
  };
}
