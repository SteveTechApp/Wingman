import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  designEntryNameFailure,
  designLinkCountFailure,
  entrySharesLineWithIconPair,
  galleryActionRowFailure,
  galleryColumnsFailure,
  iconPairInset,
  longestNamedEntry,
  narrowestDesignEntry,
  rowBandComparisonFailure,
  rowShapeFailure,
  rowStateClause,
  sharedLineReading,
  sharedLineSummaryClause,
  shortNameSharedLineFailure,
  tightestPrintedEntry,
} from "./gallery-card-rows.mjs";
import * as walkHelpers from "./gallery-card-rows.mjs";
import { SAVED_DESIGN_NAME_FLOOR } from "./saved-design-names.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const walk = readFileSync(path.join(here, "..", "browser-smoke-check.mjs"), "utf8");

const ROOM = "Northbridge Meeting Room Refresh";
const DESIGN = "Northbridge Meeting Room Refresh — east wing boardroom with dual 86 in displays and Dante audio";

// The pair closes the card's content edge at 350, so the fixture is a row that kept
// its promise: a reading that left the pair short would fail every case below for a
// reason none of them is about.
function iconButton(label, { left = 300, right = 350, top = 120, bottom = 140 } = {}) {
  return { label, left, right, top, bottom, height: bottom - top };
}

function designEntry(overrides = {}) {
  return {
    name: DESIGN,
    labelWidth: 253,
    width: 200,
    left: 10,
    right: 210,
    top: 120,
    bottom: 140,
    nameCharacters: 40,
    ...overrides,
  };
}

function measuredRow(overrides = {}) {
  return {
    card: { width: 340, scroll: 340 },
    content: { left: 10, right: 350 },
    row: { width: 340, scroll: 340 },
    designGroup: { width: 310, scroll: 310 },
    lines: 2,
    bands: [
      { top: 100, actions: ["Detail", "Resume"] },
      { top: 120, actions: [`Open template: ${DESIGN}`, "Copy " + ROOM, "Delete " + ROOM] },
    ],
    iconButtons: [iconButton(`Copy ${ROOM}`), iconButton(`Delete ${ROOM}`)],
    designEntries: [designEntry()],
    actionCount: 5,
    escaped: [],
    banner: null,
    bannerLabel: null,
    ...overrides,
  };
}

describe("gallery action row", () => {
  it("holds a row that fits, closes the edge and keeps the pair together", () => {
    expect(galleryActionRowFailure(measuredRow(), { at: "360px", room: ROOM, expectedActions: 5 })).toBeNull();
    expect(iconPairInset(measuredRow())).toBe(0);
  });

  it("names a row that had not finished rendering rather than one that is short", () => {
    const failure = galleryActionRowFailure(measuredRow({ actionCount: 3 }), {
      at: "360px",
      room: ROOM,
      expectedActions: 5,
    });
    expect(failure).toContain("rendered 3 actions at 360px; the action row was not on screen");
  });

  it("names the actions that left the card", () => {
    const failure = galleryActionRowFailure(measuredRow({ escaped: ["Open template: Northbridge…"] }), {
      at: "360px",
      room: ROOM,
      expectedActions: 5,
    });
    expect(failure).toContain("actions left the card at 360px: Open template: Northbridge…");
    expect(failure).toContain(`(${ROOM})`);
  });

  it("says which box scrolled sideways, the card or the row", () => {
    expect(galleryActionRowFailure(measuredRow({ card: { width: 300, scroll: 340 } }), {
      at: "1024px",
      room: ROOM,
      expectedActions: 5,
    })).toContain("Gallery card overflows at 1024px (340 > 300)");
    expect(galleryActionRowFailure(measuredRow({ row: { width: 300, scroll: 320 } }), {
      at: "1024px",
      room: ROOM,
      expectedActions: 5,
    })).toContain("Gallery card action row overflows at 1024px (320 > 300)");
  });

  it("asks for Copy and Delete to be there at all", () => {
    const failure = galleryActionRowFailure(
      measuredRow({ iconButtons: [iconButton(`Copy ${ROOM}`)] }),
      { at: "360px", room: ROOM, expectedActions: 4 },
    );
    expect(failure).toContain("rendered 1 icon buttons at 360px; Copy and Delete should close the action row");
  });

  it("reports the widest control that runs past the content box, not the whole pair", () => {
    const failure = galleryActionRowFailure(measuredRow({
      iconButtons: [iconButton(`Copy ${ROOM}`, { left: 300, right: 360 }), iconButton(`Delete ${ROOM}`, { left: 310, right: 370 })],
    }), { at: "360px", room: ROOM, expectedActions: 5 });
    expect(failure).toContain(`lets "Delete ${ROOM}" run 20px past its own content box (10-350px) at 360px`);
    expect(failure).toContain("the widest of 2 controls that leave it");
    expect(failure).toContain("Copy and Delete have to close the row inside the card.");
  });

  it("fails when the pair was broken across lines", () => {
    const failure = galleryActionRowFailure(measuredRow({
      bands: [
        { top: 100, actions: ["Detail", "Resume"] },
        { top: 120, actions: [`Open template: ${DESIGN}`] },
        { top: 140, actions: [`Copy ${ROOM}`] },
        { top: 160, actions: [`Delete ${ROOM}`] },
      ],
      iconButtons: [iconButton(`Copy ${ROOM}`, { top: 140, bottom: 160 }), iconButton(`Delete ${ROOM}`, { top: 160, bottom: 180 })],
    }), { at: "360px", room: ROOM, expectedActions: 5 });
    expect(failure).toContain("put Copy and Delete on different lines at 360px");
    expect(failure).toContain("Copy on line 3, Delete on line 4");
    expect(failure).toContain("line 1: Detail, Resume");
  });

  it("fails when the pair stops short of the card's content edge", () => {
    const failure = galleryActionRowFailure(measuredRow({
      iconButtons: [iconButton(`Copy ${ROOM}`, { left: 180, right: 230 }), iconButton(`Delete ${ROOM}`, { left: 240, right: 290 })],
    }), { at: "360px", room: ROOM, expectedActions: 5 });
    expect(failure).toContain("left Copy and Delete 60px short of the card's content edge at 360px");
    expect(failure).toContain("the trailing pair has to close the row's right edge");
  });
});

