import { useState } from "react";
import type { WallSurveyGap } from "../lib/wallSurvey";
import {
  cleanDetailText,
  type WallLinkDetail,
  type WallLinkDetailField,
} from "../lib/videowallTransport";

const FIX_LABEL: Record<WallLinkDetailField, string> = {
  enclosure: "Display housing",
  termination: "Termination",
  entry: "Run entry",
};

/**
 * The inline install cells for the links a wall survey left short.
 *
 * A short survey does not stop the document, so the rep sees the short links
 * and can record the missing cells where they are reading the warning instead of
 * going back to the wall builder. The proposal and the template review page both
 * read this component, so the two readings name the same links, offer the same
 * cells and clear the same warning.
 */
export function WallSurveyGapFixes({
  gaps,
  onRecordDetail,
}: {
  gaps: WallSurveyGap[];
  /**
   * Writes the cells typed here onto the saved wall. Returning false means the
   * wall could not take them, so the panel points back at the wall builder
   * instead of implying the warning cleared.
   */
  onRecordDetail: (linkDetails: Record<string, WallLinkDetail>) => boolean;
}) {
  const [fixes, setFixes] = useState<Record<string, WallLinkDetail>>({});
  const [fixMessage, setFixMessage] = useState("");
  const canRecord = gaps.some((gap) => gap.missing.some((field) => cleanDetailText(fixes[gap.id]?.[field])));

  function setFix(id: string, field: WallLinkDetailField, value: string) {
    setFixes((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    setFixMessage("");
  }

  // Only the cells this warning is about are sent, and only for the links it
  // names: the command merges them, so a housing already on the wall is not
  // replaced by an empty termination box the rep left alone.
  function recordDetail() {
    const linkDetails: Record<string, WallLinkDetail> = {};
    for (const gap of gaps) {
      const typed = fixes[gap.id];
      if (!typed) continue;
      const cells: WallLinkDetail = {};
      for (const field of gap.missing) {
        const text = cleanDetailText(typed[field]);
        if (text) cells[field] = text;
      }
      if (Object.keys(cells).length) linkDetails[gap.id] = cells;
    }
    if (!Object.keys(linkDetails).length) return;
    if (onRecordDetail(linkDetails)) {
      setFixes({});
      setFixMessage("Recorded on the wall design. This warning clears.");
    } else {
      setFixMessage("This wall could not be updated here; record it in the wall builder instead.");
    }
  }

  return (
    // `col-span-full` keeps the cells under the whole warning: the template
    // review list lays each warning out as columns, and the cells must not be
    // squeezed into the label column.
    <div className="mt-3 grid gap-2 col-span-full" data-wall-survey-fix="true">
      <p className="wm-proposal-validation-fix">
        Record the missing cells below or in the wall builder, and the proposal's installation detail
        table will quote them. The document still issues without them.
      </p>
      {gaps.map((gap) => (
        <div
          key={gap.id}
          className="flex flex-wrap items-center gap-2"
          data-wall-survey-fix-row={gap.id}
        >
          <span className="wm-proposal-validation-message">{gap.link}</span>
          {gap.missing.map((field) => (
            <input
              key={field}
              type="text"
              maxLength={60}
              className="wm-ui-input w-40"
              aria-label={`${FIX_LABEL[field]} for ${gap.link}`}
              placeholder={FIX_LABEL[field]}
              value={fixes[gap.id]?.[field] ?? ""}
              onChange={(event) => setFix(gap.id, field, event.target.value)}
            />
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="wm-ui-button wm-ui-button-secondary"
          disabled={!canRecord}
          onClick={recordDetail}
        >
          Record on the wall
        </button>
        {fixMessage ? (
          <p role="status" className="wm-proposal-validation-fix" data-testid="wall-survey-fix-status">
            {fixMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
