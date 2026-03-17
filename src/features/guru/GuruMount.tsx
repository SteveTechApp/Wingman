import * as React from "react";
import { createPortal } from "react-dom";

type GuruPrefs = {
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const STORAGE_KEY = "wm_guru_portal_v2";

const DEFAULTS: GuruPrefs = {
  right: 24,
  bottom: 24,
  width: 148,
  height: 52,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fitToViewport(prefs: GuruPrefs): GuruPrefs {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const width = clamp(prefs.width, 120, 240);
  const height = clamp(prefs.height, 44, 76);
  const right = clamp(prefs.right, 12, Math.max(12, vw - width - 12));
  const bottom = clamp(prefs.bottom, 12, Math.max(12, vh - height - 12));

  return { right, bottom, width, height };
}

function loadPrefs(): GuruPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<GuruPrefs>;
    return {
      right: typeof parsed.right === "number" ? parsed.right : DEFAULTS.right,
      bottom: typeof parsed.bottom === "number" ? parsed.bottom : DEFAULTS.bottom,
      width: typeof parsed.width === "number" ? parsed.width : DEFAULTS.width,
      height: typeof parsed.height === "number" ? parsed.height : DEFAULTS.height,
    };
  } catch {
    return DEFAULTS;
  }
}

export default function GuruMount() {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [prefs, setPrefs] = React.useState<GuruPrefs>(DEFAULTS);

  const dragRef = React.useRef<null | {
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    moved: boolean;
  }>(null);

  const resizeRef = React.useRef<null | {
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  }>(null);

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setPrefs(fitToViewport(loadPrefs()));
    }
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  }, [mounted, prefs]);

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragRef.current.moved = true;
        }

        setPrefs((prev) =>
          fitToViewport({
            ...prev,
            right: dragRef.current!.startRight - dx,
            bottom: dragRef.current!.startBottom - dy,
          })
        );
      }

      if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;

        setPrefs((prev) =>
          fitToViewport({
            ...prev,
            width: resizeRef.current!.startW + dx,
            height: resizeRef.current!.startH + dy,
          })
        );
      }
    };

    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    const onResize = () => {
      setPrefs((prev) => fitToViewport(prev));
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div
        style={{
          position: "fixed",
          right: prefs.right,
          bottom: prefs.bottom,
          width: prefs.width,
          height: prefs.height,
          zIndex: 99999,
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          aria-label="Guru"
          title="Guru"
          onPointerDown={(e) => {
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              startRight: prefs.right,
              startBottom: prefs.bottom,
              moved: false,
            };
          }}
          onClick={() => {
            if (dragRef.current?.moved) return;
            setOpen((v) => !v);
          }}
          style={{
            width: "100%",
            height: "100%",
            border: "1px solid rgba(242,140,40,0.42)",
            borderRadius: 999,
            background: "linear-gradient(180deg, rgb(245,156,61), rgb(227,121,26))",
            color: "#1b1006",
            fontWeight: 900,
            letterSpacing: "0.04em",
            cursor: "grab",
            boxShadow: "0 14px 34px rgba(0,0,0,0.34)",
            position: "relative",
          }}
        >
          GURU
          <span
            onPointerDown={(e) => {
              e.stopPropagation();
              resizeRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                startW: prefs.width,
                startH: prefs.height,
              };
            }}
            style={{
              position: "absolute",
              right: 8,
              bottom: 6,
              fontSize: 10,
              cursor: "nwse-resize",
              opacity: 0.72,
            }}
          >
            �f¢¤¡
          </span>
        </button>
      </div>

      {open ? (
        <div
          style={{
            position: "fixed",
            right: prefs.right,
            bottom: prefs.bottom + prefs.height + 12,
            width: 320,
            maxWidth: "calc(100vw - 24px)",
            zIndex: 99998,
            borderRadius: 16,
            border: "1px solid rgba(242,140,40,0.24)",
            background: "linear-gradient(180deg, rgb(40,24,14), rgb(14,18,25))",
            boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
            padding: 16,
            color: "#edf4ff",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(242,140,40,0.88)", marginBottom: 6 }}>
            Wingman Advisor
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Guru</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(237,244,255,0.76)", marginBottom: 12 }}>
            Drag to move. Use the corner grip to resize. This now renders outside the app shell through a portal.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setPrefs(DEFAULTS)}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(242,140,40,0.24)",
                background: "rgba(242,140,40,0.10)",
                color: "#ffd7ae",
                fontWeight: 700,
              }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#edf4ff",
                fontWeight: 700,
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
