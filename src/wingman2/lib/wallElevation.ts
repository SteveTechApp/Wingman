import {
  DEFAULT_MOUNTING_HEIGHT_MM,
  wallCanvasPixels,
  wallCanvasPlan,
  type WallRequirements,
} from "./videowallOptions";
import { wallTransportPlan } from "./videowallTransport";
import { wallVisualLayout, type WallVisualLayout } from "./videowallVisual";
import { formatMillimetres, wallPhysicalSize } from "./wallPhysicalSize";

/**
 * The wall drawing that accompanies the proposal display schedule. The same
 * geometry as the builder's elevation, rendered here as standalone SVG so the
 * HTML export can print it without a component and the DOCX export can
 * rasterise it to a PNG.
 *
 * When the source shape does not match the canvas, the drawing also shows the
 * agreed result: the bars that fit leaves blank, or the source area that fill
 * crops. Bars are hatched inside the wall; a crop is hatched outside it, with a
 * dashed source frame around the wall so the lost edges stay visible.
 */

const TONE_FILLS = [
  "hsl(182 53% 30% / .50)",
  "hsl(202 52% 31% / .55)",
  "hsl(222 48% 32% / .55)",
  "hsl(162 45% 27% / .55)",
  "hsl(142 42% 26% / .55)",
  "hsl(192 55% 28% / .55)",
] as const;

export type WallElevationEdges = "top-bottom" | "left-right";

/**
 * How the source maps onto the canvas when their shapes differ. `fit` keeps
 * every source pixel and leaves bars; `fill` covers the canvas and loses the
 * edges named by `edges`.
 */
export type WallElevationOverlay = {
  mode: "fit" | "fill";
  edges: WallElevationEdges;
  /** Band thickness as a fraction of the canvas width or height (0–0.5). */
  band: number;
  /** Pixels left blank (fit) or lost (fill) on each affected edge. */
  pixels: number;
  /** One clause naming the result and its pixel size. */
  text: string;
};

/**
 * The architect's scale figure: a 1,700 mm person standing in a 2,040 × 826 mm
 * door opening, drawn at the wall's own scale. Millimetre labels are abstract,
 * so the figure is what makes a 2.4 m wall read as roughly one and a half
 * people wide the moment the drawing is seen.
 */
export const SCALE_PERSON_MM = 1700;
export const SCALE_DOOR_HEIGHT_MM = 2040;
export const SCALE_DOOR_WIDTH_MM = 826;

export type WallScaleReference = {
  /** Drawing units per millimetre, taken from the wall's drawn width. */
  unitPerMm: number;
  personHeight: number;
  doorHeight: number;
  doorWidth: number;
  /** Canvas x of the door opening's left edge, to the right of the dimensions. */
  x: number;
  /** The wall's right edge; the ground line joins it to the door. */
  wallRight: number;
  /**
   * The floor the figure stands on. The wall's bottom edge sits the mounting
   * height above it, so the two are different lines.
   */
  floorY: number;
};

export type WallElevationGeometry = {
  ceiling: { y: number; heightMm: number; headroomMm: number } | null;
  layout: WallVisualLayout;
  overlay: WallElevationOverlay | null;
  /** Drawing box including any crop overhang outside the wall. */
  frame: { width: number; height: number };
  /** Where the wall sits inside the frame. */
  origin: { x: number; y: number };
  /** Room the dimension lines and their labels take outside the frame. */
  margin: { left: number; right: number; top: number; bottom: number };
  /** Whole drawing box: the frame plus its dimension margins. */
  canvas: { width: number; height: number };
  /** Dimension label size in drawing units. */
  labelSize: number;
  /** How far the panel and wall dimension lines sit from the frame edge. */
  tiers: { near: number; far: number };
  /**
   * Height of the wall's bottom edge above the finished floor, in millimetres
   * and in drawing units. A projection screen hangs on the same wall, so it
   * carries the gap too; a floor-standing wall records 0 and draws none.
   */
  mounting: { heightMm: number; gap: number };
  /** The dimensioned drawing plus the scale figure's lane on its right. */
  drawing: { width: number; height: number };
  /**
   * The person and doorway drawn beside the wall, at the wall's own scale.
   * Null for a projection screen: it hangs on a wall rather than standing on
   * the floor, so there is no floor line for a figure to stand on.
   */
  scale: WallScaleReference | null;
};

/**
 * A physical dimension drawn beside the wall. `from`/`to` are the measured span
 * itself; `extensions` are the leaders that carry that span out to the line, so
 * the wall edge stays the reference rather than the crop overhang.
 */
export type WallElevationDimension = {
  key: string;
  /** Which measurement the line states, so the tiers stay distinguishable. */
  size: "wall" | "panel" | "mounting";
  axis: "horizontal" | "vertical";
  from: { x: number; y: number };
  to: { x: number; y: number };
  extensions: { from: { x: number; y: number }; to: { x: number; y: number } }[];
  label: { x: number; y: number; text: string; rotate: boolean };
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character] ?? character
  ));
}

function sameShape(a: number, b: number) {
  return Math.abs(a - b) <= 0.01 * Math.max(a, b);
}

/**
 * The mounting height the drawing uses: the rep's figure when it is a real
 * number, otherwise the planning default. Kept here so the geometry, the
 * builder's field and the printed dimension cannot disagree.
 */
export function wallMountingHeightMm(requirements: WallRequirements) {
  const requested = Number(requirements.mountingHeightMm);
  if (!Number.isFinite(requested)) return DEFAULT_MOUNTING_HEIGHT_MM;
  return Math.max(0, Math.round(requested));
}

/**
 * The fit or crop the design has agreed for this wall, or null when the source
 * and canvas already share a shape. A feed per screen has no shared canvas, so
 * it has no single fit or crop to draw.
 */
export function wallElevationOverlay(requirements: WallRequirements): WallElevationOverlay | null {
  const plan = wallCanvasPlan(requirements);
  if (plan.recommended === "per-panel") return null;
  if (sameShape(plan.canvas.width / plan.canvas.height, plan.source.width / plan.source.height)) return null;

  const fill = plan.recommended === "fill";
  const topBottom = (fill ? plan.fill.crop.vertical : plan.fit.bars.vertical) > 0;
  const edges: WallElevationEdges = topBottom ? "top-bottom" : "left-right";
  const pixels = fill
    ? (topBottom ? plan.fill.crop.vertical : plan.fill.crop.horizontal)
    : (topBottom ? plan.fit.bars.vertical : plan.fit.bars.horizontal);
  // A sub-pixel difference rounds to nothing worth drawing.
  if (pixels < 1) return null;
  const band = pixels / (topBottom ? plan.canvas.height : plan.canvas.width);

  return {
    mode: fill ? "fill" : "fit",
    edges,
    band: Math.min(0.5, Math.max(0, band)),
    pixels,
    text: `${pixels} px ${fill ? "cropped" : "bars"} ${topBottom ? "top and bottom" : "left and right"}`,
  };
}

