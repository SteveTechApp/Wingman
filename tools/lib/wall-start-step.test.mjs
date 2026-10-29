import { describe, expect, it } from "vitest";
import {
  WALL_START_VIEWPORTS,
  wallStartBriefLeadsFailure,
  wallStartReadoutFailure,
  wallStartStepFailure,
} from "./wall-start-step.mjs";

const box = (left, top, width, height = 24) => ({ left, top, width, height, right: left + width, bottom: top + height });

/** A step that holds: a card with its content inside, the brief above the walls. */
const holding = () => ({
  card: { width: 338, height: 900, scroll: 338 },
  content: { left: 16, right: 322, top: 16, bottom: 880 },
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

describe("the step's own box", () => {
  it("reports nothing for a step that lays out at the width it has", () => {
    expect(wallStartStepFailure(holding(), { at: "360px" })).toBeNull();
  });

  it("reports nothing for a card that scrolls exactly one pixel", () => {
    expect(wallStartStepFailure({ ...holding(), card: { width: 338, scroll: 339 } }, { at: "360px" })).toBeNull();
  });

  it("names the leaking block, how wide it is and how far past the card it went", () => {
    const message = wallStartStepFailure({
      ...holding(),
      escaped: [{ node: "div.vw-wizard-chips", name: "div.vw-wizard-chips", width: 420, past: 98 }],
    }, { at: "390px" });

    expect(message).toContain("The guided wall wizard's start step left content outside its card at 390px");
    expect(message).toContain("div.vw-wizard-chips is 420px wide, 98px past the card's content box");
    expect(message).toContain("(1 box out)");
    expect(message).toContain("lays out at the width the card has");
  });

  it("counts the boxes and names a few more without printing each one's box", () => {
    const message = wallStartStepFailure({
      ...holding(),
      escaped: [
        { node: "div.a", name: "div.a", width: 400, past: 80 },
        { node: "div.b", name: "div.b", width: 380, past: 60 },
        { node: "div.c", name: "div.c", width: 360, past: 40 },
      ],
    }, { at: "360px" });

    expect(message).toContain("(3 boxes out, also div.b, div.c)");
    expect(message).not.toContain("div.b is");
  });

  it("reports a card that scrolls sideways", () => {
    const message = wallStartStepFailure({ ...holding(), card: { width: 338, scroll: 402 } }, { at: "390px" });
    expect(message).toContain("scrolls sideways at 390px (402 > 338)");
  });

  it("prints the chain of boxes when the card is wider than what clips it", () => {
    const message = wallStartStepFailure({
      ...holding(),
      clipped: true,
      tree: [{ width: 420, scroll: 420, overflowX: "hidden", display: "grid", columns: "418px", node: "main.vw-builder" }],
    }, { at: "390px" });

    expect(message).toContain("is wider than the box that clips it at 390px");
    expect(message).toContain("420/420 clipped grid [418px] main.vw-builder");
  });
});

describe("the LED brief leads the step", () => {
  it("reports nothing when the brief ends above the walls and the way past them is above the list", () => {
    expect(wallStartBriefLeadsFailure(holding(), { at: "1366px" })).toBeNull();
  });

  it("fails a brief that sits below the common walls", () => {
    const message = wallStartBriefLeadsFailure({
      ...holding(),
      brief: box(16, 500, 306, 320),
    }, { at: "360px" });

    expect(message).toContain("puts the LED brief below the common walls at 360px");
    expect(message).toContain("the brief ends at 820px, the walls' heading starts at 400px");
    expect(message).toContain("canvas, pitch and array come before anyone else's wall");
  });

  it("fails a step that rendered no walls, because every comparison above would then be vacuous", () => {
    const message = wallStartBriefLeadsFailure({ ...holding(), rows: 0 }, { at: "360px" });
    expect(message).toContain("held 0 common-wall rows at 360px");
  });

  it("fails a step whose heading over the walls is gone, rather than comparing against nothing", () => {
    const message = wallStartBriefLeadsFailure({ ...holding(), commonWalls: null }, { at: "390px" });
    expect(message).toContain("has no heading over its common walls at 390px");
  });

  it("fails a brief that is not on the step at all", () => {
    const message = wallStartBriefLeadsFailure({ ...holding(), brief: box(16, 60, 306, 0) }, { at: "390px" });
    expect(message).toContain("does not show the LED brief at 390px");
  });

  it("fails the way past the walls sitting under the list, which is the phone case it exists for", () => {
    const message = wallStartBriefLeadsFailure({
      ...holding(),
      questions: box(16, 700, 150, 32),
    }, { at: "360px" });

    expect(message).toContain("puts the way past the walls under the list at 360px");
    expect(message).toContain("the control is at 700px, the first wall at 440px");
    expect(message).toContain("without scrolling a catalogue first");
  });
});

describe("the brief's read-out", () => {
  it("reports nothing when the sentence is whole and describes the fields", () => {
    expect(wallStartReadoutFailure(holding(), { at: "360px" })).toBeNull();
  });

  it("fails a read-out that scrolls inside its box, because the numbers are the payload", () => {
    const message = wallStartReadoutFailure({
      ...holding(),
      readout: { ...box(16, 300, 306, 40), scroll: 470, text: "3840 × 2160 canvas · 9600 × 5400 mm · 2 × 2 array (4 cabinets)" },
    }, { at: "360px" });

    expect(message).toContain("clips its brief read-out at 360px (470 > 306)");
  });

  it("fails a read-out that describes a different canvas than the fields hold", () => {
    const message = wallStartReadoutFailure({
      ...holding(),
      canvas: { width: 1920, height: 1080 },
    }, { at: "390px" });

    expect(message).toContain("reads out \"3840 × 2160 canvas");
    expect(message).toContain("while its canvas fields hold 1920 × 1080");
  });

  it("fails a read-out with no cabinet count, since the array is one of the three answers", () => {
    const message = wallStartReadoutFailure({
      ...holding(),
      readout: { ...box(16, 300, 306, 40), scroll: 306, text: "3840 × 2160 canvas · 9600 × 5400 mm" },
    }, { at: "1366px" });

    expect(message).toContain("without a cabinet count");
  });

  it("fails a step with no read-out at all", () => {
    const message = wallStartReadoutFailure({ ...holding(), readout: box(16, 300, 0, 0) }, { at: "390px" });
    expect(message).toContain("shows no brief read-out at 390px");
  });
});

describe("the widths it is read at", () => {
  it("holds the desktop and both phone widths, narrowest last", () => {
    expect(WALL_START_VIEWPORTS.map((viewport) => viewport.width)).toEqual([1366, 390, 360]);
  });
});
