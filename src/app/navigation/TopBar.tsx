import React from "react";
import { Link, useLocation } from "react-router-dom";
import WingmanBrand from "@/components/branding/WingmanBrand";

function NavLink({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = loc.pathname.startsWith(to);
  return (
    <Link className={`wm-navlink ${active ? "wm-navlink-active" : ""}`} to={to}>
      {label}
    </Link>
  );
}

export default function TopBar() {
  return (
    <header className="wm-topbar">
      <div className="wm-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/">
          <WingmanBrand />
        </Link>
        <nav style={{ display: "flex", gap: 10 }}>
          <NavLink to="/tools" label="Tools" />
          <NavLink to="/app/dashboard" label="Workspace" />
          <NavLink to="/app/projects" label="Projects" />
        </nav>
        <Link className="wm-btn wm-btn-primary" to="/tools/room-wizard">
          Start Design
        </Link>
      </div>
    </header>
  );
}
