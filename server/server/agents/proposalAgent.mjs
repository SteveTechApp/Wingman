import { getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveProposal } from "./lib/mockDerivations.mjs";
import { proposalSystemPrompt } from "./prompts/proposalPrompt.mjs";
import { proposalResponseSchema } from "./schemas/proposal.schema.mjs";
import { getProductIntelligenceSummary } from "./tools/index.mjs";

export async function runProposalAgent(input, deps = {}) {
  const config = getAgentConfig();
  const productIntelligence = await getProductIntelligenceSummary({ deps });

  const payload = {
    workspaceId: input?.workspaceId || null,
    projectId: input?.projectId || null,
    brief: input?.brief || {},
    architecture: input?.architecture || {},
    validation: input?.validation || {},
    context: {
      productIntelligence,
      policy: [
        "Proposal and BOM output must not use competitor data.",
        "If validation is fail, proposal readiness must be blocked.",
      ],
    },
  };

  if (shouldUseMockMode(config)) {
    return deriveProposal(payload);
  }

  try {
    return await geminiStructuredGenerate({
      apiKey: config.geminiApiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutMs: config.timeoutMs,
      systemPrompt: proposalSystemPrompt,
      userPayload: payload,
      responseJsonSchema: proposalResponseSchema,
      temperature: 0.25,
    });
  } catch {
    return deriveProposal(payload);
  }
}
