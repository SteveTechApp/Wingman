import * as React from "react";
import { useNavigate } from "react-router-dom";

import type { VideoWallSeed } from "@/features/systemDesign/designTypes";
import { saveCurrentDesignBundleToProject, saveVideoWallSeedToProject } from "@/features/systemDesign/designProjectBridge";

import { deriveVideoWallPreview } from "./videoWallPreview";

const STORAGE_KEY = "wm_video_wall_seed";

const styles = `
.wm-vw{ padding:12px 16px 16px; }
.wm-vw__stack{ display:grid; gap:12px; }
.wm-vw__hero{
  display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:start;
  padding:14px 16px; border-radius:18px; border:1px solid rgba(110,145,190,0.16);
  background:
    radial-gradient(circle at top right, rgba(25,83,173,0.16), transparent 36%),
    radial-gradient(circle at left center, rgba(34,199,184,0.10), transparent 30%),
    linear-gradient(180deg, rgba(13,22,37,0.96), rgba(7,13,24,0.96));
}
.wm-vw__eyebrow{ margin:0 0 4px; color:#66eadb; font-size:.78rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
.wm-vw__title{ margin:0; font-size:1.7rem; line-height:1.02; font-weight:700; letter-spacing:-.02em; }
.wm-vw__subtitle{ margin:6px 0 0; color:rgba(232,241,255,0.74); font-size:.92rem; line-height:1.32; max-width:76ch; }
.wm-vw__card{ padding:16px 18px; border-radius:18px; border:1px solid rgba(110,145,190,0.16); background:linear-gradient(180deg, rgba(13,22,37,0.94), rgba(7,13,24,0.94)); }
.wm-vw__grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.wm-vw__field{ display:grid; gap:6px; }
.wm-vw__field span{ font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,0.62); }
.wm-vw__field input,.wm-vw__field select,.wm-vw__field textarea{
  border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.94);
  padding:12px; font:inherit; outline:none;
}
.wm-vw__field input,.wm-vw__field select{ min-height:42px; }
.wm-vw__field textarea{ min-height:110px; resize:vertical; }
.wm-vw__panel{ border-radius:14px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); padding:14px; }
.wm-vw__panelTitle{ margin:0 0 10px; font-size:13px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,0.7); }
.wm-vw__metrics{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:12px; }
.wm-vw__metric{ border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); padding:10px 12px; }
.wm-vw__metricLabel{ font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,0.58); }
.wm-vw__metricValue{ margin-top:4px; font-size:15px; font-weight:800; color:rgba(255,255,255,0.94); }
.wm-vw__summaryText{ font-size:14px; line-height:1.55; color:rgba(255,255,255,0.88); }
.wm-vw__summaryText + .wm-vw__summaryText{ margin-top:10px; }
.wm-vw__visualWrap{ display:grid; gap:12px; margin-top:12px; }
.wm-vw__stage{
  position:relative; width:100%; overflow:hidden; border-radius:18px; border:1px solid rgba(110,145,190,0.16);
  background:
    linear-gradient(180deg, rgba(4,10,19,0.94), rgba(8,15,27,0.98)),
    radial-gradient(circle at center, rgba(34,199,184,0.06), transparent 45%);
  padding:18px;
}
.wm-vw__stageInner{
  position:relative; width:min(100%, 560px); margin:0 auto; border-radius:16px;
  border:1px solid rgba(255,255,255,0.12); background:rgba(7,14,24,0.85); box-shadow:0 20px 40px rgba(0,0,0,0.28);
}
.wm-vw__wallFrame{
  position:relative; width:100%; min-height:220px; border-radius:14px; overflow:hidden;
  background:linear-gradient(180deg, rgba(17,31,52,0.95), rgba(8,15,27,0.96));
}
.wm-vw__content{
  position:absolute; left:50%; top:50%; transform:translate(-50%, -50%);
  border-radius:10px; border:1px dashed rgba(119,231,217,0.55); background:rgba(64,224,208,0.08);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);
}
.wm-vw__contentLabel{
  position:absolute; left:10px; top:10px; padding:4px 8px; border-radius:999px;
  background:rgba(7,16,28,0.82); color:#9ef4ea; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
}
.wm-vw__surfaceGrid{ position:absolute; inset:10px; display:grid; }
.wm-vw__surface{
  position:relative; min-width:0; min-height:0; border-radius:8px; border:1px solid rgba(255,255,255,0.12);
  display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6px; gap:4px;
  text-align:center; overflow:hidden;
}
.wm-vw__surfaceLabel{ font-size:12px; font-weight:900; color:rgba(255,255,255,0.94); }
.wm-vw__surfaceMeta{ font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,0.74); }
.wm-vw__surfaceBadge{
  position:absolute; right:6px; top:6px; padding:2px 6px; border-radius:999px; font-size:10px; font-weight:900;
  background:rgba(7,15,24,0.78); color:rgba(255,255,255,0.92); border:1px solid rgba(255,255,255,0.14);
}
.wm-vw__stageHint{ margin-top:10px; font-size:12px; line-height:1.5; color:rgba(255,255,255,0.7); }
.wm-vw__legend{ display:flex; flex-wrap:wrap; gap:8px; }
.wm-vw__legendItem{
  display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.08);
  background:rgba(255,255,255,0.03); font-size:12px; font-weight:700; color:rgba(255,255,255,0.84);
}
.wm-vw__legendSwatch{ width:12px; height:12px; border-radius:999px; border:1px solid rgba(255,255,255,0.18); }
.wm-vw__topology{ display:grid; gap:10px; }
.wm-vw__topologyRow{ display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr); gap:8px; align-items:center; }
.wm-vw__node{
  padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);
}
.wm-vw__nodeEyebrow{ font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,0.58); }
.wm-vw__nodeLabel{ margin-top:4px; font-size:14px; font-weight:800; color:rgba(255,255,255,0.94); }
.wm-vw__nodeMeta{ margin-top:4px; font-size:12px; color:rgba(255,255,255,0.72); line-height:1.4; }
.wm-vw__arrow{ color:rgba(118,225,217,0.82); font-size:20px; font-weight:800; text-align:center; }
.wm-vw__warn{ color:#ffd58a; }
@media (max-width:900px){
  .wm-vw__hero{ grid-template-columns:1fr; }
  .wm-vw__grid{ grid-template-columns:1fr; }
  .wm-vw__metrics{ grid-template-columns:1fr 1fr; }
  .wm-vw__topologyRow{ grid-template-columns:1fr; }
  .wm-vw__arrow{ display:none; }
}
@media (max-width:620px){
  .wm-vw__metrics{ grid-template-columns:1fr; }
  .wm-vw__surfaceMeta{ display:none; }
}
`;

