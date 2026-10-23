import { describe, expect, it } from "vitest";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import { wallVisualLayout } from "./videowallVisual";
import {
  WALL_MAPPING_WARN_SHARE,
  wallElevationCaption,
  wallElevationDimensions,
  wallElevationGeometry,
  wallElevationOverlay,
  wallElevationSvg,
  wallMappingChoices,
  wallMappingCosts,
  wallMappingFixes,
  wallMappingPreviews,
  wallMappingRecommendation,
  wallMappingWarning,
} from "./wallElevation";
import { wallCanvasPixels } from "./videowallOptions";

function requirements(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, ...overrides };
}

describe("wallElevationSvg", () => {
  it("draws every panel and window for an independent LCD wall", () => {
    const wall = requirements({ layout: "independent", columns: 2, rows: 2, windows: 4 });
    const { canvas, drawing } = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);

    expect(svg.startsWith("<svg")).toBe(true);
    // The viewBox carries the dimension margins and the scale figure's lane.
    expect(svg).toContain(`viewBox="0 0 ${drawing.width} ${drawing.height}"`);
    expect(canvas.width).toBeGreaterThan(1600);
    expect(canvas.height).toBeGreaterThan(900);
    expect(drawing.width).toBeGreaterThan(canvas.width);
    expect(drawing.height).toBe(canvas.height);
    expect(svg).toContain('role="img"');
    expect(svg).toContain("2 × 2 array");
    expect(svg.match(/class="wall-elevation-panel"/g)).toHaveLength(4);
    expect(svg.match(/class="wall-elevation-window"/g)).toHaveLength(4);
    expect(svg).toContain(">1</text>");
    expect(svg).not.toContain("wall-elevation-screen");
  });

  it("draws a single LED canvas with the cabinet texture", () => {
    const svg = wallElevationSvg(requirements({ application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 1080 }));

    expect(svg.match(/class="wall-elevation-screen"/g)).toHaveLength(2);
    expect(svg).toContain('id="wall-elevation-led"');
    expect(svg).not.toContain('class="wall-elevation-panel"');
  });

  it("draws one projected screen for a projection wall", () => {
    const svg = wallElevationSvg(requirements({ application: "projection", columns: 1, rows: 1, windows: 1 }));

    expect(svg.match(/class="wall-elevation-screen"/g)).toHaveLength(1);
    expect(svg).not.toContain("wall-elevation-led");
  });

  it("stays self-contained for an inline proposal drawing", () => {
    const svg = wallElevationSvg(requirements({ application: "lcd-loop", columns: 2, rows: 3, windows: 1 }));

    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).not.toContain("<script");
    // The namespace is the only remote reference, so print and DOCX rasterisation
    // never have to fetch anything.
    expect(svg.match(/https?:\/\//g)).toHaveLength(1);
  });
});

describe("wallElevationOverlay", () => {
  it("names the crop a filled 32:9 canvas takes from a 16:9 source", () => {
    const overlay = wallElevationOverlay(requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 1 }));

    expect(overlay).toMatchObject({ mode: "fill", edges: "top-bottom", pixels: 540 });
    expect(overlay?.text).toBe("540 px cropped top and bottom");
  });

  it("names the bars a fitted source leaves on the canvas", () => {
    const overlay = wallElevationOverlay(requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 2, sources: 2 }));

    expect(overlay).toMatchObject({ mode: "fit", edges: "left-right", pixels: 960 });
    expect(overlay?.text).toBe("960 px bars left and right");
  });

  it("stays silent when the source and canvas share a shape", () => {
    expect(wallElevationOverlay(requirements({ application: "lcd-loop", columns: 2, rows: 2 }))).toBeNull();
    expect(wallElevationOverlay(requirements({ application: "projection", columns: 1, rows: 1 }))).toBeNull();
  });

  it("stays silent for a feed per screen, which has no shared canvas", () => {
    const wall = requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 2,
      displayCustom: true,
      displayWidth: 1280,
      displayHeight: 1024,
    });

    expect(wallElevationOverlay(wall)).toBeNull();
  });
});

