import { afterEach, describe, expect, it, vi } from "vitest";
import { runWallSurveyScanAgent } from "./wallSurveyScanAgent.mjs";

// 1x1 transparent PNG, enough for the agent's image-data validation to pass.
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const LINKS = [
  { id: "source-1", label: "Source 1", group: "source", allowanceMetres: 3, limitMetres: 5 },
  { id: "display-1", label: "Panel 1", group: "display", allowanceMetres: 5, limitMetres: 5 },
  { id: "display-2", label: "Panel 2", group: "display", allowanceMetres: 5, limitMetres: 5 },
];

describe("runWallSurveyScanAgent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails loudly when live mode is selected without an API key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "false");

    await expect(
      runWallSurveyScanAgent({
        fileName: "worksheet.jpg",
        mimeType: "image/jpeg",
        base64Data: PNG_1PX,
        links: LINKS,
      }),
    ).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("returns the deterministic sample only when mock mode is explicitly forced", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "true");

    const scan = await runWallSurveyScanAgent({
      fileName: "worksheet.jpg",
      mimeType: "image/jpeg",
      base64Data: PNG_1PX,
      links: LINKS,
    });

    expect(scan.scanVersion).toBe("1.0");
    expect(scan.rows.map((row) => row.linkId)).toEqual(["source-1", "display-1"]);
    // The install line is transcribed with the run, so the sample carries it too.
    expect(scan.rows[0]).toMatchObject({ enclosure: "Sample back box", termination: "Sample HDMI faceplate" });
    expect(scan.unread).toEqual(["display-2"]);
    expect(scan.confidence).toBe(0);
    expect(scan.summary).toContain("worksheet.jpg");
  });

  it("answers the builder's development switch with the sample, without a key", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "false");

    const scan = await runWallSurveyScanAgent({
      fileName: "worksheet.jpg",
      mimeType: "image/jpeg",
      base64Data: PNG_1PX,
      links: LINKS,
      mock: true,
    });

    expect(scan.rows.map((row) => row.linkId)).toEqual(["source-1", "display-1"]);
    expect(scan.unread).toEqual(["display-2"]);
    expect(scan.confidence).toBe(0);
    // The sample says it was asked for, not that the deployment lacks a key.
    expect(scan.summary).toContain("development sample");
    expect(scan.summary).not.toContain("GEMINI_API_KEY");
  });

  it("refuses the sample on a production server", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "false");

    await expect(
      runWallSurveyScanAgent({
        fileName: "worksheet.jpg",
        mimeType: "image/jpeg",
        base64Data: PNG_1PX,
        links: LINKS,
        mock: true,
      }),
    ).rejects.toThrow(/development mode/i);
  });

  it("rejects a request without image data", async () => {
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "true");

    await expect(runWallSurveyScanAgent({ fileName: "worksheet.jpg", links: LINKS })).rejects.toThrow(
      /missing image data/i,
    );
  });

  it("rejects a request without the worksheet link list", async () => {
    vi.stubEnv("WINGMAN_AGENT_FORCE_MOCK", "true");

    await expect(
      runWallSurveyScanAgent({ fileName: "worksheet.jpg", mimeType: "image/jpeg", base64Data: PNG_1PX }),
    ).rejects.toThrow(/missing link list/i);
  });
});
