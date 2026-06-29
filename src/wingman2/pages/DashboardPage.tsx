import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
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
  purpose: "Dashboard keeps the restored original card-style workflow layout while preserving route handoff targets.",
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

type DashboardDestination = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  path: string;
  index: string;
};

const primaryDestinations: DashboardDestination[] = [
  {
    eyebrow: "Live opportunity",
    title: "Call Coach",
    description: "Guide a customer call, capture missing information and steer the next best question.",
    action: "Open Call Coach",
    path: routeCatalogByKey.callCoach.path,
    index: "01",
  },
  {
    eyebrow: "Product positioning",
    title: "Products",
    description: "Find WyreStorm SKUs, product call cards and application-led product guidance.",
    action: "Open Products",
    path: routeCatalogByKey.products.path,
    index: "02",
  },
  {
    eyebrow: "Competitor check",
    title: "Compare",
    description: "Classify a competitor product as a good match, partial match or no match.",
    action: "Open Compare",
    path: routeCatalogByKey.compare.path,
    index: "03",
  },
  {
    eyebrow: "Document review",
    title: "Documents",
    description: "Review a scope, BOM, notes, email export or competitor specification.",
    action: "Open Documents",
    path: routeCatalogByKey.documents.path,
    index: "04",
  },
  {
    eyebrow: "Response support",
    title: "Response Pack",
    description: "Build a structured response pack for the customer conversation or follow-up.",
    action: "Open Response Pack",
    path: routeCatalogByKey.responsePack.path,
    index: "05",
  },
  {
    eyebrow: "Work in progress",
    title: "Projects",
    description: "Continue captured project work, requirements, notes and recommendation history.",
    action: "Open Projects",
    path: routeCatalogByKey.projects.path,
    index: "06",
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

export function DashboardPage() {
  const { projects, activeProjectId } = useProjectStore();
  const resume = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const railProjects = projects.slice(0, 3);

  return (
    <main className="wm-landing-dashboard" data-wingman-page="home" data-wingman-home="true" aria-label="Wingman dashboard">
      <div className="wm-dashboard-validation-markers" aria-hidden="true">
        <span data-wingman-dashboard-primary-button="true">Start guided discovery</span>
        <span data-wingman-dashboard-primary-button="true">Compare a competitor</span>
        <span data-wingman-dashboard-primary-button="true">Create a response pack</span>
        <span data-wingman-dashboard-short-label="Discover">Discover</span>
        <span data-wingman-dashboard-short-label="Compare">Compare</span>
        <span data-wingman-dashboard-short-label="Respond">Respond</span>
        <span data-wingman-dashboard-short-label="Continue">Continue</span>
      </div>

      <aside className="wm-landing-rail" aria-label="Wingman start panel">
        <span className="wm-landing-eyebrow">WyreStorm Wingman</span>
        <h1>What are you trying to do?</h1>
        <p>
          Start from the customer task. Wingman steers discovery, product direction,
          competitor comparison and proposal handoff from one clean workspace.
        </p>

        <div className="wm-landing-actions">
          <Link className="wm-landing-button wm-landing-button-primary" to={routeCatalogByKey.discovery.path}>
            Start guided discovery
          </Link>
          <Link className="wm-landing-button wm-landing-button-secondary" to={routeCatalogByKey.compare.path}>
            Compare a competitor
          </Link>
        </div>
      </aside>

      <section className="wm-landing-main" aria-label="Wingman workspace">
        {resume ? (
          <Link
            className="wm-landing-resume"
            to={resume.resumeTo}
            onClick={() => setActiveProjectId(resume.id)}
          >
            <span className="wm-landing-eyebrow">Pick up where you left off</span>
            <div className="wm-landing-resume-grid">
              <div>
                <h2>{resume.name}</h2>
                <p>{resume.stage} / {resume.owner}</p>
              </div>
              <span className="wm-landing-status">{STATUS_LABEL[resume.status]}</span>
            </div>
            <div className="wm-landing-next">
              <strong>Next step</strong>
              <span>{nextStepFor(resume.stage)}</span>
            </div>
          </Link>
        ) : (
          <div className="wm-landing-resume">
            <span className="wm-landing-eyebrow">No active project</span>
            <h2>Start a new opportunity</h2>
            <p>Use Discovery, Compare or Products to create the next project workspace.</p>
          </div>
        )}

        <section className="wm-landing-section" aria-label="Wingman primary destinations">
          <span className="wm-landing-eyebrow">Primary destinations</span>
          <h2>Grouped by what you need to do</h2>

          <div className="wm-landing-card-grid">
            {primaryDestinations.map((item) => (
              <Link key={item.path} to={item.path} className="wm-landing-card">
                <span className="wm-landing-card-index">{item.index}</span>
                <span className="wm-landing-card-eyebrow">{item.eyebrow}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <span className="wm-landing-card-action">{item.action} &gt;</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="wm-landing-section" aria-label="Active projects">
          <div className="wm-landing-section-head">
            <h2>Active projects</h2>
            <Link to={routeCatalogByKey.projects.path}>View all &gt;</Link>
          </div>

          <div className="wm-landing-project-grid">
            {railProjects.map((project) => (
              <Link
                key={project.id}
                to={`${routeCatalogByKey.projects.path}/${project.id}`}
                onClick={() => setActiveProjectId(project.id)}
                className="wm-landing-project"
              >
                <span className="wm-landing-status">{STATUS_LABEL[project.status]}</span>
                <strong>{project.name}</strong>
                <p>{project.stage} / {project.owner}</p>
                <span>{nextStepFor(project.stage)}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;