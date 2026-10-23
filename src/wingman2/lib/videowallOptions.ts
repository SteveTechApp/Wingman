import type { WallSurveyReview } from "./wallSurveyReview";

export type WallApplication = "lcd-direct" | "lcd-grouped" | "lcd-loop" | "led" | "projection";
export type WallLayout = "single" | "split" | "quad" | "nine" | "custom" | "independent";
/** How a custom layout is built: a recalled fixed layout, or free floating windows. */
export type WallCustomMode = "fixed" | "floating";

/**
 * What a surveyor writes beside a link on site, beside its measured run: the
 * housing at the display, the termination there and the point the run enters.
 * Mounting is recorded once per display in `displayMounts`, because a mount
 * belongs to the screen rather than each cable that reaches it.
 *
 * `enclosure` is the display housing — the enclosure the screen sits in — and
 * keeps that stored key because saved walls and priced installation lines are
 * filed under it. `entry` is a cell of its own: where the run enters the room
 * or the position (a wall plate, a floor box, a ceiling void). One cell used to
 * ask both questions, so a surveyor wrote one answer into it and an installer
 * had to guess the other. `entry` is last so a sheet printed before it existed
 * still imports its install cells at the same positions.
 */
export const WALL_LINK_DETAIL_FIELDS = ["enclosure", "termination", "entry"] as const;
export type WallLinkDetailField = (typeof WALL_LINK_DETAIL_FIELDS)[number];
/** `mount` is accepted only while reading older saved rows; current writes use displayMounts. */
export type WallLinkDetail = Partial<Record<WallLinkDetailField, string>> & { mount?: string };
export type WallRequirements = {
  surveyDraftOverride?: boolean;
  roomHeightMm?: number;
  panelMassOverride?: { kg: number; model: string; source: string };
  linkTransports?: Record<string, { cable: "fibre"; segments?: number }>;
  mappingHistory?: { appliedAt: string; kind: string; before: Pick<WallRequirements, "ledCanvasWidth" | "ledCanvasHeight" | "sourceCustom" | "sourceWidth" | "sourceHeight">; undoneAt?: string }[];
  application: WallApplication;
  columns: number;
  rows: number;
  /**
   * How many feeds reach a grouped LCD wall's displays. Each feed drives one
   * display or a looped group of them, so the grouping follows the array rather
   * than being typed panel by panel. Unset falls back to one feed per row.
   */
  displayFeeds?: number;
  sources: number;
  windows: number;
  layout: WallLayout;
  customMode: WallCustomMode;
  sourceLocation: "local" | "distributed";
  sourceResolution: "1080p" | "4k30" | "4k60";
  /** Native panel or projector resolution preset. */
  displayResolution: "1080p" | "4k";
  /** Custom panel projector pixels; used instead of the preset when set. */
  displayCustom: boolean;
  displayWidth: number;
  displayHeight: number;
  /** Custom source pixels; used instead of the preset when set. */
  sourceCustom: boolean;
  sourceWidth: number;
  sourceHeight: number;
  /** Pixel canvas fed to the LED processor. */
  ledCanvasWidth: number;
  ledCanvasHeight: number;
  /**
   * Diagonal of one panel (or of the projector screen) in inches. The elevation
   * quotes physical millimetres from it; older saved walls fall back to 55 in.
   */
  panelDiagonalInches?: number;
  /** LED pixel pitch in millimetres. An LED wall's physical size follows it. */
  pixelPitchMm?: number;
  /**
   * Height of the wall's bottom edge above the finished floor, in millimetres.
   * The elevation draws the wall lifted by it and dimensions the gap, because
   * the mounting height, not the wall size, is what has to suit the room.
   * Unset falls back to the planning default of 900 mm; 0 is a floor-standing
   * wall and draws no gap.
   */
  mountingHeightMm?: number;
  /**
   * How many projectors carry the screen. A blended screen is one surface with
   * several images, so both drawings divide it and every projector gets its own
   * transport run; the count is bounded because those runs size from it.
   */
  projectors?: number;
  /**
   * The overlap the surveyor measured where two images meet, in millimetres.
   * Unset means nobody has measured it: the drawing shows a seam and never
   * invents a blend region of its own.
   */
  blendOverlapMm?: number;
  /**
   * Where the boundaries between the images fall, as fractions of the screen
   * width (`[0.42]` for a pair whose first image is the wider one). Unset
   * divides the screen equally, which is what a symmetric pair looks like.
   * A wide and a narrow image meet somewhere other than the middle, so the
   * rep moves the seam rather than the drawing guessing.
   */
  projectorSplits?: number[];
  /**
   * How the rep chose to map the source onto a canvas that is a different
   * shape: `fit` keeps every pixel and leaves bars, `fill` covers the canvas
   * and crops. Unset lets the plan recommend one from the window count.
   */
  mapping?: "fit" | "fill";
  network: "any" | "none" | "1g" | "10g";
  orientation: "landscape" | "portrait";
  /**
   * Measured cable run in metres, keyed by transport link id (`source-2`,
   * `display-5`, or `display-12-grouped` for a folded row). A measured run
   * replaces the design allowance for that link; unmeasured links keep it.
   */
  measuredRuns?: Record<string, number>;
  /**
   * Enclosure, mount and termination recorded for a link, keyed by the same
   * transport link ids. A field the surveyor left blank is absent, so a saved
   * design only carries what was actually written on the sheet.
   */
  linkDetails?: Record<string, WallLinkDetail>;
  /** Mount recorded once per display, then shown beside each link that feeds it. */
  displayMounts?: Record<string, string>;
  /**
   * The last worksheet photo review the rep acted on: every row the reader
   * offered, with the run it read and whether the rep took it or cleared it.
   * The design keeps the decision, not only its result, so an applied run can
   * be explained after the sheet has gone back into the folder.
   */
  surveyReview?: WallSurveyReview;
};
export type WallEquipment = { sku: string; quantity: number; role: string };
export type WallOption = {
  id: string; title: string; summary: string; equipment: WallEquipment[];
  path: string[]; checks: string[]; blockers: string[]; sources: { label: string; url: string }[];
};
export const WALL_RESEARCH_DATE = "2026-10-13";
export const wallApplications: { value: WallApplication; title: string; description: string }[] = [
  { value: "lcd-direct", title: "LCD · feed per display", description: "A matrix output or AVoIP receiver drives each panel." },
  { value: "lcd-grouped", title: "LCD · fed in groups", description: "One head-end feed per display or looped group of displays; each group tiles its own slice." },
  { value: "lcd-loop", title: "LCD · looped / tiled", description: "One canvas feeds the wall; the displays perform tiling." },
  { value: "led", title: "LED · processor input", description: "Compose an HDMI feed for a NovaStar-type processor." },
  { value: "projection", title: "Large single projection", description: "Switch full-screen, split-screen and multiview layouts." },
];
/**
 * Requirements from a saved wall summary. Proposals receive either the stored
 * wrapper (`{ summary: { requirements } }`) or the summary itself, so both
 * shapes resolve here. Anything without a recognised application returns null
 * and the proposal omits the wall drawing.
 */
