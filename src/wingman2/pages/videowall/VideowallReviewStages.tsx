import { wallReviewStages, type WallReviewStageKey } from "../../lib/videowallWizard";
import { PageBandRail } from "../../components/PageBands";

/**
 * The result is read in three passes instead of one long page. The guided
 * result and the expert builder render the same rail, so a rep moves between
 * the design, the drawing and the wiring the same way in either view.
 */
export function VideowallReviewStages({ stage, statuses, onStage }: {
  stage: WallReviewStageKey;
  statuses: Record<WallReviewStageKey, string>;
  onStage: (stage: WallReviewStageKey) => void;
}) {
  return (
    <PageBandRail
      label="Design review stages"
      bands={wallReviewStages.map((item) => ({ ...item, status: statuses[item.key] }))}
      active={stage}
      onSelect={onStage}
      testIdPrefix="videowall-review"
      className="vw-wizard-stages"
      numberClassName="vw-wizard-stage-number"
      copyClassName="vw-wizard-stage-copy"
    />
  );
}

/**
 * Moves between the result's review passes without leaving the result.
 *
 * Each pass also carries the share action: the address holds the wall and the
 * pass on screen, so a rep reading the wiring can send that reading rather than
 * asking the recipient to find it again. The label names the pass, because a
 * rail of three identical "Copy link" buttons says nothing to a screen reader.
 */
export function VideowallReviewNav({ onBack, backLabel, onNext, nextLabel, onCopy, copyLabel }: {
  onBack?: () => void;
  backLabel?: string;
  onNext?: () => void;
  nextLabel?: string;
  onCopy?: () => void;
  copyLabel?: string;
}) {
  return (
    <div className="vw-wizard-nav">
      {onBack ? (
        <button type="button" className="vw-wizard-secondary" onClick={onBack}>{backLabel}</button>
      ) : <span aria-hidden="true" />}
      {onCopy ? (
        <button
          type="button"
          className="vw-wizard-secondary"
          title="Copies the address of this pass; the wall and the chosen design travel with it"
          onClick={onCopy}
        >
          {copyLabel ?? "Copy link to this pass"}
        </button>
      ) : null}
      {onNext ? (
        <button type="button" className="vw-wizard-primary" onClick={onNext}>{nextLabel}</button>
      ) : null}
    </div>
  );
}