function readSeed(): VideoWallSeed {
  const fallback: VideoWallSeed = {
    displayType: "LCD",
    rows: 2,
    columns: 2,
    sourceCount: 1,
    processorPreference: "Auto",
    processorInputMode: "single-source",
    qualityProfile: "balanced",
    lcdDriveMode: "decoder-per-screen",
    outputRows: 2,
    outputColumns: 2,
    cabinetRows: 6,
    cabinetColumns: 10,
    cabinetWidthPx: 192,
    cabinetHeightPx: 192,
    cabinetWidthMm: 500,
    cabinetHeightMm: 500,
    contentAspectRatio: "16:9",
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as VideoWallSeed;
    return {
      ...fallback,
      ...parsed,
      rows: Math.max(1, Number(parsed.rows) || fallback.rows),
      columns: Math.max(1, Number(parsed.columns) || fallback.columns),
      outputRows: Math.max(1, Number(parsed.outputRows) || Number(parsed.rows) || fallback.outputRows || 1),
      outputColumns: Math.max(1, Number(parsed.outputColumns) || Number(parsed.columns) || fallback.outputColumns || 1),
      cabinetRows: Math.max(1, Number(parsed.cabinetRows) || Number(parsed.rows) || fallback.cabinetRows || 1),
      cabinetColumns: Math.max(1, Number(parsed.cabinetColumns) || Number(parsed.columns) || fallback.cabinetColumns || 1),
      sourceCount: Math.max(1, Number(parsed.sourceCount) || fallback.sourceCount),
    };
  } catch {
    return fallback;
  }
}

