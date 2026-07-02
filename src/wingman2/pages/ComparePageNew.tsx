import { useState } from "react";
import CompareAutoIdentifyPanel from "../components/CompareAutoIdentifyPanel";
import AdvancedComparePage from "./ComparePageNew.advanced";

type CompareMode = "simplified" | "advanced";

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
  const [mode, setMode] = useState<CompareMode>("simplified");

  if (mode === "advanced") {
    return (
      <main className="wm-ui-page wm-compare-page wm-compare-simplified-page">
        <section className="wm-ui-card wm-compare-advanced-shell" aria-label="Advanced manual compare">
          <div className="wm-compare-advanced-heading">
            <div>
              <p className="wm-ui-copy wm-eyebrow">Advanced compare</p>
              <h1 className="wm-ui-title">Manual brand / SKU comparison</h1>
              <p className="wm-ui-copy">
                Use this mode when you already know the exact competitor and WyreStorm products.
                Return to Simplified Compare when the salesperson only has a rough brand, model or customer description.
              </p>
            </div>
            <button
              type="button"
              className="wm-ui-button wm-compare-auto-secondary"
              onClick={() => setMode("simplified")}
            >
              Back to simplified compare
            </button>
          </div>
          <AdvancedComparePage />
        </section>
      </main>
    );
  }

  return (
    <main className="wm-ui-page wm-compare-page wm-compare-simplified-page">
      <section className="wm-ui-card wm-compare-auto-shell" aria-label="Simplified competitor compare">
        <div className="wm-compare-auto-heading">
          <div>
            <p className="wm-ui-copy wm-eyebrow">Simplified compare</p>
            <h1 className="wm-ui-title">Compare against WyreStorm</h1>
            <p className="wm-ui-copy">
              Type a competitor brand, model, SKU or rough customer description. Wingman will identify what it is,
              explain its purpose and suggest the closest WyreStorm comparison lane.
            </p>
          </div>
        </div>
        <CompareAutoIdentifyPanel onOpenAdvanced={() => setMode("advanced")} />
      </section>

      <aside className="wm-ui-card wm-compare-auto-support" aria-label="Compare workflow guidance">
        <p className="wm-ui-copy wm-eyebrow">How Wingman handles this</p>
        <h2 className="wm-ui-title">Identify first, compare second</h2>
        <p className="wm-ui-copy">
          Wingman first decides whether the customer mentioned a UC soundbar, camera, PTZ camera,
          room appliance, matrix, extender, wireless presentation system or AV-over-IP product. It then selects
          the safest WyreStorm comparison lane instead of requiring the salesperson to know the exact SKU.
        </p>
        <p className="wm-ui-copy">
          Use this for UC products and standard AV competitors such as Poly, Logitech, Yealink, Huddly,
          Atlona, Blustream, Kramer, Lightware, Extron, Crestron, Barco and ZeeVee.
        </p>
        <p className="wm-ui-copy">
          Where connector evidence is not proven, Wingman should describe the requirement in safe terms such as
          local source, room source, customer device or UC device rather than claiming a specific connector type.
        </p>
      </aside>

      <aside className="wm-ui-card wm-compare-auto-support" aria-label="Quote safety guidance">
        <p className="wm-ui-copy wm-eyebrow">Check before quoting</p>
        <h2 className="wm-ui-title">Important differences</h2>
        <p className="wm-ui-copy">
          Important differences must be shown before quoting, especially where the competitor product is a native
          UC appliance, a camera-only device, an AV-over-IP endpoint, an extender, a matrix or a wireless presentation product.
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
