import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  updateProjectDiscovery,
  type DiscoveryProductFamily,
} from "@/features/projects/projectStore";

type IntakeMode = "document" | "notes" | "summary" | "diagram";
type SupportPanel = "summary" | "next";

type IntakeModeConfig = {
  label: string;
  description: string;
  sourceType: string;
  nextRoute: string;
  secondaryRoute: string;
  supportCopy: string;
  recommendedFamilies: DiscoveryProductFamily[];
};

const PRIORITY_OPTIONS = ["Standard", "High priority", "Urgent"] as const;

const MODE_CONFIG: Record<IntakeMode, IntakeModeConfig> = {
  document: {
    label: "Document",
    description: "Bring in consultant briefs, tender sections, or structured files without making the first screen too busy.",
    sourceType: "Imported document",
    nextRoute: WM_ROUTES.discovery,
    secondaryRoute: WM_ROUTES.proposal,
    supportCopy: "Use discovery next when the brief is detailed enough to shape the workflow before product selection.",
    recommendedFamilies: ["Apollo", "Matrix"],
  },
  notes: {
    label: "Notes",
    description: "Capture rough meeting notes first, then move into a clearer room definition workflow.",
    sourceType: "Meeting notes",
    nextRoute: WM_ROUTES.roomWizard,
    secondaryRoute: WM_ROUTES.discovery,
    supportCopy: "Use Room Wizard next when the brief is messy and the room still needs to be defined clearly.",
    recommendedFamilies: ["Apollo", "USB Extension"],
  },
  summary: {
    label: "Summary",
    description: "Start from a short opportunity summary and push quickly toward a commercial next step.",
    sourceType: "Opportunity summary",
    nextRoute: WM_ROUTES.proposal,
    secondaryRoute: WM_ROUTES.discovery,
    supportCopy: "Use Proposal next when the scope is already agreed and the user mainly needs the commercial output.",
    recommendedFamilies: ["Apollo"],
  },
  diagram: {
    label: "Diagram",
    description: "Start from an existing system map or sketch and move into product validation instead of repeating discovery.",
    sourceType: "Existing system diagram",
    nextRoute: WM_ROUTES.catalog,
    secondaryRoute: WM_ROUTES.proposal,
    supportCopy: "Use the catalogue next when the topology already exists and the remaining job is confirming the product fit.",
    recommendedFamilies: ["HDBaseT", "AVoIP", "Matrix"],
  },
};

function normalizeMode(value: string | null): IntakeMode {
  if (value === "notes" || value === "summary" || value === "diagram") return value;
  return "document";
}

function getRouteLabel(route: string): string {
  if (route === WM_ROUTES.discovery) return "Discovery";
  if (route === WM_ROUTES.roomWizard) return "Room Wizard";
  if (route === WM_ROUTES.catalog) return "Product Catalogue";
  if (route === WM_ROUTES.proposal) return "Proposal";
  return "Next Tool";
}

function buildReadiness(characterCount: number): string {
  if (characterCount > 600) return "Detailed brief";
  if (characterCount > 220) return "Usable brief";
  if (characterCount > 40) return "Early-stage brief";
  return "No usable brief yet";
}

