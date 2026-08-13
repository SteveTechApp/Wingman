import type { RefObject } from "react";

type DiscoveryCompletionPanelProps = {
  panelRef: RefObject<HTMLElement>;
  answerCount: number;
  requiresVideoWallConfiguration: boolean;
  savedMessage: string;
  onMoveForward: (target: "recommendations" | "proposal") => void;
  onReviewAnswers: () => void;
  onSave: () => void;
};

export function DiscoveryCompletionPanel({
  panelRef,
  answerCount,
  requiresVideoWallConfiguration,
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
      <span>Discovery complete</span>
      <h2 className="wm-ui-title" id="discovery-complete-title">
        All {answerCount} answers are captured. Choose the next move.
      </h2>
      <p className="wm-ui-copy">
        Your complete room brief is ready. Finder will use the core architecture requirements to recommend products,
        while keeping supporting audio, control and installation details visible for validation.
      </p>

      <div className="wm-discovery-capture-actions wm-discovery-finish-actions">
        <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={() => onMoveForward("recommendations")}>
          {requiresVideoWallConfiguration ? "Next: configure video wall" : "Next: find matching products"}
        </button>
        <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => onMoveForward("proposal")}>
          Build proposal
        </button>
        <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={onReviewAnswers}>
          Review answers
        </button>
        <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={onSave}>
          Save to project
        </button>
      </div>

      <p className="wm-discovery-finish-review wm-ui-copy">
        Need to amend something? Select Review answers, then use Previous and Continue to move through the captured brief.
      </p>
      {savedMessage && <p className="wm-discovery-muted-note wm-ui-copy">{savedMessage}</p>}
    </section>
  );
}
