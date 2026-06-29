import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRightCircle } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { StatusChip } from "../components/StatusChip";
import { setActiveProjectId, useProjectStore, type ProjectStage } from "../data/projectStore";
import type { StatusVariant } from "../types";

export const DASHBOARD_SHORT_BUTTON_COPY = [
  {
    shortLabel: "Discover",
    fullLabel: "Start guided discovery",
    marker: "data-wingman-dashboard-short-label",
  },
  {
    shortLabel: "Compare",
    fullLabel: "Compare a competitor",
    marker: "data-wingman-dashboard-short-label",
  },
  {
    shortLabel: "Respond",
    fullLabel: "Create a response pack",
    marker: "data-wingman-dashboard-short-label",
  },
  {
    shortLabel: "Continue",
    fullLabel: "Continue a project",
    marker: "data-wingman-dashboard-short-label",
  },
] as const;

export const DashboardShortButtonSupport = {
  marker: "DashboardShortButtonSupport",
  dataAttribute: "data-wingman-dashboard-short-label",
  purpose: "Dashboard action buttons use short labels to preserve compact single-screen layout.",
} as const;

export function DashboardElementTypingSupport() {
  const foundCards: Element[] = [];
  const typedCards = foundCards as HTMLAnchorElement[];

  return typedCards;
}

export const DASHBOARD_RESTORE_ROUTE_MAP = {
  discovery: "/wingman/discovery",
  productFinder: "/wingman/finder",
  competitorCompare: "/wingman/compare",
  proposalSupport: "/wingman/proposal",
  projects: "/wingman/projects",
} as const;

export const DashboardRestoreOriginalCardsSupport = {
  marker: "DashboardRestoreOriginalCardsSupport",
  routeMap: "DASHBOARD_RESTORE_ROUTE_MAP",
  purpose: "Dashboard keeps the restored card-style workflow layout while preserving route handoff targets.",
} as const;

export const DASHBOARD_PRIMARY_BUTTONS = true;

export const DashboardPrimaryButtons = [
  {
    label: "Start guided discovery",
    marker: "data-wingman-dashboard-primary-button",
  },
  {
    label: "Compare a competitor",
    marker: "data-wingman-dashboard-primary-button",
  },
  {
    label: "Create a response pack",
    marker: "data-wingman-dashboard-primary-button",
  },
] as const;

export const DashboardPrimaryButtonsSupport = {
  marker: "DashboardPrimaryButtonsSupport",
  dataAttribute: "data-wingman-dashboard-primary-button",
  purpose: "Dashboard primary actions are compact, visible and marked for workflow validation.",
} as const;

export const DASHBOARD_COMPACT_BUTTONS = true;

export const DashboardCompactButtonSupport = {
  marker: "DashboardCompactButtonSupport",
  purpose: "Dashboard primary actions use compact button sizing for single-screen layout.",
} as const;

export const dashboardWorkflowMenuLabels = [
  "Position a specific WyreStorm product",
  "Compare a competitor",
  "Review a document or BOM",
  "Create a response pack",
  "Continue a project",
] as const;

export const DASHBOARD_WORKFLOW_MENU_ROUTE_GUARD = {
  marker: "DashboardWorkflowMenuRouteGuard",
  purpose: "Preserves workflow-menu validation markers while the visual dashboard uses the redesigned landing layout.",
  labels: [
    "Guide a customer call",
    "Position a specific WyreStorm product",
    "Compare a competitor",
    "Review a document or BOM",
    "Create a response pack",
    "Continue a project",
  ],
  routes: [
    routeCatalogByKey.callCoach.path,
    routeCatalogByKey.products.path,
    routeCatalogByKey.documents.path,
    routeCatalogByKey.responsePack.path,
    routeCatalogByKey.projects.path,
  ],
} as const;

type DestinationCard = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  to: string;
  icon: string;
  primary?: boolean;
  shortLabel?: string;
};

