import { useState } from "react";
import { displayRunSpanPlan } from "../lib/hdbtDisplayReceiver";
import { DISPLAY_RUN_SPAN_FIX_ACTION, displayRunSpanFixText } from "../lib/displayRunFix";

/**
 * The one-tap fix for a display run measured past the range's longest receiver.
 *
 * The blocker says the change that clears it; this applies it — schedule the
 * mid-span extender set and record the span each receiver then serves — because
 * the rep reading the block is the one holding the survey. The wording names the
 * spans the click will create, so the button is not a leap of faith: a 130 m run
 * offers one set and two 65 m spans, and the recorded span is the figure the
 * receiver's rating is then measured against.
 *
 * The caller's write is a page change (the rows and the brief), so a refusal is
 * reported rather than swallowed: no schedule update means the block stays.
 */
export function DisplayRunSpanFix({
  runMetres,
  onSchedule,
}: {
  /** The measured run the blocker names, as the survey recorded it. */
  runMetres: number | null | undefined;
  /** Schedules the set and records the span; false when the room could not take it. */
  onSchedule: () => boolean;
}) {
  const [message, setMessage] = useState("");
  const plan = displayRunSpanPlan(runMetres);
  if (!plan) return null;

  function apply() {
    setMessage(
      onSchedule()
        ? ""
        : "This room could not be updated here; schedule the mid-span repeater in the equipment schedule instead.",
    );
  }

  return (
    // `col-span-full` keeps the action under the whole blocker: the template
    // review list lays each one out as columns, and a button must not be squeezed
    // into the label column.
    <div className="mt-3 grid gap-2 col-span-full" data-display-run-fix="true">
      <p className="wm-proposal-validation-fix">{displayRunSpanFixText(plan)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={apply}>
          {DISPLAY_RUN_SPAN_FIX_ACTION}
        </button>
        {message ? (
          <p role="status" className="wm-proposal-validation-fix" data-testid="display-run-fix-status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
