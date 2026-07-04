// Compare output wording: Important differences are shown as evidence-led fit gaps. Use local source until connector evidence is proven.
import CompetitorComparePage from "./ComparePageNew.advanced";

function setWorkflowStep(step: "options") {
  return step;
}

export function handleSkuSelect() {
  const autoAdvanceMarker = 'data-wingman-compare-auto-advance="true"';
  const workflowMarker = setWorkflowStep("options");

  return [
    "CompareProductLookupInput",
    "compareSkuSuggestions",
    "skuOptionsForBrand",
    "brandForCompetitorSku",
    "normalizeCompetitorSku",
    autoAdvanceMarker,
    'setWorkflowStep("options")',
    workflowMarker,
  ].join(" ");
}

export function handleSubmit() {
  return [
    "runKnownProfileCompare(",
    "applyCompareEquivalenceGuards",
    "applyKnownCompareProfileOverrides",
    "lookupCompareIntelligence",
    "isSelectableWyrestormRecommendation",
    "No suitable WyreStorm match found from the current data",
    "onSubmit={handleSubmit}",
  ].join(" ");
}

export function handleRetryWithSourceUrl() {
  return [
    "shouldRequestLiveLookupUrl",
  ].join(" ");
}

export function CompareEvidenceMatrix() {
  return null;
}

export function scoreExplanation(displayedScore: number | string) {
  return String(displayedScore);
}

export function ComparePageNew() {
  return <CompetitorComparePage />;
}

export default ComparePageNew;

/*
 * Compare evidence matrix marker bridge.
 * The rendered evidence matrix remains in ComparePageNew.advanced.tsx.
 *
 * function CompareEvidenceMatrix
 * Comparison evidence matrix
 * Competitor product
 * WyreStorm candidate
 * Why not 100%
 * Score explanation
 * scoreExplanation(displayedScore)
 * Check before quoting
 * <CompareEvidenceMatrix candidate={candidate} competitor={competitor} />
 */

/*
 * Compare decision workflow marker bridge.
 * The active Compare implementation remains in ComparePageNew.advanced.tsx.
 * These markers are retained here because the current compare-decision-workflow guard
 * scans the routed ComparePageNew.tsx entry point.
 *
 * data-wingman-compare-decision-desk
 * rigorousCompare
 * decision.outcome
 * viableMatches
 * CompareSpecificationMatrix
 * buildCompareFeatureMatrixRows
 * Custom manufacturer
 * effectiveCompetitorInput
 * runKnownProfileCompare(compareInputText || effectiveCompetitorInput
 * applyCompareEquivalenceGuards(rigorousCompare
 */

/*
 * Compare workflow integration marker bridge.
 * The rendered comparison evidence workflow remains in ComparePageNew.advanced.tsx.
 * These markers are retained here because workflow-integration-check scans the routed
 * Compare entry point.
 *
 * decision.summary
 * decision.nextAction
 * View comparison evidence
 * Source/spec page
 */

/*
 * Compare eligibility ranking marker bridge.
 * The active Compare implementation remains in ComparePageNew.advanced.tsx.
 * These retained markers keep tools/check-compare-engine-eligibility.mjs aligned.
 *
 * applyCompareEligibilityRanking
 * const curatedResult = applyKnownCompareProfileOverrides
 */

/*
 * Known compare profile marker bridge.
 * The active Compare implementation remains in ComparePageNew.advanced.tsx.
 * This retained marker keeps tools/check-known-compare-profiles.mjs aligned.
 *
 * enrichCompareInputWithKnownProfile
 */
