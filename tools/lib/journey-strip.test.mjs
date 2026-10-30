import { describe, expect, it } from "vitest";
import {
  JOURNEY_SWEEP,
  describeJourneyColumn,
  journeyEndsClause,
  journeyEntryFailure,
  journeyStripReading,
  journeySweepClause,
  tightestJourneyColumn,
} from "./journey-strip.mjs";

/** One entry as the walk reads it: a box, a copy column, a label and a reason. */
const entry = (label, { copy = 196, box = 254, reason = "Because the room needs it." } = {}) => ({
  label,
  reason,
  box: { width: box, clipped: 0 },
  copy: { width: copy, clipped: 0 },
  labelBox: { width: copy, clipped: 0 },
  reasonBox: { width: copy, clipped: 0 },
  escaped: 0,
  arrow: true,
});

/** A strip that holds at any width: two entries inside a grid inside the strip. */
const holding = (count = 2) => ({
  strip: { width: 1260, scroll: 1260 },
  actions: { width: 1204, scroll: 1204 },
  entries: [entry("Build a room"), entry("Compare two products"), entry("Review a saved wall")].slice(0, count),
});

const read = (measured, count = measured.entries.length) => journeyEntryFailure(measured, {
  at: "1366px",
  count,
});

describe("where the copy column is narrowest", () => {
  const reading = (width, copyMin) => ({ width, copyMin, copyMax: copyMin + 20, strip: 463, entry: 210 });

  it("takes the smallest column out of the sweep", () => {
    const tightest = tightestJourneyColumn([reading(1366, 267), reading(537, 152), reading(360, 196)]);
    expect(tightest.width).toBe(537);
    expect(tightest.copyMin).toBe(152);
  });

  it("keeps the narrowest width when a plateau of identical columns meets the minimum", () => {
    const tightest = tightestJourneyColumn([reading(360, 200), reading(420, 196), reading(421, 196), reading(500, 199)]);
    expect(tightest.width).toBe(420);
  });

  it("skips a width that printed no copy column rather than reading it as zero", () => {
    const tightest = tightestJourneyColumn([null, { width: 361, copyMin: 0 }, reading(537, 152)]);
    expect(tightest.width).toBe(537);
  });

  it("reports no reading for a sweep that measured nothing, rather than inventing a width", () => {
    expect(tightestJourneyColumn([])).toBeNull();
    expect(tightestJourneyColumn([null, { width: 400, copyMin: 0 }])).toBeNull();
  });

  it("returns a copy, so a caller holding the sweep cannot change the reading it chose", () => {
    const readings = [reading(537, 152)];
    const tightest = tightestJourneyColumn(readings);
    tightest.copyMin = 999;
    expect(readings[0].copyMin).toBe(152);
  });

  it("sweeps both ends of the range a rep reads at, one pixel at a time", () => {
    expect(JOURNEY_SWEEP).toEqual({ from: 360, to: 1366 });
  });
});

describe("how a column is printed", () => {
  it("prints one number when the entries agree and a range when they do not", () => {
    expect(describeJourneyColumn({ copyMin: 216, copyMax: 216 })).toBe("216px");
    expect(describeJourneyColumn({ copyMin: 212, copyMax: 267 })).toBe("212 to 267px");
  });

  it("says it has no reading rather than printing an empty column", () => {
    expect(describeJourneyColumn(null)).toBe("no reading");
  });

  it("names each end's strip, entries and copy column", () => {
    expect(journeyEndsClause({ width: 360, strip: 286, entry: 254, copyMin: 196, copyMax: 196 }))
      .toBe("at 360px a 286px strip holds 254px entries with 196px of copy column");
  });
});

describe("what the sweep says", () => {
  const tight = { width: 537, strip: 463, entry: 210, copyMin: 152, copyMax: 152 };

  it("reports the width the sweep pointed to, and that the rules were asked there again", () => {
    const clause = journeySweepClause({ tight, ends: [360, 1366] });
    expect(clause).toContain("across all 1007 widths from 360px to 1366px");
    expect(clause).toContain("the narrowest copy column the strip has is at 537px: 152px in a 463px strip");
    expect(clause).toContain("where the rules were asked again");
    expect(clause).not.toContain("one of the ends");
  });

  it("says so when the tightest width is one of the ends a rep reads at", () => {
    const clause = journeySweepClause({ tight: { ...tight, width: 360 }, ends: [360, 1366] });
    expect(clause).toContain("— the same width as one of the ends, so that end is the tightest");
  });

  it("reports a sweep that found no column at all, rather than a width of nothing", () => {
    const clause = journeySweepClause({ tight: null, ends: [360, 1366] });
    expect(clause).toContain("the strip printed no copy column to compare");
    expect(clause).not.toContain("undefined");
  });
});

