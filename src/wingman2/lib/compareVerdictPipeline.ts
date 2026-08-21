/**
 * Compare verdict pipeline
 *
 * One pure pipeline that collapses the Compare page's four historical sources
 * of truth into a single deterministic derivation:
 *
 *   1. the spec-first engine   - rigorousResult.matches (RigorousMatch[])
 *   2. the heuristic fallback  - merged into that engine snapshot as classified
 *                                legacy matches (see ComparePageNew.advanced.tsx)
 *   3. the rep's decision ledger - retained as audit/review evidence only;
 *                                  it never changes the live engine result
 *
 * Inputs are the current engine snapshot plus optional historical review context.
 * The output is the verdict-ranked, eligibility-filtered candidate list the
 * page renders - `viable` plus the raw engine lead used by the honest no-match
 * render path. The render gate (check:governed-coverage-render) is the oracle
 * for behaviour parity: this module must never change what the page shows.
 */

import type { ResolvedCompetitorProfile } from "./competitorSpecRegistry";
import type { CompetitorMatchDecision } from "./competitorMatchDecisionLedger";
import {
  classifyCompareIntent,
  evaluateProductEligibility,
} from "./compareEligibilityEngine";
import type { RigorousMatch } from "./rigorousCompare";
import { assessMatrixVariantFit } from "./matrixVariantFit";

export type Verdict =
  | "GOOD MATCH"
  | "PARTIAL MATCH"
  | "VERIFY"
  | "ARCHITECTURE ALTERNATIVE"
  | "NO MATCH";

export type WyreStormProduct = {
  sku: string;
  name: string;
  family: string;
  productClass: string;
  role: string;
  transport: string;
  tags: string[];
  caveat: string;
  compareSuitability?: "general" | "specialist";
};

// The subset of the page's CompetitorProfile the pipeline reads. Structural, so
// the page's own (wider) profile type is assignable; the generic parameter keeps
// the injected scoring callbacks typed against the caller's full profile.
export type PipelineCompetitorProfile = {
  brand: string;
  sku: string;
  rawText: string;
  productClass: string;
  role: string;
  requestedTags: string[];
  resolvedSpec: ResolvedCompetitorProfile | null;
};

export type ScoredCandidate = {
  product: WyreStormProduct;
  score: number;
  verdict: Verdict;
  matched: string[];
  checks: string[];
  gaps: string[];
  partialMatches: string[];
  mismatches: string[];
  unknowns: string[];
  blockers: string[];
  dependencies: string[];
  outcomeLabel: string;
  requirements?: RigorousMatch["decision"]["requirements"];
  necessaryCoverage?: RigorousMatch["decision"]["necessaryCoverage"];
  evidenceCompleteness?: number;
  solutionType?: RigorousMatch["decision"]["solutionType"];
  // Governed-profile status of the WyreStorm candidate (verified-profile =
  // verified governed data; official-structured / text-inferred / missing =
  // the honest fallback tiers). Surfaced on the match card so reps can see the
  // data behind the verdict.
  governedTier?: string;
  governedLabel?: string;
  // Eligibility fit from the ranking layer (lower = better). Carried through so
  // the display sort can respect the eligibility verdict instead of letting
  // keyword/confidence overlap override it (e.g. a room hub must not lead with
  // the casting dongle just because the dongle's decision confidence is higher).
  fitPenalty?: number;
};

export type CompareVerdictResult = {
  /** Verdict-ranked, eligibility-filtered candidates (NO MATCH excluded). */
  viable: ScoredCandidate[];
  /** Raw engine lead before filtering - the honest no-match render fallback. */
  heuristicLead: ScoredCandidate | null;
};

