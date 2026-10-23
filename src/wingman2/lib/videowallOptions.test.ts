import { normalizeWallDesignMetadata } from "./videowallOptions";
import { describe, expect, it } from "vitest";
import { MAX_BLEND_OVERLAP_MM, MIN_PROJECTOR_IMAGE_SHARE, assessVideowallOptions, defaultWallRequirements, validateWallRequirements, wallAspectWarning, wallBlendOverlapMm, wallCanvasAspect, wallCanvasPlan, wallDisplayFeedCount, wallDisplayFeeds, wallFeedSummaryText, wallPanelRangeText, wallProjectorSplits, wallResolutionBudget, wallResolutionSummary, type WallRequirements } from "./videowallOptions";
const assess = (id: string, changes: Partial<WallRequirements> = {}) => assessVideowallOptions({ ...defaultWallRequirements, ...changes }).find(option => option.id === id)!;
describe("videowall design options", () => {
  it("sizes per-panel receivers and excludes undersized matrices", () => {
    const changes = { columns: 3, rows: 3, sources: 6 };
    expect(assess("mx-0404-scl", changes).blockers).toHaveLength(2);
    expect(assess("mx-0812-scl", changes).blockers).toEqual([]);
    expect(assess("nhd500", changes).equipment).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: "NHD-500-TX", quantity: 6 }), expect.objectContaining({ sku: "NHD-500-RX", quantity: 9 }),
    ]));
  });
  it("does not confuse one composed output with independent panel feeds", () => {
    expect(assess("nhd150", { sourceResolution: "1080p" }).blockers.join(" ")).toContain("one-output");
    expect(assess("nhd150", { application: "lcd-loop", sourceResolution: "1080p", windows: 4, layout: "quad" }).blockers).toEqual([]);
    expect(validateWallRequirements({ ...defaultWallRequirements, application: "lcd-loop", layout: "independent" })).toHaveLength(1);
  });
  it("applies NHD-150 stream limits by source resolution", () => {
    const changes = { application: "led", sources: 9, windows: 9, layout: "nine" } as const;
    expect(assess("nhd150", { ...changes, sourceResolution: "1080p" }).blockers).toEqual([]);
    expect(assess("nhd150", { ...changes, sourceResolution: "4k30" }).blockers.join(" ")).toContain("limit");
    expect(assess("nhd150", { ...changes, sourceResolution: "4k60" }).blockers.join(" ")).toContain("4K60");
  });
  it("offers a dedicated 600 receive unit for a 16-window projector", () => {
    const result = assess("nhd600", { application: "projection", sources: 16, windows: 16, layout: "custom", network: "10g" });
    expect(result.blockers).toEqual([]);
    expect(result.equipment[0].quantity).toBe(17);
    expect(result.path.at(-1)).toContain("one projector");
    expect(assess("nhd600", { network: "1g" }).blockers).toHaveLength(1);
  });
  it("requires a real HDMI composition stage for 500-series multiview", () => {
    const changes = { application: "lcd-loop", sources: 8, windows: 4, layout: "quad" } as const;
    expect(assess("nhd500", changes).blockers.join(" ")).toContain("external multiview");
    const hybrid = assess("nhd500-multiview", changes);
    expect(hybrid.blockers).toEqual([]);
    expect(hybrid.equipment).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: "NHD-500-TX", quantity: 8 }),
      expect.objectContaining({ sku: "NHD-500-RX", quantity: 4 }),
      expect.objectContaining({ sku: "NHD-0401-MV", quantity: 1 }),
    ]));
  });
  it("rejects invalid counts, unsupported composition and network requirements", () => {
    for (const sources of [0, -1, 1.5, NaN, Infinity, 65]) expect(assessVideowallOptions({ ...defaultWallRequirements, sources }).every(option => option.blockers.length)).toBe(true);
    expect(assess("hdmi-multiview", { application: "projection", sources: 5 }).blockers.join(" ")).toContain("upstream switching");
    expect(assess("nhd500", { network: "none" }).blockers).toHaveLength(1);
    expect(assess("mx-0812-scl", { layout: "quad", windows: 4 }).blockers.join(" ")).toContain("per-panel cropping");
    expect(assess("mx-0404-scl", { sourceLocation: "distributed" }).blockers.join(" ")).toContain("Remote source transport");
  });
  it("does not recommend retired products and supplies manufacturer evidence", () => {
    const options = assessVideowallOptions(defaultWallRequirements);
    expect(options.flatMap(option => option.equipment).some(e => ["NHD-250-RX", "MX-0808-SCL"].includes(e.sku))).toBe(false);
    expect(options.every(option => option.sources.length > 0 && option.sources.every(s => s.url.startsWith("https://www.wyrestorm.com/")))).toBe(true);
  });
  it("keeps dedicated wall processors within source, panel and layout capacity", () => {
    expect(assess("sw-0204-vw", { sources: 2 }).blockers).toEqual([]);
    expect(assess("sw-0204-vw", { sources: 2, columns: 3 }).blockers.length).toBeGreaterThan(0);
    expect(assess("sw-0206-vw", { sources: 2, columns: 3 }).blockers).toEqual([]);
    expect(assess("sw-0206-vw", { layout: "independent", sources: 2 }).blockers.join(" ")).toContain("one selected source");
  });
  it("measures the wall canvas and warns when it is not 16:9", () => {
    expect(wallCanvasAspect({ ...defaultWallRequirements, columns: 2, rows: 2 })).toMatchObject({ label: "16:9", standard: true });
    expect(wallCanvasAspect({ ...defaultWallRequirements, columns: 3, rows: 3 })).toMatchObject({ label: "16:9", standard: true });
    expect(wallCanvasAspect({ ...defaultWallRequirements, columns: 4, rows: 2 })).toMatchObject({ label: "32:9", standard: false });
    expect(wallCanvasAspect({ ...defaultWallRequirements, columns: 3, rows: 2 })).toMatchObject({ label: "8:3", standard: false });
    expect(wallCanvasAspect({ ...defaultWallRequirements, columns: 4, rows: 1 })).toMatchObject({ label: "64:9", standard: false });
    expect(wallCanvasAspect({ ...defaultWallRequirements, columns: 2, rows: 2, orientation: "portrait" })).toMatchObject({ label: "9:16", standard: false });
  });

  it("warns about stretching a single source across a non-standard wall", () => {
    const wide = { ...defaultWallRequirements, columns: 4, rows: 2, sources: 1 };
    const warning = wallAspectWarning(wide);
    expect(warning).toContain("32:9");
    expect(warning).toContain("stretch");
    expect(wallAspectWarning({ ...wide, columns: 2, rows: 2 })).toBeNull();
    expect(wallAspectWarning({ ...wide, layout: "independent", sources: 8 })).toBeNull();
    expect(wallAspectWarning({ ...wide, application: "led" })).toBeNull();
    expect(wallAspectWarning({ ...wide, layout: "quad", windows: 4, sources: 4 })).toContain("window");
    expect(assessVideowallOptions(wide).every(option => option.checks.some(check => check.includes("32:9")))).toBe(true);
  });
  it("separates recalled fixed layouts from floating drag-and-drop windows", () => {
    const base = {
      ...defaultWallRequirements,
      application: "led" as const,
      layout: "custom" as const,
      windows: 4,
      sources: 4,
      sourceResolution: "1080p" as const,
    };
    const fixed = assessVideowallOptions({ ...base, customMode: "fixed" });
    expect(fixed.find(option => option.id === "nhd600")!.blockers).toEqual([]);
    expect(fixed.find(option => option.id === "nhd600")!.checks.join(" ")).toContain("X/Y pixel");
    expect(fixed.find(option => option.id === "nhd150")!.blockers.join(" ")).toContain("drag-and-drop");

    const floating = assessVideowallOptions({ ...base, customMode: "floating" });
    expect(floating.find(option => option.id === "nhd150")!.blockers).toEqual([]);
    expect(floating.find(option => option.id === "nhd150")!.checks.join(" ")).toContain("drag and drop");
    expect(floating.find(option => option.id === "nhd600")!.blockers.join(" ")).toContain("floating");

    expect(validateWallRequirements({ ...base, customMode: "floating", windows: 7, sources: 7 }).join(" ")).toContain("up to 6");
    expect(validateWallRequirements({ ...base, customMode: "fixed", windows: 7, sources: 7 })).toEqual([]);
  });
  it("calculates the wall canvas and per-display resolution", () => {
    const fourK = wallResolutionSummary({ ...defaultWallRequirements, columns: 2, rows: 2 });
    expect(fourK.canvas).toEqual({ width: 7680, height: 4320 });
    expect(fourK.display).toEqual({ width: 3840, height: 2160 });
    expect(fourK.source).toEqual({ width: 3840, height: 2160 });
    expect(fourK.native).toBe(false);
    expect(fourK.label).toContain("2× upscale");

    const hd = wallResolutionSummary({ ...defaultWallRequirements, columns: 2, rows: 2, displayResolution: "1080p", sourceResolution: "1080p" });
    expect(hd.canvas).toEqual({ width: 3840, height: 2160 });
    expect(hd.native).toBe(false);
    expect(hd.label).toContain("2× upscale");

    const matched = wallResolutionSummary({ ...defaultWallRequirements, columns: 2, rows: 2, displayResolution: "4k", sourceResolution: "4k60" });
    expect(matched.canvas).toEqual({ width: 7680, height: 4320 });
    expect(matched.label).toContain("2× upscale");

    const panelNative = wallResolutionSummary({ ...defaultWallRequirements, columns: 2, rows: 2, displayResolution: "1080p", sourceResolution: "1080p", layout: "independent", sources: 4 });
    expect(panelNative.native).toBe(true);
    expect(panelNative.label).toContain("1:1");

    const perScreen = wallResolutionSummary({ ...defaultWallRequirements, columns: 2, rows: 2, layout: "independent", sources: 4 });
    expect(perScreen.native).toBe(true);
    expect(perScreen.label).toContain("each screen");

    const wide = wallResolutionSummary({ ...defaultWallRequirements, columns: 4, rows: 2 });
    expect(wide.canvas).toEqual({ width: 15360, height: 4320 });

    const portrait = wallResolutionSummary({ ...defaultWallRequirements, columns: 2, rows: 2, displayResolution: "1080p", orientation: "portrait" });
    expect(portrait.display).toEqual({ width: 1080, height: 1920 });
    expect(portrait.canvas).toEqual({ width: 2160, height: 3840 });

    const led = wallResolutionSummary({ ...defaultWallRequirements, application: "led", ledCanvasWidth: 5120, ledCanvasHeight: 1440, sourceResolution: "1080p" });
    expect(led.canvas).toEqual({ width: 5120, height: 1440 });
    expect(led.native).toBe(false);

    const projection = wallResolutionSummary({ ...defaultWallRequirements, application: "projection", displayResolution: "1080p", sourceResolution: "1080p" });
    expect(projection.canvas).toEqual({ width: 1920, height: 1080 });
    expect(projection.native).toBe(true);

    const nativeCanvas = wallResolutionSummary({ ...defaultWallRequirements, columns: 2, rows: 2, displayResolution: "1080p", sourceResolution: "4k60" });
    expect(nativeCanvas.canvas).toEqual({ width: 3840, height: 2160 });
    expect(nativeCanvas.native).toBe(true);
  });

  it("builds a copy-ready resolution budget for each display type", () => {
    const composed = wallResolutionBudget({ ...defaultWallRequirements, columns: 2, rows: 2 });
    expect(composed.headline).toContain("Wall canvas 7680 × 4320");
    expect(composed.headline).toContain("each panel 3840 × 2160");
    expect(composed.headline).toContain("source 3840 × 2160");
    expect(composed.text).toBe(`${composed.headline}. ${composed.mapping}`);

    const perPanel = wallResolutionBudget({ ...defaultWallRequirements, columns: 2, rows: 2, layout: "independent", sources: 4 });
    expect(perPanel.headline).toContain("Wall total 7680 × 4320 · 4 separate panel feeds");
    expect(perPanel.mapping).toContain("each screen");

    const led = wallResolutionBudget({ ...defaultWallRequirements, application: "led", ledCanvasWidth: 5120, ledCanvasHeight: 1440 });
    expect(led.headline).toBe("LED canvas 5120 × 1440 · source 3840 × 2160");
    expect(led.mapping).toContain("LED canvas");

    const projection = wallResolutionBudget({ ...defaultWallRequirements, application: "projection", displayResolution: "1080p", sourceResolution: "1080p" });
    expect(projection.headline).toBe("Projector 1920 × 1080 · source 1920 × 1080");
  });

  it("honours custom panel and source pixels", () => {
    const customPanel = wallResolutionSummary({
      ...defaultWallRequirements, columns: 2, rows: 2,
      displayCustom: true, displayWidth: 2560, displayHeight: 1600,
    });
    expect(customPanel.display).toEqual({ width: 2560, height: 1600 });
    expect(customPanel.canvas).toEqual({ width: 5120, height: 3200 });

    const customSource = wallResolutionSummary({
      ...defaultWallRequirements, columns: 2, rows: 1,
      displayCustom: true, displayWidth: 2560, displayHeight: 1600,
      sourceCustom: true, sourceWidth: 2560, sourceHeight: 1440,
    });
    expect(customSource.source).toEqual({ width: 2560, height: 1440 });
    expect(customSource.label).toContain("Custom");
    expect(customSource.label).toContain("2560 × 1440");
    expect(customSource.label).toContain("4K60 timing");

    const budget = wallResolutionBudget({
      ...defaultWallRequirements,
      displayCustom: true, displayWidth: 2560, displayHeight: 1600,
      sourceCustom: true, sourceWidth: 1920, sourceHeight: 1200,
    });
    expect(budget.headline).toContain("each panel 2560 × 1600");
    expect(budget.headline).toContain("source 1920 × 1200");

    // A preset wins again once the custom switch is off.
    const presetAgain = wallResolutionSummary({
      ...defaultWallRequirements,
      displayCustom: false, displayWidth: 2560, displayHeight: 1600,
    });
    expect(presetAgain.display).toEqual({ width: 3840, height: 2160 });

    // A 16:10 panel array is not a 16:9 canvas.
    const aspect = wallCanvasAspect({
      ...defaultWallRequirements, columns: 2, rows: 2,
      displayCustom: true, displayWidth: 2560, displayHeight: 1600,
    });
    expect(aspect.standard).toBe(false);
    expect(aspect.label).toBe("8:5");
    expect(wallCanvasAspect(defaultWallRequirements)).toMatchObject({ label: "16:9", standard: true });

    expect(validateWallRequirements({ ...defaultWallRequirements, displayWidth: 0 }).join(" ")).toContain("Panel width");
    expect(validateWallRequirements({ ...defaultWallRequirements, sourceHeight: 20000 }).join(" ")).toContain("Source height");
    // The elevation dimensions the mounting gap, so an impossible height blocks.
    expect(validateWallRequirements({ ...defaultWallRequirements, mountingHeightMm: -1 }).join(" ")).toContain("Mounting height");
    expect(validateWallRequirements({ ...defaultWallRequirements, mountingHeightMm: 2500 }).join(" ")).toContain("Mounting height");
    expect(validateWallRequirements({ ...defaultWallRequirements, mountingHeightMm: 0 })).toEqual([]);
  });

  it("recommends a canvas and crop or letterbox strategy for non-16:9 arrays", () => {
    const wide = wallCanvasPlan({ ...defaultWallRequirements, columns: 4, rows: 2, layout: "single", windows: 1 });
    expect(wide.native).toEqual({ width: 15360, height: 4320 });
    expect(wide.canvas).toEqual({ width: 3840, height: 1080 });
    expect(wide.perPanel).toEqual({ width: 960, height: 540 });
    expect(wide.scaled).toBe(true);
    expect(wide.recommended).toBe("fill");
    expect(wide.fill.crop).toEqual({ horizontal: 0, vertical: 540 });
    expect(wide.fit.bars).toEqual({ horizontal: 960, vertical: 0 });
    expect(wide.text).toContain("3840 × 1080");
    expect(wide.text).toContain("540 px cropped top and bottom");

    // Multiple windows keep every feed whole instead of cropping them.
    const windows = wallCanvasPlan({ ...defaultWallRequirements, columns: 4, rows: 2, layout: "quad", windows: 4, sources: 4 });
    expect(windows.recommended).toBe("fit");
    expect(windows.text).toContain("fit the source");

    // A 16:9 array needs no bars or crop, even when the canvas is scaled down.
    const matched = wallCanvasPlan({ ...defaultWallRequirements, columns: 2, rows: 2, layout: "single", windows: 1 });
    expect(matched.canvas).toEqual({ width: 3840, height: 2160 });
    expect(matched.scaled).toBe(true);
    expect(matched.recommended).toBe("match");
    expect(matched.fit.bars).toEqual({ horizontal: 0, vertical: 0 });

    // 3 × 2 (8:3) fills a 3840 × 1440 canvas by cropping top and bottom.
    const eightThree = wallCanvasPlan({ ...defaultWallRequirements, columns: 3, rows: 2, layout: "single", windows: 1 });
    expect(eightThree.canvas).toEqual({ width: 3840, height: 1440 });
    expect(eightThree.fill.crop.vertical).toBe(360);
    expect(eightThree.fit.bars.horizontal).toBe(640);

    // Per-panel feeds run each screen natively and need no canvas strategy.
    const perPanel = wallCanvasPlan({ ...defaultWallRequirements, columns: 2, rows: 2, layout: "independent", sources: 4 });
    expect(perPanel.recommended).toBe("per-panel");
    expect(perPanel.canvas).toEqual({ width: 3840, height: 2160 });
    expect(perPanel.headline).toContain("Per-panel feeds");

    // LED and projector canvases use their own native pixels.
    const led = wallCanvasPlan({ ...defaultWallRequirements, application: "led", ledCanvasWidth: 5120, ledCanvasHeight: 1440, layout: "single", windows: 1 });
    expect(led.canvas).toEqual({ width: 5120, height: 1440 });
    expect(led.recommended).toBe("fill");
    expect(led.fill.crop.vertical).toBe(720);

    const projector = wallCanvasPlan({ ...defaultWallRequirements, application: "projection", displayCustom: true, displayWidth: 1920, displayHeight: 1200, layout: "single", windows: 1 });
    expect(projector.canvas).toEqual({ width: 1920, height: 1200 });
    expect(projector.recommended).toBe("fill");
    expect(projector.fill.crop.horizontal).toBe(107);
  });

  it("programs the mapping the rep chose instead of the default", () => {
    // Multiple windows default to fit; the rep can still choose the crop.
    const windows = { ...defaultWallRequirements, columns: 4, rows: 2, layout: "single" as const, windows: 2, sources: 2 };
    expect(wallCanvasPlan(windows).recommended).toBe("fit");
    const filled = wallCanvasPlan({ ...windows, mapping: "fill" });
    expect(filled.recommended).toBe("fill");
    expect(filled.text).toContain("540 px cropped top and bottom");

    // One window defaults to fill; the rep can keep every pixel instead.
    const single = { ...defaultWallRequirements, columns: 4, rows: 2, layout: "single" as const, windows: 1 };
    expect(wallCanvasPlan(single).recommended).toBe("fill");
    const bars = wallCanvasPlan({ ...single, mapping: "fit" });
    expect(bars.recommended).toBe("fit");
    expect(bars.text).toContain("960 px bars left and right");

    // A stored choice never invents a bar or crop where none exists, and a
    // per-panel wall has no shared canvas to map at all.
    expect(wallCanvasPlan({ ...defaultWallRequirements, columns: 2, rows: 2, layout: "single", windows: 1, mapping: "fill" }).recommended).toBe("match");
    expect(wallCanvasPlan({ ...defaultWallRequirements, layout: "independent", sources: 4, mapping: "fill" }).recommended).toBe("per-panel");
    expect(validateWallRequirements({ ...defaultWallRequirements, mapping: "stretch" as never }).join(" ")).toContain("fit or fill");
  });

  it("carries the canvas plan into every design's checks", () => {
    const checks = assessVideowallOptions({ ...defaultWallRequirements, columns: 4, rows: 2, layout: "single", windows: 1 });
    expect(checks.every((option) => option.checks.some((check) => check.startsWith("Canvas plan:")))).toBe(true);
    const matched = assessVideowallOptions({ ...defaultWallRequirements, columns: 2, rows: 2, layout: "single", windows: 1 });
    expect(matched.some((option) => option.checks.some((check) => check.startsWith("Canvas plan:")))).toBe(true);
  });

  it("surfaces the resolution mismatch as a check and validates the LED canvas", () => {
    const options = assessVideowallOptions({ ...defaultWallRequirements, columns: 2, rows: 2 });
    expect(options.every(option => option.checks.some(check => check.startsWith("Resolution check:")))).toBe(true);
    const native = assessVideowallOptions({ ...defaultWallRequirements, displayResolution: "1080p", sourceResolution: "1080p", layout: "independent", sources: 4 });
    expect(native.every(option => option.checks.every(check => !check.startsWith("Resolution check:")))).toBe(true);
    expect(validateWallRequirements({ ...defaultWallRequirements, ledCanvasWidth: 0 }).join(" ")).toContain("LED canvas width");
    expect(validateWallRequirements({ ...defaultWallRequirements, ledCanvasHeight: 40000 }).join(" ")).toContain("LED canvas height");
  });
});

