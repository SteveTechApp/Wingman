import React, { useMemo, useState } from "react";

type WallType = "LCD" | "LED";
type Layout = "2x2" | "3x3" | "4x4" | "Custom";
type MultiViewMode = "None" | "Fixed Windows" | "Active Windowing";

export default function VideoWallPlannerPage() {
  const [wallType, setWallType] = useState<WallType>("LED");
  const [layout, setLayout] = useState<Layout>("3x3");
  const [customRows, setCustomRows] = useState(2);
  const [customCols, setCustomCols] = useState(3);
  const [diagonalInches, setDiagonalInches] = useState(136);
  const [pixelPitch, setPixelPitch] = useState(1.2);
  const [multiview, setMultiview] = useState<MultiViewMode>("Fixed Windows");

  const grid = useMemo(() => {
    if (layout === "2x2") return { r: 2, c: 2 };
    if (layout === "3x3") return { r: 3, c: 3 };
    if (layout === "4x4") return { r: 4, c: 4 };
    return { r: Math.max(1, customRows), c: Math.max(1, customCols) };
  }, [layout, customRows, customCols]);

  const layoutLabel = useMemo(() => {
    return layout === "Custom" ? `${grid.r}x${grid.c}` : layout;

  }, [layout, grid.r, grid.c]);

  const summary = useMemo(() => {
    return {
      wallType,
      layout: layoutLabel,
      displays: wallType === "LCD" ? grid.r * grid.c : 1,
      diagonalInches,
      pixelPitch: wallType === "LED" ? pixelPitch : undefined,
      multiview,
    };
  }, [wallType, layoutLabel, grid.r, grid.c, diagonalInches, pixelPitch, multiview]);

  return (
    <div className="wm-page">
      <div className="wm-hero">
        <div className="wm-hero-title">Video Wall Planner</div>
        <div className="wm-hero-sub">
          Plan LED vs LCD flows, processing and multiview. (Placeholder shell; add BOM rules next.)
        </div>
      </div>

      <div className="wm-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="wm-card">
          <div className="wm-card-title">Inputs</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <label>
              <div className="wm-muted" style={{ fontSize: 12, marginBottom: 4 }}>Wall type</div>
              <select value={wallType} onChange={(e) => setWallType(e.target.value as WallType)} style={{ width: "100%", padding: 10 }}>
                <option>LED</option>
                <option>LCD</option>
              </select>
            </label>

            <label>
              <div className="wm-muted" style={{ fontSize: 12, marginBottom: 4 }}>Layout</div>
              <select value={layout} onChange={(e) => setLayout(e.target.value as Layout)} style={{ width: "100%", padding: 10 }}>
                <option>2x2</option>
                <option>3x3</option>
                <option>4x4</option>
                <option>Custom</option>
              </select>
            </label>

            {layout === "Custom" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>
                  <div className="wm-muted" style={{ fontSize: 12, marginBottom: 4 }}>Rows</div>
                  <input
                    type="number"
                    min={1}
                    value={customRows}
                    onChange={(e) => setCustomRows(Math.max(1, Number(e.target.value || 1)))}
                    style={{ width: "100%", padding: 10 }}
                  />
                </label>

                <label>
                  <div className="wm-muted" style={{ fontSize: 12, marginBottom: 4 }}>Cols</div>
                  <input
                    type="number"
                    min={1}
                    value={customCols}
                    onChange={(e) => setCustomCols(Math.max(1, Number(e.target.value || 1)))}
                    style={{ width: "100%", padding: 10 }}
                  />
                </label>
              </div>
            )}

            <label>
              <div className="wm-muted" style={{ fontSize: 12, marginBottom: 4 }}>Approx. size (diagonal inches)</div>
              <input
                type="number"
                min={40}
                value={diagonalInches}
                onChange={(e) => setDiagonalInches(Number(e.target.value || 0))}
                style={{ width: "100%", padding: 10 }}
              />
            </label>

            {wallType === "LED" && (
              <label>
                <div className="wm-muted" style={{ fontSize: 12, marginBottom: 4 }}>Pixel pitch (mm)</div>
                <input
                  type="number"
                  step="0.1"
                  min={0.5}
                  value={pixelPitch}
                  onChange={(e) => setPixelPitch(Number(e.target.value || 0))}
                  style={{ width: "100%", padding: 10 }}
                />
              </label>
            )}

            <label>
              <div className="wm-muted" style={{ fontSize: 12, marginBottom: 4 }}>Multiview</div>
              <select value={multiview} onChange={(e) => setMultiview(e.target.value as MultiViewMode)} style={{ width: "100%", padding: 10 }}>
                <option>None</option>
                <option>Fixed Windows</option>
                <option>Active Windowing</option>
              </select>
            </label>
          </div>
        </div>

        <div className="wm-card">
          <div className="wm-card-title">Summary</div>
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
{JSON.stringify(summary, null, 2)}
          </pre>

          <div className="wm-card-desc" style={{ marginTop: 12 }}>
            Next: split LED vs LCD workflows and generate WyreStorm BOM + multiview rules.
          </div>
        </div>
      </div>
    </div>
  );
}

