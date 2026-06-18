import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clientProductIndexConsumers = [
  "src/wingman2/components/WingmanGuruDrawer.tsx",
  "src/wingman2/pages/FinderPage.tsx",
  "src/wingman2/pages/ProductPitchPage.tsx",
  "src/wingman2/pages/ProductCallCardsPage.tsx",
];

describe("product intelligence index cache usage", () => {
  it("keeps heavyweight product-index loading behind the shared cache", () => {
    const cacheSource = readFileSync(join(process.cwd(), "src/wingman2/lib/productIntelligenceIndexCache.ts"), "utf8");

    expect(cacheSource).toContain("productIntelligenceIndexPromise");
    expect(cacheSource).toContain('fetch("/product-intelligence-index.json"');

    for (const relativePath of clientProductIndexConsumers) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");

      expect(source, `${relativePath} should call the shared cache loader`).toContain("loadProductIntelligenceIndex");
      expect(source, `${relativePath} must not fetch the heavyweight index directly`).not.toContain('fetch("/product-intelligence-index.json"');
      expect(source, `${relativePath} must not keep the heavyweight index in endpoint arrays`).not.toContain('"/product-intelligence-index.json",');
    }
  });
});
