import { assessVideowallOptions, defaultWallRequirements, wallDisplayFeeds, wallProjectorCount, wallResolutionSummary, type WallOption, type WallRequirements } from "./videowallOptions";

/**
 * The builder already knows which designs are impossible. This module owns the
 * harder product question: of the designs that remain, which one should we put
 * in front of the customer, which one is the honest alternative, and why were
 * the rest dropped? One answer, stated plainly, instead of nine to choose from.
 */

export type WallFamily = "local-switch" | "dedicated-wall" | "avoip-1g" | "avoip-10g" | "hdmi-compose";

export type WallFamilyProfile = {
  family: WallFamily;
  label: string;
  /** One sentence a rep can repeat to a customer. */
  rationale: string;
};

export const wallFamilyProfiles: Record<string, WallFamilyProfile> = {
  "mx-0404-scl": {
    family: "local-switch",
    label: "Local matrix",
    rationale: "One box in the local rack: no AV network, no encoders, no per-screen network programming.",
  },
  "mx-0812-scl": {
    family: "local-switch",
    label: "Local matrix",
    rationale: "One larger box in the local rack: no AV network and no encoders to deploy.",
  },
  "sw-0204-vw": {
    family: "dedicated-wall",
    label: "Dedicated wall processor",
    rationale: "Purpose-built wall processing: one selected picture is split across the panels without a network.",
  },
  "sw-0206-vw": {
    family: "dedicated-wall",
    label: "Dedicated wall processor",
    rationale: "Purpose-built wall processing for a wider array, still without an AV network.",
  },
  nhd500: {
    family: "avoip-1g",
    label: "1GbE AV over IP",
    rationale: "Sources and screens travel on the 1GbE network, so distance stops dictating the design.",
  },
  nhd150: {
    family: "avoip-1g",
    label: "1GbE AV over IP",
    rationale: "A composed canvas delivered over 1GbE, which suits dense windows and long source runs.",
  },
  "nhd500-multiview": {
    family: "avoip-1g",
    label: "1GbE AV over IP + multiview",
    rationale: "The 1GbE network carries the sources; a local composition stage builds the windows.",
  },
  nhd600: {
    family: "avoip-10g",
    label: "10GbE AV over IP",
    rationale: "10GbE SDVoE carries full 4K60 4:4:4 without compression.",
  },
  "hdmi-multiview": {
    family: "hdmi-compose",
    label: "Local HDMI multiviewer",
    rationale: "A single local HDMI box builds the layout and sends one composed picture to the wall.",
  },
};

export type WallRecommendation = {
  option: WallOption;
  family: WallFamilyProfile;
  headline: string;
  /** Why this design meets the captured need, in the customer's terms. */
  reasons: string[];
  /** The cost of this choice: the checks a rep must close before quoting. */
  tradeoffs: string[];
};

export type WallRuledOut = {
  id: string;
  title: string;
  family: WallFamilyProfile;
  /** True when the design meets every requirement but is not the lead. */
  fits: boolean;
  /** The single decisive reason this design is not the recommendation. */
  reason: string;
};

export type WallUnblocker = {
  label: string;
  detail: string;
  unlocks: number;
  /** True when the change keeps the layout the rep asked for. */
  keepsComposition: boolean;
  next: WallRequirements;
};

export type WallDecision = {
  considered: number;
  viableCount: number;
  /** How many distinct architectures survived, not how many SKUs. */
  architectureCount: number;
  confidence: "blocked" | "single" | "clear" | "open";
  recommended: WallRecommendation | null;
  alternative: (WallRecommendation & { when: string }) | null;
  ruledOut: WallRuledOut[];
  /** Changes that would open up more of the catalogue, best first. */
  unblockers: WallUnblocker[];
};

const APPLICATION_LABEL: Record<WallRequirements["application"], string> = {
  "lcd-direct": "LCD panels, each with its own feed",
  "lcd-loop": "LCD panels tiled from one canvas",
  "lcd-grouped": "LCD panels fed one at a time or in looped groups",
  led: "an LED canvas fed by a processor",
  projection: "a single large projector",
};

function panelsFor(r: WallRequirements) {
  return r.columns * r.rows;
}

