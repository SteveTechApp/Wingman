import { runWallSurveyScan, type WallSurveyScanResult } from "../api/wingmanApi";
import { mergeDisplayMounts, mergeSurveyRuns } from "./wallSurvey";
import {
  hasWallLinkDetail,
  normalizeWallLinkDetail,
  withWallLinkDetail,
  type WallLinkDetail,
  type WallTransportPlan,
} from "./videowallTransport";
import { downscaleImageToBase64 } from "./visionAttachments";

/**
 * Reading a filled worksheet back from a photograph.
 *
 * The sheet is printed before the visit, so the surveyor writes a run beside
 * each printed link id. The scan returns those pairs and this module holds the
 * only rules that matter for landing them safely:
 *
 * - a reading only applies to a link id the design actually has, so a smudged
 *   digit cannot create a run on nothing;
 * - a link the photo left blank keeps whatever the design already holds, and a
 *   link the reader could not make out is reported by name for typing, never
 *   cleared and never guessed;
 * - values read as `8,5`, `8.5` or `8.5 m` all land as 8.5 metres;
 * - the install line under a row comes back the same way: the display housing,
 *   mount, termination and run entry reach the design only for a link that
 *   exists, and a box the photo left empty leaves what the design already
 *   holds;
 * - nothing lands on the design by itself. Every usable row is a reading with
 *   the confidence the reader gave it, and only the rows a rep accepts are
 *   applied, so a smudged digit can be rejected after the fact rather than
 *   discovered later on the wall.
 * - several photographs are one review. A link read by more than one photo
 *   keeps the later reading, a link any photo read is no longer unread, and
 *   the unread list is one short list of the rows no photo could make out.
 */

export type WallSurveyScanReading = {
  /** Transport link id printed beside the row. */
  id: string;
  /** Link label as the worksheet printed it, so the rep recognises the row. */
  label: string;
  /** Run read from the row, or null when only its install line was legible. */
  metres: number | null;
  /** 0-1 confidence the reader reported for this row. */
  confidence: number;
  /** The reader's own note about this row, when it offered one. */
  note: string;
  /** Install text read beside the run. */
  detail: WallLinkDetail;
  /** Mount read at the display, once for this display link. */
  displayMount?: string;
  /**
   * A row the rep supplied rather than the photograph, so the review can say a
   * number is a person's and carry no read confidence for it.
   */
  typed?: boolean;
};

export type WallSurveyPhotoFailure = {
  fileName: string;
  message: string;
};

export type WallSurveyScan = {
  /** Every row worth reviewing, in design order; none of it has been applied. */
  readings: WallSurveyScanReading[];
  /** Runs the readings hold, in sheet order. */
  runs: { id: string; metres: number }[];
  /** Housing, termination and run entry read beside display links. */
  details: { id: string; detail: WallLinkDetail }[];
  /** Mount cells read once per display. */
  displayMounts: Record<string, string>;
  /** Links that look written on but could not be read reliably. */
  unread: string[];
  /** Links with no run on the sheet; their recorded value is left alone. */
  blank: string[];
  /** Rows that could not be used, named as the reader saw them. */
  problems: string[];
  /** The reader's own words about the photo. */
  summary: string;
  /** 0-1 confidence the reader reported for the whole transcription. */
  confidence: number;
  /** How many worksheet photos this review came from. */
  photoCount: number;
};

/** A 0-1 confidence the reader reported, clamped to what the panel can show. */
function scanConfidence(value: unknown) {
  const confidence = Number(value);
  return Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
}

/**
 * How much weight to give one scanned row. The thresholds are about reading
 * legibility, not transport risk: 80% and above is a row the rep can accept at a
 * glance, below 50% is worth re-reading against the paper sheet.
 */
export function scanConfidenceTone(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/** Metres from a read cell: `8`, `8,5`, `8.5 m` all become 8.5. */
export function surveyMetres(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s*m$/i, "").replace(",", ".");
  if (!cleaned) return null;
  const metres = Number(cleaned);
  return Number.isFinite(metres) && metres > 0 ? metres : null;
}

/**
 * Check a scan against the design before any of it is applied.
 *
 * Unknown ids, unusable lengths and duplicate rows are reported rather than
 * dropped silently, so the rep can see which rows of the paper sheet did not
 * land and read them across by hand.
 */
