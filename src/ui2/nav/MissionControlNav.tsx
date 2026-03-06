import * as React from "react";

import { NavLink } from "react-router-dom";

type Props = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};;

function itemClass(isActive: boolean) {
  return [
    "wm-mc__item",
    isActive ? "is-active" : "",
  ].filter(Boolean).join(" ");
}

export default function MissionControlNav({ collapsed, onToggleCollapse }: Props) { 
  return (
    <div className={["wm-mc", collapsed ? "is-" : ""].filter(Boolean).join(" ") }>
      <div className="wm-mc__top">
        <button
          type="button"
          className="wm-mc__collapse"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className="wm-mc__section">
        <div className="wm-mc__label">Workspace</div>
        <NavLink to="/app/dashboard" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">Dashboard</span>
        </NavLink>
        <NavLink to="/app/projects" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">Projects</span>
        </NavLink>
      </div>

      <div className="wm-mc__section">
        <div className="wm-mc__label">Tools</div>
        <NavLink to="/app/tools" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">Tool Hub</span>
        </NavLink>
        <NavLink to="/app/tools/catalog" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">Product Catalog</span>
        </NavLink>
        <NavLink to="/app/tools/proposal" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">Proposal Builder</span>
        </NavLink>
        <NavLink to="/app/tools/room-wizard" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">Room Wizard</span>
        </NavLink>
        <NavLink to="/app/tools/video-wall" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">Video Wall</span>
        </NavLink>
        <NavLink to="/app/tools/import" className={({ isActive }) => itemClass(isActive)}>
          <span className="wm-mc__text">Import Intake</span>
        </NavLink>
      </div>
    </div>
  );
}