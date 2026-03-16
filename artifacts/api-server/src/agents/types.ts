export interface FarmerQuery {
  rawQuery: string;
  cropType: string;
  region: string;
  country: string;
  symptoms: string[];
  additionalContext: string;
}

export interface AgentFinding {
  agentName: string;
  status: "success" | "error" | "skipped";
  confidence: number;
  summary: string;
  details: Record<string, unknown>;
  reasoning: string;
}

export interface AgentTrace {
  agentName: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  input: Record<string, unknown>;
  output: AgentFinding;
}

export interface AgentSession {
  id: string;
  query: FarmerQuery;
  findings: AgentFinding[];
  traces: AgentTrace[];
  startedAt: number;
}

export interface DiagnosisResult {
  primaryDiagnosis: string;
  confidence: number;
  differentialDiagnoses: Array<{
    name: string;
    probability: number;
    reasoning: string;
  }>;
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

export interface OrchestratorDecision {
  agentName: string;
  action: "invoked" | "skipped" | "accepted" | "overridden" | "conflict_resolved";
  rationale: string;
  details?: Record<string, unknown>;
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

export interface OrchestratorResult {
  sessionId: string;
  query: FarmerQuery;
  diagnosis: DiagnosisResult | null;
  weatherAssessment: WeatherAssessment | null;
  marketIntelligence: MarketIntelligence | null;
  treatmentProtocol: TreatmentProtocol | null;
  finalRecommendation: string;
  confidenceScore: number;
  traces: AgentTrace[];
  orchestratorDecisions: OrchestratorDecision[];
  conflictResolutions: ConflictResolution[];
  mcpToolCalls: McpToolCallEntry[];
  totalDurationMs: number;
}
