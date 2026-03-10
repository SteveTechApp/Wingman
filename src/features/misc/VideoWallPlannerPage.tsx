import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  applyVideoWallToProject,
  createProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  type ProjectVideoWall,
  type VideoWallTechnology,
} from "@/features/projects/projectStore";

type DraftState = {
  technology: VideoWallTechnology;
  rows: string;
  cols: string;
  lcdPanelDiagonalIn: string;
  lcdBezelMm: string;
  ledPixelPitchMm: string;
  viewingDistanceM: string;
  wallWidthM: string;
  wallHeightM: string;
};

function toNumber(value: string, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calcLcdWallWidthM(cols: number, panelDiagonalIn: number, bezelMm: number): number {
  if (cols <= 0 || panelDiagonalIn <= 0) return 0;
  const panelWidthM = panelDiagonalIn * 0.8716 * 0.0254;
  const bezelM = bezelMm / 1000;
  return cols * panelWidthM + Math.max(cols - 1, 0) * bezelM;
}

function calcLcdWallHeightM(rows: number, panelDiagonalIn: number, bezelMm: number): number {
  if (rows <= 0 || panelDiagonalIn <= 0) return 0;
  const panelHeightM = panelDiagonalIn * 0.4903 * 0.0254;
  const bezelM = bezelMm / 1000;
  return rows * panelHeightM + Math.max(rows - 1, 0) * bezelM;
}

function calcLedDiagonalIn(widthM: number, heightM: number): number {
  if (widthM <= 0 || heightM <= 0) return 0;
  const diagonalM = Math.sqrt(widthM * widthM + heightM * heightM);
  return diagonalM / 0.0254;
}

function processorRecommendation(technology: VideoWallTechnology, rows: number, cols: number, widthM: number): string {
  const displays = rows * cols;
  if (technology === "LCD") {
    if (displays <= 4) return "Entry video wall processing / matrix-based layout control";
    if (displays <= 9) return "Mid-tier video wall controller with layout presets";
    return "Advanced video wall processor with multiview and service-friendly configuration";
  }

  if (widthM <= 3) return "Entry LED sending solution for smaller LED walls";
  if (widthM <= 6) return "Mid-tier LED processor with stronger canvas scaling";
  return "Advanced LED processor sized for higher pixel counts and larger canvases";
}

function buildMountingNotes(technology: VideoWallTechnology, rows: number, cols: number): string[] {
  const notes = [
    "Confirm power and service access before final mounting design.",
    "Allow structured cable paths and clear rear access where possible.",
  ];

  if (technology === "LCD") {
    notes.push("Check bezel alignment tolerance and colour uniformity across panels.");
    if (rows * cols >= 6) notes.push("Use a precision mounting system with fine adjustment.");
  } else {
    notes.push("Confirm cabinet service strategy: front service or rear service.");
    notes.push("Validate viewing distance against chosen pixel pitch.");
    if (rows * cols >= 12) notes.push("Plan processor location, redundancy expectations, and thermal management.");
  }

  return notes;
}

export default function VideoWallPlannerPage() {
  const nav = useNavigate();
  const activeProject = getActiveProject();

  const [draft, setDraft] = React.useState<DraftState>({
    technology: "LCD",
    rows: "2",
    cols: "2",
    lcdPanelDiagonalIn: "55",
    lcdBezelMm: "3.5",
    ledPixelPitchMm: "1.9",
    viewingDistanceM: "3",
    wallWidthM: "4.8",
    wallHeightM: "2.7",
  });

  const rows = Math.max(1, toNumber(draft.rows, 1));
  const cols = Math.max(1, toNumber(draft.cols, 1));
  const displays = rows * cols;
  const viewingDistanceM = Math.max(0, toNumber(draft.viewingDistanceM, 0));

  const computed = React.useMemo(() => {
    if (draft.technology === "LCD") {
      const panelDiagonalIn = Math.max(0, toNumber(draft.lcdPanelDiagonalIn, 55));
      const bezelMm = Math.max(0, toNumber(draft.lcdBezelMm, 3.5));
      const widthM = calcLcdWallWidthM(cols, panelDiagonalIn, bezelMm);
      const heightM = calcLcdWallHeightM(rows, panelDiagonalIn, bezelMm);
      const diagonalIn = calcLedDiagonalIn(widthM, heightM);

      return {
        widthM,
        heightM,
        diagonalIn,
        panelDiagonalIn,
        bezelMm,
        pixelPitchMm: undefined as number | undefined,
      };
    }

    const widthM = Math.max(0, toNumber(draft.wallWidthM, 0));
    const heightM = Math.max(0, toNumber(draft.wallHeightM, 0));
    const pixelPitchMm = Math.max(0, toNumber(draft.ledPixelPitchMm, 1.9));
    const diagonalIn = calcLedDiagonalIn(widthM, heightM);

    return {
      widthM,
      heightM,
      diagonalIn,
      panelDiagonalIn: undefined as number | undefined,
      bezelMm: undefined as number | undefined,
      pixelPitchMm,
    };
  }, [cols, draft, rows]);

  const summary = React.useMemo(() => {
    if (draft.technology === "LCD") {
      return `LCD video wall: ${rows}x${cols}, approx ${computed.widthM.toFixed(2)}m × ${computed.heightM.toFixed(2)}m, using ${computed.panelDiagonalIn}in panels with ${computed.bezelMm}mm bezels.`;
    }

    return `LED video wall: approx ${computed.widthM.toFixed(2)}m × ${computed.heightM.toFixed(2)}m, ${computed.pixelPitchMm}mm pixel pitch, recommended viewing distance around ${viewingDistanceM || 0}m.`;
  }, [computed, draft.technology, rows, cols, viewingDistanceM]);

  const recommendation = React.useMemo(
    () => processorRecommendation(draft.technology, rows, cols, computed.widthM),
    [computed.widthM, cols, draft.technology, rows]
  );

  const notes = React.useMemo(
    () => buildMountingNotes(draft.technology, rows, cols),
    [cols, draft.technology, rows]
  );

  const buildPayload = (): ProjectVideoWall => ({
    technology: draft.technology,
    rows,
    cols,
    widthM: Number(computed.widthM.toFixed(2)),
    heightM: Number(computed.heightM.toFixed(2)),
    diagonalIn: Number(computed.diagonalIn.toFixed(1)),
    pixelPitchMm: computed.pixelPitchMm,
    panelDiagonalIn: computed.panelDiagonalIn,
    bezelMm: computed.bezelMm,
    viewingDistanceM,
    processorRecommendation: recommendation,
    mountingNotes: notes,
    summary,
    createdAt: new Date().toISOString(),
  });

  const update = (key: keyof DraftState, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyToActiveProject = () => {
    const active = ensureActiveProject({
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: activeProject?.roomName || "Video Wall",
      stage: "Design",
      status: activeProject?.status || "Draft",
    });

    applyVideoWallToProject(active.id, buildPayload());
    setActiveProjectId(active.id);
    nav(`/app/projects/${encodeURIComponent(active.id)}`);
  };

  const createProjectFromWall = () => {
    const payload = buildPayload();
    const created = createProject({
      name: `${payload.technology} Video Wall ${rows}x${cols}`,
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: "Video Wall",
      stage: "Design",
      status: "Draft",
      notes: summary,
      videowall: payload,
      discovery: {
        customer: activeProject?.customer || "Sample customer",
        site: activeProject?.site || "",
        roomName: "Video Wall",
        applicationType: payload.technology === "LED" ? "LED Video Wall" : "LCD Video Wall",
        notes: summary,
        recommendedFamilies: ["Video Wall"],
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
          <div className="wm-dashboard__eyebrow">Video Wall Wizard</div>
          <h1 className="wm-dashboard__title">LED / LCD video wall planner</h1>
          <p className="wm-dashboard__subtitle">
            Design an LCD or LED wall, produce planning notes, and either save it into the active project or launch it as a standalone project applet.
          </p>

          <div className="wm-dashboard__meta">
            <span className="wm-chip">Technology: {draft.technology}</span>
            <span className="wm-chip">Layout: {rows}x{cols}</span>
            <span className="wm-chip">Approx size: {computed.widthM.toFixed(2)}m × {computed.heightM.toFixed(2)}m</span>
          </div>
        </div>

        <div className="wm-dashboard__heroactions">
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/dashboard")}>
            Dashboard
          </button>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/projects")}>
            Projects
          </button>
          <button type="button" className="wm-btn wm-btn--primary" onClick={createProjectFromWall}>
            Create Project From Wall
          </button>
        </div>
      </section>

      <section className="wm-page-grid-sidebar">
        <div className="wm-card">
          <div className="wm-card__title">Wall inputs</div>
          <div className="wm-card__subtitle">Choose LCD or LED and define the key planning parameters.</div>

          <div className="wm-field-wrap" style={{ marginTop: 12 }}>
            <span className="wm-label">Technology</span>
            <div className="wm-tier-picker">
              {(["LCD", "LED"] as VideoWallTechnology[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={draft.technology === item ? "wm-tier-btn is-active" : "wm-tier-btn"}
                  onClick={() => update("technology", item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-form-grid" style={{ marginTop: 12 }}>
            <label className="wm-field-wrap">
              <span className="wm-label">Rows</span>
              <input className="wm-field" value={draft.rows} onChange={(e) => update("rows", e.target.value)} />
            </label>

            <label className="wm-field-wrap">
              <span className="wm-label">Columns</span>
              <input className="wm-field" value={draft.cols} onChange={(e) => update("cols", e.target.value)} />
            </label>

            <label className="wm-field-wrap">
              <span className="wm-label">Viewing distance (m)</span>
              <input className="wm-field" value={draft.viewingDistanceM} onChange={(e) => update("viewingDistanceM", e.target.value)} />
            </label>

            {draft.technology === "LCD" ? (
              <>
                <label className="wm-field-wrap">
                  <span className="wm-label">Panel diagonal (in)</span>
                  <input className="wm-field" value={draft.lcdPanelDiagonalIn} onChange={(e) => update("lcdPanelDiagonalIn", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Combined bezel (mm)</span>
                  <input className="wm-field" value={draft.lcdBezelMm} onChange={(e) => update("lcdBezelMm", e.target.value)} />
                </label>
              </>
            ) : (
              <>
                <label className="wm-field-wrap">
                  <span className="wm-label">Pixel pitch (mm)</span>
                  <input className="wm-field" value={draft.ledPixelPitchMm} onChange={(e) => update("ledPixelPitchMm", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Wall width (m)</span>
                  <input className="wm-field" value={draft.wallWidthM} onChange={(e) => update("wallWidthM", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Wall height (m)</span>
                  <input className="wm-field" value={draft.wallHeightM} onChange={(e) => update("wallHeightM", e.target.value)} />
                </label>
              </>
            )}
          </div>

          <div className="wm-inline-actions">
            <button type="button" className="wm-btn wm-btn--primary" onClick={applyToActiveProject}>
              Apply To Active Project
            </button>
            <button type="button" className="wm-btn wm-btn--ghost" onClick={createProjectFromWall}>
              Create New Video Wall Project
            </button>
          </div>
        </div>

        <div className="wm-section-stack">
          <div className="wm-card">
            <div className="wm-card__title">Wall summary</div>
            <div className="wm-card__subtitle">{summary}</div>

            <div className="wm-summary-list">
              <div className="wm-summary-row"><span>Technology</span><strong>{draft.technology}</strong></div>
              <div className="wm-summary-row"><span>Layout</span><strong>{rows} × {cols}</strong></div>
              <div className="wm-summary-row"><span>Approx wall width</span><strong>{computed.widthM.toFixed(2)}m</strong></div>
              <div className="wm-summary-row"><span>Approx wall height</span><strong>{computed.heightM.toFixed(2)}m</strong></div>
              <div className="wm-summary-row"><span>Approx diagonal</span><strong>{computed.diagonalIn.toFixed(1)}in</strong></div>
              <div className="wm-summary-row"><span>Displays / cabinets context</span><strong>{displays}</strong></div>
            </div>
          </div>

          <div className="wm-page-grid-2">
            <div className="wm-card">
              <div className="wm-card__title">Processor recommendation</div>
              <div className="wm-card__subtitle">{recommendation}</div>

              <div className="wm-summary-list">
                {draft.technology === "LED" && computed.pixelPitchMm ? (
                  <div className="wm-summary-row"><span>Pixel pitch</span><strong>{computed.pixelPitchMm}mm</strong></div>
                ) : null}
                {draft.technology === "LCD" && computed.panelDiagonalIn ? (
                  <div className="wm-summary-row"><span>Panel diagonal</span><strong>{computed.panelDiagonalIn}in</strong></div>
                ) : null}
                {draft.technology === "LCD" && computed.bezelMm != null ? (
                  <div className="wm-summary-row"><span>Bezel</span><strong>{computed.bezelMm}mm</strong></div>
                ) : null}
                <div className="wm-summary-row"><span>Viewing distance</span><strong>{viewingDistanceM || 0}m</strong></div>
              </div>
            </div>

            <div className="wm-card">
              <div className="wm-card__title">Mounting notes</div>
              <div className="wm-card__subtitle">These notes are written into the project when you apply the design.</div>

              <div className="wm-summary-list">
                {notes.map((item) => (
                  <div className="wm-summary-row" key={item}>
                    <span>Note</span>
                    <strong>{item}</strong>
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
                : "No active project selected. Applying will use or create a live project record."}
            </div>

            <div className="wm-summary-list">
              <div className="wm-summary-row"><span>Customer</span><strong>{activeProject?.customer || "Sample customer"}</strong></div>
              <div className="wm-summary-row"><span>Site</span><strong>{activeProject?.site || "Not set"}</strong></div>
              <div className="wm-summary-row"><span>Current stage</span><strong>{activeProject?.stage || "Discovery"}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
