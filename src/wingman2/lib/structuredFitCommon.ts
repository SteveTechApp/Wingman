// Shared helpers for the dynamic, structured-data compare-fit scorers
// (dynamicPresentationSwitcherFit.ts, dynamicMatrixFit.ts, dynamicDistributionAmpFit.ts,
// dynamicExtenderFit.ts). Every one of those scorers works the same way: read real
// structured fields off a record when present, fall back to text signals only when they
// aren't, and never hardcode a specific SKU as "the" answer. This file holds the parsing
// primitives so that logic lives in one place instead of four.

export type LooseRecord = Record<string, any>;

export function toText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(toText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value as LooseRecord).map(toText).join(" ");
  }

  return String(value ?? "");
}

export function numberFromValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

export function sumArrayCounts(value: unknown): number | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  let total = 0;
  let found = false;

  for (const entry of value) {
    const count = numberFromValue((entry as LooseRecord)?.count);
    if (typeof count === "number") {
      total += count;
      found = true;
    }
  }

  return found ? total : undefined;
}

/** Reads a competitor OR WyreStorm record's own structured I/O fields -- no allowlist involved. */
export function deriveIoCounts(record: LooseRecord): { inputCount: number | null; outputCount: number | null } {
  const candidates: Array<[unknown, unknown]> = [
    [record.matrixInputs, record.matrixOutputs],
    [record.routedInputCount, record.routedOutputCount],
    [record.routedInputs, record.routedOutputs],
    [record.inputCount, record.outputCount],
  ];

  for (const [rawInputs, rawOutputs] of candidates) {
    const inputs = numberFromValue(rawInputs);
    const outputs = numberFromValue(rawOutputs);
    if (inputs && outputs && inputs > 0 && outputs > 0 && inputs <= 64 && outputs <= 64) {
      return { inputCount: inputs, outputCount: outputs };
    }
  }

  const inputArraySum = sumArrayCounts(record.inputs);
  const outputArraySum = sumArrayCounts(record.outputs);
  if (inputArraySum || outputArraySum) {
    return { inputCount: inputArraySum ?? null, outputCount: outputArraySum ?? null };
  }

  // Some WyreStorm matrix SKUs encode size in the numeric part of the model number,
  // e.g. MX-0808-... = 8x8, MX-0402-... = 4x2. Used only as a last resort.
  const sku = String(record.sku ?? "");
  const encoded = sku.match(/MX-?(\d{2})(\d{2})/i);
  if (encoded) {
    const inputs = Number(encoded[1]);
    const outputs = Number(encoded[2]);
    if (inputs > 0 && outputs > 0) {
      return { inputCount: inputs, outputCount: outputs };
    }
  }

  return { inputCount: null, outputCount: null };
}

/** Extracts a single output-side quantity for single-directional products (splitters, extenders). */
export function deriveSingleOutputCount(record: LooseRecord): number | null {
  const io = deriveIoCounts(record);
  if (io.outputCount) return io.outputCount;

  const direct = numberFromValue(record.outputCount ?? record.outputs?.length);
  return direct ?? null;
}

/** Parses the longest advertised transmission distance in metres from free text. */
export function deriveDistanceMeters(text: string): number | null {
  const meterMatches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*m(?:eters?|etres?)?\b/gi))
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 20000);

  const feetMatches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\b/gi))
    .map((m) => Number(m[1]) * 0.3048)
    .filter((n) => Number.isFinite(n) && n > 0);

  const all = [...meterMatches, ...feetMatches];
  return all.length ? Math.max(...all) : null;
}