/** Two dimension tiers need room: the panel span sits nearest the wall. */
function dimensionSpace(frame: { width: number; height: number }) {
  // Labels are sized in drawing units, so they stay legible when the 1600-unit
  // drawing is printed at roughly half that width in a proposal.
  const labelSize = Math.max(18, Math.min(26, Math.round(frame.width / 48)));
  const nearTier = Math.round(labelSize * 1.4);
  const farTier = Math.round(labelSize * 3.4);
  return {
    labelSize,
    tiers: { near: nearTier, far: farTier },
    margin: {
      left: farTier + labelSize,
      right: Math.round(labelSize * 2),
      top: Math.round(labelSize * 2),
      bottom: farTier + Math.round(labelSize * 1.4),
    },
  };
}

export type WallMapping = "fit" | "fill";

/** The edges a mapping spends, in the words a sentence needs. */
export type WallEdgeWords = "left and right" | "top and bottom";

/**
 * What each mapping costs, measured on the edges it actually spends. A wide
 * canvas bars the sides when fitted but crops the ends when filled, so the two
 * shares cannot share one axis. `blankShare` is the share of the wall left
 * dark; `cropShare` is the share of the picture lost.
 */
export function wallMappingCosts(requirements: WallRequirements) {
  const plan = wallCanvasPlan(requirements);
  const barOnWidth = plan.fit.bars.horizontal > 0;
  const barPixels = plan.fit.bars.horizontal || plan.fit.bars.vertical;
  const barSide = barOnWidth ? plan.canvas.width : plan.canvas.height;
  const cropOnWidth = plan.fill.crop.horizontal > 0;
  const cropPixels = plan.fill.crop.horizontal || plan.fill.crop.vertical;
  const cropSide = cropOnWidth ? plan.canvas.width : plan.canvas.height;
  return {
    barPixels,
    barEdges: (barOnWidth ? "left and right" : "top and bottom") as WallEdgeWords,
    cropPixels,
    cropEdges: (cropOnWidth ? "left and right" : "top and bottom") as WallEdgeWords,
    blankShare: Math.min(1, (2 * barPixels) / barSide),
    cropShare: Math.min(1, (2 * cropPixels) / (cropSide + 2 * cropPixels)),
  };
}

/**
 * Above this share of the wall, a mapping choice is no longer a detail: the
 * rep is either showing black bars over a fifth of the wall or losing a fifth
 * of the picture, and the customer will see it.
 */
export const WALL_MAPPING_WARN_SHARE = 0.15;

export type WallMappingWarning = {
  mode: WallMapping;
  /** Share of the wall left blank (fit) or of the picture lost (fill), 0–1. */
  share: number;
  /** The same share as a whole percentage, for the sentence. */
  percent: number;
  /** What to change, naming the alternative and the source that would fit. */
  advice: string;
};

/**
 * The warning a rep sees on the elevation when the agreed mapping costs a
 * visible share of the wall. It names the concrete way out: the other mapping
 * and what that would cost instead, or the source shape that removes the
 * choice altogether.
 */
export function wallMappingWarning(requirements: WallRequirements): WallMappingWarning | null {
  const overlay = wallElevationOverlay(requirements);
  if (!overlay) return null;
  const { cropPixels, cropEdges, blankShare, cropShare } = wallMappingCosts(requirements);
  const share = overlay.mode === "fit" ? blankShare : cropShare;
  if (!Number.isFinite(share) || share < WALL_MAPPING_WARN_SHARE) return null;

  const choices = wallMappingChoices(requirements) ?? [];
  const alternative = choices.find((choice) => choice.value !== overlay.mode);
  const layout = wallVisualLayout(requirements);
  const canvas = wallCanvasPixels(requirements);
  const percent = Math.round(share * 100);
  const otherPercent = Math.round((overlay.mode === "fit" ? cropShare : blankShare) * 100);
  // The overlay text already reads "540 px bars top and bottom"; a fill is
  // quoted as a verb phrase so the sentence does not say "crop ... cropped".
  const cost = overlay.mode === "fit"
    ? `${cropPixels} px from the ${cropEdges}`
    : alternative?.text ?? "the other mapping";
  // "a 8:9" reads wrong; eight, eleven and eighteen start with a vowel sound.
  const article = /^(8|11|18):/.test(layout.aspectLabel) ? "an" : "a";
  // Both costs are quoted, because on a wall this far from the source shape the
  // other mapping is usually no cheaper; the only real way out is the source.
  const advice = overlay.mode === "fit"
    ? `Fit leaves ${percent}% of the wall blank; Fill would cover it but crop ${cost} (${otherPercent}% of the picture). Deliver ${article} ${layout.aspectLabel} source for the ${canvas.width} × ${canvas.height} canvas to fill the wall with no bars.`
    : `Fill crops ${percent}% of the picture; Fit would keep every pixel but leave ${cost} (${otherPercent}% of the wall). Deliver ${article} ${layout.aspectLabel} source for the ${canvas.width} × ${canvas.height} canvas to use the whole wall and picture.`;

  return { mode: overlay.mode, share, percent, advice };
}

export type WallMappingRecommendation = {
  value: WallMapping;
  /** Sentence naming the captured wall conditions the choice follows. */
  basis: string;
  /** What the recommended mapping costs, with the other cost beside it. */
  cost: string;
};

/**
 * Which mapping the captured wall design favours, and the conditions that
 * decide it. The window count is the fact the room supplies: a wall built to
 * show several feeds at once cannot afford to trim the outer edge of every one
 * of them, while a single picture is better run to the wall's edge than
 * letterboxed across it. The quoted costs keep the recommendation checkable
 * rather than a matter of taste.
 */
