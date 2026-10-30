/**
 * What a gallery card's action row and its design entries owe a rep, read from
 * boxes.
 *
 * The walk's gallery pass seeds a store state, measures the card the browser laid
 * out, and then holds it to these rules — so the rules live here, where
 * `gallery-card-rows.test.mjs` can pin each failure and each passing shape without
 * a browser. What stays in the walk is the `page.evaluate` that produces the boxes:
 * where a wrapped row broke its lines, how many characters an ellipsis left, and
 * how many columns the gallery gave itself are facts only the layout can answer.
 *
 * Three questions, because they fail differently:
 *
 * - `galleryActionRowFailure` — does the row fit? No action leaves the card,
 *   neither the card nor the row scrolls sideways, Copy and Delete share a line
 *   and that line closes the card's right edge. A row that overflows is a control
 *   a rep cannot press; a row that leaves the edge short reads as an unfinished
 *   list.
 * - `designEntryNameFailure` / `shortNameSharedLineFailure` — is the design's name
 *   readable, and is the short one given the pair's line only when the row has room
 *   for both? The entry prints "Open template: <name>" on one clipped line, so the
 *   characters it keeps are the whole of what a rep can read before choosing
 *   between designs.
 * - `rowShapeFailure` / `rowBandComparisonFailure` — is the row the shape its state
 *   declares, at the one width where the card has all the room a two-column card
 *   ever gets? The boxes above cannot answer this: a row that spends a line still
 *   fits the card and still closes its edge, and the card's height is what pays.
 *
 * Every sentence names the surface, the state and the width, because the same card
 * is read at nine widths: "the row wrapped" without them would not say which
 * reading came apart, and the widths either side of a breakpoint are deliberately
 * different readings.
 */
import { SAVED_DESIGN_NAME_FLOOR, savedDesignNameFailure } from "./saved-design-names.mjs";
import { copyAndDeleteSplitFailure, describeBands } from "./gallery-row-bands.mjs";
import {
  bandCountSequenceFailure,
  bandCountsClause,
  readBandCountSequence,
} from "./gallery-band-counts.mjs";

const ICON_PAIR = 2;

/** How far the trailing pair stops short of the card's content edge, in pixels. */
export function iconPairInset(measured) {
  if (measured.iconButtons.length !== ICON_PAIR) return 0;
  return Math.min(...measured.iconButtons.map((button) => measured.content.right - button.right));
}

/**
 * Whether a design entry and the trailing pair were laid out on the same line.
 *
 * Read from vertical overlap rather than from equal tops: the entry and the two
 * buttons are boxes of different heights, and the pair is centred on the line the
 * link shares, so equal tops would report a shared line as two. The row this
 * answers for is the short-named one — a name that fits beside Copy and Delete
 * must not be given a line of its own, because the row then costs the card a line
 * and breaks where nothing needed to.
 */
export function entrySharesLineWithIconPair(entry, measured) {
  if (!entry || measured.iconButtons.length !== ICON_PAIR) return false;
  const pairTop = Math.min(...measured.iconButtons.map((button) => button.top));
  const pairBottom = Math.max(...measured.iconButtons.map((button) => button.bottom));
  const overlap = Math.min(entry.bottom, pairBottom) - Math.max(entry.top, pairTop);
  const shortest = Math.min(entry.bottom - entry.top, pairBottom - pairTop);
  return shortest > 0 && overlap >= shortest / 2;
}

/**
 * The entry with the least name to show, which is the one the sharing promise is
 * about: picking by position made the reading follow the seed's order, so a seed
 * written the other way round measured the wider entry and reported the phone floor
 * as holding a name that never needed it.
 */
export function narrowestDesignEntry(measured) {
  return measured.designEntries.reduce(
    (narrowest, candidate) => ((candidate.labelWidth ?? candidate.width) < (narrowest.labelWidth ?? narrowest.width)
      ? candidate
      : narrowest),
    measured.designEntries[0],
  );
}

