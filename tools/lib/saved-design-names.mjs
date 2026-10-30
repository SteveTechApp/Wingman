/**
 * How much of a saved design's name a link prints, and the sentence for when it
 * prints less.
 *
 * Two surfaces print the design a room was saved as, and both are links: the
 * projects gallery's card row (`designEntryNameFailure`, `.wm-project-template-link`)
 * and the guided Home strip's card (`assertRecentStripColumns`,
 * `a.wm-guided-recent-template`). Each counts the characters a `Range` leaves
 * visible inside the link's clip box, because the link is one nowrap line that
 * ellipsises its own text — the DOM holds the whole name whether a rep can read
 * it or not — and each used to hold its own number: 12 on the gallery card, 24 on
 * the strip. Two numbers for one promise is a surface allowed to truncate a name
 * further than the other with no reading to say so, which is the drift this
 * module exists to stop: a rep comparing a design on the strip with the same
 * design on the gallery card is reading one name, not two.
 *
 * The number is the stub guard, not a design target, and a floor is only worth
 * anything if it is the one the narrower surface can keep. It was 12 while the
 * gallery's two-column band ran down to 581px: a ~250px card there gave its entry
 * 191px, which printed 14 characters of a 79-character name. The band now stops at
 * 761px — a room saved as a design needs a card that can print the design's name,
 * and a 250px card cannot — so the narrowest two-column card is a ~370px one, and
 * the tightest reading is 31: a card in the two-column band prints 31 of a
 * 92-character name on one line, where the strip's narrowest column keeps 40 of an
 * 87-character one. That 31 is a column's, not a fixture's — the pass's short seeds
 * carry 34 characters, so the entry they feed is clipped on the narrow cards and the
 * count beside it is what a column agreed to show; while a seed name of 23
 * characters was printing whole at every width, the tightest line reported a
 * fixture's length and the floor's headroom was measured against nothing.
 *
 * The phone used to be the tightest case at 23, and that number was a reading of one
 * font profile rather than of the card. The app names `Geist Variable` and `Inter`
 * and ships neither, so a runner whose fallback sans is 12.6% wider printed 17 of the
 * same name in the same 250px entry and failed this floor. The room was never there
 * to spend — a 286px card gave its entry 250px of 250px — so below 761px, where the
 * gallery is one card per row, the label takes a second line and prints the whole
 * name (92 of 92, 79 of 79 at 360, 390, 581 and 760px). Above that band a card shares
 * its row, and a taller card there costs a row of cards rather than a line inside
 * one, so the name stays on one ellipsized line and 31 is what that line keeps.
 *
 * 20 sits under that count for the same reason as before — a wider fallback must not
 * fail a card that is not a stub, and the same 12.6% would take 31 to 27 — and it is
 * far above the verb and a letter, which is the failure this floor exists to catch:
 * the 14 the gallery once held to was a floor that let a real design name be cut to a
 * stub. Raising it to the phone's whole name would be a number the two-column band
 * cannot keep, and the widths where the entry is floor-bound cannot pay for one: at
 * 561px a 60ch `min-width` takes the short-name row from 2 bands to 3, and at 760px
 * from 1 to 3.
 */
export const SAVED_DESIGN_NAME_FLOOR = 20;

/**
 * Every width's readings, ranked by how much name that cell had to lose: the
 * longest name first, and between two names of the same length the smaller count,
 * because the column that cut one of a pair is the column with less room.
 *
 * One ranking, because the pick and the runner-up printed beside it have to be the
 * first two of the same order — two implementations of "most to lose" would let the
 * runner-up describe a cell the pick was not chosen against.
 */
function rankedByWidth(readings = []) {
  const byWidth = new Map();
  for (const reading of readings) {
    if (!Number.isFinite(reading?.width) || !Number.isFinite(reading?.printed)) continue;
    byWidth.set(reading.width, [...(byWidth.get(reading.width) ?? []), reading]);
  }
  return new Map([...byWidth.entries()].map(([width, atWidth]) => [
    width,
    [...atWidth].sort(((left, right) => ((right.characters ?? 0) - (left.characters ?? 0))
      || (left.printed - right.printed))),
  ]));
}

/**
 * The entry with the most name to lose, at each width the gallery was measured at.
 *
 * The number that says what a width keeps is the one from a name longer than its
 * column, not the smallest count on the page: a card saved as "Kingsway Training
 * 75 in wall display" is 34 characters and prints all 34 of them at 1366px, so
 * picking the smallest count names that card at eight of nine widths and says
 * nothing about any of them. The pick is therefore the longest name at that width —
 * the cell with the most to lose — and the count beside it is the column's reading.
 * A tie goes to the smaller count, because two names of equal length are
 * distinguished by which column cut one.
 *
 * Widest first, because that is the order a reader compares a layout in and the
 * order the widths are listed in.
 */
export function mostToLosePerWidth(readings = []) {
  return [...rankedByWidth(readings).values()]
    .filter((atWidth) => atWidth.length)
    .map((atWidth) => atWidth[0])
    .sort((left, right) => right.width - left.width);
}

/**
 * The second-riskiest entry at each width — the runner-up the sentence prints so a
 * reader can tell a column's budget from one card's own width.
 *
 * The pick is made by name length, which does not vary with the width, so the same
 * design can head two widths and two equal counts then look like one column's
 * promise when the number is really one cell's. A width whose reading came from a
 * single card has no runner-up: printing the pick again would read as agreement.
 */
export function runnerUpPerWidth(readings = []) {
  return [...rankedByWidth(readings).values()]
    .filter((atWidth) => atWidth.length > 1)
    .map((atWidth) => atWidth[1])
    .sort((left, right) => right.width - left.width);
}

