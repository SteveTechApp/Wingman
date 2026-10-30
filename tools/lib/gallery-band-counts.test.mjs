import { describe, expect, it } from "vitest";
import {
  BAND_COUNT_PROMISES,
  bandCountSequenceFailure,
  bandCountsClause,
  describeBandCounts,
  readBandCountSequence,
} from "./gallery-band-counts.mjs";

/**
 * The gallery summary's promise sequence, held without a browser.
 *
 * The walk prints these counts only in its summary, so a sequence that moved is a
 * change no box check can see: every card still fits its column, every band count is
 * still held to the right number, and the sentence alone reorders. The walk's own run
 * proves the numbers on this checkout — 5 at 1150px, 5 at 580px and 5 at 1024px — and
 * five widths to re-measure per shape is a slow way to learn that `atMost` moved above
 * `same` in a table.
 *
 * The sources below are written as the walk reads them: a `promise`, the `width` it was
 * read at and the `lines` the row wrapped over. That is exactly the shape the extracted
 * function takes, so a refactor of the walk that stopped passing a promise (or started
 * passing a width's own) fails these specs rather than passing them by accident.
 */

/** What the walk reads at one row state: the declared count and the two promises. */
const SOURCES = [
  { promise: "declares", width: 1150, lines: 5 },
  { promise: "same", width: 1024, lines: 5 },
  { promise: "atMost", width: 580, lines: 5 },
];

describe("BAND_COUNT_PROMISES", () => {
  it("orders the promises as a reader compares them", () => {
    expect(BAND_COUNT_PROMISES.map((entry) => entry.promise)).toEqual(["declares", "atMost", "same"]);
  });

  it("gives each promise its own wording, so none stands in for another", () => {
    const phrases = BAND_COUNT_PROMISES.map((entry) => entry.phrase);

    expect(new Set(phrases).size).toBe(phrases.length);
    // The words say what the comparison is: what the row is, what a wider card must
    // not exceed, and where the number is promised again.
    expect(phrases[0]).toBe("the widest two-column card");
    expect(phrases[1]).toContain("must not need more");
    expect(phrases[2]).toContain("held to that count");
  });
});

describe("readBandCountSequence", () => {
  it("prints the counts in the table's order rather than the order they were read", () => {
    const reading = readBandCountSequence({ sources: SOURCES });

    expect(reading.ok).toBe(true);
    expect(reading.unplaced).toEqual([]);
    expect(reading.counts.map((count) => `${count.lines} at ${count.width}px`)).toEqual([
      "5 at 1150px",
      "5 at 580px",
      "5 at 1024px",
    ]);
  });

  it("prints a second ceiling rather than dropping it", () => {
    // The sequence the walk used to keep was three slots, and `find` took one `atMost`
    // width: a second ceiling vanished from the sentence while the walk held it.
    const reading = readBandCountSequence({
      sources: [{ promise: "declares", width: 1150, lines: 5 }, { promise: "atMost", width: 900, lines: 4 }, { promise: "atMost", width: 580, lines: 5 }],
    });

    expect(reading.counts.map((count) => count.width)).toEqual([1150, 900, 580]);
    expect(reading.counts.filter((count) => count.promise === "atMost")).toHaveLength(2);
  });

  it("puts the wider width first within one promise", () => {
    // Two widths held to the same number are the pair a reader compares, and the
    // viewport table lists its widths narrow-to-wide — the order a reader would have
    // to difference rather than read.
    const reading = readBandCountSequence({
      sources: [
        { promise: "declares", width: 1150, lines: 5 },
        { promise: "same", width: 768, lines: 5 },
        { promise: "same", width: 1024, lines: 5 },
      ],
    });

    expect(reading.counts.map((count) => count.width)).toEqual([1150, 1024, 768]);
  });

  it("keeps the phrase with the promise, not with the width it was read at", () => {
    // Probed by moving the `atMost` marker to another width: the words follow the
    // promise, so no pixel value in the table can go stale.
    const reading = readBandCountSequence({
      sources: [{ promise: "declares", width: 1150, lines: 5 }, { promise: "atMost", width: 1181, lines: 6 }],
    });

    expect(reading.counts[1]).toEqual({
      width: 1181,
      lines: 6,
      promise: "atMost",
      phrase: "the top of the single-column block, where the wider card must not need more",
    });
  });

  it("reports a promise it does not know instead of placing it last", () => {
    const reading = readBandCountSequence({
      sources: [...SOURCES, { promise: "atLeast", width: 360, lines: 9 }],
    });

    expect(reading.ok).toBe(false);
    expect(reading.unplaced).toEqual([{ promise: "atLeast", width: 360, lines: 9 }]);
    // The counts it does know are still ordered, so the failure is about the one that
    // had nowhere to go rather than about the sentence being unreadable.
    expect(reading.counts.map((count) => count.promise)).toEqual(["declares", "atMost", "same"]);
  });

  it("reads no sources as no counts rather than as a failure", () => {
    const reading = readBandCountSequence({ sources: [] });

    expect(reading).toMatchObject({ ok: true, unplaced: [], counts: [] });
    expect(reading.promises).toEqual(["declares", "atMost", "same"]);
    expect(readBandCountSequence().counts).toEqual([]);
  });
});

describe("describeBandCounts", () => {
  it("prints each count as a number, its width and the promise's words", () => {
    expect(describeBandCounts(readBandCountSequence({ sources: SOURCES }).counts)).toBe(
      "5 at 1150px, the widest two-column card; "
        + "5 at 580px, the top of the single-column block, where the wider card must not need more; "
        + "5 at 1024px, the tablet inside the same band, held to that count",
    );
  });

  it("prints nothing for no counts", () => {
    expect(describeBandCounts()).toBe("");
    expect(describeBandCounts([])).toBe("");
  });
});

describe("bandCountsClause", () => {
  it("heads the counts with what they are", () => {
    expect(bandCountsClause(readBandCountSequence({ sources: SOURCES }).counts))
      .toBe(`; bands by width: ${describeBandCounts(readBandCountSequence({ sources: SOURCES }).counts)}`);
  });

  it("says nothing for a row state whose widths carried no promise", () => {
    // A state measured at widths that declare no count prints no heading, rather than
    // a `bands by width:` with nothing after it.
    expect(bandCountsClause([])).toBe("");
    expect(bandCountsClause()).toBe("");
  });
});

describe("bandCountSequenceFailure", () => {
  it("names the count with no place and the promises the table does know", () => {
    const message = bandCountSequenceFailure({
      unplaced: [{ promise: "atLeast", width: 360, lines: 9 }],
      promises: ["declares", "atMost", "same"],
    });

    expect(message).toContain("The gallery summary has no place for the band count at 360px (atLeast)");
    expect(message).toContain("has to be one of `declares`, `atMost`, `same`");
    // The sentence has to say what a dropped count costs, or a reader would take it for
    // a formatting choice.
    expect(message).toContain("either dropped or printed after the comparison it belongs to");
  });

  it("names every unplaced count, not only the first", () => {
    const message = bandCountSequenceFailure({
      unplaced: [
        { promise: "atLeast", width: 360, lines: 9 },
        { promise: "exactly", width: 390, lines: 3 },
      ],
      promises: ["declares", "atMost", "same"],
    });

    expect(message).toContain("360px (atLeast), 390px (exactly)");
  });
});
