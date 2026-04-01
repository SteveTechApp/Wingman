import { GripVertical, MessageSquareText, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import guruAvatar from "@/assets/branding/wingman-logo-compact.png";
import "./guru-fab.css";

const STORAGE_KEY = "wingman.guruFab.offset";
const hints = [
  "What should I recommend for this room?",
  "Compare this against a competitor product.",
  "Help me choose Matrix vs AVoIP.",
  "Summarise the next best sales step.",
];

type Offset = {
  x: number;
  y: number;
};

function clampOffset(offset: Offset): Offset {
  if (typeof window === "undefined") return offset;

  const minX = -(window.innerWidth - 92);
  const minY = -(window.innerHeight - 92);

  return {
    x: Math.max(minX, Math.min(8, offset.x)),
    y: Math.max(minY, Math.min(8, offset.y)),
  };
}

export default function GuruFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);

  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState<Offset>(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return { x: 0, y: 0 };
      return clampOffset(JSON.parse(stored) as Offset);
    } catch {
      return { x: 0, y: 0 };
    }
  });

  const hidden = useMemo(() => location.pathname.startsWith("/app/tools/guru"), [location.pathname]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(offset));
    } catch {
      // ignore persistence errors
    }
  }, [offset]);

  useEffect(() => {
    function handleResize() {
      setOffset((current) => clampOffset(current));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextOffset = clampOffset({
      x: drag.baseX + (event.clientX - drag.startX),
      y: drag.baseY + (event.clientY - drag.startY),
    });

    if (
      !drag.moved &&
      (Math.abs(event.clientX - drag.startX) > 4 || Math.abs(event.clientY - drag.startY) > 4)
    ) {
      drag.moved = true;
    }

    setOffset(nextOffset);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;

    if (!drag.moved) {
      setOpen((current) => !current);
    }
  }

  if (hidden) return null;

  return (
    <div
      className={`wm-guru-fab${open ? " is-open" : ""}`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      {open ? (
        <div className="wm-guru-fab__panel">
          <div className="wm-guru-fab__panel-head">
            <div className="wm-guru-fab__identity">
              <img src={guruAvatar} alt="Guru" className="wm-guru-fab__avatar" />
              <div>
                <strong>Guru Assistant</strong>
                <span>Sales and system guidance</span>
              </div>
            </div>

            <button
              type="button"
              className="wm-guru-fab__close"
              onClick={() => setOpen(false)}
              aria-label="Close Guru"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="wm-guru-fab__body">
            <p>Open Guru for product fit, discovery support, and quick technical direction.</p>

            <div className="wm-guru-fab__hints">
              {hints.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  className="wm-guru-fab__hint"
                  onClick={() => navigate("/app/tools/guru")}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-guru-fab__footer">
            <button
              type="button"
              className="wm-guru-fab__open"
              onClick={() => navigate("/app/tools/guru")}
            >
              <Sparkles size={15} strokeWidth={2} />
              Open Guru
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="wm-guru-fab__trigger"
        aria-label="Open Guru assistant"
        title="Drag to reposition or click to open Guru"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <GripVertical size={14} strokeWidth={2} className="wm-guru-fab__grip" />
        <img src={guruAvatar} alt="" className="wm-guru-fab__trigger-avatar" />
        <span>Guru</span>
        <MessageSquareText size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
