import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cropagentRouter from "./cropagent";
import mcpRouter from "./mcp";
import casesRouter from "./cases";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cropagentRouter);
router.use(mcpRouter);
router.use(casesRouter);

export default router;
