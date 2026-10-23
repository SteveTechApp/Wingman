import { ProposalCompletionWizardView } from "./ProposalCompletionWizardView";
import { ProposalCoverPreview } from "./ProposalCoverPreview";
import {
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Send,
  Table2,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { NeedsSiteSurveyFlag } from "./NeedsSiteSurveyFlag";
import { DiscoveryConversationReview } from "./DiscoveryConversationReview";
import { VerifyBeforeQuoteNote } from "./VerifyBeforeQuoteNote";
import { CrmSharePanel } from "./CrmSharePanel";
import { SiteSurveyChecklist } from "./SiteSurveyChecklist";
import { ProposalWallGate } from "./ProposalWallGate";
import {
  recordWallInstallDetail,
  saveProjectProposalToProject,
  saveRecommendationFeedback,
  useProjectStore,
  type StoredProject,
  type StoredProjectProposal,
  type StoredRecommendationFeedback,
} from "../features/projects";
import {
  normaliseProjectTopology,
  projectTopologySurveyState,
} from "../lib/projectTopology";
import { buildSiteSurveyChecklist } from "../lib/siteSurveyChecklist";
import { getInstallChecked } from "../lib/siteSurveyStorage";
import { useWingmanProfile, type WingmanProfile } from "../data/wingmanProfile";
import {
  exportBomCsv,
  exportProposalHtml,
  exportProposalPdf,
} from "../lib/proposalExport";
import { exportProposalDocx } from "../lib/proposalDocxExport";
import { REP_COPY, customerCopyText } from "../lib/proposalCopy";
import { updateSavedWallRequirements } from "../lib/savedWallUpdates";
import { wallRequirementsFromSummary } from "../lib/videowallOptions";
import { wallSurveyDisplayCount, wallSurveyGapText, wallSurveyGaps } from "../lib/wallSurvey";
import { buildInstallationSchedule, installationTotals } from "../lib/installationSchedule";
import { seedInstallationRates, type InstallationRateCard } from "../lib/installationRateCard";
import {
  saveInstallationRateCard,
  useInstallationRateCard,
  useInstallationRateCardSeed,
} from "../data/installationRateCard";
import { ProposalReadinessList } from "./ProposalReadinessList";
import { ProposalBomPricing } from "./ProposalBomPricing";
import { ProposalInstallationPricing } from "./ProposalInstallationPricing";
import { wallTransportPlan, wallTransportRequirements } from "../lib/videowallTransport";
import { exportProposalDiscoveryBriefDocx } from "../lib/discoveryBriefDocxExport";
import {
  validateProposalExport,
  type ExportValidationResult,
} from "../lib/proposalExportValidation";
import {
  computeProposalReadiness,
  createProposalWizardDefaults,
  getProposalDocumentTypeConfig,
  linesFromText,
  loadProposalWizardDraft,
  PROPOSAL_DOCUMENT_TYPES,
  saveProposalWizardDraft,
  type ProposalWizardDraft,
} from "../lib/proposalWizard";
import { rankProductsByFamilyScores } from "../lib/productFamilyShortlistRanking";
import {
  buildSalesReadinessPackage,
  type SalesBomRow,
} from "../lib/salesReadiness";
import { compileProjectApplicationProposal } from "../lib/proposalCompiler";
import { useSubmitForApproval, useRecallProposal } from "../data/approvalStore";
import { proposalReadiness } from "../lib/proposalReadiness";
import {
  extractUnresolvedDiscoveryItems,
  unresolvedToAssumptions,
  unresolvedToRisks,
} from "../lib/unresolvedDiscoveryItems";
import { ApprovalStatusBadge } from "../pages/ApprovalQueuePage";
import { compileDesignProposal } from "../lib/designProposal";
import { DesignProposalReview } from "./DesignProposalReview";

type DiscoveryView = {
  projectTitle: string;
  customerName: string;
  contactName: string;
  summary: string;
  roomSize: string;
  displays: string;
  displayCount: string;
  displayBehaviour: string;
  sourceCount: string;
  sourceConnection: string;
  signal: string;
  usb: string;
  distance: string;
  network: string;
  audio: string;
  control: string;
  budget: string;
  avoipProfile: string;
  architecture: string;
  nextQuestion: string;
};

const steps = [
  "Customer and project",
  "Requirements review",
  "Proposed solution",
  "Commercial and delivery",
  "Review and export",
];

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function asJoinedText(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item))
      .filter(Boolean)
      .join(", ");
  }

  return asText(value);
}

function budgetLabelFromLevel(level: string): string {
  switch (level) {
    case "cost-sensitive":
      return "Cost-sensitive — value engineering matters";
    case "mid-market":
      return "Mid-market — balanced cost and quality";
    case "premium":
      return "Premium — quality and performance lead";
    default:
      return "";
  }
}

