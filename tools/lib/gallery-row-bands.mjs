/**
 * A gallery row's lines, named the one way every row failure names them.
 *
 * The row's shape failures (the widest card's band count, the tablet's comparison
 * against it) and the Copy/Delete split all print a band list, and they used to word
 * it themselves: two of them printed each band's top pixel, which left the reader to
 * difference `913px` and `1071px` to learn whether the pair had been on two lines at
 * all, and the third said `alone` in a wording of its own. One formatter now serves
 * all three — both ends of this module, so a reader who has learned `line 5: Copy …,
 * Delete …` in one failure reads the same list in the others — and both live here
 * rather than in the walk so `gallery-row-bands.test.mjs` can hold the numbering and
 * the wording without a browser.
 */

/**
 * A row's bands, named by the line each sits on and the actions it holds.
 *
 * The bands are already the vertical-overlap grouping the row is held to, so this
 * prints `line 1: Detail, Resume; line 2: Open template: …; line 5: Copy …, Delete …`
 * rather than each band's top pixel: a top is a number the reader has to difference
 * against the bands above and below it to learn which line moved, while the index and
 * the actions say it outright. Numbering is 1-based and follows the order given, which
 * is the order the grouping produced — the same numbers `copyAndDeleteSplitFailure`
 * names for the pair, so a failure cannot say "line 3" and print a list whose third
 * line holds something else. The actions keep their own labels, which is what a reader
 * needs to find the control to change, and a band holding one action is how `alone`
 * reads here — no second wording is needed to say the line was the button's own.
 */
export function describeBands(bands = []) {
  return bands
    .map((band, index) => `line ${index + 1}: ${band.actions.join(", ")}`)
    .join("; ");
}

/**
 * The failure for a Copy/Delete pair the row broke across lines, or `null` when it
 * holds.
 *
 * The pair is one item, so a break belongs between the design line's entries and the
 * pair, never through it. A list of tops said where each button was but not what took
 * each line, so the message now says both: `Copy on line 3, Delete on line 4` for the
 * pair, and the row's own band list from `describeBands` under it, which answers the
 * question the sentence leaves — what else sits on those lines. The buttons are named
 * by the verb their label starts with, because `Copy Northbridge Meeting Room Refresh`
 * repeats a room the sentence already names once; the band list names them in full,
 * since that is the list a reader searches for the control.
 *
 * A button the bands do not hold at all reads as `on no line of the row` rather than
 * as a number it was never given: a label that changed shape would otherwise be
 * reported as line `-1 + 1`.
 */
export function copyAndDeleteSplitFailure({ room, at, iconButtons = [], bands = [] } = {}) {
  if (new Set(iconButtons.map((button) => button.top)).size === 1) return null;
  const lineOf = (button) => {
    const index = bands.findIndex((band) => band.actions.includes(button.label));
    // The button's own label repeats the room — `Copy Northbridge Meeting Room
    // Refresh` — which the sentence already says once, so the pair is named by the
    // verb it starts with. The band list below names the controls in full.
    const name = button.label.split(/\s/)[0];
    return index < 0 ? `${name} on no line of the row` : `${name} on line ${index + 1}`;
  };
  return `Gallery card for ${room} put Copy and Delete on different lines at ${at}: `
    + `${iconButtons.map(lineOf).join(", ")}. The row printed `
    + `${describeBands(bands)} — the pair is one item, so a break belongs between the `
    + "design line's entries and the pair, never through it.";
}
