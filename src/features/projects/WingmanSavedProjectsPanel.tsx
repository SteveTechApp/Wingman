import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  loadAllPersistedProjects,
  setActivePersistedProjectId,
  type WingmanPersistedProject,
} from "@/app/logic/wingmanProjectPersistence";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./saved-projects-panel.css";

function formatDate(value?: string | null) {
  if (!value) return "Not captured";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function primaryRoute(project: WingmanPersistedProject): string {
  if (project.videoWall) return WM_ROUTES.videoWall;
  if (project.proposal) return WM_ROUTES.proposal;
  return WM_ROUTES.dashboard;
}

function primaryLabel(project: WingmanPersistedProject): string {
  if (project.videoWall) return "Resume Video Wall";
  if (project.proposal) return "Resume Proposal";
  return "Open Dashboard";
}

function PersistedProjectCard({ project }: { project: WingmanPersistedProject }) {
  const navigate = useNavigate();

  function open(route: string) {
    setActivePersistedProjectId(project.id);
    navigate(route);
  }

  return (
    <article className="wm-saved-projects-panel__card">
      <div className="wm-saved-projects-panel__card-top">
        <div>
          <h3>{project.name || "Untitled saved project"}</h3>
          <p>
            {[project.customer || "Customer not set", project.application || "Application not set"].join(" / ")}
          </p>
        </div>

        <div className="wm-saved-projects-panel__tag-row">
          {project.proposal ? <span className="wm-saved-projects-panel__tag">Proposal</span> : null}
          {project.videoWall ? <span className="wm-saved-projects-panel__tag">Video Wall</span> : null}
          {!project.proposal && !project.videoWall ? (
            <span className="wm-saved-projects-panel__tag">Saved workflow</span>
          ) : null}
        </div>
      </div>

      <div className="wm-saved-projects-panel__metrics">
        <div className="wm-saved-projects-panel__metric">
          <span>Inputs</span>
          <strong>{project.discovery.sources || 0}</strong>
        </div>
        <div className="wm-saved-projects-panel__metric">
          <span>Outputs</span>
          <strong>{project.discovery.displays || 0}</strong>
        </div>
        <div className="wm-saved-projects-panel__metric">
          <span>Distance</span>
          <strong>{project.discovery.distanceM ? `${project.discovery.distanceM}m` : "Not set"}</strong>
        </div>
        <div className="wm-saved-projects-panel__metric">
          <span>Updated</span>
          <strong>{formatDate(project.updatedAt)}</strong>
        </div>
      </div>

      <div className="wm-saved-projects-panel__actions">
        <button
          type="button"
          className="wm-btn-primary"
          onClick={() => open(primaryRoute(project))}
        >
          {primaryLabel(project)}
        </button>
        <button
          type="button"
          className="wm-btn-secondary"
          onClick={() => open(WM_ROUTES.dashboard)}
        >
          Open Dashboard
        </button>
      </div>
    </article>
  );
}

export default function WingmanSavedProjectsPanel() {
  const projects = React.useMemo(() => loadAllPersistedProjects(), []);

  return (
    <section className="wm-saved-projects-panel">
      <div className="wm-saved-projects-panel__head">
        <div>
          <div className="wm-saved-projects-panel__eyebrow">Older saved context</div>
          <h2>Legacy Wingman saves</h2>
          <p>
            Older saved workflows still stay available here, but they sit behind the live project
            store so current work remains the main focus.
          </p>
        </div>
      </div>

      {projects.length > 0 ? (
        <div className="wm-saved-projects-panel__list">
          {projects.map((project) => (
            <PersistedProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="wm-saved-projects-panel__empty">
          <h3>No older saved workflows</h3>
          <p>Once a project is saved from the older Proposal or Video Wall tools, it will appear here.</p>
        </div>
      )}
    </section>
  );
}
