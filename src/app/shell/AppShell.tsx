import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";

export default function AppShell() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("wm_nav_collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("wm_nav_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  return (
    <div
      className="wm-shell"
      style={{
        display: "grid",
        gridTemplateRows: "64px 1fr",
        minHeight: "100vh",
        background: "var(--wm-bg)",
        overflow: "hidden",
      }}
    >
      <TopBar collapsed={collapsed} onToggleNav={() => setCollapsed(v => !v)} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: collapsed ? "72px 1fr" : "260px 1fr",
          minHeight: 0,
        }}
      >
        <MissionControlNav collapsed={collapsed} />

        <main
          style={{
            minHeight: 0,
            overflow: "auto",
            padding: "28px 32px",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}