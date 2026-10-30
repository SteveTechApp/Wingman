import { describe, expect, it } from "vitest";
import {
  RECENT_SEEDED_DIVERGENCE,
  RECENT_SHORT_CHIP,
  RECENT_STRIP_STACK_BELOW,
  RECENT_STRIP_VIEWPORTS,
  flagLines,
  readRecentStripWidth,
} from "./recent-strip-layout.mjs";
import { SAVED_DESIGN_NAME_FLOOR } from "./saved-design-names.mjs";

const DESIGN_NAMES = {
  alpha: "Alpha room design a card cannot print whole in any column",
  beta: "Beta room design a card cannot print whole in any column",
  gamma: "Gamma room design a card cannot print whole in any column",
};

/** The three rooms the walk seeds, in the roles the strip gives them. */
const ROOMS = [
  { id: "alpha", name: "Alpha Room", chip: "alternative", settles: true },
  { id: "beta", name: "Beta Room", chip: "recommended", settles: false },
  { id: "gamma", name: "Gamma Room", chip: RECENT_SHORT_CHIP, settles: false },
];

const flag = (name, width, top) => ({
  name,
  width,
  top,
  bottom: top + 28,
  escaped: false,
  clipped: 0,
  label: 0,
  labelText: name,
});

/**
 * A strip that holds at `width`, as the walk measures one.
 *
 * The shape follows the width rather than the caller: `stacked` decides whether the cards
 * share a row and whether the leading chip is the card's own grid cell, so a fixture built
 * for 1366px is not silently reused as a phone one. Everything a test wants to break is
 * passed through `overrides`, keyed by room id.
 */
function holdingStrip(width, overrides = {}) {
  const stacked = width <= RECENT_STRIP_STACK_BELOW;
  const chipIsCell = width > 560 && width <= RECENT_STRIP_STACK_BELOW;
  return ROOMS.map((room, index) => {
    const top = stacked ? 100 + index * 200 : 100;
    // Where the chip is the card's leading cell the seeded chips leave the columns apart;
    // everywhere else the chip has a row of its own and the cards keep the same column.
    const copy = chipIsCell ? (room.chip === RECENT_SHORT_CHIP ? 316 : 300) : 300;
    // At 560px the block's last width the stale card's chip and the action settle on one
    // line; at 561px the row is the stacked grid again and each takes its own.
    const shared = width <= 560;
    const flags = room.settles
      ? [flag("Alternative survey", copy - 40, top), flag("Re-confirm", copy - 60, shared ? top : top + 30)]
      : [flag(`${room.chip} survey`, copy - 60, top)];
    return {
      id: room.id,
      name: room.name,
      chip: room.chip,
      copy,
      top,
      arrow: width <= 382 ? "none" : "flex",
      settles: room.settles,
      row: width <= 560
        ? { display: "flex", wrap: "wrap", clipped: 0 }
        : { display: "grid", wrap: "nowrap", clipped: 0 },
      flags,
      design: {
        name: DESIGN_NAMES[room.id],
        visible: 40,
        characters: DESIGN_NAMES[room.id].length,
        escaped: false,
      },
      ...(overrides[room.id] ?? {}),
    };
  });
}

const read = (width, overrides) => readRecentStripWidth(holdingStrip(width, overrides), {
  width,
  designs: DESIGN_NAMES,
});