function readDiscovery(project: StoredProject): DiscoveryView {
  const brief = project.discoveryBrief;
  const room = brief?.roomModel ?? {};

  return {
    projectTitle:
      asText(room.application) ||
      asText(room.roomType) ||
      project.name,
    customerName: asText(room.clientName),
    contactName: asText(room.contactName),
    summary:
      asText(brief?.inference?.summary) ||
      asText(room.summary) ||
      asText(room.outcome) ||
      "The Discovery brief has been captured for this project.",
    roomSize:
      asText(room.scale) ||
      asText(room.roomSize) ||
      "Not confirmed",
    displays:
      [
        asText(room.displayCount || room.displays),
        asText(room.displayBehaviour || room.displayArrangement),
      ]
        .filter(Boolean)
        .join(" - ") || "Not confirmed",
    displayCount:
      asText(room.displayCount || room.displays),
    displayBehaviour:
      asText(room.displayBehaviour || room.displayArrangement),
    sourceCount:
      asText(room.sourceCount),
    sourceConnection:
      asJoinedText(room.sourceConnections || room.sourceTypes),
    signal:
      asText(room.resolutionRequirement || room.signalStandard) ||
      "Not confirmed",
    usb:
      asJoinedText(room.usbNeeds) ||
      asText(room.usbTransport) ||
      "Not confirmed",
    distance:
      asText(room.longestRun || room.cableRun) ||
      "Not confirmed",
    network:
      asText(room.networkAvailability || room.network),
    audio:
      asJoinedText(room.audioNeeds) ||
      asText(room.audioPath),
    control:
      asJoinedText(room.controlNeeds),
    budget:
      budgetLabelFromLevel(asText(room.budgetLevel)) ||
      asText(room.budgetStyle) ||
      "Not confirmed",
    avoipProfile:
      asText(room.avoipProfile || room.avoipSeriesHint),
    architecture:
      asText(brief?.inference?.architecture) ||
      asText(room.inferredArchitectureDirection) ||
      asText(room.designDirection),
    nextQuestion:
      asText(brief?.nextBestQuestion) ||
      asText(brief?.inference?.nextBestQuestion),
  };
}

function standardAssumptions(project: StoredProject) {
  const unresolvedItems = extractUnresolvedDiscoveryItems({
    discoveryConversation: project.discoveryBrief?.discoveryConversation,
    decisionEvidence: project.discoveryBrief?.decisionEvidence,
  });
  return Array.from(
    new Set([
      ...unresolvedToAssumptions(unresolvedItems),
      ...(project.ingest?.unknowns ?? []),
      ...(project.compareRuns?.[0]?.warnings ?? []),
      ...(project.recommendationEvidence?.missingInformation ?? []),
      ...(project.discoveryBrief?.recommendationEvidence?.missingInformation ?? []),
    ]),
  ).slice(0, 15);
}

function savedProposalBomRows(rows: StoredProjectProposal["bomRows"]): SalesBomRow[] {
  return (rows ?? []).map((row, index) => ({
    item: row.item || index + 1,
    sku: row.sku,
    description: row.description,
    role: row.role,
    qty: row.qty || 1,
    type: row.type === "Required" || row.type === "Optional" || row.type === "Validate"
      ? row.type
      : "Validate",
    status: row.status,
    evidence: row.evidence || "Restored from the saved project proposal.",
    notes: row.notes,
  }));
}

