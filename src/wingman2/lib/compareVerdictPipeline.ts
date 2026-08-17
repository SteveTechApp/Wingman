/**
 * Compare verdict pipeline
 *
 * One pure pipeline that collapses the Compare page's four historical sources
 * of truth into a single deterministic derivation:
 *
 *   1. the spec-first engine   - rigorousResult.matches (RigorousMatch[])
 *   2. the heuristic fallback  - merged into that engine snapshot as classified
 *                                legacy matches (see ComparePageNew.advanced.tsx)
 *   3. the rep's localStorage ledger - rendered as decision evidence; its
 *                                approved subset is merged into the effective
 *                                ledger and resolves to the override below
 *   4. approved-decision promotion  - governedDecision (CompetitorMatchDecision)
 *
 * Inputs are the engine snapshot plus the approved ledger override (or null).
 * The output is the verdict-ranked, eligibility-filtered candidate list the
 * page renders - `viable` plus the raw engine lead used by the honest no-match
 * render path. The render gate (check:governed-coverage-render) is the oracle
 * for behaviour parity: this module must never change what the page shows.
 */

import type { ResolvedCompetitorProfile } from "./competitorSpecRegistry";
import type { CompetitorMatchDecision } from "./competitorMatchDecisionLedger";
import {
  applyGovernedCandidateOrder,
  governedDecisionLabel,
} from "./governedCompareRuntime";
import {
  classifyCompareIntent,
  evaluateProductEligibility,
} from "./compareEligibilityEngine";
import type { RigorousMatch } from "./rigorousCompare";
import { uniqueText } from "./repScript";

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
 * The approved ledger override promoted into a ScoredCandidate: the engine's
 * candidate for the decision's WyreStorm SKU (or a fresh score when the engine
 * never surfaced it), carrying the decision's verdict, matched points, gaps and
 * blockers on top of the engine evidence.
 */
function buildGovernedCandidate<P extends PipelineCompetitorProfile>(
  decision: CompetitorMatchDecision | null,
  engineCandidates: readonly ScoredCandidate[],
  products: readonly WyreStormProduct[],
  profile: P,
  scoreProduct: (profile: P, product: WyreStormProduct) => ScoredCandidate,
): ScoredCandidate | null {
  if (
    !decision?.wyrestormSku ||
    decision.decisionType === "no-suitable-match"
  ) {
    return null;
  }

  const targetSku = decision.wyrestormSku.toUpperCase();
  const existing = engineCandidates.find(
    (candidate) => candidate.product.sku.toUpperCase() === targetSku,
  );
  const product =
    existing?.product ??
    products.find((candidate) => candidate.sku.toUpperCase() === targetSku);

  if (!product) return null;

  const base = existing ?? scoreProduct(profile, product);
  const verdict: Verdict =
    decision.decisionType === "confirmed-equivalent"
      ? "GOOD MATCH"
      : decision.decisionType === "architecture-alternative"
        ? "ARCHITECTURE ALTERNATIVE"
        : "PARTIAL MATCH";

  return {
    ...base,
    score: Math.max(
      base.score,
      decision.decisionType === "confirmed-equivalent" ? 100 : 95,
    ),
    verdict,
    matched: uniqueText([...decision.matchedPoints, ...base.matched], 12),
    gaps: uniqueText([...decision.importantDifferences, ...base.gaps], 12),
    partialMatches: uniqueText(
      [...decision.importantDifferences, ...base.partialMatches],
      12,
    ),
    mismatches: uniqueText(
      [...decision.importantDifferences, ...base.mismatches],
      12,
    ),
    blockers: uniqueText([...decision.quoteBlockers, ...base.blockers], 12),
    dependencies: uniqueText(
      [...decision.dependencies, ...base.dependencies],
      12,
    ),
    outcomeLabel: governedDecisionLabel(decision),
  };
}

/**
 * The single engineSnapshot -> ledger override -> verdict pipeline.
 *
 * `engineMatches` is the engine snapshot (already carrying the classified
 * heuristic fallback). `governedDecision` is the approved ledger override (or
 * null). The result is the exact candidate derivation the Compare page used to
 * spread across four useMemos: engine candidates first, the governed override
 * promoted to the lead (suppressing all candidates on an approved
 * no-suitable-match), semantic + eligibility ordering, and the honest raw lead
 * for no-match render paths.
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
  const { engineMatches, products, governedDecision, profile } = params;

  // 1. Engine snapshot -> selectable candidates (heuristic fallback included).
  const engineCandidates = engineMatches
    .map((match) => params.toCandidate(match, profile))
    .filter((candidate) => params.isSelectable(candidate.product));

  // 2. Ledger override -> promoted governed candidate.
  const governedCandidate = buildGovernedCandidate(
    governedDecision,
    engineCandidates,
    products,
    profile,
    params.scoreProduct,
  );

  // 3. Merge, semantic-order, then eligibility-filter into the final list.
  const candidates = governedCandidate
    ? [
        governedCandidate,
        ...engineCandidates.filter(
          (candidate) =>
            candidate.product.sku.toUpperCase() !==
            governedCandidate.product.sku.toUpperCase(),
        ),
      ]
    : engineCandidates;

  const intent = classifyCompareIntent(
    profile.resolvedSpec ??
      {
        domain: domainFromProductClass(profile.productClass),
        role: profile.role,
      },
    `${profile.brand} ${profile.sku} ${profile.rawText}`,
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
  // In the wireless-presentation lane the eligibility layer holds the precise
  // verdict (hub -> SW-* switcher, dongle -> APO-DG2) via fit penalties. The
  // keyword/confidence sort below must not override it - otherwise a casting
  // dongle with high decision confidence can leapfrog the actual room switcher
  // for a ClickShare-style HUB competitor, or vice versa. Fit is the primary
  // key only for this intent; everywhere else the legacy keyword sort stands.
  const eligibilityFit = (candidate: ScoredCandidate): number =>
    Number.isFinite(candidate.fitPenalty) ? (candidate.fitPenalty as number) : 0;
  const compareCandidates = (a: ScoredCandidate, b: ScoredCandidate): number => {
    if (intent === "wireless-casting") {
      const fitDelta = eligibilityFit(a) - eligibilityFit(b);
      if (fitDelta !== 0) return fitDelta;
    }
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

  const ordered = applyGovernedCandidateOrder(
    semanticallyOrderedAdjusted,
    governedDecision,
    (candidate) => candidate.product.sku,
  );

  // Governed/local decisions are ranking evidence, not permission to bypass
  // current product-role eligibility. Revalidate the final merged list so a
  // stale saved decision cannot resurrect a wrong product architecture.
  const viable = ordered.filter(
    (candidate) =>
      candidate.verdict !== "NO MATCH" &&
      evaluateProductEligibility({
        intent,
        competitorText: `${profile.brand} ${profile.sku} ${profile.rawText}`,
        match: candidate.product,
        product: candidate.product,
      }).eligibility !== "blocked",
  );

  return {
    viable,
    heuristicLead: engineCandidates[0] ?? null,
  };
}
