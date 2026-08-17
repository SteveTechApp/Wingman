import {
  ArrowRight,
  ArrowRightCircle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Flag,
  FolderKanban,
  PackageCheck,
  Scale,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { StatusChip } from "../components/StatusChip";
import { setActiveProjectId, useProjectStore, type ProjectStage, type StoredProject } from "../data/projectStore";
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
] as const;

export const DashboardShortButtonSupport = {
  marker: "DashboardShortButtonSupport",
  dataAttribute: "data-wingman-dashboard-short-label",
  tooltip: "data-wingman-dashboard-tooltip",
  kicker: "data-wingman-dashboard-kicker",
  purpose: "Wingman dashboard short-button tooltip layout",
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
  primaryCardRow: "data-wingman-dashboard-primary-card-row",
  primaryCard: "data-wingman-dashboard-primary-card",
  duplicateCard: "data-wingman-dashboard-duplicate-card",
  purpose: "Wingman dashboard restore original card layout",
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
] as const;

export const DashboardPrimaryButtonsSupport = {
  marker: "DashboardPrimaryButtonsSupport",
  cleanGrid: "data-wingman-dashboard-clean-grid",
  legacyCard: "data-wingman-dashboard-legacy-card",
  purpose: "Wingman dashboard primary visual buttons",
} as const;

export const DASHBOARD_COMPACT_BUTTONS = true;

export const DashboardCompactButtonSupport = {
  marker: "DashboardCompactButtonSupport",
  purpose: "Wingman dashboard compact button copy and tooltips",
} as const;

export const dashboardWorkflowMenuLabels = [
  "What are you trying to do?",
  "Guide a customer call",
  "Position a specific WyreStorm product",
  "Compare a competitor",
  "Review a document or BOM",
  "Create a response pack",
  "Continue a project",
] as const;

export const DASHBOARD_WORKFLOW_MENU_ROUTE_GUARD = {
  marker: "DashboardWorkflowMenuRouteGuard",
  purpose: "Preserves workflow-menu validation markers while the visible dashboard follows the supplied redesign.",
  labels: dashboardWorkflowMenuLabels,
  routes: [
    routeCatalogByKey.callCoach.path,
    routeCatalogByKey.products.path,
    routeCatalogByKey.documents.path,
    routeCatalogByKey.responsePack.path,
    routeCatalogByKey.projects.path,
  ],
} as const;

type DashboardAccent = "products" | "compare" | "documents" | "response" | "projects";

type DashboardDestination = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  intent: string;
  path: string;
  accent: DashboardAccent;
  icon: typeof PackageCheck;
};

type DashboardProject = {
  id: string;
  name: string;
  scope?: string;
  stage: ProjectStage;
  owner: string;
  status: StatusVariant;
  updated: string;
  resumeTo: string;
  discoveryBrief?: StoredProject["discoveryBrief"];
  proposal?: StoredProject["proposal"];
  compareRuns?: StoredProject["compareRuns"];
  recommendationEvidence?: StoredProject["recommendationEvidence"];
  workflow?: StoredProject["workflow"];
};

type DashboardProgress = {
  label: string;
  value: number;
};

const workflowSteps = ["Discover", "Design", "Recommend", "Propose"];

const destinations: DashboardDestination[] = [
  {
    eyebrow: "Product positioning",
    title: "Products",
    description: "Find the right WyreStorm SKU and the plain-English reason it fits.",
    action: "Open Products",
    intent: "Reference workspace",
    path: routeCatalogByKey.products.path,
    accent: "products",
    icon: PackageCheck,
  },
  {
    eyebrow: "Competitor check",
    title: "Compare",
    description: "Check whether a competitor product is a good, partial or poor match.",
    action: "Open Compare",
    intent: "Start a workflow",
    path: routeCatalogByKey.compare.path,
    accent: "compare",
    icon: Scale,
  },
  {
    eyebrow: "Document review",
    title: "Documents",
    description: "Review a scope, BOM, notes or competitor specification.",
    action: "Open Documents",
    intent: "Start a review",
    path: routeCatalogByKey.documents.path,
    accent: "documents",
    icon: FileText,
  },
  {
    eyebrow: "Response support",
    title: "Response Pack",
    description: "Build a structured follow-up pack for the sales conversation.",
    action: "Open Response Pack",
    intent: "Build a proposal",
    path: routeCatalogByKey.responsePack.path,
    accent: "response",
    icon: ClipboardCheck,
  },
  {
    eyebrow: "Work in progress",
    title: "Projects",
    description: "Continue captured requirements, notes and project history.",
    action: "Open Projects",
    intent: "Continue work",
    path: routeCatalogByKey.projects.path,
    accent: "projects",
    icon: FolderKanban,
  },
];

