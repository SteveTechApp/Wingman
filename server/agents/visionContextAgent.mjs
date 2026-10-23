import { assertAgentConfigured, getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveVisionContext } from "./lib/mockDerivations.mjs";
import { visionContextSystemPrompt } from "./prompts/visionContextPrompt.mjs";
import { visionContextResponseSchema } from "./schemas/visionContext.schema.mjs";

export async function runVisionContextAgent(input) {
  const config = getAgentConfig();
  const fileName = String(input?.fileName || "").trim();
  const mimeType = String(input?.mimeType || "").trim();
  const base64Data = String(input?.base64Data || "").trim();

  if (!base64Data || !mimeType) {
    throw new Error("Missing image data for vision context analysis.");
  }

  const fallbackPayload = { fileName };

  if (shouldUseMockMode(config)) {
    return deriveVisionContext(fallbackPayload);
  }

  // The survey page's development switch: return the deterministic sample by
  // request so the review and apply steps can be walked in a browser without a
  // model key. Only a development server may answer it — a deployed server
  // refuses rather than letting a request swap a reading for sample data.
  if (input?.mock === true) {
    if (!config.requestMock) {
      throw new Error("Sample site-photo readings are available only when the server runs in development mode.");
    }
    return deriveVisionContext({ fileName, requested: true });
  }

  assertAgentConfigured(config);

  try {
    return await geminiStructuredGenerate({
      apiKey: config.geminiApiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutMs: config.timeoutMs,
      systemPrompt: visionContextSystemPrompt,
      userPayload: { fileName, hint: input?.hint || "" },
      responseJsonSchema: visionContextResponseSchema,
      temperature: 0.2,
      images: [{ mimeType, base64Data }],
    });
  } catch (error) {
    console.warn(
      "[visionContextAgent] Gemini call failed; returning fallback vision context.",
      error instanceof Error ? error.message : error,
    );
    return deriveVisionContext(fallbackPayload);
  }
}
