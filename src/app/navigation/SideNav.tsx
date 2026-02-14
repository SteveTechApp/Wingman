import React from "react";
import { Link, useLocation } from "react-router-dom";

function navClass(isActive: boolean) {
  return `wm-snav-item${isActive ? " wm-snav-item-active" : ""}`;
}

export default function SideNav() {
  const loc = useLocation();

  return (
    <aside className="wm-leftnav">
      <div className="wm-snav-list">
        <Link className={navClass(loc.pathname.startsWith("/app/dashboard"))} to="/app/dashboard">
          Dashboard
        </Link>
        <Link className={navClass(loc.pathname.startsWith("/app/projects"))} to="/app/projects">
          Projects
        </Link>
        <Link className={navClass(loc.pathname.startsWith("/app/import"))} to="/app/import">
          Import
        </Link>
      </div>
    </aside>
  );
}
