import React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { useBoundProjects } from "@/core/wingman/storeBridge";
import { deleteProject, setActiveProjectId } from "@/features/projects/projectStore";

function toCompactSummary(summary: string): string {
  const normalized = String(summary ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Project workspace ready.";

  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  if (sentence.length <= 140) return sentence;
  return `${sentence.slice(0, 137).trimEnd()}...`;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const projects = useBoundProjects();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = React.useCallback((projectId: string, projectTitle: string) => {
    const confirmed = window.confirm(`Delete project "${projectTitle}"?\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(projectId);
    try {
      deleteProject(projectId);
    } finally {
      setDeletingId((current) => (current === projectId ? null : current));
    }
  }, []);

  return (
    <div className="wm-page wm-projects-page">
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
            <p>Open an opportunity and continue with Guided Project, product selection, or proposal output.</p>
            </div>
          </div>

        <div className="wm-grid-cards">
          {projects.map((project) => (
            <article key={project.id} className="wm-work-card">
              <div className="wm-work-card__head">
                <div className="wm-title-lg wm-projects-page__title">{project.title}</div>
                <div className="wm-projects-page__head-actions">
                  <span className="wm-tag">{project.stage}</span>
                  <button
                    type="button"
                    className="wm-projects-page__delete-btn"
                    onClick={() => handleDelete(project.id, project.title)}
                    aria-label={`Delete ${project.title}`}
                    title="Delete project"
                    disabled={deletingId === project.id}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="wm-body wm-projects-page__customer"><strong>{project.customer}</strong></div>
              <div className="wm-body wm-projects-page__summary" title={project.summary}>
                {toCompactSummary(project.summary)}
              </div>

              <div className="wm-actions-row">
                <button
                  type="button"
                  className="wm-btn"
                  onClick={() => {
                    setActiveProjectId(project.id);
                    navigate(`/app/projects/${encodeURIComponent(project.id)}`);
                  }}
                >
                  Open Project
                </button>
                <button
                  type="button"
                  className="wm-btn"
                  onClick={() => {
                    setActiveProjectId(project.id);
                    navigate(WM_ROUTES.discovery);
                  }}
                >
                  Continue Guided Project
                </button>
                <button
                  type="button"
                  className="wm-btn"
                  onClick={() => {
                    setActiveProjectId(project.id);
                    navigate(WM_ROUTES.proposals);
                  }}
                >
                  Open Proposal Builder
                </button>
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  onClick={() => {
                    setActiveProjectId(project.id);
                    navigate(`/app/projects/${encodeURIComponent(project.id)}/completion`);
                  }}
                >
                  Completion Gate
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
