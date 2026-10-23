import { assertAgentConfigured, getAgentConfig, shouldUseMockMode } from "./config.mjs";
import { geminiStructuredGenerate } from "./lib/geminiStructuredGenerate.mjs";
import { deriveWallSurveyScan } from "./lib/mockDerivations.mjs";
import { wallSurveyScanSystemPrompt } from "./prompts/wallSurveyScanPrompt.mjs";
import { wallSurveyScanResponseSchema } from "./schemas/wallSurveyScan.schema.mjs";

/**
 * Read a photographed wall measurement worksheet back into link measurements.
 *
 * The photo is evidence, not a source of truth: every model answer is checked
 * against the link ids the client sent, so a transcription can only name links
 * that exist in the design. Links the model could not read come back by id and
 * the client asks for those to be typed, rather than clearing or guessing them.
 */
export async function runWallSurveyScanAgent(input) {
  const config = getAgentConfig();
  const fileName = String(input?.fileName || "").trim();
  const mimeType = String(input?.mimeType || "").trim();
  const base64Data = String(input?.base64Data || "").trim();
  const links = Array.isArray(input?.links)
    ? input.links
        .map((link) => ({
          id: String(link?.id || "").trim(),
          label: String(link?.label || "").trim(),
          group: String(link?.group || "").trim(),
          allowanceMetres: Number(link?.allowanceMetres),
          limitMetres: Number(link?.limitMetres),
        }))
        .filter((link) => link.id)
    : [];

  if (!base64Data || !mimeType) {
    throw new Error("Missing image data for worksheet scanning.");
  }
  if (links.length === 0) {
    throw new Error("Missing link list for worksheet scanning.");
  }

  if (shouldUseMockMode(config)) {
    return deriveWallSurveyScan({ fileName, links });
  }

  // The builder's development switch: return the deterministic sample by
  // request so the review, apply and reopen steps can be walked in a browser
  // without a model key. Only a development server may answer it — a deployed
  // server refuses rather than letting a request swap a transcription for
  // sample data.
  if (input?.mock === true) {
    if (!config.requestMock) {
      throw new Error("Sample worksheet readings are available only when the server runs in development mode.");
    }
    return deriveWallSurveyScan({ fileName, links, requested: true });
  }

  assertAgentConfigured(config);

  try {
    return await geminiStructuredGenerate({
      apiKey: config.geminiApiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      timeoutMs: config.timeoutMs,
      systemPrompt: wallSurveyScanSystemPrompt,
      userPayload: {
        fileName,
        // The printed rows the sheet shows, so the model can match handwriting
        // to a link even when the small id print is partly covered.
        links: links.map((link) => ({
          id: link.id,
          label: link.label,
          allowanceMetres: link.allowanceMetres,
          limitMetres: link.limitMetres,
        })),
        hint: String(input?.hint || ""),
      },
      responseJsonSchema: wallSurveyScanResponseSchema,
      temperature: 0.1,
      images: [{ mimeType, base64Data }],
    });
  } catch (error) {
    // A failed read must not fabricate measurements: report nothing read and
    // let the surveyor type the runs.
    console.warn(
      "[wallSurveyScanAgent] Gemini call failed; returning an empty scan.",
      error instanceof Error ? error.message : error,
    );
    return {
      scanVersion: "1.0",
      summary: "The worksheet photo could not be read. Enter the measured runs by hand or try another photo.",
      rows: [],
      unread: links.map((link) => link.id),
      confidence: 0,
    };
  }
}
