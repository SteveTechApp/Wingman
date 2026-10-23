import { describe, expect, it } from "vitest";
import { defaultWallRequirements } from "./videowallOptions";
import { wallVisualLayout, wallVisualWindowGrid } from "./videowallVisual";

describe("video wall elevation geometry", () => {
  it("lays out a 2 × 2 wall of 4K panels as one window in each panel", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "lcd-direct", layout: "independent", columns: 2, rows: 2, sources: 4 });
    expect(layout.mode).toBe("panels");
    expect(layout.panels).toBe(4);
    expect(layout.aspectLabel).toBe("16:9");
    expect(layout.windows).toHaveLength(4);
    expect(layout.windows.map((window) => window.label)).toEqual(["1", "2", "3", "4"]);
    expect(layout.caption).toContain("own feed");
    expect(layout.pixelsLabel).toBe("Each panel 3840 × 2160");
  });

  it("keeps the tall wall aspect for a portrait array", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "lcd-loop", orientation: "portrait", columns: 2, rows: 2, layout: "single", windows: 1 });
    expect(layout.aspectLabel).toBe("9:16");
    expect(layout.wall.height).toBeGreaterThan(layout.wall.width);
    expect(layout.windows).toHaveLength(1);
  });

  it("uses the composed canvas for a wide LED wall", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "led", ledCanvasWidth: 5120, ledCanvasHeight: 1440, layout: "single", windows: 1 });
    expect(layout.mode).toBe("canvas");
    expect(layout.aspectLabel).toBe("32:9");
    expect(layout.pixelsLabel).toBe("Canvas 5120 × 1440");
  });

  it("draws one projection screen with the layout's windows", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "projection", layout: "quad", windows: 4 });
    expect(layout.mode).toBe("screen");
    expect(layout.aspectLabel).toBe("16:9");
    expect(layout.windows).toHaveLength(4);
    expect(layout.caption).toContain("projector");
  });

  it("draws a two-projector screen as one wide canvas split between them", () => {
    const layout = wallVisualLayout({
      ...defaultWallRequirements,
      application: "projection",
      projectors: 2,
      layout: "single",
      windows: 1,
    });

    expect(layout.mode).toBe("screen");
    expect(layout.aspectLabel).toBe("32:9");
    expect(layout.arrayLabel).toBe("2 projectors");
    expect(layout.pixelsLabel).toBe("Canvas 7680 × 2160 · each projector 3840 × 2160");
    expect(layout.caption).toContain("2 projectors each carry one slice");
    // One surface, two images: the drawing divides it in half and names each
    // image, so the screen does not print as a single unbroken canvas.
    expect(layout.projectorSlices.map((slice) => slice.label)).toEqual(["P1", "P2"]);
    expect(layout.projectorSlices.map((slice) => [slice.start, slice.end])).toEqual([[0, 0.5], [0.5, 1]]);
  });

  it("leaves a surface that carries one image undivided", () => {
    const single = wallVisualLayout({ ...defaultWallRequirements, application: "projection", layout: "single", windows: 1 });
    const led = wallVisualLayout({ ...defaultWallRequirements, application: "led", layout: "single", windows: 1 });
    const lcd = wallVisualLayout({ ...defaultWallRequirements, application: "lcd-loop", layout: "single", columns: 2, rows: 2, windows: 1 });

    expect(single.projectorSlices).toEqual([]);
    expect(led.projectorSlices).toEqual([]);
    expect(lcd.projectorSlices).toEqual([]);
  });

  it("divides a four-projector screen into four equal images", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "projection", projectors: 4, layout: "single", windows: 1 });

    expect(layout.projectorSlices.map((slice) => slice.label)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(layout.projectorSlices.map((slice) => slice.start)).toEqual([0, 0.25, 0.5, 0.75]);
    expect(layout.aspectLabel).toBe("64:9");
  });

  it("cycles source labels when there are fewer sources than windows", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "lcd-loop", layout: "nine", windows: 9, sources: 4 });
    expect(layout.windows.map((window) => window.label)).toEqual(["1", "2", "3", "4", "1", "2", "3", "4", "1"]);
  });

  it("builds a grid for custom window counts", () => {
    expect(wallVisualWindowGrid({ ...defaultWallRequirements, layout: "custom", columns: 4, windows: 6 }, 6)).toEqual({ columns: 3, rows: 2 });
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "lcd-loop", layout: "custom", customMode: "fixed", columns: 4, rows: 2, windows: 6, sources: 6 });
    expect(layout.windowColumns * layout.windowRows).toBeGreaterThanOrEqual(6);
    expect(layout.windows).toHaveLength(6);
  });

  it("says how many panels a plan's windows are composed over", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "lcd-loop", layout: "quad", columns: 3, rows: 3, windows: 4, sources: 4 });

    // Four windows on a 3 × 3 wall are composed across 1.5-panel regions, so the
    // drawing and its caption have to state the nine panels they sit on.
    expect(layout.panels).toBe(9);
    expect(layout.windowColumns).toBe(2);
    expect(layout.windowRows).toBe(2);
    expect(layout.arrayLabel).toBe("3 × 3 array (9 panels)");
    expect(layout.caption).toContain("One canvas spans all 9 panels");
    expect(layout.caption).toContain("the 4 windows are composed across it");
  });

  it("states a single panel and a single window without inventing an array", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "lcd-loop", layout: "single", columns: 1, rows: 1, windows: 1 });

    expect(layout.arrayLabel).toBe("1 × 1 array (1 panel)");
    expect(layout.caption).toBe("One canvas fills the single panel; one window fills it.");
  });

  it("names the feeds a grouped wall is wired on", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "lcd-grouped", columns: 3, rows: 3, windows: 1, layout: "single", displayFeeds: 3 });

    expect(layout.mode).toBe("panels");
    expect(layout.feeds.map((feed) => feed.panels)).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    expect(layout.caption).toBe("9 panels on 3 feeds: panels 1–3, panels 4–6, panels 7–9. Each feed carries the slice its displays tile.");
  });

  it("draws the surveyed overlap as the band two images share", () => {
    const layout = wallVisualLayout({
      ...defaultWallRequirements,
      application: "projection",
      projectors: 2,
      blendOverlapMm: 60,
      layout: "single",
      windows: 1,
    });

    // One boundary between two images, and the band is centred on it: each
    // image runs half the overlap past the point where the two meet.
    expect(layout.projectorBlends).toHaveLength(1);
    const [blend] = layout.projectorBlends;
    expect(blend.overlapMm).toBe(60);
    expect(blend.x).toBe(0.5);
    expect(blend.start).toBeCloseTo(0.5 - 60 / layout.physical.wall.width / 2, 5);
    expect(blend.end).toBeCloseTo(0.5 + 60 / layout.physical.wall.width / 2, 5);
  });

  it("divides the screen where the rep put the seam", () => {
    const layout = wallVisualLayout({
      ...defaultWallRequirements,
      application: "projection",
      projectors: 2,
      projectorSplits: [0.42],
      layout: "single",
      windows: 1,
    });

    // A wide image beside a narrow one still carries one canvas, but the two
    // meet at 42% rather than in the middle.
    expect(layout.projectorSlices.map((slice) => [slice.start, slice.end])).toEqual([[0, 0.42], [0.42, 1]]);
    expect(layout.imageSharesLabel).toBe("42% / 58%");
    expect(layout.caption).toContain("The images are unequal — 42% / 58% of the screen");

    const even = wallVisualLayout({ ...defaultWallRequirements, application: "projection", projectors: 2, layout: "single", windows: 1 });
    expect(even.imageSharesLabel).toBe("50% / 50%");
    expect(even.caption).not.toContain("unequal");
  });

  it("centres the blend on the moved seam, bounded by the narrower image", () => {
    const layout = wallVisualLayout({
      ...defaultWallRequirements,
      application: "projection",
      projectors: 2,
      projectorSplits: [0.42],
      blendOverlapMm: 1000,
      layout: "single",
      windows: 1,
    });

    const [blend] = layout.projectorBlends;
    expect(blend.x).toBe(0.42);
    // A fifth of the narrower image is the most the band can take, so the wide
    // image beside it keeps its edge.
    expect(blend.end - blend.start).toBeCloseTo(0.2 * 0.42, 5);
  });

  it("claims no blend region until the overlap has been measured", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, application: "projection", projectors: 2, layout: "single", windows: 1 });

    expect(layout.projectorSlices).toHaveLength(2);
    expect(layout.projectorBlends).toEqual([]);
  });

  it("keeps a mistyped blend inside the image it sits in, and off a one-image wall", () => {
    const wide = wallVisualLayout({ ...defaultWallRequirements, application: "projection", projectors: 2, blendOverlapMm: 1000, layout: "single", windows: 1 });
    const [blend] = wide.projectorBlends;

    // A fifth of one image is the most a band can take, so a figure typed with
    // an extra digit cannot swallow the slice it is drawn in.
    expect(blend.end - blend.start).toBeCloseTo(0.2 * 0.5, 5);

    const single = wallVisualLayout({ ...defaultWallRequirements, application: "projection", blendOverlapMm: 60, layout: "single", windows: 1 });
    expect(single.projectorBlends).toEqual([]);
  });

  it("never produces an empty drawing box", () => {
    const layout = wallVisualLayout({ ...defaultWallRequirements, columns: 16, rows: 1, layout: "single", windows: 1 });
    expect(layout.wall.width).toBeGreaterThan(0);
    expect(layout.wall.height).toBeGreaterThan(0);
    expect(layout.wall.width).toBeLessThanOrEqual(1600);
    expect(layout.wall.height).toBeLessThanOrEqual(900);
  });
});
