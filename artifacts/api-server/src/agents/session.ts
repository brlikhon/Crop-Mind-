import { randomUUID } from "crypto";
import type { AgentSession, FarmerQuery, AgentFinding, AgentTrace } from "./types.js";

export function createSession(query: FarmerQuery): AgentSession {
  return {
    id: randomUUID(),
    query,
    findings: [],
    traces: [],
    startedAt: Date.now(),
  };
}

export function addFinding(session: AgentSession, finding: AgentFinding): void {
  session.findings.push(finding);
}

export function addTrace(session: AgentSession, trace: AgentTrace): void {
  session.traces.push(trace);
}

export async function runAgentWithTrace(
  session: AgentSession,
  agentName: string,
  agentFn: (session: AgentSession) => Promise<AgentFinding>
): Promise<AgentFinding> {
  const startedAt = Date.now();
  const input = {
    query: session.query,
    existingFindings: session.findings.map((f) => ({
      agentName: f.agentName,
      summary: f.summary,
    })),
  };

  let finding: AgentFinding;
  try {
    finding = await agentFn(session);
  } catch (error) {
    finding = {
      agentName,
      status: "error",
      confidence: 0,
      summary: `Agent ${agentName} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      details: {},
      reasoning: "Agent execution failed",
    };
  }

  const completedAt = Date.now();
  const trace: AgentTrace = {
    agentName,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
    input,
    output: finding,
  };

  addFinding(session, finding);
  addTrace(session, trace);

  return finding;
}
