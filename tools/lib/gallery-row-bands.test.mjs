import { describe, expect, it } from "vitest";
import { copyAndDeleteSplitFailure, describeBands } from "./gallery-row-bands.mjs";

/**
 * The one wording every gallery row failure names its lines in.
 *
 * The walk's own run prints these sentences only when a row breaks, so a refactor of
 * them is the kind of change nothing green can show: the band-count failures and the
 * Copy/Delete split each print a line list, and two wordings of one row is exactly what
 * a reader comparing two failures cannot see. These specs hold the numbering (1-based,
 * the order the grouping produced), the list's shape, and the split's promise that the
 * number it names for each button is the number the list uses.
 */

const ROOM = "Northbridge Meeting Room Refresh";

/** A row's bands as the walk groups them: vertical overlap, top to bottom. */
const bands = () => ([
  { top: 812, actions: ["Detail", "Resume active"] },
  { top: 860, actions: ["Open template: Northbridge Meeting Room Refresh — east wing boardroom variant"] },
  { top: 913, actions: [`Copy ${ROOM}`] },
  { top: 1071, actions: [`Delete ${ROOM}`] },
]);

const pair = (topOfCopy, topOfDelete = topOfCopy) => ([
  { label: `Copy ${ROOM}`, top: topOfCopy },
  { label: `Delete ${ROOM}`, top: topOfDelete },
]);

describe("describeBands", () => {
  it("numbers the bands from 1 in the order it was given them", () => {
    expect(describeBands(bands())).toBe(
      "line 1: Detail, Resume active; "
        + "line 2: Open template: Northbridge Meeting Room Refresh — east wing boardroom variant; "
        + `line 3: Copy ${ROOM}; `
        + `line 4: Delete ${ROOM}`,
    );
  });

  it("keeps each band's actions in their own order, under one line number", () => {
    const [first] = describeBands(bands()).split("; ");

    expect(first).toBe("line 1: Detail, Resume active");
    // A second action on the same line is a comma away, not a second line: the count
    // the row is held to is bands, and the list has to read the same way.
    expect(first.match(/line \d+:/g)).toHaveLength(1);
  });

  it("prints a band holding one action without a word about it being alone", () => {
    // `alone` was a wording of its own in the split failure before this formatter; the
    // list says the line was the button's by printing it by itself.
    expect(describeBands([{ top: 900, actions: ["Copy"] }])).toBe("line 1: Copy");
  });

  it("says nothing for a row with no bands", () => {
    expect(describeBands([])).toBe("");
    expect(describeBands()).toBe("");
  });
});

describe("copyAndDeleteSplitFailure", () => {
  it("is silent while the pair shares a line", () => {
    expect(copyAndDeleteSplitFailure({ room: ROOM, at: "1150px", iconButtons: pair(913), bands: bands() }))
      .toBeNull();
  });

  it("names both lines the pair landed on, by the number the list uses", () => {
    const message = copyAndDeleteSplitFailure({
      room: ROOM,
      at: "1366px",
      iconButtons: pair(913, 955),
      bands: bands(),
    });

    expect(message).toContain(`Gallery card for ${ROOM} put Copy and Delete on different lines at 1366px: `);
    expect(message).toContain("Copy on line 3, Delete on line 4");
    // The pair is named by its verb, because the full label repeats the room the
    // sentence already names; the list below names the controls in full.
    expect(message).not.toContain(`: Copy ${ROOM} on line`);
  });

  it("prints the same band list the row's shape failures print", () => {
    const message = copyAndDeleteSplitFailure({
      room: ROOM,
      at: "1150px",
      iconButtons: pair(913, 955),
      bands: bands(),
    });

    // The formatter's own output, verbatim — one row cannot be described two ways.
    expect(message).toContain(describeBands(bands()));
    expect(message).toContain("The row printed line 1: Detail, Resume active; ");
    expect(message).toContain("— the pair is one item, so a break belongs between the design line's entries and the pair, never through it.");
  });

  it("never names a line the list does not hold", () => {
    // The number in `Copy on line N` has to be the index of the band holding Copy, or
    // the sentence sends a reader to the wrong line of the list under it.
    const message = copyAndDeleteSplitFailure({
      room: ROOM,
      at: "1150px",
      iconButtons: pair(913, 955),
      bands: bands(),
    });
    const listed = describeBands(bands()).split("; ");
    const indexOf = (label) => listed.findIndex((line) => line.endsWith(`: ${label}`));

    const named = [...message.matchAll(/(Copy|Delete) on line (\d+)/g)]
      .map((match) => ({ verb: match[1], line: Number(match[2]), holds: indexOf(`${match[1]} ${ROOM}`) + 1 }));

    expect(named).toHaveLength(2);
    for (const pair_ of named) expect(pair_.line).toBe(pair_.holds);
  });

  it("says a button the row's bands do not hold is on no line, rather than numbering it", () => {
    const message = copyAndDeleteSplitFailure({
      room: ROOM,
      at: "1150px",
      iconButtons: [{ label: `Copy ${ROOM}`, top: 913 }, { label: "Delete another room", top: 955 }],
      bands: bands(),
    });

    expect(message).toContain("Delete on no line of the row");
    expect(message).not.toContain("Delete on line 0");
    expect(message).not.toMatch(/Delete on line -?\d/);
  });
});
