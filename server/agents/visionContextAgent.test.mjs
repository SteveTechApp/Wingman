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

  it("answers the survey page's development switch with the sample, without a key", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "false");

    const out = await runVisionContextAgent({
      fileName: "boardroom.jpg",
      mimeType: "image/jpeg",
      base64Data: PNG_1PX,
      mock: true,
    });

    // Shaped like a real reading, so the review and apply steps have something
    // to show: the photo's own context plus the structured site-survey rows.
    expect(out.attachmentKind).toBe("room_photo");
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.roomObservations.length).toBeGreaterThan(0);
    expect(out.locations.map((place) => place.name)).toContain("Sample floor rack");
    expect(out.equipment.map((device) => device.name)).toContain("Sample receiver");
    expect(out.cables).toHaveLength(2);
    // The sample says it was asked for, not that the deployment lacks a key.
    expect(out.summary).toContain("development sample");
    expect(out.summary).not.toContain("GEMINI_API_KEY");
  });

  it("refuses the sample on a production server", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "false");

    await expect(
      runVisionContextAgent({
        fileName: "boardroom.jpg",
        mimeType: "image/jpeg",
        base64Data: PNG_1PX,
        mock: true,
      }),
    ).rejects.toThrow(/development mode/i);
  });
});