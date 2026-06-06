import { getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveGuruAnswer } from "./lib/mockDerivations.mjs";
import { guruSystemPrompt } from "./prompts/guruPrompt.mjs";
import { guruResponseSchema } from "./schemas/guru.schema.mjs";
import { getProductIntelligenceSummary, getCompatibilityRules } from "./tools/index.mjs";

export async function runGuruAgent(input, deps = {}) {
  const config = getAgentConfig();
  const [productIntelligence, compatibilityRules] = await Promise.all([
    getProductIntelligenceSummary({ deps }),
    getCompatibilityRules({ deps }),
  ]);

  const payload = {
    question: input?.question || "",
    brief: input?.brief || {},
    architecture: input?.architecture || {},
    context: {
      productIntelligence,
      compatibilityRules,
    },
  };

  if (shouldUseMockMode(config)) {
    return deriveGuruAnswer(payload);
  }

  try {
    return await geminiStructuredGenerate({
      apiKey: config.geminiApiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutMs: config.timeoutMs,
      systemPrompt: guruSystemPrompt,
      userPayload: payload,
      responseJsonSchema: guruResponseSchema,
      temperature: 0.3,
    });
  } catch (error) {
    // Never fail silently: a live key is configured but the model call failed.
    // Log a clear warning so operators can see degraded answers in production,
    // then return the locally-derived answer as a graceful fallback.
    console.warn(
      "[guruAgent] Gemini call failed; returning locally-derived fallback answer.",
      error instanceof Error ? error.message : error,
    );
    return deriveGuruAnswer(payload);
  }
}
