/**
 * Turning a rigorous compare result into the candidates the page renders.
 *
 * The engine ranks matches and rejects; this module is the mapping from that
 * shape onto ScoredCandidate - reading the product a match names, translating
 * the decision's outcome into the verdict the cards print, and filling the
 * decision back in for a ranked match that arrived without one. Pure: matches
 * and a competitor profile in, candidates out.
 */
import { uniqueText } from "../../lib/repScript";
import { type ScoredCandidate, type Verdict } from "../../features/compare";
import { type ResolvedCompetitorProfile } from "../../lib/competitorSpecRegistry";
import { buildWyrestormCompareProfile } from "../../lib/wyrestormCompareProfile";
import { classifyCompetitorCompareDecision } from "../../lib/competitorCompareDecision";
import type { RigorousMatch } from "../../lib/rigorousCompare";
import type { CompetitorProfile } from "./compareTypes";
import { applyCompareEquivalenceGuards } from "./compareCandidateScoring";
import { findWyrestormProduct } from "./compareProfileCuration";

export function productClassFromResolvedDomain(domain?: string): string | null {
  switch ((domain || "").toUpperCase()) {
    case "AVOIP":
      return "AV-over-IP";
    case "AUDIO":
      return "Network audio";
    case "VIDEO_WALL":
      return "Video wall";
    case "MULTIVIEW":
      return "Multiview";
    case "MATRIX":
      return "Matrix";
    case "DISTRIBUTION":
      return "HDMI splitter";
    case "HDBASET":
      return "HDBaseT extender";
    case "PRESENTATION":
      return "Presentation switcher";
    case "WIRELESS_PRESENTATION":
      return "Wireless casting";
    case "NDI_CAMERA":
      return "NDI camera";
    case "PTZ_CAMERA":
      return "PTZ camera";
    case "WIRELESS_CASTING":
      return "Wireless casting";
    case "UC":
    case "UC_SOUNDBAR":
      return "USB conferencing";
    case "CONTROL":
      return "Control accessory";
    default:
      return null;
  }
}

export function rigorousMatchToCandidate(match: RigorousMatch, profile: CompetitorProfile): ScoredCandidate {
  const product = findWyrestormProduct(match.sku) ?? {
    sku: match.sku,
    name: match.name,
    family: match.family || "WyreStorm",
    productClass: String(match.wyrestorm.domain || "Product"),
    role: String(match.wyrestorm.role || "Confirm role"),
    transport: String(match.wyrestorm.transport || "Confirm transport"),
    tags: [],
    caveat: "Confirm the product specification and required accessories before quoting.",
  };
  const verdict: Verdict =
    match.decision.solutionType === "architecture-alternative"
      ? "ARCHITECTURE ALTERNATIVE"
      : match.decision.outcome === "GOOD MATCH"
        ? "GOOD MATCH"
        : match.decision.outcome === "NO MATCH"
          ? "NO MATCH"
          : match.decision.outcome === "VERIFY"
            ? "VERIFY"
            : "PARTIAL MATCH";

  return applyCompareEquivalenceGuards(
    {
      product,
      score: match.decision.confidence,
      verdict,
      matched: match.decision.matches,
      // The product caveat is a positioning note ("Use for... / confirm X before
      // quoting"), not a hard dependency - it belongs with the pre-quote checks
      // so a clean engine match can genuinely reach the "match" status instead of
      // every candidate being forced to "checks" by an always-present caveat.
      checks: uniqueText([...match.decision.verify, product.caveat], 6),
      gaps: match.decision.gaps,
      partialMatches: match.decision.outcome === "PARTIAL MATCH" ? match.decision.matches : [],
      mismatches: match.decision.outcome === "NO MATCH" ? match.decision.gaps : [],
      unknowns: match.decision.verify,
      blockers: match.decision.blockers,
      dependencies: [
        // Surface the structured system requirements so a single component is
        // never read as a one-box replacement for a competitor's system.
        ...(match.decision.systemRequirements && match.decision.systemRequirements.length > 0
          ? [`Not a one-box replacement - this component also needs: ${match.decision.systemRequirements.join("; ")}.`]
          : []),
      ],
      outcomeLabel: match.decision.summary,
      requirements: match.decision.requirements,
      necessaryCoverage: match.decision.necessaryCoverage,
      fitPenalty: (match as { compareEligibility?: { fitPenalty?: number } }).compareEligibility?.fitPenalty,
      evidenceCompleteness: match.decision.evidenceCompleteness,
      solutionType: match.decision.solutionType,
      governedTier: match.wyrestorm?.sourceTier ?? "missing",
      // The resolver emits the canonical "Technical data not resolved" label
      // for the missing tier, and the shared badge canonicalizes the tier
      // itself - so the label flows straight through.
      governedLabel: match.wyrestorm?.sourceLabel,
    },
    profile,
  );
}

type RankedMatchWithOptionalDecision = Partial<RigorousMatch> & {
  sku: string;
  name?: string;
  family?: string;
  confidence?: number;
  score?: number;
  why?: string;
  compareEligibility?: { reasons?: string[] };
  eligibility?: { reasons?: string[] };
};

export function normalizeRankedRigorousMatches(
  matches: RigorousMatch[],
  competitor: ResolvedCompetitorProfile,
): RigorousMatch[] {
  return matches.map((rawMatch) => {
    const match = rawMatch as RankedMatchWithOptionalDecision;

    if (match.decision && match.wyrestorm) {
      return rawMatch;
    }

    const product = findWyrestormProduct(match.sku);
    const wyrestorm = match.wyrestorm ??
      (product
        ? buildWyrestormCompareProfile(product)
        : {
            sku: match.sku,
            title: match.name || match.sku,
            sourceTier: "missing" as const,
          });
    const score = Number(match.heuristicScore ?? match.confidence ?? match.score ?? 72);
    const evidence = uniqueText([
      ...(match.compareEligibility?.reasons ?? []),
      ...(match.eligibility?.reasons ?? []),
      match.why || "",
    ], 8);

    return {
      sku: match.sku,
      name: match.name || product?.name || match.sku,
      family: match.family || product?.family || "WyreStorm",
      heuristicScore: Number.isFinite(score) ? score : 72,
      wyrestorm,
      decision: classifyCompetitorCompareDecision({
        competitor,
        wyrestorm,
        score: Number.isFinite(score) ? score : 72,
        evidence,
      }),
    };
  });
}
