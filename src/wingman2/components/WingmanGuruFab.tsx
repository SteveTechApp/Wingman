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

  return {
    left: clamp(window.innerWidth - width - 28, 12, Math.max(12, window.innerWidth - width - 12)),
    top: clamp(Math.round(window.innerHeight * 0.44), 96, Math.max(96, window.innerHeight - height - 24)),
  };
}

// Wingman Guru movable FAB hook - START
function useMovableGuruFab() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const storageKey = "wingman:guru-fab-position";
    const dragThreshold = 4;

    let target: HTMLElement | null = null;
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let moved = false;
    let suppressNextClick = false;

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const getTarget = () => {
      const explicit =
        document.querySelector<HTMLElement>("[data-wingman-guru-fab]") ||
        document.querySelector<HTMLElement>(".wingman-guru-fab") ||
        document.querySelector<HTMLElement>(".wm-guru-fab") ||
        document.querySelector<HTMLElement>(".wm-guru-fab-button");

      if (explicit) {
        return explicit;
      }

      const guruIcon = Array.from(document.querySelectorAll<HTMLImageElement>("img")).find((image) =>
        image.src.includes("wingman-guru-icon"),
      );

      return (
        guruIcon?.closest<HTMLElement>(
          "button,[role='button'],.wingman-guru-fab,.wm-guru-fab,.wm-guru-fab-button",
        ) ?? null
      );
    };

    const savePosition = (left: number, top: number) => {
      window.localStorage.setItem(storageKey, JSON.stringify({ left, top }));
    };

    const readPosition = () => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw) as Partial<{ left: number; top: number }>;

        if (typeof parsed.left !== "number" || typeof parsed.top !== "number") {
          return null;
        }

        return parsed;
      } catch {
        return null;
      }
    };

    const applyPosition = (left: number, top: number) => {
      if (!target) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
      const maxTop = Math.max(8, window.innerHeight - rect.height - 8);

      const nextLeft = clamp(left, 8, maxLeft);
      const nextTop = clamp(top, 8, maxTop);

      target.style.setProperty("position", "fixed", "important");
      target.style.setProperty("left", `${nextLeft}px`, "important");
      target.style.setProperty("top", `${nextTop}px`, "important");
      target.style.setProperty("right", "auto", "important");
      target.style.setProperty("bottom", "auto", "important");
      target.style.setProperty("transform", "none", "important");
      target.style.setProperty("z-index", "9999", "important");
      target.style.setProperty("touch-action", "none", "important");
      target.style.setProperty("cursor", "grab", "important");
    };

    const initialisePosition = () => {
      if (!target) {
        return;
      }

      target.dataset.wingmanGuruDragReady = "true";

      const stored = readPosition();
      const rect = target.getBoundingClientRect();

      applyPosition(stored?.left ?? rect.left, stored?.top ?? rect.top);
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!target) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      pointerId = event.pointerId;
      moved = false;
      suppressNextClick = false;

      const rect = target.getBoundingClientRect();

      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      target.setPointerCapture?.(event.pointerId);
      target.style.setProperty("cursor", "grabbing", "important");
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (!target || pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (!moved && Math.hypot(deltaX, deltaY) < dragThreshold) {
        return;
      }

      moved = true;
      suppressNextClick = true;

      event.preventDefault();

      applyPosition(startLeft + deltaX, startTop + deltaY);
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      if (!target || pointerId !== event.pointerId) {
        return;
      }

      pointerId = null;

      target.releasePointerCapture?.(event.pointerId);
      target.style.setProperty("cursor", "grab", "important");

      const rect = target.getBoundingClientRect();
      savePosition(rect.left, rect.top);
    };

    const handleClick = (event: globalThis.MouseEvent) => {
      if (!suppressNextClick) {
        return;
      }

      suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const handleResize = () => {
      if (!target) {
        return;
      }

      const rect = target.getBoundingClientRect();
      applyPosition(rect.left, rect.top);

      const nextRect = target.getBoundingClientRect();
      savePosition(nextRect.left, nextRect.top);
    };

    const attach = () => {
      target = getTarget();

      if (!target) {
        return false;
      }

      initialisePosition();

      target.addEventListener("pointerdown", handlePointerDown as EventListener);
      target.addEventListener("pointermove", handlePointerMove as EventListener);
      target.addEventListener("pointerup", handlePointerUp as EventListener);
      target.addEventListener("pointercancel", handlePointerUp as EventListener);
      target.addEventListener("click", handleClick as EventListener, true);
      window.addEventListener("resize", handleResize);

      return true;
    };

    let attached = attach();

    const observer = new MutationObserver(() => {
      if (!attached) {
        attached = attach();
      }
    });

    if (!attached) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();

      if (target) {
        target.removeEventListener("pointerdown", handlePointerDown as EventListener);
        target.removeEventListener("pointermove", handlePointerMove as EventListener);
        target.removeEventListener("pointerup", handlePointerUp as EventListener);
        target.removeEventListener("pointercancel", handlePointerUp as EventListener);
        target.removeEventListener("click", handleClick as EventListener, true);
      }

      window.removeEventListener("resize", handleResize);
    };
  }, []);
}
// Wingman Guru movable FAB hook - END

export function WingmanGuruFab({ open, onClick, hasContextualTransfer = false }: WingmanGuruFabProps) {
  useMovableGuruFab();
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
