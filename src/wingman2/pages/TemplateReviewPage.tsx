import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  LayoutTemplate,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { TemplateSchematic } from "../components/TemplateSchematic";
import {
  upsertStoredProject,
  type StoredProductSelection,
  type StoredProject,
  type StoredProjectProposal,
} from "../data/projectStore";
import { exportBomCsv, exportProposalHtml } from "../lib/proposalExport";
import { buildWingmanCoachState } from "../lib/wingmanCoach";
import {
  saveRoomTemplateCopy,
  useCustomRoomTemplates,
} from "../lib/customRoomTemplates";
import {
  roomTemplates,
  type RoomTemplate,
  type TemplateBomRow,
} from "../lib/roomTemplates";
import {
  assessRoomTemplateIntegrity,
  type RoomTemplateIntegrityResult,
} from "../lib/roomTemplateIntegrity";
import { buildVerticalProposalContent } from "../lib/verticalProposalContent";
import type { SalesBomRow } from "../lib/salesReadiness";

const includedStatuses = new Set(["included", "optional", "validate"]);

function templateVisualPath(fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanFileName = fileName.replace(/^\/?template-visuals\//, "");
  return `${cleanBase}template-visuals/${cleanFileName}`;
}

function templatePhotoPath(fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanFileName = fileName.replace(/^\/?template-photos\//, "");
  return `${cleanBase}template-photos/${cleanFileName}`;
}

function cloneRows(rows: TemplateBomRow[]) {
  return rows.map((row) => ({ ...row }));
}

function roomVisualFor(template: RoomTemplate) {
  const blob =
    `${template.id} ${template.name} ${template.application}`.toLowerCase();

  if (blob.includes("multi-camera") || blob.includes("camera bridge"))
    return templatePhotoPath("photo-multicamera-meeting.jpg");
  if (blob.includes("huddle") || blob.includes("apollo"))
    return templatePhotoPath("photo-huddle-room.jpg");
  if (blob.includes("boardroom"))
    return templatePhotoPath("photo-boardroom.jpg");
  if (
    blob.includes("school hall") ||
    blob.includes("assembly") ||
    blob.includes("projector")
  )
    return templatePhotoPath("photo-school-hall-projector.jpg");
  if (blob.includes("classroom"))
    return templatePhotoPath("photo-classroom.jpg");
  if (blob.includes("lecture"))
    return templatePhotoPath("photo-school-hall-projector.jpg");
  if (blob.includes("flexible learning"))
    return templatePhotoPath("photo-flexible-learning.jpg");
  if (
    blob.includes("hybrid collaboration") ||
    blob.includes("hybrid teaching") ||
    blob.includes("dante")
  )
    return templatePhotoPath("photo-hybrid-teaching.jpg");
  if (
    blob.includes("active learning") ||
    blob.includes("600 local") ||
    blob.includes("600-trx") ||
    blob.includes("nhd600")
  )
    return templatePhotoPath("photo-situation-room.jpg");
  if (blob.includes("local pub") || blob.includes("8x8 matrix"))
    return templatePhotoPath("photo-pub-matrix.jpg");
  if (blob.includes("sports") || blob.includes("bar"))
    return templatePhotoPath("photo-sportsbar.jpg");
  if (blob.includes("casino"))
    return templatePhotoPath("photo-casino.jpg");
  if (blob.includes("bingo")) return templatePhotoPath("photo-bingo.jpg");
  if (blob.includes("led wall"))
    return templatePhotoPath("photo-led-wall.jpg");
  if (
    blob.includes("stadium") ||
    blob.includes("concourse") ||
    blob.includes("vip")
  )
    return templatePhotoPath("photo-stadium.jpg");
  if (blob.includes("security command"))
    return templatePhotoPath("photo-security-command.jpg");
  if (
    blob.includes("situation control") ||
    blob.includes("situation room")
  )
    return templatePhotoPath("photo-situation-room.jpg");
  if (blob.includes("control"))
    return templatePhotoPath("photo-control-room.jpg");
  if (blob.includes("signage"))
    return templatePhotoPath("photo-signage.jpg");
  if (blob.includes("wall")) return templatePhotoPath("photo-led-wall.jpg");

  return templateVisualPath("room-training.svg");
}

function templateBomRows(
  template: RoomTemplate,
  rows: TemplateBomRow[],
  integrity: RoomTemplateIntegrityResult,
): SalesBomRow[] {
  return rows
    .filter((row) => includedStatuses.has(row.status) && row.qty > 0)
    .map((row, index) => ({
      item: index + 1,
      sku: row.sku,
      description: row.description,
      role: row.role,
      qty: row.qty,
      type: row.type,
      status: row.status,
      evidence: row.evidence,
      notes: integrity.isVerified
        ? `${row.notes} Verified template: ${template.name}.`
        : `NOT VERIFIED: ${row.notes} Edited template: ${template.name}.`,
    }));
}

function templateProducts(rows: TemplateBomRow[]): StoredProductSelection[] {
  return rows
    .filter((row) => includedStatuses.has(row.status) && row.qty > 0)
    .map((row) => ({
      sku: row.sku,
      title: row.description,
      category: row.role,
      status: row.type === "Required" ? "recommended" : "alternative",
      source: "Room Template",
      evidence: [row.evidence],
      cautions: [row.notes],
      addedAt: new Date().toISOString(),
    }));
}

function buildTemplateProposal(
  template: RoomTemplate,
  rows: TemplateBomRow[],
  integrity: RoomTemplateIntegrityResult,
  unverifiedAccepted = false,
): StoredProjectProposal {
  const bomRows = templateBomRows(template, rows, integrity);
  const products = templateProducts(rows);
  const readinessScore = integrity.isVerified ? 100 : 35;
  const applicationProposal = buildVerticalProposalContent(
    template,
    rows,
    integrity,
  );
  const coach = buildWingmanCoachState({
    source: "proposal-template",
    audience: "dealer",
    discovery: {
      projectTitle: template.name,
      summary: applicationProposal.executiveSummary,
      roomSize: template.scale,
      displays: template.application,
    },
    selectedProducts: products,
    bomRows,
    assumptions: applicationProposal.verifiedDesignParameters,
    readinessScore,
  });

  const integrityWarnings = integrity.issues.map((issue) => issue.message);
  const templateVisuals = applicationProposal.visualBriefs.map(
    (visual, index) => ({
      id: `template-visual-${index + 1}`,
      kind: "application-visual",
      title: visual.title,
      summary: visual.purpose,
      proposalUse:
        "Include this visual in the customer proposal to improve understanding of the room, workflow or architecture.",
      exportLabel: "Proposal visual",
    }),
  );

  return {
    title: template.name,
    summary: applicationProposal.executiveSummary,
    sections: [
      "Cover",
      "Executive Summary",
      "Customer Requirement",
      "Proposed Solution",
      "Expected Benefits",
      "User Journey",
      "System Architecture",
      "Technical System Facts",
      "WyreStorm Bill of Materials",
      "Acceptance Criteria",
      "Verified Design Parameters",
      "Deployment Conditions",
      "Next Steps",
    ],
    products,
    assumptions: applicationProposal.verifiedDesignParameters,
    outputPurpose: {
      motion: integrity.isVerified
        ? "Verified room solution proposal"
        : "Unverified edited room design",
      summary: integrity.isVerified
        ? `Customer-facing ${template.vertical} proposal generated from the complete governed ${template.name} solution.`
        : `Customer-facing proposal generated from an edited ${template.name} design that no longer matches the governed baseline.`,
      customerOutput:
        "A structured application-led proposal containing the customer need, benefits, user workflow, architecture, technical facts, BOM, visuals and acceptance criteria.",
      nextAction: integrity.isVerified
        ? "Issue only within the stated template design envelope and complete normal delivery coordination."
        : "Correct every integrity issue or obtain a complete technical review before real-world use.",
    },
    governedDependencies: [],
    bomRows,
    evidence: bomRows.map((row) => `${row.sku}: ${row.evidence}`),
    repGuidance: integrity.isVerified
      ? [
          "Present the customer requirement and operational benefits before the equipment schedule.",
          "Use the architecture diagram and user journey to explain how the complete solution works.",
          "Do not remove or replace required baseline items without re-running technical integrity.",
          "Treat deployment conditions as delivery coordination, not missing template information.",
        ]
      : [
          "State clearly that the edited solution is NOT VERIFIED.",
          "Do not describe the design as approved for real-world deployment.",
          "Restore the baseline or obtain technical approval for each product, quantity and dependency change.",
          ...integrity.issues.map(
            (issue) => `${issue.message} ${issue.resolution}`,
          ),
        ],
    governanceWarnings: integrityWarnings,
    validationNotes: applicationProposal.deploymentConditions,
    visualBlocks: [...templateVisuals, ...coach.visualBlocks],
    readinessScore,
    verification: {
      status: integrity.status,
      baselineVersion: integrity.baselineVersion,
      verifiedAt: integrity.verifiedAt,
      verifiedBy: integrity.verifiedBy,
      sourceTemplateId: template.id,
      acknowledged: integrity.isVerified || unverifiedAccepted,
      summary: integrity.summary,
      issues: integrityWarnings,
    },
    applicationProposal,
    updatedAt: new Date().toISOString(),
  };
}

function buildTemplateProject(
  template: RoomTemplate,
  rows: TemplateBomRow[],
  integrity: RoomTemplateIntegrityResult,
  unverifiedAccepted: boolean,
): StoredProject {
  const timestamp = new Date().toISOString();
  const proposal = buildTemplateProposal(
    template,
    rows,
    integrity,
    unverifiedAccepted,
  );

  return {
    id: `template-${template.id}-${Date.now()}`,
    name: template.name,
    owner: "Wingman user",
    stage: "Templates",
    status: "recommended",
    updated: "Just now",
    resumeTo: `${routeCatalogByKey.templates.path}/${template.id}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    productSelections: proposal.products,
    proposal,
    workflow: {
      source: "Room Templates",
      lastStep: "Template review page",
      nextRoute: routeCatalogByKey.proposal.path,
      updatedAt: timestamp,
    },
  };
}

export function TemplateReviewPage() {
  const { templateId } = useParams();
  const customTemplates = useCustomRoomTemplates();
  const availableTemplates = useMemo(
    () => [...customTemplates, ...roomTemplates],
    [customTemplates],
  );
  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === templateId),
    [availableTemplates, templateId],
  );

  const [selectedRows, setSelectedRows] = useState<TemplateBomRow[]>(() =>
    selectedTemplate ? cloneRows(selectedTemplate.bom) : [],
  );
  const [savedProjectPath, setSavedProjectPath] = useState("");
  const [savedTemplatePath, setSavedTemplatePath] = useState("");
  const [acceptUnverified, setAcceptUnverified] = useState(false);
  const [actionWarning, setActionWarning] = useState("");

  const baselineTemplate = useMemo(() => {
    if (!selectedTemplate) return null;

    const sourceTemplateId = (
      selectedTemplate as RoomTemplate & { sourceTemplateId?: string }
    ).sourceTemplateId;

    return (
      roomTemplates.find((template) => template.id === selectedTemplate.id) ??
      roomTemplates.find((template) => template.id === sourceTemplateId) ??
      selectedTemplate
    );
  }, [selectedTemplate]);

  const integrity = useMemo(
    () =>
      selectedTemplate && baselineTemplate
        ? assessRoomTemplateIntegrity(baselineTemplate, selectedRows)
        : null,
    [baselineTemplate, selectedRows, selectedTemplate],
  );

  useEffect(() => {
    if (selectedTemplate) {
      setSelectedRows(cloneRows(selectedTemplate.bom));
      setSavedProjectPath("");
      setSavedTemplatePath("");
      setAcceptUnverified(false);
      setActionWarning("");
    }
  }, [selectedTemplate]);

  useEffect(() => {
    setAcceptUnverified(false);
    setActionWarning("");
  }, [selectedRows]);

  if (!selectedTemplate || !integrity) {
    return (
      <div
        data-wingman-template-detail-page="true"
        className="pb-10"
      >
        <PageHero
          eyebrow="Room Template Review"
          title="Template not found."
          purpose="The selected room design template could not be found."
          nextMove="Return to the template selection page and choose another room type."
          actions={[
            {
              label: "Back to templates",
              to: routeCatalogByKey.templates.path,
            },
          ]}
        />
      </div>
    );
  }

  const activeTemplate = selectedTemplate;
  const verifiedIntegrity: RoomTemplateIntegrityResult = integrity;
  const bomRows = templateBomRows(
    activeTemplate,
    selectedRows,
    verifiedIntegrity,
  );
  const requiredCount = selectedRows.filter(
    (row) =>
      row.type === "Required" && includedStatuses.has(row.status),
  ).length;
  const optionalCount = selectedRows.filter(
    (row) =>
      row.type === "Optional" && includedStatuses.has(row.status),
  ).length;

  function requireSafeAction(action: string): boolean {
    if (verifiedIntegrity.isVerified) return true;

    if (!acceptUnverified) {
      setActionWarning(
        `${action} is blocked because the edited design is NOT VERIFIED. Review the integrity warnings and acknowledge the status before continuing.`,
      );
      return false;
    }

    setActionWarning(
      `${action} continues with a permanent NOT VERIFIED warning in the saved project and exported documents.`,
    );
    return true;
  }

  function updateRowQty(rowId: string, qty: number) {
    const safeQty = Math.max(
      0,
      Math.min(99, Number.isFinite(qty) ? qty : 0),
    );

    setSelectedRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              qty: safeQty,
              status:
                safeQty === 0
                  ? "excluded"
                  : row.status === "excluded"
                    ? row.type === "Required"
                      ? "included"
                      : "optional"
                    : row.status,
            }
          : row,
      ),
    );
  }

  function updateRowSku(rowId: string, sku: string) {
    setSelectedRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, sku } : row,
      ),
    );
  }

  function toggleRow(rowId: string) {
    setSelectedRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        const nextStatus =
          row.status === "excluded"
            ? row.type === "Required"
              ? "included"
              : "optional"
            : "excluded";

        return {
          ...row,
          status: nextStatus,
          qty:
            nextStatus === "excluded" ? 0 : Math.max(1, row.qty),
        };
      }),
    );
  }

  function resetTemplateBom() {
    setSelectedRows(cloneRows(activeTemplate.bom));
    setAcceptUnverified(false);
    setActionWarning("");
  }

  function exportTemplateBom() {
    if (!requireSafeAction("BOM export")) return;
    const proposal = buildTemplateProposal(
      activeTemplate,
      selectedRows,
      verifiedIntegrity,
      acceptUnverified,
    );
    exportBomCsv(proposal, bomRows);
  }

  function exportTemplateProposal() {
    if (!requireSafeAction("Proposal export")) return;
    const proposal = buildTemplateProposal(
      activeTemplate,
      selectedRows,
      verifiedIntegrity,
      acceptUnverified,
    );
    exportProposalHtml(proposal, bomRows);
  }

  function saveTemplateProject() {
    if (!requireSafeAction("Project save")) return;
    const project = upsertStoredProject(
      buildTemplateProject(
        activeTemplate,
        selectedRows,
        verifiedIntegrity,
        acceptUnverified,
      ),
    );
    setSavedProjectPath(`/wingman/projects/${project.id}`);
  }

  function saveTemplateDesign() {
    if (!requireSafeAction("Custom-template save")) return;
    const template = saveRoomTemplateCopy(
      activeTemplate,
      selectedRows,
    );
    setSavedTemplatePath(
      `${routeCatalogByKey.templates.path}/${template.id}`,
    );
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Verified Room Solution"
        title={selectedTemplate.name}
        purpose="Built-in room templates are complete governed solutions. Wingman continuously checks the required products, quantities and dependencies whenever the design is edited."
        nextMove="Keep VERIFIED status, or acknowledge the NOT VERIFIED warning before saving or exporting an edited design."
        actions={[
          {
            label: "Back to templates",
            to: routeCatalogByKey.templates.path,
            variant: "secondary",
          },
        ]}
      />

      <SectionCard
        title="Room solution template"
        subtitle={`${selectedTemplate.vertical} solution for ${selectedTemplate.application}.`}
        rightSlot={
          <Link
            to={routeCatalogByKey.templates.path}
            className="inline-flex items-center gap-2 rounded-full border border-[#29465e] bg-[#0d2133] px-4 py-2 text-sm font-black text-[#edf6ff] transition hover:bg-[#12314a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Select another template
          </Link>
        }
      >
        <div className="space-y-5">
          <section className="wm-template-detail-shell">
            <div
              className="wm-template-detail-hero"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.92), rgba(2,6,23,0.62), rgba(2,6,23,0.18)), url(${roomVisualFor(
                  selectedTemplate,
                )})`,
              }}
            >
              <div>
                <p className="wingman-kicker">
                  {selectedTemplate.vertical} verified solution
                </p>
                <h2>{selectedTemplate.name}</h2>
                <p>{selectedTemplate.customerNarrative}</p>
              </div>

              <div className="wm-template-detail-actions">
                <button type="button" onClick={resetTemplateBom}>
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset verified BOM</span>
                </button>
                <button type="button" onClick={exportTemplateBom}>
                  <Download className="h-5 w-5" />
                  <span>Export BOM</span>
                </button>
                <button
                  type="button"
                  onClick={exportTemplateProposal}
                >
                  <FileText className="h-5 w-5" />
                  <span>Export proposal</span>
                </button>
                <button type="button" onClick={saveTemplateDesign}>
                  <LayoutTemplate className="h-5 w-5" />
                  <span>Save as template</span>
                </button>
                <button
                  type="button"
                  onClick={saveTemplateProject}
                  className="wm-template-action-primary"
                >
                  <Save className="h-5 w-5" />
                  <span>Save project</span>
                </button>
              </div>
            </div>

            <div
              className={`mt-4 rounded-2xl border p-4 ${
                verifiedIntegrity.isVerified
                  ? "border-emerald-300 bg-emerald-950/30 text-emerald-50"
                  : "border-rose-300 bg-rose-950/35 text-rose-50"
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                {verifiedIntegrity.isVerified ? (
                  <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black">
                    {verifiedIntegrity.status}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {verifiedIntegrity.summary}
                  </p>

                  {!verifiedIntegrity.isVerified ? (
                    <>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                        {verifiedIntegrity.issues.map((issue) => (
                          <li
                            key={`${issue.code}-${issue.rowId || issue.sku || issue.message}`}
                          >
                            <strong>{issue.message}</strong>{" "}
                            {issue.resolution}
                          </li>
                        ))}
                      </ul>

                      <label className="mt-4 flex items-start gap-3 rounded-xl border border-rose-300/60 bg-black/20 p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={acceptUnverified}
                          onChange={(event) =>
                            setAcceptUnverified(
                              event.target.checked,
                            )
                          }
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          I accept that this edited design is{" "}
                          <strong>NOT VERIFIED</strong> and is not
                          approved for real-world deployment until the
                          listed integrity issues are corrected or
                          technically approved.
                        </span>
                      </label>
                    </>
                  ) : null}

                  {actionWarning ? (
                    <p className="mt-3 rounded-xl border border-current/30 p-3 text-sm font-semibold">
                      {actionWarning}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {savedProjectPath || savedTemplatePath ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-950/30 p-3 text-sm text-emerald-50">
                <CheckCircle2 className="h-4 w-4" />
                {savedProjectPath ? (
                  <>
                    <span className="font-semibold">
                      Room solution saved as a project.
                    </span>
                    <Link
                      to={savedProjectPath}
                      className="rounded-full border border-emerald-300 px-3 py-1 font-semibold"
                    >
                      Open project
                    </Link>
                    <Link
                      to={routeCatalogByKey.proposal.path}
                      className="rounded-full border border-emerald-300 px-3 py-1 font-semibold"
                    >
                      Open proposal builder
                    </Link>
                  </>
                ) : null}
                {savedTemplatePath ? (
                  <>
                    <span className="font-semibold">
                      Edited room design saved as a custom template.
                    </span>
                    <Link
                      to={savedTemplatePath}
                      className="rounded-full border border-emerald-300 px-3 py-1 font-semibold"
                    >
                      Open template
                    </Link>
                  </>
                ) : null}
              </div>
            ) : null}

            <TemplateSchematic
              template={selectedTemplate}
              rows={selectedRows}
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                <p className="wingman-kicker">Application</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {selectedTemplate.application}
                </p>
              </div>
              <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                <p className="wingman-kicker">Scale</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {selectedTemplate.scale}
                </p>
              </div>
              <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                <p className="wingman-kicker">BOM state</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {requiredCount} required rows and {optionalCount}{" "}
                  authored optional rows.
                </p>
              </div>
              <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                <p className="wingman-kicker">
                  Technical integrity
                </p>
                <p className="mt-2 text-sm font-black leading-6 text-white">
                  {verifiedIntegrity.status}
                </p>
              </div>
            </div>

            <details className="wm-decision-details mt-4" open>
              <summary className="cursor-pointer text-sm font-black text-white">
                Architecture, verified parameters and deployment
                conditions
              </summary>
              <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                  <p className="wingman-kicker">Architecture</p>
                  <p className="mt-2 text-sm leading-7 text-white/70">
                    {selectedTemplate.architecture}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                  <p className="wingman-kicker">
                    Verified design parameters
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-white/70">
                    {(
                      selectedTemplate.designParameters ?? []
                    ).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                  <p className="wingman-kicker">
                    Other AV design scope
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                    Required deployment conditions
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-white/70">
                    {(
                      selectedTemplate.deploymentConditions ?? []
                    ).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
                  <p className="wingman-kicker">
                    Authored upgrade paths
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-white/70">
                    {selectedTemplate.upgradePaths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>

            <div className="mt-5 rounded-2xl border border-[#29465e] bg-[#0d2133] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="wingman-kicker">
                    Editable WyreStorm BOM
                  </p>
                  <h3 className="mt-2 text-xl font-black text-white">
                    Template rows
                  </h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#071522] px-3 py-1.5 text-sm font-semibold text-white/70">
                  <SlidersHorizontal className="h-4 w-4" />
                  SKU, quantity and include/exclude edits are checked
                  continuously
                </div>
              </div>

              <div className="wm-template-detail-no-horizontal-scroll mt-4 overflow-hidden rounded-2xl border border-[#29465e]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#071522] text-white/60">
                    <tr>
                      <th className="px-4 py-3 font-semibold">
                        Use
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        SKU
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Role
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Qty
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Type
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRows.map((row) => {
                      const enabled = includedStatuses.has(
                        row.status,
                      );

                      return (
                        <tr
                          key={row.id}
                          className={`border-t border-[#29465e] ${
                            enabled
                              ? "bg-[#0d2133]"
                              : "bg-[#071522] text-slate-400"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleRow(row.id)}
                              className="h-4 w-4 rounded border-[#29465e]"
                              aria-label={`Include ${row.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.sku}
                              onChange={(event) =>
                                updateRowSku(
                                  row.id,
                                  event.target.value,
                                )
                              }
                              className="w-full min-w-40 rounded-lg border border-[#29465e] bg-[#071522] px-2 py-1 text-sm font-black text-[#edf6ff]"
                              aria-label={`SKU for ${row.description}`}
                            />
                            <p className="mt-1 text-xs text-white/55">
                              {row.description}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-white/70">
                            {row.role}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={row.qty}
                              onChange={(event) =>
                                updateRowQty(
                                  row.id,
                                  Number(event.target.value),
                                )
                              }
                              className="w-20 rounded-lg border border-[#29465e] bg-[#071522] px-2 py-1 text-sm text-[#edf6ff]"
                              aria-label={`Quantity for ${row.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                row.type === "Required"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {row.type}
                            </span>
                          </td>
                          <td className="max-w-md px-4 py-3 text-white/60">
                            {row.notes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </SectionCard>
    </div>
  );
}
