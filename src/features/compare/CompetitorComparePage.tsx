import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";

type CompareTab = "fit" | "shortlist" | "manual";

type CompareResult = {
  competitorBrand: string;
  competitorSku: string;
  wyrestormSku: string;
  title: string;
  fitSummary: string;
  reasons: string[];
  shortlist: string[];
};

const BRANDS = ["Atlona", "Crestron", "Extron", "Kramer", "Lightware", "Other"];

function buildMockResult(brand: string, sku: string): CompareResult {
  return {
    competitorBrand: brand,
    competitorSku: sku,
    wyrestormSku: "NHD-500-TX",
    title: "Closest WyreStorm fit",
    fitSummary:
      "This looks most like a NetworkHD / AV over IP style requirement based on the entered competitor reference.",
    reasons: [
      "Transport and application style suggest a distributed AV workflow.",
      "Likely fit is strongest where flexible routing and scalable deployment matter.",
      "Use catalogue and product intelligence if deeper validation is needed.",
    ],
    shortlist: ["NHD-500-TX", "NHD-500-RX", "NHD-400-TX"],
  };
}

function MetricCard(props: { label: string; value: string | number }) {
  return (
    <div className="wm-card wm-card--insight">
      <div className="wm-card__title">{props.label}</div>
      <div className="wm-card__text">{props.value}</div>
    </div>
  );
}

