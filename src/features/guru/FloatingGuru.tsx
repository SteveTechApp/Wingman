import "./floating-guru.css";
import * as React from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Send, X } from "lucide-react";
import wingmanBot from "@/assets/branding/wingman-bot.png";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Message = { role: "guru" | "user"; text: string };

const FAB_KEY = "wm-floating-guru-fab-v2";
const WIN_POS_KEY = "wm-floating-guru-win-pos-v2";
const WIN_SIZE_KEY = "wm-floating-guru-win-size-v2";

const FAB_SIZE = 72;
const FAB_SIZE_MOBILE = 64;
const FAB_GAP = 20;

const WIN_MIN_W = 380;
const WIN_MIN_H = 420;
const WIN_DEFAULT_W = 460;
const WIN_DEFAULT_H = 620;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFabSize() {
  if (typeof window === "undefined") return FAB_SIZE;
  return window.innerWidth <= 900 ? FAB_SIZE_MOBILE : FAB_SIZE;
}

function getFabBounds(size: number) {
  return {
    minX: FAB_GAP,
    minY: FAB_GAP,
    maxX: Math.max(FAB_GAP, window.innerWidth - size - FAB_GAP),
    maxY: Math.max(FAB_GAP, window.innerHeight - size - FAB_GAP),
  };
}

function getDefaultFabPosition(size: number): Point {
  const b = getFabBounds(size);
  return { x: b.maxX, y: b.maxY };
}

function normalizeFabPosition(pos: Point, size: number): Point {
  const b = getFabBounds(size);
  return {
    x: clamp(pos.x, b.minX, b.maxX),
    y: clamp(pos.y, b.minY, b.maxY),
  };
}

function loadFabPosition(size: number): Point {
  try {
    const raw = window.localStorage.getItem(FAB_KEY);
    if (!raw) return getDefaultFabPosition(size);
    const parsed = JSON.parse(raw) as Partial<Point>;
    if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") {
      return getDefaultFabPosition(size);
    }
    return normalizeFabPosition({ x: parsed.x, y: parsed.y }, size);
  } catch {
    return getDefaultFabPosition(size);
  }
}

function saveFabPosition(pos: Point) {
  try {
    window.localStorage.setItem(FAB_KEY, JSON.stringify(pos));
  } catch {}
}

function snapFabToEdge(pos: Point, size: number): Point {
  const b = getFabBounds(size);
  const leftDistance = Math.abs(pos.x - b.minX);
  const rightDistance = Math.abs(b.maxX - pos.x);

  return {
    x: leftDistance <= rightDistance ? b.minX : b.maxX,
    y: clamp(pos.y, b.minY, b.maxY),
  };
}

function normalizeWindowSize(size: Size): Size {
  return {
    width: clamp(size.width, WIN_MIN_W, Math.max(WIN_MIN_W, window.innerWidth - 40)),
    height: clamp(size.height, WIN_MIN_H, Math.max(WIN_MIN_H, window.innerHeight - 40)),
  };
}

function getDefaultWindowSize(): Size {
  return normalizeWindowSize({ width: WIN_DEFAULT_W, height: WIN_DEFAULT_H });
}

function normalizeWindowPosition(pos: Point, size: Size): Point {
  return {
    x: clamp(pos.x, FAB_GAP, Math.max(FAB_GAP, window.innerWidth - size.width - FAB_GAP)),
    y: clamp(pos.y, FAB_GAP, Math.max(FAB_GAP, window.innerHeight - size.height - FAB_GAP)),
  };
}

function getDefaultWindowPosition(size: Size): Point {
  const fabSize = getFabSize();
  const fabPos = getDefaultFabPosition(fabSize);

  return normalizeWindowPosition(
    {
      x: fabPos.x - size.width + fabSize,
      y: fabPos.y - size.height - 12,
    },
    size,
  );
}

function loadWindowSize(): Size {
  try {
    const raw = window.localStorage.getItem(WIN_SIZE_KEY);
    if (!raw) return getDefaultWindowSize();
    const parsed = JSON.parse(raw) as Partial<Size>;
    if (typeof parsed?.width !== "number" || typeof parsed?.height !== "number") {
      return getDefaultWindowSize();
    }
    return normalizeWindowSize({ width: parsed.width, height: parsed.height });
  } catch {
    return getDefaultWindowSize();
  }
}

function loadWindowPosition(size: Size): Point {
  try {
    const raw = window.localStorage.getItem(WIN_POS_KEY);
    if (!raw) return getDefaultWindowPosition(size);
    const parsed = JSON.parse(raw) as Partial<Point>;
    if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") {
      return getDefaultWindowPosition(size);
    }
    return normalizeWindowPosition({ x: parsed.x, y: parsed.y }, size);
  } catch {
    return getDefaultWindowPosition(size);
  }
}

function saveWindowPosition(pos: Point) {
  try {
    window.localStorage.setItem(WIN_POS_KEY, JSON.stringify(pos));
  } catch {}
}

function saveWindowSize(size: Size) {
  try {
    window.localStorage.setItem(WIN_SIZE_KEY, JSON.stringify(size));
  } catch {}
}

