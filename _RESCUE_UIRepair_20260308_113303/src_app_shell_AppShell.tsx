import * as React from "react";
import { Outlet } from "react-router-dom";

import AppFooter from "@/app/layout/AppFooter";
import TopBar from "@/app/navigation/TopBar";
import TopBarBrandOverlay from "@/app/navigation/TopBarBrandOverlay";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import GuruMount from "@/features/guru/GuruMount";

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

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className="wm-app-shell"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        background:
          "radial-gradient(circle at top left, rgba(19,42,82,0.26), transparent 30%), linear-gradient(180deg, #07111f 0%, #081523 48%, #07111d 100%)",
        color: "#eef6ff",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backdropFilter: "blur(14px)",
          background: "rgba(7,16,30,0.78)",
          borderBottom: "1px solid rgba(140,190,255,0.10)",
        }}
      >
        <TopBar />
      <TopBarBrandOverlay />
      </header>

      <div
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: collapsed ? "78px minmax(0, 1fr)" : "228px minmax(0, 1fr)",
          transition: "grid-template-columns 160ms ease",
        }}
      >
        <div
          style={{
            minHeight: 0,
            borderRight: "1px solid rgba(140,190,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(8,18,34,0.96), rgba(5,12,22,0.98))",
          }}
        >
          <MissionControlNav
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>

        <div
          style={{
            minWidth: 0,
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "minmax(0, 1fr) auto",
          }}
        >
          <main
            className="wm-main-content"
            style={{
              minWidth: 0,
              minHeight: 0,
              overflow: "auto",
            }}
          >
            <div
              style={{
                minHeight: "100%",
                padding: "1px 12px 8px",
              }}
            >
              <Outlet />
            </div>
          </main>

          <div
            style={{
              borderTop: "1px solid rgba(140,190,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ padding: "8px 16px" }}>
              <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          zIndex: 40,
        }}
      >
        <AppFooter />
      </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          right: 18,
          bottom: 42,
          zIndex: 80,
          width: "auto",
          maxWidth: "unset",
          pointerEvents: "auto",
        }}
      >
        <GuruMount />
      </div>
    </div>
  );
}