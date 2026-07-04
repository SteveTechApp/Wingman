import { describe, expect, it } from "vitest";
import { identifyCompetitorProduct } from "./compareAutoIdentify";

describe("compare auto-identification", () => {
  it("detects Poly X52 as a UC room appliance / video bar lane", () => {
    const result = identifyCompetitorProduct("Poly X52");

    expect(result.detectedProduct?.manufacturer).toBe("HP Poly");
    expect(result.detectedProduct?.model).toBe("Studio X52");
    expect(result.detectedProduct?.categories).toContain("uc-room-appliance");
    expect(result.detectedProduct?.categories).toContain("uc-video-bar");
    expect(result.wyrestormMatch.lane).toBe("UC room workflow alternative");
    expect(result.competitorSummary.notComparableWith).toContain("HDMI matrix");
  });

  it("detects Logitech Rally Camera as camera/PTZ and not a soundbar lane", () => {
    const result = identifyCompetitorProduct("Logitech Rally Camera");

    expect(result.detectedProduct?.manufacturer).toBe("Logitech");
    expect(result.detectedProduct?.model).toBe("Rally Camera");
    expect(result.detectedProduct?.categories).toContain("uc-camera-ptz");
    expect(result.wyrestormMatch.lane).toBe("Meeting-room camera / PTZ camera");
    expect(result.wyrestormMatch.candidates).toContain("CAM-210-NDI-PTZ");
    expect(result.wyrestormMatch.warnings.join(" ")).toMatch(/Camera-only competitor/);
  });

  it("detects Yealink A30 as MeetingBar A30 appliance workflow", () => {
    const result = identifyCompetitorProduct("Yealink A30");

    expect(result.detectedProduct?.manufacturer).toBe("Yealink");
    expect(result.detectedProduct?.model).toBe("MeetingBar A30");
    expect(result.detectedProduct?.categories).toContain("uc-room-appliance");
    expect(result.wyrestormMatch.lane).toBe("UC room workflow alternative");
    expect(result.wyrestormMatch.warnings.join(" ")).toMatch(/native Teams\/Zoom/i);
  });

  it("detects Huddly IQ as camera-only", () => {
    const result = identifyCompetitorProduct("Huddly IQ");

    expect(result.detectedProduct?.manufacturer).toBe("Huddly");
    expect(result.detectedProduct?.model).toBe("IQ");
    expect(result.detectedProduct?.categories).toContain("uc-camera-fixed");
    expect(result.wyrestormMatch.lane).toBe("Meeting-room camera");
    expect(result.wyrestormMatch.warnings.join(" ")).toMatch(/Camera-only competitor/);
  });

  it("detects Jabra PanaCast 50 as a UC video bar", () => {
    const result = identifyCompetitorProduct("Jabra PanaCast 50");

    expect(result.detectedProduct?.manufacturer).toBe("Jabra");
    expect(result.detectedProduct?.model).toBe("PanaCast 50");
    expect(result.detectedProduct?.categories).toContain("uc-video-bar");
    expect(result.wyrestormMatch.lane).toBe("UC soundbar / BYOD meeting room");
    expect(result.wyrestormMatch.candidates).toContain("APO-VX20-UC-V2");
  });

  it("infers a rough phrase without pretending exact certainty", () => {
    const result = identifyCompetitorProduct("customer asked for a Teams video bar");

    expect(result.detectedProduct).toBeNull();
    expect(result.confidence).toBe("low");
    expect(result.wyrestormMatch.lane).toMatch(/UC/);
    expect(result.nextQuestion).toMatch(/exact model/i);
  });

  it("does not mistake an unrelated Crestron AVoIP SKU for the single Crestron UC video bar entry", () => {
    // Regression test: manufacturer-name tokens (e.g. "crestron") must never count
    // as model-specific evidence, or any product from a brand with only one
    // catalogue entry here will wrongly match every other product from that brand.
    const result = identifyCompetitorProduct("Crestron DM-NVX-363");

    expect(result.detectedProduct).toBeNull();
    expect(result.wyrestormMatch.lane).not.toBe("UC soundbar / BYOD meeting room");
    expect(result.wyrestormMatch.lane).toBe("NetworkHD 500 AV-over-IP direction");
    expect(result.wyrestormMatch.candidates).toContain("NHD-500-TX");
  });

  it("maps a Blustream AVoIP transmitter to the correct NetworkHD 500 series", () => {
    const result = identifyCompetitorProduct("Blustream IP250UHD-TX");

    expect(result.wyrestormMatch.lane).toBe("NetworkHD 500 AV-over-IP direction");
    expect(result.wyrestormMatch.candidates.length).toBeGreaterThan(0);
    expect(result.wyrestormMatch.candidates.every((sku) => !sku.startsWith("NHD-600"))).toBe(true);
  });

  it("maps a wireless casting competitor to the Apollo casting lane", () => {
    const result = identifyCompetitorProduct("Barco ClickShare CX-30");

    expect(result.wyrestormMatch.lane).toBe("Wireless presentation / casting alternative");
    expect(result.wyrestormMatch.candidates).toContain("APO-DG2");
  });

  it("maps an HDBaseT extender kit (the compare placeholder example) to the extender lane", () => {
    const result = identifyCompetitorProduct("Atlona AT-OME-EX-KIT");

    expect(result.wyrestormMatch.lane).toBe("HDBaseT extender alternative");
    expect(result.wyrestormMatch.candidates).toContain("EX-70-H2");
  });

  it("maps a described matrix size to the closest real WyreStorm matrix SKU", () => {
    const eightByEight = identifyCompetitorProduct("customer wants an 8x8 matrix");
    expect(eightByEight.wyrestormMatch.lane).toBe("Matrix switcher alternative");
    expect(eightByEight.wyrestormMatch.candidates).toContain("MX-0808-KIT-V2");

    const fourByTwo = identifyCompetitorProduct("Crestron HD-MD4X2");
    expect(fourByTwo.wyrestormMatch.lane).toBe("Matrix switcher alternative");
    expect(fourByTwo.wyrestormMatch.candidates).toContain("MX-0402-MST");
  });

  it("does not misread a resolution string as a matrix input/output count", () => {
    const result = identifyCompetitorProduct("4K 3840x2160 60Hz source");

    expect(result.wyrestormMatch.lane).not.toBe("Matrix switcher alternative");
  });

  it("maps a Blustream SP-series splitter (SKU-embedded IO count, no descriptive keyword) to the matching WyreStorm splitter", () => {
    const oneByFour = identifyCompetitorProduct("Blustream SP14CS");
    expect(oneByFour.wyrestormMatch.lane).toBe("HDMI splitter / distribution amplifier alternative");
    expect(oneByFour.wyrestormMatch.candidates).toContain("SP-0104-H2");

    const oneByEight = identifyCompetitorProduct("Blustream SP18CS");
    expect(oneByEight.wyrestormMatch.lane).toBe("HDMI splitter / distribution amplifier alternative");
    expect(oneByEight.wyrestormMatch.candidates).toContain("SP-0108-SCL");
  });

  it("maps a described splitter/distribution amplifier to the splitter lane, not the matrix lane", () => {
    const described = identifyCompetitorProduct("customer wants a distribution amplifier");
    expect(described.wyrestormMatch.lane).toBe("HDMI splitter / distribution amplifier alternative");

    const bareOneByEight = identifyCompetitorProduct("1x8 HDMI splitter");
    expect(bareOneByEight.wyrestormMatch.lane).toBe("HDMI splitter / distribution amplifier alternative");
    expect(bareOneByEight.wyrestormMatch.candidates).toContain("SP-0108-SCL");
  });

  it("never under-sizes a matrix pick below the required input/output count", () => {
    // Regression: a pure nearest-distance metric reads 6x2 as "closer" to the
    // 4x2 MX-0402-MST than the 8x8 MX-0808-KIT-V2, but MX-0402-MST only has 4
    // inputs and cannot actually serve 6 sources.
    const result = identifyCompetitorProduct("customer wants a 6x2 matrix");
    expect(result.wyrestormMatch.candidates).toContain("MX-0808-KIT-V2");
    expect(result.wyrestormMatch.candidates).not.toContain("MX-0402-MST");
  });

  it("never under-sizes a splitter pick below the required output count", () => {
    // Regression: 1x6 is numerically equidistant between 1x4 (SP-0104-H2) and
    // 1x8 (SP-0108-SCL); the tie previously resolved to the smaller, under-
    // sized 1x4 splitter since it was found first in array order.
    const result = identifyCompetitorProduct("customer wants a 1x6 HDMI splitter");
    expect(result.wyrestormMatch.candidates).toContain("SP-0108-SCL");
    expect(result.wyrestormMatch.candidates).not.toContain("SP-0104-H2");
  });

  it("flags a requirement larger than any known matrix/splitter option for review instead of silently under-sizing", () => {
    const result = identifyCompetitorProduct("customer wants a 16x16 matrix");
    expect(result.wyrestormMatch.candidates).toContain("MX-0808-KIT-V2");
    expect(result.wyrestormMatch.notes.join(" ")).toMatch(/needs review/i);
  });

  it("checks AVoIP family signals before generic hardware keywords like 'extender'", () => {
    // Regression: "Crestron DM-NVX-350 extender" and "SDVoE extender" are both
    // AVoIP endpoints, but the word "extender" alone used to win the keyword
    // fallback loop before the AVoIP classifier ever ran.
    const dmNvx = identifyCompetitorProduct("Crestron DM-NVX-350 extender");
    expect(dmNvx.wyrestormMatch.lane).toBe("NetworkHD 500 AV-over-IP direction");

    const sdvoe = identifyCompetitorProduct("SDVoE extender");
    expect(sdvoe.wyrestormMatch.lane).toBe("NetworkHD 600 AV-over-IP direction");
  });

  it("prefers matrix intent over the bare 'hdbaset' token", () => {
    // Regression: "hdbaset" alone matched the extender fallback before the
    // matrix fallback (and its I/O sizing) ever ran, so "8x8 HDBaseT matrix"
    // was misread as a point-to-point extender kit.
    const result = identifyCompetitorProduct("8x8 HDBaseT matrix");
    expect(result.wyrestormMatch.lane).toBe("Matrix switcher alternative");
    expect(result.wyrestormMatch.candidates).toContain("MX-0808-KIT-V2");

    // A genuine point-to-point extender with no matrix wording must still
    // route to the extender lane.
    const extender = identifyCompetitorProduct("Atlona AT-OME-EX-KIT");
    expect(extender.wyrestormMatch.lane).toBe("HDBaseT extender alternative");
  });
});