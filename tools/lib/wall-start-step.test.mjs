import { describe, expect, it } from "vitest";
import * as stepModule from "./wall-start-step.mjs";
import { WALL_START_VIEWPORTS, readWallStartStep } from "./wall-start-step.mjs";

const box = (left, top, width, height = 24) => ({ left, top, width, height, right: left + width, bottom: top + height });

/** A step that holds: a card with its content inside, the brief above the walls. */
const holding = () => ({
  card: { width: 338, height: 900, scroll: 338 },
  content: 306,
  widest: 306,
  clipped: false,
  tree: [],
  escaped: [],
  brief: box(16, 60, 306, 320),
  commonWalls: box(16, 400, 306, 24),
  questions: box(16, 400, 150, 32),
  firstWall: box(16, 440, 306, 120),
  rows: 4,
  readout: { ...box(16, 300, 306, 40), scroll: 306, text: "3840 × 2160 canvas · 9600 × 5400 mm · 2 × 2 array (4 cabinets)" },
  canvas: { width: 3840, height: 2160 },
});

const read = (measured, at = "360px") => readWallStartStep(measured, { at });

describe("the step's own box", () => {
  it("reports nothing for a step that lays out at the width it has", () => {
    expect(read(holding()).verdict).toBeNull();
  });

  it("reports nothing for a card that scrolls exactly one pixel", () => {
    expect(read({ ...holding(), card: { width: 338, scroll: 339 } }).verdict).toBeNull();
  });

  it("names the leaking block, how wide it is and how far past the card it went", () => {
    const { verdict } = read({
      ...holding(),
      escaped: [{ node: "div.vw-wizard-chips", name: "div.vw-wizard-chips", width: 420, past: 98 }],
    }, "390px");

    expect(verdict).toContain("The guided wall wizard's start step left content outside its card at 390px");
    expect(verdict).toContain("div.vw-wizard-chips is 420px wide, 98px past the card's content box");
    expect(verdict).toContain("(1 box out)");
    expect(verdict).toContain("lays out at the width the card has");
  });

  it("counts the boxes and names a few more without printing each one's box", () => {
    const { verdict } = read({
      ...holding(),
      escaped: [
        { node: "div.a", name: "div.a", width: 400, past: 80 },
        { node: "div.b", name: "div.b", width: 380, past: 60 },
        { node: "div.c", name: "div.c", width: 360, past: 40 },
      ],
    });

    expect(verdict).toContain("(3 boxes out, also div.b, div.c)");
    expect(verdict).not.toContain("div.b is");
  });

  it("reports a card that scrolls sideways", () => {
    expect(read({ ...holding(), card: { width: 338, scroll: 402 } }, "390px").verdict)
      .toContain("scrolls sideways at 390px (402 > 338)");
  });

  it("prints the chain of boxes when the card is wider than what clips it", () => {
    const { verdict } = read({
      ...holding(),
      clipped: true,
      tree: [{ width: 420, scroll: 420, overflowX: "hidden", display: "grid", columns: "418px", node: "main.vw-builder" }],
    }, "390px");

    expect(verdict).toContain("is wider than the box that clips it at 390px");
    expect(verdict).toContain("420/420 clipped grid [418px] main.vw-builder");
  });
});

describe("the LED brief leads the step", () => {
  it("reports nothing when the brief ends above the walls and the way past them is above the list", () => {
    expect(read(holding(), "1366px").verdict).toBeNull();
  });

  it("fails a brief that sits below the common walls", () => {
    const { verdict } = read({ ...holding(), brief: box(16, 500, 306, 320) });

    expect(verdict).toContain("puts the LED brief below the common walls at 360px");
    expect(verdict).toContain("the brief ends at 820px, the walls' heading starts at 400px");
    expect(verdict).toContain("canvas, pitch and array come before anyone else's wall");
  });

  it("fails a step that rendered no walls, because every comparison above would then be vacuous", () => {
    expect(read({ ...holding(), rows: 0 }).verdict).toContain("held 0 common-wall rows at 360px");
  });

  it("fails a step whose heading over the walls is gone, rather than comparing against nothing", () => {
    expect(read({ ...holding(), commonWalls: null }, "390px").verdict)
      .toContain("has no heading over its common walls at 390px");
  });

  it("fails a brief that is not on the step at all", () => {
    expect(read({ ...holding(), brief: box(16, 60, 306, 0) }, "390px").verdict)
      .toContain("does not show the LED brief at 390px");
  });

  it("fails the way past the walls sitting under the list, which is the phone case it exists for", () => {
    const { verdict } = read({ ...holding(), questions: box(16, 700, 150, 32) });

    expect(verdict).toContain("puts the way past the walls under the list at 360px");
    expect(verdict).toContain("the control is at 700px, the first wall at 440px");
    expect(verdict).toContain("without scrolling a catalogue first");
  });
});

