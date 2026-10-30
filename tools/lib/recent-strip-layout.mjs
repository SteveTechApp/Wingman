/**
 * What the guided Home strip's three recent cards owe a rep, read from boxes.
 *
 * The strip is three cards of unequal width, because each card's leading status chip
 * is its own grid cell and the chips are different lengths. That one fact is what
 * every rule below rests on, and it is why the readings cannot be a single number: a
 * reading is only held when it is compared with the column of the card printing it.
 * The walk measures the boxes — where each flag sits, how wide its column came out,
 * what the saved-design link left visible — and this module decides what those boxes
 * mean, so the sentence a reader meets when the walk stops can be read and held
 * without a dev server, three routes and nine widths.
 *
 * The rules are asked in the order a reader would fix them: a card's own boxes, then
 * the design link's name, then the column the reading has to fit, then which card
 * plays which role, then the strip's row shape, then the divergence the seeding
 * bought, then the two edges of the phone block and the chevron's own edge. One
 * function asks all of them per width (`readRecentStripWidth`), for the reason
 * `proposal-step-cards.mjs` gives: a caller that could ask one rule and forget the
 * others would report a fit for a width where the row was no longer the row.
 *
 * The sentences themselves live in `recent-strip-rows.mjs` and `saved-design-names.mjs`
 * — a failure is the only part of a measurement a reader ever sees, so it has a spec of
 * its own. What is here is the arithmetic that decides which sentence fires.
 */
import { SAVED_DESIGN_NAME_FLOOR, savedDesignNameFailure } from "./saved-design-names.mjs";
import {
  recentColumnDivergenceFailure,
  recentColumnMatchFailure,
  recentDesignMissingFailure,
  recentDesignNameFailure,
  recentFlagCountFailure,
  recentFlagShareLineFailure,
  recentFlagStackFailure,
  recentRoleFailure,
  recentRowShapeFailure,
  recentShortChipFailure,
  recentSqueezeFailure,
} from "./recent-strip-rows.mjs";

/**
 * The one seeded chip whose label is shorter, and so the one whose card keeps the
 * widest copy column.
 */
export const RECENT_SHORT_CHIP = "caution";

/**
 * How far apart the copy columns have to be where the chip is the card's leading cell.
 *
 * A chip that stopped widening its card's column above the block — one given a fixed
 * grid track, or one taken out of the row above the block — leaves the columns equal
 * and this reading is what says so.
 *
 * One floor serves both readings: the spread between the widest and narrowest columns,
 * and the margin by which the card wearing the short chip has to be the widest of the
 * three. They are two questions about one measurement — whether the columns differ at
 * all, and which card's chip they differ by — so a second number would only be another
 * thing to keep in step with the runners' fallback font.
 */
export const RECENT_SEEDED_DIVERGENCE = 8;

/**
 * The width the strip stops laying its cards out as one row.
 *
 * The stylesheet stacks them below 1181px, one card per row, because a third of a
 * narrower strip cannot hold the widest reading a card carries beside its leading chip;
 * the walk reads both sides of it (1181px and 1180px) so a breakpoint moved to another
 * width fails here instead of leaving the row shape unmeasured.
 */
export const RECENT_STRIP_STACK_BELOW = 1180;

/**
 * Every width that says something about a copy column, widest first.
 *
 * The laptop strip; both sides of the block whose top lets the flags wrap (561 and 560);
 * the phone width the strip is most often read at (390); both sides of the chevron's own
 * edge (383 and 381); and the narrowest phone (360). The table lives here rather than in
 * the walk because the readings and the widths they were taken at are one promise, and a
 * width added in the walk alone would be a reading no summary prints.
 */
export const RECENT_STRIP_VIEWPORTS = [
  { width: 1366, height: 900 },
  { width: 1181, height: 900 },
  { width: 1180, height: 900 },
  { width: 561, height: 800 },
  { width: 560, height: 800 },
  { width: 390, height: 800 },
  { width: 383, height: 800 },
  { width: 381, height: 800 },
  { width: 360, height: 800 },
];

/**
 * How many lines a card's flags occupy.
 *
 * By vertical overlap rather than by equal tops: the chip is a shorter box than the
 * re-confirm action beside it and sits centred on the same row, so equal tops read one
 * line as two. The bands are grown in reading order, so a flag that starts inside a band
 * already found joins it rather than opening a second.
 */
