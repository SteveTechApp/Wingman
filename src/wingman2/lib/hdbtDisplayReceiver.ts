import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";

/**
 * The two receivers a room template quotes for an HDBaseT display run, with the
 * run each is rated for. Distance is the one fact a survey measures, so it is
 * what chooses between them — but the parts differ on more than length, so the
 * format ceiling travels in the same sentence rather than being left for a
 * reader to discover after the order: RX-500 stops at 35 m and reaches 4K60 at
 * 4:2:0, while RX-700 is the 100 m part and reaches 4K60 4:4:4 through DSC.
 */
export const HDBT_DISPLAY_RECEIVERS = [
  { sku: "RX-500", limitMetres: 35 },
  { sku: "RX-700", limitMetres: 100 },
] as const;

export type HdbtDisplayReceiverSku = (typeof HDBT_DISPLAY_RECEIVERS)[number]["sku"];

export type HdbtDisplayReceiverChoice = {
  sku: HdbtDisplayReceiverSku;
  limitMetres: number;
  /** The reason this receiver was chosen, printed where the room is read. */
  reason: string;
};

/**
 * The longest span the range's receivers carry. Past it the link stops being a
 * single HDBaseT run and needs a repeater or fibre, whatever receiver is chosen.
 */
export const HDBT_DISPLAY_RUN_LIMIT_METRES = Math.max(
  ...HDBT_DISPLAY_RECEIVERS.map((receiver) => receiver.limitMetres),
);

/**
 * The part a link longer than one receiver's rating is carried on: an HDBaseT
 * extender set used mid-span. Its receiver takes the first span and its
 * transmitter sends the next, so no span leaves the range's rating and the
 * display receiver at the far end serves only its own.
 *
 * The SKU is the catalogue's own current extender set rather than an invented
 * repeater, so the line the fix schedules is a part a rep can quote.
 */
export const HDBT_MID_SPAN_REPEATER = {
  sku: "EX3-100-EARC",
  role: "Display extender",
  description: "HDBaseT extender set — mid-span repeater (TX and RX)",
  /** The span the set carries on each side, from its own rating. */
  limitMetres: 100,
} as const;

/** How one measured display run is carried when it will not fit one receiver. */
export type DisplayRunSpanPlan = {
  /** The measured run the plan carries, in metres. */
  runMetres: number;
  /** How many spans the link becomes. */
  spans: number;
  /** The run each receiver serves — the longest span. */
  spanMetres: number;
  /** Extender sets that sit mid-span, one per interior seam. */
  repeaters: number;
};

/**
 * The spans a run is carried in, or null when one receiver already carries it.
 *
 * The split is the fewest spans that bring every one of them inside the range's
 * rating, and the spans are equal, so each receiver serves the same figure: a
 * 130 m run becomes two 65 m spans with one extender set between them. Nothing
 * is split for a run the range already reaches, so a short room schedules no
 * repeater.
 */
export function displayRunSpanPlan(runMetres: number | null | undefined): DisplayRunSpanPlan | null {
  if (typeof runMetres !== "number" || !Number.isFinite(runMetres)) return null;
  const run = Math.round(runMetres);
  if (run <= HDBT_DISPLAY_RUN_LIMIT_METRES) return null;
  const spans = Math.ceil(run / HDBT_DISPLAY_RUN_LIMIT_METRES);
  return { runMetres: run, spans, spanMetres: Math.ceil(run / spans), repeaters: spans - 1 };
}

/**
 * The sentence for a link carried in spans, over the receiver the schedule
 * quotes.
 *
 * The survey's measurement is quoted as it was found and the span is the figure
 * the receiver's rating is measured against, so a reader sees both rather than a
 * single number that could be either. Every surface that states a split reads
 * this one sentence — the template's receiver rule, the room brief, and a saved
 * project whose record was fixed after the fact — so the same link cannot be
 * described two ways.
 */
export function hdbtSpannedRunReason({
  runMetres,
  spanMetres,
  sku,
  limitMetres,
  note,
}: {
  /** The run as the survey measured it. */
  runMetres: number;
  /** The longest span the link is carried in, which is what each receiver serves. */
  spanMetres: number;
  sku: string;
  limitMetres: number;
  /** A further sentence about the room (a USB path), appended after the reason. */
  note?: string;
}): string {
  const spans = Math.ceil(runMetres / spanMetres);
  return `The survey records a ${runMetres} m display run, carried in ${spans} spans of ${spanMetres} m with a mid-span ${HDBT_MID_SPAN_REPEATER.sku}, so the display receiver serves the ${spanMetres} m span, inside the ${limitMetres} m rating of ${sku}.${note ? ` ${note}` : ""}`;
}

/** The parts of a schedule row this module reads, so a template row and a printed BOM row both fit. */
export type DisplayReceiverRow = { role: string; sku: string; status?: string; qty?: number };

