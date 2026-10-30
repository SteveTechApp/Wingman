import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DESIGN_NAME_AGREEMENT,
  SAVED_DESIGN_NAME_FLOOR,
  designNameWidthAgreementFailure,
  designNameWidthClause,
  mostToLosePerWidth,
  runnerUpPerWidth,
  savedDesignNameFailure,
} from "./saved-design-names.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const walk = readFileSync(path.join(here, "..", "browser-smoke-check.mjs"), "utf8");
// The gallery card's sentence is built one module in — the walk calls
// `designEntryNameFailure`, which is where the floor is applied — so the question
// "who holds the floor" is asked of both files.
const galleryCardRows = readFileSync(path.join(here, "gallery-card-rows.mjs"), "utf8");
// The row shapes' designs are declared in their own module — the walk only seeds
// and measures them — so the seed lists this spec reads are in both files.
const galleryRowStates = readFileSync(path.join(here, "gallery-row-states.mjs"), "utf8");

const ROOM = "Northbridge Meeting Room Refresh";
const DESIGN = "Northbridge Meeting Room Refresh — east wing boardroom with dual 86 in displays and Dante audio";

describe("saved design name floor", () => {
  it("sits under the tightest either surface measures", () => {
    // The gallery card's narrowest phone entry prints 23 of a 79-character name and
    // the strip's narrowest column keeps 40 since the two-column band stopped at
    // 761px, so one floor for both has to be under 23 — and high enough that a verb
    // and a letter cannot pass, which the old 12 was not. What made that 23 hard to
    // trust was its source: the walk's tightest line used to report a seed name of
    // 23 characters printing all of itself, so the number was a fixture's length and
    // the headroom above it was unmeasured.
    expect(SAVED_DESIGN_NAME_FLOOR).toBeLessThan(23);
    expect(SAVED_DESIGN_NAME_FLOOR).toBeGreaterThanOrEqual(16);
  });

  it("seeds no gallery design short enough to print whole at the tightest width", () => {
    // A seed shorter than the narrowest entry's clip prints all of itself at every
    // width, and then the pass's tightest reading is the fixture rather than a
    // column — which is what the two-short row's 23-character names did. Their
    // entries carry 34 characters now, so the count beside the narrowest one is what
    // a column agreed to show.
    const seeded = [...`${walk}\n${galleryRowStates}`.matchAll(/designs: \[([^\]]*)\]/g)]
      .flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((name) => name[1]));

    expect(seeded.length).toBeGreaterThan(0);
    expect(Math.min(...seeded.map((name) => name.length))).toBeGreaterThan(23);
  });

  it("is the one number both readings hold", () => {
    // A surface that declares its own floor is the drift this module exists to
    // stop, and a green walk cannot see it: both surfaces would still pass while
    // one of them allowed a shorter name.
    expect(walk).not.toMatch(/DESIGN_NAME_CHARACTERS\s*=/);
    expect(walk).toContain("SAVED_DESIGN_NAME_FLOOR");
    expect(walk).toContain("designEntryNameFailure");
    expect(galleryCardRows).toContain("savedDesignNameFailure");
  });

  it("counts the characters, the name's own length and the floor it was held to", () => {
    const message = savedDesignNameFailure({
      surface: "gallery card",
      room: ROOM,
      design: DESIGN,
      visible: 9,
      characters: 103,
      floor: SAVED_DESIGN_NAME_FLOOR,
      at: "360px",
    });

    expect(message).toContain(`The gallery card for ${ROOM} printed 9 of 103 characters of its saved design's name at 360px`);
    expect(message).toContain(`("${DESIGN}")`);
    expect(message).toContain(`has to keep at least ${SAVED_DESIGN_NAME_FLOOR}`);
    expect(message).toContain("how much of the design a rep can read before choosing between them");
  });

  it("prints every width's own count, so a width clearing the floor still names its number", () => {
    const clause = designNameWidthClause([
      { width: 1366, room: "Northbridge Meeting Room Refresh", printed: 50, characters: 95 },
      { width: 581, room: "Northbridge Meeting Room Refresh", printed: 49, characters: 95 },
      { width: 360, room: "Northbridge Meeting Room Refresh", printed: 23, characters: 103 },
    ]);

    expect(clause).toContain("50 of 95 at 1366px on Northbridge Meeting Room Refresh's card");
    expect(clause).toContain("49 of 95 at 581px on Northbridge Meeting Room Refresh's card");
    expect(clause).toContain("23 of 103 at 360px");
    expect(clause.startsWith("By width, the longest-named design entry printed")).toBe(true);
  });

  it("picks the name with the most to lose, not the smallest count on the page", () => {
    // The short name prints all of itself at every width, so the smallest count
    // would name it at every width and say nothing about any column.
    const rows = mostToLosePerWidth([
      { width: 581, room: "Kingsway", printed: 23, characters: 23 },
      { width: 581, room: "Northbridge", printed: 49, characters: 95 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].room).toBe("Northbridge");
    expect(rows[0].printed).toBe(49);
  });

  it("keeps one reading per width, so a width cannot be reported twice", () => {
    const rows = mostToLosePerWidth([
      { width: 390, room: "A", printed: 51, characters: 97 },
      { width: 390, room: "B", printed: 23, characters: 103 },
      { width: 360, room: "A", printed: 49, characters: 95 },
    ]);

    expect(rows.map((row) => [row.width, row.room, row.printed])).toEqual([
      [390, "B", 23],
      [360, "A", 49],
    ]);
  });

  it("resolves two equally long names by the smaller count, which is the column that cut one", () => {
    const rows = mostToLosePerWidth([
      { width: 760, room: "roomier", printed: 60, characters: 95 },
      { width: 760, room: "tighter", printed: 41, characters: 95 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].room).toBe("tighter");
  });

  it("lists the widths widest first whatever order they were measured in", () => {
    const rows = mostToLosePerWidth([
      { width: 360, printed: 49, characters: 95 },
      { width: 1366, printed: 50, characters: 95 },
      { width: 760, printed: 41, characters: 97 },
    ]);

    expect(rows.map((row) => row.width)).toEqual([1366, 760, 360]);
  });

  it("prints a runner-up at each width, so a column is not read off one card", () => {
    // The pick is the longest name among the entries that were tightest on their own
    // card, and that set changes with the width — so the same 92-character design can
    // head two widths, and its equal count alone would not say whether the two
    // columns kept the same characters. The runner-up is a different cell in the same
    // column: when its count agrees with the pick's, the number describes the column.
    const clause = designNameWidthClause([
      { width: 1151, room: "Harbour Retail Signage Rollout", printed: 31, characters: 92 },
      { width: 1151, room: "Northbridge Meeting Room Refresh", printed: 46, characters: 79 },
      { width: 761, room: "Harbour Retail Signage Rollout", printed: 31, characters: 92 },
      { width: 761, room: "Westbrook Classroom Standard", printed: 34, characters: 34 },
    ]);

    expect(clause).toContain(
      "31 of 92 at 1151px on Harbour Retail Signage Rollout's card, next 46 of 79 on Northbridge Meeting Room Refresh's card",
    );
    expect(clause).toContain(
      "31 of 92 at 761px on Harbour Retail Signage Rollout's card, next 34 of 34 on Westbrook Classroom Standard's card",
    );
  });

  it("prints no runner-up for a width measured on a single card", () => {
    const clause = designNameWidthClause([
      { width: 1366, room: "Northbridge", printed: 50, characters: 95 },
    ]);

    expect(clause).toContain("50 of 95 at 1366px on Northbridge's card.");
    expect(clause).not.toContain("next");
  });

  it("takes the runner-up from the pick's own order, not from the smallest count", () => {
    // A short name prints all of itself, and a smallest-count pick would call that
    // the second-worst cell at the width. The runner-up is the second-longest name.
    const rows = runnerUpPerWidth([
      { width: 760, room: "long", printed: 60, characters: 95 },
      { width: 760, room: "short", printed: 34, characters: 34 },
      { width: 760, room: "tiniest", printed: 9, characters: 20 },
      { width: 390, room: "alone", printed: 12, characters: 20 },
    ]);

    expect(rows.map((row) => [row.width, row.room])).toEqual([[760, "short"]]);
  });

  it("reads one column from two names of different lengths", () => {
    // The pair holds two different names, so their counts cannot agree: at 1366px the
    // 101-character Northbridge name printed 40 characters in the same 359px entry
    // where Harbour's 92-character name printed 45. What has to agree is the box the
    // two cells were given, which is the column both readings describe.
    const failure = designNameWidthAgreementFailure([
      { width: 1366, room: "Northbridge Meeting Room Refresh", printed: 40, characters: 101, entry: 359 },
      { width: 1366, room: "Harbour Retail Signage Rollout", printed: 45, characters: 92, entry: 359 },
    ]);

    expect(DESIGN_NAME_AGREEMENT).toBe(1);
    expect(failure).toBeNull();
  });

  it("fails when the runner-up was given a wider box than the pick", () => {
    const failure = designNameWidthAgreementFailure([
      { width: 1151, room: "Harbour Retail Signage Rollout", printed: 31, characters: 92, entry: 287 },
      { width: 1151, room: "Northbridge Meeting Room Refresh", printed: 29, characters: 79, entry: 330 },
    ]);

    expect(failure).toContain("The reading at 1151px was taken from two boxes, not one column");
    expect(failure).toContain("31 of 92 in a 287px entry on Harbour Retail Signage Rollout's card");
    expect(failure).toContain("29 of 79 in a 330px entry on Northbridge Meeting Room Refresh's card");
    expect(failure).toContain("43px apart");
    expect(failure).toContain("would read as a column's budget while measuring one card");
  });

  it("has no column to compare where the runner-up printed its name whole", () => {
    // At 760px the card is one column wide and Northbridge's 79-character name fits:
    // its entry ends where the name ends, so the 618px the pick was given says
    // nothing about a column the pair could disagree over.
    const failure = designNameWidthAgreementFailure([
      { width: 760, room: "Harbour Retail Signage Rollout", printed: 90, characters: 92, entry: 618 },
      { width: 760, room: "Northbridge Meeting Room Refresh", printed: 79, characters: 79, entry: 578 },
    ]);

    expect(failure).toBeNull();
  });

  it("holds no width to a second opinion it does not have", () => {
    const failure = designNameWidthAgreementFailure([
      { width: 1366, room: "Northbridge", printed: 50, characters: 95, entry: 359 },
    ]);

    expect(failure).toBeNull();
  });

  it("prints no claim at all when no design entry was measured", () => {
    expect(designNameWidthClause([])).toBe("");
  });

  it("drops a reading with no count rather than printing it as zero characters", () => {
    const clause = designNameWidthClause([
      { width: 1366, room: "A", printed: 23, characters: 23 },
      { width: 360, room: "B", printed: null, characters: 103 },
    ]);

    expect(clause).toContain("1366px");
    expect(clause).not.toContain("360px");
  });

  it("names the surface it was taken on, so the two columns cannot be read as one", () => {
    const gallery = savedDesignNameFailure({ surface: "gallery card", room: ROOM, design: DESIGN, visible: 4, characters: 40, floor: SAVED_DESIGN_NAME_FLOOR, at: "1366px" });
    const strip = savedDesignNameFailure({ surface: "recent card", room: ROOM, design: DESIGN, visible: 4, characters: 40, floor: SAVED_DESIGN_NAME_FLOOR, at: "1366px" });

    expect(gallery).toContain("The gallery card for");
    expect(strip).toContain("The recent card for");
    // One wording, two surfaces: the claim after the numbers is the same sentence,
    // so a reader comparing the two failures is comparing the same promise.
    expect(gallery.replace("gallery card", "recent card")).toBe(strip);
    expect(gallery).not.toContain("three-column band");
  });
});