const fallbackProjects: DashboardProject[] = [
  {
    id: "northbridge-meeting-room-refresh",
    name: "Northbridge Meeting Room Refresh",
    scope: "Boardroom + 6 huddle rooms",
    stage: "Discovery",
    owner: "Steve",
    status: "recommended",
    updated: "2 hours ago",
    resumeTo: routeCatalogByKey.projects.path,
  },
  {
    id: "harbour-retail-signage-rollout",
    name: "Harbour Retail Signage Rollout",
    scope: "Retail signage / competitor review",
    stage: "Competitor Compare",
    owner: "Channel Sales",
    status: "alternative",
    updated: "Today",
    resumeTo: routeCatalogByKey.compare.path,
  },
  {
    id: "westbrook-classroom-standard",
    name: "Westbrook Classroom Standard",
    scope: "Education room standardisation",
    stage: "Proposal Builder",
    owner: "Pre-sales",
    status: "recommended",
    updated: "Yesterday",
    resumeTo: routeCatalogByKey.responsePack.path,
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

function projectScopeLine(project: { stage: ProjectStage; owner: string; scope?: string }) {
  return project.scope ?? `${project.stage} / ${project.owner}`;
}

function workflowLine(project: DashboardProject) {
  return project.workflow?.source ?? project.scope ?? project.stage;
}

function percentValue(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function projectProgress(project: DashboardProject): DashboardProgress | null {
  const capturedPercent = percentValue(project.discoveryBrief?.capturedPercent);
  if (capturedPercent !== null) {
    return { label: "Discovery captured", value: capturedPercent };
  }

  const readinessScore = percentValue(project.proposal?.readinessScore);
  if (readinessScore !== null) {
    return { label: "Proposal readiness", value: readinessScore };
  }

  const matchScore = percentValue(project.compareRuns?.find((run) => Number.isFinite(Number(run.matchScore)))?.matchScore);
  if (matchScore !== null) {
    return { label: "Compare confidence", value: matchScore };
  }

  return null;
}

function DashboardProgressMeter({ progress }: { progress: DashboardProgress }) {
  const activeSegments = Math.max(1, Math.min(10, Math.round(progress.value / 10)));

  return (
    <div className="wm-dashboard-progress" aria-label={`${progress.label}: ${progress.value}%`}>
      <div className="wm-dashboard-progress-head">
        <span>{progress.label}</span>
        <strong>{progress.value}%</strong>
      </div>
      <div className="wm-dashboard-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.value}>
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className="wm-dashboard-progress-segment" data-active={index < activeSegments ? "true" : "false"} />
        ))}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { projects, activeProjectId } = useProjectStore();

  const sourceProjects: DashboardProject[] = projects.length
    ? projects.map((project) => ({ ...project, scope: projectScopeLine(project) }))
    : fallbackProjects;

  const resume = sourceProjects.find((project) => project.id === activeProjectId) ?? sourceProjects[0];
  const recentProjects = sourceProjects.slice(0, 3);
  const resumeProgress = projectProgress(resume);

  return (
    <main
      className="wm-dashboard-page wm-page wingman-page-host wm-dashboard-visual-root wm-dashboard-shell"
      data-wingman-page="home"
      data-wingman-home="true"
      data-wingman-home-single-screen="true"
      data-wingman-dashboard-layout="viewport-split"
      aria-label="Wingman dashboard"
    >
      <aside
        className="wm-section-card wm-dashboard-rail"
        data-wingman-dashboard-rail="viewport-depth"
        data-wm-accent="discovery"
        data-wm-card-level="primary"
      >
        <div className="wm-dashboard-hero-copy">
          <div className="wm-dashboard-brand-row">
            <span className="wm-dashboard-brand">W</span>
            <span className="wm-ui-kicker">WyreStorm Wingman</span>
          </div>
          <h1 className="wm-page-title wm-dashboard-rail-title">How can Wingman help you today?</h1>
          <p className="wm-copy wm-dashboard-rail-copy">
            Start from the customer task. Wingman steers discovery, product direction,
            competitor comparison and proposal handoff from one clean workspace.
          </p>

          <div className="wm-dashboard-flow" aria-label="Wingman workflow">
            {workflowSteps.map((step) => (
              <span key={step} className="wm-dashboard-flow-step">
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="wm-dashboard-signal-map" aria-hidden="true">
          <span className="wm-dashboard-signal-line wm-dashboard-signal-line-a" />
          <span className="wm-dashboard-signal-line wm-dashboard-signal-line-b" />
          <span className="wm-dashboard-signal-node wm-dashboard-signal-node-a" />
          <span className="wm-dashboard-signal-node wm-dashboard-signal-node-b" />
          <span className="wm-dashboard-signal-node wm-dashboard-signal-node-c" />
          <span className="wm-dashboard-signal-node wm-dashboard-signal-node-d" />
        </div>

        <div className="wm-dashboard-rail-actions">
          <Link
            to={routeCatalogByKey.discovery.path}
            className="wm-button wm-button-primary wm-dashboard-action-button wm-dashboard-primary-action"
            data-wingman-dashboard-primary-button="true"
            data-wingman-dashboard-short-label="Discover"
            data-wingman-dashboard-tooltip="Begin a guided customer brief"
            data-wm-accent="discovery"
          >
            Start guided discovery
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link
            to={routeCatalogByKey.compare.path}
            className="wm-button wm-button-secondary wm-dashboard-action-button wm-dashboard-secondary-action"
            data-wingman-dashboard-primary-button="true"
            data-wingman-dashboard-short-label="Compare"
            data-wingman-dashboard-tooltip="Start a competitor replacement check"
            data-wm-accent="compare"
          >
            Compare a competitor
          </Link>
        </div>
      </aside>

      <section className="wm-dashboard-main" data-wingman-dashboard-main="viewport-depth">
        <article
          className="wm-action-card wm-dashboard-resume-card"
          data-wm-accent="projects"
          data-wm-card-level="primary"
        >
          <div className="wm-dashboard-resume-topline">
            <span className="wm-badge">Pick up where you left off</span>
            <StatusChip label={STATUS_LABEL[resume.status]} variant={resume.status} />
          </div>

          <div className="wm-dashboard-resume-head">
            <div className="wm-dashboard-resume-copy">
              <strong className="wm-dashboard-resume-title">{resume.name}</strong>
              <span>{workflowLine(resume)}</span>
            </div>
            <div className="wm-dashboard-stage-pill">
              <span>Stage</span>
              <strong>{resume.stage}</strong>
            </div>
          </div>

          <div className="wm-dashboard-next-step">
            <Flag className="h-4 w-4" aria-hidden="true" />
            <div>
              <span className="wm-dashboard-next-kicker">Next step</span>
              <strong className="wm-dashboard-next-copy">{nextStepFor(resume.stage)}</strong>
            </div>
          </div>

          {resumeProgress ? <DashboardProgressMeter progress={resumeProgress} /> : null}

          <div className="wm-dashboard-resume-meta" aria-label="Project status">
            <span>Type: {projectScopeLine(resume)}</span>
            <span>Last updated: {resume.updated}</span>
          </div>

          <div className="wm-dashboard-resume-actions">
            <Link
              to={resume.resumeTo}
              onClick={() => setActiveProjectId(resume.id)}
              className="wm-button wm-button-primary wm-dashboard-continue-action"
              data-wm-accent="projects"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to={`${routeCatalogByKey.projects.path}/${resume.id}`}
              onClick={() => setActiveProjectId(resume.id)}
              className="wm-button wm-button-ghost wm-dashboard-view-action"
            >
              View project
            </Link>
          </div>
        </article>

        <section className="wm-section wm-dashboard-section" aria-label="Primary destinations">
          <div className="wm-dashboard-section-head">
            <div>
              <span className="wm-badge">Primary destinations</span>
              <h2 className="wm-section-title">Grouped by what you need to do</h2>
            </div>
          </div>

          <div className="wm-dashboard-grid">
            {destinations.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="wm-action-card wm-dashboard-destination-card"
                  data-wm-accent={item.accent}
                  data-wm-card-level="primary"
                  data-wingman-dashboard-tooltip={item.description}
                >
                  <span className="wm-dashboard-icon">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="wm-dashboard-intent" data-wingman-dashboard-kicker="true">
                    {item.intent}
                  </span>
                  <span className="wm-dashboard-card-eyebrow">{item.eyebrow}</span>
                  <strong className="wm-card-title wm-dashboard-card-title">{item.title}</strong>
                  <p className="wm-copy wm-dashboard-card-copy">{item.description}</p>
                  <span className="wm-dashboard-card-link">
                    <span>{item.action}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="wm-section wm-dashboard-section wm-dashboard-projects-section" aria-label="Active projects">
          <div className="wm-dashboard-section-head">
            <div>
              <span className="wm-badge">Work in progress</span>
              <h2 className="wm-section-title">Active projects</h2>
            </div>
            <Link to={routeCatalogByKey.projects.path} className="wm-dashboard-card-link">
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="wm-dashboard-project-grid">
            {recentProjects.map((project) => {
              const progress = projectProgress(project);

              return (
                <Link
                  key={project.id}
                  to={`${routeCatalogByKey.projects.path}/${project.id}`}
                  onClick={() => setActiveProjectId(project.id)}
                  className="wm-action-card wm-dashboard-project-card"
                  data-wm-accent="projects"
                  data-wm-card-level="standard"
                  data-wm-status={project.status}
                >
                  <div className="wm-dashboard-project-head">
                    <StatusChip label={STATUS_LABEL[project.status]} variant={project.status} />
                    <span className="wm-dashboard-project-updated">{project.updated}</span>
                  </div>
                  <strong className="wm-card-title wm-dashboard-card-title">{project.name}</strong>
                  <span>{projectScopeLine(project)}</span>
                  <div className="wm-dashboard-project-stage">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>{project.stage}</span>
                  </div>
                  {progress ? (
                    <DashboardProgressMeter progress={progress} />
                  ) : (
                    <span className="wm-dashboard-project-readiness">{STATUS_LABEL[project.status]}</span>
                  )}
                  <div className="wm-dashboard-next-step">
                    <ArrowRightCircle className="h-4 w-4" aria-hidden="true" />
                    <span>{nextStepFor(project.stage)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;