describe("wallMappingChoices", () => {
  it("offers both mappings with the pixels each costs", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 2, sources: 2 });

    expect(wallMappingChoices(wall)).toEqual([
      { value: "fit", text: "960 px bars left and right" },
      { value: "fill", text: "540 px cropped top and bottom" },
    ]);
  });

  it("has nothing to offer when the source already fits the canvas", () => {
    expect(wallMappingChoices(requirements({ application: "lcd-loop", columns: 2, rows: 2 }))).toBeNull();
    expect(wallMappingChoices(requirements({ application: "projection", columns: 1, rows: 1 }))).toBeNull();
  });

  it("has nothing to offer for a feed per screen", () => {
    const wall = requirements({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 2,
      displayCustom: true,
      displayWidth: 1280,
      displayHeight: 1024,
    });

    expect(wallMappingChoices(wall)).toBeNull();
  });
});

describe("wallMappingWarning", () => {
  const cropped = requirements({ application: "lcd-loop", layout: "single", columns: 4, rows: 2, windows: 1, mapping: "fill" });
  const barred = requirements({ application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1, mapping: "fit" });

  it("warns when filling throws away a large share of the picture", () => {
    const warning = wallMappingWarning(cropped)!;
    const fit = wallMappingChoices(cropped)!.find((choice) => choice.value === "fit")!;

    expect(warning.mode).toBe("fill");
    expect(warning.share).toBeGreaterThanOrEqual(WALL_MAPPING_WARN_SHARE);
    expect(warning.percent).toBe(Math.round(warning.share * 100));
    expect(warning.advice).toContain("Fill crops");
    // The way out names the alternative, what it would cost instead, and the
    // source shape that removes the trade-off.
    expect(warning.advice).toContain(`Fit would keep every pixel but leave ${fit.text}`);
    expect(warning.advice).toContain("use the whole wall and picture");
  });

  it("warns when fitting blanks a large share of the wall", () => {
    const warning = wallMappingWarning(barred)!;
    const fill = wallMappingChoices(barred)!.find((choice) => choice.value === "fill")!;

    expect(warning.mode).toBe("fit");
    expect(warning.advice).toContain("of the wall blank");
    // The fill is quoted as a verb phrase, not as another "cropped" label.
    expect(warning.advice).toContain(`Fill would cover it but crop ${fill.text.replace(" cropped ", " from the ")}`);
    expect(warning.advice).toContain("fill the wall with no bars");
  });

  it("measures each mapping on its own edges", () => {
    // A portrait canvas bars the top and bottom when fitted but crops the sides
    // when filled, so the quoted costs cannot share one axis.
    const portrait = requirements({ application: "led", ledCanvasWidth: 1920, ledCanvasHeight: 2160, mapping: "fill" });
    const warning = wallMappingWarning(portrait)!;

    expect(warning.mode).toBe("fill");
    expect(warning.advice).toMatch(/Fill crops [1-9]\d*% of the picture/);
    expect(warning.advice).toMatch(/\(\d*[1-9]\d*% of the wall\)/);
    expect(warning.advice).toContain("bars top and bottom");
    // Eighteen is vowel-initial: "an 8:9 source", not "a 8:9".
    expect(warning.advice).toContain("Deliver an 8:9 source");
  });

  it("names the source shape that removes the choice", () => {
    const warning = wallMappingWarning(cropped)!;
    const canvas = wallCanvasPixels(cropped);
    expect(warning.advice).toContain(`a 32:9 source for the ${canvas.width} × ${canvas.height} canvas`);
  });

  it("stays quiet below the threshold, on a matching canvas and per screen", () => {
    // A slight mismatch costs well under the warn share.
    const almost = requirements({ application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 2000, mapping: "fit" });
    expect(wallMappingWarning(almost)).toBeNull();
    expect(wallMappingWarning(requirements({ application: "lcd-loop", columns: 2, rows: 2 }))).toBeNull();
    expect(wallMappingWarning(requirements({ application: "lcd-direct", layout: "independent", columns: 2, rows: 2 }))).toBeNull();
    expect(wallMappingWarning(requirements({ application: "projection", columns: 1, rows: 1 }))).toBeNull();
  });
});

