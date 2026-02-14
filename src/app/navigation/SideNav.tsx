import React from "react";
import { Link, useLocation } from "react-router-dom";

type SideNavItem = {
  label: string;
  to: string;
};

const SIDE_NAV_ITEMS: SideNavItem[] = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Projects", to: "/app/projects" },
  { label: "Import", to: "/app/import" },
];

function navClass(isActive: boolean) {
  return `wm-snav-item${isActive ? " wm-snav-item-active" : ""}`;
}

export default function SideNav() {
  const location = useLocation();

  return (
    <aside className="wm-leftnav">
      <div className="wm-snav-list">
        {SIDE_NAV_ITEMS.map((item) => (
          <Link key={item.to} className={navClass(location.pathname.startsWith(item.to))} to={item.to}>
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
