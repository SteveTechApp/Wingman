import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { formatMillimetres, wallPhysicalSize } from "./wallPhysicalSize";
import { wallDisplayFeeds, wallPanelRangeText, wallRequirementsFromSummary } from "./videowallOptions";
import {
  cleanDetailText,
  hasWallLinkDetail,
  normalizeWallLinkDetail,
  wallTransportPlan,
  wallTransportRequirements,
  type WallLinkDetail,
  type WallTransportPlan,
  type WallTransportStatus,
} from "./videowallTransport";

/**
 * One line of the proposal's display schedule: the screen, the pixels it
 * shows, how many feeds reach it and how the content is scaled onto it.
 * Rows come from the saved video wall design when there is one, otherwise
 * from the recorded display scope and equipment schedule.
 *
 * A saved wall also owns the transport estimate, so each row carries the cable
 * and run allowance for the link that feeds that screen, plus its limit status.
 * Catalogue rows have no link estimate and leave the transport fields empty.
 *
 * A saved wall is also the only thing that knows its physical size, so rows and
 * the schedule quote millimetres from the same `wallPhysicalSize` the elevation
 * caption uses: the schedule and the dimensioned drawing then cannot disagree.
 * The same size data supplies the panel mass and the clearance the mounting
 * surface must keep free, so weight and opening cannot drift from the drawing.
 */
export type DisplayScheduleRow = {
  screen: string;
  /** This screen's own footprint in millimetres; empty without a wall design. */
  size: string;
  /**
   * Planning mass of this screen: one panel for an LCD wall, the whole canvas
   * for an LED wall. Empty where mass is not derived from size.
   */
  weight: string;
  resolution: string;
  feeds: string;
  scaling: string;
  notes: string;
  /** Cable, run allowance and transport limit for this link; empty without a wall design. */
  transport: string;
  transportStatus?: WallTransportStatus;
};

export type DisplayScheduleInstallRow = {
  /** Transport link id the value was recorded against. */
  id: string;
  link: string;
  group: "source" | "display";
  /** The display housing, as the survey cell of that name recorded it. */
  enclosure: string;
  mount: string;
  termination: string;
  /** Where the run enters, its own cell rather than part of the housing. */
  entry: string;
};

/**
 * What each link lands in, as written on the site survey sheet. The proposal
 * prints one row per link that carries a value and says how many were left to
 * confirm, because an unrecorded install cell is an open installation decision,
 * not a line to drop.
 */
export type DisplayScheduleInstall = {
  rows: DisplayScheduleInstallRow[];
  /** Links carrying at least one recorded value. */
  recorded: number;
  /** Physical links in the wall design. */
  linkCount: number;
  text: string;
};

export type DisplaySchedule = {
  rows: DisplayScheduleRow[];
  headline: string;
  basis: string;
  source: "video-wall" | "scope" | "equipment";
  /** Wall and panel size in millimetres; empty without a wall design. */
  size: string;
  /** Mass and mounting clearance derived from the same size; empty without a wall design. */
  mounting: string;
  /** Grouped transport limits that affect the wall links; empty without a wall design. */
  transportFlags: string[];
  /** Survey installation detail per link; null when nothing was recorded. */
  install: DisplayScheduleInstall | null;
};

const STATUS_LABEL: Record<WallTransportStatus, string> = {
  ok: "",
  watch: "Watch",
  limit: "Over limit",
};

type Pixels = { width: number; height: number };

const MAX_INDIVIDUAL_ROWS = 12;

const DISPLAY_TERMS = /\b(displays?|monitors?|screens?|projectors?|projection|televisions?|tvs?|panels?|led|signage|videowalls?|video walls?|lfd)\b/i;
const NON_DISPLAY_TERMS = /\b(encoder|decoder|transmitter|receiver|matrix|switcher|processor|controller|scaler|converter|cable|mount|bracket)\b/i;

