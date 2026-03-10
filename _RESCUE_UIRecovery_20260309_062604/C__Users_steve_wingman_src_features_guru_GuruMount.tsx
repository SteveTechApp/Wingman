import * as React from "react";

type GuruPrefs = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const STORAGE_KEY = "wm_guru_fab_prefs_v2";

const DEFAULTS: GuruPrefs = {
  x: 24,
  y: 24,
  width: 148,
  height: 52,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function loadPrefs(): GuruPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<GuruPrefs>;
    return {
      x: typeof parsed.x === "number" ? parsed.x : DEFAULTS.x,
      y: typeof parsed.y === "number" ? parsed.y : DEFAULTS.y,
      width: typeof parsed.width === "number" ? parsed.width : DEFAULTS.width,
      height: typeof parsed.height === "number" ? parsed.height : DEFAULTS.height,
    };
  } catch {
    return DEFAULTS;
  }
}

function savePrefs(prefs: GuruPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function fitToViewport(prefs: GuruPrefs): GuruPrefs {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const width = clamp(prefs.width, 116, 260);
  const height = clamp(prefs.height, 44, 76);

  const maxX = Math.max(12, vw - width - 12);
  const maxY = Math.max(12, vh - height - 12);

  return {
    width,
    height,
    x: clamp(prefs.x, 12, maxX),
    y: clamp(prefs.y, 12, maxY),
  };
}

export default function GuruMount() {
  const [open, setOpen] = React.useState(false);
  const [prefs, setPrefs] = React.useState<GuruPrefs>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    return fitToViewport(loadPrefs());
  });

  const dragRef = React.useRef<{
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const resizeRef = React.useRef<{
    startMouseX: number;
    startMouseY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  React.useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  React.useEffect(() => {
    const onResize = () => {
      setPrefs((prev) => fitToViewport(prev));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startMouseX;
        const dy = e.clientY - dragRef.current.startMouseY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragRef.current.moved = true;
        }

        setPrefs((prev) => {
          const next = fitToViewport({
            ...prev,
            x: dragRef.current!.startX + dx,
            y: dragRef.current!.startY + dy,
          });
          return next;
        });
      }

      if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startMouseX;
        const dy = e.clientY - resizeRef.current.startMouseY;

        setPrefs((prev) => {
          const next = fitToViewport({
            ...prev,
            width: resizeRef.current!.startWidth + dx,
            height: resizeRef.current!.startHeight + dy,
          });
          return next;
        });
      }
    };

    const onPointerUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const right = prefs.x;
  const bottom = prefs.y;

  return (
    <>
      <div
        style={{
          position: "fixed",
          right,
          bottom,
          zIndex: 6000,
          width: prefs.width,
          height: prefs.height,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "stretch",
          userSelect: "none",
        }}
      >
        <button
          type="button"
          aria-label="Guru"
          title="Guru"
          onPointerDown={(e) => {
            dragRef.current = {
              startMouseX: e.clientX,
              startMouseY: e.clientY,
              startX: prefs.x,
              startY: prefs.y,
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
            borderRadius: 999,
            border: "1px solid rgba(255,170,56,0.34)",
            background:
              "linear-gradient(180deg, rgba(255,166,46,0.98), rgba(237,120,14,0.96))",
            color: "#1a1006",
            fontWeight: 800,
            letterSpacing: "0.04em",
            fontSize: Math.max(14, Math.min(18, Math.round(prefs.height * 0.32))),
            cursor: "grab",
            boxShadow:
              "0 12px 28px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,186,92,0.08) inset",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 18px",
            position: "relative",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                width: Math.max(10, Math.min(16, Math.round(prefs.height * 0.22))),
                height: Math.max(10, Math.min(16, Math.round(prefs.height * 0.22))),
                borderRadius: 999,
                background: "rgba(26,16,6,0.9)",
                boxShadow: "0 0 0 3px rgba(255,255,255,0.18)",
              }}
            />
            <span>GURU</span>
          </span>

          <span
            title="Resize Guru"
            onPointerDown={(e) => {
              e.stopPropagation();
              resizeRef.current = {
                startMouseX: e.clientX,
                startMouseY: e.clientY,
                startWidth: prefs.width,
                startHeight: prefs.height,
              };
            }}
            style={{
              position: "absolute",
              right: 8,
              bottom: 7,
              width: 16,
              height: 16,
              borderRadius: 4,
              background:
                "linear-gradient(180deg, rgba(26,16,6,0.18), rgba(26,16,6,0.34))",
              border: "1px solid rgba(26,16,6,0.20)",
              cursor: "nwse-resize",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                lineHeight: 1,
                color: "rgba(26,16,6,0.82)",
              }}
            >
              ⤡
            </span>
          </span>
        </button>
      </div>

      {open ? (
        <div
          style={{
            position: "fixed",
            right,
            bottom: bottom + prefs.height + 12,
            zIndex: 5999,
            width: 340,
            maxWidth: "calc(100vw - 24px)",
            borderRadius: 16,
            border: "1px solid rgba(255,170,56,0.22)",
            background: "linear-gradient(180deg, rgba(11,20,32,0.98), rgba(8,14,24,0.98))",
            boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,187,107,0.82)",
                  marginBottom: 4,
                  fontWeight: 700,
                }}
              >
                Wingman Advisor
              </div>
              <div
                style={{
                  color: "#f6f8fc",
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                Guru
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                height: 32,
                minWidth: 32,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "#eef4ff",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <p
            style={{
              margin: "0 0 12px 0",
              color: "rgba(226,236,255,0.76)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Drag the orange Guru button to reposition it. Use the corner grip to resize it.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setPrefs(fitToViewport(DEFAULTS))}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,170,56,0.20)",
                background: "rgba(255,170,56,0.10)",
                color: "#ffd59f",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Reset position
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "#eef4ff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}