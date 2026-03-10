import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  Grid3X3,
  LayoutDashboard,
  Package,
  Search,
  Sparkles,
} from "lucide-react";
import type { WmIcon } from "@/ui2/primitives/workspacePrimitives";

type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  label: string;
  to: string;
  Icon: WmIcon;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", to: "/app/dashboard", Icon: LayoutDashboard },
      { label: "Projects", to: "/app/projects", Icon: FolderOpen },
      { label: "ToolHub", to: "/app/tools", Icon: Sparkles },
    ],
  },
  {
    title: "Core Tools",
    items: [
      { label: "Discovery", to: "/app/tools/discovery", Icon: Search },
      { label: "Room Wizard", to: "/app/tools/room-wizard", Icon: Grid3X3 },
      { label: "Product Catalog", to: "/app/tools/catalog", Icon: Package },
      { label: "Competitor Compare", to: "/app/tools/competitor-compare", Icon: Boxes },
      { label: "Proposal Builder", to: "/app/tools/proposal-builder", Icon: FileText },
      { label: "Templates", to: "/app/tools/templates", Icon: ClipboardList },
    ],
  },
];

function isActive(pathname: string, to: string): boolean {
  if (to === "/app/tools") return pathname === "/app/tools";
  return pathname.startsWith(to);
}

function isGroupActive(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => isActive(pathname, item.to));
}

function linkStyle(active: boolean, collapsed: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    gap: collapsed ? 0 : 12,
    minHeight: 36,
    padding: collapsed ? "0 8px" : "0 10px",
    borderRadius: 12,
    textDecoration: "none",
    border: active
      ? "1px solid rgba(76,224,211,0.22)"
      : "1px solid transparent",
    background: active
      ? "linear-gradient(135deg, rgba(13,95,104,0.85), rgba(13,59,109,0.82))"
      : "transparent",
    color: active ? "#f4fbff" : "rgba(221,230,242,0.84)",
    fontSize: 13,
    fontWeight: active ? 800 : 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
  };
}

export default function MissionControlNav({
  collapsed = false,
  onToggleCollapse,
}: MissionControlNavProps) {
  const location = useLocation();

  return (
    <aside
      aria-label="Primary navigation"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, rgba(8,20,38,0.96), rgba(4,11,23,0.98))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 8,
          padding: collapsed ? "10px 6px" : "10px 10px 8px",
          borderBottom: "1px solid rgba(140,190,255,0.08)",
        }}
      >
        {!collapsed ? (
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#f4fbff",
                lineHeight: 1.1,
              }}
            >
              Workspace
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 11,
                color: "rgba(198,210,230,0.66)",
                lineHeight: 1.25,
              }}
            >
              Projects and tool launch
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            border: "1px solid rgba(150,190,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(234,241,248,0.92)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div
        style={{
          padding: 8, display: "grid",
          gap: 10, overflowY: "auto",
          flex: 1,
        }}
      >
        {GROUPS.map((group) => {
          const groupActive = isGroupActive(location.pathname, group.items);

          return (
            <section
              key={group.title}
              style={{
                border: groupActive
                  ? "1px solid rgba(140,190,255,0.10)"
                  : "1px solid rgba(140,190,255,0.06)",
                borderRadius: 14,
                background: groupActive
                  ? "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))"
                  : "rgba(255,255,255,0.015)",
                padding: 8,
              }}
            >
              {!collapsed ? (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "rgba(190,205,225,0.62)",
                    padding: "0 10px",
                    marginBottom: 6,
                  }}
                >
                  {group.title}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 6 }}>
                {group.items.map((item) => {
                  const active = isActive(location.pathname, item.to);
                  const Icon = item.Icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      style={linkStyle(active, collapsed)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span
                        style={{
                          width: 18,
                          minWidth: 18,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={16} />
                      </span>

                      {!collapsed ? (
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.label}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section
          style={{
            border: "1px solid rgba(76,224,211,0.14)",
            borderRadius: 14,
                background:
              "linear-gradient(135deg, rgba(9,76,80,0.32), rgba(10,48,90,0.24))",
            padding: collapsed ? 10 : 12,
          }}
        >
          {!collapsed ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Sparkles size={15} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#f4fbff",
                  }}
                >
                  Recommended
                </span>
              </div>

              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: "rgba(220,230,242,0.74)",
                  marginBottom: 10,
                }}
              >
                Start most opportunities with Discovery.
              </div>

              <NavLink
                to="/app/tools/discovery"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 38,
                  width: "100%",
                  borderRadius: 12,
                  textDecoration: "none",
                  border: "1px solid rgba(76,224,211,0.22)",
                  background:
                    "linear-gradient(135deg, rgba(10,121,117,0.92), rgba(16,78,136,0.88))",
                  color: "#f4fbff",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Open Discovery
              </NavLink>
            </>
          ) : (
            <NavLink
              to="/app/tools/discovery"
              title="Open Discovery"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 36,
                borderRadius: 12,
                textDecoration: "none",
                border: "1px solid rgba(76,224,211,0.22)",
                background:
                  "linear-gradient(135deg, rgba(10,121,117,0.92), rgba(16,78,136,0.88))",
                color: "#f4fbff",
              }}
            >
              <Sparkles size={16} />
            </NavLink>
          )}
        </section>
      </div>
    </aside>
  );
}