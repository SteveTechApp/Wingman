import type {
  CompetitorMatchResponse,
  CompetitorMatchCandidate,
} from "../api/wingmanApi";
import type { ProductTechnologyProfile } from "../types/technologyProfile";

export type LiveCompetitorResearchStatus = "idle" | "loading" | "done" | "error";

export type LiveCompetitorResearchAssessment = {
  outcome: "candidate" | "no-match";
  candidateSku?: string;
  confidenceScore: number;
  matchType: string;
  summary: string;
  matched: string[];
  warnings: string[];
  blockers: string[];
  nextActions: string[];
  reviewRequired: boolean;
  sourceUrl: string;
  competitor: {
    manufacturer: string;
    model: string;
    title: string;
    category: string;
    comparisonDomain: string;
    comparisonUseCase: string;
    role: string;
    transport: string;
    subtype: string;
    summary: string;
    sourceUrl: string;
    technologyProfile?: ProductTechnologyProfile;
  };
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function unique(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.map((value) => tidy(value)).filter(Boolean))];
}

function boundedScore(candidate: CompetitorMatchCandidate | null | undefined): number {
  const raw = Number(candidate?.confidence_score ?? candidate?.match_score ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function shouldAutoResearchCompetitor(input: {
  hasCompared: boolean;
  requestLiveLookup: boolean;
  manufacturer: string;
  sku: string;
}): boolean {
  return Boolean(
    input.hasCompared &&
      input.requestLiveLookup &&
      tidy(input.manufacturer) &&
      tidy(input.sku),
  );
}

/**
 * Convert the server-side live resolveMatch response into a deliberately
 * conservative client assessment. Live web research may identify a strong
 * WyreStorm direction, but it is never silently promoted to GOOD MATCH.
 * A non-blocked live candidate therefore enters the UI as VERIFY until a
 * reviewed competitor profile is saved/promoted into governed local data.
 */
export function assessLiveCompetitorResearch(
  response: CompetitorMatchResponse,
): LiveCompetitorResearchAssessment {
  const competitor = response.competitor_product ?? {};
  const best = response.best_match ?? null;
  const readiness = best?.readiness;
  const readinessStatus = tidy(readiness?.status).toLowerCase();
  const matchType = tidy(best?.match_type);
  const blocked =
    readinessStatus === "blocked" ||
    /\b(?:incompatible|no match|blocked)\b/i.test(matchType);

  const sourceUrl = tidy(
    response.resolved_competitor_url ||
      competitor.resolvedUrl ||
      best?.resolvedUrl,
  );

  const competitorSummary = {
    manufacturer: tidy(competitor.manufacturer),
    model: tidy(competitor.model),
    title: tidy(competitor.title),
    category: tidy(competitor.category),
    comparisonDomain: tidy(competitor.comparisonDomain),
    comparisonUseCase: tidy(competitor.comparisonUseCase),
    role: tidy(competitor.role),
    transport: tidy(competitor.transport),
    subtype: tidy(competitor.subtype),
    summary: tidy(competitor.summary),
    sourceUrl,
    technologyProfile: competitor.technologyProfile,
  };

  const matched = unique(readiness?.strengths ?? []);
  const warnings = unique(readiness?.warnings ?? []);
  const blockers = unique(readiness?.blockers ?? []);
  const nextActions = unique(readiness?.nextActions ?? []);

  if (!response.ok || !best?.sku || blocked) {
    return {
      outcome: "no-match",
      confidenceScore: boundedScore(best),
      matchType,
      summary:
        tidy(readiness?.summary) ||
        tidy(best?.summary) ||
        "Live research did not establish a safe WyreStorm product match.",
      matched,
      warnings,
      blockers:
        blockers.length > 0
          ? blockers
          : ["No safe WyreStorm match was established from the researched evidence."],
      nextActions,
      reviewRequired: true,
      sourceUrl,
      competitor: competitorSummary,
    };
  }

  return {
    outcome: "candidate",
    candidateSku: tidy(best.sku),
    confidenceScore: boundedScore(best),
    matchType,
    summary:
      tidy(readiness?.summary) ||
      tidy(best.summary) ||
      "Live research found a plausible WyreStorm direction.",
    matched:
      matched.length > 0
        ? matched
        : ["The live resolver found a role/architecture-compatible WyreStorm direction."],
    warnings,
    blockers,
    nextActions,
    reviewRequired: true,
    sourceUrl,
    competitor: competitorSummary,
  };
}