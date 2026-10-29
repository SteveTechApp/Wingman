import { describe, expect, it } from "vitest";
import {
  crmPanelClippedFailure,
  crmRemovalBodyMentionFailure,
  crmRemovalNoteDuplicateFailure,
  crmRemovalNoteMismatchFailure,
  crmRemovalNoteWrongShapeFailure,
  crmRemovalTouchedHistoryFailure,
  crmRowNameFailure,
  crmRowSplitFailure,
  crmShortRowBandsFailure,
  crmShortRowWrappedFailure,
  crmWidestRowMissingFailure,
  crmWidestRowNotWrappedFailure,
} from "./crm-history-rows.mjs";

/**
 * The send history's failure wording, held without a browser.
 *
 * The panel is mounted twice and measured by one function, so every sentence here has
 * to name its mount: a report that said only "the panel" would not say which of the two
 * columns came apart, and the wizard's mount is where the panel was actually broken.
 * These specs pin that, the row each sentence names, and the claim it makes — the
 * numbers it prints are numbers a reader compares against the rule, so a sentence that
 * dropped one would leave them guessing what moved.
 */

const RECORD = "the project record";
const WIZARD = "the response wizard";
const ROW = "Northbridge Meeting Room Refresh — east wing boardroom with dual 86 in displays and Dante audio";

describe("crmPanelClippedFailure", () => {
  it("names the mount and prints the chain of boxes a reader has to choose between", () => {
    const message = crmPanelClippedFailure({
      mount: RECORD,
      at: "390px",
      tree: [
        { node: "section.wm-handoff", width: 273, scroll: 411, display: "grid", columns: "none", overflowX: "hidden" },
        { node: "div.wm-crm-share-panel", width: 411, scroll: 411, display: "grid", columns: "273px", overflowX: "visible" },
      ],
    });

    expect(message.split("\n")[0]).toBe(
      `${RECORD}: the CRM panel is wider than the box that clips it at 390px, so its history rows' trailing actions are cut off.`,
    );
    // The rows are indented and carry width/scroll, the clipping flag, the display, the
    // grid columns and the node name — which ancestor stopped giving room is the
    // question the sentence alone cannot answer.
    expect(message.split("\n")[1]).toBe("  273/411 clipped grid section.wm-handoff");
    expect(message.split("\n")[2]).toBe("  411/411 grid [273px] div.wm-crm-share-panel");
  });

  it("says nothing about a tree it was not given, and leaves no dangling line", () => {
    const message = crmPanelClippedFailure({ mount: WIZARD, at: "360px" });

    expect(message.split("\n")).toHaveLength(1);
    expect(message.endsWith("cut off.")).toBe(true);
  });
});

describe("crmRowNameFailure", () => {
  it("prints the width the name kept", () => {
    expect(crmRowNameFailure({ mount: RECORD, at: "360px", name: 17 })).toBe(
      `${RECORD}: a CRM history row's project name is 17px at 360px; the row fits by hiding it.`,
    );
  });

  it("says the name is absent rather than printing 0px for it", () => {
    expect(crmRowNameFailure({ mount: RECORD, at: "360px", name: null })).toContain("project name is absent at 360px");
    expect(crmRowNameFailure({ mount: RECORD, at: "360px", name: 0 })).toContain("project name is absent at 360px");
  });
});

describe("crmWidestRowMissingFailure", () => {
  it("names the row the readings are about, and says it is not the row on the page", () => {
    const message = crmWidestRowMissingFailure({ mount: WIZARD, at: "390px", name: ROW });

    expect(message).toContain(`${WIZARD}: the widest CRM history row ("${ROW}") is not in the list at 390px`);
    expect(message).toContain("the row these readings are about is not the row on the page.");
  });
});

describe("crmRowSplitFailure", () => {
  it("counts the rows that wrapped, with the first one's band count", () => {
    expect(crmRowSplitFailure({ mount: RECORD, at: "1366px", rows: [{ lines: 2 }, { lines: 4 }] })).toBe(
      `${RECORD}: 2 CRM history rows occupy more than one line at 1366px, where the row is a single line (the first holds 2).`,
    );
  });

  it("reads as one row when one row is what wrapped", () => {
    const message = crmRowSplitFailure({ mount: RECORD, at: "1366px", rows: [{ lines: 3 }] });

    expect(message).toContain("1 CRM history row occupies more than one line");
    expect(message).not.toContain("1 rows");
  });
});

