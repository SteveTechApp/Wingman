import type { CompetitorMatchResponse } from "../../api/wingmanApi";
import { UC_COMPETITOR_PRODUCTS } from "../../data/ucCompetitorProducts";
import type { ScoredCandidate, WyreStormProduct } from "../../features/compare";
import { competitorSkuSeeds } from "../../lib/competitorProductIntelligence";
import { resolveCompetitorSpecProfile } from "../../lib/competitorSpecRegistry";
import { shouldAutoResearchCompetitor, type LiveCompetitorResearchAssessment } from "../../lib/liveCompetitorResearch";
import { uniqueText } from "../../lib/repScript";
import { findSavedCompetitorSpec } from "../../lib/savedCompetitorSpecs";
import { compareSkuKey, normalizeCompetitorSku } from "./compareProductTaxonomy";
import type { CompetitorProfile, CompetitorSummary } from "./compareTypes";
import { uniqueSkuOptions } from "./textTokens";

/**
 * What a compare run changes and what a live lookup asks.
 *
 * This was the run/lookup half of `ComparePageNew.advanced.tsx`. The page still
 * owns the `useState` fields and the effect that issues the request — it has to,
 * because the status is rendered and the sequence guard is a ref — but the
 * decisions are pure and live here: which SKUs the catalogue holds, whether a
 * typed SKU needs research, what a settled lookup means, which state a run
 * starts from, and how a reviewed live result becomes a candidate.
 *
 * Nothing here reads React, storage or the network, so a test can exercise a
 * whole run without mounting the page. The page keeps only the wiring: it calls
 * these, applies the values its state fields name, and renders.
 */

/** Competitor SKUs the app knows per brand, before a rep types one. */
export const COMPETITOR_SKU_CATALOG: Record<string, string[]> = competitorSkuSeeds().reduce<Record<string, string[]>>((catalog, seed) => {
  if (!catalog[seed.brand]) {
    catalog[seed.brand] = [];
  }

  if (!catalog[seed.brand].includes(seed.sku)) {
    catalog[seed.brand].push(seed.sku);
  }

  return catalog;
}, {});

for (const product of UC_COMPETITOR_PRODUCTS) {
  const models = COMPETITOR_SKU_CATALOG[product.manufacturer] ?? [];

  if (!models.includes(product.model)) {
    models.push(product.model);
  }

  COMPETITOR_SKU_CATALOG[product.manufacturer] = models;
}

COMPETITOR_SKU_CATALOG.CUSTOM = [];

const ALL_COMPETITOR_SKUS: string[] = Object.values(COMPETITOR_SKU_CATALOG)
  .flat()
  .map((sku) => String(sku));

/** The SKUs a brand offers, plus any this rep has typed before. */
export function skuOptionsForBrand(brand: string, customSkus: string[] = []): string[] {
  const seeded = (COMPETITOR_SKU_CATALOG as Record<string, readonly string[]>)[brand] ?? [];
  return uniqueSkuOptions([...seeded, ...customSkus]);
}

/** The suggestions a typed SKU earns: the catalogue, narrowed when it can be. */
export function compareSkuSuggestions(input: string, brand: string): string[] {
  const queryKey = compareSkuKey(input);
  const source = brand ? skuOptionsForBrand(brand) : ALL_COMPETITOR_SKUS;

  if (!queryKey) {
    return source;
  }

  return source.filter((skuOption) => {
    const key = compareSkuKey(skuOption);
    return key.includes(queryKey) || queryKey.includes(key);
  });
}

/** The brand a typed SKU belongs to, or CUSTOM when no brand catalogue has it. */
export function brandForCompetitorSku(sku: string): string {
  const key = compareSkuKey(sku);

  for (const [brand, skus] of Object.entries(COMPETITOR_SKU_CATALOG)) {
    const found = skus.some((candidateSku) => compareSkuKey(candidateSku) === key);

    if (found) {
      return brand;
    }
  }

  return "CUSTOM";
}

/**
 * Whether the app already holds evidence for this competitor SKU: it is in the
 * brand catalogue, or a rep has saved a reviewed live lookup for it.
 */
export function isCompetitorSkuHeldLocally(brand: string, sku: string): boolean {
  const skuKey = compareSkuKey(sku);
  if (!skuKey) return false;

  const catalogued = ((COMPETITOR_SKU_CATALOG as Record<string, readonly string[]>)[brand] ?? [])
    .some((candidate) => compareSkuKey(candidate) === skuKey);

  return catalogued || Boolean(findSavedCompetitorSpec(brand, sku));
}

