import React from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { useBoundProjects } from "@/core/wingman/storeBridge";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const projects = useBoundProjects();

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
        <div className="wm-section-title">Live project store</div>
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
                  <button
                    type="button"
                    className="wm-btn"
                    onClick={() => navigate(`/app/projects/${encodeURIComponent(project.id)}`)}
                  >
                    Open Project
                  </button>
                  <button type="button" className="wm-btn" onClick={() => navigate(WM_ROUTES.discovery)}>
                    Continue Discovery
                  </button>
                  <button type="button" className="wm-btn" onClick={() => navigate(WM_ROUTES.proposals)}>
                    Open Proposal Builder
                  </button>
                </div>
              </div>
            </div>
          ))}

          {projects.length === 0 ? (
            <div className="wm-panel" style={{ padding: 12 }}>
              <div className="wm-title-lg">No projects yet</div>
              <div className="wm-body" style={{ marginTop: 6 }}>
                Create your first project to start building live workspace data.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
