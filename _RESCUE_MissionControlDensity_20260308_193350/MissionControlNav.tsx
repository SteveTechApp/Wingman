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

const topItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", to: "/app/dashboard" },
  { id: "projects", label: "Projects", to: "/app/projects" },
];

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

const bottomItems: NavItem[] = [
  { id: "training", label: "Training", to: "/app/training" },
  { id: "settings", label: "Settings", to: "/app/settings" },
];

function sectionLabel(collapsed?: boolean): React.CSSProperties {
  return {
    fontSize: collapsed ? 0 : 10,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(214,226,238,0.58)",
    padding: collapsed ? "0" : "4px 8px 2px",
    height: collapsed ? 0 : "auto",
    overflow: "hidden",
  };
}

function navButtonStyle(active: boolean, collapsed?: boolean): React.CSSProperties {
  return {
    appearance: "none",
    width: "100%",
    minHeight: collapsed ? 38 : 34,
    border: active ? "1px solid rgba(101,232,255,0.22)" : "1px solid rgba(255,255,255,0.06)",
    background: active
      ? "linear-gradient(90deg, rgba(18,62,104,0.92), rgba(28,88,146,0.92))"
      : "rgba(255,255,255,0.025)",
    color: "#eef6ff",
    borderRadius: 10,
    padding: collapsed ? "8px 6px" : "7px 10px",
    textAlign: collapsed ? ("center" as const) : ("left" as const),
    fontSize: collapsed ? 11 : 12,
    fontWeight: active ? 800 : 700,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: active ? "0 6px 18px rgba(0,0,0,0.14)" : "none",
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
    <div style={{ display: "grid", gap: 5 }}>
      <div style={sectionLabel(collapsed)}>{title}</div>
      <div style={{ display: "grid", gap: 5 }}>
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
      style={{
        width: collapsed ? 64 : 214,
        minWidth: collapsed ? 64 : 214,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 12,
        padding: 10,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(6,12,20,0.98), rgba(8,15,26,0.98))",
        transition: "width 150ms ease, min-width 150ms ease",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 8,
          }}
        >
          {!collapsed ? (
            <div style={{ fontSize: 13, fontWeight: 900, color: "#f4fbff" }}>
              Mission Control
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            style={{
              appearance: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#eef6ff",
              borderRadius: 9,
              width: 30,
              height: 30,
              padding: 0,
              cursor: "pointer",
              fontWeight: 800,
              flex: "0 0 auto",
            }}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {!collapsed ? (
          <div style={{ color: "rgba(219,229,239,0.66)", fontSize: 11, lineHeight: 1.45 }}>
            Features build project outputs. Tools support decisions along the way.
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 12, alignContent: "start", overflow: "auto", paddingRight: 1 }}>
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