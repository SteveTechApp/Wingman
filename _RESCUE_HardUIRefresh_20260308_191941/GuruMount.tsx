import * as React from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { getGuruContext } from "./guruContext";

type Pos = {
  x: number;
  y: number;
};

type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

const BUTTON_W = 132;
const BUTTON_H = 48;
const PANEL_W = 420;
const EDGE = 16;
const GAP = 12;
const STORAGE_KEY = "wm_assist_anchor_corner";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function viewport() {
  if (typeof window === "undefined") {
    return { w: 1280, h: 800 };
  }
  return { w: window.innerWidth, h: window.innerHeight };
}

function loadCorner(): Corner {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) as Corner | null;
    if (
      raw === "bottom-right" ||
      raw === "bottom-left" ||
      raw === "top-right" ||
      raw === "top-left"
    ) {
      return raw;
    }
  } catch {
    // ignore
  }
  return "bottom-right";
}

function saveCorner(corner: Corner) {
  try {
    window.localStorage.setItem(STORAGE_KEY, corner);
  } catch {
    // ignore
  }
}

function cornerToButtonPos(corner: Corner): Pos {
  const { w, h } = viewport();

  switch (corner) {
    case "bottom-left":
      return { x: EDGE, y: h - BUTTON_H - EDGE };
    case "top-right":
      return { x: w - BUTTON_W - EDGE, y: EDGE };
    case "top-left":
      return { x: EDGE, y: EDGE };
    case "bottom-right":
    default:
      return { x: w - BUTTON_W - EDGE, y: h - BUTTON_H - EDGE };
  }
}

function inferNearestCorner(pos: Pos): Corner {
  const { w, h } = viewport();
  const centerX = pos.x + BUTTON_W / 2;
  const centerY = pos.y + BUTTON_H / 2;

  const right = centerX > w / 2;
  const bottom = centerY > h / 2;

  if (right && bottom) return "bottom-right";
  if (!right && bottom) return "bottom-left";
  if (right && !bottom) return "top-right";
  return "top-left";
}

function defaultPanelPos(buttonPos: Pos, corner: Corner): Pos {
  const { w, h } = viewport();

  const x =
    corner === "bottom-right" || corner === "top-right"
      ? clamp(buttonPos.x + BUTTON_W - PANEL_W, EDGE, w - PANEL_W - EDGE)
      : clamp(buttonPos.x, EDGE, w - PANEL_W - EDGE);

  const y =
    corner === "bottom-right" || corner === "bottom-left"
      ? clamp(buttonPos.y - 430 - GAP, EDGE, h - 140)
      : clamp(buttonPos.y + BUTTON_H + GAP, EDGE, h - 140);

  return { x, y };
}

function buildResponse(pathname: string, prompt: string): string {
  const path = pathname.toLowerCase();

  if (path.includes("/discovery")) {
    if (prompt.includes("missing")) {
      return "Check customer outcome, room dimensions, display count, source count, transport distance, control method, USB needs, audio needs, and budget band. If any of those are not captured yet, Discovery is incomplete.";
    }
    if (prompt.includes("family") || prompt.includes("product")) {
      return "Start by deciding the transport method and room role. Small room switching often points toward Apollo. Longer distance or extension-led designs may suggest HDBaseT. Larger distributed systems can point toward AVoIP.";
    }
    return "For Discovery, keep the conversation structured: room purpose, sources, displays, distances, control, USB, audio, and budget. Once those are clear, move into product family selection.";
  }

  if (path.includes("/catalog")) {
    if (prompt.includes("shortlist")) {
      return "Shortlist by family first, then compare role fit. Start with the smallest set of products that clearly meet the room requirement rather than scanning the whole catalog.";
    }
    if (prompt.includes("meeting room")) {
      return "For a meeting room, begin with the room workflow: switching, USB, control, and transport distance. From there, shortlist the most likely room hub, extension, and endpoint products.";
    }
    return "In Catalog, filter by product family, narrow by room role, then add likely SKUs into the project rather than browsing everything at once.";
  }

  if (path.includes("/proposals")) {
    if (prompt.includes("export") || prompt.includes("check")) {
      return "Before export, confirm BOM quantities, role descriptions, exclusions, assumptions, and any third-party dependencies. Proposal language should explain value, not only part numbers.";
    }
    if (prompt.includes("structure")) {
      return "A strong proposal should include customer objective, design summary, BOM, assumptions, exclusions, and a concise commercial narrative.";
    }
    return "In Proposal Builder, focus on clarity: what the solution does, why it fits, what is included, and what assumptions or exclusions apply.";
  }

  return "Use Guru to guide the next workflow step. Keep the task obvious, complete Discovery before detailed selection, and use the current page context to decide what should happen next.";
}

