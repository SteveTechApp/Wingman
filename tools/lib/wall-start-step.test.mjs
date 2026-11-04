import { describe, expect, it } from "vitest";
import * as stepModule from "./wall-start-step.mjs";
import { WALL_START_VIEWPORTS, readWallStartStep } from "./wall-start-step.mjs";

const holding = () => ({
  card: { width: 338, height: 900, scroll: 338 },
  content: 306,
  clipped: false,
  tree: [],
  escaped: [],
  wallTypeStep: true,
  progressRows: 1,
  wallTypes: 5,
  optionRows: 2,
  ledSizeStep: true,
  ledFields: ["canvas width", "canvas height", "pixel pitch", "cabinet columns", "cabinet rows"],
});

const read = (measured, at = "360px") => readWallStartStep(measured, { at });

describe("the Guided wall wizard's opening", () => {
  it("accepts a contained wall-type question and its LED size follow-up", () => {
    expect(read(holding()).verdict).toBeNull();
  });

  it("reports the first block outside the card", () => {
    const { verdict } = read({
      ...holding(),
      escaped: [{ node: "div.vw-wizard-options", name: "div.vw-wizard-options", width: 420, past: 98 }],
    }, "390px");
    expect(verdict).toContain("left content outside its card at 390px");
    expect(verdict).toContain("div.vw-wizard-options is 420px wide, 98px past the card's content box");
  });

  it("reports a sideways scrolling card", () => {
    expect(read({ ...holding(), card: { width: 338, scroll: 402 } }, "390px").verdict)
      .toContain("scrolls sideways at 390px (402 > 338)");
  });

  it("reports the missing wall type choices", () => {
    expect(read({ ...holding(), wallTypes: 4 }).verdict)
      .toContain("offers 4 wall types at 360px");
  });

  it("keeps the desktop progress rail on one row", () => {
    expect(read({ ...holding(), progressRows: 2 }, "1366px").verdict)
      .toContain("puts its eight progress steps on 2 rows at 1366px");
  });

  it("balances the five wall choices into two desktop rows", () => {
    expect(read({ ...holding(), optionRows: 3 }, "1366px").verdict)
      .toContain("lays out its five wall types on 3 rows at 1366px");
  });

  it("requires all LED size inputs after choosing LED", () => {
    expect(read({ ...holding(), ledFields: ["canvas width", "canvas height"] }).verdict)
      .toContain("missing pixel pitch, cabinet columns, cabinet rows at 360px");
  });

  it("names a missing opening step", () => {
    expect(readWallStartStep(null, { at: "390px" })).toEqual({
      verdict: "The walk could not find the guided wall wizard's start step at 390px.",
      summary: null,
    });
  });

  it("prints the same measurement that the verdict checks", () => {
    expect(read(holding())).toEqual({
      verdict: null,
      summary: "card 338px holding 306px, 1 progress row, 5 wall types in 2 rows, LED size fields: canvas width, canvas height, pixel pitch, cabinet columns, cabinet rows",
    });
  });

  it("keeps the desktop and both phone widths", () => {
    expect(WALL_START_VIEWPORTS.map((viewport) => viewport.width)).toEqual([1366, 390, 360]);
  });

  it("exports only the reader and its width table", () => {
    expect(Object.keys(stepModule).sort()).toEqual(["WALL_START_VIEWPORTS", "readWallStartStep"]);
  });
});
