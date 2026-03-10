import React from "react";
import { useNavigate } from "react-router-dom";

import { WM_ROUTES } from "@/core/wingman/routeMap";
import ProposalHandoffPanel from "@/features/proposals/ProposalHandoffPanel";
import {
  getActiveProject,
  subscribeProjects,
  updateProject,
} from "@/features/projects/projectStore";
import { evaluateCommercialReadiness } from "@/features/readiness/commercialReadiness";
import { computeTotals } from "@/proposal/bom/pricing";
import { useProposalStore } from "@/proposal/bom/store";

type ProposalDraft = {
  executiveSummary: string;
  customerRequirements: string;
  systemOverview: string;
  billOfMaterials: string;
  commercialNotes: string;
  assumptions: string;
  exclusions: string;
  nextStep: string;
};

type ProposalField = {
  id: keyof ProposalDraft;
  label: string;
  placeholder: string;
  rows: number;
};

const FIELDS: ProposalField[] = [
  {
    id: "executiveSummary",
    label: "Executive summary",
    placeholder: "What outcome are we delivering and why this direction?",
    rows: 4,
  },
  {
    id: "customerRequirements",
    label: "Customer requirements",
    placeholder: "Capture customer goals, use cases, and constraints in plain language.",
    rows: 4,
  },
  {
    id: "systemOverview",
    label: "System overview",
    placeholder: "Describe the proposed architecture and user workflow.",
    rows: 4,
  },
  {
    id: "billOfMaterials",
    label: "Bill of materials notes",
    placeholder: "Add BOM notes, pricing conditions, and dependencies.",
    rows: 4,
  },
  {
    id: "commercialNotes",
    label: "Commercial notes",
    placeholder: "Commercial highlights, differentiators, and stakeholder guidance.",
    rows: 4,
  },
  {
    id: "assumptions",
    label: "Assumptions",
    placeholder: "List project assumptions that influence scope and pricing.",
    rows: 3,
  },
  {
    id: "exclusions",
    label: "Exclusions",
    placeholder: "List what is out of scope for this proposal draft.",
    rows: 3,
  },
];

const EMPTY_DRAFT: ProposalDraft = {
  executiveSummary: "",
  customerRequirements: "",
  systemOverview: "",
  billOfMaterials: "",
  commercialNotes: "",
  assumptions: "",
  exclusions: "",
  nextStep: "Send to internal pricing review",
};

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function proposalStorageKey(projectId: string): string {
  return `wm_proposal_builder_v2:${projectId}`;
}

