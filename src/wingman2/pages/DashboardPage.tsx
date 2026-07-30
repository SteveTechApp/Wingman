import {
  ArrowRight,
  CheckCircle2,
  MoreVertical,
  Plus,
  Target,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { HubCard, routeAction } from "./NavigationHubPages";
import { StatusChip } from "../components/StatusChip";
import {
  setActiveProjectId,
  useProjectStore,
  type ProjectStage,
  type StoredProject,
} from "../data/projectStore";
import type { StatusVariant } from "../types";

const primaryActions = [
  routeAction(
    "discovery",
    "Start Discovery",
    "Answer a few questions and get a clear product direction.",
    "GUIDED REQUIREMENT CAPTURE",
    { accent: "aqua", linkLabel: "Start discovery", art: "discovery" },
  ),
  routeAction(
    "compare",
    "Compare Products",
    "Check a competitor product against the closest WyreStorm fit.",
    "COMPETITOR PRODUCT MATCH",
    { accent: "amber", linkLabel: "Compare products", art: "competitor" },
  ),
  routeAction(
    "templates",
    "Browse Templates",
    "Start from a ready-made room or application design.",
    "ROOM & APPLICATION TEMPLATES",
    { accent: "violet", linkLabel: "Browse templates", art: "templates" },
  ),
  routeAction(
    "projects",
    "My Projects",
    "Continue discovery, comparison, design and proposal work.",
    "ACTIVE PROJECT WORKSPACE",
    { accent: "green", linkLabel: "Open projects", art: "projects" },
  ),
];

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

const fallbackProjects: DashboardProject[] = [
  {
    id: "northbridge-meeting-room-refresh",
    name: "Northbridge Meeting Room Refresh",
    scope: "Discovery / Steve",
    stage: "Discovery",
    owner: "Steve",
    status: "recommended",
    updated: "2 hours ago",
    resumeTo: routeCatalogByKey.discovery.path,
  },
  {
    id: "harbour-retail-signage-rollout",
    name: "Harbour Retail Signage Rollout",
    scope: "Competitor Compare / Channel Sales",
    stage: "Competitor Compare",
    owner: "Channel Sales",
    status: "alternative",
    updated: "Today",
    resumeTo: routeCatalogByKey.compare.path,
  },
  {
    id: "westbrook-classroom-standard",
    name: "Westbrook Classroom Standard",
    scope: "Proposal Builder / Pre-sales",
    stage: "Proposal Builder",
    owner: "Pre-sales",
    status: "recommended",
    updated: "Yesterday",
    resumeTo: routeCatalogByKey.responsePack.path,
  },
];

const STAGE_NEXT_STEP: Partial<Record<ProjectStage, string>> = {
  Discovery: "Continue discovery",
  "Competitor Compare": "Review competitor match",
  "Proposal Builder": "Finish proposal and BOM",
  Recommendations: "Review matched products",
  Templates: "Adapt the room template",
  Support: "Continue the support review",
};

const STATUS_LABEL: Record<StatusVariant, string> = {
  recommended: "On track",
  alternative: "In progress",
  caution: "Needs review",
};

function nextStepFor(stage: ProjectStage) {
  return STAGE_NEXT_STEP[stage] ?? "Continue project";
}

function projectScopeLine(project: { stage: ProjectStage; owner: string; scope?: string }) {
  return project.scope ?? `${project.stage} / ${project.owner}`;
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
    return { label: "Discovery", value: capturedPercent };
  }

  const readinessScore = percentValue(project.proposal?.readinessScore);

  if (readinessScore !== null) {
    return { label: "Proposal", value: readinessScore };
  }

  const matchScore = percentValue(
    project.compareRuns?.find((run) => Number.isFinite(Number(run.matchScore)))?.matchScore,
  );

  if (matchScore !== null) {
    return { label: "Compare", value: matchScore };
  }

  return null;
}

function greetingForCurrentTime() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function readDisplayName() {
  if (typeof window === "undefined") {
    return "";
  }

  const keys = [
    "wingman.localProfile.v2",
    "wingmanProfile",
    "wingman:profile",
    "wingman-profile-settings",
  ];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as { displayName?: unknown };
      const displayName = typeof parsed.displayName === "string" ? parsed.displayName.trim() : "";

      if (displayName) {
        return displayName.replace(/^Mr\s+/i, "");
      }
    } catch {
      continue;
    }
  }

  return "Steve";
}

