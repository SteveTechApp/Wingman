import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, FileText, LayoutTemplate, Save } from "lucide-react";
import type { InstallationSchedule } from "../lib/installationSchedule";
import type { ExportValidationResult } from "../lib/proposalExportValidation";
import type { DependencyPrompt } from "../lib/dependencyScope";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { templatePreIssueResumeStage, templatePreIssueStages, templatePreIssueSummary, type TemplatePreIssueStageKey } from "../lib/templatePreIssue";
import { readTemplatePreIssueStage, rememberTemplatePreIssueStage, templatePreIssueStageFromSearch, templatePreIssueStageSearch } from "../lib/templatePreIssuePass";
import type { WallSurveyGap } from "../lib/wallSurvey";
import type { WallLinkDetail } from "../lib/videowallTransport";
import { TemplateExportValidation } from "./TemplateExportValidation";
import { TemplatePreIssueNav, TemplatePreIssueRail, TemplatePreIssueShare } from "./TemplatePreIssueRail";
import { TemplateEquipmentSchedule } from "./TemplateEquipmentSchedule";

export type TemplateProposalPanelProps = {
  template: RoomTemplate;
  validation: ExportValidationResult;
  readinessScore: number;
  surveyGaps: WallSurveyGap[];
  onRecordSurveyDetail: ((linkDetails: Record<string, WallLinkDetail>) => boolean) | null;
  onScheduleDisplayRunSpans: (() => boolean) | null;
  dependencyPrompts?: DependencyPrompt[];
  onRecordDependency?: ((sku: string) => boolean) | null;
  bomRows: Array<Pick<TemplateBomRow, "sku" | "description" | "role" | "qty" | "status">>;
  installation: InstallationSchedule | null;
  onCreateProposal: () => void;
  onExportProposal: () => void;
  onExportSchedule: () => void;
  onSaveProject: () => void;
  onSaveTemplate: () => void;
};

export function TemplateProposalPanel(props: TemplateProposalPanelProps) {
  return <TemplateProposalWalk key={props.template.id} {...props} />;
}

function TemplateProposalWalk({
  template, validation, readinessScore, surveyGaps, onRecordSurveyDetail,
  onScheduleDisplayRunSpans, dependencyPrompts, onRecordDependency, bomRows,
  installation, onCreateProposal, onExportProposal, onExportSchedule,
  onSaveProject, onSaveTemplate,
}: TemplateProposalPanelProps) {
  const flow = { blockers: validation.blockers.length, warnings: validation.warnings.length, validationItems: template.validationItems.length };
  const [searchParams, setSearchParams] = useSearchParams();
  const stages = templatePreIssueStages(flow);
  const [stage, setStage] = useState(() => templatePreIssueResumeStage(flow,
    templatePreIssueStageFromSearch(searchParams, stages) ?? readTemplatePreIssueStage(template.id)));
  const stageIndex = stages.findIndex((item) => item.key === stage);
  const previous = stages[stageIndex - 1];
  const next = stages[stageIndex + 1];
  const chooseStage = (nextStage: TemplatePreIssueStageKey) => {
    setStage(nextStage);
    rememberTemplatePreIssueStage(template.id, nextStage);
    setSearchParams(templatePreIssueStageSearch(searchParams, nextStage), { replace: true });
  };
  const displayRunFix = onScheduleDisplayRunSpans && template.surveyedRunMetres
    ? { runMetres: template.surveyedRunMetres, onSchedule: onScheduleDisplayRunSpans }
    : null;
  const blocked = !validation.allowed;
  const blockedTitle = (action: string) => blocked ? `Export blocked: ${validation.blockers.length} technical blocker(s) must be resolved first` : action;

  return <div className="wm-proposal-handoff wm-preissue">
    <section className="wm-preissue-head">
      <span className="wm-status is-validate">{template.validationItems.length} open checks</span>
      <h2>{validation.allowed ? "System proposal is ready for review" : "Resolve technical blockers first"}</h2>
      <p>{validation.allowed ? "Review technical checks, assumptions and the equipment and installation scope before exporting the system proposal." : "The proposal validator found technical or scope issues that must be resolved before export."}</p>
      <div className="wm-proposal-readiness"><strong>{readinessScore}%</strong><span>Design readiness</span></div>
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
    <div className="wm-preissue-rail-row"><TemplatePreIssueRail stage={stage} stages={stages} onStage={chooseStage} /><TemplatePreIssueShare stage={stage} stages={stages} /></div>
    <div className="wm-preissue-walk">
      <section hidden={stage !== "blockers"} aria-label="Technical checks" data-testid="template-preissue-panel-blockers">
        <h3>Technical checks</h3>
        {validation.blockers.length ? <><p>Resolve these issues before exporting the design.</p><TemplateExportValidation part="blockers" validation={validation} surveyGaps={surveyGaps} onRecordSurveyDetail={onRecordSurveyDetail} displayRun={displayRunFix} dependencyPrompts={dependencyPrompts} onRecordDependency={onRecordDependency} /></> : <p data-testid="template-preissue-blockers-clear">No technical blockers.</p>}
        {validation.warnings.length ? <TemplateExportValidation part="warnings" validation={validation} surveyGaps={surveyGaps} onRecordSurveyDetail={onRecordSurveyDetail} /> : null}
      </section>
      <section hidden={stage !== "assumptions"} aria-label="Assumptions" data-testid="template-preissue-panel-assumptions">
        <h3>Open assumptions</h3><p>These items remain visible in the proposal for site or stakeholder confirmation.</p>
        {template.validationItems.length ? <ul>{template.validationItems.map((item) => <li key={item}><span>Confirm</span>{item}</li>)}</ul> : <p data-testid="template-preissue-assumptions-clear">No open assumptions.</p>}
        <TemplateEquipmentSchedule rows={bomRows} installation={installation} />
      </section>
      <section hidden={stage !== "issue"} aria-label="Proposal" data-testid="template-preissue-panel-issue">
        <h3>System proposal</h3><p data-testid="template-preissue-issue-summary">{templatePreIssueSummary(flow)}</p>
        <p>The proposal includes the selected equipment, quantities, surveyed installation scope and remaining technical checks.</p>
      </section>
      <TemplatePreIssueNav back={previous?.label} next={next?.label} onBack={previous ? () => chooseStage(previous.key) : undefined} onNext={next ? () => chooseStage(next.key) : undefined} />
    </div>
  </div>;
}
