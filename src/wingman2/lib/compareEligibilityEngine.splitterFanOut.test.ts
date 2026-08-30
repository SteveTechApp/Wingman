import { describe, expect, it } from "vitest";
import { classifyCompareIntent, evaluateProductEligibility } from "./compareEligibilityEngine";

/**
 * Right-sizing for HDMI splitters / distribution amplifiers. A splitter is
 * defined by its output fan-out, so a 1x4 request must map to the 1:4 splitter
 * (SP-0104-H2), not a larger 1:8 (SP-0108-SCL) that happens to carry an extra
 * feature such as audio de-embed - and an 8-way request must map to the 1:8.
 *
 * The mechanism: classifyCompareIntent recognises "splitter" as
 * distribution-amplifier, and evaluateProductEligibility applies matrixFitPenalty,
 * which now reads the SP-/EXP-SP- SKU fan-out (SP-0104 = 1:4, SP-0108 = 1:8) so
 * an over-provisioned splitter is penalised relative to the exact-size one.
 */
function fit(competitorText: string, sku: string) {
  return evaluateProductEligibility({
    intent: "distribution-amplifier",
    competitorText,
    match: { sku },
    product: { sku, name: `${sku} 4K HDMI splitter`, category: "HDMI Splitter" },
  });
}

describe("distribution-amplifier fan-out right-sizing", () => {
  it("classifies a splitter description as a distribution amplifier", () => {
    expect(classifyCompareIntent("", "1x4 4K HDMI splitter with audio breakout")).toBe("distribution-amplifier");
    expect(classifyCompareIntent("", "8-way HDMI splitter with smart scaling")).toBe("distribution-amplifier");
  });

  it("prefers the 1:4 splitter over the 1:8 for a 1x4 request", () => {
    const four = fit("1x4 4K HDMI splitter with audio breakout", "SP-0104-H2");
    const eight = fit("1x4 4K HDMI splitter with audio breakout", "SP-0108-SCL");

    expect(four.eligibility).toBe("direct");
    expect(eight.eligibility).toBe("direct");
    // Exact fan-out with matching HDMI transport earns a small tiebreaker bonus.
    expect(four.fitPenalty).toBe(-5);
    expect(four.fitPenalty).toBeLessThan(eight.fitPenalty);
  });

  it("prefers the 1:8 splitter over the 1:4 for a 1x8 request", () => {
    // The eligibility parser reads NxM / SP-SKU fan-out directly; the rendered
    // pipeline enriches free-text forms like "8-way" into "1x8" upstream (covered
    // end-to-end by ComparePageNew.ingestDrill.test.tsx), so the unit test uses
    // the parseable "1x8" form here.
    const eight = fit("1x8 HDMI splitter with smart scaling", "SP-0108-SCL");
    const four = fit("1x8 HDMI splitter with smart scaling", "SP-0104-H2");

    expect(eight.eligibility).toBe("direct");
    expect(eight.fitPenalty).toBe(-5);
    // Too few outputs is a hard undersize penalty, ranking the 1:4 well below.
    expect(eight.fitPenalty).toBeLessThan(four.fitPenalty);
  });

  it("reads the EXP-SP- Essentials splitter SKU fan-out (EXP-SP-0104 = 1:4)", () => {
    const essentialsFour = fit("1x4 HDMI splitter", "EXP-SP-0104-H2");
    const essentialsTwo = fit("1x4 HDMI splitter", "EXP-SP-0102-H2");

    expect(essentialsFour.fitPenalty).toBe(-5);
    // A 1:2 for a 1:4 need is undersized, so it is penalised far more.
    expect(essentialsTwo.fitPenalty).toBeGreaterThan(essentialsFour.fitPenalty);
  });

  it("does not reclassify a curated splitter as UC hardware from application tags", () => {
    const result = evaluateProductEligibility({
      intent: "distribution-amplifier",
      competitorText: "1x2 HDMI distribution amplifier",
      match: { sku: "EXP-SP-0102-H2" },
      product: {
        sku: "EXP-SP-0102-H2",
        name: "1x2 HDMI splitter",
        family: "Distribution",
        productClass: "HDMI splitter",
        role: "Distribution amplifier",
        // Real catalogue application/search data can legitimately mention
        // downstream UC and camera use without changing the hardware's class.
        tags: ["conference room", "integrated camera workflow", "UC room"],
      },
    });

    expect(result.eligibility).toBe("direct");
    expect(result.fitPenalty).toBe(-5);
  });
});
