import { describe, expect, it } from "vitest";

import { findCatalogProductBySku } from "@/catalog";
import { mainCategoryForCatalogProduct } from "@/competitor/mainCategory";
import { buildComparisonOptions } from "@/services/competitorCompareFit";
import type { CompetitorComparisonRecord } from "@/services/competitorComparisonService";

describe("competitor compare fit scoring", () => {
  it("treats a like-for-like splitter with extra WyreStorm scaling as a 100%+ direct replacement", () => {
    const record: CompetitorComparisonRecord = {
      brand: "Lightware",
      competitorSku: "DA2-HDMI",
      competitorName: "DA2-HDMI Distribution Amplifier",
      category: "Distribution",
      summary:
        "Compact HDMI distribution amplifier for one HDMI source feeding two local HDMI displays with EDID handling.",
      features: [
        "Splitter",
        "Distribution amplifier",
        "EDID management",
        "Compact form factor",
      ],
      wyrestormSku: "EXP-SP-0102-8K",
      wyrestormName: "EXP-SP-0102-8K",
      wyrestormCategory: "Distribution",
      confidence: "High",
      rationale: "Stored local match.",
      recommendedFamilies: [],
      notes: [],
    };

    const options = buildComparisonOptions(record, "curated");
    const [topOption] = options;

    expect(topOption).toBeDefined();
    expect(topOption.wyrestormSku).toBe("EXP-SP-0102-8K");
    expect(topOption.matchBasis.method).toBe("direct-replacement");
    expect(topOption.fitScore).toBeGreaterThan(100);

    const scalingRow = topOption.matrix.find((row) => row.id === "scaling");
    expect(scalingRow?.status).toBe("better");
  });

  it("keeps shortlist options inside the main product category lane", () => {
    const record: CompetitorComparisonRecord = {
      brand: "Kramer",
      competitorSku: "VS-88H2A",
      competitorName: "VS-88H2A Matrix Switcher",
      category: "Matrix switcher",
      comparisonDomain: "MATRIX",
      comparisonUseCase: "ROUTING",
      summary: "8x8 HDMI matrix switcher for fixed AV routing.",
      features: ["Matrix switching", "HDMI routing", "Fixed I/O"],
      wyrestormSku: "MX-0808-H2A",
      wyrestormName: "MX-0808-H2A",
      wyrestormCategory: "Matrix",
      confidence: "High",
      rationale: "Stored local match.",
      recommendedFamilies: ["Matrix"],
      notes: [],
    };

    const options = buildComparisonOptions(record, "curated");
    const optionCategories = options
      .map((option) => findCatalogProductBySku(option.wyrestormSku))
      .filter(Boolean)
      .map((product) => mainCategoryForCatalogProduct(product!));

    expect(options.length).toBeGreaterThan(0);
    expect(optionCategories.every((category) => category === "Matrix")).toBe(true);
  });
});
