import React from "react";
import { NavLink } from "react-router-dom";

export type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  label: string;
  to: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", to: "/app/dashboard" },
      { label: "Projects", to: "/app/projects" },
    ],
  },
  {
    title: "Core Tools",
    items: [
      { label: "Discovery", to: "/app/tools/discovery" },
      { label: "Room Wizard", to: "/app/tools/room-wizard" },
      { label: "Product Catalog", to: "/app/tools/catalog" },
      { label: "Proposal Builder", to: "/app/tools/proposal" },
    ],
  },
  {
    title: "More",
    items: [
      { label: "Tool Hub", to: "/app/tools" },
      { label: "Import Intake", to: "/app/import" },
    ],
  },
];

function itemClass(active: boolean): string {
  return active ? "wm-mission-nav__item is-active" : "wm-mission-nav__item";
}

export default function MissionControlNav({
  collapsed = false,
  onToggleCollapse,
}: MissionControlNavProps) {
  return (
    <aside
      className={collapsed ? "wm-mission-nav is-collapsed" : "wm-mission-nav"}
      aria-label="Workspace navigation"
    >
      <div className="wm-mission-nav__topbar">
        <button
          type="button"
          className="wm-mission-nav__collapsebtn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {!collapsed && sections.map((section) => (
        <section className="wm-mission-nav__section" key={section.title}>
          <div className="wm-mission-nav__heading">{section.title}</div>
          <div className="wm-mission-nav__list">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => itemClass(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}