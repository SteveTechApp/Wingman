import {
  wallCanvasPlan,
  normalizeWallDesignMetadata,
  wallDisplayFeeds,
  wallDisplayPixels,
  wallPanelCount,
  wallProjectorCount,
  wallSourcePixels,
  type WallRequirements,
} from "./videowallOptions";

/**
 * Transport estimate for a wall design: how much video bandwidth each link has
 * to carry, how far that transport can go, and which links exceed a practical
 * limit. Bandwidth is the uncompressed 24-bit payload (pixels × refresh), which
 * is the number a 1GbE/10GbE link has to compress and an HDMI link has to fit.
 *
 * Cable length is either a run measured on site (`measured`) or a design
 * allowance from the captured answers (`allowance`). A measured run replaces the
 * allowance for that exact link, so the over-limit flag names the run that
 * breaches the limit rather than a blanket estimate.
 */

export type WallTransportStatus = "ok" | "watch" | "limit";
export type WallTransportBasis = "measured" | "allowance";

export type WallTransportLink = {
  id: string;
  group: "source" | "display";
  label: string;
  /** Pixels and refresh the link carries, e.g. "3840 × 2160 @ 60 Hz". */
  resolution: string;
  /** Uncompressed 24-bit payload, one decimal place. */
  bandwidth: string;
  bandwidthGbps: number;
  cable: string;
  /** Estimated or measured run and the transport limit it is compared against. */
  length: string;
  /** Metres checked against the limit; the per-hop run for a loop-through link. */
  runMetres: number;
  /** Design allowance this link would use when no measured run is entered. */
  allowanceMetres: number;
  /** Practical limit for this cable at this timing. */
  limitMetres: number;
  /** "measured" when the run came from the survey, otherwise a design allowance. */
  basis: WallTransportBasis;
  status: WallTransportStatus;
  /** Why this link is watched or over a limit; empty when it fits. */
  note: string;
  /** Link ids this row covers; a folded row lists every member. */
  memberIds: string[];
};

export type WallTransportPlan = {
  /** Read-only rows: a large array is folded into one grouped row. */
  links: WallTransportLink[];
  /** Every link, never folded — what a site survey has to measure. */
  allLinks: WallTransportLink[];
  headline: string;
  counts: Record<WallTransportStatus, number>;
  sourceCount: number;
  displayCount: number;
  /** One sentence per distinct limit, with the affected links grouped. */
  flags: string[];
  assumptions: string[];
  /** How many links use a measured run instead of the design allowance. */
  measuredCount: number;
};

/** Practical limits reused by the cable schedule language in this repo. */
export const TRANSPORT_LIMITS = {
  /** Passive HDMI copper at 4K60 4:4:4. */
  hdmiPassive4k60: 5,
  /** Passive HDMI copper at 1080p60. */
  hdmiPassive1080p: 15,
  /** A single fibre HDMI extender run. */
  fibre: 300,
  /** Cat6A copper drop at 1GbE or 10GbE. */
  copperDrop: 100,
} as const;

/** Usable payload after Ethernet framing, not the headline line rate. */
export const NETWORK_PAYLOAD_GBPS = { "1g": 0.95, "10g": 9.5 } as const;
const FIBRE_PAYLOAD_GBPS = 14.4;
const RACK_RUN_METRES = 2;
const WALL_RUN_METRES = 5;
const LOOP_HOP_METRES = 3;
const MAX_TABLE_ROWS = 12;
const DISPLAY_HZ = 60;
const SOURCE_HZ: Record<WallRequirements["sourceResolution"], number> = {
  "1080p": 60,
  "4k30": 30,
  "4k60": 60,
};

type Pixels = { width: number; height: number };
type Speed = keyof typeof NETWORK_PAYLOAD_GBPS | "fibre";

const severity: Record<WallTransportStatus, number> = { ok: 0, watch: 1, limit: 2 };

const worstStatus = (left: WallTransportStatus, right: WallTransportStatus) => (severity[right] > severity[left] ? right : left);

