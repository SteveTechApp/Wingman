import * as React from "react";
import { Expand, Maximize2, Minimize2, Minus, X } from "lucide-react";

import GuruLogo from "@/components/branding/GuruLogo";
import GuruDock from "@/features/ai/guru/GuruDock";
import { getDefaultGuruBounds, type GuruBounds } from "@/features/ai/guru/guruLayout";
import "./guru-helper-window.css";

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

function getFullscreenBounds(): GuruBounds {
  const x = 14;
  const y = 88;

  return {
    x,
    y,
    width: Math.max(420, window.innerWidth - x - 14),
    height: Math.max(480, window.innerHeight - y - 14),
  };
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
  const restoreBoundsRef = React.useRef<GuruBounds | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (open || !isFullscreen) {
      return;
    }

    if (restoreBoundsRef.current) {
      onBoundsChange(() => restoreBoundsRef.current ?? getDefaultGuruBounds());
    }

    restoreBoundsRef.current = null;
    setIsFullscreen(false);
  }, [isFullscreen, onBoundsChange, open]);

  React.useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const active = dragRef.current;
      if (!active || isFullscreen) {
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
  }, [bounds.height, bounds.width, isFullscreen, onBoundsChange]);

  React.useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    function syncFullscreenBounds() {
      onBoundsChange(() => getFullscreenBounds());
    }

    syncFullscreenBounds();
    window.addEventListener("resize", syncFullscreenBounds);
    return () => window.removeEventListener("resize", syncFullscreenBounds);
  }, [isFullscreen, onBoundsChange]);

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
    if (isFullscreen) {
      return;
    }

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
    if (isFullscreen) {
      return;
    }

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

  function resetWindowBounds() {
    setIsFullscreen(false);
    restoreBoundsRef.current = null;
    onBoundsChange(() => getDefaultGuruBounds());
  }

  function toggleFullscreen() {
    dragRef.current = null;
    document.body.classList.remove("wm-guru-dragging");

    if (isFullscreen) {
      const nextBounds = restoreBoundsRef.current ?? getDefaultGuruBounds();
      setIsFullscreen(false);
      onBoundsChange(() => nextBounds);
      return;
    }

    restoreBoundsRef.current = bounds;
    setIsFullscreen(true);
    onBoundsChange(() => getFullscreenBounds());
  }

  if (!open || minimized) {
    return null;
  }

  return (
    <section
      className={`wm-guru-window${isFullscreen ? " is-fullscreen" : ""}`}
      ref={frameRef}
      role="dialog"
      aria-label="Guru assistant"
    >
      <header className="wm-guru-window-header" onMouseDown={beginMove} onDoubleClick={toggleFullscreen}>
        <div className="wm-guru-window-brand">
          <GuruLogo className="wm-guru-window-logo" alt="Guru" />

          <div className="wm-guru-window-title-copy">
            <strong>Guru</strong>
            <span>WyreStorm sales, product and technical chat</span>
          </div>
        </div>

        <div className="wm-guru-window-actions" onMouseDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="wm-guru-window-btn"
            onClick={resetWindowBounds}
            title="Reset size and position"
            aria-label="Reset size and position"
          >
            <Expand size={17} />
          </button>
          <button
            type="button"
            className="wm-guru-window-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit full screen" : "Full screen"}
            aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <button type="button" className="wm-guru-window-btn" onClick={onMinimize} title="Minimise">
            <Minus size={17} />
          </button>
          <button type="button" className="wm-guru-window-btn is-close" onClick={onClose} title="Close">
            <X size={17} />
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
