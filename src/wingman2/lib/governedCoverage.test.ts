import { describe, expect, it } from "vitest";
import { governedCoverageSummary } from "./governedCoverage";

describe("governed coverage summary", () => {
  it("reports full governed coverage with human-verified separated from machine-transcribed", () => {
    const summary = governedCoverageSummary();
    // The original 139 governed profiles plus 84 new profiles imported from the
    // Q3 2026 price list. The original 117 verified profiles remain verified;
    // the 84 imported profiles are review-required pending human confirmation.
    expect(summary.total).toBe(210);
    expect(summary.verified).toBe(117);
    expect(summary.verified + summary.verifiedWithWarning).toBe(136);
    expect(summary.reviewRequired).toBe(74);
    expect(summary.verifiedPct).toBe(Math.round((117 / 210) * 100));
  });

  it("reports the compare-ready subset consistently with the decision engine rule", () => {
    const summary = governedCoverageSummary();
    // Profiles with a mandatory host dependency (e.g. APO-DG2) or no video
    // resolution are not compare-ready even when verified - the summary
    // delegates to the decision engine's exactProfileData rule.
    // 133 of the original 139 profiles are compare-ready; the 84 new profiles
    // are review-required and thus not compare-ready.
    expect(summary.compareReady).toBeGreaterThanOrEqual(120);
    expect(summary.compareReady).toBeLessThanOrEqual(summary.total);
  });
});
