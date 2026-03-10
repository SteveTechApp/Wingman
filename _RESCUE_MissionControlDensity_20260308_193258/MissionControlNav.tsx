import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  id: string;
  label: string;
  to: string;
};

const designItems: NavItem[] = [
  { id: "start-project", label: "Start New Project", to: "/app/projects/new" },
  { id: "discovery", label: "Discovery Wizard", to: "/app/tools/discovery" },
  { id: "templates", label: "Templates", to: "/app/tools/templates" },
  { id: "room-designer", label: "Room Designer", to: "/app/tools/room-designer" },
  { id: "proposal-builder", label: "Proposal Builder", to: "/app/tools/proposals" },
];

const toolItems: NavItem[] = [
  { id: "guru", label: "Guru", to: "/app/guru" },
  { id: "catalogue", label: "Product Catalogue", to: "/app/catalogue" },
  { id: "videowall", label: "Video Wall Designer", to: "/app/tools/videowall" },
  { id: "competitor-compare", label: "Competitor Comparison", to: "/app/tools/competitor-compare" },
];

const topItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", to: "/app/dashboard" },
  { id: "projects", label: "Projects", to: "/app/projects" },
];

const bottomItems: NavItem[] = [
  { id: "training", label: "Training", to: "/app/training" },
  { id: "settings", label: "Settings", to: "/app/settings" },
];

function groupTitleStyle(collapsed?: boolean): React.CSSProperties {
  return {
    fontSize: collapsed ? 0 : 11,
    fontWeight: 800,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    opacity: collapsed ? 0 : 0.68,
    padding: collapsed ? "0" : "6px 10px 2px",
    height: collapsed ? 0 : "auto",
    overflow: "hidden",
    transition: "all 140ms ease",
  };
}

function navButtonStyle(active: boolean, collapsed?: boolean): React.CSSProperties {
  return {
    appearance: "none",
    width: "100%",
    border: active ? "1px solid rgba(101,232,255,0.26)" : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "linear-gradient(90deg, rgba(17,78,71,0.95), rgba(19,101,88,0.92))"
      : "rgba(255,255,255,0.035)",
    color: "#eef6ff",
    borderRadius: 12,
    padding: collapsed ? "10px 8px" : "10px 12px",
    textAlign: collapsed ? ("center" as const) : ("left" as const),
    fontWeight: active ? 800 : 700,
    cursor: "pointer",
    transition: "all 140ms ease",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
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
      <div style={groupTitleStyle(collapsed)}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.to)}
              title={item.label}
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
      style={{
        width: collapsed ? 78 : 272,
        minWidth: collapsed ? 78 : 272,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 16,
        padding: 14,
        borderRight: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(9,14,22,0.96), rgba(11,18,28,0.98))",
        transition: "width 160ms ease, min-width 160ms ease",
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
            <div style={{ fontSize: 15, fontWeight: 900, color: "#f4fbff", letterSpacing: 0.2 }}>
              Mission Control
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            style={{
              appearance: "none",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "#eef6ff",
              borderRadius: 10,
              minWidth: 36,
              height: 36,
              padding: 0,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {!collapsed ? (
          <div style={{ color: "rgba(221,232,241,0.72)", fontSize: 12, lineHeight: 1.45 }}>
            Features build project outputs. Tools support decisions during the process.
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 16, alignContent: "start", overflow: "auto", paddingRight: 2 }}>
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