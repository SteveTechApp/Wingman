import { describe, expect, it } from "vitest";

import { classifyCompetitorCompareDecision } from "./competitorCompareDecision";

describe("competitor compare decision", () => {
  it("classifies a verified AVoIP encoder pairing as a good match with usable sales guidance", () => {
    const result = classifyCompetitorCompareDecision({
      score: 88,
      competitor: {
        sku: "AMX NMX-ENC-N2612S",
        domain: "AVOIP",
        role: "Encoder",
        transport: "AV over IP 1G",
        maxResolution: "4K60",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "NHD-500-TX",
        domain: "AVOIP",
        role: "Encoder",
        transport: "AV over IP 1G",
        maxResolution: "4K60",
        sourceTier: "verified-profile",
        profileEvidence: ["Verified 1G AVoIP encoder profile."],
      },
    });

    expect(result.outcome).toBe("GOOD MATCH");
    expect(result.blockers).toHaveLength(0);
    expect(result.gaps).toHaveLength(0);
    expect(result.summary).toContain("credible comparison candidate");
    expect(result.nextAction).toContain("Use as the primary comparison candidate");
  });

  it("returns no match when a control processor is compared to an AV endpoint", () => {
    const result = classifyCompetitorCompareDecision({
      competitor: {
        sku: "AMX NX-2200",
        domain: "CONTROL",
        role: "Controller",
        transport: "Control / LAN",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "NHD-600-TRX",
        domain: "AVOIP",
        role: "Transceiver",
        transport: "AV over IP 10G",
        maxResolution: "4K60",
        sourceTier: "verified-profile",
      },
    });

    expect(result.outcome).toBe("NO MATCH");
    expect(result.blockers.join(" ")).toMatch(/technology class mismatch/i);
    expect(result.blockers.join(" ")).toMatch(/product role mismatch/i);
    expect(result.summary).toContain("should not be presented as an equivalent");
    expect(result.nextAction).toContain("Do not recommend as an equivalent");
  });

  it("returns partial match when the candidate is commercially close but misses a critical feature", () => {
    const result = classifyCompetitorCompareDecision({
      score: 80,
      competitor: {
        sku: "Kramer VP-440X",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 4,
        outputCount: 2,
        maxResolution: "4K60",
        specTier: "verified-profile",
        features: {
          usbC: true,
        },
      },
      wyrestorm: {
        sku: "SW-640-TX-W",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 4,
        outputCount: 2,
        maxResolution: "4K60",
        sourceTier: "official-structured",
      },
    });

    expect(result.outcome).toBe("PARTIAL MATCH");
    expect(result.blockers).toHaveLength(0);
    expect(result.gaps.join(" ")).toMatch(/USB-C/i);
    expect(result.summary).toContain("differences must be explained");
    expect(result.nextAction).toContain("partial alternative");
  });

  it("preserves a partial-match validation warning when routed matrix evidence is incomplete", () => {
    const result = classifyCompetitorCompareDecision({
      score: 76,
      warnings: ["Routed output behaviour needs verification before treating this as equivalent."],
      competitor: {
        sku: "Example 4x4 HDBaseT Matrix",
        domain: "MATRIX",
        role: "Matrix",
        transport: "HDBaseT matrix switching",
        inputCount: 4,
        outputCount: 4,
        maxResolution: "4K60",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "MXV-0404-H2A-KIT",
        domain: "MATRIX",
        role: "Matrix",
        transport: "HDBaseT matrix switching",
        inputCount: 4,
        outputCount: 4,
        maxResolution: "4K60",
        sourceTier: "official-structured",
        profileWarnings: ["Confirm routed HDBaseT zone outputs against the competitor output topology."],
      },
    });

    expect(result.outcome).toBe("PARTIAL MATCH");
    expect(result.verify.join(" ")).toMatch(/Routed output behaviour needs verification/i);
    expect(result.verify.join(" ")).toMatch(/routed HDBaseT zone outputs/i);
  });

  it("downgrades an otherwise-good match to partial when the WyreStorm candidate is chroma-subsampled versus the competitor", () => {
    const result = classifyCompetitorCompareDecision({
      score: 88,
      competitor: {
        sku: "Atlona AT-OME-CS31-SA",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 3,
        outputCount: 1,
        maxResolution: "4K60",
        chroma: "4:4:4",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "SW-320-TX",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 3,
        outputCount: 1,
        maxResolution: "4K60",
        chroma: "4:2:0",
        sourceTier: "verified-profile",
      },
    });

    expect(result.outcome).toBe("PARTIAL MATCH");
    expect(result.blockers).toHaveLength(0);
    expect(result.gaps.join(" ")).toMatch(/4:4:4 chroma.*4:2:0/i);
    expect(result.gaps.join(" ")).toMatch(/color-fidelity/i);
  });

  it("keeps a good match when chroma fidelity matches or the WyreStorm candidate meets/exceeds it", () => {
    const matching = classifyCompetitorCompareDecision({
      score: 88,
      competitor: {
        sku: "Atlona AT-OME-CS31-SA",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 3,
        outputCount: 1,
        maxResolution: "4K60",
        chroma: "4:4:4",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "SW-320-TX",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 3,
        outputCount: 1,
        maxResolution: "4K60",
        chroma: "4:4:4",
        sourceTier: "verified-profile",
      },
    });

    expect(matching.outcome).toBe("GOOD MATCH");
    expect(matching.gaps).toHaveLength(0);
    expect(matching.matches.join(" ")).toMatch(/Chroma fidelity matches/i);

    const exceeding = classifyCompetitorCompareDecision({
      score: 88,
      competitor: {
        sku: "Some Competitor",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 3,
        outputCount: 1,
        maxResolution: "4K60",
        chroma: "4:2:0",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "SW-320-TX",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 3,
        outputCount: 1,
        maxResolution: "4K60",
        chroma: "4:4:4",
        sourceTier: "verified-profile",
      },
    });

    expect(exceeding.outcome).toBe("GOOD MATCH");
    expect(exceeding.gaps).toHaveLength(0);
    expect(exceeding.matches.join(" ")).toMatch(/Chroma fidelity meets or exceeds competitor/i);
  });

  it("does not penalise or add noise when chroma is unknown on either side", () => {
    const result = classifyCompetitorCompareDecision({
      score: 88,
      competitor: {
        sku: "Some Competitor",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 3,
        outputCount: 1,
        maxResolution: "4K60",
        specTier: "verified-profile",
      },
      wyrestorm: {
        sku: "SW-320-TX",
        domain: "PRESENTATION",
        role: "Presentation Switcher",
        transport: "HDMI presentation switching",
        inputCount: 3,
        outputCount: 1,
        maxResolution: "4K60",
        chroma: "4:2:0",
        sourceTier: "verified-profile",
      },
    });

    expect(result.outcome).toBe("GOOD MATCH");
    expect(result.gaps).toHaveLength(0);
    expect(result.gaps.join(" ")).not.toMatch(/chroma/i);
    expect(result.matches.join(" ")).not.toMatch(/chroma/i);
  });
});