export function wallRequirementsFromSummary(value: unknown): WallRequirements | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const summary = record.summary && typeof record.summary === "object"
    ? (record.summary as Record<string, unknown>)
    : record;
  const requirements = summary.requirements;
  if (!requirements || typeof requirements !== "object") return null;
  const application = (requirements as Record<string, unknown>).application;
  return application === "lcd-direct" || application === "lcd-grouped" || application === "lcd-loop" || application === "led" || application === "projection"
    ? normalizeWallDesignMetadata(requirements as unknown as WallRequirements)
    : null;
}

/**
 * Planning mounting height: eye level near the centre of a seated viewer, the
 * height most commercial walls are specified at. The rep's measured figure wins
 * over it, and a wall standing on the floor is recorded as 0.
 */
export const DEFAULT_MOUNTING_HEIGHT_MM = 900;
/** A wall has to be reachable and serviceable, so the field is bounded. */
export const MAX_MOUNTING_HEIGHT_MM = 2000;
/** A screen is carried by a few projectors; every one is its own transport run. */
export const MAX_WALL_PROJECTORS = 4;
/**
 * A blend band wider than this is a placement problem rather than an overlap, so
 * the field is bounded instead of letting a mistyped survey swallow the screen.
 */
export const MAX_BLEND_OVERLAP_MM = 1000;
/**
 * No image can be squeezed below this share of the screen: a seam the rep drags
 * has to stop before one image disappears behind its neighbour.
 */
export const MIN_PROJECTOR_IMAGE_SHARE = 0.1;

/**
 * The images a screen carries. Only a projection wall is divided between
 * projectors: every other wall is one surface per output, so a stored count on a
 * wall that has since changed application is not carried along.
 */
export function wallProjectorCount(r: WallRequirements): number {
  if (r.application !== "projection") return 1;
  const value = Math.round(Number(r.projectors) || 1);
  return Math.max(1, Math.min(MAX_WALL_PROJECTORS, value));
}

/**
 * The boundaries between the images, as fractions of the screen width. One per
 * interior boundary: a pair is a single value, a four-projector screen three.
 *
 * A stored boundary is honoured where it still leaves every image at least
 * `MIN_PROJECTOR_IMAGE_SHARE` of the screen; otherwise the equal split stands,
 * because a rotted draft or a hand-edited link must not collapse an image.
 * Unset boundaries fall back to the equal split, so a symmetric screen keeps
 * the midpoints it had before anyone moved a seam.
 */
export function wallProjectorSplits(r: WallRequirements): number[] {
  const count = wallProjectorCount(r);
  if (count < 2) return [];
  const stored = Array.isArray(r.projectorSplits) ? r.projectorSplits : [];
  const splits: number[] = [];
  for (let index = 1; index < count; index += 1) {
    const raw = Number(stored[index - 1]);
    const lower = (splits[index - 2] ?? 0) + MIN_PROJECTOR_IMAGE_SHARE;
    const upper = 1 - (count - index) * MIN_PROJECTOR_IMAGE_SHARE;
    // Four decimals keep a dragged seam a stable number: the wall, the link's
    // token and a saved card all compare these fractions for equality.
    const place = (value: number) => Number(Math.min(upper, Math.max(lower, value)).toFixed(4));
    splits.push(place(Number.isFinite(raw) && raw > 0 && raw < 1 ? raw : index / count));
  }
  return splits;
}

/**
 * The surveyed blend overlap in millimetres; 0 means it has not been measured.
 * A wall that is not divided between projectors has no blend to record.
 */
export function wallBlendOverlapMm(r: WallRequirements): number {
  if (wallProjectorCount(r) < 2) return 0;
  const value = Number(r.blendOverlapMm);
  return Number.isFinite(value) && value > 0 ? Math.min(MAX_BLEND_OVERLAP_MM, Math.round(value)) : 0;
}

export const defaultWallRequirements: WallRequirements = {
  application: "lcd-direct", columns: 2, rows: 2, sources: 4, windows: 1,
  layout: "single", customMode: "fixed", sourceLocation: "local", sourceResolution: "4k60",
  displayResolution: "4k", displayCustom: false, displayWidth: 3840, displayHeight: 2160,
  sourceCustom: false, sourceWidth: 3840, sourceHeight: 2160,
  ledCanvasWidth: 3840, ledCanvasHeight: 1080, panelDiagonalInches: 55, pixelPitchMm: 2.5,
  mountingHeightMm: DEFAULT_MOUNTING_HEIGHT_MM,
  network: "any", orientation: "landscape",
};
/** Fixed layouts are recalled placements; floating windows are moved and sized live. */
export const FLOATING_WINDOW_LIMIT = 6;
export const FIXED_WINDOW_LIMIT = 16;
const product = (sku: string, quantity: number, role: string): WallEquipment => ({ sku, quantity, role });
const source = (label: string, slug: string) => ({ label, url: `https://www.wyrestorm.com/${slug}` });
const RESOLUTION_PIXELS = {
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
} as const;

function clampCount(value: number, fallback = 1) {
  return Math.max(1, Math.round(Number(value) || fallback));
}

/** Native width/height of one display, honouring a custom panel size. */
function nativeDisplayPixels(r: WallRequirements): { width: number; height: number } {
  if (r.displayCustom) {
    return { width: clampCount(r.displayWidth, 3840), height: clampCount(r.displayHeight, 2160) };
  }
  return { ...RESOLUTION_PIXELS[r.displayResolution] };
}

/** Pixels of the whole wall canvas actually presented to the displays. */
export function wallCanvasPixels(r: WallRequirements): { width: number; height: number } {
  if (r.application === "led") {
    return { width: clampCount(r.ledCanvasWidth), height: clampCount(r.ledCanvasHeight) };
  }
  const native = nativeDisplayPixels(r);
  // A blended screen is as wide as its images together: each projector throws
  // its own slice, so two 4K projectors carry a 7680 × 2160 canvas.
  if (r.application === "projection") {
    return { width: clampCount(native.width) * wallProjectorCount(r), height: clampCount(native.height) };
  }
  const panel = r.orientation === "portrait"
    ? { width: native.height, height: native.width }
    : { ...native };
  return { width: clampCount(r.columns) * panel.width, height: clampCount(r.rows) * panel.height };
}

/** Pixels of a single panel (or the projector / LED canvas). */
export function wallDisplayPixels(r: WallRequirements): { width: number; height: number } {
  if (r.application === "led") return wallCanvasPixels(r);
  const native = nativeDisplayPixels(r);
  if (r.application === "projection") return { ...native };
  return r.orientation === "portrait" ? { width: native.height, height: native.width } : { ...native };
}

