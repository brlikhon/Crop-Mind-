import { useMutation, useQuery } from "@tanstack/react-query";

// --- Types based on schema ---
export interface DiagnosisResult {
  primaryDiagnosis: string;
  confidence: number;
  differentialDiagnoses: { name: string; probability: number; reasoning: string }[];
  sources?: string[];
}

export interface FarmerQuery {
  rawQuery: string;
  preferredLanguage: string;
  cropType: string;
  region: string;
  country: string;
  symptoms: string[];
  additionalContext: string;
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
  safetyWarnings?: string[];
  timelineWeeks: number;
  estimatedCost: string;
  localResources: string[];
  sources?: string[];
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
  query: FarmerQuery;
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

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RegionRiskSummary {
  id: string;
  region: string;
  country: string;
  riskScore: number;
  riskLevel: RiskLevel;
  alertCount: number;
  affectedAreaHa: number;
  severityCounts: Record<RiskLevel, number>;
  crops: string[];
  topThreats: string[];
  priorityAction: string;
  leadThreat: {
    alertId: string;
    cropType: string;
    threatName: string;
    threatType: string;
    severity: RiskLevel;
    source: string | null;
  } | null;
  marketSignals: Array<{
    cropType: string;
    marketsTracked: number;
    avgUsdPerKg: number | null;
    avgChange7d: number | null;
    avgChange30d: number | null;
    pressure: "unknown" | "falling" | "rising" | "stable";
  }>;
  subsidyPrograms: Array<{
    programId: string;
    programName: string;
    benefitType: string;
    maxBenefitUsd: number | null;
    applicationDeadline: string | null;
  }>;
}

export interface CountryRiskSummary {
  country: string;
  alertCount: number;
  criticalAlerts: number;
  affectedAreaHa: number;
  highestRiskScore: number;
  activeSubsidyPrograms: number;
}

export interface IntelligenceOverview {
  generatedAt: string;
  summary: {
    activeAlerts: number;
    countriesCovered: number;
    regionsAtRisk: number;
    criticalRegions: number;
    totalAffectedAreaHa: number;
    activeSubsidyPrograms: number;
    marketsTracked: number;
  };
  countries: CountryRiskSummary[];
  regions: RegionRiskSummary[];
  interventionQueue: InterventionQueueItem[];
}

export interface InterventionQueueItem {
  rank: number;
  region: string;
  country: string;
  riskLevel: RiskLevel;
  riskScore: number;
  affectedAreaHa: number;
  leadThreat: RegionRiskSummary["leadThreat"];
  action: string;
}

export type ImpactStatus = "ready" | "next";
export type MarketTrend = "unknown" | "falling" | "rising" | "stable";

export interface CountryImpact {
  country: string;
  alertCount: number;
  criticalAlerts: number;
  affectedAreaHa: number;
  estimatedFarmers: number;
  cropTypes: string[];
  valueAtRiskUsd: number;
  preventableLossUsd: number;
}

export interface CropImpact {
  cropType: string;
  alertCount: number;
  criticalAlerts: number;
  affectedAreaHa: number;
  avgPriceUsdPerKg: number;
  marketTrend30d: MarketTrend;
  valueAtRiskUsd: number;
  preventableLossUsd: number;
}

export interface BusinessCase {
  segment: string;
  buyer: string;
  revenueModel: string;
  annualContractUsd: number;
  modeledAnnualValueUsd: number;
  proofMetric: string;
  adoptionMotion: string;
}

export interface JudgeScorecardItem {
  criterion: string;
  score: number;
  evidence: string;
  nextProof: string;
}

export interface ProofMilestone {
  phase: string;
  metric: string;
  target: string;
  owner: string;
  status: ImpactStatus;
}

export interface TrustReadinessItem {
  control: string;
  evidence: string;
  owner: string;
  status: ImpactStatus;
}

export interface ImpactOverview {
  generatedAt: string;
  summary: {
    activeAlerts: number;
    affectedAreaHa: number;
    estimatedFarmersInAffectedZones: number;
    modeledValueAtRiskUsd: number;
    modeledPreventableLossUsd: number;
    conservativeFirstSeasonSavingsUsd: number;
    annualPilotCostUsd: number;
    benefitCostRatio: number;
    activeCountries: number;
    cropTypes: number;
    supportPrograms: number;
  };
  countryImpacts: CountryImpact[];
  cropImpacts: CropImpact[];
  businessCases: BusinessCase[];
  judgeScorecard: JudgeScorecardItem[];
  proofMilestones: ProofMilestone[];
  trustReadiness: TrustReadinessItem[];
  methodology: {
    assumptions: string[];
    caveats: string[];
  };
}

export type DemoStatus = "ready" | "watch" | "next";

export interface DemoDataFootprint {
  activeAlerts: number;
  criticalAlerts: number;
  countriesCovered: number;
  cropTypes: number;
  marketRows: number;
  activeSubsidyPrograms: number;
}

export interface DemoFlowStep {
  step: number;
  title: string;
  route: string;
  durationSeconds: number;
  narration: string;
  judgeSignal: string;
}

export interface DemoSampleCase {
  id: string;
  title: string;
  persona: string;
  preferredLanguage: string;
  query: string;
  expectedEvidence: string[];
}

export interface DemoProofPillar {
  pillar: string;
  route: string;
  evidence: string;
}

export interface DemoTechnicalHighlight {
  track: string;
  evidence: string;
}

export interface DemoLaunchReadiness {
  area: string;
  status: DemoStatus;
  evidence: string;
}

export interface DemoBrief {
  generatedAt: string;
  headline: string;
  demoRuntimeMinutes: number;
  dataFootprint: DemoDataFootprint;
  openingHook: string;
  demoFlow: DemoFlowStep[];
  sampleCases: DemoSampleCase[];
  proofPillars: DemoProofPillar[];
  technicalHighlights: DemoTechnicalHighlight[];
  launchReadiness: DemoLaunchReadiness[];
  closingScript: string;
  submissionChecklist: string[];
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

export interface DiagnoseOptions {
  imageFile?: File;
  preferredLanguage?: string;
}

export function useDiagnoseCrop() {
  return useMutation({
    mutationKey: ["diagnoseCrop"],
    mutationFn: async (data: { query: string; preferredLanguage?: string }): Promise<DiagnoseResponse> => {
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
  options: DiagnoseOptions = {}
): Promise<DiagnoseResponse | null> {
  const formData = new FormData();
  formData.append("query", query);
  if (options.preferredLanguage) {
    formData.append("preferredLanguage", options.preferredLanguage);
  }
  if (options.imageFile) {
    formData.append("image", options.imageFile);
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

export function useIntelligenceOverview() {
  return useQuery({
    queryKey: ["intelligenceOverview"],
    queryFn: async (): Promise<IntelligenceOverview> => {
      const res = await fetch("/api/intelligence/overview");
      if (!res.ok) throw new Error("Failed to fetch intelligence overview");
      return res.json();
    },
  });
}

export function useImpactOverview() {
  return useQuery({
    queryKey: ["impactOverview"],
    queryFn: async (): Promise<ImpactOverview> => {
      const res = await fetch("/api/impact/overview");
      if (!res.ok) throw new Error("Failed to fetch impact overview");
      return res.json();
    },
  });
}

export function useDemoBrief() {
  return useQuery({
    queryKey: ["demoBrief"],
    queryFn: async (): Promise<DemoBrief> => {
      const res = await fetch("/api/demo/brief");
      if (!res.ok) throw new Error("Failed to fetch demo brief");
      return res.json();
    },
  });
}
