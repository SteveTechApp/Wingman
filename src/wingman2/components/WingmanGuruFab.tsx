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

function defaultGuruPosition(button?: HTMLButtonElement | null): GuruPosition {
  if (typeof window === "undefined") {
    return { left: 24, top: 180 };
  }

  const width = button?.getBoundingClientRect().width ?? 72;
  const height = button?.getBoundingClientRect().height ?? 72;
  const narrowViewport = window.matchMedia("(max-width: 980px)").matches;

  return {
    left: clamp(window.innerWidth - width - (narrowViewport ? 18 : 28), 12, Math.max(12, window.innerWidth - width - 12)),
    top: narrowViewport
      ? clamp(window.innerHeight - height - 18, 12, Math.max(12, window.innerHeight - height - 12))
      : clamp(Math.round(window.innerHeight * 0.44), 96, Math.max(96, window.innerHeight - height - 24)),
  };
}


export function WingmanGuruFab({ open, onClick, hasContextualTransfer = false }: WingmanGuruFabProps) {
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
    // Initialise Guru as a true floating page launcher, not a bottom navigation button.
    if (position) {
      return;
    }

    const button = buttonRef.current;
    setPosition(defaultGuruPosition(button));
  }, [position]);


  const buttonPosition = useCallback((button: HTMLButtonElement, left: number, top: number): GuruPosition => {
    const rect = button.getBoundingClientRect();

    return {
      left: clamp(left, 12, Math.max(12, window.innerWidth - rect.width - 12)),
      top: clamp(top, 12, Math.max(12, window.innerHeight - rect.height - 12)),
    };
  }, []);

  const startDrag = useCallback((button: HTMLButtonElement, clientX: number, clientY: number, pointerId: number) => {
    const rect = button.getBoundingClientRect();

    dragRef.current = {
      pointerId,
      startX: clientX,
      startY: clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
  }, []);

  const moveDrag = useCallback(
    (
      button: HTMLButtonElement,
      clientX: number,
      clientY: number,
      event?: { preventDefault: () => void },
    ) => {
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
    },
    [buttonPosition],
  );

  const finishDrag = useCallback(
    (button: HTMLButtonElement) => {
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
    },
    [buttonPosition],
  );

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
  }, [finishDrag, moveDrag]);

  useEffect(() => {
    if (open) {
      return undefined;
    }

    const button = buttonRef.current;

    if (!button) {
      return undefined;
    }

    function handleNativeMouseDown(event: globalThis.MouseEvent) {
      if (event.button !== 0 || dragRef.current.pointerId !== null) {
        return;
      }

      if (!button) {
        return;
      }

      startDrag(button, event.clientX, event.clientY, mouseDragId);
    }

    button.addEventListener("mousedown", handleNativeMouseDown);

    return () => {
      button.removeEventListener("mousedown", handleNativeMouseDown);
    };
  }, [open, startDrag]);

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
    cursor: dragRef.current.pointerId === null ? "grab" : "grabbing",
    touchAction: "none",
    userSelect: "none",
  } as CSSProperties;

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

  function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
    if (dragRef.current.pointerId !== mouseDragId) {
      return;
    }

    moveDrag(event.currentTarget, event.clientX, event.clientY, event);
  }

  function handleMouseUp(event: MouseEvent<HTMLButtonElement>) {
    if (dragRef.current.pointerId !== mouseDragId) {
      return;
    }

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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      aria-label={hasContextualTransfer ? "Open Guru technical assistant. Context is available." : "Open Guru technical assistant"}
      aria-pressed={open ? "true" : "false"}
      className="wingman-guru-fab"
      data-wingman-guru-fab="true"
      data-open={open ? "true" : "false"}
      data-context-transfer={hasContextualTransfer ? "true" : "false"}
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
