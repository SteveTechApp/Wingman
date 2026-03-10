import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  applyCompareToProject,
  createProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  type CompareConfidence,
} from "@/features/projects/projectStore";
import {
  type CompetitorComparisonRecord,
  findComparisonRecordById,
  getComparisonRecords,
  lookupAndCompare,
  mergeComparisonRecords,
  searchComparisonRecords,
  toProjectCompareRecord,
} from "@/services/competitorComparisonService";

type LookupUiState = {
  status: "idle" | "loading" | "ready" | "empty" | "failed";
  message: string;
  warnings: string[];
};

function confidenceClass(value: CompareConfidence): string {
  if (value === "High") return "wm-compare-confidence is-high";
  if (value === "Medium") return "wm-compare-confidence is-medium";
  return "wm-compare-confidence is-low";
}

function recordId(item: CompetitorComparisonRecord): string {
  return `${item.brand}::${item.competitorSku}`.toLowerCase();
}

function lookupStateClass(status: LookupUiState["status"]): string {
  return `wm-compare-lookup-state is-${status}`;
}

export default function CompetitorComparePage() {
  const nav = useNavigate();
  const activeProject = getActiveProject();

  const curatedRecords = React.useMemo(() => getComparisonRecords(), []);
  const curatedCount = curatedRecords.length;

  const [records, setRecords] = React.useState<CompetitorComparisonRecord[]>(curatedRecords);
  const [query, setQuery] = React.useState("");
  const [lookupState, setLookupState] = React.useState<LookupUiState>({
    status: "idle",
    message: "Type a competitor brand/SKU and run lookup to enrich the comparison database.",
    warnings: [],
  });

  const filtered = React.useMemo(() => searchComparisonRecords(records, query), [records, query]);
  const [selectedId, setSelectedId] = React.useState<string>(filtered[0] ? recordId(filtered[0]) : "");

  React.useEffect(() => {
    if (!filtered.some((item) => recordId(item) === selectedId)) {
      setSelectedId(filtered[0] ? recordId(filtered[0]) : "");
    }
  }, [filtered, selectedId]);

  const selected = React.useMemo(
    () => findComparisonRecordById(filtered, selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  const enrichedCount = Math.max(0, records.length - curatedCount);

  const applyToActiveProject = () => {
    if (!selected) return;

    const active = ensureActiveProject({
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: activeProject?.roomName || "Replacement Opportunity",
      stage: "Specify",
      status: activeProject?.status || "Draft",
    });

    applyCompareToProject(active.id, toProjectCompareRecord(selected));
    setActiveProjectId(active.id);
    nav(`/app/projects/${encodeURIComponent(active.id)}`);
  };

  const createReplacementProject = () => {
    if (!selected) return;

    const payload = toProjectCompareRecord(selected);
    const created = createProject({
      name: `${selected.brand} ${selected.competitorSku} replacement`,
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: "Replacement Opportunity",
      stage: "Specify",
      status: "Draft",
      notes: `${selected.summary}\n\nRationale: ${selected.rationale}`,
      compare: payload,
      discovery: {
        customer: activeProject?.customer || "Sample customer",
        site: activeProject?.site || "",
        roomName: "Replacement Opportunity",
        applicationType: selected.category,
        notes: `${selected.summary}\n\nRationale: ${selected.rationale}`,
        recommendedFamilies: selected.recommendedFamilies,
        createdAt: new Date().toISOString(),
      },
    });

    setActiveProjectId(created.id);
    nav(`/app/projects/${encodeURIComponent(created.id)}`);
  };

  const runLookup = async () => {
    const lookupQuery = query.trim();
    if (!lookupQuery) {
      setLookupState({
        status: "empty",
        message: "Enter a competitor brand, model number, or SKU first.",
        warnings: [],
      });
      return;
    }

    setLookupState({
      status: "loading",
      message: `Looking up ${lookupQuery}...`,
      warnings: [],
    });

    try {
      const result = await lookupAndCompare(lookupQuery);
      if (result.records.length === 0) {
        setLookupState({
          status: "empty",
          message: `No match returned for ${lookupQuery}.`,
          warnings: result.lookup.warnings,
        });
        return;
      }

      setRecords((current) => mergeComparisonRecords(result.records, current));
      setSelectedId(recordId(result.records[0]));

      const cacheSuffix = result.lookup.provenance.cacheHit ? " (cached)" : "";
      setLookupState({
        status: "ready",
        message: `Lookup complete via ${result.lookup.provenance.label}${cacheSuffix}.`,
        warnings: result.lookup.warnings,
      });
    } catch {
      setLookupState({
        status: "failed",
        message: "Lookup failed unexpectedly. Curated records are still available.",
        warnings: [],
      });
    }
  };

  return (
    <div className="wm-dashboard">
      <section className="wm-dashboard__hero">
        <div>
          <div className="wm-dashboard__eyebrow">Competitor Compare</div>
          <h1 className="wm-dashboard__title">Competitor SKU comparison tool</h1>
          <p className="wm-dashboard__subtitle">
            Search competitor SKUs, run live enrichment lookup, review the closest WyreStorm direction, and save the replacement logic into the active project.
          </p>

          <div className="wm-dashboard__meta">
            <span className="wm-chip">Curated records: {curatedCount}</span>
            <span className="wm-chip">Lookup records: {enrichedCount}</span>
            <span className="wm-chip">Active project: {activeProject?.name || "None"}</span>
          </div>
        </div>

        <div className="wm-dashboard__heroactions">
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/dashboard")}>
            Dashboard
          </button>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/projects")}>
            Projects
          </button>
          <button type="button" className="wm-btn wm-btn--primary" onClick={createReplacementProject} disabled={!selected}>
            Create Replacement Project
          </button>
        </div>
      </section>

      <section className="wm-page-grid-sidebar">
        <div className="wm-card">
          <div className="wm-card__title">Search competitor SKUs</div>
          <div className="wm-card__subtitle">Search by brand, SKU, category, feature, or WyreStorm direction.</div>

          <div className="wm-field-wrap wm-compare-search-field">
            <span className="wm-label">Search</span>
            <input
              className="wm-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runLookup();
                }
              }}
              placeholder="e.g. Crestron DM-NVX-360 or OME-MS42"
            />
          </div>

          <div className="wm-compare-search-actions">
            <button
              type="button"
              className="wm-btn wm-btn--primary"
              onClick={() => {
                void runLookup();
              }}
              disabled={lookupState.status === "loading"}
            >
              {lookupState.status === "loading" ? "Looking up..." : "Lookup Brand / Model"}
            </button>
          </div>

          <div className={lookupStateClass(lookupState.status)}>{lookupState.message}</div>
          {lookupState.warnings.length > 0 ? (
            <div className="wm-compare-warning-list">
              {lookupState.warnings.map((warning) => (
                <div key={warning} className="wm-compare-warning-item">{warning}</div>
              ))}
            </div>
          ) : null}

          <div className="wm-project-list wm-compare-result-list">
            {filtered.length === 0 ? (
              <div className="wm-card__subtitle">No comparison records found.</div>
            ) : (
              filtered.map((item) => {
                const isSelected = selected ? recordId(selected) === recordId(item) : false;
                return (
                  <button
                    key={recordId(item)}
                    type="button"
                    className={`wm-project-row wm-compare-row${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedId(recordId(item))}
                  >
                    <div className="wm-project-row__main">
                      <div className="wm-project-row__name">{item.brand} {item.competitorSku}</div>
                      <div className="wm-project-row__customer">{item.category}</div>
                    </div>
                    <div className="wm-project-row__stage">{item.wyrestormCategory}</div>
                    <div className="wm-project-row__updated">{item.confidence}</div>
                    <div className="wm-project-row__actions">
                      <span className={`wm-compare-confidence ${confidenceClass(item.confidence)}`}>{item.confidence}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="wm-section-stack">
          {selected ? (
            <>
              <div className="wm-card">
                <div className="wm-card__title">{selected.brand} {selected.competitorSku}</div>
                <div className="wm-card__subtitle">{selected.summary}</div>

                <div className="wm-summary-list">
                  <div className="wm-summary-row"><span>Brand</span><strong>{selected.brand}</strong></div>
                  <div className="wm-summary-row"><span>Competitor SKU</span><strong>{selected.competitorSku}</strong></div>
                  {selected.competitorName ? (
                    <div className="wm-summary-row"><span>Competitor model name</span><strong>{selected.competitorName}</strong></div>
                  ) : null}
                  <div className="wm-summary-row"><span>Category</span><strong>{selected.category}</strong></div>
                  <div className="wm-summary-row"><span>WyreStorm direction</span><strong>{selected.wyrestormSku}</strong></div>
                  <div className="wm-summary-row"><span>Category match</span><strong>{selected.wyrestormCategory}</strong></div>
                  <div className="wm-summary-row"><span>Confidence</span><strong>{selected.confidence}</strong></div>
                  {typeof selected.matchScore === "number" ? (
                    <div className="wm-summary-row"><span>Match score</span><strong>{selected.matchScore}/100</strong></div>
                  ) : null}
                  {selected.ioComparison ? (
                    <div className="wm-summary-row"><span>I/O alignment</span><strong>{selected.ioComparison}</strong></div>
                  ) : null}
                  {selected.provenance ? (
                    <div className="wm-summary-row">
                      <span>Data source</span>
                      <strong>
                        {selected.provenance.label}
                        {selected.provenance.cacheHit ? " (cached)" : ""}
                      </strong>
                    </div>
                  ) : null}
                </div>

                <div className="wm-inline-actions">
                  {selected.recommendedFamilies.map((family) => (
                    <span key={family} className="wm-chip">{family}</span>
                  ))}
                </div>
              </div>

              <div className="wm-page-grid-2">
                <div className="wm-card">
                  <div className="wm-card__title">Feature view</div>
                  <div className="wm-card__subtitle">Useful comparison points to discuss during replacement positioning.</div>

                  <div className="wm-summary-list">
                    {selected.features.length > 0 ? (
                      selected.features.map((feature) => (
                        <div className="wm-summary-row" key={feature}>
                          <span>Feature</span>
                          <strong>{feature}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="wm-summary-row">
                        <span>Feature</span>
                        <strong>No feature detail captured.</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="wm-card">
                  <div className="wm-card__title">Replacement rationale</div>
                  <div className="wm-card__subtitle">{selected.rationale}</div>

                  <div className="wm-summary-list">
                    {selected.notes.length > 0 ? (
                      selected.notes.map((note) => (
                        <div className="wm-summary-row" key={note}>
                          <span>Check</span>
                          <strong>{note}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="wm-summary-row">
                        <span>Check</span>
                        <strong>No additional checks captured.</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="wm-card">
                <div className="wm-card__title">Project target</div>
                <div className="wm-card__subtitle">
                  {activeProject
                    ? `Current active project: ${activeProject.name}`
                    : "No active project selected. Applying will create or use a live project record."}
                </div>

                <div className="wm-summary-list">
                  <div className="wm-summary-row"><span>Customer</span><strong>{activeProject?.customer || "Sample customer"}</strong></div>
                  <div className="wm-summary-row"><span>Site</span><strong>{activeProject?.site || "Not set"}</strong></div>
                  <div className="wm-summary-row"><span>Current stage</span><strong>{activeProject?.stage || "Discovery"}</strong></div>
                </div>

                <div className="wm-inline-actions">
                  <button type="button" className="wm-btn wm-btn--primary" onClick={applyToActiveProject}>
                    Apply To Active Project
                  </button>
                  <button type="button" className="wm-btn wm-btn--ghost" onClick={createReplacementProject}>
                    Create New Replacement Project
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="wm-card">
              <div className="wm-card__title">No comparison selected</div>
              <div className="wm-card__subtitle">Choose a competitor SKU from the list to review the replacement path.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