/**
 * The entry that printed the fewest characters of its name, which is the case a
 * summary reports as the tightest the run met: a floor read off the widest phone says
 * nothing about the card that came closest to it, and the pick has to follow what the
 * clip left rather than the order the store happens to list the designs in.
 */
export function tightestPrintedEntry(measured) {
  return measured.designEntries.reduce(
    (tightest, candidate) => ((candidate.nameCharacters ?? 0) < (tightest.nameCharacters ?? 0)
      ? candidate
      : tightest),
    measured.designEntries[0],
  );
}

/**
 * The entry with the most name to lose, which is the example a summary prints beside
 * its floor. With three designs the first one is whichever the seed wrote first, so a
 * positional pick names any of them as if it were the worst case; the worst case here
 * is the name with the most characters a clip could take away.
 */
export function longestNamedEntry(measured) {
  return measured.designEntries.reduce(
    (longest, candidate) => ((candidate.name?.length ?? 0) > (longest.name?.length ?? 0)
      ? candidate
      : longest),
    measured.designEntries[0],
  );
}

/**
 * What every card's row is held to, whatever it carries: no action leaves the
 * card, neither the card nor its row scrolls sideways, the trailing pair shares a
 * line, and that line ends on the card's right edge.
 *
 * `expectedActions` is what a card that finished rendering carries — Detail,
 * Resume, one link per saved design, Copy and Delete — so a row caught mid-render
 * fails here rather than reading as a shorter row. The checks run in the order the
 * eye reads the row: the controls are there, they stay inside the card, the pair
 * that closes it is one item, and it lands on the edge.
 */
export function galleryActionRowFailure(measured, { at, room, expectedActions } = {}) {
  if (measured.actionCount < expectedActions) {
    return `Gallery card for ${room} rendered ${measured.actionCount} actions at ${at}; the action row was not on screen.`;
  }
  if (measured.escaped.length) {
    return `Gallery card actions left the card at ${at}: ${measured.escaped.join(", ")} (${room}).`;
  }
  if (measured.card.scroll > measured.card.width + 1) {
    return `Gallery card overflows at ${at} (${measured.card.scroll} > ${measured.card.width}) (${room}).`;
  }
  if (measured.row.scroll > measured.row.width + 1) {
    return `Gallery card action row overflows at ${at} (${measured.row.scroll} > ${measured.row.width}) (${room}).`;
  }
  if (measured.iconButtons.length !== ICON_PAIR) {
    return `Gallery card for ${room} rendered ${measured.iconButtons.length} icon buttons at ${at}; Copy and Delete should close the action row.`;
  }
  // Widest first, and said as one button rather than as a list — the rule the hero
  // header's children are held to. Copy and Delete share this line, so a pair pushed
  // out of the card is usually one defect seen twice: the box to change is whichever
  // runs furthest past the content box. A list of boxes left the reader to subtract
  // them and decide which one had actually gone, which is the work a failure should
  // have done. The rest are named without boxes, so the message says the pair came
  // apart without asking anyone to compare arithmetic.
  const lostIconButtons = measured.iconButtons
    .map((button) => ({
      button,
      past: Math.max(measured.content.left - button.left, button.right - measured.content.right),
    }))
    .filter((entry) => entry.past > 1)
    .sort((left, right) => right.past - left.past);
  if (lostIconButtons.length) {
    const [widest, ...also] = lostIconButtons;
    const quoted = (entry) => `"${entry.button.label}"`;
    return `Gallery card for ${room} lets ${quoted(widest)} run ${widest.past}px past its own content box `
      + `(${measured.content.left}-${measured.content.right}px) at ${at}`
      + `${also.length ? `, the widest of ${lostIconButtons.length} controls that leave it (${also.map(quoted).join(", ")})` : ""}`
      + ": Copy and Delete have to close the row inside the card.";
  }
  // Which line each of the pair landed on, from `copyAndDeleteSplitFailure` — the
  // same module whose `describeBands` prints the row's band lists, so this failure and
  // the band-count ones cannot describe one row two ways.
  const splitFailure = copyAndDeleteSplitFailure({
    room,
    at,
    iconButtons: measured.iconButtons,
    bands: measured.bands,
  });
  if (splitFailure) return splitFailure;
  // Closing the row's right edge: a row that wraps along the design links leaves
  // the trailing pair at the start of their own line unless something in front of
  // them takes the space, so the card's right edge would be set by whatever wrapped
  // above them. Copy and Delete are the last actions a rep reads, and a row they do
  // not close reads as an unfinished list.
  const inset = iconPairInset(measured);
  if (inset > 1) {
    return `Gallery card left Copy and Delete ${inset}px short of the card's content edge at ${at}: `
      + `the trailing pair has to close the row's right edge (${room}).`;
  }
  return null;
}