describe("the strip holds at every width it is read at", () => {
  it("names the widths widest first, with the two edges of each band and a phone inside them", () => {
    expect(RECENT_STRIP_VIEWPORTS.map((viewport) => viewport.width))
      .toEqual([1366, 1181, 1180, 561, 560, 390, 383, 381, 360]);
  });

  it("reports nothing for a strip laid out as the width promises", () => {
    for (const viewport of RECENT_STRIP_VIEWPORTS) {
      const { failure } = read(viewport.width);
      expect(failure, `at ${viewport.width}px`).toBeNull();
    }
  });

  it("prints each card's own column and slack, because a reading is only held against its own card", () => {
    const { reading } = read(561);
    expect(reading.cards.map((card) => [card.copy, card.widest, card.slack])).toEqual([
      [300, 260, 40],
      [300, 240, 60],
      [316, 256, 60],
    ]);
    expect(reading.divergence).toBe(316 - 300);
  });

  it("reports the widest reading in the strip apart from the tightest column", () => {
    const { reading } = read(561);
    // The widest reading is a card's own flag beside the chip, not the widest column:
    // the short chip's card has the widest column and a 256px reading in it.
    expect([reading.widest.room, reading.widest.widest]).toEqual(["Alpha Room", 260]);
    expect([reading.tightest.room, reading.tightest.slack]).toEqual(["Alpha Room", 40]);
  });

  it("has nothing to report for an empty strip, rather than a reading of no cards", () => {
    expect(readRecentStripWidth([], { width: 1366, designs: DESIGN_NAMES })).toEqual({
      failure: null,
      reading: null,
    });
  });
});

describe("a card's own boxes", () => {
  it("fails a card with no flag row", () => {
    const { failure } = read(1366, { beta: { row: null } });
    expect(failure).toContain("The recent card for Beta Room has no flag row to measure at 1366px.");
  });

  it("fails a flag row wider than the column it prints in", () => {
    const { failure } = read(1366, { beta: { row: { display: "grid", wrap: "nowrap", clipped: 12 } } });
    expect(failure).toContain("flag row is 12px wider than its column at 1366px");
  });

  it("tolerates one pixel of scroll, which the runner's fallback font can spend", () => {
    const { failure } = read(1366, { beta: { row: { display: "grid", wrap: "nowrap", clipped: 1 } } });
    expect(failure).toBeNull();
  });

  it("fails a phone row that stopped wrapping, which squeezes the reading instead of moving it", () => {
    const { failure } = read(390, { beta: { row: { display: "flex", wrap: "nowrap", clipped: 0 } } });
    expect(failure).toContain("no longer wraps at 390px (flex/nowrap)");
    expect(failure).toContain("squeezed instead of moving to a second line");
  });

  it("fails a flag that left its card", () => {
    const { failure } = read(1366, { beta: { flags: [{ ...flag("Beta survey", 240, 100), escaped: true }] } });
    expect(failure).toContain("A recent card flag left the card at 1366px: Beta survey.");
  });

  it("fails a flag wider than its own box", () => {
    const { failure } = read(1366, { beta: { flags: [{ ...flag("Beta survey", 240, 100), clipped: 6 }] } });
    expect(failure).toContain("A recent card flag is 6px wider than its own box at 1366px: Beta survey.");
  });

  it("fails a flag that truncated its label, printing what it kept", () => {
    const { failure } = read(1366, { beta: { flags: [{ ...flag("Beta survey", 240, 100), label: 4 }] } });
    expect(failure).toContain('truncated its label at 1366px: Beta survey printed "Beta survey"');
  });
});

describe("the saved-design link", () => {
  it("fails a card whose room was saved as a design and prints no link", () => {
    const { failure } = read(1366, { beta: { design: null } });
    expect(failure).toContain("printed no saved-design link at 1366px");
  });

  it("fails a link naming another design than the one this pass saved", () => {
    const { failure } = read(1366, { beta: { design: { ...holdingStrip(1366)[1].design, name: "An earlier save" } } });
    expect(failure).toContain('printed its saved-design link as "An earlier save" at 1366px');
  });

  it("fails a link outside the card", () => {
    const { failure } = read(1366, { beta: { design: { ...holdingStrip(1366)[1].design, escaped: true } } });
    expect(failure).toContain("printed its saved-design link outside the card at 1366px");
  });

  it("fails a link whose column kept fewer than the shared floor, naming the floor", () => {
    const { failure } = read(390, {
      beta: { design: { ...holdingStrip(390)[1].design, visible: SAVED_DESIGN_NAME_FLOOR - 1 } },
    });
    expect(failure).toContain(`printed ${SAVED_DESIGN_NAME_FLOOR - 1} of`);
    expect(failure).toContain("on either surface that prints one");
  });

  it("holds a link one character past the floor, since the floor is the stub guard and not a target", () => {
    const { failure } = read(390, {
      beta: { design: { ...holdingStrip(390)[1].design, visible: SAVED_DESIGN_NAME_FLOOR } },
    });
    expect(failure).toBeNull();
  });
});

