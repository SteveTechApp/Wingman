import { getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveArchitectureFromBrief } from "./lib/mockDerivations.mjs";
import { architectSystemPrompt } from "./prompts/architectPrompt.mjs";
import { architectResponseSchema } from "./schemas/architect.schema.mjs";
import {
  searchSkuCatalog,
  getCompatibilityRules,
  getVideoWallRules,
  getProductIntelligenceSummary,
} from "./tools/index.mjs";

export async function runArchitectAgent(input, deps = {}) {
  const config = getAgentConfig();
  const brief = input?.brief || {};
  const options = input?.options || {};
  const videoWall = Boolean(brief?.roomProfile?.videoWall);

  const [catalogMatches, compatibilityRules, videoWallRules, productIntelligence] = await Promise.all([
    searchSkuCatalog({
      query: brief?.summary || "",
      solutionIntent: brief?.solutionIntent || "",
      videoWall,
      preferValueEngineering: Boolean(options?.preferValueEngineering),
      deps,
    }),
    getCompatibilityRules({ deps }),
    getVideoWallRules({ deps }),
    getProductIntelligenceSummary({ deps }),
  ]);

  const payload = {
    workspaceId: input?.workspaceId || null,
    projectId: input?.projectId || null,
    brief,
    options,
    context: {
      catalogMatches,
      compatibilityRules,
      videoWallRules,
      productIntelligence,
    },
  };

  if (shouldUseMockMode(config)) {
    return deriveArchitectureFromBrief({
      brief,
      catalogMatches,
      compatibilityRules,
      videoWallRules,
      options,
    });
  }

  try {
    return await geminiStructuredGenerate({
      apiKey: config.geminiApiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutMs: config.timeoutMs,
      systemPrompt: architectSystemPrompt,
      userPayload: payload,
      responseJsonSchema: architectResponseSchema,
      temperature: 0.2,
    });
  } catch {
    return deriveArchitectureFromBrief({
      brief,
      catalogMatches,
      compatibilityRules,
      videoWallRules,
      options,
    });
  }
}
