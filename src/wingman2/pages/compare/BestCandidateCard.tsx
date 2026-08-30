/**
 * BestCandidateCard — Shows the top WyreStorm match for a competitor product.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 */
import { Check, Copy, PackageSearch } from "lucide-react";
import { useState } from "react";
import { GovernedDataBadge, weakestLinkTier } from "../../components/GovernedDataBadge";
import {
  salesWhyBullets,
  salesImportantDifference,
  compactCompareQuoteChecks,
  commercializeCompareCopy,
  uniqueText,
} from "../../lib/repScript";
import { type ScoredCandidate } from "../../lib/compareVerdictPipeline";
import { compareReportedStatus, compareReportedStatusMeta, CompareReportedStatusRail, type CompareReportedStatus } from "./compareUtilities";
import { CompareEvidenceMatrix } from "./CompareEvidenceMatrix";
import { CompareEvidenceList } from "./CompareEvidenceList";
import { openGuruForCompareResult, ProductMoreLink, buildWyrestormSummary, buildCoreComparisonFacts, salesAskCustomer } from "./compareUtilities";
import type { CompetitorProfile, CompetitorSummary } from "./compareUtilities";

// ─── Helper Components ────────────────────────────────────────────────────────

function verdictClass(verdict: string): string {
  if (/good match/i.test(verdict)) return "verdict--match";
  if (/partial/i.test(verdict)) return "verdict--partial";
  if (/no match/i.test(verdict)) return "verdict--no-match";
  if (/verify/i.test(verdict)) return "verdict--verify";
  return "verdict--unknown";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BestCandidateCard({
  candidate,
  competitor,
  competitorProfile,
  onCopySummary,
}: {
  candidate: ScoredCandidate;
  competitor: CompetitorSummary;
  competitorProfile: CompetitorProfile;
  onCopySummary: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const wyrestorm = buildWyrestormSummary(candidate);
  const coreFacts = buildCoreComparisonFacts(competitor, competitorProfile, wyrestorm, candidate);
  const badgeTier = weakestLinkTier(coreFacts.map((f) => f.result));
  const whyBullets = salesWhyBullets(candidate);
  const askCustomer = salesAskCustomer(competitor, candidate);
  const status = compareReportedStatus(candidate, competitor);
  const statusMeta = compareReportedStatusMeta(status);
  const quoteChecks = compactCompareQuoteChecks(competitor, candidate, status);
  const conciseReason =
    commercializeCompareCopy(
      candidate.matched[0] ||
        candidate.partialMatches[0] ||
        candidate.mismatches[0] ||
        candidate.unknowns[0] ||
        statusMeta.guidance,
    );

  return (
    <section className={`compare-native-best-card compare-compact-result wm-ui-section wm-ui-card compare-compact-result--${status}`}>
      <CompareReportedStatusRail status={status} />

      <header className="compare-compact-result__headline">
        <div>
          <h2 className="wm-ui-title">{statusMeta.heading}</h2>
          <p className="wm-ui-copy">{statusMeta.guidance}</p>
        </div>
      </header>

      <div className="compare-compact-result__products">
        <section className="compare-compact-result__product wm-ui-card">
          <span>Competitor</span>
          <strong>{competitor.heading}</strong>
          <small>{competitor.detail}</small>
        </section>

        <span className="compare-compact-result__arrow" aria-hidden="true">{"\u2192"}</span>

        <section className="compare-compact-result__product compare-compact-result__product--wyrestorm wm-ui-card">
          <span>WyreStorm direction</span>
          <strong>{wyrestorm.heading}</strong>
          <small>{wyrestorm.detail}</small>
          <GovernedDataBadge tier={badgeTier} label={candidate.governedLabel} />
        </section>
      </div>

      <div className="compare-compact-result__reason wm-ui-card">
        <strong>Why</strong>
        <p className="wm-ui-copy">{conciseReason}</p>
      </div>

      {candidate.necessaryCoverage ? (
        <section className="compare-compact-result__coverage wm-ui-card" aria-label="Comparison safety summary">
          <div>
            <span>Necessary requirements</span>
            <strong>{candidate.necessaryCoverage.confirmed}/{candidate.necessaryCoverage.total} confirmed</strong>
          </div>
          <div>
            <span>Evidence completeness</span>
            <strong>{candidate.evidenceCompleteness ?? 0}%</strong>
          </div>
          <div>
            <span>Solution type</span>
            <strong>{String(candidate.solutionType || "qualified-alternative").replace(/-/g, " ")}</strong>
          </div>
        </section>
      ) : null}

      <section className="compare-compact-result__warnings compare-compact-result__footnotes wm-ui-card" aria-label="Advisory footnotes">
          <strong>Check before quoting</strong>
          <ul>
            {quoteChecks.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          {status === "match" ? null : (
            <p className="compare-compact-result__footnote-label">
              This is a product direction, not a guaranteed one-box replacement.
            </p>
          )}
      </section>

      <div className="compare-native-action-row compare-compact-result__actions wm-ui-card">
        <button
          className="compare-native-more wm-ui-button wm-ui-button-primary"
          type="button"
          onClick={() => openGuruForCompareResult(competitor, candidate, status)}
        >
          More info from Guru
        </button>
        <button
          className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary"
          type="button"
          onClick={() => {
            onCopySummary();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          aria-label="Copy comparison result"
        >
          {copied ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy result</>}
        </button>
        <ProductMoreLink sku={candidate.product.sku} />
      </div>

      <details className="compare-native-summary compare-native-technical-details wm-ui-card wm-ui-copy">
        <summary>Technical comparison details</summary>

        {coreFacts.length ? (
          <section className="compare-native-core-facts wm-ui-section" aria-label="Core comparison points">
            <p className="compare-native-label compare-native-label--subtle wm-ui-copy">Key comparison matrix</p>
            <div className="compare-native-core-matrix" role="table" aria-label="Competitor versus WyreStorm comparison matrix">
              <div className="compare-native-core-matrix-header wm-ui-card-header" role="rowgroup">
                <div className="compare-native-core-matrix-row compare-native-core-matrix-row--header wm-ui-card wm-ui-card-header" role="row">
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Comparison point</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Competitor</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">WyreStorm</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Result</span>
                </div>
              </div>
              <div className="compare-native-core-matrix-body" role="rowgroup">
                {coreFacts.map((fact) => (
                  <div key={`core-fact-${fact.label}`} className="compare-native-core-matrix-row wm-ui-card" role="row">
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--point" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Comparison point</span>
                      <strong>{fact.label}</strong>
                    </div>
                    <div className="compare-native-core-matrix-cell" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Competitor</span>
                      <p className="wm-ui-copy">{fact.competitor || "Needs verification"}</p>
                    </div>
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--wyrestorm" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">WyreStorm</span>
                      <p className="wm-ui-copy">{fact.wyrestorm || "Needs verification"}</p>
                    </div>
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--result wm-ui-card" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Result</span>
                      <p className="wm-ui-copy">{fact.result}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <CompareEvidenceList title="Matched points" items={whyBullets} />
        <CompareEvidenceList
          title="Important differences"
          items={uniqueText([...candidate.mismatches, ...candidate.gaps], 4)}
          className="compare-native-evidence--danger wm-ui-title"
        />
        <CompareEvidenceList
          title="Checks before quote"
          items={askCustomer}
          className="compare-native-evidence--warn wm-ui-title"
        />
        <CompareEvidenceMatrix candidate={candidate} competitor={competitor} />
      </details>
    </section>
  );
}

export default BestCandidateCard;