function feedNames(r: WallRequirements) {
  const feeds = wallDisplayFeeds(r);
  const named = feeds.length <= 4 ? feeds : feeds.slice(0, 3);
  const listed = named.map((feed) => feed.label).join("; ");
  return `${feeds.length} feed${feeds.length === 1 ? "" : "s"}: ${listed}${named.length < feeds.length ? ` and ${feeds.length - named.length} more` : ""}`;
}

function windowsFor(r: WallRequirements) {
  return r.layout === "independent" ? panelsFor(r) : r.windows;
}

/**
 * The order in which the surviving designs are worth putting in front of a
 * customer. Simplicity wins ties: fewer boxes, then no added network, then
 * headroom, then specialisation. Options that do not survive are filtered out
 * before this order is read, so a blocked design never becomes the lead.
 */
export function wallPreferenceOrder(r: WallRequirements): string[] {
  const direct = r.application === "lcd-direct";
  const independent = r.layout === "independent";
  const windows = windowsFor(r);
  const multiview = !independent && windows > 1;
  const local = r.sourceLocation === "local";
  const localCeiling = [`mx-0404-scl`, `mx-0812-scl`];
  const avoip = r.network === "10g" ? ["nhd600", "nhd500", "nhd150"] : ["nhd500", "nhd150", "nhd600"];
  const processors = ["sw-0204-vw", "sw-0206-vw"];

  if (direct && independent) {
    return [...new Set(local ? [...localCeiling, ...avoip] : [...avoip, ...localCeiling])];
  }

  if (direct && multiview) {
    // Composition across separate panel feeds is the hard case: the nearest
    // designs are the dedicated composition stages rather than a plain matrix.
    return [...new Set([...processors, "hdmi-multiview", ...avoip, ...localCeiling])];
  }

  if (direct) {
    return [...new Set(local
      ? [...processors, ...localCeiling, ...avoip]
      : [...avoip, ...processors, ...localCeiling])];
  }

  if (multiview) {
    // Custom layouts split by placement method: a recalled fixed layout is a
    // 600-series canvas, free floating windows are the 150-series canvas.
    const fixedCustom = r.layout === "custom" && r.customMode === "fixed";
    const floatingCustom = r.layout === "custom" && r.customMode === "floating";
    if (fixedCustom) {
      return [...new Set(local
        ? ["nhd600", "nhd500", "hdmi-multiview", "nhd500-multiview", "nhd150", ...localCeiling]
        : ["nhd600", "nhd500", "nhd150", "hdmi-multiview", "nhd500-multiview", ...localCeiling])];
    }
    if (floatingCustom) {
      return [...new Set(local
        ? ["nhd150", "hdmi-multiview", "nhd500-multiview", "nhd600", ...localCeiling]
        : ["nhd150", "nhd500", "nhd600", "hdmi-multiview", "nhd500-multiview", ...localCeiling])];
    }
    const composedLocal = windows <= 4
      ? ["hdmi-multiview", "nhd150", "nhd500-multiview"]
      : ["nhd150", "nhd500-multiview"];
    return [...new Set(local
      ? [...composedLocal, ...avoip, ...localCeiling]
      : [...avoip, ...composedLocal, ...localCeiling])];
  }

  return [...new Set(local
    ? ["hdmi-multiview", ...localCeiling, ...avoip]
    : [...avoip, "hdmi-multiview", ...localCeiling])];
}

function familyOf(id: string): WallFamilyProfile {
  return wallFamilyProfiles[id] ?? { family: "local-switch", label: "Local design", rationale: "A local design for this wall." };
}

