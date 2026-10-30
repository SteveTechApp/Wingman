/**
 * What the journey strip's opened entries owe a rep, and where its tightest column is.
 *
 * `FeatureJourneyStrip` is a `<details>` under every route's page content, so the list
 * of next tools is a state a rep reaches by opening "More tools" — a walk that measured
 * the closed strip would measure a summary. Each entry is a flex row: a copy column
 * holding the label (`strong`) over its reason (`small`), then a chevron. The copy
 * column is the item that gives ground, and both ways of giving it are read here — an
 * entry that fits by overflowing puts its chevron outside its own box, where the strip's
 * border clips it, and one that fits by squeezing the sentence prints
 * `Review the selected SKU in…`. So the reason is read past its box as well as inside
 * it: a truncation passes every containment check while hiding the half a rep chooses
 * by.
 *
 * Two questions, and only one of them is about a particular width.
 *
 * `journeyEntryFailure` is the containment and truncation promise, asked at the widths a
 * rep reads at. `tightestJourneyColumn` is the selection: the entry grid is
 * `repeat(auto-fit, minmax(210px, 1fr))`, so the narrowest copy column is the one just
 * before an extra 210px track fits, and where that lands depends on the page's own inset
 * and the shell's sidebar rather than on a breakpoint anyone wrote down. The sweep is
 * therefore a reading of 1007 widths, and the rule over those readings — smallest column
 * wins, a plateau keeps its narrowest width — is arithmetic on a list, which is exactly
 * the kind of rule that used to sit in the walk where nothing could hold it.
 *
 * The projects page is the tightest strip the app prints, which is why it is the one
 * measured. The page keeps its own inset, so at 360px this strip holds 286px of content
 * with 254px entries, against 338px holding 306px entries on the templates, ingest and
 * recommendations pages; at 1366px it is 1260px against their 1296px. A pass on one of
 * those pages would report room this row does not have.
 */

/**
 * The widths the journey strip is swept one pixel at a time, both ends included.
 *
 * 360px and 1366px are the ends a rep reads at, not necessarily the tightest place in
 * between: the grid re-columns wherever a whole extra 210px track fits, which is not a
 * width anybody wrote down.
 */
export const JOURNEY_SWEEP = { from: 360, to: 1366 };

/**
 * The width whose copy column is narrowest, out of the sweep's readings.
 *
 * The narrowest column is where the promise the pass makes is hardest to keep — a label
 * or a reason is cut by the box it is in, so the smallest box is the one that would cut
 * — and the pass used to assume that was 360px. A reading with no copy column is skipped
 * rather than counted as zero, because a strip that printed nothing at one width is a
 * missing reading rather than the tightest one.
 *
 * A tie keeps the narrowest width that reached the minimum: the readings arrive in
 * ascending width order, so the first to reach a minimum wins, and a plateau of identical
 * columns is one reading at the screen a rep holds.
 */
export function tightestJourneyColumn(readings = []) {
  let tightest = null;
  for (const reading of readings) {
    if (!reading || !reading.copyMin) continue;
    if (!tightest || reading.copyMin < tightest.copyMin) tightest = { ...reading };
  }
  return tightest;
}

/**
 * A reading's copy column as one phrase: one number when the entries agree, a range when
 * they do not.
 *
 * The entries are one grid track each, so a range is the layout's own answer rather than
 * a defect — the widest and narrowest entry sit at different widths when a long label
 * pushes its own column. Print it as a single number and the summary claims a column the
 * page never had.
 */
export function describeJourneyColumn(reading) {
  if (!reading) return "no reading";
  return reading.copyMin === reading.copyMax
    ? `${reading.copyMin}px`
    : `${reading.copyMin} to ${reading.copyMax}px`;
}

/** One end of the sweep, as the summary names it. */
export function journeyEndsClause(reading) {
  return `at ${reading.width}px a ${reading.strip}px strip holds ${reading.entry}px entries with `
    + `${describeJourneyColumn(reading)} of copy column`;
}

/**
 * What the sweep found, and whether that means anything about the ends.
 *
 * `tight` is the width the sweep pointed to, measured again with the box rules — so the
 * sentence is about a width that was read twice rather than one inferred from the
 * narrowest number. When that width is one of the ends, the summary says so: a reader
 * comparing a phone reading with "the tightest column" otherwise cannot tell whether the
 * sweep found a narrower place in between or merely confirmed the end they were already
 * looking at.
 */
