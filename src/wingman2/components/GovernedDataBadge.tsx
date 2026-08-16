/**
 * Governed-data badge shared by the Compare, Product Pitch and Catalog pages.
 *
 * Surfaces the data tier behind a product card so reps always see whether the
 * facts came from a verified governed profile, official-page extracted data,
 * inferred text, or nothing resolved yet. The tier values are the same
 * `CompareDecisionProfile.sourceTier` values the compare decision engine and
 * `resolveProductTechnicalData` emit, so every surface tells the same story.
 */

/** Weakest-to-strongest ladder over the badge's own tier vocabulary. */
const TIER_RANK: Record<string, number> = {
  "verified-profile": 3,
  "official-structured": 2,
  "text-inferred": 1,
  missing: 0,
};

/**
 * Weakest-link combine: the least trustworthy tier of the given set, so a
 * card that surfaces any unresolved field can never claim a stronger tier
 * than that field deserves. Unknown tiers count as `missing` (weakest).
 */
export function weakestLinkTier(tiers: Array<string | undefined>): string {
  const normalize = (tier: string | undefined): string =>
    tier !== undefined && TIER_RANK[tier] !== undefined ? tier : "missing";
  let weakest = "missing";
  let weakestRank = Number.POSITIVE_INFINITY;
  for (const tier of tiers) {
    const normalized = normalize(tier);
    const rank = TIER_RANK[normalized];
    if (rank < weakestRank) {
      weakestRank = rank;
      weakest = normalized;
    }
  }
  return weakest;
}

export function governedBadgeMeta(tier?: string, label?: string): { text: string; className: string } {
  switch (tier) {
    case "verified-profile":
      return { text: "Verified governed data", className: "is-verified" };
    case "official-structured":
      return { text: "Official data - review required", className: "is-warn" };
    case "text-inferred":
      return { text: "Inferred data - review before use", className: "is-warn" };
    default:
      // The missing tier always renders the canonical copy - the resolver
      // itself emits it now, and this keeps any stale caller (or a label-only
      // unknown tier) from leaking a second wording onto a surface.
      if (tier === "missing") {
        return { text: "Technical data not resolved", className: "is-warn" };
      }
      return { text: label || "Technical data not resolved", className: "is-warn" };
  }
}

export function GovernedDataBadge({ tier, label }: { tier?: string; label?: string }) {
  const meta = governedBadgeMeta(tier, label);
  return (
    <span className={`compare-native-governance-badge ${meta.className}`} title={`Data source: ${meta.text}`}>
      {meta.text}
    </span>
  );
}
