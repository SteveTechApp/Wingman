import React from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@/app/routes/navConfig";

type RouteDef = {
  path: string;
  label: string;
  nav?: boolean;
  group?: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wm-nav-section">
      <div className="wm-nav-section-title">{title}</div>
      <div className="wm-nav-section-body">{children}</div>
    </div>
  );
}

export default function SideNav({
  collapsed = false,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const items = (ROUTES as unknown as RouteDef[]).filter(r => r.nav);
  const workspace = items.filter(r => (r.group || "") === "Workspace");
  const tools = items.filter(r => (r.group || "") === "Tools");

  return (
    <nav className={`wm-sidenav ${collapsed ? "collapsed" : ""}`} aria-label="Primary navigation">
      <button
        type="button"
        className="wm-sidenav-toggle"
        onClick={onToggle}
        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        title={collapsed ? "Expand menu" : "Collapse menu"}
      >
        <span className="wm-doublechev" aria-hidden="true">
          {collapsed ? "»" : "«"}
        </span>
      </button>

      <Section title="Workspace">
        {workspace.map((r) => (
          <NavLink key={r.path} to={r.path} className={({ isActive }) => `wm-sidenav-link ${isActive ? "is-active" : ""}`}>
            <span className="wm-nav-label">{r.label}</span>
          </NavLink>
        ))}
      </Section>

      <Section title="Tools">
        {tools.map((r) => (
          <NavLink key={r.path} to={r.path} className={({ isActive }) => `wm-sidenav-link ${isActive ? "is-active" : ""}`}>
            <span className="wm-nav-label">{r.label}</span>
          </NavLink>
        ))}
      </Section>
    </nav>
  );
}