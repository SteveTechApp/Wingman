// List-level companion to DiscoveryDefaultsConflictAlert: surfaces stranded
// quick-start defaults (stored answers whose option a later answer made no
// longer selectable) in surfaces OUTSIDE the step where the conflict was
// caused — the discovery summary card and the completion panel. Reuses the
// same wm-decision-compatibility-alert styling and informational severity;
// each row names the hidden default and the question it belongs to so the rep
// can open that step to re-choose.

import type { StrandedQuickStartDefault } from "./discoveryAnswerUtils";
import type { QuickStartApplicationDrift } from "./discoveryQuickStart";
import { plainLanguageLabels } from "./discoveryQuickStart";

/** Post-seed application switch: untouched quick-start answers that still
 *  carry the PREVIOUS application's profile now that opportunity changed. */
export type DiscoveryApplicationDrift = {
  previousApplication: string;
  application: string;
  items: ReadonlyArray<QuickStartApplicationDrift>;
};

export function DiscoveryStrandedDefaultsNotice(props: {
  items: ReadonlyArray<StrandedQuickStartDefault>;
  /** Answers still following the previous application profile after the
   *  opportunity answer changed — the post-seed mirror of the profile
   *  confirmation step. */
  applicationDrift?: DiscoveryApplicationDrift | null;
  /** Optional: jump the interview to the step that owns a conflict row. */
  onOpenStep?: (questionId: string) => void;
  /** Optional: clear every hidden default at once instead of re-opening steps. */
  onRemoveStranded?: () => void;
}) {
  const hasStranded = props.items.length > 0;
  const drift = props.applicationDrift;
  const hasDrift = drift ? drift.items.length > 0 : false;
  if (!hasStranded && !hasDrift) return null;

  // Only untouched quick-start pre-fills can be cleared by the bulk action
  // (the hook filters rep-typed answers out deliberately — silently discarding
  // the rep's own answer would destroy data). When every stranded row is
  // rep-typed the button is hidden so it never presents a dead action.
  const hasRemovableDefaults = props.items.some((item) => item.origin === "quick-start");
  const allRepTyped = hasStranded && props.items.every((item) => item.origin === "rep-typed");

  const previousLabel = drift ? (plainLanguageLabels[drift.previousApplication] ?? drift.previousApplication) : "";
  const applicationLabel = drift ? (plainLanguageLabels[drift.application] ?? drift.application) : "";

  return (
    <section className="wm-decision-compatibility-alert wm-discovery-stranded-defaults" role="alert" aria-live="polite">
      {hasStranded && (
        <>
          <div>
            <p className="wm-ui-kicker">Quick-start defaults</p>
            <h3>{allRepTyped ? "Answer" : "Pre-filled answer"}{props.items.length === 1 ? "" : "s"} no longer fit{props.items.length === 1 ? "s" : ""} your current answers</h3>
          </div>
          {props.items.map((item) => {
            const isQuickStart = item.origin === "quick-start";
            return (
              <article key={`${item.questionId}:${item.optionValue}`} className="is-warning">
                <strong>{item.optionLabel}</strong>
                <p>
                  {isQuickStart ? (
                    <>
                      The quick-start default for <em>{item.questionLabel}</em> is no longer
                      selectable after your later answers. Choose a current option on that
                      step, or revisit the earlier answer that hid it.
                    </>
                  ) : (
                    <>
                      Your <em>{item.questionLabel}</em> answer is no longer selectable after
                      your later answers. Choose a current option on that step, or revisit
                      the earlier answer that hid it.
                    </>
                  )}
                </p>
                {props.onOpenStep && (
                  <button
                    className="wm-ui-button wm-ui-button-secondary"
                    type="button"
                    onClick={() => props.onOpenStep?.(item.questionId)}
                  >
                    Open {item.questionLabel}
                  </button>
                )}
              </article>
            );
          })}
        </>
      )}

      {drift && drift.items.length > 0 && (
        <div className="wm-discovery-application-drift">
          <div>
            <p className="wm-ui-kicker">Quick-start profile</p>
            <h3>Answers still follow the {previousLabel} profile</h3>
            <p className="wm-ui-copy">
              The application changed to {applicationLabel}, but these pre-filled answers
              still carry the previous profile&apos;s defaults.
            </p>
          </div>
          {drift.items.map((item) => (
            <article key={item.questionId} className="is-warning">
              <strong>
                {item.questionLabel}: {item.roomText}
              </strong>
              <p>
                The {applicationLabel} profile uses {item.standardText}. Adjust this
                answer to match, or revisit the application answer.
              </p>
              {props.onOpenStep && (
                <button
                  className="wm-ui-button wm-ui-button-secondary"
                  type="button"
                  onClick={() => props.onOpenStep?.(item.questionId)}
                >
                  Open {item.questionLabel}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {hasRemovableDefaults && props.onRemoveStranded && (
        <button
          className="wm-ui-button wm-ui-button-secondary"
          type="button"
          onClick={() => props.onRemoveStranded?.()}
          data-testid="remove-stranded-answers"
        >
          Remove stranded answers
        </button>
      )}
    </section>
  );
}