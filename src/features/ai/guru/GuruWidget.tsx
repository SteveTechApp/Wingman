import * as React from "react";
import { Link } from "react-router-dom";
import { askGuru, type GuruAnswer } from "./guruApi";
import { buildGuruContext, useGuruState } from "./guruStore";

function cls(...xs: Array<string | false | undefined>) { return xs.filter(Boolean).join(" "); }

type Pos = { x: number; y: number }; // viewport coordinates (top-left origin)

const FAB_KEY = "wingman.guru.fab.pos.v1";
const PANEL_KEY = "wingman.guru.panel.pos.v1";

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function readPos(key: string): Pos | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (typeof j?.x === "number" && typeof j?.y === "number") return { x: j.x, y: j.y };
    return null;
  } catch {
    return null;
  }
}

function writePos(key: string, pos: Pos) {
  try { localStorage.setItem(key, JSON.stringify(pos, null, 2)); } catch {}
}

/**
 * Default starting positions keep your current layout:
 * - FAB bottom-right
 * - Panel near bottom-right, slightly above FAB
 */
function defaultFabPos(): Pos {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // approximate FAB size 56x56
  return { x: w - 18 - 56, y: h - 18 - 56 };
}

function defaultPanelPos(): Pos {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // approximate panel size 520x520-ish (clamped later)
  return { x: w - 18 - 520, y: h - 18 - 480 };
}

