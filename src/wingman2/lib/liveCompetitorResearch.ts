import type {
  CompetitorMatchResponse,
  CompetitorMatchCandidate,
} from "../api/wingmanApi";
import type { ProductTechnologyProfile } from "../types/technologyProfile";

export type LiveCompetitorResearchStatus = "idle" | "loading" | "done" | "error";
export type CompetitorResearchSourceMode = "live" | "stored-intelligence" | "unknown";

export type LiveCompetitorResearchAssessment = {
  outcome: "candidate" | "no-match";
  sourceMode: CompetitorResearchSourceMode;
  readinessStatus: string;
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

function sourceModeFor(response: CompetitorMatchResponse): CompetitorResearchSourceMode {
  if (response.competitor_lookup_mode === "stored-intelligence") {
    return "stored-intelligence";
  }
  if (response.competitor_lookup_mode === "live") {
    return "live";
  }
  return "unknown";
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
 * The same resolveMatch endpoint can return fresh web research or an approved
 * runtime competitor profile. Fresh web research remains review-required.
 * Approved stored intelligence can participate normally, but a WyreStorm
 * equivalence remains a separate governed decision.
 */
export function assessLiveCompetitorResearch(
  response: CompetitorMatchResponse,
): LiveCompetitorResearchAssessment {
  const competitor = response.competitor_product ?? {};
  const best = response.best_match ?? null;
  const readiness = best?.readiness;
  const readinessStatus = tidy(readiness?.status).toLowerCase();
  const matchType = tidy(best?.match_type);
  const sourceMode = sourceModeFor(response);
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
  const reviewRequired =
    sourceMode !== "stored-intelligence" ||
    readinessStatus !== "ready";

  if (!response.ok || !best?.sku || blocked) {
    return {
      outcome: "no-match",
      sourceMode,
      readinessStatus,
      confidenceScore: boundedScore(best),
      matchType,
      summary:
        tidy(readiness?.summary) ||
        tidy(best?.summary) ||
        "Research did not establish a safe WyreStorm product match.",
      matched,
      warnings,
      blockers:
        blockers.length > 0
          ? blockers
          : ["No safe WyreStorm match was established from the available evidence."],
      nextActions,
      reviewRequired: true,
      sourceUrl,
      competitor: competitorSummary,
    };
  }

  return {
    outcome: "candidate",
    sourceMode,
    readinessStatus,
    candidateSku: tidy(best.sku),
    confidenceScore: boundedScore(best),
    matchType,
    summary:
      tidy(readiness?.summary) ||
      tidy(best.summary) ||
      (sourceMode === "stored-intelligence"
        ? "Approved competitor intelligence found a plausible WyreStorm direction."
        : "Live research found a plausible WyreStorm direction."),
    matched:
      matched.length > 0
        ? matched
        : ["The resolver found a role/architecture-compatible WyreStorm direction."],
    warnings,
    blockers,
    nextActions,
    reviewRequired,
    sourceUrl,
    competitor: competitorSummary,
  };
}