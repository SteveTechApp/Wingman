// Rep-facing aggregate of the governed WyreStorm technical profile coverage.
//
// The Compare and dashboard surfaces use this to show that match cards are
// backed by verified governed data. compare-ready counts delegate to the
// decision engine's own resolveProductTechnicalData, so the summary can never
// drift from what Compare actually ranks.
import governedTechnicalProfilesRaw from "../../../data/governance/wyrestorm-technical-profiles.json";
import { resolveProductTechnicalData } from "./governedProductTechnicalData";

export type GovernedCoverageSummary = {
  total: number;
  verified: number;
  verifiedWithWarning: number;
  reviewRequired: number;
  compareReady: number;
  /** Percentage of profiles in a verified state (verified + verified-with-warning). */
  verifiedPct: number;
  /** Percentage of profiles that resolve as compare-ready. */
  compareReadyPct: number;
};

export function governedCoverageSummary(): GovernedCoverageSummary {
  const payload = governedTechnicalProfilesRaw as {
    version?: number;
    profiles?: Array<{ sku?: string; status?: string }>;
  };
  const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];

  let verified = 0;
  let verifiedWithWarning = 0;
  let reviewRequired = 0;
  let compareReady = 0;

  for (const profile of profiles) {
    const status = String(profile.status ?? "");
    if (status === "verified") verified += 1;
    else if (status === "verified-with-warning") verifiedWithWarning += 1;
    else if (status === "review-required") reviewRequired += 1;

    // The decision engine owns the readiness rule (exactProfileData); reuse it
    // rather than re-deriving it here.
    if (resolveProductTechnicalData(profile).compareReady) compareReady += 1;
  }

  const total = profiles.length;
  const verifiedTotal = verified + verifiedWithWarning;
  return {
    total,
    verified,
    verifiedWithWarning,
    reviewRequired,
    compareReady,
    verifiedPct: total ? Math.round((verifiedTotal / total) * 100) : 0,
    compareReadyPct: total ? Math.round((compareReady / total) * 100) : 0,
  };
}
