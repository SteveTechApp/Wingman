import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
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

type ActiveDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  moved: boolean;
};

const storageKey = "wingmanGuruPosition";
const viewportInset = 12;
const desktopClearance = 24;
const compactClearance = 16;
const dragThreshold = 3;
const clickDelayMs = 230;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function readStoredPosition(): GuruPosition | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GuruPosition>;
    if (typeof parsed.left !== "number" || typeof parsed.top !== "number") return null;

    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
}

function saveStoredPosition(position: GuruPosition) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(position));
  } catch {
    // Browser storage can be unavailable in restricted contexts.
  }
}

function clearStoredPosition() {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Browser storage can be unavailable in restricted contexts.
  }
}

function readSafeAreaBottom() {
  if (typeof document === "undefined" || !document.body) return 0;

  const probe = document.createElement("span");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(probe);
  const safeAreaBottom = Number.parseFloat(window.getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return safeAreaBottom;
}

function defaultPosition(
  button?: HTMLButtonElement | null,
  includeSafeArea = false,
): GuruPosition {
  if (typeof window === "undefined") return { left: 24, top: 180 };

  const rect = button?.getBoundingClientRect();
  const width = rect?.width || 78;
  const height = rect?.height || 78;
  const narrowViewport =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 980px)").matches
      : window.innerWidth <= 980;

  const clearance =
    (narrowViewport ? compactClearance : desktopClearance) +
    (includeSafeArea ? readSafeAreaBottom() : 0);

  return {
    left: clamp(
      window.innerWidth - width - clearance,
      viewportInset,
      Math.max(viewportInset, window.innerWidth - width - viewportInset),
    ),
    top: clamp(
      window.innerHeight - height - clearance,
      viewportInset,
      Math.max(viewportInset, window.innerHeight - height - viewportInset),
    ),
  };
}

