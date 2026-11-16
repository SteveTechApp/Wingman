import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { exportBomCsv } from "../../lib/proposalExport";
import { exportProposalDocx } from "../../lib/proposalDocxExport";
import { createProposalWizardDefaults, loadProposalWizardDraft, saveProposalWizardDraft } from "../../lib/proposalWizard";
import { validateProposalExport } from "../../lib/proposalExportValidation";
import { wallRequirementsFromSummary } from "../../lib/videowallOptions";
import { wallTransportPlan, wallTransportRequirements, type WallLinkDetail } from "../../lib/videowallTransport";
import { wallSurveyGaps } from "../../lib/wallSurvey";
import { buildInstallationSchedule } from "../../lib/installationSchedule";
import { upsertStoredProject, useProjectStore } from "../../data/projectStore";
import { saveRoomTemplateCopy } from "../../lib/customRoomTemplates";
import { routeCatalogByKey } from "../../app/routeCatalog";
import { proposalReadiness } from "../../lib/proposalReadiness";
import { buildTemplateProposal, buildTemplateProject, savedTemplateWall, templateBomRows, templateProducts } from "../../lib/templateReviewProposal";
import { templateDocumentDetail } from "../../lib/solutionTemplates";
import type { RoomTemplate, TemplateBomRow } from "../../lib/roomTemplates";
import { recordWallInstallDetail } from "../../features/projects";

/**
 * The Proposal tab's unpriced design and wall plumbing.
 *
 * A template exports without opening the wizard, so the page has to assemble the
 * same quantity draft the wizard would: the saved wall whose
 * cable runs the export validates, and the document builders themselves. That is
 * one concern, kept here so the page file stays a page entry.
 */