function positive(value: unknown, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function pixelsFrom(value: unknown): Pixels | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const width = Number(record.width);
  const height = Number(record.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width: Math.round(width), height: Math.round(height) };
}

const pixelText = (pixels: Pixels) => `${pixels.width} × ${pixels.height}`;


function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDisplayItem(value: string) {
  return DISPLAY_TERMS.test(value) && !NON_DISPLAY_TERMS.test(value);
}

/** The scaling a rep agrees for the recommended canvas. */
export function displayScalingLabel(recommended: unknown) {
  switch (recommended) {
    case "per-panel":
      return "Native 1:1 per panel";
    case "match":
      return "Native 1:1";
    case "fit":
      return "Fit, bars added";
    case "fill":
      return "Fill, edges cropped";
    default:
      return "Scaling to confirm";
  }
}

/**
 * The install line per link — display housing, mount, termination and run entry —
 * keyed by the same transport link ids the survey sheet printed. A link with
 * any of them is listed; blanks print as an em dash so "not recorded" is
 * visible rather than implied.
 */
function wallInstallScope(
  plan: WallTransportPlan,
  linkDetails: Record<string, WallLinkDetail> | undefined,
  displayMounts: Record<string, string> | undefined,
): DisplayScheduleInstall | null {
  const rows = plan.allLinks.flatMap((link) => {
    const detail = normalizeWallLinkDetail(linkDetails?.[link.id]);
    return [{
      id: link.id,
      link: link.label,
      group: link.group,
      enclosure: cleanDetailText(detail.enclosure) || "Not recorded",
      mount: link.group === "display"
        ? cleanDetailText(displayMounts?.[link.id] ?? detail.mount) || "—"
        : "—",
      termination: cleanDetailText(detail.termination) || "Not recorded",
      entry: cleanDetailText(detail.entry) || "Not recorded",
    }];
  });
  if (!rows.length) return null;
  const linkCount = plan.allLinks.length;
  const recorded = plan.allLinks.filter((link) => hasWallLinkDetail(normalizeWallLinkDetail(linkDetails?.[link.id]))).length;
  const missing = rows.filter((row) =>
    row.enclosure === "Not recorded" || row.entry === "Not recorded" || row.termination === "Not recorded",
  );
  return {
    rows,
    recorded,
    linkCount,
    text: `Site survey detail is recorded for ${recorded} of ${linkCount} links.${missing.length ? ` Missing display housing, run entry or termination: ${missing.map((row) => row.link).join("; ")}. These details remain to be confirmed before installation.` : " Display housing, run entry and termination are recorded for every link."}`,
  };
}

/**
 * Repeat one row per screen, then fold the tail into a single summary row so a
 * large array does not produce a proposal page of identical lines.
 */
function repeatRows<T>(count: number, individual: (index: number) => T, grouped: (from: number, to: number) => T): T[] {
  if (count <= MAX_INDIVIDUAL_ROWS) return Array.from({ length: count }, (_, index) => individual(index));
  const individualRows = Array.from({ length: MAX_INDIVIDUAL_ROWS - 1 }, (_, index) => individual(index));
  return [...individualRows, grouped(MAX_INDIVIDUAL_ROWS, count)];
}

