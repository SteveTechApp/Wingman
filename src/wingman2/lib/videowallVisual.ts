import {
  wallBlendOverlapMm,
  wallCanvasAspect,
  wallCanvasPixels,
  wallDisplayFeeds,
  wallDisplayPixels,
  wallPanelRangeText,
  wallProjectorCount,
  wallProjectorSplits,
  type WallDisplayFeed,
  type WallRequirements,
} from "./videowallOptions";
import { wallPhysicalSize, type WallPhysicalSize } from "./wallPhysicalSize";

/**
 * Geometry for the wall elevation drawing. The component owns the SVG; this
 * module owns the numbers so the same wall proportions and window plan can be
 * tested without a DOM.
 */

export type WallVisualMode = "panels" | "canvas" | "screen";

export type WallVisualWindow = {
  index: number;
  column: number;
  row: number;
  columns: number;
  rows: number;
  /** The source number shown in the window. */
  label: string;
  tone: number;
};

/**
 * One projector's image on a projection screen. A blended screen is one
 * surface carrying several images, so the drawing marks where one image ends
 * and the next begins; a single-projector screen has no such boundary.
 */
export type WallProjectorSlice = {
  index: number;
  /** Left edge as a fraction of the wall width (0–1). */
  start: number;
  /** Right edge as a fraction of the wall width (0–1). */
  end: number;
  /** "P1" — the image this projector throws. */
  label: string;
};

/**
 * The band two images share, drawn instead of the seam once the overlap has
 * been measured. The band is centred on the boundary, because that is where a
 * blended pair actually meets: each image runs half the overlap past it.
 */
export type WallProjectorBlend = {
  /** The boundary between the two images, as a fraction of the wall width. */
  x: number;
  /** The overlap the surveyor measured, in millimetres. */
  overlapMm: number;
  /** Left edge of the band, as a fraction of the wall width (0–1). */
  start: number;
  /** Right edge of the band, as a fraction of the wall width (0–1). */
  end: number;
};

export type WallVisualLayout = {
  mode: WallVisualMode;
  columns: number;
  rows: number;
  panels: number;
  /** Drawing box that preserves the wall aspect ratio. */
  wall: { width: number; height: number };
  /** Real size in millimetres, so the drawing can be dimensioned. */
  physical: WallPhysicalSize;
  aspectLabel: string;
  windowColumns: number;
  windowRows: number;
  windows: WallVisualWindow[];
  arrayLabel: string;
  pixelsLabel: string;
  windowLabel: string;
  caption: string;
  ariaLabel: string;
  /** Feeds to the displays; empty unless the wall is driven in groups. */
  feeds: WallDisplayFeed[];
  /**
   * The images a multi-projector screen carries, in drawing order. Empty for a
   * wall that is one surface (an LED canvas, a single projector, an LCD array).
   */
  projectorSlices: WallProjectorSlice[];
  /**
   * The measured overlap at each interior boundary. Empty when nothing has been
   * measured, which is the drawing's cue to show a seam rather than invent a
   * blend region.
   */
  projectorBlends: WallProjectorBlend[];
  /**
   * The width each image carries, as `42% / 58%`; empty for a wall that is one
   * image. A rep reading the drawing should not have to measure the seam.
   */
  imageSharesLabel: string;
};

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 900;

function greatestDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestDivisor(b, a % b);
}

