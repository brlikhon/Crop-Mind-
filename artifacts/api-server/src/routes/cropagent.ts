import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { runOrchestrator, type OrchestratorEvent } from "../agents/orchestrator.js";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const diagnoseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: "Too many diagnosis requests. Please wait a minute before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function getPreferredLanguage(body: Record<string, unknown> | undefined): string {
  const language = body?.preferredLanguage;
  if (typeof language !== "string" || language.trim().length === 0) return "English";
  return language.trim().slice(0, 80);
}

router.post("/cropagent/diagnose", diagnoseLimiter, upload.single("image"), async (req, res) => {
  const query = req.body?.query;
  const preferredLanguage = getPreferredLanguage(req.body);

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

  let imageData: { base64: string; mimeType: string } | undefined;
  if (req.file) {
    imageData = {
      base64: req.file.buffer.toString("base64"),
      mimeType: req.file.mimetype,
    };
  }

  try {
    const result = await runOrchestrator(query.trim(), undefined, imageData, preferredLanguage);
    res.json(result);
  } catch (error) {
    console.error("Orchestrator error:", error);
    res.status(500).json({
      error: "An error occurred while processing your query. Please try again.",
    });
  }
});

router.post("/cropagent/diagnose/stream", diagnoseLimiter, upload.single("image"), async (req, res) => {
  const query = req.body?.query;
  const preferredLanguage = getPreferredLanguage(req.body);

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

  let imageData: { base64: string; mimeType: string } | undefined;
  if (req.file) {
    imageData = {
      base64: req.file.buffer.toString("base64"),
      mimeType: req.file.mimetype,
    };
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
    await runOrchestrator(query.trim(), sendEvent, imageData, preferredLanguage);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Orchestrator stream error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", message: "An error occurred while processing your query." })}\n\n`);
    res.end();
  }
});

export default router;
