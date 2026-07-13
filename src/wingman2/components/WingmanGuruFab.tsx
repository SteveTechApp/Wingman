import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";

type WingmanGuruFabProps = {
  open: boolean;
  onClick: () => void;
  hasContextualTransfer?: boolean;
};

type GuruPosition = {
  left: number;
  top: number;
};

type DragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  moved: boolean;
};

const storageKey = "wingmanGuruPosition";
const dragThreshold = 4;
const clickDelayMs = 280;
const viewportInset = 12;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function readStoredPosition(): GuruPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GuruPosition>;
    if (typeof parsed.left !== "number" || typeof parsed.top !== "number") {
      return null;
    }

    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
}

function saveStoredPosition(position: GuruPosition) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(position));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function clearStoredPosition() {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function defaultGuruPosition(button?: HTMLButtonElement | null): GuruPosition {
  if (typeof window === "undefined") {
    return { left: 24, top: 180 };
  }

  const rect = button?.getBoundingClientRect();
  const width = rect?.width || 72;
  const height = rect?.height || 72;
  const narrowViewport =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 980px)").matches
      : window.innerWidth <= 980;

  return {
    left: clamp(
      window.innerWidth - width - (narrowViewport ? 18 : 28),
      viewportInset,
      Math.max(viewportInset, window.innerWidth - width - viewportInset),
    ),
    top: narrowViewport
      ? clamp(
          window.innerHeight - height - 18,
          viewportInset,
          Math.max(viewportInset, window.innerHeight - height - viewportInset),
        )
      : clamp(
          Math.round(window.innerHeight * 0.44),
          96,
          Math.max(96, window.innerHeight - height - 24),
        ),
  };
}

function emptyDragState(): DragState {
  return {
    pointerId: null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    moved: false,
  };
}

