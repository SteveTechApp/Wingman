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
  title: string;
  desc: string;
  short: string;
  to: string;
};

const NAV_ITEMS: NavItem[] = [
  { section: "Mission Control", title: "Mission Control", desc: "Pipeline and project flow", short: "MC", to: "/app/dashboard" },
  { section: "Mission Control", title: "Projects", desc: "All active opportunities", short: "PR", to: "/app/projects" },
  { section: "Mission Control", title: "Active Project Workflow", desc: "Discovery and solution logic", short: "AW", to: "/app/dashboard" },

  { section: "Workflow", title: "Guided Project", desc: "Capture needs and room dynamics", short: "GP", to: "/app/tools/discovery" },
  { section: "Workflow", title: "Architecture", desc: "Advance to solution logic", short: "A", to: "/app/dashboard" },
  { section: "Workflow", title: "Products", desc: "Select core products", short: "P", to: "/app/tools/catalog" },
  { section: "Workflow", title: "Proposal", desc: "Build customer output", short: "PB", to: "/app/tools/proposal" },

  { section: "Tools & Reference", title: "Tool Hub", desc: "Browse all tools", short: "TH", to: "/app/tools" },
  { section: "Tools & Reference", title: "Product Catalogue", desc: "Reference products", short: "PC", to: "/app/tools/catalog" },
  { section: "Tools & Reference", title: "Competitor Comparison", desc: "Position WyreStorm", short: "CC", to: "/app/tools/compare" },
  { section: "Tools & Reference", title: "Video Wall Designer", desc: "Display planning", short: "VW", to: "/app/tools/video-wall" },
];

function groupedItems(items: NavItem[]): Array<{ section: string; items: NavItem[] }> {
  const map = new Map<string, NavItem[]>();
  for (const item of items) {
    const current = map.get(item.section) ?? [];
    current.push(item);
    map.set(item.section, current);
  }
  return Array.from(map.entries()).map(([section, sectionItems]) => ({ section, items: sectionItems }));
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
          <section key={section.section} className="wm-nav__section">
            {!collapsed ? (
              <div className="wm-nav__section-title">{section.section}</div>
            ) : null}

            <div className="wm-nav__list">
              {section.items.map((item) => (
                <NavLink
                  key={`${section.section}-${item.title}`}
                  to={item.to}
                  className={({ isActive }) =>
                    `wm-nav__item${isActive ? " is-active" : ""}${collapsed ? " is-collapsed" : ""}`
                  }
                  title={collapsed ? item.title : undefined}
                >
                  <span className="wm-nav__item-badge">{item.short}</span>
                  {!collapsed ? (
                    <span className="wm-nav__item-copy">
                      <span className="wm-nav__item-title">{item.title}</span>
                      <span className="wm-nav__item-desc">{item.desc}</span>
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