// Inverse of productClassFromResolvedDomain(), used to backfill a structured
// competitor profile's domain when resolveCompetitorSpecProfile() couldn't
// classify it (no curated fingerprint/family rule) but the page's own tag
// classifier (extractTags/productClassFromTags) already did, from well-described
// free text. Values here are chosen to match what wyrestormCompareProfile.ts's
// detectDomain() actually produces for the real WyreStorm catalogue, NOT just
// the conceptually "nicest" label - e.g. every WyreStorm Apollo product (both
// UC conferencing bars and wireless-casting dongles) is detected as
// "WIRELESS_PRESENTATION" (matched on its APO- SKU prefix), so both "USB
// conferencing" and "Wireless casting" map there too. Mapping to a
// domain string the WyreStorm side can never produce (e.g. a distinct
// "WIRELESS_CASTING"/"USB_CONFERENCING") would turn a previously-benign
// "domain unknown, verify" into a false "domain mismatch" blocker instead.
// Distribution amplifiers and splitters share one strict, non-matrix domain.
export function domainFromProductClass(productClass: string): string | undefined {
  switch (productClass) {
    case "AV-over-IP":
      return "AVOIP";
    case "Network audio":
      return "AUDIO";
    case "Video wall":
      return "VIDEO_WALL";
    case "Multiview":
      return "MULTIVIEW";
    case "Matrix":
      return "MATRIX";
    case "HDBaseT extender":
      return "HDBASET";
    case "Presentation switcher":
      return "PRESENTATION";
    case "Wireless casting":
      return "WIRELESS_PRESENTATION";
    case "NDI camera":
      return "NDI_CAMERA";
    case "PTZ camera":
      return "PTZ_CAMERA";
    case "Control accessory":
      return "CONTROL";
    case "USB conferencing":
      return "UC";
    case "HDMI splitter":
      return "DISTRIBUTION";
    default:
      return undefined;
  }
}

/**
 * The single engineSnapshot -> verdict pipeline.
 *
 * `engineMatches` is the engine snapshot (already carrying the classified
 * heuristic fallback). Historical decisions are accepted for API compatibility
 * and audit display, but candidate selection is always recomputed from current
 * data. The result applies semantic + eligibility ordering and retains the raw
 * lead for honest no-match render paths.
 */
