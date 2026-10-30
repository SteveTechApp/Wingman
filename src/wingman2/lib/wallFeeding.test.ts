import { describe, expect, it } from "vitest";
import { defaultWallRequirements } from "./videowallOptions";
import {
  wallFeedPathKeyFor,
  wallFeedPaths,
  wallFeedingAnswer,
  wallFeedingChecks,
  wallFeedingChoices,
  wallFeedingKeyFor,
  wallFeedingModelCheck,
  wallFeedingPanelNote,
  wallFeedingProcessorNote,
} from "./wallFeeding";
import { wallWizardAnswers, wallWizardSteps } from "./videowallWizard";

// A canvas wall is the case most of these read; the per-panel and blended
// answers say so themselves.
const wall = (overrides = {}) => ({ ...defaultWallRequirements, application: "lcd-loop" as const, columns: 2, rows: 2, ...overrides });

describe("wall feeding", () => {
  it("is asked after the wall's size and before its windows", () => {
    expect(wallWizardSteps.map((step) => step.key))
      .toEqual(["job", "picture", "size", "feeding", "layout", "location", "detail"]);
    // The summary a rep reads back carries the same order as the questions.
    expect(wallWizardAnswers(wall()).map((answer) => answer.key))
      .toEqual(["picture", "size", "feeding", "layout", "location"]);
  });

  it("offers only the models a wall of that kind can be built to", () => {
    // An LED canvas here is one processor input; a cabinet-per-cabinet feed is
    // a different design, so it is explained rather than offered as a control.
    expect(wallFeedingChoices(wall({ application: "led" })).map((choice) => choice.key)).toEqual(["single-input"]);
    expect(wallFeedingPanelNote(wall({ application: "led" }))).toContain("decoder and a sending card per panel");
    expect(wallFeedingPanelNote(wall({ application: "lcd-loop" }))).toBeNull();
    // Each LCD wall can be one canvas, one feed per group, or a feed per panel.
    expect(wallFeedingChoices(wall({ application: "lcd-loop" })).map((choice) => choice.key))
      .toEqual(["single-input", "group", "per-panel"]);
    // A single projector has no blend to choose; a pair does.
    expect(wallFeedingChoices(wall({ application: "projection", projectors: 1 })).map((choice) => choice.key))
      .toEqual(["single-input", "blended"]);
    expect(wallFeedingKeyFor(wall({ application: "projection", projectors: 2 }))).toBe("blended");
  });

  it("writes the model into the application and drops a layout it no longer has", () => {
    const perPanel = wallFeedingChoices(wall({ columns: 3, rows: 3 })).find((choice) => choice.key === "per-panel")!;
    expect(perPanel.patch).toEqual({ application: "lcd-direct", layout: "independent", windows: 9 });
    const tiled = wallFeedingChoices(wall({ application: "lcd-direct", layout: "independent", windows: 4 }))
      .find((choice) => choice.key === "single-input")!;
    expect(tiled.patch).toEqual({ application: "lcd-loop", layout: "single", windows: 1 });
    // A wall already built that way has nothing to write.
    expect(wallFeedingChoices(wall({ application: "lcd-loop" })).find((choice) => choice.key === "single-input")!.patch)
      .toBeUndefined();
    const blended = wallFeedingChoices(wall({ application: "projection", projectors: 1 }))
      .find((choice) => choice.key === "blended")!;
    expect(blended.patch).toEqual({ projectors: 2 });
    const single = wallFeedingChoices(wall({ application: "projection", projectors: 3 }))
      .find((choice) => choice.key === "single-input")!;
    expect(single.patch).toEqual({ projectors: 1 });
  });

  it("reads the feed path back from the transport the design holds", () => {
    expect(wallFeedPathKeyFor(wall({ network: "any", sourceLocation: "local" }))).toBe("scaling-switch");
    expect(wallFeedPathKeyFor(wall({ network: "1g", windows: 1 }))).toBe("avoip-decoder");
    // The 1GbE receiver is the multi-window answer; one window is a plain decoder.
    expect(wallFeedPathKeyFor(wall({ network: "1g", windows: 4 }))).toBe("nhd150");
    expect(wallFeedPathKeyFor(wall({ network: "10g", windows: 1 }))).toBe("nhd600");
    expect(wallFeedPathKeyFor(wall({ network: "any", sourceCustom: true }))).toBe("nhd500");
    expect(wallFeedPathKeyFor(wall({ application: "lcd-direct", network: "1g" }))).toBe("avoip-per-panel");
    expect(wallFeedPathKeyFor(wall({ application: "lcd-direct", network: "any" }))).toBe("matrix-per-panel");
  });

  it("offers a per-panel path only to a per-panel wall", () => {
    expect(wallFeedPaths(wall({ application: "lcd-direct" })).map((path) => path.key))
      .toEqual(["matrix-per-panel", "avoip-per-panel"]);
    const tiled = wallFeedPaths(wall({ application: "lcd-loop" })).map((path) => path.key);
    expect(tiled).toEqual(["scaling-switch", "avoip-decoder", "nhd150", "nhd600", "nhd500"]);
    // The model decides the list, so a stale path is not offered back.
    expect(wallFeedPaths(wall({ application: "lcd-direct" }), "per-panel")).toHaveLength(2);
    expect(wallFeedPaths(wall({ application: "lcd-direct" }), "single-input").some((path) => path.key === "nhd600"))
      .toBe(true);
  });

  it("puts the blend on the content rather than only on the projectors", () => {
    const blended = wallFeedingModelCheck(wall({ application: "projection", projectors: 2 }));
    expect(blended).toContain("authored at the blended resolution");
    expect(blended).toContain("any single source across a non-standard aspect ratio");
    // One canvas with the panels tiling it is the loop constraint, not the blend.
    expect(wallFeedingModelCheck(wall({ application: "lcd-loop" }))).toContain("tile mode");
    expect(wallFeedingModelCheck(wall({ application: "led" }))).toContain("resamples the canvas");
    expect(wallFeedingModelCheck(wall({ application: "lcd-direct", layout: "independent" }))).toContain("no window can span two panels");
  });

  it("carries the box that produces the canvas, and falls back to a path the model offers", () => {
    const custom = wallFeedingChecks(wall({ sourceCustom: true }))[1];
    expect(custom).toContain("NHD-500 takes a custom resolution");
    // A per-panel wall cannot be fed by the 600 series, so that check is not printed for it.
    const perPanel = wallFeedingChecks(wall({ application: "lcd-direct" }), "per-panel", "nhd600");
    expect(perPanel[1]).toContain("One output per panel");
    expect(wallFeedingChecks(wall({ application: "lcd-direct" }), "per-panel", "avoip-per-panel")[1])
      .toContain("One decoder per panel");
    // Two checks every time: the model's constraint and the box's.
    expect(wallFeedingChecks(wall())).toHaveLength(2);
  });

  it("says the connection in one line for the answer summary", () => {
    expect(wallFeedingAnswer(wall({ application: "lcd-loop" }))).toBe("One canvas, panels tile it");
    expect(wallFeedingAnswer(wall({ application: "led" }))).toBe("One processor input, panels tile it");
    expect(wallFeedingAnswer(wall({ application: "lcd-grouped" }))).toBe("A feed per looped group");
    expect(wallFeedingAnswer(wall({ application: "lcd-direct", columns: 3, rows: 3 }))).toBe("9 feeds, a panel per feed");
    expect(wallFeedingAnswer(wall({ application: "projection", projectors: 1 }))).toBe("One projector, one input");
    expect(wallFeedingAnswer(wall({ application: "projection", projectors: 2 }))).toBe("2 projectors, one blended canvas");
  });

  it("names the processor's own multiview for an LED wall only", () => {
    expect(wallFeedingProcessorNote(wall({ application: "led" }))).toContain("several HDMI inputs");
    expect(wallFeedingProcessorNote(wall({ application: "lcd-loop" }))).toBeNull();
  });
});
