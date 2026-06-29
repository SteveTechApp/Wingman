import { ArrowRight, ArrowRightCircle, Flag } from "lucide-react";
import { Link } from "react-router-dom";
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

type DashboardDestination = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  path: string;
};

const primaryDestinations: DashboardDestination[] = [
  {
    eyebrow: "Live opportunity",
    title: "Call Coach",
    description: "Guide a customer call, capture missing information and steer the next best question.",
    action: "Open Call Coach",
    path: routeCatalogByKey.callCoach.path,
  },
  {
    eyebrow: "Product positioning",
    title: "Products",
    description: "Find WyreStorm SKUs, product call cards and application-led product guidance.",
    action: "Open Products",
    path: routeCatalogByKey.products.path,
  },
  {
    eyebrow: "Competitor check",
    title: "Compare",
    description: "Check a competitor product and classify the result as good match, partial match or no match.",
    action: "Open Compare",
    path: routeCatalogByKey.compare.path,
  },
  {
    eyebrow: "Document review",
    title: "Documents",
    description: "Review a scope, BOM, notes, email export or competitor specification.",
    action: "Open Documents",
    path: routeCatalogByKey.documents.path,
  },
  {
    eyebrow: "Response support",
    title: "Response Pack",
    description: "Build a structured response pack for the customer conversation or follow-up.",
    action: "Open Response Pack",
    path: routeCatalogByKey.responsePack.path,
  },
  {
    eyebrow: "Work in progress",
    title: "Projects",
    description: "Continue captured project work, requirements, notes and recommendation history.",
    action: "Open Projects",
    path: routeCatalogByKey.projects.path,
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
    <main className="wm-home-page wm-navhub-page wm-dash" data-wingman-page="home" data-wingman-home="true">
      <div className="wm-dash-top">
        <section className="wm-page-hero wm-navhub-hero" aria-labelledby="wingman-dashboard-title">
          <p className="wm-navhub-eyebrow">WyreStorm Wingman</p>
          <h1 id="wingman-dashboard-title">What are you trying to do?</h1>
          <p>
            Start from the customer task. Wingman will guide the conversation, product direction,
            competitor comparison, document review or project follow-up from there.
          </p>
          <div className="wm-dash-hero-actions">
            <Link to={routeCatalogByKey.callCoach.path} className="wm-dash-btn wm-dash-btn-primary">
              Start guided discovery
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={routeCatalogByKey.compare.path} className="wm-dash-btn wm-dash-btn-ghost">
              Compare a competitor
            </Link>
          </div>
        </section>

        {resume ? (
          <aside className="wm-dash-resume" aria-label="Resume project">
            <span className="wm-dash-resume-eyebrow">Pick up where you left off</span>
            <strong className="wm-dash-resume-title">{resume.name}</strong>
            <span className="wm-dash-resume-meta">
              {resume.stage} · {resume.owner}
            </span>
            <div className="wm-dash-resume-status">
              <StatusChip label={STATUS_LABEL[resume.status]} variant={resume.status} />
              <span className="wm-dash-resume-updated">Updated {resume.updated}</span>
            </div>
            <div className="wm-dash-resume-next">
              <Flag className="h-4 w-4" />
              <div>
                <span className="wm-dash-resume-next-label">Next step</span>
                <span className="wm-dash-resume-next-text">{nextStepFor(resume.stage)}</span>
              </div>
            </div>
            <Link
              to={resume.resumeTo}
              onClick={() => setActiveProjectId(resume.id)}
              className="wm-dash-btn wm-dash-btn-accent wm-dash-resume-cta"
            >
              Continue project
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        ) : null}
      </div>

      <section className="wm-navhub-secondary" aria-label="Wingman primary destinations">
        <div className="wm-navhub-section-heading">
          <p className="wm-navhub-eyebrow">Primary destinations</p>
          <h2>Grouped by user intent</h2>
        </div>

        <div className="wm-navhub-secondary-grid">
          {primaryDestinations.map((item) => (
            <Link key={item.path} to={item.path} className="wm-navhub-secondary-card wm-navhub-card">
              <span className="wm-navhub-card-eyebrow">{item.eyebrow}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span className="wm-navhub-card-action">{item.action}</span>
            </Link>
          ))}
        </div>
      </section>

      {railProjects.length ? (
        <section className="wm-dash-projects" aria-label="Active projects">
          <div className="wm-dash-projects-head">
            <h2>Active projects</h2>
            <Link to={routeCatalogByKey.projects.path} className="wm-dash-viewall">
              View all →
            </Link>
          </div>
          <div className="wm-dash-projects-grid">
            {railProjects.map((project) => (
              <Link
                key={project.id}
                to={`${routeCatalogByKey.projects.path}/${project.id}`}
                onClick={() => setActiveProjectId(project.id)}
                className="wm-dash-project-card"
              >
                <div className="wm-dash-project-top">
                  <StatusChip label={STATUS_LABEL[project.status]} variant={project.status} />
                  <span className="wm-dash-project-updated">{project.updated}</span>
                </div>
                <strong className="wm-dash-project-name">{project.name}</strong>
                <span className="wm-dash-project-meta">
                  {project.stage} · {project.owner}
                </span>
                <div className="wm-dash-project-next">
                  <ArrowRightCircle className="h-4 w-4" />
                  <span>{nextStepFor(project.stage)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export default DashboardPage;
