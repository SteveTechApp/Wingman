import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  loadAllPersistedProjects,
  setActivePersistedProjectId,
  type WingmanPersistedProject,
} from "@/app/logic/wingmanProjectPersistence";
import { WM_ROUTES } from "@/core/wingman/routeMap";

function formatDate(iso: string | undefined): string {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 12,
        fontWeight: 700,
        color: "#fff",
      }}
    >
      {children}
    </span>
  );
}

function ProjectCard({ project }: { project: WingmanPersistedProject }) {
  const navigate = useNavigate();

  function open(route: string) {
    setActivePersistedProjectId(project.id);
    navigate(route);
  }

  return (
    <article
      className="wm-surface-card"
      style={{
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}>{project.name}</div>
        <div style={{ color: "rgba(226,232,240,0.78)" }}>
          {project.customer || "Customer not set"} · {project.application || "Application not set"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusPill>{project.discovery.sources} sources</StatusPill>
        <StatusPill>{project.discovery.displays} displays</StatusPill>
        <StatusPill>{project.discovery.distanceM ?? 0}m</StatusPill>
        {project.proposal ? <StatusPill>Proposal saved</StatusPill> : null}
        {project.videoWall ? <StatusPill>Video wall saved</StatusPill> : null}
      </div>

      <div style={{ color: "rgba(226,232,240,0.72)", fontSize: 13 }}>
        Updated {formatDate(project.updatedAt)}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="wm-btn-secondary" onClick={() => open(WM_ROUTES.dashboard)}>
          Dashboard
        </button>
        <button type="button" className="wm-btn-secondary" onClick={() => open(WM_ROUTES.sales)}>
          Sales
        </button>
        <button type="button" className="wm-btn-secondary" onClick={() => open(WM_ROUTES.proposal)}>
          Proposal
        </button>
        <button type="button" className="wm-btn-primary" onClick={() => open(WM_ROUTES.videoWall)}>
          Video Wall
        </button>
      </div>
    </article>
  );
}

export default function WingmanSavedProjectsPanel() {
  const projects = React.useMemo(() => loadAllPersistedProjects(), []);

  return (
    <section className="wm-section wm-section--tone-cyan">
      <div className="wm-section__head">
        <div className="wm-section__titles">
          <h2>Wingman saved projects</h2>
          <p>Projects created from the new guided Wingman workflow.</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="wm-body">No Wingman saved projects yet. Save from Proposal or Video Wall to create one.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}