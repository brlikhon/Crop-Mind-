import { db, subsidiesTable } from "@workspace/db";
import { eq, and, ilike, type SQL } from "drizzle-orm";
import type { McpTool, McpToolResult, McpToolSchema } from "./types.js";

const schema: McpToolSchema = {
  name: "SubsidyTool",
  description: "Queries available government agricultural subsidy and support programs across APAC countries. Returns eligibility criteria, benefit amounts, and application details for programs matching the farmer's profile.",
  params: [
    { name: "country", type: "string", required: true, description: "Country to search for subsidies (e.g., 'India', 'Thailand', 'Philippines'). Case-insensitive." },
    { name: "cropType", type: "string", required: false, description: "Crop type to filter applicable subsidies (e.g., 'rice', 'coffee'). Matches against eligible crops list." },
    { name: "farmSizeHa", type: "number", required: false, description: "Farm size in hectares. Used to filter programs with farm size eligibility requirements." },
  ],
};

async function call(params: Record<string, unknown>): Promise<McpToolResult> {
  const start = Date.now();

  if (typeof params.country !== "string" || !params.country.trim()) {
    return {
      toolName: "SubsidyTool",
      success: false,
      data: null,
      error: "Parameter 'country' is required.",
      durationMs: Date.now() - start,
    };
  }

  try {
    const conditions: SQL[] = [
      eq(subsidiesTable.isActive, true),
      ilike(subsidiesTable.country, `%${params.country.trim()}%`),
    ];

    let subsidies = await db
      .select()
      .from(subsidiesTable)
      .where(and(...conditions));

    if (typeof params.cropType === "string" && params.cropType.trim()) {
      const crop = params.cropType.trim().toLowerCase();
      subsidies = subsidies.filter(
        (s) => s.eligibleCrops === "all" || s.eligibleCrops.toLowerCase().includes(crop)
      );
    }

    if (typeof params.farmSizeHa === "number") {
      const size = params.farmSizeHa;
      subsidies = subsidies.filter((s) => {
        if (s.minFarmSizeHa !== null && size < s.minFarmSizeHa) return false;
        if (s.maxFarmSizeHa !== null && size > s.maxFarmSizeHa) return false;
        return true;
      });
    }

    return {
      toolName: "SubsidyTool",
      success: true,
      data: {
        totalPrograms: subsidies.length,
        country: params.country,
        programs: subsidies.map((s) => ({
          programId: s.programId,
          programName: s.programName,
          administeredBy: s.administeredBy,
          description: s.description,
          eligibleCrops: s.eligibleCrops,
          eligibilityCriteria: s.eligibilityCriteria,
          benefitType: s.benefitType,
          maxBenefitUsd: s.maxBenefitUsd,
          applicationDeadline: s.applicationDeadline,
          applicationUrl: s.applicationUrl,
          targetRegion: s.targetRegion,
          farmSizeRange: s.minFarmSizeHa !== null || s.maxFarmSizeHa !== null
            ? { minHa: s.minFarmSizeHa, maxHa: s.maxFarmSizeHa }
            : null,
        })),
      },
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      toolName: "SubsidyTool",
      success: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

export const subsidyTool: McpTool = { schema, call };