function useDrag(
  enabled: boolean,
  pos: Pos,
  setPos: (p: Pos) => void,
  boundsPad = 8
) {
  const dragRef = React.useRef<{ startX: number; startY: number; baseX: number; baseY: number; dragging: boolean }>({
    startX: 0, startY: 0, baseX: 0, baseY: 0, dragging: false
  });

  React.useEffect(() => {
    if (!enabled) return;

    function onMove(e: PointerEvent) {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const nextX = dragRef.current.baseX + dx;
      const nextY = dragRef.current.baseY + dy;

      const maxX = window.innerWidth - boundsPad;
      const maxY = window.innerHeight - boundsPad;

      setPos({
        x: clamp(nextX, boundsPad, maxX),
        y: clamp(nextY, boundsPad, maxY),
      });
    }

    function onUp() {
      dragRef.current.dragging = false;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [enabled, setPos, boundsPad]);

  function start(e: React.PointerEvent) {
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.baseX = pos.x;
    dragRef.current.baseY = pos.y;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  return { start };
}

export default function GuruWidget() {
  const { state, api } = useGuruState();

  const [q, setQ] = React.useState(state.lastQuestion || "");
  const [busy, setBusy] = React.useState(false);
  const [ans, setAns] = React.useState<GuruAnswer | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Positions
  const [fabPos, setFabPos] = React.useState<Pos>(() => readPos(FAB_KEY) ?? defaultFabPos());
  const [panelPos, setPanelPos] = React.useState<Pos>(() => readPos(PANEL_KEY) ?? defaultPanelPos());

  // Persist positions
  React.useEffect(() => { writePos(FAB_KEY, fabPos); }, [fabPos]);
  React.useEffect(() => { writePos(PANEL_KEY, panelPos); }, [panelPos]);

  // Keep positions in bounds on resize
  React.useEffect(() => {
    function onResize() {
      setFabPos(p => ({ x: clamp(p.x, 8, window.innerWidth - 8), y: clamp(p.y, 8, window.innerHeight - 8) }));
      setPanelPos(p => ({ x: clamp(p.x, 8, window.innerWidth - 8), y: clamp(p.y, 8, window.innerHeight - 8) }));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fabDrag = useDrag(true, fabPos, setFabPos);
  const panelDrag = useDrag(state.open, panelPos, setPanelPos);

  const ctx = React.useMemo(() => buildGuruContext(state.mode), [state.mode]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        api.toggle();
      }
      if (e.key === "Escape" && state.open) api.close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, state.open]);

  async function submit() {
    const qq = q.trim();
    api.setLastQuestion(qq);
    setErr(null);
    setBusy(true);
    try {
      const res = await askGuru(qq, ctx);
      setAns(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Guru error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating Guru button (always visible) */}
      <button
        className="wm-guru-fab"
        onClick={() => api.toggle()}
        onPointerDown={fabDrag.start}
        aria-label="Open Guru Helper"
        title="Guru Helper (Ctrl+G) Ã¢â‚¬â€ drag to move"
        style={{ left: fabPos.x, top: fabPos.y }}
      >
        <span className="wm-guru-fab-dot" aria-hidden="true" />
        <span className="wm-guru-fab-text">Guru</span>
      </button>

      {/* Panel */}
      {state.open && (
        <div className="wm-guru-overlay" role="dialog" aria-modal="true">
          <div className="wm-guru-panel" style={{ left: panelPos.x, top: panelPos.y }}>
            <div className="wm-guru-handle" onPointerDown={panelDrag.start} title="Drag to move">
              <div>
                <div className="wm-guru-title">AV Guru Helper</div>
                <div className="wm-guru-sub">Always available Ã¢â‚¬Â¢ Ctrl+G Ã¢â‚¬Â¢ Esc to close Ã¢â‚¬Â¢ Drag to move</div>
              </div>
              <button className="wm-btn" onClick={() => api.close()}>Close</button>
            </div>

            <div className="wm-row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className={cls("wm-btn", state.mode === "ask" && "wm-btn-primary")} onClick={() => api.setMode("ask")}>Ask</button>
              <button className={cls("wm-btn", state.mode === "resources" && "wm-btn-primary")} onClick={() => api.setMode("resources")}>Resources</button>
              <button className={cls("wm-btn", state.mode === "project-check" && "wm-btn-primary")} onClick={() => api.setMode("project-check")}>Project Check</button>
            </div>

            {state.mode === "ask" && (
              <div style={{ marginTop: 12 }}>
                <div className="wm-row" style={{ gap: 10 }}>
                  <input
                    className="wm-input"
                    placeholder="Ask an AV question or a WyreStorm product questionÃ¢â‚¬Â¦"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  />
                  <button className={cls("wm-btn", "wm-btn-primary")} onClick={submit} disabled={busy}>
                    {busy ? "ThinkingÃ¢â‚¬Â¦" : "Ask"}
                  </button>
                </div>

                {err && <div style={{ marginTop: 10 }} className="wm-muted">Error: {err}</div>}

                {ans && (
                  <div className="wm-card" style={{ marginTop: 12 }}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{ans.text}</div>

                    {ans.sources && ans.sources.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Suggested Links</div>
                        <div className="wm-row" style={{ flexWrap: "wrap", gap: 8 }}>
                          {ans.sources.map((s, idx) => (
                            s.to ? (
                              <Link key={idx} to={s.to} className="wm-pill" style={{ textDecoration: "none", color: "inherit" }}>
                                {s.title}
                              </Link>
                            ) : (
                              <a key={idx} href={s.url || "#"} className="wm-pill" style={{ textDecoration: "none", color: "inherit" }} target="_blank" rel="noreferrer">
                                {s.title}
                              </a>
                            )
                          ))}
                        </div>
                      </div>
                    )}

                    {ans.confidence && (
                      <div className="wm-muted" style={{ marginTop: 10, fontSize: 12 }}>
                        Confidence: <span className="wm-mono">{ans.confidence}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {state.mode === "resources" && (
              <div style={{ marginTop: 12 }}>
                <div className="wm-card">
                  <div style={{ fontWeight: 700 }}>Quick Resources</div>
                  <div className="wm-muted" style={{ marginTop: 6 }}>
                    Starter links (wire your real modules/videos/docs next).
                  </div>
                  <div className="wm-row" style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    <Link to="/app/tools/training" className="wm-pill" style={{ textDecoration: "none", color: "inherit" }}>Training Hub</Link>
                    <Link to="/app/tools/catalog" className="wm-pill" style={{ textDecoration: "none", color: "inherit" }}>Product Catalog</Link>
                    <Link to="/app/tools/videowall" className="wm-pill" style={{ textDecoration: "none", color: "inherit" }}>Video Wall (Next)</Link>
                    <Link to="/app/tools/proposal" className="wm-pill" style={{ textDecoration: "none", color: "inherit" }}>Proposal (Next)</Link>
                  </div>
                </div>
              </div>
            )}

            {state.mode === "project-check" && (
              <div style={{ marginTop: 12 }}>
                <div className="wm-card">
                  <div style={{ fontWeight: 700 }}>Design Advisor</div>
                  <div className="wm-muted" style={{ marginTop: 6 }}>
                    Next: pass live Room/VideoWall/BOM context to Guru so it can flag errors (I/O mismatch, distances, missing endpoints, windowing limits).
                  </div>
                  <div className="wm-muted" style={{ marginTop: 10 }}>
                    For now, use Ã¢â‚¬Å“AskÃ¢â‚¬Â and include your design notes in the question.
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
