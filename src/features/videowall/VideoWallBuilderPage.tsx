import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { VideoWallSeed } from "@/features/systemDesign/designTypes";
import { saveVideoWallSeedToProject, saveCurrentDesignBundleToProject } from "@/features/systemDesign/designProjectBridge";

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
.wm-vw__wall{ display:grid; gap:4px; width:min(100%,420px); margin-top:10px; }
.wm-vw__tile{ min-height:44px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(34,199,184,0.12); display:flex; align-items:center; justify-content:center; font-size:.82rem; font-weight:700; }
@media (max-width:900px){
  .wm-vw__hero{ grid-template-columns:1fr; }
  .wm-vw__grid{ grid-template-columns:1fr; }
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
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch {}
}

export default function VideoWallBuilderPage() {
  const nav = useNavigate();
  const [seed, setSeed] = React.useState<VideoWallSeed>(() => readSeed());

  React.useEffect(() => {
    writeSeed(seed);
    saveVideoWallSeedToProject(seed);
  }, [seed]);

  const signalRows = seed.displayType === "LED" ? 1 : Math.max(1, seed.rows);
  const signalColumns = seed.displayType === "LED" ? 1 : Math.max(1, seed.columns);
  const physicalRows = seed.displayType === "LED" ? Math.max(1, seed.cabinetRows ?? seed.rows) : Math.max(1, seed.rows);
  const physicalColumns = seed.displayType === "LED" ? Math.max(1, seed.cabinetColumns ?? seed.columns) : Math.max(1, seed.columns);
  const displayCount = Math.max(1, physicalRows * physicalColumns);
  const canvasWidthPx = seed.displayType === "LED"
    ? Math.max(1, seed.cabinetWidthPx ?? 192) * physicalColumns
    : undefined;
  const canvasHeightPx = seed.displayType === "LED"
    ? Math.max(1, seed.cabinetHeightPx ?? 192) * physicalRows
    : undefined;
  const processor = seed.processorPreference === "Auto"
    ? seed.displayType === "LED"
      ? seed.processorInputMode === "multiview"
        ? (seed.qualityProfile === "premium" || seed.sourceCount > 9
          ? "NHD-600-TRX composite multiview feed to LED processor"
          : "NHD-150-RX composite multiview feed to LED processor")
        : (seed.qualityProfile === "premium"
          ? "NHD-600-TRX single-canvas feed to LED processor"
          : "NHD-500-RX single-canvas feed to LED processor")
      : seed.lcdDriveMode === "decoder-per-screen"
        ? "Decoder-per-panel (NHD-500/NHD-600 class) recommended"
        : seed.lcdDriveMode === "tile-loop-multiview"
          ? "Tile-loop multiview path (NHD-150-RX / NHD-600-TRX)"
          : "Dedicated wall processor path (SW-0204/0206-VW)"
    : seed.processorPreference;

  return (
    <div className="wm-vw">
      <style>{styles}</style>

      <div className="wm-vw__stack">
        <section className="wm-vw__hero">
          <div>
            <div className="wm-vw__eyebrow">Video Wall</div>
            <h1 className="wm-vw__title">Video wall builder</h1>
            <div className="wm-vw__subtitle">
              Define the wall format, processor direction, and assumptions. This seed is later consumed by cable schedule and block diagram tools.
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
                      outputRows: Math.max(1, seed.rows || 2),
                      outputColumns: Math.max(1, seed.columns || 2),
                    });
                  }}
                >
                  <option value="LCD">LCD</option>
                  <option value="LED">LED</option>
                </select>
              </label>

              <label className="wm-vw__field">
                <span>Source count</span>
                <input type="number" value={seed.sourceCount} onChange={(e) => setSeed({ ...seed, sourceCount: Math.max(1, Number(e.target.value) || 1) })} />
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
                  <input value="1 x 1 (fixed for LED feed)" disabled />
                ) : (
                  <input type="number" value={seed.rows} onChange={(e) => {
                    const rows = Math.max(1, Number(e.target.value) || 1);
                    setSeed({ ...seed, rows, outputRows: rows });
                  }} />
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
                  <input type="number" value={seed.columns} onChange={(e) => {
                    const columns = Math.max(1, Number(e.target.value) || 1);
                    setSeed({ ...seed, columns, outputColumns: columns });
                  }} />
                )}
              </label>

              {seed.displayType === "LCD" ? (
                <label className="wm-vw__field">
                  <span>LCD drive mode</span>
                  <select value={seed.lcdDriveMode ?? "decoder-per-screen"} onChange={(e) => setSeed({ ...seed, lcdDriveMode: e.target.value as VideoWallSeed["lcdDriveMode"] })}>
                    <option value="decoder-per-screen">Decoder per screen</option>
                    <option value="tile-loop-multiview">Tile-loop multiview</option>
                    <option value="dedicated-processor">Dedicated processor</option>
                  </select>
                </label>
              ) : (
                <label className="wm-vw__field">
                  <span>Cabinet rows</span>
                  <input type="number" value={seed.cabinetRows ?? seed.rows} onChange={(e) => {
                    const cabinetRows = Math.max(1, Number(e.target.value) || 1);
                    setSeed({ ...seed, cabinetRows, rows: 1, outputRows: 1 });
                  }} />
                </label>
              )}

              {seed.displayType === "LED" ? (
                <label className="wm-vw__field">
                  <span>Cabinet columns</span>
                  <input type="number" value={seed.cabinetColumns ?? seed.columns} onChange={(e) => {
                    const cabinetColumns = Math.max(1, Number(e.target.value) || 1);
                    setSeed({ ...seed, cabinetColumns, columns: 1, outputColumns: 1 });
                  }} />
                </label>
              ) : null}

              {seed.displayType === "LED" ? (
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
              ) : null}

              {seed.displayType === "LED" ? (
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
              ) : null}

              <label className="wm-vw__field">
                <span>{seed.displayType === "LED" ? "Pixel pitch" : "Bezel / pitch"}</span>
                <input value={seed.displayType === "LED" ? (seed.pixelPitch ?? "") : (seed.bezelMm ?? "")}
                  onChange={(e) => seed.displayType === "LED" ? setSeed({ ...seed, pixelPitch: e.target.value }) : setSeed({ ...seed, bezelMm: e.target.value })}
                  placeholder={seed.displayType === "LED" ? "e.g. 1.9mm" : "e.g. 3.5mm"} />
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
            <div style={{ fontWeight: 900, fontSize: 16 }}>Wall summary</div>

            <div className="wm-vw__panel" style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>
                {seed.displayType} wall.
                Signal output map: {signalColumns} x {signalRows}.
                Physical layout: {physicalColumns} x {physicalRows} ({displayCount} surfaces).
                {seed.sourceCount} source{seed.sourceCount === 1 ? "" : "s"}.
                {canvasWidthPx && canvasHeightPx ? ` Canvas: ${canvasWidthPx}x${canvasHeightPx}px.` : ""}
              </div>
              <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.82)" }}>
                Processor recommendation: {processor}
              </div>
            </div>

            <div
              className="wm-vw__wall"
              style={{ gridTemplateColumns: `repeat(${physicalColumns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: displayCount }).map((_, i) => (
                <div key={i} className="wm-vw__tile">{seed.displayType === "LED" ? `C${i + 1}` : i + 1}</div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
