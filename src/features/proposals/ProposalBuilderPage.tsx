import React from "react";

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
          <div>
            <div className="wm-title-xl">Proposal Builder</div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Convert project requirements and selected products into a structured customer-ready output.
            </div>
            <div className="wm-body-sm" style={{ marginTop: 6, opacity: 0.78 }}>
              Active project: {activeProject?.name ?? "No active project selected"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn" onClick={saveDraftToProject} disabled={!activeProject}>
              Save Proposal Draft
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

      <section style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 10 }}>
        <div className="wm-panel" style={{ padding: 12 }}>
          <div className="wm-section-title">Proposal content</div>

          <div className="wm-grid" style={{ marginTop: 8 }}>
            {FIELDS.map((field) => (
              <label key={field.id} className="wm-grid" style={{ gap: 4 }}>
                <span className="wm-body-sm">{field.label}</span>
                <textarea
                  className="wm-panel-soft"
                  style={{
                    width: "100%",
                    minHeight: field.rows * 21,
                    padding: 10,
                    color: "var(--wm-text)",
                    background: "rgba(10,22,36,0.55)",
                    border: "1px solid var(--wm-border-soft)",
                    resize: "vertical",
                    outline: "none",
                  }}
                  value={draft[field.id]}
                  placeholder={field.placeholder}
                  onChange={(event) => updateField(field.id, event.target.value)}
                />
              </label>
            ))}

            <label className="wm-grid" style={{ gap: 4 }}>
              <span className="wm-body-sm">Next customer-safe step</span>
              <input
                className="wm-panel-soft"
                value={draft.nextStep}
                onChange={(event) => updateField("nextStep", event.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  color: "var(--wm-text)",
                  background: "rgba(10,22,36,0.55)",
                  border: "1px solid var(--wm-border-soft)",
                  outline: "none",
                }}
              />
            </label>
          </div>
        </div>

        <div className="wm-grid" style={{ gap: 8 }}>
          <div className="wm-panel" style={{ padding: 12 }}>
            <div className="wm-title-lg">Output summary</div>
            <div className="wm-body" style={{ marginTop: 6 }}>
              Proposal Builder should be the final workflow step after Discovery, Templates or Room Designer.
            </div>

            <div className="wm-grid" style={{ marginTop: 10, gap: 6 }}>
              <div className="wm-body-sm">BOM lines: {proposalState.lines.length}</div>
              <div className="wm-body-sm">
                Total sell: {formatCurrency(totals.currency, totals.totalSell)}
              </div>
              <div className="wm-body-sm">
                Total cost: {formatCurrency(totals.currency, totals.totalCost)}
              </div>
              <div className="wm-body-sm">
                Margin: {totals.grossMarginPct.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="wm-panel" style={{ padding: 12 }}>
            <div className="wm-title-lg">Readiness status</div>
            <div className="wm-body" style={{ marginTop: 6 }}>
              {readiness.status} ({readiness.score}%)
            </div>
            <div className="wm-body-sm" style={{ marginTop: 6, opacity: 0.78 }}>
              {readiness.nextStep}
            </div>
            <div className="wm-body-sm" style={{ marginTop: 8, opacity: 0.72 }}>
              {savedAt ? `Saved at ${savedAt}` : "Draft auto-saves locally as you type."}
            </div>
          </div>
        </div>
      </section>

      <ProposalHandoffPanel
        status={readiness.status}
        score={readiness.score}
        checks={readiness.checks}
        nextStep={readiness.nextStep}
      />
    </div>
  );
}