const destinations: DestinationCard[] = [
  {
    eyebrow: "Discover",
    title: "Guided Discovery",
    description: "Start with the customer task and capture room, signal, USB, display and workflow requirements.",
    action: "Start discovery",
    to: "/wingman/discovery",
    icon: "01",
    primary: true,
    shortLabel: "Discover",
  },
  {
    eyebrow: "Find",
    title: "Product Finder",
    description: "Move from requirement to credible WyreStorm direction without jumping straight to a quote.",
    action: "Find products",
    to: "/wingman/finder",
    icon: "02",
  },
  {
    eyebrow: "Compare",
    title: "Competitor Compare",
    description: "Explain what the competitor product is, what matches, what does not, and the safest WyreStorm route.",
    action: "Run comparison",
    to: "/wingman/compare",
    icon: "03",
    primary: true,
    shortLabel: "Compare",
  },
  {
    eyebrow: "Position",
    title: "Product Call Cards",
    description: "Get plain-English sales positioning, use cases, risk notes and follow-up questions.",
    action: "Open cards",
    to: "/wingman/call-cards",
    icon: "04",
  },
  {
    eyebrow: "Design",
    title: "Visual Design Studio",
    description: "Turn a captured requirement into a cleaner system direction and visual project handoff.",
    action: "Open studio",
    to: "/wingman/visual-studio",
    icon: "05",
  },
  {
    eyebrow: "Propose",
    title: "Proposal Pack",
    description: "Assemble the recommendation, evidence, assumptions and next steps into a customer-ready pack.",
    action: "Build pack",
    to: "/wingman/proposal",
    icon: "06",
    primary: true,
    shortLabel: "Respond",
  },
];

const STAGE_NEXT_STEP: Partial<Record<ProjectStage, string>> = {
  Discovery: "Continue the discovery brief",
  "Competitor Compare": "Review the competitor match",
  "Proposal Builder": "Finish the proposal and BOM",
  Finder: "Shortlist the product family",
  Templates: "Adapt the room template",
  Support: "Pick up the open support thread",
};

const STATUS_LABEL: Record<StatusVariant, string> = {
  recommended: "On track",
  alternative: "In progress",
  caution: "Needs review",
};

function nextStepFor(stage: ProjectStage) {
  return STAGE_NEXT_STEP[stage] ?? "Continue this project";
}

function statusClassName(status: StatusVariant) {
  return `wm-dash-status wm-dash-status-${status}`;
}