export function wallMappingRecommendation(requirements: WallRequirements): WallMappingRecommendation | null {
  if (!wallElevationOverlay(requirements)) return null;

  const costs = wallMappingCosts(requirements);
  const windows = Math.max(1, Math.round(Number(requirements.windows) || 1));
  const sources = Math.max(1, Math.round(Number(requirements.sources) || 1));
  const blank = Math.round(costs.blankShare * 100);
  const crop = Math.round(costs.cropShare * 100);
  const value: WallMapping = windows > 1 ? "fit" : "fill";

  const basis = windows > 1
    ? `The captured plan puts ${windows} windows on the wall from ${sources} source${sources === 1 ? "" : "s"}, so cropping would trim the outer edge of every feed at once; fit keeps each window whole.`
    : `The captured plan shows one window at a time${sources > 1 ? ` from ${sources} switchable sources` : ""}, so the picture can run to the wall's edge; bars across a single picture are the more visible cost.`;
  const cost = value === "fit"
    ? `Fit leaves ${blank}% of the wall blank; fill would crop ${costs.cropPixels} px ${costs.cropEdges} (${crop}% of the picture).`
    : `Fill crops ${costs.cropPixels} px ${costs.cropEdges} (${crop}% of the picture); fit would leave ${blank}% of the wall blank.`;

  return { value, basis, cost };
}

export type WallMappingFixId = "canvas-to-source" | "source-to-canvas";

export type WallMappingFix = {
  id: WallMappingFixId;
  /** Button label naming which side of the pair is snapped. */
  label: string;
  /** What the tap changes, in pixels and millimetres. */
  detail: string;
  /** The design after the tap, ready to replace the current one. */
  requirements: WallRequirements;
  /** Compact drawing of the result, so it is seen before the tap is taken. */
  previewSvg: string;
};

/** An even pixel count keeps the processor's timing symmetric. */
function evenCount(value: number) {
  return Math.max(2, Math.round(value / 2) * 2);
}

function ratioLabel(width: number, height: number) {
  const divisor = (a: number, b: number): number => (b === 0 ? a : divisor(b, a % b));
  const common = divisor(width, height);
  return `${width / common}:${height / common}`;
}

function wallMillimetres(requirements: WallRequirements) {
  const wall = wallPhysicalSize(requirements).wall;
  return `${formatMillimetres(wall.width)} × ${formatMillimetres(wall.height)} mm`;
}

/**
 * The two ways to close the gap the mapping warning names, as edited designs:
 * make the LED canvas follow the source shape, or make the source follow the
 * canvas. Only an LED canvas can be re-shaped this way — an LCD wall's shape is
 * the array of panels it is built from, and a projector's is its screen.
 */
export function wallMappingFixes(requirements: WallRequirements): WallMappingFix[] {
  if (requirements.application !== "led") return [];
  if (!wallElevationOverlay(requirements)) return [];

  const plan = wallCanvasPlan(requirements);
  const canvas = plan.canvas;
  const source = plan.source;
  const sourceAspect = source.width / source.height;
  // The edge a fitted source does not reach is the edge the canvas does not
  // need, so the snap trims it rather than adding cabinets nobody planned.
  const nextCanvas = plan.fit.bars.horizontal > 0
    ? { width: evenCount(canvas.height * sourceAspect), height: canvas.height }
    : { width: canvas.width, height: evenCount(canvas.width / sourceAspect) };
  const canvasFix: WallRequirements = {
    ...requirements,
    ledCanvasWidth: nextCanvas.width,
    ledCanvasHeight: nextCanvas.height,
  };
  // The other direction leaves the wall exactly as designed and moves the source.
  const sourceFix: WallRequirements = {
    ...requirements,
    sourceCustom: true,
    sourceWidth: canvas.width,
    sourceHeight: canvas.height,
  };
  const preview = (next: WallRequirements) => wallElevationSvg(next, { dimensions: false, overlayLabels: false });
  const fixes: WallMappingFix[] = [
    {
      id: "canvas-to-source",
      label: "Snap canvas to source",
      detail: `Canvas ${canvas.width} × ${canvas.height} → ${nextCanvas.width} × ${nextCanvas.height} (${ratioLabel(nextCanvas.width, nextCanvas.height)}); wall ${wallMillimetres(requirements)} → ${wallMillimetres(canvasFix)}.`,
      requirements: canvasFix,
      previewSvg: preview(canvasFix),
    },
    {
      id: "source-to-canvas",
      label: "Snap source to canvas",
      detail: `Source ${source.width} × ${source.height} → ${canvas.width} × ${canvas.height} (${ratioLabel(canvas.width, canvas.height)}); wall stays ${wallMillimetres(requirements)}.`,
      requirements: sourceFix,
      previewSvg: preview(sourceFix),
    },
  ];
  // A rounding step must leave the shapes matched, or the tap has fixed nothing.
  return fixes.filter((fix) => wallElevationOverlay(fix.requirements) === null);
}

/**
 * Both ways of mapping a source onto a canvas of a different shape, each with
 * the pixels it costs. Null when there is nothing to choose between: a matching
 * canvas, or a feed per screen with no shared canvas.
 */
export function wallMappingChoices(requirements: WallRequirements): { value: WallMapping; text: string }[] | null {
  const fit = wallElevationOverlay({ ...requirements, mapping: "fit" });
  const fill = wallElevationOverlay({ ...requirements, mapping: "fill" });
  if (!fit || !fill) return null;
  return [
    { value: "fit", text: fit.text },
    { value: "fill", text: fill.text },
  ];
}

export type WallMappingPreview = {
  value: WallMapping;
  /** What the mapping costs, in pixels. */
  text: string;
  /** Share of the wall (fit) or of the picture (fill) the choice spends, 0–1. */
  share: number;
  /** The same share as a whole percentage. */
  percent: number;
  /** Customer sentence naming what the choice does to the picture on the wall. */
  consequence: string;
  /** Compact drawing: no dimension gutter and no labels inside the bands. */
  svg: string;
};

/**
 * Both mappings as small drawings beside each other, with the one the design
 * uses, so a proposal can show the choice rather than only its result. Each
 * option carries its cost as a share as well as a pixel count, so the two can
 * be weighed against each other rather than only read.
 */
export function wallMappingPreviews(requirements: WallRequirements): { chosen: WallMapping; previews: WallMappingPreview[] } | null {
  const choices = wallMappingChoices(requirements);
  const chosen = wallElevationOverlay(requirements)?.mode;
  if (!choices || !chosen) return null;
  const costs = wallMappingCosts(requirements);
  // One box for both drawings: the crop overhang makes the fill frame wider, so
  // a shared box keeps the wall the same size on each side of the pair.
  const frames = (["fit", "fill"] as const).map((value) => wallElevationGeometry({ ...requirements, mapping: value }).frame);
  const box = {
    width: Math.max(...frames.map((frame) => frame.width)),
    height: Math.max(...frames.map((frame) => frame.height)),
  };
  return {
    chosen,
    previews: choices.map((choice) => {
      const fit = choice.value === "fit";
      const share = fit ? costs.blankShare : costs.cropShare;
      const percent = Math.round(share * 100);
      return {
        ...choice,
        share,
        percent,
        consequence: fit
          ? `Leaves ${percent}% of the wall as black bars, ${costs.barPixels} px ${costs.barEdges}.`
          : `Loses ${percent}% of the picture to the crop, ${costs.cropPixels} px ${costs.cropEdges}.`,
        svg: wallElevationSvg({ ...requirements, mapping: choice.value }, { dimensions: false, overlayLabels: false, box }),
      };
    }),
  };
}

