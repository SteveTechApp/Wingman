import * as React from "react";

type Pos = {
  x: number;
  y: number;
};

const BUTTON_W = 124;
const BUTTON_H = 48;
const PANEL_W = 340;
const GAP = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function GuruMount() {
  const [open, setOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState<"button" | "panel" | null>(null);
  const [buttonPos, setButtonPos] = React.useState<Pos>(() => {
    if (typeof window === "undefined") return { x: 24, y: 24 };
    return {
      x: window.innerWidth - BUTTON_W - 24,
      y: window.innerHeight - BUTTON_H - 24,
    };
  });

  const [panelPos, setPanelPos] = React.useState<Pos>(() => {
    if (typeof window === "undefined") return { x: 24, y: 24 };
    return {
      x: window.innerWidth - PANEL_W - 24,
      y: window.innerHeight - 420,
    };
  });

  const dragRef = React.useRef<{
    mode: "button" | "panel" | null;
    offsetX: number;
    offsetY: number;
  }>({
    mode: null,
    offsetX: 0,
    offsetY: 0,
  });

  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    function onResize() {
      setButtonPos((p) => ({
        x: clamp(p.x, 8, Math.max(8, window.innerWidth - BUTTON_W - 8)),
        y: clamp(p.y, 8, Math.max(8, window.innerHeight - BUTTON_H - 8)),
      }));

      setPanelPos((p) => ({
        x: clamp(p.x, 8, Math.max(8, window.innerWidth - PANEL_W - 8)),
        y: clamp(p.y, 8, Math.max(8, window.innerHeight - 220)),
      }));
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragRef.current.mode) return;

      if (dragRef.current.mode === "button") {
        setButtonPos({
          x: clamp(e.clientX - dragRef.current.offsetX, 8, window.innerWidth - BUTTON_W - 8),
          y: clamp(e.clientY - dragRef.current.offsetY, 8, window.innerHeight - BUTTON_H - 8),
        });
      }

      if (dragRef.current.mode === "panel") {
        setPanelPos({
          x: clamp(e.clientX - dragRef.current.offsetX, 8, window.innerWidth - PANEL_W - 8),
          y: clamp(e.clientY - dragRef.current.offsetY, 8, window.innerHeight - 120),
        });
      }
    }

    function stopDrag() {
      dragRef.current.mode = null;
      setDragging(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
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
    if ((e.target as HTMLElement).closest("[data-no-drag="true"]")) return;
    dragRef.current = {
      mode: "button",
      offsetX: e.clientX - buttonPos.x,
      offsetY: e.clientY - buttonPos.y,
    };
    setDragging("button");
  }

  function beginPanelDrag(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      mode: "panel",
      offsetX: e.clientX - panelPos.x,
      offsetY: e.clientY - panelPos.y,
    };
    setDragging("panel");
  }

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (!v) {
        setPanelPos({
          x: clamp(buttonPos.x + BUTTON_W - PANEL_W, 8, window.innerWidth - PANEL_W - 8),
          y: clamp(buttonPos.y - 360 - GAP, 8, window.innerHeight - 120),
        });
      }
      return next;
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="wm-guru-btn"
        aria-label="Open Guru"
        title="Open Guru"
        onClick={toggleOpen}
        onPointerDown={beginButtonDrag}
        style={{
          left: buttonPos.x,
          top: buttonPos.y,
          right: "auto",
          bottom: "auto",
          cursor: dragging === "button" ? "grabbing" : "grab",
        }}
      >
        GURU
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="wm-guru-panel"
          role="dialog"
          aria-label="Wingman Guru"
          style={{
            left: panelPos.x,
            top: panelPos.y,
            right: "auto",
            bottom: "auto",
          }}
        >
          <div
            className="wm-guru-header"
            onPointerDown={beginPanelDrag}
            style={{ cursor: dragging === "panel" ? "grabbing" : "grab" }}
          >
            <div>
              <div className="wm-guru-title">Wingman Guru</div>
              <div className="wm-guru-subtitle">Sales and design assistant</div>
            </div>

            <button
              type="button"
              className="wm-guru-close"
              aria-label="Close Guru"
              data-no-drag="true"
              onClick={() => setOpen(false)}
            >
              Ã—
            </button>
          </div>

          <div className="wm-guru-body">
            <div className="wm-panel">
              <h4>Guru Assistant</h4>
              <p>
                Use Guru for discovery guidance, product selection help, competitor positioning,
                and proposal support.
              </p>
            </div>

            <div className="wm-field">
              <label>Ask Guru</label>
              <textarea
                className="wm-textarea"
                placeholder="Example: Recommend WyreStorm products for a 3 display Teams room with USB cameras and 20m transport."
              />
            </div>

            <div className="wm-toolbar">
              <button type="button" className="wm-btn-primary">Ask Guru</button>
              <button type="button" className="wm-btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}