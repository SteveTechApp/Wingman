/**
 * CompareVerdictLead — the plain-language answer surface for an inexperienced
 * rep: what the competitor product IS, whether WyreStorm makes anything like
 * it, and the single best suggestion with the checks to run before quoting.
 * The deep technical comparison (BestCandidateCard) stays below for whoever
 * wants the detail.
 *
 * The narrative text itself lives in repScript (lib/repScript) — this
 * component is only the rendering of that narrative, plus the confidence tier
 * chip and the signal-route faceplate.
 *
 * The prop types are intentionally structural: the Compare page's own
 * `CompetitorSummary` / `ScoredCandidate` satisfy them without importing the
 * page.
 */
import {
  repScript,
  commercializeCompareCopy,
  type RepCompetitor,
  type RepCandidate,
  type RepStatus,
} from "../../lib/repScript";
import { CompareConfidenceTier } from "./CompareConfidenceTier";

/** The competitor fields this surface reads (satisfied by CompetitorSummary). */
export type VerdictCompetitor = RepCompetitor & {
  transport?: string;
  resolution?: string;
};

/** The WyreStorm candidate this surface reads (satisfied by ScoredCandidate). */
export type VerdictCandidate = RepCandidate;

/** The engine's reported status; also the CSS modifier for the lead. */
export type VerdictStatus = RepStatus;

function competitorBriefFacts(competitor: VerdictCompetitor): Array<{ label: string; value: string }> {
  return [
    { label: "Product type", value: competitor.recognisedClass },
    { label: "Role", value: competitor.role },
    { label: "Connection", value: competitor.transport },
    { label: "Resolution", value: competitor.resolution },
  ].map((fact) => ({
    ...fact,
    value: fact.value && fact.value !== "Unknown" && fact.value !== "Not verified locally"
      ? fact.value
      : "Needs confirmation",
  }));
}

export function CompareVerdictLead({
  competitor,
  candidate,
  status,
  alternativesCount,
  noMatchReason,
  reviewedBy,
  evidencePending,
}: {
  competitor: VerdictCompetitor;
  candidate: VerdictCandidate | null;
  status: VerdictStatus;
  alternativesCount: number;
  noMatchReason?: string;
  reviewedBy?: string;
  evidencePending?: boolean;
}) {
  // The complete rep-facing narrative from the single source of truth
  // (repScript). Local names mirror the historical ones so the JSX below
  // stays untouched.
  const script = repScript({ competitor, candidate, status, reviewedBy, evidencePending, noMatchReason });
  const tier = script.tier;
  const verdict = { heading: script.heading, line: script.line };
  const purposeLine = script.purposeLine;
  const why = script.whyBullets;
  const mainDifference = script.difference;
  const quoteChecks = script.quoteChecks;
  const customerLine = script.whatToSay;
  const nextSteps = script.nextSteps;

  return (
    <section className={`compare-verdict-lead compare-verdict-lead--${status}`} aria-label="Compare verdict">
      <header className="compare-verdict-lead__banner">
        <CompareConfidenceTier label={tier.label} tone={tier.tone} />
        <div className="compare-verdict-lead__route">
          <span className="compare-verdict-lead__route-end compare-verdict-lead__route-end--from">
            <small>Competitor</small>
            <strong>{competitor.heading}</strong>
          </span>
          <span className="compare-verdict-lead__route-link" aria-hidden="true">
            <span className="compare-verdict-lead__route-lamp" aria-hidden="true" />
          </span>
          <span className="compare-verdict-lead__route-end compare-verdict-lead__route-end--to">
            <small>WyreStorm</small>
            <strong>{candidate ? candidate.product.sku : tier.label}</strong>
          </span>
        </div>
        <strong className="compare-verdict-lead__heading">{verdict.heading}</strong>
        <p className="wm-ui-copy">{verdict.line}</p>
      </header>

      <div className="compare-verdict-lead__columns">
        <section className="compare-verdict-lead__brief wm-ui-card" aria-label="What the competitor product is">
          <span className="compare-native-eyebrow wm-ui-kicker">What this product is</span>
          <p className="compare-verdict-lead__purpose wm-ui-copy">{purposeLine}</p>
          <dl className="compare-verdict-lead__facts">
            {competitorBriefFacts(competitor).map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {candidate ? (
          <section className="compare-verdict-lead__suggestion wm-ui-card" aria-label="WyreStorm suggestion">
            <span className="compare-native-eyebrow wm-ui-kicker">WyreStorm suggestion</span>
            <h3 className="wm-ui-title">{candidate.product.sku}</h3>
            <p className="compare-verdict-lead__product-name wm-ui-copy">{candidate.product.name}</p>
            {why.length ? (
              <div className="compare-verdict-lead__why">
                <strong>Why this one</strong>
                <ul>
                  {why.map((item) => (
                    <li key={item}>{commercializeCompareCopy(item)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {mainDifference ? (
              <p className="compare-verdict-lead__difference wm-ui-copy">
                <strong>Main difference:</strong> {commercializeCompareCopy(mainDifference)}
              </p>
            ) : null}
          </section>
        ) : (
          <section className="compare-verdict-lead__message wm-ui-card" aria-label="What to tell the customer">
            <span className="compare-native-eyebrow wm-ui-kicker">What to tell the customer</span>
            <p className="compare-verdict-lead__purpose wm-ui-copy">{customerLine}</p>
          </section>
        )}
      </div>

      {candidate ? (
        quoteChecks.length ? (
          <section className="compare-verdict-lead__checks wm-ui-card" aria-label="Before you quote">
            <strong>Before you quote</strong>
            <ul>
              {quoteChecks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </section>
        ) : null
      ) : (
        <section className="compare-verdict-lead__checks wm-ui-card" aria-label="Where to go next">
          <strong>Where to go next</strong>
          <ol>
            {nextSteps.map((step) => (
              <li key={step}>{commercializeCompareCopy(step)}</li>
            ))}
          </ol>
        </section>
      )}

      {alternativesCount > 0 ? (
        <p className="compare-verdict-lead__alternatives wm-ui-copy">
          There {alternativesCount === 1 ? "is 1 other" : `are ${alternativesCount} other`} WyreStorm option
          {alternativesCount === 1 ? "" : "s"} to consider further down.
        </p>
      ) : null}
    </section>
  );
}
