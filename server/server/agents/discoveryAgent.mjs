import { getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveDiscoveryFromInput } from "./lib/mockDerivations.mjs";
import { discoverySystemPrompt } from "./prompts/discoveryPrompt.mjs";
import { discoveryResponseSchema } from "./schemas/discovery.schema.mjs";
import { getProjectContext, listMissingDiscoveryFields } from "./tools/index.mjs";

export async function runDiscoveryAgent(input, deps = {}) {
  const config = getAgentConfig();
  const projectContext = await getProjectContext({
    workspaceId: input?.workspaceId,
    projectId: input?.projectId,
    deps,
  });

  const missingFieldHints = await listMissingDiscoveryFields({
    userInput: input?.userInput,
    deps,
  });

  const payload = {
    workspaceId: input?.workspaceId || null,
    projectId: input?.projectId || null,
    userInput: input?.userInput || "",
    context: {
      ...projectContext,
      ...(input?.context || {}),
    },
    missingFieldHints,
  };

  if (shouldUseMockMode(config)) {
    return deriveDiscoveryFromInput(payload);
  }

  try {
    return await geminiStructuredGenerate({
      apiKey: config.geminiApiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutMs: config.timeoutMs,
      systemPrompt: discoverySystemPrompt,
      userPayload: payload,
      responseJsonSchema: discoveryResponseSchema,
      temperature: 0.15,
    });
  } catch {
    return deriveDiscoveryFromInput(payload);
  }
}
