import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ListChecks,
  Printer,
  Table2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { NeedsSiteSurveyFlag } from "./NeedsSiteSurveyFlag";
import { DiscoveryConversationReview } from "./DiscoveryConversationReview";
import { VerifyBeforeQuoteNote } from "./VerifyBeforeQuoteNote";
import { ProposalVersionHistory } from "./ProposalVersionHistory";
import { CrmSharePanel } from "./CrmSharePanel";
import { SiteSurveyChecklist } from "./SiteSurveyChecklist";
import {
  saveProjectProposalToProject,
  saveRecommendationFeedback,
  useProjectStore,
  type StoredProject,
  type StoredProjectProposal,
  type StoredRecommendationFeedback,
} from "../data/projectStore";
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
  return Array.from(
    new Set([
      ...(project.ingest?.unknowns ?? []),
      ...(project.compareRuns?.[0]?.warnings ?? []),
      ...(project.recommendationEvidence?.missingInformation ?? []),
      ...(project.discoveryBrief?.recommendationEvidence?.missingInformation ?? []),
    ]),
  ).slice(0, 10);
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
  return (
    <label className="wm-proposal-field wm-proposal-field-wide">
      <span>{props.label}</span>
      {props.hint ? <small>{props.hint}</small> : null}
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
        <h1>Open a project before building a proposal</h1>
        <p>
          Proposal output must remain attached to the correct Discovery brief,
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
  // state instead of going stale after a checkbox is toggled.
  const [surveyTick, setSurveyTick] = useState(0);
  useEffect(() => {
    const refresh = () => setSurveyTick((tick) => tick + 1);
    window.addEventListener("wingman:survey-edited", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("wingman:survey-edited", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const salesReadiness = useMemo(
    () =>
      buildSalesReadinessPackage({
        products: selectedProducts,
        discovery: discoveryWithCompletion,
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
        executiveSummary: project.proposal?.applicationProposal?.executiveSummary || discovery.summary,
        architectureNarrative:
          discovery.architecture ||
          familyScores[0]?.family ||
          "Architecture to be confirmed from the completed Discovery brief and selected product path.",
        proposedSolution:
          project.proposal?.applicationProposal?.solutionOverview,
        assumptions,
        dependencies:
          salesReadiness.governedDependencies.map(
            (item) =>
              `${item.label}: ${item.validationQuestion}`,
          ),
      });
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
  const [exportMessage, setExportMessage] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<StoredRecommendationFeedback["rating"] | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showValidationDetails, setShowValidationDetails] = useState(false);

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

  const commercialPricingComplete = bomRows.length > 0 && bomRows.every((row) => {
    const value = Number(draft.bomUnitPrices[row.sku]);
    return Number.isFinite(value) && value >= 0;
  });

  const applicationProposal = useMemo(
    () => project.proposal?.applicationProposal ?? compileProjectApplicationProposal({
      vertical: asText(project.discoveryBrief?.roomModel?.vertical) || "Commercial AV",
      application: discovery.projectTitle,
      summary: draft.executiveSummary || discovery.summary,
      architecture: draft.architectureNarrative || discovery.architecture,
      products: selectedProducts,
      bomRows,
      assumptions: linesFromText(draft.assumptions),
    }),
    [bomRows, discovery.architecture, discovery.projectTitle, discovery.summary, draft.architectureNarrative, draft.assumptions, draft.executiveSummary, project.discoveryBrief?.roomModel?.vertical, project.proposal?.applicationProposal, selectedProducts],
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

  const exportValidation = useMemo<ExportValidationResult>(() =>
    validateProposalExport({
      products: selectedProducts,
      bomRows,
      topology: project.discoveryBrief?.topology,
      discoveryConversation: project.discoveryBrief?.discoveryConversation,
    }),
    [
      bomRows,
      project.discoveryBrief?.topology,
      project.discoveryBrief?.discoveryConversation,
      selectedProducts,
    ],
  );

  const typeConfig = getProposalDocumentTypeConfig(
    draft.documentType,
  );

  const proposal = useMemo<StoredProjectProposal>(
    () => ({
      title:
        draft.projectName ||
        project.name,
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
      governanceWarnings:
        salesReadiness.governanceWarnings,
      validationNotes:
        salesReadiness.validationNotes,
      visualBlocks:
        project.proposal?.visualBlocks ?? [],
      readinessScore: readiness.score,
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
      updatedAt: new Date().toISOString(),
    }),
    [
      bomRows,
      discovery.summary,
      draft.assumptions,
      draft.executiveSummary,
      draft.nextSteps,
      draft.preparedBy,
      draft.projectName,
      familyScores,
      profile.companyLogoDataUrl,
      profile.companyName,
      profile.email,
      profile.phone,
      profile.proposalFooter,
      project.discoveryBrief?.discoveryConversation,
      project.discoveryBrief?.recommendationEvidence?.evidenceUsed,
      project.name,
      applicationProposal,
      project.proposal?.verification,
      project.proposal?.visualBlocks,
      project.recommendationEvidence?.evidenceUsed,
      readiness.score,
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
        b.sku ? `${b.sku}: ${b.message}` : b.message
      );
      return `Export blocked — resolve these issues first:\n${names.join("; ")}`;
    }

    return null;
  }

  async function exportDocx() {
    if (readiness.score < 100) {
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

  function exportHtml() {
    if (readiness.score < 100) {
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
      exportProposalHtml(proposal, bomRows, selectedProducts);
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
    if (readiness.score < 100) {
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

  function exportPdf() {
    if (readiness.score < 100) {
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
      exportProposalPdf(proposal, bomRows, selectedProducts);
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

  return (
    <div
      className="wm-proposal-wizard-page"
      data-wingman-proposal-wizard="true"
    >
      <header className="wm-proposal-wizard-header">
        <div>
          <span>Proposal Support</span>
          <h1>Complete and export the customer proposal</h1>
          <p>
            Discovery supplies the proposal foundation. Complete the remaining
            customer, solution, commercial and approval details to reach 100%.
          </p>
        </div>

        <div
          className="wm-proposal-readiness wingman-surface"
          data-ready={readiness.score === 100 ? "true" : "false"}
        >
          <strong>{readiness.score}%</strong>
          <span>
            {readiness.score === 100
              ? "Ready for DOCX export"
              : "Proposal completion"}
          </span>
        </div>
      </header>

      <section className="wm-proposal-progress-card">
        <div className="wm-proposal-progress-track">
          <span style={{ width: `${readiness.score}%` }} />
        </div>

        <div className="wm-proposal-score-breakdown">
          <span>Discovery {readiness.discovery}/65</span>
          <span>Narrative {readiness.narrative}/15</span>
          <span>Customer {readiness.customer}/8</span>
          <span>Solution {readiness.solution}/8</span>
          <span>Approval {readiness.approval}/4</span>
        </div>
      </section>

      <nav
        className="wm-proposal-step-rail"
        aria-label="Proposal completion steps"
      >
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            className={
              index === activeStep
                ? "is-active"
                : index < activeStep
                  ? "is-complete"
                  : ""
            }
            onClick={() => setActiveStep(index)}
          >
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>

      <div className="wm-proposal-wizard-layout">
        <section className="wm-proposal-step-card">
          {activeStep === 0 ? (
            <>
              <div className="wm-proposal-step-heading">
                <span>Step 1 of 5</span>
                <h2>Customer and project</h2>
                <p>
                  Set the document type and the details used on the cover,
                  header and footer.
                </p>
              </div>

              <div className="wm-proposal-form-grid">
                <label className="wm-proposal-field wm-proposal-field-wide">
                  <span>Proposal type</span>
                  <select
                    value={draft.documentType}
                    onChange={(event) =>
                      updateDraft(
                        "documentType",
                        event.target.value as ProposalWizardDraft["documentType"],
                      )
                    }
                  >
                    {PROPOSAL_DOCUMENT_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <small>{typeConfig.description}</small>
                </label>

                <InputField
                  label="Customer / organisation"
                  value={draft.customerName}
                  placeholder="Customer name"
                  onChange={(value) =>
                    updateDraft("customerName", value)
                  }
                />
                <InputField
                  label="Customer contact"
                  value={draft.contactName}
                  placeholder="Contact name"
                  onChange={(value) =>
                    updateDraft("contactName", value)
                  }
                />
                <InputField
                  label="Project name"
                  value={draft.projectName}
                  onChange={(value) =>
                    updateDraft("projectName", value)
                  }
                />
                <InputField
                  label="Proposal reference"
                  value={draft.proposalReference}
                  onChange={(value) =>
                    updateDraft("proposalReference", value)
                  }
                />
                <InputField
                  label="Proposal date"
                  type="date"
                  value={draft.proposalDate}
                  onChange={(value) =>
                    updateDraft("proposalDate", value)
                  }
                />
                <InputField
                  label="Prepared by"
                  value={draft.preparedBy}
                  onChange={(value) =>
                    updateDraft("preparedBy", value)
                  }
                />
              </div>
            </>
          ) : null}

          {activeStep === 1 ? (
            <>
              <div className="wm-proposal-step-heading">
                <span>Step 2 of 5</span>
                <h2>Requirements review</h2>
                <p>
                  Review the Discovery brief and convert it into customer-safe
                  proposal wording.
                </p>
              </div>

              <div className="wm-proposal-requirements-grid">
                {requirementRows.map(({ label, value, question }) => (
                  <Link
                    key={label}
                    to={`${routeCatalogByKey.discovery.path}?edit=${encodeURIComponent(question)}`}
                    aria-label={`Edit ${label} in Discovery`}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>Edit in Discovery</small>
                  </Link>
                ))}
              </div>

              <DiscoveryConversationReview
                items={project.discoveryBrief?.discoveryConversation ?? []}
              />

              <NeedsSiteSurveyFlag reasons={topologySurvey.reasons} />

              <div className="wm-proposal-form-grid">
                <TextAreaField
                  label="Executive summary"
                  value={draft.executiveSummary}
                  rows={5}
                  onChange={(value) =>
                    updateDraft("executiveSummary", value)
                  }
                />
                <TextAreaField
                  label="Customer objectives and required outcome"
                  value={draft.customerObjectives}
                  rows={5}
                  onChange={(value) =>
                    updateDraft("customerObjectives", value)
                  }
                />
              </div>

              <details className="wm-proposal-evidence-details">
                <summary>View captured Discovery evidence</summary>
                <p>{discovery.summary}</p>
                {discovery.nextQuestion ? (
                  <p>
                    <strong>Next question:</strong>{" "}
                    {discovery.nextQuestion}
                  </p>
                ) : null}
              </details>
            </>
          ) : null}

          {activeStep === 2 ? (
            <>
              <div className="wm-proposal-step-heading">
                <span>Step 3 of 5</span>
                <h2>Proposed solution</h2>
                <p>
                  Confirm the architecture, customer-facing solution narrative
                  and equipment schedule.
                </p>
              </div>

              <div className="wm-proposal-form-grid">
                <TextAreaField
                  label="Proposed solution"
                  value={draft.proposedSolution}
                  rows={6}
                  onChange={(value) =>
                    updateDraft("proposedSolution", value)
                  }
                />
                <TextAreaField
                  label="Technical architecture"
                  value={draft.architectureNarrative}
                  rows={6}
                  onChange={(value) =>
                    updateDraft("architectureNarrative", value)
                  }
                />
              </div>

              <div className="wm-proposal-bom-heading">
                <div>
                  <h3>Selected products and BOM</h3>
                  <p>
                    Products are taken from the active project and governed
                    Discovery recommendation/product-selection workflow.
                  </p>
                </div>
                <Link to={routeCatalogByKey.recommendations.path}>
                  Open Recommendations
                </Link>
              </div>

              <div className="wm-proposal-bom-table">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Description</th>
                      <th>Role</th>
                      <th>Qty</th>
                      <th>Unit price ({draft.currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomRows.length ? (
                      bomRows.map((row) => (
                        <tr key={`${row.item}-${row.sku}`}>
                          <td>{row.sku}</td>
                          <td>{row.description}</td>
                          <td>{row.role}</td>
                          <td>
                            <input
                              aria-label={`Quantity for ${row.sku}`}
                              type="number"
                              min={1}
                              value={row.qty}
                              onChange={(event) =>
                                updateDraft("bomQuantities", {
                                  ...draft.bomQuantities,
                                  [row.sku]: Math.max(
                                    1,
                                    Number(event.target.value) || 1,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              aria-label={`Unit price for ${row.sku}`}
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              value={draft.bomUnitPrices[row.sku] ?? ""}
                              onChange={(event) =>
                                updateDraft("bomUnitPrices", {
                                  ...draft.bomUnitPrices,
                                  [row.sku]: event.target.value,
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          No final WyreStorm BOM is attached yet. Open Product
                          Finder, or explicitly continue with a design proposal
                          without a final equipment schedule.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!bomRows.length ? (
                <label className="wm-proposal-confirmation">
                  <input
                    type="checkbox"
                    checked={draft.continueWithoutBom}
                    onChange={(event) =>
                      updateDraft(
                        "continueWithoutBom",
                        event.target.checked,
                      )
                    }
                  />
                  <span>
                    Continue without a final BOM and label the document as a
                    design/proposal response rather than an equipment quotation.
                  </span>
                </label>
              ) : null}

              <label className="wm-proposal-confirmation">
                <input
                  type="checkbox"
                  checked={draft.solutionConfirmed}
                  onChange={(event) =>
                    updateDraft(
                      "solutionConfirmed",
                      event.target.checked,
                    )
                  }
                />
                <span>
                  I have reviewed the proposed architecture, product direction
                  and equipment schedule for this proposal.
                </span>
              </label>
            </>
          ) : null}

          {activeStep === 3 ? (
            <>
              <div className="wm-proposal-step-heading">
                <span>Step 4 of 5</span>
                <h2>Commercial and delivery</h2>
                <p>
                  Define scope boundaries, dependencies and responsibilities so
                  the customer understands what is and is not included.
                </p>
              </div>

              <div className="wm-proposal-form-grid">
                <label className="wm-proposal-field">
                  <span>Proposal currency</span>
                  <select
                    value={draft.currency}
                    onChange={(event) => updateDraft("currency", event.target.value as ProposalWizardDraft["currency"])}
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </label>
                <label className="wm-proposal-confirmation">
                  <input
                    type="checkbox"
                    checked={draft.pricesExcludeTax}
                    onChange={(event) => updateDraft("pricesExcludeTax", event.target.checked)}
                  />
                  <span>Equipment prices exclude VAT / sales tax.</span>
                </label>
                <TextAreaField
                  label="Scope inclusions"
                  value={draft.inclusions}
                  onChange={(value) =>
                    updateDraft("inclusions", value)
                  }
                />
                <TextAreaField
                  label="Scope exclusions"
                  value={draft.exclusions}
                  onChange={(value) =>
                    updateDraft("exclusions", value)
                  }
                />
                <TextAreaField
                  label="Assumptions"
                  value={draft.assumptions}
                  onChange={(value) =>
                    updateDraft("assumptions", value)
                  }
                />
                <TextAreaField
                  label="Dependencies"
                  value={draft.dependencies}
                  onChange={(value) =>
                    updateDraft("dependencies", value)
                  }
                />
                <TextAreaField
                  label="Responsibilities"
                  value={draft.responsibilities}
                  onChange={(value) =>
                    updateDraft("responsibilities", value)
                  }
                />
                <TextAreaField
                  label="Services and commercial allowances (service | owner | commercial status)"
                  value={draft.servicesAndAllowances}
                  rows={6}
                  onChange={(value) => updateDraft("servicesAndAllowances", value)}
                />
                <TextAreaField
                  label="Implementation timeline (phase | activity | timing | dependency)"
                  value={draft.implementationTimeline}
                  rows={6}
                  onChange={(value) => updateDraft("implementationTimeline", value)}
                />
                <TextAreaField
                  label="Next steps"
                  value={draft.nextSteps}
                  onChange={(value) =>
                    updateDraft("nextSteps", value)
                  }
                />
                <InputField
                  label="Lead-time wording"
                  value={draft.leadTime}
                  onChange={(value) =>
                    updateDraft("leadTime", value)
                  }
                />
                <InputField
                  label="Warranty and support wording"
                  value={draft.warranty}
                  onChange={(value) =>
                    updateDraft("warranty", value)
                  }
                />
              </div>
            </>
          ) : null}

          {activeStep === 4 ? (
            <>
              <div className="wm-proposal-step-heading">
                <span>Step 5 of 5</span>
                <h2>Review and export</h2>
                <p>
                  Resolve the final checklist, approve the customer-safe
                  wording and generate the formatted Word document.
                </p>
              </div>

              <div className="wm-proposal-final-grid">
                <section>
                  <h3>Completion checklist</h3>
                  <ul>
                    {[
                      ["Discovery brief", readiness.discovery === 65],
                      ["Proposal narrative", readiness.narrative === 15],
                      ["Customer details", readiness.customer === 8],
                      ["Solution and BOM decision", readiness.solution === 8],
                      ["Final approval", readiness.approval === 4],
                    ].map(([label, complete]) => (
                      <li
                        key={String(label)}
                        data-complete={
                          complete ? "true" : "false"
                        }
                      >
                        <CheckCircle2 aria-hidden="true" />
                        <span>{String(label)}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Technical release gate</h3>
                  {salesReadiness.assurance.blockers.length ? (
                    <>
                      <p>This proposal cannot be exported for customer issue until these items are resolved:</p>
                      <ul>
                        {salesReadiness.assurance.blockers.map((item) => (
                          <li key={item.id}>
                            {item.sku ? <strong>{item.sku}: </strong> : null}
                            {item.message}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>Selected core products have passed lifecycle and governed-profile release checks.</p>
                  )}
                  {topologySurvey.needsSurvey ? (
                    <NeedsSiteSurveyFlag reasons={topologySurvey.reasons} />
                  ) : null}
                </section>

                <section>
                  <h3>Remaining items</h3>
                  {readiness.missing.length ? (
                    <ul>
                      {readiness.missing.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No completion item remains.</p>
                  )}
                </section>
              </div>

              <label className="wm-proposal-confirmation wm-proposal-final-confirmation">
                <input
                  type="checkbox"
                  checked={draft.reviewConfirmed}
                  onChange={(event) =>
                    updateDraft(
                      "reviewConfirmed",
                      event.target.checked,
                    )
                  }
                />
                <span>
                  I have reviewed the proposal wording, scope, assumptions,
                  validation items and customer-facing product statements.
                </span>
              </label>

              <VerifyBeforeQuoteNote className="wm-proposal-verify-note" />

              <ProposalVersionHistory
                versions={project.proposalVersions ?? []}
                currentProposal={proposal}
                onRestore={() => {
                  /* Force re-render after restore */
                  window.location.reload();
                }}
              />

              {/* Export validation gate */}
              {(exportValidation.blockers.length > 0 || exportValidation.warnings.length > 0) && (
                <div className="wm-proposal-validation-gate">
                  <div className="wm-proposal-validation-header">
                    <h3>Export Validation</h3>
                    <button
                      type="button"
                      className="wm-proposal-validation-toggle"
                      onClick={() => setShowValidationDetails(!showValidationDetails)}
                    >
                      {showValidationDetails ? "Hide details" : "Show details"}
                    </button>
                  </div>

                  {exportValidation.blockers.length > 0 && (
                    <div className="wm-proposal-validation-blockers">
                      <p className="wm-proposal-validation-summary">
                        <strong>{exportValidation.blockers.length} blocker(s) must be resolved before export</strong>
                      </p>
                      {showValidationDetails && (
                        <ul>
                          {exportValidation.blockers.map((blocker) => (
                            <li key={blocker.id} className="wm-proposal-validation-item wm-proposal-validation-item--blocker">
                              <span className="wm-proposal-validation-domain">{blocker.domain}</span>
                              {blocker.sku && <span className="wm-proposal-validation-sku">{blocker.sku}</span>}
                              <span className="wm-proposal-validation-message">{blocker.message}</span>
                              <span className="wm-proposal-validation-fix">Fix: {blocker.fix}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {exportValidation.warnings.length > 0 && (
                    <div className="wm-proposal-validation-warnings">
                      <p className="wm-proposal-validation-summary">
                        <strong>{exportValidation.warnings.length} warning(s) — review before issue</strong>
                      </p>
                      {showValidationDetails && (
                        <ul>
                          {exportValidation.warnings.map((warning) => (
                            <li key={warning.id} className="wm-proposal-validation-item wm-proposal-validation-item--warning">
                              <span className="wm-proposal-validation-domain">{warning.domain}</span>
                              {warning.sku && <span className="wm-proposal-validation-sku">{warning.sku}</span>}
                              <span className="wm-proposal-validation-message">{warning.message}</span>
                              <span className="wm-proposal-validation-fix">Fix: {warning.fix}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="wm-proposal-export-actions">
                <button
                  type="button"
                  className="is-primary"
                  disabled={readiness.score < 100}
                  onClick={exportDocx}
                >
                  <Download aria-hidden="true" />
                  Export formatted DOCX
                </button>

                <button
                  type="button"
                  disabled={readiness.score < 100}
                  onClick={exportPdf}
                >
                  <Printer aria-hidden="true" />
                  Export PDF
                </button>

                <button
                  type="button"
                  disabled={readiness.score < 100}
                  onClick={exportHtml}
                >
                  <FileText aria-hidden="true" />
                  Export HTML
                </button>

                <button
                  type="button"
                  disabled={readiness.score < 100}
                  onClick={exportCsv}
                >
                  <Table2 aria-hidden="true" />
                  Export BOM CSV
                </button>

                <button
                  type="button"
                  title="Pre-design hand-off: available before the wizard is complete"
                  disabled={(proposal.discoveryConversation ?? []).length === 0}
                  onClick={exportDiscoveryBrief}
                >
                  <FileText aria-hidden="true" />
                  Export discovery brief
                </button>
              </div>

              {exportMessage ? (
                <p className="wm-proposal-export-message">
                  {exportMessage}
                </p>
              ) : null}

              <div className="wm-proposal-crm-section">
                <h3>Push to CRM</h3>
                <p className="wm-proposal-crm-intro">
                  Send this proposal to your CRM to create or update the opportunity record.
                </p>
                <CrmSharePanel project={project} />
              </div>

              <SiteSurveyChecklist project={project} />

              <div className="wm-proposal-recommendation-feedback">
                <h3>Recommendation feedback</h3>
                <p>
                  Was the recommended architecture and product shortlist right for this
                  opportunity? This helps improve future recommendations.
                </p>
                <div className="wm-proposal-feedback-actions">
                  <button
                    type="button"
                    aria-pressed={feedbackRating === "accepted"}
                    onClick={() =>
                      submitRecommendationFeedback(
                        "accepted",
                        "Recommendation accepted as proposed",
                      )
                    }
                  >
                    <ThumbsUp aria-hidden="true" />
                    Looks right
                  </button>
                  <button
                    type="button"
                    aria-pressed={feedbackRating === "missing-accessory"}
                    onClick={() =>
                      submitRecommendationFeedback(
                        "missing-accessory",
                        "Recommendation was missing an accessory or dependency",
                      )
                    }
                  >
                    Missing something
                  </button>
                  <button
                    type="button"
                    aria-pressed={feedbackRating === "wrong-fit"}
                    onClick={() =>
                      submitRecommendationFeedback(
                        "wrong-fit",
                        "Recommendation was the wrong architecture or product fit",
                      )
                    }
                  >
                    <ThumbsDown aria-hidden="true" />
                    Wrong fit
                  </button>
                </div>
                {feedbackMessage ? (
                  <p className="wm-proposal-feedback-message">{feedbackMessage}</p>
                ) : null}
              </div>
            </>
          ) : null}

          <footer className="wm-proposal-navigation">
            <button
              type="button"
              disabled={activeStep === 0}
              onClick={() =>
                setActiveStep((current) =>
                  Math.max(0, current - 1),
                )
              }
            >
              <ChevronLeft aria-hidden="true" />
              Previous
            </button>

            <span>
              Draft saved automatically to the active project.
            </span>

            <button
              type="button"
              disabled={activeStep === steps.length - 1}
              onClick={() =>
                setActiveStep((current) =>
                  Math.min(steps.length - 1, current + 1),
                )
              }
            >
              Continue
              <ChevronRight aria-hidden="true" />
            </button>
          </footer>
        </section>

        <aside className="wm-proposal-wizard-sidebar">
          <section>
            <ListChecks aria-hidden="true" />
            <div>
              <span>Current document</span>
              <strong>{typeConfig.label}</strong>
              <p>{typeConfig.description}</p>
            </div>
          </section>

          <section>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <span>Readiness</span>
              <strong>{readiness.score}% complete</strong>
              <p>
                A complete Discovery contributes up to 65 points. Existing
                proposal narrative normally takes the starting score into the
                80-90% range.
              </p>
            </div>
          </section>

          <section>
            <FileText aria-hidden="true" />
            <div>
              <span>Export standard</span>
              <strong>Formatted Microsoft Word document</strong>
              <p>
                Includes a cover page, headers, footer, page number, structured
                headings and a repeating equipment-schedule header row.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default ProposalCompletionWizard;
