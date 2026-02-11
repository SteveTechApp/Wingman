import React from "react";
import { Link, Outlet } from "react-router-dom";
import appLogo from "@/assets/branding/wyrestorm-wingman-logo.png";
import AppFooter from "@/components/layout/AppFooter";
import GuruFab from "@/guru/GuruFab";

export default function AppShell() {
  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/app/dashboard" className="flex items-center gap-3">
            <img src={appLogo} alt="WyreStorm Wingman" className="h-20 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <Link className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20" to="/app/dashboard">Dashboard</Link>
            <Link className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20" to="/app/toolhub">ToolHub</Link>
            <Link className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20" to="/app/projects">Projects</Link>
            <Link className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20" to="/app/import">Import</Link>
            <Link className="px-3 py-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/50" to="/app/tools/ask">Guru</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-4">
        <Outlet />
        <AppFooter />
      </main>

      <GuruFab />
    </div>
  );
}