import React from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { getWingmanFeatures, getWingmanTools } from "@/core/wingman/wingmanData";
import { useBoundProjects } from "@/core/wingman/storeBridge";

function metricCard(label: string, value: string, sub: string) {
  return (
    <div className="wm-card wm-card--metric">
      <div className="wm-grid" style={{ gap: 8 }}>
        <div className="wm-stat-label">{label}</div>
        <div className="wm-stat-value">{value}</div>
        <div className="wm-body-sm">{sub}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const projects = useBoundProjects();

  const allFeatures = getWingmanFeatures();
  const allTools = getWingmanTools();

  const quickFeatures = allFeatures.filter((x) =>
    ["start-project", "discovery", "templates", "proposal-builder"].includes(x.id),
  );

  const quickTools = allTools.filter((x) =>
    ["guru", "catalogue", "competitor-compare"].includes(x.id),
  );

  const activeCount = projects.length;
  const proposalCount = projects.filter((p) => p.stage.toLowerCase().includes("proposal")).length;
  const discoveryCount = projects.filter((p) => p.stage.toLowerCase().includes("discovery")).length;
  const completion = activeCount > 0 ? Math.min(100, Math.round((proposalCount / activeCount) * 100)) : 0;

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div className="wm-grid" style={{ gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 0.9fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div className="wm-grid" style={{ gap: 8 }}>
              <div className="wm-kicker">Mission Control</div>
              <div className="wm-title-xl">Build AV solutions faster, with clearer workflow control.</div>
              <div className="wm-body" style={{ maxWidth: 760 }}>
                Start projects quickly, move through structured workflows, and use the right support tools without losing commercial momentum.
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  style={{ padding: "10px 16px", minWidth: 148 }}
                  onClick={() => navigate(WM_ROUTES.newProject)}
                >
                  Start New Project
                </button>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  style={{ padding: "10px 16px" }}
                  onClick={() => navigate(WM_ROUTES.discovery)}
                >
                  Run Discovery Wizard
                </button>
                <button
                  type="button"
                  className="wm-btn"
                  style={{ padding: "10px 16px" }}
                  onClick={() => navigate(WM_ROUTES.tools)}
                >
                  Open Tool Launchpad
                </button>
              </div>
            </div>

            <div className="wm-card wm-card--primary">
              <div className="wm-grid" style={{ gap: 10 }}>
                <div className="wm-title-lg">Pipeline health</div>
                <div className="wm-progress"><span style={{ width: completion + "%" }} /></div>
                <div className="wm-body-sm">
                  {completion}% of current live projects have reached proposal-stage readiness.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginTop: 2 }}>
                  <div className="wm-surface-soft" style={{ padding: 10 }}>
                    <div className="wm-title-md">{activeCount}</div>
                    <div className="wm-body-sm">Live projects</div>
                  </div>
                  <div className="wm-surface-soft" style={{ padding: 10 }}>
                    <div className="wm-title-md">{discoveryCount}</div>
                    <div className="wm-body-sm">In discovery</div>
                  </div>
                  <div className="wm-surface-soft" style={{ padding: 10 }}>
                    <div className="wm-title-md">{proposalCount}</div>
                    <div className="wm-body-sm">At proposal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="wm-grid-metrics">
            {metricCard("Projects", String(activeCount), "Active or recent workspaces")}
            {metricCard("Discovery", String(discoveryCount), "Projects still in requirement capture")}
            {metricCard("Proposal", String(proposalCount), "Projects nearing customer output")}
            {metricCard("Completion", completion + "%", "Proposal-stage readiness across live work")}
          </div>
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Popular workflows</div>
        <div className="wm-grid-cards">
          {quickFeatures.map((item) => (
            <div key={item.id} className={`wm-card${item.id === "start-project" ? " wm-card--primary" : ""}`}>
              <div className="wm-grid" style={{ gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div className="wm-title-lg">{item.title}</div>
                  {item.tag ? <span className="wm-tag">{item.tag}</span> : null}
                </div>
                <div className="wm-body">{item.description}</div>
                <div>
                  <button
                    type="button"
                    className={`wm-btn${item.id === "start-project" ? " wm-btn-primary" : ""}`}
                    onClick={() => navigate(item.to)}
                  >
                    Open {item.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Recent live projects</div>
        <div className="wm-grid-cards">
          {projects.slice(0, 3).map((project) => (
            <div key={project.id} className="wm-card">
              <div className="wm-grid" style={{ gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div className="wm-title-lg">{project.title}</div>
                  <span className="wm-tag">{project.stage}</span>
                </div>
                <div className="wm-body"><strong>{project.customer}</strong></div>
                <div className="wm-body">{project.summary}</div>
                <div>
                  <button type="button" className="wm-btn" onClick={() => navigate(WM_ROUTES.projects)}>
                    Open Projects
                  </button>
                </div>
              </div>
            </div>
          ))}

          {projects.length === 0 ? (
            <div className="wm-card">
              <div className="wm-title-lg">No active projects</div>
              <div className="wm-body" style={{ marginTop: 6 }}>
                Start a new project to populate the workspace and dashboard pipeline.
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Useful tools</div>
        <div className="wm-grid-cards">
          {quickTools.map((item) => (
            <div key={item.id} className="wm-card">
              <div className="wm-grid" style={{ gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div className="wm-title-lg">{item.title}</div>
                  {item.tag ? <span className="wm-tag">{item.tag}</span> : null}
                </div>
                <div className="wm-body">{item.description}</div>
                <div>
                  <button type="button" className="wm-btn" onClick={() => navigate(item.to)}>
                    Open {item.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}