describe("crmWidestRowNotWrappedFailure", () => {
  it("prints the row's content width beside the width it failed at", () => {
    const message = crmWidestRowNotWrappedFailure({ mount: RECORD, at: "560px", name: ROW, content: 609 });

    expect(message).toContain(`the widest CRM history row ("${ROW}", 609px of content) stayed on one line at 560px`);
    expect(message).toContain("the project name should take the first line and the status, time and controls the next.");
  });
});

describe("crmShortRowWrappedFailure", () => {
  it("names the name's length, because that is the case the row is for", () => {
    const message = crmShortRowWrappedFailure({ mount: RECORD, at: "560px", lines: 2, nameLength: 6 });

    expect(message).toContain("took 2 lines at 560px, where a 6-character name leaves room for the row and its controls on one line");
    expect(message).toContain("the wrap is for names that need it, not for every row.");
  });
});

describe("crmShortRowBandsFailure", () => {
  it("says what a third band means rather than only counting bands", () => {
    const message = crmShortRowBandsFailure({ mount: WIZARD, at: "360px", lines: 3 });

    expect(message).toContain("broke into 3 bands at 360px, where a short name needs the name's band and one band for its controls");
    expect(message).toContain("a third band is the name squeezed to its floor with the controls split under it.");
  });
});

describe("crmRemovalNoteMismatchFailure", () => {
  it("prints the promise, the row's own words and nothing in between", () => {
    expect(
      crmRemovalNoteMismatchFailure({
        row: "A failure that kept the body it POSTed",
        says: "dropping it loses the only copy a resend could post",
        text: "Dropping it removes this browser's record of the send.",
      }),
    ).toBe(
      "A failure that kept the body it POSTed must say that dropping it loses the only copy a resend could post, "
        + 'but the row said "Dropping it removes this browser\'s record of the send."',
    );
  });

  it("adds the sentence's own stop when the row's text has none", () => {
    // The costs are written sentences and end with a stop; a row whose text does not
    // still has to end the message, and it must not end it twice.
    const message = crmRemovalNoteMismatchFailure({ row: "A send", says: "what it costs", text: "no stop here" });

    expect(message).toBe("A send must say that what it costs, but the row said \"no stop here\".");
    expect(message).not.toContain("..");
  });
});

describe("crmRemovalNoteWrongShapeFailure", () => {
  it("names the shape the row must not be read as", () => {
    expect(
      crmRemovalNoteWrongShapeFailure({
        row: "A failure that stored no body",
        forbidden: "a send the CRM accepted or as a failure with a body to lose",
        text: "Dropping it takes the body kept for a resend with it.",
      }),
    ).toBe(
      'A failure that stored no body must not read as a send the CRM accepted or as a failure with a body to lose: '
        + '"Dropping it takes the body kept for a resend with it."',
    );
    expect(crmRemovalNoteWrongShapeFailure({ row: "A send", forbidden: "another shape", text: "no stop" }))
      .toBe('A send must not read as another shape: "no stop".');
  });
});

describe("crmRemovalBodyMentionFailure", () => {
  it("says the delivered send never had a body to mention", () => {
    expect(crmRemovalBodyMentionFailure({ text: "Dropping it takes the body kept for a resend with it." })).toBe(
      'A delivered send stored no body, so its cost must not mention one: "Dropping it takes the body kept for a resend with it."',
    );
    // Exactly one final stop, whichever way the row's text ends.
    expect(crmRemovalBodyMentionFailure({ text: "mentions a body" }))
      .toBe('A delivered send stored no body, so its cost must not mention one: "mentions a body".');
  });
});

describe("crmRemovalNoteDuplicateFailure", () => {
  it("names both shapes that printed one sentence, and the sentence", () => {
    const message = crmRemovalNoteDuplicateFailure({
      first: "the failure that kept its body",
      second: "the delivered send",
      text: "Dropping it removes this browser's record of the send.",
    });

    expect(message).toBe(
      'the failure that kept its body and the delivered send printed the same cost '
        + '("Dropping it removes this browser\'s record of the send."), so the note says nothing about the row it belongs to.',
    );
  });
});

describe("crmRemovalTouchedHistoryFailure", () => {
  it("counts what the reading left against what was seeded", () => {
    expect(crmRemovalTouchedHistoryFailure({ stored: 4, seeded: 5 })).toBe(
      "Reading the three shapes' costs left 4 of the 5 seeded sends in storage: arming a row is a preview, not a step that changes the history.",
    );
  });
});
