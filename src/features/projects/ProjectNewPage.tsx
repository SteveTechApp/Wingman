import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileUp,
  LayoutTemplate,
  Route,
  ScanSearch,
} from "lucide-react";

import {
  clearTemplateSeed,
  readTemplateSeed,
  type TemplateSeed as WorkbenchTemplateSeed,
} from "@/app/schema/templateSeed";
import RecentTextInput from "@/components/RecentTextInput";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  RECENT_TEXT_HISTORY_KEYS,
  RECENT_TEXT_HISTORY_SCOPES,
  rememberRecentTextEntry,
} from "@/features/inputs/recentTextEntries";
import {
  createProject,
  duplicateProject,
  loadProjects,
  setActiveProjectId,
  subscribeProjects,
  type DiscoveryProductFamily,
  type StoredProject,
} from "@/features/projects/projectStore";
import { getProjectResumeAction } from "@/features/projects/projectProductivity";
import { createReadyMadeProjectFromWorkbenchTemplate } from "@/features/templates/templateProjectBuilder";
import "./project-new-page.css";

type StartMethod = {
  id: string;
  title: string;
  description: string;
  helper: string;
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const START_METHODS: StartMethod[] = [
  {
    id: "guided-project",
    title: "Guided Project",
    description: "Map the room, signal flow, and user journey step by step.",
    helper: "Best for live discovery.",
    to: WM_ROUTES.discovery,
    Icon: Route,
  },
  {
    id: "templates",
    title: "Templates",
    description: "Start from a proven room type and tailor it from there.",
    helper: "Best for repeatable spaces.",
    to: WM_ROUTES.templates,
    Icon: LayoutTemplate,
  },
  {
    id: "import-brief",
    title: "Import Brief or Document",
    description: "Turn written source material into a cleaner project start.",
    helper: "Best when the brief already exists.",
    to: "/app/tools/import-intake?mode=document",
    Icon: FileUp,
  },
  {
    id: "import-diagram",
    title: "Import Diagram or Existing System",
    description: "Turn an existing sketch or system map into a guided path.",
    helper: "Best when the system shape already exists.",
    to: "/app/tools/import-intake?mode=diagram",
    Icon: ScanSearch,
  },
];

const RECOMMENDED_FAMILIES: DiscoveryProductFamily[] = [
  "Apollo",
  "HDBaseT",
  "AVoIP",
  "Matrix",
  "USB Extension",
  "Video Wall",
];

function normalizeRecommendedFamilies(
  values?: string[],
): DiscoveryProductFamily[] | undefined {
  if (!Array.isArray(values)) return undefined;
  return values.filter((value): value is DiscoveryProductFamily =>
    RECOMMENDED_FAMILIES.includes(value as DiscoveryProductFamily),
  );
}

function getToolLabel(path?: string): string {
  if (path === WM_ROUTES.roomDesigner) return "Room Designer";
  if (path === WM_ROUTES.proposals) return "Proposal Builder";
  if (path === WM_ROUTES.catalogue) return "Product Catalogue";
  if (path === WM_ROUTES.videowall) return "Video Wall Planner";
  if (!path) return "Guided Project";
  return path.replace("/app/tools/", "").replace(/-/g, " ");
}

function buildTemplateNotes(seed: WorkbenchTemplateSeed): string {
  const blocks = [
    `${seed.verticalMarket.name} / ${seed.roomType.name} / ${seed.tier.label}`,
    seed.solutionSummary || "",
    seed.tier.summary,
    seed.ioProfile?.sources ? `Inputs: ${seed.ioProfile.sources}` : "",
    seed.ioProfile?.outputs ? `Outputs: ${seed.ioProfile.outputs}` : "",
    seed.ioProfile?.operators ? `Operators: ${seed.ioProfile.operators}` : "",
    seed.includedSystems.length
      ? `Included systems: ${seed.includedSystems.join("; ")}`
      : "",
    seed.assumptions?.length
      ? `Assumptions: ${seed.assumptions.join("; ")}`
      : "",
    seed.uplift.length
      ? `Commercial uplift: ${seed.uplift.join("; ")}`
      : "",
  ].filter(Boolean);

  return blocks.join("\n\n");
}

let recentProjectsSnapshotCacheKey = "";
let recentProjectsSnapshotCache: ReturnType<typeof loadProjects> = [];

function getRecentProjectsSnapshot() {
  const next = loadProjects().slice(0, 3);
  const nextKey = next.map((project) => project.id).join("|");

  if (nextKey !== recentProjectsSnapshotCacheKey) {
    recentProjectsSnapshotCacheKey = nextKey;
    recentProjectsSnapshotCache = next;
  }

  return recentProjectsSnapshotCache;
}

function getRecentProjectsServerSnapshot() {
  return recentProjectsSnapshotCache;
}

export default function ProjectNewPage() {
  const nav = useNavigate();
  const [name, setName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [startingTemplate, setStartingTemplate] = React.useState(false);
  const [templateSeed, setTemplateSeed] = React.useState<WorkbenchTemplateSeed | null>(() =>
    readTemplateSeed(),
  );

  const recentProjects = React.useSyncExternalStore(
    subscribeProjects,
    getRecentProjectsSnapshot,
    getRecentProjectsServerSnapshot,
  );

  const hasRecentProjects = recentProjects.length > 0;

  React.useEffect(() => {
    if (!templateSeed) return;
    setName((current) => (current.trim() ? current : templateSeed.projectName));
  }, [templateSeed]);

  function createShell(methodTitle: string) {
    rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.roomName, name, {
      scope: RECENT_TEXT_HISTORY_SCOPES.projectNew,
    });
    rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.customer, customer, {
      scope: RECENT_TEXT_HISTORY_SCOPES.projectNew,
    });
    rememberRecentTextEntry(RECENT_TEXT_HISTORY_KEYS.site, site, {
      scope: RECENT_TEXT_HISTORY_SCOPES.projectNew,
    });

    const recommendedFamilies = normalizeRecommendedFamilies(templateSeed?.recommendedFamilies);

    const project = createProject({
      name: name.trim() || templateSeed?.projectName || `${methodTitle} Project`,
      customer: customer.trim(),
      site: site.trim(),
      roomName: name.trim() || templateSeed?.roomType.name || "",
      stage: "Discovery",
      status: "Draft",
      notes: templateSeed ? buildTemplateNotes(templateSeed) : "",
      discovery: templateSeed
        ? {
            customer: customer.trim(),
            site: site.trim(),
            roomName: name.trim() || templateSeed.roomType.name,
            applicationType: templateSeed.roomType.name,
            notes: buildTemplateNotes(templateSeed),
            recommendedFamilies,
            recommendedNextTool: templateSeed.recommendedTool,
            createdAt: templateSeed.createdAt,
          }
        : undefined,
      template: templateSeed
        ? {
            market: templateSeed.verticalMarket.name,
            application: templateSeed.roomType.name,
            tier: templateSeed.tier.label as "Bronze" | "Silver" | "Gold",
            summary: templateSeed.tier.summary,
            recommendedFamilies,
            assumptions: templateSeed.assumptions,
            createdAt: templateSeed.createdAt,
          }
        : undefined,
      proposal: templateSeed
        ? {
            selectedTier: templateSeed.tier.label,
          }
        : undefined,
    });

    if (templateSeed) {
      clearTemplateSeed();
      setTemplateSeed(null);
    }

    return project;
  }

  function startWith(method: StartMethod) {
    createShell(method.title);
    nav(method.to);
  }

  async function startFromSelectedTemplate() {
    if (!templateSeed || startingTemplate) return;

    setStartingTemplate(true);

    try {
      const project = await createReadyMadeProjectFromWorkbenchTemplate(templateSeed, {
        name: name.trim() || templateSeed.projectName,
        customer: customer.trim(),
        site: site.trim(),
      });

      clearTemplateSeed();
      setTemplateSeed(null);
      nav("/app/projects/" + encodeURIComponent(project.id));
      return;
    } catch {}

    createShell("Template");
    nav(templateSeed.recommendedTool || WM_ROUTES.discovery);
  }

  function discardSelectedTemplate() {
    clearTemplateSeed();
    setTemplateSeed(null);
  }

  function applyProjectContext(project: StoredProject) {
    setName(project.roomName || project.name || "");
    setCustomer(project.customer || "");
    setSite(project.site || "");
  }

  function duplicateFromProject(project: StoredProject) {
    const duplicate = duplicateProject(project.id, {
      name: project.name + " Copy",
      status: "Draft",
    });

    if (duplicate) {
      nav("/app/projects/" + encodeURIComponent(duplicate.id));
    }
  }

  const selectedTemplateFamilies = normalizeRecommendedFamilies(templateSeed?.recommendedFamilies);

  return (
    <div className="wm-page-shell wm-project-new-page">
      <section className="wm-page-header wm-page-header--split">
        <div className="wm-page-stack">
          <div className="wm-page-kicker">Projects</div>
          <h1 className="wm-page-title">Project launcher</h1>
          <p className="wm-page-subtitle">
            Start with a light project shell, then choose the route that best matches
            the opportunity already in front of you.
          </p>
        </div>

        <div className="wm-stat-row wm-project-new-page__hero-stats">
          <div className="wm-stat-card">
            <span className="wm-stat-label">Starter paths</span>
            <span className="wm-stat-value">{START_METHODS.length}</span>
          </div>
          <div className="wm-stat-card">
            <span className="wm-stat-label">Recent projects</span>
            <span className="wm-stat-value">{recentProjects.length}</span>
          </div>
          <div className="wm-stat-card">
            <span className="wm-stat-label">Template starter</span>
            <span className="wm-stat-value">{templateSeed ? "Loaded" : "Optional"}</span>
          </div>
        </div>
      </section>

      <section className="wm-page-grid wm-page-grid--2">
        <section className="wm-card">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Project details</h2>
              <p className="wm-section-copy">
                Use just enough detail to name the opportunity and move into the right workflow.
              </p>
            </div>
          </div>

          <div className="wm-project-new-form">
            <label className="wm-project-new-field">
              <span>Project name</span>
              <RecentTextInput
                className="wm-form-input"
                historyKey={RECENT_TEXT_HISTORY_KEYS.roomName}
                historyScope={RECENT_TEXT_HISTORY_SCOPES.projectNew}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Boardroom Upgrade"
              />
            </label>

            <label className="wm-project-new-field">
              <span>Customer</span>
              <RecentTextInput
                className="wm-form-input"
                historyKey={RECENT_TEXT_HISTORY_KEYS.customer}
                historyScope={RECENT_TEXT_HISTORY_SCOPES.projectNew}
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="e.g. Acme Ltd"
              />
            </label>

            <label className="wm-project-new-field">
              <span>Site</span>
              <RecentTextInput
                className="wm-form-input"
                historyKey={RECENT_TEXT_HISTORY_KEYS.site}
                historyScope={RECENT_TEXT_HISTORY_SCOPES.projectNew}
                value={site}
                onChange={(event) => setSite(event.target.value)}
                placeholder="e.g. London HQ"
              />
            </label>
          </div>

          <div className="wm-empty-state">
            Build the project shell first, then open the workflow that matches how
            much information already exists.
          </div>

          {templateSeed ? (
            <div className="wm-project-new-template">
              <div className="wm-section-header">
                <div>
                  <h2 className="wm-section-title">Template starter ready</h2>
                  <p className="wm-section-copy">
                    {templateSeed.verticalMarket.name} / {templateSeed.roomType.name} /{" "}
                    {templateSeed.tier.label}
                  </p>
                </div>
              </div>

              <div className="wm-project-new-template__summary">
                <p className="wm-section-copy">{templateSeed.tier.summary}</p>

                {templateSeed.ioProfile ? (
                  <div className="wm-project-new-template__io">
                    <div className="wm-project-new-template__io-item">
                      <span>Inputs</span>
                      <strong>{templateSeed.ioProfile.sources}</strong>
                    </div>
                    <div className="wm-project-new-template__io-item">
                      <span>Outputs</span>
                      <strong>{templateSeed.ioProfile.outputs}</strong>
                    </div>
                    <div className="wm-project-new-template__io-item">
                      <span>Operators</span>
                      <strong>{templateSeed.ioProfile.operators}</strong>
                    </div>
                  </div>
                ) : null}

                {templateSeed.roomType.useCases.length > 0 ? (
                  <div className="wm-page-inline-list">
                    {templateSeed.roomType.useCases.map((item) => (
                      <span key={item} className="wm-workspace-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="wm-project-new-template__meta">
                  <span>Next move</span>
                  <strong>{getToolLabel(templateSeed.recommendedTool)}</strong>
                </div>

                {selectedTemplateFamilies?.length ? (
                  <div className="wm-page-inline-list">
                    {selectedTemplateFamilies.map((item) => (
                      <span key={item} className="wm-workspace-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="wm-action-row">
                  <button
                    type="button"
                    className="wm-btn-primary"
                    onClick={() => void startFromSelectedTemplate()}
                    disabled={startingTemplate}
                  >
                    {startingTemplate
                      ? "Building ready-made room solution..."
                      : "Create ready-made room solution"}
                  </button>

                  <button
                    type="button"
                    className="wm-btn-secondary"
                    onClick={discardSelectedTemplate}
                  >
                    Clear starter
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="wm-card">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Choose a starting path</h2>
              <p className="wm-section-copy">
                Each route creates the project shell first, then moves into the right
                level of guided support.
              </p>
            </div>
          </div>

          <div className="wm-project-new-method-list">
            {START_METHODS.map((method) => {
              const Icon = method.Icon;

              return (
                <button
                  key={method.id}
                  type="button"
                  className="wm-project-new-method"
                  onClick={() => startWith(method)}
                >
                  <span className="wm-project-new-method__icon">
                    <Icon className="wm-project-new-method__icon-svg" />
                  </span>

                  <span className="wm-project-new-method__copy">
                    <span className="wm-project-new-method__title">{method.title}</span>
                    <span className="wm-project-new-method__description">
                      {method.description}
                    </span>
                    <span className="wm-project-new-method__helper">{method.helper}</span>
                  </span>

                  <span className="wm-project-new-method__cta">Open</span>
                </button>
              );
            })}
          </div>
        </section>
      </section>

      {hasRecentProjects ? (
        <section className="wm-section">
          <div className="wm-section-header">
            <div>
              <h2 className="wm-section-title">Reuse recent context</h2>
              <p className="wm-section-copy">
                Borrow project details, duplicate a similar room, or jump back into active work.
              </p>
            </div>
          </div>

          <div className="wm-page-grid wm-page-grid--2">
            {recentProjects.map((project) => {
              const resumeAction = getProjectResumeAction(project);

              return (
                <article key={project.id} className="wm-card wm-project-new-recent-item">
                  <div className="wm-project-new-recent-head">
                    <div>
                      <h3 className="wm-card-title">{project.name}</h3>
                      <p className="wm-card-copy">
                        {[
                          project.customer || "Customer not set",
                          project.site || "Site not set",
                          project.roomName || "Room not set",
                        ].join(" / ")}
                      </p>
                    </div>

                    <span className="wm-workspace-tag">{resumeAction.shortLabel}</span>
                  </div>

                  <div className="wm-project-new-recent-meta">
                    Last updated {new Date(project.updatedAt).toLocaleString()}
                  </div>

                  <div className="wm-action-row">
                    <button
                      type="button"
                      className="wm-btn-secondary"
                      onClick={() => applyProjectContext(project)}
                    >
                      Borrow details
                    </button>

                    <button
                      type="button"
                      className="wm-btn-secondary"
                      onClick={() => duplicateFromProject(project)}
                    >
                      Duplicate
                    </button>

                    <button
                      type="button"
                      className="wm-btn-primary"
                      onClick={() => {
                        setActiveProjectId(project.id);
                        nav(resumeAction.to);
                      }}
                    >
                      {resumeAction.label}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