/** What the local registry can say about a SKU, before any live research. */
export function lookupCompareIntelligence(sku: string): Record<string, unknown> | null {
  const normalizedSku = normalizeCompetitorSku(sku);
  const resolvedSpec = normalizedSku ? resolveCompetitorSpecProfile(normalizedSku) : null;

  if (!normalizedSku) {
    return null;
  }

  return {
    sku: normalizedSku,
    brand: resolvedSpec?.brand || brandForCompetitorSku(normalizedSku),
    title: resolvedSpec?.title,
    maxResolution: resolvedSpec?.maxResolution,
    inputCount: resolvedSpec?.inputCount,
    outputCount: resolvedSpec?.outputCount,
    transport: resolvedSpec?.transport,
    role: resolvedSpec?.role,
  };
}

/**
 * Whether a competitor needs live research: the local read is too thin to trust
 * (nothing classified it, or the registry knows only the bare SKU), or the app
 * does not hold the SKU at all.
 */
export function needsLiveLookup(input: {
  profile: CompetitorProfile;
  brand: string;
  sku: string;
}): boolean {
  const { profile } = input;
  // lookupCompareIntelligence() always returns a wrapper object once a SKU is
  // typed (even when nothing resolved), so "knownProfile === null" can never be
  // the signal. The competitor's own resolved spec is: no productClass, or
  // nothing better than a bare SKU-only guess.
  const thinLocalRead = Boolean(profile.sku.trim())
    && (profile.productClass === "Unknown" || profile.resolvedSpec?.specTier === "sku-only");

  return thinLocalRead || !isCompetitorSkuHeldLocally(input.brand, input.sku);
}

/** The request the page issues for a live lookup, or a decision not to. */
export type LiveLookupPlan =
  | { run: false }
  | { run: true; request: { manufacturer: string; model: string } };

/**
 * Whether this turn of the page should ask the server, and what it asks for.
 *
 * The results stage is the only place a lookup belongs: research requested while
 * the rep is still typing would answer a question they have not asked yet, and
 * the stage is part of the decision rather than something the effect checks
 * after the fact.
 */
export function liveLookupPlan(input: {
  onResults: boolean;
  hasCompared: boolean;
  requestLiveLookup: boolean;
  manufacturer: string;
  sku: string;
}): LiveLookupPlan {
  const run = input.onResults && shouldAutoResearchCompetitor({
    hasCompared: input.hasCompared,
    requestLiveLookup: input.requestLiveLookup,
    manufacturer: input.manufacturer,
    sku: input.sku,
  });

  return run
    ? { run: true, request: { manufacturer: input.manufacturer, model: input.sku.trim() } }
    : { run: false };
}

/** What a lookup that has settled leaves on screen. */
export type LiveLookupOutcome = {
  status: "done" | "error";
  result: CompetitorMatchResponse | null;
  error: string;
};

/** A response that arrived: usable, or an error that keeps the payload. */
export function liveLookupSettled(response: CompetitorMatchResponse): LiveLookupOutcome {
  if (!response.ok) {
    return {
      status: "error",
      result: response,
      error: "Live research did not return a usable competitor profile.",
    };
  }

  return { status: "done", result: response, error: "" };
}

/** A request that threw: no payload to keep, and the message the rep can read. */
export function liveLookupFailed(error: unknown): LiveLookupOutcome {
  return {
    status: "error",
    result: null,
    error: error instanceof Error ? error.message : "Live competitor research failed.",
  };
}

/**
 * The state a run starts in: results are on screen, the first direction is
 * selected, and the overview tab is the one being read.
 */
export function compareRunStarted() {
  return {
    hasCompared: true,
    workflowStep: "options" as const,
    compareStage: "results" as const,
    resultTab: "overview" as const,
    candidateIndex: 0,
  };
}

/** The state a reset leaves behind: back to capturing, with nothing selected. */
export function compareReset() {
  return {
    hasCompared: false,
    workflowStep: "capture" as const,
    compareStage: "sku" as const,
    resultTab: "overview" as const,
    candidateIndex: 0,
  };
}

/**
 * The competitor SKU list a run leaves behind. A typed SKU the catalogue does
 * not hold becomes one of this run's custom options; a known or already-added
 * one changes nothing, so the setter keeps the same array.
 */
export function competitorSkusAfterRun(competitorInput: string, customSkus: string[]): string[] {
  const normalizedSku = normalizeCompetitorSku(competitorInput);

  if (!normalizedSku || ALL_COMPETITOR_SKUS.includes(normalizedSku) || customSkus.includes(normalizedSku)) {
    return customSkus;
  }

  return uniqueSkuOptions([...customSkus, normalizedSku]);
}

/**
 * A reviewed live lookup as a candidate, or null when it named no direction this
 * app stocks. The product resolver is the caller's because the real catalogue is
 * upgraded after load and lives with the page.
 */
