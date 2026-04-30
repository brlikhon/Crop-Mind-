import type { McpTool, McpToolResult, McpToolSchema } from "./types.js";
import pricesData from "../data/market-prices.json" with { type: "json" };

interface MarketPrice {
  cropType: string;
  country: string;
  market: string;
  pricePerKg: number;
  currency: string;
  priceUsdPerKg: number;
  weekOf: string;
  priceChange7d: number | null;
  priceChange30d: number | null;
  volume: string | null;
  grade: string | null;
  source: string | null;
  notes: string | null;
}

const prices: MarketPrice[] = pricesData as MarketPrice[];

const schema: McpToolSchema = {
  name: "MarketPriceTool",
  description: "Returns current commodity market prices for agricultural crops across APAC markets. Includes price trends, USD conversion, and volume data for 20 crops in 10 countries.",
  params: [
    { name: "cropType", type: "string", required: false, description: "Crop type to query prices for (e.g., 'rice', 'wheat', 'coffee'). Case-insensitive." },
    { name: "country", type: "string", required: false, description: "Country to filter market prices (e.g., 'India', 'Thailand'). Case-insensitive partial match." },
    { name: "market", type: "string", required: false, description: "Specific market name (e.g., 'Karnal Mandi', 'Bangkok FOB'). Case-insensitive partial match." },
  ],
};

async function call(params: Record<string, unknown>): Promise<McpToolResult> {
  const start = Date.now();

  try {
    let filtered = [...prices];

    if (typeof params.cropType === "string" && params.cropType.trim()) {
      const ct = params.cropType.trim().toLowerCase();
      filtered = filtered.filter((p) => p.cropType.toLowerCase() === ct);
    }
    if (typeof params.country === "string" && params.country.trim()) {
      const c = params.country.trim().toLowerCase();
      filtered = filtered.filter((p) => p.country.toLowerCase().includes(c));
    }
    if (typeof params.market === "string" && params.market.trim()) {
      const m = params.market.trim().toLowerCase();
      filtered = filtered.filter((p) => p.market.toLowerCase().includes(m));
    }

    return {
      toolName: "MarketPriceTool",
      success: true,
      data: {
        totalResults: filtered.length,
        prices: filtered.map((p) => ({
          cropType: p.cropType,
          country: p.country,
          market: p.market,
          pricePerKg: p.pricePerKg,
          currency: p.currency,
          priceUsdPerKg: p.priceUsdPerKg,
          weekOf: p.weekOf,
          priceChange7dPercent: p.priceChange7d,
          priceChange30dPercent: p.priceChange30d,
          volume: p.volume,
          grade: p.grade,
          source: p.source,
          notes: p.notes,
        })),
      },
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      toolName: "MarketPriceTool",
      success: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

export const marketPriceTool: McpTool = { schema, call };