function readDraft(projectId: string): ProposalDraft {
  try {
    const raw = window.localStorage.getItem(proposalStorageKey(projectId));
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<ProposalDraft>;
    return {
      ...EMPTY_DRAFT,
      ...parsed,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeDraft(projectId: string, draft: ProposalDraft): void {
  try {
    window.localStorage.setItem(proposalStorageKey(projectId), JSON.stringify(draft));
  } catch {
  }
}

function formatCurrency(currency: string, amount: number): string {
  if (!Number.isFinite(amount)) return "0.00";
  if (currency === "GBP" || currency === "EUR" || currency === "USD") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `${amount.toFixed(2)} ${currency}`;
}

function createProjectNotes(draft: ProposalDraft): string {
  const blocks = [
    hasText(draft.executiveSummary) ? `Executive summary:\n${draft.executiveSummary.trim()}` : "",
    hasText(draft.customerRequirements) ? `Customer requirements:\n${draft.customerRequirements.trim()}` : "",
    hasText(draft.systemOverview) ? `System overview:\n${draft.systemOverview.trim()}` : "",
    hasText(draft.billOfMaterials) ? `BOM notes:\n${draft.billOfMaterials.trim()}` : "",
    hasText(draft.commercialNotes) ? `Commercial notes:\n${draft.commercialNotes.trim()}` : "",
    hasText(draft.assumptions) ? `Assumptions:\n${draft.assumptions.trim()}` : "",
    hasText(draft.exclusions) ? `Exclusions:\n${draft.exclusions.trim()}` : "",
    hasText(draft.nextStep) ? `Next step:\n${draft.nextStep.trim()}` : "",
  ].filter(Boolean);

  return blocks.join("\n\n");
}

export default function ProposalBuilderPage() {
  const navigate = useNavigate();
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    getActiveProject,
    getActiveProject
  );

  const projectId = activeProject?.id ?? "default";
  const [proposalState] = useProposalStore();
  const [draft, setDraft] = React.useState<ProposalDraft>(() => readDraft(projectId));
  const [savedAt, setSavedAt] = React.useState("");

  React.useEffect(() => {
    setDraft(readDraft(projectId));
    setSavedAt("");
  }, [projectId]);

  React.useEffect(() => {
    writeDraft(projectId, draft);
  }, [projectId, draft]);

  const totals = React.useMemo(
    () => computeTotals(proposalState.meta.currency, proposalState.lines),
    [proposalState]
  );

  const hasNarrative =
    hasText(draft.executiveSummary) &&
    hasText(draft.customerRequirements) &&
    hasText(draft.systemOverview);

  const readiness = React.useMemo(
    () =>
      evaluateCommercialReadiness(activeProject, {
        hasNarrative,
        hasAssumptions: hasText(draft.assumptions),
        hasExclusions: hasText(draft.exclusions),
        bomLineCount: proposalState.lines.length,
      }),
    [
      activeProject,
      draft.assumptions,
      draft.exclusions,
      hasNarrative,
      proposalState.lines.length,
    ]
  );

  const updateField = (id: keyof ProposalDraft, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const openCompletionWorkflow = () => {
    if (!activeProject?.id) {
      navigate(WM_ROUTES.completion);
      return;
    }
    navigate(`/app/projects/${encodeURIComponent(activeProject.id)}/completion`);
  };

  const saveDraftToProject = () => {
    if (!activeProject) return;

    updateProject(activeProject.id, {
      stage: "Proposal",
      status: readiness.status,
      proposal: {
        ...(activeProject.proposal ?? {}),
        title:
          draft.executiveSummary.trim().slice(0, 120) ||
          activeProject.proposal?.title ||
          `${activeProject.name} proposal draft`,
        notes: createProjectNotes(draft),
      },
      notes: createProjectNotes(draft),
    });

    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div>
            <div className="wm-title-xl">Proposal Builder</div>
            <div className="wm-body-sm wm-page-subtitle">
              Convert project requirements and selected products into a structured customer-ready output.
            </div>
            <div className="wm-body-sm wm-page-subtitle-muted">
              Active project: {activeProject?.name ?? "No active project selected"}
            </div>
          </div>

          <div className="wm-actions-row">
            <button type="button" className="wm-btn" onClick={saveDraftToProject} disabled={!activeProject}>
              Save Proposal Draft
            </button>
            <button
              type="button"
              className="wm-btn"
              onClick={openCompletionWorkflow}
              disabled={!activeProject}
            >
              Open Completion Workflow
            </button>
            <button
              type="button"
              className="wm-btn wm-btn-primary"
              onClick={saveDraftToProject}
              disabled={!activeProject}
            >
              Generate Proposal Pack
            </button>
          </div>
        </div>
      </section>

      <div className="wm-split-columns">
        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Proposal content</h2>
              <p>Capture customer-safe narrative and commercial notes before handoff.</p>
            </div>
          </div>

          <div className="wm-form-grid">
            {FIELDS.map((field) => (
              <label key={field.id} className="wm-form-field wm-form-field--full">
                <span className="wm-form-label">{field.label}</span>
                <textarea
                  className="wm-form-textarea"
                  rows={field.rows}
                  value={draft[field.id]}
                  placeholder={field.placeholder}
                  onChange={(event) => updateField(field.id, event.target.value)}
                />
              </label>
            ))}

            <label className="wm-form-field wm-form-field--full">
              <span className="wm-form-label">Next customer-safe step</span>
              <input
                className="wm-form-input"
                value={draft.nextStep}
                onChange={(event) => updateField("nextStep", event.target.value)}
              />
            </label>
          </div>
        </section>

        <div className="wm-grid">
          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Output summary</h2>
                <p>Check commercial baseline before generating final documents.</p>
              </div>
            </div>

            <div className="wm-grid wm-proposal-builder-page__summary">
              <div className="wm-body-sm">BOM lines: {proposalState.lines.length}</div>
              <div className="wm-body-sm">Total sell: {formatCurrency(totals.currency, totals.totalSell)}</div>
              <div className="wm-body-sm">Total cost: {formatCurrency(totals.currency, totals.totalCost)}</div>
              <div className="wm-body-sm">Margin: {totals.grossMarginPct.toFixed(1)}%</div>
            </div>
          </section>

          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Readiness status</h2>
                <p>{readiness.status} ({readiness.score}%)</p>
              </div>
            </div>

            <div className="wm-body-sm">{readiness.nextStep}</div>
            <div className="wm-body-sm wm-proposal-builder-page__autosave">
              {savedAt ? `Saved at ${savedAt}` : "Draft auto-saves locally as you type."}
            </div>
          </section>
        </div>
      </div>

      <ProposalHandoffPanel
        status={readiness.status}
        score={readiness.score}
        checks={readiness.checks}
        nextStep={readiness.nextStep}
      />
    </div>
  );
}