/** Wall proportions, the crop overhang and the room the dimensions need. */
export function wallElevationGeometry(requirements: WallRequirements): WallElevationGeometry {
  const layout = wallVisualLayout(requirements);
  const overlay = wallElevationOverlay(requirements);
  const origin = { x: 0, y: 0 };

  if (overlay?.mode === "fill") {
    if (overlay.edges === "left-right") origin.x = Math.round(layout.wall.width * overlay.band);
    else origin.y = Math.round(layout.wall.height * overlay.band);
  }

  const frame = { width: layout.wall.width + origin.x * 2, height: layout.wall.height + origin.y * 2 };
  const space = dimensionSpace(frame);
  // A to-scale person is often taller than the wall itself — every single-screen
  // wall, and most arrays under three panels — so the drawing reserves headroom
  // above the wall instead of cropping the figure. The wall and its dimension
  // lines move down together, so the measurements stay attached.
  const unitPerMm = layout.wall.width / Math.max(1, layout.physical.wall.width);
  // A wall is mounted, not dropped on the floor: its bottom edge is lifted by
  // the agreed height and the gap is dimensioned, so the drawing answers "how
  // high" as well as "how big".
  const mountingHeightMm = wallMountingHeightMm(requirements);
  const mounting = Math.round(mountingHeightMm * unitPerMm);
  // Floor level in frame coordinates, measured from the wall's own bottom edge:
  // a filled source's crop overhang reaches below the wall, so the frame edge is
  // not the floor.
  const floor = frame.height - origin.y + mounting;
  const personHeight = SCALE_PERSON_MM * unitPerMm;
  const doorHeight = SCALE_DOOR_HEIGHT_MM * unitPerMm;
  const floorSpace = space.margin.top + floor;
  // A projection screen hangs, so it has no floor for a figure to stand on.
  const showsFigure = layout.mode !== "screen";
  // The doorway is taller than the person, so it sets the headroom.
  const lift = showsFigure
    ? Math.max(0, Math.ceil(Math.max(personHeight, doorHeight) + space.labelSize * 1.6 - floorSpace))
    : 0;
  // Below the floor the drawing still owes room for the width dimensions and
  // the figure's own height label.
  const margin = {
    ...space.margin,
    top: Math.max(space.margin.top + lift, requirements.roomHeightMm && requirements.roomHeightMm > 0 ? Math.ceil(requirements.roomHeightMm * unitPerMm - floor + space.labelSize * 2) : 0),
    bottom: Math.max(space.margin.bottom, Math.round(floor - frame.height) + space.tiers.far + Math.round(space.labelSize * 1.4)),
  };
  const canvas = {
    width: frame.width + margin.left + margin.right,
    height: frame.height + margin.top + margin.bottom,
  };
  const doorWidth = SCALE_DOOR_WIDTH_MM * unitPerMm;
  const gap = Math.round(Math.max(24, layout.wall.width * 0.05));
  const scale: WallScaleReference | null = showsFigure
    ? {
      unitPerMm,
      personHeight,
      doorHeight,
      doorWidth,
      x: canvas.width + gap,
      wallRight: margin.left + origin.x + layout.wall.width,
      floorY: margin.top + floor,
    }
    : null;

  return {
    ceiling: requirements.roomHeightMm && requirements.roomHeightMm > 0 ? { y: margin.top + floor - requirements.roomHeightMm * unitPerMm, heightMm: requirements.roomHeightMm, headroomMm: requirements.roomHeightMm - mountingHeightMm - layout.physical.wall.height } : null,
    layout,
    overlay,
    frame,
    origin,
    margin,
    canvas,
    labelSize: space.labelSize,
    tiers: space.tiers,
    mounting: { heightMm: mountingHeightMm, gap: mounting },
    drawing: { width: canvas.width + (scale ? gap + Math.round(doorWidth) : 0), height: canvas.height },
    scale,
  };
}

/**
 * The millimetre dimensions drawn beside the wall: overall width and height,
 * one panel's width and height when the wall is an array of panels, and the
 * mounting height that lifts the wall's bottom edge off the floor. The wall
 * span is measured on the wall, never on the crop overhang.
 */
