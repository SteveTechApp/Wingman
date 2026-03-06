import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  deleteProject,
  loadProjects,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";

function formatRelativeDay(iso: string): string {
  const target = new Date(iso);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / 86400000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return target.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function StageRow(props: {
  index: number;
  title: string;
  desc: string;
  state: "Current" | "Pending";
}) {
  const { index, title, desc, state } = props;
  return (
    <div className="wm-stage-row">
      <div className="wm-stage-row__dot" />
      <div className="wm-stage-row__body">
        <div className="wm-stage-row__title">
          {index}. {title}
        </div>
        <div className="wm-stage-row__desc">{desc}</div>
      </div>
      <div className={state === "Current" ? "wm-stage-row__state is-current" : "wm-stage-row__state"}>
        {state}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const [projects, setProjects] = React.useState<StoredProject[]>(() => loadProjects());

  React.useEffect(() => {
    const refresh = () => setProjects(loadProjects());
    const unsubscribe = subscribeProjects(refresh);
    refresh();
    return unsubscribe;
  }, []);

  const recentProjects = React.useMemo(
    () => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [projects]
  );

  const activeProject = recentProjects[0] ?? null;

  const handleOpenProject = (projectId: string) => {
    nav(`/app/projects?projectId=${encodeURIComponent(projectId)}`);
  };

  const handleCreateProject = () => {
    const created = createProject({
      name: `New Project ${projects.length + 1}`,
      customer: "Sample customer",
      stage: "Discovery",
      status: "Draft",
      notes: "New blank project created from the dashboard.",
    });
    nav(`/app/projects?projectId=${encodeURIComponent(created.id)}`);
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    const ok = window.confirm(`Delete project "${projectName}"?`);
    if (!ok) return;
    deleteProject(projectId);
  };

  return (
    <div className="wm-dashboard">
      <section className="wm-dashboard__hero">
        <div>
          <div className="wm-dashboard__eyebrow">Mission Control</div>
          <h1 className="wm-dashboard__title">Keep the opportunity moving</h1>
          <p className="wm-dashboard__subtitle">
            Start with discovery, move into design and specification, then finish with a clear exportable proposal.
          </p>

          <div className="wm-dashboard__meta">
            <span className="wm-chip">Stage: {activeProject?.stage ?? "Discovery"}</span>
            <span className="wm-chip">Status: {activeProject?.status ?? "Draft"}</span>
            <span className="wm-chip">
              Updated: {activeProject ? new Date(activeProject.updatedAt).toLocaleDateString() : "Mar 06, 2026"}
            </span>
          </div>
        </div>

        <div className="wm-dashboard__heroactions">
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/projects")}>
            Projects
          </button>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/tools")}>
            Tool Hub
          </button>
          <button type="button" className="wm-btn wm-btn--primary" onClick={handleCreateProject}>
            Start New Project
          </button>
        </div>
      </section>

      <section className="wm-dashboard__grid">
        <div className="wm-card">
          <div className="wm-card__title">Recommended next action</div>
          <div className="wm-card__subtitle">
            Begin by capturing the discovery information so every later tool has the right project context.
          </div>

          <div className="wm-nextstep">
            <div className="wm-nextstep__project">
              <div className="wm-nextstep__label">Active Project</div>
              <h3>{activeProject ? activeProject.name : "No active project"}</h3>
              <p>
                {activeProject
                  ? `Current customer: ${activeProject.customer}. Continue building the project from the shared project workspace.`
                  : "Create a project first or jump straight into discovery to capture the first set of requirements."}
              </p>

              <div className="wm-inline-actions">
                <button
                  type="button"
                  className="wm-btn wm-btn--primary"
                  onClick={() => {
                    if (activeProject) {
                      handleOpenProject(activeProject.id);
                    } else {
                      nav("/app/tools/discovery");
                    }
                  }}
                >
                  {activeProject ? "Open Active Project" : "Capture Discovery"}
                </button>
                <button
                  type="button"
                  className="wm-btn wm-btn--secondary"
                  onClick={handleCreateProject}
                >
                  Start Blank Project
                </button>
              </div>
            </div>

            <div className="wm-nextstep__stages">
              <StageRow
                index={1}
                title="Discovery"
                desc="Capture application, rooms, distances, displays, sources and constraints."
                state="Current"
              />
              <StageRow
                index={2}
                title="Design"
                desc="Map the signal path, USB needs, audio handling and control approach."
                state="Pending"
              />
              <StageRow
                index={3}
                title="Specify"
                desc="Select WyreStorm products, alternates and accessories."
                state="Pending"
              />
              <StageRow
                index={4}
                title="Quote"
                desc="Export the proposal snapshot and prepare customer-facing output."
                state="Pending"
              />
            </div>
          </div>
        </div>

        <div className="wm-card">
          <div className="wm-card__title">Recent projects</div>
          <div className="wm-card__subtitle">
            Re-open a live opportunity or start a new working draft.
          </div>

          <div className="wm-project-list">
            {recentProjects.length === 0 ? (
              <div className="wm-project-row">
                <div className="wm-project-row__main">
                  <div className="wm-project-row__name">No projects yet</div>
                  <div className="wm-project-row__customer">Create your first project to populate this list.</div>
                </div>
              </div>
            ) : (
              recentProjects.map((project) => (
                <div className="wm-project-row" key={project.id}>
                  <div className="wm-project-row__main">
                    <div className="wm-project-row__name">{project.name}</div>
                    <div className="wm-project-row__customer">{project.customer}</div>
                  </div>
                  <div className="wm-project-row__stage">{project.stage}</div>
                  <div className="wm-project-row__updated">{formatRelativeDay(project.updatedAt)}</div>
                  <div className="wm-project-row__actions">
                    <button
                      type="button"
                      className="wm-btn wm-btn--small wm-btn--ghost"
                      onClick={() => handleOpenProject(project.id)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="wm-icon-btn"
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      title="Delete project"
                      aria-label={`Delete ${project.name}`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="wm-inline-actions">
            <button
              type="button"
              className="wm-btn wm-btn--ghost"
              onClick={() => nav("/app/projects")}
            >
              Open Projects
            </button>
            <button
              type="button"
              className="wm-btn wm-btn--primary"
              onClick={handleCreateProject}
            >
              Start New Project
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}