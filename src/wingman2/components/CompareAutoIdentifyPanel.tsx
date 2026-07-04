import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  describeAutoIdentifyResult,
  identifyCompetitorProduct,
  type CompareAutoIdentifyResult,
} from "../lib/compareAutoIdentify";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  saveCompareRunToProject,
  saveProductSelectionToCurrentProject,
  saveRecommendationEvidenceToProject,
  type StoredProductSelection,
} from "../data/projectStore";
import { buildRecommendationEvidence } from "../lib/recommendationEvidence";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  clearRecentCompareSearches,
  readRecentCompareSearches,
  recordRecentCompareSearch,
} from "../lib/compareRecentSearches";

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

function savedApplicationContext(): string {
  const project = getCurrentWorkflowProject(readProjectStore());
  const roomModel = project?.discoveryBrief?.roomModel;
  const values = [roomModel?.roomType, roomModel?.outcome, roomModel?.application];
  const context = values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value, index, all) => all.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index)
    .slice(0, 2);

  return context.join(" - ");
}

function articleForProductType(productType: string): "a" | "an" {
  const value = productType.trim();

  if (/^(?:uc|usb|uhd|hdmi|hdbaset|ndii?)\b/i.test(value)) {
    return "a";
  }

  return /^[aeiou]/i.test(value) ? "an" : "a";
}

function applicationUse(result: CompareAutoIdentifyResult, application: string): string {
  const productText = `${result.competitorSummary.productType} ${result.wyrestormMatch.lane}`.toLowerCase();
  const place = application || "this application";
  let job = "cover the same main product job with the closest suitable WyreStorm option";

  if (productText.includes("camera")) {
    job = "capture the people in the room for the call, recording or stream";
  } else if (productText.includes("soundbar") || productText.includes("video bar")) {
    job = "provide the room camera, microphone and speaker path";
  } else if (productText.includes("appliance")) {
    job = "run the room's video meetings without relying on a user's laptop";
  } else if (productText.includes("wireless")) {
    job = "let users share content onto the room display without a cable";
  } else if (productText.includes("matrix") || productText.includes("switch")) {
    job = "switch the required room sources to the correct displays";
  } else if (productText.includes("extender") || productText.includes("hdbaset")) {
    job = "carry the source signal to a display over the required cable distance";
  } else if (productText.includes("av-over-ip") || productText.includes("avoip")) {
    job = "send selected sources to the correct displays over the AV network";
  }

  return `For ${place}, use this direction to ${job}.`;
}

function leadWyrestormSku(result: CompareAutoIdentifyResult): string | null {
  return result.wyrestormMatch.candidates[0] ?? null;
}

function confirmationQuestion(result: CompareAutoIdentifyResult, application: string): string {
  if (result.confidence === "none") {
    return result.nextQuestion || "What brand and model did the customer mention?";
  }

  const productType = result.competitorSummary.productType.toLowerCase();
  const context = application ? ` for the saved ${application} application` : "";
  const article = articleForProductType(productType);

  return `I'm treating this as ${article} ${productType}${context}. Is that correct?`;
}

