import { describe, expect, it } from "vitest";
import { governedCoverageSummary } from "./governedCoverage";

describe("governed coverage summary", () => {
  it("reports full governed coverage with human-verified separated from machine-transcribed", () => {
    const summary = governedCoverageSummary();
    // The governed profile set (206 today: the governance audit merged the
    // NHD-500-TX-V2 / NHD-500-RX v2 / SYN-TOUCH10 v3 variant rows into their
    // canonical profiles). Confirmation pass 3 (2026-09-30, batches R1-R5)
    // human-verified every profile; zero remain machine-transcribed.
    expect(summary.total).toBe(206);
    expect(summary.verified).toBe(206);
    // No profile is left on a machine tier and none remain review-required:
    // pass 3 cleared the whole backlog the aging gate tracked.
    expect(summary.verifiedWithWarning).toBe(0);
    expect(summary.reviewRequired).toBe(0);
    expect(summary.verifiedPct).toBe(100);
  });

  it("reports the compare-ready subset consistently with the decision engine rule", () => {
    const summary = governedCoverageSummary();
    // Profiles with a mandatory host dependency (e.g. APO-DG2) or no video
    // resolution are not compare-ready even when verified - the summary
    // delegates to the decision engine's exactProfileData rule. Pass 3
    // verified the remaining 90, but verification alone does not make a
    // passive accessory compare-ready.
    expect(summary.compareReady).toBeGreaterThanOrEqual(120);
    expect(summary.compareReady).toBeLessThanOrEqual(summary.total);
  });
});
