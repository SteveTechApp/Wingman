import { ArrowRight, ArrowRightCircle, FileText, Flag, FolderKanban, PackageCheck, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { StatusChip } from "../components/StatusChip";
import { setActiveProjectId, useProjectStore, type ProjectStage } from "../data/projectStore";
import type { StatusVariant } from "../types";

type DashboardDestination = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  path: string;
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
};

const destinations: DashboardDestination[] = [
  {
    eyebrow: "Product positioning",
    title: "Products",
    description: "Find the right WyreStorm SKU and the plain-English reason it fits.",
    action: "Open Products",
    path: routeCatalogByKey.products.path,
    icon: PackageCheck,
  },
  {
    eyebrow: "Competitor check",
    title: "Compare",
    description: "Check whether a competitor product is a good, partial or poor match.",
    action: "Open Compare",
    path: routeCatalogByKey.compare.path,
    icon: Scale,
  },
  {
    eyebrow: "Document review",
    title: "Documents",
    description: "Review a scope, BOM, notes or competitor specification.",
    action: "Open Documents",
    path: routeCatalogByKey.documents.path,
    icon: FileText,
  },
  {
    eyebrow: "Response support",
    title: "Response Pack",
    description: "Build a structured follow-up pack for the sales conversation.",
    action: "Open Response Pack",
    path: routeCatalogByKey.responsePack.path,
    icon: FileText,
  },
  {
    eyebrow: "Work in progress",
    title: "Projects",
    description: "Continue captured requirements, notes and project history.",
    action: "Open Projects",
    path: routeCatalogByKey.projects.path,
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

export function DashboardPage() {
  const { projects, activeProjectId } = useProjectStore();

  const sourceProjects: DashboardProject[] = projects.length
    ? projects.map((project) => ({ ...project, scope: projectScopeLine(project) }))
    : fallbackProjects;

  const resume = sourceProjects.find((project) => project.id === activeProjectId) ?? sourceProjects[0];
  const recentProjects = sourceProjects.slice(0, 3);

  return (
    <main
      className="wm-dashboard-page wm-page wingman-page-host wm-dashboard-visual-root wm-dashboard-shell"
      data-wingman-page="home"
      data-wingman-home="true"
      data-wingman-dashboard-layout="viewport-split"
      aria-label="Wingman dashboard"
    >
      <aside className="wm-section-card wm-dashboard-rail" data-wingman-dashboard-rail="viewport-depth">
        <span className="wm-dashboard-brand">W</span>
        <span className="wm-ui-kicker">WyreStorm Wingman</span>
        <h1 className="wm-page-title wm-dashboard-rail-title">How can Wingman help you today?</h1>
        <p className="wm-copy wm-dashboard-rail-copy">
          Start from the customer task. Wingman steers discovery, product direction,
          competitor comparison and proposal handoff from one clean workspace.
        </p>

        <div className="wm-dashboard-rail-actions">
          <Link
            to={routeCatalogByKey.discovery.path}
            className="wm-button wm-button-primary wm-dashboard-action-button"
            data-wingman-dashboard-primary-button="true"
            data-wingman-dashboard-short-label="Discover"
          >
            Start guided discovery
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link
            to={routeCatalogByKey.compare.path}
            className="wm-button wm-button-secondary wm-dashboard-action-button"
            data-wingman-dashboard-primary-button="true"
            data-wingman-dashboard-short-label="Compare"
          >
            Compare a competitor
          </Link>
        </div>
      </aside>

      <section className="wm-dashboard-main" data-wingman-dashboard-main="viewport-depth">
        <Link
          to={resume.resumeTo}
          onClick={() => setActiveProjectId(resume.id)}
          className="wm-action-card wm-dashboard-resume-card"
        >
          <span className="wm-badge">Pick up where you left off</span>
          <div className="wm-dashboard-resume-head">
            <div className="wm-dashboard-resume-copy">
              <strong className="wm-dashboard-resume-title">{resume.name}</strong>
              <span>{projectScopeLine(resume)}</span>
            </div>
            <StatusChip label={STATUS_LABEL[resume.status]} variant={resume.status} />
          </div>

          <div className="wm-dashboard-next-step">
            <Flag className="h-4 w-4" aria-hidden="true" />
            <div>
              <span className="wm-dashboard-next-kicker">Next step</span>
              <strong className="wm-dashboard-next-copy">{nextStepFor(resume.stage)}</strong>
            </div>
          </div>
        </Link>

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
                <Link key={item.path} to={item.path} className="wm-action-card wm-dashboard-destination-card">
                  <span className="wm-dashboard-icon">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="wm-dashboard-card-eyebrow">{item.eyebrow}</span>
                  <strong className="wm-card-title wm-dashboard-card-title">{item.title}</strong>
                  <p className="wm-copy wm-dashboard-card-copy">{item.description}</p>
                  <span className="wm-dashboard-card-link">{item.action} &gt;</span>
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
              View all &gt;
            </Link>
          </div>

          <div className="wm-dashboard-project-grid">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                to={`${routeCatalogByKey.projects.path}/${project.id}`}
                onClick={() => setActiveProjectId(project.id)}
                className="wm-action-card wm-dashboard-project-card"
              >
                <div className="wm-dashboard-project-head">
                  <StatusChip label={STATUS_LABEL[project.status]} variant={project.status} />
                  <span className="wm-dashboard-project-updated">{project.updated}</span>
                </div>
                <strong className="wm-card-title wm-dashboard-card-title">{project.name}</strong>
                <span>{projectScopeLine(project)}</span>
                <div className="wm-dashboard-next-step">
                  <ArrowRightCircle className="h-4 w-4" aria-hidden="true" />
                  <span>{nextStepFor(project.stage)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;