describe("wallMappingRecommendation", () => {
  it("recommends fit when the captured plan composes several windows", () => {
    const recommendation = wallMappingRecommendation(requirements({
      application: "lcd-loop",
      layout: "quad",
      columns: 4,
      rows: 2,
      windows: 4,
      sources: 4,
    }))!;

    expect(recommendation.value).toBe("fit");
    // The captured window and source count is what the sentence stands on.
    expect(recommendation.basis).toContain("puts 4 windows on the wall from 4 sources");
    expect(recommendation.basis).toContain("trim the outer edge of every feed");
    expect(recommendation.cost).toBe(
      "Fit leaves 50% of the wall blank; fill would crop 540 px top and bottom (50% of the picture).",
    );
  });

  it("recommends fill when the plan shows one window at a time", () => {
    const single = wallMappingRecommendation(requirements({
      application: "led",
      ledCanvasWidth: 1920,
      ledCanvasHeight: 2160,
      windows: 1,
      sources: 4,
    }))!;

    expect(single.value).toBe("fill");
    expect(single.basis).toContain("one window at a time from 4 switchable sources");
    expect(single.basis).toContain("bars across a single picture are the more visible cost");
    expect(single.cost).toBe(
      "Fill crops 960 px left and right (50% of the picture); fit would leave 50% of the wall blank.",
    );
  });

  it("has nothing to recommend when the shapes already match", () => {
    expect(wallMappingRecommendation(requirements({ application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 2160 }))).toBeNull();
    expect(wallMappingRecommendation(requirements({ application: "lcd-direct", layout: "independent", columns: 2, rows: 2 }))).toBeNull();
  });
});

describe("wallMappingFixes", () => {
  it("snaps a wide LED canvas to the source shape and quotes the wall it becomes", () => {
    const wall = requirements({ application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 1080, pixelPitchMm: 2.5 });
    const fixes = wallMappingFixes(wall);

    expect(fixes.map((fix) => fix.id)).toEqual(["canvas-to-source", "source-to-canvas"]);
    const canvas = fixes[0].requirements;
    // The wide edge is the one a 16:9 source never reaches, so the snap trims it.
    expect([canvas.ledCanvasWidth, canvas.ledCanvasHeight]).toEqual([1920, 1080]);
    // Pixels stay plain, like every other canvas figure; only millimetres group.
    expect(fixes[0].detail).toBe(
      "Canvas 3840 × 1080 → 1920 × 1080 (16:9); wall 9,600 × 2,700 mm → 4,800 × 2,700 mm.",
    );
    // Both snaps end the mismatch; that is the only reason to offer them.
    for (const fix of fixes) expect(wallElevationOverlay(fix.requirements)).toBeNull();
    // Each carries a drawing of its own result, so the shapes can be compared.
    expect(fixes[0].previewSvg.startsWith("<svg")).toBe(true);
    expect(fixes[0].previewSvg).not.toBe(fixes[1].previewSvg);
    expect(fixes[0].previewSvg).not.toContain("data-wall-dimension");
  });

  it("moves the source onto the canvas instead of resizing the wall", () => {
    const wall = requirements({ application: "led", ledCanvasWidth: 1920, ledCanvasHeight: 2160 });
    const fix = wallMappingFixes(wall).find((entry) => entry.id === "source-to-canvas")!;

    expect(fix.requirements.sourceCustom).toBe(true);
    expect([fix.requirements.sourceWidth, fix.requirements.sourceHeight]).toEqual([1920, 2160]);
    expect(fix.detail).toContain("Source 3840 × 2160 → 1920 × 2160 (8:9)");
    expect(fix.detail).toContain("wall stays 4,800 × 5,400 mm.");
    expect([fix.requirements.ledCanvasWidth, fix.requirements.ledCanvasHeight]).toEqual([1920, 2160]);
  });

  it("offers nothing when the shapes match or the wall cannot be re-shaped", () => {
    expect(wallMappingFixes(requirements({ application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 2160 }))).toEqual([]);
    // An LCD array's shape is its panels; a projector's is its screen.
    expect(wallMappingFixes(requirements({ application: "lcd-loop", layout: "single", columns: 4, rows: 2, windows: 1 }))).toEqual([]);
    expect(wallMappingFixes(requirements({ application: "projection", columns: 1, rows: 1 }))).toEqual([]);
  });
});

