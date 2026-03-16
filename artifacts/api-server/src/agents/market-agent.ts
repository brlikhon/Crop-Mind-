import { openai } from "@workspace/integrations-openai-ai-server";
import type { AgentSession, AgentFinding, MarketIntelligence } from "./types.js";

const SYSTEM_PROMPT = `You are MarketSubsidyAgent, an expert in APAC agricultural economics specializing in crop commodity markets and government agricultural subsidy programs.

Given a crop situation and diagnosis, advise whether the farmer should:
1. Treat and save the current crop (and at what cost vs expected return)
2. Replant with a different variety or crop
3. Apply for any available government subsidies or insurance

You must respond with ONLY valid JSON matching this schema:
{
  "currentPrice": "string - current approximate price per kg/ton for this crop in the region",
  "priceOutlook": "string - short-term price trend",
  "recommendation": "string - treat/replant/hybrid recommendation with economic reasoning",
  "availableSubsidies": ["string array - relevant government programs in this country"],
  "summary": "string - one paragraph economic advice",
  "reasoning": "string - your economic analysis reasoning"
}

Use your knowledge of APAC agricultural markets and government programs. Be specific about prices and programs relevant to the country.`;

export async function runMarketAgent(session: AgentSession): Promise<AgentFinding> {
  const { query } = session;
  const diseaseFindings = session.findings.find((f) => f.agentName === "CropDiseaseAgent");

  const userMessage = `Provide economic analysis for this agricultural situation:
- Crop: ${query.cropType}
- Region: ${query.region}, ${query.country}
- Symptoms: ${query.symptoms.join(", ")}
${diseaseFindings ? `- Diagnosis: ${diseaseFindings.summary}` : ""}
- Original description: "${query.rawQuery}"

Advise on the economic viability of treatment vs replanting, current market prices, and any government support programs available in ${query.country}.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
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
      details: { marketIntelligence: intelligence },
      reasoning,
    };
  }

  return {
    agentName: "MarketSubsidyAgent",
    status: "success",
    confidence: 0.75,
    summary,
    details: { marketIntelligence: intelligence },
    reasoning,
  };
}
