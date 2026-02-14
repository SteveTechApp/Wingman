import React from "react";
import { Outlet } from "react-router-dom";

import SideNav from "@/app/navigation/SideNav";
import TopBar from "@/app/navigation/TopBar";
import AppFooter from "@/components/layout/AppFooter";

export default function AppShell() {
  return (
    <div className="ui2-root wm-app">
      <header className="wm-app-header">
        <div className="wm-container wm-topbar">
          <TopBar />
        </div>
      </header>

      <div className="wm-app-body">
        <div className="wm-app-grid">
          <aside className="wm-leftnav">
            <div className="wm-leftnav-scroll">
              <SideNav />
            </div>
          </aside>

          <main className="wm-app-surface">
            <div className="wm-container wm-page">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <footer className="wm-app-footer">
        <div className="wm-container wm-footerbar">
          <AppFooter />
        </div>
      </footer>
    </div>
  );
}
