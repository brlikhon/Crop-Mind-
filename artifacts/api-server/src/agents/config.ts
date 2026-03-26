// Fast agents (disease, weather, market, treatment) - stable GA, cheap
export const AGENT_MODEL = "gemini-2.5-flash";
export const AGENT_MAX_TOKENS = 8192; // 2.5 Flash supports higher tokens

// Orchestrator uses Pro for highest-quality final synthesis
export const ORCHESTRATOR_MODEL = "gemini-2.5-pro";
export const ORCHESTRATOR_MAX_TOKENS = 4096;
