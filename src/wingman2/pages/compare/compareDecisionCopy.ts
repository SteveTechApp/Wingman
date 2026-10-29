/**
 * What a governed decision is called, and how its tone is drawn.
 *
 * A governed decision reaches the cards as a decision type; this module is the
 * one place that turns it into the label, the icon and the button tone, plus the
 * endpoint role and transport class the governed run resolves from a profile.
 */
import {
  type CompareDecisionType,
  type CompareEndpointRole,
  type CompareTransportClass,
  type CompetitorMatchDecision,
} from "../../lib/competitorMatchDecisionLedger";
import type { CompetitorProfile } from "./compareTypes";

export function governedEndpointRole(profile: CompetitorProfile): CompareEndpointRole {
  const role = `${profile.role} ${profile.productClass}`.toLowerCase();

  if (/transceiver|encoder\/decoder|trx/.test(role)) return "transceiver";
  if (/encoder|transmitter|\btx\b/.test(role)) return "transmitter";
  if (/decoder|receiver|\brx\b/.test(role)) return "receiver";
  if (/matrix/.test(role)) return "matrix";
  if (/switcher|presentation/.test(role)) return "switcher";
  if (/extender|tx\/rx/.test(role)) return "extender-kit";
  if (/processor|multiview|video wall/.test(role)) return "processor";
  if (/controller|control/.test(role)) return "controller";
  if (/accessory|cable|mount|power supply/.test(role)) return "accessory";

  return "unknown";
}

export function governedTransportClass(profile: CompetitorProfile): CompareTransportClass {
  const transport = [
    profile.transport,
    profile.resolvedSpec?.transport,
    profile.resolvedSpec?.specs?.networkSpeed,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b10\s*g(?:be|bps)?\b|sdvoe/.test(transport)) return "avoip-10g";
  if (/\b1\s*g(?:be|bps)?\b|avoip|jpeg[\s-]?xs|h\.?26[45]/.test(transport)) return "avoip-1g";
  if (/hdbaset|hdbt|tps/.test(transport)) return "hdbaset";
  if (/usb/.test(transport) && /hdmi|video|hdbaset|wireless/.test(transport)) return "hybrid";
  if (/usb/.test(transport)) return "usb";
  if (/hdmi/.test(transport)) return "hdmi";

  return "unknown";
}

export function governedDecisionIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

export function isGovernedEvidenceUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export type CompareDecisionTone = "good" | "partial" | "alternative" | "review" | "reject";

export function compareDecisionTone(decisionType?: CompareDecisionType | null): CompareDecisionTone {
  if (decisionType === "confirmed-equivalent") return "good";
  if (decisionType === "closest-technical-match") return "partial";
  if (decisionType === "architecture-alternative") return "alternative";
  if (decisionType === "no-suitable-match") return "reject";
  return "review";
}

export function compareDecisionIcon(decisionType?: CompareDecisionType | null): string {
  if (decisionType === "confirmed-equivalent") return "\u2713";
  if (decisionType === "closest-technical-match") return "\u2248";
  if (decisionType === "architecture-alternative") return "\u21C4";
  if (decisionType === "no-suitable-match") return "\u00D7";
  return "!";
}

export function compareDecisionButtonClass(
  decisionType: CompareDecisionType,
  existingDecision?: CompetitorMatchDecision | null,
): string {
  const isSelected = existingDecision?.decisionType === decisionType;

  if (!isSelected) {
    return "compare-decision-button compare-decision-button--neutral";
  }

  const tone = compareDecisionTone(decisionType);
  return `compare-decision-button compare-decision-button--${tone} is-selected`;
}
