import { describe, expect, it } from "vitest";

import { PRODUCT_STORIES } from "./productStories";
import { getWyreStormSkuBusinessStatus } from "../lib/wyrestormSkuBusinessStatus";

// Enforcement guard: a governed sales story is "high confidence" copy a rep quotes
// directly, so it must never lead with, or recommend as a companion, a SKU the
// 2026 business lists mark do-not-spec or as a cable/accessory. (Discontinued and
// unlisted references are surfaced by `npm run lifecycle:reconcile` for review
// rather than hard-failed here, because some are contested or awaiting a curated
// successor.) This is the gate that stopped APO-DG1 / HALO-COM-MIC shipping in a
// story.
const FORBIDDEN_IN_STORIES = new Set(["do-not-spec", "cable"]);

describe("governed stories respect product lifecycle", () => {
  it("never leads with a do-not-spec or cable SKU", () => {
    const offenders = PRODUCT_STORIES.filter((story) =>
      FORBIDDEN_IN_STORIES.has(getWyreStormSkuBusinessStatus(story.sku)),
    ).map((story) => `${story.sku} (${getWyreStormSkuBusinessStatus(story.sku)})`);

    expect(offenders, offenders.join(", ")).toHaveLength(0);
  });

  it("never recommends a do-not-spec or cable SKU as a companion", () => {
    const offenders: string[] = [];
    for (const story of PRODUCT_STORIES) {
      for (const companion of story.worksWith) {
        const status = getWyreStormSkuBusinessStatus(companion.sku);
        if (FORBIDDEN_IN_STORIES.has(status)) {
          offenders.push(`${story.sku} -> ${companion.sku} (${status})`);
        }
      }
    }

    expect(offenders, offenders.join(", ")).toHaveLength(0);
  });
});
