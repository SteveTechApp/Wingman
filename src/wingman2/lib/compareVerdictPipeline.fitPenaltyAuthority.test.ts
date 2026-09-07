import { describe, expect, it } from "vitest";
import {
  resolveCompareVerdictCandidates,
  type ScoredCandidate,
  type WyreStormProduct,
} from "./compareVerdictPipeline";

const products: WyreStormProduct[] = [
  {
    sku: "EXP-SP-0102-H2",
    name: "1x2 4K HDMI splitter",
    family: "HDMI Distribution",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    tags: ["splitter", "1x2", "hdmi"],
    caveat: "",
  },
  {
    sku: "SP-0104-H2",
    name: "1x4 4K HDMI splitter",
    family: "HDMI Distribution",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    tags: ["splitter", "1x4", "hdmi"],
    caveat: "",
  },
];

function engineMatch(
  sku: string,
  confidence: number,
  fitPenalty: number,
  eligibility: "direct" | "related-only",
) {
  const product = products.find((item) => item.sku === sku)!;

  return {
    sku,
    name: product.name,
    family: product.family,
    heuristicScore: confidence,
    wyrestorm: {
      sku,
      title: product.name,
      domain: "DISTRIBUTION",
      role: "distribution amplifier",
      transport: "Local",
      sourceTier: "official-structured",
    },
    compareEligibility: {
      eligibility,
      intent: "distribution-amplifier",
      reasons: [],
      blockers: [],
      fitPenalty,
    },
    decision: {
      outcome: "VERIFY",
      confidence,
      blockers: [],
      gaps: [],
      matches: [],
      verify: [],
      summary: "Test candidate",
      nextAction: "Review.",
      systemRequirements: [],
      requirements: [],
      necessaryCoverage: {
        confirmed: 0,
        total: 0,
        unknown: 0,
        failed: 0,
      },
      evidenceCompleteness: 1,
      solutionType: "direct-product",
    },
  } as any;
}

function toCandidate(match: any): ScoredCandidate {
  const product = products.find((item) => item.sku === match.sku)!;

  return {
    product,
    score: match.decision.confidence,
    verdict: "VERIFY",
    matched: [],
    checks: [],
    gaps: [],
    partialMatches: [],
    mismatches: [],
    unknowns: [],
    blockers: [],
    dependencies: [],
    outcomeLabel: "Test candidate",
    fitPenalty: match.compareEligibility.fitPenalty,
  };
}

describe("Compare verdict eligibility-fit authority", () => {
  it("does not let a high-confidence undersized splitter outrank the exact fan-out", () => {
    const result = resolveCompareVerdictCandidates({
      engineMatches: [
        engineMatch("EXP-SP-0102-H2", 99, 200, "related-only"),
        engineMatch("SP-0104-H2", 70, 0, "direct"),
      ],
      products,
      governedDecision: null,
      profile: {
        brand: "Atlona",
        sku: "AT-HDDA-4",
        rawText: "AT-HDDA-4 1x4 HDMI Distribution Amplifier",
        productClass: "HDMI splitter",
        role: "distribution amplifier",
        requestedTags: [],
        resolvedSpec: {
          domain: "DISTRIBUTION",
          role: "distribution amplifier",
        } as any,
      },
      toCandidate,
      scoreProduct: (_profile, product) => ({
        product,
        score: 0,
        verdict: "VERIFY",
        matched: [],
        checks: [],
        gaps: [],
        partialMatches: [],
        mismatches: [],
        unknowns: [],
        blockers: [],
        dependencies: [],
        outcomeLabel: "Fallback",
      }),
      isSelectable: () => true,
    });

    expect(result.viable.map((item) => item.product.sku).slice(0, 2)).toEqual([
      "SP-0104-H2",
      "EXP-SP-0102-H2",
    ]);
  });
});
