import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import AppFooter from "@/app/layout/AppFooter";

export default function AppShell() {
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem("wm_nav_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(max-width: 900px)");
    const apply = () => {
      const matches = query.matches;
      setIsMobileViewport(matches);
      if (!matches) {
        setMobileNavOpen(false);
      }
    };

    apply();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", apply);
      return () => query.removeEventListener("change", apply);
    }

    query.addListener(apply);
    return () => query.removeListener(apply);
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("wm_nav_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  React.useEffect(() => {
    if (isMobileViewport) {
      setMobileNavOpen(false);
    }
  }, [isMobileViewport, location.pathname]);

  const navCollapsed = isMobileViewport ? false : collapsed;

  return (
    <div className="wm-shell-root">
      <TopBar
        showMobileMenu={isMobileViewport}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((value) => !value)}
      />

      <div className={`wm-shell-body${mobileNavOpen ? " is-mobile-nav-open" : ""}`}>
        <button
          type="button"
          className={`wm-shell-backdrop${mobileNavOpen ? " is-visible" : ""}`}
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />

        <aside
          className={`wm-shell-nav${navCollapsed ? " is-collapsed" : ""}${mobileNavOpen ? " is-mobile-open" : ""}`}
        >
          <MissionControlNav
            collapsed={navCollapsed}
            onToggleCollapse={() => {
              if (isMobileViewport) {
                setMobileNavOpen(false);
                return;
              }
              setCollapsed((v) => !v);
            }}
          />
        </aside>

        <main className="wm-shell-main wm-scrollbar-thin">
          <div className="wm-shell-content">
            <Outlet />
          </div>
        </main>
      </div>

      <AppFooter />
    </div>
  );
}
