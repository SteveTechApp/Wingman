import * as React from "react";
import { Outlet } from "react-router-dom";

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
      className="wm-shell"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(7,51,79,0.34), transparent 28%), linear-gradient(180deg, #05111d 0%, #071523 56%, #06111b 100%)",
        color: "rgba(255,255,255,0.94)",
        overflowX: "hidden",
      }}
    >
      <TopBar collapsed={collapsed} onToggleNav={() => setCollapsed((v) => !v)} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: collapsed ? "76px minmax(0,1fr)" : "240px minmax(0,1fr)",
          minHeight: "calc(100vh - 74px)",
          transition: "grid-template-columns 180ms ease",
        }}
      >
        <aside
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, rgba(7,17,29,0.96), rgba(6,14,24,0.98))",
            minWidth: 0,
          }}
        >
          <MissionControlNav
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </aside>

        <main
          style={{
            minWidth: 0,
            padding: "18px 22px 26px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1560px",
              margin: "0 auto",
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}