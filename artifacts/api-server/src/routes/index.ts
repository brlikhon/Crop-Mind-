import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cropagentRouter from "./cropagent";
import mcpRouter from "./mcp";
import casesRouter from "./cases";

const router: IRouter = Router();

// GET /api — without this, the SPA catch-all serves HTML and the client router shows 404
router.get("/", (_req, res) => {
  res.json({
    name: "CropMind API",
    description: "APAC Agricultural Intelligence Network",
    endpoints: {
      health: { method: "GET", path: "/api/healthz" },
      diagnose: { method: "POST", path: "/api/cropagent/diagnose" },
      diagnoseStream: { method: "POST", path: "/api/cropagent/diagnose/stream" },
      submitCase: { method: "POST", path: "/api/cases/submit" },
    },
    ui: "/",
  });
});

router.use(healthRouter);
router.use(cropagentRouter);
router.use(mcpRouter);
router.use(casesRouter);

export default router;
