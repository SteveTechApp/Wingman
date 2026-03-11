import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  FolderOpen,
  History,
  Import,
  LayoutTemplate,
  MonitorSmartphone,
  PlusCircle,
} from "lucide-react";

import {
  getActiveProject,
  loadProjects,
  setActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";
import { getProjectResumeAction } from "@/features/projects/projectProductivity";

type PrimaryPath = {
  title: string;
  to: string;
  tone: "launch" | "import" | "template";
  Icon: React.ComponentType<{ className?: string }>;
};

type SpecialistTool = {
  title: string;
  to: string;
};

const primaryPaths: PrimaryPath[] = [
  {
    title: "Start a new project",
    to: "/app/projects/new",
    tone: "launch",
    Icon: PlusCircle,
  },
  {
    title: "Import a brief",
    to: "/app/tools/import-intake",
    tone: "import",
    Icon: Import,
  },
  {
    title: "Browse architecture starters",
    to: "/app/tools/templates",
    tone: "template",
    Icon: LayoutTemplate,
  },
];

const specialistTools: SpecialistTool[] = [
  { title: "Guided Project", to: "/app/tools/discovery" },
  { title: "Proposal", to: "/app/tools/proposal" },
  { title: "Products", to: "/app/tools/catalog" },
  { title: "Video Wall", to: "/app/tools/video-wall" },
  { title: "Competitor Compare", to: "/app/tools/compare" },
  { title: "About Wingman", to: "/app/about-wingman" },
];

function formatUpdatedAt(value?: string): string {
  if (!value) return "Recently updated";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const projectsVersion = React.useSyncExternalStore(
    subscribeProjects,
    () => "projects-version",
    () => "projects-version",
  );

  const recentProjects = React.useMemo(() => {
    void projectsVersion;
    return loadProjects().slice(0, 5);
  }, [projectsVersion]);

  const activeProject = React.useMemo(() => {
    void projectsVersion;
    return getActiveProject() ?? null;
  }, [projectsVersion]);

  const activeResumeAction = React.useMemo(
    () => (activeProject ? getProjectResumeAction(activeProject) : null),
    [activeProject],
  );

  return (
    <div className="wm-page wm-dashboard-page">
      <section className="wm-section wm-dashboard-page__mission-strip">
        <div className="wm-dashboard-page__mission-head">
          <div className="wm-dashboard-page__mission-copy">
            <div className="wm-kicker">Mission Control</div>
            <h1 className="wm-dashboard-page__mission-title">What do you want to move forward today?</h1>
          </div>

          <div className="wm-dashboard-page__mission-actions">
            {activeProject && activeResumeAction ? (
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={() => {
                  setActiveProjectId(activeProject.id);
                  navigate(activeResumeAction.to);
                }}
              >
                Resume {activeResumeAction.shortLabel}
              </button>
            ) : (
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={() => navigate("/app/projects/new")}
              >
                Start New Project
              </button>
            )}

            <button
              type="button"
              className="wm-btn"
              onClick={() => navigate("/app/tools/import-intake")}
            >
              Import Customer Brief
            </button>

            <button
              type="button"
              className="wm-btn"
              onClick={() => navigate("/app/projects")}
            >
              Open Projects
            </button>
          </div>
        </div>

        {activeProject ? (
          <article className="wm-dashboard-page__active-card">
            <div className="wm-dashboard-page__active-top">
              <div>
                <div className="wm-kicker">Active Project</div>
                <div className="wm-title-lg">{activeProject.name}</div>
              </div>
              <Link
                to={`/app/projects/${encodeURIComponent(activeProject.id)}`}
                className="wm-btn"
                onClick={() => setActiveProjectId(activeProject.id)}
              >
                Open workspace
              </Link>
            </div>

            <div className="wm-dashboard-page__active-meta">
              <span>{activeProject.customer || "Customer not set"}</span>
              <span>{activeProject.site || activeProject.roomName || "Site not set"}</span>
              <span>{formatUpdatedAt(activeProject.updatedAt)}</span>
            </div>

            {activeResumeAction ? (
              <div className="wm-dashboard-page__active-next">
                Next best move: {activeResumeAction.label}
              </div>
            ) : null}
          </article>
        ) : (
          <div className="wm-dashboard-page__empty-banner">
            <History className="h-4 w-4" />
            <span>No active project selected. Use the launcher or pick up a recent opportunity below.</span>
          </div>
        )}
      </section>

      <div className="wm-dashboard-page__main-grid">
        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Start paths</h2>
            </div>
          </div>

          <div className="wm-dashboard-page__path-grid">
            {primaryPaths.map(({ title, to, tone, Icon }) => (
              <Link key={title} to={to} className={`wm-dashboard-page__path-card wm-dashboard-page__path-card--${tone}`}>
                <div className="wm-dashboard-page__path-top">
                  <div className="wm-dashboard-card__icon">
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div className="wm-title-md">{title}</div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="wm-dashboard-page__right-rail">
          <section className="wm-section wm-section--tone-cyan">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Pick up work</h2>
              </div>
            </div>

            {recentProjects.length > 0 ? (
              <div className="wm-dashboard-page__resume-list">
                {recentProjects.map((project) => {
                  const resumeAction = getProjectResumeAction(project);
                  return (
                    <Link
                      key={project.id}
                      to={`/app/projects/${encodeURIComponent(project.id)}`}
                      className="wm-dashboard-page__resume-card"
                      onClick={() => setActiveProjectId(project.id)}
                    >
                      <div className="wm-dashboard-page__resume-head">
                        <div className="wm-title-md">{project.name}</div>
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="wm-body-sm">
                        {[project.customer || "Wingman project", project.site || project.roomName || ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="wm-dashboard-page__resume-meta">
                        <span>{resumeAction.shortLabel}</span>
                        <span>{formatUpdatedAt(project.updatedAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="wm-dashboard-empty">
                <History className="h-4 w-4" />
                <div className="wm-body">No recent projects yet.</div>
              </div>
            )}
          </section>

          <section className="wm-section wm-section--tone-amber">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Specialist tools</h2>
              </div>
            </div>

            <div className="wm-dashboard-page__tool-cloud">
              {specialistTools.map((tool) => (
                <Link key={tool.title} to={tool.to} className="wm-chip wm-chip--tool-core">
                  {tool.title}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="wm-section wm-section--tone-indigo">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Core workflow</h2>
          </div>
        </div>

        <div className="wm-dashboard-page__workflow-strip">
          <Link to="/app/tools/discovery" className="wm-dashboard-page__workflow-pill">
            <ClipboardList className="h-4 w-4" />
            <span>Guided Project</span>
          </Link>
          <Link to="/app/tools/templates" className="wm-dashboard-page__workflow-pill">
            <LayoutTemplate className="h-4 w-4" />
            <span>Architecture</span>
          </Link>
          <Link to="/app/tools/catalog" className="wm-dashboard-page__workflow-pill">
            <MonitorSmartphone className="h-4 w-4" />
            <span>Products</span>
          </Link>
          <Link to="/app/tools/proposal" className="wm-dashboard-page__workflow-pill">
            <FileText className="h-4 w-4" />
            <span>Proposal</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
