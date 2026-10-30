import type { StoredProductSelection, StoredProject } from "../features/projects";
import {
  displayRunSpanPlan,
  HDBT_DISPLAY_RECEIVERS,
  HDBT_MID_SPAN_REPEATER,
  hdbtSpannedRunReason,
  type DisplayRunSpanPlan,
} from "./hdbtDisplayReceiver";
import { displayRunRecord } from "./displayRunRecord";
import type { TemplateBomRow } from "./roomTemplates";
import { DISPLAY_RECEIVER_NOTE_LABEL } from "./templateReviewDesignNotes";

/** The seam the extender set sits on, so the row says where it goes. */
function seamText(plan: DisplayRunSpanPlan): string {
  const seams = Array.from({ length: plan.repeaters }, (_, index) => `${plan.spanMetres * (index + 1)} m`);
  return seams.length === 1 ? seams[0] : seams.join(" and ");
}

/**
 * The schedule line that carries a long display run: one HDBaseT extender set
 * per interior seam, in the distribution section beside the receiver it feeds.
 *
 * The row says what the part does where it lands — receive the span, re-send the
 * next — because a "repeater" on a schedule is otherwise a part a reader has to
 * look up before they know why it is there.
 */
export function displayRunRepeaterRow(
  plan: DisplayRunSpanPlan,
  id: string = crypto.randomUUID(),
): TemplateBomRow {
  return {
    id,
    sku: HDBT_MID_SPAN_REPEATER.sku,
    description: HDBT_MID_SPAN_REPEATER.description,
    role: HDBT_MID_SPAN_REPEATER.role,
    qty: plan.repeaters,
    type: "Required",
    status: "included",
    owner: "wyrestorm",
    scopeSection: "distribution",
    unit: "each",
    evidence: `Catalogue part scheduled mid-span so each of the ${plan.spans} spans stays inside the display receiver's ${HDBT_MID_SPAN_REPEATER.limitMetres} m rating. Confirm the mid-span position and power at survey.`,
    notes: `Receives the first span and re-transmits the next over the same category cable, HDMI between the two halves. Position at ${seamText(plan)} on the ${plan.runMetres} m run.`,
  };
}

/** Whether the schedule already carries the mid-span set, quoted rather than excluded. */
export function schedulesDisplayRunRepeater(rows: readonly TemplateBomRow[]): boolean {
  return rows.some(
    (row) => row.sku === HDBT_MID_SPAN_REPEATER.sku && row.status !== "excluded" && row.qty > 0,
  );
}

/**
 * What the fix offers, in one sentence every surface that offers it prints.
 *
 * The action names the spans the click will create and the run it will record,
 * so a rep is not taking it on trust, and a room record and a template cannot
 * describe the same click differently.
 */
export function displayRunSpanFixText(plan: DisplayRunSpanPlan): string {
  const sets = plan.repeaters === 1 ? "one extender set" : `${plan.repeaters} extender sets`;
  return `Carrying the link in ${plan.spans} spans of ${plan.spanMetres} m brings the receiver inside its rating. This schedules ${sets} of ${HDBT_MID_SPAN_REPEATER.sku} mid-span and records ${plan.spanMetres} m as the run each receiver serves.`;
}

/** The action's own name, shared by the surfaces that offer it. */
export const DISPLAY_RUN_SPAN_FIX_ACTION = "Schedule the mid-span repeater";

/**
 * The one write that clears a display-run blocker: schedule the mid-span
 * repeater and record the span each receiver then serves.
 *
 * Both halves are the same decision, which is why one click makes them. The
 * measurement is untouched — the survey found 130 m and the record still says
 * so — while `servedRunMetres` records the 65 m span the quoted receiver carries,
 * which is the figure its rating is measured against.
 *
 * Null when the run already fits one receiver, so a short room is never offered
 * a repeater it does not need. Running it twice is safe: an existing set is left
 * as the rep has it, and the span is recorded either way.
 */
export function displayRunSpanFix({
  rows,
  runMetres,
}: {
  rows: readonly TemplateBomRow[];
  /** The measured run, as the survey found it. */
  runMetres: number | null | undefined;
}): { rows: TemplateBomRow[]; servedRunMetres: number; plan: DisplayRunSpanPlan } | null {
  const plan = displayRunSpanPlan(runMetres);
  if (!plan) return null;
  return {
    rows: schedulesDisplayRunRepeater(rows) ? [...rows] : [...rows, displayRunRepeaterRow(plan)],
    servedRunMetres: plan.spanMetres,
    plan,
  };
}

