import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import GuruFab from "@/features/ai/guru/GuruFab";
import GuruHelperWindow from "@/features/ai/guru/GuruHelperWindow";
import MissionControlNav from "@/ui2/nav/MissionControlNav";

type GuruBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const GURU_BOUNDS_KEY = "wingman.guru.bounds";
const GURU_OPEN_KEY = "wingman.guru.open";
const GURU_MINIMIZED_KEY = "wingman.guru.minimized";

const DEFAULT_BOUNDS: GuruBounds = {
  x: 0,
  y: 0,
  width: 520,
  height: 680,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultBounds(): GuruBounds {
  if (typeof window === "undefined") {
    return DEFAULT_BOUNDS;
  }

  const width = clamp(window.innerWidth * 0.34, 420, 560);
  const height = clamp(window.innerHeight * 0.7, 520, 760);

  return {
    x: Math.max(16, window.innerWidth - width - 28),
    y: Math.max(88, window.innerHeight - height - 28),
    width,
    height,
  };
}

function readBounds(): GuruBounds {
  if (typeof window === "undefined") {
    return DEFAULT_BOUNDS;
  }

  try {
    const raw = window.localStorage.getItem(GURU_BOUNDS_KEY);
    if (!raw) {
      return getDefaultBounds();
    }

    const parsed = JSON.parse(raw) as Partial<GuruBounds>;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      typeof parsed.width === "number" &&
      typeof parsed.height === "number"
    ) {
      return parsed as GuruBounds;
    }
  } catch {
    // ignore malformed storage
  }

  return getDefaultBounds();
}

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
  } catch {
    // ignore storage failures
  }

  return fallback;
}

export default function AppShell() {
  const location = useLocation();
  const isGuruFullPage = location.pathname.startsWith("/app/tools/guru");

  const [guruOpen, setGuruOpen] = React.useState(() => readBool(GURU_OPEN_KEY, false));
  const [guruMinimized, setGuruMinimized] = React.useState(() =>
    readBool(GURU_MINIMIZED_KEY, false),
  );
  const [guruBounds, setGuruBounds] = React.useState<GuruBounds>(() => readBounds());

  React.useEffect(() => {
    try {
      window.localStorage.setItem(GURU_OPEN_KEY, guruOpen ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [guruOpen]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(GURU_MINIMIZED_KEY, guruMinimized ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [guruMinimized]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(GURU_BOUNDS_KEY, JSON.stringify(guruBounds));
    } catch {
      // ignore storage failures
    }
  }, [guruBounds]);

  React.useEffect(() => {
    function onResize() {
      setGuruBounds((current) => {
        const maxWidth = Math.max(420, window.innerWidth - 32);
        const maxHeight = Math.max(480, window.innerHeight - 120);
        const width = clamp(current.width, 420, maxWidth);
        const height = clamp(current.height, 480, maxHeight);
        const x = clamp(current.x, 12, Math.max(12, window.innerWidth - width - 12));
        const y = clamp(current.y, 84, Math.max(84, window.innerHeight - height - 12));

        return { x, y, width, height };
      });
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleToggleGuru = React.useCallback(() => {
    if (!guruOpen) {
      setGuruOpen(true);
      setGuruMinimized(false);
      return;
    }

    if (guruMinimized) {
      setGuruMinimized(false);
      return;
    }

    setGuruMinimized(true);
  }, [guruMinimized, guruOpen]);

  return (
    <div className="wm-shell-root app-shell" data-wm-shell="root">
      <TopBar />

      <div className="wm-shell-grid wm-shell-body" data-wm-shell="body">
        <aside className="wm-shell-nav-column wm-sidebar" data-wm-sidebar>
          <MissionControlNav />
        </aside>

        <main className="wm-app-main wm-main" data-wm-main>
          <div className="wm-shell-workspace">
            <Outlet />
          </div>
        </main>
      </div>

      {!isGuruFullPage ? (
        <>
          <GuruHelperWindow
            open={guruOpen}
            minimized={guruMinimized}
            bounds={guruBounds}
            onBoundsChange={setGuruBounds}
            onClose={() => {
              setGuruOpen(false);
              setGuruMinimized(false);
            }}
            onMinimize={() => {
              setGuruOpen(true);
              setGuruMinimized(true);
            }}
          />

          <GuruFab open={guruOpen} minimized={guruMinimized} onToggle={handleToggleGuru} />
        </>
      ) : null}
    </div>
  );
}