function aspectLabelFor(width: number, height: number): string {
  const divisor = greatestDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

/** The grid a composed layout uses, in windows rather than panels. */
export function wallVisualWindowGrid(r: WallRequirements, count: number): { columns: number; rows: number } {
  if (r.layout === "independent") return { columns: Math.max(1, r.columns), rows: Math.max(1, r.rows) };
  if (r.layout === "single") return { columns: 1, rows: 1 };
  if (r.layout === "split") return { columns: 2, rows: 1 };
  if (r.layout === "quad") return { columns: 2, rows: 2 };
  if (r.layout === "nine") return { columns: 3, rows: 3 };
  const columns = Math.min(Math.max(1, r.columns), Math.max(1, Math.ceil(Math.sqrt(count))));
  return { columns, rows: Math.max(1, Math.ceil(count / columns)) };
}

/**
 * The composed canvas as words: how many panels carry it, and how many windows
 * are mapped over them. A drawing alone lets a rep read four window blocks as a
 * four-panel wall, so the sentence states the array the drawing stands on.
 */
export function canvasCaption(panels: number, windows: number, portrait: boolean): string {
  if (panels === 1) {
    return windows === 1
      ? "One canvas fills the single panel; one window fills it."
      : `One canvas fills the single panel; the ${windows} windows are composed across it.`;
  }
  const span = portrait
    ? `One canvas spans the ${panels}-panel portrait array`
    : `One canvas spans all ${panels} panels`;
  return windows === 1
    ? `${span}; the displays tile it in hardware and one window fills it.`
    : `${span}; the displays tile it in hardware and the ${windows} windows are composed across it.`;
}

/**
 * A grouped wall in words. The array and the feeds are both stated, because a
 * drawing of four window blocks on nine panels says neither on its own.
 */
export function groupedCaption(panels: number, feeds: WallDisplayFeed[]): string {
  const ranges = feeds.map((feed) => wallPanelRangeText(feed.panels)).join(", ");
  const count = feeds.length === 1 ? "one feed" : `${feeds.length} feeds`;
  return `${panels} panel${panels === 1 ? "" : "s"} on ${count}: ${ranges}. Each feed carries the slice its displays tile.`;
}

export function wallVisualLayout(r: WallRequirements): WallVisualLayout {
  const lcd = r.application.startsWith("lcd");
  const columns = Math.max(1, Math.round(Number(r.columns) || 1));
  const rows = Math.max(1, Math.round(Number(r.rows) || 1));
  const panels = columns * rows;
  const canvas = wallCanvasPixels(r);
  const display = wallDisplayPixels(r);
  const isIndependent = r.layout === "independent";
  const count = isIndependent ? panels : Math.max(1, Math.round(Number(r.windows) || 1));
  const grid = wallVisualWindowGrid(r, count);
  const lcdAspect = wallCanvasAspect(r);
  const ratio = lcd ? lcdAspect.ratio : canvas.width / canvas.height;
  const aspectLabel = lcd ? lcdAspect.label : aspectLabelFor(canvas.width, canvas.height);
  let width = MAX_WIDTH;
  let height = Math.round(MAX_WIDTH / ratio);
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
    width = Math.round(MAX_HEIGHT * ratio);
  }
  width = Math.max(1, width);
  height = Math.max(1, height);

  const sources = Math.max(1, Math.round(Number(r.sources) || 1));
  const windows: WallVisualWindow[] = Array.from({ length: count }, (_, index) => {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    return {
      index,
      column,
      row,
      columns: grid.columns,
      rows: grid.rows,
      label: String((index % sources) + 1),
      tone: index % 6,
    };
  });

  const mode: WallVisualMode = r.application === "led" ? "canvas" : r.application === "projection" ? "screen" : "panels";
  const feeds = r.application === "lcd-grouped" ? wallDisplayFeeds(r) : [];
  // The canvas is as wide as the projectors together, so the split is the same
  // count that sized it.
  const projectors = wallProjectorCount(r);
  // A projector pair is one screen carrying two images, not one surface: each
  // projector throws the canvas slice it was given, so the drawing divides the
  // screen at the boundary between them. A wide image beside a narrow one meets
  // somewhere other than the middle, so the boundaries come from the rep's own
  // seams rather than from an equal split.
  const splitPoints = wallProjectorSplits(r);
  const bounds = [0, ...splitPoints, 1];
  const projectorSlices: WallProjectorSlice[] = projectors > 1
    ? bounds.slice(1).map((end, index) => ({
      index,
      start: bounds[index],
      end,
      label: `P${index + 1}`,
    }))
    : [];
  // The panel count rides on the array label because a composed window plan can
  // look like the wall's own tiling: a 3 × 3 array with four windows is nine
  // panels carrying four composed regions, not a 2 × 2 wall.
  const arrayLabel = lcd
    ? `${columns} × ${rows} array (${panels} panel${panels === 1 ? "" : "s"})`
    : r.application === "led"
      ? "LED canvas"
      : projectors > 1 ? `${projectors} projectors` : "Projector";
  // A grouped wall programs a canvas per feed, so the chip quotes the biggest
  // feed's slice rather than an array total no single output carries.
  const largestFeed = feeds.length
    ? feeds.reduce((best, feed) => (feed.pixels.width * feed.pixels.height > best.pixels.width * best.pixels.height ? feed : best), feeds[0])
    : null;
  const pixelsLabel = isIndependent
    ? `Each panel ${display.width} × ${display.height}`
    : r.application === "projection"
      ? projectors > 1
        ? `Canvas ${canvas.width} × ${canvas.height} · each projector ${display.width} × ${display.height}`
        : `Projector ${canvas.width} × ${canvas.height}`
      : largestFeed
        ? `Largest feed ${largestFeed.pixels.width} × ${largestFeed.pixels.height}`
        : `Canvas ${canvas.width} × ${canvas.height}`;
  const windowLabel = `${count} window${count === 1 ? "" : "s"}`;
  // An unequal pair is a design decision, not an error, so the drawing says the
  // shares rather than only moving the seam: the caption prints too.
  const imageSharesLabel = projectorSlices.length
    ? projectorSlices.map((slice) => `${Math.round((slice.end - slice.start) * 100)}%`).join(" / ")
    : "";
  const unequalImages = projectorSlices.length > 0
    && projectorSlices.some((slice) => Math.abs((slice.end - slice.start) - 1 / projectorSlices.length) > 0.005);
  const caption = isIndependent
    ? `Each panel receives its own feed, so the wall behaves as ${panels} separate screens.`
    : r.application === "led"
      ? "One composed canvas is mapped to the LED processor; cabinet layout and calibration are set downstream."
      : r.application === "projection"
        ? projectors > 1
          ? `${projectors} projectors each carry one slice of a ${aspectLabel} canvas; the windows are composed before the split.${unequalImages ? ` The images are unequal — ${imageSharesLabel} of the screen — so each carries the width it was given at the seam.` : ""}`
          : "One projector fills the screen. Windows are composed before the projector."
        : feeds.length
          ? groupedCaption(panels, feeds)
          : canvasCaption(panels, count, r.orientation === "portrait");
  const physical = wallPhysicalSize(r);
  // A measured overlap is drawn where it was measured: the band is the strip two
  // images share, centred on the boundary between them. It is capped at a fifth
  // of one image, so a mistyped figure cannot swallow the slice it sits in.
  const overlapMm = wallBlendOverlapMm(r);
  const projectorBlends: WallProjectorBlend[] = projectorSlices.length && overlapMm > 0
    ? projectorSlices.slice(1).map((slice, index) => {
      const x = slice.start;
      // The band lies inside both images, so the narrower of the two bounds it:
      // a fifth of that image keeps a blend from eating a slice that is already
      // narrower than its neighbour.
      const previous = projectorSlices[index];
      const narrower = Math.min(previous.end - previous.start, slice.end - slice.start);
      const half = Math.min(narrower * 0.1, overlapMm / Math.max(1, physical.wall.width) / 2);
      return { x, overlapMm, start: Math.max(0, x - half), end: Math.min(1, x + half) };
    })
    : [];
  const ariaLabel = `Wall elevation: ${arrayLabel}, ${aspectLabel}, ${pixelsLabel}, ${windowLabel}. ${physical.text}. ${caption}`;

  return {
    mode,
    columns,
    rows,
    panels,
    wall: { width, height },
    physical,
    aspectLabel,
    windowColumns: grid.columns,
    windowRows: grid.rows,
    windows,
    arrayLabel,
    pixelsLabel,
    windowLabel,
    caption,
    ariaLabel,
    feeds,
    projectorSlices,
    projectorBlends,
    imageSharesLabel,
  };
}
