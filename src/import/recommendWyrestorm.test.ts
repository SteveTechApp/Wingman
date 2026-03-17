import { describe, expect, it } from "vitest";

import { extractRequirements } from "./extractRequirements";
import { recommendWyrestorm } from "./recommendWyrestorm";

describe("recommendWyrestorm", () => {
  it("returns populated tiered room recommendations from the canonical catalog projection", () => {
    const text = "Need a boardroom solution with 2 displays, USB-C BYOD, 4K60 switching, and room control.";
    const req = extractRequirements(text);
    const recommendation = recommendWyrestorm(req, text);

    expect(recommendation.mode).toBe("room");
    if (recommendation.mode !== "room") return;

    expect(recommendation.tiers).toHaveLength(3);
    expect(recommendation.tiers.some((tier) => tier.skus.length > 0)).toBe(true);
    expect(recommendation.tiers.find((tier) => tier.tier === "Silver")?.skus[0]?.sku).toBeTruthy();
  });

  it("surfaces product matches with real descriptions for product-led requests", () => {
    const text = "Need a single replacement part number for a 4K60 HDBaseT extender with USB.";
    const req = {
      intent: "product" as const,
      summary: ["Intent: Individual product", "Resolution: 4K60", "Distance: medium"],
      resolution: "4K60" as const,
      distanceHint: "medium" as const,
      byodUsbC: false,
      switchingNeeded: false,
      notes: [],
    };
    const recommendation = recommendWyrestorm(req, text);

    expect(recommendation.mode).toBe("product");
    if (recommendation.mode !== "product") return;

    expect(recommendation.best.length).toBeGreaterThan(0);
    expect(recommendation.best[0]?.description.length).toBeGreaterThan(8);
  });
});
