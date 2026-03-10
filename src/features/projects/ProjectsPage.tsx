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
        <div className="wm-page-hero-row">
          <div>
            <div className="wm-title-xl">Projects workspace</div>
            <div className="wm-body-sm wm-page-subtitle">
              Track opportunities, continue active work, and jump back into the right workflow.
            </div>
          </div>

          <div className="wm-actions-row">
            <button
              type="button"
              className="wm-btn wm-btn-primary"
              onClick={() => navigate(WM_ROUTES.newProject)}
            >
              Start New Project
            </button>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Live project store</h2>
            <p>Open an opportunity and continue with Discovery, product selection, or proposal output.</p>
          </div>
        </div>

        <div className="wm-grid-cards">
          {projects.map((project) => (
            <article key={project.id} className="wm-work-card">
              <div className="wm-work-card__head">
                <div className="wm-title-lg">{project.title}</div>
                <span className="wm-tag">{project.stage}</span>
              </div>

              <div className="wm-body"><strong>{project.customer}</strong></div>
              <div className="wm-body">{project.summary}</div>

              <div className="wm-actions-row">
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
            </article>
          ))}

          {projects.length === 0 ? (
            <div className="wm-dashboard-empty">
              <div className="wm-title-lg">No projects yet</div>
              <div className="wm-body">Create your first project to start building live workspace data.</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