function wallSchedule(summary: Record<string, unknown> | null): DisplaySchedule | null {
  if (!summary) return null;
  const requirements = (summary.requirements ?? {}) as Record<string, unknown>;
  const application = text(requirements.application);
  if (!application) return null;

  const resolution = (summary.resolution ?? {}) as Record<string, unknown>;
  const plan = (summary.canvasPlan ?? {}) as Record<string, unknown>;
  const display = pixelsFrom(resolution.display);
  // The canvas plan holds the programmed canvas after any scale-down; the
  // resolution summary still reports the native array.
  const canvas = pixelsFrom(plan.canvas) ?? pixelsFrom(resolution.canvas) ?? display;
  if (!display || !canvas) return null;

  const columns = positive(requirements.columns);
  const rows = positive(requirements.rows);
  const windows = positive(requirements.windows);
  const panels = columns * rows;
  const independent = application === "lcd-direct" && requirements.layout === "independent";
  const recommended = text(plan.recommended);
  const scaling = displayScalingLabel(recommended);
  const canvasText = pixelText(canvas);
  const displayText = pixelText(display);
  // A scaled tile receives fewer pixels than the panel's native resolution,
  // so the schedule prints what each screen is actually fed.
  const received = pixelsFrom(plan.perPanel) ?? display;
  const receivedText = pixelText(received);
  const sourcePixels = pixelsFrom(resolution.source);
  const sourceText = sourcePixels ? pixelText(sourcePixels) : "";
  // The canvas plan text names the programmed canvas and the agreed fit or
  // crop, so it is the basis a technical reviewer checks.
  const mapping = text(plan.text) || text(plan.rationale) || text(resolution.mapping);
  const windowText = `${windows} window${windows === 1 ? "" : "s"}`;

  // The wall's transport estimate owns the cable basis and practical limits for
  // each display link, in the same order as the rows below (both fold at twelve).
  // The same completeness check the export gate uses: a summary saved before
  // the layout answers existed keeps a schedule without the transport column
  // instead of printing an invented allowance, and it cannot be blocked for one.
  const wallRequirements = wallTransportRequirements(requirements);
  const transport = wallRequirements ? wallTransportPlan(wallRequirements) : null;
  // What the survey recorded each link lands in, printed with the schedule so
  // installation scope is quoted from evidence rather than assumed.
  const install = transport && wallRequirements
    ? wallInstallScope(transport, wallRequirements.linkDetails, wallRequirements.displayMounts)
    : null;
  // Each row is one screen of the wall, so its own footprint is the panel size;
  // an LED wall has no panels, so the row quotes the canvas it builds. Weight
  // follows the same choice: a panel mass for an LCD wall, the canvas mass for
  // an LED wall, and nothing where the screen's own mass is not size-derived.
  const physical = wallRequirements ? wallPhysicalSize(wallRequirements) : null;
  const screenSize = physical
    ? physical.panel
      ? `${formatMillimetres(physical.panel.width)} × ${formatMillimetres(physical.panel.height)}`
      : `${formatMillimetres(physical.wall.width)} × ${formatMillimetres(physical.wall.height)}`
    : "";
  const screenWeight = physical?.mounting.panelWeightKg != null
    ? `${physical.mounting.panelWeightKg} kg`
    : physical?.mounting.totalWeightKg != null
      ? `${physical.mounting.totalWeightKg} kg`
      : "";
  const displayLinks = transport?.links.filter((link) => link.group === "display") ?? [];
  /**
   * A row's cable is the link it describes, not whichever link sits at the same
   * position: a grouped wall prints one row per feed while its links also carry
   * the loop hops inside those feeds, so position and link id parted ways.
   */
  const transportText = (index: number, linkId?: string): Pick<DisplayScheduleRow, "transport" | "transportStatus"> => {
    const link = (linkId ? displayLinks.find((entry) => entry.id === linkId) : undefined) ?? displayLinks[index];
    if (!link) return { transport: "" };
    const status = STATUS_LABEL[link.status];
    return {
      transport: `${link.cable} · ${link.length}${status ? ` · ${status}` : ""}`,
      transportStatus: link.status,
    };
  };

  const row = (index: number, screen: string, feedCount: string, scalingText: string, notes: string, linkId?: string): DisplayScheduleRow => ({
    screen,
    size: screenSize,
    weight: screenWeight,
    resolution: receivedText,
    feeds: feedCount,
    scaling: scalingText,
    notes,
    ...transportText(index, linkId),
  });

  let scheduleRows: DisplayScheduleRow[];
  let headline: string;

  if (application === "led") {
    scheduleRows = [row(
      0,
      "LED canvas",
      "1 processor input",
      scaling,
      `${columns} × ${rows} cabinets mapped by the LED processor · ${windowText}`,
    )];
    headline = `One ${canvasText} LED canvas carries the content${sourceText ? ` from a ${sourceText} source` : ""}.`;
  } else if (application === "projection") {
    scheduleRows = [row(
      0,
      "Projector",
      "1",
      scaling,
      `${windowText} on one screen · lens and geometry confirmed at survey`,
    )];
    headline = `One ${displayText} projection screen${sourceText ? ` from a ${sourceText} source` : ""}.`;
  } else if (independent) {
    scheduleRows = repeatRows(
      panels,
      (index) => row(index, `Panel ${index + 1}`, "1 per panel", scaling, `Panel ${index + 1} of ${panels} in a ${columns} × ${rows} array`),
      (from, to) => row(MAX_INDIVIDUAL_ROWS - 1, `Panels ${from}–${to}`, "1 per panel", scaling, `${to - from + 1} identical panel feeds`),
    );
    headline = `${panels} panel feeds at ${receivedText} each${sourceText ? ` from a ${sourceText} source` : ""}.`;
  } else if (application === "lcd-grouped" && wallRequirements) {
    const feeds = wallDisplayFeeds(wallRequirements);
    const shown = feeds.slice(0, MAX_INDIVIDUAL_ROWS);
    scheduleRows = shown.map((feed, index) => row(
      index,
      feed.label,
      feed.panels.length === 1 ? "1 per display" : `1 loop of ${feed.panels.length}`,
      `${scaling} on a ${pixelText(feed.pixels)} feed`,
      `${wallPanelRangeText(feed.panels)} on one head-end feed · ${windowText} composed once on it`,
      `feed-${feed.index}`,
    ));
    if (feeds.length > shown.length) {
      scheduleRows.push(row(
        shown.length,
        `Feeds ${shown.length + 1}–${feeds.length}`,
        "1 each",
        `${scaling} on their own feeds`,
        `${feeds.length - shown.length} further feeds, each listed in the transport estimate`,
        `feed-${shown.length + 1}`,
      ));
    }
    headline = `${feeds.length} feed${feeds.length === 1 ? "" : "s"} drive${feeds.length === 1 ? "s" : ""} ${panels} panels at ${receivedText} each${sourceText ? ` from a ${sourceText} source` : ""}.`;
  } else {
    const looped = application === "lcd-loop";
    scheduleRows = repeatRows(
      panels,
      (index) => row(
        index,
        `Panel ${index + 1}`,
        looped ? "1 looped tile" : "1 per panel",
        `${scaling} on a ${canvasText} canvas`,
        looped
          ? `Tile ${index + 1} of ${panels} · ${windowText} composed once on the canvas`
          : `Tile ${index + 1} of ${panels} · ${windowText} on one canvas`,
      ),
      (from, to) => row(MAX_INDIVIDUAL_ROWS - 1, `Panels ${from}–${to}`, looped ? "1 looped tile" : "1 per panel", `${scaling} on a ${canvasText} canvas`, `${to - from + 1} identical tiles`),
    );
    headline = `One ${canvasText} canvas tiled across ${panels} panels at ${receivedText} each.`;
  }

  return {
    rows: scheduleRows,
    headline: `${headline}${transport ? ` ${transport.headline}` : ""}`,
    basis: [
      mapping || "Scaling is read from the saved wall design.",
      ...(transport?.assumptions ?? []),
    ].join(" "),
    source: "video-wall",
    size: physical?.text ?? "",
    mounting: physical?.mounting.text ?? "",
    transportFlags: transport?.flags ?? [],
    install,
  };
}

