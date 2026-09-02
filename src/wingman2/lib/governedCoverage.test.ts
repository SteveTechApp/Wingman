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
    // 2026-09-02: five newly-active lead profiles (SW-660-TX-W, SW-620L-TX-W,
    // EX-40-KVM-H2, EX-100-KVM-H2, SYN-TP10-B) promoted to the machine
    // verified-with-warning tier when their lifecycle rows went active.
    expect(summary.verified + summary.verifiedWithWarning).toBe(140);
    expect(summary.reviewRequired).toBe(67);
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
