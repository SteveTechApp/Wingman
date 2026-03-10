import React from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { getWingmanFeatures, getWingmanTools } from "@/core/wingman/wingmanData";
import { useBoundProjects } from "@/core/wingman/storeBridge";

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

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.9fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div className="wm-grid" style={{ gap: 6 }}>
            <div className="wm-title-xl">Mission Control</div>
            <div className="wm-body-sm">
              Start projects quickly, launch the right workflow, and keep tools close while building proposals.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{ padding: "9px 14px", minWidth: 140 }}
                onClick={() => navigate(WM_ROUTES.newProject)}
              >
                Start New Project
              </button>
              <button
                type="button"
                className="wm-btn"
                style={{ padding: "9px 14px" }}
                onClick={() => navigate(WM_ROUTES.discovery)}
              >
                Open Discovery Wizard
              </button>
            </div>
          </div>

          <div className="wm-grid-cards" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div className="wm-card wm-card--primary">
              <div className="wm-title-lg">Projects</div>
              <div className="wm-body" style={{ marginTop: 4 }}>
                {projects.length} active or recent workspace entr{projects.length === 1 ? "y" : "ies"}.
              </div>
            </div>
            <div className="wm-card">
              <div className="wm-title-lg">Proposal Path</div>
              <div className="wm-body" style={{ marginTop: 4 }}>Move from requirements to BOM and proposal pack.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Popular workflows</div>
        <div className="wm-grid-cards">
          {quickFeatures.map((item) => (
            <div key={item.id} className={`wm-card${item.id === "start-project" ? " wm-card--primary" : ""}`}>
              <div className="wm-grid" style={{ gap: 7 }}>
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
          {projects.slice(0, 4).map((project) => (
            <div key={project.id} className="wm-card">
              <div className="wm-grid" style={{ gap: 7 }}>
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
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Useful tools</div>
        <div className="wm-grid-cards">
          {quickTools.map((item) => (
            <div key={item.id} className="wm-card">
              <div className="wm-grid" style={{ gap: 7 }}>
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