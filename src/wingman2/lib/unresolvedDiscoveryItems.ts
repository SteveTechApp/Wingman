/**
 * unresolvedDiscoveryItems — Extract unresolved, low-confidence, and inferred
 * discovery items for surfacing as risks and assumptions in proposal exports.
 *
 * These are items the salesperson captured during discovery but where the
 * interpretation confidence was low, the customer did not confirm the answer,
 * or the decision evidence marks the value as inferred or unknown. Surfacing
 * these in the proposal ensures the customer and approver can see exactly
 * which requirements still need verification before final design sign-off.
 */

import type { DiscoveryConversationItem } from "../data/projectStore";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UnresolvedDiscoveryItem = {
  /** Short label for the requirement area (e.g. "Signal standard") */
  field: string;
  /** What the customer said or what was inferred */
  capturedAnswer: string;
  /** Why this item is unresolved */
  reason: "low-confidence" | "unconfirmed" | "inferred" | "conflict";
  /** Confidence score if available (1-10) */
  confidenceScore?: number;
  /** The original question asked */
  question?: string;
};

export type DecisionEvidenceItem = {
  field: string;
  value: string;
  state: "confirmed" | "inferred" | "unknown" | "conflict";
  source: "customer" | "topology" | "workflow-inference" | "system";
  confidence: "high" | "medium" | "low";
  reason?: string;
};

// ─── Low-confidence threshold ───────────────────────────────────────────────

/**
 * Confidence scores below this threshold are treated as unresolved.
 * Score scale: 1 (weak keyword hit) → 10 (deliberate option pick).
 * Score 3 = "matched" tier; scores 1-2 = "low" tier.
 */
const LOW_CONFIDENCE_THRESHOLD = 3;

// ─── Friendly field labels ──────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  opportunity: "Room type",
  scale: "Room scale",
  sources: "Source count",
  displays: "Display count",
  "display-behaviour": "Display behaviour",
  signal: "Signal standard",
  distance: "Cable distance",
  usb: "USB requirements",
  audio: "Audio requirements",
  control: "Control requirements",
  network: "Network requirements",
  locations: "Locations",
  "locations-connections": "Locations and connections",
  "uc-purpose": "UC/camera purpose",
  budget: "Budget level",
  "video-wall": "Video wall requirements",
  "signal-direction": "Signal direction",
};

function friendlyFieldName(stepId: string): string {
  return FIELD_LABELS[stepId] ?? stepId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Extract from conversation ──────────────────────────────────────────────

function unresolvedFromConversation(
  conversation: DiscoveryConversationItem[],
): UnresolvedDiscoveryItem[] {
  const items: UnresolvedDiscoveryItem[] = [];

  for (const item of conversation) {
    const reasons: UnresolvedDiscoveryItem["reason"][] = [];

    // Low confidence score
    if (
      typeof item.confidenceScore === "number" &&
      item.confidenceScore < LOW_CONFIDENCE_THRESHOLD
    ) {
      reasons.push("low-confidence");
    }

    // Low confidence tier
    if (item.confidence === "low") {
      if (!reasons.includes("low-confidence")) reasons.push("low-confidence");
    }

    // Not confirmed with customer
    if (item.confirmed === false || item.confirmed === undefined) {
      reasons.push("unconfirmed");
    }

    // Skip fully-confirmed, high-confidence items
    if (reasons.length === 0) continue;

    // Skip items with no answer at all
    if (!item.answer && !item.note) continue;

    // Take the most severe reason
    const reason = reasons.includes("conflict") ? "conflict"
      : reasons.includes("low-confidence") ? "low-confidence"
      : reasons.includes("inferred") ? "inferred"
      : "unconfirmed";

    items.push({
      field: friendlyFieldName(item.stepId),
      capturedAnswer: item.note || item.answer || "",
      reason,
      confidenceScore: item.confidenceScore,
      question: item.question,
    });
  }

  return items;
}

// ─── Extract from decision evidence ─────────────────────────────────────────

function unresolvedFromDecisionEvidence(
  evidence: DecisionEvidenceItem[],
): UnresolvedDiscoveryItem[] {
  const items: UnresolvedDiscoveryItem[] = [];

  for (const item of evidence) {
    if (item.state === "confirmed") continue;

    let reason: UnresolvedDiscoveryItem["reason"];
    switch (item.state) {
      case "conflict":
        reason = "conflict";
        break;
      case "inferred":
        reason = "inferred";
        break;
      case "unknown":
        reason = "unconfirmed";
        break;
      default:
        continue;
    }

    items.push({
      field: friendlyFieldName(item.field),
      capturedAnswer: item.value || "Not captured",
      reason,
      confidenceScore: undefined,
      question: undefined,
    });
  }

  return items;
}

// ─── Deduplicate ────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<UnresolvedDiscoveryItem["reason"], number> = {
  conflict: 0,
  "low-confidence": 1,
  inferred: 2,
  unconfirmed: 3,
};

