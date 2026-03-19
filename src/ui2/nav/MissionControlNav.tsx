import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  getActiveProject,
  subscribeProjects,
} from "@/features/projects/projectStore";

type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  section: string;
  tone: "mission" | "workflow" | "tools";
  title: string;
  short: string;
  to: string;
};

const NAV_ITEMS: NavItem[] = [
  { section: "Mission Control", tone: "mission", title: "Dashboard", short: "MC", to: "/app/dashboard" },
  { section: "Mission Control", tone: "mission", title: "Projects", short: "PR", to: "/app/projects" },

  { section: "Workflow", tone: "workflow", title: "Guided Project", short: "GP", to: "/app/tools/discovery" },
  { section: "Workflow", tone: "workflow", title: "Architecture", short: "AR", to: "/app/dashboard" },
  { section: "Workflow", tone: "workflow", title: "Products", short: "PD", to: "/app/tools/catalog" },
  { section: "Workflow", tone: "workflow", title: "Proposal", short: "PB", to: "/app/tools/proposal" },

  { section: "Tools & Reference", tone: "tools", title: "Tool Hub", short: "TH", to: "/app/tools" },
  { section: "Tools & Reference", tone: "tools", title: "Catalogue", short: "CT", to: "/app/tools/catalog" },
  { section: "Tools & Reference", tone: "tools", title: "Competitors", short: "CC", to: "/app/tools/compare" },
  { section: "Tools & Reference", tone: "tools", title: "Video Wall", short: "VW", to: "/app/tools/video-wall" },
];

function groupedItems(items: NavItem[]): Array<{ section: string; tone: NavItem["tone"]; items: NavItem[] }> {
  const map = new Map<string, NavItem[]>();
  for (const item of items) {
    const current = map.get(item.section) ?? [];
    current.push(item);
    map.set(item.section, current);
  }
  return Array.from(map.entries()).map(([section, sectionItems]) => ({
    section,
    tone: sectionItems[0]?.tone ?? "mission",
    items: sectionItems,
  }));
}

export default function MissionControlNav({ collapsed = false, onToggleCollapse }: MissionControlNavProps) {
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );

  const sections = React.useMemo(() => groupedItems(NAV_ITEMS), []);

  return (
    <aside
      className={`wm-nav${collapsed ? " is-collapsed" : ""}`}
      style={{
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        gap: 10,
        padding: collapsed ? "8px 6px" : "10px 8px",
      }}
    >
      <div
        className="wm-nav__top"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-end",
          gap: 8,
        }}
      >
        <button
          type="button"
          className="wm-nav__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          style={{
            minHeight: 28,
            height: 28,
            minWidth: 28,
            width: 28,
            borderRadius: 8,
            padding: 0,
          }}
        >
          {collapsed ? ">>" : "<<"}
        </button>
      </div>

      <div
        className="wm-nav__active-card"
        style={{
          padding: collapsed ? "8px 6px" : "8px 10px",
          borderRadius: 12,
        }}
      >
        {!collapsed ? <div className="wm-nav__active-label">Active Project</div> : null}
        <div
          className="wm-nav__active-name"
          style={{
            fontSize: collapsed ? 11 : 13,
            lineHeight: 1.2,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {collapsed ? (activeProject?.name?.slice(0, 2) ?? "--") : (activeProject?.name ?? "No active project")}
        </div>
      </div>

      <div
        className="wm-nav__sections"
        style={{
          display: "grid",
          gap: 10,
          alignContent: "start",
        }}
      >
        {sections.map((section) => (
          <section
            key={section.section}
            className={`wm-nav__section wm-nav__section--${section.tone}`}
            style={{
              display: "grid",
              gap: 4,
              padding: 0,
              margin: 0,
            }}
          >
            {!collapsed ? (
              <div
                className="wm-nav__section-title"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0 2px",
                  margin: 0,
                }}
              >
                {section.section}
              </div>
            ) : null}

            <div
              className="wm-nav__list"
              style={{
                display: "grid",
                gap: 4,
              }}
            >
              {section.items.map((item) => (
                <NavLink
                  key={`${section.section}-${item.title}`}
                  to={item.to}
                  className={({ isActive }) =>
                    `wm-nav__item wm-nav__item--${item.tone}${isActive ? " is-active" : ""}${collapsed ? " is-collapsed" : ""}`
                  }
                  title={collapsed ? item.title : undefined}
                  style={{
                    minHeight: collapsed ? 34 : 38,
                    height: collapsed ? 34 : 38,
                    display: "grid",
                    gridTemplateColumns: collapsed ? "1fr" : "28px 1fr",
                    alignItems: "center",
                    gap: 8,
                    padding: collapsed ? "0" : "0 10px",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  <span
                    className="wm-nav__item-badge"
                    style={{
                      width: 20,
                      height: 20,
                      minWidth: 20,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      justifySelf: collapsed ? "center" : "center",
                      maxWidth: "fit-content",
                    }}
                  >
                    {item.short}
                  </span>

                  {!collapsed ? (
                    <span
                      className="wm-nav__item-copy"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        minWidth: 0,
                      }}
                    >
                      <span
                        className="wm-nav__item-title"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        {item.title}
                      </span>
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
