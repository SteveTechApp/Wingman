/**
 * The sentences the CRM send-history passes say when a row, a panel or a cost is wrong.
 *
 * Both mounts of the panel — the project record's handoff stack and the response
 * builder's last step — are measured by one function, and the rows say three different
 * things about dropping them; every one of those sentences only prints on a page that
 * is broken, so nothing green ever reads it and a refactor can change what it claims
 * without changing a single reading. That is the reason the gallery's row bands moved
 * into `gallery-row-bands.mjs`, applied to this pass: the wording a reader meets when
 * the walk stops is the only explanation they get of what the numbers meant.
 *
 * Two things every sentence has to keep saying. The mount, because the panel is a grid
 * item in two different columns and a failure that said only "the panel" would not say
 * which one came apart. And the row, by the name the page prints, because the widest
 * row is picked by its content rather than by its position — a sentence that named
 * `rows[0]` would send a reader to a row the pass never measured.
 *
 * What stays in the walk is the one-line restatement of a number — `the panel scrolls
 * sideways at 390px (371 > 360)` — because there is no claim in it that the measurement
 * does not already make, and a builder for it would only add a layer between the number
 * and the sentence.
 */

/**
 * The panel is wider than the box that clips it, so the rows' trailing actions are
 * drawn nowhere.
 *
 * The chain of boxes is printed with it because "wider than the box that clips it"
 * names two boxes and says nothing about which ancestor stopped giving the panel room;
 * the panel's own width, its scroll width, its display, its grid columns and whether
 * each ancestor hides its overflow is what a reader needs to find the box to change.
 */
export function crmPanelClippedFailure({ mount, at, tree = [] } = {}) {
  const sentence = `${mount}: the CRM panel is wider than the box that clips it at ${at}, so its history rows' trailing actions are cut off.`;
  if (!tree.length) return sentence;
  return `${sentence}\n`
    + tree
      .map((box) => `  ${box.width}/${box.scroll}${box.overflowX !== "visible" ? " clipped" : ""} ${box.display}${box.columns !== "none" ? ` [${box.columns}]` : ""} ${box.node}`)
      .join("\n");
}

/**
 * A sentence that ends the message, without a second full stop.
 *
 * The row's own text is a written sentence and almost always ends with one — the costs
 * are `Dropping it … send.` — so quoting it and adding a stop printed `"."`, which is
 * the kind of thing a reader takes for a typo in the walk rather than in the row.
 */
const endl = (text) => (/[.!?]$/.test(String(text ?? "")) ? "" : ".");

/**
 * A row fits by hiding which send it is about: the name is the cell that gives ground,
 * and it gave all of it.
 */
export function crmRowNameFailure({ mount, at, name } = {}) {
  return `${mount}: a CRM history row's project name is ${name ? `${name}px` : "absent"} at ${at}; the row fits by hiding it.`;
}

/**
 * The row these readings are about is not on the page: the widest row is followed by
 * name at the narrower widths, and a list that lost it would measure a different row.
 */
export function crmWidestRowMissingFailure({ mount, at, name } = {}) {
  return `${mount}: the widest CRM history row ("${name}") is not in the list at ${at}, so the row these `
    + "readings are about is not the row on the page.";
}

/**
 * Above the wrap width every row is one line; a row that took two is the media query
 * moved off the width the row is meant to wrap at.
 *
 * The first row's band count is printed because the count alone does not say whether
 * one row wrapped or every row did.
 */
export function crmRowSplitFailure({ mount, at, rows = [] } = {}) {
  return `${mount}: ${rows.length} CRM history row${rows.length === 1 ? "" : "s"} `
    + `${rows.length === 1 ? "occupies" : "occupy"} more than one line at ${at}, where the row is a single line `
    + `(the first holds ${rows[0]?.lines}).`;
}

/**
 * The widest row is the one that has to wrap first, so a wrapped-side width that holds
 * it on one line has the rule failing on the row it was written for.
 */
export function crmWidestRowNotWrappedFailure({ mount, at, name, content } = {}) {
  return `${mount}: the widest CRM history row ("${name}", ${content}px of content) stayed on one `
    + `line at ${at}, where the row wraps: the project name should take the first line and the status, time and `
    + "controls the next.";
}

/**
 * The short-named row is the one-liner case, and the widest row cannot speak for it: a
 * name no phone width holds wraps even under a rule that wrapped every row.
 */
export function crmShortRowWrappedFailure({ mount, at, lines, nameLength } = {}) {
  return `${mount}: the short-named send's row took ${lines} lines at ${at}, where a ${nameLength}-character `
    + "name leaves room for the row and its controls on one line: the wrap is for names that need it, not for every row.";
}

/** Below the wrap width a short name needs its own band plus one for the controls. */
export function crmShortRowBandsFailure({ mount, at, lines } = {}) {
  return `${mount}: the short-named send's row broke into ${lines} bands at ${at}, where a short name needs the name's band `
    + "and one band for its controls: a third band is the name squeezed to its floor with the controls split under it.";
}

/**
 * A row's cost before the second click says the wrong thing for the row it belongs to.
 *
 * `row` names the shape ("A failure that kept the body it POSTed"), `says` the promise
 * the sentence has to keep, and `text` what the row actually printed — so a reader can
 * compare the two without opening the store to find the entry.
 */
export function crmRemovalNoteMismatchFailure({ row, says, text } = {}) {
  return `${row} must say that ${says}, but the row said "${text}"${endl(text)}`;
}

/**
 * A cost that reads as another shape's: a failure with a body must not read as a send
 * the CRM accepted, and one that stored no body must not read as either of the others.
 */
export function crmRemovalNoteWrongShapeFailure({ row, forbidden, text } = {}) {
  return `${row} must not read as ${forbidden}: "${text}"${endl(text)}`;
}

/** A delivered send stored no body, so its cost must not mention one at all. */
export function crmRemovalBodyMentionFailure({ text } = {}) {
  return `A delivered send stored no body, so its cost must not mention one: "${text}"${endl(text)}`;
}

/**
 * Two shapes printed the same sentence, so the note says nothing about the row it
 * belongs to.
 *
 * Per-row checks cannot catch this: printing the right sentence for its own row is all
 * each of them asks, and a component that printed one sentence for every shape would
 * satisfy every one of them.
 */
export function crmRemovalNoteDuplicateFailure({ first, second, text } = {}) {
  return `${first} and ${second} printed the same cost ("${text}"), so the note says nothing about the row it belongs to.`;
}

/** Reading a row's cost must be a preview: the stored history is still whole. */
export function crmRemovalTouchedHistoryFailure({ stored, seeded } = {}) {
  return `Reading the three shapes' costs left ${stored} of the ${seeded} seeded sends in storage: arming a row is a preview, not a step that changes the history.`;
}
