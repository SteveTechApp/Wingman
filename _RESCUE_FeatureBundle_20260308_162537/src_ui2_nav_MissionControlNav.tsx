import * as React from "react";
import { Link, useLocation } from "react-router-dom";

type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  label: string;
  to: string;
  section?: "workspace" | "tools";
};

const items: NavItem[] = [
  { label: "Dashboard", to: "/app/dashboard", section: "workspace" },
  { label: "Projects", to: "/app/projects", section: "workspace" },

  { label: "AV Guide", to: "/app/tools/discovery", section: "tools" },
  { label: "Room Wizard", to: "/app/tools/room-wizard", section: "tools" },
  { label: "Product Catalog", to: "/app/tools/catalog", section: "tools" },
  { label: "VideoWall Designer", to: "/app/tools/video-wall", section: "tools" },
  { label: "Competitor Compare", to: "/app/tools/competitor-compare", section: "tools" },
  { label: "Proposal Builder", to: "/app/tools/proposals", section: "tools" },
  { label: "Templates", to: "/app/tools/templates", section: "tools" },
];

function initial(label: string): string {
  const parts = label.split(" ");
  return parts.length > 1 ? parts[0].charAt(0) + parts[1].charAt(0) : label.slice(0, 2);
}

export default function MissionControlNav({
  collapsed = false,
  onToggleCollapse,
}: MissionControlNavProps) {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  const workspaceItems = items.filter((x) => x.section === "workspace");
  const toolItems = items.filter((x) => x.section === "tools");

  return (
    <aside className={"wm-sideNav" + (collapsed ? " wm-sideNav--collapsed" : "")}>
      <div className="wm-sideNav__top">
        <div className="wm-sideNav__titleWrap">
          {!collapsed ? (
            <>
              <div className="wm-sideNav__title">Workspace</div>
              <div className="wm-sideNav__subtitle">Projects and tool launch</div>
            </>
          ) : null}
        </div>

        <button
          type="button"
          className="wm-sideNav__toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <div className="wm-sideNav__section">
        {!collapsed ? <div className="wm-sideNav__sectionLabel">Workspace</div> : null}
        <div className="wm-sideNav__list">
          {workspaceItems.map((item) => {
            const active = path === item.to.toLowerCase() || path.startsWith(item.to.toLowerCase() + "/");
            return (
              <Link key={item.to} to={item.to} className={"wm-sideNav__item" + (active ? " is-active" : "")}>
                <span className="wm-sideNav__icon">{collapsed ? initial(item.label) : "◻"}</span>
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="wm-sideNav__section">
        {!collapsed ? <div className="wm-sideNav__sectionLabel">Core Tools</div> : null}
        <div className="wm-sideNav__list">
          {toolItems.map((item) => {
            const active = path === item.to.toLowerCase() || path.startsWith(item.to.toLowerCase() + "/");
            return (
              <Link key={item.to} to={item.to} className={"wm-sideNav__item" + (active ? " is-active" : "")}>
                <span className="wm-sideNav__icon">{collapsed ? initial(item.label) : "◻"}</span>
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}