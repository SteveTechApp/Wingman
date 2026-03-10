import * as React from "react";
import { NavLink } from "react-router-dom";
import { brand } from "@/branding/brand";
import { getActiveWorkflowProject } from "@/workflow/workflowStore";

type Props = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavItem = {
  label: string;
  to: string;
  description?: string;
};

const missionItems: NavItem[] = [
  { label: "Mission Control", to: "/app/dashboard", description: "Pipeline and project flow" },
  { label: "Projects", to: "/app/projects", description: "All active opportunities" },
];

const workflowItems: NavItem[] = [
  { label: "Discovery", to: "/app/tools/discovery", description: "Capture requirements" },
  { label: "Architecture", to: "/app/dashboard", description: "Advance to solution logic" },
  { label: "Products", to: "/app/catalogue", description: "Select core products" },
  { label: "Proposal", to: "/app/tools/proposals", description: "Build customer output" },
];

const utilityItems: NavItem[] = [
  { label: "Tool Hub", to: "/app/tools", description: "Browse all tools" },
  { label: "Product Catalogue", to: "/app/catalogue", description: "Reference products" },
  { label: "Competitor Comparison", to: "/app/tools/competitors", description: "Position WyreStorm" },
  { label: "Video Wall Designer", to: "/app/tools/video-wall", description: "Display planning" },
];

function Section({
  title,
  items,
  collapsed,
}: {
  title: string;
  items: NavItem[];
  collapsed?: boolean;
}) {
  return (
    <section className="wm-nav-section">
      <div className="wm-nav-section-title">{collapsed ? "•" : title}</div>
      <div className="wm-nav-links">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `wm-nav-link ${isActive ? "is-active" : ""} ${collapsed ? "is-collapsed" : ""}`
            }
            title={collapsed ? item.label : undefined}
          >
            <div className="wm-nav-link-main">
              <span className="wm-nav-link-label">{item.label}</span>
              {!collapsed && item.description ? (
                <span className="wm-nav-link-copy">{item.description}</span>
              ) : null}
            </div>
          </NavLink>
        ))}
      </div>
    </section>
  );
}

export default function MissionControlNav({ collapsed, onToggleCollapse }: Props) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 800);
    return () => window.clearInterval(id);
  }, []);

  const activeProject = React.useMemo(() => getActiveWorkflowProject(), [tick]);

  return (
    <div className={`wm-nav-root ${collapsed ? "is-collapsed" : ""}`}>
      <div className="wm-nav-brand">
        <img src={brand.logo} alt={brand.fullName} className="wm-nav-brand-logo" />
        {!collapsed ? (
          <div className="wm-nav-brand-copy">
            <div className="wm-nav-brand-name">Wingman</div>
            <div className="wm-nav-brand-sub">Workflow platform</div>
          </div>
        ) : null}
      </div>

      <div className="wm-nav-collapse-row">
        <button
          type="button"
          className="wm-btn wm-btn-secondary wm-nav-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className="wm-nav-active-project wm-card">
        {!collapsed ? (
          <>
            <div className="wm-nav-section-title">Active Project</div>
            <div className="wm-nav-active-name">
              {activeProject ? activeProject.name : "No active project"}
            </div>
            <div className="wm-nav-active-meta">
              {activeProject
                ? `${activeProject.customer} · ${activeProject.stage}`
                : "Create or select a project from Mission Control"}
            </div>
          </>
        ) : (
          <div className="wm-nav-active-dot" title={activeProject ? activeProject.name : "No active project"} />
        )}
      </div>

      <div className="wm-nav-scroll">
        <Section title="Mission Control" items={missionItems} collapsed={collapsed} />
        <Section title="Active Project Workflow" items={workflowItems} collapsed={collapsed} />
        <Section title="Tools & Reference" items={utilityItems} collapsed={collapsed} />
      </div>
    </div>
  );
}