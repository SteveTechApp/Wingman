import { describe, expect, it } from "vitest";

import { PRODUCT_STORIES } from "../wingman2/data/productStories";
import canonicalStore from "../../data/wingman-canonical-product-store.json";

// Coverage ratchet. Governed product stories are the "high confidence" sales copy
// (everything else falls back to auto-generated positioning flagged for review in
// the UI). These baselines can only be RAISED: the point is that coverage never
// silently regresses and the gap stays visible and managed.
const MIN_TOTAL_STORIES = 115;
// Every ACTIVE catalogue SKU now has a governed story (catalogue-grounded copy was
// authored for the whole active range, alias-deduped; cables, discontinued and
// do-not-spec SKUs are deliberately excluded per productStoriesLifecycle). 96 is
// the raw-match count against this static 2026 snapshot (aliases such as
// NHD-610-TX -> NHD-610-TX-V2 resolve at runtime but not in this direct count).
const MIN_CATALOG_SKUS_COVERED = 101;

function catalogSkus(): string[] {
  return (canonicalStore.products as Array<{ sku?: string; doNotSpec?: boolean }>)
    .filter((entry) => entry.doNotSpec !== true)
    .map((entry) => String(entry.sku ?? "").toUpperCase())
    .filter(Boolean);
}

describe("product story coverage ratchet", () => {
  it("never drops below the governed-story baseline", () => {
    expect(PRODUCT_STORIES.length).toBeGreaterThanOrEqual(MIN_TOTAL_STORIES);
  });

  it("has no duplicate story SKUs", () => {
    const skus = PRODUCT_STORIES.map((story) => story.sku.toUpperCase());
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("keeps at least the baseline number of live-catalogue SKUs governed", () => {
    const stories = new Set(PRODUCT_STORIES.map((story) => story.sku.toUpperCase()));
    const covered = catalogSkus().filter((sku) => stories.has(sku));
    expect(covered.length).toBeGreaterThanOrEqual(MIN_CATALOG_SKUS_COVERED);
  });
});
