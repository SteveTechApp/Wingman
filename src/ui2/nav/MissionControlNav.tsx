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
  { section: "Mission Control", tone: "mission", title: "Workspace", short: "WS", to: "/app/settings/workspace" },
  { section: "Mission Control", tone: "mission", title: "Project Flow", short: "AW", to: "/app/dashboard" },

  { section: "Workflow", tone: "workflow", title: "Guided Project", short: "GP", to: "/app/tools/discovery" },
  { section: "Workflow", tone: "workflow", title: "Architecture", short: "A", to: "/app/dashboard" },
  { section: "Workflow", tone: "workflow", title: "Products", short: "P", to: "/app/tools/catalog" },
  { section: "Workflow", tone: "workflow", title: "Proposal", short: "PB", to: "/app/tools/proposal" },

  { section: "Tools & Reference", tone: "tools", title: "Tool Hub", short: "TH", to: "/app/tools" },
  { section: "Tools & Reference", tone: "tools", title: "Catalogue", short: "PC", to: "/app/tools/catalog" },
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
    <aside className={`wm-nav${collapsed ? " is-collapsed" : ""}`}>
      <div className="wm-nav__top">
        <div className="wm-nav__brand">
          <div className="wm-nav__brand-mark">WM</div>
          {!collapsed ? (
            <div className="wm-nav__brand-copy">
              <div className="wm-nav__brand-title">Wingman</div>
              <div className="wm-nav__brand-subtitle">Guided project workspace</div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="wm-nav__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? ">>" : "<<"}
        </button>
      </div>

      <div className="wm-nav__active-card">
        <div className="wm-nav__active-label">Active Project</div>
        <div className="wm-nav__active-name">
          {collapsed ? (activeProject?.name?.slice(0, 2) ?? "--") : (activeProject?.name ?? "No active project")}
        </div>
        {!collapsed ? (
          <div className="wm-nav__active-copy">
            {activeProject
              ? `${activeProject.customer || "Customer not set"} | ${activeProject.stage || "Discovery"}`
              : "Create or select a project from Mission Control"}
          </div>
        ) : null}
      </div>

      <div className="wm-nav__sections">
        {sections.map((section) => (
          <section key={section.section} className={`wm-nav__section wm-nav__section--${section.tone}`}>
            {!collapsed ? (
              <div className="wm-nav__section-title">{section.section}</div>
            ) : null}

            <div className="wm-nav__list">
              {section.items.map((item) => (
                <NavLink
                  key={`${section.section}-${item.title}`}
                  to={item.to}
                  className={({ isActive }) =>
                    `wm-nav__item wm-nav__item--${item.tone}${isActive ? " is-active" : ""}${collapsed ? " is-collapsed" : ""}`
                  }
                  title={collapsed ? item.title : undefined}
                >
                  <span className="wm-nav__item-badge">{item.short}</span>
                  {!collapsed ? (
                    <span className="wm-nav__item-copy">
                      <span className="wm-nav__item-line">
                        <span className="wm-nav__item-title">{item.title}</span>
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
