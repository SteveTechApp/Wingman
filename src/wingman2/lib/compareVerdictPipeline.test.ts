import { describe, expect, it } from "vitest";
import {
  resolveCompareVerdictCandidates,
  type ScoredCandidate,
  type Verdict,
  type WyreStormProduct,
} from "./compareVerdictPipeline";
import type { RigorousMatch } from "./rigorousCompare";
import type { CompetitorMatchDecision } from "./competitorMatchDecisionLedger";

/**
 * Pins the live engineSnapshot -> verdict pipeline in isolation. Historical
 * decisions remain audit evidence and must never promote, insert or suppress
 * candidates produced from current product data.
 */

const ACTIVE_SKUS = ["MX-0402-MST", "NHD-500-TX", "SP-0104-H2"];

function product(sku: string): WyreStormProduct {
  return {
    sku,
    name: sku,
    family: "WyreStorm",
    productClass: "Matrix",
    role: "matrix",
    transport: "HDBaseT",
    tags: [],
    caveat: "Confirm the product specification before quoting.",
  };
}

function makeMatch(
  sku: string,
  outcome: "GOOD MATCH" | "PARTIAL MATCH" | "NO MATCH",
  confidence: number,
): RigorousMatch {
  return {
    sku,
    name: sku,
    family: "WyreStorm",
    heuristicScore: confidence,
    decision: {
      outcome,
      confidence,
      blockers: [],
      gaps: outcome === "NO MATCH" ? ["technology mismatch"] : [],
      matches: outcome === "NO MATCH" ? [] : ["matching feature"],
      verify: [],
      summary: `${outcome} summary`,
      nextAction: "verify",
      systemRequirements: [],
      requirements: [],
      necessaryCoverage: { confirmed: 1, total: 1, unknown: 0, failed: 0 },
      evidenceCompleteness: 1,
      solutionType:
        outcome === "GOOD MATCH"
          ? "direct-equivalent"
          : outcome === "NO MATCH"
            ? "no-match"
            : "qualified-alternative",
    },
    wyrestorm: {
      domain: "MATRIX",
      role: "matrix",
      transport: "HDBaseT",
      sourceTier: "official-structured",
      sourceLabel: "Official spec sheet",
    },
  } as unknown as RigorousMatch;
}

function toCandidate(match: RigorousMatch): ScoredCandidate {
  const verdict: Verdict =
    match.decision.outcome === "GOOD MATCH"
      ? "GOOD MATCH"
      : match.decision.outcome === "NO MATCH"
        ? "NO MATCH"
        : "PARTIAL MATCH";
  return {
    product: product(match.sku),
    score: match.decision.confidence,
    verdict,
    matched: match.decision.matches,
    checks: match.decision.verify,
    gaps: match.decision.gaps,
    partialMatches: [],
    mismatches: match.decision.gaps,
    unknowns: [],
    blockers: match.decision.blockers,
    dependencies: [],
    outcomeLabel: match.decision.summary,
  };
}