export default function GuruMount() {
  const location = useLocation();
  const context = React.useMemo(() => getGuruContext(location.pathname), [location.pathname]);

  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [corner, setCorner] = React.useState<Corner>(() => {
    if (typeof window === "undefined") return "bottom-right";
    return loadCorner();
  });

  const [buttonPos, setButtonPos] = React.useState<Pos>(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    return cornerToButtonPos(loadCorner());
  });

  const [panelPos, setPanelPos] = React.useState<Pos>(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const c = loadCorner();
    const b = cornerToButtonPos(c);
    return defaultPanelPos(b, c);
  });

  const [dragging, setDragging] = React.useState<"button" | "panel" | null>(null);

  const movedRef = React.useRef(false);
  const dragRef = React.useRef<{
    mode: "button" | "panel" | null;
    offsetX: number;
    offsetY: number;
  }>({
    mode: null,
    offsetX: 0,
    offsetY: 0,
  });

  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function onResize() {
      const snapped = cornerToButtonPos(corner);
      setButtonPos(snapped);

      if (!dragRef.current.mode) {
        setPanelPos((current) => {
          const { w, h } = viewport();
          return {
            x: clamp(current.x, EDGE, Math.max(EDGE, w - PANEL_W - EDGE)),
            y: clamp(current.y, EDGE, Math.max(EDGE, h - 120)),
          };
        });
      }
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [corner]);

  React.useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragRef.current.mode) return;

      movedRef.current = true;
      const { w, h } = viewport();

      if (dragRef.current.mode === "button") {
        setButtonPos({
          x: clamp(e.clientX - dragRef.current.offsetX, EDGE, w - BUTTON_W - EDGE),
          y: clamp(e.clientY - dragRef.current.offsetY, EDGE, h - BUTTON_H - EDGE),
        });
      }

      if (dragRef.current.mode === "panel") {
        setPanelPos({
          x: clamp(e.clientX - dragRef.current.offsetX, EDGE, w - PANEL_W - EDGE),
          y: clamp(e.clientY - dragRef.current.offsetY, EDGE, h - 100),
        });
      }
    }

    function onPointerUp() {
      if (dragRef.current.mode === "button") {
        const nextCorner = inferNearestCorner(buttonPos);
        const snapped = cornerToButtonPos(nextCorner);
        setCorner(nextCorner);
        saveCorner(nextCorner);
        setButtonPos(snapped);

        if (open) {
          setPanelPos(defaultPanelPos(snapped, nextCorner));
        }
      }

      dragRef.current.mode = null;
      setDragging(null);

      window.setTimeout(() => {
        movedRef.current = false;
      }, 0);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [buttonPos, open]);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  function beginButtonDrag(e: React.PointerEvent<HTMLButtonElement>) {
    movedRef.current = false;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      mode: "button",
      offsetX: e.clientX - buttonPos.x,
      offsetY: e.clientY - buttonPos.y,
    };
    setDragging("button");
  }

  function beginPanelDrag(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag="true"]')) return;

    movedRef.current = false;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      mode: "panel",
      offsetX: e.clientX - panelPos.x,
      offsetY: e.clientY - panelPos.y,
    };
    setDragging("panel");
  }

  function handleButtonClick() {
    if (movedRef.current) return;

    setOpen((prev) => {
      const next = !prev;
      if (!prev) {
        setPanelPos(defaultPanelPos(buttonPos, corner));
      }
      return next;
    });
  }

  function askAssistant() {
    const prompt = input.trim();
    if (!prompt) {
      setAnswer(context.suggestions.join(" "));
      return;
    }

    setAnswer(buildResponse(location.pathname, prompt.toLowerCase()));
  }

  function useQuickPrompt(prompt: string) {
    setInput(prompt);
    setAnswer(buildResponse(location.pathname, prompt.toLowerCase()));
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        ref={buttonRef}
        type="button"
        className="wm-assist-btn"
        aria-label="Open assistant"
        title="Open assistant"
        onPointerDown={beginButtonDrag}
        onClick={handleButtonClick}
        style={{
          position: "fixed",
          left: `${buttonPos.x}px`,
          top: `${buttonPos.y}px`,
          width: `${BUTTON_W}px`,
          height: `${BUTTON_H}px`,
          zIndex: 2147483647,
          border: "1px solid #ff8a00",
          borderRadius: "999px",
          background: "linear-gradient(90deg,#ffb347,#1b8d78)",
          color: "#1c0f00",
          fontWeight: 900,
          fontSize: "14px",
          letterSpacing: "0.08em",
          boxShadow: "0 16px 36px rgba(255,120,0,0.45), 0 0 0 1px rgba(255,210,160,0.2) inset",
          cursor: dragging === "button" ? "grabbing" : "grab",
          userSelect: "none",
          right: "auto",
          bottom: "auto",
          padding: "0 20px",
        }}
      >
        GURU
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="wm-assist-panel"
          role="dialog"
          aria-label="Wingman assistant"
          style={{
            position: "fixed",
            left: `${panelPos.x}px`,
            top: `${panelPos.y}px`,
            width: `${PANEL_W}px`,
            maxWidth: "calc(100vw - 24px)",
            zIndex: 2147483647,
            background: "#0b2340",
            border: "1px solid rgba(110,170,230,0.18)",
            borderRadius: "18px",
            boxShadow: "0 28px 60px rgba(0,0,0,0.45)",
            overflow: "hidden",
            right: "auto",
            bottom: "auto",
          }}
        >
          <div
            className="wm-assist-header"
            onPointerDown={beginPanelDrag}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
              padding: "14px 16px",
              borderBottom: "1px solid rgba(110,170,230,0.18)",
              background: "#12355d",
              cursor: dragging === "panel" ? "grabbing" : "grab",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 800,
                  color: "#eef6ff",
                  fontSize: "16px",
                }}
              >
                {context.title}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  color: "rgba(210,228,247,0.75)",
                  fontSize: "12px",
                }}
              >
                Drag the button to snap it to a corner
              </div>
            </div>

            <button
              type="button"
              aria-label="Close assistant"
              data-no-drag="true"
              onClick={() => setOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "#eef6ff",
                fontSize: "22px",
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              padding: "16px",
              display: "grid",
              gap: "14px",
              background: "#0b2340",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(110,170,230,0.18)",
                background: "#12355d",
                borderRadius: "16px",
                padding: "16px",
              }}
            >
              <h4
                style={{
                  margin: "0 0 8px",
                  color: "#eef6ff",
                  fontSize: "18px",
                }}
              >
                Recommended help
              </h4>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  color: "rgba(210,228,247,0.88)",
                }}
              >
                {context.suggestions.map((item) => (
                  <li key={item} style={{ marginBottom: "6px" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "rgba(173,205,236,0.78)",
                  marginBottom: "8px",
                }}
              >
                Quick prompts
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {context.quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    data-no-drag="true"
                    onClick={() => useQuickPrompt(prompt)}
                    style={{
                      border: "1px solid rgba(110,170,230,0.18)",
                      background: "#102c4d",
                      color: "#dbe9ff",
                      borderRadius: "999px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="wm-field">
              <label>Ask Guru</label>
              <textarea
                className="wm-textarea"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a page-specific question"
              />
            </div>

            <div className="wm-toolbar">
              <button type="button" className="wm-btn-primary" onClick={askAssistant}>
                Ask Guru
              </button>
              <button type="button" className="wm-btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {answer ? (
              <div
                style={{
                  border: "1px solid rgba(110,170,230,0.18)",
                  background: "#12355d",
                  borderRadius: "16px",
                  padding: "16px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 8px",
                    color: "#eef6ff",
                    fontSize: "18px",
                  }}
                >
                  Guru Response
                </h4>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(210,228,247,0.88)",
                    lineHeight: 1.55,
                  }}
                >
                  {answer}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}