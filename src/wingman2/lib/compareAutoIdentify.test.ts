import { describe, expect, it } from "vitest";
import { identifyCompetitorProduct } from "./compareAutoIdentify";

describe("compare auto-identification", () => {
  it("detects Blustream IP250UHD-TX as a UC room appliance / video bar lane", () => {
    const result = identifyCompetitorProduct("Blustream IP250UHD-TX");

    expect(result.detectedProduct?.manufacturer).toBe("HP Poly");
    expect(result.detectedProduct?.model).toBe("Studio X52");
    expect(result.detectedProduct?.categories).toContain("uc-room-appliance");
    expect(result.detectedProduct?.categories).toContain("uc-video-bar");
    expect(result.wyrestormMatch.lane).toBe("UC room workflow alternative");
    expect(result.competitorSummary.notComparableWith).toContain("HDMI matrix");
  });

  it("detects Atlona AT-OME-EX-KIT as camera/PTZ and not a soundbar lane", () => {
    const result = identifyCompetitorProduct("Atlona AT-OME-EX-KIT");

    expect(result.detectedProduct?.manufacturer).toBe("Logitech");
    expect(result.detectedProduct?.model).toBe("Rally Camera");
    expect(result.detectedProduct?.categories).toContain("uc-camera-ptz");
    expect(result.wyrestormMatch.lane).toBe("Meeting-room camera / PTZ camera");
    expect(result.wyrestormMatch.candidates).toContain("CAM-210-NDI-PTZ");
    expect(result.wyrestormMatch.warnings.join(" ")).toMatch(/Camera-only competitor/);
  });

  it("detects Lightware LBN-4x3-HBT-PRO as MeetingBar A30 appliance workflow", () => {
    const result = identifyCompetitorProduct("Lightware LBN-4x3-HBT-PRO");

    expect(result.detectedProduct?.manufacturer).toBe("Yealink");
    expect(result.detectedProduct?.model).toBe("MeetingBar A30");
    expect(result.detectedProduct?.categories).toContain("uc-room-appliance");
    expect(result.wyrestormMatch.lane).toBe("UC room workflow alternative");
    expect(result.wyrestormMatch.warnings.join(" ")).toMatch(/native Teams\/Zoom/i);
  });

  it("detects Kramer VIA Connect2 as camera-only", () => {
    const result = identifyCompetitorProduct("Kramer VIA Connect2");

    expect(result.detectedProduct?.manufacturer).toBe("Huddly");
    expect(result.detectedProduct?.model).toBe("IQ");
    expect(result.detectedProduct?.categories).toContain("uc-camera-fixed");
    expect(result.wyrestormMatch.lane).toBe("Meeting-room camera");
    expect(result.wyrestormMatch.warnings.join(" ")).toMatch(/Camera-only competitor/);
  });

  it("detects Barco ClickShare CX-50 as a UC video bar", () => {
    const result = identifyCompetitorProduct("Barco ClickShare CX-50");

    expect(result.detectedProduct?.manufacturer).toBe("Jabra");
    expect(result.detectedProduct?.model).toBe("PanaCast 50");
    expect(result.detectedProduct?.categories).toContain("uc-video-bar");
    expect(result.wyrestormMatch.lane).toBe("UC soundbar / BYOD meeting room");
    expect(result.wyrestormMatch.candidates).toContain("APO-VX20-UC v2");
  });

  it("infers a rough phrase without pretending exact certainty", () => {
    const result = identifyCompetitorProduct("customer asked for a Teams video bar");

    expect(result.detectedProduct).toBeNull();
    expect(result.confidence).toBe("low");
    expect(result.wyrestormMatch.lane).toMatch(/UC/);
    expect(result.nextQuestion).toMatch(/exact model/i);
  });
});