/** Whether a row is one of the receivers this rule chooses between, whatever its quantity. */
export function isHdbtDisplayReceiverRow(row: DisplayReceiverRow): boolean {
  return row.role === "Display receiver" && HDBT_DISPLAY_RECEIVERS.some((receiver) => receiver.sku === row.sku);
}

/** The HDBaseT display receiver a schedule actually quotes, if it quotes one. */
export function quotedHdbtDisplayReceiverRow<T extends DisplayReceiverRow>(rows: readonly T[]): T | null {
  return (
    rows.find(
      (row) => isHdbtDisplayReceiverRow(row) && row.status !== "excluded" && (row.qty ?? 0) > 0,
    ) ?? null
  );
}

/**
 * The display run a room model records, as it was saved.
 *
 * A saved template writes the measurement under `cableRun` and `longestRun`,
 * and an older brief may hold Discovery's `distance` instead. The first value
 * that reads as a distance is the run, so the record panel and the export gate
 * name the same figure rather than each knowing its own field.
 */
export function surveyedDisplayRunText(
  roomModel: { cableRun?: unknown; longestRun?: unknown; distance?: unknown; servedRun?: unknown } | null | undefined,
): string {
  return (
    [roomModel?.cableRun, roomModel?.longestRun, roomModel?.distance]
      .map((value) => String(value ?? "").trim())
      .find((value) => metresFromRunText(value) !== undefined) ?? ""
  );
}

/** The same run in metres, or null when the room model records none. */
export function surveyedDisplayRunMetres(
  roomModel: { cableRun?: unknown; longestRun?: unknown; distance?: unknown; servedRun?: unknown } | null | undefined,
): number | null {
  return metresFromRunText(surveyedDisplayRunText(roomModel)) ?? null;
}

/**
 * The run the quoted receiver actually serves: the span a room records when the
 * link is carried in spans, else the whole run it measured.
 *
 * A 130 m room with one mid-span set records 130 m as the survey found it and
 * 65 m as the span each receiver carries. The receiver is what the document
 * quotes, so this is the figure its rating is measured against — which is why
 * the export gate and the record panel read it rather than the whole run.
 */
export function servedDisplayRunMetres(
  roomModel: { cableRun?: unknown; longestRun?: unknown; distance?: unknown; servedRun?: unknown } | null | undefined,
): number | null {
  return metresFromRunText(roomModel?.servedRun) ?? surveyedDisplayRunMetres(roomModel);
}

const SHORT_RUN = HDBT_DISPLAY_RECEIVERS[0];
const LONG_RUN = HDBT_DISPLAY_RECEIVERS[1];

type ScheduleLine = readonly [description: string, qty: number, location: string];

/**
 * USB data is what makes the receiver a matched pair: an interactive surface or
 * a USB KVM path returns over the same link, and that path lives in the matched
 * part. Where USB stays out of the picture any HDBaseT receiver suits the run,
 * so the survey is free to choose on length.
 */
export function hdbtUsbDataRequired(input: { sources?: readonly ScheduleLine[]; outputs?: readonly ScheduleLine[] }): boolean {
  const text = (lines: readonly ScheduleLine[] | undefined) => (lines ?? []).map(([description]) => description.toLowerCase()).join(" ");
  return /interactive|touch/.test(text(input.outputs)) || /usb host|touch|kvm/.test(text(input.sources));
}

/**
 * The receiver a surveyed display run calls for, or null when no run has been
 * measured. Nothing is assumed from an absent figure: a template without one
 * keeps the receiver its author scheduled, and `applyHdbtReceiver` writes
 * nothing.
 *
 * `servedMetres` is the span the receiver serves once the link is carried in
 * spans. It is what the rating is measured against, so it decides the part, and
 * the reason says the link is split rather than calling for a repeater the
 * schedule already holds.
 */
