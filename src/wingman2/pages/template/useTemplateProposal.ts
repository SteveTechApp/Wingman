import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { exportBomCsv } from "../../lib/proposalExport";
import { exportProposalDocx } from "../../lib/proposalDocxExport";
import { createProposalWizardDefaults, loadProposalWizardDraft, saveProposalWizardDraft } from "../../lib/proposalWizard";
import { validateProposalExport } from "../../lib/proposalExportValidation";
import { wallRequirementsFromSummary } from "../../lib/videowallOptions";
import { wallTransportPlan, wallTransportRequirements, type WallLinkDetail } from "../../lib/videowallTransport";
import { wallSurveyGaps } from "../../lib/wallSurvey";
import { buildInstallationSchedule, type InstallationUnitPrices } from "../../lib/installationSchedule";
import { seedInstallationRates, type InstallationRateCard } from "../../lib/installationRateCard";
import {
  saveInstallationRateCard,
  useInstallationRateCard,
  useInstallationRateCardSeed,
} from "../../data/installationRateCard";
import { upsertStoredProject, useProjectStore } from "../../data/projectStore";
import { saveRoomTemplateCopy } from "../../lib/customRoomTemplates";
import { routeCatalogByKey } from "../../app/routeCatalog";
import {
  loadTemplateProposalPricing,
  templatePricingDraft,
  templatePricingSummary,
  type TemplateProposalPricing,
} from "../../lib/templateProposalPricing";
import { proposalReadiness } from "../../lib/proposalReadiness";
import { buildTemplateProposal, buildTemplateProject, savedTemplateWall, templateBomRows, templateProducts } from "../../lib/templateReviewProposal";
import { templateDocumentDetail } from "../../lib/solutionTemplates";
import type { RoomTemplate, TemplateBomRow } from "../../lib/roomTemplates";
import { recordWallInstallDetail } from "../../features/projects";

/**
 * The Proposal tab's commercial and wall plumbing.
 *
 * A template exports without opening the wizard, so the page has to assemble the
 * same draft the wizard would: the template's own prices, the workspace rate
 * card that seeds the lines this template never reached, the saved wall whose
 * cable runs the export validates, and the document builders themselves. That is
 * one concern, kept here so the page file stays a page entry.
 */