export default function CompareAutoIdentifyPanel({
  initialQuery = "",
  onOpenAdvanced,
}: CompareAutoIdentifyPanelProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<CompareAutoIdentifyResult | null>(null);
  const [committedSku, setCommittedSku] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentCompareSearches());
  const application = useMemo(() => savedApplicationContext(), []);

  const plainEnglishSummary = useMemo(() => {
    return result ? describeAutoIdentifyResult(result) : "";
  }, [result]);

  const runIdentify = (value = query) => {
    const trimmed = value.trim();
    setQuery(value);
    setResult(identifyCompetitorProduct(value));
    setCommittedSku(null);

    if (trimmed) {
      setRecentSearches(recordRecentCompareSearch(trimmed));
    }
  };

  const clearHistory = () => {
    setRecentSearches(clearRecentCompareSearches());
  };

  const handleCommit = (target: "project" | "proposal") => {
    if (!result) return;

    const sku = leadWyrestormSku(result);
    if (!sku) return;

    const selection: StoredProductSelection = {
      sku,
      family: result.wyrestormMatch.lane,
      status: result.confidence === "high" ? "recommended" : "alternative",
      source: "Simplified Compare",
      evidence: result.wyrestormMatch.notes,
      cautions: result.wyrestormMatch.warnings,
    };
    const compareRun = {
      competitorBrand: result.competitorSummary.manufacturer,
      competitorSku: result.competitorSummary.model || result.input,
      wyrestormSku: sku,
      mode: "simplified-compare",
      summary: plainEnglishSummary,
      confidence: result.confidence,
      warnings: result.wyrestormMatch.warnings,
      evidence: result.wyrestormMatch.notes,
      source: "Simplified Compare",
    };

    saveCompareRunToProject(compareRun);
    saveProductSelectionToCurrentProject(selection);
    saveRecommendationEvidenceToProject(
      buildRecommendationEvidence({
        source: "Simplified Compare",
        query,
        compare: compareRun,
        product: {
          sku,
          title: sku,
          family: result.wyrestormMatch.lane,
          summary: result.wyrestormMatch.notes.join(" "),
        },
      }),
      selection,
    );

    setCommittedSku(sku);

    if (target === "proposal") {
      navigate(routeCatalogByKey.proposal.path);
    }
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
        {recentSearches.length > 0 ? (
          <div className="wm-compare-auto-recent" aria-label="Recent competitor searches">
            <span className="wm-compare-auto-recent-label">Recent searches</span>
            {recentSearches.map((recent) => (
              <button key={recent} type="button" onClick={() => runIdentify(recent)}>
                {recent}
              </button>
            ))}
            <button type="button" className="wm-compare-auto-recent-clear" onClick={clearHistory}>
              Clear
            </button>
          </div>
        ) : null}
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
              <h3>What it does</h3>
              <p>{result.competitorSummary.purpose}</p>
              <dl className="wm-compare-auto-definition-list">
                {result.competitorSummary.manufacturer !== "Unknown" ? (
                  <div>
                    <dt>Brand</dt>
                    <dd>{result.competitorSummary.manufacturer}</dd>
                  </div>
                ) : null}
                {result.competitorSummary.model !== "Unknown" ? (
                  <div>
                    <dt>Model</dt>
                    <dd>{result.competitorSummary.model}</dd>
                  </div>
                ) : null}
                {!result.competitorSummary.detectedLabel
                  .toLowerCase()
                  .includes(result.competitorSummary.productType.toLowerCase()) ? (
                  <div>
                    <dt>Product type</dt>
                    <dd>{result.competitorSummary.productType}</dd>
                  </div>
                ) : null}
              </dl>

              <h3>Key technical points</h3>
              <ul>
                {result.competitorSummary.keyTechnicalPoints.slice(0, 4).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>

            <article className="wm-compare-auto-card">
              <p className="wm-eyebrow">WyreStorm direction</p>
              {result.wyrestormMatch.candidates.length > 0 ? (
                <>
                  <h2>{result.wyrestormMatch.candidates[0]}</h2>
                  {result.wyrestormMatch.candidates.length > 1 ? (
                    <p className="wm-compare-auto-also-fits">
                      <strong>Also fits:</strong> {result.wyrestormMatch.candidates.slice(1).join(", ")}
                    </p>
                  ) : null}
                </>
              ) : (
                <h2>{result.wyrestormMatch.lane}</h2>
              )}
              <h3>How it fits here</h3>
              <p>{applicationUse(result, application)}</p>
              <p><strong>Technical direction:</strong> {result.wyrestormMatch.lane}</p>
            </article>
          </div>

          <div className="wm-compare-auto-next">
            <strong>Confirm this:</strong> {confirmationQuestion(result, application)}
          </div>

          {leadWyrestormSku(result) ? (
            <section className="wm-compare-auto-forward wm-ui-section wm-ui-card">
              <h2 className="wm-ui-title">Take this forward</h2>
              <p className="wm-ui-copy">
                Save {leadWyrestormSku(result)} to your project, or carry it straight into a proposal.
              </p>
              <div className="wm-compare-auto-forward-actions wm-ui-card">
                <button
                  type="button"
                  className="wm-ui-button wm-ui-button-primary"
                  onClick={() => handleCommit("proposal")}
                >
                  Build proposal with {leadWyrestormSku(result)}
                </button>
                <button
                  type="button"
                  className="wm-ui-button wm-ui-button-primary"
                  onClick={() => handleCommit("project")}
                >
                  Add to project
                </button>
                <Link
                  className="wm-ui-button"
                  to={`${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(leadWyrestormSku(result) ?? "")}&source=compare`}
                >
                  See full pitch
                </Link>
              </div>
              {committedSku === leadWyrestormSku(result) ? (
                <p className="wm-ui-copy">
                  Saved to your project.{" "}
                  <Link to={routeCatalogByKey.projects.path}>Open projects</Link> or{" "}
                  <Link to={routeCatalogByKey.proposal.path}>build the proposal</Link>.
                </p>
              ) : null}
            </section>
          ) : null}

          <details className="wm-compare-auto-candidates">
            <summary>Technical and quote detail</summary>

            {result.wyrestormMatch.optionalAddOns.length > 0 ? (
              <>
                <h3>Possible add-ons</h3>
                <p>{result.wyrestormMatch.optionalAddOns.slice(0, 3).join(", ")}</p>
              </>
            ) : null}

            {result.wyrestormMatch.warnings.length > 0 ? (
              <>
                <h3>Check before quoting</h3>
                <p>{result.wyrestormMatch.warnings[0]}</p>
              </>
            ) : null}

            <h3>Do not compare against</h3>
            <p>{result.competitorSummary.notComparableWith.join(", ")}</p>

            {result.candidates.length > 1 ? (
              <>
                <h3>Other possible competitor matches</h3>
                <ul>
                  {result.candidates.slice(1, 3).map((candidate) => (
                    <li key={candidate.product.id}>
                      {candidate.product.manufacturer} {candidate.product.model}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </details>
        </div>
      ) : null}
    </section>
  );
}