export function journeySweepClause({ tight, ends = [], sweep = JOURNEY_SWEEP } = {}) {
  const swept = sweep.to - sweep.from + 1;
  if (!tight) {
    return `Swept one pixel at a time across all ${swept} widths from ${sweep.from}px to ${sweep.to}px, `
      + "the strip printed no copy column to compare.";
  }
  return `Swept one pixel at a time across all ${swept} widths from ${sweep.from}px to ${sweep.to}px, `
    + `the narrowest copy column the strip has is at ${tight.width}px: ${describeJourneyColumn(tight)} `
    + `in a ${tight.strip}px strip holding ${tight.entry}px entries, where the rules were asked again`
    + (ends.includes(tight.width) ? " — the same width as one of the ends, so that end is the tightest" : "")
    + ".";
}

/**
 * One width's reading, out of the boxes the walk measured.
 *
 * The strip's own width, its narrowest entry and the range its copy columns span — the
 * numbers the summary prints and the sweep compares. A reading is built here rather than
 * in the walk so the two consumers cannot disagree about which entry the numbers come
 * from: the sweep takes the smallest copy column across widths, and the summary names the
 * strip and entry widths that column was measured in.
 *
 * An entry with no copy span contributes 0, which is what makes that width's reading a
 * zero column — the sweep skips it rather than calling it the tightest, because a strip
 * that printed no column at one width is a missing reading and not a narrow one.
 */
export function journeyStripReading(measured, { width } = {}) {
  const copyWidths = measured.entries.map((entry) => entry.copy?.width ?? 0);
  const entryWidths = measured.entries.map((entry) => entry.box.width);
  return {
    width,
    strip: measured.strip.width,
    entry: Math.min(...entryWidths),
    copyMin: Math.min(...copyWidths),
    copyMax: Math.max(...copyWidths),
  };
}

/**
 * The strip's own boxes at one width, as the first sentence that fails or `null`.
 *
 * `count` is how many entries the strip printed when it was opened, and it is compared
 * with what this width shows rather than with a constant: a list that re-rendered into
 * fewer entries would otherwise have every rule below pass on the entries that survived.
 * A strip that scrolls sideways, or an entry grid whose own content overflows it, is
 * reported before the entries are: an entry that fits its column inside a grid that does
 * not fit the strip is a page holding more than it draws, and naming the entry would send
 * a reader to the wrong box.
 */
export function journeyEntryFailure(measured, { at, count } = {}) {
  if (!measured) {
    return `The walk could not find the journey strip at ${at}, so the entries a rep opens were not measured.`;
  }
  if (measured.strip.scroll > measured.strip.width + 1) {
    return `The journey strip scrolls sideways at ${at} (${measured.strip.scroll} > ${measured.strip.width}), `
      + "so an entry is wider than the page that holds it.";
  }
  if (!measured.actions) {
    return `The opened journey strip has no entry grid to measure at ${at}.`;
  }
  if (measured.actions.scroll > measured.actions.width + 1) {
    return `The journey strip's entries overflow their own grid at ${at} `
      + `(${measured.actions.scroll} > ${measured.actions.width}).`;
  }
  if (measured.entries.length !== count) {
    return `The journey strip showed ${measured.entries.length} entries at ${at} where it printed ${count} `
      + "when it opened.";
  }

  for (const entry of measured.entries) {
    const name = entry.label || "(an entry with no label)";
    if (!entry.label) {
      return `A journey strip entry prints no label at ${at}, so the row cannot say where it goes.`;
    }
    if (!entry.reason) {
      return `The journey strip's "${name}" entry prints no reason at ${at}.`;
    }
    if (!entry.arrow) {
      return `The journey strip's "${name}" entry lost its chevron at ${at}.`;
    }
    // The entry's own box is the column the grid gave it: content that pushed it wider
    // shows up here even when the label's box still fits.
    if (entry.box.clipped > 1) {
      return `The journey strip's "${name}" entry is ${entry.box.clipped}px wider than its own box at ${at}, `
        + "so the chevron sits outside the column.";
    }
    if (entry.escaped) {
      return `The journey strip let "${name}" print ${entry.escaped} of its parts outside its column at ${at}; `
        + "the label, the reason and the chevron stay inside the entry.";
    }
    if (entry.labelBox.clipped > 1) {
      return `The journey strip cut "${name}" at ${at}, which spends the label a rep chooses the tool by.`;
    }
    if (entry.reasonBox.clipped > 1) {
      return `The journey strip cut the reason under "${name}" at ${at}, so the entry fits by dropping the `
        + "sentence that says why to use it.";
    }
  }
  return null;
}