export function useTemplateProposal({
  templateId,
  template,
  pricingTemplate,
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
  pricingTemplate: RoomTemplate | undefined;
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
  // The template's own prices seed the draft, so a rep who priced this template
  // on an earlier visit — or on another machine's wizard draft — sees those
  // rates rather than a page of empty cells.
  const pricingDefaults = useMemo(
    () => createProposalWizardDefaults({
      projectId: `template-${templateId}`,
      projectName: pricingTemplate?.name ?? "Template proposal",
      preparedBy: "",
      executiveSummary: pricingTemplate?.customerNarrative ?? "",
      architectureNarrative: pricingTemplate?.architecture ?? "",
      assumptions: pricingTemplate?.assumptions ?? [],
    }),
    [templateId, pricingTemplate],
  );
  const templatePricingDefaults = useMemo(
    () => templatePricingDraft(pricingDefaults, loadTemplateProposalPricing(templateId ?? "")),
    [pricingDefaults, templateId],
  );
  const [pricingDraft, setPricingDraft] = useState(() => loadProposalWizardDraft(pricingDefaults.projectId, templatePricingDefaults));
  // The card lives on the rep's workspace, so it arrives after the draft has
  // loaded: it fills the lines this template never reached and never refills a
  // cell cleared on purpose.
  const rateCardState = useInstallationRateCard();
  // The template's draft loads before the card is applied to it: a card already
  // read in this session is ready on the first render, so seeding ahead of the
  // load would be replaced by the draft the card never saw.
  useEffect(() => {
    const loaded = loadProposalWizardDraft(pricingDefaults.projectId, templatePricingDefaults);
    setPricingDraft(loaded);
  }, [pricingDefaults, templatePricingDefaults]);
  const seedRateCard = useCallback((card: InstallationRateCard) => {
    setPricingDraft((current) => ({ ...current, installationUnitPrices: seedInstallationRates(card, current.installationUnitPrices) }));
  }, []);
  useInstallationRateCardSeed(seedRateCard);
  useEffect(() => { saveProposalWizardDraft(pricingDraft); }, [pricingDraft]);

  const { projects } = useProjectStore();
  const bomRows = useMemo(
    () => (template ? templateBomRows(template, selectedRows).map(row => ({ ...row, qty: pricingDraft.bomQuantities[row.sku] ?? row.qty })) : []),
    [template, selectedRows, pricingDraft.bomQuantities],
  );
  const products = useMemo(() => templateProducts(selectedRows), [selectedRows]);
  // A wall already designed for this template carries the transport estimate, so
  // the exported schedule prints link and run limits instead of stopping at the
  // catalogue rows.
  const savedWall = useMemo(() => savedTemplateWall(projects, templateId ?? ""), [projects, templateId]);
  // The same checks the main wizard runs, including the saved wall's over-limit
  // cable runs and a card rate left on a quote in another currency.
  const wallRequirements = useMemo(() => wallTransportRequirements(wallRequirementsFromSummary(savedWall)), [savedWall]);
  const installation = useMemo(() => buildInstallationSchedule(wallRequirements), [wallRequirements]);
  const exportValidation = useMemo(
    () => validateProposalExport({
      products,
      bomRows,
      wallRequirements,
      // The run the quoted receiver serves: a receiver measured past its rating
      // cannot carry the link, so re-measuring on this page moves the gate — and
      // a run carried in spans is measured against the span, not the whole run.
      displayRunMetres: template?.servedRunMetres ?? template?.surveyedRunMetres,
      pricing: {
        currency: pricingDraft.currency,
        rateCard: rateCardState.card,
        installationUnitPrices: pricingDraft.installationUnitPrices,
      },
    }),
    [products, bomRows, wallRequirements, template?.surveyedRunMetres, template?.servedRunMetres, pricingDraft.currency, pricingDraft.installationUnitPrices, rateCardState.card],
  );
  // The same shortfall the pre-issue walk reads, so the page's still-to-price
  // block and the walk cannot name different lines.
  const pricingSummary = useMemo(
    () => templatePricingSummary(bomRows, installation, {
      currency: pricingDraft.currency,
      bomUnitPrices: pricingDraft.bomUnitPrices,
      installationUnitPrices: pricingDraft.installationUnitPrices,
    }),
    [bomRows, installation, pricingDraft.currency, pricingDraft.bomUnitPrices, pricingDraft.installationUnitPrices],
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
   * project happens to be active: the wall is what the proposal quotes. Without
   * a recorded owner the walk takes no cells rather than writing into an
   * unrelated project.
   */
  const recordSurveyDetail = useCallback((linkDetails: Record<string, WallLinkDetail>) => {
    const projectId = savedWall?.projectId;
    return projectId ? Boolean(recordWallInstallDetail({ projectId, linkDetails, transport })) : false;
  }, [savedWall, transport]);

  const setCurrency = useCallback((currency: TemplateProposalPricing["currency"]) => setPricingDraft(current => ({ ...current, currency, bomUnitPrices: {} })), []);
  const setUnitPrice = useCallback((sku: string, value: string) => setPricingDraft(current => ({ ...current, bomUnitPrices: { ...current.bomUnitPrices, [sku]: value } })), []);
  const setInstallationRate = useCallback((lineId: string, value: string) => setPricingDraft(current => ({ ...current, installationUnitPrices: { ...current.installationUnitPrices, [lineId]: value } })), []);
  /** One write for both restore actions: the block and the table fill the same cells. */
  const restoreInstallationRates = useCallback((rates: InstallationUnitPrices) => setPricingDraft(current => ({ ...current, installationUnitPrices: { ...current.installationUnitPrices, ...rates } })), []);
  const saveRateCard = useCallback(() => { void saveInstallationRateCard(pricingDraft.installationUnitPrices, pricingDraft.currency); }, [pricingDraft.installationUnitPrices, pricingDraft.currency]);

  function pricedTemplateProject() {
    if (!template) return null;
    const project = buildTemplateProject(template, selectedRows);
    if (project.proposal) project.proposal = { ...project.proposal, bomRows, pricing: { currency: pricingDraft.currency, pricesExcludeTax: pricingDraft.pricesExcludeTax, bomUnitPrices: pricingDraft.bomUnitPrices, installationUnitPrices: pricingDraft.installationUnitPrices } };
    project.productSelections = project.productSelections?.map(product => ({ ...product, quantity: pricingDraft.bomQuantities[product.sku] ?? product.quantity }));
    if (project.proposal) project.proposal.products = project.proposal.products.map(product => ({ ...product, quantity: pricingDraft.bomQuantities[product.sku] ?? product.quantity }));
    return project;
  }

  function exportSchedule() {
    if (template) exportBomCsv(buildTemplateProposal(template, selectedRows, wallRequirements), bomRows);
  }

  async function exportProposal() {
    if (!template) return;
    const proposal = buildTemplateProposal(template, selectedRows, wallRequirements);
    proposal.bomRows = bomRows;
    proposal.products = proposal.products.map(product => ({ ...product, quantity: pricingDraft.bomQuantities[product.sku] ?? product.quantity }));
    const wizard = pricingDraft;
    proposal.pricing = { currency: wizard.currency, pricesExcludeTax: wizard.pricesExcludeTax, bomUnitPrices: wizard.bomUnitPrices, installationUnitPrices: wizard.installationUnitPrices };
    // The depth is the document draft's own setting, read as the document
    // leaves rather than when the page opened: a rep who changes Detail in the
    // personalisation drawer and then exports gets the document they asked for.
    await exportProposalDocx(proposal, bomRows, wizard, savedWall, templateDocumentDetail(template.id));
  }

  function saveProject() {
    const project = pricedTemplateProject();
    if (!project) return;
    onSavedProject(`/wingman/projects/${upsertStoredProject(project).id}`);
    onSaved();
  }

  function createProposalVisual() {
    const project = pricedTemplateProject();
    if (!project || !template) return;
    upsertStoredProject(project);
    onSaved();
    navigate(`${routeCatalogByKey.proposalVisuals.path}?mode=block-diagram&sourceTemplateId=${encodeURIComponent(template.id)}`);
  }

  function createProposal() {
    const project = pricedTemplateProject();
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
    pricingDraft,
    rateCard: rateCardState.card,
    rateCardError: rateCardState.error,
    setCurrency,
    setUnitPrice,
    setInstallationRate,
    restoreInstallationRates,
    saveRateCard,
    bomRows,
    products,
    savedWall,
    wallRequirements,
    installation,
    pricingSummary,
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
