import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { listTools } from "../mcp/registry.js";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  let dbStatus: "connected" | "disconnected" | "not_configured" = "not_configured";

  if (pool) {
    try {
      const client = await Promise.race([
        pool.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("DB probe timeout")), 3000)
        ),
      ]);
      await client.query("SELECT 1");
      client.release();
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }
  }

  const tools = listTools();

  res.json({
    status: "ok",
    service: "CropMind API",
    version: "1.0.0",
    database: dbStatus,
    mcpTools: {
      count: tools.length,
      names: tools.map((t) => t.name),
    },
    agents: [
      "CropDiseaseAgent",
      "WeatherAdaptationAgent",
      "MarketSubsidyAgent",
      "TreatmentProtocolAgent",
    ],
    googleCloud: {
      models: ["gemini-2.5-flash", "gemini-2.5-pro"],
      embeddings: "gemini-embedding-001",
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
