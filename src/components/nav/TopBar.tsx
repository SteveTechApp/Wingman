import React, { useMemo } from "react";




import WingmanBrand from "@/components/branding/WingmanBrand";
import { Link, useLocation } from "react-router-dom";



import CategoryMenu from "@/components/nav/CategoryMenu";



function useRouteLabel(pathname: string) {
  return useMemo(() => {
    const p = pathname.toLowerCase();

    if (p === "/" || p.startsWith("/app") === false) return { section: "Public", page: "Home" };

    if (p === "/app" || p.startsWith("/app/dashboard")) return { section: "Workspace", page: "Dashboard" };
    if (p.startsWith("/app/projects")) return { section: "Workspace", page: "Projects" };
    if (p.startsWith("/app/import")) return { section: "Project", page: "Import Intake" };
    if (p.startsWith("/app/toolhub")) return { section: "Tools", page: "Tool Hub" };
    if (p.startsWith("/app/tools/competitor-compare")) return { section: "Tools", page: "Competitor Compare" };

    return { section: "Workspace", page: "App" };
  }, [pathname]);
}

export default function TopBar() {
  const loc = useLocation();
  const label = useRouteLabel(loc.pathname);

  return (
    <header className="wm-app-header sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="wm-container h-14 flex items-center justify-between gap-3">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/app/dashboard" className="flex items-center min-w-0">
            <WingmanBrand size="lg" align="left" showStrap={false} className="wm-topbar-brand" />
          </Link>
        </div>

        {/* Middle: Breadcrumb / context */}
        <div className="hidden md:flex items-center gap-2 text-xs text-emerald-100/60 min-w-0">
          <span className="px-2 py-1 rounded-lg border border-white/10 bg-black/20">
            {label.section}
          </span>
          <span className="opacity-40">/</span>
          <span className="text-white/80 font-semibold truncate">{label.page}</span>
        </div>

        {/* Right: Menu + quick links */}
        <div className="flex items-center gap-2 shrink-0">
          <CategoryMenu />

          <Link
            to="/app/projects"
            className="hidden sm:inline-flex items-center rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white hover:bg-black/30"
          >
            Projects
          </Link>

          <Link
            to="/app/toolhub"
            className="hidden lg:inline-flex items-center rounded-xl border border-emerald-200/15 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-500/15"
          >
            Tool Hub
          </Link>
        </div>
      </div>
    </header>
  );
}










