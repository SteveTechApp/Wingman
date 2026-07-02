import { useMemo, useState } from "react";
import {
  describeAutoIdentifyResult,
  identifyCompetitorProduct,
  type CompareAutoIdentifyResult,
} from "../lib/compareAutoIdentify";

interface CompareAutoIdentifyPanelProps {
  initialQuery?: string;
  onOpenAdvanced?: () => void;
}

const exampleQueries = [
  "Poly X52",
  "Logitech Rally Camera",
  "Yealink A30",
  "Huddly IQ",
  "Jabra PanaCast 50",
];

function ConfidenceBadge({ confidence }: { confidence: CompareAutoIdentifyResult["confidence"] }) {
  const label =
    confidence === "high"
      ? "High confidence"
      : confidence === "medium"
        ? "Medium confidence"
        : confidence === "low"
          ? "Low confidence"
          : "Needs more detail";

  return <span className={`wm-compare-auto-badge wm-compare-auto-badge-${confidence}`}>{label}</span>;
}

export default function CompareAutoIdentifyPanel({
  initialQuery = "",
  onOpenAdvanced,
}: CompareAutoIdentifyPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<CompareAutoIdentifyResult | null>(null);

  const plainEnglishSummary = useMemo(() => {
    return result ? describeAutoIdentifyResult(result) : "";
  }, [result]);

  const runIdentify = (value = query) => {
    setQuery(value);
    setResult(identifyCompetitorProduct(value));
  };

  return (
    <section className="wm-compare-auto-panel" aria-label="Simplified competitor compare">
      <div className="wm-compare-auto-header">
        <div>
          <p className="wm-eyebrow">Simplified compare</p>
          <h1>Compare against WyreStorm</h1>
          <p>
            Type the product, brand, SKU, or rough customer description. Wingman will identify what it is,
            explain its purpose, and suggest the closest WyreStorm product direction.
          </p>
        </div>
        <button
          type="button"
          className="wm-compare-auto-secondary"
          onClick={onOpenAdvanced}
        >
          Choose products manually
        </button>
      </div>

      <div className="wm-compare-auto-search">
        <label htmlFor="wm-compare-auto-input">What product has the customer mentioned?</label>
        <div className="wm-compare-auto-search-row">
          <input
            id="wm-compare-auto-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                runIdentify();
              }
            }}
            placeholder="Example: Poly Studio X52, Logitech Rally Bar Mini, Atlona AT-OME-EX-KIT, Blustream IP250UHD-TX"
          />
          <button type="button" onClick={() => runIdentify()}>
            Identify and compare
          </button>
        </div>
        <div className="wm-compare-auto-examples" aria-label="Example competitor searches">
          {exampleQueries.map((example) => (
            <button key={example} type="button" onClick={() => runIdentify(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {result ? (
        <div className="wm-compare-auto-results" aria-live="polite">
          <div className="wm-compare-auto-result-summary">
            <ConfidenceBadge confidence={result.confidence} />
            <p>{plainEnglishSummary}</p>
          </div>

          <div className="wm-compare-auto-grid">
            <article className="wm-compare-auto-card">
              <p className="wm-eyebrow">Competitor product</p>
              <h2>{result.competitorSummary.detectedLabel}</h2>
              <dl>
                <div>
                  <dt>Brand</dt>
                  <dd>{result.competitorSummary.manufacturer}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{result.competitorSummary.model}</dd>
                </div>
                <div>
                  <dt>Product type</dt>
                  <dd>{result.competitorSummary.productType}</dd>
                </div>
                <div>
                  <dt>Purpose</dt>
                  <dd>{result.competitorSummary.purpose}</dd>
                </div>
              </dl>

              <h3>Key technical points</h3>
              <ul>
                {result.competitorSummary.keyTechnicalPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>

            <article className="wm-compare-auto-card">
              <p className="wm-eyebrow">WyreStorm direction</p>
              <h2>{result.wyrestormMatch.lane}</h2>
              <dl>
                <div>
                  <dt>Best candidate direction</dt>
                  <dd>
                    {result.wyrestormMatch.candidates.length > 0
                      ? result.wyrestormMatch.candidates.join(", ")
                      : "Not selected yet"}
                  </dd>
                </div>
                <div>
                  <dt>Optional add-ons</dt>
                  <dd>
                    {result.wyrestormMatch.optionalAddOns.length > 0
                      ? result.wyrestormMatch.optionalAddOns.join(", ")
                      : "None identified yet"}
                  </dd>
                </div>
              </dl>

              <h3>Why this lane</h3>
              <ul>
                {result.wyrestormMatch.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="wm-compare-auto-warning-card">
            <h3>Do not compare against</h3>
            <p>{result.competitorSummary.notComparableWith.join(", ")}</p>
          </div>

          {result.wyrestormMatch.warnings.length > 0 ? (
            <div className="wm-compare-auto-warning-card">
              <h3>Warnings / checks before quoting</h3>
              <ul>
                {result.wyrestormMatch.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.candidates.length > 1 ? (
            <details className="wm-compare-auto-candidates">
              <summary>Other possible competitor matches</summary>
              <ul>
                {result.candidates.slice(1).map((candidate) => (
                  <li key={candidate.product.id}>
                    <strong>
                      {candidate.product.manufacturer} {candidate.product.model}
                    </strong>{" "}
                    ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â score {candidate.score}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {result.nextQuestion ? (
            <div className="wm-compare-auto-next">
              <strong>Next check:</strong> {result.nextQuestion}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}