import { getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveValidation } from "./lib/mockDerivations.mjs";
import { validationSystemPrompt } from "./prompts/validationPrompt.mjs";
import { validationResponseSchema } from "./schemas/validation.schema.mjs";
import { getCompatibilityRules, getVideoWallRules, getProductIntelligenceSummary } from "./tools/index.mjs";

export async function runValidationAgent(input, deps = {}) {
  const config = getAgentConfig();

  const [compatibilityRules, videoWallRules, productIntelligence] = await Promise.all([
    getCompatibilityRules({ deps }),
    getVideoWallRules({ deps }),
    getProductIntelligenceSummary({ deps }),
  ]);

  const payload = {
    workspaceId: input?.workspaceId || null,
    projectId: input?.projectId || null,
    brief: input?.brief || {},
    architecture: input?.architecture || {},
    context: {
      compatibilityRules,
      videoWallRules,
      productIntelligence,
    },
  };

  if (shouldUseMockMode(config)) {
    return deriveValidation({
      brief: payload.brief,
      architecture: payload.architecture,
    });
  }

  try {
    return await geminiStructuredGenerate({
      apiKey: config.geminiApiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutMs: config.timeoutMs,
      systemPrompt: validationSystemPrompt,
      userPayload: payload,
      responseJsonSchema: validationResponseSchema,
      temperature: 0.15,
    });
  } catch {
    return deriveValidation({
      brief: payload.brief,
      architecture: payload.architecture,
    });
  }
}