export function useTemplateProposal({
  templateId,
  template,
  sourceTemplate,
  selectedRows,
  navigate,
  onSavedProject,
  onSavedTemplate,
  onSaved,
}: {
  templateId: string | undefined;
  /** The template as edited on the page; undefined before one is selected. */
  template: RoomTemplate | undefined;
  /** The selected template: the draft's own text, before the page's brief edits. */
  sourceTemplate: RoomTemplate | undefined;
  selectedRows: TemplateBomRow[];
  navigate: NavigateFunction;
  onSavedProject: (path: string) => void;
  /**
   * The design the save wrote — not only where it landed. Its own link is the
   * page's confirmation (`OpenTemplateLink`), and that link names the design it
   * opens, so the notice needs the id and the name rather than a path it would
   * have to read a name out of.
   */
  onSavedTemplate: (template: { id: string; name: string }) => void;
  /** Marks the room design clean after an action saves it. */
  onSaved: () => void;
}) {
  const proposalDefaults = useMemo(
    () => createProposalWizardDefaults({
      projectId: `template-${templateId}`,
      projectName: sourceTemplate?.name ?? "Template proposal",
      preparedBy: "",
      executiveSummary: sourceTemplate?.customerNarrative ?? "",
      architectureNarrative: sourceTemplate?.architecture ?? "",
      assumptions: sourceTemplate?.assumptions ?? [],
    }),
    [templateId, sourceTemplate],
  );
  const [draft, setDraft] = useState(() => loadProposalWizardDraft(proposalDefaults.projectId, proposalDefaults));
  useEffect(() => {
    setDraft(loadProposalWizardDraft(proposalDefaults.projectId, proposalDefaults));
  }, [proposalDefaults]);
  useEffect(() => { saveProposalWizardDraft(draft); }, [draft]);

  const { projects } = useProjectStore();
  const bomRows = useMemo(
    () => (template ? templateBomRows(template, selectedRows).map(row => ({ ...row, qty: draft.bomQuantities[row.sku] ?? row.qty })) : []),
    [template, selectedRows, draft.bomQuantities],
  );
  const products = useMemo(() => templateProducts(selectedRows), [selectedRows]);
  // A wall already designed for this template carries the transport estimate, so
  // the exported schedule prints link and run limits instead of stopping at the
  // catalogue rows.
  const savedWall = useMemo(() => savedTemplateWall(projects, templateId ?? ""), [projects, templateId]);
  const savedWallProjectId = savedWall?.projectId ?? (savedWall && !savedWall.ownershipCleared
    ? projects.find((project) => project.videowall &&
      project.videowall.templateId === savedWall.templateId &&
      project.videowall.savedAt === savedWall.savedAt &&
      JSON.stringify(project.videowall.summary) === JSON.stringify(savedWall.summary))?.id
    : undefined);
  // The same technical checks the main wizard runs, including over-limit runs.
  const wallRequirements = useMemo(() => wallTransportRequirements(wallRequirementsFromSummary(savedWall)), [savedWall]);
  const installation = useMemo(() => buildInstallationSchedule(wallRequirements), [wallRequirements]);
  const exportValidation = useMemo(
    () => validateProposalExport({
      products,
      bomRows,
      wallRequirements,
      // The run the receiver serves: a receiver measured past its rating
      // cannot carry the link, so re-measuring on this page moves the gate — and
      // a run carried in spans is measured against the span, not the whole run.
      displayRunMetres: template?.servedRunMetres ?? template?.surveyedRunMetres,
    }),
    [products, bomRows, wallRequirements, template?.surveyedRunMetres, template?.servedRunMetres],
  );
  const transport = wallRequirements ? wallTransportPlan(wallRequirements) : null;
  const surveyGaps = transport ? wallSurveyGaps(transport, wallRequirements?.linkDetails) : [];
  // Real readiness score via the unified scorer — same formula as the discovery path.
  const readinessScore = useMemo(
    () => proposalReadiness({
      products,
      bomRows,
      assumptions: [...(template?.assumptions || []), ...(template?.validationItems || []).map((item) => `Unverified: ${item}`)],
      validationItems: template?.validationItems || [],
      exportValidation,
    }).score,
    [products, bomRows, template, exportValidation],
  );

  /**
   * The walk's survey cells belong to the wall's own project, not to whichever
 * project happens to be active: the wall is what the proposal describes. Without
   * a recorded owner the walk takes no cells rather than writing into an
   * unrelated project.
   */
  const recordSurveyDetail = useCallback((linkDetails: Record<string, WallLinkDetail>) => {
    return savedWallProjectId ? Boolean(recordWallInstallDetail({ projectId: savedWallProjectId, linkDetails, transport })) : false;
  }, [savedWallProjectId, transport]);

  function templateProject() {
    if (!template) return null;
    const project = buildTemplateProject(template, selectedRows);
    if (project.proposal) project.proposal = { ...project.proposal, bomRows };
    project.productSelections = project.productSelections?.map(product => ({ ...product, quantity: draft.bomQuantities[product.sku] ?? product.quantity }));
    if (project.proposal) project.proposal.products = project.proposal.products.map(product => ({ ...product, quantity: draft.bomQuantities[product.sku] ?? product.quantity }));
    return project;
  }

  function exportSchedule() {
    if (template) exportBomCsv(buildTemplateProposal(template, selectedRows, wallRequirements), bomRows);
  }

  async function exportProposal() {
    if (!template) return;
    const proposal = buildTemplateProposal(template, selectedRows, wallRequirements);
    proposal.bomRows = bomRows;
    proposal.products = proposal.products.map(product => ({ ...product, quantity: draft.bomQuantities[product.sku] ?? product.quantity }));
    const wizard = draft;
    // The depth is the document draft's own setting, read as the document
    // leaves rather than when the page opened: a rep who changes Detail in the
    // personalisation drawer and then exports gets the document they asked for.
    await exportProposalDocx(proposal, bomRows, wizard, savedWall, templateDocumentDetail(template.id));
  }

  function saveProject() {
    const project = templateProject();
    if (!project) return;
    onSavedProject(`/wingman/projects/${upsertStoredProject(project).id}`);
    onSaved();
  }

  function createProposalVisual() {
    const project = templateProject();
    if (!project || !template) return;
    upsertStoredProject(project);
    onSaved();
    navigate(`${routeCatalogByKey.proposalVisuals.path}?mode=block-diagram&sourceTemplateId=${encodeURIComponent(template.id)}`);
  }

  function createProposal() {
    const project = templateProject();
    if (!project) return;
    upsertStoredProject(project);
    onSaved();
    navigate(routeCatalogByKey.proposal.path);
  }

  function saveTemplate() {
    if (!template) return;
    const copy = saveRoomTemplateCopy(template, selectedRows);
    onSavedTemplate(copy);
    onSaved();
  }

  return {
    draft,
    bomRows,
    products,
    savedWall,
    savedWallProjectId,
    wallRequirements,
    installation,
    surveyGaps,
    readinessScore,
    exportValidation,
    recordSurveyDetail,
    exportSchedule,
    exportProposal,
    saveProject,
    createProposalVisual,
    createProposal,
    saveTemplate,
  };
}
