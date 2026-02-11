import React, { useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import CategoryMenu from "@/components/nav/CategoryMenu";

function crumbLabel(path: string) {
  if (path.startsWith("/dashboard")) return "Dashboard";
  if (path.startsWith("/projects")) return "Projects";
  if (path.startsWith("/import")) return "Import";
  if (path.startsWith("/toolhub")) return "Tool Hub";
  if (path.startsWith("/tools/competitor-compare")) return "Competitor Compare";
  if (path === "/" || path.startsWith("/public")) return "Welcome";
  return "Workspace";
}

export default function TopBar() {
  const loc = useLocation();

  const crumbs = useMemo(() => {
    const here = crumbLabel(loc.pathname);
    return [
      { label: "Workspace", href: "/dashboard" },
      { label: here }
    ];
  }, [loc.pathname]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    "wm-toplink" + (isActive ? " wm-toplink-active" : "");

  return (
    <header className="wm-app-header">
      <div className="wm-container wm-topbar">
        <div className="wm-topbar-left">
          <Link to="/app/dashboard" className="wm-brand">
            <span className="wm-brand-mark">W</span>
            <span className="wm-brand-text">
              <span className="wm-brand-title">Wingman</span>
</span>
          </Link>

          <div className="wm-crumbs">
            {crumbs.map((c, i) => (
              <span key={i} className="wm-crumb">
                {c.href ? <a className="wm-crumb-link" href={c.href}>{c.label}</a> : <span>{c.label}</span>}
                {i < crumbs.length - 1 ? <span className="wm-crumb-sep">/</span> : null}
              </span>
            ))}
          </div>
        </div>

        <div className="wm-topbar-right">
          <div className="wm-topbar-actions">
            <CategoryMenu />

            <NavLink to="/app/projects" className={navLinkClass}>Projects</NavLink>
            <NavLink to="/app/toolhub" className={navLinkClass}>Tool Hub</NavLink>
            <NavLink to="/app/import" className={navLinkClass}>Import</NavLink>
          </div>
        </div>
      </div>
    </header>
  );
}


