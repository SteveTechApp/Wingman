import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import { getWorkspaceMeta } from "@/app/navigation/workspaceMeta";
import GuruFab from "@/features/ai/guru/GuruFab";
import GuruHelperWindow from "@/features/ai/guru/GuruHelperWindow";
import {
  getAnchoredGuruBounds,
  getDefaultGuruBounds,
  sanitizeGuruBounds,
  type GuruBounds,
} from "@/features/ai/guru/guruLayout";
import MissionControlNav from "@/ui2/nav/MissionControlNav";

const GURU_BOUNDS_KEY = "wingman.guru.bounds";
const GURU_OPEN_KEY = "wingman.guru.open";
const GURU_MINIMIZED_KEY = "wingman.guru.minimized";

function readBounds(): GuruBounds {
  if (typeof window === "undefined") {
    return getDefaultGuruBounds();
  }

  try {
    const raw = window.localStorage.getItem(GURU_BOUNDS_KEY);
    if (!raw) {
      return getDefaultGuruBounds();
    }

    const parsed = JSON.parse(raw) as Partial<GuruBounds>;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      typeof parsed.width === "number" &&
      typeof parsed.height === "number"
    ) {
      return sanitizeGuruBounds(parsed, true);
    }
  } catch {
    // ignore malformed storage
  }

  return getDefaultGuruBounds();
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
  const workspaceMeta = React.useMemo(
    () => getWorkspaceMeta(location.pathname),
    [location.pathname],
  );
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
      setGuruBounds((current) => sanitizeGuruBounds(current));
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || isGuruFullPage || !guruOpen || guruMinimized) {
      return;
    }

    setGuruBounds((current) => getAnchoredGuruBounds(current));
  }, [guruMinimized, guruOpen, isGuruFullPage]);

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

  const showGuruFab = !isGuruFullPage && (!guruOpen || guruMinimized);

  return (
    <div
      className="wm-shell-root app-shell"
      data-wm-shell="root"
      data-wm-tone={workspaceMeta.tone}
      data-wm-route-key={workspaceMeta.key}
    >
      <TopBar meta={workspaceMeta} />

      <div className="wm-shell-grid wm-shell-body" data-wm-shell="body">
        <aside className="wm-shell-nav-column wm-sidebar" data-wm-sidebar>
          <MissionControlNav meta={workspaceMeta} />
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

          {showGuruFab ? (
            <GuruFab
              open={guruOpen}
              minimized={guruMinimized}
              onToggle={handleToggleGuru}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
