import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { useBoundProjects } from "@/core/wingman/storeBridge";
import { deleteProject, setActiveProjectId } from "@/features/projects/projectStore";

function toCompactSummary(summary: string): string {
  const normalized = String(summary ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "Project ready.";

  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  if (sentence.length <= 140) return sentence;
  return `${sentence.slice(0, 137).trimEnd()}...`;
}

function toStageLabel(stage: string): string {
  return String(stage ?? "Draft").replace(/-/g, " ");
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const projects = useBoundProjects();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const openProject = React.useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    navigate(`/app/projects/${encodeURIComponent(projectId)}`);
  }, [navigate]);

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
            <div className="wm-title-xl">Projects</div>
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
              <p>Recall a project fast, then open or remove it without leaving the list.</p>
            </div>
          </div>

        <div className="wm-projects-page__list" role="list">
          {projects.map((project) => (
            <article key={project.id} className="wm-projects-page__row" role="listitem">
              <button
                type="button"
                className="wm-projects-page__row-main"
                onClick={() => openProject(project.id)}
                title={`Open ${project.title}`}
              >
                <span className="wm-projects-page__row-topline">
                  <span className="wm-projects-page__row-title">{project.title}</span>
                  <span className="wm-projects-page__row-stage">{toStageLabel(project.stage)}</span>
                </span>

                <span className="wm-projects-page__row-meta">
                  <strong>{project.customer || "Customer not set"}</strong>
                  <span>{toCompactSummary(project.summary)}</span>
                </span>
              </button>

              <div className="wm-projects-page__row-actions">
                <button
                  type="button"
                  className="wm-projects-page__icon-btn"
                  onClick={() => openProject(project.id)}
                  aria-label={`Open ${project.title}`}
                  title="Open project"
                >
                  <ArrowUpRight size={16} />
                </button>
                <button
                  type="button"
                  className="wm-projects-page__icon-btn wm-projects-page__icon-btn--danger"
                  onClick={() => handleDelete(project.id, project.title)}
                  aria-label={`Delete ${project.title}`}
                  title="Delete project"
                  disabled={deletingId === project.id}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}

          {projects.length === 0 ? (
            <div className="wm-dashboard-empty">
              <div className="wm-title-lg">No projects yet</div>
              <div className="wm-body">Create your first project to start building live project data.</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