export function flagFromText(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export const WIRELESS_PATTERN = /\b(wireless|wi-?fi\s*cast|casting|miracast|airplay|chromecast|clickshare|solstice|mersive|airtame|wifidisplay|screen\s*mirroring|byod\s*dongle)\b/i;
export const USB_PATTERN = /\b(usb-?c|usb\s*3|usb\s*2|usb\s*host|usb\s*device|usb\s*extension|kvm)\b/i;
export const AVOIP_PATTERN = /\b(networkhd|nhd|av\s*over\s*ip|avoip|sdvoe|spill-?over)\b/i;
export const DANTE_PATTERN = /\b(dante|aes67)\b/i;
export const BUILT_IN_AMP_PATTERN = /\b(built-?in|integrated|internal)\b.{0,40}\b(amp(?:lifier)?)\b|\bamp(?:lifier)?\b.{0,40}\b(built-?in|integrated|internal)\b|\bclass\s*d\b.{0,20}\bamp/i;
export const SCALING_PATTERN = /\bscal(?:ing|er)\b/i;
export const VIDEO_WALL_PATTERN = /\bvideo\s*wall\b/i;
export const MULTIVIEW_PATTERN = /\bmulti-?view\b|\bpicture\s*by\s*picture\b|\bpbp\b/i;
export const HDBASET_EXTENSION_PATTERN = /\b(hdbase-?t|dtp2?|hdbt)\b/i;

export function productFamilyKey(product: LooseRecord): string {
  return String(product.family ?? product.hardwareType ?? product.wingmanFamily ?? "").toLowerCase();
}

export function isLifecycleUsable(product: LooseRecord): boolean {
  const lifecycle = String(product.lifecycleStatus ?? product.businessStatus ?? "active").toLowerCase();
  return lifecycle === "active" || lifecycle === "review";
}

/** Excludes mics/docks/mounts/cables etc. -- a lead candidate has to be primary hardware. */
export function isPrimaryHardware(product: LooseRecord): boolean {
  const role = String(product.productRole ?? "").toLowerCase();
  if (!role) return true; // no role data recorded -- don't silently drop it, let scoring sort it out
  return role === "primary-hardware" || role === "system-controller" || role === "endpoint-hardware";
}

/**
 * One row of a side-by-side comparison chart: a single feature/I/O point, the competitor's
 * value, WyreStorm's value, and whether that's a match, a gap (competitor has it, WyreStorm
 * candidate doesn't), an extra (WyreStorm candidate has it, competitor doesn't), or neutral
 * info (neither has it / not a count that differs).
 */
export interface ComparisonRow {
  feature: string;
  competitor: string;
  wyrestorm: string;
  status: "match" | "gap" | "extra" | "info";
}

/** Builds a comparison row for a numeric I/O count (inputs, outputs, reach in metres, etc.). */
export function countRow(feature: string, competitorValue: number | null, candidateValue: number | null, unit = ""): ComparisonRow {
  const format = (value: number | null) => (value === null ? "Not specified" : `${value}${unit ? ` ${unit}` : ""}`);
  let status: ComparisonRow["status"] = "info";
  if (competitorValue !== null && candidateValue !== null) {
    if (candidateValue === competitorValue) status = "match";
    else if (candidateValue > competitorValue) status = "extra";
    else status = "gap";
  }
  return { feature, competitor: format(competitorValue), wyrestorm: format(candidateValue), status };
}

/** Builds a comparison row for a yes/no capability flag (wireless, USB, Dante, scaling, etc.). */
export function flagRow(feature: string, competitorHas: boolean, candidateHas: boolean): ComparisonRow {
  let status: ComparisonRow["status"];
  if (competitorHas && candidateHas) status = "match";
  else if (competitorHas && !candidateHas) status = "gap";
  else if (!competitorHas && candidateHas) status = "extra";
  else status = "info";
  return { feature, competitor: competitorHas ? "Yes" : "No", wyrestorm: candidateHas ? "Yes" : "No", status };
}

export function buildStructuredText(record: LooseRecord, extraText = ""): string {
  const tp: LooseRecord = record.technicalProfile ?? {};
  const structuredText = toText([
    record.features,
    record.audio,
    record.control,
    record.inputs,
    record.outputs,
    record.summary,
    record.description,
    tp.processing,
    tp.audio,
    tp.usb,
    tp.network,
    tp.control,
    tp.hdbaset,
    tp.video,
  ]);

  return `${structuredText} ${extraText}`.toLowerCase();
}
