import { describe, expect, it } from "vitest";
import { governedCoverageSummary } from "./governedCoverage";

describe("governed coverage summary", () => {
  it("reports the full governed catalogue as verified", () => {
    const summary = governedCoverageSummary();
    // The 2026-08 batch governed review verified all 130 governed profiles.
    expect(summary.total).toBe(130);
    expect(summary.verified + summary.verifiedWithWarning).toBe(130);
    expect(summary.reviewRequired).toBe(0);
    expect(summary.verifiedPct).toBe(100);
  });

  it("reports the compare-ready subset consistently with the decision engine rule", () => {
    const summary = governedCoverageSummary();
    // Profiles with a mandatory host dependency (e.g. APO-DG2) or no video
    // resolution are not compare-ready even when verified - the summary
    // delegates to the decision engine's exactProfileData rule.
    expect(summary.compareReady).toBeGreaterThanOrEqual(120);
    expect(summary.compareReady).toBeLessThanOrEqual(summary.total);
  });
});
