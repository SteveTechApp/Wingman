import { describe, expect, it } from "vitest";
import {
  describeRecentCards,
  describeRecentPick,
  recentChipLabelsFailure,
  recentColumnDivergenceFailure,
  recentColumnMatchFailure,
  recentDesignMissingFailure,
  recentDesignNameFailure,
  recentFlagCountFailure,
  recentFlagShareLineFailure,
  recentFlagStackFailure,
  recentPickFailure,
  recentRoleFailure,
  recentRowShapeFailure,
  recentShortChipFailure,
  recentSqueezeFailure,
} from "./recent-strip-rows.mjs";

/**
 * The recent strip's failure wording, held without a browser.
 *
 * The pass prints nothing when the three cards hold, so every sentence below is one
 * only a broken strip ever shows — the exact place a refactor of the pass can change
 * what a reader is told without changing a single reading. These specs pin the claims
 * each sentence makes: which card it names and how it knows the room, the width the
 * reading was taken at, the numbers it prints and what they are numbers of, and the
 * one clause each band adds.
 */

const ROOM = "Northbridge Meeting Room Refresh";
const CLEARED = "Harbour Retail Signage Rollout";
const THIRD = "Westbrook Classroom Standard";

const card = (name, extra = {}) => ({ name, id: name.toLowerCase().replaceAll(" ", "-"), ...extra });

describe("describeRecentPick", () => {
  it("names each card by the text it printed, and says which one has no room", () => {
    expect(describeRecentPick([card(ROOM, { room: "northbridge" }), card(THIRD, { room: null })])).toBe(
      `${ROOM}, ${THIRD} (no survey reading to identify it)`,
    );
  });

  it("says no cards rather than printing an empty list", () => {
    expect(describeRecentPick([])).toBe("no cards");
    expect(describeRecentPick()).toBe("no cards");
  });
});

describe("describeRecentCards", () => {
  it("counts each card's readings, singular and plural", () => {
    expect(describeRecentCards([card(ROOM, { flags: 2 }), card(CLEARED, { flags: 1 })])).toBe(
      `${ROOM}: 2 flags, ${CLEARED}: 1 flag`,
    );
  });
});

describe("recentPickFailure", () => {
  it("names what the strip printed beside what the pass seeded", () => {
    const message = recentPickFailure({
      cards: [card(ROOM, { room: "northbridge" }), card(THIRD, { room: null })],
      seeded: [ROOM, CLEARED],
    });

    expect(message).toContain(`The recent strip picked ${ROOM}, ${THIRD} (no survey reading to identify it), where this pass seeds ${ROOM}, ${CLEARED}.`);
    // The sentence has to say why the pick matters, or a reader would think the pass
    // measured those cards and only disliked their order.
    expect(message).toContain("a store whose order puts another room first is a pick this pass cannot measure");
    // A pick with no duplicate says nothing about one.
    expect(message).not.toContain("printed twice");
  });

  it("adds the duplicate clause only when an identified room repeats", () => {
    expect(recentPickFailure({ cards: [], seeded: [ROOM], repeated: true })).toContain("One of those rooms is printed twice.");
  });
});

describe("recentChipLabelsFailure", () => {
  it("pairs each chip with the card wearing it, and falls back on no chip", () => {
    const message = recentChipLabelsFailure({
      cards: [{ ...card(ROOM), chip: "alternative" }, { ...card(CLEARED), chip: "recommended" }, { ...card(THIRD), chip: null }],
    });

    expect(message).toContain(`The recent cards lead with alternative on ${ROOM}, recommended on ${CLEARED}, no chip on ${THIRD}`);
    expect(message).toContain("Two cards wearing one chip leave the strip's divergence resting on the pair that differ");
  });
});

