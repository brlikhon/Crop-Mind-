import type { FarmerQuery, AgentFinding, AgentTrace } from "./types.js";

export interface OrchestratorSession {
  id: string;
  adkUserId: string;
  query: FarmerQuery;
  findings: AgentFinding[];
  traces: AgentTrace[];
  startedAt: number;
}

let sessionCounter = 0;

export function createOrchestratorSession(query: FarmerQuery): OrchestratorSession {
  sessionCounter++;
  return {
    id: `cropmind-${Date.now()}-${sessionCounter}`,
    adkUserId: `farmer-${Date.now()}`,
    query,
    findings: [],
    traces: [],
    startedAt: Date.now(),
  };
}

export function addFinding(session: OrchestratorSession, finding: AgentFinding): void {
  session.findings.push(finding);
}

export function addTrace(session: OrchestratorSession, trace: AgentTrace): void {
  session.traces.push(trace);
}