export function WingmanGuruFab({
  open,
  onClick,
  hasContextualTransfer = false,
}: WingmanGuruFabProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const storedPositionRef = useRef<GuruPosition | null>(readStoredPosition());
  const preferredPositionRef = useRef<GuruPosition | null>(storedPositionRef.current);
  const livePositionRef = useRef<GuruPosition | null>(storedPositionRef.current);
  const suppressClickRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);

  const [position, setPosition] = useState<GuruPosition | null>(livePositionRef.current);
  const [dragging, setDragging] = useState(false);

  const clampPosition = useCallback(
    (button: HTMLButtonElement, left: number, top: number): GuruPosition => {
      const rect = button.getBoundingClientRect();
      const width = rect.width || 78;
      const height = rect.height || 78;

      return {
        left: clamp(left, viewportInset, Math.max(viewportInset, window.innerWidth - width - viewportInset)),
        top: clamp(top, viewportInset, Math.max(viewportInset, window.innerHeight - height - viewportInset)),
      };
    },
    [],
  );

  const applyPositionToButton = useCallback((nextPosition: GuruPosition) => {
    livePositionRef.current = nextPosition;

    const button = buttonRef.current;
    if (!button) return;

    const left = `${nextPosition.left}px`;
    const top = `${nextPosition.top}px`;

    button.style.setProperty("--wingman-guru-left", left);
    button.style.setProperty("--wingman-guru-top", top);
    button.style.setProperty("left", left, "important");
    button.style.setProperty("top", top, "important");
    button.style.setProperty("right", "auto", "important");
    button.style.setProperty("bottom", "auto", "important");
    button.style.setProperty("transform", "none", "important");
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const initial = preferredPositionRef.current
      ? clampPosition(button, preferredPositionRef.current.left, preferredPositionRef.current.top)
      : defaultPosition(button, true);

    applyPositionToButton(initial);
    setPosition(initial);
  }, [applyPositionToButton, clampPosition]);

  useEffect(() => {
    if (open) return;

    const authorisedLauncher = buttonRef.current;
    if (!authorisedLauncher) return;

    function hideDuplicateLaunchers() {
      document
        .querySelectorAll<HTMLElement>('[data-wingman-guru-launcher="true"]')
        .forEach((launcher) => {
          if (launcher === authorisedLauncher) return;

          launcher.dataset.wingmanGuruDuplicate = "true";
          launcher.setAttribute("aria-hidden", "true");
          launcher.hidden = true;
        });
    }

    hideDuplicateLaunchers();

    const observer = new MutationObserver(hideDuplicateLaunchers);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    function handleResize() {
      const button = buttonRef.current;
      if (!button) return;

      const current = preferredPositionRef.current ?? defaultPosition(button, true);
      const next = clampPosition(button, current.left, current.top);
      applyPositionToButton(next);
      setPosition(next);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [applyPositionToButton, clampPosition]);

  useEffect(() => {
    function handleWindowPointerMove(event: PointerEvent) {
      const drag = activeDragRef.current;
      const button = buttonRef.current;
      if (!drag || !button || event.pointerId !== drag.pointerId) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (!drag.moved && (Math.abs(deltaX) >= dragThreshold || Math.abs(deltaY) >= dragThreshold)) {
        drag.moved = true;
        setDragging(true);
        button.dataset.dragging = "true";
      }

      if (!drag.moved) return;

      event.preventDefault();
      event.stopPropagation();

      applyPositionToButton(
        clampPosition(button, drag.startLeft + deltaX, drag.startTop + deltaY),
      );
    }

    function finishWindowDrag(event: PointerEvent) {
      const drag = activeDragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const button = buttonRef.current;

      if (drag.moved) {
        event.preventDefault();
        event.stopPropagation();

        const finalPosition = livePositionRef.current;
        if (finalPosition) {
          preferredPositionRef.current = finalPosition;
          setPosition(finalPosition);
          saveStoredPosition(finalPosition);
        }

        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 180);
      }

      activeDragRef.current = null;
      setDragging(false);
      if (button) button.dataset.dragging = "false";
    }

    window.addEventListener("pointermove", handleWindowPointerMove, { capture: true, passive: false });
    window.addEventListener("pointerup", finishWindowDrag, { capture: true, passive: false });
    window.addEventListener("pointercancel", finishWindowDrag, { capture: true, passive: false });

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove, true);
      window.removeEventListener("pointerup", finishWindowDrag, true);
      window.removeEventListener("pointercancel", finishWindowDrag, true);
    };
  }, [applyPositionToButton, clampPosition]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
    };
  }, []);

  if (open) return null;

  const currentPosition = position ?? defaultPosition(buttonRef.current);

  const style = {
    position: "fixed",
    left: `${currentPosition.left}px`,
    top: `${currentPosition.top}px`,
    right: "auto",
    bottom: "auto",
    transform: "none",
    zIndex: 2147483000,
    "--wingman-guru-left": `${currentPosition.left}px`,
    "--wingman-guru-top": `${currentPosition.top}px`,
    "--wingman-guru-right": "auto",
    "--wingman-guru-bottom": "auto",
    "--wingman-guru-transform": "none",
  } as CSSProperties;

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || activeDragRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();

    activeDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };

    livePositionRef.current = { left: rect.left, top: rect.top };
    event.stopPropagation();
  }

  function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
      return;
    }

    if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);

    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      onClick();
    }, clickDelayMs);
  }

  function handleDoubleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    clearStoredPosition();
    preferredPositionRef.current = null;
    const next = defaultPosition(buttonRef.current, true);
    applyPositionToButton(next);
    setPosition(next);
  }

  return (
    <button
      ref={buttonRef}
      id="wingman-guru-launcher"
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
      title="Hold and drag Guru to move. Double-click to reset."
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <span
        className="wingman-guru-fab-motion"
        aria-hidden="true"
        style={{ willChange: "left, top, transform" }}
      >
        <span className="wingman-guru-fab-sweep" />
        <span className="wingman-guru-fab-glow" />
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