/**
 * A width that states its column count is half of a promise about the layout: the
 * pair either side of the three-to-two change has to read 3 and then 2, or the card
 * it was added for — the widest two-column card — is not on screen.
 */
export function galleryColumnsFailure(columns, { at, expected } = {}) {
  if (expected === undefined || columns === expected) return null;
  return `The gallery laid out ${columns} columns at ${at}, where its three-to-two change puts ${expected}: `
    + "the widths either side of that change are what hold the widest two-column card, so a breakpoint "
    + "that moved out from between them leaves it unmeasured.";
}

/**
 * The state is part of the reading: a row carrying a link this state does not have
 * is not the row under test, whatever its boxes say.
 */
export function designLinkCountFailure(measured, { at, room, stateKey, expected } = {}) {
  if (measured.designEntries.length === expected) return null;
  return `Gallery card for ${room} carries ${measured.designEntries.length} design `
    + `link${measured.designEntries.length === 1 ? "" : "s"} at ${at}; the "${stateKey}" row has `
    + `${expected}, so the store state under test is not the one measured.`;
}

/**
 * What a design entry owes the rep: enough of the design's name to be a name.
 *
 * The entry prints "Open template: <name>" on one clipped line, so its width is the
 * whole of what is readable — a row that fits by sharing a line with another action
 * prints the verb and one or two letters, which is the same card with the name gone.
 * The count is the browser's, not the rule's: the stylesheet gives an entry a floor
 * at phone width and wraps it onto a line of its own below that, and this holds what
 * was printed rather than the rule that was supposed to apply. Every stub is
 * reported, because a row that cut two names is two designs a rep cannot tell apart.
 */
export function designEntryNameFailure(measured, { at, room, floor = SAVED_DESIGN_NAME_FLOOR } = {}) {
  if (!measured.designEntries.length) {
    return `Gallery card for ${room} carries no design entry to measure at ${at}.`;
  }
  const stubs = measured.designEntries
    .filter((entry) => entry.nameCharacters === null || entry.nameCharacters < floor)
    .map((entry) => savedDesignNameFailure({
      surface: "gallery card",
      room,
      design: entry.name,
      visible: entry.nameCharacters === null ? 0 : entry.nameCharacters,
      characters: entry.name.length,
      floor,
      at,
    }));
  return stubs.length ? stubs.join(" ") : null;
}

/**
 * The short name's shared line, held to the room the row actually had.
 *
 * Whether the pair could have shared the name's line is asked of the page: the
 * label's unellipsized width plus the pair's own, against the width the design line
 * has. The column count alone was the wrong question — the three-column card at
 * 1151px is narrower than any two-column card, and at 300px of row a 253px name and
 * the 110px pair cannot share a line. There the name takes a line of its own, which
 * is the wrap the stylesheet promises wherever the row cannot hold both; where the
 * card shares its row and has the room, a name on its own line has spent one.
 */
