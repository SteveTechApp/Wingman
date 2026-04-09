import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Maximize2, Minimize2, X } from "lucide-react";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import GuruFab from "@/features/ai/guru/GuruFab";

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

export default function AppShell() {
  const location = useLocation();

  const [guruOpen, setGuruOpen] = useState<boolean>(() => readBool("wm:guru:open", false));
  const [guruMinimized, setGuruMinimized] = useState<boolean>(() => readBool("wm:guru:minimized", false));

  const isGuruFullPage = useMemo(
    () => location.pathname.includes("/app/tools/guru"),
    [location.pathname],
  );

  useEffect(() => {
    try {
      localStorage.setItem("wm:guru:open", String(guruOpen));
      localStorage.setItem("wm:guru:minimized", String(guruMinimized));
    } catch {
      // ignore storage issues
    }
  }, [guruOpen, guruMinimized]);

  function toggleGuru() {
    setGuruOpen((current) => {
      const next = !current;
      if (next) {
        setGuruMinimized(false);
      }
      return next;
    });
  }

  function closeGuru() {
    setGuruOpen(false);
    setGuruMinimized(false);
  }

  function minimizeGuru() {
    setGuruMinimized(true);
  }

  function restoreGuru() {
    setGuruMinimized(false);
  }

  return (
    <div style={shellRootStyle}>
      <TopBar />

      <div style={shellBodyStyle}>
        <div style={sidebarWrapStyle}>
          <MissionControlNav />
        </div>

        <main style={mainStyle}>
          <Outlet />
        </main>
      </div>

      {!isGuruFullPage ? (
        <>
          {guruOpen && !guruMinimized ? (
            <section style={guruPanelStyle} aria-label="Guru helper window">
              <div style={guruPanelHeaderStyle}>
                <div style={guruPanelHeaderCopyStyle}>
                  <div style={guruPanelEyebrowStyle}>Guru Helper</div>
                  <div style={guruPanelTitleStyle}>AV Designer & Sales Assistant</div>
                </div>

                <div style={guruPanelActionsStyle}>
                  <button
                    type="button"
                    onClick={minimizeGuru}
                    style={panelIconButtonStyle}
                    title="Minimize Guru"
                  >
                    <Minimize2 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={closeGuru}
                    style={panelIconButtonStyle}
                    title="Close Guru"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div style={guruPanelBodyStyle}>
              </div>
            </section>
          ) : null}

          {guruOpen && guruMinimized ? (
            <button
              type="button"
              onClick={restoreGuru}
              style={guruRestorePillStyle}
              title="Restore Guru"
            >
              <Maximize2 size={14} />
              <span>Restore Guru</span>
            </button>
          ) : null}

          <GuruFab
            open={guruOpen}
            minimized={guruMinimized}
            onToggle={toggleGuru}
          />
        </>
      ) : null}
    </div>
  );
}

const shellRootStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  minHeight: "100vh",
  background: "var(--wm-bg, #0b1220)",
  color: "var(--wm-text, #e5eef8)",
};

const shellBodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "256px minmax(0, 1fr)",
  minHeight: 0,
  overflow: "hidden",
};

const sidebarWrapStyle: CSSProperties = {
  minWidth: 0,
  overflowY: "auto",
  overflowX: "visible",
  borderRight: "1px solid rgba(148,163,184,0.06)",
  background: "linear-gradient(180deg, rgba(10,18,30,0.96), rgba(9,16,28,0.92))",
  position: "relative",
  zIndex: 20,
};

const mainStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  overflow: "auto",
  background: "var(--wm-bg, #0b1220)",
};

const guruPanelStyle: CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 102,
  width: 396,
  height: "min(68vh, 690px)",
  borderRadius: 18,
  border: "1px solid rgba(245,158,11,0.10)",
  background: "linear-gradient(180deg, rgba(11,18,28,0.97), rgba(10,15,24,0.96))",
  boxShadow: "0 22px 56px rgba(2,8,23,0.34)",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflow: "hidden",
  zIndex: 9998,
};

const guruPanelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "linear-gradient(180deg, rgba(245,158,11,0.05), rgba(15,23,42,0.50))",
};

const guruPanelHeaderCopyStyle: CSSProperties = {
  display: "grid",
  gap: 2,
};

const guruPanelEyebrowStyle: CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  opacity: 0.62,
  fontWeight: 800,
};

const guruPanelTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 850,
};

const guruPanelActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const panelIconButtonStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "inherit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const guruPanelBodyStyle: CSSProperties = {
  minHeight: 0,
  overflow: "hidden",
};

const guruRestorePillStyle: CSSProperties = {
  position: "fixed",
  right: 108,
  bottom: 32,
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(245,158,11,0.12)",
  background: "linear-gradient(180deg, rgba(245,158,11,0.07), rgba(15,23,42,0.82))",
  color: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  zIndex: 9998,
  boxShadow: "0 10px 24px rgba(2,8,23,0.22)",
  fontSize: 12,
  fontWeight: 800,
};