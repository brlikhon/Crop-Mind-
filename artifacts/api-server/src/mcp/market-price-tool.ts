import { db, marketPricesTable } from "@workspace/db";
import { and, ilike, type SQL } from "drizzle-orm";
import type { McpTool, McpToolResult, McpToolSchema } from "./types.js";

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
    const conditions: SQL[] = [];

    if (typeof params.cropType === "string" && params.cropType.trim()) {
      conditions.push(ilike(marketPricesTable.cropType, params.cropType.trim()));
    }
    if (typeof params.country === "string" && params.country.trim()) {
      conditions.push(ilike(marketPricesTable.country, `%${params.country.trim()}%`));
    }
    if (typeof params.market === "string" && params.market.trim()) {
      conditions.push(ilike(marketPricesTable.market, `%${params.market.trim()}%`));
    }

    const prices = conditions.length > 0
      ? await db.select().from(marketPricesTable).where(and(...conditions))
      : await db.select().from(marketPricesTable);

    return {
      toolName: "MarketPriceTool",
      success: true,
      data: {
        totalResults: prices.length,
        prices: prices.map((p) => ({
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