describe("wallMappingPreviews", () => {
  it("draws both mappings without dimensions for a comparison", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 2, sources: 2 });
    const previews = wallMappingPreviews(wall)!;

    expect(previews.chosen).toBe("fit");
    expect(previews.previews.map((preview) => preview.value)).toEqual(["fit", "fill"]);
    expect(previews.previews[0].text).toBe("960 px bars left and right");
    expect(previews.previews[1].text).toBe("540 px cropped top and bottom");
    // A preview has no room for the dimension gutter or the in-band labels.
    for (const preview of previews.previews) {
      expect(preview.svg).not.toContain("wall-elevation-dimension");
      expect(preview.svg).not.toContain(">Bars</text>");
      expect(preview.svg).not.toContain(">Cropped</text>");
    }
    // Both drawings share one box, so the wall is drawn at the same size in
    // each and the bars can be compared with the crop.
    expect(previews.previews[0].svg).toContain('viewBox="0 0 1600 900"');
    expect(previews.previews[1].svg).toContain('viewBox="0 0 1600 900"');
  });

  it("states what each option costs as a share the customer can weigh", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 2, sources: 2 });
    const previews = wallMappingPreviews(wall)!;
    const costs = wallMappingCosts(wall);

    expect(previews.previews[0]).toMatchObject({ share: costs.blankShare, percent: 50 });
    expect(previews.previews[1]).toMatchObject({ share: costs.cropShare, percent: 50 });
    expect(previews.previews[0].consequence).toBe("Leaves 50% of the wall as black bars, 960 px left and right.");
    expect(previews.previews[1].consequence).toBe("Loses 50% of the picture to the crop, 540 px top and bottom.");
  });

  it("measures the two options on their own edges", () => {
    // A portrait canvas bars the top and bottom when fitted but crops the sides
    // when filled, so neither option may borrow the other's axis.
    const portrait = requirements({ application: "led", ledCanvasWidth: 1920, ledCanvasHeight: 2160, mapping: "fill" });
    const previews = wallMappingPreviews(portrait)!;

    expect(previews.previews[0].consequence).toBe("Leaves 50% of the wall as black bars, 540 px top and bottom.");
    expect(previews.previews[1].consequence).toBe("Loses 50% of the picture to the crop, 960 px left and right.");
  });

  it("has no comparison when the source already fits the canvas", () => {
    expect(wallMappingPreviews(requirements({ application: "lcd-loop", columns: 2, rows: 2 }))).toBeNull();
  });
});

