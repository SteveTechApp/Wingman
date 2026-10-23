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

type ProposalCompletionWizardViewValues = Record<string, any>;

export function ProposalCompletionWizardView({ view }: { view: ProposalCompletionWizardViewValues }) {
  const {
    InputField,
    TextAreaField,
    activeStep,
    bomRows,
    customerOutputBlocked,
    discovery,
    draft,
    exportCsv,
    exportDiscoveryBrief,
    exportDocx,
    exportHtml,
    exportMessage,
    exportPdf,
    exportValidation,
    feedbackMessage,
    feedbackRating,
    finalReadinessScore,
    installation,
    installationPricing,
    profile,
    project,
    proposal,
    rateCardState,
    readiness,
    recallProposal,
    requirementRows,
    salesReadiness,
    setActiveStep,
    setDraft,
    setExportMessage,
    setShowValidationDetails,
    showValidationDetails,
    steps,
    submitForApproval,
    submitRecommendationFeedback,
    topologySurvey,
    typeConfig,
    updateDraft,
    wallRequirements,
    wallSurvey,
    wallTransport
  } = view;
  return (
    <div
      className="wm-proposal-wizard-page wm-response-studio"
      data-wingman-proposal-wizard="true"
    >
      <header className="wm-proposal-wizard-header">
        <div>
          <span>Customer response</span>
          <h1>Make the proposal yours.</h1>
          <p>
            Your captured room details are already included. Add anything missing or go straight to export.
          </p>
          <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={() => setActiveStep(4)}>Go to export</button>
        </div>

        <div
          className="wm-proposal-readiness wingman-surface"
          data-ready={customerOutputBlocked ? "false" : "true"}
        >
          <strong>{finalReadinessScore}%</strong>
          <span>
            {customerOutputBlocked ? "Design details to resolve" : "Export available"}
          </span>
        </div>
      </header>

      <section className="wm-proposal-progress-card">
        <div className="wm-proposal-progress-track">
          <span style={{ width: `${finalReadinessScore}%` }} />
        </div>

        <div className="wm-proposal-score-breakdown">
          <span>Discovery {readiness.discovery}/65</span>
          <span>Narrative {readiness.narrative}/15</span>
          <span>Customer {readiness.customer}/8</span>
          <span>Solution {readiness.solution}/12</span>
        </div>
      </section>

      <nav
        className="wm-proposal-step-rail"
        aria-label="Response completion steps"
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
            aria-current={index === activeStep ? "step" : undefined}
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
                <h2>Who is this proposal for?</h2>
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

              <p>Personalise the opening for the decision-maker: explain the current challenge, the proposed outcome and the decision requested. Keep detailed specifications in the technical sections.</p>
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

              <TextAreaField
                label="Complete the wider system design (non-WyreStorm scope)"
                value={draft.externalScope || ""}
                rows={10}
                onChange={(value) => updateDraft("externalScope", value)}
              />
              <p>{REP_COPY.scopeGuidance}</p>

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

              <ProposalBomPricing
                bomRows={bomRows}
                currency={draft.currency}
                unitPrices={draft.bomUnitPrices}
                onQuantityChange={(sku, quantity) =>
                  updateDraft("bomQuantities", {
                    ...draft.bomQuantities,
                    [sku]: quantity,
                  })
                }
                onUnitPriceChange={(sku, value) =>
                  updateDraft("bomUnitPrices", {
                    ...draft.bomUnitPrices,
                    [sku]: value,
                  })
                }
              />

              {installation && installationPricing ? (
                <ProposalInstallationPricing
                  schedule={installation}
                  pricing={installationPricing}
                  rates={draft.installationUnitPrices}
                  currency={draft.currency}
                  rateCard={rateCardState.card}
                  rateCardError={rateCardState.error}
                  onRateChange={(lineId, value) =>
                    updateDraft("installationUnitPrices", {
                      ...draft.installationUnitPrices,
                      [lineId]: value,
                    })
                  }
                  onSaveRateCard={() => {
                    void saveInstallationRateCard(draft.installationUnitPrices, draft.currency);
                  }}
                  onRestoreRates={(rates) =>
                    updateDraft("installationUnitPrices", {
                      ...draft.installationUnitPrices,
                      ...rates,
                    })
                  }
                />
              ) : null}

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
                    onChange={(event) => {
                      const currency = event.target.value as ProposalWizardDraft["currency"];
                      // The installation cells keep what they hold: a rate from
                      // the card is flagged in Pricing rather than silently
                      // converted, and a rate typed for this job is this job's.
                      setDraft(current => ({ ...current, currency, bomUnitPrices: {}, updatedAt: new Date().toISOString() }));
                      setExportMessage("Currency changed. Equipment rates need confirming; installation rates that came from the card are flagged in Pricing.");
                    }}
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
                  Generate your document from the captured information. Open details remain visible; no manager sign-off is required.
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
                      ["Solution and BOM decision", readiness.solution === 12],
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
                  {/* The list owns the fixes a page can offer in place, so the
                      rate card's one-tap restore sits on the item that reports
                      the unpriced lines instead of a step away. */}
                  <ProposalReadinessList
                    missing={readiness.missing}
                    rateCard={rateCardState.card}
                    lineIds={installation?.lines.map((line) => line.id) ?? []}
                    rates={draft.installationUnitPrices}
                    currency={draft.currency}
                    onRestoreRates={(rates) =>
                      updateDraft("installationUnitPrices", {
                        ...draft.installationUnitPrices,
                        ...rates,
                      })
                    }
                  />
                </section>
              </div>

              {proposal.designRevision ? <DesignProposalReview revision={proposal.designRevision} /> : null}


              <VerifyBeforeQuoteNote />

              <Link to={`${routeCatalogByKey.projects.path}/${project.id}?view=history`} className="wm-ui-button wm-ui-button-secondary">
                Review saved response versions in Project
              </Link>

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

              <ProposalWallGate transport={wallTransport} survey={wallSurvey}
                requirements={wallRequirements}
                onRequirementsChange={(next) => updateSavedWallRequirements(project.id, next)}
                onRecordDetail={(linkDetails) => Boolean(recordWallInstallDetail({ projectId: project.id, linkDetails, transport: wallTransport }))} />

              <div className="wm-proposal-export-actions">
                <button
                  type="button"
                  className="is-primary"
                  disabled={customerOutputBlocked}
                  onClick={exportDocx}
                >
                  <Download aria-hidden="true" />
                  Export formatted DOCX
                </button>

                <button
                  type="button"
                  disabled={customerOutputBlocked}
                  onClick={exportPdf}
                >
                  <Printer aria-hidden="true" />
                  Export PDF
                </button>

                <button
                  type="button"
                  disabled={customerOutputBlocked}
                  onClick={exportHtml}
                >
                  <FileText aria-hidden="true" />
                  Export HTML
                </button>

                <button
                  type="button"
                  disabled={customerOutputBlocked}
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

              {/* Approval workflow controls */}
              {(() => {
                const approvalStatus = proposal.approvalStatus || "draft";

                return (
                  <details className="wm-proposal-approval-section"><summary>Optional team review</summary>
                    <div className="wm-proposal-approval-header">
                      <h3>Approval status</h3>
                      <ApprovalStatusBadge status={approvalStatus} />
                    </div>
                    {approvalStatus === "approved" && (
                      <p className="wm-proposal-approval-note wm-proposal-approval-note--approved">
                        <CheckCircle size={14} /> Approved by {proposal.approvedBy} on {proposal.approvedAt ? new Date(proposal.approvedAt).toLocaleDateString() : "unknown date"}.
                        {proposal.approvalComments && <> Comments: "{proposal.approvalComments}"</>}
                      </p>
                    )}
                    {approvalStatus === "rejected" && (
                      <p className="wm-proposal-approval-note wm-proposal-approval-note--rejected">
                        <XCircle size={14} /> Returned for changes by {proposal.approvedBy}.
                        {proposal.approvalComments && <> Feedback: "{proposal.approvalComments}"</>}
                      </p>
                    )}
                    {approvalStatus === "pending" && (
                      <p className="wm-proposal-approval-note wm-proposal-approval-note--pending">
                        <Clock size={14} /> Submitted by {proposal.submittedBy} — awaiting manager review.
                      </p>
                    )}
                    <div className="wm-proposal-approval-actions">
                      {(approvalStatus === "draft" || approvalStatus === "rejected") && (
                        <button
                          type="button"
                          className="wm-button is-primary"
                          disabled={customerOutputBlocked}
                          onClick={() => {
                            submitForApproval(project.id, project.name || "Salesperson");
                          }}
                          title={customerOutputBlocked ? "Complete the proposal and system design before submitting for approval" : "Submit this exact design revision for manager approval"}
                        >
                          <Send size={14} /> Submit for approval
                        </button>
                      )}
                      {approvalStatus === "pending" && (
                        <button
                          type="button"
                          className="wm-button wm-button-secondary"
                          onClick={() => recallProposal(project.id)}
                        >
                          <RotateCcw size={14} /> Recall submission
                        </button>
                      )}
                    </div>
                  </details>
                );
              })()}

              <div className="wm-proposal-crm-section">
                <h3>Push to CRM</h3>
                <p className="wm-proposal-crm-intro">
                  Send this proposal to your CRM to create or update the opportunity record.
                </p>
                <CrmSharePanel project={project} />
              </div>

              <SiteSurveyChecklist project={project} />

              <div>
                <h3>Recommendation feedback</h3>
                <p>
                  Was the recommended architecture and product shortlist right for this
                  opportunity? This helps improve future recommendations.
                </p>
                <div>
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
                  <p>{feedbackMessage}</p>
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
          <ProposalCoverPreview draft={draft} company={profile.companyName || "Wingman"} />
          <details className="wm-response-document-details">
            <summary>Document format and readiness</summary>
            <strong>{typeConfig.label}</strong>
            <p>{typeConfig.description}</p>
            <p>{finalReadinessScore}% of supporting details captured. Completion percentage and team approval do not prevent export.</p>
          </details>
        </aside>
      </div>
    </div>
  );
}
