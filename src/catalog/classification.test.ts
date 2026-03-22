import { describe, expect, it } from "vitest";

import {
  classifyCatalogProduct,
  findCatalogProductBySku,
} from "@/catalog";
import { buildComparisonOptions } from "@/services/competitorCompareFit";
import type { CompetitorComparisonRecord } from "@/services/competitorComparisonService";

function requireProduct(sku: string) {
  const product = findCatalogProductBySku(sku);
  expect(product, `${sku} should exist in the WyreStorm catalog seed`).toBeDefined();
  return product!;
}

describe("WyreStorm catalog classification", () => {
  it("uses the workbook-derived descriptions to separate UC, switcher, and matrix roles", () => {
    expect(classifyCatalogProduct(requireProduct("APO-210-UC")).primaryType).toBe(
      "uc-appliance",
    );
    expect(classifyCatalogProduct(requireProduct("SW-640L-TX-W")).primaryType).toBe(
      "presentation-switcher",
    );
    expect(classifyCatalogProduct(requireProduct("MX-0402-MST")).primaryType).toBe(
      "matrix-dock",
    );
    expect(classifyCatalogProduct(requireProduct("MX-0404-HDMI")).primaryType).toBe(
      "matrix-switch",
    );
  });

  it("does not surface Apollo UC appliances for a presentation-switcher comparison", () => {
    const record: CompetitorComparisonRecord = {
      brand: "TestBrand",
      competitorSku: "PRES-100",
      competitorName: "4K Presentation Switcher",
      category: "Switcher",
      summary: "4K60 presentation switcher with HDMI and USB-C inputs",
      features: [
        "Presentation switcher",
        "4 HDMI inputs",
        "2 HDMI outputs",
        "USB-C input",
        "Wireless presentation",
        "AirPlay",
        "Miracast",
      ],
      wyrestormSku: "SW-640L-TX-W",
      wyrestormName: "SW-640L-TX-W",
      wyrestormCategory: "Switcher",
      confidence: "Medium",
      rationale: "Test comparison baseline.",
      recommendedFamilies: [],
      notes: [],
    };

    const options = buildComparisonOptions(record, "curated");
    const optionTypes = options
      .map((option) => findCatalogProductBySku(option.wyrestormSku))
      .filter(Boolean)
      .map((product) => classifyCatalogProduct(product!).primaryType);

    expect(options.length).toBeGreaterThan(0);
    expect(optionTypes).not.toContain("uc-appliance");
    expect(optionTypes).toContain("presentation-switcher");
  });
});
