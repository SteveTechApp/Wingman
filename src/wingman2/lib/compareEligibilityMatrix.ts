/**
 * Routed input/output sizing and fan-out, read from text or structured data.
 *
 * A matrix or splitter's capacity is the fact the right-sizing rules turn on, and it
 * reaches a compare run as prose (8x8 HDBaseT matrix), as an encoded SKU (MXV-0808), or
 * as routed counts on the governed profile. All three spellings are read here so the
 * eligibility gate and the presentation cards cannot disagree about how big a candidate is.
 */
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";
import { skuKey, toText } from "./compareEligibilityText";
import type { LooseRecord } from "./compareEligibilityTypes";

export function extractMatrixSizeFromText(text: string): { inputs?: number; outputs?: number } {
  const readable = text.replace(/[×]/g, "x");
  const explicit = readable.match(/(?:^|[^0-9])(\d{1,2})\s*x\s*(\d{1,2})(?:[^0-9]|$)/i);

  if (explicit) {
    return {
      inputs: Number(explicit[1]),
      outputs: Number(explicit[2]),
    };
  }

  const compact = skuKey(text);
  const blustreamKit = compact.match(/^(?:HMX|C)(\d)(\d)(?:18G|4K|KIT|CS|PRO|$)/);

  if (blustreamKit) {
    return {
      inputs: Number(blustreamKit[1]),
      outputs: Number(blustreamKit[2]),
    };
  }

  // WyreStorm splitters (SP-0104 / SP-0108) and Essentials splitters
  // (EXP-SP-0104 / EXP-SP-0102-8K) encode inputs+outputs the same way as the
  // matrix SKUs (SP-0104 = 1 input / 4 outputs). Without this the distribution
  // amplifier right-sizing (matrixFitPenalty) reads no fan-out and cannot tell a
  // 1x4 splitter from a 1x8, so a 1x4 request could match the larger 1x8.
  const prefixed = compact.match(/(?:MXV|MMX|HMX|MX|VS|C|ACMX|EXPSP|SP)(\d{2})(\d{2})/);

  if (prefixed) {
    return {
      inputs: Number(prefixed[1]),
      outputs: Number(prefixed[2]),
    };
  }

  return {};
}

export function numberFromValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

export function extractStructuredMatrixSize(value: unknown): { inputs: number; outputs: number } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as LooseRecord;
  const specs = record.specs && typeof record.specs === "object" && !Array.isArray(record.specs)
    ? record.specs as LooseRecord
    : {};
  const candidates: Array<[unknown, unknown]> = [
    [record.inputCount, record.outputCount],
    [record.routedInputCount, record.routedOutputCount],
    [record.routedInputs, record.routedOutputs],
    [record.matrixInputs, record.matrixOutputs],
    [specs.hdmiInputs, specs.hdmiOutputs],
    [specs.routedInputs, specs.routedOutputs],
  ];

  for (const [rawInputs, rawOutputs] of candidates) {
    const inputs = numberFromValue(rawInputs);
    const outputs = numberFromValue(rawOutputs);

    if (inputs && outputs && inputs > 0 && outputs > 0 && inputs <= 64 && outputs <= 64) {
      return { inputs, outputs };
    }
  }

  return undefined;
}

export function extractCandidateMatrixSize(value: unknown): { inputs?: number; outputs?: number } | undefined {
  const explicit = extractStructuredMatrixSize(value);
  if (explicit) return explicit;

  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  // WyreStorm routed capacity normally lives in the governed technical profile,
  // not in the flat catalogue record. Use the same normalised profile as the
  // compare cards so eligibility and presentation cannot disagree.
  const record = value as LooseRecord;
  const profile = buildWyrestormCompareProfile({
    ...record,
    features: Array.isArray(record.features) ? record.features : [],
    technologies: Array.isArray(record.technologies) ? record.technologies : [],
    featureTags: Array.isArray(record.featureTags) ? record.featureTags : [],
    tags: Array.isArray(record.tags) ? record.tags : [],
  } as any);
  const inputs = numberFromValue(profile.inputCount);
  const outputs = numberFromValue(profile.outputCount);
  const descriptiveText = toText(record);
  const describedInputs = numberFromValue(descriptiveText.match(/\b(\d{1,2})[ -]input\b/i)?.[1]);
  const describedOutputs = numberFromValue(descriptiveText.match(/\b(\d{1,2})[ -]output\b/i)?.[1]);
  const resolvedInputs = Math.max(inputs && inputs <= 64 ? inputs : 0, describedInputs ?? 0) || undefined;
  const resolvedOutputs = Math.max(outputs && outputs <= 64 ? outputs : 0, describedOutputs ?? 0) || undefined;
  return resolvedInputs || resolvedOutputs
    ? { inputs: resolvedInputs, outputs: resolvedOutputs }
    : undefined;
}

export function structuredMatrixText(value: unknown): string {
  const size = extractStructuredMatrixSize(value);
  return size ? `${size.inputs}x${size.outputs} routed matrix` : "";
}