export function flagLines(flags = []) {
  const bands = [];
  for (const flag of [...flags].sort((left, right) => left.top - right.top)) {
    if (bands.some((band) => flag.top < band.bottom - 1 && flag.bottom > band.top + 1)) continue;
    bands.push({ top: flag.top, bottom: flag.bottom });
  }
  return bands.length;
}

/** The widest reading a card carries, which is what its column has to hold. */
function widestFlag(card) {
  return card.flags.reduce(
    (widest, flag) => (flag.width > widest.width ? { ...flag, width: flag.width } : widest),
    { width: 0, name: "no reading" },
  );
}

/**
 * Each card's column, its widest reading and the slack between them.
 *
 * Per card, because the cards' columns are not the same and neither are their readings:
 * the number a reader checks a squeeze against is the one belonging to the card it
 * happens on. This used to record only the card with the least slack and report its
 * reading, which held the tightest case and left the other card's reading compared with
 * nothing — a divergence between two columns would keep one reading 1px inside its own
 * column while the number the pass printed belonged to the other card.
 */
function columnsOf(cards = []) {
  return cards.map((card) => {
    const reading = widestFlag(card);
    const copy = card.copy ?? 0;
    return {
      id: card.id,
      // The room the card is for, as the card prints it, and the flag the reading
      // belongs to, kept apart because the summary prints both.
      room: card.name,
      chip: card.chip,
      copy,
      widest: reading.width,
      reading: reading.name,
      slack: copy - reading.width,
    };
  });
}

/**
 * Everything one width of the strip is held to, as the first sentence that fails or
 * `null` with the reading the summary prints.
 *
 * `cards` is the measurement — one entry per seeded room, with its boxes, its flags and
 * the characters its design link left visible. `designs` maps a room id to the design
 * this pass saved the room as, so a link naming another design is caught rather than
 * measured for its length. A card the strip did not print at all is the walk's own
 * check, because only the walk still holds the room's seeded name.
 */