export function wallFitReasons(option: WallOption, r: WallRequirements): string[] {
  const family = familyOf(option.id);
  const panels = panelsFor(r);
  const windows = windowsFor(r);
  const projectors = wallProjectorCount(r);
  const displayLine = r.application === "lcd-direct"
    ? `a ${r.columns} × ${r.rows} wall needs ${panels} separate panel feeds`
    : r.application === "lcd-loop"
      ? `a ${r.columns} × ${r.rows} array of ${panels} panels tiles one canvas`
      : r.application === "lcd-grouped"
        ? `a ${r.columns} × ${r.rows} wall of ${panels} panels is driven on ${feedNames(r)}`
        : r.application === "projection" && projectors > 1
          ? `a ${projectors}-projector screen carries one wide canvas, one slice per projector`
          : APPLICATION_LABEL[r.application];
  const resolution = wallResolutionSummary(r);
  const contentLine = r.layout === "independent"
    ? "every panel holds its own source, so no composition stage is needed"
    : r.layout === "custom"
      ? r.customMode === "floating"
        ? `${windows} floating windows moved and resized by drag and drop, drawn from ${r.sources} source${r.sources === 1 ? "" : "s"}`
        : `${windows} windows recalled from a fixed layout at X/Y pixel positions, drawn from ${r.sources} source${r.sources === 1 ? "" : "s"}`
      : windows === 1
        ? `one full-screen picture, with ${r.sources} source${r.sources === 1 ? "" : "s"} to switch between`
        : `${windows} simultaneous windows drawn from ${r.sources} source${r.sources === 1 ? "" : "s"}`;

  return [
    `Display: ${displayLine}.`,
    `Content: ${contentLine}.`,
    `Resolution: canvas ${resolution.canvas.width} × ${resolution.canvas.height}; ${resolution.label}`,
    `Product: ${option.summary}`,
    `Transport: ${family.rationale}`,
  ];
}

const ALTERNATIVE_WHEN: Record<string, string> = {
  "local-switch->avoip-1g": "Choose this if sources or screens sit beyond a local rack, or screens will be added later without new HDMI runs.",
  "local-switch->avoip-10g": "Choose this if the customer already runs 10GbE and wants uncompressed 4K60 4:4:4.",
  "local-switch->dedicated-wall": "Choose this if the wall always shows one selected source and a purpose-built wall processor is preferred over a matrix.",
  "local-switch->hdmi-compose": "Choose this if the wall only needs one composed picture from four or fewer sources.",
  "dedicated-wall->local-switch": "Choose this if the wall must also switch between more sources or feed other displays in the rack.",
  "dedicated-wall->avoip-1g": "Choose this if screens are spread out and the network should carry the picture instead of long HDMI runs.",
  "hdmi-compose->local-switch": "Choose this if you also need independent output routing or scaling beyond the single composed picture.",
  "hdmi-compose->avoip-1g": "Choose this if sources or screens are apart, or the source count will grow past four.",
  "hdmi-compose->avoip-10g": "Choose this if the customer already runs 10GbE and wants uncompressed 4K60 4:4:4.",
  "avoip-1g->local-switch": "Choose this if every source sits in one rack and you would rather avoid an AV network entirely.",
  "avoip-1g->hdmi-compose": "Choose this if all sources are local and you want to remove the network dependency.",
  "avoip-1g->dedicated-wall": "Choose this if the wall always shows one selected source and long cable runs are not a concern.",
  "avoip-1g->avoip-10g": "Choose this if the customer needs uncompressed 4K60 4:4:4 on a 10GbE network.",
  "avoip-10g->avoip-1g": "Choose this if 10GbE is not available and compressed 1GbE transport is acceptable.",
  "avoip-10g->local-switch": "Choose this if every source sits in one rack and you would rather avoid an AV network entirely.",
  "avoip-10g->hdmi-compose": "Choose this if all sources are local and you want to remove the network dependency.",
  "avoip-10g->dedicated-wall": "Choose this if the wall always shows one selected source and long cable runs are not a concern.",
};

function alternativeWhen(lead: WallFamilyProfile, alt: WallFamilyProfile): string {
  return ALTERNATIVE_WHEN[`${lead.family}->${alt.family}`]
    ?? "Choose this if the lead design's box count or capacity does not suit the installation.";
}

function ruleOutReason(option: WallOption): string {
  return option.blockers[0] ?? "Does not fit the captured requirements.";
}

type UnblockCandidate = {
  label: string;
  detail: string;
  /** False when the change gives up the layout the rep asked for. */
  keepsComposition?: boolean;
  apply: (r: WallRequirements) => WallRequirements;
};

