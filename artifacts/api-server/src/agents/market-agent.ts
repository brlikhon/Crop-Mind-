import { openai } from "@workspace/integrations-openai-ai-server";
import { AGENT_MODEL, AGENT_MAX_TOKENS } from "./config.js";
import { callTool } from "../mcp/registry.js";
import type { AgentSession, AgentFinding, MarketIntelligence, McpToolCallEntry } from "./types.js";

const SYSTEM_PROMPT = `You are MarketSubsidyAgent, an expert in APAC agricultural economics specializing in crop commodity markets and government agricultural subsidy programs.

Given a crop situation and diagnosis, advise whether the farmer should:
1. Treat and save the current crop (and at what cost vs expected return)
2. Replant with a different variety or crop
3. Apply for any available government subsidies or insurance

You will be provided with REAL market price data and subsidy program information from databases. Use this data to ground your economic analysis.

You must respond with ONLY valid JSON matching this schema:
{
  "currentPrice": "string - current price per kg/ton for this crop based on provided data",
  "priceOutlook": "string - short-term price trend",
  "recommendation": "string - treat/replant/hybrid recommendation with economic reasoning",
  "availableSubsidies": ["string array - relevant government programs from provided data"],
  "summary": "string - one paragraph economic advice",
  "reasoning": "string - your economic analysis reasoning"
}

Base your analysis on the actual market and subsidy data provided.`;

export async function runMarketAgent(session: AgentSession): Promise<AgentFinding> {
  const { query } = session;
  const diseaseFindings = session.findings.find((f) => f.agentName === "CropDiseaseAgent");

  const mcpCalls: McpToolCallEntry[] = [];

  const priceResult = await callTool("MarketPriceTool", {
    cropType: query.cropType,
    country: query.country,
  });
  mcpCalls.push({
    toolName: "MarketPriceTool",
    params: { cropType: query.cropType, country: query.country },
    success: priceResult.success,
    data: priceResult.data,
    error: priceResult.error,
    durationMs: priceResult.durationMs,
    timestamp: Date.now(),
    calledBy: "MarketSubsidyAgent",
  });

  const subsidyResult = await callTool("SubsidyTool", {
    country: query.country,
    cropType: query.cropType,
  });
  mcpCalls.push({
    toolName: "SubsidyTool",
    params: { country: query.country, cropType: query.cropType },
    success: subsidyResult.success,
    data: subsidyResult.data,
    error: subsidyResult.error,
    durationMs: subsidyResult.durationMs,
    timestamp: Date.now(),
    calledBy: "MarketSubsidyAgent",
  });

  const priceContext = priceResult.success
    ? `\n\nREAL MARKET PRICE DATA:\n${JSON.stringify(priceResult.data, null, 2)}`
    : "\n\nMarket price data unavailable — use general knowledge for this crop and region.";

  const subsidyContext = subsidyResult.success
    ? `\n\nGOVERNMENT SUBSIDY PROGRAMS:\n${JSON.stringify(subsidyResult.data, null, 2)}`
    : "";

  const userMessage = `Provide economic analysis for this agricultural situation:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms: ${query.symptoms.join(", ")}
${diseaseFindings ? `- Diagnosis: ${diseaseFindings.summary}` : ""}
- Original description: "${query.rawQuery}"
${priceContext}${subsidyContext}

Advise on the economic viability of treatment vs replanting based on the actual market data and available subsidies.`;

  const response = await openai.chat.completions.create({
    model: AGENT_MODEL,
    max_completion_tokens: AGENT_MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  let intelligence: MarketIntelligence;
  let summary: string;
  let reasoning: string;

  try {
    const parsed = JSON.parse(content);
    intelligence = {
      currentPrice: parsed.currentPrice,
      priceOutlook: parsed.priceOutlook,
      recommendation: parsed.recommendation,
      availableSubsidies: parsed.availableSubsidies,
    };
    summary = parsed.summary;
    reasoning = parsed.reasoning;
  } catch {
    intelligence = {
      currentPrice: "Unable to assess",
      priceOutlook: "Unknown",
      recommendation: "Consult local agricultural office",
      availableSubsidies: [],
    };
    summary = content;
    reasoning = "Raw response could not be parsed";

    return {
      agentName: "MarketSubsidyAgent",
      status: "error",
      confidence: 0.3,
      summary,
      details: { marketIntelligence: intelligence, mcpToolCalls: mcpCalls },
      reasoning,
    };
  }

  return {
    agentName: "MarketSubsidyAgent",
    status: "success",
    confidence: 0.75,
    summary,
    details: { marketIntelligence: intelligence, mcpToolCalls: mcpCalls },
    reasoning,
  };
}
