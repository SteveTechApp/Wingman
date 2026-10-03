import { assertAgentConfigured, getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveGuruAnswer } from "./lib/mockDerivations.mjs";
import { guruSystemPrompt } from "./prompts/guruPrompt.mjs";
import { guruResponseSchema } from "./schemas/guru.schema.mjs";
import {
  getProductDetails,
  getProductIntelligenceSummary,
  getCompatibilityRules,
  searchSkuCatalog,
} from "./tools/index.mjs";

export async function runGuruAgent(input, deps = {}) {
  const config = getAgentConfig();
  const question = input?.question || "";
  const exactSku = question.toUpperCase().match(/\b[A-Z]{2,8}(?:-[A-Z0-9]{1,})+\b/)?.[0];
  const [productIntelligence, compatibilityRules, exactProduct, relevantProducts] = await Promise.all([
    getProductIntelligenceSummary({ deps }),
    getCompatibilityRules({ deps }),
    exactSku ? getProductDetails({ sku: exactSku, deps }) : null,
    searchSkuCatalog({ query: question, solutionIntent: input?.context?.activity || "", deps }),
  ]);

  const payload = {
    question,
    brief: input?.brief || {},
    architecture: input?.architecture || {},
    context: {
      activity: input?.context || {},
      productIntelligence,
      compatibilityRules,
      exactProduct,
      relevantProducts: relevantProducts.slice(0, 8),
    },
  };

  if (shouldUseMockMode(config)) {
    return deriveGuruAnswer(payload);
  }

  assertAgentConfigured(config);

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
