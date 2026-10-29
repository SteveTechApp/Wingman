import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, FileText, LayoutTemplate, Save } from "lucide-react";
import type { InstallationSchedule, InstallationUnitPrices } from "../lib/installationSchedule";
import type { InstallationRateCard } from "../lib/installationRateCard";
import type { ExportValidationResult } from "../lib/proposalExportValidation";
import type { DependencyPrompt } from "../lib/dependencyScope";
import type { RoomTemplate } from "../lib/roomTemplates";
import {
  templatePreIssueResumeStage,
  templatePreIssueStages,
  templatePreIssueSummary,
  type TemplatePreIssueStageKey,
} from "../lib/templatePreIssue";
import {
  readTemplatePreIssueStage,
  rememberTemplatePreIssueStage,
  templatePreIssueStageFromSearch,
  templatePreIssueStageSearch,
} from "../lib/templatePreIssuePass";
import {
  saveTemplateProposalPricing,
  type TemplateProposalPricing,
  type TemplatePricingSummary,
} from "../lib/templateProposalPricing";
import type { WallSurveyGap } from "../lib/wallSurvey";
import type { WallLinkDetail } from "../lib/videowallTransport";
import { TemplateExportValidation } from "./TemplateExportValidation";
import { TemplatePreIssueNav, TemplatePreIssueRail, TemplatePreIssueShare } from "./TemplatePreIssueRail";
import { TemplatePricingPanel } from "./TemplatePricingPanel";
import { TemplateProposalUnpriced } from "./TemplateProposalUnpriced";

/**
 * The template's Proposal tab: a pre-issue walk rather than one long page.
 *
 * A template exports without opening the wizard, so this tab is the whole of the
 * review before the document leaves. The walk reads it the way the work arrives —
 * blockers that hold the export, then the lines that would print as TBC, then the
 * assumptions the document labels — and opens on the first stage that has
 * something in it. The actions sit in a command bar above the walk, so the
 * document can leave from any stage without reaching the bottom of a scroll, and
 * only a blocker disables them: an unpriced line prints TBC and holds the total,
 * not the button.
 *
 * The walk also remembers the stage the rep left it on, per template, so coming
 * back from Room design or another template's page reopens the reading they were
 * in rather than the first stage that has work.
 */
export type TemplateProposalPanelProps = {
  template: RoomTemplate;
  validation: ExportValidationResult;
  readinessScore: number;
  pricingSummary: TemplatePricingSummary;
  surveyGaps: WallSurveyGap[];
  onRecordSurveyDetail: ((linkDetails: Record<string, WallLinkDetail>) => boolean) | null;
  /**
   * Schedules the mid-span repeater and records the span each receiver then
   * serves, clearing a display run past the range's rating. Null when the caller
   * cannot write the schedule, so the block keeps its prose fix only.
   */
  onScheduleDisplayRunSpans: (() => boolean) | null;
  /**
   * The dependency prompts the schedule still carries, and the write that
   * records one. A template built from a project inherits that project's BOM
   * verbatim, so a placeholder the rep never answered can hold this page.
   */
  dependencyPrompts?: DependencyPrompt[];
  onRecordDependency?: ((sku: string) => boolean) | null;
  pricing: TemplateProposalPricing;
  bomRows: Parameters<typeof TemplatePricingPanel>[0]["bomRows"];
  installation: InstallationSchedule | null;
  rateCard: InstallationRateCard;
  rateCardError: string;
  onCurrency: (currency: TemplateProposalPricing["currency"]) => void;
  onUnitPrice: (sku: string, value: string) => void;
  onInstallationRate: (lineId: string, value: string) => void;
  /** Fills every cleared line the rate card still rates, in one draft change. */
  onRestoreInstallationRates: (rates: InstallationUnitPrices) => void;
  /**
   * Whether the pricing table also offers its own restore. The page's shortfall
   * block is the one place a rep restores rates, so the page turns the table's
   * copy off rather than showing the same action twice under one name; a caller
   * that reads the table alone leaves it on.
   */
  tableRestore?: boolean;
  onSaveRateCard: () => void;
  onCreateProposal: () => void;
  onExportProposal: () => void;
  onExportSchedule: () => void;
  onSaveProject: () => void;
  onSaveTemplate: () => void;
};

