/**
 * Whether the guided Home's recent strip printed the rooms this walk seeded.
 *
 * `RecentProjects` prints `projects.slice(0, 3)`, and the gallery pass before the recent
 * strip's own pushes its rows onto the same store, so which three rooms arrive is the
 * store's order rather than the seed's. Every reading below the pick — the survey
 * review, the leading chip, the copy column, the saved designs — is about a room this
 * walk seeded, so the cards have to be the seeded ones before a box is measured; a pass
 * that reached for its seed's ids on cards that were not there measured whatever the
 * strip happened to print and reported a fit for rooms it had never seeded.
 *
 * The reading is here rather than in the walk because membership is the part a
 * refactor can quietly change: the walk reads the cards off the page and throws one
 * sentence, and a version that forgot the seeded-room check, or that counted two
 * unidentified cards as one room printed twice, would stay green on a store ordered
 * the way the seed left it. `recent-strip-pick.test.mjs` holds it against card lists
 * written for each shape instead.
 *
 * Order is deliberately not part of the check. A store that lists the same three rooms
 * another way is a strip this pass can measure — the readings follow the cards' own
 * text — so the pick is about which rooms are on the page, not where they sit.
 */

/**
 * The pick, as facts rather than a verdict alone.
 *
 * `pickedRooms` is the room each card carries, in the order the strip printed them, and
 * is what the walk measures in. `strays` are the cards that carry no room at all (no
 * survey flag to identify them by) or a room this pass never seeded, kept whole so a
 * failure can name them by the text they printed. `repeated` counts only the rooms that
 * were identified: two unidentified cards are two cards the pass cannot name, not one
 * room printed twice, and saying otherwise sent a reader looking for a duplicate in a
 * list that had none.
 */
export function readRecentStripPick({ cards = [], seeded = [] } = {}) {
  const pickedRooms = cards.map((card) => card.room ?? null);
  const seededIds = new Set(seeded.map((room) => room.id));
  const strays = cards.filter((card) => !card.room || !seededIds.has(card.room));
  const identified = pickedRooms.filter(Boolean);
  const repeated = new Set(identified).size !== identified.length;
  // The count is its own failure: a strip that printed two cards is a card missing,
  // which is a different thing from a card belonging to another room, and the sentence
  // reports the two by different lists.
  const countMatches = cards.length === seeded.length;

  return {
    ok: countMatches && !strays.length && !repeated,
    pickedRooms,
    strays,
    repeated,
    countMatches,
  };
}
