import { wallProjectorCount, type WallRequirements } from "./videowallOptions";

/**
 * How the wall is fed, asked once the wall's size is known: does one canvas
 * arrive and the wall scale it, or does every panel take its own feed, and what
 * produces that canvas? Size comes first because the canvas is a product of it;
 * the connection comes next because it decides who scales, and the layout comes
 * after both because a window count means something only once the wall receives
 * a composed picture.
 *
 * The answer is not a new field on the design: a model is the application the
 * decision engine already reads (`lcd-loop` is one canvas with the panels
 * tiling it, `lcd-direct` is a feed per panel, `projectors` is a blend), and a
 * feed path is the transport the location question already reads. Each choice
 * writes those, so nothing here can disagree with the recommendation.
 */

export type WallFeedingModel = "single-input" | "group" | "per-panel" | "blended";

export type WallFeedingChoice = {
  key: WallFeedingModel;
  label: string;
  detail: string;
  /** Written when the rep chooses it; absent where the build already is this. */
  patch?: Partial<WallRequirements>;
};

export type WallFeedPathKey =
  | "scaling-switch"
  | "avoip-decoder"
  | "nhd150"
  | "nhd600"
  | "nhd500"
  | "matrix-per-panel"
  | "avoip-per-panel";

export type WallFeedPath = {
  key: WallFeedPathKey;
  label: string;
  detail: string;
  patch: Partial<WallRequirements>;
  /** What choosing it commits the design to, printed under the choices. */
  check: string;
};

/**
 * A composed-LCD model has no room for a feed per panel, so switching to one
 * drops the independent layout with it — the same rule the picture question
 * keeps. A wall already built this way writes nothing.
 */
function toComposedApplication(
  r: WallRequirements,
  target: "lcd-loop" | "lcd-grouped",
): Partial<WallRequirements> | undefined {
  const drops = r.layout === "independent";
  if (target === r.application && !drops) return undefined;
  return { application: target, ...(drops ? { layout: "single" as const, windows: 1 } : {}) };
}

/** The model the design is already built to, so the question opens answered. */
export function wallFeedingKeyFor(r: WallRequirements): WallFeedingModel {
  if (r.application === "projection") return wallProjectorCount(r) > 1 ? "blended" : "single-input";
  if (r.application === "lcd-direct") return "per-panel";
  if (r.application === "lcd-grouped") return "group";
  return "single-input";
}

/**
 * Only the models a wall of this kind can be built to: an LED canvas in this
 * builder is always one processor input, and a blend is a projection wall with
 * more than one projector. A model that has no home in the design is left out
 * rather than offered as a control that writes nothing.
 */
export function wallFeedingChoices(r: WallRequirements): WallFeedingChoice[] {
  const panels = r.columns * r.rows;
  const projectors = wallProjectorCount(r);
  const choices: WallFeedingChoice[] = [
    {
      key: "single-input",
      label: "One input, the wall scales it",
      detail:
        r.application === "led"
          ? "One canvas arrives at the LED processor, which tiles it across the cabinets."
          : r.application === "projection"
            ? "One canvas arrives at the blend processor, which gives each projector its slice."
            : "One canvas arrives once; every panel shows its own slice of it.",
      patch:
        r.application === "projection"
          ? projectors > 1 ? { projectors: 1 } : undefined
          : r.application.startsWith("lcd")
            ? toComposedApplication(r, "lcd-loop")
            : undefined,
    },
  ];
  if (r.application.startsWith("lcd")) {
    choices.push({
      key: "group",
      label: "One feed per group",
      detail: "Each looped group of panels tiles its own slice of one feed.",
      patch: toComposedApplication(r, "lcd-grouped"),
    });
    choices.push({
      key: "per-panel",
      label: "One feed per panel",
      detail: `${panels} feeds: a matrix output or a decoder behind each panel, one source shown whole.`,
      patch: { application: "lcd-direct", layout: "independent", windows: panels },
    });
  }
  if (r.application === "projection") {
    choices.push({
      key: "blended",
      label: "Two or more projectors, blended",
      detail: "One canvas across the projectors, with an overlap at every seam.",
      patch: { projectors: Math.max(2, projectors) },
    });
  }
  return choices;
}

/** The sentence for a wall whose panels are fed one by one, where that is not this design. */
export function wallFeedingPanelNote(r: WallRequirements): string | null {
  if (r.application !== "led") return null;
  return "An LED wall fed cabinet by cabinet is a decoder and a sending card per panel on the AV network, not one processor input: this builder models the canvas, so record that design rather than an LED canvas.";
}

/** The processor that composes its own windows instead of taking a composed canvas. */
export function wallFeedingProcessorNote(r: WallRequirements): string | null {
  if (r.application !== "led") return null;
  return "Some LED processors take several HDMI inputs and scale their own multiview output. If this one does, no separate composition box is needed: confirm the input count, the per-window scaling and the canvas the processor sends to the cabinets.";
}