describe("recentSqueezeFailure", () => {
  const squeeze = (overrides = {}) => recentSqueezeFailure({
    room: ROOM,
    reading: "Survey reviewed",
    widest: 279,
    copy: 270,
    slack: -9,
    width: 390,
    at: "390px",
    ...overrides,
  });

  it("names the card, the reading and how far past its column it is", () => {
    const message = squeeze();

    expect(message).toContain(`The recent card for ${ROOM} prints its "Survey reviewed" reading 279px inside a 270px copy column at 390px, so that reading is 9px wider than the column it is printed in`);
    // The arithmetic is `-slack`, so a slack of -9 is nine pixels over rather than a
    // negative number printed as one.
    expect(message).not.toMatch(/-\d+px wider/);
    expect(message).toContain("each one is compared with its own column.");
  });

  it("explains the two widths either side of the chevron's return, and only those", () => {
    expect(squeeze({ width: 383, at: "383px" })).toContain(" 383px is the width the chevron comes back at");
    expect(squeeze({ width: 381, at: "381px" })).toContain(" 381px is one pixel inside the band that gives that 28px to the copy column");
    const plain = squeeze({ width: 360, at: "360px" });
    expect(plain).not.toContain("383px is the width");
    expect(plain).not.toContain("381px is one pixel");
  });
});

describe("recentRoleFailure", () => {
  it("says how many cards carry the settling action, and names every card's readings", () => {
    const message = recentRoleFailure({
      cards: [
        { ...card(ROOM), settles: true, flags: 2 },
        { ...card(CLEARED), settles: true, flags: 1 },
        { ...card(THIRD), settles: false, flags: 1 },
      ],
      at: "1366px",
    });

    expect(message).toContain(`showed 2 cards carrying the action that settles a stale survey at 1366px (${ROOM}: 2 flags, ${CLEARED}: 1 flag, ${THIRD}: 1 flag)`);
    expect(message).toContain("the walk seeds one stale card and the rest cleared");
  });
});

describe("recentRowShapeFailure", () => {
  const cards = [
    { ...card(ROOM), top: 0 },
    { ...card(CLEARED), top: 0 },
    { ...card(THIRD), top: 0 },
  ];

  it("says one row is the layout, naming each card's top", () => {
    const message = recentRowShapeFailure({ cards, rows: 1, at: "1366px", stacked: false, stackBelow: 1180 });

    expect(message).toContain(`laid its 3 cards out over 1 row at 1366px (card tops ${ROOM} 0px, ${CLEARED} 0px, ${THIRD} 0px)`);
    expect(message).toContain("the strip prints them as one row");
    expect(message).not.toContain("1 rows");
  });

  it("says where the strip stacks, one pixel below the width the cards share a row at", () => {
    const message = recentRowShapeFailure({ cards, rows: 3, at: "1180px", stacked: true, stackBelow: 1180 });

    expect(message).toContain("over 3 rows");
    // The width in the sentence is the one the stack covers, not the one it starts at:
    // a reader checking the stylesheet is looking for `below 1181px`.
    expect(message).toContain("the strip stacks below 1181px so each card has its own row");
  });
});

describe("recentColumnDivergenceFailure", () => {
  it("prints each column, the spread and the chips it expected to cause it", () => {
    const message = recentColumnDivergenceFailure({
      columns: [{ copy: 367 }, { copy: 347 }, { copy: 385 }],
      divergence: 38,
      chips: ['"alternative"', '"recommended"', '"caution"'],
      seededDivergence: 18,
      at: "561px",
    });

    expect(message).toContain("The recent cards' copy columns are 367px, 347px, 385px at 561px, 38px between the widest and the narrowest");
    expect(message).toContain('the seeded chips ("alternative", "recommended", "caution") should leave them at least 18px apart');
    expect(message).toContain("the chip is the card's leading grid cell at this width");
  });
});

describe("recentColumnMatchFailure", () => {
  it("says the chip is out of the row, so the columns should agree", () => {
    const message = recentColumnMatchFailure({
      columns: [{ copy: 456 }, { copy: 445 }],
      divergence: 11,
      chips: ['"alternative"', '"recommended"'],
      at: "560px",
    });

    expect(message).toContain("where the leading chip has a row of its own (\"alternative\", \"recommended\")");
    expect(message).toContain("the 11px between them belongs to a chip still sharing the row.");
  });
});

