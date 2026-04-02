import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import CompetitorManualComparisonPanel from "@/components/competitor/CompetitorManualComparisonPanel";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  subscribeProjects,
  updateProject,
} from "@/features/projects/projectStore";
import { addLineToSavedProposal } from "@/proposal/bom/store";
import { getComparisonRecords } from "@/services/competitorComparisonService";
import {
  deleteManualCompetitorComparison,
  getManualCompetitorComparisonRecords,
  upsertManualCompetitorComparison,
} from "@/services/manualCompetitorComparisonStore";
import {
  searchCompetitorComparisons,
  verifyCompetitorComparisonLive,
  type CompetitorCompareCandidate,
} from "@/services/competitorCompareSearch";
import "./competitor-compare-page.css";

type Panel = "fit" | "shortlist" | "manual";

function tidy(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSku(value: unknown) {
  return tidy(value).toUpperCase();
}

function buildBrands(preferred?: string) {
  const brands = new Set(["Atlona", "Crestron", "Extron", "Kramer", "Lightware", "ZeeVee"]);
  for (const record of getComparisonRecords()) brands.add(tidy(record.brand));
  for (const record of getManualCompetitorComparisonRecords()) brands.add(tidy(record.brand));
  if (preferred) brands.add(preferred);
  return Array.from(brands).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export default function CompetitorComparePage() {
  const project = useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const brands = useMemo(() => buildBrands(project?.compare?.brand), [project?.compare?.brand, refreshKey]);
  const [brand, setBrand] = useState(() => project?.compare?.brand || brands[0] || "Extron");
  const [query, setQuery] = useState(() => project?.compare?.competitorSku || "");
  const deferredQuery = useDeferredValue(query);
  const [panel, setPanel] = useState<Panel>("fit");
  const [selectedId, setSelectedId] = useState("");
  const [selectedSku, setSelectedSku] = useState(() => project?.compare?.wyrestormSku || "");
  const [liveCandidate, setLiveCandidate] = useState<CompetitorCompareCandidate | null>(null);
  const [status, setStatus] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    setBrand(project?.compare?.brand || brands[0] || "Extron");
    setQuery(project?.compare?.competitorSku || "");
    setSelectedId("");
    setSelectedSku(project?.compare?.wyrestormSku || "");
    setLiveCandidate(null);
    setPanel("fit");
    setStatus("");
    setSaveMessage("");
  }, [project?.id]);

  const searchResult = useMemo(
    () => searchCompetitorComparisons(brand, deferredQuery),
    [brand, deferredQuery, refreshKey],
  );

  const candidates = useMemo(() => {
    const out: CompetitorCompareCandidate[] = [];
    const seen = new Set<string>();
    for (const candidate of [liveCandidate, ...searchResult.candidates]) {
      if (!candidate || seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      out.push(candidate);
    }
    return out;
  }, [liveCandidate, searchResult.candidates]);

  useEffect(() => {
    if (!brands.includes(brand)) setBrand(brands[0] || "Extron");
  }, [brand, brands]);

  useEffect(() => {
    if (candidates.length === 0) {
      setSelectedId("");
      return;
    }
    if (candidates.some((candidate) => candidate.id === selectedId)) return;
    const saved = candidates.find(
      (candidate) => normalizeSku(candidate.comparison.competitorSku) === normalizeSku(project?.compare?.competitorSku),
    );
    setSelectedId(saved?.id || candidates[0].id);
  }, [candidates, project?.compare?.competitorSku, selectedId]);

  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedId) || candidates[0];

  useEffect(() => {
    if (!selectedCandidate) {
      setSelectedSku("");
      return;
    }
    if (selectedCandidate.options.some((option: any) => option.wyrestormSku === selectedSku)) return;
    setSelectedSku(
      project?.compare?.wyrestormSku ||
      selectedCandidate.primaryOption?.wyrestormSku ||
      selectedCandidate.options[0]?.wyrestormSku ||
      selectedCandidate.comparison.wyrestormSku ||
      "",
    );
  }, [project?.compare?.wyrestormSku, selectedCandidate, selectedSku]);

  const selectedOption =
    selectedCandidate?.options.find((option: any) => option.wyrestormSku === selectedSku) ||
    selectedCandidate?.primaryOption ||
    selectedCandidate?.options[0];

  async function handleLiveLookup() {
    if (!brand || tidy(query).length < 2) {
      setStatus("Choose a brand and type at least two characters before using live lookup.");
      return;
    }
    setIsLookingUp(true);
    try {
      const result = await verifyCompetitorComparisonLive(brand, query);
      setLiveCandidate(result.candidate || null);
      if (result.candidate) {
        setSelectedId(result.candidate.id);
        setPanel("fit");
        setStatus(`Live lookup verified ${result.candidate.comparison.competitorSku}.`);
      } else {
        setStatus("Live lookup completed, but no comparison record was returned.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Live lookup failed.");
    } finally {
      setIsLookingUp(false);
    }
  }

  function saveCompare() {
    if (!selectedCandidate) {
      setStatus("Choose a comparison before saving it.");
      return;
    }
    const active = ensureActiveProject({
      name: project?.name || `${brand} comparison`,
      roomName: project?.roomName || "Competitor Compare",
      stage: "Compare",
      status: project?.status || "Draft",
    });
    setActiveProjectId(active.id);
    const compare = {
      brand: tidy(selectedCandidate.comparison.brand),
      competitorSku: normalizeSku(selectedCandidate.comparison.competitorSku),
      category: tidy(selectedCandidate.comparison.category),
      summary: tidy(selectedCandidate.comparison.summary) || undefined,
      features: selectedCandidate.comparison.features || [],
      wyrestormSku: normalizeSku(selectedOption?.wyrestormSku || selectedCandidate.comparison.wyrestormSku),
      wyrestormName: tidy(selectedOption?.wyrestormName || selectedCandidate.comparison.wyrestormName) || undefined,
      wyrestormCategory:
        tidy(selectedOption?.wyrestormCategory || selectedCandidate.comparison.wyrestormCategory) || "WyreStorm shortlist",
      wyrestormVerified: selectedCandidate.comparison.wyrestormVerified,
      confidence: selectedOption?.fitConfidence || selectedCandidate.comparison.confidence,
      rationale:
        tidy(selectedOption?.positioningSummary) ||
        tidy(selectedOption?.salesStory?.[0]) ||
        tidy(selectedCandidate.comparison.rationale) ||
        undefined,
      recommendedFamilies: selectedCandidate.comparison.recommendedFamilies,
      notes: [
        ...(selectedOption?.salesStory || []),
        ...(selectedOption?.cautions || []),
        ...(selectedCandidate.comparison.notes || []),
      ].slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    updateProject(active.id, {
      stage: "Compare",
      compare,
      catalog: {
        ...(active.catalog || {}),
        selectedBrand: "WyreStorm",
        skus: Array.from(new Set([...(active.catalog?.skus || []), compare.wyrestormSku])),
      },
    });
    setStatus(`${compare.competitorSku} -> ${compare.wyrestormSku} was saved to the active project.`);
  }

  function addToProposal() {
    if (!selectedOption) {
      setStatus("Choose a WyreStorm fit before adding a SKU.");
      return;
    }
    const active = ensureActiveProject({
      name: project?.name || `${brand} comparison`,
      roomName: project?.roomName || "Competitor Compare",
      stage: project?.stage || "Compare",
      status: project?.status || "Draft",
    });
    setActiveProjectId(active.id);
    addLineToSavedProposal(
      {
        sku: selectedOption.wyrestormSku,
        name: selectedOption.wyrestormName || selectedOption.wyrestormSku,
        source: "Compare",
      },
      active.id,
    );
    setStatus(`${selectedOption.wyrestormSku} was added to the saved proposal lines.`);
  }

  const left = (
    <div className="wm-workspace-stack wm-compare-page__column">
      <div className="wm-start-step">
        Keep the competitor search on the left, then review the selected fit and support detail on the right without losing the query.
      </div>

      <section className="wm-workspace-card wm-compare-page__search-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Competitor search</h3>
          <p className="wm-workspace-card__copy">Search the local library first, then use live lookup if the SKU is missing or needs confirmation.</p>
        </div>
        <div className="wm-workspace-form">
          <div className="wm-workspace-field">
            <label htmlFor="compare-brand" className="wm-workspace-label">Competitor brand</label>
            <select id="compare-brand" className="wm-select-dark" value={brand} onChange={(event) => setBrand(event.target.value)}>
              {brands.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="wm-workspace-field">
            <label htmlFor="compare-query" className="wm-workspace-label">Competitor SKU or model</label>
            <input
              id="compare-query"
              className="wm-input-dark"
              type="text"
              placeholder="Example: Zyper4K or DTP3-IN2004"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="wm-workspace-action-row">
            <button type="button" className="wm-btn-secondary" onClick={() => setQuery("")}>Clear</button>
            <button type="button" className="wm-btn-primary" onClick={() => { void handleLiveLookup(); }} disabled={isLookingUp}>
              {isLookingUp ? "Looking up..." : "Look up live"}
            </button>
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-grid-3 wm-compare-page__signal-grid">
          <div className="wm-workspace-metric"><span>Status</span><strong>{searchResult.status}</strong></div>
          <div className="wm-workspace-metric"><span>Matches</span><strong>{candidates.length}</strong></div>
          <div className="wm-workspace-metric"><span>Saved fit</span><strong>{project?.compare?.wyrestormSku || "Not saved"}</strong></div>
        </div>
        <div className="wm-next-step">{searchResult.summary}</div>
      </section>
    </div>
  );

  const right = (
    <div className="wm-workspace-stack wm-compare-page__column wm-compare-page__column--output">
      <section className="wm-workspace-card wm-compare-page__output-card">
        <div className="wm-workspace-tab-row wm-compare-page__tabs">
          <button type="button" className={`wm-workspace-tab${panel === "fit" ? " wm-workspace-tab--active" : ""}`} onClick={() => setPanel("fit")}>Selected fit</button>
          <button type="button" className={`wm-workspace-tab${panel === "shortlist" ? " wm-workspace-tab--active" : ""}`} onClick={() => setPanel("shortlist")}>Shortlist</button>
          <button type="button" className={`wm-workspace-tab${panel === "manual" ? " wm-workspace-tab--active" : ""}`} onClick={() => setPanel("manual")}>Manual mapping</button>
        </div>

        {panel === "fit" ? (
          selectedCandidate ? (
            <div className="wm-workspace-tabpanel wm-compare-page__fit-stage">
              <div className="wm-workspace-card wm-workspace-card--muted wm-compare-page__headline">
                <div className="wm-workspace-card__header">
                  <span className="wm-workspace-list-item__eyebrow">{selectedCandidate.comparison.brand} {selectedCandidate.comparison.competitorSku}</span>
                  <h3 className="wm-workspace-card__title">{selectedCandidate.comparison.competitorName || selectedCandidate.comparison.category}</h3>
                  <p className="wm-workspace-card__copy">{selectedCandidate.comparison.summary}</p>
                </div>
              </div>

              <div className="wm-workspace-list wm-compare-page__options">
                {selectedCandidate.options.slice(0, 4).map((option: any) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`wm-workspace-list-item${selectedOption?.id === option.id ? " wm-workspace-list-item--active" : ""}`}
                    onClick={() => setSelectedSku(option.wyrestormSku)}
                  >
                    <span className="wm-workspace-list-item__eyebrow">{option.fitConfidence} fit</span>
                    <span className="wm-workspace-list-item__title">{option.wyrestormSku}</span>
                    <span className="wm-workspace-list-item__copy">{option.positioningSummary}</span>
                  </button>
                ))}
              </div>

              {selectedOption ? (
                <>
                  <div className="wm-compare-page__detail-grid">
                    <div className="wm-workspace-list wm-compare-page__support-list">
                    {[...(selectedOption.salesStory || []), ...(selectedOption.cautions || [])].slice(0, 6).map((item: string) => (
                      <div key={item} className="wm-workspace-list-item">
                        <span className="wm-workspace-list-item__title">Support</span>
                        <span className="wm-workspace-list-item__copy">{item}</span>
                      </div>
                    ))}
                    </div>
                    {selectedOption.matrix?.length ? (
                    <div className="wm-workspace-table-wrap wm-compare-page__matrix">
                      <table className="wm-workspace-table">
                        <thead>
                          <tr><th>Check</th><th>Competitor</th><th>WyreStorm</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {selectedOption.matrix.slice(0, 8).map((row: any) => (
                            <tr key={row.id}>
                              <td>{row.label}</td>
                              <td>{row.competitorValue}</td>
                              <td>{row.wyrestormValue}</td>
                              <td>{row.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    ) : null}
                  </div>
                  <div className="wm-workspace-action-row wm-compare-page__actions">
                    <button type="button" className="wm-btn-secondary" onClick={saveCompare}>Save compare</button>
                    <button type="button" className="wm-btn-primary" onClick={addToProposal}>Add selected SKU</button>
                    <Link to={WM_ROUTES.proposal} className="wm-btn">Open proposal</Link>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="wm-workspace-empty">Search for a competitor SKU to populate the fit view.</div>
          )
        ) : panel === "shortlist" ? (
          <div className="wm-workspace-tabpanel wm-compare-page__shortlist">
            <div className="wm-workspace-list wm-compare-page__shortlist-list">
              {candidates.length ? candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={`wm-workspace-list-item${selectedCandidate?.id === candidate.id ? " wm-workspace-list-item--active" : ""}`}
                  onClick={() => {
                    setSelectedId(candidate.id);
                    setPanel("fit");
                  }}
                >
                  <span className="wm-workspace-list-item__eyebrow">{candidate.searchConfidence} confidence</span>
                  <span className="wm-workspace-list-item__title">{candidate.comparison.competitorSku}</span>
                  <span className="wm-workspace-list-item__copy">{candidate.primaryOption?.wyrestormSku || candidate.comparison.wyrestormSku}</span>
                </button>
              )) : <div className="wm-workspace-empty">No local compare records matched this query yet.</div>}
            </div>
            <div className="wm-workspace-list">
              {searchResult.salesAdvice.map((item) => (
                <div key={item} className="wm-workspace-list-item">
                  <span className="wm-workspace-list-item__title">Talk track</span>
                  <span className="wm-workspace-list-item__copy">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="wm-workspace-tabpanel wm-compare-page__manual-stage">
            <CompetitorManualComparisonPanel
              brand={brand}
              query={query}
              selectedCandidate={selectedCandidate}
              selectedOption={selectedOption}
              saveMessage={saveMessage}
              feedbackSummary={searchResult.summary}
              onSave={(input) => {
                const record = upsertManualCompetitorComparison(input);
                setRefreshKey((value) => value + 1);
                setBrand(record.brand);
                setQuery(record.competitorSku);
                setPanel("shortlist");
                setSaveMessage(`${record.brand} ${record.competitorSku} is now searchable in the local comparison library.`);
              }}
              onDelete={(nextBrand, competitorSku) => {
                deleteManualCompetitorComparison(nextBrand, competitorSku);
                setRefreshKey((value) => value + 1);
                setSaveMessage(`${nextBrand} ${normalizeSku(competitorSku)} was removed from the manual comparison library.`);
              }}
            />
          </div>
        )}
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Competitor Compare"
      subtitle="Search on the left, then keep the fit, shortlist, and manual fallback in separate right-side tabs so the page stays clean."
      leftTitle="Search"
      rightTitle="Comparison Output"
      left={left}
      right={right}
      top={
        <div className="wm-workspace-action-row">
          <button type="button" className="wm-btn-secondary" onClick={saveCompare}>Save compare</button>
          <button type="button" className="wm-btn-primary" onClick={addToProposal}>Add selected SKU</button>
          <Link to={WM_ROUTES.catalog} className="wm-btn">Open catalogue</Link>
        </div>
      }
      bottom={status ? <div className="wm-workspace-empty">{status}</div> : null}
    />
  );
}
