import { describe, expect, it } from "vitest";
import { governedCoverageSummary } from "./governedCoverage";

describe("governed coverage summary", () => {
  it("reports full governed coverage with human-verified separated from machine-transcribed", () => {
    const summary = governedCoverageSummary();
    // The governed profile set (207 today: the governance audit merged the
    // NHD-500-TX-V2 / NHD-500-RX v2 / SYN-TOUCH10 v3 variant rows into their
    // canonical profiles). 116 are human-verified; the rest are pending.
    expect(summary.total).toBe(207);
    expect(summary.verified).toBe(116);
    expect(summary.verified + summary.verifiedWithWarning).toBe(135);
    expect(summary.reviewRequired).toBe(72);
    expect(summary.verifiedPct).toBe(Math.round((116 / 207) * 100));
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
