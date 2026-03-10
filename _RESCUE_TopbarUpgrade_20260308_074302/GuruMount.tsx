import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const GURU_ROUTE = "/app/tools/guru";
const STORAGE_KEY = "wm_guru_fab_pos_v1";

type FabPos = { x: number; y: number };

const styles = `
.wm-guru-launch__fab{
  position: fixed;
  z-index: 9997;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(34,199,184,0.22);
  background: linear-gradient(180deg, rgba(23,84,77,0.95), rgba(18,63,58,0.98));
  color: #f3fffd;
  font: 600 0.92rem/1 "Aptos Narrow","Arial Narrow","Inter","Segoe UI",Arial,sans-serif;
  box-shadow: 0 14px 30px rgba(0,0,0,0.28);
  cursor: grab;
  user-select: none;
  touch-action: none;
  transition: box-shadow 0.16s ease, border-color 0.16s ease;
}

.wm-guru-launch__fab:hover{
  box-shadow: 0 18px 36px rgba(0,0,0,0.34);
  border-color: rgba(34,199,184,0.32);
}

.wm-guru-launch__fab--dragging{
  cursor: grabbing;
  box-shadow: 0 20px 40px rgba(0,0,0,0.38);
}

.wm-guru-launch__icon{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 0.95rem;
  line-height: 1;
}

.wm-guru-launch__label{
  white-space: nowrap;
}

.wm-guru-launch__hint{
  position: fixed;
  z-index: 9996;
  max-width: 240px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(110,145,190,0.14);
  background: rgba(9,16,28,0.94);
  color: rgba(232,241,255,0.76);
  font: 500 0.82rem/1.35 "Aptos Narrow","Arial Narrow","Inter","Segoe UI",Arial,sans-serif;
  box-shadow: 0 12px 26px rgba(0,0,0,0.24);
  pointer-events: none;
}

@media (max-width: 720px){
  .wm-guru-launch__fab{
    min-height: 44px;
    padding: 0 14px;
  }
}
`;

function defaultPos() {
  return {
    x: window.innerWidth - 150,
    y: window.innerHeight - 78,
  };
}

function clampPos(pos: FabPos): FabPos {
  const maxX = Math.max(12, window.innerWidth - 170);
  const maxY = Math.max(12, window.innerHeight - 70);
  return {
    x: Math.min(Math.max(12, pos.x), maxX),
    y: Math.min(Math.max(12, pos.y), maxY),
  };
}

function readStoredPos(): FabPos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FabPos;
  } catch {
    return null;
  }
}

function writeStoredPos(pos: FabPos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {}
}

export default function GuruMount() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHint, setShowHint] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [pos, setPos] = React.useState<FabPos>(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    return clampPos(readStoredPos() ?? defaultPos());
  });

  const pointerOffset = React.useRef({ x: 0, y: 0 });
  const movedRef = React.useRef(false);

  const hidden = React.useMemo(() => {
    return (
      location.pathname.startsWith("/app/tools/guru") ||
      location.pathname.startsWith("/app/guru")
    );
  }, [location.pathname]);

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

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isG = event.key.toLowerCase() === "g";
      if ((event.ctrlKey || event.metaKey) && isG) {
        event.preventDefault();
        navigate(GURU_ROUTE);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const beginDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    movedRef.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    movedRef.current = true;
    const next = clampPos({
      x: event.clientX - pointerOffset.current.x,
      y: event.clientY - pointerOffset.current.y,
    });
    setPos(next);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    writeStoredPos(pos);
  };

  const onClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    navigate(GURU_ROUTE);
  };

  if (hidden) return null;

  return (
    <>
      <style>{styles}</style>

      {showHint ? (
        <div
          className="wm-guru-launch__hint"
          style={{ left: `${Math.max(12, pos.x - 40)}px`, top: `${Math.max(12, pos.y - 54)}px` }}
        >
          Drag to reposition. Click to open Guru.
        </div>
      ) : null}

      <button
        type="button"
        className={`wm-guru-launch__fab${dragging ? " wm-guru-launch__fab--dragging" : ""}`}
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onClick}
        onMouseEnter={() => setShowHint(true)}
        onMouseLeave={() => setShowHint(false)}
        onFocus={() => setShowHint(true)}
        onBlur={() => setShowHint(false)}
        aria-label="Open Guru"
        title="Open Guru"
      >
        <span className="wm-guru-launch__icon">✦</span>
        <span className="wm-guru-launch__label">Guru</span>
      </button>
    </>
  );
}