describe("gallery widths", () => {
  it("holds a width that states its column count to it, and says why", () => {
    expect(galleryColumnsFailure(3, { at: "1151px", expected: 3 })).toBeNull();
    expect(galleryColumnsFailure(2, { at: "1151px" })).toBeNull();
    const failure = galleryColumnsFailure(2, { at: "1151px", expected: 3 });
    expect(failure).toContain("laid out 2 columns at 1151px, where its three-to-two change puts 3");
    expect(failure).toContain("leaves it unmeasured");
  });

  it("names a row whose design links are not the state's", () => {
    expect(designLinkCountFailure(measuredRow(), { at: "360px", room: ROOM, stateKey: "one", expected: 1 })).toBeNull();
    const failure = designLinkCountFailure(measuredRow({ designEntries: [] }), {
      at: "360px",
      room: ROOM,
      stateKey: "several",
      expected: 3,
    });
    expect(failure).toContain("carries 0 design links at 360px");
    expect(failure).toContain('the "several" row has 3');
  });
});

describe("design entries", () => {
  it("fails a state with no entry to read, because there is no name to hold", () => {
    expect(designEntryNameFailure(measuredRow({ designEntries: [] }), { at: "360px", room: ROOM }))
      .toContain("carries no design entry to measure at 360px");
  });

  it("passes every entry that printed a name's worth of characters", () => {
    expect(designEntryNameFailure(measuredRow(), { at: "360px", room: ROOM })).toBeNull();
  });

  it("reports each stub, with the count the clip left and the name it cut", () => {
    const failure = designEntryNameFailure(measuredRow({
      designEntries: [
        designEntry({ name: DESIGN, nameCharacters: SAVED_DESIGN_NAME_FLOOR - 1 }),
        designEntry({ name: `${DESIGN} (copy)`, nameCharacters: null }),
      ],
    }), { at: "360px", room: ROOM });

    expect(failure).toContain(`printed ${SAVED_DESIGN_NAME_FLOOR - 1} of ${DESIGN.length} characters`);
    expect(failure).toContain("printed 0 of");
    expect(failure).toContain(`has to keep at least ${SAVED_DESIGN_NAME_FLOOR}`);
  });

  it("holds the floor the caller hands it rather than a number of its own", () => {
    const measured = measuredRow({ designEntries: [designEntry({ nameCharacters: 25 })] });
    expect(designEntryNameFailure(measured, { at: "360px", room: ROOM, floor: 26 })).toContain("printed 25 of");
    expect(designEntryNameFailure(measured, { at: "360px", room: ROOM, floor: 26 })).toContain("at least 26");
    expect(designEntryNameFailure(measured, { at: "360px", room: ROOM, floor: 25 })).toBeNull();
  });
});

