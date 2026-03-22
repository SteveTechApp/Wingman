import { describe, expect, it } from "vitest";

import { getCompetitorProducts } from "@/competitor/repository";
import { getComparisonRecords } from "@/services/competitorComparisonService";
import { buildComparisonOptions } from "@/services/competitorCompareFit";

function normalizeId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-/]+/g, "");
}

function normalizeSku(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function comparisonId(brand: string, sku: string): string {
  return `${normalizeId(brand)}::${normalizeSku(sku)}`;
}

describe("competitor compare coverage", () => {
  it("reports comparison-record and option coverage for the seeded competitor catalog", { timeout: 20000 }, () => {
    const competitors = getCompetitorProducts();
    const records = getComparisonRecords();
    const recordMap = new Map(
      records.map((record) => [comparisonId(record.brand, record.competitorSku), record]),
    );

    const withRecord = competitors.filter((product) =>
      recordMap.has(comparisonId(String(product.brand || ""), product.sku)),
    );
    const withoutRecord = competitors.filter(
      (product) =>
        !recordMap.has(comparisonId(String(product.brand || ""), product.sku)),
    );

    const withAutomaticOptions = withRecord.filter((product) => {
      const record = recordMap.get(
        comparisonId(String(product.brand || ""), product.sku),
      );
      if (!record) return false;
      return buildComparisonOptions(record, "curated").some(
        (option) => option.matchBasis.method !== "manual-review",
      );
    });
    const optionMethodCounts = withRecord.reduce<Record<string, number>>(
      (counts, product) => {
        const record = recordMap.get(
          comparisonId(String(product.brand || ""), product.sku),
        );
        if (!record) return counts;
        const methods = new Set(
          buildComparisonOptions(record, "curated").map(
            (option) => option.matchBasis.method,
          ),
        );
        for (const method of methods) {
          counts[method] = (counts[method] || 0) + 1;
        }
        return counts;
      },
      {},
    );
    const manualReviewExamples = withRecord
      .filter((product) => {
        const record = recordMap.get(
          comparisonId(String(product.brand || ""), product.sku),
        );
        if (!record) return false;
        const options = buildComparisonOptions(record, "curated");
        return (
          options.length > 0 &&
          options.every((option) => option.matchBasis.method === "manual-review")
        );
      })
      .slice(0, 10)
      .map((product) => `${product.brand} ${product.sku}`);
    expect(competitors.length).toBeGreaterThan(0);
    expect(withRecord.length).toBe(competitors.length);
    expect(withAutomaticOptions.length).toBeGreaterThanOrEqual(20);
    expect(optionMethodCounts["manual-review"] || 0).toBeLessThan(competitors.length);
    expect(manualReviewExamples.length).toBeGreaterThan(0);
  });
});