describe("recentShortChipFailure", () => {
  const columns = [{ chip: "alternative", copy: 367 }, { chip: "recommended", copy: 347 }, { chip: "caution", copy: 385 }];

  const failure = (narrowBy) => recentShortChipFailure({
    columns,
    at: "561px",
    shortChip: "caution",
    seededDivergence: 18,
    narrowBy,
  });

  it("names the margin the short chip holds when it is at least the seeded divergence", () => {
    const message = failure(18);

    expect(message).toContain("alternative 367px, recommended 347px, caution 385px");
    expect(message).toContain('the card wearing the short "caution" label should keep the widest column');
    expect(message).toContain("the nearest of them is only 18px narrower.");
  });

  it("says a long-labelled card came out wider rather than printing a negative margin", () => {
    const message = failure(-5);

    expect(message).toContain("the nearest of them is 5px wider than it.");
    expect(message).not.toMatch(/only -\d+px/);
  });

  it("says no card wore the chip when it is absent", () => {
    const message = failure(null);

    expect(message).toContain("and no card is wearing it.");
    expect(message).toContain("The strip's divergence is that one chip on the card this walk seeds with it");
  });
});

describe("recentFlagCountFailure", () => {
  it("holds the stale card to its chip and the action beside it", () => {
    expect(recentFlagCountFailure({ role: "stale", room: ROOM, count: 1, at: "390px" })).toBe(
      `The stale reading on ${ROOM} should carry its chip and the action beside it at 390px; the card showed 1.`,
    );
  });

  it("holds a cleared review to the chip alone", () => {
    expect(recentFlagCountFailure({ role: "cleared", room: CLEARED, count: 3, at: "390px" })).toBe(
      `A cleared review on ${CLEARED} carries the chip alone at 390px; the card showed 3.`,
    );
  });
});

describe("recentFlagShareLineFailure", () => {
  it("names the lines the pair took and the row the block exists to save", () => {
    const message = recentFlagShareLineFailure({ lines: 2, at: "560px" });

    expect(message).toContain("took 2 lines at 560px, the top of the block that lets them share one");
    expect(message).toContain("stacking them here spends the row this block exists to save.");
  });
});

describe("recentDesignNameFailure", () => {
  const DESIGN = "Northbridge Meeting Room Refresh — east wing boardroom with dual 86 in displays and Dante audio";

  it("prints the name the card showed beside the one the pass saved", () => {
    const message = recentDesignNameFailure({
      room: ROOM,
      expected: DESIGN,
      printed: "Northbridge Meeting Room Refresh — standard Teams room with dual 86 in displays",
      at: "1181px",
    });

    expect(message).toContain(
      `The recent card for ${ROOM} printed its saved-design link as "Northbridge Meeting Room Refresh — standard Teams room with dual 86 in displays" at 1181px, where this pass saved the room as "${DESIGN}"`,
    );
    // The sentence has to say what a wrong name costs, or a reader would take it for a
    // preference about titles rather than a reading taken on the wrong design.
    expect(message).toContain("the name it prints is what the column is measured on");
    expect(message).toContain("A store that still holds an earlier save for the same room");
  });

  it("says the link showed no name rather than printing an empty pair of quotes", () => {
    const message = recentDesignNameFailure({ room: ROOM, expected: DESIGN, printed: null, at: "1366px" });

    expect(message).toContain("printed its saved-design link as no name at 1366px");
    expect(message).not.toContain('as ""');
  });
});

describe("recentDesignMissingFailure", () => {
  it("names the room and the design its store row holds", () => {
    const message = recentDesignMissingFailure({
      room: ROOM,
      expected: "Northbridge east wing",
      at: "1366px",
    });

    expect(message).toContain(`The recent card for ${ROOM} printed no saved-design link at 1366px`);
    expect(message).toContain('where this pass saved the room as "Northbridge east wing"');
    expect(message).toContain("has lost the way into it.");
  });
});

describe("recentFlagStackFailure", () => {
  it("prints the stale card's lines and each cleared card's by name", () => {
    const message = recentFlagStackFailure({
      stale: 1,
      cleared: [{ ...card(CLEARED), lines: 2 }, { ...card(THIRD), lines: 1 }],
      at: "561px",
    });

    expect(message).toContain("the stale card showed 1");
    expect(message).toContain(`the cleared cards ${CLEARED} 2, ${THIRD} 1`);
    expect(message).toContain("where the stacked grid gives each its own row.");
  });
});
