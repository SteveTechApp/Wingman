import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { brand } from "@/branding/brand";

type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  id: string;
  label: string;
  to: string;
};

const topItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", to: WM_ROUTES.dashboard },
  { id: "projects", label: "Projects", to: WM_ROUTES.projects },
];

const designItems: NavItem[] = [
  { id: "start-project", label: "Start New Project", to: WM_ROUTES.newProject },
  { id: "discovery", label: "Discovery Wizard", to: WM_ROUTES.discovery },
  { id: "templates", label: "Templates", to: WM_ROUTES.templates },
  { id: "room-designer", label: "Room Designer", to: WM_ROUTES.roomDesigner },
  { id: "proposal-builder", label: "Proposal Builder", to: WM_ROUTES.proposals },
];

const toolItems: NavItem[] = [
  { id: "guru", label: "Guru", to: WM_ROUTES.guru },
  { id: "catalogue", label: "Product Catalogue", to: WM_ROUTES.catalogue },
  { id: "videowall", label: "Video Wall Designer", to: WM_ROUTES.videowall },
  { id: "competitor", label: "Competitor Comparison", to: WM_ROUTES.competitorCompare },
];

const bottomItems: NavItem[] = [
  { id: "training", label: "Training", to: WM_ROUTES.training },
  { id: "settings", label: "Settings", to: WM_ROUTES.settings },
];

function sectionLabel(collapsed?: boolean): React.CSSProperties {
  return {
    fontSize: collapsed ? 0 : 10,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(191,205,221,0.52)",
    padding: collapsed ? "0" : "4px 8px 2px",
    height: collapsed ? 0 : "auto",
    overflow: "hidden",
  };
}

function navButtonStyle(active: boolean, collapsed?: boolean): React.CSSProperties {
  return {
    appearance: "none",
    width: "100%",
    minHeight: collapsed ? 38 : 36,
    border: active ? "1px solid rgba(115,231,255,0.22)" : "1px solid rgba(255,255,255,0.05)",
    background: active
      ? "linear-gradient(90deg, rgba(47,125,209,0.92), rgba(36,94,168,0.92))"
      : "rgba(255,255,255,0.025)",
    color: "#eef6ff",
    borderRadius: 12,
    padding: collapsed ? "8px 6px" : "8px 10px",
    textAlign: collapsed ? ("center" as const) : ("left" as const),
    fontSize: collapsed ? 11 : 12,
    fontWeight: active ? 800 : 700,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: active ? "0 8px 18px rgba(0,0,0,0.16)" : "none",
  };
}

function renderGroup(
  title: string,
  items: NavItem[],
  navigate: ReturnType<typeof useNavigate>,
  pathname: string,
  collapsed?: boolean,
) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={sectionLabel(collapsed)}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => navigate(item.to)}
              style={navButtonStyle(active, collapsed)}
            >
              {collapsed ? item.label.substring(0, 1) : item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MissionControlNav({
  collapsed = false,
  onToggleCollapse,
}: MissionControlNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className="wm-scrollbar-thin"
      style={{
        width: collapsed ? 66 : 208,
        minWidth: collapsed ? 66 : 208,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 14,
        padding: 12,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(8,15,26,0.98), rgba(10,18,30,0.98))",
        transition: "width 150ms ease, min-width 150ms ease",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 8,
          }}
        >
          {!collapsed ? (
            <div style={{ fontSize: 14, fontWeight: 900, color: "#f4fbff" }}>
              Mission Control
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            className="wm-btn"
            style={{ width: 30, height: 30, padding: 0, borderRadius: 9, flex: "0 0 auto" }}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {!collapsed ? (
          <div className="wm-body-sm">
            Features build project outputs. Tools support decisions along the way.
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 14, alignContent: "start", overflow: "auto", paddingRight: 1 }}>
        {renderGroup("Home", topItems, navigate, location.pathname, collapsed)}
        {renderGroup("Design", designItems, navigate, location.pathname, collapsed)}
        {renderGroup("Tools", toolItems, navigate, location.pathname, collapsed)}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {renderGroup("More", bottomItems, navigate, location.pathname, collapsed)}
      </div>
    </aside>
  );
}