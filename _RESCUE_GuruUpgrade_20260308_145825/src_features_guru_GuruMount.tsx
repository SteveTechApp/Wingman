import * as React from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { getGuruContext } from "./guruContext";
import { getProjectContext } from "./guruProjectContext";

type Pos = {
  x: number;
  y: number;
};

const BUTTON_W = 132;
const BUTTON_H = 48;
const PANEL_W = 400;
const PANEL_H_EST = 500;
const EDGE = 12;
const GAP = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function viewport() {
  if (typeof window === "undefined") {
    return { w: 1280, h: 800 };
  }
  return { w: window.innerWidth, h: window.innerHeight };
}

function getDefaultButtonPos(): Pos {
  const { w, h } = viewport();
  return {
    x: w - BUTTON_W - 24,
    y: h - BUTTON_H - 24,
  };
}

function getDefaultPanelPos(buttonPos: Pos): Pos {
  const { w, h } = viewport();
  return {
    x: clamp(buttonPos.x + BUTTON_W - PANEL_W, EDGE, w - PANEL_W - EDGE),
    y: clamp(buttonPos.y - PANEL_H_EST - GAP, EDGE, h - 140),
  };
}

export default function GuruMount() {
  const location = useLocation();
  const context = React.useMemo(() => getGuruContext(location.pathname), [location.pathname]);
  const project = React.useMemo(() => getProjectContext(), [location.pathname]);

  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [answer, setAnswer] = React.useState("");

  const [buttonPos, setButtonPos] = React.useState<Pos>(() => getDefaultButtonPos());
  const [panelPos, setPanelPos] = React.useState<Pos>(() => getDefaultPanelPos(getDefaultButtonPos()));
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
      const { w, h } = viewport();

      setButtonPos((p) => ({
        x: clamp(p.x, EDGE, Math.max(EDGE, w - BUTTON_W - EDGE)),
        y: clamp(p.y, EDGE, Math.max(EDGE, h - BUTTON_H - EDGE)),
      }));

      setPanelPos((p) => ({
        x: clamp(p.x, EDGE, Math.max(EDGE, w - PANEL_W - EDGE)),
        y: clamp(p.y, EDGE, Math.max(EDGE, h - 120)),
      }));
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
  }, []);

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
        setPanelPos(getDefaultPanelPos(buttonPos));
      }
      return next;
    });
  }

  function askAssistant() {
    const prompt = input.trim();

    if (!prompt) {
      const projectSummary = project.projectName
        ? ` Active project ${project.projectName}. Stage ${project.stage ?? "Unknown"}. Products ${project.skuCount ?? 0}.`
        : project.skuCount
          ? ` Current product count ${project.skuCount}.`
          : "";

      setAnswer(`${context.suggestions.join(" ")}${projectSummary}`);
      return;
    }

    const projectSummary = project.projectName
      ? ` Active project ${project.projectName}. Stage ${project.stage ?? "Unknown"}. Products ${project.skuCount ?? 0}.`
      : project.skuCount
        ? ` Current product count ${project.skuCount}.`
        : "";

    setAnswer(
      `Route guidance: ${context.suggestions.join(" ")}${projectSummary} Your question was: ${prompt}`
    );
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
          border: "1px solid #ff8a00 !important",
          borderRadius: "999px",
          background: "linear-gradient(90deg,#ffb347,#ff7a00) !important",
          color: "#1c0f00",
          fontWeight: 900,
          fontSize: "14px",
          letterSpacing: "0.08em",
          boxShadow:
            "0 16px 36px rgba(255,120,0,0.45), 0 0 0 1px rgba(255,210,160,0.2) inset",
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
                Route-aware Wingman assistance
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
              Ã—
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
            {project.projectName ? (
              <div
                style={{
                  border: "1px solid rgba(110,170,230,0.18)",
                  background: "#102c4d",
                  borderRadius: "16px",
                  padding: "14px",
                }}
              >
                <h4 style={{ margin: "0 0 6px", color: "#eef6ff", fontSize: "18px" }}>
                  Active Project
                </h4>

                <div style={{ fontSize: "13px", color: "rgba(210,228,247,0.8)", lineHeight: 1.55 }}>
                  <div><strong>{project.projectName}</strong></div>
                  <div>Stage: {project.stage ?? "Unknown"}</div>
                  <div>Products: {project.skuCount ?? 0}</div>
                </div>
              </div>
            ) : null}

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