it("discards malformed persisted wall evidence without losing the design", () => {
  const wall = normalizeWallDesignMetadata({ ...defaultWallRequirements, panelMassOverride: { kg: 10, model: null }, mappingHistory: [null, { appliedAt: "bad", before: {} }], linkTransports: { "display-1": null, "display-2": { cable: "fibre", segments: Infinity } }, roomHeightMm: Infinity, surveyDraftOverride: "yes" } as unknown as WallRequirements);
  expect(wall.panelMassOverride).toBeUndefined();
  expect(wall.mappingHistory).toEqual([]);
  expect(wall.linkTransports).toEqual({ "display-2": { cable: "fibre", segments: 1 } });
  expect(wall.roomHeightMm).toBeUndefined();
  expect(wall.surveyDraftOverride).toBe(false);
});

describe("videowall blend overlap", () => {
  const pair = { application: "projection", projectors: 2 } as const;

  it("reads a measured overlap only from a screen two projectors divide", () => {
    expect(wallBlendOverlapMm({ ...defaultWallRequirements, ...pair, blendOverlapMm: 60 })).toBe(60);

    // An unmeasured figure, or a wall that is one image, has no blend to record.
    expect(wallBlendOverlapMm({ ...defaultWallRequirements, ...pair })).toBe(0);
    expect(wallBlendOverlapMm({ ...defaultWallRequirements, ...pair, blendOverlapMm: -20 })).toBe(0);
    expect(wallBlendOverlapMm({ ...defaultWallRequirements, application: "projection", blendOverlapMm: 60 })).toBe(0);
    expect(wallBlendOverlapMm({ ...defaultWallRequirements, application: "lcd-loop", blendOverlapMm: 60 })).toBe(0);
  });

  it("bounds the figure so a mistyped survey cannot swallow the screen", () => {
    expect(wallBlendOverlapMm({ ...defaultWallRequirements, ...pair, blendOverlapMm: 5000 })).toBe(MAX_BLEND_OVERLAP_MM);
    expect(wallBlendOverlapMm({ ...defaultWallRequirements, ...pair, blendOverlapMm: 44.6 })).toBe(45);
  });

  it("divides the screen equally until a seam is moved", () => {
    const pair = { application: "projection", projectors: 2 } as const;

    expect(wallProjectorSplits({ ...defaultWallRequirements, ...pair })).toEqual([0.5]);
    expect(wallProjectorSplits({ ...defaultWallRequirements, ...pair, projectorSplits: [0.42] })).toEqual([0.42]);
    expect(wallProjectorSplits({ ...defaultWallRequirements, application: "projection", projectors: 4 })).toEqual([0.25, 0.5, 0.75]);
    // A wall that is one image has no seam to place.
    expect(wallProjectorSplits({ ...defaultWallRequirements, application: "projection", projectorSplits: [0.42] })).toEqual([]);
    expect(wallProjectorSplits({ ...defaultWallRequirements, application: "led", projectorSplits: [0.42] })).toEqual([]);
  });

  it("keeps every image real when a seam is dragged too far", () => {
    const pair = { application: "projection", projectors: 2 } as const;

    expect(wallProjectorSplits({ ...defaultWallRequirements, ...pair, projectorSplits: [0.02] })).toEqual([MIN_PROJECTOR_IMAGE_SHARE]);
    expect(wallProjectorSplits({ ...defaultWallRequirements, ...pair, projectorSplits: [0.99] })[0]).toBeCloseTo(1 - MIN_PROJECTOR_IMAGE_SHARE, 5);

    // Three seams on four images stay in order with a share left for each image.
    const four = wallProjectorSplits({ ...defaultWallRequirements, application: "projection", projectors: 4, projectorSplits: [0.9, 0.1, 0.95] });
    expect(four).toEqual([0.7, 0.8, 0.9]);
  });

  it("carries the seams with the design and drops them from a wall that is one image", () => {
    const pair = { application: "projection", projectors: 2 } as const;

    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, ...pair, projectorSplits: [0.42] }).projectorSplits).toEqual([0.42]);
    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, application: "projection", projectorSplits: [0.42] }).projectorSplits).toBeUndefined();
    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, application: "lcd-direct", projectorSplits: [0.42] }).projectorSplits).toBeUndefined();
    // The equal split is the default, so it is not stored as an answer.
    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, ...pair }).projectorSplits).toBeUndefined();
    // A rotted figure is clamped rather than drawn past the edge of the screen.
    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, ...pair, projectorSplits: [0.95] }).projectorSplits).toEqual([1 - MIN_PROJECTOR_IMAGE_SHARE]);
  });

  it("drops a stored blend when the screen is no longer divided", () => {
    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, ...pair, blendOverlapMm: 60 }).blendOverlapMm).toBe(60);
    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, application: "projection", blendOverlapMm: 60 }).blendOverlapMm).toBeUndefined();
    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, application: "lcd-direct", blendOverlapMm: 60 }).blendOverlapMm).toBeUndefined();
  });
});