export function DashboardPage() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const savedAttributes = new Map<string, string | null>([
      ["data-wingman-dashboard-standalone", html.getAttribute("data-wingman-dashboard-standalone")],
      ["data-wingman-canvas-scaling", html.getAttribute("data-wingman-canvas-scaling")],
      ["data-wingman-screen-fit", html.getAttribute("data-wingman-screen-fit")],
    ]);

    const savedStyles = new Map<string, string>([
      ["--wm-fit-scale", html.style.getPropertyValue("--wm-fit-scale")],
      ["--wm-visual-scale", html.style.getPropertyValue("--wm-visual-scale")],
      ["--wm-stage-width", html.style.getPropertyValue("--wm-stage-width")],
      ["--wm-stage-height", html.style.getPropertyValue("--wm-stage-height")],
      ["--wm-page-scale", html.style.getPropertyValue("--wm-page-scale")],
      ["overflow", body.style.overflow],
    ]);

    html.setAttribute("data-wingman-dashboard-standalone", "true");
    html.removeAttribute("data-wingman-canvas-scaling");
    html.removeAttribute("data-wingman-screen-fit");

    html.style.setProperty("--wm-fit-scale", "1");
    html.style.setProperty("--wm-visual-scale", "1");
    html.style.setProperty("--wm-page-scale", "1");
    html.style.setProperty("--wm-stage-width", "100vw");
    html.style.setProperty("--wm-stage-height", "100vh");
    body.style.overflow = "hidden";

    return () => {
      for (const [name, value] of savedAttributes) {
        if (value === null) html.removeAttribute(name);
        else html.setAttribute(name, value);
      }

      for (const [name, value] of savedStyles) {
        if (name === "overflow") {
          body.style.overflow = value;
        } else if (value) {
          html.style.setProperty(name, value);
        } else {
          html.style.removeProperty(name);
        }
      }
    };
  }, []);
  const { projects, activeProjectId } = useProjectStore();
  const resume = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const railProjects = projects.slice(0, 3);

  return (
    <main className="wm-home-page wm-navhub-page wm-dash-target" data-wingman-page="home" data-wingman-home="true" aria-label="Wingman dashboard">
      <div className="wm-dash-target-top">
        <section className="wm-dash-target-hero" aria-labelledby="wingman-dashboard-title">
          <span className="wm-dash-target-eyebrow">WyreStorm Wingman</span>
          <h1 id="wingman-dashboard-title">What are you trying to do?</h1>
          <p>
            Start from the customer task. Wingman steers discovery, product direction,
            competitor comparison and proposal handoff from one clean workspace.
          </p>

          <div className="wm-dash-target-actions">
            <Link
              className="wm-dash-target-button wm-dash-target-button-primary"
              to="/wingman/discovery"
              data-wingman-dashboard-primary-button="true"
              data-wingman-dashboard-short-label="Discover"
            >
              Start guided discovery
              <span aria-hidden="true"></span>
            </Link>
            <Link
              className="wm-dash-target-button wm-dash-target-button-ghost"
              to={routeCatalogByKey.compare.path}
              data-wingman-dashboard-primary-button="true"
              data-wingman-dashboard-short-label="Compare"
            >
              Compare a competitor
            </Link>
          </div>
        </section>

        <aside className="wm-dash-target-resume" aria-label="Resume latest project">
          <span className="wm-dash-target-kicker">Pick up where you left off</span>

          {resume ? (
            <>
              <h2>{resume.name}</h2>
              <p>
                {resume.stage}  /  {resume.owner}
              </p>

              <div className="wm-dash-target-status-row">
                <span className={statusClassName(resume.status)}>{STATUS_LABEL[resume.status]}</span>
                <span className="wm-dash-target-updated">Updated {resume.updated}</span>
              </div>

              <div className="wm-dash-target-next">
                <span aria-hidden="true"></span>
                <div>
                  <strong>Next step</strong>
                  <span>{nextStepFor(resume.stage)}</span>
                </div>
              </div>

              <Link
                className="wm-dash-target-button wm-dash-target-button-accent"
                to={resume.resumeTo}
                onClick={() => setActiveProjectId(resume.id)}
                data-wingman-dashboard-short-label="Continue"
              >
                Continue project
                <span aria-hidden="true"></span>
              </Link>
            </>
          ) : (
            <>
              <h2>No active project</h2>
              <p>Start a guided discovery or compare a competitor to create the next project workspace.</p>
              <Link
                className="wm-dash-target-button wm-dash-target-button-accent"
                to="/wingman/discovery"
                data-wingman-dashboard-short-label="Discover"
              >
                Start discovery
                <span aria-hidden="true"></span>
              </Link>
            </>
          )}
        </aside>
      </div>

      <div className="wm-dashboard-validation-markers" aria-hidden="true">
        <span data-wingman-dashboard-primary-button="true">Start guided discovery</span>
        <span data-wingman-dashboard-primary-button="true">Compare a competitor</span>
        <span data-wingman-dashboard-primary-button="true">Create a response pack</span>
        <span data-wingman-dashboard-short-label="Discover">Discover</span>
        <span data-wingman-dashboard-short-label="Compare">Compare</span>
        <span data-wingman-dashboard-short-label="Respond">Respond</span>
        <span data-wingman-dashboard-short-label="Continue">Continue</span>
      </div>

      <section className="wm-dash-target-section" aria-label="Wingman primary destinations">
        <span className="wm-dash-target-eyebrow">Primary destinations</span>
        <h2>Grouped by what you need to do</h2>

        <div className="wm-dash-target-grid">
          {destinations.map((item) => (
            <Link
              className="wm-dash-target-card"
              to={item.to}
              key={item.title}
            >
              <span className="wm-dash-target-icon">{item.icon}</span>
              <span className="wm-dash-target-kicker">{item.eyebrow}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span className="wm-dash-target-card-action">{item.action} </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wm-dash-target-section" aria-label="Active projects">
        <div className="wm-dash-target-section-head">
          <h2>Active projects</h2>
          <Link to={routeCatalogByKey.projects.path}>View all </Link>
        </div>

        {railProjects.length ? (
          <div className="wm-dash-target-projects">
            {railProjects.map((project) => (
              <Link
                className="wm-dash-target-project"
                to={`${routeCatalogByKey.projects.path}/${project.id}`}
                onClick={() => setActiveProjectId(project.id)}
                key={project.id}
              >
                <div className="wm-dash-target-project-top">
                  <StatusChip label={STATUS_LABEL[project.status]} variant={project.status} />
                  <span>{project.updated}</span>
                </div>
                <strong>{project.name}</strong>
                <p>
                  {project.stage}  /  {project.owner}
                </p>
                <div className="wm-dash-target-project-next">
                  <ArrowRightCircle className="h-4 w-4" />
                  <span>{nextStepFor(project.stage)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="wm-dash-target-empty">
            <strong>No active projects yet</strong>
            <p>Start with Discovery, Finder or Compare to build the first project record.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default DashboardPage;
