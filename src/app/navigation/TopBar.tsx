import React from "react";
import { Link, useLocation } from "react-router-dom";

import WingmanBrand from "@/components/branding/WingmanBrand";

type TopNavItem = {
  label: string;
  to: string;
};

const TOP_NAV_ITEMS: TopNavItem[] = [
  { label: "Tools", to: "/tools" },
  { label: "Workspace", to: "/app/dashboard" },
  { label: "Projects", to: "/app/projects" },
];

function NavLink({ to, label }: TopNavItem) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <Link className={`wm-navlink ${isActive ? "wm-navlink-active" : ""}`} to={to}>
      {label}
    </Link>
  );
}

export default function TopBar() {
  return (
    <>
      <Link to="/" className="wm-brand" style={{ textDecoration: "none" }}>
        <WingmanBrand />
      </Link>
      <nav style={{ display: "flex", gap: 10 }}>
        {TOP_NAV_ITEMS.map((item) => (
          <NavLink key={item.to} {...item} />
        ))}
      </nav>
      <Link className="wm-btn wm-btn-primary" to="/tools/room-wizard">
        Start Design
      </Link>
    </>
  );
}