describe("the entries' own boxes", () => {
  it("reports nothing for a strip whose entries hold their words", () => {
    expect(read(holding(3))).toBeNull();
  });

  it("reports the strip scrolling before any entry, because the page holds more than it draws", () => {
    const measured = { ...holding(), strip: { width: 286, scroll: 402 } };
    expect(read(measured)).toContain("The journey strip scrolls sideways at 1366px (402 > 286)");
  });

  it("tolerates one pixel of scroll in the strip and in the grid", () => {
    const measured = { ...holding(), strip: { width: 286, scroll: 287 }, actions: { width: 254, scroll: 255 } };
    expect(read(measured)).toBeNull();
  });

  it("fails a strip with no entry grid at all", () => {
    expect(read({ ...holding(), actions: null })).toContain("has no entry grid to measure at 1366px");
  });

  it("fails a grid whose own content overflows it", () => {
    const measured = { ...holding(), actions: { width: 254, scroll: 280 } };
    expect(read(measured)).toContain("entries overflow their own grid at 1366px (280 > 254)");
  });

  it("fails a strip that re-rendered into fewer entries than it opened with", () => {
    expect(read(holding(2), 3)).toContain("showed 2 entries at 1366px where it printed 3 when it opened");
  });

  it("fails a strip missing the walk", () => {
    expect(journeyEntryFailure(null, { at: "360px", count: 3 }))
      .toContain("The walk could not find the journey strip at 360px");
  });

  it("fails an entry with no label, naming it rather than the string it does not have", () => {
    const measured = { ...holding(1), entries: [entry("")] };
    expect(read(measured)).toContain("A journey strip entry prints no label at 1366px");
  });

  it("fails an entry with no reason", () => {
    const measured = { ...holding(1), entries: [entry("Build a room", { reason: "" })] };
    expect(read(measured)).toContain('The journey strip\'s "Build a room" entry prints no reason at 1366px');
  });

  it("fails an entry that lost its chevron", () => {
    const measured = { ...holding(1), entries: [{ ...entry("Build a room"), arrow: false }] };
    expect(read(measured)).toContain('"Build a room" entry lost its chevron at 1366px');
  });

  it("fails an entry wider than the column the grid gave it", () => {
    const measured = { ...holding(1), entries: [{ ...entry("Build a room"), box: { width: 254, clipped: 18 } }] };
    expect(read(measured)).toContain('"Build a room" entry is 18px wider than its own box at 1366px');
    expect(read(measured)).toContain("the chevron sits outside the column");
  });

  it("fails parts printed outside the entry, which is how a row fits by overflowing", () => {
    const measured = { ...holding(1), entries: [{ ...entry("Build a room"), escaped: 2 }] };
    expect(read(measured)).toContain(
      'let "Build a room" print 2 of its parts outside its column at 1366px',
    );
  });

  it("fails a label cut by its box, which is the half a rep chooses the tool by", () => {
    const measured = {
      ...holding(1),
      entries: [{ ...entry("Review the selected SKU in the wall builder"), labelBox: { width: 196, clipped: 40 } }],
    };
    expect(read(measured)).toContain('The journey strip cut "Review the selected SKU in the wall builder" at 1366px');
  });

  it("fails a reason cut by its box, because a containment check alone would pass it", () => {
    const measured = { ...holding(1), entries: [{ ...entry("Build a room"), reasonBox: { width: 196, clipped: 12 } }] };
    expect(read(measured)).toContain('cut the reason under "Build a room" at 1366px');
    expect(read(measured)).toContain("dropping the sentence that says why to use it");
  });

  it("tolerates one pixel of clipping in a label or a reason", () => {
    const measured = {
      ...holding(1),
      entries: [{ ...entry("Build a room"), labelBox: { width: 196, clipped: 1 }, reasonBox: { width: 196, clipped: 1 } }],
    };
    expect(read(measured)).toBeNull();
  });
});

describe("one width's reading", () => {
  const measured = {
    strip: { width: 463, scroll: 463 },
    actions: { width: 419, scroll: 419 },
    entries: [
      entry("Build a room", { copy: 152, box: 210 }),
      entry("Compare two products", { copy: 172, box: 210 }),
    ],
  };

  it("takes the strip's width, its narrowest entry and the range its columns span", () => {
    expect(journeyStripReading(measured, { width: 537 })).toEqual({
      width: 537,
      strip: 463,
      entry: 210,
      copyMin: 152,
      copyMax: 172,
    });
  });

  it("reads an entry with no copy span as a zero column, which the sweep then skips", () => {
    const broken = { ...measured, entries: [...measured.entries, { ...entry("No span"), copy: null }] };
    const reading = journeyStripReading(broken, { width: 600 });
    expect(reading.copyMin).toBe(0);
    expect(tightestJourneyColumn([reading])).toBeNull();
  });
});