describe("wallElevationSvg chosen mapping", () => {
  it("draws the crop the rep chose on a wall that would default to fit", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 2, sources: 2 });
    expect(wallElevationOverlay(wall)?.mode).toBe("fit");

    const chosen = { ...wall, mapping: "fill" as const };
    expect(wallElevationOverlay(chosen)).toMatchObject({ mode: "fill", pixels: 540 });
    expect(wallElevationGeometry(chosen).frame).toEqual({ width: 1600, height: 900 });
    const svg = wallElevationSvg(chosen);
    expect(svg.match(/class="wall-elevation-crop"/g)).toHaveLength(1);
    expect(svg).not.toContain("wall-elevation-bar");
    expect(svg).toContain("540 px cropped top and bottom");
  });

  it("draws the bars the rep chose on a wall that would default to fill", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 1, sources: 1 });
    expect(wallElevationOverlay(wall)?.mode).toBe("fill");

    const chosen = { ...wall, mapping: "fit" as const };
    expect(wallElevationOverlay(chosen)).toMatchObject({ mode: "fit", pixels: 960 });
    const svg = wallElevationSvg(chosen);
    expect(svg.match(/class="wall-elevation-bar"/g)).toHaveLength(2);
    expect(svg).not.toContain("wall-elevation-crop");
    expect(svg).toContain("960 px bars left and right");
  });
});

describe("wall elevation scale figure", () => {
  it("stands a person in a doorway beside the wall, at the wall's own scale", () => {
    const wall = requirements({ layout: "independent", columns: 2, rows: 2, windows: 4 });
    const geometry = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);

    expect(svg).toContain('data-scale-figure="true"');
    expect(svg.match(/class="wall-elevation-person"/g)).toHaveLength(2);
    expect(svg).toContain('class="wall-elevation-door"');
    expect(svg).toContain('class="wall-elevation-ground"');
    expect(svg).toContain('class="wall-elevation-scale-label"');
    expect(svg).toContain(">1,700 mm</text>");

    // 1,700 mm at the wall's scale is the same fraction of the drawn wall as it
    // is of the real wall, so the figure cannot flatter the size.
    const wallUnits = geometry.layout.wall.height;
    const wallMm = geometry.layout.physical.wall.height;
    const scale = geometry.scale!;
    expect(scale.personHeight / wallUnits).toBeCloseTo(1700 / wallMm, 2);
    expect(scale.doorHeight / wallUnits).toBeCloseTo(2040 / wallMm, 2);
  });

  it("places the figure outside the dimensions and inside the drawing box", () => {
    const geometry = wallElevationGeometry(requirements({ layout: "independent", columns: 2, rows: 2, windows: 4 }));
    const { canvas, drawing } = geometry;
    const scale = geometry.scale!;

    // The lane starts after the dimension gutter so nothing overlaps it.
    expect(scale.x).toBeGreaterThanOrEqual(canvas.width);
    expect(scale.x + scale.doorWidth).toBeLessThanOrEqual(drawing.width);
    // The person's feet stand on the floor, which is the mounting gap below the
    // wall's bottom edge, and the head is not clipped.
    expect(scale.floorY).toBeCloseTo(geometry.margin.top + geometry.frame.height - geometry.origin.y + geometry.mounting.gap, 0);
    expect(scale.floorY - scale.personHeight).toBeGreaterThan(0);
    expect(scale.floorY - scale.doorHeight).toBeGreaterThan(0);
  });

  it("lifts the wall off the floor and dimensions the gap", () => {
    const wall = requirements({ layout: "independent", columns: 2, rows: 2, windows: 4 });
    const geometry = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);
    const scale = geometry.scale!;
    const wallBottom = geometry.margin.top + geometry.origin.y + geometry.layout.wall.height;

    // 900 mm at the wall's own scale, so the gap is drawn to the same ratio as
    // the panels above it rather than as a decorative strip.
    expect(geometry.mounting.heightMm).toBe(900);
    expect(geometry.mounting.gap / geometry.layout.wall.height).toBeCloseTo(
      900 / geometry.layout.physical.wall.height, 2,
    );
    expect(scale.floorY - wallBottom).toBe(geometry.mounting.gap);
    expect(svg).toContain('data-dimension="mounting-height"');
    expect(svg).toContain(">900 mm to floor</text>");
    // The width lines move below the floor, so the wall keeps its overall width
    // readable instead of the line landing in the gap under the wall.
    const width = wallElevationDimensions(geometry).find((dimension) => dimension.key === "wall-width")!;
    expect(width.from.y).toBeGreaterThan(geometry.frame.height + geometry.mounting.gap - geometry.origin.y);
  });

  it("draws a floor-standing wall without a gap or a mounting dimension", () => {
    const wall = requirements({ layout: "independent", columns: 2, rows: 2, windows: 4, mountingHeightMm: 0 });
    const geometry = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);

    expect(geometry.mounting).toEqual({ heightMm: 0, gap: 0 });
    expect(geometry.scale!.floorY).toBeCloseTo(
      geometry.margin.top + geometry.origin.y + geometry.layout.wall.height, 0,
    );
    expect(svg).not.toContain('data-dimension="mounting-height"');
  });

  it("reserves headroom above a wall that is shorter than a person", () => {
    const geometry = wallElevationGeometry(requirements({ layout: "independent", columns: 2, rows: 1, sources: 2 }));
    const scale = geometry.scale!;

    // A 685 mm high panel wall is shorter than 1,700 mm, so the wall sits lower
    // in the drawing and the figure still stands on its bottom edge.
    expect(scale.personHeight).toBeGreaterThan(geometry.layout.wall.height);
    expect(geometry.margin.top).toBeGreaterThan(100);
    expect(scale.floorY - scale.personHeight).toBeGreaterThanOrEqual(0);
    expect(geometry.canvas.height).toBeGreaterThan(geometry.frame.height + geometry.margin.bottom);
  });

  it("leaves a hanging projection screen without a floor figure", () => {
    const wall = requirements({ application: "projection", columns: 1, rows: 1, windows: 2 });
    const geometry = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);

    // A projector screen hangs on the wall, so there is no floor line to stand
    // a person on and the drawing stays exactly as tall as its dimensions need.
    expect(geometry.scale).toBeNull();
    expect(svg).not.toContain("data-scale-figure");
    expect(svg).not.toContain("doorway gives the scale");
    expect(geometry.drawing.width).toBe(geometry.canvas.width);
  });

  it("leaves the comparison previews and the compact drawings without it", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 2, sources: 2 });
    const previews = wallMappingPreviews(wall);
    const compact = wallElevationSvg(wall, { dimensions: false });

    expect(compact).not.toContain("data-scale-figure");
    expect(compact).toContain("viewBox=\"0 0 1600 450\"");
    expect(previews?.previews.map((preview) => preview.svg).join("")).not.toContain("data-scale-figure");
  });

  it("names the scale figure for screen readers", () => {
    const svg = wallElevationSvg(requirements());
    expect(svg).toContain("A 1,700 mm person in a 2,040 mm doorway gives the scale.");
    expect(wallElevationSvg(requirements(), { dimensions: false })).not.toContain("doorway gives the scale");
  });
});