function InputField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="wm-proposal-field">
      <span>{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
}) {
  const emptyCustomerSection = !customerCopyText(props.value, "").trim();
  const hint = props.hint || (/scope/i.test(props.label)
    ? REP_COPY.scopeGuidance
    : `Record the agreed ${props.label.toLowerCase()} in customer-ready language. This hint is for the rep and is not included in exports.`);
  return (
    <label className="wm-proposal-field wm-proposal-field-wide">
      <span>{props.label}</span>
      {emptyCustomerSection || props.hint ? <small data-rep-only="true">{hint}</small> : null}
      <textarea
        value={props.value}
        rows={props.rows ?? 5}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

export function ProposalCompletionWizard() {
  const { activeProject: project, projects } = useProjectStore();
  const { profile } = useWingmanProfile();

  if (!project) {
    return (
      <section className="wm-proposal-empty">
        <h1>Open a project before building a response</h1>
        <p>
          Customer output must remain attached to the correct Discovery brief,
          product selection, assumptions and project record.
        </p>
        <div>
          <Link to={routeCatalogByKey.projects.path}>Open projects</Link>
          <Link to={routeCatalogByKey.discovery.path}>Start Discovery</Link>
        </div>
      </section>
    );
  }

  return (
    <ProposalCompletionWizardContent
      project={project}
      projects={projects}
      profile={profile}
    />
  );
}

function ProposalCompletionWizardContent({
  project,
  projects,
  profile,
}: {
  project: StoredProject;
  projects: StoredProject[];
  profile: WingmanProfile;
}) {
  const discovery = useMemo(() => readDiscovery(project), [project]);
  const discoveryWithCompletion = useMemo(
    () => ({
      ...discovery,
      discoveryPercent: Number(project.discoveryBrief?.capturedPercent ?? 0),
    }),
    [discovery, project.discoveryBrief?.capturedPercent],
  );
  const assumptions = useMemo(
    () => standardAssumptions(project),
    [project],
  );
  const familyScores = useMemo(
    () =>
      project.recommendationEvidence?.productFamilyScores ??
      project.discoveryBrief?.recommendationEvidence?.productFamilyScores ??
      [],
    [project],
  );
  const selectedProducts = useMemo(
    () =>
      rankProductsByFamilyScores(
        project.productSelections?.length
          ? project.productSelections
          : project.proposal?.products ?? [],
        familyScores,
      ),
    [familyScores, project.productSelections, project.proposal?.products],
  );

  // The feedback loop: every project's saved feedback feeds the readiness
  // package so a lesson learned on one opportunity (wrong-fit SKU, missing
  // accessory) informs the next proposal that selects the same product.
  const crossProjectFeedback = useMemo(
    () => projects.flatMap((item) => item.feedback ?? []),
    [projects],
  );

  // Site-survey edits (cable lengths, install checkboxes) live in localStorage
  // and are written by SiteSurveyChecklist / siteSurveyStorage. Tick on the
  // shared survey-edited event and cross-tab storage events so the
  // needs-site-survey flag below reflects the latest on-site confirmation
  // state instead of going stale after a checkbox is toggled. Conflict
  // adoptions and poll merges save from the server side and deliberately do
  // not announce themselves as local edits, so tick on the sync-update event
  // they dispatch as well.
  const [surveyTick, setSurveyTick] = useState(0);
  useEffect(() => {
    const refresh = () => setSurveyTick((tick) => tick + 1);
    window.addEventListener("wingman:survey-edited", refresh);
    window.addEventListener("wingman:survey-sync-update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("wingman:survey-edited", refresh);
      window.removeEventListener("wingman:survey-sync-update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const salesReadiness = useMemo(
    () =>
      buildSalesReadinessPackage({
        products: selectedProducts,
        discovery: { ...discoveryWithCompletion, audioDesign: project.discoveryBrief?.roomModel?.audioDesign },
        assumptions:
          project.proposal?.verification
            ? project.proposal.assumptions
            : assumptions,
        ingest: project.ingest,
        compareRun: project.compareRuns?.[0] ?? null,
        topology: project.discoveryBrief?.topology,
        region: profile.region,
        feedback: crossProjectFeedback,
      }),
    [
      assumptions,
      crossProjectFeedback,
      discoveryWithCompletion,
      profile.region,
      project.compareRuns,
      project.discoveryBrief?.topology,
      project.discoveryBrief?.roomModel?.audioDesign,
      project.ingest,
      project.proposal,
      selectedProducts,
    ],
  );

  const defaults = useMemo(
    () => {
      const discoveryFingerprint = JSON.stringify([
        project.name,
        discovery.customerName,
        discovery.contactName,
        profile.reportPreparedBy || profile.userName || project.owner,
        discovery.projectTitle,
        discovery.summary,
        discovery.roomSize,
        discovery.sourceCount,
        discovery.sourceConnection,
        discovery.displayCount,
        discovery.displayBehaviour,
        discovery.signal,
        discovery.usb,
        discovery.audio,
        discovery.control,
        discovery.distance,
        discovery.network,
      ]);

      const proposalDefaults = createProposalWizardDefaults({
        projectId: project.id,
        projectName: project.name,
        customerName: discovery.customerName,
        contactName: discovery.contactName,
        discoveryFingerprint,
        preparedBy:
          profile.reportPreparedBy ||
          profile.userName ||
          project.owner,
        executiveSummary: project.proposal?.summary || project.proposal?.applicationProposal?.executiveSummary || discovery.summary,
        architectureNarrative:
          project.proposal?.salesContent?.architecture || discovery.architecture ||
          familyScores[0]?.family ||
          "Architecture to be confirmed from the completed Discovery brief and selected product path.",
        proposedSolution:
          project.proposal?.salesContent?.solutionOverview || project.proposal?.applicationProposal?.solutionOverview,
        assumptions,
        dependencies:
          salesReadiness.governedDependencies.map(
            (item) =>
              `${item.label}: ${item.validationQuestion}`,
          ),
      });
      if (project.proposal?.salesContent) {
        proposalDefaults.customerObjectives = project.proposal.salesContent.objectives;
        proposalDefaults.externalScope = project.proposal.salesContent.externalScope;
      }
      if (project.proposal?.pricing) {
        Object.assign(proposalDefaults, project.proposal.pricing);
      }
      const scope = project.proposal?.applicationProposal?.thirdPartyScope ?? [];
      if (scope.length) {
        proposalDefaults.servicesAndAllowances = scope
          .map((item) => `${item.category} | ${item.responsibility} | ${item.status} — ${item.description}`)
          .join("\n");
      }
      return proposalDefaults;
    },
    [
      assumptions,
      discovery.architecture,
      discovery.audio,
      discovery.contactName,
      discovery.control,
      discovery.customerName,
      discovery.displayBehaviour,
      discovery.displayCount,
      discovery.distance,
      discovery.network,
      discovery.projectTitle,
      discovery.roomSize,
      discovery.signal,
      discovery.summary,
      discovery.sourceConnection,
      discovery.sourceCount,
      discovery.usb,
      familyScores,
      profile.reportPreparedBy,
      profile.userName,
      project.id,
      project.name,
      project.owner,
      project.proposal?.salesContent,
      project.proposal?.pricing,
      project.proposal?.summary,
      project.proposal?.applicationProposal?.solutionOverview,
      project.proposal?.applicationProposal?.executiveSummary,
      project.proposal?.applicationProposal?.thirdPartyScope,
      salesReadiness.governedDependencies,
    ],
  );

  const [activeStep, setActiveStep] = useState(0);
  const [draft, setDraft] = useState<ProposalWizardDraft>(() =>
    loadProposalWizardDraft(project.id, defaults),
  );
  // The card is the starting point, not the proposal's prices: it fills the
  // lines this draft has not reached and never refills a cell the rep cleared,
  // which is how a price typed for this job stays distinguishable from a line
  // left out on purpose.
  const rateCardState = useInstallationRateCard();
  const seedRateCard = useCallback((card: InstallationRateCard) => {
    setDraft((current) => ({
      ...current,
      installationUnitPrices: seedInstallationRates(card, current.installationUnitPrices),
    }));
  }, []);
  useInstallationRateCardSeed(seedRateCard);
  const [exportMessage, setExportMessage] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<StoredRecommendationFeedback["rating"] | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const submitForApproval = useSubmitForApproval();
  const recallProposal = useRecallProposal();

  // Reload the draft ONLY when the discovery source data actually changed.
  // `defaults` recomputes whenever the project store round-trips (the 250 ms
  // proposal autosave), so comparing its identity would wipe a user's typed
  // Step-1 overrides on every keystroke. The fingerprint string covers every
  // discovery/profile/project field that feeds the defaults, so a changed
  // fingerprint is the only condition that requires a refresh.
  useEffect(() => {
    setDraft((current) =>
      current.discoveryFingerprint === defaults.discoveryFingerprint
        ? current
        : loadProposalWizardDraft(project.id, defaults),
    );
  }, [defaults, project.id]);

  const baseBomRows = salesReadiness.bomRows.length
    ? salesReadiness.bomRows
    : savedProposalBomRows(project.proposal?.bomRows);
  const bomRows = useMemo<SalesBomRow[]>(
    () =>
      baseBomRows.map((row) => ({
        ...row,
        qty:
          draft.bomQuantities[row.sku] ??
          row.qty ??
          1,
      })),
    [baseBomRows, draft.bomQuantities],
  );

  // The survey's install detail is the installation scope the customer is
  // buying, so it is priced beside the equipment instead of typed as free text.
  const installation = useMemo(
    () => buildInstallationSchedule(wallTransportRequirements(wallRequirementsFromSummary(project.videowall ?? null))),
    [project.videowall],
  );
  const installationPricing = useMemo(
    () => (installation ? installationTotals(installation, draft.installationUnitPrices) : null),
    [installation, draft.installationUnitPrices],
  );
  // Pricing is complete only when every line the document prints carries a
  // rate: an unpriced installation line holds the commercial section just as an
  // unpriced equipment row does.
  const commercialPricingComplete =
    bomRows.length > 0 &&
    bomRows.every((row) => {
      const value = Number(draft.bomUnitPrices[row.sku]);
      return Number.isFinite(value) && value >= 0;
    }) &&
    (installationPricing?.complete ?? true);

  const applicationProposal = useMemo(
    () => project.proposal?.applicationProposal ?? compileProjectApplicationProposal({
      vertical: asText(project.discoveryBrief?.roomModel?.vertical) || "Commercial AV",
      application: discovery.projectTitle,
      summary: draft.executiveSummary || discovery.summary,
      architecture: draft.architectureNarrative || discovery.architecture,
      products: selectedProducts,
      bomRows,
      assumptions: linesFromText(draft.assumptions),
      audioDesign: project.discoveryBrief?.roomModel?.audioDesign,
    }),
    [bomRows, discovery.architecture, discovery.projectTitle, discovery.summary, draft.architectureNarrative, draft.assumptions, draft.executiveSummary, project.discoveryBrief?.roomModel?.vertical, project.discoveryBrief?.roomModel?.audioDesign, project.proposal?.applicationProposal, selectedProducts],
  );

  const discoveryPercent = Number(
    project.discoveryBrief?.capturedPercent ??
      (project.discoveryBrief ? 100 : 0),
  );

  const readiness = useMemo(
    () =>
      computeProposalReadiness({
        discoveryPercent,
        executiveSummary: draft.executiveSummary,
        proposedSolution: draft.proposedSolution,
        architectureNarrative: draft.architectureNarrative,
        customerName: draft.customerName,
        projectName: draft.projectName,
        preparedBy: draft.preparedBy,
        proposalReference: draft.proposalReference,
        bomRowCount: bomRows.length,
        solutionConfirmed: draft.solutionConfirmed,
        continueWithoutBom: draft.continueWithoutBom,
        reviewConfirmed: draft.reviewConfirmed,
        technicalBlockerCount: salesReadiness.assurance.blockers.length,
        commercialPricingComplete,
      }),
    [
      bomRows.length,
      commercialPricingComplete,
      discoveryPercent,
      draft.architectureNarrative,
      draft.continueWithoutBom,
      draft.customerName,
      draft.executiveSummary,
      draft.preparedBy,
      draft.projectName,
      draft.proposalReference,
      draft.proposedSolution,
      draft.reviewConfirmed,
      draft.solutionConfirmed,
      salesReadiness.assurance.blockers.length,
    ],
  );

  const chainBlockers = useMemo(() => {
    return salesReadiness.assurance.blockers.filter((item) =>
      item.id.startsWith("chain-") ||
      item.domain === "physical"
    );
  }, [salesReadiness.assurance.blockers]);

  // A saved wall carries its own cable-run estimate, so the limits are checked
  // here: a run longer than its transport blocks the export rather than only
  // appearing in the schedule inside the finished document. Summaries saved
  // before the layout answers existed cannot be costed, and the plan would
  // quote an invented run rather than a limit.
  const wallRequirements = useMemo(
    () => wallTransportRequirements(wallRequirementsFromSummary(project.videowall ?? null)),
    [project.videowall],
  );
  const wallTransport = useMemo(
    () => (wallRequirements ? wallTransportPlan(wallRequirements) : null),
    [wallRequirements],
  );
  // Enclosure and termination are what the installer sets out from, so a short
  // survey is named here as well as in the export validation list: the rep sees
  // which links the document will print without install detail.
  const wallSurvey = useMemo(() => {
    if (!wallRequirements || !wallTransport) return null;
    const gaps = wallSurveyGaps(wallTransport, wallRequirements.linkDetails);
    return gaps.length ? { gaps, text: wallSurveyGapText(gaps, wallSurveyDisplayCount(wallTransport)) } : null;
  }, [wallRequirements, wallTransport]);

  const exportValidation = useMemo<ExportValidationResult>(() =>
    validateProposalExport({
      products: selectedProducts,
      bomRows,
      topology: project.discoveryBrief?.topology,
      discoveryConversation: project.discoveryBrief?.discoveryConversation,
      wallRequirements,
      // A rate still holding the card's number on a quote priced in another
      // currency is named before the document leaves — as a warning, since the
      // rep may hold the card's figure deliberately.
      pricing: {
        currency: draft.currency,
        rateCard: rateCardState.card,
        installationUnitPrices: draft.installationUnitPrices,
      },
    }),
    [
      bomRows,
      project.discoveryBrief?.topology,
      project.discoveryBrief?.discoveryConversation,
      selectedProducts,
      wallRequirements,
      draft.currency,
      draft.installationUnitPrices,
      rateCardState.card,
    ],
  );

  // Unified product/BOM readiness — same scorer the template path uses.
  const productReadiness = useMemo(
    () =>
      proposalReadiness({
        products: selectedProducts,
        bomRows,
        assumptions,
        exportValidation,
        topology: project.discoveryBrief?.topology,
        discoveryConversation: project.discoveryBrief?.discoveryConversation,
      }),
    [selectedProducts, bomRows, assumptions, exportValidation, project.discoveryBrief],
  );

  // Final readiness: the lower of wizard-completion and product-readiness.
  const finalReadinessScore = Math.min(readiness.score, productReadiness.score);

  const typeConfig = getProposalDocumentTypeConfig(
    draft.documentType,
  );

  const proposal = useMemo<StoredProjectProposal>(
    () => {
      const baseProposal: StoredProjectProposal = {
      title:
        draft.projectName ||
        project.name,
      pricing: {
        currency: draft.currency,
        pricesExcludeTax: draft.pricesExcludeTax,
        bomUnitPrices: draft.bomUnitPrices,
        installationUnitPrices: draft.installationUnitPrices,
      },
      salesContent: { objectives: draft.customerObjectives, solutionOverview: draft.proposedSolution, architecture: draft.architectureNarrative, externalScope: draft.externalScope || "" },
      summary:
        draft.executiveSummary ||
        discovery.summary,
      sections: typeConfig.sections,
      products: selectedProducts,
      productFamilyScores: familyScores,
      assumptions: linesFromText(draft.assumptions),
      outputPurpose: salesReadiness.outputPurpose,
      governedDependencies:
        salesReadiness.governedDependencies,
      bomRows: bomRows.map((row) => ({
        item: row.item,
        sku: row.sku,
        description: row.description,
        role: row.role,
        qty: row.qty,
        type: row.type,
        status: row.status,
        evidence: row.evidence,
        notes: row.notes,
      })),
      evidence: Array.from(
        new Set([
          ...salesReadiness.evidence,
          ...(
            project.recommendationEvidence?.evidenceUsed ??
            project.discoveryBrief?.recommendationEvidence?.evidenceUsed ??
            []
          ),
        ]),
      ),
      repGuidance: [
        ...linesFromText(draft.nextSteps),
        ...salesReadiness.repGuidance,
      ].slice(0, 15),
      governanceWarnings: [
        ...salesReadiness.governanceWarnings,
        ...unresolvedToRisks(
          extractUnresolvedDiscoveryItems({
            discoveryConversation: project.discoveryBrief?.discoveryConversation,
            decisionEvidence: project.discoveryBrief?.decisionEvidence,
          }),
        ),
      ],
      validationNotes:
        salesReadiness.validationNotes,
      visualBlocks:
        project.proposal?.visualBlocks ?? [],
      readinessScore: finalReadinessScore,
      verification: project.proposal?.verification,
      applicationProposal,
      companyName: profile.companyName,
      preparedBy: draft.preparedBy,
      proposalFooter: profile.proposalFooter,
      companyLogoDataUrl:
        profile.companyLogoDataUrl,
      contactEmail: profile.email,
      contactPhone: profile.phone,
      discoveryConversation:
        project.discoveryBrief?.discoveryConversation ?? [],
      approvalStatus: project.proposal?.approvalStatus ?? "draft",
      submittedBy: project.proposal?.submittedBy,
      submittedAt: project.proposal?.submittedAt,
      approvedBy: project.proposal?.approvedBy,
      approvedAt: project.proposal?.approvedAt,
      approvalComments: project.proposal?.approvalComments,
      submittedRevisionHash: project.proposal?.submittedRevisionHash,
      approvedRevisionHash: project.proposal?.approvedRevisionHash,
      updatedAt: new Date().toISOString(),
      };
      const designRevision = compileDesignProposal({
        id: project.id, name: project.name, owner: project.owner, ownerId: project.ownerId,
        stage: project.stage, status: project.status, updated: project.createdAt,
        createdAt: project.createdAt, updatedAt: project.createdAt, resumeTo: project.resumeTo,
        requirements: project.requirements, discoveryBrief: project.discoveryBrief,
        productSelections: selectedProducts, proposal: baseProposal,
      });
      const approvedMatches = baseProposal.approvedRevisionHash === designRevision.contentHash;
      const submittedMatches = baseProposal.submittedRevisionHash === designRevision.contentHash;
      return {
        ...baseProposal,
        designRevision,
        ...((baseProposal.approvalStatus === "approved" && !approvedMatches) || (baseProposal.approvalStatus === "pending" && !submittedMatches)
          ? { approvalStatus: "draft" as const, approvedBy: undefined, approvedAt: undefined, approvedRevisionHash: undefined, submittedBy: undefined, submittedAt: undefined, submittedRevisionHash: undefined, approvalComments: "Approval cleared because the design changed." }
          : {}),
      };
    },
    [
      bomRows,
      discovery.summary,
      draft.bomUnitPrices,
      draft.currency,
      draft.installationUnitPrices,
      draft.pricesExcludeTax,
      draft.assumptions,
      draft.executiveSummary,
      draft.customerObjectives,
      draft.architectureNarrative,
      draft.proposedSolution,
      draft.externalScope,
      draft.nextSteps,
      draft.preparedBy,
      draft.projectName,
      familyScores,
      profile.companyLogoDataUrl,
      profile.companyName,
      profile.email,
      profile.phone,
      profile.proposalFooter,
      project.discoveryBrief,
      project.requirements,
      project.id,
      project.owner,
      project.ownerId,
      project.stage,
      project.status,
      project.createdAt,
      project.resumeTo,
      project.name,
      applicationProposal,
      project.proposal?.verification,
      project.proposal?.visualBlocks,
      project.proposal?.approvalStatus,
      project.proposal?.submittedBy,
      project.proposal?.submittedAt,
      project.proposal?.approvedBy,
      project.proposal?.approvedAt,
      project.proposal?.approvalComments,
      project.proposal?.submittedRevisionHash,
      project.proposal?.approvedRevisionHash,
      project.recommendationEvidence?.evidenceUsed,
      finalReadinessScore,
      salesReadiness.evidence,
      salesReadiness.governanceWarnings,
      salesReadiness.governedDependencies,
      salesReadiness.outputPurpose,
      salesReadiness.repGuidance,
      salesReadiness.validationNotes,
      selectedProducts,
      typeConfig.sections,
    ],
  );

  const customerOutputBlocked = chainBlockers.length > 0 || !exportValidation.allowed || Boolean(proposal.designRevision?.blockers.length);

  useEffect(() => {
    saveProposalWizardDraft(draft);
  }, [draft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveProjectProposalToProject(proposal);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [proposal]);

  function updateDraft<K extends keyof ProposalWizardDraft>(
    key: K,
    value: ProposalWizardDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
    setExportMessage("");
  }

  const topologyInfraValue = useMemo(() => {
    const topology = normaliseProjectTopology(project.discoveryBrief?.topology);
    if (topology.connections.length === 0) {
      return [discovery.distance, discovery.network]
        .filter(Boolean)
        .join(" - ") || "Not confirmed";
    }

    const hasUsbService = (services: string[]) =>
      services.some((s) => ["usb-2", "usb-3", "usb-kvm"].includes(s));

    // Extract exact figures from the route-planned connections.
    const videoConnections = topology.connections.filter(
      (c) => !hasUsbService(c.services) && c.id !== "planning-exception-path",
    );
    const usbConnections = topology.connections.filter(
      (c) => hasUsbService(c.services),
    );
    const exceptionConnection = topology.connections.find(
      (c) => c.id === "planning-exception-path",
    );

    const videoMetres = videoConnections
      .filter((c) => c.lengthMetres !== undefined && c.lengthMetres > 0)
      .map((c) => c.lengthMetres as number);
    const usbMetres = usbConnections
      .filter((c) => c.lengthMetres !== undefined && c.lengthMetres > 0)
      .map((c) => c.lengthMetres as number);
    const exceptionMetres =
      exceptionConnection?.lengthMetres !== undefined &&
      exceptionConnection.lengthMetres > 0
        ? exceptionConnection.lengthMetres
        : undefined;

    const parts: string[] = [];
    if (videoMetres.length > 0) {
      const maxVideo = Math.max(...videoMetres);
      parts.push(`${maxVideo} m video`);
    }
    if (usbMetres.length > 0) {
      parts.push(`${Math.max(...usbMetres)} m USB`);
    }
    if (exceptionMetres !== undefined) {
      parts.push(`${exceptionMetres} m exception`);
    }

    if (parts.length === 0) {
      // No exact figures from the route planner yet — show the discovery text.
      return [discovery.distance, discovery.network]
        .filter(Boolean)
        .join(" - ") || "Not confirmed";
    }

    const networkPart = discovery.network ? ` | Network: ${discovery.network}` : "";
    return `${parts.join(" | ")}${networkPart}`;
  }, [
    discovery.distance,
    discovery.network,
    project.discoveryBrief?.topology,
  ]);

  const topologySurvey = useMemo(() => {
    const base = projectTopologySurveyState(project.discoveryBrief?.topology);
    const reasons = [...base.reasons];

    // Installation details are confirmed on site (mounting height, power at
    // position, containment, rack space, …). A project with a planned topology
    // stays "needs survey" until those checkboxes are confirmed — exact cable
    // figures alone are not enough for a credible quote. Projects with no
    // topology at all are skipped: there is no design to survey yet.
    const topology = project.discoveryBrief?.topology;
    if ((topology?.connections?.length ?? 0) > 0) {
      const installItems =
        buildSiteSurveyChecklist(project, project.productSelections).installItems ?? [];
      if (installItems.length > 0) {
        const checked = new Set(getInstallChecked(project.id));
        const unconfirmed = installItems.filter((item) => !checked.has(item.id));
        if (unconfirmed.length > 0) {
          reasons.push(
            `Installation details still need on-site confirmation — ${unconfirmed.length} of ${installItems.length} items unchecked (mounting, power, containment, rack position).`,
          );
        }
      }
    }

    return { needsSurvey: reasons.length > 0, reasons };
  }, [project, surveyTick]);

  const requirementRows = [
    { label: "Application", value: discovery.projectTitle, question: "opportunity" },
    { label: "Room / system scale", value: discovery.roomSize, question: "scale" },
    {
      label: "Sources",
      value: [discovery.sourceCount, discovery.sourceConnection]
        .filter(Boolean)
        .join(" - ") || "Not confirmed",
      question: "sources",
    },
    { label: "Displays", value: discovery.displays, question: "displays" },
    { label: "Signal standard", value: discovery.signal, question: "signal-standard" },
    { label: "USB / UC", value: discovery.usb, question: "usb" },
    { label: "Audio", value: discovery.audio || "Not confirmed", question: "audio" },
    { label: "Control", value: discovery.control || "Not confirmed", question: "control" },
    { label: "Budget sensitivity", value: discovery.budget, question: "budget" },
    {
      label: "Infrastructure",
      value: topologyInfraValue,
      question: "locations-connections",
    },
  ];

  function blockExportReason(): string | null {
    if (chainBlockers.length === 0) return null;
    const names = chainBlockers.map((b) => b.sku ? `${b.sku} — ${b.message}` : b.message);
    return `Export blocked — resolve these chain issues first:\n${names.join("; ")}`;
  }

  function getExportBlockReason(): string | null {
    // First check chain blockers from assurance
    const chainReason = blockExportReason();
    if (chainReason) return chainReason;

    // Then check export validation blockers
    if (exportValidation.blockers.length > 0) {
      const names = exportValidation.blockers.map((b) =>
        `${b.sku ? `${b.sku}: ` : ""}${b.message} — fix: ${b.fix}`
      );
      return `Export blocked — resolve these issues first:\n${names.join("; ")}`;
    }

    if (proposal.designRevision?.blockers.length) {
      return `Export blocked — the complete design still has gaps:\n${proposal.designRevision.blockers.join("; ")}`;
    }

    return null;
  }

  async function exportDocx() {
    if (customerOutputBlocked) {
      const reason = getExportBlockReason();
      setExportMessage(
        reason ?? "Complete the remaining wizard items before exporting the final DOCX.",
      );
      return;
    }

    if (!exportValidation.allowed) {
      const reason = getExportBlockReason();
      setExportMessage(reason ?? "Resolve validation issues before exporting.");
      return;
    }

    setExportMessage("Generating formatted DOCX...");

    try {
      await exportProposalDocx(
        proposal,
        bomRows,
        draft,
        project.videowall ?? null,
      );
      setExportMessage(
        "Formatted DOCX generated.",
      );
    } catch (error) {
      setExportMessage(
        error instanceof Error
          ? `DOCX export failed: ${error.message}`
          : "DOCX export failed.",
      );
    }
  }

  async function exportHtml() {
    if (customerOutputBlocked) {
      const reason = getExportBlockReason();
      setExportMessage(
        reason ?? "Complete the remaining wizard items before exporting HTML.",
      );
      return;
    }

    if (!exportValidation.allowed) {
      const reason = getExportBlockReason();
      setExportMessage(reason ?? "Resolve validation issues before exporting.");
      return;
    }

    try {
      await exportProposalHtml(proposal, bomRows, selectedProducts, project.videowall ?? null);
      setExportMessage("HTML export generated.");
    } catch (error) {
      setExportMessage(
        error instanceof Error
          ? `HTML export failed: ${error.message}`
          : "HTML export failed.",
      );
    }
  }

  function exportCsv() {
    if (customerOutputBlocked) {
      const reason = getExportBlockReason();
      setExportMessage(
        reason ?? "Complete the remaining wizard items before exporting the BOM CSV.",
      );
      return;
    }

    if (!exportValidation.allowed) {
      const reason = getExportBlockReason();
      setExportMessage(reason ?? "Resolve validation issues before exporting.");
      return;
    }

    try {
      exportBomCsv(proposal, bomRows);
      setExportMessage("BOM CSV generated.");
    } catch (error) {
      setExportMessage(
        error instanceof Error
          ? `BOM CSV export failed: ${error.message}`
          : "BOM CSV export failed.",
      );
    }
  }

  function exportDiscoveryBrief() {
    // The discovery brief is a pre-design hand-off record, not a final
    // quotation — it stays available even when the wizard is incomplete.
    try {
      void exportProposalDiscoveryBriefDocx(proposal);
      setExportMessage("Discovery brief DOCX generated — share it before design sign-off.");
    } catch (error) {
      setExportMessage(
        error instanceof Error
          ? `Discovery brief export failed: ${error.message}`
          : "Discovery brief export failed.",
      );
    }
  }

  async function exportPdf() {
    if (customerOutputBlocked) {
      const reason = getExportBlockReason();
      setExportMessage(
        reason ?? "Complete the remaining wizard items before exporting a PDF.",
      );
      return;
    }

    if (!exportValidation.allowed) {
      const reason = getExportBlockReason();
      setExportMessage(reason ?? "Resolve validation issues before exporting.");
      return;
    }

    try {
      await exportProposalPdf(proposal, bomRows, selectedProducts, project.videowall ?? null);
      setExportMessage(
        "Opened the print dialog - choose \"Save as PDF\" as the destination.",
      );
    } catch (error) {
      setExportMessage(
        error instanceof Error
          ? `PDF export failed: ${error.message}`
          : "PDF export failed.",
      );
    }
  }

  function submitRecommendationFeedback(
    rating: StoredRecommendationFeedback["rating"],
    label: string,
  ) {
    // Attach the lead BOM SKU so the feedback loop can aggregate lessons per
    // product across projects (wrong-fit / missing-accessory history follows
    // the SKU into the next proposal that selects it).
    const leadSku = bomRows[0]?.sku;
    saveRecommendationFeedback(
      leadSku
        ? { scope: "proposal", rating, label, sku: leadSku }
        : { scope: "proposal", rating, label },
    );
    setFeedbackRating(rating);
    setFeedbackMessage("Thanks - this helps improve future recommendations.");
  }

  return <ProposalCompletionWizardView view={{ InputField, TextAreaField, activeStep, bomRows, customerOutputBlocked, discovery, draft, exportCsv, exportDiscoveryBrief, exportDocx, exportHtml, exportMessage, exportPdf, exportValidation, feedbackMessage, feedbackRating, finalReadinessScore, installation, installationPricing, profile, project, proposal, rateCardState, readiness, recallProposal, requirementRows, salesReadiness, setActiveStep, setDraft, setExportMessage, setShowValidationDetails, showValidationDetails, steps, submitForApproval, submitRecommendationFeedback, topologySurvey, typeConfig, updateDraft, wallRequirements, wallSurvey, wallTransport }} />;
}

export default ProposalCompletionWizard;