export function resolveCompareVerdictCandidates<P extends PipelineCompetitorProfile>(params: {
  engineMatches: readonly RigorousMatch[];
  products: readonly WyreStormProduct[];
  governedDecision: CompetitorMatchDecision | null;
  profile: P;
  toCandidate: (match: RigorousMatch, profile: P) => ScoredCandidate;
  scoreProduct: (profile: P, product: WyreStormProduct) => ScoredCandidate;
  isSelectable: (candidate: WyreStormProduct | null | undefined) => boolean;
}): CompareVerdictResult {
  const { engineMatches, profile } = params;
  const resolvedInputs = profile.resolvedSpec?.inputCount;
  const resolvedOutputs = profile.resolvedSpec?.outputCount;
  const routedRequirement = resolvedInputs && resolvedOutputs
    ? `${resolvedInputs}x${resolvedOutputs} routed matrix`
    : "";
  const competitorText = [
    routedRequirement,
    profile.brand,
    profile.sku,
    profile.rawText,
  ].filter(Boolean).join(" ");

  // 1. Engine snapshot -> selectable candidates (heuristic fallback included).
  const engineCandidates = engineMatches
    .map((match) => params.toCandidate(match, profile))
    .filter((candidate) => params.isSelectable(candidate.product));

  // Historical review decisions are deliberately not merged here. Every run
  // ranks the current engine candidates from current product/spec data.
  const candidates = engineCandidates.map((candidate) => {
    const matrixFit = assessMatrixVariantFit({
      competitorText,
      competitorFeatures: profile.resolvedSpec?.features,
      candidate: candidate.product,
    });

    if (!matrixFit.applies) return candidate;

    return {
      ...candidate,
      score: Math.max(0, Math.min(100, candidate.score + matrixFit.scoreAdjustment)),
      matched: Array.from(new Set([...matrixFit.matched, ...candidate.matched])),
      gaps: Array.from(new Set([...matrixFit.gaps, ...candidate.gaps])),
      checks: Array.from(new Set([...matrixFit.checks, ...candidate.checks])),
    };
  });

  const intent = classifyCompareIntent(
    profile.resolvedSpec ??
      {
        domain: domainFromProductClass(profile.productClass),
        role: profile.role,
      },
    competitorText,
  );

  const requestedRoomFit = profile.requestedTags.find(
    (tag) => tag === "compact room" || tag === "medium room",
  );
  const semanticRank = (candidate: ScoredCandidate): number => {
    const candidateRoomFit = candidate.product.tags.find(
      (tag) => tag === "compact room" || tag === "medium room",
    );
    const sameProductClass =
      candidate.product.productClass === profile.productClass ? 100 : 0;
    const roomFit =
      requestedRoomFit && candidateRoomFit
        ? requestedRoomFit === candidateRoomFit
          ? 120
          : -60
        : 0;
    return candidate.score + sameProductClass + roomFit;
  };
  // Eligibility expresses architecture and capacity fit; keyword confidence
  // must not override it. This applies to every product class, not only the
  // wireless lane: for example a 1x8 splitter can have richer keyword evidence
  // than the correct 1x2 splitter while still being the worse-sized match.
  const eligibilityFor = (candidate: ScoredCandidate) =>
    evaluateProductEligibility({
      intent,
      competitorText,
      match: candidate.product,
      product: candidate.product,
    });
  const eligibilityRank: Record<string, number> = {
    direct: 0,
    "architecture-alternative": 1,
    "related-only": 2,
    blocked: 3,
  };
  const compareCandidates = (a: ScoredCandidate, b: ScoredCandidate): number => {
    const aEligibility = eligibilityFor(a);
    const bEligibility = eligibilityFor(b);
    const eligibilityDelta =
      (eligibilityRank[aEligibility.eligibility] ?? 3) -
      (eligibilityRank[bEligibility.eligibility] ?? 3);
    if (eligibilityDelta !== 0) return eligibilityDelta;
    const fitDelta = aEligibility.fitPenalty - bEligibility.fitPenalty;
    if (fitDelta !== 0) return fitDelta;
    return semanticRank(b) - semanticRank(a);
  };
  const semanticallyOrdered = [...candidates].sort(compareCandidates);

  // A competitor described as a wireless CASTING DONGLE must lead with
  // APO-DG2 (the WyreStorm dongle itself), not with a multi-input presentation
  // switcher. The eligibility engine already encodes this (APO-DG2 gets the
  // best fit for a dongle competitor), but the keyword-score sort would let
  // the SW-* switcher win on marketing-word overlap - the exact case the
  // eligibility layer's competitorIsDongle branch exists to prevent.
  const dongleCompetitor =
    intent === "wireless-casting" &&
    /\bdongle\b/i.test(`${profile.brand} ${profile.sku} ${profile.rawText}`);
  const semanticallyOrderedAdjusted = dongleCompetitor
    ? [...semanticallyOrdered].sort((a, b) => {
        const aIsDongle = /^APO-DG/.test(a.product.sku.toUpperCase());
        const bIsDongle = /^APO-DG/.test(b.product.sku.toUpperCase());
        if (aIsDongle !== bIsDongle) {
          return aIsDongle ? -1 : 1;
        }
        return semanticRank(b) - semanticRank(a);
      })
    : semanticallyOrdered;

  const ordered = semanticallyOrderedAdjusted;

  // Governed/local decisions are ranking evidence, not permission to bypass
  // current product-role eligibility. Revalidate the final merged list so a
  // stale saved decision cannot resurrect a wrong product architecture.
  const viable = ordered.filter(
    (candidate) =>
      candidate.verdict !== "NO MATCH" &&
      evaluateProductEligibility({
        intent,
        competitorText,
        match: candidate.product,
        product: candidate.product,
      }).eligibility !== "blocked",
  );
  return {
    viable,
    heuristicLead: engineCandidates[0] ?? null,
  };
}