export function hdbtDisplayReceiverForRun(
  runMetres: number | undefined,
  usbData = false,
  servedMetres?: number,
): HdbtDisplayReceiverChoice | null {
  const run = typeof runMetres === "number" && Number.isFinite(runMetres) ? Math.round(runMetres) : 0;
  if (run <= 0) return null;
  const served = typeof servedMetres === "number" && Number.isFinite(servedMetres) && servedMetres > 0
    ? Math.round(servedMetres)
    : run;
  const spans = served < run ? Math.ceil(run / served) : 1;
  const carriedInSpans = spans > 1;
  if (served > LONG_RUN.limitMetres) {
    return {
      sku: LONG_RUN.sku,
      limitMetres: LONG_RUN.limitMetres,
      reason: carriedInSpans
        ? `The survey records a ${run} m display run carried in ${spans} spans, but the ${served} m span is still beyond the ${LONG_RUN.limitMetres} m rating of ${LONG_RUN.sku}: allow a further mid-span repeater or a fibre link at survey before issue.`
        : `The survey records a ${run} m display run, beyond the ${LONG_RUN.limitMetres} m rating of ${LONG_RUN.sku}, so the receiver alone cannot carry the link: allow a mid-span repeater or a fibre link at survey before issue.`,
    };
  }
  const withinShortRun = served <= SHORT_RUN.limitMetres;
  // USB data narrows the range to the matched part whatever the span is.
  const receiver = usbData || !withinShortRun ? LONG_RUN : SHORT_RUN;
  if (carriedInSpans) {
    const usbNote = usbData && withinShortRun
      ? `USB data travels with the picture, so the display receiver stays the matched ${LONG_RUN.sku} rather than the shorter-run ${SHORT_RUN.sku}.`
      : undefined;
    return {
      sku: receiver.sku,
      limitMetres: receiver.limitMetres,
      reason: hdbtSpannedRunReason({
        runMetres: run,
        spanMetres: served,
        sku: receiver.sku,
        limitMetres: receiver.limitMetres,
        note: usbNote,
      }),
    };
  }
  if (usbData) {
    return {
      sku: LONG_RUN.sku,
      limitMetres: LONG_RUN.limitMetres,
      reason: withinShortRun
        ? `The survey records a ${run} m display run, but USB data travels with the picture in this room, so the display receiver stays the matched ${LONG_RUN.sku} rather than the shorter-run ${SHORT_RUN.sku}.`
        : `The survey records a ${run} m display run, beyond the ${SHORT_RUN.limitMetres} m rating of ${SHORT_RUN.sku}, and USB data travels with the picture, so the room takes the matched ${LONG_RUN.sku}, rated to ${LONG_RUN.limitMetres} m.`,
    };
  }
  if (withinShortRun) {
    return {
      sku: SHORT_RUN.sku,
      limitMetres: SHORT_RUN.limitMetres,
      reason: `The survey records a ${run} m display run, inside the ${SHORT_RUN.limitMetres} m rating of ${SHORT_RUN.sku}, so the room takes ${SHORT_RUN.sku}. It carries the room's 1080p60 or 4K30 design format over that run and reaches 4K60 at 4:2:0; where 4K60 4:4:4 is required the room takes ${LONG_RUN.sku} instead.`,
    };
  }
  return {
    sku: LONG_RUN.sku,
    limitMetres: LONG_RUN.limitMetres,
    reason: `The survey records a ${run} m display run, beyond the ${SHORT_RUN.limitMetres} m rating of ${SHORT_RUN.sku}, so the room takes ${LONG_RUN.sku}, rated to ${LONG_RUN.limitMetres} m, which reaches 4K60 4:4:4 through DSC.`,
  };
}

/** The same answer for a room template: its surveyed run, the span it carries, and whether USB travels. */
export function hdbtDisplayReceiverForTemplate(
  template: Pick<RoomTemplate, "concept" | "surveyedRunMetres" | "servedRunMetres">,
): HdbtDisplayReceiverChoice | null {
  return hdbtDisplayReceiverForRun(
    template.surveyedRunMetres,
    hdbtUsbDataRequired(template.concept ?? {}),
    template.servedRunMetres,
  );
}

/** Whether the room has a display receiver line at all, quoted or not. */
export function hasHdbtDisplayReceiver(rows: TemplateBomRow[]): boolean {
  return rows.some(isHdbtDisplayReceiverRow);
}

/**
 * Reads a distance written the way Discovery and a saved room model write it
 * (“28 m”, “55m endpoint route”), so a run recorded on a project is the same
 * figure when the design is rebuilt.
 */
export function metresFromRunText(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)\s*m?\b/i);
  const metres = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(metres) && metres > 0 ? Math.round(metres) : undefined;
}

/**
 * Writes the surveyed run's receiver into the schedule and states why. Only the
 * display receiver row this rule chooses between is rewritten — a rep who
 * scheduled another part keeps it — and the reason travels with the row so the
 * schedule's own reading of the line says which run chose it. Clearing the run
 * restores the author's row, because nothing is applied until one is measured.
 */
export function applyHdbtReceiver(
  rows: TemplateBomRow[],
  template: Pick<RoomTemplate, "concept" | "surveyedRunMetres" | "servedRunMetres">,
): TemplateBomRow[] {
  const choice = hdbtDisplayReceiverForTemplate(template);
  if (!choice) return rows;
  let changed = false;
  const next = rows.map((row) => {
    if (!isHdbtDisplayReceiverRow(row)) return row;
    if (row.sku === choice.sku && row.notes === choice.reason) return row;
    changed = true;
    return { ...row, sku: choice.sku, notes: choice.reason };
  });
  return changed ? next : rows;
}

/**
 * Whether the schedule actually quotes one of the receivers this rule chooses
 * between. A line the rep excluded is not quoted, so a room that dropped its
 * receiver does not carry a sentence about which run chose it.
 */
export function quotesHdbtDisplayReceiver(rows: TemplateBomRow[]): boolean {
  return quotedHdbtDisplayReceiverRow(rows) !== null;
}