function baseDecision(overrides: Partial<CompetitorMatchDecision>): CompetitorMatchDecision {
  return {
    id: "decision-1",
    competitorManufacturer: "Test",
    competitorSku: "COMP-PRESENT",
    fingerprint: {
      productClass: "Presentation switcher",
      endpointRole: "switcher",
      transportClass: "hdmi",
      dependencies: [],
      notes: [],
    },
    wyrestormSku: "MX-0402-MST",
    decisionType: "confirmed-equivalent",
    reviewStatus: "approved",
    reviewer: "reviewer@example.com",
    reviewedAt: "2026-08-01T00:00:00.000Z",
    matchedPoints: ["switches multiple sources"],
    importantDifferences: ["no scaling"],
    dependencies: [],
    quoteBlockers: [],
    evidence: [{ sourceUrl: "https://example.com/spec", sourceType: "datasheet", checkedAt: "2026-08-01" }],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const PROFILE = {
  brand: "Test",
  sku: "COMP-PRESENT",
  rawText: "Test COMP-PRESENT presentation switcher",
  productClass: "Presentation switcher",
  role: "switcher",
  requestedTags: [],
  resolvedSpec: null,
};

function run(engineMatches: RigorousMatch[], governedDecision: CompetitorMatchDecision | null) {
  return resolveCompareVerdictCandidates({
    engineMatches,
    products: ACTIVE_SKUS.map(product),
    governedDecision,
    profile: PROFILE,
    toCandidate,
    scoreProduct: (_profile, candidate) => ({
      product: candidate,
      score: 50,
      verdict: "PARTIAL MATCH",
      matched: [],
      checks: [],
      gaps: [],
      partialMatches: [],
      mismatches: [],
      unknowns: [],
      blockers: [],
      dependencies: [],
      outcomeLabel: "Scored from the catalogue",
    }),
    isSelectable: (candidate) => Boolean(candidate?.sku),
  });
}

describe("resolveCompareVerdictCandidates", () => {
  it("leads with the best engine match and keeps every eligible candidate", () => {
    const result = run(
      [
        makeMatch("MX-0402-MST", "GOOD MATCH", 80),
        makeMatch("NHD-500-TX", "PARTIAL MATCH", 60),
      ],
      null,
    );

    expect(result.heuristicLead?.product.sku).toBe("MX-0402-MST");
    expect(result.viable.map((candidate) => candidate.product.sku)).toEqual([
      "MX-0402-MST",
      "NHD-500-TX",
    ]);
  });

  it("does not let an approved historical decision replace the current engine lead", () => {
    const result = run(
      [
        makeMatch("MX-0402-MST", "GOOD MATCH", 80),
        makeMatch("NHD-500-TX", "PARTIAL MATCH", 60),
      ],
      baseDecision({
        wyrestormSku: "NHD-500-TX",
        decisionType: "confirmed-equivalent",
      }),
    );

    const lead = result.viable[0];
    expect(lead.product.sku).toBe("MX-0402-MST");
    expect(lead.verdict).toBe("GOOD MATCH");
    expect(lead.score).toBe(80);
  });

  it("does not insert a historical decision SKU the current engine did not surface", () => {
    const result = run(
      [makeMatch("MX-0402-MST", "GOOD MATCH", 80)],
      baseDecision({
        wyrestormSku: "SP-0104-H2",
        decisionType: "closest-technical-match",
      }),
    );

    expect(result.viable.map((candidate) => candidate.product.sku)).toEqual(["MX-0402-MST"]);
  });

  it("does not let a historical no-suitable-match suppress current candidates", () => {
    const result = run(
      [
        makeMatch("MX-0402-MST", "GOOD MATCH", 80),
        makeMatch("NHD-500-TX", "PARTIAL MATCH", 60),
      ],
      baseDecision({ decisionType: "no-suitable-match", wyrestormSku: null }),
    );

    expect(result.viable.map((candidate) => candidate.product.sku)).toEqual([
      "MX-0402-MST",
      "NHD-500-TX",
    ]);
    expect(result.heuristicLead?.product.sku).toBe("MX-0402-MST");
  });

  it("excludes NO MATCH candidates from viable but keeps the raw engine lead", () => {
    const result = run([makeMatch("NHD-500-TX", "NO MATCH", 10)], null);

    expect(result.viable).toEqual([]);
    expect(result.heuristicLead?.product.sku).toBe("NHD-500-TX");
    expect(result.heuristicLead?.verdict).toBe("NO MATCH");
  });

  it("retains a same-class NO MATCH as an explicitly labelled near match", () => {
    const sameClassProfile = { ...PROFILE, productClass: "Matrix" };
    const result = resolveCompareVerdictCandidates({
      engineMatches: [makeMatch("MX-0402-MST", "NO MATCH", 42)],
      products: ACTIVE_SKUS.map(product),
      governedDecision: null,
      profile: sameClassProfile,
      toCandidate,
      scoreProduct: (_profile, candidate) => ({
        product: candidate,
        score: 50,
        verdict: "PARTIAL MATCH",
        matched: [], checks: [], gaps: [], partialMatches: [], mismatches: [],
        unknowns: [], blockers: [], dependencies: [], outcomeLabel: "catalogue",
      }),
      isSelectable: (candidate) => Boolean(candidate?.sku),
    });

    expect(result.viable).toEqual([]);
    expect(result.nearMatches.map((candidate) => candidate.product.sku)).toContain("MX-0402-MST");
    expect(result.nearMatches.find((candidate) => candidate.product.sku === "MX-0402-MST")?.verdict).toBe("NO MATCH");
  });
});