export function shortNameSharedLineFailure(measured, { at, room, columns } = {}) {
  const entry = narrowestDesignEntry(measured);
  const reading = sharedLineReading(measured, { columns });
  if (columns <= 1 || !reading.hasRoom || reading.sharedLine) return null;
  return `Gallery card for ${room} gave its short design name a line of its own at ${at} `
    + `in a ${columns}-column gallery, where its design line has ${reading.room}px for the ${entry?.labelWidth}px name `
    + `and the ${reading.pairWidth}px pair: "${entry?.name}" is the row's narrowest entry at ${entry?.width}px `
    + `(${entry?.left}-${entry?.right}px) and the trailing pair starts at `
    + `${Math.min(...measured.iconButtons.map((button) => button.top))}px. `
    + "Where the card shares its row and has room for both, the link shares the line Copy and Delete are on.";
}

/**
 * One width's account of the short name's line, for the summary: the evidence the
 * sharing promise was decided on, kept beside the answer rather than recomputed.
 *
 * The pair's span is the furthest right edge minus the furthest left one, not the
 * last child's right minus the first child's left: the group is what a rep reads as
 * the pair, and the width should not depend on which of the two the DOM lists first.
 */
export function sharedLineReading(measured, { columns } = {}) {
  const entry = measured.designEntries.length ? narrowestDesignEntry(measured) : null;
  const pairWidth = measured.iconButtons.length === ICON_PAIR
    ? Math.max(...measured.iconButtons.map((button) => button.right))
      - Math.min(...measured.iconButtons.map((button) => button.left))
    : 0;
  // The design line is what has to hold both — the row's whole width when the line
  // has one of its own, and less than that at 1151px, where the row is a narrow
  // three-column card.
  const room = measured.designGroup?.width ?? measured.content.right - measured.content.left;
  const entryNeeds = (entry?.labelWidth ?? entry?.width ?? 0) + pairWidth;
  return {
    columns,
    sharedLine: entrySharesLineWithIconPair(entry, measured),
    entry: entry?.width ?? null,
    pairWidth,
    card: measured.card.width,
    room,
    needs: entryNeeds,
    hasRoom: entryNeeds <= room,
  };
}

/**
 * The row's bands at the width where its card is widest, held to the count its state
 * declares.
 *
 * The boxes already say nothing left the card, so a row that spreads over one band
 * more than its state has is the shape going wrong where nothing else could see it
 * — an entry given a line it did not need, or a group breaking through a pair. The
 * count is read where the row has the most room it will ever have, because at any
 * other width the same number could be the layout giving a narrower card its bands
 * rather than the state's own shape.
 */
export function rowShapeFailure(measured, { at, state } = {}) {
  if (typeof state?.rowLines !== "number") {
    return `The "${state?.key}" row state declares no row shape, so ${at} — the width where the card is as wide `
      + "as a two-column card gets — has no band count to hold it to. Declare `rowLines` on the state "
      + "or drop `rowShape` from the width.";
  }
  if (measured.lines === state.rowLines) return null;
  return `Gallery card for ${state.room} wrapped its action row over ${measured.lines} lines at ${at}, where the `
    + `"${state.key}" row has ${state.rowLines}: the card there is ${measured.card.width}px wide, the widest `
    + "a two-column card gets, so the row has all the room its shape asks for. It printed "
    + `${describeBands(measured.bands)}.`;
}

/** A marked width with nothing to be held to, which is a declaration to add rather than a row to fix. */
export function missingBandComparisonBaseFailure({ stateKey, width } = {}) {
  return `The "${stateKey}" row has no band count at the widest card's width, so the ${width}px `
    + "reading has nothing to be held to. Declare `rowShape` on that width or drop the comparison.";
}

/**
 * A marked width's band count against the widest card's.
 *
 * The number promised is always the widest card's, read off the page: the tablet's
 * card is narrower than that one, so an extra band there is a line the row spent on
 * width alone and fewer is a rule scoped below the widest card; the top of the
 * single-column block is wider than it, so only more bands there says a rule inside
 * that block spends a line — a row with fewer bands has simply been given room.
 */
