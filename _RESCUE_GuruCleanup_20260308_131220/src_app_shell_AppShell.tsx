import * as React from "react";
import { Outlet } from "react-router-dom";

import AppFooter from "@/app/layout/AppFooter";
import GuruMount from "@/features/guru/GuruMount";
import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";

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
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <>
      <div className="wm-shell">
        <TopBar />

        <div className="wm-shell__body">
          <MissionControlNav
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
          <main className="wm-shell__main">
            <Outlet />
          </main>
        </div>

        <AppFooter />
      </div>

      <GuruMount />
    </>
  );
}