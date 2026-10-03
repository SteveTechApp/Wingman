import { describe, expect, it } from "vitest";
import { evaluateProductEligibility } from "./compareEligibilityEngine";

describe("distribution amplifier minimum fan-out", () => {
  it("does not treat a 1x2 splitter as a direct replacement for a 1x4 requirement", () => {
    const result = evaluateProductEligibility({
      intent: "distribution-amplifier",
      competitorText: "Atlona AT-HDDA-4 1x4 HDMI Distribution Amplifier",
      match: { sku: "EXP-SP-0102-H2" },
      product: {
        sku: "EXP-SP-0102-H2",
        name: "1x2 4K HDMI splitter",
        category: "HDMI splitter",
        role: "distribution amplifier",
      },
    });

    expect(result.eligibility).toBe("related-only");
    expect(result.fitPenalty).toBeGreaterThanOrEqual(200);
  });

  it("keeps a 1x4 splitter as a direct fit for a 1x4 requirement", () => {
    const result = evaluateProductEligibility({
      intent: "distribution-amplifier",
      competitorText: "Atlona AT-HDDA-4 1x4 HDMI Distribution Amplifier",
      match: { sku: "SP-0104-H2" },
      product: {
        sku: "SP-0104-H2",
        name: "1x4 4K HDMI splitter",
        category: "HDMI splitter",
        role: "distribution amplifier",
      },
    });

    expect(result.eligibility).toBe("direct");
    expect(result.fitPenalty).toBe(-5);
  });
});
