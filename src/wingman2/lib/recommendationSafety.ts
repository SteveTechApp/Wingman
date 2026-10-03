// Recommendation safety gates shared by the Recommendations page and tests.
// A product's marketing text is not enough to establish that it is a valid
// system-slot candidate: pairing, direction and dependency state matter.

function normalise(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function searchable(value: unknown, output: string[] = []): string[] {
  if (value === null || value === undefined) return output;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.push(String(value));
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => searchable(item, output));
    return output;
  }
  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => searchable(item, output));
  }
  return output;
}

export type RecommendationCandidateLike = {
  sku: string;
  product?: Record<string, unknown>;
};

/**
 * RX3-100 is a paired HDBaseT 3.0 receiver for SW-120-TX3 or MX-1007-HYB.
 * It is never a generic answer to "the display is far away".
 */
export function isRx3ReceiverPairConfirmed(context: readonly unknown[]): boolean {
  const text = searchable(context).join(" ");
  if (/\b(?:SW-120-TX3(?:-[A-Z0-9]+)?|MX-1007-HYB)\b/i.test(text)) return true;
  return /HDBaseT\s*3(?:\.0)?/.test(text) && /(?:transmitter|TX3|hybrid matrix)/i.test(text);
}

export function recommendationCandidateAllowed(
  decision: RecommendationCandidateLike,
  slotKind: string,
  context: readonly unknown[],
): boolean {
  const sku = normalise(decision.sku);
  const contextText = searchable(context).join(" ");

  // Keep RX3-100 out of every generic slot. It can only enter a deliberately
  // paired HDBaseT 3.0 design, never a broad extension candidate list.
  if (sku === "RX3-100") {
    return slotKind === "extension" && isRx3ReceiverPairConfirmed(context);
  }

  // A standalone extension slot needs a complete extender set. Receiver-only
  // and transmitter-only SKUs remain valid dependencies in an explicitly
  // paired or matrix design, but cannot lead a generic one-link solution.
  if (slotKind === "extension" && /\bextension\b/i.test(contextText) &&
      !/\b(?:matrix|transmitter|TX)\b/i.test(contextText)) {
    return /^EX-/.test(sku);
  }

  return true;
}

export function shouldShowRecommendationAlternatives(explicitlyRequested: boolean): boolean {
  return explicitlyRequested;
}
