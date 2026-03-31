import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  getActiveProject,
  getProjectById,
  setActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";
import { useAuth } from "@/context/AuthContext";

export default function ProjectOverviewPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { workspaceRole } = useAuth();

  const project = React.useSyncExternalStore(
    subscribeProjects,
    () => {
      const paramId = id || searchParams.get("projectId") || undefined;
      if (paramId) return getProjectById(paramId) ?? null;
      return getActiveProject() ?? null;
    },
    () => getActiveProject() ?? null,
  );

  React.useEffect(() => {
    if (project?.id) {
      setActiveProjectId(project.id);
    }
  }, [project?.id]);

  if (!project) {
    return (
      <div className="wm-page wm-project-overview-page">
        <section className="wm-hero">
          <div className="wm-grid">
            <div className="wm-title-xl">Project not found</div>
            <div className="wm-body">
              The requested project could not be loaded.
            </div>
            <div className="wm-actions-row">
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={() => nav("/app/projects")}
              >
                Back to Projects
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wm-page wm-project-overview-page">
      <section className="wm-hero">
        <div className="wm-grid" style={{ gap: 12 }}>
          <div className="wm-kicker">
            {project.stage || "Discovery"} | {project.status || "Draft"}
          </div>
          <div className="wm-title-xl">{project.name}</div>
          <div className="wm-body">
            {project.customer || "Customer not set"} | {project.site || "Site not set"}
          </div>
          <div className="wm-body-sm">
            Workspace role: {workspaceRole || "Unknown"}
          </div>

          <div className="wm-actions-row">
            <Link className="wm-btn" to="/app/projects">Projects</Link>
            <Link className="wm-btn" to="/app/tools/discovery">Discovery</Link>
            <Link className="wm-btn" to="/app/tools/catalog">Catalogue</Link>
            <Link className="wm-btn wm-btn-primary" to="/app/tools/proposal">Proposal</Link>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-grid-cards" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          <article className="wm-work-card">
            <div className="wm-section-title">Customer</div>
            <div className="wm-title-lg">{project.customer || "-"}</div>
          </article>

          <article className="wm-work-card">
            <div className="wm-section-title">Stage</div>
            <div className="wm-title-lg">{project.stage || "-"}</div>
          </article>

          <article className="wm-work-card">
            <div className="wm-section-title">Status</div>
            <div className="wm-title-lg">{project.status || "-"}</div>
          </article>
        </div>
      </section>
    </div>
  );
}