export function parseWallSurveyScan(data: WallSurveyScanResult | undefined, plan: WallTransportPlan): WallSurveyScan {
  const known = new Set(plan.allLinks.map((link) => link.id));
  const labels = new Map(plan.allLinks.map((link) => [link.id, link.label]));
  const readings: WallSurveyScanReading[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const [index, row] of (data?.rows ?? []).entries()) {
    const id = String(row?.linkId ?? "").trim();
    if (!id) {
      problems.push(`Photo row ${index + 1}: no link id could be read.`);
      continue;
    }
    if (!known.has(id)) {
      problems.push(`Photo row ${index + 1}: "${id}" is not a link in this design.`);
      continue;
    }
    if (seen.has(id)) {
      problems.push(`Photo row ${index + 1}: ${id} appears twice; the later read wins.`);
      const previous = readings.findIndex((reading) => reading.id === id);
      if (previous >= 0) readings.splice(previous, 1);
    }
    seen.add(id);

    const link = plan.allLinks.find((item) => item.id === id);
    const displayMount = link?.group === "display" ? String(row?.mount ?? "").replace(/\s+/g, " ").trim().slice(0, 60) : "";
    // Display-end text is independent of the run: a smudged length does not
    // throw away a cell the reader could still make out beside it.
    const detail = normalizeWallLinkDetail(link?.group === "display" ? {
      enclosure: row?.enclosure,
      termination: row?.termination,
      entry: row?.entry,
    } : {});
    const metres = surveyMetres(row?.metres);
    if (metres === null && row?.metres != null) {
      problems.push(`Photo row ${index + 1}: ${id} has no usable length ("${String(row.metres)}").`);
    }
    // A usable length or a legible install line is something to review; a row
    // with neither is only a problem, reported above.
    if (metres != null || hasWallLinkDetail(detail) || displayMount) {
      readings.push({
        id,
        label: labels.get(id) ?? id,
        metres,
        confidence: scanConfidence(row?.confidence),
        note: String(row?.note ?? "").trim(),
        detail,
        ...(displayMount ? { displayMount } : {}),
      });
    }
  }

  const runs = readings.flatMap((reading) =>
    reading.metres == null ? [] : [{ id: reading.id, metres: reading.metres }],
  );
  const details = readings.flatMap((reading) =>
    hasWallLinkDetail(reading.detail) ? [{ id: reading.id, detail: reading.detail }] : [],
  );
  const displayMounts = Object.fromEntries(readings.flatMap((reading) => reading.displayMount
    ? [[reading.id, reading.displayMount]]
    : []));
  const readIds = new Set(readings.map((reading) => reading.id));
  const runIds = new Set(runs.map((run) => run.id));
  const unread = [...new Set((data?.unread ?? []).map((id) => String(id).trim()))].filter(
    (id) => known.has(id) && !readIds.has(id),
  );
  const unreadIds = new Set(unread);
  const blank = plan.allLinks.map((link) => link.id).filter((id) => !runIds.has(id) && !unreadIds.has(id));

  return {
    readings,
    runs,
    details,
    displayMounts,
    unread,
    blank,
    problems,
    summary: String(data?.summary ?? "").trim(),
    confidence: scanConfidence(data?.confidence),
    photoCount: 1,
  };
}

/** What a rep changed on a read row before applying it. */
export type WallSurveyScanEdit = {
  /** A run typed over the read one; null drops the row's run. */
  metres?: number | null;
  /** Install cells corrected by hand; a blank cell removes what was read. */
  detail?: WallLinkDetail;
  /** A corrected display mount; blank removes the read mount. */
  displayMount?: string;
};

/**
 * Apply the rep's corrections to a read review, before any of it lands.
 *
 * Reviewing is the moment a smudged 9 is cheapest to fix: correcting the digit
 * in the list the rep is already checking is one keystroke, while applying it
 * and repairing the design afterwards is two edits and a saved audit trail that
 * says the wrong run was taken. The corrections produce a new scan, leaving the
 * read one untouched, so the run the photo actually reported is still available
 * to record beside the corrected one.
 */
export function editWallSurveyScan(
  scan: WallSurveyScan,
  edits: Record<string, WallSurveyScanEdit> | undefined,
): WallSurveyScan {
  if (!edits || !scan.readings.some((reading) => edits[reading.id])) return scan;

  const readings = scan.readings.map((reading) => {
    const edit = edits[reading.id];
    if (!edit) return reading;
    const typed = Number(edit.metres);
    const metres = edit.metres === undefined
      ? reading.metres
      : Number.isFinite(typed) && typed > 0
        ? typed
        : null;
    // A corrected cell replaces the read one and a blank cell removes it, so
    // emptying a box is a decision about that field, not a no-op.
    const detail = normalizeWallLinkDetail({ ...reading.detail, ...(edit.detail ?? {}) });
    const displayMount = edit.displayMount === undefined ? reading.displayMount : String(edit.displayMount).replace(/\s+/g, " ").trim().slice(0, 60) || undefined;
    return { ...reading, metres, detail, displayMount };
  });
  const runs = readings.flatMap((reading) =>
    reading.metres == null ? [] : [{ id: reading.id, metres: reading.metres }],
  );
  const details = readings.flatMap((reading) =>
    hasWallLinkDetail(reading.detail) ? [{ id: reading.id, detail: reading.detail }] : [],
  );
  const displayMounts = Object.fromEntries(readings.flatMap((reading) => reading.displayMount
    ? [[reading.id, reading.displayMount]]
    : []));
  const readIds = new Set(runs.map((run) => run.id));
  // A run the rep dropped leaves its link as blank as a row the photo never
  // filled in: the design keeps whatever it already holds for that link.
  const dropped = scan.readings
    .filter((reading) => reading.metres != null && !readIds.has(reading.id))
    .map((reading) => reading.id);
  return {
    ...scan,
    readings,
    runs,
    details,
    displayMounts,
    blank: [...new Set([...scan.blank, ...dropped])]
      .filter((id) => !readIds.has(id) && !scan.unread.includes(id)),
  };
}

