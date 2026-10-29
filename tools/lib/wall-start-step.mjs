/**
 * What the guided wall wizard's start step owes a rep, read from boxes.
 *
 * The step leads with the LED brief — canvas pixels, pitch and cabinet array —
 * because those three facts are the customer's, while a preset carries all three
 * already answered. The rules below are the promises that ordering makes, and
 * none of them needs a browser: they are arithmetic on boxes and one string
 * comparison, so they are written here and the walk keeps only the
 * `page.evaluate` that produces the boxes.
 *
 * Three questions, because they fail differently:
 *
 * - `wallStartStepFailure` — does the step lay its content out at the width the
 *   card has? A card that is wider than the box that clips it, or a block that
 *   leaves its own content box, is a column of controls a rep cannot reach, and
 *   the phone width is where it shows first.
 * - `wallStartBriefLeadsFailure` — is the brief actually first? Ordering is the
 *   whole redesign, and it is measurable: the brief's box ends above the common
 *   walls heading's box, the way past the walls sits above the first wall rather
 *   than under the list, and the walls are there at all (a step that rendered no
 *   rows would satisfy an ordering rule vacuously).
 * - `wallStartReadoutFailure` — does the brief state the wall it describes? The
 *   read-out is the canvas, the millimetres and the array in one sentence, so a
 *   clipped read-out hides the numbers a rep checks before starting, and a
 *   read-out that disagrees with the canvas fields is worse than a missing one.
 *
 * The sentences name the surface and the width, because the same step is read at
 * three widths and "the card is too wide" would not say which reading came apart.
 */
import { stepCardTreeReport } from "./proposal-step-cards.mjs";

/**
 * The widths the start step is read at: the desktop the wizard is built on, the
 * phone it is used on, and the narrowest phone the app supports.
 *
 * The table lives here rather than in the walk for the same reason the hero's
 * does: a reading and the widths it was taken at are one promise, and a width
 * added in the walk alone would be a reading nobody prints in the summary.
 */
export const WALL_START_VIEWPORTS = [
  { width: 1366, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

/**
 * The first block that leaves the card, the card's own sideways scroll, or the
 * card being wider than the box that clips it — in that order, because the
 * leaking child is the thing to change and the card is only as wide as its
 * widest one. Returns `null` when the step holds.
 */
export function wallStartStepFailure(measured, { at } = {}) {
  const step = "guided wall wizard's start step";
  if (!measured) return `The walk could not find the ${step} at ${at}.`;
  const escaped = measured.escaped ?? [];
  if (escaped.length) {
    const [worst, ...also] = escaped;
    return `The ${step} left content outside its card at ${at}: ${worst.node} is ${worst.width}px wide, `
      + `${worst.past}px past the card's content box `
      + `(${escaped.length} box${escaped.length === 1 ? "" : "es"} out`
      + `${also.length ? `, also ${also.slice(0, 3).map((entry) => entry.name).join(", ")}` : ""}). `
      + "Every block on the step lays out at the width the card has.";
  }
  if (measured.card.scroll > measured.card.width + 1) {
    return `The ${step} scrolls sideways at ${at} (${measured.card.scroll} > ${measured.card.width}).`;
  }
  if (measured.clipped) {
    return `The ${step} is wider than the box that clips it at ${at}.\n${stepCardTreeReport(measured.tree)}`;
  }
  return null;
}

/**
 * Is the LED brief first, and is the way past the walls above the walls?
 *
 * `commonWalls` and `questions` are the two controls the step adds under the
 * brief; both are read against the first common-wall row, which is the thing a
 * rep on a phone would otherwise have to scroll past to reach the questions. A
 * step with no rows is a failure rather than a pass: with nothing below it, every
 * ordering comparison above is true for the wrong reason.
 */
export function wallStartBriefLeadsFailure(measured, { at } = {}) {
  const step = "guided wall wizard's start step";
  if (!measured) return `The walk could not find the ${step} at ${at}.`;
  const { brief, commonWalls, questions, firstWall, rows } = measured;
  if (!brief || brief.height < 1) {
    return `The ${step} does not show the LED brief at ${at}: an LED design begins with its own canvas, pitch and cabinet array.`;
  }
  if (!rows) {
    return `The ${step} held 0 common-wall rows at ${at}; the brief has to sit above the walls for "leads" to mean anything.`;
  }
  if (!commonWalls) {
    return `The ${step} has no heading over its common walls at ${at}, so where the brief ends against them cannot be read.`;
  }
  if (brief.bottom > commonWalls.top + 1) {
    return `The ${step} puts the LED brief below the common walls at ${at} (the brief ends at ${brief.bottom}px, `
      + `the walls' heading starts at ${commonWalls.top}px): canvas, pitch and array come before anyone else's wall.`;
  }
  if (!questions) {
    return `The ${step} has no way past the common walls at ${at}: a rep who already knows the brief reaches the questions without reading a catalogue.`;
  }
  if (questions.top > firstWall.top + 1) {
    return `The ${step} puts the way past the walls under the list at ${at} (the control is at ${questions.top}px, `
      + `the first wall at ${firstWall.top}px): a rep on a phone should reach the questions without scrolling a catalogue first.`;
  }
  return null;
}

/**
 * Does the brief's read-out state the wall the fields describe, and is it whole?
 *
 * The sentence is the payload — canvas, millimetres, array — so a read-out that
 * scrolls inside its box hides the numbers, and one that names a different canvas
 * than the two fields hold is a wall nobody asked for. The comparison is against
 * the fields as the page renders them, not against the defaults this module could
 * have assumed.
 */
export function wallStartReadoutFailure(measured, { at } = {}) {
  const step = "guided wall wizard's start step";
  if (!measured) return `The walk could not find the ${step} at ${at}.`;
  const { readout, canvas } = measured;
  if (!readout || readout.width < 1) {
    return `The ${step} shows no brief read-out at ${at}: the canvas, the millimetres and the array are the sentence a rep starts from.`;
  }
  if (readout.scroll > readout.width + 1) {
    return `The ${step} clips its brief read-out at ${at} (${readout.scroll} > ${readout.width}): the canvas, the millimetres and the array are its payload.`;
  }
  if (!canvas || !canvas.width || !canvas.height) {
    return `The ${step} has no canvas fields at ${at}, so the read-out describes a wall nothing on the step holds.`;
  }
  const expected = `${canvas.width} × ${canvas.height} canvas`;
  if (!readout.text.includes(expected)) {
    return `The ${step} reads out "${readout.text}" at ${at} while its canvas fields hold ${canvas.width} × ${canvas.height}: `
      + "the read-out is the wall, so it has to be the wall the fields describe.";
  }
  if (!/cabinets?\b/i.test(readout.text)) {
    return `The ${step} reads out "${readout.text}" at ${at} without a cabinet count: the array is one of the three answers the brief asks for.`;
  }
  return null;
}
