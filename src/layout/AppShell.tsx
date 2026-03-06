import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import SideNav from "@/app/navigation/SideNav";

type Props = {
  defaultCollapsed?: boolean;
};

const STORAGE_KEY = "wm_nav_collapsed";

export default function AppShell({ defaultCollapsed }: Props) {
  const location = useLocation();

  const routeTag = React.useMemo(() => {
    const p = (location.pathname || "").toLowerCase();
    if (p.includes("/tools/")) return "tools";
    if (p.includes("/projects")) return "projects";
    if (p.includes("/dashboard")) return "dashboard";
    if (p.includes("/survey")) return "survey";
    if (p.includes("/competitor")) return "competitor";
    if (p.includes("/proposal")) return "proposal";
    if (p.includes("/room")) return "room";
    if (p.includes("/videowall")) return "videowall";
    if (p.includes("/training")) return "training";
    if (p.includes("/guru")) return "guru";
    return "app";
  }, [location.pathname]);

  const [navCollapsed, setNavCollapsed] = React.useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === null) return defaultCollapsed ?? true;
      return saved === "1";
    } catch {
      return defaultCollapsed ?? true;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, navCollapsed ? "1" : "0");
    } catch {}
  }, [navCollapsed]);

  React.useEffect(() => {
    const onToggle = () => setNavCollapsed((v) => !v);
    window.addEventListener("wm:toggle-nav", onToggle as EventListener);
    return () => window.removeEventListener("wm:toggle-nav", onToggle as EventListener);
  }, []);

  return (
    <div
      className="wm-bg wm-shell wm-mode-app"
      data-nav-collapsed={navCollapsed ? "1" : "0"}
      data-wm-route={routeTag}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--wm-bg)",
        overflowX: "hidden",
      }}
    >
      <header className="wm-topbar" style={{ position: "sticky", top: 0, zIndex: 60 }}>
        <div className="wm-topbar__inner">
          <TopBar collapsed={navCollapsed} onToggleNav={() => setNavCollapsed((v) => !v)} />
        </div>
      </header>

      {/* Main area: NO extra top padding (prevents vertical scroll above Dashboard) */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <div
          className="wm-grid"
          style={{
            display: "grid",
            gridTemplateColumns: navCollapsed ? "76px 1fr" : "260px 1fr",
            gap: 14,
            alignItems: "start",
            width: "100%",
          }}
        >
          <aside
            className="wm-card wm-card-pad wm-sidenav-wrap"
            style={{
              height: "fit-content",
              overflow: "hidden",
              padding: navCollapsed ? 10 : undefined,
              marginTop: 0,
            }}
          >
            <SideNav />
          </aside>

          <main style={{ minWidth: 0, display: "block", paddingTop: 0 }}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* Footer: corporate + web links */}
      <footer
        className="wm-footer"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(8,18,32,0.55)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="wm-topbar__inner" style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="wm-p" style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
              © {new Date().getFullYear()} WyreStorm Technologies
            </span>
            <span className="wm-p" style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
              Wingman • Internal sales enablement
            </span>
          </div>

          <nav style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <a className="wm-p" style={{ margin: 0, fontSize: 12, opacity: 0.9 }} href="https://www.wyrestorm.com" target="_blank" rel="noreferrer">
              Corporate Website
            </a>
            <a className="wm-p" style={{ margin: 0, fontSize: 12, opacity: 0.9 }} href="https://support.wyrestorm.com" target="_blank" rel="noreferrer">
              Support
            </a>
            <a className="wm-p" style={{ margin: 0, fontSize: 12, opacity: 0.9 }} href="https://www.wyrestorm.com/contact/" target="_blank" rel="noreferrer">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}