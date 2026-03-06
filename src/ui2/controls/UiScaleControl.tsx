import * as React from "react";
const KEY = "wm_ui_scale";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function readScale(): number {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return 1;
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return clamp(n, 0.85, 1.25);
  } catch {
    return 1;
  }
}

function writeScale(n: number) {
  try {
    localStorage.setItem(KEY, String(n));
  } catch {}
}

function applyScale(n: number) {
  try {
    document.documentElement.style.setProperty("--wm-ui-scale", String(n));
  } catch {}
}

export default function UiScaleControl() {
  const [scale, setScale] = React.useState<number>(() => readScale());

  React.useEffect(() => {
    applyScale(scale);
    writeScale(scale);
  }, [scale]);

  const dec = () => setScale((s) => clamp(Math.round((s - 0.05) * 100) / 100, 0.85, 1.25));
  const inc = () => setScale((s) => clamp(Math.round((s + 0.05) * 100) / 100, 0.85, 1.25));
  const reset = () => setScale(1);

  const wrapStyle: React.CSSProperties = {
    position: "static",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: 0,
    marginLeft: 4,
    border: "none",
    background: "transparent",
    boxShadow: "none",
    backdropFilter: "none",
  };

  const btnStyle: React.CSSProperties = {
    height: 36,
    minWidth: 42,
    padding: "0 10px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div className="wm-scale-control" role="group" aria-label="UI scale" style={wrapStyle}>
      <button type="button" className="wm-btn" onClick={dec} style={btnStyle} title="Smaller">
        A-
      </button>
      <button type="button" className="wm-btn" onClick={reset} style={btnStyle} title="Reset scale">
        {Math.round(scale * 100)}%
      </button>
      <button type="button" className="wm-btn" onClick={inc} style={btnStyle} title="Bigger">
        A+
      </button>
    </div>
  );
}