describe("the short name's line", () => {
  it("reads the shared line from vertical overlap, not from equal tops", () => {
    const measured = measuredRow();
    expect(entrySharesLineWithIconPair(measured.designEntries[0], measured)).toBe(true);
    const below = measuredRow({ designEntries: [designEntry({ top: 150, bottom: 170 })] });
    expect(entrySharesLineWithIconPair(below.designEntries[0], below)).toBe(false);
    expect(entrySharesLineWithIconPair(null, measured)).toBe(false);
  });

  it("picks the narrowest entry, so the reading follows the name with least to show", () => {
    const measured = measuredRow({
      designEntries: [
        designEntry({ labelWidth: 240, nameCharacters: 46 }),
        designEntry({ labelWidth: 120, nameCharacters: 22 }),
      ],
    });
    expect(narrowestDesignEntry(measured).labelWidth).toBe(120);
  });

  it("passes where the card shares its row and the entry took the pair's line", () => {
    expect(shortNameSharedLineFailure(measuredRow(), { at: "1150px", room: ROOM, columns: 2 })).toBeNull();
  });

  it("fails where the row had room for both and spent a line anyway", () => {
    const measured = measuredRow({ designEntries: [designEntry({ top: 100, bottom: 118 })] });
    const failure = shortNameSharedLineFailure(measured, { at: "1150px", room: ROOM, columns: 2 });
    expect(failure).toContain("gave its short design name a line of its own at 1150px in a 2-column gallery");
    expect(failure).toContain("310px for the 253px name and the 50px pair");
    expect(failure).toContain("shares the line Copy and Delete are on");
  });

  it("allows the wrap where the row has no room for both, including the narrow three-column card", () => {
    const tight = measuredRow({ designGroup: { width: 287, scroll: 287 } });
    expect(shortNameSharedLineFailure(tight, { at: "1151px", room: ROOM, columns: 3 })).toBeNull();
    expect(shortNameSharedLineFailure(measuredRow(), { at: "360px", room: ROOM, columns: 1 })).toBeNull();
  });

  it("keeps the evidence the sharing question was decided on", () => {
    const reading = sharedLineReading(measuredRow(), { columns: 2 });
    expect(reading).toMatchObject({
      columns: 2,
      sharedLine: true,
      entry: 200,
      pairWidth: 50,
      card: 340,
      room: 310,
      needs: 303,
      hasRoom: true,
    });
  });

  it("picks the entry that printed least and the one with the most name to lose", () => {
    const measured = measuredRow({
      designEntries: [
        designEntry({ name: "Northbridge east boardroom", labelWidth: 240, nameCharacters: 38 }),
        designEntry({ name: DESIGN, labelWidth: 200, nameCharacters: 21 }),
      ],
    });
    // Two different picks: the summary's tightest case follows the clip, and its
    // printed example follows the name that had the most to lose.
    expect(tightestPrintedEntry(measured).nameCharacters).toBe(21);
    expect(longestNamedEntry(measured).name).toBe(DESIGN);
  });
});

function comparisonRow({ width = 1150, columns = 2, lines }) {
  return { width, columns, lines, card: width === 1150 ? 495 : 461, bands: "line 1: Detail" };
}

describe("row shapes", () => {
  it("holds a state's declared band count at the widest card", () => {
    expect(rowShapeFailure(measuredRow({ lines: 3 }), { at: "1150px", state: { key: "two-short", room: ROOM, rowLines: 3 } })).toBeNull();
  });

  it("fails a declared count the row did not keep, naming the bands it printed", () => {
    const failure = rowShapeFailure(measuredRow({ lines: 4 }), {
      at: "1150px",
      state: { key: "two-short", room: ROOM, rowLines: 3 },
    });
    expect(failure).toContain('wrapped its action row over 4 lines at 1150px, where the "two-short" row has 3');
    expect(failure).toContain("the row has all the room its shape asks for");
    expect(failure).toContain("It printed line 1: Detail, Resume");
  });

  it("asks a state with no declared count to declare one", () => {
    const failure = rowShapeFailure(measuredRow(), { at: "1150px", state: { key: "one", room: ROOM } });
    expect(failure).toContain('The "one" row state declares no row shape');
    expect(failure).toContain("Declare `rowLines` on the state");
  });

  it("holds a marked width exactly for the tablet and as a ceiling for the single-column block", () => {
    const within = { width: 1150, columns: 2, lines: 3, card: 495 };
    expect(rowBandComparisonFailure({
      room: ROOM,
      stateKey: "several",
      comparison: comparisonRow({ width: 1024, lines: 3 }),
      within,
    })).toBeNull();
    expect(rowBandComparisonFailure({
      room: ROOM,
      stateKey: "several",
      comparison: { ...comparisonRow({ width: 760, lines: 3 }), hold: "atMost" },
      within,
    })).toBeNull();
  });

  it("fails both directions of the same-band hold and names the band it is in", () => {
    const failure = rowBandComparisonFailure({
      room: ROOM,
      stateKey: "several",
      comparison: { ...comparisonRow({ width: 1024, lines: 4 }), hold: "same" },
      within: { width: 1150, columns: 2, lines: 3, card: 495 },
    });
    expect(failure).toContain("over 4 lines at 1024px, where the widest card at 1150px has 3");
    expect(failure).toContain("both widths are inside the 2-column band");
  });

  it("fails a ceiling the wider card did not need to meet", () => {
    const failure = rowBandComparisonFailure({
      room: ROOM,
      stateKey: "several",
      comparison: { ...comparisonRow({ width: 760, columns: 1, lines: 4 }), hold: "atMost" },
      within: { width: 1150, columns: 2, lines: 3, card: 495 },
    });
    expect(failure).toContain("the gallery lays out 1 column there against 2 at the widest card");
    expect(failure).toContain("the row has at least the room the widest card's row had");
  });

  it("asks a marked width with nothing to be held to for its base reading", () => {
    const failure = rowBandComparisonFailure({
      room: ROOM,
      stateKey: "one",
      comparison: { ...comparisonRow({ width: 1024, lines: 3 }), hold: "same" },
      within: null,
    });
    expect(failure).toContain('The "one" row has no band count at the widest card\'s width');
    expect(failure).toContain("the 1024px reading has nothing to be held to");
  });
});

