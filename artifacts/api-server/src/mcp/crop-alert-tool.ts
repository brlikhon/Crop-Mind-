import { db, cropAlertsTable } from "@workspace/db";
import { eq, and, ilike, type SQL } from "drizzle-orm";
import type { McpTool, McpToolResult, McpToolSchema } from "./types.js";

const schema: McpToolSchema = {
  name: "CropAlertTool",
  description: "Queries active pest and disease outbreak alerts from the CropMind agricultural intelligence database. Returns alerts filtered by crop type, region, and/or country with severity levels and advisory text.",
  params: [
    { name: "cropType", type: "string", required: false, description: "Crop type to filter alerts (e.g., 'rice', 'tomato', 'wheat'). Case-insensitive." },
    { name: "region", type: "string", required: false, description: "Region name to filter alerts (e.g., 'Punjab', 'Central Luzon'). Case-insensitive partial match." },
    { name: "country", type: "string", required: false, description: "Country name to filter alerts (e.g., 'India', 'Philippines'). Case-insensitive partial match." },
    { name: "severity", type: "string", required: false, description: "Minimum severity level filter.", enum: ["low", "medium", "high", "critical"] },
  ],
};

const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

async function call(params: Record<string, unknown>): Promise<McpToolResult> {
  const start = Date.now();

  try {
    const conditions: SQL[] = [eq(cropAlertsTable.isActive, true)];

    if (typeof params.cropType === "string" && params.cropType.trim()) {
      conditions.push(ilike(cropAlertsTable.cropType, params.cropType.trim()));
    }
    if (typeof params.region === "string" && params.region.trim()) {
      conditions.push(ilike(cropAlertsTable.region, `%${params.region.trim()}%`));
    }
    if (typeof params.country === "string" && params.country.trim()) {
      conditions.push(ilike(cropAlertsTable.country, `%${params.country.trim()}%`));
    }

    let alerts = await db
      .select()
      .from(cropAlertsTable)
      .where(and(...conditions));

    if (typeof params.severity === "string" && severityOrder[params.severity] !== undefined) {
      const minSev = severityOrder[params.severity];
      alerts = alerts.filter((a) => (severityOrder[a.severity] ?? 0) >= minSev);
    }

    alerts.sort((a, b) => (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0));

    return {
      toolName: "CropAlertTool",
      success: true,
      data: {
        totalAlerts: alerts.length,
        alerts: alerts.map((a) => ({
          alertId: a.alertId,
          cropType: a.cropType,
          region: a.region,
          country: a.country,
          threatType: a.threatType,
          threatName: a.threatName,
          severity: a.severity,
          description: a.description,
          advisoryText: a.advisoryText,
          affectedAreaHa: a.affectedAreaHa,
          reportedDate: a.reportedDate,
          source: a.source,
        })),
      },
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      toolName: "CropAlertTool",
      success: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

export const cropAlertTool: McpTool = { schema, call };
