import React from "react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/toolhub", label: "ToolHub" },
  { to: "/app/projects", label: "Projects" },
  { to: "/app/import", label: "Import" },
  { to: "/app/tools/videowall", label: "VideoWall" },
  { to: "/app/tools/competitor-compare", label: "Competitor" },
  { to: "/app/tools/ask", label: "Guru" },
];

export default function AppFooter() {
  const { pathname } = useLocation();
  return (
    <footer className="mt-6 border-t border-white/10 pt-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4">
        {links.map((l) => {
          const active = pathname === l.to || pathname.startsWith(l.to + "/");
          return (
            <Link
              key={l.to}
              to={l.to}
              className={
                "rounded-lg px-3 py-2 text-sm border transition " +
                (active
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5")
              }
            >
              {l.label}
            </Link>
          );
        })}
      </div>
      <div className="mx-auto mt-3 max-w-7xl px-4 pb-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} WyreStorm Technologies — Wingman
      </div>
    </footer>
  );
}