describe("grouped LCD feeds", () => {
  const grouped = (changes: Partial<WallRequirements> = {}): WallRequirements => ({
    ...defaultWallRequirements,
    application: "lcd-grouped",
    columns: 3,
    rows: 3,
    windows: 1,
    layout: "single",
    ...changes,
  });

  it("falls back to one feed per row, so a wall is wired before a count is chosen", () => {
    const feeds = wallDisplayFeeds(grouped());

    expect(feeds.map((feed) => feed.panels)).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    expect(feeds.map((feed) => feed.label)).toEqual(["Feed 1 · panels 1–3", "Feed 2 · panels 4–6", "Feed 3 · panels 7–9"]);
    expect(wallDisplayFeedCount(grouped())).toBe(3);
  });

  it("merges neighbouring rows for fewer feeds than rows", () => {
    const feeds = wallDisplayFeeds(grouped({ displayFeeds: 2 }));

    expect(feeds.map((feed) => feed.panels)).toEqual([[1, 2, 3, 4, 5, 6], [7, 8, 9]]);
    expect(wallPanelRangeText(feeds[0].panels)).toBe("panels 1–6");
    // The feed carries the rectangle it covers, not the whole array.
    expect(feeds[0].pixels).toEqual({ width: 3840 * 3, height: 2160 * 2 });
  });

  it("splits a row down its columns for more feeds than rows", () => {
    const feeds = wallDisplayFeeds(grouped({ displayFeeds: 4 }));

    expect(feeds).toHaveLength(4);
    expect(feeds.map((feed) => feed.panels)).toEqual([[1, 2], [3], [4, 5, 6], [7, 8, 9]]);
    // Every group stays rectangular, so its slice of the canvas is a real crop.
    for (const feed of feeds) {
      const rowLengths = new Map<number, number>();
      for (const panel of feed.panels) {
        const row = Math.ceil(panel / 3);
        rowLengths.set(row, (rowLengths.get(row) ?? 0) + 1);
      }
      expect(new Set(rowLengths.values()).size).toBe(1);
    }
  });

  it("gives every display its own feed when the rep asks for one each", () => {
    const feeds = wallDisplayFeeds(grouped({ displayFeeds: 9 }));

    expect(feeds.map((feed) => feed.panels)).toEqual([[1], [2], [3], [4], [5], [6], [7], [8], [9]]);
    expect(wallFeedSummaryText(grouped({ displayFeeds: 9 }))).toBe("9 feeds to the displays: each display gets its own feed");
    expect(wallPanelRangeText([4])).toBe("panel 4");
  });

  it("bounds a stored count by the panels that exist", () => {
    expect(wallDisplayFeeds(grouped({ displayFeeds: 40 }))).toHaveLength(9);
    expect(wallDisplayFeeds(grouped({ displayFeeds: 0 })).map((feed) => feed.panels)).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    expect(validateWallRequirements(grouped({ displayFeeds: 40 }))).toEqual(["Feeds to the displays must be a whole number from 1 to 9."]);
  });

  it("sizes the programmed canvas on the largest feed, not the whole array", () => {
    const plan = wallCanvasPlan(grouped({ displayFeeds: 2 }));

    // Feed 1 carries two rows of three panels, so that slice — not the 3 × 3
    // array — is what one head-end output has to program.
    expect(plan.native).toEqual({ width: 3840 * 3, height: 2160 * 2 });
    expect(plan.canvas).toEqual({ width: 3840, height: 1440 });
    expect(plan.perPanel).toEqual({ width: 1280, height: 720 });
    expect(plan.text).toContain("per feed");
  });

  it("drops the feed count from a wall that is not grouped", () => {
    expect(normalizeWallDesignMetadata({ ...defaultWallRequirements, displayFeeds: 4 }).displayFeeds).toBeUndefined();
    expect(normalizeWallDesignMetadata(grouped({ displayFeeds: 4 })).displayFeeds).toBe(4);
  });
});
