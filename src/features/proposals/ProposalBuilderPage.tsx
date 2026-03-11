import React from "react";
import { useNavigate } from "react-router-dom";

import { WM_ROUTES } from "@/core/wingman/routeMap";
import ProposalHandoffPanel from "@/features/proposals/ProposalHandoffPanel";
import {
  getActiveProject,
  subscribeProjects,
  type StoredProject,
  updateProject,
} from "@/features/projects/projectStore";
import { evaluateCommercialReadiness } from "@/features/readiness/commercialReadiness";
import {
  getBomLineCoverage,
  getCommercialTierProfile,
  getTierCoverageSummary,
  normalizePriceTier,
  type BomLineCoverage,
  type CommercialTier,
} from "@/proposal/bom/pricing";
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
    placeholder: "Add BOM notes, tier assumptions, and delivery dependencies.",
    rows: 4,
  },
  {
    id: "commercialNotes",
    label: "Commercial notes",
    placeholder: "Capture offer positioning, differentiators, and stakeholder guidance.",
    rows: 4,
  },
  {
    id: "assumptions",
    label: "Assumptions",
    placeholder: "List project assumptions that influence scope and offer level.",
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
  nextStep: "Confirm offer tier and issue proposal pack",
};

const TIER_OPTIONS: Array<{ value: CommercialTier; label: string }> = [
  { value: "Bronze", label: "Bronze - Low cost" },
  { value: "Silver", label: "Silver - Medium cost" },
  { value: "Gold", label: "Gold - High cost" },
];

const COVERAGE_ORDER: Record<BomLineCoverage["disposition"], number> = {
  included: 0,
  optional: 1,
  held: 2,
};

const COVERAGE_STYLES: Record<
  BomLineCoverage["disposition"],
  { background: string; borderColor: string; color: string }
