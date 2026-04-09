import * as React from "react";
import { Maximize2, Minus, X } from "lucide-react";

import GuruLogo from "@/components/branding/GuruLogo";
import GuruDock from "@/features/ai/guru/GuruDock";
import "./guru-helper-window.css";

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

  React.useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const active = dragRef.current;
      if (!active) {
        return;
      }

      if (active.mode === "move") {
        const nextX = active.originX + (event.clientX - active.startX);
        const nextY = active.originY + (event.clientY - active.startY);
        const maxX = Math.max(12, window.innerWidth - bounds.width - 12);
        const maxY = Math.max(84, window.innerHeight - bounds.height - 12);

        onBoundsChange((current) => ({
          ...current,
          x: clamp(nextX, 12, maxX),
          y: clamp(nextY, 84, maxY),
        }));
      }

      if (active.mode === "resize") {
        const nextWidth = active.originWidth + (event.clientX - active.startX);
        const nextHeight = active.originHeight + (event.clientY - active.startY);

        onBoundsChange((current) => ({
          ...current,
          width: clamp(nextWidth, 420, window.innerWidth - current.x - 12),
          height: clamp(nextHeight, 480, window.innerHeight - current.y - 12),
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
  }, [bounds.height, bounds.width, onBoundsChange]);

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

  function beginMove(event: React.MouseEvent<HTMLElement>) {
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

  function beginResize(event: React.MouseEvent<HTMLButtonElement>) {
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
    <section className="wm-guru-window" ref={frameRef} role="dialog" aria-label="Guru assistant">
      <header className="wm-guru-window-header" onMouseDown={beginMove}>
        <div className="wm-guru-window-brand">
          <div className="wm-guru-window-logo-wrap">
            <GuruLogo className="wm-guru-window-logo" alt="Guru" />
          </div>

          <div className="wm-guru-window-title-copy">
            <strong>Guru</strong>
            <span>Chat-first sales, product and technical support</span>
          </div>
        </div>

        <div className="wm-guru-window-actions" onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="wm-guru-window-btn" onClick={onMinimize} title="Minimise">
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="wm-guru-window-btn"
            onClick={() => {
              onBoundsChange(() => {
                const width = Math.max(420, Math.min(540, window.innerWidth - 32));
                const height = Math.max(520, Math.min(720, window.innerHeight - 120));

                return {
                  x: Math.max(16, window.innerWidth - width - 28),
                  y: Math.max(84, window.innerHeight - height - 24),
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
      </header>

      <div className="wm-guru-window-body">
        <GuruDock />
      </div>

      <button
        type="button"
        className="wm-guru-window-resize"
        onMouseDown={beginResize}
        aria-label="Resize Guru window"
        title="Resize Guru window"
      />
    </section>
  );
}
