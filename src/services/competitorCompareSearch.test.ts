import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { searchCompetitorComparisons } from "@/services/competitorCompareSearch";
import { upsertManualCompetitorComparison } from "@/services/manualCompetitorComparisonStore";

function createMemoryStorage(): Storage {
  const state = new Map<string, string>();
  return {
    get length() {
      return state.size;
    },
    clear() {
      state.clear();
    },
    getItem(key: string) {
      return state.has(key) ? state.get(key)! : null;
    },
    key(index: number) {
      return Array.from(state.keys())[index] ?? null;
    },
    removeItem(key: string) {
      state.delete(key);
    },
    setItem(key: string, value: string) {
      state.set(String(key), String(value));
    },
  };
}

describe("competitor compare search", () => {
  const localStorage = createMemoryStorage();

  beforeAll(() => {
    vi.stubGlobal("window", { localStorage });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an ambiguous shortlist for partial competitor SKUs", () => {
    const result = searchCompetitorComparisons("Blustream", "IP300");

    expect(result.status).toBe("ambiguous");
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);
    expect(result.candidates.some((candidate) => candidate.comparison.competitorSku === "IP300UHD-RX")).toBe(true);
    expect(result.candidates.some((candidate) => candidate.comparison.competitorSku === "IP300UHD-TX")).toBe(true);
    expect(result.suggestedWyrestormSkus.length).toBeGreaterThan(0);
  });

  it("makes saved manual mappings searchable and preferred over curated duplicates", () => {
    upsertManualCompetitorComparison({
      brand: "Blustream",
      competitorSku: "IP300UHD-RX",
      competitorName: "Field-confirmed decoder",
      category: "AVoIP",
      summary: "Manual fallback mapping captured by sales team.",
      features: ["AVoIP decoder", "1Gb"],
      wyrestormSku: "RX-35-POH",
      rationale: "Use the stored manual mapping when the field team has already validated the replacement.",
      notes: ["Customer confirmed decoder role."],
    });

    const result = searchCompetitorComparisons("Blustream", "IP300UHD-RX");

    expect(result.status).toBe("resolved");
    expect(result.bestCandidate?.sourceType).toBe("manual");
    expect(result.bestCandidate?.comparison.wyrestormSku).toBe("RX-35-POH");
    expect(result.bestCandidate?.comparison.summary).toContain("Manual fallback mapping");
  });
});
