import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { WINGMAN_FEATURES, WINGMAN_TOOLS } from "@/features/tools/toolFeatureModel";

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
function WingmanNavGroup({
  title,
  items,
  navigate,
}: {
  title: string;
  items: { id: string; title: string; to: string }[];
  navigate: (to: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.7,
          textTransform: "uppercase",
          opacity: 0.72,
          padding: "4px 12px 0 12px",
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.to)}
            style={{
              appearance: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#edf5ff",
              borderRadius: 12,
              padding: "10px 12px",
              textAlign: "left",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
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