/**
 * Merge photo scans into one review. A link read by more than one photo keeps
 * the later reading, exactly as a duplicate row on one sheet does; a link any
 * photo read stops being unread; and the unread list is the union of the rows
 * no photo could make out, ordered as the design lists its links.
 */
export function mergeWallSurveyScans(
  scans: WallSurveyScan[],
  plan: WallTransportPlan,
  labels: string[] = [],
): WallSurveyScan {
  const order = new Map(plan.allLinks.map((link, index) => [link.id, index]));
  const byId = new Map<string, WallSurveyScanReading>();
  for (const scan of scans) {
    for (const reading of scan.readings) byId.set(reading.id, reading);
  }
  const readings = [...byId.values()].sort(
    (left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
  const runs = readings.flatMap((reading) =>
    reading.metres == null ? [] : [{ id: reading.id, metres: reading.metres }],
  );
  const details = readings.flatMap((reading) =>
    hasWallLinkDetail(reading.detail) ? [{ id: reading.id, detail: reading.detail }] : [],
  );
  const displayMounts = Object.fromEntries(readings.flatMap((reading) => reading.displayMount
    ? [[reading.id, reading.displayMount]]
    : []));
  const readIds = new Set(readings.map((reading) => reading.id));
  const runIds = new Set(runs.map((run) => run.id));
  const known = new Set(plan.allLinks.map((link) => link.id));
  const unread = [...new Set(scans.flatMap((scan) => scan.unread))]
    .filter((id) => known.has(id) && !readIds.has(id))
    .sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
  const unreadIds = new Set(unread);
  const blank = plan.allLinks.map((link) => link.id).filter((id) => !runIds.has(id) && !unreadIds.has(id));
  const problems = scans.flatMap((scan, index) =>
    labels[index] ? scan.problems.map((problem) => `${labels[index]}: ${problem}`) : scan.problems,
  );
  const summaries = [...new Set(scans.map((scan) => scan.summary).filter(Boolean))];

  return {
    readings,
    runs,
    details,
    displayMounts,
    unread,
    blank,
    problems,
    summary: summaries.join(" "),
    // The weakest transcription is the honest confidence for the whole review.
    confidence: scans.length ? Math.min(...scans.map((scan) => scan.confidence)) : 0,
    photoCount: scans.length,
  };
}

export type WallSurveyReadOptions = {
  /**
   * The builder's development switch: ask a development server for its sample
   * reading instead of a model transcription. A deployed server refuses it, so
   * the photo is only ever read for real where that means something.
   */
  mock?: boolean;
};

/** Send one photo to the worksheet reader, then check what came back. */
export async function readWallSurveyPhoto(
  file: File,
  plan: WallTransportPlan,
  options: WallSurveyReadOptions = {},
): Promise<WallSurveyScan> {
  const { base64Data, mimeType } = await downscaleImageToBase64(file);
  const response = await runWallSurveyScan({
    fileName: file.name,
    mimeType,
    base64Data,
    links: plan.allLinks.map((link) => ({
      id: link.id,
      label: link.label,
      group: link.group,
      allowanceMetres: link.allowanceMetres,
      limitMetres: link.limitMetres,
    })),
    ...(options.mock ? { mock: true } : {}),
  });
  if (!response.ok) {
    throw new Error(response.error || "The worksheet photo could not be read.");
  }
  return parseWallSurveyScan(response.data, plan);
}

/**
 * Read several photographs of the same survey as one review.
 *
 * Each photo is checked against the design before its rows are merged, so an
 * unreadable or off-sheet photo is named rather than silently dropping out of
 * the review. One failed photo does not discard the rest; only when none of
 * the photographs can be read does the whole request fail.
 */
export type WallPhotoProgress = { index: number; fileName: string; state: "queued" | "reading" | "complete" | "failed"; result?: string };

export async function readWallSurveyPhotos(
  files: File[],
  plan: WallTransportPlan,
  onProgress?: (progress: WallPhotoProgress) => void,
  options: WallSurveyReadOptions = {},
): Promise<{ scan: WallSurveyScan; failures: WallSurveyPhotoFailure[] }> {
  const scans: WallSurveyScan[] = [];
  const labels: string[] = [];
  const failures: WallSurveyPhotoFailure[] = [];

  for (const [index, file] of files.entries()) {
    onProgress?.({ index, fileName: file.name, state: "reading" });
    try {
      const scan = await readWallSurveyPhoto(file, plan, options);
      scans.push(scan);
      onProgress?.({ index, fileName: file.name, state: "complete", result: `${scan.readings.length} rows read` });
      labels.push(file.name);
    } catch (error) {
      onProgress?.({ index, fileName: file.name, state: "failed", result: error instanceof Error ? error.message : "Could not read photo" });
      failures.push({
        fileName: file.name,
        message: error instanceof Error ? error.message : "The worksheet photo could not be read.",
      });
    }
  }

  if (scans.length === 0) {
    if (files.length === 1) throw new Error(failures[0]?.message ?? "The worksheet photo could not be read.");
    throw new Error(
      `None of the ${files.length} worksheet photos could be read. ${failures
        .map((failure) => `${failure.fileName}: ${failure.message}`)
        .join(" ")}`,
    );
  }

  return { scan: mergeWallSurveyScans(scans, plan, labels), failures };
}

/** The readings a rep accepted; every reading when no selection was passed. */
function acceptedReadings(scan: WallSurveyScan, acceptedIds?: readonly string[]) {
  if (!acceptedIds) return scan.readings;
  const accepted = new Set(acceptedIds);
  return scan.readings.filter((reading) => accepted.has(reading.id));
}

/**
 * Apply the accepted runs, leaving every rejected, unread or blank link alone.
 * Passing no selection keeps the old one-step behaviour for callers that have
 * already put the rows in front of a person.
 */
export function applyWallSurveyScan(
  measuredRuns: Record<string, number> | undefined,
  scan: WallSurveyScan,
  acceptedIds?: readonly string[],
) {
  const runs = acceptedReadings(scan, acceptedIds).flatMap((reading) =>
    reading.metres == null ? [] : [{ id: reading.id, metres: reading.metres }],
  );
  return mergeSurveyRuns(measuredRuns, { runs, cleared: [] });
}

/** Apply the accepted install detail, without clearing unread fields. */
export function applyWallSurveyDetails(
  linkDetails: Record<string, WallLinkDetail> | undefined,
  scan: WallSurveyScan,
  acceptedIds?: readonly string[],
) {
  return acceptedReadings(scan, acceptedIds).reduce(
    (next, reading) =>
      hasWallLinkDetail(reading.detail)
        ? withWallLinkDetail(next, reading.id, reading.detail)
        : next,
    linkDetails,
  );
}

/** Apply accepted mount reads to their owning displays, not to their cables. */
export function applyWallSurveyDisplayMounts(
  displayMounts: Record<string, string> | undefined,
  scan: WallSurveyScan,
  acceptedIds?: readonly string[],
  clearedIds: readonly string[] = [],
) {
  const accepted = acceptedIds ? new Set(acceptedIds) : null;
  const imported = Object.fromEntries(Object.entries(scan.displayMounts).filter(([id]) => !accepted || accepted.has(id)));
  const next = { ...(displayMounts ?? {}) };
  for (const [id, mount] of Object.entries(imported)) next[id] = mount;
  for (const id of clearedIds) if (!accepted || accepted.has(id)) delete next[id];
  return mergeDisplayMounts(undefined, next);
}

/** What the panel says after reading a photo: what landed, what to type. */
export function surveyScanSummary(scan: WallSurveyScan, linkCount: number) {
  const source = scan.photoCount > 1 ? `${scan.photoCount} photos` : "the photo";
  const parts: string[] = [];
  if (scan.runs.length) parts.push(`Read ${scan.runs.length} of ${linkCount} links from ${source}`);
  else if (scan.details.length || Object.keys(scan.displayMounts).length) parts.push(`No measured runs could be read from ${source}`);
  else parts.push(`No measured runs could be read from ${source} - nothing was changed`);
  if (scan.unread.length) parts.push(`${scan.unread.length} could not be read (${scan.unread.join(", ")}) - type those runs in`);
  if (scan.runs.length && scan.blank.length) parts.push(`${scan.blank.length} left blank kept the design allowance`);
  if (scan.details.length || Object.keys(scan.displayMounts).length) {
    parts.push(
      `${scan.details.length + Object.keys(scan.displayMounts).length} install detail${scan.details.length + Object.keys(scan.displayMounts).length === 1 ? "" : "s"} read (display housing, mount, termination or run entry)`,
    );
  }
  const sentence = `${parts.join("; ")}.`;
  return scan.problems.length ? `${sentence} ${scan.problems.join(" ")}` : sentence;
}