describe("the copy column a reading has to fit", () => {
  it("fails a reading wider than its own card's column, and tolerates one pixel", () => {
    const squeezed = read(1366, { beta: { flags: [flag("Beta survey", 304, 100)] } });
    expect(squeezed.failure).toContain('prints its "Beta survey" reading 304px inside a 300px copy column at 1366px');
    expect(squeezed.failure).toContain("4px wider than the column it is printed in");

    const tolerated = read(1366, { beta: { flags: [flag("Beta survey", 301, 100)] } });
    expect(tolerated.failure).toBeNull();
  });

  it("judges each card against its own column, so a wide reading in a wide column holds", () => {
    const { failure } = read(561, { gamma: { flags: [flag("Caution survey", 312, 300)] } });
    expect(failure).toBeNull();
  });
});

describe("which card plays which role", () => {
  it("fails a strip where no card carries the action that settles a survey", () => {
    const { failure } = read(1366, {
      alpha: { settles: false },
      beta: { settles: false },
    });
    expect(failure).toContain("showed 0 cards carrying the action that settles a stale survey at 1366px");
  });

  it("fails a strip where two cards claim the stale survey", () => {
    const { failure } = read(1366, { beta: { settles: true } });
    expect(failure).toContain("showed 2 cards carrying the action that settles a stale survey at 1366px");
  });
});

describe("the strip's row shape", () => {
  it("fails cards that stopped sharing a row above the stack width", () => {
    const cards = holdingStrip(1366);
    cards[2] = { ...cards[2], top: 400 };
    const { failure } = readRecentStripWidth(cards, { width: 1366, designs: DESIGN_NAMES });
    expect(failure).toContain("laid its 3 cards out over 2 rows at 1366px");
    expect(failure).toContain("the strip prints them as one row");
  });

  it("fails a strip that kept three across below the stack width", () => {
    const cards = holdingStrip(1180).map((card) => ({ ...card, top: 100 }));
    const { failure } = readRecentStripWidth(cards, { width: 1180, designs: DESIGN_NAMES });
    expect(failure).toContain("laid its 3 cards out over 1 row at 1180px");
    expect(failure).toContain(`stacks below ${RECENT_STRIP_STACK_BELOW + 1}px`);
  });
});

describe("the divergence the seeding bought", () => {
  it("fails columns that came out equal where the chip is the card's leading cell", () => {
    const cards = holdingStrip(561).map((card) => ({ ...card, copy: 300 }));
    const { failure } = readRecentStripWidth(cards, { width: 561, designs: DESIGN_NAMES });
    expect(failure).toContain("copy columns are 300px, 300px, 300px at 561px");
    expect(failure).toContain("0px between the widest and the narrowest");
    expect(failure).toContain(`should leave them at least ${RECENT_SEEDED_DIVERGENCE}px apart`);
  });

  it("fails a spread left over where the chip has a row of its own", () => {
    const cards = holdingStrip(1366).map((card, index) => ({ ...card, copy: 300 + index * 6 }));
    const { failure } = readRecentStripWidth(cards, { width: 1366, designs: DESIGN_NAMES });
    expect(failure).toContain("where the leading chip has a row of its own");
    expect(failure).toContain("12px between them belongs to a chip still sharing the row");
  });

  it("fails a card wearing the short chip that is not the widest column", () => {
    // The spread is kept at the seeded floor, so the ordering is the reading under test
    // rather than the spread that fired above it.
    const cards = holdingStrip(561).map((card) => (card.chip === RECENT_SHORT_CHIP
      ? { ...card, copy: 300 }
      : { ...card, copy: 308 }));
    const { failure } = readRecentStripWidth(cards, { width: 561, designs: DESIGN_NAMES });
    expect(failure).toContain(`the card wearing the short "${RECENT_SHORT_CHIP}" label should keep the widest column`);
    expect(failure).toContain("the nearest of them is 8px wider than it");
  });

  it("fails a strip with no card wearing the short chip at all", () => {
    const cards = holdingStrip(561).map((card) => ({ ...card, chip: "recommended" }));
    const { failure } = readRecentStripWidth(cards, { width: 561, designs: DESIGN_NAMES });
    expect(failure).toContain("no card is wearing it");
  });
});

