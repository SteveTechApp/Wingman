import { describe, expect, it } from "vitest";

import { PRODUCT_STORIES } from "./productStories";
import {
  getWyreStormForbiddenBusinessSkus,
  getWyreStormSkuBusinessStatus,
} from "../lib/wyrestormSkuBusinessStatus";

// Enforcement guard: a governed sales story is "high confidence" copy a rep quotes
// directly, so it must never lead with, or recommend as a companion, a SKU the
// 2026 business lists mark do-not-spec or as a cable/accessory. (Discontinued and
// unlisted references are surfaced by `npm run lifecycle:reconcile` for review
// rather than hard-failed here, because some are contested or awaiting a curated
// successor.) This is the gate that stopped APO-DG1 / HALO-COM-MIC shipping in a
// story.
const FORBIDDEN_IN_STORIES = new Set(["do-not-spec", "cable"]);

// SKU-shaped tokens (contain a digit) from the governed lifecycle source. Used to
// guard customer-facing PROSE too: keyFeatures/whatItIs etc. are quoted directly, so
// naming a do-not-spec SKU there steers a rep to it even though it never appears in
// `sku`/`worksWith` (the two fields the checks above cover). e.g. the catalogue line
// for APO-210-UC names the do-not-spec APO-DG1 dongle, which must not reach the copy.
const FORBIDDEN_SKUS = getWyreStormForbiddenBusinessSkus()
  .filter((sku) => /\d/.test(sku) && sku.length >= 4);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function storyProse(story: (typeof PRODUCT_STORIES)[number]): string {
  return [
    story.oneLinePosition, story.whatItIs, story.whatItDoes, story.customerProblem,
    story.salesTalkTrack, story.familyContext, story.customerSafeWording,
    story.internalRepGuidance, story.diagramSource ?? "", story.diagramOutput ?? "",
    ...story.idealApplications, ...story.whenToUse, ...story.whenNotToUse,
    ...story.discoveryQuestions, ...story.quoteChecks, ...story.keyFeatures,
  ].join(" | ");
}

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

  it("never names a do-not-spec or cable SKU in customer-facing story prose", () => {
    const offenders: string[] = [];
    for (const story of PRODUCT_STORIES) {
      const prose = storyProse(story);
      for (const sku of FORBIDDEN_SKUS) {
        const token = new RegExp(`(?<![A-Z0-9-])${escapeRegExp(sku)}(?![A-Z0-9-])`, "i");
        if (token.test(prose)) offenders.push(`${story.sku} -> ${sku}`);
      }
    }

    expect(offenders, offenders.join(", ")).toHaveLength(0);
  });
});
