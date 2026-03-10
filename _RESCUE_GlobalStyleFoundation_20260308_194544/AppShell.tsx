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
    } catch {}
  }, [collapsed]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "54px minmax(0, 1fr) 32px",
        background:
          "radial-gradient(circle at top, rgba(14,44,78,0.28), transparent 36%), linear-gradient(180deg, #04101b 0%, #03101a 100%)",
        color: "#eef6ff",
      }}
    >
      <TopBar />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${collapsed ? 64 : 214}px minmax(0, 1fr)`,
          minHeight: 0,
        }}
      >
        <MissionControlNav collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />

        <main
          style={{
            minWidth: 0,
            minHeight: 0,
            padding: "10px 12px 8px",
            overflow: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              minHeight: "100%",
              display: "grid",
              alignContent: "start",
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>

      <AppFooter />
      <GuruMount />
    </div>
  );
}