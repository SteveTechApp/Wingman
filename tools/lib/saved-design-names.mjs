/**
 * How much of a saved design's name a link prints, and the sentence for when it
 * prints less.
 *
 * Two surfaces print the design a room was saved as, and both are links: the
 * projects gallery's card row (`assertDesignEntryNames`, `.wm-project-template-link`)
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
 * the tightest reading either surface meets is 23: the gallery card's 250px phone
 * entry prints 23 of a 79-character name, and the strip's narrowest column keeps
 * 40 of an 87-character one. That 23 is a column's, not a fixture's — the pass's
 * short seeds carry 34 characters, so the entry they feed is clipped on the narrow
 * cards and the count beside it is what a column agreed to show; while a seed name
 * of 23 characters was printing whole at every width, the tightest line reported a
 * fixture's length and the floor's headroom was measured against nothing. 20 is
 * under that tightest measurement by enough that a different font's metrics cannot
 * fail a card that is not a stub, and it is far above the verb and a letter, which
 * is the failure this floor exists to catch — the number the gallery could hold at
 * 14 was a floor that let a real design name be cut to a stub.
 */
export const SAVED_DESIGN_NAME_FLOOR = 20;

/**
 * The entry with the most name to lose, at each width the gallery was measured at.
 *
 * The number that says what a width keeps is the one from a name longer than its
 * column, not the smallest count on the page: a card saved as "Kingsway Training
 * 75 in wall display" is 34 characters and prints all 34 of them at 1366px, so
 * picking the smallest count names that card at eight of nine widths and says
 * nothing about any of them. The pick is therefore the longest name at that width — the cell with
 * the most to lose — and the count beside it is the column's reading. A tie goes to
 * the smaller count, because two names of equal length are distinguished by which
 * column cut one.
 *
 * Widest first, because that is the order a reader compares a layout in and the
 * order the widths are listed in.
 */
export function mostToLosePerWidth(readings = []) {
  const byWidth = new Map();
  for (const reading of readings) {
    if (!Number.isFinite(reading?.width) || !Number.isFinite(reading?.printed)) continue;
    const held = byWidth.get(reading.width);
    if (!held) {
      byWidth.set(reading.width, reading);
      continue;
    }
    const riskier = (reading.characters ?? 0) > (held.characters ?? 0)
      || ((reading.characters ?? 0) === (held.characters ?? 0) && reading.printed < held.printed);
    if (riskier) byWidth.set(reading.width, reading);
  }
  return [...byWidth.values()].sort((left, right) => right.width - left.width);
}

/**
 * The same numbers as one sentence: every width, its count, and the card it came
 * from.
 *
 * Returning `""` for no readings is deliberate — a pass with no design entry has
 * nothing to promise, and a caller that prints an empty clause prints no claim
 * rather than a claim of zero.
 */
export function designNameWidthClause(readings = []) {
  const rows = mostToLosePerWidth(readings);
  if (!rows.length) return "";
  const parts = rows.map((row) => `${row.printed} of ${row.characters} at ${row.width}px`
    + `${row.room ? ` on ${row.room}'s card` : ""}`);
  return `By width, the longest-named design entry printed ${parts.slice(0, -1).join(", ")}`
    + `${parts.length > 1 ? " and " : ""}${parts.at(-1)}.`;
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