const distanceStatus = (runMetres: number, limitMetres: number): WallTransportStatus => (
  runMetres > limitMetres ? "limit" : runMetres >= limitMetres ? "watch" : "ok"
);

/**
 * The requirements a transport estimate can be built from, or null when the
 * saved answers predate the layout fields. A design without columns, rows,
 * sources or the source's own location cannot be costed: every link would quote
 * an invented allowance, so callers treat null as "no transport estimate"
 * rather than a plan that happens to read as within limits.
 */
export function wallTransportRequirements(value: unknown): WallRequirements | null {
  if (!value || typeof value !== "object") return null;
  const requirements = value as Record<string, unknown>;
  const counted = [requirements.columns, requirements.rows, requirements.sources]
    .every((count) => Number.isFinite(Number(count)) && Number(count) > 0);
  return counted
    && typeof requirements.sourceLocation === "string"
    && typeof requirements.sourceResolution === "string"
    ? normalizeWallDesignMetadata(value as WallRequirements)
    : null;
}

/** A positive measured run from the saved answers, or null when none was entered. */
export function measuredRun(value: unknown) {
  const metres = Number(value);
  return Number.isFinite(metres) && metres > 0 ? metres : null;
}

/**
 * Merge one measured run into the saved map. A null or non-positive value
 * removes the measurement, so the link falls back to its design allowance.
 */
export function withMeasuredRun(
  measuredRuns: Record<string, number> | undefined,
  id: string,
  metres: number | null,
) {
  const next = { ...(measuredRuns ?? {}) };
  if (metres != null && Number.isFinite(metres) && metres > 0) next[id] = metres;
  else delete next[id];
  return next;
}

/** Apply one measured run to every link a row covers (a folded row has several). */
export function withMeasuredRuns(
  measuredRuns: Record<string, number> | undefined,
  ids: string[],
  metres: number | null,
) {
  return ids.reduce((next, id) => withMeasuredRun(next, id, metres), measuredRuns);
}

/**
 * The warning a run written by hand earns when it sits far from the design
 * allowance printed beside it.
 *
 * A sheet is filled in the room, so a run a metre past the allowance is ordinary
 * site variance and a run at least twice it is a decimal point or a row typed
 * into the wrong box. One rule serves both entry points — the paper sheet import
 * and the photo review's typed rows — so neither can call a run far that the
 * other accepts.
 */
export function runAllowanceWarning(metres: unknown, allowanceMetres: unknown): string | null {
  const run = Number(metres);
  const allowance = Number(allowanceMetres);
  if (!Number.isFinite(run) || !Number.isFinite(allowance) || run <= 0 || allowance <= 0) return null;
  return run >= allowance * 2
    ? `${run} m against ≈${allowance} m — at least twice the printed allowance`
    : null;
}

/* The survey cells themselves live in ./wallLinkDetail so a command can read
   and merge them without the transport model; re-exported here because the
   transport tables and their print/export callers have always read them from
   this module. */
export {
  DETAIL_TEXT_LIMIT,
  WALL_LINK_DETAIL_FIELDS,
  cleanDetailText,
  hasWallLinkDetail,
  normalizeLinkDetails,
  normalizeWallLinkDetail,
  wallLinkDetailText,
  withWallLinkDetail,
  withWallLinkDetails,
} from "./wallLinkDetail";
export type { WallLinkDetail, WallLinkDetailField } from "./wallLinkDetail";

/** Uncompressed 24-bit payload in Gbps, rounded to one decimal. */
export function wallLinkBandwidthGbps(pixels: Pixels, refreshHz: number) {
  const gbps = (pixels.width * pixels.height * refreshHz * 24) / 1e9;
  return Math.round(gbps * 10) / 10;
}

const rateText = (gbps: number) => `${gbps.toFixed(1)} Gbps`;
const resolutionText = (pixels: Pixels, refreshHz: number) => `${pixels.width} × ${pixels.height} @ ${refreshHz} Hz`;
const runText = (metres: number, basis: WallTransportBasis) => (basis === "measured" ? `${metres} m measured` : `≈${metres} m`);

function formatRatio(ratio: number) {
  return `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}:1`;
}