describe("the two edges of the phone block", () => {
  it("fails a row above the block that is still the wrapping one", () => {
    const { failure } = read(561, { beta: { row: { display: "flex", wrap: "wrap", clipped: 0 } } });
    expect(failure).toContain("is still flex/wrap at 561px, above the block that lets the flags share a line");
  });

  it("fails a stale card whose chip and action stack at the block's top", () => {
    const cards = holdingStrip(560).map((card) => (card.settles
      ? { ...card, flags: [flag("Alternative survey", 260, card.top), flag("Re-confirm", 240, card.top + 30)] }
      : card));
    const { failure } = readRecentStripWidth(cards, { width: 560, designs: DESIGN_NAMES });
    expect(failure).toContain("took 2 lines at 560px, the top of the block that lets them share one");
  });

  it("fails a stale card that kept them beside each other above the block", () => {
    const cards = holdingStrip(561).map((card) => (card.settles
      ? { ...card, flags: [flag("Alternative survey", 260, card.top), flag("Re-confirm", 240, card.top)] }
      : card));
    const { failure } = readRecentStripWidth(cards, { width: 561, designs: DESIGN_NAMES });
    expect(failure).toContain("Above the block's top the flags should be one per line at 561px; the stale card showed 1");
  });
});

describe("the chevron's own edge", () => {
  it("fails a chevron still drawn below 383px, where its 28px belongs to the column", () => {
    const { failure } = read(381, { beta: { arrow: "flex" } });
    expect(failure).toContain("kept its chevron at 381px (display: flex)");
  });

  it("fails a chevron dropped above that edge, where there is room for both", () => {
    const { failure } = read(383, { beta: { arrow: "none" } });
    expect(failure).toContain("dropped its chevron at 383px, where there is room for both");
  });
});

describe("the flag counts the roles promise", () => {
  it("fails a stale card carrying one reading", () => {
    const { failure } = read(1366, { alpha: { flags: [flag("Alternative survey", 260, 100)] } });
    expect(failure).toContain("The stale reading on Alpha Room should carry its chip and the action beside it at 1366px; the card showed 1");
  });

  it("fails a cleared card carrying more than its chip", () => {
    const { failure } = read(1366, {
      beta: { flags: [flag("Recommended survey", 240, 100), flag("Something else", 100, 100)] },
    });
    expect(failure).toContain("A cleared review on Beta Room carries the chip alone at 1366px; the card showed 2");
  });
});

describe("the flag bands", () => {
  it("counts flags that overlap vertically as one line, however uneven their tops", () => {
    expect(flagLines([
      { top: 100, bottom: 128 },
      { top: 96, bottom: 124 },
    ])).toBe(1);
    expect(flagLines([
      { top: 100, bottom: 128 },
      { top: 130, bottom: 158 },
    ])).toBe(2);
  });

  it("is monotone in the order the flags are given, because a band is the row's, not the list's", () => {
    const flags = [{ top: 190, bottom: 218 }, { top: 100, bottom: 128 }, { top: 104, bottom: 132 }];
    expect(flagLines(flags)).toBe(2);
  });

  it("counts no bands for a card with no flags, rather than one empty band", () => {
    expect(flagLines([])).toBe(0);
  });
});
