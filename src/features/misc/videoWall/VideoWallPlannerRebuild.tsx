import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { buildTieredBom, type WingmanTier } from "@/app/logic/wingmanBomBuilder";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  applyVideoWallToProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";

type WallTechnology = "LCD" | "LED";
type DriveMode = "Single canvas" | "Multiview canvas" | "Addressed panels";
type Panel = "solution" | "bom" | "checks";
type WallPathMode = "local-processor" | "networkhd-120" | "networkhd-500";

function clampPositive(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
}

function inferDriveMode(project?: ReturnType<typeof getActiveProject>): DriveMode {
  if (project?.videowall?.wallGoal === "pip") return "Multiview canvas";
  if (project?.videowall?.buildMethod === "per-display") return "Addressed panels";
  return "Single canvas";
}

function deriveDraft(project?: ReturnType<typeof getActiveProject>) {
  const stored = project?.videowall;
  const discoveryDisplays = clampPositive(project?.discovery?.displayCount || 4, 4);
  const rows = clampPositive(stored?.rows || Math.round(Math.sqrt(discoveryDisplays)), 2);
  const cols = clampPositive(stored?.cols || Math.ceil(discoveryDisplays / rows), 2);
  const tier =
    stored?.designTier ||
    (project?.proposal?.selectedTier === "Bronze" || project?.proposal?.selectedTier === "Silver" || project?.proposal?.selectedTier === "Gold"
      ? project.proposal.selectedTier
      : "Silver");

  return {
    technology:
      stored?.technology ||
      (String(project?.discovery?.applicationType || "").toLowerCase().includes("led") ? "LED" : "LCD"),
    rows,
    cols,
    sources: clampPositive(stored?.sourceCount || project?.discovery?.sourceCount || 1, 1),
    driveMode: inferDriveMode(project),
    tier,
  };
}

function buildArchitecture(
  technology: WallTechnology,
  driveMode: DriveMode,
  displays: number,
  sources: number,
): { label: string; bomArchitecture: string; pathMode: WallPathMode; summary: string } {
  if (technology === "LED") {
    return {
      label: "LED processor system",
      bomArchitecture: "Video Wall Processor",
      pathMode: "local-processor" as const,
      summary: "LED walls are processor-led first, so the controller and canvas behavior should be confirmed before the BOM is locked.",
    };
  }
  if (driveMode === "Single canvas" && displays <= 6 && sources <= 2) {
    return {
      label: "Video wall processor",
      bomArchitecture: "Video Wall Processor",
      pathMode: "local-processor" as const,
      summary: "A dedicated processor is usually the cleanest answer for compact fixed-layout LCD walls.",
    };
  }
  return {
    label: "AV over IP video wall",
    bomArchitecture: "AV over IP Video Wall",
    pathMode: sources >= 3 ? "networkhd-500" : "networkhd-120",
    summary: "Distributed routing is the safer answer when the wall needs more source flexibility, multiview behavior, or future growth.",
  };
}

