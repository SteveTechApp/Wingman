import { describe, expect, it } from "vitest";
import type { RigorousMatch } from "../../lib/rigorousCompare";
import { decideComparison, type ScoredCandidate, type WyreStormProduct } from "./compareDecision";

const product: WyreStormProduct = { sku: "MX-0402-MST", name: "Matrix", family: "Matrix", productClass: "Matrix", role: "matrix", transport: "HDMI", tags: [], caveat: "Verify" };
const profile = { brand: "Test", sku: "MATRIX", rawText: "4x2 routed matrix", productClass: "Matrix", role: "matrix", requestedTags: [], resolvedSpec: null };
function candidate(match: RigorousMatch): ScoredCandidate { return { product, score: 90, verdict: match.decision.outcome, matched: [], checks: [], gaps: [], partialMatches: [], mismatches: [], unknowns: [], blockers: [], dependencies: [], outcomeLabel: "Direct" }; }

describe("governed Compare interface", () => {
  it("keeps a current eligible engine result as the rendered lead", () => {
    const match = { sku: product.sku, decision: { outcome: "GOOD MATCH", confidence: 90, blockers: [], gaps: [], matches: [], verify: [], requirements: [], necessaryCoverage: { confirmed: 1, total: 1, unknown: 0, failed: 0 } }, wyrestorm: {} } as unknown as RigorousMatch;
    const result = decideComparison({ engineMatches: [match], products: [product], governedDecision: null, profile, toCandidate: candidate, scoreProduct: () => candidate(match), isSelectable: Boolean });
    expect(result.viable[0]).toMatchObject({ product: { sku: "MX-0402-MST" }, verdict: "GOOD MATCH" });
    expect(result.nearMatches).toEqual([]);
  });
});
