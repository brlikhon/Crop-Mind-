import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cropagentRouter from "./cropagent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cropagentRouter);

export default router;