export function wallElevationDimensions(geometry: WallElevationGeometry): WallElevationDimension[] {
  const { layout, origin, frame, labelSize, tiers, mounting } = geometry;
  const { physical } = layout;
  const nearTier = tiers.near;
  const farTier = tiers.far;
  const left = origin.x;
  const right = origin.x + layout.wall.width;
  const top = origin.y;
  const bottom = origin.y + layout.wall.height;
  const offset = Math.round(labelSize * 0.6);
  // Width lines belong below the floor, so a lifted wall keeps its overall
  // width readable instead of burying the line in the gap beneath it.
  const floor = Math.max(frame.height, frame.height - origin.y + mounting.gap);
  const wallWidth = floor + farTier;
  const panelWidth = floor + nearTier;
  const wallHeight = -farTier;
  const panelHeight = -nearTier;
  const dimensions: WallElevationDimension[] = [];
  const showsPanel = physical.panel !== null && layout.mode === "panels" && layout.panels > 1;

  if (showsPanel && physical.panel) {
    const cell = layout.wall.width / layout.columns;
    const row = layout.wall.height / layout.rows;
    dimensions.push({
      key: "panel-width",
      size: "panel",
      axis: "horizontal",
      from: { x: left, y: panelWidth },
      to: { x: left + cell, y: panelWidth },
      extensions: [
        { from: { x: left, y: bottom }, to: { x: left, y: panelWidth } },
        { from: { x: left + cell, y: bottom }, to: { x: left + cell, y: panelWidth } },
      ],
      label: {
        x: left + cell / 2,
        y: panelWidth - offset,
        text: `${formatMillimetres(physical.panel.width)} mm panel`,
        rotate: false,
      },
    });
    dimensions.push({
      key: "panel-height",
      size: "panel",
      axis: "vertical",
      from: { x: panelHeight, y: top },
      to: { x: panelHeight, y: top + row },
      extensions: [
        { from: { x: left, y: top }, to: { x: panelHeight, y: top } },
        { from: { x: left, y: top + row }, to: { x: panelHeight, y: top + row } },
      ],
      label: {
        x: panelHeight - offset,
        y: top + row / 2,
        text: `${formatMillimetres(physical.panel.height)} mm panel`,
        rotate: true,
      },
    });
  }

  dimensions.push({
    key: "wall-width",
    size: "wall",
    axis: "horizontal",
    from: { x: left, y: wallWidth },
    to: { x: right, y: wallWidth },
    extensions: [
      { from: { x: left, y: bottom }, to: { x: left, y: wallWidth } },
      { from: { x: right, y: bottom }, to: { x: right, y: wallWidth } },
    ],
    label: {
      x: (left + right) / 2,
      y: wallWidth - offset,
      text: `${formatMillimetres(physical.wall.width)} mm wall`,
      rotate: false,
    },
  });
  dimensions.push({
    key: "wall-height",
    size: "wall",
    axis: "vertical",
    from: { x: wallHeight, y: top },
    to: { x: wallHeight, y: bottom },
    extensions: [
      { from: { x: left, y: top }, to: { x: wallHeight, y: top } },
      { from: { x: left, y: bottom }, to: { x: wallHeight, y: bottom } },
    ],
    label: {
      x: wallHeight - offset,
      y: (top + bottom) / 2,
      text: `${formatMillimetres(physical.wall.height)} mm wall`,
      rotate: true,
    },
  });

  // The gap under the wall is a dimension in its own right: the mounting height
  // is what the installer sets out from the floor, and it shares the wall-height
  // lane because the two spans never overlap.
  if (mounting.gap > 0) {
    dimensions.push({
      key: "mounting-height",
      size: "mounting",
      axis: "vertical",
      from: { x: wallHeight, y: bottom },
      to: { x: wallHeight, y: bottom + mounting.gap },
      extensions: [
        { from: { x: left, y: bottom }, to: { x: wallHeight, y: bottom } },
        { from: { x: left, y: bottom + mounting.gap }, to: { x: wallHeight, y: bottom + mounting.gap } },
      ],
      label: {
        x: wallHeight - offset,
        y: bottom + mounting.gap / 2,
        text: `${formatMillimetres(mounting.heightMm)} mm to floor`,
        rotate: true,
      },
    });
  }

  return dimensions;
}

/** One sentence naming the array, pixels, window plan and physical size. */
export function wallElevationCaption(layout: WallVisualLayout, overlay: WallElevationOverlay | null = null) {
  const mapping = overlay ? ` Content shape differs from the canvas: ${overlay.text}.` : "";
  return `Wall elevation: ${layout.arrayLabel}, ${layout.pixelsLabel}, ${layout.windowLabel}. ${layout.physical.text}. ${layout.caption}${mapping}`;
}

/**
 * The drawing's two type sizes, in words: small numbers are panels, large ones
 * the source each window carries. Every printout of the elevation reads this
 * list, so the builder, the proposal and the survey sheet cannot explain the
 * same drawing differently.
 */
export type WallElevationKeyItem = { kind: "panel" | "window"; mark: string; text: string };

/**
 * The key for a drawing, or only the entry it actually draws. A canvas, a screen
 * or an array over twelve prints no panel numbers, so the panel line is dropped
 * rather than promising a number the reader will not find.
 */
export function wallElevationKey(layout: WallVisualLayout): WallElevationKeyItem[] {
  const items: WallElevationKeyItem[] = [];
  if (layout.mode === "panels" && layout.panels <= 12) {
    items.push({ kind: "panel", mark: "1", text: "Small numbers are panels — that panel's place in the array." });
  }
  items.push({ kind: "window", mark: "1", text: "Large numbers are the source each window carries." });
  return items;
}

/**
 * The person stands on the wall's own floor line, inside a door opening drawn
 * to the same scale. Nothing here is decorative: the two heights are what make
 * the millimetre labels beside the wall mean something at a glance.
 */
function scaleFigureMarkup(scale: WallScaleReference, labelSize: number) {
  const { x, floorY, doorWidth, doorHeight, personHeight, wallRight } = scale;
  const centre = x + doorWidth / 2;
  const top = floorY - personHeight;
  const head = personHeight * 0.062;
  const width = personHeight * 0.23;
  const shoulderY = top + personHeight * 0.16;
  const hipY = top + personHeight * 0.47;
  const foot = personHeight * 0.17;
  const silhouette = [
    `M ${Math.round(centre - width / 2)} ${Math.round(shoulderY)}`,
    `Q ${Math.round(centre)} ${Math.round(top + personHeight * 0.1)} ${Math.round(centre + width / 2)} ${Math.round(shoulderY)}`,
    `L ${Math.round(centre + width * 0.42)} ${Math.round(hipY)}`,
    `L ${Math.round(centre + foot)} ${Math.round(floorY)}`,
    `L ${Math.round(centre + width * 0.05)} ${Math.round(floorY)}`,
    `L ${Math.round(centre)} ${Math.round(hipY + personHeight * 0.02)}`,
    `L ${Math.round(centre - width * 0.05)} ${Math.round(floorY)}`,
    `L ${Math.round(centre - foot)} ${Math.round(floorY)}`,
    `L ${Math.round(centre - width * 0.42)} ${Math.round(hipY)}`,
    "Z",
  ].join(" ");
  const label = Math.round(Math.max(labelSize * 0.7, doorWidth * 0.08));
  // The printed drawing sits on white paper, so the figure is darker than the
  // wall it stands beside; a pale silhouette would vanish into the page.
  return `<g class="wall-elevation-scale" data-scale-figure="true">
        <line class="wall-elevation-ground" x1="${Math.round(wallRight)}" y1="${Math.round(floorY)}" x2="${Math.round(x + doorWidth)}" y2="${Math.round(floorY)}" stroke="#94a7b2" stroke-width="2" />
        <rect class="wall-elevation-door" x="${Math.round(x)}" y="${Math.round(floorY - doorHeight)}" width="${Math.round(doorWidth)}" height="${Math.round(doorHeight)}" rx="2" fill="none" stroke="#7f95a1" stroke-width="2" />
        <path class="wall-elevation-person" d="${silhouette}" fill="#7c919d" />
        <circle class="wall-elevation-person" cx="${Math.round(centre)}" cy="${Math.round(top + head)}" r="${Math.round(head)}" fill="#7c919d" />
        <text class="wall-elevation-scale-label" x="${Math.round(centre)}" y="${Math.round(floorY + label * 1.35)}" font-size="${label}" fill="#5b7686" text-anchor="middle">${formatMillimetres(SCALE_PERSON_MM)} mm</text>
      </g>`;
}

