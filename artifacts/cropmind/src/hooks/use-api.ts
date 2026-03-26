import { useMutation, useQuery } from "@tanstack/react-query";

// --- Types based on schema ---
export interface DiagnosisResult {
  primaryDiagnosis: string;
  confidence: number;
  differentialDiagnoses: { name: string; probability: number; reasoning: string }[];
}

export interface WeatherAssessment {
  currentConditions: string;
  forecast: string;
  weatherRisk: string;
  adaptations: string[];
}

export interface MarketIntelligence {
  currentPrice: string;
  priceOutlook: string;
  recommendation: string;
  availableSubsidies: string[];
}

export interface TreatmentProtocol {
  immediateActions: string[];
  preventiveMeasures: string[];
  timelineWeeks: number;
  estimatedCost: string;
  localResources: string[];
}

export interface AgentFinding {
  agentName: string;
  status: "success" | "error" | "skipped";
  confidence: number;
  summary: string;
  details: any;
  reasoning: string;
}

export interface AgentTrace {
  agentName: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  input: any;
  output: AgentFinding;
}

export interface OrchestratorDecision {
  agentName: string;
  action: "invoked" | "skipped" | "accepted" | "overridden" | "conflict_resolved";
  rationale: string;
  details?: any;
}

export interface ConflictResolution {
  conflictType: string;
  agentA: string;
  agentB: string;
  resolution: string;
  rationale: string;
  chosenAgent: string;
}

export interface McpToolCallEntry {
  toolName: string;
  params: Record<string, unknown>;
  success: boolean;
  data: unknown;
  error?: string;
  durationMs: number;
  timestamp: number;
  calledBy: string;
}

export interface DiagnoseResponse {
  sessionId: string;
  query: any;
  diagnosis?: DiagnosisResult | null;
  weatherAssessment?: WeatherAssessment | null;
  marketIntelligence?: MarketIntelligence | null;
  treatmentProtocol?: TreatmentProtocol | null;
  finalRecommendation: string;
  confidenceScore: number;
  traces: AgentTrace[];
  orchestratorDecisions: OrchestratorDecision[];
  conflictResolutions: ConflictResolution[];
  mcpToolCalls: McpToolCallEntry[];
  totalDurationMs: number;
}

export interface SimilarCase {
  caseId: string;
  cropType: string;
  country: string;
  region: string;
  symptomsText: string;
  diagnosis: string;
  treatmentApplied: string;
  outcomeScore: number;
  resolvedAt: string;
  similarityScore: number;
  weightedScore: number;
}

export interface CaseSearchResponse {
  query: string;
  filters: any;
  candidatesFound: number;
  results: SimilarCase[];
  durationMs: number;
}

export interface McpToolSchema {
  name: string;
  description: string;
  params: any[];
}

export type StreamEvent =
  | { type: "agent_started"; agentName: string }
  | { type: "agent_completed"; agentName: string; trace: AgentTrace }
  | { type: "mcp_tool_call"; call: McpToolCallEntry }
  | { type: "synthesis_started" }
  | { type: "complete"; result: DiagnoseResponse }
  | { type: "error"; message: string };

export interface StreamCallbacks {
  onEvent?: (event: StreamEvent) => void;
  onComplete?: (result: DiagnoseResponse) => void;
  onError?: (error: Error) => void;
}

export function useDiagnoseCrop() {
  return useMutation({
    mutationKey: ["diagnoseCrop"],
    mutationFn: async (data: { query: string }): Promise<DiagnoseResponse> => {
      const res = await fetch("/api/cropagent/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to diagnose" }));
        throw new Error(err.error || "Failed to diagnose");
      }
      return res.json();
    },
  });
}

export async function streamDiagnose(
  query: string,
  callbacks: StreamCallbacks,
  imageFile?: File
): Promise<DiagnoseResponse | null> {
  const formData = new FormData();
  formData.append("query", query);
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const res = await fetch("/api/cropagent/diagnose/stream", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to diagnose" }));
    throw new Error(err.error || "Failed to diagnose");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: DiagnoseResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as StreamEvent;
        callbacks.onEvent?.(event);
        if (event.type === "complete") {
          finalResult = event.result;
          callbacks.onComplete?.(event.result);
        }
      } catch {
        // skip malformed events
      }
    }
  }

  return finalResult;
}

export function useSearchCases() {
  return useMutation({
    mutationKey: ["searchCases"],
    mutationFn: async (data: { symptomsDescription: string; topK?: number }): Promise<CaseSearchResponse> => {
      const res = await fetch("/api/cases/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to search cases" }));
        throw new Error(err.error || "Failed to search cases");
      }
      return res.json();
    },
  });
}

export function useMcpTools() {
  return useQuery({
    queryKey: ["mcpTools"],
    queryFn: async (): Promise<{ tools: McpToolSchema[] }> => {
      const res = await fetch("/api/mcp/tools");
      if (!res.ok) throw new Error("Failed to fetch MCP tools");
      return res.json();
    },
  });
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ["healthCheck"],
    queryFn: async () => {
      const res = await fetch("/api/healthz");
      if (!res.ok) throw new Error("API not healthy");
      return res.json();
    },
  });
}
