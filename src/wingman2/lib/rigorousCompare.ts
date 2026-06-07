/**
 * Rigorous Compare orchestration
 *
 * Converges the live Compare page onto the deterministic classifier
 * (classifyCompetitorCompareDecision). The legacy heuristic engine is used only
 * to GENERATE and gate candidates; the rigorous classifier then compares the
 * resolved competitor spec profile against each WyreStorm candidate's structured
 * profile and decides GOOD MATCH / PARTIAL MATCH / NO MATCH / VERIFY.
 */

import {
  classifyCompetitorCompareDecision,
  type CompareDecisionOutcome,
  type CompareDecisionProfile,
  type CompareDecisionResult,
} from "./competitorCompareDecision";
import {
  analyzeCompetitor,
  compareCompetitor,
  type CompetitorProfile,
  type WyrestormProduct,
} from "./competitorMatchEngine";
import {
  resolveCompetitorSpecProfile,
  type ResolvedCompetitorProfile,
} from "./competitorSpecRegistry";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";

export type RigorousMatch = {
  sku: string;
  name: string;
  family: string;
  heuristicScore: number;
  decision: CompareDecisionResult;
  wyrestorm: CompareDecisionProfile;
};

export type RigorousCompareResult = {
  competitor: ResolvedCompetitorProfile;
  analysis: CompetitorProfile;
  isRelevant: boolean;
  relevanceReason: string;
  topOutcome: CompareDecisionOutcome | "NONE";
  matches: RigorousMatch[];
  rejected: RigorousMatch[];
  recommendation: string;
  nextSteps: string[];
};

const OUTCOME_RANK: Record<CompareDecisionOutcome, number> = {
  "GOOD MATCH": 3,
  "PARTIAL MATCH": 2,
  VERIFY: 1,
  "NO MATCH": 0,
};

/** Map the heuristic candidate score (~0-80) to a starting confidence (50-88)
 * for the classifier, which then applies blocker/gap/evidence penalties. */
function scoreToBaseConfidence(score: number): number {
  const clamped = Math.max(0, Math.min(80, Number(score) || 0));
  return Math.round(55 + clamped * 0.4);
}

function dedupe(values: string[], limit = 6): string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit);
}

export function rigorousCompare(
  input: string,
  products: WyrestormProduct[],
  providedBrand?: string,
  maxCandidates = 8,
): RigorousCompareResult {
  const analysis = analyzeCompetitor(input, providedBrand);
  const base = compareCompetitor(input, products, providedBrand, maxCandidates);
  const competitor = resolveCompetitorSpecProfile(input, providedBrand || analysis.brand);

  const bySku = new Map<string, WyrestormProduct>(
    products.map((product) => [String(product.sku), product]),
  );

  const evaluated: RigorousMatch[] = base.matches.map((match) => {
    const product = bySku.get(match.sku);
    const wyrestorm: CompareDecisionProfile = product
      ? buildWyrestormCompareProfile(product)
      : { sku: match.sku, title: match.name };

    const decision = classifyCompetitorCompareDecision({
      competitor,
      wyrestorm,
      score: scoreToBaseConfidence(match.score),
      warnings: [],
    });

    return {
      sku: match.sku,
      name: match.name,
      family: match.family,
      heuristicScore: match.score,
      decision,
      wyrestorm,
    };
  });

  evaluated.sort(
    (a, b) =>
      OUTCOME_RANK[b.decision.outcome] - OUTCOME_RANK[a.decision.outcome] ||
      b.decision.confidence - a.decision.confidence ||
      b.heuristicScore - a.heuristicScore,
  );

  const matches = evaluated.filter((item) => item.decision.outcome !== "NO MATCH");
  const rejected = evaluated.filter((item) => item.decision.outcome === "NO MATCH");
  const top = matches[0];
  const topOutcome: CompareDecisionOutcome | "NONE" = top ? top.decision.outcome : "NONE";

  const competitorLabel = competitor.sku || analysis.sku || "the competitor product";
  const specPrompt = `Add ${competitorLabel}'s datasheet detail (role, transport, I/O count, resolution) to lift this above a verify-only result`;

  let recommendation: string;
  const nextSteps: string[] = [];

  if (!base.isRelevant) {
    recommendation = base.relevanceReason;
    nextSteps.push(
      "Consider what the competitor product actually does in the system",
      "Look for a WyreStorm product that serves the same application, not the same SKU",
    );
  } else if (!top) {
    recommendation = `No WyreStorm product compares cleanly to ${competitorLabel}. Treat as no direct equivalent or verify the requirement.`;
    nextSteps.push(
      competitor.specTier === "verified-profile" ? "Review the rejected candidates and their blockers" : specPrompt,
      "Contact WyreStorm pre-sales for a system-level alternative",
    );
  } else if (topOutcome === "GOOD MATCH") {
    recommendation = `${top.sku} is a credible like-for-like alternative to ${competitorLabel}. ${top.decision.nextAction}`;
    nextSteps.push(...dedupe([...top.decision.verify, "Confirm pricing, lifecycle and accessory dependencies"]));
  } else if (topOutcome === "PARTIAL MATCH") {
    recommendation = `${top.sku} is the closest WyreStorm option to ${competitorLabel}, but it is not a drop-in — make the differences clear before quoting.`;
    nextSteps.push(...dedupe([...top.decision.gaps, ...top.decision.verify]));
  } else {
    recommendation = `More evidence is needed before recommending an equivalent to ${competitorLabel}. ${top.decision.summary}`;
    nextSteps.push(...dedupe([
      competitor.specTier === "verified-profile" ? "Confirm the verify items on the top candidate" : specPrompt,
      ...top.decision.verify,
    ]));
  }

  if (competitor.specTier !== "verified-profile" && base.isRelevant && nextSteps.length < 4) {
    nextSteps.push(specPrompt);
  }

  return {
    competitor,
    analysis,
    isRelevant: base.isRelevant,
    relevanceReason: base.relevanceReason,
    topOutcome,
    matches,
    rejected,
    recommendation,
    nextSteps: dedupe(nextSteps, 6),
  };
}
