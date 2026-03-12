import { describe, expect, it } from "vitest";

import { areProductTypesCompatible, classifyCatalogProduct } from "@/catalog/classification";
import compareSeed from "@/data/catalog/competitor-compare.seed.json";
import { findCatalogProductBySku } from "@/catalog";
import { getCompetitorProducts } from "@/competitor/repository";
import { getComparisonRecords } from "@/services/competitorComparisonService";

type SeedRow = {
  brand?: string;
  competitorSku?: string;
  wyrestormSku?: string;
};

function normalize(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

describe("competitor comparison service", () => {
  it("only marks verified results with real WyreStorm catalog SKUs", () => {
    const invalidVerifiedRecords = getComparisonRecords().filter(
      (record) => record.wyrestormVerified !== false && !findCatalogProductBySku(record.wyrestormSku),
    );

    expect(invalidVerifiedRecords).toEqual([]);
  });

  it("converts unverified seed references into manual-review results", () => {
    const competitors = getCompetitorProducts();
    const records = getComparisonRecords();
    const invalidSeedRows = ((Array.isArray(compareSeed) ? compareSeed : []) as SeedRow[]).filter((row) => {
      const competitorSku = normalize(row.competitorSku);
      if (!competitorSku) return false;
      if (findCatalogProductBySku(normalize(row.wyrestormSku))) return false;
      return !competitors.some(
        (item) =>
          normalize(item.brand) === normalize(row.brand) &&
          normalize(item.sku) === competitorSku,
      );
    });

    for (const row of invalidSeedRows) {
      const record = records.find(
        (item) =>
          normalize(item.brand) === normalize(row.brand) &&
          normalize(item.competitorSku) === normalize(row.competitorSku),
      );

      expect(record).toBeTruthy();
      expect(record?.wyrestormVerified).toBe(false);
      expect(record?.wyrestormSku).toBe("Manual review required");
      expect(record?.notes.some((note) => note.toLowerCase().includes("verified wyrestorm catalog sku"))).toBe(true);
    }
  });

  it("only returns verified matches that satisfy the same normalized product type", () => {
    const competitors = getCompetitorProducts();
    const records = getComparisonRecords().filter((record) => record.wyrestormVerified !== false);

    for (const record of records) {
      const competitor = competitors.find(
        (item) => normalize(item.brand) === normalize(record.brand) && normalize(item.sku) === normalize(record.competitorSku),
      );
      const wyrestorm = findCatalogProductBySku(record.wyrestormSku);

      expect(competitor).toBeTruthy();
      expect(wyrestorm).toBeTruthy();
      expect(
        areProductTypesCompatible(
          classifyCatalogProduct(competitor!),
          classifyCatalogProduct(wyrestorm!),
        ),
      ).toBe(true);
    }
  });

  it("preserves source-backed provenance for curated catalog comparisons", () => {
    const records = getComparisonRecords().filter((record) => record.provenance?.source === "catalog");

    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => typeof record.provenance?.sourceUrl === "string" && record.provenance.sourceUrl.length > 0)).toBe(true);
  });
});
