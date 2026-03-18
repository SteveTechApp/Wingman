import type { CompetitorItem, EnrichmentResult, EnrichmentWarning } from "./types";

type Confidence = "high" | "medium" | "low";

function unwrapValue(input: unknown): unknown {
  if (input && typeof input === "object" && "confidence" in (input as Record<string, unknown>)) {
    return (input as Record<string, unknown>).value;
  }
  return input;
}

function unwrapConfidence(input: unknown): Confidence {
  if (input && typeof input === "object" && "confidence" in (input as Record<string, unknown>)) {
    const c = (input as Record<string, unknown>).confidence;
    if (c === "high" || c === "medium" || c === "low") return c;
  }
  return "low";
}

function hasValue(input: unknown): boolean {
  const value = unwrapValue(input);
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}

function confidenceScore(value: Confidence): number {
  if (value === "high") return 1;
  if (value === "medium") return 0.7;
  return 0.4;
}

export function calculateQualityScore(item: CompetitorItem): number {
  const checks: Array<{ ok: boolean; weight: number; confidence: Confidence }> = [
    { ok: hasValue(item.video?.maxResolution), weight: 15, confidence: unwrapConfidence(item.video?.maxResolution) },
    { ok: hasValue(item.video?.bandwidthGbps), weight: 10, confidence: unwrapConfidence(item.video?.bandwidthGbps) },
    { ok: hasValue(item.video?.hdcp), weight: 8, confidence: unwrapConfidence(item.video?.hdcp) },
    { ok: hasValue(item.connectivity?.transport), weight: 15, confidence: unwrapConfidence(item.connectivity?.transport) },
    { ok: hasValue(item.connectivity?.inputs), weight: 10, confidence: unwrapConfidence(item.connectivity?.inputs) },
    { ok: hasValue(item.connectivity?.outputs), weight: 10, confidence: unwrapConfidence(item.connectivity?.outputs) },
    { ok: hasValue(item.distance?.maxMeters1080p), weight: 8, confidence: unwrapConfidence(item.distance?.maxMeters1080p) },
    { ok: hasValue(item.distance?.maxMeters4k), weight: 8, confidence: unwrapConfidence(item.distance?.maxMeters4k) },
    { ok: hasValue(item.audio?.audioFormats), weight: 6, confidence: unwrapConfidence(item.audio?.audioFormats) },
    { ok: hasValue(item.commercial?.estimatedStreetPriceGbp), weight: 5, confidence: unwrapConfidence(item.commercial?.estimatedStreetPriceGbp) },
    { ok: hasValue(item.commercial?.availability), weight: 5, confidence: unwrapConfidence(item.commercial?.availability) }
  ];

  const total = checks.reduce((sum, row) => {
    if (!row.ok) return sum;
    return sum + (row.weight * confidenceScore(row.confidence));
  }, 0);

  return Math.max(0, Math.min(100, Math.round(total)));
}

export function qualityBand(score: number): "complete" | "usable" | "needs-enrichment" {
  if (score >= 80) return "complete";
  if (score >= 50) return "usable";
  return "needs-enrichment";
}

export function buildWarnings(item: CompetitorItem): EnrichmentWarning[] {
  const warnings: EnrichmentWarning[] = [];

  if (!item.brand) warnings.push({ code: "missing-brand", message: "Brand is missing.", severity: "error" });
  if (!item.sku) warnings.push({ code: "missing-sku", message: "SKU is missing.", severity: "error" });
  if (!hasValue(item.video?.maxResolution)) warnings.push({ code: "missing-resolution", message: "Maximum video resolution is missing.", severity: "warning" });

  const transport = unwrapValue(item.connectivity?.transport);
  if (!hasValue(item.connectivity?.transport) || transport === "Unknown") {
    warnings.push({ code: "missing-transport", message: "Transport type is unknown or missing.", severity: "warning" });
  }

  if (!hasValue(item.connectivity?.inputs)) warnings.push({ code: "missing-inputs", message: "Input connectivity is missing.", severity: "info" });
  if (!hasValue(item.connectivity?.outputs)) warnings.push({ code: "missing-outputs", message: "Output connectivity is missing.", severity: "info" });

  return warnings;
}

export function enrichCompetitorRecord(item: CompetitorItem): EnrichmentResult {
  const score = calculateQualityScore(item);
  return {
    item,
    qualityScore: score,
    completenessBand: qualityBand(score),
    warnings: buildWarnings(item)
  };
}