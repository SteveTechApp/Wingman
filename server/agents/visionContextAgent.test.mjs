import { afterEach, describe, expect, it, vi } from "vitest";
import { runVisionContextAgent } from "./visionContextAgent.mjs";

// The vision-context agent shares the same config gate as the guru agent:
// mock mode is explicit-only, and a missing API key fails loudly.
// 1x1 transparent PNG, enough for the agent's image-data validation to pass.
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("runVisionContextAgent config gate (negative control)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails loudly when forced-mock mode is disabled and no API key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "false");

    await expect(
      runVisionContextAgent({
        fileName: "room.png",
        mimeType: "image/png",
        base64Data: PNG_1PX,
      }),
    ).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("returns the derived context only when mock mode is explicitly forced", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "true");

    const out = await runVisionContextAgent({
      fileName: "room.png",
      mimeType: "image/png",
      base64Data: PNG_1PX,
    });
    expect(out.visionVersion).toBe("1.0");
  });
});