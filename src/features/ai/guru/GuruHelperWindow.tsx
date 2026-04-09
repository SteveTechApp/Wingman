import * as React from "react";
import { Move, Minus, Maximize2, X } from "lucide-react";
import "./guru-helper-window.css";

const GuruToolHostPage = React.lazy(() => import("@/features/ai/guru/GuruToolHostPage"));

type GuruBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type GuruHelperWindowProps = {
  open: boolean;
  minimized: boolean;
  bounds: GuruBounds;
  onBoundsChange: React.Dispatch<React.SetStateAction<GuruBounds>>;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
};

type DragState =
  | {
      mode: "move";
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    }
  | {
      mode: "resize";
      startX: number;
      startY: number;
      originWidth: number;
      originHeight: number;
    }
  | null;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function GuruHelperWindow({
  open,
  minimized,
  bounds,
  onBoundsChange,
  onClose,
  onMinimize,
}: GuruHelperWindowProps) {
  const dragRef = React.useRef<DragState>(null);
  const frameRef = React.useRef<HTMLElement | null>(null);
  const [avatarVisible, setAvatarVisible] = React.useState(true);

  React.useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const active = dragRef.current;
      if (!active) {
        return;
      }

      if (active.mode === "move") {
        const nextX = active.originX + (event.clientX - active.startX);
        const nextY = active.originY + (event.clientY - active.startY);
        const maxX = Math.max(8, window.innerWidth - bounds.width - 8);
        const maxY = Math.max(8, window.innerHeight - bounds.height - 8);

        onBoundsChange((current) => ({
          ...current,
          x: clamp(nextX, 8, maxX),
          y: clamp(nextY, 8, maxY),
        }));
      }

      if (active.mode === "resize") {
        const nextWidth = active.originWidth + (event.clientX - active.startX);
        const nextHeight = active.originHeight + (event.clientY - active.startY);

        onBoundsChange((current) => ({
          ...current,
          width: clamp(nextWidth, 380, window.innerWidth - current.x - 8),
          height: clamp(nextHeight, 420, window.innerHeight - current.y - 8),
        }));
      }
    }

    function onMouseUp() {
      dragRef.current = null;
      document.body.classList.remove("wm-guru-dragging");
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [bounds.width, bounds.height, onBoundsChange]);

  React.useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    frame.style.setProperty("--wm-guru-window-left", `${bounds.x}px`);
    frame.style.setProperty("--wm-guru-window-top", `${bounds.y}px`);
    frame.style.setProperty("--wm-guru-window-width", `${bounds.width}px`);
    frame.style.setProperty("--wm-guru-window-height", `${bounds.height}px`);
  }, [bounds.height, bounds.width, bounds.x, bounds.y]);

  function beginMove(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    dragRef.current = {
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      originX: bounds.x,
      originY: bounds.y,
    };
    document.body.classList.add("wm-guru-dragging");
  }

  function beginResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      mode: "resize",
      startX: event.clientX,
      startY: event.clientY,
      originWidth: bounds.width,
      originHeight: bounds.height,
    };
    document.body.classList.add("wm-guru-dragging");
  }

  if (!open || minimized) {
    return null;
  }

  return (
    <section
      className="wm-guru-window"
      ref={frameRef}
    >
      <div className="wm-guru-window-header" onMouseDown={beginMove}>
        <div className="wm-guru-window-title">
          {avatarVisible ? (
            <img
              src="/guru.png"
              alt="Wingman Guru"
              className="wm-guru-window-avatar"
              onError={() => setAvatarVisible(false)}
            />
          ) : null}
          <div className="wm-guru-window-title-copy">
            <strong>Wingman Guru</strong>
            <span>General AV, WyreStorm, and current project help</span>
          </div>
        </div>

        <div className="wm-guru-window-actions">
          <button type="button" className="wm-guru-window-btn" onClick={onMinimize} title="Minimise">
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="wm-guru-window-btn"
            onClick={() => {
              onBoundsChange(() => {
                const width = 520;
                const height = 680;
                return {
                  x: Math.max(20, window.innerWidth - width - 28),
                  y: Math.max(20, window.innerHeight - height - 28),
                  width,
                  height,
                };
              });
            }}
            title="Reset size and position"
          >
            <Maximize2 size={16} />
          </button>
          <button type="button" className="wm-guru-window-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="wm-guru-window-toolbar">
        <div className="wm-guru-window-pill">
          <Move size={14} />
          <span>Ask, review, or validate</span>
        </div>
      </div>

      <div className="wm-guru-window-body">
        <React.Suspense fallback={<div className="wm-guru-window-loading">Loading Guru...</div>}>
          <GuruToolHostPage />
        </React.Suspense>
      </div>

      <div className="wm-guru-window-resize" onMouseDown={beginResize} />
    </section>
  );
}