const UNBLOCK_CANDIDATES: UnblockCandidate[] = [
  {
    label: "Treat the wall as one composed canvas",
    keepsComposition: false,
    detail: "The displays tile one picture instead of taking a separate feed each.",
    apply: (r) => ({
      ...r,
      application: r.application === "lcd-direct" ? "lcd-loop" : r.application,
      layout: r.layout === "independent" ? "single" : r.layout,
      windows: r.layout === "independent" ? 1 : r.windows,
    }),
  },
  {
    label: "Give each screen its own source",
    keepsComposition: false,
    detail: "Drop the combined layout and route an independent feed to each panel.",
    apply: (r) => ({ ...r, application: "lcd-direct", layout: "independent", windows: 1 }),
  },
  {
    label: "Drive displays individually or in groups",
    keepsComposition: true,
    detail: "Split the wall into feeds, so a display or a looped group can be driven on its own while the rest of the wall stays composed.",
    apply: (r) => ({
      ...r,
      application: "lcd-grouped",
      layout: r.layout === "independent" ? "single" : r.layout,
      windows: r.layout === "independent" ? 1 : r.windows,
    }),
  },
  {
    label: "Show one full-screen picture at a time",
    keepsComposition: false,
    detail: "Compose a single source across the wall and switch between sources.",
    apply: (r) => ({ ...r, layout: "single", windows: 1 }),
  },
  {
    label: "Keep it to four windows",
    keepsComposition: false,
    detail: "Four simultaneous sources are widely supported; more needs a denser design.",
    apply: (r) => r.sources >= 4
      ? { ...r, layout: "quad", windows: 4 }
      : r.sources >= 2
        ? { ...r, layout: "split", windows: 2 }
        : { ...r, layout: "single", windows: 1 },
  },
  {
    label: "Carry sources over the 1GbE network",
    keepsComposition: true,
    detail: "Moves the design into AV-over-IP, which reaches distant sources and screens.",
    apply: (r) => ({ ...r, sourceLocation: "distributed", network: "1g" }),
  },
  {
    label: "Allow a 10GbE network",
    keepsComposition: true,
    detail: "Unlocks uncompressed 4K60 4:4:4 designs.",
    apply: (r) => ({ ...r, network: "10g" }),
  },
  {
    label: "Step the sources down to 1080p",
    keepsComposition: true,
    detail: "Most 1GbE multiview designs top out at 1080p or 4K30 sources; 4K60 needs a 10GbE design.",
    apply: (r) => ({ ...r, sourceResolution: "1080p", sourceCustom: false }),
  },
  {
    label: "Bring the sources into one local rack",
    keepsComposition: true,
    detail: "Local HDMI designs avoid encoders, switches and network programming.",
    apply: (r) => ({ ...r, sourceLocation: "local" }),
  },
];

function viableIds(requirements: WallRequirements): string[] {
  return assessVideowallOptions(requirements)
    .filter((option) => option.blockers.length === 0)
    .map((option) => option.id);
}

/**
 * One decision for the whole wall. The lead is the first surviving design in
 * preference order; the alternative is the best surviving design from a
 * different architecture family, so the rep always sees a real trade-off
 * rather than two flavours of the same product.
 */
