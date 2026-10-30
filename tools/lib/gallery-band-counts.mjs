/**
 * The band counts a gallery summary prints, in the order a reader compares them.
 *
 * `assertGalleryCardActions` measures eight widths for each of five row states, and two
 * of those readings are counts of the lines the card's action row wrapped over: the
 * number declared at the widest two-column card (`rowShape` on the width) and the
 * numbers held to it (`shape: "same"` or `"atMost"` on the width). Every count that
 * reaches the summary carries the promise its width made, and the sentence has to say
 * them in one order — what the row is, what a wider card must not exceed, and where
 * that number is promised again — whatever order the widths happen to be measured in.
 *
 * That order used to be written out as a sequence of slots in the walk, which meant the
 * sentence carried a copy of the width list's shape that nothing held: `find` took one
 * `atMost` width, so a second ceiling would have vanished from the sentence, and moving
 * a `shape` marker to another width left the words attached to the old pixel value. The
 * table below is the one place the order lives, and it is keyed by the promise rather
 * than by the width, so the same table answers a walk that measures a new width and a
 * spec that measures none.
 *
 * It is here rather than in `browser-smoke-check.mjs` because the sequence is the part
 * of the summary a refactor can change without changing a single reading: a walk that
 * printed the counts in the order it measured them, or last, or dropped the second
 * ceiling, is green in every box check it makes. `gallery-band-counts.test.mjs` writes
 * the source lists instead — a review that has to run a browser to notice a promise
 * sequence move is a review nobody runs.
 */

/**
 * The promises a band count can be held to, and the order a reader checks them in.
 *
 * `declares` fixes the number, `atMost` says a wider card must not need more, and
 * `same` promises the declared number again at a narrower card in the same band. Each
 * entry owns its wording, so the phrase a reader sees belongs to the promise rather
 * than to a pixel value: a width that starts carrying another promise takes that
 * promise's words with it.
 */
export const BAND_COUNT_PROMISES = [
  { promise: "declares", phrase: "the widest two-column card" },
  {
    promise: "atMost",
    phrase: "the top of the single-column block, where the wider card must not need more",
  },
  {
    promise: "same",
    phrase: "the tablet inside the same band, held to that count",
  },
];

/**
 * The counts a summary prints, ordered by the promise each width carried.
 *
 * `sources` is what the walk read: `{ promise, width, lines }` per count, in whatever
 * order the widths were measured. The reading keeps the facts rather than a verdict
 * alone, because the failure is about which count had nowhere to go: `unplaced` is
 * every source whose promise this table does not know, `counts` is the ordered list the
 * sentence prints, and `promises` is the table's own order, which the failure names so
 * a reader knows what a width could have carried.
 *
 * A promise the table does not know fails rather than being printed last: a count with
 * no place in the sentence is either dropped or appended after the comparison it
 * belongs to, and both leave the summary describing fewer widths than the walk
 * measured.
 */
export function readBandCountSequence({ sources = [] } = {}) {
  const promises = BAND_COUNT_PROMISES.map((entry) => entry.promise);
  const known = new Set(promises);
  const unplaced = sources.filter((source) => !known.has(source?.promise));

  // Within one promise the wider width prints first, so two widths held to the same
  // number read as the pair a reader compares rather than in the order they were
  // measured — the widths are listed narrow-to-wide in the viewport table, which is the
  // order a reader would have to difference.
  const counts = BAND_COUNT_PROMISES.flatMap(({ promise, phrase }) => sources
    .filter((source) => source?.promise === promise)
    .sort((left, right) => right.width - left.width)
    .map((source) => ({ width: source.width, lines: source.lines, promise, phrase })));

  return { ok: unplaced.length === 0, unplaced, counts, promises };
}

/** The band counts as the sentence prints them, without the clause they sit in. */
export function describeBandCounts(counts = []) {
  return counts
    .map((count) => `${count.lines} at ${count.width}px, ${count.phrase}`)
    .join("; ");
}

/**
 * The tail a row state's clause prints for its band counts, or `""` when the walk
 * measured none — a state whose widths carry no promise says nothing rather than
 * printing an empty heading.
 */
export function bandCountsClause(counts = []) {
  return counts.length ? `; bands by width: ${describeBandCounts(counts)}` : "";
}

/**
 * A measured width carried a promise this summary has no place for.
 *
 * The message names the count that had nowhere to go and the promises the table does
 * know, because the fix is either a new entry (and where it belongs in the order) or a
 * width that should have carried one of these.
 */
export function bandCountSequenceFailure({ unplaced = [], promises = [] } = {}) {
  return `The gallery summary has no place for the band count at `
    + `${unplaced.map((source) => `${source.width}px (${source.promise})`).join(", ")}: `
    + `every promise a measured width carries has to be one of ${promises.map((promise) => `\`${promise}\``).join(", ")}, `
    + "because a count with no place in the sentence is either dropped or printed after the comparison it belongs to.";
}
