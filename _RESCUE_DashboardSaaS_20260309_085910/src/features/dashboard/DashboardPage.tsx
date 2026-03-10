import * as React from "react";
import { Link } from "react-router-dom";

const kpis = [
  { label: "Projects", value: "3" },
  { label: "Discovery", value: "0" },
  { label: "Proposal", value: "0" },
  { label: "Completion", value: "0%" },
];

const primaryTools = [
  {
    title: "Discovery Wizard",
    body: "Capture requirements and move the project toward the right solution path.",
    to: "/app/tools/discovery",
    badge: "Workflow",
  },
  {
    title: "Templates",
    body: "Start from room and system templates to accelerate structured solution design.",
    to: "/app/tools/templates",
    badge: "Design",
  },
  {
    title: "Proposal Builder",
    body: "Turn the selected solution into a consistent commercial output pack.",
    to: "/app/tools/proposals",
    badge: "Output",
  },
];

const recentProjects = [
  {
    name: "New Project 3",
    customer: "Sample customer",
    note: "New blank project created from the dashboard.",
    status: "Draft",
  },
  {
    name: "Boardroom Refresh",
    customer: "Sample customer",
    note: "Initial discovery captured. Confirm display sizes, source count, and cable paths.",
    status: "Draft",
  },
  {
    name: "Training Suite Upgrade",
    customer: "Sample customer",
    note: "Shortlisted products and accessories. Proposal structure to follow.",
    status: "Draft",
  },
];

const utilityLinks = [
  { title: "Product Catalogue", to: "/app/catalogue", body: "Browse WyreStorm products and reference key specification data." },
  { title: "Competitor Comparison", to: "/app/tools/competitors", body: "Compare solution approaches and support commercial positioning." },
  { title: "Video Wall Designer", to: "/app/tools/video-wall", body: "Plan screen layouts and presentation-led display workflows." },
];

export default function DashboardPage() {
  return (
    <div className="wm-dashboard-page">
      <section className="wm-dashboard-hero">
        <div className="wm-dashboard-hero-copy">
          <div className="wm-dashboard-kicker">Mission Control</div>
          <h1 className="wm-title wm-dashboard-title">
            Build AV solutions faster, with clearer workflow control.
          </h1>
          <p className="wm-dashboard-subtitle">
            Start with the application, move through discovery and design, and
            keep proposals aligned to the right commercial outcome.
          </p>

          <div className="wm-dashboard-actions">
            <Link to="/app/projects/new" className="wm-btn wm-btn-primary">
              Start New Project
            </Link>
            <Link to="/app/tools/discovery" className="wm-btn wm-btn-secondary">
              Run Discovery Wizard
            </Link>
            <Link to="/app/tools" className="wm-btn wm-btn-secondary">
              Open Tool Hub
            </Link>
          </div>
        </div>

        <div className="wm-dashboard-health wm-card">
          <div className="wm-dashboard-health-title">Pipeline health</div>
          <p className="wm-muted wm-dashboard-health-copy">
            0% of current live projects have reached proposal-stage readiness.
          </p>
          <div className="wm-kpi-strip wm-dashboard-kpi-strip">
            {kpis.map((item) => (
              <div key={item.label} className="wm-kpi">
                <div className="wm-kpi-label">{item.label}</div>
                <div className="wm-kpi-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wm-dashboard-grid">
        <div className="wm-dashboard-column-main">
          <section className="wm-dashboard-section">
            <div className="wm-dashboard-section-head">
              <h2 className="wm-subtitle">Continue working</h2>
              <Link to="/app/projects" className="wm-dashboard-inline-link">
                View all projects
              </Link>
            </div>

            <div className="wm-list">
              {recentProjects.map((project) => (
                <article key={project.name} className="wm-list-row wm-dashboard-project-row">
                  <div className="wm-dashboard-project-copy">
                    <div className="wm-dashboard-project-topline">
                      <h3 className="wm-dashboard-project-title">{project.name}</h3>
                      <span className="wm-badge">{project.status}</span>
                    </div>
                    <div className="wm-dashboard-project-customer">{project.customer}</div>
                    <p className="wm-muted wm-dashboard-project-note">{project.note}</p>
                  </div>

                  <div className="wm-dashboard-project-actions">
                    <Link to="/app/projects" className="wm-btn wm-btn-secondary">
                      Open
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="wm-dashboard-section">
            <div className="wm-dashboard-section-head">
              <h2 className="wm-subtitle">Primary tools</h2>
              <Link to="/app/tools" className="wm-dashboard-inline-link">
                Open full tool hub
              </Link>
            </div>

            <div className="wm-dashboard-tool-grid">
              {primaryTools.map((tool) => (
                <article key={tool.title} className="wm-card wm-dashboard-tool-card">
                  <div className="wm-dashboard-tool-topline">
                    <span className="wm-badge">{tool.badge}</span>
                  </div>
                  <h3 className="wm-dashboard-tool-title">{tool.title}</h3>
                  <p className="wm-muted wm-dashboard-tool-copy">{tool.body}</p>
                  <Link to={tool.to} className="wm-btn wm-btn-secondary">
                    Open
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="wm-dashboard-column-side">
          <section className="wm-card wm-dashboard-side-panel">
            <div className="wm-dashboard-side-kicker">Workflow logic</div>
            <h2 className="wm-subtitle wm-dashboard-side-title">
              Keep the project moving in the right order.
            </h2>
            <div className="wm-list">
              <div className="wm-list-row wm-dashboard-step-row">
                <div className="wm-dashboard-step-index">01</div>
                <div>Capture the application and room requirements first.</div>
              </div>
              <div className="wm-list-row wm-dashboard-step-row">
                <div className="wm-dashboard-step-index">02</div>
                <div>Move into architecture and product selection second.</div>
              </div>
              <div className="wm-list-row wm-dashboard-step-row">
                <div className="wm-dashboard-step-index">03</div>
                <div>Build BOM, proposal, and commercial output last.</div>
              </div>
            </div>
          </section>

          <section className="wm-dashboard-section">
            <div className="wm-dashboard-section-head">
              <h2 className="wm-subtitle">Reference utilities</h2>
            </div>

            <div className="wm-list">
              {utilityLinks.map((item) => (
                <article key={item.title} className="wm-card wm-dashboard-utility-card">
                  <h3 className="wm-dashboard-utility-title">{item.title}</h3>
                  <p className="wm-muted wm-dashboard-utility-copy">{item.body}</p>
                  <Link to={item.to} className="wm-btn wm-btn-secondary">
                    Open
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}