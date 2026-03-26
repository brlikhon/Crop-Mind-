export const AGENT_MODEL = "gemini-2.5-flash";
export const AGENT_MAX_TOKENS = 8192;

export const ORCHESTRATOR_MODEL = "gemini-2.5-pro";
export const ORCHESTRATOR_MAX_TOKENS = 4096;

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