export default function CompetitorComparePage() {
  const [brand, setBrand] = useState("Atlona");
  const [competitorSku, setCompetitorSku] = useState("");
  const [tab, setTab] = useState<CompareTab>("fit");
  const [status, setStatus] = useState("Idle");
  const [savedState, setSavedState] = useState("Not saved");
  const [result, setResult] = useState<CompareResult | null>(null);

  const hasSearch = competitorSku.trim().length > 0;
  const hasResults = !!result;
  const hasSelection = !!result?.wyrestormSku;

  const metrics = useMemo(
    () => ({
      status,
      matches: hasResults ? 1 : 0,
      saved: savedState,
    }),
    [status, hasResults, savedState],
  );

  function clearSearch() {
    setCompetitorSku("");
    setResult(null);
    setStatus("Idle");
    setSavedState("Not saved");
    setTab("fit");
  }

  function lookupLive() {
    if (!hasSearch) return;
    setStatus("Searching");
    const next = buildMockResult(brand, competitorSku.trim());
    setResult(next);
    setStatus("Match found");
    setTab("fit");
  }

  function saveCompare() {
    if (!hasSelection) return;
    setSavedState("Saved");
    setStatus("Saved");
  }

  function addSelectedSku() {
    if (!hasSelection) return;
    setStatus("Selected SKU added");
  }

  return (
    <div className="wm-page-frame">
      <div className="wm-page-stack">
        <section className="wm-page-hero">
          <div className="wm-page-hero__top">
            <div className="wm-page-title-wrap">
              <div className="wm-page-kicker">Workspace</div>
              <h1 className="wm-page-title">Competitor Compare</h1>
              <p className="wm-page-subtitle">
                Search on the left, then review the fit, shortlist, and fallback mapping on the right.
              </p>
            </div>

            <div className="wm-page-actions">
              {hasSelection ? (
                <button
                  type="button"
                  className="wm-button wm-button--primary"
                  onClick={addSelectedSku}
                >
                  Add selected SKU
                </button>
              ) : null}

              {hasSelection ? (
                <button
                  type="button"
                  className="wm-button wm-button--ghost"
                  onClick={saveCompare}
                >
                  Save compare
                </button>
              ) : null}

              <Link to={WM_ROUTES.catalog} className="wm-button wm-button--ghost">
                Open catalogue
              </Link>
            </div>
          </div>
        </section>

        <div className="wm-layout-main-support">
          <main className="wm-main-rail">
            <section className="wm-section">
              <div className="wm-section__titleWrap">
                <div className="wm-section__eyebrow">Step 1</div>
                <h2 className="wm-section__title">Competitor lookup</h2>
                <p className="wm-section__subtitle">
                  Start with a brand and competitor SKU or model.
                </p>
              </div>

              <div className="wm-panel">
                <div className="wm-stack-normal">
                  <div>
                    <label htmlFor="compare-brand" className="wm-workspace-label">
                      Competitor brand
                    </label>
                    <select
                      id="compare-brand"
                      value={brand}
                      onChange={(event) => setBrand(event.target.value)}
                    >
                      {BRANDS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="compare-sku" className="wm-workspace-label">
                      Competitor SKU or model
                    </label>
                    <input
                      id="compare-sku"
                      type="text"
                      placeholder="Example: Zyper4K or DTP3-IN2004"
                      value={competitorSku}
                      onChange={(event) => setCompetitorSku(event.target.value)}
                    />
                  </div>

                  <div className="wm-action-row wm-action-row--result-driven">
                    <button
                      type="button"
                      className="wm-button wm-button--ghost"
                      onClick={clearSearch}
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      className="wm-button wm-button--primary"
                      disabled={!hasSearch}
                      onClick={lookupLive}
                    >
                      Look up live
                    </button>

                    {!hasSearch ? (
                      <span className="wm-action-hint">
                        Enter a competitor SKU to enable lookup.
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="wm-section">
              <div className="wm-grid-cards">
                <MetricCard label="Status" value={metrics.status} />
                <MetricCard label="Matches" value={metrics.matches} />
                <MetricCard label="Saved fit" value={metrics.saved} />
              </div>
            </section>
          </main>

          <aside className="wm-support-rail">
            <section className="wm-section">
              <div className="wm-section__titleWrap">
                <div className="wm-section__eyebrow">Step 2</div>
                <h2 className="wm-section__title">Comparison output</h2>
              </div>

              <div className={hasResults ? "wm-panel wm-result-ready" : "wm-panel wm-result-empty"}>
                <div className="wm-action-row">
                  <button
                    type="button"
                    className={tab === "fit" ? "wm-button wm-button--primary" : "wm-button wm-button--ghost"}
                    onClick={() => setTab("fit")}
                  >
                    Selected fit
                  </button>
                  <button
                    type="button"
                    className={tab === "shortlist" ? "wm-button wm-button--primary" : "wm-button wm-button--ghost"}
                    onClick={() => setTab("shortlist")}
                  >
                    Shortlist
                  </button>
                  <button
                    type="button"
                    className={tab === "manual" ? "wm-button wm-button--primary" : "wm-button wm-button--ghost"}
                    onClick={() => setTab("manual")}
                  >
                    Manual mapping
                  </button>
                </div>

                {!hasResults ? (
                  <div className="wm-empty-soft">
                    Search for a competitor SKU to populate the fit view.
                  </div>
                ) : null}

                {hasResults && tab === "fit" && result ? (
                  <div className="wm-stack-normal">
                    <div className="wm-list-row">
                      <div className="wm-list-row__title">{result.title}</div>
                      <div className="wm-list-row__text">{result.fitSummary}</div>
                    </div>

                    <div className="wm-list-row">
                      <div className="wm-list-row__title">Recommended WyreStorm SKU</div>
                      <div className="wm-list-row__text">{result.wyrestormSku}</div>
                    </div>

                    <div className="wm-stack-tight">
                      {result.reasons.map((item) => (
                        <div key={item} className="wm-list-row">
                          <div className="wm-list-row__text">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasResults && tab === "shortlist" && result ? (
                  <div className="wm-stack-tight">
                    {result.shortlist.map((sku) => (
                      <div key={sku} className="wm-list-row">
                        <div className="wm-list-row__title">{sku}</div>
                        <div className="wm-list-row__text">Alternative shortlist option</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {hasResults && tab === "manual" && result ? (
                  <div className="wm-stack-normal">
                    <div className="wm-list-row">
                      <div className="wm-list-row__title">Competitor reference</div>
                      <div className="wm-list-row__text">
                        {result.competitorBrand} | {result.competitorSku}
                      </div>
                    </div>

                    <div className="wm-list-row">
                      <div className="wm-list-row__title">Fallback mapping</div>
                      <div className="wm-list-row__text">
                        Use catalogue and product intelligence when an exact structured fit is not yet confirmed.
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