export function readRecentStripWidth(cards = [], { width, designs = {} } = {}) {
  const at = `${width}px`;
  if (!cards.length) return { failure: null, reading: null };
  const failed = (failure) => ({ failure, reading: null });

  for (const card of cards) {
    if (!card.row) {
      return failed(`The recent card for ${card.name} has no flag row to measure at ${at}.`);
    }
    if (card.row.clipped > 1) {
      return failed(`The recent card's flag row is ${card.row.clipped}px wider than its column at ${at}.`);
    }
    // The block whose top lets the flags wrap is read at the width, not trusted to the
    // stylesheet: below it a long reading moves to a second line, and a row that stopped
    // wrapping squeezes the reading instead.
    if (width <= 560 && (card.row.display !== "flex" || card.row.wrap !== "wrap")) {
      return failed(
        `The recent card's flag row no longer wraps at ${at} (${card.row.display}/${card.row.wrap}), so a long reading is squeezed instead of moving to a second line.`,
      );
    }
    for (const flag of card.flags) {
      if (flag.escaped) {
        return failed(`A recent card flag left the card at ${at}: ${flag.name}.`);
      }
      if (flag.clipped > 1) {
        return failed(`A recent card flag is ${flag.clipped}px wider than its own box at ${at}: ${flag.name}.`);
      }
      if (flag.label > 1) {
        return failed(
          `A recent card flag truncated its label at ${at}: ${flag.name} printed ${JSON.stringify(flag.labelText)}.`,
        );
      }
    }
  }

  // The saved-design link, read at every width the strip is measured at. It is the one
  // cell on the card whose payload is a design's name, and it is a single nowrap line
  // clipped by the copy column — but the reading used to stop at the stacked band's edge,
  // on the argument that the column widens there, which left the phone with no reading at
  // all: a rule that squeezed the link under 1181px passed silently. The stylesheet's own
  // floor (`min-width: min(30ch, 100%)` on the link) makes the promise at every width, so
  // this asks it at every width. The name is held to the store's own row rather than only
  // measured for its length: `assertGalleryCardActions` seeds designs for these same
  // rooms, and a merge that appended instead of replacing would have this reading taken
  // on the earlier save.
  for (const card of cards) {
    const expected = designs[card.id];
    if (!card.design) {
      return failed(recentDesignMissingFailure({ room: card.name, expected, at }));
    }
    if (card.design.name !== expected) {
      return failed(recentDesignNameFailure({ room: card.name, expected, printed: card.design.name, at }));
    }
    if (card.design.escaped) {
      return failed(`The recent card for ${card.name} printed its saved-design link outside the card at ${at}.`);
    }
    if (card.design.visible < SAVED_DESIGN_NAME_FLOOR) {
      return failed(
        savedDesignNameFailure({
          surface: "recent card",
          room: card.name,
          design: expected,
          visible: card.design.visible,
          characters: expected.length,
          floor: SAVED_DESIGN_NAME_FLOOR,
          at,
        }),
      );
    }
  }

  const columns = columnsOf(cards);
  // The strip's widest reading, for the summary: it reports what the strip prints, not
  // what the tightest card happens to print, because the two are different numbers once
  // the columns diverge.
  const widestInStrip = columns.reduce((widest, card) => (card.widest > widest.widest ? card : widest));
  const tightestHere = columns.reduce((min, card) => (card.slack < min.slack ? card : min));

  // One pixel over is tolerated, the way every other box in this walk is: the app names
  // `Geist Variable`, `Geist` and `Inter` in `--wm-font` with no `@font-face` in the
  // tree, so the runner's fallback can move a chip by a pixel. Measured 0px to spare at
  // the chevron's edge, so a squeeze of 2px or more is a real one.
  for (const card of columns) {
    if (card.slack >= -1) continue;
    return failed(
      recentSqueezeFailure({
        room: card.room,
        reading: card.reading,
        widest: card.widest,
        copy: card.copy,
        slack: card.slack,
        width,
        at,
      }),
    );
  }

  // Which card is the stale one, and which are the cleared ones, is read off the page
  // rather than taken from the seed's order. Naming them `cards[0]` and `cards[1]` made
  // the role follow the seeded id list: a list written the other way round measured a
  // cleared card as the stale one, and the flags count reported that as a missing action
  // rather than as the seed being ordered differently. The card carrying the action that
  // settles its survey is the stale one, and the strip holds exactly one.
  const stale = cards.find((card) => card.settles);
  const cleared = cards.filter((card) => !card.settles);
  if (!stale || !cleared.length || cards.filter((card) => card.settles).length !== 1) {
    return failed(
      recentRoleFailure({
        cards: cards.map((card) => ({ name: card.name, settles: card.settles, flags: card.flags.length })),
        at,
      }),
    );
  }

  // The strip's own row shape: three cards on one row above the width it stacks at, one
  // card per row below it. A breakpoint moved to another width leaves every reading above
  // green — each card still fits the column it is given — and only this says the third
  // card stopped sitting beside the other two, which is the row it was printed for.
  const rows = new Set(cards.map((card) => card.top)).size;
  const stacked = width <= RECENT_STRIP_STACK_BELOW;
  if (stacked ? rows !== cards.length : rows !== 1) {
    return failed(recentRowShapeFailure({ cards, rows, at, stacked, stackBelow: RECENT_STRIP_STACK_BELOW }));
  }

  // The divergence the columns have is the walk's own seeding, and it is read instead of
  // assumed: a chip that stopped widening its card's column above the block would leave
  // every column the same width with every check above still green, which is one column
  // measured three times and reported as three. Below the block the same reading runs the
  // other way, because the chip has a row of its own there and the divergence is supposed
  // to be gone.
  const copies = columns.map((card) => card.copy);
  const divergence = Math.max(...copies) - Math.min(...copies);
  // Which shape the strip gives the leading chip is read with the widths, not assumed: it
  // has a row of its own in the phone block and in the three-column band, where a card is
  // narrower than the strip, and it is the card's leading grid cell in the single-column
  // band between them. The divergence is held to that shape — apart where the chip is a
  // cell, matched where it is out of the row — so a rule that moved either edge of either
  // band is reported as the columns it actually printed.
  const chipInOwnRow = width <= 560 || width >= RECENT_STRIP_STACK_BELOW + 1;
  if (!chipInOwnRow && divergence < RECENT_SEEDED_DIVERGENCE) {
    return failed(
      recentColumnDivergenceFailure({
        columns,
        divergence,
        chips: columns.map((card) => JSON.stringify(card.chip)),
        seededDivergence: RECENT_SEEDED_DIVERGENCE,
        at,
      }),
    );
  }
  if (chipInOwnRow && divergence > 1) {
    return failed(
      recentColumnMatchFailure({
        columns,
        divergence,
        chips: columns.map((card) => JSON.stringify(card.chip)),
        at,
      }),
    );
  }

  // Where the width came from, which the max-to-min reading above cannot say: the two long
  // labels are the same length, so the only column the seed decides here is the short
  // chip's, and it belongs to the third card. If that card's chip stopped widening its
  // column the spread above would still show — the two long labels leave the columns
  // unequal on their own — so the ordering is read instead of the spread: the card wearing
  // `caution` keeps the widest column, and each of the two wearing an eleven-character
  // label keeps a narrower one.
  if (!chipInOwnRow) {
    const shortCard = columns.find((card) => card.chip === RECENT_SHORT_CHIP);
    const longCards = columns.filter((card) => card.chip !== RECENT_SHORT_CHIP);
    const narrowBy = shortCard && longCards.length === columns.length - 1
      ? Math.min(...longCards.map((card) => shortCard.copy - card.copy))
      : null;
    if (narrowBy === null || narrowBy < RECENT_SEEDED_DIVERGENCE) {
      return failed(
        recentShortChipFailure({
          columns,
          at,
          shortChip: RECENT_SHORT_CHIP,
          seededDivergence: RECENT_SEEDED_DIVERGENCE,
          narrowBy,
        }),
      );
    }
  }

  // The block's top is read rather than assumed. A block moved one pixel up would leave
  // the row wrapping at its old top with every box still fitting — the widths below it
  // would keep their shape and the columns still hold their readings — so the shape is
  // read at each width instead: above the block the row is the stacked grid again, one
  // flag per line, because that is what the block gave up.
  if (width > 560) {
    for (const card of cards) {
      if (card.row.display === "grid") continue;
      return failed(
        `The recent card's flag row is still ${card.row.display}/${card.row.wrap} at ${at}, above the block ` +
          "that lets the flags share a line: its top is where the row goes back to one flag per row, so a width " +
          "above it has to read as the stacked grid.",
      );
    }
  }

  // The chevron is decorative — the whole card is one hit area — so the narrow band gives
  // its 28px to the copy column, which is what lets the widest reading print whole at the
  // band's edge. It is read after the readings so a card that clips its label is reported
  // as that, not as a chevron.
  for (const card of cards) {
    if (width <= 382 && card.arrow !== "none") {
      return failed(
        `The recent card kept its chevron at ${at} (display: ${card.arrow}), where the copy column needs its 28px.`,
      );
    }
    if (width > 382 && card.arrow === "none") {
      return failed(`The recent card dropped its chevron at ${at}, where there is room for both.`);
    }
  }

  // The stale card is the widest row the strip holds - its chip and the action that
  // settles it - and a cleared review is rows to work rather than a date to renew, so a
  // walk that measured anything less would report a fit it never met.
  if (stale.flags.length !== 2) {
    return failed(recentFlagCountFailure({ role: "stale", room: stale.name, count: stale.flags.length, at }));
  }
  const crowded = cleared.find((card) => card.flags.length !== 1);
  if (crowded) {
    return failed(recentFlagCountFailure({ role: "cleared", room: crowded.name, count: crowded.flags.length, at }));
  }

  // What the top of the phone block buys, read there and on the other side of it rather
  // than inferred from the width: at 560px, the block's last width, the stale card's chip
  // and the action that settles it share one line, and at 561px each has a line of its own
  // because the row is the stacked grid again. A rule that narrowed the copy column inside
  // the block leaves every other reading green — each flag still fits its own box and the
  // row still fits its column — and only the pair splitting says the column stopped holding
  // them beside each other, which is the row the block exists to save.
  if (width === 560 && flagLines(stale.flags) !== 1) {
    return failed(recentFlagShareLineFailure({ lines: flagLines(stale.flags), at }));
  }
  if (width === 561 && (flagLines(stale.flags) !== 2 || cleared.some((card) => flagLines(card.flags) !== 1))) {
    return failed(
      recentFlagStackFailure({
        stale: flagLines(stale.flags),
        cleared: cleared.map((card) => ({ ...card, lines: flagLines(card.flags) })),
        at,
      }),
    );
  }

  return {
    failure: null,
    reading: { width, cards: columns, widest: widestInStrip, tightest: tightestHere, divergence },
  };
}
