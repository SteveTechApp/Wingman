// src/app/shell/AppShell.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import AppPageFrame from "@/app/layout/AppPageFrame";

function getRouteGroup(pathname: string): string {
  if (pathname === "/app" || pathname === "/app/" || pathname.startsWith("/app/dashboard")) return "dashboard";
  if (pathname.startsWith("/app/templates") || pathname.startsWith("/app/tools/catalog")) return "templates";
  if (pathname.startsWith("/app/projects")) return "projects";
  if (pathname.startsWith("/app/survey-import")) return "survey";
  if (pathname.startsWith("/app/tools/competitor")) return "competitor";
  if (pathname.startsWith("/app/tools/proposal")) return "proposal";
  if (pathname.startsWith("/app/tools/room")) return "room";
  if (pathname.startsWith("/app/tools/videowall")) return "videowall";
  if (pathname.startsWith("/app/tools/training")) return "training";
  if (pathname.startsWith("/app/tools/guru")) return "guru";
  return "default";
}

function AppFooter() {
  const nav = useNavigate();

  const linkStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.82)",
    textDecoration: "none",
    whiteSpace: "nowrap",
    fontSize: 13,
    lineHeight: 1,
  };

  const btnStyle: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.90)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
  };

  return (
    <footer
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "0 16px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,10,16,0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
          minWidth: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ opacity: 0.82, fontWeight: 700 }}>WyreStorm Wingman</span>
        <span style={{ opacity: 0.38 }}>•</span>
        <a href="https://wyrestorm.com" style={linkStyle} target="_blank" rel="noreferrer">wyrestorm.com</a>
        <a href="https://wyrestorm.com/support/" style={linkStyle} target="_blank" rel="noreferrer">Support</a>
        <a href="https://wyrestorm.com/contact/" style={linkStyle} target="_blank" rel="noreferrer">Contact</a>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "nowrap",
          alignItems: "center",
          marginLeft: 12,
        }}
      >
        <button type="button" style={btnStyle} onClick={() => nav("/app/dashboard")}>Dashboard</button>
        <button type="button" style={btnStyle} onClick={() => nav("/app/templates")}>Templates</button>
        <button type="button" style={btnStyle} onClick={() => nav("/app/tools/catalog")}>Catalog</button>
        <button type="button" style={btnStyle} onClick={() => nav("/app/tools/competitor")}>Competitors</button>
        <button type="button" style={btnStyle} onClick={() => nav("/app/tools/guru")}>Guru</button>
      </div>
    </footer>
  );
}

export default function AppShell() {
  const loc = useLocation();

  const routeGroup = useMemo(() => getRouteGroup(loc.pathname), [loc.pathname]);

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
      data-wm-route={routeGroup}
      style={{
        minHeight: "100vh",
        background: "var(--wm-bg)",
        display: "grid",
        gridTemplateRows: "72px 1fr 48px",
        overflow: "hidden",
      }}
    >
      <TopBar collapsed={collapsed} onToggleNav={() => setCollapsed((v) => !v)} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: collapsed ? "78px 1fr" : "230px 1fr",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <aside
          style={{
            minHeight: 0,
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <div
            style={{
              height: "100%",
              overflow: "hidden",
            }}
          >
            <MissionControlNav />
          </div>
        </aside>

        <main
          style={{
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "18px 22px 22px",
          }}
        >
          <AppPageFrame>
            <Outlet />
          </AppPageFrame>
        </main>
      </div>

      <AppFooter />
    </div>
  );
}