const BAND_LABEL_SIZE = 26;

function bandLabel(x: number, y: number, text: string, rotate: boolean) {
  return `<text x="${Math.round(x)}" y="${Math.round(y)}" font-size="${BAND_LABEL_SIZE}" font-weight="600" letter-spacing="3" fill="#a7dbe0" text-anchor="middle" dominant-baseline="central"${rotate ? ` transform="rotate(-90 ${Math.round(x)} ${Math.round(y)})"` : ""}>${text}</text>`;
}

/**
 * Bars sit inside the wall on the blank edges of a fitted source. They are
 * painted over the windows because the blank band is not usable content.
 */
function fitOverlay(overlay: WallElevationOverlay, width: number, height: number, labelled = true) {
  const band = Math.round((overlay.edges === "top-bottom" ? height : width) * overlay.band);
  if (band < 1) return "";

  const rects = overlay.edges === "top-bottom"
    ? [[0, 0, width, band], [0, height - band, width, band]]
    : [[0, 0, band, height], [width - band, 0, band, height]];
  const bands = rects.map(([x, y, w, h]) => `<g class="wall-elevation-bar">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#020b12" opacity="0.62" />
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#wall-elevation-hatch)" opacity="0.9" />
    </g>`).join("");

  const bandText = labelled && band >= 16
    ? overlay.edges === "top-bottom"
      ? bandLabel(width / 2, band / 2, "Bars", false) + bandLabel(width / 2, height - band / 2, "Bars", false)
      : bandLabel(band / 2, height / 2, "Bars", true) + bandLabel(width - band / 2, height / 2, "Bars", true)
    : "";

  const content = overlay.edges === "top-bottom"
    ? `<rect class="wall-elevation-content-frame" x="1" y="${band}" width="${width - 2}" height="${height - band * 2}" fill="none" stroke="#16b8b0" stroke-width="2" stroke-dasharray="12 8" opacity="0.8" />`
    : `<rect class="wall-elevation-content-frame" x="${band}" y="1" width="${width - band * 2}" height="${height - 2}" fill="none" stroke="#16b8b0" stroke-width="2" stroke-dasharray="12 8" opacity="0.8" />`;

  return `${bands}${content}${bandText}`;
}

/** The cropped source area is drawn outside the wall, so it stays visible. */
function cropFill(frameWidth: number, frameHeight: number, radius: number) {
  return `<g class="wall-elevation-crop">
    <rect x="0" y="0" width="${frameWidth}" height="${frameHeight}" rx="${radius}" fill="#2a1416" opacity="0.7" />
    <rect x="0" y="0" width="${frameWidth}" height="${frameHeight}" rx="${radius}" fill="url(#wall-elevation-hatch)" opacity="0.55" />
  </g>`;
}

function cropFrame(frameWidth: number, frameHeight: number, radius: number) {
  return `<rect class="wall-elevation-source-frame" x="0.5" y="0.5" width="${frameWidth - 1}" height="${frameHeight - 1}" rx="${radius}" fill="none" stroke="#ef9a9a" stroke-width="2" stroke-dasharray="14 10" opacity="0.9" />`;
}

function cropLabels(overlay: WallElevationOverlay, frameWidth: number, frameHeight: number, bandX: number, bandY: number) {
  if (overlay.edges === "top-bottom") {
    // The overhang is the band outside the wall, not the same fraction of the
    // larger source frame — otherwise the label lands on the wall edge.
    const band = bandY;
    if (band < 18) return "";
    return `<text x="${Math.round(frameWidth / 2)}" y="${Math.round(band / 2)}" font-size="${BAND_LABEL_SIZE}" font-weight="600" letter-spacing="3" fill="#f2b8b8" text-anchor="middle" dominant-baseline="central">Cropped</text>
      <text x="${Math.round(frameWidth / 2)}" y="${Math.round(frameHeight - band / 2)}" font-size="${BAND_LABEL_SIZE}" font-weight="600" letter-spacing="3" fill="#f2b8b8" text-anchor="middle" dominant-baseline="central">Cropped</text>`;
  }
  const band = bandX;
  if (band < 18) return "";
  return `<text x="${Math.round(band / 2)}" y="${Math.round(frameHeight / 2)}" font-size="${BAND_LABEL_SIZE}" font-weight="600" letter-spacing="3" fill="#f2b8b8" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${Math.round(band / 2)} ${Math.round(frameHeight / 2)})">Cropped</text>
    <text x="${Math.round(frameWidth - band / 2)}" y="${Math.round(frameHeight / 2)}" font-size="${BAND_LABEL_SIZE}" font-weight="600" letter-spacing="3" fill="#f2b8b8" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${Math.round(frameWidth - band / 2)} ${Math.round(frameHeight / 2)})">Cropped</text>`;
}

// The proposal is a light document, so dimension ink is dark enough to read on
// paper; the builder's dark card draws the same lines in its own light palette.
const DIMENSION_INK = "#3f5867";
const DIMENSION_LINE = "#5b7484";
const DIMENSION_LEADER = "#8ba2ae";

/** A measured span with end ticks, its leaders, and the millimetre label. */
function dimensionMarkup(dimension: WallElevationDimension, labelSize: number) {
  const { from, to, label } = dimension;
  const tick = Math.max(5, Math.round(labelSize * 0.35));
  const ticks = dimension.axis === "horizontal"
    ? `<line x1="${from.x}" y1="${from.y - tick}" x2="${from.x}" y2="${from.y + tick}" />
      <line x1="${to.x}" y1="${to.y - tick}" x2="${to.x}" y2="${to.y + tick}" />`
    : `<line x1="${from.x - tick}" y1="${from.y}" x2="${from.x + tick}" y2="${from.y}" />
      <line x1="${to.x - tick}" y1="${to.y}" x2="${to.x + tick}" y2="${to.y}" />`;
  const leaders = dimension.extensions.map((leader) => (
    `<line x1="${leader.from.x}" y1="${leader.from.y}" x2="${leader.to.x}" y2="${leader.to.y}" stroke="${DIMENSION_LEADER}" stroke-width="1.5" stroke-dasharray="6 6" />`
  )).join("");
  return `<g class="wall-elevation-dimension" data-dimension="${dimension.key}" stroke="${DIMENSION_LINE}" stroke-width="2">
      ${leaders}
      <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />
      ${ticks}
      <text x="${Math.round(label.x)}" y="${Math.round(label.y)}" font-size="${labelSize}" font-weight="600" letter-spacing="1" fill="${DIMENSION_INK}" stroke="none" text-anchor="middle" dominant-baseline="central"${label.rotate ? ` transform="rotate(-90 ${Math.round(label.x)} ${Math.round(label.y)})"` : ""}>${escapeXml(label.text)}</text>
    </g>`;
}

