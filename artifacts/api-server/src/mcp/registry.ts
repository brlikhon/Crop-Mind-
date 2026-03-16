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

export async function callTool(toolName: string, params: Record<string, unknown>): Promise<McpToolResult> {
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

  const result = await tool.call(params);

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