/** The transport the captured answers imply for a link of this payload. */
function speedFor(r: WallRequirements, bandwidthGbps: number): Speed {
  if (r.network === "none") return "fibre";
  if (r.network === "10g") return "10g";
  if (r.network === "1g") return "1g";
  // "Compare all options": carry 1080p-class on 1GbE and anything larger on 10GbE.
  return bandwidthGbps > 4.5 ? "10g" : "1g";
}

function hdmiDistanceNote(runMetres: number, limitMetres: number, status: WallTransportStatus, basis: WallTransportBasis) {
  if (status === "ok") return "";
  // A measured link names its run; an allowance reads as "this run" so the
  // sentence does not repeat the same allowance twice.
  const run = basis === "measured"
    ? `The measured ${runMetres} m run`
    : status === "watch" ? "This run" : `The ${runMetres} m run`;
  return status === "limit"
    ? `${run} exceeds the ${limitMetres} m passive HDMI limit at this timing; use an active cable, fibre or an extender.`
    : `${run} sits at the ${limitMetres} m passive HDMI limit at this timing; specify an active or fibre cable for headroom.`;
}

function copperDistanceNote(runMetres: number, limitMetres: number, status: WallTransportStatus) {
  return status === "limit"
    ? `The measured ${runMetres} m drop exceeds the ${limitMetres} m copper limit; add a fibre segment or an intermediate switch.`
    : `The measured ${runMetres} m drop sits at the ${limitMetres} m copper limit; confirm the cable grade and termination.`;
}

function fibreDistanceNote(runMetres: number, limitMetres: number, status: WallTransportStatus) {
  return status === "limit"
    ? `The measured ${runMetres} m run exceeds the ${limitMetres} m fibre extender limit; add a second hop.`
    : `The measured ${runMetres} m run sits at the ${limitMetres} m fibre extender limit; confirm the extender and fibre grade.`;
}

function hdmiLink(args: {
  id: string;
  group: WallTransportLink["group"];
  label: string;
  pixels: Pixels;
  refreshHz: number;
  /** Design allowance for this run; ignored when a measured run is supplied. */
  runMetres: number;
  measured?: number | null;
  chainMetres?: number;
  cable?: string;
}): WallTransportLink {
  const bandwidthGbps = wallLinkBandwidthGbps(args.pixels, args.refreshHz);
  const limitMetres = bandwidthGbps > 8 ? TRANSPORT_LIMITS.hdmiPassive4k60 : TRANSPORT_LIMITS.hdmiPassive1080p;
  const basis: WallTransportBasis = args.measured != null ? "measured" : "allowance";
  const runMetres = args.measured ?? args.runMetres;
  const status = distanceStatus(runMetres, limitMetres);
  return {
    id: args.id,
    group: args.group,
    label: args.label,
    resolution: resolutionText(args.pixels, args.refreshHz),
    bandwidth: rateText(bandwidthGbps),
    bandwidthGbps,
    cable: args.cable ?? "HDMI 2.0 copper (passive)",
    length: args.chainMetres
      ? `${runText(runMetres, basis)} per hop · ≈${args.chainMetres} m chain · ${limitMetres} m limit per hop`
      : `${runText(runMetres, basis)} · ${limitMetres} m passive limit`,
    runMetres,
    allowanceMetres: args.runMetres,
    limitMetres,
    basis,
    status,
    note: hdmiDistanceNote(runMetres, limitMetres, status, basis),
    memberIds: [args.id],
  };
}