export function decideVideowall(requirements: WallRequirements): WallDecision {
  const options = assessVideowallOptions(requirements);
  const viable = options.filter((option) => option.blockers.length === 0);
  const ordered = wallPreferenceOrder(requirements)
    .map((id) => viable.find((option) => option.id === id))
    .filter((option): option is WallOption => Boolean(option));
  const lead = ordered[0] ?? null;
  const leadFamily = lead ? familyOf(lead.id) : null;
  const alternativeOption = leadFamily
    ? ordered.slice(1).find((option) => familyOf(option.id).family !== leadFamily.family) ?? null
    : null;

  const shortlist = [lead, alternativeOption].filter((option): option is WallOption => Boolean(option));
  const architectureCount = new Set(viable.map((option) => familyOf(option.id).family)).size;

  const ruledOut: WallRuledOut[] = options
    .filter((option) => !shortlist.some((kept) => kept.id === option.id))
    .map((option) => ({
      id: option.id,
      title: option.title,
      family: familyOf(option.id),
      fits: option.blockers.length === 0,
      reason: option.blockers.length ? ruleOutReason(option) : "Fits the brief, but the lead reaches the same result with fewer boxes.",
    }));

  // Only offer a different decision when the current answers reach a dead end.
  // A working recommendation should stay a recommendation.
  const unblockers: WallUnblocker[] = architectureCount > 0 ? [] : UNBLOCK_CANDIDATES
    .map((candidate) => ({
      label: candidate.label,
      detail: candidate.detail,
      keepsComposition: candidate.keepsComposition ?? false,
      next: candidate.apply(requirements),
      unlocks: viableIds(candidate.apply(requirements)).length,
    }))
    .filter((entry) => entry.unlocks > 0)
    // Keep the rep's chosen composition first: changing the transport or
    // source format is a smaller concession than abandoning the layout.
    .sort((a, b) => Number(b.keepsComposition) - Number(a.keepsComposition) || b.unlocks - a.unlocks)
    .slice(0, 3);

  return {
    considered: options.length,
    viableCount: viable.length,
    architectureCount,
    confidence: architectureCount === 0 ? "blocked" : architectureCount === 1 ? "single" : architectureCount === 2 ? "clear" : "open",
    recommended: lead
      ? {
          option: lead,
          family: leadFamily!,
          headline: lead.title,
          reasons: wallFitReasons(lead, requirements),
          tradeoffs: lead.checks,
        }
      : null,
    alternative: alternativeOption && leadFamily
      ? {
          option: alternativeOption,
          family: familyOf(alternativeOption.id),
          headline: alternativeOption.title,
          reasons: wallFitReasons(alternativeOption, requirements),
          tradeoffs: alternativeOption.checks,
          when: alternativeWhen(leadFamily, familyOf(alternativeOption.id)),
        }
      : null,
    ruledOut,
    unblockers,
  };
}

/** A plain-language line for the funnel at the top of the result. */
export function wallDecisionSummary(decision: WallDecision): string {
  if (decision.confidence === "blocked") {
    return `No single WyreStorm design meets every answer yet. ${decision.unblockers.length ? `One decision change opens ${decision.unblockers[0].unlocks} designs.` : "Relax one requirement to open the catalogue."}`;
  }
  if (decision.confidence === "single") {
    return `One architecture fits every answer. ${decision.considered} designs considered, ${decision.ruledOut.length} ruled out.`;
  }
  if (decision.confidence === "clear") {
    return `Two architectures fit; the lead wins on simplicity. ${decision.considered} designs considered, ${decision.ruledOut.length} ruled out.`;
  }
  return `${decision.architectureCount} architectures fit. The lead wins on simplicity; the alternative covers the other trade-off.`;
}

/**
 * Common walls, pre-answered. A preset is a whole brief — wall type, array,
 * source count, layout, transport and panel size — so picking the shape of the
 * wall reaches a recommendation without a rep answering the catalogue questions
 * first. They are named for what the wall does rather than the room it is sold
 * into, so the same wall can be quoted for any customer.
 */
export type WallStartPresetFamily = "lcd" | "led" | "projection";

/** How the recommended design carries the picture; the picker narrows on it. */
export type WallPresetTransport = "local" | "1g" | "10g";

export function wallPresetTransportOf(family: WallFamily | undefined): WallPresetTransport | null {
  if (!family) return null;
  if (family === "avoip-10g") return "10g";
  if (family === "avoip-1g") return "1g";
  return "local";
}

export type WallStartPreset = {
  key: string;
  label: string;
  detail: string;
  /** How the wall is built; the picker groups the cards by it. */
  family: WallStartPresetFamily;
  /** Architecture the decision engine reaches for these answers. */
  leadsTo: string;
  /** The same architecture as a transport bucket, so a filter cannot disagree. */
  transport: WallPresetTransport | null;
  requirements: WallRequirements;
};

export const wallStartPresetFamilies: { family: WallStartPresetFamily; label: string }[] = [
  { family: "lcd", label: "LCD walls" },
  { family: "led", label: "LED walls" },
  { family: "projection", label: "Projection" },
];

