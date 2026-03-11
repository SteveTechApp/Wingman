import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  LayoutTemplate,
  Boxes,
  FileText,
  MonitorSmartphone,
  Building2,
  GraduationCap,
  Hotel,
  Store,
  FolderOpen,
  PlusCircle,
  History,
} from "lucide-react";
import {
  getActiveProject,
  loadProjects,
  setActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";
import { getProjectResumeAction } from "@/features/projects/projectProductivity";

type WorkflowCard = {
  eyebrow: string;
  title: string;
  description: string;
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type UtilityCard = {
  title: string;
  description: string;
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const workflowCards: WorkflowCard[] = [
  {
    eyebrow: "Guided Project",
    title: "Capture requirements",
    description:
      "Capture room context, sources, endpoints, and user needs before design choices start.",
    to: "/app/tools/discovery",
    Icon: ClipboardList,
  },
  {
    eyebrow: "Architecture",
    title: "Choose signal path",
    description:
      "Choose transport, topology, and extension strategy around the application and distances.",
    to: "/app/tools/templates",
    Icon: LayoutTemplate,
  },
  {
    eyebrow: "Products",
    title: "Build the solution",
    description:
      "Turn the chosen architecture into core WyreStorm platforms and a starter BOM.",
    to: "/app/tools/catalog",
    Icon: Boxes,
  },
  {
    eyebrow: "Proposal",
    title: "Move to output",
    description:
      "Package commercial logic and project detail into customer-ready output.",
    to: "/app/tools/proposal",
    Icon: FileText,
  },
];

const utilityCards: UtilityCard[] = [
  {
    title: "About Wingman",
    description:
      "Learn how Wingman supports sales tools, project building, and guided solution workflows.",
    to: "/app/about-wingman",
    Icon: FolderOpen,
  },
  {
    title: "Video Wall",
    description: "Plan LCD and LED wall workflows, processing, and sizing.",
    to: "/app/tools/video-wall",
    Icon: MonitorSmartphone,
  },
  {
    title: "Corporate",
    description: "Open meeting room and boardroom template starters.",
    to: "/app/tools/templates?market=corporate",
    Icon: Building2,
  },
  {
    title: "Education",
    description: "Open classroom, lecture, and campus AV design starters.",
    to: "/app/tools/templates?market=education",
    Icon: GraduationCap,
  },
  {
    title: "Hospitality",
    description: "Open hospitality and venue-led room design starters.",
    to: "/app/tools/templates?market=hospitality",
    Icon: Hotel,
  },
  {
    title: "Retail",
    description: "Open signage and customer-facing AV starters.",
    to: "/app/tools/templates?market=retail",
    Icon: Store,
  },
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

  // Stable primitive snapshot only.
  const projectsVersion = React.useSyncExternalStore(
    subscribeProjects,
    () => "projects-version",
    () => "projects-version",
  );

  const recentProjects = React.useMemo(() => {
    void projectsVersion;
    return loadProjects().slice(0, 4);
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
      <section className="wm-hero">
        <div className="wm-dashboard-page__hero-shell">
          <div className="wm-grid wm-hero__content wm-dashboard-page__hero-content">
            <div className="wm-title-xl wm-dashboard-page__hero-title">
              Turn AV requirements into proposal-ready system designs.
            </div>

            <div className="wm-body wm-dashboard-page__hero-body">
              Wingman helps sales and pre-sales teams capture room requirements,
              understand the physical dynamics of the space, select the right
              WyreStorm architecture, and move opportunities toward
              proposal-ready output.
            </div>
          </div>

          <div className="wm-dashboard-page__hero-panel">
            <div className="wm-hero-actions wm-dashboard-page__hero-actions">
              <button
                type="button"
                onClick={() => navigate("/app/projects/new")}
                className="wm-btn wm-btn-primary"
              >
                <PlusCircle className="h-4 w-4" />
                Start New Project
              </button>

              {activeProject && activeResumeAction ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveProjectId(activeProject.id);
                    navigate(activeResumeAction.to);
                  }}
                  className="wm-btn"
                >
                  Resume {activeResumeAction.shortLabel}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => navigate("/app/tools/discovery")}
                className="wm-btn"
              >
                Open Guided Project
              </button>

              <button
                type="button"
                onClick={() => navigate("/app/projects")}
                className="wm-btn"
              >
                Build Projects
              </button>
            </div>

            <div
              className="wm-hero-tools wm-dashboard-page__hero-tools"
              aria-label="Quick tools"
            >
              <Link to="/app/tools/discovery" className="wm-chip wm-chip--tool-core">
                Guided Project
              </Link>
              <Link to="/app/tools/templates" className="wm-chip wm-chip--tool-core">
                Architecture
              </Link>
              <Link to="/app/tools/catalog" className="wm-chip wm-chip--tool-core">
                Products
              </Link>
              <Link to="/app/tools/proposal" className="wm-chip wm-chip--tool-core">
                Proposal
              </Link>
              <Link to="/app/tools/video-wall" className="wm-chip wm-chip--tool-core">
                Video Wall
              </Link>
              <Link
                to="/app/tools/templates?market=corporate"
                className="wm-chip wm-chip--tool-market"
              >
                Corporate
              </Link>
              <Link
                to="/app/tools/templates?market=education"
                className="wm-chip wm-chip--tool-market"
              >
                Education
              </Link>
              <Link
                to="/app/tools/templates?market=hospitality"
                className="wm-chip wm-chip--tool-market"
              >
                Hospitality
              </Link>
              <Link
                to="/app/tools/templates?market=retail"
                className="wm-chip wm-chip--tool-market"
              >
                Retail
              </Link>
              <Link to="/app/about-wingman" className="wm-chip wm-chip--tool-info">
                About Wingman
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="wm-dashboard-layout">
        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Core sales tools and project-building workflow</h2>
              <p>
                Use these tools to support sales activity, build projects, and
                move from Guided Project through to proposal-ready output.
              </p>
            </div>
          </div>

          <div className="wm-grid-cards wm-dashboard-page__workflow-grid">
            {workflowCards.map(({ eyebrow, title, description, to, Icon }) => (
              <Link key={title} to={to} className="wm-dashboard-card">
                <div className="wm-dashboard-card__top">
                  <div className="wm-dashboard-card__icon">
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </div>

                <div className="wm-kicker">{eyebrow}</div>
                <div className="wm-title-lg wm-dashboard-page__workflow-title">
                  {title}
                </div>
                <div className="wm-body wm-dashboard-page__workflow-body">
                  {description}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="wm-dashboard-side">
          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Recent projects</h2>
                <p>Pick up where you left off and keep project momentum moving.</p>
              </div>
            </div>

            {recentProjects.length > 0 ? (
              <div className="wm-grid wm-dashboard-page__stack-tight">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/app/projects/${encodeURIComponent(project.id)}`}
                    className="wm-dashboard-item"
                    onClick={() => setActiveProjectId(project.id)}
                  >
                    <div className="wm-dashboard-item__head">
                      <div className="wm-title-md wm-dashboard-page__item-title">
                        {project.name}
                      </div>
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div className="wm-body-sm">
                      {[project.customer || "Wingman project", project.site || project.roomName || ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <div className="wm-body-sm">{formatUpdatedAt(project.updatedAt)}</div>
                    <div className="wm-body-sm" style={{ opacity: 0.8 }}>
                      {getProjectResumeAction(project).label}
                    </div>
                  </Link>
                ))}

                <button
                  type="button"
                  className="wm-btn wm-dashboard-page__open-all"
                  onClick={() => navigate("/app/projects")}
                >
                  Open all projects
                </button>
              </div>
            ) : (
              <div className="wm-dashboard-empty">
                <History className="h-4 w-4" />
                <div className="wm-body">No recent projects yet.</div>
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  onClick={() => navigate("/app/projects/new")}
                >
                  Create first project
                </button>
              </div>
            )}
          </section>

          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Quick access</h2>
                <p>Jump to template and specialist workflows with one click.</p>
              </div>
            </div>

            <div className="wm-grid wm-dashboard-page__stack-tight">
              {utilityCards.map(({ title, description, to, Icon }) => (
                <Link key={title} to={to} className="wm-dashboard-item">
                  <div className="wm-dashboard-item__head">
                    <div className="wm-dashboard-card__icon">
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="wm-title-md wm-dashboard-page__item-title">
                    {title}
                  </div>
                  <div className="wm-body-sm">{description}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}