/** Displays recorded in the third-party scope, with the model where one is named. */
function scopeDisplays(proposal: StoredProjectProposal) {
  const scope = proposal.applicationProposal?.thirdPartyScope ?? [];
  return scope
    .filter((item) => item.status !== "by-others" && isDisplayItem(`${item.category} ${item.description}`))
    .flatMap((item) => {
      const count = positive(item.quantity, 0);
      return Array.from({ length: count }, () => text(item.description) || text(item.category));
    });
}

/** Display rows in the governed equipment schedule; encoders and processors are excluded. */
function equipmentDisplays(bomRows: SalesBomRow[]) {
  return bomRows
    .filter((row) => isDisplayItem(`${row.description} ${row.role ?? ""} ${row.sku}`))
    .flatMap((row) => {
      const count = Math.max(0, Math.round(Number(row.qty) || 0));
      const label = [row.sku, text(row.description)].filter(Boolean).join(" — ");
      return Array.from({ length: count }, () => label);
    });
}

function catalogueSchedule(proposal: StoredProjectProposal, bomRows: SalesBomRow[]): DisplaySchedule | null {
  const scope = scopeDisplays(proposal);
  const equipment = scope.length ? [] : equipmentDisplays(bomRows);
  const models = (scope.length ? scope : equipment).filter(Boolean);
  const count = (scope.length ? scope : equipment).length;
  if (!count) return null;

  const rows = repeatRows(
    count,
    (index) => ({
      screen: `Display ${index + 1}`,
      size: "",
      weight: "",
      resolution: "To confirm",
      feeds: "1",
      scaling: "Native 1:1, confirm at survey",
      notes: index === 0 ? models[0] : "",
      transport: "",
    }),
    (from, to) => ({
      screen: `Displays ${from}–${to}`,
      size: "",
      weight: "",
      resolution: "To confirm",
      feeds: "1 each",
      scaling: "Native 1:1, confirm at survey",
      notes: `${to - from + 1} further displays matching display ${from}`,
      transport: "",
    }),
  );

  return {
    rows,
    headline: `${count} display${count === 1 ? "" : "s"} in scope, each driven by one feed.`,
    basis: "Native resolution, feed count and scaling are confirmed when the display models are recorded.",
    source: scope.length ? "scope" : "equipment",
    // Screen millimetres come from the display model, so a catalogue row has
    // none until the wall design exists — and no size means no derived mass,
    // clearance or survey sheet to quote installation detail from.
    size: "",
    mounting: "",
    transportFlags: [],
    install: null,
  };
}