/**
 * A grouped LCD wall is wired as a set of feeds, each driving one display or a
 * looped group of them. The groups start from whole rows — a loop follows the
 * physical rows — so every feed stays rectangular and its slice of the canvas is
 * a real crop rather than a ragged list of panels. The count is a design answer,
 * not a survey figure: it rides in the brief, a saved starting point and a link.
 */
export type WallDisplayFeed = {
  /** 1-based feed number. The transport quotes one head-end link per feed. */
  index: number;
  /** "Feed 2 · panels 4–6": the label every surface prints. */
  label: string;
  /** 1-based panel numbers this feed drives, in reading order. */
  panels: number[];
  /**
   * Pixels this feed's own slice carries. One feed has to fit one head-end
   * output, so the canvas is sized on the largest feed rather than on the array.
   */
  pixels: { width: number; height: number };
};

/** The panels the array holds, whichever application is drawn. */
export function wallPanelCount(r: WallRequirements): number {
  return clampCount(r.columns) * clampCount(r.rows);
}

/**
 * The feeds a grouped wall is wired on. Unset asks for one feed per row, and a
 * stored count is bounded by the panels the wall actually has, so a rotted draft
 * or a hand-edited link cannot quote feeds for displays that are not there.
 */
export function wallDisplayFeedCount(r: WallRequirements): number {
  const panels = wallPanelCount(r);
  const asked = Number(r.displayFeeds);
  const count = Number.isFinite(asked) && asked >= 1 ? Math.round(asked) : clampCount(r.rows);
  return Math.max(1, Math.min(panels, count));
}

/** A panel set in words: "panels 1–3", or "panel 4" for a single display. */
export function wallPanelRangeText(panels: readonly number[]): string {
  const sorted = [...panels].filter((panel) => Number.isFinite(panel)).sort((a, b) => a - b);
  if (!sorted.length) return "no panels";
  const runs: { start: number; end: number }[] = [];
  for (const panel of sorted) {
    const last = runs[runs.length - 1];
    if (last && panel === last.end + 1) last.end = panel;
    else runs.push({ start: panel, end: panel });
  }
  const text = runs.map((run) => (run.start === run.end ? `${run.start}` : `${run.start}–${run.end}`)).join(", ");
  return `${sorted.length === 1 ? "panel" : "panels"} ${text}`;
}

/** Split a row's columns into `parts` contiguous groups, as even as the count allows. */
function splitRow(columns: number, parts: number): { start: number; size: number }[] {
  const groups: { start: number; size: number }[] = [];
  let start = 0;
  for (let index = 0; index < parts; index += 1) {
    const size = Math.ceil((columns - start) / (parts - index));
    groups.push({ start, size });
    start += size;
  }
  return groups;
}

/**
 * The feeds, in reading order. Fewer feeds than rows merges neighbouring rows;
 * more feeds than rows splits a row down its columns, so a nine-panel wall asked
 * for four feeds gives three feeds of three panels and one split row of two and
 * one — always rectangles, never a diagonal set of displays.
 */
export function wallDisplayFeeds(r: WallRequirements): WallDisplayFeed[] {
  const columns = clampCount(r.columns);
  const rows = clampCount(r.rows);
  const count = wallDisplayFeedCount(r);
  const groups: number[][] = [];
  if (count < rows) {
    let row = 0;
    for (let index = 0; index < count; index += 1) {
      const rowsHere = Math.ceil((rows - row) / (count - index));
      const panels: number[] = [];
      for (let offset = 0; offset < rowsHere; offset += 1) {
        for (let column = 0; column < columns; column += 1) panels.push((row + offset) * columns + column + 1);
      }
      groups.push(panels);
      row += rowsHere;
    }
  } else {
    const base = Math.floor(count / rows);
    const extra = count % rows;
    for (let row = 0; row < rows; row += 1) {
      const parts = Math.min(columns, base + (row < extra ? 1 : 0));
      for (const group of splitRow(columns, parts)) {
        groups.push(Array.from({ length: group.size }, (_, offset) => row * columns + group.start + offset + 1));
      }
    }
  }
  // One panel's own pixels times the rectangle the feed covers: the groups are
  // built from whole rows and column runs, so the feed's slice is a real crop.
  const face = wallDisplayPixels(r);
  return groups.map((panels, index) => {
    const feedRows = new Set(panels.map((panel) => Math.floor((panel - 1) / columns))).size;
    const feedColumns = Math.max(1, Math.round(panels.length / Math.max(1, feedRows)));
    return {
      index: index + 1,
      label: `Feed ${index + 1} · ${wallPanelRangeText(panels)}`,
      panels,
      pixels: { width: face.width * feedColumns, height: face.height * feedRows },
    };
  });
}

/** One line under the feed count, saying what the wiring means in the room. */
export function wallFeedSummaryText(r: WallRequirements): string {
  const panels = wallPanelCount(r);
  const count = wallDisplayFeedCount(r);
  if (count === 1) return "1 feed to the displays: it carries the whole canvas";
  if (count >= panels) return `${count} feeds to the displays: each display gets its own feed`;
  return `${count} feeds to the displays: each driving a group of displays`;
}

export function wallSourcePixels(r: WallRequirements): { width: number; height: number } {
  if (r.sourceCustom) {
    return { width: clampCount(r.sourceWidth, 3840), height: clampCount(r.sourceHeight, 2160) };
  }
  const native = RESOLUTION_PIXELS[r.sourceResolution === "1080p" ? "1080p" : "4k"];
  return { ...native };
}

const SOURCE_RATE_LABELS = { "1080p": "1080p60", "4k30": "4K30", "4k60": "4K60" } as const;
/** Custom sizes keep the selected source timing, so the label names only the size. */
const sourceLabel = (r: WallRequirements) => (r.sourceCustom ? "Custom" : SOURCE_RATE_LABELS[r.sourceResolution]);
const pixels = (size: { width: number; height: number }) => `${size.width} × ${size.height}`;
const scaleLabel = (value: number) => (Math.abs(value - 1) < 0.01 ? "1:1" : `${Number(value.toFixed(2))}×`);

/**
 * How the source resolution maps onto the wall: one source across the whole
 * canvas, or one source per screen. This is the calculation a rep needs before
 * promising "4K on the wall".
 */
