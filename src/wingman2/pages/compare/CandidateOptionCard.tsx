/**
 * CandidateOptionCard — Shows an alternative WyreStorm match option.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 */
import { PackageSearch } from "lucide-react";
import { GovernedDataBadge, weakestLinkTier } from "../../components/GovernedDataBadge";
import {
  commercializeCompareCopy,
  uniqueText,
} from "../../lib/repScript";
import { type ScoredCandidate } from "../../lib/compareVerdictPipeline";
import { CompareEvidenceList } from "./CompareEvidenceList";
import { ProductMoreLink, buildWyrestormSummary, surfaceValueResolved } from "./compareUtilities";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function verdictClass(verdict: string): string {
  if (/good match/i.test(verdict)) return "verdict--match";
  if (/partial/i.test(verdict)) return "verdict--partial";
  if (/no match/i.test(verdict)) return "verdict--no-match";
  if (/verify/i.test(verdict)) return "verdict--verify";
  return "verdict--unknown";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CandidateOptionCard({ candidate }: { candidate: ScoredCandidate }) {
  const summary = buildWyrestormSummary(candidate);
  const comparisonFacts = new Map(summary.comparisonFacts.map((fact) => [fact.label, fact.value]));
  const optionTier = weakestLinkTier([
    candidate.governedTier,
    // The option card surfaces exactly three WyreStorm facts; any of them
    // unresolved makes the card's claim weaker than the profile tier alone.
    ...[candidate.product.productClass, candidate.product.transport, candidate.outcomeLabel].map(
      (value) => (surfaceValueResolved(String(value ?? "")) ? candidate.governedTier : "missing"),
    ),
  ]);
  const matrixVariantReason = candidate.product.productClass === "Matrix"
    ? candidate.checks.find((item) => /feature-enhanced alternative|HDBaseT distance|receiver topology|video-wall/i.test(item))
    : undefined;
  const reason = commercializeCompareCopy(
    matrixVariantReason ||
      candidate.matched[0] ||
      candidate.partialMatches[0] ||
      "Closest role-compatible WyreStorm option from the current Compare data.",
  );
  const advisory = commercializeCompareCopy(
    matrixVariantReason ||
      candidate.dependencies[0] ||
      candidate.mismatches[0] ||
      candidate.gaps[0] ||
      candidate.unknowns[0] ||
      candidate.checks[0] ||
      "Confirm lifecycle, accessories and complete signal-path compatibility before quotation.",
  );

  return (
    <article className="compare-native-option-card compare-product-info-card wm-ui-card">
      <header className="compare-product-info-card__header">
        <span className="compare-product-info-card__icon" aria-hidden="true"><PackageSearch /></span>
        <div className="compare-product-info-card__identity">
        <p className="compare-native-family wm-ui-copy">{candidate.product.family}</p>
        <h3 className="wm-ui-title">{candidate.product.sku}</h3>
          <p className="compare-product-info-card__name">{candidate.product.name}</p>
        </div>
        <span className={`compare-native-verdict compare-product-info-card__status ${verdictClass(candidate.verdict)}`}>{candidate.verdict}</span>
      </header>

      <div className="compare-product-info-card__facts" aria-label="Product information">
        <span><small>Product type</small><strong>{candidate.product.productClass}</strong></span>
        <span><small>Inputs</small><strong>{comparisonFacts.get("Inputs") || "Needs verification"}</strong></span>
        <span><small>Outputs</small><strong>{comparisonFacts.get("Outputs") || "Needs verification"}</strong></span>
        <span><small>Connection</small><strong>{candidate.product.transport}</strong></span>
        <span><small>Data status</small><strong><GovernedDataBadge tier={optionTier} label={candidate.governedLabel} /></strong></span>
      </div>

      <section className="compare-native-option-note compare-product-info-card__fit wm-ui-card">
        <span>Why it fits</span>
        <p className="wm-ui-copy">{reason}</p>
      </section>
      <p className="compare-native-option-check compare-native-option-footnote wm-ui-copy wm-ui-card">
        <strong>Before you quote:</strong> {advisory}
      </p>

      <details className="compare-native-summary wm-ui-card wm-ui-copy">
        <summary>Why this option was shortlisted</summary>
        <CompareEvidenceList title="Why this direction" items={candidate.matched.slice(0, 3)} />
        <CompareEvidenceList title="Important differences" items={candidate.mismatches.slice(0, 2)} className="compare-native-evidence--danger wm-ui-title" />
        <CompareEvidenceList title="Commercial checks" items={uniqueText([...candidate.unknowns, ...candidate.checks, ...candidate.gaps, ...candidate.dependencies], 4)} className="compare-native-evidence--warn wm-ui-title" />
      </details>

      <div className="compare-native-action-row compare-product-info-card__actions wm-ui-card">
        <ProductMoreLink sku={candidate.product.sku} />
      </div>
    </article>
  );
}

export function CandidateThumbnailSelector({ candidate, selected, onSelect }: {
  candidate: ScoredCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`compare-candidate-thumbnail${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={`Compare with ${candidate.product.sku}`}
      onClick={onSelect}
    >
      <span>{candidate.product.family}</span>
      <strong>{candidate.product.sku}</strong>
      <small>{candidate.product.productClass} · {candidate.verdict}</small>
    </button>
  );
}

export default CandidateOptionCard;