export function TemplateProposalPanel(props: TemplateProposalPanelProps) {
  // Keying the walk by template is what makes the remembered stage the right
  // template's: switching templates in place starts that template's own
  // reading instead of inheriting the one before it.
  return <TemplateProposalWalk key={props.template.id} {...props} />;
}

function TemplateProposalWalk({
  template,
  validation,
  readinessScore,
  pricingSummary,
  surveyGaps,
  onRecordSurveyDetail,
  onScheduleDisplayRunSpans,
  dependencyPrompts,
  onRecordDependency,
  pricing,
  bomRows,
  installation,
  rateCard,
  rateCardError,
  onCurrency,
  onUnitPrice,
  onInstallationRate,
  onRestoreInstallationRates,
  tableRestore,
  onSaveRateCard,
  onCreateProposal,
  onExportProposal,
  onExportSchedule,
  onSaveProject,
  onSaveTemplate,
}: TemplateProposalPanelProps) {
  const flow = {
    blockers: validation.blockers.length,
    warnings: validation.warnings.length,
    unpricedLines: pricingSummary.unpricedLines.length,
    validationItems: template.validationItems.length,
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const stages = templatePreIssueStages(flow);
  // Reopen where the rep left this template: the walk is long, and a return
  // that always starts at the top reads as if the earlier visit did not count.
  // An address that names a stage outranks the browser's memory, because that
  // is the reading a colleague was sent.
  const [stage, setStage] = useState(() =>
    templatePreIssueResumeStage(
      flow,
      templatePreIssueStageFromSearch(searchParams, stages) ?? readTemplatePreIssueStage(template.id),
    ),
  );
  const stageIndex = stages.findIndex((item) => item.key === stage);
  const previous = stages[stageIndex - 1];
  const next = stages[stageIndex + 1];
  /**
   * Moving the walk is what remembers it — opening it is not a choice — and what
   * writes it into the address, so the reading on screen is the one a colleague
   * opens from the link.
   */
  const chooseStage = (nextStage: TemplatePreIssueStageKey) => {
    setStage(nextStage);
    rememberTemplatePreIssueStage(template.id, nextStage);
    setSearchParams(templatePreIssueStageSearch(searchParams, nextStage), { replace: true });
  };

  // The rates belong to the template, not only to this visit: the store is what
  // a later visit — or a draft the rep cleared — prices the document from.
  useEffect(() => {
    saveTemplateProposalPricing(template.id, {
      currency: pricing.currency,
      bomUnitPrices: pricing.bomUnitPrices,
      installationUnitPrices: pricing.installationUnitPrices,
    });
  }, [template.id, pricing.currency, pricing.bomUnitPrices, pricing.installationUnitPrices]);

  // The fix is offered only where this page can write both halves of it, and
  // only for a run the blocker is actually about.
  const displayRunFix = onScheduleDisplayRunSpans && template.surveyedRunMetres
    ? { runMetres: template.surveyedRunMetres, onSchedule: onScheduleDisplayRunSpans }
    : null;
  const blocked = !validation.allowed;
  const blockedTitle = (action: string) =>
    blocked ? `Export blocked: ${validation.blockers.length} blocker(s) must be resolved first` : action;

  return (
    <div className="wm-proposal-handoff wm-preissue">
      <section className="wm-preissue-head">
        <span className="wm-status is-validate">{template.validationItems.length} unresolved</span>
        <h2>{validation.allowed ? "Proposal is ready with assumptions" : "Export blocked — resolve blockers first"}</h2>
        <p>
          {validation.allowed
            ? "Walk the checks below before the document leaves: what holds it, what it would print as TBC, and what it labels as an assumption."
            : "The proposal export validator has found issues that must be resolved before this template can be exported."}
        </p>
        <div className="wm-proposal-readiness"><strong>{readinessScore}%</strong><span>Proposal readiness</span></div>
      </section>

      <div className="wm-preissue-command">
        <p data-testid="template-preissue-status">{templatePreIssueSummary(flow)}</p>
        <div className="wm-preissue-actions">
          <button className="wm-button is-primary is-full" type="button" onClick={onCreateProposal} disabled={blocked} title={blockedTitle("Create proposal")}><FileText /> Create proposal</button>
          <button className="wm-button wm-button-secondary is-full" type="button" onClick={onExportProposal} disabled={blocked} title={blockedTitle("Export proposal")}><Download /> Export proposal</button>
          <button className="wm-button wm-button-secondary is-full" type="button" onClick={onExportSchedule}><Download /> Export equipment schedule</button>
          <button className="wm-button wm-button-secondary is-full" type="button" onClick={onSaveProject}><Save /> Save as project</button>
          <button className="wm-button wm-button-secondary is-full" type="button" onClick={onSaveTemplate}><LayoutTemplate /> Save as template</button>
        </div>
      </div>

      {/* The share action sits beside the rail it names: sending the reading on
          screen is one click, and does not require reading the address bar. */}
      <div className="wm-preissue-rail-row">
        <TemplatePreIssueRail stage={stage} stages={stages} onStage={chooseStage} />
        <TemplatePreIssueShare stage={stage} stages={stages} />
      </div>

      <div className="wm-preissue-walk">
        <section
          hidden={stage !== "blockers"}
          aria-label="Export blockers"
          data-testid="template-preissue-panel-blockers"
        >
          <h3>Blockers</h3>
          {validation.blockers.length ? (
            <>
              <p>Each one stops the document until it is cleared. The fix is the change that clears it.</p>
              <TemplateExportValidation
                part="blockers"
                validation={validation}
                surveyGaps={surveyGaps}
                onRecordSurveyDetail={onRecordSurveyDetail}
                displayRun={displayRunFix}
                dependencyPrompts={dependencyPrompts}
                onRecordDependency={onRecordDependency}
              />
            </>
          ) : (
            <p data-testid="template-preissue-blockers-clear">No blockers — nothing is holding the document.</p>
          )}
        </section>

        <section
          hidden={stage !== "pricing"}
          aria-label="Unpriced lines"
          data-testid="template-preissue-panel-pricing"
        >
          <h3>Unpriced lines</h3>
          {/* The hold below already says what an unpriced line does to the
              document, so the stage only adds the clear state. */}
          {pricingSummary.unpricedLines.length ? null : (
            <p data-testid="template-preissue-pricing-clear">Every printed line has a price.</p>
          )}
          <TemplateProposalUnpriced
            summary={pricingSummary}
            rateCard={rateCard}
            lineIds={installation?.lines.map((line) => line.id) ?? []}
            rates={pricing.installationUnitPrices}
            currency={pricing.currency}
            onRestoreRates={onRestoreInstallationRates}
          />
          <TemplatePricingPanel
            pricing={pricing}
            summary={pricingSummary}
            bomRows={bomRows}
            installation={installation}
            rateCard={rateCard}
            rateCardError={rateCardError}
            onCurrency={onCurrency}
            onUnitPrice={onUnitPrice}
            onInstallationRate={onInstallationRate}
            onRestoreInstallationRates={tableRestore === false ? undefined : onRestoreInstallationRates}
            onSaveRateCard={onSaveRateCard}
          />
        </section>

        <section
          hidden={stage !== "assumptions"}
          aria-label="Assumptions"
          data-testid="template-preissue-panel-assumptions"
        >
          <h3>Assumptions the document prints</h3>
          <p>These travel with the document, labelled as unverified. Nothing here holds the export.</p>
          <TemplateExportValidation part="warnings" validation={validation} surveyGaps={surveyGaps} onRecordSurveyDetail={onRecordSurveyDetail} />
          <h3>Unresolved assumptions</h3>
          {template.validationItems.length ? (
            <ul>{template.validationItems.map((item) => <li key={item}><span>Validate</span>{item}</li>)}</ul>
          ) : (
            <p data-testid="template-preissue-assumptions-clear">Nothing is left unverified.</p>
          )}
        </section>

        <section
          hidden={stage !== "issue"}
          aria-label="Issue"
          data-testid="template-preissue-panel-issue"
        >
          <h3>Issue</h3>
          {/* The command bar already says how many checks are left, so the
              final stage shows what the document would print right now. */}
          <p data-testid="template-preissue-issue-summary">{pricingSummary.text}</p>
          <p>The export actions sit above the walk, so the document can leave from any stage once the blockers are clear.</p>
        </section>

        <TemplatePreIssueNav
          back={previous?.label}
          next={next?.label}
          onBack={previous ? () => chooseStage(previous.key) : undefined}
          onNext={next ? () => chooseStage(next.key) : undefined}
        />
      </div>
    </div>
  );
}
