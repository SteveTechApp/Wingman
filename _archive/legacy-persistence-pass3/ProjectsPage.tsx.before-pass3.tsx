import React from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import WingmanSavedProjectsPanel from "@/features/projects/WingmanSavedProjectsPanel";
import { getProjectResumeAction } from "@/features/projects/projectProductivity";
import {
  deleteProject,
  getActiveProject,
  loadProjects,
  setActiveProjectId,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import "./projects-page.css";

function formatDateTime(value?: string | null) {
  if (!value) return "Not captured";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function toStageLabel(stage: string) {
  return String(stage ?? "Draft").replace(/-/g, " ");
}

function toSummary(project: StoredProject) {
  const text =
    project.discovery?.notes?.trim() ||
    project.notes?.trim() ||
    project.template?.summary?.trim() ||
    project.compare?.summary?.trim() ||
    project.videowall?.summary?.trim() ||
    "Project ready to continue.";

  return text.length > 170 ? `${text.slice(0, 167).trimEnd()}...` : text;
}

function countText(value?: string | number | null, suffix?: string) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Not set";
  return suffix ? `${numeric}${suffix}` : String(numeric);
}

function ProjectCard({
  project,
  deleting,
  onOverview,
  onResume,
  onDelete,
}: {
  project: StoredProject;
  deleting: boolean;
  onOverview: (project: StoredProject) => void;
  onResume: (project: StoredProject) => void;
  onDelete: (project: StoredProject) => void;
}) {
  const resume = getProjectResumeAction(project);

  return (
    <article className="wm-card wm-projects-card">
      <div className="wm-projects-card__top">
        <div>
          <h3 className="wm-card-title">{project.name || "Untitled project"}</h3>
          <p className="wm-card-copy">
            {[
              project.customer || "Customer not set",
              project.roomName || "Room not set",
              project.site || "Site not set",
            ].join(" / ")}
          </p>
        </div>

        <div className="wm-page-inline-list">
          <span className="wm-workspace-tag">{resume.shortLabel}</span>
          <span className="wm-workspace-tag">{toStageLabel(project.stage)}</span>
        </div>
      </div>

      <div className="wm-projects-card__metrics">
        <div className="wm-projects-card__metric">
          <span>Inputs</span>
          <strong>{countText(project.discovery?.sourceCount)}</strong>
        </div>
        <div className="wm-projects-card__metric">
          <span>Outputs</span>
          <strong>{countText(project.discovery?.displayCount)}</strong>
        </div>
        <div className="wm-projects-card__metric">
          <span>Distance</span>
          <strong>{countText(project.discovery?.cableDistanceM, "m")}</strong>
        </div>
        <div className="wm-projects-card__metric">
          <span>Updated</span>
          <strong>{formatDateTime(project.updatedAt)}</strong>
        </div>
      </div>

      <p className="wm-projects-card__summary">{toSummary(project)}</p>

      <div className="wm-action-row">
        <button
          type="button"
          className="wm-btn-secondary"
          onClick={() => onOverview(project)}
        >
          Project Overview
        </button>

        <button
          type="button"
          className="wm-btn-primary"
          onClick={() => onResume(project)}
        >
          {resume.label}
        </button>

        <button
          type="button"
          className="wm-btn-secondary"
          onClick={() => onDelete(project)}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();

  const projects = React.useSyncExternalStore(subscribeProjects, loadProjects, () => []);
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    getActiveProject,
    () => undefined,
  );

  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const activeProjects = projects.filter(
    (project) => toStageLabel(project.stage).toLowerCase() !== "draft",
  ).length;

  const activeResume = activeProject ? getProjectResumeAction(activeProject) : null;

  const openOverview = React.useCallback(
    (project: StoredProject) => {
      setActiveProjectId(project.id);
      navigate(`/app/projects/${encodeURIComponent(project.id)}`);
    },
    [navigate],
  );

  const resumeProject = React.useCallback(
    (project: StoredProject) => {
      setActiveProjectId(project.id);
      navigate(getProjectResumeAction(project).to);
    },
    [navigate],
  );

  const handleDelete = React.useCallback((project: StoredProject) => {
    const confirmed = window.confirm(
      `Delete project "${project.name || "Untitled project"}"?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(project.id);
    try {
      deleteProject(project.id);
    } finally {
      setDeletingId((current) => (current === project.id ? null : current));
    }
  }, []);

  return (
    <div className="wm-page-shell wm-projects-page">
      <section className="wm-page-header wm-page-header--split">
        <div className="wm-page-stack">
          <div className="wm-page-kicker">Projects</div>
          <h1 className="wm-page-title">Resume the right project fast.</h1>
          <p className="wm-page-subtitle">
            Keep active work easy to continue without letting saved context take over the page.
          </p>
        </div>

        <div className="wm-page-actions">
          <button
            type="button"
            className="wm-btn-primary"
            onClick={() => navigate(WM_ROUTES.projectLauncher)}
          >
            Start New Project
          </button>

          <button
            type="button"
            className="wm-btn-secondary"
            onClick={() => navigate(WM_ROUTES.templates)}
          >
            Choose Room Type
          </button>
        </div>
      </section>

      <section className="wm-stat-row">
        <div className="wm-stat-card">
          <span className="wm-stat-label">Projects</span>
          <span className="wm-stat-value">{projects.length}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Active work</span>
          <span className="wm-stat-value">{activeProjects}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Current project</span>
          <span className="wm-stat-value">{activeProject?.name || "Not selected"}</span>
        </div>
        <div className="wm-stat-card">
          <span className="wm-stat-label">Best next move</span>
          <span className="wm-stat-value">{activeResume?.shortLabel || "Templates"}</span>
        </div>
      </section>

      <section className="wm-section wm-projects-current">
        {activeProject && activeResume ? (
          <>
            <div className="wm-page-stack">
              <div className="wm-page-kicker">Current project</div>
              <h2 className="wm-section-title">{activeProject.name || "Untitled project"}</h2>
              <p className="wm-section-copy">
                {[
                  activeProject.customer || "Customer not set",
                  activeProject.roomName || "Room not set",
                  activeProject.site || "Site not set",
                ].join(" / ")}
              </p>
            </div>

            <div className="wm-page-actions">
              <button
                type="button"
                className="wm-btn-primary"
                onClick={() => resumeProject(activeProject)}
              >
                {activeResume.label}
              </button>

              <button
                type="button"
                className="wm-btn-secondary"
                onClick={() => openOverview(activeProject)}
              >
                Open Project Overview
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="wm-page-stack">
              <div className="wm-page-kicker">No current project</div>
              <h2 className="wm-section-title">
                Start from a room type or create a blank project shell.
              </h2>
              <p className="wm-section-copy">
                The simpler the entry point, the easier it is for the rest of Wingman
                to guide the next step.
              </p>
            </div>

            <div className="wm-page-actions">
              <button
                type="button"
                className="wm-btn-primary"
                onClick={() => navigate(WM_ROUTES.templates)}
              >
                Open Templates
              </button>

              <button
                type="button"
                className="wm-btn-secondary"
                onClick={() => navigate(WM_ROUTES.projectLauncher)}
              >
                Open Project Launcher
              </button>
            </div>
          </>
        )}
      </section>

      <section className="wm-section">
        <div className="wm-section-header">
          <div>
            <div className="wm-page-kicker">Live project store</div>
            <h2 className="wm-section-title">All active project work</h2>
            <p className="wm-section-copy">
              Every project should show the room, state, and best resume path at a glance.
            </p>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="wm-page-grid wm-page-grid--2">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                deleting={deletingId === project.id}
                onOverview={openOverview}
                onResume={resumeProject}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="wm-empty-state">
            <h3>No projects yet</h3>
            <p>Create your first room workflow from Templates or the Project Launcher.</p>
          </div>
        )}
      </section>

      <WingmanSavedProjectsPanel />
    </div>
  );
}
