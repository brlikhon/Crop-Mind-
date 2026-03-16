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

// --- Hooks ---

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
