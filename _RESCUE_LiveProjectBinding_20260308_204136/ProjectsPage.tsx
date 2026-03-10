import React from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { getProjects } from "@/core/wingman/wingmanData";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const projects = getProjects();

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <div className="wm-title-xl">Projects workspace</div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Track opportunities, continue active work, and jump back into the right workflow.
            </div>
          </div>

          <button
            type="button"
            className="wm-btn wm-btn-primary"
            style={{ padding: "9px 14px", minWidth: 140 }}
            onClick={() => navigate(WM_ROUTES.newProject)}
          >
            Start New Project
          </button>
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Recent projects</div>
        <div className="wm-grid-cards">
          {projects.map((project) => (
            <div key={project.id} className="wm-card">
              <div className="wm-grid" style={{ gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div className="wm-title-lg">{project.title}</div>
                  <span className="wm-tag">{project.stage}</span>
                </div>
                <div className="wm-body"><strong>{project.customer}</strong></div>
                <div className="wm-body">{project.summary}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="wm-btn" onClick={() => navigate(WM_ROUTES.discovery)}>
                    Continue
                  </button>
                  <button type="button" className="wm-btn" onClick={() => navigate(WM_ROUTES.proposals)}>
                    Open Proposal Builder
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