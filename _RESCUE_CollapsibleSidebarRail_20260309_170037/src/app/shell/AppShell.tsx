import * as React from "react";
import { Outlet } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import AppFooter from "@/app/layout/AppFooter";

export default function AppShell() {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem("wm_nav_collapsed") === "1";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("wm_nav_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  return (
    <div className="wm-shell-root">

      <TopBar />

      <div className="wm-shell-body">

        <aside className={`wm-shell-nav ${collapsed ? "collapsed" : ""}`}>
          <MissionControlNav
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(v => !v)}
          />
        </aside>

        <main className="wm-shell-main">
          <div className="wm-shell-workspace wm-shell-fullwidth">
            <Outlet />
          </div>
        </main>

      </div>

      <AppFooter />

    </div>
  );
}