export default function VideoWallPlannerRebuild() {
  const project = useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const [panel, setPanel] = useState<Panel>("solution");
  const [technology, setTechnology] = useState<WallTechnology>("LCD");
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [sources, setSources] = useState(1);
  const [driveMode, setDriveMode] = useState<DriveMode>("Single canvas");
  const [tier, setTier] = useState<WingmanTier>("Silver");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const draft = deriveDraft(project);
    setTechnology(draft.technology);
    setRows(draft.rows);
    setCols(draft.cols);
    setSources(draft.sources);
    setDriveMode(draft.driveMode);
    setTier(draft.tier);
    setPanel("solution");
    setStatus("");
  }, [project?.id]);

  const displays = rows * cols;
  const architecture = useMemo(
    () => buildArchitecture(technology, driveMode, displays, sources),
    [technology, driveMode, displays, sources],
  );
  const bom = useMemo(
    () => buildTieredBom(architecture.bomArchitecture, tier, { sources, displays }),
    [architecture.bomArchitecture, tier, sources, displays],
  );
  const warnings = useMemo(() => {
    const items = ["Confirm wall dimensions, content behavior, and control expectations before final quote issue."];
    if (technology === "LED") items.push("LED walls need processor capacity, cabinet planning, and pixel-pitch expectations confirmed with the display supplier.");
    if (driveMode === "Multiview canvas") items.push("Define the multiview behavior early so the processor and source workflow are not undersized.");
    if (displays >= 9) items.push("Larger walls should be checked for mounting, service access, and scaling expectations before issue.");
    return items;
  }, [technology, driveMode, displays]);

  const mountingNotes = useMemo(() => {
    const items = [`Plan mounting and service access around a ${rows} x ${cols} wall footprint.`];
    if (technology === "LCD") items.push("Check bezel expectations and how content scaling should behave across the seam pattern.");
    if (technology === "LED") items.push("Confirm cabinet dimensions, processor canvas limits, and viewing-distance expectations for the chosen pixel pitch.");
    return items;
  }, [technology, rows, cols]);

  function saveWall() {
    const active = ensureActiveProject({
      name: project?.name || `${technology} video wall`,
      roomName: project?.roomName || "Video Wall",
      stage: "Design",
      status: project?.status || "Draft",
      notes: project?.notes || "",
    });
    setActiveProjectId(active.id);
    applyVideoWallToProject(active.id, {
      technology,
      designTier: tier,
      wallGoal: driveMode === "Multiview canvas" ? "pip" : driveMode === "Addressed panels" ? "custom" : "single",
      buildMethod: driveMode === "Addressed panels" ? "per-display" : "tile-mode",
      multiviewStyle: driveMode === "Multiview canvas" ? "equal-tiles" : undefined,
      pathMode: architecture.pathMode,
      performancePriority: "auto",
      sourceProfile: sources >= 3 ? "mixed" : "player",
      sourceLandingStyle: "standard",
      rows,
      cols,
      widthM: active.videowall?.widthM || cols,
      heightM: active.videowall?.heightM || rows,
      diagonalIn: active.videowall?.diagonalIn || 0,
      sourceCount: sources,
      outputRows: rows,
      outputCols: cols,
      panelCount: displays,
      cabinetRows: technology === "LED" ? rows : undefined,
      cabinetCols: technology === "LED" ? cols : undefined,
      ledProcessorMode: driveMode === "Multiview canvas" ? "multiview" : "single-source",
      lcdDriveStrategy:
        technology === "LCD"
          ? driveMode === "Addressed panels"
            ? "decoder-per-screen"
            : driveMode === "Multiview canvas"
              ? "tile-loop-multiview"
              : "dedicated-processor"
          : undefined,
      warnings,
      mountingNotes,
      recommendedSku: bom[0]?.sku,
      recommendedSkuQty: bom[0]?.qty,
      recommendedItems: bom.map((item) => ({ sku: item.sku, quantity: item.qty, role: item.role })),
      processorRecommendation: architecture.label,
      summary: architecture.summary,
      createdAt: active.videowall?.createdAt || new Date().toISOString(),
    });
    setStatus(`${rows} x ${cols} ${technology} wall plan was saved to the active project.`);
  }

  const left = (
    <div className="wm-workspace-stack">
      <div className="wm-start-step">
        Keep the wall definition on the left, then use the right-side tabs for architecture, BOM, and checks so the page never turns into one long specification sheet.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Wall definition</h3>
          <p className="wm-workspace-card__copy">The goal is to make the next decision obvious without hiding the key setup inputs.</p>
        </div>
        <div className="wm-workspace-form">
          <div className="wm-workspace-grid-2">
            <div className="wm-workspace-field">
              <label htmlFor="videowall-tech" className="wm-workspace-label">Wall technology</label>
              <select id="videowall-tech" className="wm-select-dark" value={technology} onChange={(event) => setTechnology(event.target.value as WallTechnology)}>
                <option value="LCD">LCD video wall</option>
                <option value="LED">LED wall</option>
              </select>
            </div>
            <div className="wm-workspace-field">
              <label htmlFor="videowall-drive" className="wm-workspace-label">Drive mode</label>
              <select id="videowall-drive" className="wm-select-dark" value={driveMode} onChange={(event) => setDriveMode(event.target.value as DriveMode)}>
                <option>Single canvas</option>
                <option>Multiview canvas</option>
                <option>Addressed panels</option>
              </select>
            </div>
          </div>
          <div className="wm-workspace-grid-3">
            <div className="wm-workspace-field">
              <label htmlFor="videowall-rows" className="wm-workspace-label">Rows</label>
              <input id="videowall-rows" className="wm-input-dark" type="number" min="1" value={rows} onChange={(event) => setRows(clampPositive(event.target.value, 1))} />
            </div>
            <div className="wm-workspace-field">
              <label htmlFor="videowall-cols" className="wm-workspace-label">Columns</label>
              <input id="videowall-cols" className="wm-input-dark" type="number" min="1" value={cols} onChange={(event) => setCols(clampPositive(event.target.value, 1))} />
            </div>
            <div className="wm-workspace-field">
              <label htmlFor="videowall-sources" className="wm-workspace-label">Sources</label>
              <input id="videowall-sources" className="wm-input-dark" type="number" min="1" value={sources} onChange={(event) => setSources(clampPositive(event.target.value, 1))} />
            </div>
          </div>
          <div className="wm-workspace-field">
            <span className="wm-workspace-label">Solution tier</span>
            <div className="wm-workspace-tag-row">
              {(["Bronze", "Silver", "Gold"] as WingmanTier[]).map((item) => (
                <button key={item} type="button" className={`wm-workspace-tab${tier === item ? " wm-workspace-tab--active" : ""}`} onClick={() => setTier(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-grid-3">
          <div className="wm-workspace-metric"><span>Displays</span><strong>{displays}</strong></div>
          <div className="wm-workspace-metric"><span>Sources</span><strong>{sources}</strong></div>
          <div className="wm-workspace-metric"><span>Tier</span><strong>{tier}</strong></div>
        </div>
        <div className="wm-next-step">Save the wall definition before moving into proposal so the BOM, discovery summary, and catalogue shortlist all inherit the same design intent.</div>
      </section>
    </div>
  );

  const right = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-tab-row">
          <button type="button" className={`wm-workspace-tab${panel === "solution" ? " wm-workspace-tab--active" : ""}`} onClick={() => setPanel("solution")}>Solution</button>
          <button type="button" className={`wm-workspace-tab${panel === "bom" ? " wm-workspace-tab--active" : ""}`} onClick={() => setPanel("bom")}>BOM</button>
          <button type="button" className={`wm-workspace-tab${panel === "checks" ? " wm-workspace-tab--active" : ""}`} onClick={() => setPanel("checks")}>Checks</button>
        </div>

        {panel === "solution" ? (
          <div className="wm-workspace-tabpanel">
            <div className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <span className="wm-workspace-list-item__eyebrow">{technology} wall</span>
                <h3 className="wm-workspace-card__title">{architecture.label}</h3>
                <p className="wm-workspace-card__copy">{architecture.summary}</p>
              </div>
              <div className="wm-workspace-grid-3">
                <div className="wm-workspace-metric"><span>Wall size</span><strong>{rows} x {cols}</strong></div>
                <div className="wm-workspace-metric"><span>Drive mode</span><strong>{driveMode}</strong></div>
                <div className="wm-workspace-metric"><span>Path</span><strong>{architecture.pathMode}</strong></div>
              </div>
            </div>
          </div>
        ) : panel === "bom" ? (
          <div className="wm-workspace-tabpanel">
            {bom.length ? (
              <div className="wm-workspace-table-wrap">
                <table className="wm-workspace-table">
                  <thead>
                    <tr><th>SKU</th><th>Role</th><th>Qty</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    {bom.map((item) => (
                      <tr key={`${item.sku}-${item.role}`}>
                        <td>{item.sku}</td>
                        <td>{item.role}</td>
                        <td>{item.qty}</td>
                        <td>{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="wm-workspace-empty">No BOM guidance was generated for the current wall configuration.</div>}
            <div className="wm-workspace-action-row">
              <button type="button" className="wm-btn-secondary" onClick={saveWall}>Save wall</button>
              <Link to={WM_ROUTES.catalog} className="wm-btn">Open catalogue</Link>
              <Link to={WM_ROUTES.proposal} className="wm-btn-primary">Build proposal</Link>
            </div>
          </div>
        ) : (
          <div className="wm-workspace-tabpanel">
            <div className="wm-workspace-list">
              {warnings.map((item) => (
                <div key={item} className="wm-workspace-list-item">
                  <span className="wm-workspace-list-item__title">Warning</span>
                  <span className="wm-workspace-list-item__copy">{item}</span>
                </div>
              ))}
              {mountingNotes.map((item) => (
                <div key={item} className="wm-workspace-list-item">
                  <span className="wm-workspace-list-item__title">Mounting note</span>
                  <span className="wm-workspace-list-item__copy">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Video Wall Planner"
      subtitle="Define the wall on the left, then keep the architecture, BOM, and support checks in separate right-side tabs so the page stays clear and proposal-ready."
      leftTitle="Wall Input"
      rightTitle="Planner Output"
      left={left}
      right={right}
      top={
        <div className="wm-workspace-action-row">
          <button type="button" className="wm-btn-secondary" onClick={saveWall}>Save wall</button>
          <Link to={WM_ROUTES.catalog} className="wm-btn">Open catalogue</Link>
          <Link to={WM_ROUTES.proposal} className="wm-btn-primary">Build proposal</Link>
        </div>
      }
      bottom={status ? <div className="wm-workspace-empty">{status}</div> : null}
    />
  );
}