function networkLink(args: {
  id: string;
  group: WallTransportLink["group"];
  label: string;
  pixels: Pixels;
  refreshHz: number;
  speed: keyof typeof NETWORK_PAYLOAD_GBPS;
  role: "encoder" | "decoder";
  tailMetres?: number;
  measured?: number | null;
}): WallTransportLink {
  const bandwidthGbps = wallLinkBandwidthGbps(args.pixels, args.refreshHz);
  const capacity = NETWORK_PAYLOAD_GBPS[args.speed];
  const ratio = bandwidthGbps / capacity;
  const speedLabel = args.speed === "1g" ? "1GbE" : "10GbE";
  const bandwidthStatus: WallTransportStatus = ratio > 9 ? "limit" : ratio > 1 ? "watch" : "ok";
  const basis: WallTransportBasis = args.measured != null ? "measured" : "allowance";
  const limitMetres = TRANSPORT_LIMITS.copperDrop;
  // An unmeasured copper drop is a ≤100 m specification, not a run to check.
  const runMetres = args.measured ?? limitMetres;
  const distance = basis === "measured" ? distanceStatus(runMetres, limitMetres) : "ok";
  const status = worstStatus(bandwidthStatus, distance);
  const bandwidthNote = bandwidthStatus === "limit"
    ? `${speedLabel} cannot carry ${rateText(bandwidthGbps)} without heavy compression; move this link to 10GbE or step the source down.`
    : bandwidthStatus === "watch"
      ? `${speedLabel} carries ${rateText(bandwidthGbps)} at about ${formatRatio(ratio)} compression; confirm the codec, latency and image quality.`
      : "";
  const tail = args.tailMetres ? " + 2 m HDMI" : "";
  return {
    id: args.id,
    group: args.group,
    label: args.label,
    resolution: resolutionText(args.pixels, args.refreshHz),
    bandwidth: rateText(bandwidthGbps),
    bandwidthGbps,
    cable: `${args.speed === "1g" ? "Cat6A · 1GbE" : "Cat6A or fibre · 10GbE"} → ${args.role}${tail}`,
    length: `${basis === "measured" ? `${runMetres} m measured drop · ${limitMetres} m copper limit` : `≤${limitMetres} m drop`}${tail}`,
    runMetres,
    allowanceMetres: limitMetres,
    limitMetres,
    basis,
    status,
    note: distance === "ok" ? bandwidthNote : copperDistanceNote(runMetres, limitMetres, distance),
    memberIds: [args.id],
  };
}

function fibreLink(args: {
  id: string;
  group: WallTransportLink["group"];
  label: string;
  pixels: Pixels;
  refreshHz: number;
  tailMetres?: number;
  measured?: number | null;
}): WallTransportLink {
  const bandwidthGbps = wallLinkBandwidthGbps(args.pixels, args.refreshHz);
  const ratio = bandwidthGbps / FIBRE_PAYLOAD_GBPS;
  const bandwidthStatus: WallTransportStatus = ratio > 1 ? "watch" : "ok";
  const basis: WallTransportBasis = args.measured != null ? "measured" : "allowance";
  const limitMetres = TRANSPORT_LIMITS.fibre;
  const runMetres = args.measured ?? limitMetres;
  const distance = basis === "measured" ? distanceStatus(runMetres, limitMetres) : "ok";
  const status = worstStatus(bandwidthStatus, distance);
  const bandwidthNote = bandwidthStatus === "watch"
    ? `The fibre extender carries ${rateText(bandwidthGbps)} with ${formatRatio(ratio)} compression; confirm the extender's HDMI 2.0 support.`
    : "";
  const tail = args.tailMetres ? " + 2 m HDMI" : "";
  return {
    id: args.id,
    group: args.group,
    label: args.label,
    resolution: resolutionText(args.pixels, args.refreshHz),
    bandwidth: rateText(bandwidthGbps),
    bandwidthGbps,
    cable: `HDMI-to-fibre extender${tail}`,
    length: `${basis === "measured" ? `${runMetres} m measured · ${limitMetres} m fibre limit` : `≤${limitMetres} m`}${tail}`,
    runMetres,
    allowanceMetres: limitMetres,
    limitMetres,
    basis,
    status,
    note: distance === "ok" ? bandwidthNote : fibreDistanceNote(runMetres, limitMetres, distance),
    memberIds: [args.id],
  };
}

/** "Panel 1, Panel 2, Panel 3" becomes "Panels 1–3"; other labels stay listed. */
function labelRange(labels: string[]) {
  if (labels.length === 1) return labels[0];
  const numbers = labels.map((label) => Number(label.match(/(\d+)$/)?.[1] ?? Number.NaN));
  if (numbers.every(Number.isFinite)) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const contiguous = sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
    if (contiguous) return `${labels[0].replace(/\s*\d+$/, "")}s ${sorted[0]}–${sorted[sorted.length - 1]}`;
  }
  return labels.join(", ");
}

