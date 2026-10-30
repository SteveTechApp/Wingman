/**
 * The sentences the recent strip's failures say, kept where a spec can read them.
 *
 * The pass measures three cards at nine widths and prints nothing at all when they
 * hold — so every sentence here is one nothing green ever reads, and a refactor of one
 * is invisible until the day it fires. That is the same reason `gallery-row-bands.mjs`
 * exists: the failure is the only part of a measurement a reader ever sees, and it has
 * to name the card, the width and the number that moved in the terms the pass used to
 * decide the row was broken.
 *
 * What is here is the wording, not the reading. A sentence that is a label and a number
 * — `The recent strip lost the card for X at 390px` — stays beside the loop that
 * measured it, because there is nothing in it to get wrong that the loop cannot show. A
 * sentence that carries a claim — which card the arc was about, which width the
 * reading was taken at, what the width means for the next reader — is here, because
 * that claim is what a refactor can quietly change while the walk stays green.
 *
 * `describeRecentPick` and `describeRecentCards` are the formatters the failures share.
 * One shape names the cards the strip printed, with the note a card that carries no
 * survey flag earns; the other names a card and its flag count. Both are used by more
 * than one sentence, and the pass's summary prints the first of them too, so the
 * failure that reports a pick and the summary that reports a measurement cannot
 * describe the same strip two ways.
 */

/** A card's room name, or the id it was looked up by when the tree had no name. */
const roomOf = (card) => card.name ?? card.id ?? "an unnamed card";

/**
 * The cards a strip printed, in the order it printed them.
 *
 * A card whose survey flag is missing has no room id, and that is exactly what the pick
 * check is for: the note says so rather than letting the card read as a room the pass
 * seeded, which is how two unidentified cards once read as one room printed twice.
 */
export function describeRecentPick(cards = []) {
  if (!cards.length) return "no cards";
  return cards
    .map((card) => `${roomOf(card)}${card.room ? "" : " (no survey reading to identify it)"}`)
    .join(", ");
}

/** A card and how many readings its flag row holds. */
export function describeRecentCards(cards = []) {
  return cards
    .map((card) => `${roomOf(card)}: ${card.flags} flag${card.flags === 1 ? "" : "s"}`)
    .join(", ");
}

/**
 * The strip printed rooms this pass did not seed, so nothing below it is about the
 * cards on the page.
 *
 * The count is part of the sentence because the strip prints a fixed three: a strip
 * that printed two cards is a missing card rather than a reordered store, and the
 * reader should be able to tell which happened from the list alone.
 */
export function recentPickFailure({ cards = [], seeded = [], repeated = false } = {}) {
  return `The recent strip picked ${describeRecentPick(cards)}, where this pass seeds ${seeded.join(", ")}. `
    + "The strip prints the store's first three projects, so a store whose order puts another room first is a pick this "
    + "pass cannot measure: the cards below are held to the survey reading and the saved design it seeds, and a room it "
    + `never seeded would be measured as if it were one of them.${repeated ? " One of those rooms is printed twice." : ""}`;
}

/**
 * Two cards wear the same leading chip, which is the cell that decides a card's copy
 * column — so the strip's columns are no longer the divergence the seed asked for.
 */
export function recentChipLabelsFailure({ cards = [] } = {}) {
  return `The recent cards lead with ${cards.map((card) => `${card.chip ?? "no chip"} on ${roomOf(card)}`).join(", ")}: each card's chip has `
    + "to differ from the other two, because the chip is the cell that decides how much of the row that card's copy "
    + "column keeps. Two cards wearing one chip leave the strip's divergence resting on the pair that differ, with "
    + "the third card contributing nothing it was seeded for.";
}

/**
 * A card prints a reading wider than the copy column it prints it in.
 *
 * The column is judged per card because the cards' columns are not the same, and the
 * two widths that sit either side of the chevron's return say what the width means: at
 * 383px the chevron comes back and the rule that hides it narrowest has to leave room
 * for the reading; at 381px the 28px belongs to the column, so a squeeze there is the
 * band itself failing.
 */
export function recentSqueezeFailure({
  room,
  reading,
  widest,
  copy,
  slack,
  width,
  at,
} = {}) {
  const edge = width === 383
    ? " 383px is the width the chevron comes back at, so the rule that hands the chevron its 28px back has to leave this "
      + "card's copy column room for the reading it holds."
    : width === 381
      ? " 381px is one pixel inside the band that gives that 28px to the copy column, so a squeeze here is that band "
        + "failing the reading it exists for."
      : "";
  return `The recent card for ${room} prints its "${reading}" reading ${widest}px inside a ${copy}px copy `
    + `column at ${at}, so that reading is ${-slack}px wider than the column it is printed in: each card's `
    + "column is decided by that card's own leading chip, so the readings are only held when each one is compared with "
    + `its own column.${edge}`;
}

/**
 * The strip does not hold exactly one card with the action that settles a stale
 * survey, so there is no stale reading to measure and no cleared column to compare it
 * with.
 */
export function recentRoleFailure({ cards = [], at } = {}) {
  const withAction = cards.filter((card) => card.settles).length;
  return `The recent strip showed ${withAction} cards carrying the action that `
    + `settles a stale survey at ${at} (${describeRecentCards(cards)}): `
    + "the walk seeds one stale card and the rest cleared, so with anything but that there is no stale "
    + "reading to measure and no cleared column to compare it with.";
}

/**
 * The strip's cards are not laid out in the row shape the width promises: three across
 * above the stack width, one per row below it.
 *
 * Every box check above is green when this fails, which is why it exists: the cards
 * each fit the column they are given, and only the number of tops says the third card
 * stopped sitting beside the other two.
 */