export function wallResolutionSummary(r: WallRequirements): {
  canvas: { width: number; height: number };
  display: { width: number; height: number };
  source: { width: number; height: number };
  scale: number;
  native: boolean;
  label: string;
} {
  const canvas = wallCanvasPixels(r);
  const display = wallDisplayPixels(r);
  const source = wallSourcePixels(r);
  const target = r.layout === "independent" ? display : canvas;
  const scaleX = target.width / source.width;
  const scaleY = target.height / source.height;
  const scale = Math.min(scaleX, scaleY);
  const native = target.width === source.width && target.height === source.height;
  const targetLabel = r.layout === "independent"
    ? "each screen"
    : r.application === "projection"
      ? "the projector"
      : r.application === "led"
        ? "the LED canvas"
        : "the wall canvas";
  // A custom pixel size still carries the selected source timing, and that
  // timing is what the design blockers evaluate.
  const sourceText = r.sourceCustom
    ? `${pixels(source)} source (${SOURCE_RATE_LABELS[r.sourceResolution]} timing)`
    : `${pixels(source)} source`;
  const uniform = Math.abs(scaleX - scaleY) < 0.01;
  const mapping = native
    ? `${sourceText} maps 1:1 to ${targetLabel}.`
    : uniform
      ? `${sourceText} into ${pixels(target)} at ${targetLabel} is a ${scaleLabel(scaleX)} ${scaleX < 1 ? "downscale" : "upscale"}.`
      : `${sourceText} into ${pixels(target)} at ${targetLabel}: ${scaleLabel(scaleX)} horizontally and ${scaleLabel(scaleY)} vertically — the source shape does not match, so content must be authored to the canvas.`;
  return { canvas, display, source, scale, native, label: `${sourceLabel(r)} ${mapping}` };
}

/**
 * The resolution budget a rep quotes: what the wall totals, what each display
 * receives, and how the source maps onto it. Per-panel feeds are not one
 * canvas, so the total is described as the sum of the panel feeds.
 */
export function wallResolutionBudget(r: WallRequirements): {
  canvas: { width: number; height: number };
  display: { width: number; height: number };
  source: { width: number; height: number };
  headline: string;
  mapping: string;
  text: string;
} {
  const summary = wallResolutionSummary(r);
  const perPanel = r.application === "lcd-direct" && r.layout === "independent";
  const headline = r.application === "led"
    ? `LED canvas ${pixels(summary.display)} · source ${pixels(summary.source)}`
    : r.application === "projection"
      ? `Projector ${pixels(summary.display)} · source ${pixels(summary.source)}`
      : perPanel
        ? `Wall total ${pixels(summary.canvas)} · ${clampCount(r.columns) * clampCount(r.rows)} separate panel feeds · each panel ${pixels(summary.display)} · source ${pixels(summary.source)}`
        : `Wall canvas ${pixels(summary.canvas)} · each panel ${pixels(summary.display)} · source ${pixels(summary.source)}`;
  return {
    canvas: summary.canvas,
    display: summary.display,
    source: summary.source,
    headline,
    mapping: summary.label,
    text: `${headline}. ${summary.label}`,
  };
}

export type WallCanvasPlan = {
  /** Canvas pixels to program into the processor, receiving card or projector. */
  canvas: { width: number; height: number };
  /** Exact array total before any scale-down. */
  native: { width: number; height: number };
  /** Pixels each panel receives on the recommended canvas. */
  perPanel: { width: number; height: number } | null;
  source: { width: number; height: number };
  /** True when the array total exceeded a single 4K canvas. */
  scaled: boolean;
  recommended: "per-panel" | "match" | "fit" | "fill";
  /** Whole source visible, with bars on the short side. */
  fit: { visible: { width: number; height: number }; bars: { horizontal: number; vertical: number } };
  /** Canvas filled edge to edge, with pixels lost on the long side. */
  fill: { visible: { width: number; height: number }; crop: { horizontal: number; vertical: number } };
  headline: string;
  rationale: string;
  text: string;
};

/** The largest canvas a single 4K output can carry; wider arrays are scaled
 * down while preserving their shape. */
const SINGLE_CANVAS = { width: 3840, height: 2160 };

function aspectRatio(size: { width: number; height: number }) {
  return size.width / size.height;
}

/** Signal canvases are programmed in even pixels. */
const evenPixels = (value: number) => Math.max(2, Math.round(value / 2) * 2);

function sameShape(a: { width: number; height: number }, b: { width: number; height: number }) {
  return Math.abs(aspectRatio(a) - aspectRatio(b)) <= 0.01 * Math.max(aspectRatio(a), aspectRatio(b));
}

/**
 * The canvas a rep should program, and how 16:9 content maps onto a wall that
 * is not 16:9. Arrays wider than a single 4K frame are scaled down to a
 * 3840-wide canvas that keeps their shape; the fit/fill numbers are calculated
 * against that recommended canvas so they match what the processor receives.
 */