export function DashboardPage() {
  const { projects } = useProjectStore();

  const sourceProjects: DashboardProject[] = projects.length
    ? projects.map((project) => ({ ...project, scope: projectScopeLine(project) }))
    : fallbackProjects;

  const recentProjects = sourceProjects.slice(0, 3);
  const displayName = readDisplayName();

  return (
    <main
      className="wm-reference-dashboard wm-dashboard-page wm-page wm-polish-shell"
      data-wingman-page="home"
      data-wingman-home="true"
      aria-label="Wingman dashboard"
    >
      <header className="wm-dashboard-heading-row">
        <div className="wm-dashboard-heading">
          <p className="wm-polish-eyebrow">WyreStorm sales intelligence</p>
          <h1 id="wingman-dashboard-title">
            {greetingForCurrentTime()}
            {displayName ? `, ${displayName}` : ""}
          </h1>
          <p>What would you like to achieve today?</p>
        </div>

        <button
          type="button"
          className="wingman-new-project-button"
          onClick={() => window.dispatchEvent(new Event("wingman:new-project"))}
          aria-label="Create new Wingman project"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </header>

      <div className="wm-reference-dashboard-layout wm-dashboard-content-grid">
        <div className="wm-reference-dashboard-main">
          <section className="wm-sh-card-grid wm-polish-grid" aria-label="Primary Wingman actions">
            {primaryActions.map((action) => (
              <HubCard key={action.title} item={action} />
            ))}
          </section>

          <section className="wm-reference-section" aria-label="Recent projects">
            <div className="wm-reference-section-heading">
              <h2>Recent Projects</h2>
              <Link to={routeCatalogByKey.projects.path}>
                View all
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className="wm-reference-project-grid">
              {recentProjects.map((project) => {
                const progress = projectProgress(project);

                return (
                  <Link
                    key={project.id}
                    to={`${routeCatalogByKey.projects.path}/${project.id}`}
                    onClick={() => setActiveProjectId(project.id)}
                    className="wm-reference-project-card"
                    data-wm-status={project.status}
                  >
                    <div className="wm-reference-project-topline">
                      <StatusChip label={STATUS_LABEL[project.status]} variant={project.status} />
                      <MoreVertical aria-hidden="true" />
                    </div>
                    <div className="wm-reference-project-name">
                      <span className="wm-reference-project-icon">
                        <CheckCircle2 aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{project.name}</strong>
                        <small>{projectScopeLine(project)} · Updated {project.updated}</small>
                      </span>
                    </div>
                    {progress ? (
                      <div className="wm-reference-progress" aria-label={`${progress.label}: ${progress.value}%`}>
                        <progress className="wm-reference-progress-track" max={100} value={progress.value} />
                        <strong>{progress.value}%</strong>
                      </div>
                    ) : null}
                    <div className="wm-reference-project-next">{nextStepFor(project.stage)}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="wm-reference-dashboard-rail" aria-label="Dashboard focus panel">
          <section className="wm-reference-rail-card wm-reference-focus-card">
            <div className="wm-reference-rail-title">
              <Target aria-hidden="true" />
              <h2>Today&apos;s Focus</h2>
            </div>
            <div className="wm-reference-focus-list">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to={project.resumeTo}
                  onClick={() => setActiveProjectId(project.id)}
                >
                  <span className="wm-reference-focus-marker" />
                  <span>
                    <strong>{nextStepFor(project.stage)}</strong>
                    <small>{project.name}</small>
                  </span>
                </Link>
              ))}
            </div>
            <Link to={routeCatalogByKey.projects.path} className="wm-reference-text-link">
              See all tasks
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>

          <section className="wm-reference-rail-card wm-reference-news-card">
            <div className="wm-reference-rail-title">
              <Zap aria-hidden="true" />
              <h2>What&apos;s New</h2>
            </div>
            <p>Room templates and guided workflows have been refreshed.</p>
            <p>The dashboard now prioritises active work and core starting points, with all other tools available from the Wingman menu.</p>
            <Link to={routeCatalogByKey.templates.path} className="wm-reference-text-link">
              Explore templates
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default DashboardPage;
