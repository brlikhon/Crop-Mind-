import type { McpTool, McpToolResult, McpToolSchema } from "./types.js";
import alertsData from "../data/crop-alerts.json" with { type: "json" };

interface CropAlert {
  alertId: string;
  cropType: string;
  region: string;
  country: string;
  threatType: string;
  threatName: string;
  severity: string;
  description: string;
  advisoryText: string;
  affectedAreaHa: number | null;
  reportedDate: string;
  expiresDate: string | null;
  isActive: boolean;
  source: string | null;
}

const alerts: CropAlert[] = alertsData as CropAlert[];

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
    let filtered = alerts.filter((a) => a.isActive);

    if (typeof params.cropType === "string" && params.cropType.trim()) {
      const ct = params.cropType.trim().toLowerCase();
      filtered = filtered.filter((a) => a.cropType.toLowerCase() === ct);
    }
    if (typeof params.region === "string" && params.region.trim()) {
      const r = params.region.trim().toLowerCase();
      filtered = filtered.filter((a) => a.region.toLowerCase().includes(r));
    }
    if (typeof params.country === "string" && params.country.trim()) {
      const c = params.country.trim().toLowerCase();
      filtered = filtered.filter((a) => a.country.toLowerCase().includes(c));
    }

    if (typeof params.severity === "string" && severityOrder[params.severity] !== undefined) {
      const minSev = severityOrder[params.severity];
      filtered = filtered.filter((a) => (severityOrder[a.severity] ?? 0) >= minSev);
    }

    filtered.sort((a, b) => (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0));

    return {
      toolName: "CropAlertTool",
      success: true,
      data: {
        totalAlerts: filtered.length,
        alerts: filtered.map((a) => ({
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
