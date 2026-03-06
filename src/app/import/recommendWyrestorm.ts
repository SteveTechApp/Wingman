import * as React from "react";

export type WyrestormRecommendation = {
  summary: string;
  skus?: string[];
  notes?: string[];
  confidence?: number;
};

/**
 * Minimal stub to unblock builds.
 * Input is typically { rawText, requirements, kv } from extractRequirements().
 */
export function recommendWyrestorm(input: any): WyrestormRecommendation {
  const notes: string[] = [];
  const raw = (input?.rawText ?? input?.text ?? "").toString().toLowerCase();

  // Very light heuristics
  if (raw.includes("video wall") || raw.includes("videowall")) {
    notes.push("Detected video wall intent.");
    return { summary: "Consider Video Wall workflow (NHD + controller/processor).", skus: [], notes, confidence: 0.4 };
  }
  if (raw.includes("av over ip") || raw.includes("avoip") || raw.includes("nhd")) {
    notes.push("Detected AVoIP intent.");
    return { summary: "Consider NHD-based AVoIP solution.", skus: [], notes, confidence: 0.4 };
  }

  return { summary: "No strong match from stub recommender.", skus: [], notes, confidence: 0.2 };
}

export default recommendWyrestorm;