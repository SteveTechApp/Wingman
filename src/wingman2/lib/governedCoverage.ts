// Rep-facing aggregate of the governed WyreStorm technical profile coverage.
//
// The Compare and dashboard surfaces use this to show that match cards are
// backed by governed data - human-confirmed profiles (status `verified` with a
// `verifiedBy` record) render as verified; everything else renders at the
// official-structured tier awaiting human confirmation. compare-ready counts
// delegate to the decision engine's own resolveProductTechnicalData, so the
// summary can never drift from what Compare actually ranks.
import governedTechnicalProfilesRaw from "../../../data/governance/wyrestorm-technical-profiles.json";
import { resolveProductTechnicalData } from "./governedProductTechnicalData";

export type GovernedCoverageSummary = {
  total: number;
  /** Human-confirmed profiles (status `verified` with a `verifiedBy` record). */
  verified: number;
  /** Machine-transcribed official-data profiles awaiting human confirmation. */
  verifiedWithWarning: number;
  reviewRequired: number;
  compareReady: number;
  /** Percentage of profiles that are human-confirmed (true `verified`). */
  verifiedPct: number;
  /** Percentage of profiles that resolve as compare-ready. */
  compareReadyPct: number;
};

export function governedCoverageSummary(): GovernedCoverageSummary {
  const payload = governedTechnicalProfilesRaw as {
    version?: number;
    profiles?: Array<{ sku?: string; status?: string; verifiedBy?: string }>;
  };
  const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];

  let verified = 0;
  let verifiedWithWarning = 0;
  let reviewRequired = 0;
  let compareReady = 0;

  for (const profile of profiles) {
    const status = String(profile.status ?? "");
    // "Verified" requires a human: a machine-promoted `verified` status with
    // no `verifiedBy` record is official-page data awaiting confirmation, the
    // same tier as verified-with-warning.
    const humanConfirmed =
      status === "verified" && Boolean(profile.verifiedBy?.trim());
    if (humanConfirmed) verified += 1;
    else if (status === "verified" || status === "verified-with-warning") verifiedWithWarning += 1;
    else if (status === "review-required") reviewRequired += 1;

    // The decision engine owns the readiness rule (exactProfileData); reuse it
    // rather than re-deriving it here.
    if (resolveProductTechnicalData(profile).compareReady) compareReady += 1;
  }

  const total = profiles.length;
  return {
    total,
    verified,
    verifiedWithWarning,
    reviewRequired,
    compareReady,
    verifiedPct: total ? Math.round((verified / total) * 100) : 0,
    compareReadyPct: total ? Math.round((compareReady / total) * 100) : 0,
  };
}