describe("wallElevationSvg mapping overlay", () => {
  it("hatches the cropped edges outside the wall and keeps the source frame", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 1 });
    const { frame, origin, canvas, drawing } = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);

    // The source frame is 16:9 while the wall stays 32:9 inside it.
    expect(frame).toEqual({ width: 1600, height: 900 });
    expect(origin).toEqual({ x: 0, y: 225 });
    expect(svg).toContain(`viewBox="0 0 ${drawing.width} ${drawing.height}"`);
    // The dimensioned box is unchanged by the figure; only the lane is added,
    // and the 900 mm mounting gap lengthens the box below the wall.
    expect(canvas).toEqual({ width: 1766, height: 1147 });
    expect(svg.match(/class="wall-elevation-crop"/g)).toHaveLength(1);
    expect(svg.match(/class="wall-elevation-source-frame"/g)).toHaveLength(1);
    expect(svg).toContain("540 px cropped top and bottom");
    expect(svg).not.toContain('class="wall-elevation-bar"');
  });

  it("places the crop labels inside the overhang rather than on the wall edge", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 1 });
    const { frame, origin } = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);
    const labels = [...svg.matchAll(/<text[^>]* y="(\d+)"[^>]*>Cropped<\/text>/g)].map((match) => Number(match[1]));

    expect(labels).toEqual([Math.round(origin.y / 2), Math.round(frame.height - origin.y / 2)]);
  });

  it("hatches the bars inside the wall without moving the wall", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 2, sources: 2 });
    const { drawing, frame } = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);

    expect(frame).toEqual({ width: 1600, height: 450 });
    expect(svg).toContain(`viewBox="0 0 ${drawing.width} ${drawing.height}"`);
    expect(svg.match(/class="wall-elevation-bar"/g)).toHaveLength(2);
    expect(svg.match(/class="wall-elevation-content-frame"/g)).toHaveLength(1);
    expect(svg).toContain("960 px bars left and right");
    expect(svg).not.toContain("wall-elevation-crop");
  });

  it("leaves a matching canvas undecorated", () => {
    const svg = wallElevationSvg(requirements({ application: "lcd-loop", columns: 2, rows: 2 }));

    expect(svg).not.toContain("wall-elevation-bar");
    expect(svg).not.toContain("wall-elevation-crop");
    expect(svg).not.toContain("Content shape differs");
  });
});

