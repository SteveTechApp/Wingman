import { describe, expect, it } from "vitest";

import { applyCatalogOverrides, createDefaultCatalogFilterState } from "../../features/catalog/catalogIntelligence";
import { extractRawProducts } from "../lib/productStoryEngine";
import { withBusinessLifecycle, selectCatalogResults } from "./CatalogBrowserPage";
import index from "../../../public/product-intelligence-index.json";

const catalog = applyCatalogOverrides(extractRawProducts(index)).map(withBusinessLifecycle);
const has = (list: { sku: string }[], sku: string) => list.some((p) => p.sku.toUpperCase() === sku);

describe("catalogue browser lifecycle filtering", () => {
  it("overlays business-list status so discontinued SKUs are flagged even without a catalog override", () => {
    // CAM-200-PTZ / NHD-CTL-PRO are on the 2026 discontinued list but had no
    // catalogIntelligence manual override, so the engine alone left them visible.
    for (const sku of ["CAM-200-PTZ", "NHD-CTL-PRO"]) {
      const product = catalog.find((p) => p.sku.toUpperCase() === sku);
      expect(product, `${sku} present in catalog`).toBeTruthy();
      expect(product?.lifecycle.excludeFromNewRecommendations, `${sku} suppressed`).toBe(true);
    }
  });

  it("hides end-of-life products from the default view", () => {
    const results = selectCatalogResults(catalog, createDefaultCatalogFilterState());
    expect(has(results, "CAM-200-PTZ")).toBe(false);
    expect(has(results, "NHD-CTL-PRO")).toBe(false);
  });

  it("does not surface a suppressed SKU even on an exact smart-find search", () => {
    // P2: smart-find returns score>0 matches; the hard lifecycle filter must
    // still exclude a suppressed SKU (CAM-200-PTZ is discontinued/suppressed;
    // APO-210-UC was previously suppressed here in error - confirmed 2026-07-04
    // to be a current, recommendable larger-room product and no longer excluded).
    const state = { ...createDefaultCatalogFilterState(), search: "CAM-200-PTZ" };
    expect(has(selectCatalogResults(catalog, state), "CAM-200-PTZ")).toBe(false);
  });

  it("reveals end-of-life products when the hide toggle is off", () => {
    const state = { ...createDefaultCatalogFilterState(), excludeEolSoon: false, search: "CAM-200-PTZ" };
    expect(has(selectCatalogResults(catalog, state), "CAM-200-PTZ")).toBe(true);
  });

  it("suppresses a SKU the admin has manually blocked, even one otherwise unsuppressed", () => {
    // SW-740-TX is not in the real catalogue index at all (it's an invalid/stale
    // SKU string, per its admin note) - build a synthetic product carrying an
    // otherwise-clean lifecycle to isolate the admin-override behaviour itself.
    const base = catalog.find((product) => !product.lifecycle.excludeFromNewRecommendations);
    expect(base, "at least one non-suppressed catalog product exists as a base").toBeTruthy();

    const blocked = withBusinessLifecycle({ ...base!, sku: "SW-740-TX" });
    expect(blocked.lifecycle.excludeFromNewRecommendations).toBe(true);
  });
});
