import type { RefObject } from "react";
import { ArrowRight, Check, ClipboardCheck, FileText, Save } from "lucide-react";

type DiscoveryCompletionPanelProps = {
  panelRef: RefObject<HTMLElement>;
  answerCount: number;
  requiresVideoWallConfiguration: boolean;
  videoWallConfigured: boolean;
  savedMessage: string;
  onMoveForward: (target: "recommendations" | "proposal") => void;
  onReviewAnswers: () => void;
  onSave: () => void;
};

export function DiscoveryCompletionPanel({
  panelRef,
  answerCount,
  requiresVideoWallConfiguration,
  videoWallConfigured,
  savedMessage,
  onMoveForward,
  onReviewAnswers,
  onSave,
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