/**
 * The same numbers as one sentence: every width, its count, the card it came from,
 * and the runner-up beside it.
 *
 * The runner-up is the second opinion the pick cannot give on its own. A pick is
 * the longest name among the entries that were tightest on their own card, and that
 * set changes with the width — at 1366px a 101-character name can head the sentence
 * and at 1151px a 92-character one on another card — so two equal counts at two
 * widths do not by themselves say the columns kept the same characters. The
 * runner-up is a different cell in the same column, and when its count agrees, the
 * number describes the column rather than the card the pick happens to sit on.
 *
 * Returning `""` for no readings is deliberate — a pass with no design entry has
 * nothing to promise, and a caller that prints an empty clause prints no claim
 * rather than a claim of zero.
 */
export function designNameWidthClause(readings = []) {
  const rows = mostToLosePerWidth(readings);
  if (!rows.length) return "";
  const runnersUp = new Map(runnerUpPerWidth(readings).map((row) => [row.width, row]));
  const parts = rows.map((row) => {
    const runnerUp = runnersUp.get(row.width);
    return `${row.printed} of ${row.characters} at ${row.width}px`
      + `${row.room ? ` on ${row.room}'s card` : ""}`
      + `${runnerUp ? `, next ${runnerUp.printed} of ${runnerUp.characters}${runnerUp.room ? ` on ${runnerUp.room}'s card` : ""}` : ""}`;
  });
  return `By width, the longest-named design entry printed ${parts.slice(0, -1).join("; ")}`
    + `${parts.length > 1 ? "; and " : ""}${parts.at(-1)}.`;
}

/**
 * How far apart the two cells of one column may sit, in characters of the pick's own
 * name.
 *
 * One character, because the two cells hold different names: the count each prints is
 * the box divided by its own glyphs, so "Harbour Retail Signage Rollout — single
 * display, USB-C table connection and ceiling speakers" printed 45 characters in the
 * same 359px entry where a 101-character Northbridge name printed 40 at 1366px. The
 * counts therefore never agree on their own, and the number that has to agree is the
 * box both were given — the column — read in the unit a reader compares it in.
 */
export const DESIGN_NAME_AGREEMENT = 1;

/**
 * The width one character of a reading's name took, or `null` when its name was not
 * cut.
 *
 * `entry` is the box the card gave the link and `printed` what the clip left, so the
 * two together say how much line a single character costs on that card. A name that
 * printed whole was given its own width rather than the column's: its link ends
 * where the name ends, and comparing it with another cell would compare two names
 * rather than two columns.
 */
function keptCharacterWidth(reading) {
  if (!Number.isFinite(reading?.entry) || !Number.isFinite(reading?.printed)) return null;
  if (reading.printed <= 0 || !Number.isFinite(reading?.characters)) return null;
  if (reading.printed >= reading.characters) return null;
  return reading.entry / reading.printed;
}

/**
 * The pick and its runner-up were not given one column, so their counts say nothing
 * about a column's budget.
 *
 * The runner-up exists to answer the question the pick cannot: a count on its own
 * could be the width of the card the pick happens to sit on, and the second cell is
 * what turns it into a column's number. That answer only holds while the two cells
 * were laid out in one column — the same entry box, within one character of the pick's
 * own text. A pair further apart than that is one card's width beside another's, and
 * printing the pick's count as the width's reading would print a card's arithmetic as
 * a column's.
 *
 * A width whose runner-up printed its name whole has no column to compare: that cell
 * was given its name's width because nothing was cut there, so there is no second
 * opinion to hold and the width's reading is the pick's alone.
 */
export function designNameWidthAgreementFailure(readings = []) {
  const runnersUp = new Map(runnerUpPerWidth(readings).map((row) => [row.width, row]));
  for (const pick of mostToLosePerWidth(readings)) {
    const runnerUp = runnersUp.get(pick.width);
    if (!runnerUp) continue;
    const perCharacter = keptCharacterWidth(pick);
    if (perCharacter === null || keptCharacterWidth(runnerUp) === null) continue;
    const gap = Math.abs(pick.entry - runnerUp.entry);
    if (gap <= perCharacter * DESIGN_NAME_AGREEMENT) continue;
    const card = (reading) => (reading.room ? ` on ${reading.room}'s card` : "");
    return `The reading at ${pick.width}px was taken from two boxes, not one column: the longest-named design `
      + `entry printed ${pick.printed} of ${pick.characters} in a ${pick.entry}px entry${card(pick)}, and its `
      + `runner-up printed ${runnerUp.printed} of ${runnerUp.characters} in a ${runnerUp.entry}px entry${card(runnerUp)} `
      + `— ${gap}px apart, ${(gap / perCharacter).toFixed(1)} characters of the pick's own name, where the pair has to `
      + `sit within ${DESIGN_NAME_AGREEMENT}. A wider cell is that card's own width rather than the column's, so the `
      + "count beside the pick would read as a column's budget while measuring one card.";
  }
  return null;
}

/**
 * A saved-design link printed too little of the name to tell one design from another.
 *
 * `surface` names the card the link sits on, because the two columns are not the
 * same and a report that said only "the link" would not say which surface came
 * apart. The claim after the numbers is the reason the count is a reading at all:
 * the characters the clip left are how much of the design a rep can read before
 * choosing between them, so a link that fits by printing the verb and a letter is
 * a card with the design's name gone.
 */
export function savedDesignNameFailure({ surface, room, design, visible, characters, floor, at } = {}) {
  return `The ${surface} for ${room} printed ${visible} of ${characters} characters of its saved design's name at ${at} `
    + `("${design}"), where a saved-design link has to keep at least ${floor} on either surface that prints one: `
    + "the link is one nowrap line clipped by its column, so the characters it keeps are how much of the design a "
    + "rep can read before choosing between them.";
}
