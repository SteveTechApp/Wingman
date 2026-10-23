export function getAgentConfig() {
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.WINGMAN_AGENT_MODEL || process.env.GURU_GEMINI_MODEL || "gemini-3-flash-preview",
    timeoutMs: Number(process.env.WINGMAN_AGENT_TIMEOUT_MS || 45000),
    forceMock: String(process.env.WINGMAN_AGENT_FORCE_MOCK || "").toLowerCase() === "true",
    // The builder's sample-reading switch is honoured by a development server
    // only. A deployed server must never let a request replace a transcription
    // with sample data, so the permission lives in the environment, never in
    // the request body alone.
    requestMock: String(process.env.NODE_ENV || "").toLowerCase() !== "production",
    baseUrl:
      process.env.WINGMAN_AGENT_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta/models",
  };
}

export function shouldUseMockMode(config = getAgentConfig()) {
  // Mock mode is EXPLICIT only. A missing API key must not silently degrade a
  // production agent into returning locally-derived answers.
  return config.forceMock;
}

export function assertAgentConfigured(config = getAgentConfig()) {
  if (!config.forceMock && !config.geminiApiKey) {
    throw new Error(
      "Agent live mode requires GEMINI_API_KEY, or set WINGMAN_AGENT_FORCE_MOCK=true to explicitly enable deterministic mock mode.",
    );
  }
}
