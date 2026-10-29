/**
 * What a response-builder step card owes the rep, read from boxes.
 *
 * The card renders five bodies of content, so the reading is per step: a card
 * whose content fits says nothing about the next one. Three things are held, and
 * all three are about the card laying its content out at the width it has rather
 * than at the widest child's max-content — the failure that put a ~500px layout
 * inside a 368px card at 390px, with the page host's own `overflow` cutting the
 * right-hand part of it off.
 *
 * The sentences live here rather than in the walk because they are the promise,
 * not the measurement: the walk owns the `page.evaluate` that produces the boxes
 * (only a browser can produce them) and this module owns what those boxes mean,
 * so a rule cannot be tightened in one place and loosened in another. Each
 * function returns the first thing the card does not do, or `null`, which is what
 * lets the caller print a reading for a card that holds instead of catching one.
 */

/**
 * The chain of boxes from the card to the first ancestor that clips it.
 *
 * A card that is wider than its clipping host has been given a width it does not
 * have, and the interesting fact is which ancestor stopped giving it room — so the
 * report prints each box's own width against its scroll width, whether it clips,
 * its display, its grid columns when it has any, and its name.
 */
export function stepCardTreeReport(tree = []) {
  return tree
    .map((box) => `  ${box.width}/${box.scroll}`
      + `${box.overflowX !== "visible" ? " clipped" : ""} ${box.display}`
      + `${box.columns !== "none" ? ` [${box.columns}]` : ""} ${box.node}`)
    .join("\n");
}

/**
 * A child of the card left its content box.
 *
 * The outermost escaping box is named with how wide it is and how far past the
 * card it went, because everything inside it is left by the same amount and the
 * outermost name is the one to change. The rest are named without boxes: a
 * failure that listed every descendant's overrun would be a wall of numbers that
 * buries the one node to open.
 */
function escapedFailure(escaped, described, at) {
  const worst = escaped[0];
  return `The response builder's ${described} left content outside itself at ${at}: `
    + `${worst.name} is ${worst.width}px wide, ${worst.past}px past the card's content box`
    + ` (${escaped.length} box${escaped.length === 1 ? "" : "es"} out`
    + `${escaped.length > 1 ? `, also ${escaped.slice(1, 4).map((entry) => entry.name).join(", ")}` : ""}).`
    + " Every box on a step card lays out at the width the card has.";
}

/**
 * The first thing the card does not do, or `null`.
 *
 * `described` is the card and the state it was measured in (`step 5 (Review and
 * export) card with the CRM send history open`), because the two card readings
 * differ and a report that said only "the card" would not say which one came
 * apart. The order is the order a rep would notice: content that left the card,
 * then a card that scrolls sideways, then a card wider than the box that clips it.
 * The leaking child is named before the card's own scroll reading because the
 * child is the thing to change and the card is only as wide as its widest one.
 */
export function stepCardFailure(measured, { at, described } = {}) {
  if (!measured) return null;
  const escaped = measured.escaped ?? [];
  if (escaped.length) return escapedFailure(escaped, described, at);
  if (measured.card.scroll > measured.card.width + 1) {
    return `The response builder's ${described} scrolls sideways at ${at} (${measured.card.scroll} > ${measured.card.width}).`;
  }
  if (measured.clipped) {
    return `The response builder's ${described} is wider than the box that clips it at ${at}.\n`
      + stepCardTreeReport(measured.tree);
  }
  return null;
}

/**
 * The state the card was measured in, held to the state the walk opened.
 *
 * A step measured with the send history open is a different reading from the same
 * step measured closed, and only the card can say which one it is: the history is
 * opened by a click, so a card that never received it would report a fit for
 * content that was not there.
 */
export function stepCardStateFailure(measured, { at, described, expectedRows, withHistory } = {}) {
  if (!measured) return null;
  if (measured.history.rows !== expectedRows) {
    return `The response builder's ${described} held ${measured.history.rows} CRM history rows at ${at}; `
      + `the walk expected ${expectedRows} on a card ${withHistory ? "with the send view open" : "without one"}.`;
  }
  if (withHistory && !measured.history.open) {
    return `The response builder's ${described} lost the expanded conversation at ${at}, so the tallest block it holds was not laid out.`;
  }
  return null;
}