function writeSeed(seed: VideoWallSeed) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch {
  }
}

function outputColor(index: number): { background: string; border: string } {
  const hue = (index * 47) % 360;
  return {
    background: `hsla(${hue}, 88%, 58%, 0.22)`,
    border: `hsla(${hue}, 90%, 72%, 0.55)`,
  };
}

function processorRecommendation(seed: VideoWallSeed): string {
  if (seed.processorPreference !== "Auto") {
    return seed.processorPreference;
  }

  if (seed.displayType === "LED") {
    if (seed.processorInputMode === "multiview") {
      return seed.qualityProfile === "premium" || seed.sourceCount > 9
        ? "NHD-600-TRX composite multiview feed to LED processor"
        : "NHD-150-RX composite multiview feed to LED processor";
    }
    return seed.qualityProfile === "premium"
      ? "NHD-600-TRX single-canvas feed to LED processor"
      : "NHD-500-RX single-canvas feed to LED processor";
  }

  if (seed.lcdDriveMode === "decoder-per-screen") {
    return "Decoder-per-panel (NHD-500/NHD-600 class) recommended";
  }
  if (seed.lcdDriveMode === "tile-loop-multiview") {
    return "Tile-loop multiview path (NHD-150-RX / NHD-600-TRX)";
  }
  return "Dedicated wall processor path (SW-0204/0206-VW)";
}

function fitSummary(fit: string): string {
  if (fit === "letterbox") return "Content is wider than the wall, so expect top and bottom matte bars.";
  if (fit === "pillarbox") return "Content is narrower than the wall, so expect side matte bars.";
  return "Content fills the wall cleanly with no simulated bars.";
}

