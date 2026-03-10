import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import heroLogo from "@/assets/branding/wyrestorm-wingman-logo.png";

function navBtn(active: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    height: 38,
    padding: "0 14px",
    borderRadius: 12,
    border: active ? "1px solid rgba(108,198,255,0.26)" : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "linear-gradient(180deg, rgba(31,108,166,0.94), rgba(18,72,124,0.98))"
      : "linear-gradient(180deg, rgba(14,31,56,0.92), rgba(10,23,42,0.96))",
    color: "#eef6ff",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    boxShadow: active ? "0 10px 22px rgba(20,92,170,0.18)" : "none",
  };
}

export default function TopBar() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  return (
    <header className="wm-topbar">
      <div className="wm-topbar__brand">
        <img src={heroLogo} alt="WyreStorm Wingman" className="wm-topbar__logo" />
      </div>

      <div className="wm-topbar__project">
        <span>Active Project - No active project</span>
      </div>

      <div className="wm-topbar__actions">
        <Link to="/app/dashboard" style={navBtn(path.includes("/dashboard"))}>Home</Link>
        <Link to="/app/projects" style={navBtn(path.includes("/projects"))}>Projects</Link>
        <Link to="/app/tools" style={navBtn(path.includes("/tools"))}>Tools</Link>
        <Link to="/app/projects/new" style={navBtn(false)}>+ New Project</Link>
      </div>
    </header>
  );
}