describe("wallElevationSvg projector blend", () => {
  it("draws a seam where the images meet until the overlap is surveyed", () => {
    const svg = wallElevationSvg(requirements({ application: "projection", projectors: 2, layout: "single", windows: 1 }));

    // Two images on one screen: the boundary is marked, but the drawing makes no
    // claim about a blend region nobody has measured.
    expect(svg).toContain('data-projector-slices="2"');
    expect(svg).toContain('data-projector-seam="true"');
    expect(svg).not.toContain("data-blend-band");
    expect(svg).not.toContain("data-blend-overlap");
    expect(svg).not.toContain("mm blend");
  });

  it("draws the measured overlap as a band in place of the seam", () => {
    const svg = wallElevationSvg(requirements({ application: "projection", projectors: 2, blendOverlapMm: 60, layout: "single", windows: 1 }));

    expect(svg).toContain('data-blend-overlap="60"');
    expect(svg).toContain('data-blend-band="60"');
    expect(svg).toContain("60 mm blend");
    expect(svg).not.toContain('data-projector-seam="true"');
  });

  it("draws the seam where the rep put it, not in the middle", () => {
    const wall = requirements({ application: "projection", projectors: 2, projectorSplits: [0.4], layout: "single", windows: 1 });
    const { layout } = wallElevationGeometry(wall);
    const svg = wallElevationSvg(wall);
    const [first, second] = layout.projectorSlices;

    expect([first.end, second.start]).toEqual([0.4, 0.4]);
    expect(svg).toContain(`data-projector-seam="true" x1="${String(0.4 * layout.wall.width)}"`);
    expect(layout.imageSharesLabel).toBe("40% / 60%");
    expect(svg).toContain("The images are unequal — 40% / 60% of the screen");
  });

  it("bands every interior boundary of a four-projector screen", () => {
    const svg = wallElevationSvg(requirements({ application: "projection", projectors: 4, blendOverlapMm: 45, layout: "single", windows: 1 }));

    expect(svg.match(/data-blend-band="45"/g)).toHaveLength(3);
    expect(svg).not.toContain('data-projector-seam="true"');
  });
});

