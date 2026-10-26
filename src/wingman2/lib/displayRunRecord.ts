import type { StoredProject } from "../features/projects";
import { HDBT_DISPLAY_RECEIVERS, metresFromRunText } from "./hdbtDisplayReceiver";
import { DISPLAY_RECEIVER_NOTE_LABEL } from "./templateReviewDesignNotes";

/** The project record's display run panel, and the panel id a link lands on. */
export const DISPLAY_RUN_ANCHOR = "project-display-run";

const RECEIVER_SKUS = new Set<string>(HDBT_DISPLAY_RECEIVERS.map((receiver) => receiver.sku));
const REASON_PREFIX = `${DISPLAY_RECEIVER_NOTE_LABEL}: `;

export type DisplayRunRecord = {
  /** The run as the room model writes it (“28 m”), or "" when none is measured. */
  runText: string;
  /** The same run in metres, or null when the room model records no distance. */
  metres: number | null;
  /** The HDBaseT display receiver this project's own schedule quotes. */
  receiverSku: string | null;
  /** Why that receiver was chosen, as the proposal recorded it. */
  reason: string | null;
};

/**
 * The display run as this project records it: the distance a survey measured to
 * the display, and the HDBaseT receiver the project's own schedule quotes for
 * it, with the reason that receiver was chosen.
 *
 * Both facts are read rather than recomputed. The run comes from the room model
 * — a template save and Discovery write the same field — and the receiver from
 * the product the schedule actually quotes, so a rep who changed the part is
 * not told what the rule would have chosen instead. The reason is the note the
 * proposal already carries, found by its label rather than by matching prose.
 *
 * Null when the record holds neither fact, so a project with no HDBaseT display
 * link renders no panel.
 */
export function displayRunRecord(project: StoredProject): DisplayRunRecord | null {
  const roomModel = project.discoveryBrief?.roomModel ?? {};
  // `cableRun` is the display run; `longestRun` and Discovery's `distance` are
  // the same measurement under the names older saves used.
  const runText = [roomModel.cableRun, roomModel.longestRun, roomModel.distance]
    .map((value) => String(value ?? "").trim())
    .find((value) => metresFromRunText(value) !== undefined) ?? "";
  const metres = metresFromRunText(runText) ?? null;
  const receiver = (project.productSelections ?? []).find(
    (product) =>
      product.category === "Display receiver" &&
      RECEIVER_SKUS.has(product.sku) &&
      (product.quantity ?? 1) > 0,
  );
  if (metres === null && !receiver) return null;

  // The reason sentence explains a measured run, so it travels with one: a
  // record whose distance is missing must not print a sentence about the run it
  // was chosen on.
  const note = metres === null ? undefined : (project.proposal?.validationNotes ?? []).find((line) => line.startsWith(REASON_PREFIX));
  return {
    runText,
    metres,
    receiverSku: receiver?.sku ?? null,
    reason: note ? note.slice(REASON_PREFIX.length).trim() || null : null,
  };
}
