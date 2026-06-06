export function getAgentConfig() {
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.WINGMAN_AGENT_MODEL || process.env.GURU_GEMINI_MODEL || "gemini-3-flash-preview",
    timeoutMs: Number(process.env.WINGMAN_AGENT_TIMEOUT_MS || 45000),
    forceMock: String(process.env.WINGMAN_AGENT_FORCE_MOCK || "").toLowerCase() === "true",
    baseUrl:
      process.env.WINGMAN_AGENT_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta/models",
  };
}

export function shouldUseMockMode(config = getAgentConfig()) {
  return config.forceMock || !config.geminiApiKey;
}
