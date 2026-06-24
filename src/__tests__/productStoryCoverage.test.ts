import { describe, expect, it } from "vitest";

import { PRODUCT_STORIES } from "../wingman2/data/productStories";
import catalog2026 from "../../data/catalog/wyrestormSkuCatalog.2026.json";

// Coverage ratchet. Governed product stories are the "high confidence" sales copy
// (everything else falls back to auto-generated positioning flagged for review in
// the UI). These baselines can only be RAISED: the point is that coverage never
// silently regresses and the gap stays visible and managed.
const MIN_TOTAL_STORIES = 23;
// 15 not 16: the SYN-TOUCH10 story was repointed to its active successor
// SYN-TOUCH10-V2 (the predecessor is discontinued), and the V2 SKU is not in this
// static 2026 catalogue snapshot. A deliberate EoL correction, not a regression.
const MIN_CATALOG_SKUS_COVERED = 15;

function catalogSkus(): string[] {
  return (catalog2026 as Array<{ sku?: string }>)
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
