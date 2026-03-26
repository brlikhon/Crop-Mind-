import { Router, type Request, type Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { listTools, callTool } from "../mcp/registry.js";
import { createMcpServer } from "../mcp/mcp-server.js";

const mcpRouter = Router();

const activeSessions = new Map<string, SSEServerTransport>();

mcpRouter.get("/mcp/sse", async (req: Request, res: Response) => {
  const transport = new SSEServerTransport("/api/mcp/messages", res);
  const server = createMcpServer();
  activeSessions.set(transport.sessionId, transport);

  res.on("close", () => {
    activeSessions.delete(transport.sessionId);
  });

  await server.connect(transport);
});

mcpRouter.post("/mcp/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = activeSessions.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: "MCP session not found. Connect via /api/mcp/sse first." });
    return;
  }

  await transport.handlePostMessage(req, res);
});

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
