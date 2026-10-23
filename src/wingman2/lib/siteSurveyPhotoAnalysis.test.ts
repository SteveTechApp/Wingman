import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeVisualAttachment, downscaleImageToBase64 } from "./visionAttachments";
import { runVisionContextAnalysis } from "../api/wingmanApi";
import { analyzeSiteSurveyPhoto } from "./siteSurveyPhotoAnalysis";

vi.mock("./visionAttachments", () => ({
  analyzeVisualAttachment: vi.fn(),
  downscaleImageToBase64: vi.fn(),
}));

vi.mock("../api/wingmanApi", () => ({
  runVisionContextAnalysis: vi.fn(),
}));

const PHOTO = new File(["photo"], "boardroom.jpg", { type: "image/jpeg" });

/** The attachment reader's answer, as the vision-context agent returns it. */
function context(overrides: { summary?: string; confidence?: number } = {}) {
  return {
    id: "boardroom.jpg-1",
    fileName: "boardroom.jpg",
    kind: "room_photo" as const,
    summary: overrides.summary ?? "A boardroom with one display wall.",
    roomObservations: ["One display wall at the far end."],
    visibleEquipment: ["One 55 in panel"],
    layoutNotes: ["The table faces the display wall."],
    confidence: overrides.confidence ?? 0.6,
    analyzedAt: "2026-10-22T09:00:00.000Z",
  };
}

describe("analyzeSiteSurveyPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(downscaleImageToBase64).mockResolvedValue({ base64Data: "AAAA", mimeType: "image/jpeg" });
    // The survey hint asks the agent for rows the attachment reader's own type
    // does not name; the analysis reads them off the same response.
    const extraction = {
      locations: [{ name: "Display wall", type: "display-wall" }],
      equipment: [{ name: "55 in display", category: "Display", location: "Display wall" }],
      cables: [{ fromEquipment: "Rack", toEquipment: "55 in display", transport: "hdmi", estimatedLengthMetres: 8 }],
      roomDimensions: "8 m x 6 m",
    };
    vi.mocked(runVisionContextAnalysis).mockResolvedValue(
      { ok: true, data: extraction } as unknown as Awaited<ReturnType<typeof runVisionContextAnalysis>>,
    );
  });

  it("reads the photo and the structured rows in one pass", async () => {
    vi.mocked(analyzeVisualAttachment).mockResolvedValue(context());

    const result = await analyzeSiteSurveyPhoto(PHOTO);

    expect(result.summary).toBe("A boardroom with one display wall.");
    expect(result.locations.map((place) => place.name)).toEqual(["Display wall"]);
    expect(result.equipment.map((device) => device.name)).toEqual(["55 in display"]);
    expect(result.cables.map((cable) => `${cable.fromEquipment}→${cable.toEquipment}`)).toEqual([
      "Rack→55 in display",
    ]);
    expect(result.roomDimensions).toBe("8 m x 6 m");
    expect(result.confidence).toBe(0.6);
  });

  it("leaves the request unmarked when the development switch is off", async () => {
    vi.mocked(analyzeVisualAttachment).mockResolvedValue(context());

    await analyzeSiteSurveyPhoto(PHOTO);

    // A photo is a photo: nothing in the request asks the server for sample data.
    expect(vi.mocked(analyzeVisualAttachment).mock.calls[0][2]?.mock).toBeUndefined();
    expect(vi.mocked(runVisionContextAnalysis).mock.calls[0][0]).not.toHaveProperty("mock");
  });

  it("asks for the development sample in both passes", async () => {
    // The screenshot-free walkthrough: one switch has to reach the context read
    // and the structured extraction, or the review would mix sample and model.
    vi.mocked(analyzeVisualAttachment).mockResolvedValue(
      context({ summary: "Sample summary: no model was called.", confidence: 0.62 }),
    );

    const result = await analyzeSiteSurveyPhoto(PHOTO, { mock: true });

    expect(vi.mocked(analyzeVisualAttachment).mock.calls[0][2]).toEqual({ mock: true });
    expect(vi.mocked(runVisionContextAnalysis).mock.calls[0][0]).toMatchObject({ mock: true });
    expect(result.summary).toContain("Sample summary");
  });
});
