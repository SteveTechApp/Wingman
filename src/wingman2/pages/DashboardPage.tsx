import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileSearch,
  FileText,
  FolderKanban,
  LayoutTemplate,
  MoreVertical,
  PackageSearch,
  Scale,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { StatusChip } from "../components/StatusChip";
import {
  setActiveProjectId,
  useProjectStore,
  type ProjectStage,
  type StoredProject,
} from "../data/projectStore";
import type { StatusVariant } from "../types";

type DashboardAccent =
  | "discovery"
  | "compare"
  | "templates"
  | "projects"
  | "products"
  | "documents"
  | "response"
  | "guru";

type DashboardAction = {
  title: string;
  description: string;
  path: string;
  accent: DashboardAccent;
  icon: typeof Compass;
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

const primaryActions: DashboardAction[] = [
  {
    title: "Start Discovery",
    description: "Answer a few questions and get a clear product direction.",
    path: routeCatalogByKey.discovery.path,
    accent: "discovery",
    icon: Compass,
  },
  {
    title: "Compare Products",
    description: "Check a competitor product against the closest WyreStorm fit.",
    path: routeCatalogByKey.compare.path,
    accent: "compare",
    icon: Scale,
  },
  {
    title: "Browse Templates",
    description: "Start from a ready-made room or application design.",
    path: routeCatalogByKey.templates.path,
    accent: "templates",
    icon: LayoutTemplate,
  },
  {
    title: "My Projects",
    description: "Continue discovery, comparison, design and proposal work.",
    path: routeCatalogByKey.projects.path,
    accent: "projects",
    icon: FolderKanban,
  },
];

const quickActions: DashboardAction[] = [
  {
    title: "Product Finder",
    description: "Find the right SKU",
    path: routeCatalogByKey.finder.path,
    accent: "products",
    icon: PackageSearch,
  },
  {
    title: "Call Coach",
    description: "Prepare the next question",
    path: routeCatalogByKey.callCoach.path,
    accent: "discovery",
    icon: ClipboardList,
  },
  {
    title: "Response Pack",
    description: "Build a customer response",
    path: routeCatalogByKey.responsePack.path,
    accent: "response",
    icon: FileText,
  },
  {
    title: "Document Assistant",
    description: "Review and extract",
    path: routeCatalogByKey.documents.path,
    accent: "documents",
    icon: FileSearch,
  },
];

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
  Finder: "Shortlist the product family",
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

function openGuru() {
  window.dispatchEvent(
    new CustomEvent("wingman:open-guru", {
      detail: { prompt: "Help me choose the right Wingman workflow for this customer request." },
    }),
  );
}

export function DashboardPage() {
  const { projects, activeProjectId } = useProjectStore();

  const sourceProjects: DashboardProject[] = projects.length
    ? projects.map((project) => ({ ...project, scope: projectScopeLine(project) }))
    : fallbackProjects;

  const resume = sourceProjects.find((project) => project.id === activeProjectId) ?? sourceProjects[0];
  const recentProjects = sourceProjects.slice(0, 3);
  const displayName = readDisplayName();

  return (
    <main
      className="wm-reference-dashboard wm-page"
      data-wingman-page="home"
      data-wingman-home="true"
      aria-label="Wingman dashboard"
    >
      <header className="wm-reference-dashboard-header">
        <div>
          <span className="wm-reference-kicker">WyreStorm sales intelligence</span>
          <h1>
            {greetingForCurrentTime()}
            {displayName ? `, ${displayName}` : ""}
          </h1>
          <p>What would you like to achieve today?</p>
        </div>
      </header>

      <div className="wm-reference-dashboard-layout">
        <div className="wm-reference-dashboard-main">
          <section className="wm-reference-primary-grid" aria-label="Primary Wingman actions">
            {primaryActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className="wm-reference-primary-card"
                  data-wm-accent={action.accent}
                >
                  <span className="wm-reference-action-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="wm-reference-primary-copy">
                    <strong>{action.title}</strong>
                    <span>{action.description}</span>
                  </span>
                  <span className="wm-reference-round-arrow" aria-hidden="true">
                    <ArrowRight />
                  </span>
                </Link>
              );
            })}
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
                        <span className="wm-reference-progress-track">
                          <span style={{ width: `${progress.value}%` }} />
                        </span>
                        <strong>{progress.value}%</strong>
                      </div>
                    ) : (
                      <div className="wm-reference-project-next">{nextStepFor(project.stage)}</div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="wm-reference-section" aria-label="Quick actions">
            <div className="wm-reference-section-heading">
              <h2>Quick Actions</h2>
            </div>

            <div className="wm-reference-quick-grid">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.path}
                    to={action.path}
                    className="wm-reference-quick-card"
                    data-wm-accent={action.accent}
                  >
                    <Icon aria-hidden="true" />
                    <span>
                      <strong>{action.title}</strong>
                      <small>{action.description}</small>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                );
              })}

              <button type="button" className="wm-reference-quick-card" data-wm-accent="guru" onClick={openGuru}>
                <Bot aria-hidden="true" />
                <span>
                  <strong>Ask Guru</strong>
                  <small>Get contextual AV help</small>
                </span>
                <ArrowRight aria-hidden="true" />
              </button>
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

          <section className="wm-reference-rail-card wm-reference-spotlight-card">
            <div className="wm-reference-rail-title">
              <Sparkles aria-hidden="true" />
              <h2>Product Spotlight</h2>
            </div>
            <span className="wm-reference-product-badge">Hybrid system</span>
            <strong>MX-1007-HYB</strong>
            <p>NHD 500, USB host, DSP and amplification in one platform.</p>
            <Link to={routeCatalogByKey.products.path} className="wm-reference-text-link">
              View products
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>

          <section className="wm-reference-rail-card wm-reference-news-card">
            <div className="wm-reference-rail-title">
              <Zap aria-hidden="true" />
              <h2>What&apos;s New</h2>
            </div>
            <p>Room templates and guided workflows have been refreshed.</p>
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
