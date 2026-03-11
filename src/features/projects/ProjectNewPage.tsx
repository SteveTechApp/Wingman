import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileUp,
  FolderPlus,
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
  getRecentTextEntries,
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

export default function ProjectNewPage() {
  const nav = useNavigate();
  const [name, setName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [templateSeed, setTemplateSeed] = React.useState<WorkbenchTemplateSeed | null>(() =>
    readTemplateSeed()
  );
  const recentProjects = React.useSyncExternalStore(
    subscribeProjects,
    () => loadProjects().slice(0, 3),
    () => [],
  );
  const recentCustomers = getRecentTextEntries(RECENT_TEXT_HISTORY_KEYS.customer).slice(0, 3);
  const recentSites = getRecentTextEntries(RECENT_TEXT_HISTORY_KEYS.site).slice(0, 3);
  const recentRooms = getRecentTextEntries(RECENT_TEXT_HISTORY_KEYS.roomName).slice(0, 3);

  React.useEffect(() => {
    if (!templateSeed) return;
    setName((current) => current.trim() ? current : templateSeed.projectName);
  }, [templateSeed]);

  function createShell(methodTitle: string) {
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

  function createBlankWorkspace() {
    const project = createShell("New");
    nav(`/app/projects/${encodeURIComponent(project.id)}`);
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

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boardroom Upgrade"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Customer</span>
            <RecentTextInput
              className="wm-form-input"
              historyKey={RECENT_TEXT_HISTORY_KEYS.customer}
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="e.g. Acme Ltd"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Site</span>
            <RecentTextInput
              className="wm-form-input"
              historyKey={RECENT_TEXT_HISTORY_KEYS.site}
              value={site}
              onChange={(e) => setSite(e.target.value)}
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
                <button key={`customer-${value}`} type="button" className="wm-chip" onClick={() => setCustomer(value)}>
                  Customer: {value}
                </button>
              ))}
              {recentSites.map((value) => (
                <button key={`site-${value}`} type="button" className="wm-chip" onClick={() => setSite(value)}>
                  Site: {value}
                </button>
              ))}
              {recentRooms.map((value) => (
                <button key={`room-${value}`} type="button" className="wm-chip" onClick={() => setName(value)}>
                  Room: {value}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {recentProjects.length > 0 ? (
        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Reuse recent project context</h2>
              <p>Pull forward the commercial context or duplicate a similar room so repeat work starts faster.</p>
            </div>
          </div>

          <div className="wm-grid-cards">
            {recentProjects.map((project) => {
              const resumeAction = getProjectResumeAction(project);

              return (
                <article key={project.id} className="wm-work-card" style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div className="wm-title-lg">{project.name}</div>
                      <div className="wm-body-sm" style={{ opacity: 0.76 }}>
                        {[project.customer || "Customer not set", project.site || "Site not set", project.roomName || "Room not set"].join(" · ")}
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
        </section>
      ) : null}

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Choose how to start</h2>
            <p>Pick the method that matches the information you have today. You can always switch tools later.</p>
          </div>
        </div>

        <div className="wm-grid-cards">
          {START_METHODS.map(({ id, title, description, helper, to, Icon }) => (
            <article
              key={id}
              className="wm-work-card"
              style={{
                display: "grid",
                gap: 14,
                alignContent: "start",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(92, 189, 222, 0.18)",
                  background: "linear-gradient(135deg, rgba(9,32,56,0.92), rgba(11,78,89,0.70))",
                }}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="wm-title-lg">{title}</div>
              <div className="wm-body">{description}</div>
              <div className="wm-body-sm" style={{ opacity: 0.72 }}>
                {helper}
              </div>

              <button
                type="button"
                className={`wm-btn${id === "guided-project" ? " wm-btn-primary" : ""}`}
                onClick={() => startWith({ id, title, description, helper, to, Icon })}
              >
                Start with {title}
              </button>
            </article>
          ))}

          <article className="wm-work-card" style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <FolderPlus className="h-5 w-5" />
            </div>
            <div className="wm-title-lg">Blank Workspace</div>
            <div className="wm-body">
              Create a project shell first and decide on the workflow later from the project page.
            </div>
            <div className="wm-body-sm" style={{ opacity: 0.72 }}>
              Best for admin setup or when the opportunity still needs triage.
            </div>
            <button type="button" className="wm-btn" onClick={createBlankWorkspace}>
              Create Blank Workspace
            </button>
          </article>
        </div>

        <div className="wm-actions-row" style={{ marginTop: 16 }}>
          <button type="button" className="wm-btn" onClick={() => nav(WM_ROUTES.projects)}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