/**
 * The wall elevation as standalone SVG markup. Proportions, panel boundaries
 * and the window plan come from `wallVisualLayout`, so the proposal drawing
 * cannot drift from the builder's elevation. The dimension lines state the
 * same wall in millimetres, so a site can check it before ordering.
 */
export type WallElevationOptions = {
  /** Draw the millimetre dimension lines. Default true. */
  dimensions?: boolean;
  /** Print "Bars" / "Cropped" inside the overlay bands. Default true. */
  overlayLabels?: boolean;
  /**
   * Draw inside a fixed box, centring the frame. Two drawings of the same wall
   * then share one scale, which is what makes a side-by-side comparison
   * readable: the bars and the crop are measured against the same wall.
   */
  box?: { width: number; height: number };
};

export function wallElevationSvg(requirements: WallRequirements, options: WallElevationOptions = {}) {
  const geometry = wallElevationGeometry(requirements);
  // A comparison preview has no dimension gutter, so the drawing box is the
  // wall and its crop overhang only.
  const showDimensions = options.dimensions !== false;
  const showBandLabels = options.overlayLabels !== false;
  // A fixed box centres the frame inside it, so a comparison preview shows the
  // wall at the same size whether it is barred or cropped.
  const margin = options.box
    ? {
      left: Math.round((options.box.width - geometry.frame.width) / 2),
      right: Math.round((options.box.width - geometry.frame.width) / 2),
      top: Math.round((options.box.height - geometry.frame.height) / 2),
      bottom: Math.round((options.box.height - geometry.frame.height) / 2),
    }
    : showDimensions ? geometry.margin : { left: 0, right: 0, top: 0, bottom: 0 };
  // The scale figure owns the lane to the right of the dimensioned drawing; a
  // comparison preview draws only the wall, so it keeps the frame.
  const canvas = options.box ?? (showDimensions ? geometry.drawing : geometry.frame);
  const { layout, overlay, frame, origin, labelSize: dimensionLabelSize } = geometry;
  const { width, height } = layout.wall;
  const bezel = Math.max(2, width * 0.004);
  const cellWidth = width / layout.columns;
  const cellHeight = height / layout.rows;
  const windowWidth = width / layout.windowColumns;
  const windowHeight = height / layout.windowRows;
  const inset = Math.max(3, Math.min(windowWidth, windowHeight) * 0.03);
  const labelSize = Math.max(14, Math.min(58, Math.min(windowWidth, windowHeight) * 0.18));
  const showPanelNumbers = layout.mode === "panels" && layout.panels <= 12;
  const radius = Math.min(14, width * 0.01);

  const panels = layout.mode === "panels"
    ? Array.from({ length: layout.panels }, (_, index) => {
      const x = (index % layout.columns) * cellWidth;
      const y = Math.floor(index / layout.columns) * cellHeight;
      return [
        `<rect class="wall-elevation-panel" x="${x + bezel / 2}" y="${y + bezel / 2}" width="${cellWidth - bezel}" height="${cellHeight - bezel}" rx="${Math.min(8, cellWidth * 0.02)}" fill="#0b2433" stroke="#020b12" stroke-width="2" />`,
        showPanelNumbers
          ? `<text x="${x + bezel + cellWidth * 0.06}" y="${y + bezel + cellHeight * 0.09}" font-size="${Math.max(10, cellHeight * 0.07)}" fill="#adc2d0" opacity="0.7">${index + 1}</text>`
          : "",
      ].join("");
    }).join("")
    : "";

  const screen = layout.mode === "canvas"
    ? `<rect class="wall-elevation-screen" x="${bezel}" y="${bezel}" width="${width - bezel * 2}" height="${height - bezel * 2}" rx="${Math.min(8, width * 0.01)}" fill="#09212f" stroke="#020b12" stroke-width="2" />
      <rect class="wall-elevation-screen" x="${bezel}" y="${bezel}" width="${width - bezel * 2}" height="${height - bezel * 2}" rx="${Math.min(8, width * 0.01)}" fill="url(#wall-elevation-led)" />`
    : layout.mode === "screen"
      ? `<rect class="wall-elevation-screen" x="${bezel}" y="${bezel}" width="${width - bezel * 2}" height="${height - bezel * 2}" rx="${Math.min(10, width * 0.012)}" fill="#0b2433" stroke="#020b12" stroke-width="2" />`
      : "";

  const windows = layout.windows.map((window) => {
    const x = window.column * windowWidth + inset;
    const y = window.row * windowHeight + inset;
    const fill = TONE_FILLS[window.tone % TONE_FILLS.length];
    return `<g>
      <rect class="wall-elevation-window" x="${x}" y="${y}" width="${windowWidth - inset * 2}" height="${windowHeight - inset * 2}" rx="${Math.min(10, windowWidth * 0.04)}" fill="${fill}" stroke="#16b8b0" stroke-width="2" />
      <text x="${x + (windowWidth - inset * 2) / 2}" y="${y + (windowHeight - inset * 2) / 2}" font-size="${labelSize}" font-weight="700" fill="#edf7fb" stroke="#041b25" stroke-width="4" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">${escapeXml(window.label)}</text>
    </g>`;
  }).join("");

  // A screen carried by several projectors is one surface with several images,
  // so the drawing marks where one image ends and the next begins. Where the
  // surveyor measured the overlap, that mark is the band the two images share;
  // where nobody has measured it, the drawing shows a seam and claims no blend.
  const projectorMarkup = layout.projectorSlices.length
    ? [
      ...(layout.projectorBlends.length
        ? layout.projectorBlends.map((blend) => {
          const bandX = blend.start * width;
          const bandWidth = Math.max(2, (blend.end - blend.start) * width);
          return `<g data-blend-band="${blend.overlapMm}">
        <rect x="${bandX}" y="0" width="${bandWidth}" height="${height}" fill="#f5a524" opacity="0.2" />
        <line x1="${bandX}" y1="0" x2="${bandX}" y2="${height}" stroke="#a86a00" stroke-width="2" stroke-dasharray="8 5" />
        <line x1="${bandX + bandWidth}" y1="0" x2="${bandX + bandWidth}" y2="${height}" stroke="#a86a00" stroke-width="2" stroke-dasharray="8 5" />
        <text x="${bandX + bandWidth / 2}" y="${height * 0.94}" font-size="${Math.max(10, width * 0.012)}" fill="#6b4400" text-anchor="middle">${blend.overlapMm} mm blend</text>
      </g>`;
        })
        : layout.projectorSlices.slice(1).map((slice) =>
          `<line data-projector-seam="true" x1="${slice.start * width}" y1="0" x2="${slice.start * width}" y2="${height}" stroke="#f5a524" stroke-width="2" stroke-dasharray="6 6" />`,
        )),
      ...layout.projectorSlices.map((slice) =>
        `<text data-projector-slice="${slice.label}" x="${((slice.start + slice.end) / 2) * width}" y="${Math.max(16, height * 0.06)}" font-size="${Math.max(10, width * 0.014)}" font-weight="700" fill="#f5a524" text-anchor="middle">${slice.label}</text>`,
      ),
    ].join("\n      ")
    : "";

  const bezels = layout.mode === "panels"
    ? Array.from({ length: layout.panels }, (_, index) => {
      const x = (index % layout.columns) * cellWidth;
      const y = Math.floor(index / layout.columns) * cellHeight;
      return `<rect x="${x + bezel / 2}" y="${y + bezel / 2}" width="${cellWidth - bezel}" height="${cellHeight - bezel}" rx="${Math.min(8, cellWidth * 0.02)}" fill="none" stroke="#020b12" stroke-width="3" opacity="0.85" />`;
    }).join("")
    : "";

  const ledPattern = layout.mode === "canvas"
    ? `<pattern id="wall-elevation-led" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.4" fill="#53e0e8" opacity="0.22" />
      </pattern>`
    : "";
  const hatch = overlay
    ? `<pattern id="wall-elevation-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="14" stroke="${overlay.mode === "fill" ? "#ef9a9a" : "#7fb8c4"}" stroke-width="3" />
      </pattern>`
    : "";
  const defs = ledPattern || hatch ? `<defs>${ledPattern}${hatch}</defs>` : "";

  const bars = overlay?.mode === "fit" ? fitOverlay(overlay, width, height, showBandLabels) : "";
  const cropped = overlay?.mode === "fill";
  const scaleText = showDimensions && geometry.scale
    ? ` A ${formatMillimetres(SCALE_PERSON_MM)} mm person in a ${formatMillimetres(SCALE_DOOR_HEIGHT_MM)} mm doorway gives the scale.`
    : "";
  const ariaLabel = `${layout.ariaLabel}${overlay ? ` ${overlay.text}.` : ""}${scaleText}`;
  const dimensions = showDimensions
    ? wallElevationDimensions(geometry)
      .map((dimension) => dimensionMarkup(dimension, dimensionLabelSize))
      .join("\n    ")
    : "";
  const scaleFigure = showDimensions && geometry.scale ? scaleFigureMarkup(geometry.scale, dimensionLabelSize) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-label="${escapeXml(ariaLabel)}" data-projector-slices="${layout.projectorSlices.length}"${layout.projectorBlends.length ? ` data-blend-overlap="${layout.projectorBlends[0].overlapMm}"` : ""} preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:auto">
    ${defs}
    <g transform="translate(${margin.left} ${margin.top})">
    ${cropped ? cropFill(frame.width, frame.height, radius) : ""}
    <g transform="translate(${origin.x} ${origin.y})">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" fill="#020b12" stroke="#355d72" stroke-width="2" />
      ${screen}
      ${panels}
      ${windows}
      ${bezels}
      ${projectorMarkup}
      ${bars}
      ${wallTransportPlan(requirements).allLinks.filter((link) => link.status === "limit" && link.group === "display").map((link) => {
        const index = Math.max(0, Number(link.id.split("-")[1]) - 1);
        const x = layout.mode === "panels" ? (index % layout.columns) * cellWidth : 0;
        const y = layout.mode === "panels" ? Math.floor(index / layout.columns) * cellHeight : 0;
        return `<g data-over-limit="${escapeXml(link.id)}"><rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="none" stroke="#b42318" stroke-width="5"/><text x="${x + 8}" y="${y + cellHeight * 0.23}" font-size="${Math.max(8, Math.min(24, cellWidth / 14))}" fill="#b42318">${link.runMetres} m / ${link.limitMetres} m limit</text></g>`;
      }).join("")}
    </g>
    ${cropped ? cropFrame(frame.width, frame.height, radius) : ""}
    ${cropped && overlay && showBandLabels ? cropLabels(overlay, frame.width, frame.height, origin.x, origin.y) : ""}
    ${dimensions}
    </g>
    ${scaleFigure}
    ${showDimensions && geometry.ceiling ? `<g data-ceiling="true"><line x1="${margin.left}" y1="${geometry.ceiling.y}" x2="${canvas.width}" y2="${geometry.ceiling.y}" stroke="#5b7484" stroke-dasharray="10 6"/><text x="${margin.left}" y="${geometry.ceiling.y - 6}" font-size="${dimensionLabelSize}" fill="#3f5867">Ceiling ${geometry.ceiling.heightMm} mm · headroom ${geometry.ceiling.headroomMm} mm</text></g>` : ""}
  </svg>`;
}

/**
 * Rasterise the elevation for the DOCX export. Browsers can draw an SVG data
 * URL onto a canvas; environments without a canvas 2D context (tests, SSR)
 * return undefined and the DOCX falls back to text only.
 */
export async function wallElevationPng(requirements: WallRequirements, options: WallElevationOptions = {}) {
  if (typeof document === "undefined" || typeof Image === "undefined") return undefined;
  const geometry = wallElevationGeometry(requirements);
  // The raster carries whatever the SVG draws, so no edge of the drawing is
  // clipped — with or without the dimension gutter and scale figure.
  const box = options.dimensions === false ? geometry.frame : geometry.drawing;
  const scale = Math.min(1, 1600 / box.width, 1600 / box.height);
  const width = Math.max(1, Math.round(box.width * scale));
  const height = Math.max(1, Math.round(box.height * scale));
  const svg = wallElevationSvg(requirements, options);
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = new Image();
  const loaded = new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = source;
  });
  if (!(await loaded)) return undefined;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return undefined;
  return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
}
