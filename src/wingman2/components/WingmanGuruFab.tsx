import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

type WingmanGuruFabProps = {
  open: boolean;
  onClick: () => void;
};

type GuruPosition = {
  left: number;
  top: number;
};

const storageKey = "wingmanGuruPosition";
const dragThreshold = 4;
const mouseDragId = -1;
const clickDelayMs = 320;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

export function WingmanGuruFab({ open, onClick }: WingmanGuruFabProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    moved: false,
  });
  const suppressClickRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<GuruPosition | null>(() => readStoredPosition());

  useEffect(() => {
    function handleResize() {
      const button = buttonRef.current;

      if (!button || !position) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const nextPosition = {
        left: clamp(position.left, 12, Math.max(12, window.innerWidth - rect.width - 12)),
        top: clamp(position.top, 12, Math.max(12, window.innerHeight - rect.height - 12)),
      };

      setPosition(nextPosition);
      saveStoredPosition(nextPosition);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [position]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleMouseMove(event: globalThis.MouseEvent) {
      if (dragRef.current.pointerId !== mouseDragId) {
        return;
      }

      const button = buttonRef.current;

      if (!button) {
        return;
      }

      moveDrag(button, event.clientX, event.clientY, event);
    }

    function handleMouseUp() {
      if (dragRef.current.pointerId !== mouseDragId) {
        return;
      }

      const button = buttonRef.current;

      if (!button) {
        return;
      }

      finishDrag(button);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (open) {
    return null;
  }

  const style = (
    position
      ? {
          "--wingman-guru-left": `${position.left}px`,
          "--wingman-guru-top": `${position.top}px`,
          "--wingman-guru-right": "auto",
          "--wingman-guru-bottom": "auto",
          cursor: dragRef.current.pointerId === null ? "grab" : "grabbing",
          touchAction: "none",
          userSelect: "none",
        }
      : {
          cursor: "grab",
          touchAction: "none",
          userSelect: "none",
        }
  ) as CSSProperties;

  function buttonPosition(button: HTMLButtonElement, left: number, top: number): GuruPosition {
    const rect = button.getBoundingClientRect();

    return {
      left: clamp(left, 12, Math.max(12, window.innerWidth - rect.width - 12)),
      top: clamp(top, 12, Math.max(12, window.innerHeight - rect.height - 12)),
    };
  }

  function startDrag(button: HTMLButtonElement, clientX: number, clientY: number, pointerId: number) {
    const rect = button.getBoundingClientRect();

    dragRef.current = {
      pointerId,
      startX: clientX,
      startY: clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
  }

  function moveDrag(
    button: HTMLButtonElement,
    clientX: number,
    clientY: number,
    event?: { preventDefault: () => void },
  ) {
    const drag = dragRef.current;

    if (drag.pointerId === null) {
      return;
    }

    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;

    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
      drag.moved = true;
    }

    if (!drag.moved) {
      return;
    }

    event?.preventDefault();
    setPosition(buttonPosition(button, drag.startLeft + dx, drag.startTop + dy));
  }

  function finishDrag(button: HTMLButtonElement) {
    const drag = dragRef.current;

    if (drag.pointerId === null) {
      return;
    }

    if (drag.moved) {
      const rect = button.getBoundingClientRect();
      const nextPosition = buttonPosition(button, rect.left, rect.top);
      setPosition(nextPosition);
      saveStoredPosition(nextPosition);
      suppressClickRef.current = true;

      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 150);
    }

    dragRef.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      moved: false,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.pointerType || event.pointerType === "mouse" || event.button !== 0) {
      return;
    }

    startDrag(event.currentTarget, event.clientX, event.clientY, event.pointerId);
    event.currentTarget.setPointerCapture(event.pointerId);
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

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      return;
    } finally {
      finishDrag(event.currentTarget);
    }
  }

  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    if (event.button !== 0 || dragRef.current.pointerId !== null) {
      return;
    }

    startDrag(event.currentTarget, event.clientX, event.clientY, mouseDragId);
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
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseDown={handleMouseDown}
      aria-label="Open Guru technical assistant"
      aria-pressed="false"
      className="wingman-guru-fab"
      data-open="false"
      style={style}
      title="Drag Guru to move. Double-click to reset."
    >
      <span className="wingman-guru-fab-sweep" aria-hidden="true" />
      <span className="wingman-guru-fab-glow" aria-hidden="true" />
      <img src="/guru-bot.png" alt="Guru" className="wingman-guru-fab-image" width={64} height={64} decoding="async" loading="eager" />
    </button>
  );
}

export default WingmanGuruFab;
