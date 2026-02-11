import { extractPlainText, extractKeyValueLines } from "./textExtractors";

export type Requirement = {
  key: string;
  value: string;
  confidence?: number; // 0..1
};

export type RequirementsResult = {
  rawText: string;
  requirements: Requirement[];
  kv?: Record<string, string>;
  meta?: Record<string, any>;
};

/**
 * Minimal requirements extraction to unblock builds.
 * Converts intake into rawText then pulls:
 *  - simple "Key: Value" lines
 *  - a few AV-ish heuristics (sources/displays/rooms)
 */
export function extractRequirements(input: unknown): RequirementsResult {
  const { text } = extractPlainText(input);
  const rawText = (text || "").trim();

  const kv = extractKeyValueLines(rawText);
  const requirements: Requirement[] = [];

  // Add key/value lines as requirements
  for (const k of Object.keys(kv)) {
    requirements.push({ key: k, value: kv[k], confidence: 0.7 });
  }

  // Heuristics (very light)
  const t = rawText.toLowerCase();

  const add = (key: string, value: string, confidence = 0.5) => {
    if (!value) return;
    requirements.push({ key, value, confidence });
  };

  // Room count guess
  const roomMatch = t.match(/(\d+)\s*(rooms|meeting rooms|classrooms|spaces)\b/);
  if (roomMatch) add("rooms", roomMatch[1], 0.6);

  // Display count guess
  const dispMatch = t.match(/(\d+)\s*(displays|screens|tvs|monitors)\b/);
  if (dispMatch) add("displays", dispMatch[1], 0.6);

  // Video wall hint
  if (t.includes("video wall") || t.includes("videowall")) add("solution", "video wall", 0.55);

  // AVoIP hint
  if (t.includes("av over ip") || t.includes("avoip") || t.includes("ndh") || t.includes("nhd")) add("transport", "AVoIP", 0.5);

  return {
    rawText,
    requirements,
    kv,
    meta: { extractor: "minimal-v1" }
  };
}

export default extractRequirements;