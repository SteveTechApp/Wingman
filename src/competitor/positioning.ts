import type { CatalogProduct } from "@/catalog/types";
import type { CompetitorProduct } from "./repository";

export type PositioningResult = {
  score: number;
  reasons: string[];
  summary: string;
};

function toSet(values?: string[]): Set<string> {
  return new Set((values || []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean));
}

function countPorts(ports?: Array<{ type: string; count: number }>): number {
  return Array.isArray(ports)
    ? ports.reduce((sum, p) => sum + Number(p.count || 0), 0)
    : 0;
}

export function explainWyreStormAdvantage(
  wyrestorm: CatalogProduct,
  competitor: CompetitorProduct
): PositioningResult {
  let score = 0;
  const reasons: string[] = [];

  const wyFeatures = toSet(wyrestorm.features);
  const cpFeatures = toSet(competitor.features);

  const wyControl = toSet(wyrestorm.control);
  const cpControl = toSet(competitor.control);

  const wyDistance = Number(wyrestorm.distance?.meters || 0);
  const cpDistance = Number(competitor.distance?.meters || 0);

  const wyInputs = countPorts(wyrestorm.inputs);
  const cpInputs = countPorts(competitor.inputs);

  const wyOutputs = countPorts(wyrestorm.outputs);
  const cpOutputs = countPorts(competitor.outputs);

  if ((wyrestorm.video?.hdr || false) && !(competitor.video?.hdr || false)) {
    score += 15;
    reasons.push("WyreStorm supports HDR where competitor record does not");
  }

  if (wyDistance > cpDistance) {
    score += 15;
    reasons.push(`WyreStorm offers greater extension distance (${wyDistance}m vs ${cpDistance}m)`);
  }

  if (wyInputs > cpInputs) {
    score += 10;
    reasons.push(`WyreStorm provides more input capacity (${wyInputs} vs ${cpInputs})`);
  }

  if (wyOutputs > cpOutputs) {
    score += 10;
    reasons.push(`WyreStorm provides more output capacity (${wyOutputs} vs ${cpOutputs})`);
  }

  const keyDifferentiators = ["video wall", "matrix switching", "usb routing", "byod", "poh", "poe", "cec"];
  for (const item of keyDifferentiators) {
    if (wyFeatures.has(item) && !cpFeatures.has(item)) {
      score += 8;
      reasons.push(`WyreStorm includes ${item} capability`);
    }
  }

  if (wyControl.has("tcp/ip") && !cpControl.has("tcp/ip")) {
    score += 6;
    reasons.push("WyreStorm offers TCP/IP control support");
  }

  if (wyControl.has("rs-232") && !cpControl.has("rs-232")) {
    score += 4;
    reasons.push("WyreStorm offers RS-232 control support");
  }

  if (wyrestorm.family === competitor.family) {
    score += 5;
    reasons.push("Directly aligned product family comparison");
  }

  const summary =
    reasons.length > 0
      ? reasons.slice(0, 3).join("; ")
      : "No strong differentiators detected from current starter dataset.";

  return { score, reasons, summary };
}