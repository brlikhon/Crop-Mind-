import { Router, type IRouter } from "express";
import { runOrchestrator } from "../agents/orchestrator.js";

const router: IRouter = Router();

router.post("/cropagent/diagnose", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    res.status(400).json({
      error: "Missing or empty 'query' field. Please describe your crop situation.",
    });
    return;
  }

  if (query.length > 5000) {
    res.status(400).json({
      error: "Query too long. Please keep your description under 5000 characters.",
    });
    return;
  }

  try {
    const result = await runOrchestrator(query.trim());
    res.json(result);
  } catch (error) {
    console.error("Orchestrator error:", error);
    res.status(500).json({
      error: "An error occurred while processing your query. Please try again.",
    });
  }
});

export default router;
