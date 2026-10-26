import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import { projectScopeSection } from "./projectScope";
import { hdbtDisplayReceiverForTemplate, quotesHdbtDisplayReceiver } from "./hdbtDisplayReceiver";

/**
 * The label the proposal writes the receiver reason under. The project record
 * reads the note back by this label, so the two surfaces cannot name the same
 * sentence differently.
 */
export const DISPLAY_RECEIVER_NOTE_LABEL = "Display receiver";

/** Output schedules describe the current included rows, including edited quantities. */
export function templateReviewDesignNotes(template: RoomTemplate, rows: TemplateBomRow[]) {
  const active = rows.filter(row => row.status !== "excluded" && row.qty > 0);
  const schedule = (section: "inputs" | "displays") => active.filter(row => projectScopeSection(row) === section).map(row => `${row.qty} × ${row.description}`).join("; ") || "No included items; confirm whether this is intentional.";
  // A measured run is what chose the receiver, so the proposal states the run
  // and the rating it was measured against rather than only quoting the part.
  // Nothing is added until both facts exist: a run with no receiver line in the
  // schedule has nothing to explain.
  const receiver = hdbtDisplayReceiverForTemplate(template);
  return [
    ...template.designNotes.map(note => note.label === "Source schedule" ? { ...note, description: schedule("inputs") } : note.label === "Output schedule" ? { ...note, description: schedule("displays") } : note),
    ...(receiver && quotesHdbtDisplayReceiver(active) ? [{ label: DISPLAY_RECEIVER_NOTE_LABEL, description: receiver.reason }] : []),
  ];
}