function buildGuruReply(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("split")) {
    return "For a splitter conversation, confirm output count, the longest HDMI distance, required resolution, and whether audio extraction, RS232, IR, or Ethernet pass-through are needed.";
  }

  if (q.includes("extend")) {
    return "For an extender conversation, confirm the real cable path length first. Then separate simple AV extension from jobs needing USB, and qualify whether USB means USB 2.0 style peripherals or USB 3.0 style higher-bandwidth devices.";
  }

  if (q.includes("switch")) {
    return "For switching, confirm how many sources feed one display, the connector types, and whether USB-C, BYOD, or collaboration workflows are involved. That usually separates a simple switcher from a more capable room solution.";
  }

  if (q.includes("matrix")) {
    return "For matrix, confirm input count, output count, whether outputs route independently, and whether the job also needs audio breakaway, de-embedding, RS232, IR, or longer-distance transport.";
  }

  if (q.includes("avoip") || q.includes("av over ip")) {
    return "For AVoIP, qualify endpoint scale, routing flexibility, future expansion, multiview or video wall needs, and whether USB or control has to travel with the AV path.";
  }

  if (q.includes("usb")) {
    return "Always split USB qualification into USB 2.0 and USB 3.0 expectations. Ask whether they only need HID, touch, or simple peripherals, or whether they need cameras, storage, or other higher-bandwidth USB devices.";
  }

  if (q.includes("rs232") || q.includes("ir") || q.includes("ethernet")) {
    return "Those features usually separate a basic AV product from a better-fit professional solution. Confirm exactly which control or pass-through paths must travel with the signal.";
  }

  return "Start by confirming the real AV outcome first: split, extend, switch, matrix, or AVoIP. Then narrow distance, resolution, USB needs, control requirements, and future expansion so the WyreStorm shortlist becomes clearer.";
}