function deduplicate(items: UnresolvedDiscoveryItem[]): UnresolvedDiscoveryItem[] {
  const seen = new Map<string, UnresolvedDiscoveryItem>();

  for (const item of items) {
    const existing = seen.get(item.field);
    if (
      !existing ||
      SEVERITY_ORDER[item.reason] < SEVERITY_ORDER[existing.reason] ||
      (SEVERITY_ORDER[item.reason] === SEVERITY_ORDER[existing.reason] &&
        item.capturedAnswer.length > existing.capturedAnswer.length)
    ) {
      seen.set(item.field, item);
    }
  }

  return Array.from(seen.values());
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Extract all unresolved discovery items from conversation and decision
 * evidence. Returns a deduplicated list sorted by severity (conflicts first,
 * then low-confidence, then inferred, then unconfirmed).
 */
export function extractUnresolvedDiscoveryItems(options: {
  discoveryConversation?: DiscoveryConversationItem[];
  decisionEvidence?: DecisionEvidenceItem[];
}): UnresolvedDiscoveryItem[] {
  const fromConversation = options.discoveryConversation
    ? unresolvedFromConversation(options.discoveryConversation)
    : [];

  const fromEvidence = options.decisionEvidence
    ? unresolvedFromDecisionEvidence(options.decisionEvidence)
    : [];

  const all = deduplicate([...fromConversation, ...fromEvidence]);

  return all.sort((a, b) => SEVERITY_ORDER[a.reason] - SEVERITY_ORDER[b.reason]);
}

/**
 * Convert unresolved items to assumption strings suitable for the proposal
 * wizard's assumptions field.
 */
export function unresolvedToAssumptions(items: UnresolvedDiscoveryItem[]): string[] {
  return items.map((item) => {
    const prefix =
      item.reason === "conflict"
        ? `CONFLICT — ${item.field}`
        : item.reason === "low-confidence"
          ? `${item.field} (low confidence)`
          : item.reason === "inferred"
            ? `${item.field} (inferred)`
            : `${item.field}`;

    return `${prefix}: "${item.capturedAnswer}" — needs customer confirmation before final design sign-off.`;
  });
}

/**
 * Convert unresolved items to risk strings suitable for the DOCX
 * governanceWarnings / validationNotes fields.
 */
export function unresolvedToRisks(items: UnresolvedDiscoveryItem[]): string[] {
  return items.map((item) => {
    const severity =
      item.reason === "conflict"
        ? "BLOCKER"
        : item.reason === "low-confidence"
          ? "HIGH"
          : "MEDIUM";

    return `[${severity}] Discovery item "${item.field}" is ${item.reason === "conflict" ? "conflicting" : item.reason === "low-confidence" ? "low-confidence" : item.reason === "inferred" ? "inferred (not confirmed by customer)" : "unconfirmed"}: "${item.capturedAnswer}"`;
  });
}
