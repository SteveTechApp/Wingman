import { describe, expect, it } from "vitest";
import { governedCoverageSummary } from "./governedCoverage";

describe("governed coverage summary", () => {
  it("reports full governed coverage with human-verified separated from machine-transcribed", () => {
    const summary = governedCoverageSummary();
    // All governed profiles are covered; SW-0X01-8K sits at review-required
    // because it is the shared family page for the EXP-SW-0201-8K (2x1) and
    // EXP-SW-0401-8K (4x1) 8K switchers, not a saleable SKU with its own spec.
    // 5 accessory SKUs (APO-VX20-MNT, IDB-300, NHD-RACK-1U, APO-COM-MIC,
    // CAB-HAOC-20) are also review-required. "Verified" means human-confirmed:
    // the 2026-08-16 structured review passes confirmed 117 profiles against
    // live official pages, and the coverage campaign added 4 machine-transcribed
    // profiles, so the verified count dominates and the remaining sit at the
    // official-data tier awaiting a reviewer recording verifiedBy.
    expect(summary.total).toBe(139);
    expect(summary.verified).toBe(117);
    expect(summary.verified + summary.verifiedWithWarning).toBe(133);
    expect(summary.reviewRequired).toBe(6);
    expect(summary.verifiedPct).toBe(Math.round((117 / 139) * 100));
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
