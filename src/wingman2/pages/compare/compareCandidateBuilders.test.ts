import { describe, expect, it, vi } from "vitest";
import type { WyreStormProduct } from "../../features/compare";
import { mapCompetitorToNetworkHdAvoip } from "../../lib/networkHdAvoipEquivalence";
import { buildAvoipCandidates, buildMatrixCandidates, type WyrestormProductLookup } from "./compareCandidateBuilders";
import type { CompetitorProfile } from "./compareTypes";

function product(sku: string): WyreStormProduct {
  return {
    sku,
    name: sku,
    family: "MXV Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDBaseT / HDMI",
    tags: ["matrix"],
    caveat: "Confirm routed vs mirrored outputs.",
  };
}

function matrixProfile(overrides: Partial<CompetitorProfile> = {}): CompetitorProfile {
  return {
    brand: "Blustream",
    sku: "MX88-H2A",
    rawText: "Blustream 8x8 18Gbps HDBaseT matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDBaseT",
    requestedTags: ["matrix", "hdbaset", "18g"],
    videoTags: [],
    knownProfile: null,
    resolvedSpec: { inputCount: 8, outputCount: 8 } as CompetitorProfile["resolvedSpec"],
    ...overrides,
  };
}

describe("buildMatrixCandidates", () => {
  it("resolves every SKU through the lookup it is given", () => {
    const asked: string[] = [];
    const find: WyrestormProductLookup = (sku) => {
      asked.push(sku);
      return product(sku);
    };

    const candidates = buildMatrixCandidates(matrixProfile(), find);

    // The catalogue lives on the page because it is swapped for the real one
    // after load, so the builder asks for the SKUs it means instead of holding
    // a list that could go stale.
    expect(asked).toEqual(["MXV-0808-H2A-MK2", "MXV-0808-H2A-70-V3", "MX-0808-KIT-V2"]);
    expect(candidates?.map((candidate) => [candidate.product.sku, candidate.score, candidate.verdict])).toEqual([
      ["MXV-0808-H2A-MK2", 95, "GOOD MATCH"],
      ["MXV-0808-H2A-70-V3", 83, "PARTIAL MATCH"],
      ["MX-0808-KIT-V2", 34, "NO MATCH"],
    ]);
  });

  it("leads with the Class A mainframe when the brief asks for the longer HDBaseT path", () => {
    const find: WyrestormProductLookup = (sku) => product(sku);

    const candidates = buildMatrixCandidates(matrixProfile({ requestedTags: ["matrix", "hdbaset", "18g", "class a"] }), find);

    expect(candidates?.[0].product.sku).toBe("MXV-0808-H2A-70-V3");
    expect(candidates?.[1].product.sku).toBe("MXV-0808-H2A-MK2");
  });

  it("stands down for a brief that is not an 18Gbps 8x8 HDBaseT matrix, without asking the catalogue", () => {
    const find = vi.fn((sku: string) => product(sku));

    expect(buildMatrixCandidates(matrixProfile({ resolvedSpec: { inputCount: 4, outputCount: 4 } as CompetitorProfile["resolvedSpec"] }), find)).toBeNull();
    expect(buildMatrixCandidates(matrixProfile({ requestedTags: ["matrix"] }), find)).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("drops a mainframe the catalogue cannot resolve, keeping the rest of the answer", () => {
    const find: WyrestormProductLookup = (sku) => (sku === "MXV-0808-H2A-MK2" ? undefined : product(sku));

    const candidates = buildMatrixCandidates(matrixProfile(), find);

    expect(candidates?.map((candidate) => candidate.product.sku)).toEqual(["MXV-0808-H2A-70-V3", "MX-0808-KIT-V2"]);
  });
});

describe("buildAvoipCandidates", () => {
  it("scores the recommended endpoints, synthesising one the catalogue does not hold", () => {
    const competitorText = "Crestron DM-NVX-360 encoder AV over IP 4K60 4:4:4";
    const { classification, recommendation } = mapCompetitorToNetworkHdAvoip(competitorText);
    const profile = matrixProfile({
      brand: "Crestron",
      sku: "DM-NVX-360",
      rawText: competitorText.toUpperCase(),
      productClass: "AV-over-IP",
      requestedTags: ["avoip", "4k60", "444"],
    });
    const asked: string[] = [];

    const candidates = buildAvoipCandidates(profile, classification, recommendation, (sku) => {
      asked.push(sku);
      return undefined;
    });

    expect(recommendation.applies).toBe(true);
    expect(asked).toEqual(recommendation.candidateSkus.filter((sku) => !asked.includes(sku) || true));
    expect(candidates.length).toBeGreaterThan(0);
    // Every candidate is an AVoIP endpoint, even the ones no catalogue row
    // matched: the synthesis still answers the brief with a real endpoint role.
    expect(candidates.every((candidate) => candidate.product.productClass === "AV-over-IP")).toBe(true);
    expect(candidates[0].score).toBeGreaterThanOrEqual(candidates[candidates.length - 1].score);
    expect(candidates[0].matched.length).toBeGreaterThan(0);
  });
});
