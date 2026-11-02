/**
 * A page read as bands: an ordered ladder of readings, one on screen at a time.
 *
 * The ladder is data rather than four copies of the same `findIndex` in four
 * surfaces, because the surfaces that read it need the same three answers —
 * which band is open, what sits either side of it, and which band an address
 * names — and a second implementation of that arithmetic is how two pages come
 * to disagree about where "back" goes.
 *
 * A band is a reading inside a page, not a route and not a pass: the address
 * still names the page, and a surface that wants the band in its address writes
 * it through its own parameter (the guided result's `?section=`) rather than
 * making the ladder a second route concept.
 */
export type PageBandLadderEntry<K extends string> = {
  key: K;
  label: string;
  /** The action that leaves this band, when the surface prints one. */
  next?: string;
  /** The action that returns to this band from the one after it. */
  back?: string;
};

export type PageBandLadder<K extends string> = ReadonlyArray<PageBandLadderEntry<K>>;

/**
 * Where a key sits in the ladder. An unknown or absent key opens the first band,
 * because a link naming a band a later build dropped should land a rep at the
 * start of the reading rather than on nothing.
 */
export function bandIndex<K extends string>(bands: PageBandLadder<K>, key: K | string | null | undefined): number {
  const index = bands.findIndex((band) => band.key === key);
  return index < 0 ? 0 : index;
}

/** The band a key names, falling back to the first band in the ladder. */
export function bandAt<K extends string>(bands: PageBandLadder<K>, key: K | string | null | undefined): PageBandLadderEntry<K> {
  return bands[bandIndex(bands, key)];
}

/** The band a raw address value names; `null` when the ladder is empty. */
export function bandKeyAt<K extends string>(bands: PageBandLadder<K>, raw: string | null | undefined): K | null {
  return bandAt(bands, raw)?.key ?? null;
}

/** The open band and the two the nav moves to, read from one place. */
export function bandNeighbours<K extends string>(bands: PageBandLadder<K>, key: K | string | null | undefined): {
  current: PageBandLadderEntry<K>;
  previous?: PageBandLadderEntry<K>;
  next?: PageBandLadderEntry<K>;
} {
  const index = bandIndex(bands, key);
  return { current: bands[index], previous: bands[index - 1], next: bands[index + 1] };
}