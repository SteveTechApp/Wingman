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
});
