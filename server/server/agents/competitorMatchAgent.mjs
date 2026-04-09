import { getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveCompetitorMatch } from "./lib/mockDerivations.mjs";
import { competitorSystemPrompt } from "./prompts/competitorPrompt.mjs";
import { competitorResponseSchema } from "./schemas/competitor.schema.mjs";
import { getProductIntelligenceSummary } from "./tools/index.mjs";

export async function runCompetitorMatchAgent(input, deps = {}) {
  const config = getAgentConfig();
  const productIntelligence = await getProductIntelligenceSummary({ deps });

  const payload = {
    competitorVendor: input?.competitorVendor || "",
    competitorSku: input?.competitorSku || "",
    notes: input?.notes || "",
    context: {
      productIntelligence,
      policy: [
        "Competitor matching is advisory only.",
        "Competitor data must not be used in proposal or BOM generation.",
      ],
    },
  };

  if (shouldUseMockMode(config)) {
    return deriveCompetitorMatch(payload);
  }

  try {
    return await geminiStructuredGenerate({
      apiKey: config.geminiApiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutMs: config.timeoutMs,
      systemPrompt: competitorSystemPrompt,
      userPayload: payload,
      responseJsonSchema: competitorResponseSchema,
      temperature: 0.2,
    });
  } catch {
    return deriveCompetitorMatch(payload);
  }
}
