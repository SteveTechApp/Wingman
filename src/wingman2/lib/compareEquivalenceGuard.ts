import {
  classifySkuPackage,
  gateDirectEquivalence,
  type ProductClassification,
} from "../logic/productClassifier";
import type { CompareDecisionOutcome } from "./competitorCompareDecision";
import type { RigorousCompareResult, RigorousMatch } from "./rigorousCompare";

const LOW_CONFIDENCE_DIRECT_MATCH_FLOOR = 45;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textFromValues(values: readonly unknown[]): string {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function classifyCompetitor(result: RigorousCompareResult): ProductClassification {
  const competitor = asRecord(result.competitor);

  return classifySkuPackage({
    sku: String(competitor.sku ?? ""),
    title: String(competitor.title ?? ""),
    description: textFromValues([
      competitor.brand,
      competitor.domain,
      competitor.role,
      competitor.transport,
      competitor.maxResolution,
      competitor.chroma,
    ]),
    family: String(competitor.domain ?? ""),
    category: String(competitor.role ?? ""),
  });
}

function classifyCandidate(match: RigorousMatch): ProductClassification {
  const rawMatch = asRecord(match);
  const wyrestorm = asRecord(rawMatch.wyrestorm);
  const sku = String(rawMatch.sku ?? wyrestorm.sku ?? "");

  return classifySkuPackage({
    sku,
    title: String(rawMatch.name ?? wyrestorm.name ?? wyrestorm.title ?? ""),
    description: textFromValues([
      rawMatch.family,
      wyrestorm.family,
      wyrestorm.category,
      wyrestorm.role,
      wyrestorm.description,
      wyrestorm.summary,
      wyrestorm.transport,
      wyrestorm.technologyFamily,
    ]),
    family: String(rawMatch.family ?? wyrestorm.family ?? ""),
    category: String(wyrestorm.category ?? wyrestorm.role ?? ""),
  });
}

function classificationIsUseful(classification: ProductClassification): boolean {
  if (classification.productClass === "unknown") {
    return false;
  }

  if (classification.endpointRole === "unknown") {
    return false;
  }

  return true;
}

function decisionOutcome(match: RigorousMatch): CompareDecisionOutcome {
  return match.decision.outcome;
}

function decisionConfidence(match: RigorousMatch): number {
  const confidence = Number(match.decision.confidence);
  return Number.isFinite(confidence) ? confidence : 0;
}

function appendUnique(existing: readonly string[] | undefined, additions: readonly string[]): string[] {
  return Array.from(new Set([...(existing ?? []), ...additions].filter(Boolean)));
}

function makeGuardedNoMatch(
  match: RigorousMatch,
  blockers: readonly string[],
  warnings: readonly string[],
  reason: "hard-blocker" | "low-confidence",
): RigorousMatch {
  const confidenceCap = reason === "low-confidence" ? 39 : 24;
  const confidence = Math.min(decisionConfidence(match), confidenceCap);
  const lowConfidenceMessage = "Candidate is below the direct-equivalent confidence floor. Keep as related discussion only unless a senior review confirms equivalence.";

  const guardBlockers = reason === "low-confidence"
    ? [lowConfidenceMessage]
    : blockers;

  const guardWarnings = reason === "low-confidence"
    ? warnings
    : appendUnique(warnings, ["Hard product-class or endpoint-role blocker applied before scoring."]);

  return {
    ...match,
    decision: {
      ...match.decision,
      outcome: "NO MATCH" as CompareDecisionOutcome,
      confidence,
      summary: `${match.decision.summary} Wingman classification guard: this product must not be positioned as a direct equivalent from the current data.`,
      blockers: appendUnique(match.decision.blockers, guardBlockers),
      gaps: appendUnique(match.decision.gaps, guardWarnings),
      verify: appendUnique(match.decision.verify, [
        "Confirm product class, endpoint role, package contents and topology before positioning as an alternative.",
      ]),
      nextAction: "Do not position this as a direct replacement. Use only as a related WyreStorm discussion path until the blocking differences are resolved.",
    },
  };
}

function relatedCandidateSummary(matches: readonly RigorousMatch[]): string {
  const names = matches
    .slice(0, 5)
    .map((match) => match.sku)
    .filter(Boolean);

  if (!names.length) {
    return "No related WyreStorm candidates should be positioned from the current data.";
  }

  return `Related WyreStorm products found, but not safe direct equivalents: ${names.join(", ")}.`;
}

export function applyCompareEquivalenceGuards(result: RigorousCompareResult): RigorousCompareResult {
  const requested = classifyCompetitor(result);

  if (!classificationIsUseful(requested)) {
    return {
      ...result,
      nextSteps: appendUnique(result.nextSteps, [
        "Product role classification is incomplete. Do not treat the result as a direct equivalent until product class, endpoint role and package type are confirmed.",
      ]),
    };
  }

  const allowedMatches: RigorousMatch[] = [];
  const newlyRejected: RigorousMatch[] = [];

  for (const match of result.matches) {
    const candidate = classifyCandidate(match);

    if (!classificationIsUseful(candidate)) {
      newlyRejected.push(makeGuardedNoMatch(
        match,
        ["Candidate product role is incomplete in the product data."],
        ["Enrich the WyreStorm product data before using this as a direct equivalent."],
        "hard-blocker",
      ));
      continue;
    }

    const gate = gateDirectEquivalence(requested, candidate);

    if (!gate.directEquivalentAllowed) {
      newlyRejected.push(makeGuardedNoMatch(match, gate.blockers, gate.warnings, "hard-blocker"));
      continue;
    }

    if (decisionOutcome(match) === "NO MATCH") {
      newlyRejected.push(match);
      continue;
    }

    // Adapt the confidence floor based on structural signal strength.
    // A candidate with same class + role + transport is structurally sound
    // even when data completeness drags the confidence number down. Let it
    // through at 30 instead of 45; a candidate with weak signals stays at 45.
    const decision = match.decision;
    const matchedList = Array.isArray(decision?.matches) ? decision.matches : [];
    const hasStrongSignals = matchedList.some((m: string) =>
      /same (technology|transport|role)|compatible role/i.test(m)
    );
    const effectiveFloor = hasStrongSignals ? 30 : LOW_CONFIDENCE_DIRECT_MATCH_FLOOR;

    if (decisionConfidence(match) < effectiveFloor) {
      newlyRejected.push(makeGuardedNoMatch(match, [], [], "low-confidence"));
      continue;
    }

    allowedMatches.push(match);
  }

  const rejected = [...newlyRejected, ...result.rejected];
  const topOutcome = allowedMatches.length
    ? allowedMatches[0].decision.outcome
    : "NONE";

  const recommendation = allowedMatches.length
    ? "Direct-equivalence candidates have passed product-class, endpoint-role and package-type gates. Review the matrix before using externally."
    : `No safe direct WyreStorm equivalent should be positioned from the current data. ${relatedCandidateSummary(rejected)}`;

  const nextSteps = appendUnique(result.nextSteps, [
    "Classification gate applied: direct alternatives must match product class, endpoint role, package type and topology before scoring.",
    "Same-family products with hard blockers are related options only, not direct replacements.",
  ]);

  return {
    ...result,
    matches: allowedMatches,
    rejected,
    topOutcome: topOutcome as RigorousCompareResult["topOutcome"],
    recommendation,
    nextSteps,
  };
}