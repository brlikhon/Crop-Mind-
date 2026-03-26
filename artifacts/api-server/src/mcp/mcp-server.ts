import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, listTools } from "./registry.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "cropmind-agricultural-tools",
    version: "1.0.0",
  });

  server.tool(
    "get_weather",
    "Fetches current weather conditions and 7-day agricultural forecast for an APAC region using the Open-Meteo API. Returns temperature, rainfall, humidity, wind, and UV data relevant to farming decisions.",
    {
      region: z.string().describe("Region name (e.g., 'Punjab', 'Central Luzon'). Used to look up coordinates."),
      country: z.string().describe("Country name (e.g., 'India', 'Thailand')"),
      cropType: z.string().optional().describe("Crop type for context"),
    },
    async ({ region, country, cropType }) => {
      const result = await callTool("WeatherTool", { region, country, cropType });
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? JSON.stringify(result.data, null, 2)
              : `Error: ${result.error}`,
          },
        ],
        isError: !result.success,
      };
    }
  );

  server.tool(
    "get_crop_alerts",
    "Queries active pest and disease outbreak alerts from the CropMind agricultural intelligence database. Returns alerts filtered by crop type, region, and/or country with severity levels and advisory text.",
    {
      cropType: z.string().optional().describe("Crop type to filter alerts (e.g., 'rice', 'wheat')"),
      region: z.string().optional().describe("Region name to filter alerts"),
      country: z.string().optional().describe("Country name to filter alerts"),
      severity: z.enum(["low", "medium", "high", "critical"]).optional().describe("Minimum severity level filter"),
    },
    async ({ cropType, region, country, severity }) => {
      const result = await callTool("CropAlertTool", { cropType, region, country, severity });
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? JSON.stringify(result.data, null, 2)
              : `Error: ${result.error}`,
          },
        ],
        isError: !result.success,
      };
    }
  );

  server.tool(
    "get_market_prices",
    "Returns current commodity market prices for agricultural crops across APAC markets. Includes price trends, USD conversion, and volume data for 20 crops in 10 countries.",
    {
      cropType: z.string().optional().describe("Crop type to query prices for (e.g., 'rice', 'wheat', 'coffee')"),
      country: z.string().optional().describe("Country to filter market prices (e.g., 'India', 'Thailand')"),
      market: z.string().optional().describe("Specific market name"),
    },
    async ({ cropType, country, market }) => {
      const result = await callTool("MarketPriceTool", { cropType, country, market });
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? JSON.stringify(result.data, null, 2)
              : `Error: ${result.error}`,
          },
        ],
        isError: !result.success,
      };
    }
  );

  server.tool(
    "get_subsidies",
    "Queries available government agricultural subsidy and support programs across APAC countries. Returns eligibility criteria, benefit amounts, and application details.",
    {
      country: z.string().describe("Country to search for subsidies (e.g., 'India', 'Thailand')"),
      cropType: z.string().optional().describe("Crop type to filter applicable subsidies"),
      farmSizeHa: z.number().optional().describe("Farm size in hectares for eligibility filtering"),
    },
    async ({ country, cropType, farmSizeHa }) => {
      const result = await callTool("SubsidyTool", { country, cropType, farmSizeHa });
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? JSON.stringify(result.data, null, 2)
              : `Error: ${result.error}`,
          },
        ],
        isError: !result.success,
      };
    }
  );

  server.resource(
    "tools://list",
    "List all available agricultural intelligence tools",
    async () => {
      const tools = listTools();
      return {
        contents: [
          {
            uri: "tools://list",
            mimeType: "application/json",
            text: JSON.stringify(tools, null, 2),
          },
        ],
      };
    }
  );

  return server;
}
