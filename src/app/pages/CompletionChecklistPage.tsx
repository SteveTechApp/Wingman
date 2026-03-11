import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  getActiveProject,
  getProjectById,
  markProjectCommercialReady,
  setActiveProjectId,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import { evaluateCommercialReadiness } from "@/features/readiness/commercialReadiness";
import { useProposalStore } from "@/proposal/bom/store";
import { useAuth } from "@/context";

type TemplateSeed = {
  source?: string;
  verticalMarket?: { id?: string; name?: string; summary?: string };
  roomType?: { id?: string; name?: string; summary?: string; useCases?: string[] };
  tier?: {
    id?: string;
    label?: string;
    summary?: string;
    positioning?: string;
    performance?: string;
    commercialNote?: string;
  };
  includedSystems?: string[];
  uplift?: string[];
  projectName?: string;
  createdAt?: string;
};

type ManualChecks = {
  projectDetails: boolean;
  roomRequirements: boolean;
  solutionSelected: boolean;
  proposalNotes: boolean;
  bomReady: boolean;
  risksLogged: boolean;
};

type ProposalDraft = {
  executiveSummary?: string;
  customerRequirements?: string;
  systemOverview?: string;
  billOfMaterials?: string;
  commercialNotes?: string;
  assumptions?: string;
  exclusions?: string;
  nextStep?: string;
};

const DEFAULT_CHECKS: ManualChecks = {
  projectDetails: false,
  roomRequirements: false,
  solutionSelected: false,
  proposalNotes: false,
  bomReady: false,
  risksLogged: false,
};

const CHECKLIST_STORAGE_PREFIX = "wm_completion_checklist_v2";
const RESULT_STORAGE_PREFIX = "wm_completion_result_v2";
const TEMPLATE_SEED_KEY = "wm_template_seed";

function checklistStorageKey(projectId: string): string {
  return `${CHECKLIST_STORAGE_PREFIX}:${projectId}`;
}

function resultStorageKey(projectId: string): string {
  return `${RESULT_STORAGE_PREFIX}:${projectId}`;
}