export default function ImportIntakePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customerName, setCustomerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [inputText, setInputText] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>("Standard");
  const [panel, setPanel] = useState<SupportPanel>("summary");

  const mode = normalizeMode(searchParams.get("mode"));
  const modeConfig = MODE_CONFIG[mode];

  const summary = useMemo(() => {
    const trimmed = inputText.trim();
    const charCount = trimmed.length;
    const readiness = buildReadiness(charCount);

    return {
      charCount,
      readiness,
      nextStep: `${getRouteLabel(modeConfig.nextRoute)} is the cleanest next step after ${modeConfig.label.toLowerCase()} intake.`,
      supportingRoute: getRouteLabel(modeConfig.secondaryRoute),
    };
  }, [inputText, modeConfig]);

  function persistAndNavigate(route: string) {
    const existing = getActiveProject();
    const trimmedCustomer = customerName.trim();
    const trimmedProject = projectName.trim();
    const trimmedInput = inputText.trim();

    const nextName =
      trimmedProject ||
      existing?.name?.trim() ||
      `${modeConfig.label} Project`;
    const nextCustomer = trimmedCustomer || existing?.customer?.trim() || "";
    const nextRoomName =
      trimmedProject ||
      existing?.roomName?.trim() ||
      nextName;
    const nextNotes = trimmedInput || existing?.notes?.trim() || "";

    const project = ensureActiveProject({
      name: nextName,
      customer: nextCustomer,
      roomName: nextRoomName,
      stage: "Discovery",
      status: "Draft",
      notes: nextNotes,
    });

    setActiveProjectId(project.id);
    updateProjectDiscovery(project.id, {
      customer: nextCustomer,
      roomName: nextRoomName,
      workflowTrack: `Import intake: ${modeConfig.label}`,
      projectScope: summary.readiness,
      customerOutcome: summary.nextStep,
      sourceTypes: modeConfig.sourceType,
      urgency: priority,
      notes: nextNotes,
      recommendedFamilies: modeConfig.recommendedFamilies,
      recommendedNextTool: route,
    });

    navigate(route);
  }

  const left = (
    <div className="wm-workspace-stack">
      <div className="wm-start-step">
        Capture only the baseline information here. Keep the heavy discovery, room shaping, or pricing work in the next tool.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Choose intake mode</h3>
          <p className="wm-workspace-card__copy">{modeConfig.description}</p>
        </div>

        <div className="wm-workspace-tag-row">
          {(Object.keys(MODE_CONFIG) as IntakeMode[]).map((value) => {
            const active = value === mode;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                className={`wm-workspace-tab${active ? " wm-workspace-tab--active" : ""}`}
                onClick={() => setSearchParams({ mode: value })}
              >
                {MODE_CONFIG[value].label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Capture project context</h3>
          <p className="wm-workspace-card__copy">Keep the user focused on the next input, not a long scrolling intake screen.</p>
        </div>

        <div className="wm-workspace-form">
          <div className="wm-workspace-grid-2">
            <div className="wm-workspace-field">
              <label htmlFor="intake-customer" className="wm-workspace-label">
                Customer
              </label>
              <input
                id="intake-customer"
                className="wm-input-dark"
                type="text"
                placeholder="Customer or end user"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>

            <div className="wm-workspace-field">
              <label htmlFor="intake-project" className="wm-workspace-label">
                Project name
              </label>
              <input
                id="intake-project"
                className="wm-input-dark"
                type="text"
                placeholder="Project or opportunity name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </div>
          </div>

          <div className="wm-workspace-field">
            <label htmlFor="intake-priority" className="wm-workspace-label">
              Priority
            </label>
            <select
              id="intake-priority"
              className="wm-select-dark"
              value={priority}
              onChange={(event) => setPriority(event.target.value as (typeof PRIORITY_OPTIONS)[number])}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="wm-workspace-field">
            <label htmlFor="intake-text" className="wm-workspace-label">
              Intake text
            </label>
            <textarea
              id="intake-text"
              className="wm-textarea-dark"
              placeholder="Paste the brief, notes, summary, or system description here."
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-grid-2">
          <div className="wm-workspace-metric">
            <span>Brief health</span>
            <strong>{summary.readiness}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Characters</span>
            <strong>{summary.charCount}</strong>
          </div>
        </div>

        <div className="wm-next-step">
          Save the intake before leaving the page. The next tool should open with the baseline already attached to the active project.
        </div>
      </section>
    </div>
  );

  const right = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-tab-row">
          <button
            type="button"
            className={`wm-workspace-tab${panel === "summary" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setPanel("summary")}
          >
            Intake summary
          </button>
          <button
            type="button"
            className={`wm-workspace-tab${panel === "next" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setPanel("next")}
          >
            Next steps
          </button>
        </div>

        {panel === "summary" ? (
          <div className="wm-workspace-tabpanel">
            <div className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <span className="wm-workspace-list-item__eyebrow">{modeConfig.label}</span>
                <h3 className="wm-workspace-card__title">{modeConfig.sourceType}</h3>
                <p className="wm-workspace-card__copy">{modeConfig.supportCopy}</p>
              </div>

              <div className="wm-workspace-grid-2">
                <div className="wm-workspace-metric">
                  <span>Priority</span>
                  <strong>{priority}</strong>
                </div>
                <div className="wm-workspace-metric">
                  <span>Recommended tool</span>
                  <strong>{getRouteLabel(modeConfig.nextRoute)}</strong>
                </div>
              </div>

              <div className="wm-workspace-tag-row">
                {modeConfig.recommendedFamilies.map((family) => (
                  <span key={family} className="wm-workspace-tag">
                    {family}
                  </span>
                ))}
              </div>
            </div>

            <div className="wm-workspace-card">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Captured context</h3>
                <p className="wm-workspace-card__copy">The right column stays supportive, so the main typing surface remains clean on the left.</p>
              </div>

              <div className="wm-workspace-list">
                <div className="wm-workspace-list-item">
                  <span className="wm-workspace-list-item__title">Customer</span>
                  <span className="wm-workspace-list-item__copy">{customerName.trim() || "Not set yet"}</span>
                </div>
                <div className="wm-workspace-list-item">
                  <span className="wm-workspace-list-item__title">Project</span>
                  <span className="wm-workspace-list-item__copy">{projectName.trim() || "Will use the active project name"}</span>
                </div>
                <div className="wm-workspace-list-item">
                  <span className="wm-workspace-list-item__title">Suggested path</span>
                  <span className="wm-workspace-list-item__copy">{summary.nextStep}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="wm-workspace-tabpanel">
            <div className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Recommended next tool</h3>
                <p className="wm-workspace-card__copy">{summary.nextStep}</p>
              </div>

              <div className="wm-workspace-action-row">
                <button type="button" className="wm-btn-primary" onClick={() => persistAndNavigate(modeConfig.nextRoute)}>
                  Save and open {getRouteLabel(modeConfig.nextRoute)}
                </button>
                <button type="button" className="wm-btn-secondary" onClick={() => persistAndNavigate(modeConfig.secondaryRoute)}>
                  Save and open {summary.supportingRoute}
                </button>
              </div>
            </div>

            <div className="wm-workspace-list">
              <div className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__title">Why this path</span>
                <span className="wm-workspace-list-item__copy">{modeConfig.supportCopy}</span>
              </div>
              <div className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__title">What is saved first</span>
                <span className="wm-workspace-list-item__copy">Customer, project name, urgency, source type, the imported brief, and the recommended next tool.</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Import Intake"
      subtitle="Keep capture on the left and move supporting guidance into the right pane so the page stays clean and the next action stays obvious."
      leftTitle="Project Input"
      rightTitle="Support"
      left={left}
      right={right}
      top={
        <div className="wm-workspace-action-row">
          <button type="button" className="wm-btn-secondary" onClick={() => persistAndNavigate(modeConfig.secondaryRoute)}>
            Save and open {summary.supportingRoute}
          </button>
          <button type="button" className="wm-btn-primary" onClick={() => persistAndNavigate(modeConfig.nextRoute)}>
            Save and open {getRouteLabel(modeConfig.nextRoute)}
          </button>
        </div>
      }
    />
  );
}
