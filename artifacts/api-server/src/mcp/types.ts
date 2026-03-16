export interface McpToolParam {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  description: string;
  enum?: string[];
}

export interface McpToolSchema {
  name: string;
  description: string;
  params: McpToolParam[];
}

export interface McpToolCallLog {
  toolName: string;
  params: Record<string, unknown>;
  durationMs: number;
  resultSummary: string;
  timestamp: number;
}

export interface McpToolResult {
  toolName: string;
  success: boolean;
  data: unknown;
  error?: string;
  durationMs: number;
}

export interface McpTool {
  schema: McpToolSchema;
  call(params: Record<string, unknown>): Promise<McpToolResult>;
}