const wallStartPresetBriefs: Omit<WallStartPreset, "leadsTo" | "transport">[] = [
  {
    key: "single-canvas",
    label: "One picture across a tiled wall",
    detail: "One canvas feeds a 2 × 2 wall; the displays tile the picture.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-loop",
      columns: 2,
      rows: 2,
      sources: 1,
      layout: "single",
      windows: 1,
      displayResolution: "4k",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "single-source-tiled",
    label: "One switched picture on four panels",
    detail: "Two inputs into a wall processor that crops one selected source across the array.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-direct",
      columns: 2,
      rows: 2,
      sources: 2,
      layout: "single",
      windows: 1,
      network: "none",
      displayResolution: "1080p",
      sourceResolution: "1080p",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "single-source-wide",
    label: "One switched picture on six panels",
    detail: "A wider array cropped from one selected source, still without a network.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-direct",
      columns: 3,
      rows: 2,
      sources: 2,
      layout: "single",
      windows: 1,
      network: "none",
      displayResolution: "1080p",
      sourceResolution: "1080p",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "two-up",
    label: "Two sources share the wall",
    detail: "Two feeds sit side by side on a wide two-panel wall.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-loop",
      columns: 2,
      rows: 1,
      sources: 2,
      layout: "split",
      windows: 2,
      displayResolution: "4k",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "quad-canvas",
    label: "Four windows on one canvas",
    detail: "A 2 × 2 wall composed from four sources at once.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-loop",
      columns: 2,
      rows: 2,
      sources: 4,
      layout: "quad",
      windows: 4,
      displayResolution: "4k",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "nine-feeds",
    label: "Nine feeds at once",
    detail: "A 3 × 3 wall composed from nine live sources.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-loop",
      columns: 3,
      rows: 3,
      sources: 9,
      layout: "nine",
      windows: 9,
      displayResolution: "1080p",
      sourceResolution: "1080p",
      panelDiagonalInches: 46,
    },
  },
  {
    key: "per-panel",
    label: "A different picture on every screen",
    detail: "Each panel takes its own source, with no composition stage.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-direct",
      columns: 2,
      rows: 2,
      sources: 4,
      layout: "independent",
      windows: 1,
      displayResolution: "1080p",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "matrix-per-panel",
    label: "Eight inputs, one source per screen",
    detail: "Six screens each take their own source from an eight-input local matrix.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-direct",
      columns: 3,
      rows: 2,
      sources: 8,
      layout: "independent",
      windows: 1,
      network: "none",
      displayResolution: "1080p",
      sourceResolution: "1080p",
      panelDiagonalInches: 46,
    },
  },
  {
    key: "network-per-panel",
    label: "A source on every screen, over the network",
    detail: "Nine screens on 1GbE, each taking its own source from another room.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-direct",
      columns: 3,
      rows: 3,
      sources: 9,
      layout: "independent",
      windows: 1,
      sourceLocation: "distributed",
      network: "1g",
      displayResolution: "1080p",
      sourceResolution: "1080p",
      panelDiagonalInches: 46,
    },
  },
  {
    key: "display-groups",
    label: "Part of the wall runs independently",
    detail: "Three feeds drive three display groups on one 3 × 3 wall.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-grouped",
      columns: 3,
      rows: 3,
      displayFeeds: 3,
      sources: 9,
      layout: "nine",
      windows: 9,
      displayResolution: "1080p",
      panelDiagonalInches: 46,
    },
  },
  {
    key: "network-feeds",
    label: "Feeds across the building network",
    detail: "Six sources on a 4 × 2 wall, carried on 10GbE from another room.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-loop",
      columns: 4,
      rows: 2,
      sources: 6,
      layout: "quad",
      windows: 4,
      sourceLocation: "distributed",
      network: "10g",
      sourceResolution: "4k60",
      displayResolution: "4k",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "four-4k-windows-1g",
    label: "Four 4K60 windows over 1GbE",
    detail: "Remote 4K60 sources composed into four windows without 10GbE.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-loop",
      columns: 2,
      rows: 2,
      sources: 4,
      layout: "quad",
      windows: 4,
      sourceLocation: "distributed",
      network: "1g",
      sourceResolution: "4k60",
      displayResolution: "4k",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "portrait-pair",
    label: "Two portrait panels",
    detail: "A stacked pair turned upright and split between two sources.",
    family: "lcd",
    requirements: {
      ...defaultWallRequirements,
      application: "lcd-loop",
      columns: 1,
      rows: 2,
      sources: 2,
      layout: "split",
      windows: 2,
      orientation: "portrait",
      displayResolution: "4k",
      panelDiagonalInches: 55,
    },
  },
  {
    key: "led-canvas",
    label: "One player on an LED canvas",
    detail: "A single composed canvas for an LED processor, with no windows.",
    family: "led",
    requirements: {
      ...defaultWallRequirements,
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 2160,
      pixelPitchMm: 2.5,
      sources: 1,
      layout: "single",
      windows: 1,
    },
  },
  {
    key: "led-ribbon",
    label: "Wide LED ribbon",
    detail: "A long strip split between two sources.",
    family: "led",
    requirements: {
      ...defaultWallRequirements,
      application: "led",
      ledCanvasWidth: 5120,
      ledCanvasHeight: 1080,
      pixelPitchMm: 1.9,
      sources: 2,
      layout: "split",
      windows: 2,
    },
  },
  {
    key: "led-floating-windows",
    label: "Drag-and-drop windows on an LED canvas",
    detail: "Four live windows the operator moves and resizes on the canvas.",
    family: "led",
    requirements: {
      ...defaultWallRequirements,
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 2160,
      pixelPitchMm: 2.5,
      sources: 4,
      layout: "custom",
      customMode: "floating",
      windows: 4,
      sourceResolution: "4k30",
    },
  },
  {
    key: "led-fixed-windows",
    label: "Sixteen fixed windows on an LED canvas",
    detail: "Sixteen windows recalled at their own X/Y positions, one per source.",
    family: "led",
    requirements: {
      ...defaultWallRequirements,
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 2160,
      pixelPitchMm: 2.5,
      sources: 16,
      layout: "custom",
      customMode: "fixed",
      windows: 16,
    },
  },
  {
    key: "projector-quad",
    label: "Four windows on one screen",
    detail: "One large screen carrying a four-way layout.",
    family: "projection",
    requirements: {
      ...defaultWallRequirements,
      application: "projection",
      sources: 4,
      layout: "quad",
      windows: 4,
      displayResolution: "4k",
      panelDiagonalInches: 86,
    },
  },
  {
    key: "projector-dual",
    label: "Two sources on one screen",
    detail: "A split presentation screen for two inputs.",
    family: "projection",
    requirements: {
      ...defaultWallRequirements,
      application: "projection",
      sources: 2,
      layout: "split",
      windows: 2,
      displayResolution: "1080p",
      panelDiagonalInches: 86,
    },
  },
  {
    key: "projector-pair",
    label: "One wide picture across two projectors",
    detail: "Two projectors side by side carry one 32:9 canvas, a slice each, from a local matrix.",
    family: "projection",
    requirements: {
      ...defaultWallRequirements,
      application: "projection",
      projectors: 2,
      sources: 2,
      layout: "single",
      windows: 1,
      network: "none",
      displayResolution: "4k",
      sourceResolution: "4k60",
      panelDiagonalInches: 86,
    },
  },
];

