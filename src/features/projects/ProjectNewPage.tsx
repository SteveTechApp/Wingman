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
  getRecentTextEntries,
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
    description: "Use a low-clutter guided decision tree to understand the room, the signal path, and the customer workflow.",
    helper: "Best for live discovery calls and early-stage qualification.",
    to: WM_ROUTES.discovery,
    Icon: Route,
  },
  {
    id: "templates",
    title: "Templates",
    description: "Start from a proven room archetype and then tailor the solution for the opportunity.",
    helper: "Best for common room types and repeatable solutions.",
    to: WM_ROUTES.templates,
    Icon: LayoutTemplate,
  },
  {
    id: "import-brief",
    title: "Import Brief or Document",
    description: "Bring in a customer brief, tender notes, scope document, or email thread and let Wingman extract the important signals.",
    helper: "Best when the project already has written input material.",
    to: "/app/tools/import-intake?mode=document",
    Icon: FileUp,
  },
  {
    id: "import-diagram",
    title: "Import Diagram or Existing System",
    description: "Start from a customer sketch, signal flow, or existing system map and convert it into a guided project path.",
    helper: "Best when the physical flow already exists but needs translating into technology choices.",
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
type ProjectFlowStep = "details" | "reuse" | "start";

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
  const recentCustomers = getRecentTextEntries(RECENT_TEXT_HISTORY_KEYS.customer, {
    scope: RECENT_TEXT_HISTORY_SCOPES.projectNew,
  }).slice(0, 3);
  const recentSites = getRecentTextEntries(RECENT_TEXT_HISTORY_KEYS.site, {
    scope: RECENT_TEXT_HISTORY_SCOPES.projectNew,
  }).slice(0, 3);
  const recentRooms = getRecentTextEntries(RECENT_TEXT_HISTORY_KEYS.roomName, {
    scope: RECENT_TEXT_HISTORY_SCOPES.projectNew,
  }).slice(0, 3);
  const hasRecentProjects = recentProjects.length > 0;

  React.useEffect(() => {
    if (!templateSeed) return;
    setName((current) => current.trim() ? current : templateSeed.projectName);
  }, [templateSeed]);

  function workflowSectionStyle(step: ProjectFlowStep): React.CSSProperties {
    const isActive = activeFlowStep === step;
    return {
      borderRadius: 18,
      border: isActive
        ? `1px solid rgba(${FLOW_ACTIVE_RGB},0.34)`
        : "1px solid rgba(255,255,255,0.08)",
      background: isActive
        ? `linear-gradient(180deg, rgba(${FLOW_ACTIVE_RGB},0.10), rgba(${FLOW_ACTIVE_RGB},0.04))`
        : "linear-gradient(180deg, rgba(9,16,28,0.94), rgba(6,11,20,0.92))",
      boxShadow: isActive
        ? `0 0 0 1px rgba(${FLOW_ACTIVE_RGB},0.12), 0 18px 48px rgba(${FLOW_ACTIVE_RGB},0.08)`
        : "0 18px 48px rgba(0,0,0,0.22)",
      opacity: isActive ? 1 : 0.66,
      transition: "border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, opacity 180ms ease",
    };
  }

  function workflowLabelStyle(step: ProjectFlowStep): React.CSSProperties {
    const isActive = activeFlowStep === step;
    return {
      marginBottom: 8,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: isActive ? `rgba(${FLOW_ACTIVE_RGB},0.94)` : "rgba(255,255,255,0.62)",
    };
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
          <div className="wm-body-sm wm-page-subtitle-muted" style={{ maxWidth: 920 }}>
            Create the project shell once, then choose the best way to begin. Wingman should
            adapt to how the opportunity arrives, whether that is a guided conversation, a proven
            template, a customer brief, or an existing diagram.
          </div>
        </div>
      </section>

      {templateSeed ? (
        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Template starter loaded</h2>
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
              Recommended next step: {getToolLabel(templateSeed.recommendedTool)}
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
                Create shell and open {getToolLabel(templateSeed.recommendedTool)}
              </button>
              <button type="button" className="wm-btn" onClick={discardSelectedTemplate}>
                Discard template starter
              </button>
            </div>
          </article>
        </section>
      ) : null}

      <section
        ref={detailsRef}
        className="wm-section"
        style={workflowSectionStyle("details")}
        onClick={() => setActiveFlowStep("details")}
      >
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <div style={workflowLabelStyle("details")}>Step 1 / Opportunity details{activeFlowStep === "details" ? " / Current position" : ""}</div>
            <h2>Opportunity details</h2>
            <p>Keep this light. Add just enough commercial context so the next workflow has a project to work from.</p>
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

        {recentCustomers.length > 0 || recentSites.length > 0 || recentRooms.length > 0 ? (
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <div className="wm-body-sm" style={{ opacity: 0.78 }}>
              Quick carry-forward
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {recentCustomers.map((value) => (
                <button
                  key={`customer-${value}`}
                  type="button"
                  className="wm-chip"
                  onClick={() => {
                    setCustomer(value);
                    setActiveFlowStep("reuse");
                  }}
                >
                  Customer: {value}
                </button>
              ))}
              {recentSites.map((value) => (
                <button
                  key={`site-${value}`}
                  type="button"
                  className="wm-chip"
                  onClick={() => {
                    setSite(value);
                    setActiveFlowStep("reuse");
                  }}
                >
                  Site: {value}
                </button>
              ))}
              {recentRooms.map((value) => (
                <button
                  key={`room-${value}`}
                  type="button"
                  className="wm-chip"
                  onClick={() => {
                    setName(value);
                    setActiveFlowStep("reuse");
                  }}
                >
                  Room: {value}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="wm-actions-row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="wm-btn wm-btn-primary"
            onClick={() => startWith(START_METHODS[0])}
          >
            Continue workflow
          </button>
        </div>
      </section>

      {hasRecentProjects ? (
        <section
          ref={reuseRef}
          className="wm-section"
          style={workflowSectionStyle("reuse")}
          onClick={() => setActiveFlowStep("reuse")}
        >
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <div style={workflowLabelStyle("reuse")}>Step 1 / Reuse context{activeFlowStep === "reuse" ? " / Current position" : ""}</div>
              <h2>Reuse recent project context</h2>
              <p>Pull forward the commercial context or duplicate a similar room so repeat work starts faster.</p>
            </div>
          </div>

          <CollapsibleCard
            id="project-new-reuse-context"
            title="Recent project context"
            subtitle="Expand only when you want to reuse or duplicate past opportunities."
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
                          {[project.customer || "Customer not set", project.site || "Site not set", project.roomName || "Room not set"].join(" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€šÂ· ")}
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
