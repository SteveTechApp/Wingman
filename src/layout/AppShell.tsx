import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "@/components/nav/TopBar";
import SideNav from "@/components/nav/SideNav";

export default function AppShell() {
  return (
    <div className="wm-bg wm-shell">
      <header className="wm-topbar">
        <div className="wm-container">
          <TopBar />
        </div>
      </header>

      <div className="wm-container" style={{ paddingTop: 14, paddingBottom: 14 }}>
        <div className="wm-grid" style={{ gridTemplateColumns: "1fr", gap: 14 }}>
          <div className="wm-grid" style={{ gridTemplateColumns: "260px 1fr", gap: 14 }}>
            <aside className="wm-card wm-card-pad" style={{ height: "fit-content" }}>
              <SideNav />
            </aside>
            <main className="wm-card wm-card-pad">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      <footer>
        <div className="wm-container">
          <div className="wm-divider"></div>
          <div className="wm-spread">
            <span className="wm-p">Wingman • Commercial Baseline</span>
            <span className="wm-p">WyreStorm Technologies</span>
          </div>
        </div>
      </footer>
    </div>
  );
}