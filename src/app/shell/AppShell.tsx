import React from "react";
import { Link, Outlet } from "react-router-dom";
import TopBar from "@/components/nav/TopBar";
import SideNav from "@/components/nav/SideNav";

export default function AppShell() {
  return (
    <div className="ui2-root wm-app">
      <TopBar />

      <div className="wm-app-body">
        <div className="min-h-0 h-full grid grid-cols-1 lg:grid-cols-[260px_1fr]">
          <SideNav />

          <main className="wm-app-surface">
            <Outlet />
          </main>
        </div>
      </div>

      <footer className="wm-app-footer">
        <div className="wm-container wm-footerbar">
          <div className="wm-footer-left">
            <span className="wm-footer-muted">
              © {new Date().getFullYear()} WyreStorm Technologies — Wingman
            </span>
          </div>

          <div className="wm-footer-right">
            <Link className="wm-footer-link" to="/app/dashboard">Dashboard</Link>
            <Link className="wm-footer-link" to="/app/projects">Projects</Link>
            <Link className="wm-footer-link" to="/app/toolhub">Tool Hub</Link>
            <Link className="wm-footer-link" to="/app/import">Import</Link>
            <Link className="wm-footer-link" to="/app/tools/competitor-compare">Compare</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

