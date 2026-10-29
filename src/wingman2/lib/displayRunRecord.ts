import type { StoredProject } from "../features/projects";
import {
  HDBT_DISPLAY_RECEIVERS,
  servedDisplayRunMetres,
  surveyedDisplayRunMetres,
  surveyedDisplayRunText,
} from "./hdbtDisplayReceiver";
import { DISPLAY_RECEIVER_NOTE_LABEL } from "./templateReviewDesignNotes";

/** The project record's display run panel, and the panel id a link lands on. */
export const DISPLAY_RUN_ANCHOR = "project-display-run";

const RECEIVER_SKUS = new Set<string>(HDBT_DISPLAY_RECEIVERS.map((receiver) => receiver.sku));

/**
 * The label that opens a stored display-run reason, read when the record is
 * rather than when this module loads: the label and the receivers share one
 * chunk, and a chunk pair that imports each other can evaluate this module
 * first, which would leave the prefix reading `undefined: ` for the session and
 * quietly stop matching the notes it is meant to find.
 */
function reasonPrefix(): string {
  return `${DISPLAY_RECEIVER_NOTE_LABEL}: `;
}

export type DisplayRunRecord = {
  /** The run as the room model writes it (“28 m”), or "" when none is measured. */
  runText: string;
  /** The same run in metres, or null when the room model records no distance. */
  metres: number | null;
  /**
   * The run each receiver serves: the span a room carried in spans records, else
   * the whole measurement.
   */
  servedMetres: number | null;
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
 * The schedule can live in two places: the room's own selections, or the
 * products on its saved response — a project authored in the proposal builder
 * writes only the latter. Reading the same list the completion wizard builds
 * its BOM from is what keeps this panel and that gate talking about one
 * schedule: a receiver the wizard measures is a receiver this record names.
 *
 * Null when the record holds neither fact, so a project with no HDBaseT display
 * link renders no panel.
 */
export function displayRunRecord(project: StoredProject): DisplayRunRecord | null {
  // `cableRun` is the display run; `longestRun` and Discovery's `distance` are
  // the same measurement under the names older saves used, and the shared
  // reader is what makes this panel and the export gate name one figure.
  const roomModel = project.discoveryBrief?.roomModel ?? {};
  const runText = surveyedDisplayRunText(roomModel);
  const metres = surveyedDisplayRunMetres(roomModel);
  const servedMetres = servedDisplayRunMetres(roomModel);
  const scheduled = project.productSelections?.length
    ? project.productSelections
    : project.proposal?.products ?? [];
  const receiver = scheduled.find(
    (product) =>
      product.category === "Display receiver" &&
      RECEIVER_SKUS.has(product.sku) &&
      (product.quantity ?? 1) > 0,
  );
  if (metres === null && !receiver) return null;

  // The reason sentence explains a measured run, so it travels with one: a
  // record whose distance is missing must not print a sentence about the run it
  // was chosen on.
  const prefix = reasonPrefix();
  const note = metres === null ? undefined : (project.proposal?.validationNotes ?? []).find((line) => line.startsWith(prefix));
  return {
    runText,
    metres,
    servedMetres,
    receiverSku: receiver?.sku ?? null,
    reason: note ? note.slice(prefix.length).trim() || null : null,
  };
}
