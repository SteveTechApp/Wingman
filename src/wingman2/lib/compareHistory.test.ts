import { describe, expect, it } from "vitest";
import { buildCompareHistoryCsv, buildCompareHistoryText, compareHistoryDiff, filterAndSortCompareHistory } from "./compareHistory";

const runs = [
  { id: "two", createdAt: "2026-08-02T00:00:00Z", mode: "saved-history", competitorBrand: "Barco", competitorSku: "CX-30", wyrestormSku: "B", matchType: "VERIFY", confidence: "Plausible", matchScore: 60, evidence: ["new"], warnings: [], version: 2 },
  { id: "one", createdAt: "2026-08-01T00:00:00Z", mode: "saved-history", competitorBrand: "Barco", competitorSku: "CX-30", wyrestormSku: "A", matchType: "GOOD MATCH", confidence: "Strong", matchScore: 90, evidence: [], warnings: ["check"], version: 1 },
] as const;

describe("compare history helpers", () => {
  it("filters and sorts", () => expect(filterAndSortCompareHistory([...runs] as unknown as import("../data/projectStore").StoredCompareRun[],      { search: "barco", filter: "VERIFY", sort: "score" })[0].wyrestormSku).toBe("B"));
  it("builds CSV and text exports", () => {
    expect(buildCompareHistoryCsv([...runs] as unknown as import("../data/projectStore").StoredCompareRun[])).toContain("Competitor SKU");
    expect(buildCompareHistoryText([...runs] as unknown as import("../data/projectStore").StoredCompareRun[], { search: "", filter: "all", sort: "newest" })).toContain("Barco CX-30");
  });
  it("reports snapshot changes", () => expect(compareHistoryDiff(runs[0] as unknown as import("../data/projectStore").StoredCompareRun, [...runs] as unknown as import("../data/projectStore").StoredCompareRun[])).toContain("Direction changed from A to B."));
});
