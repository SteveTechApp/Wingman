import { describe, expect, it } from "vitest";
import { gateCompareCandidate } from "./compareCandidateGate";

// The gate decides which WyreStorm products are allowed to be offered as a
// replacement for a competitor product. Getting a candidate's class wrong here
// puts an entirely wrong category of product in front of a customer, so class
// resolution must come from the governed taxonomy wherever it exists.

function classOf(candidate: Parameters<typeof gateCompareCandidate>[0]) {
  return gateCompareCandidate(candidate, { competitorClass: "UNKNOWN" }).candidateClass;
}

describe("compare candidate class comes from the taxonomy first", () => {
  it("classifies a matrix with audio de-embed as a matrix, not audio", () => {
    expect(
      classOf({
        sku: "MXV-0808-H2A-MK2",
        title: "4K60 8x8 HDMI Matrix with audio de-embed",
        classification: { subClassifications: ["matrix", "hdmi", "audio-deembed"] },
      }),
    ).toBe("MATRIX");
  });

  it("classifies a Dante-capable encoder as AVoIP, not audio", () => {
    expect(
      classOf({
        sku: "NHD-500-DNT-TX",
        title: "NetworkHD 500 Encoder with Dante Audio",
        classification: { subClassifications: ["networkhd-500", "encoder", "dante"] },
      }),
    ).toBe("AVOIP");
  });

  it("classifies a genuine amplifier as audio", () => {
    expect(
      classOf({
        sku: "AMP-2120",
        title: "2 Channel Amplifier",
        classification: { subClassifications: ["amplifier", "dsp"] },
      }),
    ).toBe("AUDIO");
  });

  it("refuses to give a cable a comparable class", () => {
    expect(
      classOf({
        sku: "CAB-HAOC-10",
        title: "10m HDMI 2.0 AOC",
        classification: { subClassifications: ["cable", "active-optical"] },
      }),
    ).toBe("UNKNOWN");
  });
});

describe("text fallback still applies when no taxonomy is supplied", () => {
  it("does not classify a video product as audio just because it mentions audio", () => {
    // A live-lookup record with no governed classification. The old rule
    // matched a bare "audio" anywhere in the candidate text.
    expect(
      classOf({
        sku: "MX-0808-H2A",
        title: "8x8 HDMI Matrix with audio breakout",
        category: "Matrix / routing with audio output",
      }),
    ).toBe("MATRIX");
  });

  it("still recognises an amplifier from its text", () => {
    expect(classOf({ sku: "AMP-999", title: "4 Channel Amplifier" })).toBe("AUDIO");
  });

  it("still recognises a speakerphone from its text", () => {
    expect(classOf({ sku: "UNKNOWN-1", title: "Conference Speakerphone" })).toBe("AUDIO");
  });

  it("prefers camera over audio for a camera that mentions its microphone", () => {
    expect(
      classOf({ sku: "CAM-999-PTZ", title: "PTZ Camera with built-in microphone" }),
    ).toBe("CAMERA");
  });
});

describe("endpoint topology gate", () => {
  const hdbasetClassification = { subClassifications: ["extender", "hdbaset"] };

  it("blocks a complete extender kit for a transmitter-only competitor", () => {
    const result = gateCompareCandidate(
      {
        sku: "EX-40-KVM-5K",
        title: "5K HDBaseT Extender Kit",
        classification: hdbasetClassification,
      },
      { competitorClass: "HDBASET", competitorRole: "transmitter" },
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy.join(" ")).toMatch(/Endpoint role mismatch/i);
  });

  it("allows a transmitter for a transmitter-only competitor", () => {
    const result = gateCompareCandidate(
      {
        sku: "TX-35-IW",
        title: "In-wall HDBaseT Transmitter",
        classification: hdbasetClassification,
      },
      { competitorClass: "HDBASET", competitorRole: "transmitter" },
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks an AVoIP encoder for a decoder request", () => {
    const result = gateCompareCandidate(
      {
        sku: "NHD-500-TX",
        title: "NetworkHD Encoder",
        classification: { subClassifications: ["networkhd-500", "encoder"] },
      },
      { competitorClass: "AVOIP", competitorRole: "decoder" },
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy.join(" ")).toMatch(/Endpoint role mismatch/i);
  });

  it("blocks modular matrix I/O cards as standalone transmitter equivalents", () => {
    const result = gateCompareCandidate(
      {
        sku: "TX-H2X-HDMI",
        title: "H2XC HDMI input card",
        classification: hdbasetClassification,
      },
      { competitorClass: "HDBASET", competitorRole: "transmitter" },
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy.join(" ")).toMatch(/Modular matrix I\/O card/i);
  });
});