/** How the wall is built, derived from what is on it rather than stored twice. */
export function wallStartPresetFamily(requirements: WallRequirements): WallStartPresetFamily {
  return requirements.application === "led"
    ? "led"
    : requirements.application === "projection"
      ? "projection"
      : "lcd";
}

/**
 * Build a picker card from a wall's answers. The lead label is read from the
 * engine, so no card — shipped or saved by a rep — can advertise an
 * architecture its own answers no longer reach.
 */
export function wallStartPresetFrom(
  requirements: WallRequirements,
  card: { key: string; label: string; detail: string },
): WallStartPreset {
  const decision = decideVideowall(requirements);
  const family = decision.recommended?.family;
  return {
    ...card,
    family: wallStartPresetFamily(requirements),
    requirements,
    leadsTo: family?.label ?? "Requirement change needed",
    transport: wallPresetTransportOf(family?.family),
  };
}

function withLead(brief: Omit<WallStartPreset, "leadsTo" | "transport">): WallStartPreset {
  return wallStartPresetFrom(brief.requirements, brief);
}

export const wallStartPresets: WallStartPreset[] = wallStartPresetBriefs.map(withLead);

export const wallStartPresetGroups = wallStartPresetFamilies
  .map((group) => ({ ...group, presets: wallStartPresets.filter((preset) => preset.family === group.family) }))
  .filter((group) => group.presets.length > 0);