/**
 * The display schedule the proposal prints: every screen with the pixels it
 * receives, the feeds that reach it and the scaling agreed for its content.
 * A saved video wall design is authoritative because it owns the canvas,
 * tiling and window composition; otherwise the display scope and equipment
 * schedule supply the screens.
 */
export function buildDisplaySchedule(
  proposal: StoredProjectProposal,
  bomRows: SalesBomRow[],
  videoWall?: { summary?: Record<string, unknown> } | Record<string, unknown> | null,
): DisplaySchedule | null {
  const summary = videoWall && typeof videoWall === "object" && "summary" in videoWall
    ? (videoWall as { summary?: Record<string, unknown> }).summary ?? null
    : (videoWall as Record<string, unknown> | null);
  const schedule = wallSchedule(summary);
  if (!schedule) return catalogueSchedule(proposal, bomRows);
  const recorded = videoWall as Record<string, unknown>;
  const requirements = wallRequirementsFromSummary(summary);
  const history = requirements?.mappingHistory ?? [];
  const audit = history.filter((entry) => entry && typeof entry.appliedAt === "string").map((entry) =>
    `Mapping snap ${String(entry.kind)} applied ${String(entry.appliedAt)}${entry.undoneAt ? `; undone ${String(entry.undoneAt)}` : ": wall canvas or source adjusted to align the mapping"}.`);
  return { ...schedule, basis: [
    `Recorded project: ${text(recorded.projectId) || "Not recorded"}. Recorded template: ${text(recorded.templateId) || "Not recorded"}.`,
    schedule.basis, ...audit,
  ].join(" ") };
}
