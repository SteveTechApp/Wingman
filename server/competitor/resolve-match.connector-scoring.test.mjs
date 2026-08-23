import { describe, expect, it } from "vitest";
import { compareInternals } from "./resolve-match.mjs";

const { scoreProfiles } = compareInternals;

// A USB-C BYOD wallplate transmitter carries two DIFFERENT input jobs: one
// HDMI input for a fixed source and one USB-C input for a laptop, with a
// single HDBaseT output to the display. An HDMI-only box with two HDMI inputs
// has the same TOTAL input count but none of the USB-C BYOD story. The old
// scoring summed HDMI-in + USB-C-in as one "input" figure, so this pair used
// to score "Input counts align exactly" and come out as a High-confidence
// DIRECT MATCH.
function wallplateWithUsbC() {
  return {
    manufacturer: "Atlona",
    model: "AT-UHD-EX-70C",
    title: "HDBaseT Wallplate Transmitter",
    summary:
      "HDBaseT wallplate transmitter with one HDMI input and one USB-C input, one HDBaseT output, 70m, 4K60 4:4:4",
    category: "Wallplate Transmitter",
    transport: "HDBaseT",
    role: "Encoder",
    comparisonDomain: "EXTENDER",
    comparisonUseCase: "EXTENSION",
    ports: { hdmiIn: 1, hdmiOut: 0, usbC: 1, usbHost: 0, usbDevice: 0, hdbt: 1, lan: 0 },
    video: { maxResolution: "4K60", chroma: "4:4:4", bandwidth: "18G" },
    features: {
      scaling: false,
      kvm: false,
      videoWall: false,
      audioBreakout: false,
      multiview: false,
      hdr: false,
      byod: true,
      usbRouting: true,
      collaboration: false,
    },
    control: { rs232: false, ir: false, cec: false, relay: false },
    audio: { audioDeEmbed: false, audioBreakout: false },
    formFactor: "wallplate",
    hdbtGeneration: "HDBT_2_0",
    sourceUrl: "https://example.com/atlona/at-uhd-ex-70c",
    technologyProfile: { canonicalTransport: "HDBaseT" },
  };
}

function hdmiOnlyBox() {
  return {
    manufacturer: "WyreStorm",
    model: "EX-70-2H",
    title: "HDBaseT Extender Kit",
    summary: "HDBaseT extender kit with two HDMI inputs, one HDBaseT output, 70m, 4K60 4:4:4",
    category: "Signal Extender",
    transport: "HDBaseT",
    role: "Encoder",
    comparisonDomain: "EXTENDER",
    comparisonUseCase: "EXTENSION",
    ports: { hdmiIn: 2, hdmiOut: 0, usbC: 0, usbHost: 0, usbDevice: 0, hdbt: 1, lan: 0 },
    video: { maxResolution: "4K60", chroma: "4:4:4", bandwidth: "18G" },
    features: {
      scaling: false,
      kvm: false,
      videoWall: false,
      audioBreakout: false,
      multiview: false,
      hdr: false,
      byod: false,
      usbRouting: false,
      collaboration: false,
    },
    control: { rs232: false, ir: false, cec: false, relay: false },
    audio: { audioDeEmbed: false, audioBreakout: false },
    formFactor: "transmitter",
    hdbtGeneration: "HDBT_2_0",
    sourceUrl: "https://wyrestorm.com/product/ex-70-2h",
    technologyProfile: { canonicalTransport: "HDBaseT" },
  };
}

// The true like-for-like: the WyreStorm wallplate has the same connector
// families - 1x HDMI in, 1x USB-C in, 1x HDBaseT out - and the same feature
// flags as the competitor wallplate.
function exactWallplateMatch() {
  return {
    ...hdmiOnlyBox(),
    model: "EX-70-WP",
    title: "HDBaseT Wallplate Transmitter",
    category: "Wallplate Transmitter",
    ports: { hdmiIn: 1, hdmiOut: 0, usbC: 1, usbHost: 0, usbDevice: 0, hdbt: 1, lan: 0 },
    features: {
      scaling: false,
      kvm: false,
      videoWall: false,
      audioBreakout: false,
      multiview: false,
      hdr: false,
      byod: true,
      usbRouting: true,
      collaboration: false,
    },
    formFactor: "wallplate",
  };
}

describe("scoreProfiles - per-connector I/O scoring", () => {
  it("never calls a USB-C BYOD wallplate a DIRECT MATCH for an HDMI-only box with the same total input count", () => {
    const result = scoreProfiles(wallplateWithUsbC(), hdmiOnlyBox(), {
      competitorLookupMode: "stored-intelligence",
    });

    // The verdict must not read as a confirmed direct equivalent.
    expect(result.matchType).not.toBe("DIRECT MATCH");
    expect(result.confidence).not.toBe("High");
    expect(result.confidenceScore).toBeLessThan(80);
    expect(result.readiness.status).toBe("review");
    expect(result.readiness.reviewRequired).toBe(true);

    // The USB-C input is a scored connector family, and its absence on the
    // candidate is a gap - not a matched port count.
    expect(result.breakdown.ioScore).toBeLessThan(80);
    expect(result.breakdown.connectorGapCount).toBeGreaterThan(0);
    expect(
      result.readiness.warnings.some((warning) =>
        /USB-C input.*connector-level gap/i.test(warning),
      ),
    ).toBe(true);

    // The reason trace makes the gap visible instead of claiming aligned inputs.
    expect(result.breakdown.reasons.some((reason) => /Connector gaps: USB-C input/i.test(reason))).toBe(true);
  });

  it("keeps DIRECT MATCH when the connector families genuinely align", () => {
    const result = scoreProfiles(wallplateWithUsbC(), exactWallplateMatch(), {
      competitorLookupMode: "stored-intelligence",
    });

    expect(result.breakdown.ioScore).toBe(100);
    expect(result.breakdown.connectorGapCount).toBe(0);
    expect(result.matchType).toBe("DIRECT MATCH");
    expect(result.confidence).toBe("High");
    expect(result.readiness.status).toBe("ready");
  });

  it("does not treat an extra WyreStorm connector family as a gap", () => {
    // The competitor has no USB-C at all; the candidate adds one. That is a
    // potential advantage for the customer, not a missing capability, so the
    // verdict is not capped.
    const candidate = {
      ...hdmiOnlyBox(),
      ports: { ...hdmiOnlyBox().ports, usbC: 1 },
      features: { ...hdmiOnlyBox().features, byod: true, usbRouting: true },
    };

    const result = scoreProfiles(hdmiOnlyBox(), candidate, {
      competitorLookupMode: "stored-intelligence",
    });

    expect(result.breakdown.connectorGapCount).toBe(0);
    expect(result.matchType).toBe("DIRECT MATCH");
  });
});
