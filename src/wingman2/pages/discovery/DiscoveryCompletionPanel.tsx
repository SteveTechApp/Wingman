import type { RefObject } from "react";
import { ArrowRight, Check, ClipboardCheck, FileText, Save, FileDown, Sparkles } from "lucide-react";
import type { StrandedQuickStartDefault } from "./discoveryAnswerUtils";
import { DiscoveryStrandedDefaultsNotice, type DiscoveryApplicationDrift } from "./DiscoveryStrandedDefaultsNotice";

type DiscoveryCompletionPanelProps = {
  panelRef: RefObject<HTMLElement>;
  answerCount: number;
  totalQuestions?: number;
  mode?: "basic" | "expert";
  requiresVideoWallConfiguration: boolean;
  videoWallConfigured: boolean;
  savedMessage: string;
  onMoveForward: (target: "recommendations" | "proposal") => void;
  onReviewAnswers: () => void;
  onUnlockExpert?: () => void;
  onSave: () => void;
  onExportBrief?: () => void;
  /** Quick-start defaults stranded by a later answer — surfaced at completion so the conflict is visible outside the step that caused it. */
  strandedQuickStart?: ReadonlyArray<StrandedQuickStartDefault>;
  /** Post-seed application switch: answers still following the previous profile. */
  applicationDrift?: DiscoveryApplicationDrift | null;
  /** Jump the interview to the step owning a stranded default. */
  onOpenStrandedStep?: (questionId: string) => void;
  /** Clear every stranded default from the answers at once. */
  onRemoveStranded?: () => void;
};

export function DiscoveryCompletionPanel({
  panelRef,
  answerCount,
  totalQuestions,
  mode,
  requiresVideoWallConfiguration,
  videoWallConfigured,
  savedMessage,
  onMoveForward,
  onReviewAnswers,
  onUnlockExpert,
  onSave,
  onExportBrief,
  strandedQuickStart = [],
  applicationDrift = null,
  onOpenStrandedStep,
  onRemoveStranded,
}: DiscoveryCompletionPanelProps) {
  return (
    <section
      ref={panelRef}
      className="wm-discovery-finish-card wm-ui-section wm-ui-card wm-ui-title"
      tabIndex={-1}
      aria-labelledby="discovery-complete-title"
    >
      <div className="wm-discovery-finish-intro">
        <div className="wm-discovery-finish-mark" aria-hidden="true">
          <Check size={28} strokeWidth={3} />
        </div>
        <div>
          <span className="wm-discovery-finish-kicker">Discovery complete</span>
          <h2 className="wm-ui-title" id="discovery-complete-title">
            {videoWallConfigured
              ? "Your room and video wall briefs are ready."
              : "Your room brief is ready to move forward."}
          </h2>
          <p className="wm-ui-copy">
            {videoWallConfigured
              ? `All ${answerCount} discovery answers and the video wall configuration are captured. Wingman can now match products against the complete design.`
              : `All ${answerCount} answers are captured. The core architecture, supporting services and installation details will stay visible as Wingman builds the solution.`}
          </p>
        </div>
      </div>

      <DiscoveryStrandedDefaultsNotice items={strandedQuickStart} applicationDrift={applicationDrift} onOpenStep={onOpenStrandedStep} onRemoveStranded={onRemoveStranded} />

      <div className="wm-discovery-finish-workspace">
        <article className="wm-discovery-finish-next">
          <span>{videoWallConfigured ? "Video wall ready" : "Recommended next step"}</span>
          <h3>{requiresVideoWallConfiguration ? "Configure the video wall" : "Find matching products"}</h3>
          <p className="wm-ui-copy">
            {requiresVideoWallConfiguration
              ? "Confirm the wall layout and processing requirements before product matching."
              : videoWallConfigured
                ? "Use the captured wall type, source-window behaviour and signal-path decisions to build the product shortlist."
                : "Turn the captured requirements into an evidence-led product shortlist."}
          </p>
          <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={() => onMoveForward("recommendations")}>
            {requiresVideoWallConfiguration ? "Next: configure video wall" : "Next: find matching products"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </article>

        <div className="wm-discovery-finish-actions" aria-label="Other discovery actions">
          <button type="button" onClick={() => onMoveForward("proposal")}>
            <FileText size={20} aria-hidden="true" />
            <span><strong>Build proposal</strong><small>Start the customer response</small></span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={onReviewAnswers}>
            <ClipboardCheck size={20} aria-hidden="true" />
            <span><strong>Review answers</strong><small>Check or amend the brief</small></span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={onSave}>
            <Save size={20} aria-hidden="true" />
            <span><strong>Save to project</strong><small>Keep this discovery on file</small></span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {mode === "basic" && totalQuestions && totalQuestions > answerCount && onUnlockExpert && (
            <button type="button" className="wm-discovery-unlock-expert" onClick={onUnlockExpert} data-testid="unlock-expert-cta">
              <Sparkles size={20} aria-hidden="true" />
              <span><strong>Unlock more detail</strong><small>{totalQuestions - answerCount} additional questions available</small></span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
          {onExportBrief && (
            <button type="button" onClick={onExportBrief} data-testid="discovery-brief-export">
              <FileDown size={20} aria-hidden="true" />
              <span><strong>Export discovery brief</strong><small>Print-friendly hand-off before sign-off</small></span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <footer className="wm-discovery-finish-footer">
        <span><Check size={14} aria-hidden="true" /> {answerCount} of {answerCount} requirements captured</span>
        {videoWallConfigured && <span><Check size={14} aria-hidden="true" /> Video wall configuration captured</span>}
        {savedMessage && <span className="wm-discovery-finish-saved"><Check size={14} aria-hidden="true" /> {savedMessage}</span>}
      </footer>
    </section>
  );
}