> = {
  included: {
    background: "rgba(58, 122, 86, 0.12)",
    borderColor: "rgba(58, 122, 86, 0.22)",
    color: "#2f6a46",
  },
  optional: {
    background: "rgba(194, 147, 45, 0.14)",
    borderColor: "rgba(194, 147, 45, 0.22)",
    color: "#8d6413",
  },
  held: {
    background: "rgba(115, 126, 144, 0.12)",
    borderColor: "rgba(115, 126, 144, 0.2)",
    color: "#556273",
  },
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

function deriveSuggestedPriceTier(project: StoredProject | null | undefined): CommercialTier {
  const tier = project?.proposal?.selectedTier ?? project?.template?.tier;
  return normalizePriceTier(
    tier === "Bronze" || tier === "Silver" || tier === "Gold" ? tier : undefined,
  );
}

function joinCategories(categories: readonly string[]): string {
  return categories.length > 0 ? categories.join(", ") : "None";
}

export default function ProposalBuilderPage() {
  const navigate = useNavigate();
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    getActiveProject,
    getActiveProject
  );

  const projectId = activeProject?.id ?? "default";
  const [proposalState, proposalDispatch] = useProposalStore(projectId);
  const [draft, setDraft] = React.useState<ProposalDraft>(() => readDraft(projectId));
  const [savedAt, setSavedAt] = React.useState("");
  const suggestedPriceTier = React.useMemo(
    () => deriveSuggestedPriceTier(activeProject),
    [activeProject],
  );

  React.useEffect(() => {
    setDraft(readDraft(projectId));
    setSavedAt("");
  }, [projectId]);

  React.useEffect(() => {
    writeDraft(projectId, draft);
  }, [projectId, draft]);

  React.useEffect(() => {
    const metaPatch: {
      projectName?: string;
      priceTier?: CommercialTier;
    } = {};

    if (activeProject?.name && proposalState.meta.projectName !== activeProject.name) {
      metaPatch.projectName = activeProject.name;
    }

    if (!proposalState.meta.priceTier) {
      metaPatch.priceTier = suggestedPriceTier;
    }

    if (Object.keys(metaPatch).length > 0) {
      proposalDispatch({ type: "SET_META", patch: metaPatch });
    }
  }, [
    activeProject?.name,
    proposalDispatch,
    proposalState.meta.priceTier,
    proposalState.meta.projectName,
    suggestedPriceTier,
  ]);

  const activePriceTier = normalizePriceTier(proposalState.meta.priceTier);
  const tierProfile = React.useMemo(
    () => getCommercialTierProfile(activePriceTier),
    [activePriceTier],
  );
  const coverageSummary = React.useMemo(
    () => getTierCoverageSummary(proposalState.lines, activePriceTier),
    [proposalState.lines, activePriceTier],
  );
  const tieredLines = React.useMemo(
    () =>
      proposalState.lines
        .map((line) => ({
          line,
          coverage: getBomLineCoverage(line, activePriceTier),
        }))
        .sort((left, right) => {
          const byDisposition =
            COVERAGE_ORDER[left.coverage.disposition] - COVERAGE_ORDER[right.coverage.disposition];

          if (byDisposition !== 0) return byDisposition;
          return (left.line.description || left.line.sku).localeCompare(
            right.line.description || right.line.sku,
          );
        }),
    [proposalState.lines, activePriceTier],
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

  const updatePricingTier = (value: CommercialTier) => {
    proposalDispatch({
      type: "SET_META",
      patch: {
        priceTier: value,
      },
    });
  };

  const updateLineQty = (lineId: string, value: string) => {
    const qty = Math.max(1, Number(value) || 1);
    proposalDispatch({
      type: "UPDATE_LINE",
      id: lineId,
      patch: { qty },
    });
  };

  const removeLine = (lineId: string) => {
    proposalDispatch({
      type: "REMOVE_LINE",
      id: lineId,
    });
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
        selectedTier: activePriceTier,
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
              Turn the current BOM into a customer-ready proposal with low, medium, and high offer paths.
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
              <p>Capture the narrative and customer-safe framing before handoff.</p>
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
                <h2>Offer tiering</h2>
                <p>Wingman does not hold pricing data, so tiers shape lean, balanced, and enhanced BOM options by default.</p>
              </div>
            </div>

            <div className="wm-form-grid">
              <label className="wm-form-field">
                <span className="wm-form-label">Offer tier</span>
                <select
                  className="wm-form-input"
                  value={activePriceTier}
                  onChange={(event) => updatePricingTier(event.target.value as CommercialTier)}
                >
                  {TIER_OPTIONS.map((tier) => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              className="wm-work-card"
              style={{
                marginTop: 12,
                display: "grid",
                gap: 10,
                background: "linear-gradient(135deg, rgba(247,250,252,0.96), rgba(237,244,249,0.92))",
              }}
            >
              <div className="wm-title-lg">{tierProfile.scopeLabel}</div>
              <div className="wm-body-sm">{tierProfile.description}</div>
              <div className="wm-body-sm">
                Suggested from project: {suggestedPriceTier}
              </div>
              <div className="wm-body-sm">
                Included by default: {joinCategories(tierProfile.includedCategories)}
              </div>
              <div className="wm-body-sm">
                Optional add-ons: {joinCategories(tierProfile.optionalCategories)}
              </div>
            </div>
          </section>

          <section className="wm-section">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Offer summary</h2>
                <p>See how much of the current BOM this tier carries by default.</p>
              </div>
            </div>

            <div
              className="wm-grid wm-proposal-builder-page__summary"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}
            >
              <article className="wm-work-card">
                <div className="wm-body-sm" style={{ opacity: 0.72 }}>Cost posture</div>
                <div className="wm-title-lg" style={{ marginTop: 4 }}>{coverageSummary.costBand}</div>
                <div className="wm-body-sm" style={{ marginTop: 4 }}>{activePriceTier}</div>
              </article>

              <article className="wm-work-card">
                <div className="wm-body-sm" style={{ opacity: 0.72 }}>Included now</div>
                <div className="wm-title-lg" style={{ marginTop: 4 }}>{coverageSummary.includedLines}</div>
                <div className="wm-body-sm" style={{ marginTop: 4 }}>
                  {coverageSummary.includedCoveragePct}% of lines
                </div>
              </article>

              <article className="wm-work-card">
                <div className="wm-body-sm" style={{ opacity: 0.72 }}>Optional</div>
                <div className="wm-title-lg" style={{ marginTop: 4 }}>{coverageSummary.optionalLines}</div>
                <div className="wm-body-sm" style={{ marginTop: 4 }}>
                  {coverageSummary.optionalQty} total units
                </div>
              </article>

              <article className="wm-work-card">
                <div className="wm-body-sm" style={{ opacity: 0.72 }}>Held back</div>
                <div className="wm-title-lg" style={{ marginTop: 4 }}>{coverageSummary.heldBackLines}</div>
                <div className="wm-body-sm" style={{ marginTop: 4 }}>
                  {coverageSummary.heldBackQty} total units
                </div>
              </article>

              <article className="wm-work-card">
                <div className="wm-body-sm" style={{ opacity: 0.72 }}>Current BOM</div>
                <div className="wm-title-lg" style={{ marginTop: 4 }}>{coverageSummary.totalLines}</div>
                <div className="wm-body-sm" style={{ marginTop: 4 }}>
                  {coverageSummary.totalQty} total units
                </div>
              </article>
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

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Tiered BOM review</h2>
            <p>Check which lines are in, optional, or held back for the selected offer level.</p>
          </div>
        </div>

        {tieredLines.length > 0 ? (
          <div className="wm-grid" style={{ gap: 12 }}>
            {tieredLines.map(({ line, coverage }) => {
              const coverageStyle = COVERAGE_STYLES[coverage.disposition];
              const quantity = line.qty || 1;

              return (
                <article key={line.id} className="wm-work-card" style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="wm-title-lg">{line.description || line.sku}</div>
                      <div className="wm-body-sm" style={{ opacity: 0.74 }}>
                        {line.sku}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="wm-chip">{coverage.category}</span>
                      <span
                        className="wm-chip"
                        style={{
                          background: coverageStyle.background,
                          borderColor: coverageStyle.borderColor,
                          color: coverageStyle.color,
                        }}
                      >
                        {coverage.label}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 10,
                      alignItems: "end",
                    }}
                  >
                    <label className="wm-form-field" style={{ marginBottom: 0 }}>
                      <span className="wm-form-label">Qty</span>
                      <input
                        className="wm-form-input"
                        type="number"
                        min={1}
                        step={1}
                        value={quantity}
                        onChange={(event) => updateLineQty(line.id, event.target.value)}
                      />
                    </label>

                    <div className="wm-body-sm">
                      Offer status
                      <div className="wm-title-lg" style={{ marginTop: 4 }}>
                        {coverage.label}
                      </div>
                    </div>

                    <div className="wm-body-sm" style={{ gridColumn: "span 2" }}>
                      Tier note
                      <div style={{ marginTop: 4, opacity: 0.84 }}>
                        {coverage.reason}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="wm-btn"
                      onClick={() => removeLine(line.id)}
                    >
                      Remove
                    </button>
                  </div>

                  {hasText(line.notes) ? (
                    <div className="wm-body-sm" style={{ opacity: 0.76 }}>
                      {line.notes}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="wm-work-card">
            <div className="wm-title-lg">No BOM lines yet</div>
            <div className="wm-body" style={{ marginTop: 6 }}>
              Add SKUs from Guru or the catalogue to start shaping Bronze, Silver, and Gold offer levels.
            </div>
          </div>
        )}
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