describe("the brief's read-out", () => {
  it("reports nothing when the sentence is whole and describes the fields", () => {
    expect(read(holding()).verdict).toBeNull();
  });

  it("fails a read-out that scrolls inside its box, because the numbers are the payload", () => {
    const { verdict } = read({
      ...holding(),
      readout: { ...box(16, 300, 306, 40), scroll: 470, text: "3840 × 2160 canvas · 9600 × 5400 mm · 2 × 2 array (4 cabinets)" },
    });

    expect(verdict).toContain("clips its brief read-out at 360px (470 > 306)");
  });

  it("fails a read-out that describes a different canvas than the fields hold", () => {
    const { verdict } = read({ ...holding(), canvas: { width: 1920, height: 1080 } }, "390px");

    expect(verdict).toContain("reads out \"3840 × 2160 canvas");
    expect(verdict).toContain("while its canvas fields hold 1920 × 1080");
  });

  it("fails a read-out with no cabinet count, since the array is one of the three answers", () => {
    const { verdict } = read({
      ...holding(),
      readout: { ...box(16, 300, 306, 40), scroll: 306, text: "3840 × 2160 canvas · 9600 × 5400 mm" },
    }, "1366px");

    expect(verdict).toContain("without a cabinet count");
  });

  it("fails a step with no read-out at all", () => {
    expect(read({ ...holding(), readout: box(16, 300, 0, 0) }, "390px").verdict)
      .toContain("shows no brief read-out at 390px");
  });
});

describe("the step's whole reading", () => {
  it("returns the line a report prints beside a step that holds", () => {
    // The numbers are the verdict's own boxes: printing them from a second walk of
    // the page would be a claim about a measurement nobody checked.
    expect(read(holding())).toEqual({
      verdict: null,
      summary: "card 338px holding 306px, brief 306×320px above 4 walls, read-out 306px, widest block 306px",
    });
  });

  it("keeps the summary beside a failing verdict, so a broken reading still says what it measured", () => {
    const reading = read({
      ...holding(),
      brief: box(16, 500, 306, 320),
    });

    expect(reading.verdict).toContain("puts the LED brief below the common walls");
    expect(reading.summary).toBe("card 338px holding 306px, brief 306×320px above 4 walls, read-out 306px, widest block 306px");
  });

  it("asks the step's own box before what the step says", () => {
    // A block hanging outside the card is the one thing that makes a position on the
    // page mean nothing, so a step that both leaks and misorders is reported as the
    // leak: the ordering says where a box sits in a layout that is already unreadable.
    const reading = read({
      ...holding(),
      escaped: [{ node: "div.vw-wizard-chips", name: "div.vw-wizard-chips", width: 420, past: 98 }],
      brief: box(16, 500, 306, 320),
    }, "390px");

    expect(reading.verdict).toContain("left content outside its card at 390px");
    expect(reading.verdict).not.toContain("below the common walls");
  });

  it("names the step it could not find, with no summary, because there are no boxes to add up", () => {
    expect(readWallStartStep(null, { at: "390px" })).toEqual({
      verdict: "The walk could not find the guided wall wizard's start step at 390px.",
      summary: null,
    });
  });

  it("reads a box the step did not render as zero rather than throwing", () => {
    // The verdict has already named the missing read-out, so the summary must not be
    // the thing that crashes the run before the sentence is printed.
    const reading = read({ ...holding(), readout: null }, "390px");

    expect(reading.verdict).toContain("shows no brief read-out at 390px");
    expect(reading.summary).toContain("read-out 0px");
  });

  it("is the module's whole surface beside the width table", () => {
    // One reader, so a caller cannot check the step's boxes and skip its ordering or
    // its read-out; the widths travel with it because they are part of the promise.
    expect(Object.keys(stepModule).sort()).toEqual(["WALL_START_VIEWPORTS", "readWallStartStep"]);
  });
});

describe("the widths it is read at", () => {
  it("holds the desktop and both phone widths, narrowest last", () => {
    expect(WALL_START_VIEWPORTS.map((viewport) => viewport.width)).toEqual([1366, 390, 360]);
  });
});