export function wallCanvasPlan(r: WallRequirements): WallCanvasPlan {
  const source = wallSourcePixels(r);
  const independent = r.application === "lcd-direct" && r.layout === "independent";
  // A grouped wall programs one canvas per feed, so the plan is sized on the
  // largest feed: that slice is what one head-end output has to carry, and the
  // array total is a number no single output ever sees.
  const feeds = r.application === "lcd-grouped" ? wallDisplayFeeds(r) : [];
  const largestFeed = feeds.reduce<WallDisplayFeed | null>(
    (best, feed) => (!best || feed.pixels.width * feed.pixels.height > best.pixels.width * best.pixels.height ? feed : best),
    null,
  );
  const native = largestFeed ? { ...largestFeed.pixels } : wallCanvasPixels(r);
  const scaleDown = r.application !== "led" && r.application !== "projection" && !independent
    && (native.width > SINGLE_CANVAS.width || native.height > SINGLE_CANVAS.height);
  const factor = scaleDown
    ? Math.min(SINGLE_CANVAS.width / native.width, SINGLE_CANVAS.height / native.height)
    : 1;
  const columns = Math.max(1, Math.round(Number(r.columns) || 1));
  const rows = Math.max(1, Math.round(Number(r.rows) || 1));
  // The feed's own rectangle, so a scaled program divides across the panels that
  // slice carries rather than across the whole array.
  const feedRows = largestFeed ? new Set(largestFeed.panels.map((panel) => Math.floor((panel - 1) / columns))).size : 0;
  const feedColumns = largestFeed ? Math.max(1, Math.round(largestFeed.panels.length / Math.max(1, feedRows))) : 0;
  const perFeedColumns = largestFeed ? feedColumns : columns;
  const perFeedRows = largestFeed ? Math.max(1, feedRows) : rows;
  // Per-panel feeds have no composed canvas: each screen receives its own image.
  const canvas = independent
    ? wallDisplayPixels(r)
    : scaleDown
      ? { width: evenPixels(native.width * factor), height: evenPixels(native.height * factor) }
      : { ...native };
  const perPanel = r.application === "led"
    ? null
    : independent
      ? { ...canvas }
      : r.application === "projection"
        ? null
        : scaleDown
          ? { width: evenPixels(canvas.width / perFeedColumns), height: evenPixels(canvas.height / perFeedRows) }
          : wallDisplayPixels(r);

  const fitScale = Math.min(canvas.width / source.width, canvas.height / source.height);
  const fitVisible = { width: Math.round(source.width * fitScale), height: Math.round(source.height * fitScale) };
  const fit = {
    visible: fitVisible,
    bars: {
      horizontal: Math.round((canvas.width - fitVisible.width) / 2),
      vertical: Math.round((canvas.height - fitVisible.height) / 2),
    },
  };
  const fillScale = Math.max(canvas.width / source.width, canvas.height / source.height);
  const fillRendered = { width: Math.round(source.width * fillScale), height: Math.round(source.height * fillScale) };
  const fill = {
    visible: { ...canvas },
    crop: {
      horizontal: Math.round((fillRendered.width - canvas.width) / 2),
      vertical: Math.round((fillRendered.height - canvas.height) / 2),
    },
  };

  // The rep can choose the mapping after seeing both costs; without a choice
  // the window count still picks the safer default.
  const chosen = r.mapping === "fit" || r.mapping === "fill" ? r.mapping : null;
  const recommended: WallCanvasPlan["recommended"] = independent
    ? "per-panel"
    : sameShape(canvas, source)
      ? "match"
      : chosen ?? (r.windows > 1 ? "fit" : "fill");

  const barsText = fit.bars.horizontal > 0
    ? `${fit.bars.horizontal} px bars left and right`
    : `${fit.bars.vertical} px bars top and bottom`;
  const cropText = fill.crop.vertical > 0
    ? `${fill.crop.vertical} px cropped top and bottom`
    : `${fill.crop.horizontal} px cropped left and right`;
  const panelText = perPanel ? `each panel ${pixels(perPanel)}` : null;
  const headline = recommended === "per-panel"
    ? `Per-panel feeds ${pixels(canvas)} · ${columns * rows} screens`
    : [
      `${largestFeed ? "Programmed feed canvas" : "Recommended canvas"} ${pixels(canvas)}`,
      scaleDown ? `native array ${pixels(native)}` : null,
      panelText,
    ].filter(Boolean).join(" · ");
  const rationale = recommended === "per-panel"
    ? `Every panel takes its own source, so each one runs at ${pixels(perPanel!)} with no canvas fit or crop.`
    : recommended === "match"
      ? `The canvas and source share the same shape, so a uniform ${scaleLabel(canvas.width / source.width)} scale fills it with no bars or crop.`
      : recommended === "fit"
        ? `Fit the source to keep every pixel visible; it leaves ${barsText}.`
        : fill.crop.vertical > 0
          ? `Fill the canvas edge to edge, cropping ${fill.crop.vertical} px top and bottom.`
          : `Fill the canvas edge to edge, cropping ${fill.crop.horizontal} px left and right.`;
  const text = recommended === "per-panel"
    ? `Run ${columns * rows} separate panel feeds at ${pixels(perPanel!)} each; no canvas fit or crop.`
    : recommended === "match"
      ? `Program ${pixels(canvas)}${largestFeed ? " per feed" : ""}${scaleDown ? ` (native ${largestFeed ? "feed" : "array"} ${pixels(native)}, ${panelText})` : ""}; the source shape matches, so no bars or crop.`
      : recommended === "fit"
        ? `Program ${pixels(canvas)}${largestFeed ? " per feed" : ""}${scaleDown ? ` (native ${largestFeed ? "feed" : "array"} ${pixels(native)}, ${panelText})` : ""}; fit the source and accept ${barsText}.`
        : `Program ${pixels(canvas)}${largestFeed ? " per feed" : ""}${scaleDown ? ` (native ${largestFeed ? "feed" : "array"} ${pixels(native)}, ${panelText})` : ""}; fill from the source and accept ${cropText}.`;

  return { canvas, native, perPanel, source, scaled: scaleDown, recommended, fit, fill, headline, rationale, text };
}

/**
 * The shape of the whole wall canvas, derived from the panel count and
 * orientation. A square array of 16:9 panels is 16:9; a 4 × 2 array is 32:9.
 * Content authored for 16:9 has to stretch, crop or letterbox to fill any
 * other shape, which is a customer conversation, not a product decision.
 */
export function wallCanvasAspect(r: WallRequirements): { ratio: number; label: string; standard: boolean } {
  const reduce = (a: number, b: number): number => (b === 0 ? a : reduce(b, a % b));
  const columns = Math.max(1, Math.round(Number(r.columns) || 1));
  const rows = Math.max(1, Math.round(Number(r.rows) || 1));
  // A screen is shaped by the images it carries, not by an array's columns and
  // rows: two projectors make a 32:9 surface whatever those fields say.
  if (r.application === "projection") {
    const canvas = wallCanvasPixels(r);
    const divisor = reduce(canvas.width, canvas.height);
    const ratio = canvas.width / canvas.height;
    return { ratio, label: `${canvas.width / divisor}:${canvas.height / divisor}`, standard: Math.abs(ratio - 16 / 9) < 0.03 };
  }
  // Custom panel pixels (for example 16:10 monitors) set the real wall shape.
  const panel = wallDisplayPixels(r);
  const width = columns * panel.width;
  const height = rows * panel.height;
  const divisor = reduce(width, height);
  const ratio = width / height;
  return { ratio, label: `${width / divisor}:${height / divisor}`, standard: Math.abs(ratio - 16 / 9) < 0.03 };
}

/** The stretch warning a rep must resolve before quoting a non-16:9 wall. */
export function wallAspectWarning(r: WallRequirements): string | null {
  // A feed per panel keeps every panel at its own native 16:9 shape.
  if (!r.application.startsWith("lcd") || r.layout === "independent") return null;
  const aspect = wallCanvasAspect(r);
  if (aspect.standard) return null;
  const shape = `This ${r.columns} × ${r.rows} array is a ${aspect.label} canvas, not 16:9.`;
  if (r.windows > 1) {
    return `${shape} Each window inherits that shape, so 16:9 sources cannot simply stretch; apply fit or crop inside every window.`;
  }
  return `${shape} Do not stretch a 16:9 source across it: fit it with bars or fill it by cropping — the canvas plan below shows the pixels for each choice.`;
}

