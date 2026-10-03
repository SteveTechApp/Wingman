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
    specs: { networkSpeed: "1GbE", poe: true },
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

    expect(result.outcome).not.toBe("GOOD MATCH");
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
        specs: { networkSpeed: "1GbE", poe: true },
      },
      score: 92,
    });

    expect(["GOOD MATCH", "PARTIAL MATCH"]).toContain(result.outcome);
  });

  it("blocks automatic equivalence when power evidence is missing", () => {
    const result = classifyCompetitorCompareDecision({
      competitor: { ...competitor, specs: { networkSpeed: "1GbE", poe: true } },
      wyrestorm: {
        sku: "NHD-120-RX",
        domain: "AVOIP",
        role: "decoder",
        transport: "1GbE H.265",
        maxResolution: "4K30",
        sourceTier: "verified-profile",
        readiness: "compare-ready",
        specs: { networkSpeed: "1GbE" },
      },
      score: 92,
    });

    expect(result.outcome).toBe("VERIFY");
    expect(result.requirements.find((item) => item.key === "power")?.status).toBe("unknown");
    expect(result.necessaryCoverage.unknown).toBeGreaterThan(0);
  });

  it("labels a component-led replacement as an architecture alternative", () => {
    const result = classifyCompetitorCompareDecision({
      competitor: {
        sku: "COMPLETE-ENCODER-SYSTEM",
        domain: "AVOIP",
        role: "encoder",
        transport: "AV over IP 1G",
        maxResolution: "4K60",
        standalone: true,
        specTier: "verified-profile",
        specs: { poe: true },
      },
      wyrestorm: {
        sku: "NHD-500-TX",
        domain: "AVOIP",
        role: "encoder",
        transport: "AV over IP 1G",
        maxResolution: "4K60",
        standalone: false,
        systemRequirements: ["matching decoder", "managed switch", "NetworkHD controller"],
        sourceTier: "verified-profile",
        specs: { poe: true },
      },
      score: 92,
    });

    expect(result.outcome).not.toBe("GOOD MATCH");
    expect(result.solutionType).toBe("architecture-alternative");
    expect(result.gaps.join(" ")).toMatch(/component-led architecture/i);
  });
});
