import * as React from "react";
import { useNavigate } from "react-router-dom";
import compareSeed from "@/data/catalog/competitor-compare.seed.json";
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
  findComparisonRecord,
  searchComparisonRecords,
  toProjectCompareRecord,
} from "@/services/competitorComparisonService";

function confidenceClass(value: CompareConfidence): string {
  if (value === "High") return "wm-compare-confidence is-high";
  if (value === "Medium") return "wm-compare-confidence is-medium";
  return "wm-compare-confidence is-low";
}

export default function CompetitorComparePage() {
  const nav = useNavigate();
  const activeProject = getActiveProject();
  const items = compareSeed as CompetitorComparisonRecord[];

  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => searchComparisonRecords(items, query), [items, query]);
  const [selectedSku, setSelectedSku] = React.useState<string>(filtered[0]?.competitorSku ?? "");

  React.useEffect(() => {
    if (!filtered.some((item) => item.competitorSku === selectedSku)) {
      setSelectedSku(filtered[0]?.competitorSku ?? "");
    }
  }, [filtered, selectedSku]);

  const selected = React.useMemo(() => findComparisonRecord(filtered, selectedSku) ?? filtered[0] ?? null, [filtered, selectedSku]);

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

  return (
    <div className="wm-dashboard">
      <section className="wm-dashboard__hero">
        <div>
          <div className="wm-dashboard__eyebrow">Competitor Compare</div>
          <h1 className="wm-dashboard__title">Competitor SKU comparison tool</h1>
          <p className="wm-dashboard__subtitle">
            Search competitor SKUs, review the closest WyreStorm direction, and save the replacement logic into the active project.
          </p>

          <div className="wm-dashboard__meta">
            <span className="wm-chip">Records: {items.length}</span>
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

          <div className="wm-field-wrap" style={{ marginTop: 12 }}>
            <span className="wm-label">Search</span>
            <input
              className="wm-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. DM-NVX, OME, matrix, AVoIP"
            />
          </div>

          <div className="wm-project-list" style={{ marginTop: 14 }}>
            {filtered.length === 0 ? (
              <div className="wm-card__subtitle">No comparison records found.</div>
            ) : (
              filtered.map((item) => {
                const isSelected = selected?.competitorSku === item.competitorSku;
                return (
                  <button
                    key={`${item.brand}-${item.competitorSku}`}
                    type="button"
                    className="wm-project-row"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: isSelected
                        ? "linear-gradient(90deg, rgba(18,182,166,0.16), rgba(255,255,255,0.04))"
                        : undefined,
                      borderColor: isSelected ? "rgba(18,182,166,0.28)" : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedSku(item.competitorSku)}
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
                  <div className="wm-summary-row"><span>Category</span><strong>{selected.category}</strong></div>
                  <div className="wm-summary-row"><span>WyreStorm direction</span><strong>{selected.wyrestormSku}</strong></div>
                  <div className="wm-summary-row"><span>Category match</span><strong>{selected.wyrestormCategory}</strong></div>
                  <div className="wm-summary-row"><span>Confidence</span><strong>{selected.confidence}</strong></div>
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
                    {selected.features.map((feature) => (
                      <div className="wm-summary-row" key={feature}>
                        <span>Feature</span>
                        <strong>{feature}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="wm-card">
                  <div className="wm-card__title">Replacement rationale</div>
                  <div className="wm-card__subtitle">{selected.rationale}</div>

                  <div className="wm-summary-list">
                    {selected.notes.map((note) => (
                      <div className="wm-summary-row" key={note}>
                        <span>Check</span>
                        <strong>{note}</strong>
                      </div>
                    ))}
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