export function validateWallRequirements(r: WallRequirements): string[] {
  const errors: string[] = [];
  for (const [label, value, max] of [["Columns", r.columns, 16], ["Rows", r.rows, 16], ["Sources", r.sources, 64], ["Visible windows", r.windows, 16]] as const) {
    if (!Number.isInteger(value) || value < 1 || value > max) errors.push(`${label} must be a whole number from 1 to ${max}.`);
  }
  if (r.layout !== "independent" && r.windows > r.sources) errors.push("Visible windows cannot exceed the available source count.");
  if (r.layout === "custom" && r.customMode === "floating" && r.windows > FLOATING_WINDOW_LIMIT) errors.push(`A floating drag-and-drop layout supports up to ${FLOATING_WINDOW_LIMIT} windows.`);
  for (const [label, value] of [["LED canvas width", r.ledCanvasWidth], ["LED canvas height", r.ledCanvasHeight]] as const) {
    if (!Number.isInteger(value) || value < 1 || value > 16384) errors.push(`${label} must be a whole number from 1 to 16384.`);
  }
  if (!["1080p", "4k"].includes(r.displayResolution)) errors.push("Display resolution must be 1080p or 4K.");
  for (const [label, value] of [["Panel width", r.displayWidth], ["Panel height", r.displayHeight], ["Source width", r.sourceWidth], ["Source height", r.sourceHeight]] as const) {
    if (!Number.isInteger(value) || value < 1 || value > 16384) errors.push(`${label} must be a whole number from 1 to 16384.`);
  }
  // Physical sizes are quoted on the drawing, so a nonsense value has to block.
  if (r.panelDiagonalInches !== undefined && (!Number.isFinite(r.panelDiagonalInches) || r.panelDiagonalInches < 10 || r.panelDiagonalInches > 200)) {
    errors.push("Panel diagonal must be from 10 to 200 inches.");
  }
  if (r.pixelPitchMm !== undefined && (!Number.isFinite(r.pixelPitchMm) || r.pixelPitchMm < 0.5 || r.pixelPitchMm > 20)) {
    errors.push("LED pixel pitch must be from 0.5 to 20 mm.");
  }
  // The elevation dimensions the gap, so an impossible height cannot be drawn.
  if (r.mountingHeightMm !== undefined && (!Number.isFinite(r.mountingHeightMm) || r.mountingHeightMm < 0 || r.mountingHeightMm > MAX_MOUNTING_HEIGHT_MM)) {
    errors.push(`Mounting height must be from 0 to ${MAX_MOUNTING_HEIGHT_MM} mm above the floor.`);
  }
  if (r.mapping !== undefined && r.mapping !== "fit" && r.mapping !== "fill") {
    errors.push("The source mapping must be fit or fill.");
  }
  const expected = { single: 1, split: 2, quad: 4, nine: 9 }[r.layout as "single" | "split" | "quad" | "nine"];
  if (expected && r.windows !== expected) errors.push(`This layout needs ${expected} visible windows.`);
  if (r.layout === "independent" && r.application !== "lcd-direct") errors.push("Independent screen sources need a separate feed to each LCD display.");
  // A grouped wall cannot ask for more feeds than it has displays.
  if (r.application === "lcd-grouped" && r.displayFeeds !== undefined
    && (!Number.isInteger(r.displayFeeds) || r.displayFeeds < 1 || r.displayFeeds > wallPanelCount(r))) {
    errors.push(`Feeds to the displays must be a whole number from 1 to ${wallPanelCount(r)}.`);
  }
  return errors;
}