function proposalStorageKey(projectId: string): string {
  return `wm_proposal_builder_v2:${projectId}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem(key, json);
    sessionStorage.setItem(key, json);
  } catch {
  }
}

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasSectionText(value: string | undefined | null, label: string): boolean {
  return typeof value === "string" && value.toLowerCase().includes(`${label.toLowerCase()}:`);
}

function hasSolutionContext(project: StoredProject | null, templateSeed: TemplateSeed): boolean {
  if (project?.template || project?.compare || project?.videowall) return true;
  if ((project?.catalog?.skus?.length ?? 0) > 0) return true;
  if ((project?.discovery?.recommendedFamilies?.length ?? 0) > 0) return true;
  return Boolean(templateSeed.tier?.label || templateSeed.includedSystems?.length);
}

function CheckRow({
  label,
  help,
  checked,
  onToggle,
}: {
  label: string;
  help: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="wm-hover-lift"
      style={{
        width: "100%",
        textAlign: "left",
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        gap: 12,
        alignItems: "start",
        padding: 14,
        borderRadius: 14,
        border: checked
          ? "1px solid rgba(94,234,212,0.28)"
          : "1px solid rgba(255,255,255,0.10)",
        background: checked
          ? "linear-gradient(180deg, rgba(94,234,212,0.12) 0%, rgba(94,234,212,0.05) 100%)"
          : "rgba(255,255,255,0.03)",
        color: "rgba(255,255,255,0.96)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          marginTop: 1,
          display: "grid",
          placeItems: "center",
          border: checked
            ? "1px solid rgba(94,234,212,0.45)"
            : "1px solid rgba(255,255,255,0.18)",
          background: checked ? "rgba(94,234,212,0.18)" : "rgba(255,255,255,0.02)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: "0.04em",
        }}
      >
        {checked ? "OK" : ""}
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{label}</div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.80)",
          }}
        >
          {help}
        </div>
      </div>
    </button>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 17 }}>{title}</div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

export default function CompletionChecklistPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const proposalStateProjectId = id ?? getActiveProject()?.id ?? "draft";
  const [proposalState] = useProposalStore(proposalStateProjectId);
  const { permissions } = useAuth();

  const templateSeed = React.useMemo(
    () => readJson<TemplateSeed>(TEMPLATE_SEED_KEY, {}),
    [],
  );

  const project = React.useSyncExternalStore(
    subscribeProjects,
    () => {
      if (id) return getProjectById(id) ?? null;
      return getActiveProject() ?? null;
    },
    () => getActiveProject() ?? null,
  );

  React.useEffect(() => {
    if (project?.id) {
      setActiveProjectId(project.id);
    }
  }, [project?.id]);

  const projectId = project?.id ?? id ?? "draft";
  const proposalDraft = React.useMemo(
    () => readJson<ProposalDraft>(proposalStorageKey(projectId), {}),
    [projectId],
  );

  const [checks, setChecks] = React.useState<ManualChecks>(() =>
    readJson<ManualChecks>(checklistStorageKey(projectId), DEFAULT_CHECKS),
  );
  const [savingReady, setSavingReady] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setChecks(readJson<ManualChecks>(checklistStorageKey(projectId), DEFAULT_CHECKS));
  }, [projectId]);

  React.useEffect(() => {
    writeJson(checklistStorageKey(projectId), checks);
  }, [projectId, checks]);

  const hasNarrative =
    (
      hasText(proposalDraft.executiveSummary) &&
      hasText(proposalDraft.customerRequirements) &&
      hasText(proposalDraft.systemOverview)
    ) ||
    hasText(project?.proposal?.title) ||
    hasText(project?.proposal?.notes);

  const hasAssumptions =
    hasText(proposalDraft.assumptions) ||
    hasSectionText(project?.proposal?.notes, "Assumptions") ||
    hasSectionText(project?.notes, "Assumptions");

  const hasExclusions =
    hasText(proposalDraft.exclusions) ||
    hasSectionText(project?.proposal?.notes, "Exclusions") ||
    hasSectionText(project?.notes, "Exclusions");

  const bomLineCount = Math.max(
    proposalState.lines.length,
    project?.catalog?.skus?.length ?? 0,
  );

  const readiness = React.useMemo(
    () =>
      evaluateCommercialReadiness(project ?? undefined, {
        hasNarrative,
        hasAssumptions,
        hasExclusions,
        bomLineCount,
      }),
    [bomLineCount, hasAssumptions, hasExclusions, hasNarrative, project],
  );

  const autoSignals = React.useMemo(() => {
    const hasProjectName = hasText(project?.name) || hasText(templateSeed.projectName);
    const hasCustomerContext =
      hasText(project?.customer) ||
      hasText(project?.site) ||
      hasText(project?.roomName);
    const hasRoomContext =
      hasText(project?.discovery?.applicationType) ||
      (hasText(templateSeed.verticalMarket?.name) && hasText(templateSeed.roomType?.name));
    const hasCommercialNotes =
      hasText(project?.proposal?.notes) ||
      hasText(project?.proposal?.title) ||
      hasText(proposalDraft.commercialNotes) ||
      hasText(templateSeed.tier?.commercialNote);

    return {
      hasProjectDetails: hasProjectName && (hasCustomerContext || hasRoomContext),
      hasRoomRequirements: Boolean(hasRoomContext || project?.discovery?.notes),
      hasSolutionSelected: hasSolutionContext(project, templateSeed),
      hasProposalNotes: hasCommercialNotes || readiness.checks.some((check) => check.id === "narrative" && check.complete),
      hasBom: bomLineCount > 0,
      hasRisks: hasAssumptions && hasExclusions,
    };
  }, [
    bomLineCount,
    hasAssumptions,
    hasExclusions,
    project,
    proposalDraft.commercialNotes,
    readiness.checks,
    templateSeed,
  ]);

  const effective = {
    projectDetails: checks.projectDetails || autoSignals.hasProjectDetails,
    roomRequirements: checks.roomRequirements || autoSignals.hasRoomRequirements,
    solutionSelected: checks.solutionSelected || autoSignals.hasSolutionSelected,
    proposalNotes: checks.proposalNotes || autoSignals.hasProposalNotes,
    bomReady: checks.bomReady || autoSignals.hasBom,
    risksLogged: checks.risksLogged || autoSignals.hasRisks,
  };

  const checklist = [
    {
      key: "projectDetails" as const,
      label: "Project details confirmed",
      help: "Project name plus customer, site, or room context are defined before hand-off.",
      checked: effective.projectDetails,
    },
    {
      key: "roomRequirements" as const,
      label: "Application and room requirements captured",
      help: "The workflow has enough room or opportunity context to defend the solution path.",
      checked: effective.roomRequirements,
    },
    {
      key: "solutionSelected" as const,
      label: "Solution direction selected",
      help: "A template, mapped product family, SKU set, compare outcome, or video wall design exists.",
      checked: effective.solutionSelected,
    },
    {
      key: "proposalNotes" as const,
      label: "Proposal positioning notes ready",
      help: "Customer-facing narrative or commercial notes are prepared for the handoff pack.",
      checked: effective.proposalNotes,
    },
    {
      key: "bomReady" as const,
      label: "BOM / export readiness checked",
      help: "There is a product set or BOM line list ready to support pricing and proposal issue.",
      checked: effective.bomReady,
    },
    {
      key: "risksLogged" as const,
      label: "Risks, assumptions, and exclusions noted",
      help: "The proposal clearly states assumptions and exclusions to reduce rework.",
      checked: effective.risksLogged,
    },
  ];

  const completedCount = checklist.filter((item) => item.checked).length;
  const totalCount = checklist.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const isReady = completedCount === totalCount;

  function toggleCheck(key: keyof ManualChecks) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function markReady() {
    const completedAt = new Date().toISOString();
    const completionNote = `Completion gate passed on ${new Date(completedAt).toLocaleString()} (${completedCount}/${totalCount} checks).`;
    const completionResult = {
      projectId,
      projectName: project?.name ?? templateSeed.projectName ?? "Current Draft Project",
      status: "Commercial Ready",
      completedAt,
      completionPercent: percent,
      checklist: effective,
      readiness,
      templateSeed,
    };

    writeJson(resultStorageKey(projectId), completionResult);
    writeJson("wm_completion_result", completionResult);

    if (project?.id) {
      setSavingReady(true);
      setSaveError(null);
      try {
        await markProjectCommercialReady(
          project.id,
          completionNote,
        );
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Unable to complete the commercial readiness gate.");
        setSavingReady(false);
        return;
      }
      setSavingReady(false);
      nav(`/app/projects/${encodeURIComponent(project.id)}`);
      return;
    }

    nav(WM_ROUTES.projects);
  }

  const projectTitle =
    project?.name ||
    templateSeed.projectName ||
    [
      templateSeed.verticalMarket?.name,
      templateSeed.roomType?.name,
      templateSeed.tier?.label,
    ]
      .filter(Boolean)
      .join(" / ") ||
    "Current Draft Project";

  const statusLabel = isReady ? "Commercial Ready" : readiness.status;

  return (
    <div
      className="wm-page wm-animate-in"
      style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">WORKFLOW VALIDATION</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Completion Workflow
          </h1>
          <div
            style={{
              maxWidth: 980,
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.5,
            }}
          >
            Use this as the final gate before proposal issue, export, or internal hand-off. The
            checklist combines manual confirmation with live project and proposal signals so the
            active opportunity can be marked commercially ready in the shared project store.
          </div>
        </div>

        {!project ? (
          <InfoCard title="Active project required">
            <div className="wm-body-sm" style={{ color: "rgba(255,255,255,0.84)", lineHeight: 1.5 }}>
              No active project is currently selected. Start or open a project first, then come
              back here to complete the final handoff gate.
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{ height: 40, padding: "0 16px" }}
                onClick={() => nav(WM_ROUTES.projects)}
              >
                Open Projects
              </button>
              <button
                type="button"
                className="wm-btn"
                style={{ height: 40, padding: "0 16px" }}
                onClick={() => nav(WM_ROUTES.newProject)}
              >
                Start New Project
              </button>
            </div>
          </InfoCard>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <InfoCard title="Readiness status">
            <div
              style={{
                borderRadius: 16,
                border: isReady
                  ? "1px solid rgba(94,234,212,0.28)"
                  : "1px solid rgba(255,255,255,0.10)",
                background: isReady
                  ? "linear-gradient(180deg, rgba(94,234,212,0.12) 0%, rgba(94,234,212,0.05) 100%)"
                  : "rgba(255,255,255,0.03)",
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.68)",
                    }}
                  >
                    Current project
                  </div>
                  <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900 }}>
                    {projectTitle}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    border: isReady
                      ? "1px solid rgba(94,234,212,0.40)"
                      : "1px solid rgba(245,158,11,0.32)",
                    background: isReady
                      ? "rgba(94,234,212,0.12)"
                      : "rgba(245,158,11,0.10)",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {statusLabel}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: isReady
                        ? "rgba(94,234,212,0.90)"
                        : "rgba(125,211,252,0.90)",
                    }}
                  />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{percent}%</div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gap: 6,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                <div>{completedCount} of {totalCount} checks complete</div>
                <div>Commercial readiness engine: {readiness.status} ({readiness.score}%)</div>
                <div>Next step: {isReady ? "Mark the project ready and return to the workspace." : readiness.nextStep}</div>
                {!permissions.canMarkCommercialReady ? (
                  <div>Only sales and admin workspace roles can complete the commercial readiness gate.</div>
                ) : null}
                {saveError ? <div style={{ color: "#ff9da5" }}>{saveError}</div> : null}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={() => { void markReady(); }}
                  disabled={!project || !isReady || !permissions.canMarkCommercialReady || savingReady}
                  title={
                    !permissions.canMarkCommercialReady
                      ? "Only sales and admin roles can complete the gate"
                      : isReady
                        ? "Mark this project ready"
                        : "Complete all checks first"
                  }
                >
                  {savingReady ? "Marking ready..." : "Mark project ready"}
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={() => nav(project ? `/app/projects/${encodeURIComponent(project.id)}` : WM_ROUTES.projects)}
                >
                  Back to Project
                </button>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Detected project context">
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800 }}>Stage and status</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                  {project ? `${project.stage || "Discovery"} / ${project.status || "Draft"}` : "Not yet detected"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800 }}>Application context</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                  {project?.discovery?.applicationType ||
                    templateSeed.roomType?.name ||
                    "Not yet detected"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800 }}>Solution evidence</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                  {autoSignals.hasSolutionSelected
                    ? "Template, mapped family, comparison, or SKU path detected"
                    : "No solution direction detected yet"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800 }}>BOM line count</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                  {bomLineCount > 0 ? `${bomLineCount} line(s) detected` : "No BOM lines detected"}
                </div>
              </div>
            </div>
          </InfoCard>
        </div>

        <InfoCard title="Checklist">
          <div style={{ display: "grid", gap: 10 }}>
            {checklist.map((item) => (
              <CheckRow
                key={item.key}
                label={item.label}
                help={item.help}
                checked={item.checked}
                onToggle={() => toggleCheck(item.key)}
              />
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Recommended workflow actions">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav(WM_ROUTES.projects)}
            >
              Open Projects
            </button>

            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav(WM_ROUTES.discovery)}
            >
              Open Guided Project
            </button>

            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav(WM_ROUTES.roomDesigner)}
            >
              Open Room Wizard
            </button>

            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav(WM_ROUTES.catalogue)}
            >
              Open Catalog
            </button>

            <button
              type="button"
              className="wm-btn"
              style={{ height: 40, padding: "0 16px" }}
              onClick={() => nav(WM_ROUTES.proposals)}
            >
              Open Proposal Builder
            </button>
          </div>
        </InfoCard>
      </div>
    </div>
  );
}
