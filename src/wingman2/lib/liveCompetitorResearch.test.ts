import { describe, expect, it } from "vitest";
import {
  assessLiveCompetitorResearch,
  shouldAutoResearchCompetitor,
} from "./liveCompetitorResearch";

describe("live competitor research assessment", () => {
  it("automatically researches only unresolved compared products", () => {
    expect(
      shouldAutoResearchCompetitor({
        hasCompared: true,
        requestLiveLookup: true,
        manufacturer: "Crestron",
        sku: "UNKNOWN-123",
      }),
    ).toBe(true);

    expect(
      shouldAutoResearchCompetitor({
        hasCompared: true,
        requestLiveLookup: false,
        manufacturer: "Crestron",
        sku: "DM-NVX-350",
      }),
    ).toBe(false);
  });

  it("keeps even a strong live result at VERIFY/review-required until promoted", () => {
    const assessment = assessLiveCompetitorResearch({
      ok: true,
      competitor_product: {
        manufacturer: "Crestron",
        model: "DM-NVX-350",
        title: "DM NVX endpoint",
        category: "AV-over-IP",
        comparisonDomain: "AVOIP",
        role: "Encoder",
        transport: "AV-over-IP",
        summary: "1GbE AV-over-IP endpoint",
        resolvedUrl: "https://www.crestron.com/example",
        technologyProfile: {
          vendorTechnology: "Crestron DM NVX",
          canonicalTransport: "AV-over-IP",
          networkClass: "1GbE",
          codecName: "Pixel Perfect Processing",
        },
      },
      best_match: {
        sku: "NHD-500-TX",
        match_type: "DIRECT MATCH",
        confidence_score: 91,
        readiness: {
          status: "ready",
          summary: "Architecture and role align.",
          strengths: ["1GbE AVoIP architecture aligns.", "Encoder role aligns."],
          warnings: ["Codec implementation differs."],
          nextActions: ["Review the manufacturer source before quotation."],
          reviewRequired: false,
        },
      },
      resolved_competitor_url: "https://www.crestron.com/example",
    });

    expect(assessment.outcome).toBe("candidate");
    expect(assessment.candidateSku).toBe("NHD-500-TX");
    expect(assessment.reviewRequired).toBe(true);
    expect(assessment.competitor.technologyProfile?.networkClass).toBe("1GbE");
  });

  it("returns no-match when the live resolver blocks the candidate", () => {
    const assessment = assessLiveCompetitorResearch({
      ok: true,
      competitor_product: {
        manufacturer: "Example",
        model: "DSP-1",
        category: "Audio DSP",
      },
      best_match: {
        sku: "NHD-500-TX",
        match_type: "INCOMPATIBLE",
        confidence_score: 22,
        readiness: {
          status: "blocked",
          summary: "Wrong product class.",
          blockers: ["WyreStorm does not provide the required DSP product class."],
          reviewRequired: true,
        },
      },
    });

    expect(assessment.outcome).toBe("no-match");
    expect(assessment.candidateSku).toBeUndefined();
    expect(assessment.blockers[0]).toMatch(/DSP product class/i);
  });

  it("returns an honest no-match when research finds no WyreStorm candidate", () => {
    const assessment = assessLiveCompetitorResearch({
      ok: true,
      competitor_product: {
        manufacturer: "Example",
        model: "UNKNOWN-1",
      },
      best_match: null,
      alternatives: [],
    });

    expect(assessment.outcome).toBe("no-match");
    expect(assessment.reviewRequired).toBe(true);
  });
});