export function WingmanGuruFab({
  open,
  onClick,
  hasContextualTransfer = false,
}: WingmanGuruFabProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const motionRef = useRef<HTMLSpanElement | null>(null);
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const sweepRef = useRef<HTMLSpanElement | null>(null);
  const motionFrameRef = useRef<number | null>(null);
  const dragRef = useRef<DragState>(emptyDragState());
  const positionRef = useRef<GuruPosition | null>(readStoredPosition());
  const suppressClickRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<GuruPosition | null>(positionRef.current);
  const [dragging, setDragging] = useState(false);

  const updatePosition = useCallback((nextPosition: GuruPosition) => {
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, []);

  const clampPosition = useCallback(
    (button: HTMLButtonElement, left: number, top: number): GuruPosition => {
      const rect = button.getBoundingClientRect();
      const width = rect.width || 72;
      const height = rect.height || 72;

      return {
        left: clamp(
          left,
          viewportInset,
          Math.max(viewportInset, window.innerWidth - width - viewportInset),
        ),
        top: clamp(
          top,
          viewportInset,
          Math.max(viewportInset, window.innerHeight - height - viewportInset),
        ),
      };
    },
    [],
  );

  useEffect(() => {
    if (positionRef.current) {
      return;
    }

    const nextPosition = defaultGuruPosition(buttonRef.current);
    updatePosition(nextPosition);
  }, [updatePosition]);

  useEffect(() => {
    function handleResize() {
      const button = buttonRef.current;
      const current = positionRef.current;

      if (!button || !current) {
        return;
      }

      const nextPosition = clampPosition(button, current.left, current.top);
      updatePosition(nextPosition);
      saveStoredPosition(nextPosition);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition, updatePosition]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const motion = motionRef.current;
    const glow = glowRef.current;
    const sweep = sweepRef.current;

    if (motionFrameRef.current !== null) {
      window.cancelAnimationFrame(motionFrameRef.current);
      motionFrameRef.current = null;
    }

    if (!motion) {
      return;
    }

    if (open || dragging) {
      motion.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
      if (glow) {
        glow.style.opacity = "0.72";
        glow.style.transform = "scale(1)";
      }
      return;
    }

    const startedAt = window.performance.now();

    function animate(timestamp: number) {
      const elapsed = (timestamp - startedAt) / 1000;
      const horizontalDrift = Math.sin(elapsed * 1.65) * 4.5;
      const verticalDrift = -5 + Math.sin(elapsed * 2.15) * 7.5;
      const tilt = Math.sin(elapsed * 1.3) * 2.4;
      const glowScale = 0.94 + ((Math.sin(elapsed * 2.5) + 1) / 2) * 0.18;
      const glowOpacity = 0.54 + ((Math.sin(elapsed * 2.5) + 1) / 2) * 0.4;

      if (motionRef.current) {
        motionRef.current.style.transform = `translate3d(${horizontalDrift}px, ${verticalDrift}px, 0) rotate(${tilt}deg)`;
      }

      if (glowRef.current) {
        glowRef.current.style.transform = `scale(${glowScale})`;
        glowRef.current.style.opacity = `${glowOpacity}`;
      }

      if (sweepRef.current) {
        sweepRef.current.style.transform = `rotate(${elapsed * 72}deg)`;
      }

      motionFrameRef.current = window.requestAnimationFrame(animate);
    }

    motionFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (motionFrameRef.current !== null) {
        window.cancelAnimationFrame(motionFrameRef.current);
        motionFrameRef.current = null;
      }
    };
  }, [dragging, open]);

  if (open) {
    return null;
  }

  const currentPosition = position ?? defaultGuruPosition(buttonRef.current);

  const style = {
    position: "fixed",
    left: `${currentPosition.left}px`,
    top: `${currentPosition.top}px`,
    right: "auto",
    bottom: "auto",
    transform: "none",
    zIndex: 9999,
    "--wingman-guru-left": `${currentPosition.left}px`,
    "--wingman-guru-top": `${currentPosition.top}px`,
    "--wingman-guru-right": "auto",
    "--wingman-guru-bottom": "auto",
    "--wingman-guru-transform": "none",
  } as CSSProperties;

  const motionStyle = {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
    willChange: "transform",
    transformOrigin: "50% 55%",
  } as CSSProperties;

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || dragRef.current.pointerId !== null) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (!event.isPrimary || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (
      !drag.moved &&
      (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)
    ) {
      drag.moved = true;
      setDragging(true);
    }

    if (!drag.moved) {
      return;
    }

    event.preventDefault();
    updatePosition(
      clampPosition(
        event.currentTarget,
        drag.startLeft + deltaX,
        drag.startTop + deltaY,
      ),
    );
  }

  function finishPointerDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (drag.moved && positionRef.current) {
      saveStoredPosition(positionRef.current);
      suppressClickRef.current = true;

      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 150);
    }

    dragRef.current = emptyDragState();
    setDragging(false);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
      return;
    }

    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      onClick();
    }, clickDelayMs);
  }

  function handleDoubleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    clearStoredPosition();
    const nextPosition = defaultGuruPosition(buttonRef.current);
    updatePosition(nextPosition);
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="wingman-guru-fab"
      data-wingman-guru-launcher="true"
      data-wingman-guru-floating-active="true"
      data-wingman-guru-fab="true"
      data-open={open ? "true" : "false"}
      data-dragging={dragging ? "true" : "false"}
      data-context-transfer={hasContextualTransfer ? "true" : "false"}
      aria-label={
        hasContextualTransfer
          ? "Open Guru technical assistant. Context is available."
          : "Open Guru technical assistant"
      }
      aria-pressed={open ? "true" : "false"}
      style={style}
      title="Drag Guru to move. Double-click to reset."
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
    >
      <span ref={motionRef} className="wingman-guru-fab-motion" style={motionStyle} aria-hidden="true">
        <span ref={sweepRef} className="wingman-guru-fab-sweep" />
        <span ref={glowRef} className="wingman-guru-fab-glow" />
        <img
          src="/wingman-guru-icon.png"
          alt=""
          className="wingman-guru-fab-image"
          width={64}
          height={64}
          decoding="async"
          loading="eager"
          draggable={false}
        />
      </span>
    </button>
  );
}

export default WingmanGuruFab;
