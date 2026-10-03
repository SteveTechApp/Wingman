import { afterEach, describe, expect, it, vi } from "vitest";
import { runGuruAgent } from "./guruAgent.mjs";

// Negative control: when mock mode is NOT explicitly forced and no API key is
// configured, the guru agent must fail loudly instead of silently returning a
// locally-derived answer as if it were a live model result.
describe("runGuruAgent config gate (negative control)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails loudly when forced-mock mode is disabled and no API key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "false");

    await expect(runGuruAgent({ question: "What switcher fits a 4x2 rushes?" })).rejects.toThrow(
      /GEMINI_API_KEY/,
    );
  });

  it("returns the derived answer only when mock mode is explicitly forced", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "true");

    const out = await runGuruAgent({ question: "What switcher fits a 4x2 rushes?" });
    expect(out.guruVersion).toBe("1.0");
  });
});