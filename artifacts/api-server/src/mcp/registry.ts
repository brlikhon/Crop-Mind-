import type { McpTool, McpToolSchema, McpToolResult, McpToolCallLog } from "./types.js";
import { weatherTool } from "./weather-tool.js";
import { cropAlertTool } from "./crop-alert-tool.js";
import { marketPriceTool } from "./market-price-tool.js";
import { subsidyTool } from "./subsidy-tool.js";

const tools: Map<string, McpTool> = new Map();
const callLogs: McpToolCallLog[] = [];
const MAX_LOG_SIZE = 500;

function register(tool: McpTool) {
  tools.set(tool.schema.name, tool);
}

register(weatherTool);
register(cropAlertTool);
register(marketPriceTool);
register(subsidyTool);

export function listTools(): McpToolSchema[] {
  return Array.from(tools.values()).map((t) => t.schema);
}

export function getTool(name: string): McpTool | undefined {
  return tools.get(name);
}

/** Hard timeout for any MCP tool call — prevents DB connection hangs from blocking agents. */
const TOOL_TIMEOUT_MS = 10_000;

export async function callTool(toolName: string, params: Record<string, unknown>): Promise<McpToolResult> {
  const start = Date.now();
  const tool = tools.get(toolName);
  if (!tool) {
    return {
      toolName,
      success: false,
      data: null,
      error: `Unknown tool '${toolName}'. Available tools: ${Array.from(tools.keys()).join(", ")}`,
      durationMs: 0,
    };
  }

  let result: McpToolResult;
  try {
    result = await Promise.race([
      tool.call(params),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool '${toolName}' timed out after ${TOOL_TIMEOUT_MS}ms (database may be unavailable)`)), TOOL_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    result = {
      toolName,
      success: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }

  const logEntry: McpToolCallLog = {
    toolName,
    params,
    durationMs: result.durationMs,
    resultSummary: result.success
      ? `Success (${result.durationMs}ms)`
      : `Error: ${result.error}`,
    timestamp: Date.now(),
  };

  callLogs.push(logEntry);
  if (callLogs.length > MAX_LOG_SIZE) {
    callLogs.splice(0, callLogs.length - MAX_LOG_SIZE);
  }

  console.log(
    `[MCP] ${toolName} called with ${JSON.stringify(params)} → ${logEntry.resultSummary}`
  );

  return result;
}

export function getCallLogs(limit = 50): McpToolCallLog[] {
  return callLogs.slice(-limit);
}
