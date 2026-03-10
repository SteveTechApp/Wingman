import * as React from "react";

type Pos = { x: number; y: number };

const FAB_SIZE = 58;
const PANEL_WIDTH = 360;
const EDGE = 24;
const STORAGE_KEY = "wm_guru_fab_pos";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDefaultPos(): Pos {
  if (typeof window === "undefined") return { x: EDGE, y: EDGE };
  return {
    x: Math.max(EDGE, window.innerWidth - FAB_SIZE - EDGE),
    y: Math.max(EDGE, window.innerHeight - FAB_SIZE - EDGE),
  };
}

function clampPos(pos: Pos): Pos {
  if (typeof window === "undefined") return pos;
  return {
    x: clamp(pos.x, EDGE, Math.max(EDGE, window.innerWidth - FAB_SIZE - EDGE)),
    y: clamp(pos.y, EDGE, Math.max(EDGE, window.innerHeight - FAB_SIZE - EDGE)),
  };
}

function readStoredPos(): Pos {
  if (typeof window === "undefined") return { x: EDGE, y: EDGE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPos();
    const parsed = JSON.parse(raw) as Partial<Pos>;
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return clampPos({ x: parsed.x, y: parsed.y });
    }
  } catch {
  }
  return getDefaultPos();
}

function writeStoredPos(pos: Pos): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
  }
}

export default function GuruMount() {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<Pos>(() => readStoredPos());
  const [dragging, setDragging] = React.useState(false);

  const dragRef = React.useRef({
    active: false,
    moved: false,
    offsetX: 0,
    offsetY: 0,
    pointerId: -1,
  });

  React.useEffect(() => {
    const onResize = () => {
      setPos((prev) => {
        const next = clampPos(prev);
        writeStoredPos(next);
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current.active = true;
    dragRef.current.moved = false;
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.offsetX = e.clientX - pos.x;
    dragRef.current.offsetY = e.clientY - pos.y;
    setDragging(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active) return;
    const next = clampPos({
      x: e.clientX - dragRef.current.offsetX,
      y: e.clientY - dragRef.current.offsetY,
    });

    const movedEnough =
      Math.abs(next.x - pos.x) > 2 || Math.abs(next.y - pos.y) > 2;

    if (movedEnough && !dragRef.current.moved) {
      dragRef.current.moved = true;
      setDragging(true);
    }

    setPos(next);
  };

  const finishDrag = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragging(false);
    setPos((prev) => {
      const next = clampPos(prev);
      writeStoredPos(next);
      return next;
    });
  };

  const onClick = () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setOpen((v) => !v);
  };

  const panelRight = Math.max(16, window.innerWidth - pos.x - FAB_SIZE);
  const panelBottom = Math.max(16, window.innerHeight - pos.y + 12);

  return (
    <>
      <button
        type="button"
        aria-label="Open Guru"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 5000,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: 999,
          border: "1px solid rgba(255,196,120,0.65)",
          background: "linear-gradient(90deg, #ffcc80, #ff8f1f)",
          color: "#1f1405",
          fontSize: 14,
          fontWeight: 800,
          cursor: dragging ? "grabbing" : "grab",
          boxShadow: "0 10px 28px rgba(255,145,31,0.40), 0 0 0 1px rgba(255,206,134,0.20) inset",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
          userSelect: "none",
          padding: 0,
        }}
      >GURU</button>

      {open ? (
        <div
          style={{
            position: "fixed",
            right: panelRight,
            bottom: panelBottom,
            zIndex: 5001,
            width: PANEL_WIDTH,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 16,
            border: "1px solid rgba(255,196,120,0.65)",
            background: "linear-gradient(90deg, #ffcc80, #ff8f1f)",
            boxShadow: "0 10px 28px rgba(255,145,31,0.40), 0 0 0 1px rgba(255,206,134,0.20) inset",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 18px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              color: "#1f1405",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            <span>GURU</span>
            <button
              type="button"
              aria-label="Close Guru"
              onClick={() => setOpen(false)}
              style={{
                border: "1px solid rgba(255,196,120,0.65)",
                background: "linear-gradient(90deg, #ffcc80, #ff8f1f)",
                color: "#1f1405",
                fontSize: 14,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              X
            </button>
          </div>

          <div
            style={{
              padding: 14,
              color: "#1f1405",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Guru assistant is ready.
          </div>
        </div>
      ) : null}
    </>
  );
}