const FEED_PATHS: WallFeedPath[] = [
  {
    key: "scaling-switch",
    label: "Scaling matrix switch",
    detail: "The composed canvas leaves a switcher or scaler and the wall takes it once.",
    patch: { sourceLocation: "local", network: "any" },
    check: "A scaling matrix switch sends one canvas: confirm the output timing it can produce, and expect the wall to rescale whatever arrives — 1:1 pixel mapping is not promised by a switch alone.",
  },
  {
    key: "avoip-decoder",
    label: "AVoIP decoder at the wall",
    detail: "One encoder on the source, one decoder at the wall, over the site's AV network.",
    patch: { sourceLocation: "distributed", network: "1g" },
    check: "An AVoIP decoder carries the canvas at what its codec allows: 1GbE is comfortable for 1080p, while 4K60 needs 10GbE or a wall-capable decoder. Confirm codec, latency and EDID at the wall.",
  },
  {
    key: "nhd150",
    label: "NHD-150-RX multiview",
    detail: "Windows composed and scaled in the receiver, one canvas out of it.",
    patch: { sourceLocation: "distributed", network: "1g" },
    check: "NHD-150-RX composes the windows itself, so the wall receives a single canvas and no separate multiviewer is needed. Confirm the window count and the input resolution it accepts.",
  },
  {
    key: "nhd600",
    label: "NHD-600-TRX multiview",
    detail: "The 4K multiviewer, and the same box for one projector carrying several windows.",
    patch: { sourceLocation: "distributed", network: "10g", sourceResolution: "4k60", sourceCustom: false },
    check: "NHD-600-TRX carries 4K60 and multi-window in one box: use it where the canvas or the window detail needs 4K, and for a single projector showing several windows.",
  },
  {
    key: "nhd500",
    label: "NHD-500, custom canvas",
    detail: "Takes a custom resolution when the canvas is not a standard timing.",
    patch: { sourceCustom: true },
    check: "NHD-500 takes a custom resolution: the box for a blend, an unusual aspect or an LED array that is not a standard timing. Set that canvas in the source, not only in the display.",
  },
  {
    key: "matrix-per-panel",
    label: "A matrix output per panel",
    detail: "A fixed matrix gives every panel its own output.",
    patch: { sourceLocation: "local", network: "any" },
    check: "One output per panel: the matrix sizes to the array (a 3 × 3 is nine outputs) and a panel shows one source whole, so nothing can span two panels.",
  },
  {
    key: "avoip-per-panel",
    label: "A decoder per panel",
    detail: "One receiver behind each panel, on the AV network.",
    patch: { sourceLocation: "distributed", network: "1g" },
    check: "One decoder per panel: the head-end grows with the array and each panel shows one source whole. Confirm the network can carry as many streams as the wall has panels.",
  },
];

/** The paths offered for a model: a per-panel wall is fed per panel, nothing else is. */
export function wallFeedPaths(r: WallRequirements, model = wallFeedingKeyFor(r)): WallFeedPath[] {
  const perPanel = model === "per-panel";
  return FEED_PATHS.filter((path) => path.key.endsWith("-per-panel") === perPanel);
}

/**
 * The transport already chosen, read back so an edit from the result opens on
 * the answer in use. Two paths can share a transport (the 1GbE decoder and the
 * 150 series do), so the window count separates them: the receiver is the
 * multi-window answer.
 */
export function wallFeedPathKeyFor(r: WallRequirements): WallFeedPathKey {
  if (r.application === "lcd-direct") {
    return r.network === "1g" || r.network === "10g" ? "avoip-per-panel" : "matrix-per-panel";
  }
  if (r.sourceCustom) return "nhd500";
  if (r.network === "10g") return "nhd600";
  if (r.network === "1g") return r.windows > 1 ? "nhd150" : "avoip-decoder";
  return "scaling-switch";
}

/** The model's own constraint, which holds whatever feeds it. */
export function wallFeedingModelCheck(r: WallRequirements, model = wallFeedingKeyFor(r)): string {
  if (model === "per-panel") {
    return "A panel per feed: the head-end grows with the array, and no window can span two panels — a wall that must show one picture across all of them is the single-input model.";
  }
  if (model === "blended") {
    return "Two or more projectors are one canvas: the content has to be authored at the blended resolution with the overlap planned, exactly as any single source across a non-standard aspect ratio. Commission the source, not only the projectors.";
  }
  if (r.application === "lcd-grouped") {
    return "One feed per looped group: each group tiles its own slice, so a group cannot show an independent source.";
  }
  if (r.application === "led") {
    return "One processor input: the processor resamples the canvas to the cabinet array, so plan text size and 1:1 pixel detail around a wall that scales what it is sent.";
  }
  return "One canvas and the panels tile it: validate the display's loop depth and set panel tile mode at commissioning, because a single feed cannot switch one panel to its own source.";
}

/**
 * What the rep has to close before quoting, in the order the design is
 * affected: the model first, then the box that produces the canvas.
 */
export function wallFeedingChecks(
  r: WallRequirements,
  model = wallFeedingKeyFor(r),
  pathKey: WallFeedPathKey = wallFeedPathKeyFor(r),
): string[] {
  const paths = wallFeedPaths(r, model);
  const path = paths.find((item) => item.key === pathKey) ?? paths[0];
  return [wallFeedingModelCheck(r, model), path.check];
}

/** One line for the answer summary, read from the design rather than remembered. */
export function wallFeedingAnswer(r: WallRequirements): string {
  const panels = r.columns * r.rows;
  switch (wallFeedingKeyFor(r)) {
    case "blended":
      return `${wallProjectorCount(r)} projectors, one blended canvas`;
    case "per-panel":
      return `${panels} feed${panels === 1 ? "" : "s"}, a panel per feed`;
    case "group":
      return "A feed per looped group";
    default:
      if (r.application === "led") return "One processor input, panels tile it";
      if (r.application === "projection") return "One projector, one input";
      return "One canvas, panels tile it";
  }
}