describe("wallElevationDimensions", () => {
  it("states the wall and one panel in millimetres", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 1 });
    const dimensions = wallElevationDimensions(wallElevationGeometry(wall));

    expect(dimensions.map((dimension) => dimension.key)).toEqual([
      "panel-width",
      "panel-height",
      "wall-width",
      "wall-height",
      "mounting-height",
    ]);
    expect(dimensions.map((dimension) => dimension.label.text)).toEqual([
      "1,218 mm panel",
      "685 mm panel",
      "4,872 mm wall",
      "1,370 mm wall",
      "900 mm to floor",
    ]);
  });

  it("measures the wall rather than the crop overhang", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 1 });
    const geometry = wallElevationGeometry(wall);
    const width = wallElevationDimensions(geometry).find((dimension) => dimension.key === "wall-width")!;

    // The 16:9 source frame is 1600 wide, but the 32:9 wall inside it is the
    // measured span — a crop must not be quoted as extra wall.
    expect(geometry.origin.y).toBeGreaterThan(0);
    expect(width.from.x).toBe(geometry.origin.x);
    expect(width.to.x).toBe(geometry.origin.x + geometry.layout.wall.width);
    expect(width.from.y).toBeGreaterThan(geometry.frame.height);
    expect(width.extensions[0].from.y).toBe(geometry.origin.y + geometry.layout.wall.height);
  });

  it("keeps the dimension lines outside the drawing", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 2, sources: 2 });
    const geometry = wallElevationGeometry(wall);
    const { canvas, frame, margin, tiers } = geometry;
    const height = wallElevationDimensions(geometry).find((dimension) => dimension.key === "wall-height")!;

    expect(canvas.width).toBe(frame.width + margin.left + margin.right);
    expect(canvas.height).toBe(frame.height + margin.top + margin.bottom);
    expect(height.from.x).toBe(-tiers.far);
    expect(height.label.x).toBeLessThan(-tiers.far);
  });

  it("drops the panel tier when there is only one screen", () => {
    const projection = wallElevationGeometry(requirements({ application: "projection", columns: 1, rows: 1 }));
    const led = wallElevationGeometry(requirements({ application: "led" }));

    // No panel tier without a panel, but both still hang above the floor.
    expect(wallElevationDimensions(projection).map((dimension) => dimension.size)).toEqual(["wall", "wall", "mounting"]);
    expect(wallElevationDimensions(led).map((dimension) => dimension.size)).toEqual(["wall", "wall", "mounting"]);
  });
});

describe("wallElevationCaption", () => {
  it("names the array, pixels and window plan", () => {
    const layout = wallVisualLayout(requirements({ layout: "independent", columns: 2, rows: 2 }));
    const caption = wallElevationCaption(layout);

    expect(caption).toContain("Wall elevation: 2 × 2 array");
    expect(caption).toContain("Each panel 3840 × 2160");
    expect(caption).toContain("4 windows");
    expect(caption).toContain("Each panel receives its own feed");
    // The caption repeats the drawn size, so a printed proposal states it in text.
    expect(caption).toContain("Wall 2,436 × 1,370 mm · 55 in panels at 1,218 × 685 mm");
  });

  it("adds the bars or crop the drawing shows", () => {
    const wall = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 1 });
    const caption = wallElevationCaption(wallVisualLayout(wall), wallElevationOverlay(wall));

    expect(caption).toContain("Content shape differs from the canvas: 540 px cropped top and bottom.");
  });
});

it("keeps a known ceiling in the drawing and reports negative headroom", () => {
  const wall = requirements({ application: "lcd-loop", columns: 2, rows: 2, mountingHeightMm: 900, roomHeightMm: 2100 });
  const geometry = wallElevationGeometry(wall);
  expect(geometry.ceiling?.headroomMm).toBe(-170);
  expect(geometry.ceiling!.y).toBeGreaterThan(0);
  expect(wallElevationSvg(wall)).toContain("headroom -170 mm");
});
it("marks the actual over-limit panel in worksheet-compatible SVG", () => {
  const wall = requirements({ application: "lcd-direct", columns: 2, rows: 2, sourceLocation: "local", measuredRuns: { "display-2": 400 } });
  expect(wallElevationSvg(wall)).toContain('data-over-limit="display-2"');
  expect(wallElevationSvg(wall)).not.toContain('data-over-limit="display-1"');
});
