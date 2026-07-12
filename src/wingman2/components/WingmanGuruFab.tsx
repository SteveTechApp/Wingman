import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

type WingmanGuruFabProps = {
  open: boolean;
  onClick: () => void;
  hasContextualTransfer?: boolean;
};

type GuruPosition = {
  left: number;
  top: number;
};

type GuruDragState = {
  pointerId: number | null;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  lastLeft: number;
  lastTop: number;
  dragging: boolean;
};

const storageKey = "wingmanGuruPosition";
const dragThreshold = 4;
const clickDelayMs = 320;
const buttonFallbackSize = 74;

function emptyDragState(): GuruDragState {
  return {
    pointerId: null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    lastLeft: 0,
    lastTop: 0,
    dragging: false,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getButtonSize(button?: HTMLButtonElement | null) {
  const rect = button?.getBoundingClientRect();

  return {
    width: rect && rect.width > 0 ? rect.width : buttonFallbackSize,
    height: rect && rect.height > 0 ? rect.height : buttonFallbackSize,
  };
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
    return;
  }
}

function clearStoredPosition() {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    return;
  }
}

function defaultGuruPosition(button?: HTMLButtonElement | null): GuruPosition {
  if (typeof window === "undefined") {
    return { left: 24, top: 180 };
  }

  const { width, height } = getButtonSize(button);

  return {
    left: clamp(window.innerWidth - width - 28, 12, Math.max(12, window.innerWidth - width - 12)),
    top: clamp(Math.round(window.innerHeight * 0.44), 96, Math.max(96, window.innerHeight - height - 24)),
  };
}

export function WingmanGuruFab({ open, onClick, hasContextualTransfer = false }: WingmanGuruFabProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<GuruDragState>(emptyDragState());
  const suppressClickRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<GuruPosition | null>(() => readStoredPosition());
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Initialise Guru as a true floating page launcher, not a bottom navigation button.
    if (position) {
      return;
    }

    setPosition(defaultGuruPosition(buttonRef.current));
  }, [position]);

  const buttonPosition = useCallback((button: HTMLButtonElement, left: number, top: number): GuruPosition => {
    const { width, height } = getButtonSize(button);
    const viewportWidth = typeof window === "undefined" ? width + 24 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? height + 24 : window.innerHeight;

    return {
      left: clamp(left, 12, Math.max(12, viewportWidth - width - 12)),
      top: clamp(top, 12, Math.max(12, viewportHeight - height - 12)),
    };
  }, []);

  const startDrag = useCallback(
    (button: HTMLButtonElement, clientX: number, clientY: number, pointerId: number, origin: GuruPosition) => {
      const startPosition = buttonPosition(button, origin.left, origin.top);

      dragRef.current = {
        pointerId,
        startX: clientX,
        startY: clientY,
        startLeft: startPosition.left,
        startTop: startPosition.top,
        lastLeft: startPosition.left,
        lastTop: startPosition.top,
        dragging: false,
      };
    },
    [buttonPosition],
  );

  const moveDrag = useCallback(
    (button: HTMLButtonElement, clientX: number, clientY: number, event: { preventDefault: () => void }) => {
      const drag = dragRef.current;

      if (drag.pointerId === null) {
        return;
      }

      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;

      if (!drag.dragging && Math.hypot(dx, dy) >= dragThreshold) {
        drag.dragging = true;
        setIsDragging(true);
      }

      if (!drag.dragging) {
        return;
      }

      event.preventDefault();

      const nextPosition = buttonPosition(button, drag.startLeft + dx, drag.startTop + dy);
      drag.lastLeft = nextPosition.left;
      drag.lastTop = nextPosition.top;
      setPosition(nextPosition);
    },
    [buttonPosition],
  );

  const finishDrag = useCallback(
    (button: HTMLButtonElement) => {
      const drag = dragRef.current;

      if (drag.pointerId === null) {
        return;
      }

      const didDrag = drag.dragging;
      const finalPosition = buttonPosition(button, drag.lastLeft, drag.lastTop);

      dragRef.current = emptyDragState();
      setIsDragging(false);

      if (!didDrag) {
        return;
      }

      setPosition(finalPosition);
      saveStoredPosition(finalPosition);
      suppressClickRef.current = true;

      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 150);
    },
    [buttonPosition],
  );

  useEffect(() => {
    function handleResize() {
      const button = buttonRef.current;

      if (!button || !position) {
        return;
      }

      const nextPosition = buttonPosition(button, position.left, position.top);

      setPosition(nextPosition);
      saveStoredPosition(nextPosition);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [buttonPosition, position]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

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
    "--wingman-guru-left": `${currentPosition.left}px`,
    "--wingman-guru-top": `${currentPosition.top}px`,
    "--wingman-guru-right": "auto",
    "--wingman-guru-bottom": "auto",
    "--wingman-guru-transform": "none",
  } as CSSProperties;

  function releasePointerCapture(button: HTMLButtonElement, pointerId: number) {
    if (typeof button.releasePointerCapture !== "function") {
      return;
    }

    try {
      button.releasePointerCapture(pointerId);
    } catch {
      return;
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.isPrimary === false) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (dragRef.current.pointerId !== null) {
      return;
    }

    startDrag(event.currentTarget, event.clientX, event.clientY, event.pointerId, currentPosition);

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (drag.pointerId !== event.pointerId) {
      return;
    }

    moveDrag(event.currentTarget, event.clientX, event.clientY, event);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (drag.pointerId !== event.pointerId) {
      return;
    }

    releasePointerCapture(event.currentTarget, event.pointerId);
    finishDrag(event.currentTarget);
  }

  function handlePointerCancel(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (drag.pointerId !== event.pointerId) {
      return;
    }

    releasePointerCapture(event.currentTarget, event.pointerId);
    finishDrag(event.currentTarget);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
      return;
    }

    if (event.detail > 1) {
      event.preventDefault();
      event.stopPropagation();

      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }

      clearStoredPosition();
      setPosition(null);
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
    setPosition(null);
  }

  return (
    <button
      data-wingman-guru-launcher="true"
      data-wingman-guru-floating-active="true"
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label={hasContextualTransfer ? "Open Guru technical assistant. Context is available." : "Open Guru technical assistant"}
      aria-pressed={open ? "true" : "false"}
      className="wingman-guru-fab"
      data-wingman-guru-fab="true"
      data-open={open ? "true" : "false"}
      data-context-transfer={hasContextualTransfer ? "true" : "false"}
      data-dragging={isDragging ? "true" : "false"}
      style={style}
      title="Drag Guru to move. Double-click to reset."
    >
      <span className="wingman-guru-fab-sweep" aria-hidden="true" />
      <span className="wingman-guru-fab-glow" aria-hidden="true" />
      <img src="/wingman-guru-icon.png" alt="Guru" className="wingman-guru-fab-image" width={64} height={64} decoding="async" loading="eager" />
    </button>
  );
}

export default WingmanGuruFab;
