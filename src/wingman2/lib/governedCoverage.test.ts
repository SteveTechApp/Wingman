import { describe, expect, it } from "vitest";
import { governedCoverageSummary } from "./governedCoverage";

describe("governed coverage summary", () => {
  it("reports full governed coverage with human-verified separated from machine-transcribed", () => {
    const summary = governedCoverageSummary();
    // All 130 governed profiles are covered (none stuck at review-required).
    // "Verified" means human-confirmed: the 2026-08-16 structured review passes
    // confirmed 117 profiles against live official pages, so the verified count
    // dominates and the 13 remaining sit at the official-data tier awaiting a
    // reviewer recording verifiedBy.
    expect(summary.total).toBe(130);
    expect(summary.verified).toBe(117);
    expect(summary.verified + summary.verifiedWithWarning).toBe(130);
    expect(summary.reviewRequired).toBe(0);
    expect(summary.verifiedPct).toBe(Math.round((117 / 130) * 100));
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