export function rowBandComparisonFailure({ room, stateKey, comparison, within } = {}) {
  if (!within) return missingBandComparisonBaseFailure({ stateKey, width: comparison.width });
  const held = comparison.hold === "same"
    ? comparison.lines === within.lines
    : comparison.lines <= within.lines;
  if (held) return null;
  const layout = comparison.columns === within.columns
    ? `both widths are inside the ${comparison.columns}-column band, so the shape of the row has to be the same one`
    : `the gallery lays out ${comparison.columns} column${comparison.columns === 1 ? "" : "s"} there against `
      + `${within.columns} at the widest card, and that card is ${comparison.card}px against ${within.card}px, so `
      + `${comparison.hold === "same" ? "the shape of the row has to be the same one" : "the row has at least the room the widest card's row had"}`;
  return `Gallery card for ${room} wrapped its action row over ${comparison.lines} lines at ${comparison.width}px, `
    + `where the widest card at ${within.width}px has ${within.lines}: ${layout}. `
    + `At ${comparison.width}px it printed ${comparison.bands}.`;
}

/** One width's band-count comparison, in the shape the summary and the holds read. */
export function bandComparison({ width, columns, hold, measured }) {
  return {
    width,
    columns,
    hold,
    lines: measured.lines,
    card: measured.card.width,
    bands: describeBands(measured.bands),
  };
}

/**
 * A row state's clause in the pass summary, or the sentence saying why the counts
 * cannot be printed in the first place.
 *
 * The sequence those counts print in comes from the promises themselves, not from
 * the order the walk happens to list them: each width's own `rowShape`/`shape`
 * marker decides where its count goes, and within one promise the wider width is
 * printed first. That order and the words for it live in `gallery-band-counts.mjs`,
 * with a spec — the sentence is the one part of this pass a green run cannot read.
 */
export function rowStateClause(state, reading) {
  const sequence = readBandCountSequence({
    sources: [
      reading.row ? { promise: "declares", width: reading.row.width, lines: reading.row.lines } : null,
      ...(reading.shapeComparisons ?? []).map((comparison) => ({
        promise: comparison.hold,
        width: comparison.width,
        lines: comparison.lines,
      })),
    ].filter(Boolean),
  });
  if (!sequence.ok) {
    return { failure: bandCountSequenceFailure({ unplaced: sequence.unplaced, promises: sequence.promises }) };
  }
  const lines = `${reading.lines} line${reading.lines === 1 ? "" : "s"}`;
  const bands = bandCountsClause(sequence.counts);
  const clause = `${state.headline}: ${reading.inset}px left over at 360px, wrapped over ${lines}${bands}`;
  return {
    clause: reading.sharedLine === undefined
      ? clause
      : `${clause}, where the entry's phone floor ${reading.sharedLine ? "still leaves the link on" : "takes"} Copy and Delete's line`,
  };
}

/**
 * Every width that states a column count, widest first, saying where the short
 * name's line went — so the two-column card at the change and the tablet's are read
 * side by side rather than one standing in for the other, and the width where the
 * row is too narrow for both says so, because a wrap there is the layout's answer
 * rather than a missing reading.
 */
export function sharedLineSummaryClause(readings = new Map()) {
  if (!readings.size) return "";
  const clauses = [...readings.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([width, reading]) => {
      const columns = `${reading.columns} column${reading.columns === 1 ? "" : "s"}`;
      return reading.sharedLine
        ? `at ${width}px the gallery lays out ${columns} and its ${reading.card}px card gives the entry ${reading.entry}px, so the link shares Copy and Delete's line`
        : `at ${width}px the gallery lays out ${columns} and its design line has ${reading.room}px for a ${reading.needs}px name-plus-pair, so the name takes a line of its own there`;
    });
  return `The short name's line was read at every width that states a column count: ${clauses.join("; ")}. `;
}
