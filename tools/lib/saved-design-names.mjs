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
 * entry prints 23 of a 103-character name, and the strip's narrowest column keeps
 * 40 of an 87-character one. 20 is under that tightest measurement by enough that
 * a different font's metrics cannot fail a card that is not a stub, and it is far
 * above the verb and a letter, which is the failure this floor exists to catch —
 * the number the gallery could hold at 14 was a floor that let a real design name
 * be cut to a stub.
 */
export const SAVED_DESIGN_NAME_FLOOR = 20;

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