export function recentRowShapeFailure({ cards = [], rows, at, stacked, stackBelow } = {}) {
  return `The recent strip laid its ${cards.length} cards out over ${rows} row${rows === 1 ? "" : "s"} at ${at} `
    + `(card tops ${cards.map((card) => `${roomOf(card)} ${card.top}px`).join(", ")}), where `
    + `${stacked ? `the strip stacks below ${stackBelow + 1}px so each card has its own row` : "the strip prints them as one row"}: `
    + "a breakpoint at another width leaves the third card alone under the first two, which is the row this strip "
    + "is laid out to give it.";
}

/**
 * In the single-column band the cards' copy columns came out too close together, which
 * means the seeded chips stopped widening the cell that holds them and the pass is
 * measuring one column more than once.
 */
export function recentColumnDivergenceFailure({
  columns = [],
  divergence,
  chips = [],
  seededDivergence,
  at,
} = {}) {
  return `The recent cards' copy columns are ${columns.map((column) => `${column.copy}px`).join(", ")} at ${at}, `
    + `${divergence}px between the widest and the narrowest where the seeded chips (${chips.join(", ")}) should leave `
    + `them at least ${seededDivergence}px apart: the chip is the card's leading grid cell at this `
    + "width, so cards wearing the same chip leave this pass measuring one column more than once.";
}

/**
 * The chip has a row of its own at this width, so every card keeps the same column —
 * any spread left in the readings belongs to a chip still sharing the row.
 */
export function recentColumnMatchFailure({ columns = [], divergence, chips = [], at } = {}) {
  return `The recent cards' copy columns are ${columns.map((column) => `${column.copy}px`).join(", ")} at ${at}, `
    + `where the leading chip has a row of its own (${chips.join(", ")}): the chip is out `
    + "of the row there, so the cards keep the same column, and the "
    + `${divergence}px between them belongs to a chip still sharing the row.`;
}

/**
 * The short chip is the only seeded width a column can come from, so this is the
 * reading that says which card the divergence belongs to rather than only that some
 * width exists.
 *
 * `narrowBy` is null when no card wears the chip, negative when a long-labelled card is
 * somehow wider, and otherwise the margin the short chip holds over the nearest of the
 * two long ones.
 */
export function recentShortChipFailure({
  columns = [],
  at,
  shortChip,
  seededDivergence,
  narrowBy,
} = {}) {
  return `The recent cards' copy columns are ${columns.map((column) => `${column.chip} ${column.copy}px`).join(", ")} `
    + `at ${at}, where each card's chip is its leading cell: the card wearing the short "${shortChip}" `
    + `label should keep the widest column, at least ${seededDivergence}px wider than each card wearing `
    + "an eleven-character one, and "
    + (narrowBy === null
      ? "no card is wearing it."
      : `the nearest of them is ${narrowBy < 0 ? `${-narrowBy}px wider than it` : `only ${narrowBy}px narrower`}.`)
    + " The strip's divergence is that one chip on the card this walk seeds with it, so this is the reading "
    + "that says which card the width came from rather than only that some width exists.";
}

/**
 * A card's flag row holds the wrong number of readings for the role it plays.
 *
 * The stale card is the widest row the strip holds — its chip and the action that
 * settles it — and a cleared review is rows to work rather than a date to renew, so a
 * walk that measured anything less would report a fit it never met.
 */
export function recentFlagCountFailure({ role, room, count, at } = {}) {
  return role === "stale"
    ? `The stale reading on ${room} should carry its chip and the action beside it at ${at}; the card showed ${count}.`
    : `A cleared review on ${room} carries the chip alone at ${at}; the card showed ${count}.`;
}

/**
 * At 560px, the top of the block that lets the flags wrap, the two readings that decide
 * the row still stack — which is the row the block exists to save.
 */
export function recentFlagShareLineFailure({ lines, at } = {}) {
  return `The recent card's chip and its re-confirm action took ${lines} lines at ${at}, the top of the `
    + "block that lets them share one: the copy column is what decides whether they fit beside each other, and "
    + "stacking them here spends the row this block exists to save.";
}

/**
 * A card's saved-design link names a design this pass did not save the room as.
 *
 * Three cards share the strip, and the link is the one place a design's name is the
 * payload: every other reading on the card is about the room. A name that is not the
 * one this pass seeded is either another room's save or an earlier one for the same
 * room that the seed failed to replace, and either way the column below is being
 * measured on a name the pass knows nothing about.
 */
export function recentDesignNameFailure({ room, expected, printed, at } = {}) {
  return `The recent card for ${room} printed its saved-design link as ${printed ? `"${printed}"` : "no name"} at ${at}, `
    + `where this pass saved the room as "${expected}": the link is the card's way into the design, so the name it `
    + "prints is what the column is measured on. A store that still holds an earlier save for the same room leaves the "
    + "card naming a design this pass never seeded.";
}

/**
 * A recent card whose room was saved as a design prints no link to it.
 *
 * The strip prints one link per design below the room's survey flags, so a card that
 * holds a name in the store and none on the page has dropped the card's other action —
 * the room's own destination is under the content as an overlay and cannot stand in
 * for it.
 */
export function recentDesignMissingFailure({ room, expected, at } = {}) {
  return `The recent card for ${room} printed no saved-design link at ${at}, where this pass saved the room as `
    + `"${expected}": the card prints one link per design its room was saved as, and a card whose room has one `
    + "and prints none has lost the way into it.";
}

/** At 561px, one pixel above that block, the row is the stacked grid again. */
export function recentFlagStackFailure({ stale, cleared = [], at } = {}) {
  return `Above the block's top the flags should be one per line at ${at}; the stale card showed `
    + `${stale} and the cleared cards ${cleared.map((card) => `${roomOf(card)} ${card.lines}`).join(", ")}, `
    + "where the stacked grid gives each its own row.";
}