export function liveResearchToScoredCandidate(
  assessment: LiveCompetitorResearchAssessment | null,
  findProduct: (sku: string) => WyreStormProduct | undefined,
): ScoredCandidate | null {
  if (!assessment || assessment.outcome !== "candidate" || !assessment.candidateSku) {
    return null;
  }

  const product = findProduct(assessment.candidateSku);
  if (!product) {
    return null;
  }

  const approvedDirectMatch =
    assessment.sourceMode === "stored-intelligence" &&
    !assessment.reviewRequired &&
    assessment.readinessStatus === "ready" &&
    assessment.matchType === "DIRECT MATCH" &&
    assessment.blockers.length === 0;

  return {
    product,
    score: assessment.confidenceScore,
    verdict: approvedDirectMatch ? "GOOD MATCH" : "VERIFY",
    matched: uniqueText(assessment.matched, 8),
    checks: uniqueText(
      [
        ...assessment.warnings,
        ...assessment.nextActions,
        ...(assessment.sourceMode === "live"
          ? ["Live web research must be reviewed before this competitor profile is treated as governed local data."]
          : []),
      ],
      8,
    ),
    gaps: uniqueText(assessment.warnings, 6),
    partialMatches: uniqueText(assessment.matched, 6),
    mismatches: [],
    unknowns: approvedDirectMatch
      ? []
      : [
          assessment.sourceMode === "stored-intelligence"
            ? "Approved competitor data is available, but this WyreStorm direction still requires technical review before it can be treated as direct."
            : "The competitor facts were researched live and have not yet been promoted to approved local intelligence.",
        ],
    blockers: uniqueText(assessment.blockers, 6),
    dependencies: [],
    outcomeLabel: approvedDirectMatch
      ? `Approved competitor intelligence. ${assessment.summary}`
      : assessment.sourceMode === "stored-intelligence"
        ? `Approved competitor intelligence - match review required. ${assessment.summary}`
        : `Live researched direction - review required. ${assessment.summary}`,
    solutionType: approvedDirectMatch ? "direct-equivalent" : "insufficient-evidence",
    governedTier: approvedDirectMatch ? "official-structured" : "text-inferred",
    governedLabel: approvedDirectMatch
      ? "Approved competitor intelligence"
      : assessment.sourceMode === "stored-intelligence"
        ? "Approved data - match review required"
        : "Live researched - review required",
  };
}

/**
 * The competitor fact sheet once live research has landed: approved or researched
 * facts replace the local guesses they cover, while the local sheet keeps the
 * rest. A lookup that resolved nothing changes nothing.
 */
export function mergeLiveResearchCompetitorSummary(
  base: CompetitorSummary,
  assessment: LiveCompetitorResearchAssessment | null,
): CompetitorSummary {
  if (!assessment) return base;

  const live = assessment.competitor;
  const technology = live.technologyProfile;
  const liveFacts = [
    technology?.vendorTechnology
      ? { label: "Vendor technology", value: technology.vendorTechnology }
      : null,
    technology?.canonicalTransport
      ? { label: "Canonical transport", value: technology.canonicalTransport }
      : null,
    technology?.networkClass
      ? { label: "Network class", value: technology.networkClass }
      : null,
    technology?.codecStandard || technology?.codecName
      ? {
          label: "Codec / standard",
          value: String(technology.codecStandard || technology.codecName),
        }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  const factMap = new Map<string, { label: string; value: string }>();
  for (const fact of [...liveFacts, ...base.facts]) {
    if (!factMap.has(fact.label)) factMap.set(fact.label, fact);
  }

  return {
    ...base,
    detail: live.summary || base.detail,
    recognisedClass:
      live.category ||
      live.comparisonDomain ||
      base.recognisedClass,
    role: live.role || base.role,
    transport:
      technology?.canonicalTransport ||
      live.transport ||
      base.transport,
    ecosystem:
      technology?.interoperability ||
      base.ecosystem,
    facts: Array.from(factMap.values()).slice(0, 8),
    knownFeatures: uniqueText(
      [
        ...base.knownFeatures,
        technology?.vendorTechnology
          ? `Vendor technology: ${technology.vendorTechnology}`
          : "",
        technology?.networkClass
          ? `Network class: ${technology.networkClass}`
          : "",
        technology?.codecStandard || technology?.codecName
          ? `Codec / standard: ${technology.codecStandard || technology.codecName}`
          : "",
      ],
      10,
    ),
    warning:
      assessment.sourceMode === "live"
        ? "Live-researched competitor data - review the source before promoting it to governed local intelligence."
        : "",
    sourceUrl: live.sourceUrl || assessment.sourceUrl || base.sourceUrl,
  };
}
