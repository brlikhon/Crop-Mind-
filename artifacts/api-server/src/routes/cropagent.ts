import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { runOrchestrator, type OrchestratorEvent } from "../agents/orchestrator.js";

const router: IRouter = Router();

// Rate limiter: 5 requests per minute per IP
const diagnoseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  message: {
    error: "Too many diagnosis requests. Please wait a minute before trying again.",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

router.post("/cropagent/diagnose", diagnoseLimiter, async (req, res) => {
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

router.post("/cropagent/diagnose/stream", diagnoseLimiter, async (req, res) => {
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

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (event: OrchestratorEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await runOrchestrator(query.trim(), sendEvent);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Orchestrator stream error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", message: "An error occurred while processing your query." })}\n\n`);
    res.end();
  }
});

export default router;
