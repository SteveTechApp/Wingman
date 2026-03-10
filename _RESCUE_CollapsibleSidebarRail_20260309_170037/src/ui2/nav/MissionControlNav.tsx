import * as React from "react";

type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};
import { NavLink } from "react-router-dom";
import { brand } from "@/branding/brand";
import {
  getActiveWorkflowProject,
} from "@/workflow/workflowStore";

type NavItem = {
  section: string;
  title: string;
  desc: string;
  to: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    section: "Mission Control",
    title: "Mission Control",
    desc: "Pipeline and project flow",
    to: "/app/dashboard",
  },
  {
    section: "Mission Control",
    title: "Projects",
    desc: "All active opportunities",
    to: "/app/projects",
  },
  {
    section: "Mission Control",
    title: "Active Project Workflow",
    desc: "Discovery and solution logic",
    to: "/app/dashboard",
  },
  {
    section: "Workflow",
    title: "Discovery",
    desc: "Capture requirements",
    to: "/app/tools/discovery",
  },
  {
    section: "Workflow",
    title: "Architecture",
    desc: "Advance to solution logic",
    to: "/app/dashboard",
  },
  {
    section: "Workflow",
    title: "Products",
    desc: "Select core products",
    to: "/app/tools/catalog",
  },
  {
    section: "Workflow",
    title: "Proposal",
    desc: "Build customer output",
    to: "/app/tools/proposal-builder",
  },
  {
    section: "Tools & Reference",
    title: "Tool Hub",
    desc: "Browse all tools",
    to: "/app/tools",
  },
  {
    section: "Tools & Reference",
    title: "Product Catalogue",
    desc: "Reference products",
    to: "/app/tools/catalog",
  },
  {
    section: "Tools & Reference",
    title: "Competitor Comparison",
    desc: "Position WyreStorm",
    to: "/app/tools/competitors",
  },
  {
    section: "Tools & Reference",
    title: "Video Wall Designer",
    desc: "Display planning",
    to: "/app/tools/video-wall",
  },
];

function groupedItems(items: NavItem[]): Array<{ section: string; items: NavItem[] }> {
  const map = new Map<string, NavItem[]>();
  for (const item of items) {
    const current = map.get(item.section) ?? [];
    current.push(item);
    map.set(item.section, current);
  }
  return Array.from(map.entries()).map(([section, groupItems]) => ({ section, items: groupItems }));
}

export default function MissionControlNav({ collapsed = false, onToggleCollapse }: MissionControlNavProps) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1200);
    return () => window.clearInterval(id);
  }, []);

  const activeProject = React.useMemo(() => getActiveWorkflowProject(), [tick]);
  const sections = React.useMemo(() => groupedItems(NAV_ITEMS), []);

  return (
    <aside className="wm-nav">
      <div className="wm-nav__brand">
        <img src={brand.logo} alt={brand.fullName} className="wm-nav__logo" />
        <div className="wm-nav__brand-copy">
        <button
          type="button"
          className="wm-nav__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? "»" : "«"}
        </button>
          <div className="wm-nav__brand-title">Wingman</div>
          <div className="wm-nav__brand-subtitle">Workflow platform</div>
        </div>
      </div>

      <div className="wm-nav__active-card">
        <div className="wm-nav__active-label">Active Project</div>
        <div className="wm-nav__active-name">
          {activeProject?.name ?? "No active project"}
        </div>
        <div className="wm-nav__active-copy">
          {activeProject
            ? `${activeProject.customer} · ${activeProject.roomType}`
            : "Create or select a project from Mission Control"}
        </div>
      </div>

      <div className="wm-nav__sections">
        {sections.map((section) => (
          <section key={section.section} className="wm-nav__section">
            <div className="wm-nav__section-title">{section.section}</div>

            <div className="wm-nav__list">
              {section.items.map((item) => (
                <NavLink
                  key={`${section.section}-${item.title}`}
                  to={item.to}
                  className={({ isActive }) =>
                    `wm-nav__item${isActive ? " is-active" : ""}`
                  }
                >
                  <span className="wm-nav__item-title">{item.title}</span>
                  <span className="wm-nav__item-desc">{item.desc}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}