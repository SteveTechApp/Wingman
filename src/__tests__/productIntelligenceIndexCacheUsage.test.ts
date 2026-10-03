import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every catalogue-consuming surface loads through the shared cache module,
// never fetching the artifacts directly. The summary payload is the default;
// detail consumers hydrate per-SKU (loadProductIntelligenceSummaryWithDetail /
// loadProductIntelligenceDetail) and only the admin record editor hydrates
// the whole catalogue (loadProductIntelligenceDetailRecords).
const summaryConsumers = [
  "src/wingman2/lib/productSelectorEngine.ts",
  "src/wingman2/pages/ProductPitchPage.tsx",
  "src/wingman2/pages/ProductCallCardsPage.tsx",
  "src/wingman2/components/WingmanGuruDrawer.tsx",
  "src/wingman2/pages/ProductFamilyPage.tsx",
];

const detailConsumers = [
  "src/wingman2/lib/compareSpecEngine.ts",
  "src/wingman2/pages/ComparePageNew.advanced.tsx",
];

const wholeCatalogDetailConsumers: string[] = [];

describe("product intelligence delivery contract", () => {
  it("ships no eager heavyweight index file", () => {
    expect(statSync(join(process.cwd(), "public/product-intelligence-summary.json")).size).toBeLessThan(3_500_000);
    expect(() => statSync(join(process.cwd(), "public/product-intelligence-index.json"))).toThrow();
  });

  it("keeps catalogue loading behind the shared cache", () => {
    const cacheSource = readFileSync(join(process.cwd(), "src/wingman2/lib/productIntelligenceIndexCache.ts"), "utf8");

    expect(cacheSource).toContain('"/product-intelligence-summary.json"');
    expect(cacheSource).toContain('"/product-intelligence-details.json"');
    expect(cacheSource).toContain("loadProductIntelligenceDetail");
    expect(cacheSource).toContain("loadProductIntelligenceSummaryWithDetail");
    expect(cacheSource).toContain("loadProductIntelligenceDetailRecords");
    // No runtime path may fetch the retired heavyweight file.
    expect(cacheSource).not.toContain('"/product-intelligence-index.json"');

    for (const relativePath of [...summaryConsumers, ...detailConsumers, ...wholeCatalogDetailConsumers]) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");

      expect(source, `${relativePath} must not fetch product intelligence artifacts directly`).not.toMatch(/fetch\("\/product-intelligence/);
      expect(source, `${relativePath} must not name the retired heavyweight index`).not.toContain('"/product-intelligence-index.json"');
    }

    for (const relativePath of summaryConsumers) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      expect(source, `${relativePath} should load the shared summary`).toContain("loadProductIntelligenceSummary");
    }

    for (const relativePath of detailConsumers) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      expect(source, `${relativePath} should hydrate detail records`).toContain("loadProductIntelligenceDetailRecords");
    }

    for (const relativePath of wholeCatalogDetailConsumers) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      expect(source, `${relativePath} should load whole detail records`).toContain("loadProductIntelligenceDetailRecords");
    }

    // The retired single-file index must not be referenced anywhere in src.
    for (const relativePath of [...summaryConsumers, ...detailConsumers]) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      expect(source, `${relativePath} must not reference the retired index filename`).not.toContain("product-intelligence-index");
    }
  });
});
