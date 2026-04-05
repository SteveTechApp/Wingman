import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { buildTieredBom, type WingmanTier } from "@/app/logic/wingmanBomBuilder";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  applyVideoWallToProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";

type WallTechnology = "LCD" | "LED";

function clampPositive(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
}

export default function VideoWallPlannerRebuild() {
  const project = useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);

  const [technology, setTechnology] = useState<WallTechnology>("LCD");
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [sources, setSources] = useState(1);
  const [tier, setTier] = useState<WingmanTier>("Silver");
  const [status, setStatus] = useState("");

  const displays = rows * cols;

  const architecture = useMemo(() => {
    if (technology === "LED") {
      return {
        label: "LED processor system",
        summary: "Processor-led LED workflow.",
      };
    }

    if (displays <= 6 && sources <= 2) {
      return {
        label: "Video wall processor",
        summary: "Compact processor-based LCD wall.",
      };
    }

    return {
      label: "AV over IP video wall",
      summary: "Scalable network-distributed wall.",
    };
  }, [technology, displays, sources]);

  const bom = useMemo(() => {
    return buildTieredBom("Video Wall Processor", tier, { sources, displays });
  }, [tier, sources, displays]);

  function saveWall() {
    const active = ensureActiveProject({
      name: project?.name || "Video Wall",
      roomName: project?.roomName || "Video Wall",
      stage: "Design",
      status: project?.status || "Draft",
      notes: project?.notes || "",
    });

    setActiveProjectId(active.id);

    applyVideoWallToProject(active.id, {
      technology,
      rows,
      cols,
      sourceCount: sources,
      panelCount: displays,
      widthM: active.videowall?.widthM || cols,
      heightM: active.videowall?.heightM || rows,
      diagonalIn: active.videowall?.diagonalIn || 0,
      outputRows: rows,
      outputCols: cols,
      designTier: tier,
      summary: architecture.summary,
      processorRecommendation: architecture.label,
      createdAt: active.videowall?.createdAt || new Date().toISOString(),
    });

    setStatus(`${rows} x ${cols} ${technology} wall saved to the active project.`);
  }

  return (
    <div className="wm-page-frame">
      <div className="wm-page-stack">
        <section className="wm-page-hero">
          <div className="wm-page-title-wrap">
            <div className="wm-page-kicker">Video Wall Planner</div>
            <h1 className="wm-page-title">Define the wall, validate the architecture, then move into BOM and proposal.</h1>
            <p className="wm-page-subtitle">
              Keep the core wall definition visible, with architecture and BOM guidance alongside it.
            </p>
          </div>
        </section>

        <div className="wm-layout-main-support">
          <aside className="wm-support-rail">
            <section className="wm-section">
              <div className="wm-section__titleWrap">
                <div className="wm-section__eyebrow">Inputs</div>
                <h2 className="wm-section__title">Wall setup</h2>
              </div>

              <div className="wm-panel">
                <div>
                  <label htmlFor="vw-tech" className="wm-workspace-label">Technology</label>
                  <select
                    id="vw-tech"
                    value={technology}
                    onChange={(e) => setTechnology(e.target.value as WallTechnology)}
                  >
                    <option value="LCD">LCD</option>
                    <option value="LED">LED</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="vw-rows" className="wm-workspace-label">Rows</label>
                  <input
                    id="vw-rows"
                    type="number"
                    min="1"
                    value={rows}
                    onChange={(e) => setRows(clampPositive(e.target.value, 1))}
                  />
                </div>

                <div>
                  <label htmlFor="vw-cols" className="wm-workspace-label">Columns</label>
                  <input
                    id="vw-cols"
                    type="number"
                    min="1"
                    value={cols}
                    onChange={(e) => setCols(clampPositive(e.target.value, 1))}
                  />
                </div>

                <div>
                  <label htmlFor="vw-sources" className="wm-workspace-label">Sources</label>
                  <input
                    id="vw-sources"
                    type="number"
                    min="1"
                    value={sources}
                    onChange={(e) => setSources(clampPositive(e.target.value, 1))}
                  />
                </div>

                <div>
                  <label className="wm-workspace-label">Tier</label>
                  <div className="wm-card__meta">
                    {(["Bronze", "Silver", "Gold"] as WingmanTier[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={tier === item ? "wm-button wm-button--primary" : "wm-button wm-button--ghost"}
                        onClick={() => setTier(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <main className="wm-main-rail">
            <section className="wm-section">
              <div className="wm-section__titleWrap">
                <div className="wm-section__eyebrow">Architecture</div>
                <h2 className="wm-section__title">Recommended solution</h2>
              </div>

              <div className="wm-panel wm-panel--accent">
                <div className="wm-panel__titleWrap">
                  <h3 className="wm-panel__title">{architecture.label}</h3>
                  <p className="wm-panel__subtitle">{architecture.summary}</p>
                </div>

                <div className="wm-grid-cards">
                  <div className="wm-card wm-card--insight">
                    <div className="wm-card__title">Wall size</div>
                    <div className="wm-card__text">{rows} x {cols}</div>
                  </div>
                  <div className="wm-card wm-card--insight">
                    <div className="wm-card__title">Displays</div>
                    <div className="wm-card__text">{displays}</div>
                  </div>
                  <div className="wm-card wm-card--insight">
                    <div className="wm-card__title">Sources</div>
                    <div className="wm-card__text">{sources}</div>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <aside className="wm-support-rail">
            <section className="wm-section">
              <div className="wm-section__titleWrap">
                <div className="wm-section__eyebrow">BOM</div>
                <h2 className="wm-section__title">Suggested hardware</h2>
              </div>

              <div className="wm-panel">
                <div className="wm-stack-tight">
                  {bom.length > 0 ? (
                    bom.map((item) => (
                      <div key={`${item.sku}-${item.role}`} className="wm-list-row">
                        <div className="wm-list-row__title">{item.sku}</div>
                        <div className="wm-list-row__text">
                          {item.role} | Qty {item.qty}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="wm-list-row__text">No BOM guidance generated.</div>
                  )}
                </div>

                <div className="wm-action-row">
                  <button type="button" className="wm-button wm-button--ghost" onClick={saveWall}>
                    Save wall
                  </button>
                  <Link to={WM_ROUTES.catalog} className="wm-button wm-button--ghost">
                    Open catalogue
                  </Link>
                  <Link to={WM_ROUTES.proposal} className="wm-button wm-button--primary">
                    Build proposal
                  </Link>
                </div>
              </div>
            </section>

            {status ? (
              <section className="wm-section">
                <div className="wm-panel wm-panel--soft">
                  <div className="wm-panel__subtitle">{status}</div>
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
