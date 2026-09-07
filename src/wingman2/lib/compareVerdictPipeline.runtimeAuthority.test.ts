import { describe, expect, it } from "vitest";
import {
  resolveCompareVerdictCandidates,
  type ScoredCandidate,
  type WyreStormProduct,
} from "./compareVerdictPipeline";

const reducedProduct: WyreStormProduct = {
  sku: "SEMANTIC-RUNTIME-1",
  name: "Runtime-approved semantic candidate",
  family: "Semantic test family",
  productClass: "Product",
  role: "Product",
  transport: "Local",
  tags: [],
  caveat: "",
};

const candidate: ScoredCandidate = {
  product: reducedProduct,
  score: 78,
  verdict: "VERIFY",
  matched: ["Runtime comparison completed."],
  checks: [],
  gaps: [],
  partialMatches: [],
  mismatches: [],
  unknowns: [],
  blockers: [],
  dependencies: [],
  outcomeLabel: "Runtime-approved direction",
};

const competitorProfile = {
  brand: "Example",
  sku: "EXAMPLE-1",
  rawText: "Example 1x4 HDMI distribution amplifier",
  productClass: "HDMI splitter",
  role: "distribution amplifier",
  requestedTags: ["splitter"],
  resolvedSpec: {
    sku: "EXAMPLE-1",
    brand: "Example",
    domain: "DISTRIBUTION",
    role: "distribution amplifier",
    transport: "Local",
    inputCount: 1,
    outputCount: 4,
  },
};

describe("Compare verdict runtime authority", () => {
  it("preserves an ordinary engine candidate that already passed runtime eligibility", () => {
    const result = resolveCompareVerdictCandidates({
      engineMatches: [
        {
          sku: reducedProduct.sku,
          name: reducedProduct.name,
          family: reducedProduct.family,
          heuristicScore: 78,
          decision: {
            outcome: "VERIFY",
            confidence: 78,
            blockers: [],
            gaps: [],
            matches: ["Runtime comparison completed."],
            verify: [],
            summary: "Runtime-approved direction",
            nextAction: "Review evidence.",
            systemRequirements: [],
            requirements: [],
            necessaryCoverage: {
              confirmed: 0,
              total: 0,
              unknown: 0,
              failed: 0,
            },
            evidenceCompleteness: 0,
            solutionType: "insufficient-evidence",
          },
          wyrestorm: {
            sku: reducedProduct.sku,
            title: reducedProduct.name,
          },
          compareEligibility: {
            eligibility: "direct",
            fitPenalty: 0,
          },
        } as any,
      ],
      products: [reducedProduct],
      governedDecision: null,
      profile: competitorProfile as any,
      toCandidate: () => candidate,
      scoreProduct: () => candidate,
      isSelectable: () => true,
    });

    expect(result.viable.map((item) => item.product.sku)).toEqual([
      "SEMANTIC-RUNTIME-1",
    ]);
  });
});
