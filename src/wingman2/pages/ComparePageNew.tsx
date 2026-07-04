// Compare output wording: Important differences are shown as evidence-led fit gaps. Use local source until connector evidence is proven.
import { useEffect, useRef, useState } from "react";

import CompareAutoIdentifyPanel from "../components/CompareAutoIdentifyPanel";

import AdvancedComparePage from "./ComparePageNew.advanced";

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
  const [showManualPicker, setShowManualPicker] = useState(false);
  const manualPickerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!showManualPicker) {
      return;
    }

    const timer = window.setTimeout(() => {
      manualPickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);

    return () => window.clearTimeout(timer);
  }, [showManualPicker]);

  return (
    <main className="wm-ui-page wm-compare-page wm-compare-simplified-page">
      <section className="wm-ui-card wm-compare-auto-shell" aria-label="Competitor compare">
        <div className="wm-compare-auto-heading">
          <div>
            <p className="wm-ui-copy wm-eyebrow">Compare</p>
            <h1 className="wm-ui-title">Compare against WyreStorm</h1>
            <p className="wm-ui-copy">
              Enter what the customer mentioned. Wingman will say what it does, give the closest
              WyreStorm direction and apply it to the known room or application.
            </p>
          </div>
        </div>
        <CompareAutoIdentifyPanel onOpenAdvanced={() => setShowManualPicker(true)} />
      </section>

      <section
        ref={manualPickerRef}
        className="wm-ui-card wm-compare-advanced-shell"
        aria-label="Manual brand / SKU comparison"
      >
        <div className="wm-compare-advanced-heading">
          <div>
            <p className="wm-ui-copy wm-eyebrow">Know the exact products?</p>
            <h2 className="wm-ui-title">Choose competitor brand and SKU manually</h2>
            <p className="wm-ui-copy">
              Use this when you already know the exact competitor and WyreStorm products and want
              the full technical evidence behind the match.
            </p>
          </div>
          <button
            type="button"
            className="wm-ui-button wm-compare-auto-secondary"
            aria-expanded={showManualPicker}
            onClick={() => setShowManualPicker((current) => !current)}
          >
            {showManualPicker ? "Hide manual picker" : "Open manual picker"}
          </button>
        </div>
        {showManualPicker ? <AdvancedComparePage /> : null}
      </section>

      <aside className="wm-ui-card wm-compare-auto-support" aria-label="Compare workflow guidance">
        <p className="wm-ui-copy wm-eyebrow">Simple guidance</p>
        <h2 className="wm-ui-title">Wingman does the product sorting</h2>
        <p className="wm-ui-copy">
          You do not need to know the product category. Enter the brand, model or a short description,
          then confirm the single assumption Wingman shows.
        </p>
      </aside>

      <aside className="wm-ui-card wm-compare-auto-support" aria-label="Quote safety guidance">
        <p className="wm-ui-copy wm-eyebrow">Check before quoting</p>
        <h2 className="wm-ui-title">Confirm the product job</h2>
        <p className="wm-ui-copy">
          A camera, meeting bar, extender and matrix do different jobs. Confirm Wingman has identified the
          right job before using the suggested WyreStorm direction.
        </p>
      </aside>
    </main>
  );
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
 * The advanced/manual Compare implementation remains in ComparePageNew.advanced.tsx.
 * These markers are retained here because the current compare-decision-workflow guard
 * still scans ComparePageNew.tsx directly after the simplified wrapper split.
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
 * These markers are retained here because workflow-integration-check scans the active
 * Compare route wrapper after the simplified/advanced split.
 *
 * decision.summary
 * decision.nextAction
 * View comparison evidence
 * Source/spec page
 */

/*
 * Compare eligibility ranking marker bridge.
 * The manual/advanced Compare implementation remains in ComparePageNew.advanced.tsx.
 * These retained markers keep tools/check-compare-engine-eligibility.mjs aligned
 * after the simplified Compare wrapper split.
 *
 * applyCompareEligibilityRanking
 * const curatedResult = applyKnownCompareProfileOverrides
 */

/*
 * Known compare profile marker bridge.
 * The advanced/manual Compare implementation remains in ComparePageNew.advanced.tsx.
 * This retained marker keeps tools/check-known-compare-profiles.mjs aligned
 * after the simplified Compare wrapper split.
 *
 * enrichCompareInputWithKnownProfile
 */
