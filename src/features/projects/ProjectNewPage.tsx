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
import CollapsibleCard from "@/ui2/components/CollapsibleCard";

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
const FLOW_ACTIVE_RGB = "96,194,132";
type ProjectFlowStep = "details" | "reuse";

function normalizeRecommendedFamilies(
  values?: string[],
): DiscoveryProductFamily[] | undefined {
  if (!Array.isArray(values)) return undefined;
  return values.filter((value): value is DiscoveryProductFamily =>
    RECOMMENDED_FAMILIES.includes(value as DiscoveryProductFamily)
  );
}

function getToolLabel(path?: string): string {
  if (path === WM_ROUTES.roomDesigner) return "Room Wizard";
  if (path === WM_ROUTES.proposals) return "Proposal Builder";
  if (path === WM_ROUTES.catalogue) return "Product Catalogue";
  if (path === WM_ROUTES.videowall) return "Video Wall Planner";
  if (!path) return "Guided Project";
  return path.replace("/app/tools/", "").replace(/-/g, " ");
}

function buildTemplateNotes(seed: WorkbenchTemplateSeed): string {
  const blocks = [
    `${seed.verticalMarket.name} / ${seed.roomType.name} / ${seed.tier.label}`,
    seed.tier.summary,
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
  const [activeFlowStep, setActiveFlowStep] = React.useState<ProjectFlowStep>("details");
  const detailsRef = React.useRef<HTMLElement | null>(null);
  const reuseRef = React.useRef<HTMLElement | null>(null);
  const [templateSeed, setTemplateSeed] = React.useState<WorkbenchTemplateSeed | null>(() =>
    readTemplateSeed()
  );
  const recentProjects = React.useSyncExternalStore(
    subscribeProjects,
    getRecentProjectsSnapshot,
    getRecentProjectsServerSnapshot,
  );
  const hasRecentProjects = recentProjects.length > 0;

  React.useEffect(() => {
    if (!templateSeed) return;
    setName((current) => current.trim() ? current : templateSeed.projectName);
  }, [templateSeed]);

  function flowSectionClassName(step: ProjectFlowStep) {
    return `wm-section wm-flow-section${activeFlowStep === step ? " is-active" : ""}`;
  }

  function flowEyebrowClassName(step: ProjectFlowStep) {
    return `wm-flow-section__eyebrow${activeFlowStep === step ? " is-active" : ""}`;
  }

  React.useEffect(() => {
    if (activeFlowStep !== "reuse" || !hasRecentProjects || typeof window === "undefined") return;

    const target = reuseRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const topPadding = 92;
    const bottomPadding = 20;
    const fullyVisible = rect.top >= topPadding && rect.bottom <= window.innerHeight - bottomPadding;
    if (fullyVisible) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeFlowStep, hasRecentProjects]);

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

  function startFromSelectedTemplate() {
    createShell("Template");
    nav(templateSeed?.recommendedTool || WM_ROUTES.discovery);
  }

  function discardSelectedTemplate() {
    clearTemplateSeed();
    setTemplateSeed(null);
  }

  function applyProjectContext(project: StoredProject) {
    setName(project.roomName || project.name || "");
    setCustomer(project.customer || "");
    setSite(project.site || "");
    setActiveFlowStep("reuse");
  }

  function duplicateFromProject(project: StoredProject) {
    const duplicate = duplicateProject(project.id, {
      name: `${project.name} Copy`,
      status: "Draft",
    });
    if (duplicate) {
      nav(`/app/projects/${encodeURIComponent(duplicate.id)}`);
    }
  }

  return (
    <div className="wm-page wm-project-new-page">
      <section className="wm-hero">
        <div className="wm-grid wm-project-new-page__hero">
          <div className="wm-kicker">Projects</div>
          <div className="wm-title-xl">Start New Project</div>
          <div className="wm-page-lead">
            Set the shell once, then start the job the right way: guided, template-led, brief-led,
            or diagram-led.
          </div>
        </div>
      </section>

      {templateSeed ? (
        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Template starter ready</h2>
              <p>
                {templateSeed.verticalMarket.name} / {templateSeed.roomType.name} / {templateSeed.tier.label}
              </p>
            </div>
          </div>

          <article className="wm-work-card" style={{ display: "grid", gap: 14 }}>
            <div className="wm-body">
              {templateSeed.tier.summary}
            </div>

            <div className="wm-body-sm" style={{ opacity: 0.78 }}>
              Next move: {getToolLabel(templateSeed.recommendedTool)}
            </div>

            {templateSeed.recommendedFamilies?.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {templateSeed.recommendedFamilies.map((item) => (
                  <span key={item} className="wm-chip">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="wm-actions-row">
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={startFromSelectedTemplate}
              >
                Open {getToolLabel(templateSeed.recommendedTool)} with this starter
              </button>
              <button type="button" className="wm-btn" onClick={discardSelectedTemplate}>
                Clear starter
              </button>
            </div>
          </article>
        </section>
      ) : null}

      <section
        ref={detailsRef}
        className={flowSectionClassName("details")}
        style={{
          "--wm-flow-accent-rgb": FLOW_ACTIVE_RGB,
          width: "100%",
          maxWidth: 980,
          justifySelf: "start",
        } as React.CSSProperties}
        onClick={() => setActiveFlowStep("details")}
      >
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <div className={flowEyebrowClassName("details")}>
              Step 1 / Opportunity details{activeFlowStep === "details" ? " / Current position" : ""}
            </div>
            <h2>Opportunity details</h2>
            <p>Keep this light. Add enough context to name the job and move on.</p>
          </div>
        </div>

        <div className="wm-project-new-page__form">
          <label className="wm-form-field">
            <span className="wm-form-label">Project name</span>
            <RecentTextInput
              className="wm-form-input"
              historyKey={RECENT_TEXT_HISTORY_KEYS.roomName}
              historyScope={RECENT_TEXT_HISTORY_SCOPES.projectNew}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setActiveFlowStep("details");
              }}
              placeholder="e.g. Boardroom Upgrade"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Customer</span>
            <RecentTextInput
              className="wm-form-input"
              historyKey={RECENT_TEXT_HISTORY_KEYS.customer}
              historyScope={RECENT_TEXT_HISTORY_SCOPES.projectNew}
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setActiveFlowStep("details");
              }}
              placeholder="e.g. Acme Ltd"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Site</span>
            <RecentTextInput
              className="wm-form-input"
              historyKey={RECENT_TEXT_HISTORY_KEYS.site}
              historyScope={RECENT_TEXT_HISTORY_SCOPES.projectNew}
              value={site}
              onChange={(e) => {
                setSite(e.target.value);
                setActiveFlowStep("details");
              }}
              placeholder="e.g. London HQ"
            />
          </label>
        </div>

        <div className="wm-actions-row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="wm-btn wm-btn-primary"
            onClick={() => startWith(START_METHODS[0])}
          >
            Start Guided Project
          </button>
        </div>
      </section>

      {hasRecentProjects ? (
        <section
          ref={reuseRef}
          className={flowSectionClassName("reuse")}
          style={{ "--wm-flow-accent-rgb": FLOW_ACTIVE_RGB } as React.CSSProperties}
          onClick={() => setActiveFlowStep("reuse")}
        >
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <div className={flowEyebrowClassName("reuse")}>
                Step 1 / Reuse context{activeFlowStep === "reuse" ? " / Current position" : ""}
              </div>
              <h2>Reuse recent project context</h2>
              <p>Pull forward past context or duplicate a similar room to move faster.</p>
            </div>
          </div>

          <CollapsibleCard
            id="project-new-reuse-context"
            title="Recent project context"
            subtitle="Open this when you want to reuse details or duplicate a similar job."
            defaultCollapsed
          >
            <div className="wm-grid-cards">
              {recentProjects.map((project) => {
                const resumeAction = getProjectResumeAction(project);

                return (
                  <article key={project.id} className="wm-work-card" style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div>
                        <div className="wm-title-lg">{project.name}</div>
                        <div className="wm-body-sm" style={{ opacity: 0.76 }}>
                          {[project.customer || "Customer not set", project.site || "Site not set", project.roomName || "Room not set"].join(" / ")}
                        </div>
                      </div>
                      <span className="wm-chip">{resumeAction.shortLabel}</span>
                    </div>

                    <div className="wm-body-sm" style={{ opacity: 0.76 }}>
                      Last updated {new Date(project.updatedAt).toLocaleString()}
                    </div>

                    <div className="wm-actions-row">
                      <button type="button" className="wm-btn" onClick={() => applyProjectContext(project)}>
                        Use details
                      </button>
                      <button type="button" className="wm-btn" onClick={() => duplicateFromProject(project)}>
                        Duplicate project
                      </button>
                      <button
                        type="button"
                        className="wm-btn"
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
          </CollapsibleCard>
        </section>
      ) : null}
    </div>
  );
}
