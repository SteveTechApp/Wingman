// Customer-facing display helpers for the discovery conversation's capture
// confidence. The in-app review (DiscoveryConversationReview) and every
// exported document (proposal HTML/DOCX, discovery brief HTML/DOCX) must show
// the same trust level behind each you-said → matched pair, so the label
// wording lives here — one source of truth.

export type CaptureConfidence = "high" | "matched" | "low";

/** Human label for a conversation row's capture confidence. */
export function captureConfidenceLabel(
  confidence?: CaptureConfidence | null | string,
): string {
  if (confidence === "high") return "High confidence";
  if (confidence === "matched") return "Matched";
  if (confidence === "low") return "Low confidence — verify before quote";
  // Rows captured before confidence was recorded (or note-only captures) get
  // an honest placeholder rather than an invented tier.
  return "—";
}

/**
 * Formatted confidence score for a conversation row. Low rows are shown in a
 * way that makes the "verify before quote" flag prominent in exports: the
 * tier label carries the "verify before quote" wording, and the score appears
 * in the cell alongside it.
 */
export function captureConfidenceCell(
  confidence?: CaptureConfidence | null | string,
  score?: number | null,
): string {
  const label = captureConfidenceLabel(confidence);
  if (typeof score === "number" && Number.isFinite(score)) {
    return `${label} (${score})`;
  }
  return label;
}

/** True when a row is a partial keyword-only capture that should be re-verified before quoting. */
export function isLowConfidence(
  confidence?: CaptureConfidence | null | string,
): boolean {
  return confidence === "low";
}

/** Colour modifier used by the HTML brief for the confidence cell. */
export function captureConfidenceTone(
  confidence?: CaptureConfidence | null | string,
): "high" | "matched" | "low" | "none" {
  if (confidence === "high" || confidence === "matched" || confidence === "low") {
    return confidence;
  }
  return "none";
}

/** One-line explanation shown above the conversation table in exports. */
export const CAPTURE_CONFIDENCE_EXPLAINER =
  'The "Capture confidence" column shows how strongly the customer\'s wording matched the closest governed answer: "High confidence" is a strong exact match, "Matched" is a curated-phrase match, and "Low confidence — verify before quote" is a partial match that must be re-verified with the customer before quoting. The number in brackets is the match score behind the tier.';
