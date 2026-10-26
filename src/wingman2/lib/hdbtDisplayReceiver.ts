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
 */
export function hdbtDisplayReceiverForRun(runMetres: number | undefined, usbData = false): HdbtDisplayReceiverChoice | null {
  const run = typeof runMetres === "number" && Number.isFinite(runMetres) ? Math.round(runMetres) : 0;
  if (run <= 0) return null;
  if (run > LONG_RUN.limitMetres) {
    return {
      sku: LONG_RUN.sku,
      limitMetres: LONG_RUN.limitMetres,
      reason: `The survey records a ${run} m display run, beyond the ${LONG_RUN.limitMetres} m rating of ${LONG_RUN.sku}, so the receiver alone cannot carry the link: allow a mid-span repeater or a fibre link at survey before issue.`,
    };
  }
  const withinShortRun = run <= SHORT_RUN.limitMetres;
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

/** The same answer for a room template: its surveyed run, and whether USB travels. */
export function hdbtDisplayReceiverForTemplate(template: Pick<RoomTemplate, "concept" | "surveyedRunMetres">): HdbtDisplayReceiverChoice | null {
  return hdbtDisplayReceiverForRun(template.surveyedRunMetres, hdbtUsbDataRequired(template.concept ?? {}));
}

const isDisplayReceiver = (row: TemplateBomRow) =>
  row.role === "Display receiver" && HDBT_DISPLAY_RECEIVERS.some((receiver) => receiver.sku === row.sku);

/** Whether the room has a display receiver line at all, quoted or not. */
export function hasHdbtDisplayReceiver(rows: TemplateBomRow[]): boolean {
  return rows.some(isDisplayReceiver);
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
export function applyHdbtReceiver(rows: TemplateBomRow[], template: Pick<RoomTemplate, "concept" | "surveyedRunMetres">): TemplateBomRow[] {
  const choice = hdbtDisplayReceiverForTemplate(template);
  if (!choice) return rows;
  let changed = false;
  const next = rows.map((row) => {
    if (!isDisplayReceiver(row)) return row;
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
  return rows.some((row) => isDisplayReceiver(row) && row.status !== "excluded" && row.qty > 0);
}
