import { describe, expect, it } from "vitest";
import * as stepModule from "./wall-start-step.mjs";
import { WALL_START_VIEWPORTS, readWallStartStep } from "./wall-start-step.mjs";

const holding = () => ({
  card: { width: 338, height: 900, scroll: 338 },
  content: 306,
  widest: 306,
  clipped: false,
  tree: [],
  escaped: [],
  heading: "What kind of wall?",
  technologies: ["LCD video wall", "LED video wall", "Projection wall"],
});
const read = (measured, at = "360px") => readWallStartStep(measured, { at });

describe("the guided wall wizard's first step", () => {
  it("starts with wall technology and offers LCD, LED and projection choices", () => {
    expect(read(holding()).verdict).toBeNull();
  });

  it("reports content that leaks beyond the card", () => {
    const { verdict } = read({
      ...holding(),
      escaped: [{ node: "div.wall-choices", name: "div.wall-choices", width: 420, past: 98 }],
    }, "390px");
    expect(verdict).toContain("left content outside its card at 390px");
    expect(verdict).toContain("div.wall-choices is 420px wide, 98px past the card's content box");
  });

  it("reports sideways scrolling", () => {
    expect(read({ ...holding(), card: { width: 338, height: 900, scroll: 402 } }, "390px").verdict)
      .toContain("scrolls sideways at 390px (402 > 338)");
  });

  it("reports when a different question appears before wall technology", () => {
    expect(read({ ...holding(), heading: "How big is the wall?" }).verdict)
      .toContain('asks "How big is the wall?"');
  });

  it("reports a missing wall technology instead of passing with partial choices", () => {
    expect(read({ ...holding(), technologies: ["LCD video wall", "LED video wall"] }).verdict)
      .toContain("does not offer all three wall technologies");
  });

  it("returns a concise reading alongside the verdict", () => {
    expect(read(holding())).toEqual({
      verdict: null,
      summary: 'card 338px holding 306px, heading "What kind of wall?", 3 wall technologies (LCD video wall, LED video wall, Projection wall), widest block 306px',
    });
  });

  it("names a missing step without pretending a measurement exists", () => {
    expect(readWallStartStep(null, { at: "390px" })).toEqual({
      verdict: "The walk could not find the guided wall wizard's first step at 390px.",
      summary: null,
    });
  });

  it("keeps its viewport set and reader as the complete surface", () => {
    expect(WALL_START_VIEWPORTS.map((viewport) => viewport.width)).toEqual([1366, 390, 360]);
    expect(Object.keys(stepModule).sort()).toEqual(["WALL_START_VIEWPORTS", "readWallStartStep"]);
  });
});
