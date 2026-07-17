import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ListChecks,
  Table2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  saveProjectProposalToProject,
  type StoredProject,
  type StoredProjectProposal,
} from "../data/projectStore";
import { getStoredWingmanProfile } from "../data/wingmanProfile";
import {
  exportBomCsv,
  exportProposalHtml,
} from "../lib/proposalExport";
import { exportProposalDocx } from "../lib/proposalDocxExport";
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
  const project = useMemo(
    () => getCurrentWorkflowProject(readProjectStore()),
    [],
  );
  const profile = useMemo(() => getStoredWingmanProfile(), []);

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
      profile={profile}
    />
  );
}

function ProposalCompletionWizardContent({
  project,
  profile,
}: {
  project: StoredProject;
  profile: ReturnType<typeof getStoredWingmanProfile>;
}) {
  const discovery = useMemo(() => readDiscovery(project), [project]);
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
        project.productSelections ?? [],
        familyScores,
      ),
    [familyScores, project.productSelections],
  );

  const salesReadiness = useMemo(
    () =>
      buildSalesReadinessPackage({
        products: selectedProducts,
        discovery,
        assumptions:
          project.proposal?.verification
            ? project.proposal.assumptions
            : assumptions,
        ingest: project.ingest,
        compareRun: project.compareRuns?.[0] ?? null,
      }),
    [
      assumptions,
      discovery,
      project.compareRuns,
      project.ingest,
      project.proposal,
      selectedProducts,
    ],
  );

  const defaults = useMemo(
    () =>
      createProposalWizardDefaults({
        projectId: project.id,
        projectName: project.name,
        customerName: discovery.customerName,
        contactName: discovery.contactName,
        preparedBy:
          profile.reportPreparedBy ||
          profile.userName ||
          project.owner,
        executiveSummary: discovery.summary,
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
      }),
    [
      assumptions,
      discovery.architecture,
      discovery.contactName,
      discovery.customerName,
      discovery.summary,
      familyScores,
      profile.reportPreparedBy,
      profile.userName,
      project.id,
      project.name,
      project.owner,
      project.proposal?.applicationProposal?.solutionOverview,
      salesReadiness.governedDependencies,
    ],
  );

  const [activeStep, setActiveStep] = useState(0);
  const [draft, setDraft] = useState<ProposalWizardDraft>(() =>
    loadProposalWizardDraft(project.id, defaults),
  );
  const [exportMessage, setExportMessage] = useState("");

  const baseBomRows = salesReadiness.bomRows;
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
      }),
    [
      bomRows.length,
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
      applicationProposal:
        project.proposal?.applicationProposal,
      companyName: profile.companyName,
      preparedBy: draft.preparedBy,
      proposalFooter: profile.proposalFooter,
      companyLogoDataUrl:
        profile.companyLogoDataUrl,
      contactEmail: profile.email,
      contactPhone: profile.phone,
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
      project.discoveryBrief?.recommendationEvidence?.evidenceUsed,
      project.name,
      project.proposal?.applicationProposal,
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

  const requirementRows = [
    ["Application", discovery.projectTitle],
    ["Room / system scale", discovery.roomSize],
    [
      "Sources",
      [discovery.sourceCount, discovery.sourceConnection]
        .filter(Boolean)
        .join(" - ") || "Not confirmed",
    ],
    ["Displays", discovery.displays],
    ["Signal standard", discovery.signal],
    ["USB / UC", discovery.usb],
    ["Audio", discovery.audio || "Not confirmed"],
    ["Control", discovery.control || "Not confirmed"],
    ["Budget sensitivity", discovery.budget],
    [
      "Infrastructure",
      [discovery.distance, discovery.network]
        .filter(Boolean)
        .join(" - ") || "Not confirmed",
    ],
  ];

  async function exportDocx() {
    if (readiness.score < 100) {
      setExportMessage(
        "Complete the remaining wizard items before exporting the final DOCX.",
      );
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
          className="wm-proposal-readiness"
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
                {requirementRows.map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>

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
                    Finder/product-selection workflow.
                  </p>
                </div>
                <Link to={routeCatalogByKey.finder.path}>
                  Open Product Finder
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>
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
                  onClick={() =>
                    exportProposalHtml(proposal, bomRows)
                  }
                >
                  <FileText aria-hidden="true" />
                  Export HTML
                </button>

                <button
                  type="button"
                  onClick={() =>
                    exportBomCsv(proposal, bomRows)
                  }
                >
                  <Table2 aria-hidden="true" />
                  Export BOM CSV
                </button>
              </div>

              {exportMessage ? (
                <p className="wm-proposal-export-message">
                  {exportMessage}
                </p>
              ) : null}
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