/**
 * Merge identical limit notes so four panels produce one flag, not four.
 * A measured link is always named on its own: the flag has to identify the
 * exact run that breaches a limit, not a range of allowances.
 */
function groupedFlags(links: WallTransportLink[]) {
  const groups: { key: string; note: string; labels: string[] }[] = [];
  for (const link of links) {
    if (link.status === "ok" || !link.note) continue;
    const key = link.basis === "measured" ? `measured:${link.id}` : `${link.group}:${link.note}`;
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.labels.push(link.label);
    else groups.push({ key, note: link.note, labels: [link.label] });
  }
  return groups.map((group) => `${labelRange(group.labels)} — ${group.note}`);
}

/** Keep a large array readable: eleven rows, then one grouped row. */
function foldLinks(links: WallTransportLink[]) {
  if (links.length <= MAX_TABLE_ROWS) return links;
  const head = links.slice(0, MAX_TABLE_ROWS - 1);
  const tail = links.slice(MAX_TABLE_ROWS - 1);
  const first = tail[0];
  // The grouped row reports the worst link in the tail, so a single measured
  // over-limit run is not hidden by the rows folded with it.
  const worst = tail.reduce((best, link) => (severity[link.status] > severity[best.status] ? link : best), tail[0]);
  const prefix = first.label.replace(/\s*\d+$/, "");
  return [...head, {
    ...worst,
    id: `${first.id}-grouped`,
    label: `${prefix} ${Number(first.label.match(/(\d+)$/)?.[1] ?? MAX_TABLE_ROWS)}–${links.length}`,
    memberIds: tail.flatMap((link) => link.memberIds),
  }];
}

/**
 * Per-link transport estimate for the wall: every source entering the head end
 * and every display leaving it, with the bandwidth, cable run, transport limit
 * and status for that link. A measured run in `measuredRuns` replaces the
 * design allowance for that link id.
 */