export function assessVideowallOptions(r: WallRequirements): WallOption[] {
  const invalid = validateWallRequirements(r);
  const panels = r.columns * r.rows;
  const direct = r.application === "lcd-direct";
  const composed = !direct;
  const multiview = r.windows > 1 && r.layout !== "independent";
  const custom = r.layout === "custom";
  // A screen carried by several projectors is one surface with an image each, so
  // a design that ends in a single picture cannot give a pair their own halves.
  // It is blocked rather than advertised as a wall it cannot split.
  const projectors = wallProjectorCount(r);
  const divided = r.application === "projection" ? projectors : 1;
  const sliceBlockers = divided > 1
    ? [`${divided} projectors each need their own slice; this design ends in one picture.`]
    : [];
  const destination = r.application === "lcd-grouped" ? `${wallDisplayFeedCount(r)} feeds → ${panels} LCD panels, each loop tiling its own slice`
    : r.application === "lcd-loop" ? "One HDMI canvas → validated display loop / distribution → panel tile mode"
    : r.application === "led" ? "HDMI → LED processor → receiving cards / LED cabinets"
    : r.application === "projection" ? (divided > 1
      ? `${divided} HDMI outputs → ${divided} projectors, one canvas slice each`
      : "HDMI → one projector") : `${panels} separate HDMI feeds → ${panels} LCD panels`;
  const aspectWarning = wallAspectWarning(r);
  const resolution = wallResolutionSummary(r);
  const canvasPlan = wallCanvasPlan(r);
  const common = ["Confirm sink EDID, resolution, refresh rate, HDCP, cable distances and audio routing.",
    ...(resolution.native ? [] : [`Resolution check: ${resolution.label}`]),
    ...(aspectWarning ? [aspectWarning] : []),
    ...(canvasPlan.recommended === "match" && !canvasPlan.scaled ? [] : [`Canvas plan: ${canvasPlan.text}`]),
    ...(r.application === "lcd-loop" ? ["Validate the display model's tile mode, loop interface, maximum chain length and bezel setup. One feed cannot independently switch panel sources."] : []),
    ...(r.application === "led" ? ["Confirm the exact LED processor input timing and pixel canvas. The processor retains LED mapping, receiving-card configuration and calibration; a 4K60 source is not proof of 4K60 processor input support."] : []),
    ...(r.application === "projection" ? ["Match projector native resolution, aspect ratio and text legibility. Lens geometry, warping and edge blending are outside this single-projector design."] : []),
  ];
  function option(id: string, title: string, summary: string, equipment: WallEquipment[], path: string[], checks: string[], blockers: string[], sources: WallOption["sources"]): WallOption {
    return { id, title, summary, equipment, path: [...path, destination], checks: [...checks, ...common], blockers: [...invalid, ...blockers], sources };
  }
  function networkBlock(speed: "1g" | "10g") {
    return r.network === "none" || (r.network !== "any" && r.network !== speed)
      ? [`This option requires a dedicated ${speed === "1g" ? "1GbE" : "10GbE"} AV network; change the network requirement to consider it.`] : [];
  }
  const matrix = (sku: string, inputs: number, outputs: number): WallOption => option(
    sku.toLowerCase(), sku, `Local ${inputs}-input / ${outputs}-output scaling matrix with video-wall processing.`,
    [product(sku, 1, "Local switching, scaling and wall processing")], ["Local HDMI sources", sku],
    [sku === "MX-0812-SCL" ? "Multiview uses up to four sources and is mirrored on outputs 1–4. Rotation is specified on outputs 9–12; validate operating mode and output allocation."
      : "Verify the selected video-wall and multiview modes, output allocation and supported array geometry in the current manual.",
    "Matrix scaling, independent output routing and composing multiple sources into one output are distinct functions."],
    [...(r.sources > inputs ? [`${r.sources} sources exceed ${inputs} physical inputs.`] : []),
      ...(direct && panels > outputs ? [`${panels} panels exceed ${outputs} physical outputs.`] : []),
      ...(r.sourceLocation === "distributed" ? ["Remote source transport is not included in this local HDMI option."] : []),
      ...(r.windows > 4 && multiview ? ["This option is limited to four simultaneous sources."] : []),
      ...(custom ? ["Free-placement window requirements need model-specific validation; use a native multiview option below."] : []),
      ...(divided > 1 && multiview ? [`${divided} projectors each need their own slice; this local matrix splits one selected picture across its outputs, not a composed multi-window layout.`] : []),
      ...(divided > 1 && divided > outputs ? [`${divided} projectors exceed ${outputs} physical outputs.`] : []),
      ...(direct && multiview ? ["Simultaneous multiview composition and per-panel cropping need a confirmed mode/cascade design. Consider a looped wall or a dedicated composition stage."] : []),
      ...(direct && r.orientation === "portrait" ? ["Confirm rotation support on every used output before selecting this portrait-wall option."] : [])],
    [source(sku, `product/${sku.toLowerCase()}/`)],
  );
  const tx500 = product("NHD-500-TX", r.sources, "One current v2 encoder per source; catalogue family SKU");
  const control = product("NHD-CTL-PRO-V2", 1, "System controller");
  const dedicated = (outputs: 4 | 6) => {
    const sku = outputs === 4 ? "SW-0204-VW" : "SW-0206-VW";
    return option(sku.toLowerCase(), sku, "Dedicated local wall processor for one selected source across the array.",
      [product(sku, 1, "Two alternative HDMI inputs; one cropped output per panel")], ["Selected local HDMI source", sku],
      ["Two selectable inputs do not mean two simultaneous windows or independent sources per panel. Bezel setup and supported array/rotation modes must be confirmed."],
      [...(!direct ? ["This option is for direct LCD panel feeds, not a single composed processor/projector input."] : []),
        ...(panels > outputs ? [`${panels} panels exceed this unit's ${outputs} outputs; cascades require a separate design.`] : []),
        ...(r.sources > 2 ? ["More than two sources need upstream switching."] : []),
        ...(r.layout !== "single" ? ["This option spreads one selected source; it does not provide the requested composition or independent routing."] : []),
        ...(r.sourceLocation !== "local" ? ["Remote-source transport must be designed separately."] : []),
        ...(outputs === 4 && !((r.columns === 2 && r.rows === 2) || (r.columns === 4 && r.rows === 1)) ? ["The verified SW-0204-VW arrays are 2 × 2 or 4 columns × 1 row."] : []),
        ...(r.orientation === "portrait" ? ["Validate this processor's rotation mode with the requested portrait array."] : [])],
      [source(sku, `global/product/${sku.toLowerCase()}/`)]);
  };
  return [
    matrix("MX-0404-SCL", 4, 4),
    matrix("MX-0812-SCL", 8, 12),
    option("nhd500", "NetworkHD 500 · receiver per display", "A 1GbE distribution design for independent panels or a combined wall image.",
      [tx500, product("NHD-500-RX", direct ? panels : 1, "One current v2 receiver per destination; catalogue family SKU"), control],
      ["Source → 500-series encoder", "Managed 1GbE AV network", direct ? `${panels} × 500-series receivers (wall crop or independent routing)` : "500-series receiver"],
      ["Published wall capacity is 16 × 16 with bezel adjustment and rotation. Provide a managed AV switch, PoE budget and multicast/uplink design.", "The standard 500-series receiver does not natively compose a multiview canvas."],
      [...networkBlock("1g"), ...(multiview || custom ? ["Add an external multiview stage; a standard NHD-500 receiver alone cannot compose these windows."] : []), ...sliceBlockers],
      [source("500-series v2", "product/nhd-500-tx-rx-v2/")]),
    option("nhd150", "NHD-150-RX · low-bandwidth multiview", "A composed output for a tiled LCD loop, LED processor or projector using compatible 120-series sources.",
      [product(r.sourceLocation === "local" ? "NHD-124-TX" : "NHD-120-TX", r.sourceLocation === "local" ? Math.ceil(r.sources / 4) : r.sources, r.sourceLocation === "local" ? "Four local source inputs per encoder" : "One encoder per remote source"), product("NHD-150-RX", 1, "Multiview receiver / compositor"), control],
      ["120-series compatible encoders", "Managed 1GbE AV network", "NHD-150-RX · one composed HDMI output"],
      ["Up to nine 1080p streams or eight higher-resolution streams; the product description specifies 4K30 input streams. Verify the exact output timing and firmware layout support.", "Budget for codec latency: published 1080p modes are approximately 80–250 ms; 4K modes approximately 150–300 ms. Test live-camera use.",
        ...(custom && r.customMode === "floating" ? [`Floating windows are moved and sized by drag and drop with ${FLOATING_WINDOW_LIMIT} windows as the working maximum; confirm the saved layout recalls as expected.`] : [])],
      [...networkBlock("1g"), ...(!composed ? ["This one-output design needs display-owned tiling. It does not supply an independent feed to every LCD."] : []),
      ...sliceBlockers,
      ...(custom && r.customMode === "fixed" ? ["The 150-series canvas places windows as floating drag-and-drop windows; a recalled fixed layout at X/Y pixel positions is a 600-series design."] : []),
      ...(r.sourceResolution === "4k60" ? ["The selected 120-series encoder path does not support 4K60 sources at their requested rate."] : []),
      ...(r.windows > (r.sourceResolution === "1080p" ? 9 : 8) ? ["Visible windows exceed the NHD-150-RX limit for this source resolution."] : [])],
      [source("NHD-150-RX", "global/product/nhd-150-rx/"), source("NHD-124-TX", "global/product/nhd-124-tx/")]),
    option("nhd600", "NetworkHD 600 · SDVoE multiview", "A 10GbE option for source routing and up to 16 windows on one composed output.",
      [product("NHD-600-TRX", r.sources + (direct ? panels : 1), `${r.sources} source units + ${direct ? panels : 1} dedicated receiver units`), control],
      ["600-series source units", "Managed 10GbE AV network", direct ? `${panels} dedicated receive units` : "Dedicated receive unit · composed HDMI"],
      ["The 16-window claim is a maximum, not sixteen guaranteed native-4K windows. Validate stream scaling, window geometry and processing latency against the exact firmware.", "Use dedicated TX and RX roles for this estimate; do not rely on simultaneous encoding while decoding multiview. Confirm supported wall dimensions, synchronisation and rotation for a per-panel build.",
        ...(custom && r.customMode === "fixed" ? ["Window placement is recalled from a fixed layout using X/Y pixel coordinates; confirm the saved-layout workflow on the exact 600-series unit."] : [])],
      [...networkBlock("10g"), ...(direct && (multiview || custom) ? ["A synchronised multiview canvas spanning per-panel receivers needs a validated composition/distribution design."] : []),
      ...sliceBlockers,
      ...(custom && r.customMode === "floating" ? ["This design places windows from a recalled fixed layout at X/Y pixel coordinates; free floating drag-and-drop windows are the NHD-150-RX design."] : [])],
      [source("NHD-600-TRX", "product/nhd-600-trx/")]),
    option("hdmi-multiview", "NHD-0401-MV · local HDMI layouts", "Four local HDMI inputs and one composed output; a simple option for switchable presentation layouts.",
      [product("NHD-0401-MV", 1, "Four-input HDMI multiview switcher")], ["Up to four local HDMI sources", "NHD-0401-MV"],
      ["Six preset layouts; validate the chosen split / picture-in-picture preset. This is an HDMI device, not an AVoIP decoder."],
      [...(!composed ? ["One HDMI output cannot directly drive every panel; use display tiling or a separate wall-distribution stage."] : []),
      ...sliceBlockers,
      ...(r.sources > 4 ? ["More than four local sources require upstream switching."] : []),
      ...(r.windows > 4 ? ["At most four simultaneous windows."] : []),
      ...(r.sourceLocation === "distributed" ? ["Remote sources require receivers or other HDMI transport."] : []),
      ...(custom ? ["Uses preset layouts; arbitrary window placement is not established."] : [])],
      [source("NHD-0401-MV", "product/nhd-0401-mv/")]),
    option("nhd500-multiview", "NetworkHD 500 + HDMI multiview", "Add a four-window composition stage to a 500-series source network.",
      [tx500, product("NHD-500-RX", Math.min(r.sources, 4), "One decoder for each multiview HDMI input"), product("NHD-0401-MV", 1, "Composes decoded HDMI sources"), control],
      ["500-series encoders", "Managed 1GbE AV network", "Up to four 500-series decoders → NHD-0401-MV"],
      ["The multiviewer's Ethernet connection is for control. Its four HDMI inputs need decoded video; do not connect it as a native IP stream receiver."],
      [...networkBlock("1g"), ...(!composed ? ["This option ends in one canvas. Per-panel distribution would require an additional encoder and wall receivers."] : []),
      ...sliceBlockers,
      ...(r.windows > 4 || custom ? ["This composition stage supports up to four sources in preset layouts."] : [])],
      [source("500-series v2", "product/nhd-500-tx-rx-v2/"), source("NHD-0401-MV", "product/nhd-0401-mv/")]),
    dedicated(4),
    dedicated(6),
  ];
}

