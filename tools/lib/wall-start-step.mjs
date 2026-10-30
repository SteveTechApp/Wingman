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
 * One reader answers the whole step (`readWallStartStep`), for the reason the
 * response builder's step card does: the ordering, the layout and the read-out
 * are one verdict about one measurement, and a caller that could ask one and
 * forget another would report a fit for a step whose brief it never confirmed.
 * The line a report prints comes back from the same call, so the numbers a
 * report prints and the verdict beside them can only describe one set of boxes.
 *
 * Three questions make up that verdict, in the order they are asked, because
 * they fail differently:
 *
 * - containment — does the step lay its content out at the width the card has?
 *   A card that is wider than the box that clips it, or a block that leaves its
 *   own content box, is a column of controls a rep cannot reach, and the phone
 *   width is where it shows first. It is asked before the two readings of what
 *   the step says, because a block hanging outside the card is the one thing
 *   that makes a position on the page mean nothing: the brief's box and the
 *   walls' heading are only comparable once both are inside the step.
 * - the brief leading — is the brief actually first? Ordering is the whole
 *   redesign, and it is measurable: the brief's box ends above the common
 *   walls heading's box, the way past the walls sits above the first wall rather
 *   than under the list, and the walls are there at all (a step that rendered no
 *   rows would satisfy an ordering rule vacuously).
 * - the read-out — does the brief state the wall it describes? The read-out is
 *   the canvas, the millimetres and the array in one sentence, so a clipped
 *   read-out hides the numbers a rep checks before starting, and a read-out that
 *   disagrees with the canvas fields is worse than a missing one.
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

const STEP = "guided wall wizard's start step";

/**
 * The first block that leaves the card, the card's own sideways scroll, or the
 * card being wider than the box that clips it — in that order, because the
 * leaking child is the thing to change and the card is only as wide as its
 * widest one. Returns `null` when the step holds.
 */
function containmentFailure(measured, { at }) {
  const escaped = measured.escaped ?? [];
  if (escaped.length) {
    const [worst, ...also] = escaped;
    return `The ${STEP} left content outside its card at ${at}: ${worst.node} is ${worst.width}px wide, `
      + `${worst.past}px past the card's content box `
      + `(${escaped.length} box${escaped.length === 1 ? "" : "es"} out`
      + `${also.length ? `, also ${also.slice(0, 3).map((entry) => entry.name).join(", ")}` : ""}). `
      + "Every block on the step lays out at the width the card has.";
  }
  if (measured.card.scroll > measured.card.width + 1) {
    return `The ${STEP} scrolls sideways at ${at} (${measured.card.scroll} > ${measured.card.width}).`;
  }
  if (measured.clipped) {
    return `The ${STEP} is wider than the box that clips it at ${at}.\n${stepCardTreeReport(measured.tree)}`;
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
function briefLeadsFailure(measured, { at }) {
  const { brief, commonWalls, questions, firstWall, rows } = measured;
  if (!brief || brief.height < 1) {
    return `The ${STEP} does not show the LED brief at ${at}: an LED design begins with its own canvas, pitch and cabinet array.`;
  }
  if (!rows) {
    return `The ${STEP} held 0 common-wall rows at ${at}; the brief has to sit above the walls for "leads" to mean anything.`;
  }
  if (!commonWalls) {
    return `The ${STEP} has no heading over its common walls at ${at}, so where the brief ends against them cannot be read.`;
  }
  if (brief.bottom > commonWalls.top + 1) {
    return `The ${STEP} puts the LED brief below the common walls at ${at} (the brief ends at ${brief.bottom}px, `
      + `the walls' heading starts at ${commonWalls.top}px): canvas, pitch and array come before anyone else's wall.`;
  }
  if (!questions) {
    return `The ${STEP} has no way past the common walls at ${at}: a rep who already knows the brief reaches the questions without reading a catalogue.`;
  }
  if (questions.top > firstWall.top + 1) {
    return `The ${STEP} puts the way past the walls under the list at ${at} (the control is at ${questions.top}px, `
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
function readoutFailure(measured, { at }) {
  const { readout, canvas } = measured;
  if (!readout || readout.width < 1) {
    return `The ${STEP} shows no brief read-out at ${at}: the canvas, the millimetres and the array are the sentence a rep starts from.`;
  }
  if (readout.scroll > readout.width + 1) {
    return `The ${STEP} clips its brief read-out at ${at} (${readout.scroll} > ${readout.width}): the canvas, the millimetres and the array are its payload.`;
  }
  if (!canvas || !canvas.width || !canvas.height) {
    return `The ${STEP} has no canvas fields at ${at}, so the read-out describes a wall nothing on the step holds.`;
  }
  const expected = `${canvas.width} × ${canvas.height} canvas`;
  if (!readout.text.includes(expected)) {
    return `The ${STEP} reads out "${readout.text}" at ${at} while its canvas fields hold ${canvas.width} × ${canvas.height}: `
      + "the read-out is the wall, so it has to be the wall the fields describe.";
  }
  if (!/cabinets?\b/i.test(readout.text)) {
    return `The ${STEP} reads out "${readout.text}" at ${at} without a cabinet count: the array is one of the three answers the brief asks for.`;
  }
  return null;
}

/**
 * The start step's whole reading: `{ verdict, summary }`.
 *
 * `verdict` is the first thing the step does not do, or `null` when it holds.
 * `summary` is the line a report prints for a step that was measured — the card's
 * own width, the width of the content inside it, the brief's box against the wall
 * count, the read-out's width and the widest block it laid out — and it is
 * returned beside the verdict rather than in a second call, because the two
 * describe one measurement and a summary built from boxes nobody checked would be
 * a claim without a reading.
 *
 * The step being absent is a verdict of its own, because the walk has no other
 * way to say it: a measurement that never arrived has no boxes to add up, so the
 * summary is `null` while the sentence names the missing step and the width.
 * A box the step did not render reads as `0` in the summary rather than throwing,
 * since the verdict has already named what is missing.
 */
export function readWallStartStep(measured, { at } = {}) {
  if (!measured) {
    return { verdict: `The walk could not find the ${STEP} at ${at}.`, summary: null };
  }

  const verdict = containmentFailure(measured, { at })
    ?? briefLeadsFailure(measured, { at })
    ?? readoutFailure(measured, { at });

  return {
    verdict,
    summary: `card ${measured.card.width}px holding ${measured.content}px,`
      + ` brief ${measured.brief?.width ?? 0}×${measured.brief?.height ?? 0}px above ${measured.rows} walls,`
      + ` read-out ${measured.readout?.width ?? 0}px, widest block ${measured.widest}px`,
  };
}
