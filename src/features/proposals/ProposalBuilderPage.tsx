import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  Layers3,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

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

type ProposalFieldGroup = {
  id: string;
  title: string;
  description: string;
  tone: "cyan" | "amber";
  fieldIds: Array<Exclude<keyof ProposalDraft, "nextStep">>;
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

const FIELD_GROUPS: ProposalFieldGroup[] = [
  {
    id: "story",
    title: "Customer story",
    description: "Lead with the business outcome, user needs, and solution direction.",
    tone: "cyan",
    fieldIds: ["executiveSummary", "customerRequirements", "systemOverview"],
  },
  {
    id: "commercial",
    title: "Offer framing",
    description: "Shape the BOM message, stakeholder positioning, and scope boundaries.",
    tone: "amber",
    fieldIds: ["billOfMaterials", "commercialNotes", "assumptions", "exclusions"],
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

const TIER_OPTIONS: Array<{ value: CommercialTier; label: string; strapline: string }> = [
  { value: "Bronze", label: "Low cost", strapline: "Lean essentials" },
  { value: "Silver", label: "Medium cost", strapline: "Balanced default" },
  { value: "Gold", label: "High cost", strapline: "Enhanced experience" },
];

const COVERAGE_ORDER: Record<BomLineCoverage["disposition"], number> = {
  included: 0,
  optional: 1,
  held: 2,
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

function getDraftProgress(draft: ProposalDraft): { completed: number; total: number; pct: number } {
  const values = [...FIELDS.map((field) => draft[field.id]), draft.nextStep];
  const completed = values.filter((value) => hasText(value)).length;
  const total = values.length;
  return {
    completed,
    total,
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function getReadinessTone(status: string): "ready" | "review" | "attention" {
  if (status === "Commercial Ready") return "ready";
  if (status === "Engineering Review Required") return "attention";
  return "review";
}

function getCoverageTone(disposition: BomLineCoverage["disposition"]): "included" | "optional" | "held" {
  return disposition;
}

const FIELD_BY_ID = Object.fromEntries(FIELDS.map((field) => [field.id, field])) as Record<
  ProposalField["id"],
  ProposalField
>;

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

  const draftProgress = React.useMemo(() => getDraftProgress(draft), [draft]);
  const readinessTone = getReadinessTone(readiness.status);

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
    <div className="wm-page wm-proposal-builder-page">
      <section className="wm-hero wm-proposal-builder-page__hero">
        <div className="wm-proposal-builder-page__hero-grid">
          <div className="wm-proposal-builder-page__hero-copy">
            <div className="wm-kicker">Proposal Studio</div>
            <div className="wm-title-xl">Proposal Builder</div>
            <div className="wm-body-sm wm-page-subtitle-muted">
              Turn the current BOM into a customer-ready proposal with clearer Bronze, Silver, and Gold offer paths.
            </div>

            <div className="wm-proposal-builder-page__hero-chips">
              <div className="wm-proposal-builder-page__hero-chip wm-proposal-builder-page__hero-chip--cyan">
                <FileText size={15} />
                <span>{activeProject?.name ?? "No active project selected"}</span>
              </div>
              <div className="wm-proposal-builder-page__hero-chip wm-proposal-builder-page__hero-chip--amber">
                <Layers3 size={15} />
                <span>{activePriceTier} offer</span>
              </div>
              <div className="wm-proposal-builder-page__hero-chip wm-proposal-builder-page__hero-chip--indigo">
                <ClipboardList size={15} />
                <span>{proposalState.lines.length} BOM lines</span>
              </div>
              <div className="wm-proposal-builder-page__hero-chip wm-proposal-builder-page__hero-chip--emerald">
                <ShieldCheck size={15} />
                <span>{readiness.status}</span>
              </div>
            </div>
          </div>

          <div className="wm-proposal-builder-page__hero-panel">
            <div className="wm-proposal-builder-page__hero-panel-head">
              <div className="wm-proposal-builder-page__panel-kicker">
                <Sparkles size={15} />
                <span>Proposal momentum</span>
              </div>
              <div className="wm-proposal-builder-page__autosave">
                {savedAt ? `Saved at ${savedAt}` : "Draft auto-saves locally."}
              </div>
            </div>

            <div className="wm-proposal-builder-page__hero-stat-grid">
              <article className="wm-proposal-builder-page__hero-stat wm-proposal-builder-page__hero-stat--cyan">
                <span className="wm-proposal-builder-page__hero-stat-label">Draft completion</span>
                <strong className="wm-proposal-builder-page__hero-stat-value">{draftProgress.pct}%</strong>
                <span className="wm-proposal-builder-page__hero-stat-copy">
                  {draftProgress.completed} of {draftProgress.total} content blocks ready
                </span>
              </article>

              <article className={`wm-proposal-builder-page__hero-stat wm-proposal-builder-page__hero-stat--${readinessTone}`}>
                <span className="wm-proposal-builder-page__hero-stat-label">Readiness score</span>
                <strong className="wm-proposal-builder-page__hero-stat-value">{readiness.score}%</strong>
                <span className="wm-proposal-builder-page__hero-stat-copy">{readiness.status}</span>
              </article>

              <article className="wm-proposal-builder-page__hero-stat wm-proposal-builder-page__hero-stat--amber">
                <span className="wm-proposal-builder-page__hero-stat-label">Offer posture</span>
                <strong className="wm-proposal-builder-page__hero-stat-value">{coverageSummary.costBand}</strong>
                <span className="wm-proposal-builder-page__hero-stat-copy">{tierProfile.scopeLabel}</span>
              </article>
            </div>

            <div className="wm-actions-row wm-proposal-builder-page__hero-actions">
              <button type="button" className="wm-btn" onClick={saveDraftToProject} disabled={!activeProject}>
                Save draft
              </button>
              <button
                type="button"
                className="wm-btn"
                onClick={openCompletionWorkflow}
                disabled={!activeProject}
              >
                Completion workflow
              </button>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={saveDraftToProject}
                disabled={!activeProject}
              >
                Generate pack
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="wm-split-columns wm-proposal-builder-page__split">
        <section className="wm-section wm-section--tone-cyan">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Proposal narrative</h2>
              <p>Build the customer-safe story before the proposal leaves Wingman.</p>
            </div>
          </div>

          <div className="wm-proposal-builder-page__progress-strip">
            <div className="wm-proposal-builder-page__progress-copy">
              <Target size={15} />
              <span>Keep the story concise, commercial, and safe for customer review.</span>
            </div>
            <div className="wm-proposal-builder-page__progress-track">
              <div
                className="wm-proposal-builder-page__progress-fill"
                style={{ width: `${draftProgress.pct}%` }}
              />
            </div>
          </div>

          <div className="wm-proposal-builder-page__field-groups">
            {FIELD_GROUPS.map((group) => (
              <article
                key={group.id}
                className={`wm-proposal-builder-page__field-group wm-proposal-builder-page__field-group--${group.tone}`}
              >
                <div className="wm-proposal-builder-page__field-group-head">
                  <div>
                    <div className="wm-proposal-builder-page__field-group-title">{group.title}</div>
                    <div className="wm-proposal-builder-page__field-group-copy">{group.description}</div>
                  </div>
                </div>

                <div className="wm-proposal-builder-page__field-grid">
                  {group.fieldIds.map((fieldId) => {
                    const field = FIELD_BY_ID[fieldId];
                    const complete = hasText(draft[field.id]);

                    return (
                      <label key={field.id} className="wm-form-field wm-proposal-builder-page__field-card">
                        <span className="wm-proposal-builder-page__field-labelrow">
                          <span className="wm-form-label">{field.label}</span>
                          <span className={`wm-proposal-builder-page__field-state${complete ? " is-complete" : ""}`}>
                            {complete ? "Ready" : "Drafting"}
                          </span>
                        </span>
                        <textarea
                          className="wm-form-textarea wm-proposal-builder-page__textarea"
                          rows={field.rows}
                          value={draft[field.id]}
                          placeholder={field.placeholder}
                          onChange={(event) => updateField(field.id, event.target.value)}
                        />
                      </label>
                    );
                  })}
                </div>
              </article>
            ))}

            <label className="wm-form-field wm-proposal-builder-page__next-step-card">
              <span className="wm-proposal-builder-page__field-labelrow">
                <span className="wm-form-label">Next customer-safe step</span>
                <span className={`wm-proposal-builder-page__field-state${hasText(draft.nextStep) ? " is-complete" : ""}`}>
                  {hasText(draft.nextStep) ? "Ready" : "Drafting"}
                </span>
              </span>
              <input
                className="wm-form-input wm-proposal-builder-page__next-step-input"
                value={draft.nextStep}
                onChange={(event) => updateField("nextStep", event.target.value)}
              />
            </label>
          </div>
        </section>

        <div className="wm-grid wm-proposal-builder-page__rail">
          <section className="wm-section wm-section--tone-amber">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Offer tiering</h2>
                <p>Wingman uses low, medium, and high offer logic rather than stored pricing data.</p>
              </div>
            </div>

            <div className="wm-proposal-builder-page__tier-picker">
              {TIER_OPTIONS.map((tier) => {
                const profile = getCommercialTierProfile(tier.value);
                const isActive = tier.value === activePriceTier;

                return (
                  <button
                    key={tier.value}
                    type="button"
                    className={`wm-proposal-builder-page__tier-card wm-proposal-builder-page__tier-card--${tier.value.toLowerCase()}${isActive ? " is-active" : ""}`}
                    onClick={() => updatePricingTier(tier.value)}
                  >
                    <span className="wm-proposal-builder-page__tier-card-kicker">{tier.label}</span>
                    <strong className="wm-proposal-builder-page__tier-card-title">{tier.value}</strong>
                    <span className="wm-proposal-builder-page__tier-card-strapline">{tier.strapline}</span>
                    <span className="wm-proposal-builder-page__tier-card-copy">{profile.scopeLabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="wm-proposal-builder-page__tier-focus">
              <div className="wm-proposal-builder-page__tier-focus-head">
                <strong>{tierProfile.scopeLabel}</strong>
                <span className="wm-proposal-builder-page__tier-focus-pill">
                  Suggested from project: {suggestedPriceTier}
                </span>
              </div>
              <div className="wm-proposal-builder-page__tier-focus-copy">{tierProfile.description}</div>
              <div className="wm-proposal-builder-page__tier-focus-list">
                <div>Included by default: {joinCategories(tierProfile.includedCategories)}</div>
                <div>Optional add-ons: {joinCategories(tierProfile.optionalCategories)}</div>
              </div>
            </div>
          </section>

          <section className="wm-section wm-section--tone-indigo">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Offer summary</h2>
                <p>See how much of the active BOM this offer level carries.</p>
              </div>
            </div>

            <div className="wm-proposal-builder-page__summary-grid">
              <article className="wm-work-card wm-proposal-builder-page__summary-card wm-proposal-builder-page__summary-card--indigo">
                <div className="wm-proposal-builder-page__summary-label">Cost posture</div>
                <div className="wm-title-lg">{coverageSummary.costBand}</div>
                <div className="wm-body-sm">{activePriceTier}</div>
              </article>

              <article className="wm-work-card wm-proposal-builder-page__summary-card wm-proposal-builder-page__summary-card--emerald">
                <div className="wm-proposal-builder-page__summary-label">Included now</div>
                <div className="wm-title-lg">{coverageSummary.includedLines}</div>
                <div className="wm-body-sm">{coverageSummary.includedCoveragePct}% of lines</div>
              </article>

              <article className="wm-work-card wm-proposal-builder-page__summary-card wm-proposal-builder-page__summary-card--amber">
                <div className="wm-proposal-builder-page__summary-label">Optional</div>
                <div className="wm-title-lg">{coverageSummary.optionalLines}</div>
                <div className="wm-body-sm">{coverageSummary.optionalQty} total units</div>
              </article>

              <article className="wm-work-card wm-proposal-builder-page__summary-card wm-proposal-builder-page__summary-card--slate">
                <div className="wm-proposal-builder-page__summary-label">Held back</div>
                <div className="wm-title-lg">{coverageSummary.heldBackLines}</div>
                <div className="wm-body-sm">{coverageSummary.heldBackQty} total units</div>
              </article>

              <article className="wm-work-card wm-proposal-builder-page__summary-card wm-proposal-builder-page__summary-card--cyan">
                <div className="wm-proposal-builder-page__summary-label">Current BOM</div>
                <div className="wm-title-lg">{coverageSummary.totalLines}</div>
                <div className="wm-body-sm">{coverageSummary.totalQty} total units</div>
              </article>
            </div>
          </section>

          <section className="wm-section wm-section--tone-emerald">
            <div className="wm-section__head">
              <div className="wm-section__titles">
                <h2>Readiness status</h2>
                <p>{readiness.status} ({readiness.score}%)</p>
              </div>
            </div>

            <div className={`wm-proposal-builder-page__readiness-card wm-proposal-builder-page__readiness-card--${readinessTone}`}>
              <div className="wm-proposal-builder-page__readiness-track">
                <div
                  className="wm-proposal-builder-page__readiness-fill"
                  style={{ width: `${readiness.score}%` }}
                />
              </div>
              <div className="wm-proposal-builder-page__readiness-copy">{readiness.nextStep}</div>
            </div>
          </section>
        </div>
      </div>

      <section className="wm-section wm-section--tone-indigo">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Tiered BOM review</h2>
            <p>Check what is included, optional, or held back at the selected offer level.</p>
          </div>
        </div>

        {tieredLines.length > 0 ? (
          <div className="wm-proposal-builder-page__bom-list">
            {tieredLines.map(({ line, coverage }) => {
              const quantity = line.qty || 1;
              const coverageTone = getCoverageTone(coverage.disposition);

              return (
                <article
                  key={line.id}
                  className={`wm-work-card wm-proposal-builder-page__bom-card wm-proposal-builder-page__bom-card--${coverageTone}`}
                >
                  <div className="wm-proposal-builder-page__bom-head">
                    <div className="wm-proposal-builder-page__bom-copy">
                      <div className="wm-proposal-builder-page__bom-title">{line.description || line.sku}</div>
                      <div className="wm-proposal-builder-page__bom-sku">{line.sku}</div>
                    </div>

                    <div className="wm-proposal-builder-page__bom-chips">
                      <span className="wm-proposal-builder-page__bom-chip">{coverage.category}</span>
                      <span className={`wm-proposal-builder-page__bom-chip wm-proposal-builder-page__bom-chip--${coverageTone}`}>
                        {coverage.label}
                      </span>
                    </div>
                  </div>

                  <div className="wm-proposal-builder-page__bom-metrics">
                    <label className="wm-form-field wm-proposal-builder-page__bom-metric">
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

                    <div className="wm-proposal-builder-page__bom-metric">
                      <span className="wm-proposal-builder-page__bom-metric-label">Offer status</span>
                      <strong className="wm-proposal-builder-page__bom-metric-value">{coverage.label}</strong>
                    </div>

                    <div className="wm-proposal-builder-page__bom-metric wm-proposal-builder-page__bom-metric--wide">
                      <span className="wm-proposal-builder-page__bom-metric-label">Tier note</span>
                      <strong className="wm-proposal-builder-page__bom-metric-value">{coverage.reason}</strong>
                    </div>
                  </div>

                  {hasText(line.notes) ? (
                    <div className="wm-proposal-builder-page__bom-note">{line.notes}</div>
                  ) : null}

                  <div className="wm-proposal-builder-page__bom-actions">
                    <button
                      type="button"
                      className="wm-btn"
                      onClick={() => removeLine(line.id)}
                    >
                      Remove line
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="wm-work-card wm-proposal-builder-page__empty-state">
            <div className="wm-title-lg">No BOM lines yet</div>
            <div className="wm-body">
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