describe("the pass summary", () => {
  const reading = {
    inset: 0,
    lines: 3,
    row: { width: 1150, lines: 3, card: 495, columns: 2 },
    shapeComparisons: [
      { width: 1024, columns: 2, hold: "same", lines: 3 },
      { width: 760, columns: 1, hold: "atMost", lines: 3 },
    ],
    sharedLine: true,
  };

  it("prints the state's bands in the promise order rather than the measured one", () => {
    const { clause } = rowStateClause({ headline: "the widest row", room: ROOM }, reading);
    expect(clause).toContain("0px left over at 360px, wrapped over 3 lines");
    expect(clause).toContain("bands by width: 3 at 1150px, the widest two-column card");
    expect(clause).toContain("3 at 760px, the top of the single-column block");
    expect(clause).toContain("3 at 1024px, the tablet inside the same band");
    expect(clause).toContain("the entry's phone floor still leaves the link on Copy and Delete's line");
  });

  it("reports a promise the sentence has no place for instead of dropping the count", () => {
    const { failure } = rowStateClause({ headline: "the widest row" }, {
      ...reading,
      shapeComparisons: [{ width: 900, columns: 2, hold: "exactly", lines: 3 }],
    });
    expect(failure).toContain("no place for the band count at 900px (exactly)");
  });

  it("says where the short name's line went at every width that promises a column count", () => {
    const readings = new Map([
      [1366, { columns: 3, sharedLine: true, entry: 245, card: 323, room: 287, needs: 355 }],
      [1150, { columns: 2, sharedLine: false, entry: 253, card: 495, room: 461, needs: 503 }],
    ]);
    const clause = sharedLineSummaryClause(readings);
    expect(clause.startsWith("The short name's line was read at every width that states a column count:")).toBe(true);
    expect(clause).toContain("at 1366px the gallery lays out 3 columns and its 323px card gives the entry 245px");
    expect(clause).toContain("at 1150px the gallery lays out 2 columns and its design line has 461px for a 503px name-plus-pair");
    expect(sharedLineSummaryClause(new Map())).toBe("");
  });
});

describe("the walk keeps only measuring", () => {
  it("has no inline copy of a rule this module now holds", () => {
    // A rule left behind in the walk is a second version of it: both are green until
    // one of them changes, and the failure then names the other surface's words.
    expect(walk).not.toContain("function assertActionRowClose");
    expect(walk).not.toContain("function assertDesignEntryNames");
    expect(walk).not.toContain("function entrySharesLineWithIconPair");
  });

  it("imports every rule it calls, so a helper cannot outlive its import", () => {
    // The walk calling a helper it no longer imports is undefined at runtime and
    // green everywhere a source check looks: `node --check` reads syntax, not scope.
    const close = walk.indexOf('} from "./lib/gallery-card-rows.mjs";');
    const open = walk.lastIndexOf("import {", close);
    const imported = walk
      .slice(open, close)
      .split(/[\s,{}]+/)
      .filter((token) => token && token !== "import");
    const called = Object.keys(walkHelpers)
      .filter((name) => new RegExp(`\\b${name}\\(`).test(walk));

    expect(called.length).toBeGreaterThan(0);
    expect(called.filter((name) => !imported.includes(name))).toEqual([]);
  });

  it("asks this module for each of them", () => {
    expect(walk).toContain("./lib/gallery-card-rows.mjs");
    expect(walk).toContain("galleryActionRowFailure");
    expect(walk).toContain("designEntryNameFailure");
    expect(walk).toContain("entrySharesLineWithIconPair");
    expect(walk).toContain("rowShapeFailure");
    expect(walk).toContain("rowStateClause");
  });
});
