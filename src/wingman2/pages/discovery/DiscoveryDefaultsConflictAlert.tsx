// Inline alert for the discovery step: surfaces when a stored answer (typically
// a quick-start default) names an option the guided interview has filtered out
// because of a later answer. Without this, the stranded value stays silently in
// the answer set — the option is no longer selectable but the contradiction
// (e.g. one-display plus independent-routing-per-display) persists into the
// brief. Reuses the existing wm-decision-compatibility-alert styling; the
// severity here is always informational, never blocking.

import { getHiddenAnswerValues } from "./discoveryAnswerUtils";

export function DiscoveryDefaultsConflictAlert(props: {
  questionId: string;
  visibleOptionValues: ReadonlyArray<string>;
  answer: unknown;
}) {
  const hidden = getHiddenAnswerValues(props.questionId, props.visibleOptionValues, props.answer);

  if (hidden.length === 0) return null;

  return (
    <section className="wm-decision-compatibility-alert" role="alert" aria-live="polite">
      <div>
        <p className="wm-ui-kicker">Quick-start defaults</p>
        <h3>Pre-filled answer no longer fits your current answers</h3>
      </div>
      {hidden.map((entry) => (
        <article key={entry.value} className="is-warning">
          <strong>{entry.label}</strong>
          <p>
            This answer was pre-filled for your selected room, but a later answer
            changed the available options for this question, so it is no longer
            selectable. Choose one of the remaining options above, or revisit the
            earlier answer that hid it.
          </p>
        </article>
      ))}
    </section>
  );
}