/**
 * The walls the guided first step shows before a rep asks for the catalogue:
 * one per job a rep actually starts from, with every family represented so no
 * band disappears while the list is folded. They are named here rather than
 * derived, because "the first of each family" is an ordering accident — the
 * order of the brief list, not a statement about which walls are common — and
 * a hand-picked set is the one a rep can be told about in a sentence.
 *
 * The keys are resolved through the shipped presets below, so a key that names
 * no wall (a rename, a retired brief) drops out instead of rendering an empty
 * row, and `wallStartPresetShortlistCoverage` reports it in a test.
 */
export const wallStartPresetShortlistKeys: readonly string[] = [
  "single-canvas",
  "quad-canvas",
  "per-panel",
  "led-canvas",
  "projector-quad",
  "projector-pair",
];

/** The curated walls, in the brief list's order so a family keeps its order. */
export const wallStartPresetShortlist: WallStartPreset[] = wallStartPresets.filter((preset) =>
  wallStartPresetShortlistKeys.includes(preset.key),
);

/**
 * How the shortlist reads against the catalogue, for the test that keeps it
 * honest: every key names a shipped wall, every family is represented, and the
 * list is a shortlist rather than a second catalogue.
 */
export function wallStartPresetShortlistCoverage(): {
  unknownKeys: string[];
  families: Record<WallStartPresetFamily, number>;
  curated: number;
  catalogue: number;
} {
  const shipped = new Set(wallStartPresets.map((preset) => preset.key));
  const families: Record<WallStartPresetFamily, number> = { lcd: 0, led: 0, projection: 0 };
  for (const preset of wallStartPresetShortlist) families[preset.family] += 1;
  return {
    unknownKeys: wallStartPresetShortlistKeys.filter((key) => !shipped.has(key)),
    families,
    curated: wallStartPresetShortlist.length,
    catalogue: wallStartPresets.length,
  };
}

/** The numbers a rep compares on a picker card, before committing to a wall. */
export function wallStartPresetFacts(preset: WallStartPreset): string {
  const r = preset.requirements;
  const projectors = wallProjectorCount(r);
  const wall = r.application === "led"
    ? `${r.ledCanvasWidth} × ${r.ledCanvasHeight} canvas`
    : r.application === "projection"
      ? projectors > 1
        ? `${projectors} × ${r.panelDiagonalInches ?? 55} in projectors`
        : `${r.panelDiagonalInches ?? 55} in screen`
      : `${r.columns} × ${r.rows} (${r.columns * r.rows} panels)`;
  const content = r.layout === "independent"
    ? "One source per panel"
    : `${r.windows} window${r.windows === 1 ? "" : "s"}`;
  return `${wall} · ${content} · ${preset.leadsTo}`;
}

/** The question wording used by the builder, kept next to the logic it drives. */
export const wallDecisionQuestions = {
  application: "What is going on the wall?",
  scale: "How big is the wall?",
  layout: "How should the sources appear?",
  location: "Where do the sources sit?",
} as const;

export type WallLayoutChoice = {
  key: string;
  value: WallRequirements["layout"];
  customMode?: WallRequirements["customMode"];
  label: string;
  detail: string;
  windows: number;
  applications?: WallRequirements["application"][];
};

export const wallLayoutChoices: WallLayoutChoice[] = [
  { key: "single", value: "single", label: "One picture, full wall", detail: "Switch between sources, one at a time.", windows: 1 },
  { key: "split", value: "split", label: "Two sources together", detail: "Two windows side by side.", windows: 2 },
  { key: "quad", value: "quad", label: "Four windows", detail: "A quad layout for presentations and monitoring.", windows: 4 },
  { key: "nine", value: "nine", label: "Nine windows", detail: "A dense canvas for control rooms.", windows: 9 },
  {
    key: "custom-fixed",
    value: "custom",
    customMode: "fixed",
    label: "Custom · fixed layout",
    detail: "A recalled layout: each window is set by X/Y pixel coordinate.",
    windows: 4,
    applications: ["lcd-loop", "led", "projection"],
  },
  {
    key: "custom-floating",
    value: "custom",
    customMode: "floating",
    label: "Custom · floating windows",
    detail: "Drag to move and size windows live; six windows maximum.",
    windows: 4,
    applications: ["lcd-loop", "led", "projection"],
  },
  { key: "independent", value: "independent", label: "A different source per screen", detail: "Each panel behaves as its own display.", windows: 1, applications: ["lcd-direct"] },
];
