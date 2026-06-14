import { CSSProperties, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type GuruAction = {
  title: string;
  detail: string;
  href: string;
};

type GuruPosition = {
  x: number;
  y: number;
};

const GURU_ICON_SRC = "/wingman-guru-icon.png";
const POSITION_STORAGE_KEY = "wingman:guru-helper-position";
const DEFAULT_SIZE = 72;
const SAFE_MARGIN = 16;

const guruActions: GuruAction[] = [
  {
    title: "Discovery",
    detail: "Ask the next useful requirement question.",
    href: "/wingman/discovery",
  },
  {
    title: "Finder",
    detail: "Move from requirement to product direction.",
    href: "/wingman/finder",
  },
  {
    title: "Compare",
    detail: "Compare competitor products safely.",
    href: "/wingman/compare",
  },
  {
    title: "Proposal",
    detail: "Create customer-safe wording.",
    href: "/wingman/proposal",
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getDefaultPosition(): GuruPosition {
  if (typeof window === "undefined") {
    return { x: 24, y: 240 };
  }

  return {
    x: window.innerWidth - DEFAULT_SIZE - 36,
    y: window.innerHeight - DEFAULT_SIZE - 118,
  };
}

function getStoredPosition(): GuruPosition {
  if (typeof window === "undefined") {
    return getDefaultPosition();
  }

  const stored = window.localStorage.getItem(POSITION_STORAGE_KEY);

  if (!stored) {
    return getDefaultPosition();
  }

  try {
    const parsed = JSON.parse(stored) as Partial<GuruPosition>;
    const fallback = getDefaultPosition();

    return {
      x: clamp(typeof parsed.x === "number" ? parsed.x : fallback.x, SAFE_MARGIN, window.innerWidth - DEFAULT_SIZE - SAFE_MARGIN),
      y: clamp(typeof parsed.y === "number" ? parsed.y : fallback.y, SAFE_MARGIN, window.innerHeight - DEFAULT_SIZE - SAFE_MARGIN),
    };
  } catch {
    return getDefaultPosition();
  }
}

function savePosition(position: GuruPosition): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
}

function navigateTo(href: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.location.assign(href);
}

function getPageContext(): string {
  if (typeof window === "undefined") {
    return "Wingman workspace";
  }

  const path = window.location.pathname.toLowerCase();

  if (path.includes("compare")) {
    return "Competitor compare";
  }

  if (path.includes("finder")) {
    return "Product finder";
  }

  if (path.includes("discovery")) {
    return "Discovery";
  }

  if (path.includes("proposal")) {
    return "Proposal";
  }

  if (path.includes("product-pitch") || path.includes("call-card")) {
    return "Product sales support";
  }

  if (path.includes("templates")) {
    return "Room template";
  }

  if (path.includes("projects")) {
    return "Project workspace";
  }

  return "Wingman workspace";
}

function buildStarterPrompt(context: string): string {
  return [
    `Guru context: ${context}`,
    "",
    "Help me identify:",
    "1. the next best question to ask",
    "2. the likely WyreStorm product direction",
    "3. missing AV, USB, audio, control or network details",
    "4. customer-safe wording I can use now",
  ].join("\n");
}

function hideLegacyGuruControls(): void {
  if (typeof window === "undefined") {
    return;
  }

  const interactiveItems = Array.from(
    document.querySelectorAll<HTMLElement>("button, a, [role='button']")
  );

  interactiveItems.forEach((item) => {
    if (item.closest(".wm-guru-helper-root")) {
      return;
    }

    const text = (item.textContent || "").trim().toLowerCase();

    if (!text.includes("guru") && !text.includes("wingman")) {
      return;
    }

    const rect = item.getBoundingClientRect();
    const nearRight = rect.right > window.innerWidth - 260;
    const nearTop = rect.top < 190;
    const nearBottom = rect.bottom > window.innerHeight - 180;

    if (!nearRight) {
      return;
    }

    if (!nearTop && !nearBottom) {
      return;
    }

    item.dataset.wingmanLegacyGuruHidden = "true";
    item.style.display = "none";
  });
}

export function GuruHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<GuruPosition>(() => getStoredPosition());
  const [draftPrompt, setDraftPrompt] = useState("");
  const [status, setStatus] = useState("");

  const dragStartRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
    latest: GuruPosition;
  } | null>(null);

  const context = getPageContext();
  const starterPrompt = useMemo(() => buildStarterPrompt(context), [context]);

  useEffect(() => {
    setDraftPrompt(starterPrompt);
  }, [starterPrompt]);

  useEffect(() => {
    hideLegacyGuruControls();

    const observer = new MutationObserver(() => hideLegacyGuruControls());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.localStorage.removeItem(POSITION_STORAGE_KEY);
    const next = getDefaultPosition();
    setPosition(next);
    savePosition(next);
  }, []);

  useEffect(() => {
    function handleResize(): void {
      setPosition((current) => {
        const next = {
          x: clamp(current.x, SAFE_MARGIN, window.innerWidth - DEFAULT_SIZE - SAFE_MARGIN),
          y: clamp(current.y, SAFE_MARGIN, window.innerHeight - DEFAULT_SIZE - SAFE_MARGIN),
        };

        savePosition(next);
        return next;
      });
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);

    dragStartRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      moved: false,
      latest: position,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>): void {
    const dragStart = dragStartRef.current;

    if (!dragStart) {
      return;
    }

    if (dragStart.pointerId !== event.pointerId) {
      return;
    }

    const next = {
      x: clamp(event.clientX - dragStart.offsetX, SAFE_MARGIN, window.innerWidth - DEFAULT_SIZE - SAFE_MARGIN),
      y: clamp(event.clientY - dragStart.offsetY, SAFE_MARGIN, window.innerHeight - DEFAULT_SIZE - SAFE_MARGIN),
    };

    if (Math.abs(next.x - dragStart.latest.x) > 2 || Math.abs(next.y - dragStart.latest.y) > 2) {
      dragStart.moved = true;
    }

    dragStart.latest = next;
    setPosition(next);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>): void {
    const dragStart = dragStartRef.current;

    if (!dragStart) {
      return;
    }

    if (dragStart.pointerId !== event.pointerId) {
      return;
    }

    savePosition(dragStart.latest);

    const wasDragged = dragStart.moved;
    dragStartRef.current = null;

    if (wasDragged) {
      return;
    }

    setIsOpen((current) => !current);
    setStatus("");
  }

  function resetPosition(): void {
    const next = getDefaultPosition();
    setPosition(next);
    savePosition(next);
    setStatus("Guru position reset");
  }

  function copyStarterPrompt(): void {
    setDraftPrompt(starterPrompt);

    if (typeof navigator === "undefined") {
      setStatus("Prompt ready");
      return;
    }

    if (!navigator.clipboard) {
      setStatus("Prompt ready");
      return;
    }

    navigator.clipboard
      .writeText(starterPrompt)
      .then(() => setStatus("Prompt copied"))
      .catch(() => setStatus("Prompt ready"));
  }

  const helperStyle: CSSProperties = {
    left: position.x,
    top: position.y,
  };

  const panelStyle: CSSProperties = (() => {
    if (typeof window === "undefined") {
      return {};
    }

    const panelWidth = 382;
    const panelHeight = 468;
    const openRight = position.x < window.innerWidth / 2;
    const left = openRight ? position.x + 84 : position.x - panelWidth - 16;
    const top = position.y > window.innerHeight / 2 ? position.y - panelHeight + DEFAULT_SIZE : position.y;

    return {
      left: clamp(left, SAFE_MARGIN, window.innerWidth - panelWidth - SAFE_MARGIN),
      top: clamp(top, SAFE_MARGIN, window.innerHeight - panelHeight - SAFE_MARGIN),
    };
  })();

  return (
    <div
      className="wm-guru-helper-root"
      data-open={isOpen ? "true" : "false"}
      style={helperStyle}
    >
      <button
        type="button"
        className="wm-guru-floating-button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close Guru helper" : "Open Guru helper. Drag to move."}
        title="Guru helper - drag to move"
      >
        <span className="wm-guru-sweep-ring" aria-hidden="true" />
        <span className="wm-guru-icon-frame" aria-hidden="true">
          <img src={GURU_ICON_SRC} alt="" draggable={false} />
        </span>
      </button>

      {isOpen ? (
        <section className="wm-guru-panel" style={panelStyle} aria-label="Guru helper panel">
          <div className="wm-guru-panel-header">
            <div>
              <p className="wm-guru-eyebrow">Guru helper</p>
              <h2>What should we ask or check next?</h2>
            </div>

            <button
              type="button"
              className="wm-guru-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close Guru helper"
            >
              ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
            </button>
          </div>

          <p className="wm-guru-context">
            Current area: <strong>{context}</strong>
          </p>

          <div className="wm-guru-actions" aria-label="Guru quick actions">
            {guruActions.map((action) => (
              <button
                type="button"
                key={action.title}
                className="wm-guru-action"
                onClick={() => navigateTo(action.href)}
              >
                <span>{action.title}</span>
                <small>{action.detail}</small>
              </button>
            ))}
          </div>

          <div className="wm-guru-prompt">
            <label htmlFor="wm-guru-starter-prompt">Starter prompt</label>
            <textarea
              id="wm-guru-starter-prompt"
              value={draftPrompt}
              onChange={(event) => setDraftPrompt(event.target.value)}
              rows={6}
            />

            <div className="wm-guru-panel-buttons">
              <button type="button" className="wm-guru-copy" onClick={copyStarterPrompt}>
                Copy prompt
              </button>

              <button type="button" className="wm-guru-reset" onClick={resetPosition}>
                Reset position
              </button>
            </div>

            {status ? (
              <p className="wm-guru-status" role="status">
                {status}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default GuruHelper;