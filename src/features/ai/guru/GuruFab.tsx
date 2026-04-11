import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import guruBotIcon from "../../../assets/branding/guru.png";
import "./GuruFab.css";

type GuruFabProps = {
  open?: boolean;
  minimized?: boolean;
  onToggle?: () => void;
};

type Point = {
  x: number;
  y: number;
};

const STORAGE_KEY = "wm:guru:floating-position";
const FAB_SIZE = 76;
const VIEWPORT_MARGIN = 18;
const DRAG_THRESHOLD = 8;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getDefaultPosition(): Point {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }

  const x = Math.max(VIEWPORT_MARGIN, window.innerWidth - FAB_SIZE - 28);
  const y = Math.max(VIEWPORT_MARGIN, window.innerHeight - FAB_SIZE - 28);

  return { x, y };
}

function clampToViewport(point: Point): Point {
  if (typeof window === "undefined") return point;

  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - FAB_SIZE - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - FAB_SIZE - VIEWPORT_MARGIN);

  return {
    x: clamp(point.x, VIEWPORT_MARGIN, maxX),
    y: clamp(point.y, VIEWPORT_MARGIN, maxY),
  };
}

function readStoredPosition(): Point {
  if (typeof window === "undefined") {
    return getDefaultPosition();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPosition();

    const parsed = JSON.parse(raw) as Partial<Point>;
    if (typeof parsed?.x !== "number") return getDefaultPosition();
    if (typeof parsed?.y !== "number") return getDefaultPosition();

    return clampToViewport({ x: parsed.x, y: parsed.y });
  } catch {
    return getDefaultPosition();
  }
}

function writeStoredPosition(point: Point): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(point));
  } catch {
    return;
  }
}

export default function GuruFab({ open = false, minimized = false, onToggle }: GuruFabProps) {
  const [position, setPosition] = useState<Point>(() => readStoredPosition());

  const pointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const startPositionRef = useRef<Point>(position);
  const movedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const sync = () => {
      setPosition((current) => {
        const next = clampToViewport(current);
        writeStoredPosition(next);
        return next;
      });
    };

    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    sync();

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    writeStoredPosition(position);
  }, [position]);

  const handlePointerDown: React.PointerEventHandler<HTMLButtonElement> = (event) => {
    if (event.button !== 0) return;

    pointerIdRef.current = event.pointerId;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    startPositionRef.current = position;
    movedRef.current = false;

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLButtonElement> = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;

    if (!movedRef.current) {
      const distance = Math.hypot(deltaX, deltaY);
      if (distance >= DRAG_THRESHOLD) {
        movedRef.current = true;
      }
    }

    if (!movedRef.current) return;

    const next = clampToViewport({
      x: startPositionRef.current.x + deltaX,
      y: startPositionRef.current.y + deltaY,
    });

    setPosition(next);
  };

  const endPointerInteraction = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      return;
    } finally {
      pointerIdRef.current = null;
    }

    if (!movedRef.current) {
      onToggle?.();
    }
  };

  const style = useMemo<CSSProperties>(() => {
    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
    };
  }, [position]);

  const label = open && !minimized ? "Hide Guru" : "Open Guru";

  return (
    <button
      ref={buttonRef}
      type="button"
      className="wm-guru-fab"
      aria-label={label}
      aria-pressed={open && !minimized}
      title={label}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerInteraction}
      onPointerCancel={endPointerInteraction}
    >
      <img className="wm-guru-fab__icon" src={guruBotIcon} alt="Guru" draggable={false} />
      <span className="wm-guru-fab__status" aria-hidden="true" />
    </button>
  );
}