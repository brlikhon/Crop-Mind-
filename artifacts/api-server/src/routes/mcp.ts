import { Router, type Request, type Response } from "express";
import { listTools, callTool } from "../mcp/registry.js";

const mcpRouter = Router();

mcpRouter.get("/mcp/tools", (_req: Request, res: Response) => {
  const tools = listTools();
  res.json({ tools });
});

mcpRouter.post("/mcp/call", async (req: Request, res: Response) => {
  const { toolName, params } = req.body ?? {};

  if (typeof toolName !== "string" || !toolName.trim()) {
    res.status(400).json({ error: "Missing required field 'toolName'." });
    return;
  }

  const toolParams = typeof params === "object" && params !== null ? params : {};

  try {
    const result = await callTool(toolName, toolParams);

    if (!result.success) {
      res.status(result.error?.includes("Unknown tool") ? 404 : 422).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({
      toolName,
      success: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: 0,
    });
  }
});

export default mcpRouter;