export default function FloatingGuru() {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);

  const [fabPosition, setFabPosition] = React.useState<Point>({ x: 0, y: 0 });
  const [windowPosition, setWindowPosition] = React.useState<Point>({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = React.useState<Size>({
    width: WIN_DEFAULT_W,
    height: WIN_DEFAULT_H,
  });

  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "guru",
      text: "Guru is ready. Ask about splitters, extenders, switching, matrix, AVoIP, USB 2.0 vs 3.0, RS232, IR, Ethernet pass-through, or WyreStorm product direction.",
    },
  ]);

  const fabPointerIdRef = React.useRef<number | null>(null);
  const fabStartRef = React.useRef<Point | null>(null);
  const fabOriginRef = React.useRef<Point | null>(null);
  const fabMovedRef = React.useRef(false);

  const dragRef = React.useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const resizeRef = React.useRef<{ startX: number; startY: number; originW: number; originH: number } | null>(null);

  React.useEffect(() => {
    setMounted(true);

    const fabSize = getFabSize();
    setFabPosition(loadFabPosition(fabSize));

    const initialWindowSize = loadWindowSize();
    setWindowSize(initialWindowSize);
    setWindowPosition(loadWindowPosition(initialWindowSize));
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const onResize = () => {
      const fabSize = getFabSize();
      setFabPosition((current) => {
        const next = normalizeFabPosition(current, fabSize);
        saveFabPosition(next);
        return next;
      });

      setWindowSize((currentSize) => {
        const nextSize = normalizeWindowSize(currentSize);
        saveWindowSize(nextSize);
        setWindowPosition((currentPos) => {
          const nextPos = normalizeWindowPosition(currentPos, nextSize);
          saveWindowPosition(nextPos);
          return nextPos;
        });
        return nextSize;
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;

    const onMove = (event: MouseEvent) => {
      if (dragRef.current) {
        setWindowPosition(
          normalizeWindowPosition(
            {
              x: dragRef.current.originX + (event.clientX - dragRef.current.startX),
              y: dragRef.current.originY + (event.clientY - dragRef.current.startY),
            },
            windowSize,
          ),
        );
        return;
      }

      if (resizeRef.current) {
        const nextSize = normalizeWindowSize({
          width: resizeRef.current.originW + (event.clientX - resizeRef.current.startX),
          height: resizeRef.current.originH + (event.clientY - resizeRef.current.startY),
        });
        setWindowSize(nextSize);
        setWindowPosition((current) => normalizeWindowPosition(current, nextSize));
      }
    };

    const onUp = () => {
      if (dragRef.current) {
        saveWindowPosition(windowPosition);
      }

      if (resizeRef.current) {
        saveWindowSize(windowSize);
        saveWindowPosition(normalizeWindowPosition(windowPosition, windowSize));
      }

      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [mounted, windowPosition, windowSize]);

  const finishFabDrag = React.useCallback((pointerId?: number) => {
    if (fabPointerIdRef.current !== null && pointerId !== undefined && fabPointerIdRef.current !== pointerId) {
      return;
    }

    const didMove = fabMovedRef.current;
    fabPointerIdRef.current = null;
    fabStartRef.current = null;
    fabOriginRef.current = null;
    fabMovedRef.current = false;

    if (didMove) {
      const size = getFabSize();
      setFabPosition((current) => {
        const next = snapFabToEdge(current, size);
        saveFabPosition(next);
        return next;
      });
    }
  }, []);

  const onFabPointerDown = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    fabPointerIdRef.current = event.pointerId;
    fabStartRef.current = { x: event.clientX, y: event.clientY };
    fabOriginRef.current = fabPosition;
    fabMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [fabPosition]);

  const onFabPointerMove = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (fabPointerIdRef.current !== event.pointerId) return;
    if (!fabStartRef.current || !fabOriginRef.current) return;

    const dx = event.clientX - fabStartRef.current.x;
    const dy = event.clientY - fabStartRef.current.y;

    if (!fabMovedRef.current) {
      if (Math.abs(dx) >= 6 || Math.abs(dy) >= 6) {
        fabMovedRef.current = true;
      } else {
        return;
      }
    }

    const size = getFabSize();
    setFabPosition(
      normalizeFabPosition(
        {
          x: fabOriginRef.current.x + dx,
          y: fabOriginRef.current.y + dy,
        },
        size,
      ),
    );
  }, []);

  const onFabPointerUp = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const wasDrag = fabMovedRef.current;
    finishFabDrag(event.pointerId);

    if (!wasDrag) {
      if (!open) {
        setOpen(true);
        setMinimized(false);
      } else if (minimized) {
        setMinimized(false);
      } else {
        setMinimized(true);
      }
    }
  }, [finishFabDrag, open, minimized]);

  const onFabPointerCancel = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    finishFabDrag(event.pointerId);
  }, [finishFabDrag]);

  const startWindowDrag = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: windowPosition.x,
      originY: windowPosition.y,
    };
  }, [windowPosition]);

  const startResize = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originW: windowSize.width,
      originH: windowSize.height,
    };
  }, [windowSize]);

  const send = React.useCallback(() => {
    const question = input.trim();
    if (!question) return;

    const reply = buildGuruReply(question);

    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "guru", text: reply },
    ]);
    setInput("");
  }, [input]);

  if (!mounted || typeof document === "undefined") return null;

  const fab = createPortal(
    <button
      type="button"
      className={"wm-floating-guru-fab" + (open && !minimized ? " is-open" : "")}
      aria-label="Open Guru helper"
      title="Guru helper"
      onPointerDown={onFabPointerDown}
      onPointerMove={onFabPointerMove}
      onPointerUp={onFabPointerUp}
      onPointerCancel={onFabPointerCancel}
      style={{ left: fabPosition.x, top: fabPosition.y }}
    >
      <img src={wingmanBot} alt="" className="wm-floating-guru-fab__icon" draggable={false} />
    </button>,
    document.body
  );

  const helper =
    open && !minimized
      ? createPortal(
          <section
            className="wm-floating-guru-window"
            aria-label="Guru helper window"
            style={{
              left: windowPosition.x,
              top: windowPosition.y,
              width: windowSize.width,
              height: windowSize.height,
            }}
          >
            <header className="wm-floating-guru-window__header" onMouseDown={startWindowDrag}>
              <div className="wm-floating-guru-window__brand">
                <img src={wingmanBot} alt="" className="wm-floating-guru-window__avatar" draggable={false} />
                <div>
                  <strong>Guru</strong>
                  <div>Floating AV sales and design helper</div>
                </div>
              </div>

              <div className="wm-floating-guru-window__actions">
                <button
                  type="button"
                  className="wm-floating-guru-window__icon-btn"
                  onClick={() => setMinimized(true)}
                  aria-label="Minimize Guru"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  type="button"
                  className="wm-floating-guru-window__icon-btn"
                  onClick={() => {
                    const nextSize = getDefaultWindowSize();
                    const nextPos = getDefaultWindowPosition(nextSize);
                    setWindowSize(nextSize);
                    setWindowPosition(nextPos);
                    saveWindowSize(nextSize);
                    saveWindowPosition(nextPos);
                  }}
                  aria-label="Reset Guru window"
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  type="button"
                  className="wm-floating-guru-window__icon-btn"
                  onClick={() => {
                    setOpen(false);
                    setMinimized(false);
                  }}
                  aria-label="Close Guru"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="wm-floating-guru-window__body">
              <div className="wm-floating-guru-window__messages">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={
                      "wm-floating-guru-window__message " +
                      (message.role === "guru"
                        ? "wm-floating-guru-window__message--guru"
                        : "wm-floating-guru-window__message--user")
                    }
                  >
                    {message.text}
                  </div>
                ))}
              </div>
            </div>

            <footer className="wm-floating-guru-window__footer">
              <input
                className="wm-floating-guru-window__input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") send();
                }}
                placeholder="Ask Guru about split, extend, switch, matrix, AVoIP, USB, control..."
              />
              <button
                type="button"
                className="wm-floating-guru-window__send"
                onClick={send}
                aria-label="Send to Guru"
              >
                <Send size={16} />
              </button>
            </footer>

            <div className="wm-floating-guru-window__resize-handle" onMouseDown={startResize} />
          </section>,
          document.body
        )
      : null;

  return (
    <>
      {helper}
      {fab}
    </>
  );
}