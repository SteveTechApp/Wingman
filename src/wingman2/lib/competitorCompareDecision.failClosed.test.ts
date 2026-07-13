import { describe, expect, it } from "vitest";
import { classifyCompetitorCompareDecision } from "./competitorCompareDecision";

describe("Compare technical data fail-closed gate", () => {
  const competitor = {
    sku: "COMP-DECODER",
    title: "Competitor decoder",
    domain: "AVOIP",
    role: "decoder",
    transport: "1GbE H.265",
    maxResolution: "4K30",
    chroma: "4:2:0",
    sourceTier: "verified-profile" as const,
    specTier: "verified-profile",
    readiness: "compare-ready",
    features: {},
    specs: { networkSpeed: "1GbE" },
  };

  it("does not allow a text-inferred WyreStorm profile to become a partial match", () => {
    const result = classifyCompetitorCompareDecision({
      competitor,
      wyrestorm: {
        sku: "NHD-TEST-RX",
        title: "Text-inferred decoder",
        domain: "AVOIP",
        role: "decoder",
        transport: "1GbE H.265",
        maxResolution: "4K30",
        chroma: "4:2:0",
        sourceTier: "text-inferred",
        readiness: "verify-only",
        features: {},
        specs: { networkSpeed: "1GbE" },
      },
      score: 92,
    });

    expect(result.outcome).toBe("VERIFY");
  });

  it("allows a verified, compare-ready WyreStorm profile to be evaluated normally", () => {
    const result = classifyCompetitorCompareDecision({
      competitor,
      wyrestorm: {
        sku: "NHD-120-RX",
        title: "Verified decoder",
        domain: "AVOIP",
        role: "decoder",
        transport: "1GbE H.265",
        maxResolution: "4K30",
        chroma: "4:2:0",
        sourceTier: "verified-profile",
        readiness: "compare-ready",
        features: {},
        specs: { networkSpeed: "1GbE" },
      },
      score: 92,
    });

    expect(["GOOD MATCH", "PARTIAL MATCH"]).toContain(result.outcome);
  });
});