export function wallTransportPlan(r: WallRequirements): WallTransportPlan {
  const distributed = r.sourceLocation === "distributed";
  const sourcePixels = wallSourcePixels(r);
  const sourceRefresh = SOURCE_HZ[r.sourceResolution] ?? 60;
  const displayPixels = wallDisplayPixels(r);
  const canvasPixels = wallCanvasPlan(r).canvas;
  const sourceCount = Math.max(1, r.sources);
  // Every panel of a direct, looped or grouped wall gets its own link: a grouped
  // panel is either a feed's head end or a loop hop inside one.
  const displayCount = r.application === "projection"
    ? wallProjectorCount(r)
    : r.application === "lcd-direct" || r.application === "lcd-loop" || r.application === "lcd-grouped"
      ? wallPanelCount(r)
      : 1;
  const measuredFor = (id: string) => measuredRun(r.measuredRuns?.[id]);

  /** A decoder or matrix output at the wall: short HDMI locally, a drop when distributed. */
  function headEnd(base: { id: string; label: string }, pixels: Pixels, refreshHz: number) {
    const measured = measuredFor(base.id);
    if (!distributed) return hdmiLink({ ...base, group: "display", pixels, refreshHz, runMetres: WALL_RUN_METRES, measured });
    const bandwidthGbps = wallLinkBandwidthGbps(pixels, refreshHz);
    const speed = speedFor(r, bandwidthGbps);
    const full = { ...base, group: "display" as const, pixels, refreshHz, measured };
    return speed === "fibre"
      ? fibreLink({ ...full, tailMetres: RACK_RUN_METRES })
      : networkLink({ ...full, speed, role: "decoder", tailMetres: RACK_RUN_METRES });
  }

  const sourceLinks = Array.from({ length: sourceCount }, (_, index) => {
    const base = { id: `source-${index + 1}`, label: `Source ${index + 1}` };
    const measured = measuredFor(base.id);
    if (!distributed) return hdmiLink({ ...base, group: "source", pixels: sourcePixels, refreshHz: sourceRefresh, runMetres: RACK_RUN_METRES, measured });
    const speed = speedFor(r, wallLinkBandwidthGbps(sourcePixels, sourceRefresh));
    return speed === "fibre"
      ? fibreLink({ ...base, group: "source", pixels: sourcePixels, refreshHz: sourceRefresh, measured })
      : networkLink({ ...base, group: "source", pixels: sourcePixels, refreshHz: sourceRefresh, speed, role: "encoder", measured });
  });

  const displayLinks: WallTransportLink[] = [];
  if (r.application === "lcd-direct") {
    for (let index = 0; index < displayCount; index += 1) {
      displayLinks.push(headEnd({ id: `display-${index + 1}`, label: `Panel ${index + 1}` }, displayPixels, DISPLAY_HZ));
    }
  } else if (r.application === "lcd-grouped") {
    // One head end per feed, then the rest of that feed's panels looped off it.
    // A feed carries its own slice of the canvas, so the whole group is wired
    // like a small loop rather than a composed surface.
    for (const feed of wallDisplayFeeds(r)) {
      displayLinks.push(headEnd({ id: `feed-${feed.index}`, label: feed.label }, canvasPixels, DISPLAY_HZ));
      feed.panels.slice(1).forEach((panel, position) => {
        const id = `display-${panel}`;
        const measured = measuredFor(id);
        const hop = measured ?? LOOP_HOP_METRES;
        const chainMetres = (distributed ? RACK_RUN_METRES : WALL_RUN_METRES) + hop * position;
        displayLinks.push(hdmiLink({
          id,
          group: "display",
          label: `Panel ${panel}`,
          pixels: canvasPixels,
          refreshHz: DISPLAY_HZ,
          runMetres: LOOP_HOP_METRES,
          measured,
          chainMetres,
          cable: "HDMI loop-through (panel to panel)",
        }));
      });
    }
  } else if (r.application === "lcd-loop") {
    displayLinks.push(headEnd({ id: "display-1", label: "Panel 1" }, canvasPixels, DISPLAY_HZ));
    for (let index = 2; index <= displayCount; index += 1) {
      const id = `display-${index}`;
      const measured = measuredFor(id);
      // A measured hop also moves the chain allowance that follows it.
      const hop = measured ?? LOOP_HOP_METRES;
      const chainMetres = (distributed ? RACK_RUN_METRES : WALL_RUN_METRES) + hop * (index - 1);
      displayLinks.push(hdmiLink({
        id,
        group: "display",
        label: `Panel ${index}`,
        pixels: canvasPixels,
        refreshHz: DISPLAY_HZ,
        runMetres: LOOP_HOP_METRES,
        measured,
        chainMetres,
        cable: "HDMI loop-through (panel to panel)",
      }));
    }
  } else if (r.application === "projection") {
    for (let index = 0; index < displayCount; index += 1) {
      displayLinks.push(headEnd({ id: `display-${index + 1}`, label: `Projector ${index + 1}` }, displayPixels, DISPLAY_HZ));
    }
  } else {
    displayLinks.push(headEnd({ id: "display-1", label: "LED processor" }, displayPixels, DISPLAY_HZ));
  }

  for (const link of [...sourceLinks, ...displayLinks]) {
    const override = r.linkTransports?.[link.id];
    if (override?.cable !== "fibre") continue;
    const segments = Number.isFinite(override.segments) ? Math.max(1, Math.min(1000, Math.round(override.segments!))) : 1;
    const networkLink = /Cat6|Ethernet|GbE/i.test(link.cable);
    link.cable = `${networkLink ? "10GbE fibre network link (matched 10GbE encoder/decoder and optical interfaces)" : "Fibre HDMI extender"}${segments > 1 ? ` · ${segments} regenerated segments` : ""}`;
    link.limitMetres = TRANSPORT_LIMITS.fibre * segments;
    link.length = `${runText(link.runMetres, link.basis)} · ${link.limitMetres} m total fibre limit${segments > 1 ? ` across ${segments} segments` : ""}`;
    const ratio = link.bandwidthGbps / (networkLink ? NETWORK_PAYLOAD_GBPS["10g"] : FIBRE_PAYLOAD_GBPS);
    const bandwidthStatus: WallTransportStatus = networkLink && ratio > 9 ? "limit" : ratio > 1 ? "watch" : "ok";
    link.status = worstStatus(distanceStatus(link.runMetres, link.limitMetres), bandwidthStatus);
    const equipment = networkLink ? "Provide compatible 10GbE encoders, decoders and optical interfaces at both ends." : "Provide fibre HDMI transmitter and receiver; confirm timing support.";
    const compression = ratio > 1 ? ` Confirm ${formatRatio(ratio)} compression, latency and image quality${bandwidthStatus === "limit" ? "; reduce the timing or select greater bandwidth" : ""}.` : "";
    link.note = `${segments > 1 ? `Provide ${segments - 1} powered regeneration points; each segment must be at most ${TRANSPORT_LIMITS.fibre} m. ` : ""}${equipment}${compression}`;
  }
  const allLinks = [...sourceLinks, ...displayLinks];
  const counts = allLinks.reduce<Record<WallTransportStatus, number>>(
    (totals, link) => ({ ...totals, [link.status]: totals[link.status] + 1 }),
    { ok: 0, watch: 0, limit: 0 },
  );
  const links = [...foldLinks(sourceLinks), ...foldLinks(displayLinks)];
  const linkSummary = `${sourceCount} source link${sourceCount === 1 ? "" : "s"} and ${displayCount} display link${displayCount === 1 ? "" : "s"}`;
  const measuredCount = allLinks.filter((link) => link.basis === "measured").length;
  const cableAssumption = measuredCount === 0
    ? "Cable lengths are design allowances from these answers, not measured runs; confirm them on site."
    : measuredCount === allLinks.length
      ? "Every link uses the cable run measured on site."
      : `${measuredCount} of ${allLinks.length} links use a cable run measured on site; the rest are design allowances to confirm.`;

  return {
    links,
    allLinks,
    headline: counts.limit
      ? `${linkSummary}. ${counts.limit} exceed${counts.limit === 1 ? "s" : ""} a transport limit.`
      : counts.watch
        ? `${linkSummary}. ${counts.watch} need${counts.watch === 1 ? "s" : ""} a closer look.`
        : `${linkSummary}. Every link fits its transport.`,
    counts,
    sourceCount,
    displayCount,
    flags: groupedFlags(allLinks),
    assumptions: [
      "Bandwidth is the uncompressed 24-bit payload; network links are compared with usable 1GbE (0.95 Gbps) and 10GbE (9.5 Gbps) capacity.",
      cableAssumption,
      "Passive HDMI copper is treated as reliable to 5 m at 4K60 and 15 m at 1080p.",
    ],
    measuredCount,
  };
}

/**
 * What the one-tap cable change is called for this link.
 *
 * The design can only cost the fixes it models, and every one of them is fibre:
 * an HDMI-to-fibre extender over a passive run, a 10GbE optical link where the
 * cable was already Ethernet, and extra regenerated segments past one fibre
 * span. The builder's table and the proposal's gate name the action with this
 * one function, so the button a rep presses says what the design will become.
 */
export function wallTransportFixLabel(link: Pick<WallTransportLink, "runMetres" | "cable">): string {
  if (link.runMetres > TRANSPORT_LIMITS.fibre) return "Split into regenerated fibre segments";
  return /Cat6|Ethernet|GbE/i.test(link.cable) ? "Use 10GbE fibre link" : "Use fibre extender";
}

/** Persist a cable change without altering the surveyed end-to-end distance. */
export function applyWallTransportFix(requirements: WallRequirements, linkId: string): WallRequirements {
  const link = wallTransportPlan(requirements).allLinks.find((item) => item.id === linkId);
  if (!link || link.status !== "limit") return requirements;
  return { ...requirements, linkTransports: { ...requirements.linkTransports, [linkId]: { cable: "fibre", segments: Math.max(1, Math.ceil(link.runMetres / TRANSPORT_LIMITS.fibre)) } } };
}