export default function VideoWallBuilderPage() {
  const nav = useNavigate();
  const [seed, setSeed] = React.useState<VideoWallSeed>(() => readSeed());

  React.useEffect(() => {
    writeSeed(seed);
    saveVideoWallSeedToProject(seed);
  }, [seed]);

  const preview = React.useMemo(() => deriveVideoWallPreview(seed), [seed]);
  const processor = React.useMemo(() => processorRecommendation(seed), [seed]);
  const densePreview = preview.displayCount > 20;
  const legendOutputs = preview.outputCount > 10 ? 10 : preview.outputCount;

  return (
    <div className="wm-vw">
      <style>{styles}</style>

      <div className="wm-vw__stack">
        <section className="wm-vw__hero">
          <div>
            <div className="wm-vw__eyebrow">Video Wall</div>
            <h1 className="wm-vw__title">Video wall builder</h1>
            <div className="wm-vw__subtitle">
              Define the wall format, signal topology, and processor strategy, then watch the design preview update live as the wall changes.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn" style={{ height: 40, padding: "0 16px" }} onClick={() => nav("/app/tools")}>Tool Hub</button>
            <button type="button" className="wm-btn wm-btn-primary" style={{ height: 40, padding: "0 16px" }} onClick={() => nav("/app/tools/cable-schedule")}>Cable Schedule</button>
            <button type="button" className="wm-btn" style={{ height: 40, padding: "0 16px" }} onClick={() => saveCurrentDesignBundleToProject()}>Save to Project</button>
          </div>
        </section>

        <section className="wm-vw__grid">
          <section className="wm-vw__card">
            <div style={{ fontWeight: 900, fontSize: 16 }}>Wall definition</div>
            <div className="wm-vw__grid" style={{ marginTop: 12 }}>
              <label className="wm-vw__field">
                <span>Display type</span>
                <select
                  value={seed.displayType}
                  onChange={(e) => {
                    const displayType = e.target.value as "LCD" | "LED";
                    if (displayType === "LED") {
                      setSeed({
                        ...seed,
                        displayType,
                        rows: 1,
                        columns: 1,
                        outputRows: 1,
                        outputColumns: 1,
                        processorInputMode: seed.processorInputMode ?? "single-source",
                      });
                      return;
                    }
                    setSeed({
                      ...seed,
                      displayType,
                      rows: Math.max(1, seed.rows || 2),
                      columns: Math.max(1, seed.columns || 2),
                      outputRows: Math.max(1, Math.min(seed.outputRows ?? seed.rows ?? 2, seed.rows || 2)),
                      outputColumns: Math.max(1, Math.min(seed.outputColumns ?? seed.columns ?? 2, seed.columns || 2)),
                    });
                  }}
                >
                  <option value="LCD">LCD</option>
                  <option value="LED">LED</option>
                </select>
              </label>

              <label className="wm-vw__field">
                <span>Source count</span>
                <input
                  type="number"
                  min="1"
                  value={seed.sourceCount}
                  onChange={(e) => setSeed({ ...seed, sourceCount: Math.max(1, Number(e.target.value) || 1) })}
                />
              </label>

              <label className="wm-vw__field">
                <span>Quality profile</span>
                <select value={seed.qualityProfile ?? "balanced"} onChange={(e) => setSeed({ ...seed, qualityProfile: e.target.value as VideoWallSeed["qualityProfile"] })}>
                  <option value="cost">Cost-aware</option>
                  <option value="balanced">Balanced</option>
                  <option value="premium">Premium</option>
                </select>
              </label>

              <label className="wm-vw__field">
                <span>Processor preference</span>
                <select value={seed.processorPreference} onChange={(e) => setSeed({ ...seed, processorPreference: e.target.value })}>
                  <option value="Auto">Auto</option>
                  <option value="Dedicated Processor">Dedicated Processor</option>
                  <option value="Integrated Switching">Integrated Switching</option>
                  <option value="Network-based">Network-based</option>
                </select>
              </label>

              <label className="wm-vw__field">
                <span>{seed.displayType === "LED" ? "Signal output map" : "Wall rows"}</span>
                {seed.displayType === "LED" ? (
                  <input value="1 x 1 fixed to LED processor feed" disabled />
                ) : (
                  <input
                    type="number"
                    min="1"
                    value={seed.rows}
                    onChange={(e) => {
                      const rows = Math.max(1, Number(e.target.value) || 1);
                      setSeed({
                        ...seed,
                        rows,
                        outputRows: Math.min(Math.max(1, seed.outputRows ?? rows), rows),
                      });
                    }}
                  />
                )}
              </label>

              <label className="wm-vw__field">
                <span>{seed.displayType === "LED" ? "Processor input mode" : "Wall columns"}</span>
                {seed.displayType === "LED" ? (
                  <select value={seed.processorInputMode ?? "single-source"} onChange={(e) => setSeed({ ...seed, processorInputMode: e.target.value as VideoWallSeed["processorInputMode"] })}>
                    <option value="single-source">Single source</option>
                    <option value="multiview">Multiview</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    min="1"
                    value={seed.columns}
                    onChange={(e) => {
                      const columns = Math.max(1, Number(e.target.value) || 1);
                      setSeed({
                        ...seed,
                        columns,
                        outputColumns: Math.min(Math.max(1, seed.outputColumns ?? columns), columns),
                      });
                    }}
                  />
                )}
              </label>

              {seed.displayType === "LCD" ? (
                <>
                  <label className="wm-vw__field">
                    <span>LCD drive mode</span>
                    <select value={seed.lcdDriveMode ?? "decoder-per-screen"} onChange={(e) => setSeed({ ...seed, lcdDriveMode: e.target.value as VideoWallSeed["lcdDriveMode"] })}>
                      <option value="decoder-per-screen">Decoder per screen</option>
                      <option value="tile-loop-multiview">Tile-loop multiview</option>
                      <option value="dedicated-processor">Dedicated processor</option>
                    </select>
                  </label>

                  <label className="wm-vw__field">
                    <span>Signal output rows</span>
                    <input
                      type="number"
                      min="1"
                      max={seed.rows}
                      value={seed.outputRows ?? seed.rows}
                      onChange={(e) => {
                        const outputRows = Math.max(1, Math.min(seed.rows, Number(e.target.value) || 1));
                        setSeed({ ...seed, outputRows });
                      }}
                    />
                  </label>

                  <label className="wm-vw__field">
                    <span>Signal output columns</span>
                    <input
                      type="number"
                      min="1"
                      max={seed.columns}
                      value={seed.outputColumns ?? seed.columns}
                      onChange={(e) => {
                        const outputColumns = Math.max(1, Math.min(seed.columns, Number(e.target.value) || 1));
                        setSeed({ ...seed, outputColumns });
                      }}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="wm-vw__field">
                    <span>Cabinet rows</span>
                    <input
                      type="number"
                      min="1"
                      value={seed.cabinetRows ?? seed.rows}
                      onChange={(e) => {
                        const cabinetRows = Math.max(1, Number(e.target.value) || 1);
                        setSeed({ ...seed, cabinetRows, rows: 1, outputRows: 1 });
                      }}
                    />
                  </label>

                  <label className="wm-vw__field">
                    <span>Cabinet columns</span>
                    <input
                      type="number"
                      min="1"
                      value={seed.cabinetColumns ?? seed.columns}
                      onChange={(e) => {
                        const cabinetColumns = Math.max(1, Number(e.target.value) || 1);
                        setSeed({ ...seed, cabinetColumns, columns: 1, outputColumns: 1 });
                      }}
                    />
                  </label>

                  <label className="wm-vw__field">
                    <span>Cabinet pixel size</span>
                    <input
                      value={`${seed.cabinetWidthPx ?? 192} x ${seed.cabinetHeightPx ?? 192}`}
                      onChange={(e) => {
                        const [w, h] = e.target.value.split("x").map((v) => Number(v.trim()));
                        if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
                          setSeed({ ...seed, cabinetWidthPx: Math.floor(w), cabinetHeightPx: Math.floor(h) });
                        }
                      }}
                    />
                  </label>

                  <label className="wm-vw__field">
                    <span>Cabinet physical size (mm)</span>
                    <input
                      value={`${seed.cabinetWidthMm ?? 500} x ${seed.cabinetHeightMm ?? 500}`}
                      onChange={(e) => {
                        const [w, h] = e.target.value.split("x").map((v) => Number(v.trim()));
                        if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
                          setSeed({ ...seed, cabinetWidthMm: w, cabinetHeightMm: h });
                        }
                      }}
                    />
                  </label>
                </>
              )}

              <label className="wm-vw__field">
                <span>{seed.displayType === "LED" ? "Pixel pitch" : "Bezel / pitch"}</span>
                <input
                  value={seed.displayType === "LED" ? (seed.pixelPitch ?? "") : (seed.bezelMm ?? "")}
                  onChange={(e) => seed.displayType === "LED"
                    ? setSeed({ ...seed, pixelPitch: e.target.value })
                    : setSeed({ ...seed, bezelMm: e.target.value })}
                  placeholder={seed.displayType === "LED" ? "e.g. 1.9mm" : "e.g. 3.5mm"}
                />
              </label>

              <label className="wm-vw__field">
                <span>Source aspect</span>
                <select value={seed.contentAspectRatio ?? "16:9"} onChange={(e) => setSeed({ ...seed, contentAspectRatio: e.target.value })}>
                  <option value="16:9">16:9</option>
                  <option value="16:10">16:10</option>
                  <option value="21:9">21:9</option>
                  <option value="32:9">32:9</option>
                </select>
              </label>

              <label className="wm-vw__field">
                <span>Assumptions</span>
                <textarea value={seed.assumptions ?? ""} onChange={(e) => setSeed({ ...seed, assumptions: e.target.value })} />
              </label>
            </div>
          </section>

          <section className="wm-vw__card">
            <div style={{ fontWeight: 900, fontSize: 16 }}>Live visualization</div>

            <div className="wm-vw__panel" style={{ marginTop: 12 }}>
              <div className="wm-vw__summaryText">
                {seed.displayType} wall with a {preview.signalColumns} x {preview.signalRows} signal map driving a {preview.physicalColumns} x {preview.physicalRows} physical surface.
                That gives {preview.displayCount} {preview.surfaceLabel.toLowerCase()}{preview.displayCount === 1 ? "" : "s"} from {preview.sources} source{preview.sources === 1 ? "" : "s"}.
              </div>
              <div className="wm-vw__summaryText">
                Processor recommendation: {processor}
              </div>
              <div className={`wm-vw__summaryText ${preview.contentFit === "fill" ? "" : "wm-vw__warn"}`}>
                {fitSummary(preview.contentFit)}
              </div>
            </div>

            <div className="wm-vw__metrics">
              <div className="wm-vw__metric">
                <div className="wm-vw__metricLabel">Signal outputs</div>
                <div className="wm-vw__metricValue">{preview.outputCount}</div>
              </div>
              <div className="wm-vw__metric">
                <div className="wm-vw__metricLabel">Physical surfaces</div>
                <div className="wm-vw__metricValue">{preview.displayCount}</div>
              </div>
              <div className="wm-vw__metric">
                <div className="wm-vw__metricLabel">Wall ratio</div>
                <div className="wm-vw__metricValue">{preview.wallAspectRatio.toFixed(2)}:1</div>
              </div>
              <div className="wm-vw__metric">
                <div className="wm-vw__metricLabel">Content fit</div>
                <div className="wm-vw__metricValue">{preview.contentFit}</div>
              </div>
              <div className="wm-vw__metric">
                <div className="wm-vw__metricLabel">Signal mode</div>
                <div className="wm-vw__metricValue">{preview.processorMode}</div>
              </div>
              <div className="wm-vw__metric">
                <div className="wm-vw__metricLabel">Canvas</div>
                <div className="wm-vw__metricValue">
                  {preview.canvasWidthPx && preview.canvasHeightPx
                    ? `${preview.canvasWidthPx} x ${preview.canvasHeightPx}px`
                    : `${preview.physicalColumns} x ${preview.physicalRows} surface map`}
                </div>
              </div>
            </div>

            <div className="wm-vw__visualWrap">
              <div className="wm-vw__panel">
                <div className="wm-vw__panelTitle">Wall preview</div>
                <div className="wm-vw__stage">
                  <div className="wm-vw__stageInner">
                    <div className="wm-vw__wallFrame" style={{ aspectRatio: String(preview.wallAspectRatio) }}>
                      <div
                        className="wm-vw__content"
                        style={{
                          width: `${preview.contentWidthPercent}%`,
                          height: `${preview.contentHeightPercent}%`,
                        }}
                      >
                        <div className="wm-vw__contentLabel">{seed.contentAspectRatio ?? "16:9"} content</div>
                      </div>

                      <div
                        className="wm-vw__surfaceGrid"
                        style={{
                          gridTemplateColumns: `repeat(${preview.physicalColumns}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${preview.physicalRows}, minmax(0, 1fr))`,
                          gap: seed.displayType === "LED" ? "4px" : "8px",
                        }}
                      >
                        {preview.cells.map((cell) => {
                          const color = outputColor(cell.outputIndex);
                          return (
                            <div
                              key={cell.id}
                              className="wm-vw__surface"
                              style={{
                                background: color.background,
                                borderColor: color.border,
                              }}
                            >
                              <div className="wm-vw__surfaceBadge">{cell.outputLabel}</div>
                              <div className="wm-vw__surfaceLabel">{cell.label}</div>
                              {!densePreview ? (
                                <div className="wm-vw__surfaceMeta">
                                  {cell.kind === "cabinet" ? "cabinet" : "panel"}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="wm-vw__stageHint">
                    Output group tinting shows how the logical signal map lands on the physical wall. This is especially useful when a processor or multiview path drives grouped regions instead of one feed per panel.
                  </div>
                </div>
              </div>

              <div className="wm-vw__panel">
                <div className="wm-vw__panelTitle">Output groups</div>
                <div className="wm-vw__legend">
                  {Array.from({ length: legendOutputs }).map((_, index) => {
                    const outputIndex = index + 1;
                    const color = outputColor(outputIndex);
                    return (
                      <div key={outputIndex} className="wm-vw__legendItem">
                        <span className="wm-vw__legendSwatch" style={{ background: color.background, borderColor: color.border }} />
                        <span>{`OUT ${outputIndex}`}</span>
                      </div>
                    );
                  })}
                  {preview.outputCount > legendOutputs ? (
                    <div className="wm-vw__legendItem">+{preview.outputCount - legendOutputs} more</div>
                  ) : null}
                </div>
              </div>

              <div className="wm-vw__panel">
                <div className="wm-vw__panelTitle">Signal topology</div>
                <div className="wm-vw__topology">
                  <div className="wm-vw__topologyRow">
                    <div className="wm-vw__node">
                      <div className="wm-vw__nodeEyebrow">Sources</div>
                      <div className="wm-vw__nodeLabel">{preview.sources} active source{preview.sources === 1 ? "" : "s"}</div>
                      <div className="wm-vw__nodeMeta">Current content ratio: {seed.contentAspectRatio ?? "16:9"}</div>
                    </div>
                    <div className="wm-vw__arrow">�?????T</div>
                    <div className="wm-vw__node">
                      <div className="wm-vw__nodeEyebrow">Processing</div>
                      <div className="wm-vw__nodeLabel">{processor}</div>
                      <div className="wm-vw__nodeMeta">{preview.processorMode}</div>
                    </div>
                    <div className="wm-vw__arrow">�?????T</div>
                    <div className="wm-vw__node">
                      <div className="wm-vw__nodeEyebrow">Wall outputs</div>
                      <div className="wm-vw__nodeLabel">{preview.signalColumns} x {preview.signalRows} map</div>
                      <div className="wm-vw__nodeMeta">
                        {preview.displayType === "LED"
                          ? "Single processor canvas into the LED controller path."
                          : `${preview.outputCount} logical wall region${preview.outputCount === 1 ? "" : "s"} across ${preview.displayCount} panels.`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {(preview.wallWidthMm && preview.wallHeightMm) || (preview.canvasWidthPx && preview.canvasHeightPx) ? (
                <div className="wm-vw__panel">
                  <div className="wm-vw__panelTitle">Derived dimensions</div>
                  <div className="wm-vw__legend">
                    {preview.wallWidthMm && preview.wallHeightMm ? (
                      <div className="wm-vw__legendItem">{`Physical wall: ${preview.wallWidthMm} x ${preview.wallHeightMm} mm`}</div>
                    ) : null}
                    {preview.canvasWidthPx && preview.canvasHeightPx ? (
                      <div className="wm-vw__legendItem">{`Canvas: ${preview.canvasWidthPx} x ${preview.canvasHeightPx} px`}</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
