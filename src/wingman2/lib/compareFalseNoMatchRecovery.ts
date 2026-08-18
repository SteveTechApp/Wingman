import {
  classifyCompetitorCompareDecision,
  type CompareDecisionProfile,
  type CompareDecisionResult,
} from "./competitorCompareDecision";
import {
  classifyCompareIntent,
  evaluateProductEligibility,
  type CompareEligibilityResult,
} from "./compareEligibilityEngine";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";
import { isBannedNetworkHdSku } from "./networkHdAvoipEquivalence";
import { getWyreStormCompareLeadBlockReason } from "./wyrestormSkuBusinessStatus";

type AnyRecord = Record<string, any>;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function skuKey(value: unknown): string {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function unique(values: string[], limit = 12): string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit);
}

function outcomeRank(value: unknown): number {
  const outcome = clean(value).toUpperCase();
  if (outcome === "GOOD MATCH") return 4;
  if (outcome === "PARTIAL MATCH") return 3;
  if (outcome === "VERIFY") return 2;
  return 1;
}

function eligibilityRank(value: CompareEligibilityResult["eligibility"]): number {
  if (value === "direct") return 0;
  if (value === "architecture-alternative") return 1;
  if (value === "related-only") return 2;
  return 3;
}

function architectureDecision(
  base: CompareDecisionResult,
  eligibility: CompareEligibilityResult,
): CompareDecisionResult {
  const movedBlockers = unique(base.blockers);

  return {
    ...base,
    outcome: "VERIFY",
    confidence: Math.max(55, Math.min(74, base.confidence || 62)),
    blockers: [],
    gaps: unique([
      ...base.gaps,
      ...movedBlockers,
      "This candidate satisfies the application through a different WyreStorm architecture rather than as a drop-in equivalent.",
    ]),
    matches: unique([
      ...base.matches,
      ...eligibility.reasons,
    ]),
    verify: unique([
      ...base.verify,
      "Confirm the alternative architecture, dependencies, endpoint count, control and infrastructure before quoting.",
    ]),
    summary:
      "Credible WyreStorm architecture alternative found; do not position it as a one-box direct replacement.",
    nextAction:
      "Present this as an architecture alternative and confirm the system dependencies before proposal use.",
    solutionType: "architecture-alternative",
  };
}

function candidateRecord(
  product: AnyRecord,
  profile: CompareDecisionProfile,
  decision: CompareDecisionResult,
  eligibility: CompareEligibilityResult,
): AnyRecord {
  const sku = clean(product.sku ?? product.model ?? product.partNumber ?? profile.sku);
  return {
    sku,
    name: clean(product.name ?? product.title ?? profile.title ?? sku),
    family: clean(product.family ?? product.productFamily ?? product.category ?? "WyreStorm"),
    heuristicScore: decision.confidence,
    wyrestorm: profile,
    decision,
    compareEligibility: eligibility,
    eligibility,
    recoveredByBroadRecall: true,
  };
}

/**
 * Existing Compare logic is intentionally conservative and the direct-equivalence
 * guard can remove a candidate before the later eligibility layer gets a chance
 * to recognise it as a legitimate architecture alternative.
 *
 * Recovery runs ONLY when no surviving match exists. It scans the active,
 * lead-eligible WyreStorm catalogue, keeps the existing eligibility gates, and:
 * - accepts direct candidates only when the structured decision is not NO MATCH;
 * - allows an explicit eligibility "architecture-alternative" to return VERIFY;
 * - never resurrects blocked or merely related-only products;
 * - never changes an existing GOOD/PARTIAL/VERIFY result.
 */
export function recoverFalseNoMatchCandidates<T extends AnyRecord>(
  result: T,
  products: AnyRecord[],
  inputText: string,
  limit = 12,
): T {
  const currentMatches = Array.isArray(result.matches) ? result.matches : [];
  const currentViable = currentMatches.filter(
    (match: AnyRecord) =>
      clean(match?.decision?.outcome).toUpperCase() !== "NO MATCH",
  );

  if (currentViable.length > 0) {
    return result;
  }

  const competitor = result.competitor as CompareDecisionProfile | undefined;
  if (!competitor) {
    return result;
  }

  const intent = classifyCompareIntent(competitor, inputText);
  const competitorText = [
    inputText,
    competitor.sku,
    competitor.title,
    competitor.domain,
    competitor.role,
    competitor.transport,
  ]
    .filter(Boolean)
    .join(" ");

  const recovered: AnyRecord[] = [];
  const seen = new Set<string>();

  for (const product of products) {
    const rawSku = clean(product?.sku ?? product?.model ?? product?.partNumber);
    const key = skuKey(rawSku);

    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (isBannedNetworkHdSku(rawSku)) continue;
    if (getWyreStormCompareLeadBlockReason(rawSku)) continue;

    const eligibility = evaluateProductEligibility({
      intent,
      competitorText,
      match: product,
      product,
    });

    if (
      eligibility.eligibility === "blocked" ||
      eligibility.eligibility === "related-only"
    ) {
      continue;
    }

    const wyrestorm = buildWyrestormCompareProfile(product as any);
    const baseDecision = classifyCompetitorCompareDecision({
      competitor,
      wyrestorm,
      score: eligibility.eligibility === "direct" ? 70 : 62,
      evidence: eligibility.reasons,
    });

    let decision = baseDecision;

    if (
      baseDecision.outcome === "NO MATCH" &&
      eligibility.eligibility === "architecture-alternative"
    ) {
      decision = architectureDecision(baseDecision, eligibility);
    }

    if (decision.outcome === "NO MATCH") {
      continue;
    }

    recovered.push(
      candidateRecord(product, wyrestorm, decision, eligibility),
    );
  }

  recovered.sort((left, right) => {
    const leftEligibility = left.compareEligibility as CompareEligibilityResult;
    const rightEligibility = right.compareEligibility as CompareEligibilityResult;

    return (
      eligibilityRank(leftEligibility.eligibility) -
        eligibilityRank(rightEligibility.eligibility) ||
      outcomeRank(right.decision?.outcome) -
        outcomeRank(left.decision?.outcome) ||
      Number(right.decision?.confidence ?? 0) -
        Number(left.decision?.confidence ?? 0) ||
      Number(leftEligibility.fitPenalty ?? 0) -
        Number(rightEligibility.fitPenalty ?? 0)
    );
  });

  const matches = recovered.slice(0, Math.max(1, limit));
  if (matches.length === 0) {
    return result;
  }

  const lead = matches[0];
  const architecture =
    lead.compareEligibility?.eligibility === "architecture-alternative";

  return {
    ...result,
    matches,
    topOutcome: lead.decision?.outcome ?? "VERIFY",
    recommendation: architecture
      ? `${lead.sku} is a credible WyreStorm architecture direction, but not a one-box direct equivalent. Confirm dependencies before quoting.`
      : `${lead.sku} is a credible WyreStorm direction recovered by broad functional matching. Verify unresolved specifications before quoting.`,
    nextSteps: unique([
      ...(lead.decision?.verify ?? []),
      ...(lead.decision?.gaps ?? []),
      ...(Array.isArray(result.nextSteps) ? result.nextSteps : []),
    ]),
    compareRecovery: {
      applied: true,
      candidateCount: matches.length,
      leadSku: lead.sku,
      intent,
      architectureAlternative: architecture,
    },
  };
}