/**
 * The same schedule line, in the form a saved project keeps: the set joins the
 * room's schedule, so the response rebuilt from this project quotes it beside
 * the receiver it feeds.
 *
 * The text is the template row's, not a second copy of it, because the part is
 * the same part however the room was authored.
 */
export function displayRunRepeaterSelection(
  plan: DisplayRunSpanPlan,
  addedAt: string = new Date().toISOString(),
): StoredProductSelection {
  const row = displayRunRepeaterRow(plan, `${HDBT_MID_SPAN_REPEATER.sku}-mid-span`);
  return {
    sku: row.sku,
    quantity: row.qty,
    title: row.description,
    category: row.role,
    status: "recommended",
    source: "Display cable run",
    evidence: [row.evidence],
    cautions: [row.notes],
    addedAt,
  };
}

export type DisplayRunProjectFix = {
  /** The project as it should be stored: the set on its schedule, the span recorded, the reason restated. */
  project: StoredProject;
  plan: DisplayRunSpanPlan;
  /** The span each receiver now serves, in metres. */
  servedRunMetres: number;
};

/**
 * The same fix for a saved room.
 *
 * A saved room carries the measurement on its room model and the receiver on
 * its own schedule, so a run measured past that receiver's rating holds the
 * room's response. Reading the record — or exporting from it — is where a rep
 * notices, which is why both surfaces apply the change rather than sending them
 * back to the template: scheduling the set and recording the span are the two
 * halves of one decision, and both land on this project.
 *
 * The measurement stays exactly as the survey found it — 130 m is still 130 m —
 * while `servedRun` records the span the quoted receiver carries, and the
 * receiver's reason is restated over the part this project quotes rather than
 * the part the rule would have chosen. Nothing is offered for a room whose span
 * already fits, or one that quotes no receiver for the gate to measure.
 */
export function displayRunProjectFix(
  project: StoredProject,
  now: string = new Date().toISOString(),
): DisplayRunProjectFix | null {
  const record = displayRunRecord(project);
  if (!record || !record.receiverSku) return null;
  const receiver = HDBT_DISPLAY_RECEIVERS.find((candidate) => candidate.sku === record.receiverSku);
  // The measurement decides the split; the figure the receiver serves decides
  // whether anything is left to fix, so a room already carried in spans is not
  // handed the set a second time.
  const plan = displayRunSpanPlan(record.metres);
  if (!receiver || !plan || !displayRunSpanPlan(record.servedMetres)) return null;
  // Only offered where the click clears the block. A span still past the
  // quoted part's own rating would be a set scheduled and a reason asserting a
  // fit the room does not have — a rep who held the 35 m receiver on a long run
  // has to change the receiver, not add a repeater to it.
  if (plan.spanMetres > receiver.limitMetres) return null;

  const selection = displayRunRepeaterSelection(plan, now);
  // The set joins the list the room's schedule lives in, not a third one: a
  // project authored in the proposal builder keeps its products on the saved
  // response, and writing the set to an empty selection list would then make
  // that list the schedule and drop every other line from it.
  const selections = project.productSelections ?? [];
  const products = project.proposal?.products ?? [];
  const quoted = (list: readonly StoredProductSelection[]) =>
    list.some((item) => item.sku === selection.sku && (item.quantity ?? 1) > 0);
  const prefix = `${DISPLAY_RECEIVER_NOTE_LABEL}: `;
  const reason = `${prefix}${hdbtSpannedRunReason({
    runMetres: plan.runMetres,
    spanMetres: plan.spanMetres,
    sku: receiver.sku,
    limitMetres: receiver.limitMetres,
  })}`;
  const notes = project.proposal?.validationNotes ?? [];

  return {
    plan,
    servedRunMetres: plan.spanMetres,
    project: {
      ...project,
      updated: "Just now",
      updatedAt: now,
      productSelections:
        selections.length && !quoted(selections) ? [...selections, selection] : project.productSelections,
      discoveryBrief: {
        ...(project.discoveryBrief ?? {}),
        roomModel: { ...(project.discoveryBrief?.roomModel ?? {}), servedRun: `${plan.spanMetres} m` },
      },
      proposal: project.proposal
        ? {
            ...project.proposal,
            products: quoted(products) ? products : [...products, selection],
            // The reason a rep reads is the reason the record now holds: a
            // note still calling for a repeater the schedule carries would be
            // the record contradicting its own fixed run.
            validationNotes: notes.some((line) => line.startsWith(prefix))
              ? notes.map((line) => (line.startsWith(prefix) ? reason : line))
              : [...notes, reason],
          }
        : project.proposal,
    },
  };
}