/** Optional design evidence from older or damaged storage must not break exports. */
export function normalizeWallDesignMetadata(requirements: WallRequirements): WallRequirements {
  const mass = requirements.panelMassOverride;
  const panelMassOverride = mass && Number.isFinite(mass.kg) && mass.kg > 0 && typeof mass.model === "string" && mass.model.trim() && typeof mass.source === "string" && mass.source.trim()
    ? { kg: mass.kg, model: mass.model.trim(), source: mass.source.trim() } : undefined;
  const mappingHistory = Array.isArray(requirements.mappingHistory) ? requirements.mappingHistory.filter((entry) => entry && typeof entry.appliedAt === "string" && Number.isFinite(Date.parse(entry.appliedAt)) && typeof entry.kind === "string" && entry.before && [entry.before.ledCanvasWidth, entry.before.ledCanvasHeight, entry.before.sourceWidth, entry.before.sourceHeight].every((value) => Number.isFinite(value) && value > 0) && typeof entry.before.sourceCustom === "boolean").map((entry) => ({ ...entry, undoneAt: typeof entry.undoneAt === "string" && Number.isFinite(Date.parse(entry.undoneAt)) ? entry.undoneAt : undefined })) : undefined;
  const linkTransports = requirements.linkTransports && typeof requirements.linkTransports === "object" ? Object.fromEntries(Object.entries(requirements.linkTransports).filter(([, value]) => value && value.cable === "fibre").map(([id, value]) => [id, { cable: "fibre" as const, segments: Number.isFinite(value.segments) ? Math.max(1, Math.min(1000, Math.round(value.segments!))) : 1 }])) : undefined;
  const displayMounts = requirements.displayMounts && typeof requirements.displayMounts === "object"
    ? Object.fromEntries(Object.entries(requirements.displayMounts).flatMap(([id, value]) => {
      const text = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
      return /^display-\d+$/.test(id) && text ? [[id, text]] : [];
    }))
    : undefined;
  // Older walls kept mount text on each cable link. Promote the first recorded
  // mount for a display, then remove the duplicate link fields.
  const legacyDetails = requirements.linkDetails && typeof requirements.linkDetails === "object"
    ? Object.fromEntries(Object.entries(requirements.linkDetails).flatMap(([id, detail]) => {
      if (!/^display-\d+$/.test(id) || !detail || typeof detail !== "object") return [];
      const mount = String((detail as Record<string, unknown>).mount ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
      return mount ? [[id, mount]] : [];
    }))
    : {};
  const normalizedDisplayMounts = { ...legacyDetails, ...displayMounts };
  const linkDetails = requirements.linkDetails && typeof requirements.linkDetails === "object"
    ? Object.fromEntries(Object.entries(requirements.linkDetails).map(([id, detail]) => {
      const { mount: _legacyMount, ...remaining } = (detail ?? {}) as WallLinkDetail & { mount?: string };
      return [id, remaining];
    }))
    : requirements.linkDetails;
  // A count and a measured overlap are only meaningful on a screen divided
  // between projectors, so they are dropped from a wall that is not one rather
  // than carried along as a number nothing draws.
  const projectors = requirements.application === "projection"
    ? Math.max(1, Math.min(MAX_WALL_PROJECTORS, Math.round(Number(requirements.projectors) || 1)))
    : undefined;
  const blendOverlapMm = projectors && projectors > 1 && Number.isFinite(requirements.blendOverlapMm) && requirements.blendOverlapMm! > 0
    ? Math.min(MAX_BLEND_OVERLAP_MM, Math.round(requirements.blendOverlapMm!))
    : undefined;
  // The seams are design answers, not survey figures: they keep the equal split
  // only while the screen is divided, and a stored boundary is clamped to the
  // range `wallProjectorSplits` would honour anyway.
  const divided = projectors ?? 1;
  const splits = divided > 1 ? wallProjectorSplits({ ...requirements, projectors: divided }) : [];
  // An equal split is the default, so it is stored as nothing at all: a shared
  // link and a saved card stay as short as the design they describe.
  const projectorSplits = splits.some((split, index) => Math.abs(split - (index + 1) / divided) > 0.0001)
    ? splits
    : undefined;
  // The feed count belongs to a grouped wall; any other application drops it
  // rather than carrying a number nothing draws or quotes.
  const displayFeeds = requirements.application === "lcd-grouped"
    ? Math.min(wallPanelCount(requirements), Math.max(1, Math.round(Number(requirements.displayFeeds) || clampCount(requirements.rows))))
    : undefined;
  return { ...requirements, linkDetails, displayMounts: Object.keys(normalizedDisplayMounts).length ? normalizedDisplayMounts : undefined, displayFeeds, projectors, blendOverlapMm, projectorSplits, mapping: requirements.mapping === "fit" || requirements.mapping === "fill" ? requirements.mapping : undefined, panelMassOverride, mappingHistory, linkTransports, surveyDraftOverride: requirements.surveyDraftOverride === true, roomHeightMm: Number.isFinite(requirements.roomHeightMm) && requirements.roomHeightMm! > 0 ? requirements.roomHeightMm : undefined };
}
