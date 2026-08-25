/**
 * compareUtilities.ts — Core comparison helper functions.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 * These functions handle spec analysis, comparison facts, and verdict logic.
 */
import {
  uniqueText,
  salesWhyBullets,
  salesImportantDifference,
  compactCompareQuoteChecks,
} from "../../lib/repScript";
import { type ScoredCandidate, type WyreStormProduct } from "../../lib/compareVerdictPipeline";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompareStage = "brand" | "sku" | "results";
export type CompareResultTab = "overview" | "cards" | "evidence";
export type CompareReportedStatus = "match" | "checks" | "partial" | "no-match";

export type CompetitorProfile = {
  brand: string;
  sku: string;
  rawText: string;
  productClass: string;
  role: string;
  transport: string;
  requestedTags: string[];
  videoTags: string[];
  knownProfile: Record<string, unknown> | null;
  resolvedSpec: {
    sourceUrl?: string;
    maxResolution?: string;
    chroma?: string;
    inputCount?: number;
    outputCount?: number;
    profileWarnings?: string[];
    specs?: {
      usbStandard?: string;
      dante?: boolean;
      audioDeEmbed?: boolean;
      ethernetControl?: boolean;
      rs232?: boolean;
      hdbasetDistance?: number;
    };
  } | null;
};

export type CompetitorSummary = {
  heading: string;
  detail: string;
  warning?: string;
  recognisedClass: string;
  role: string;
  signalDirection: string;
  transport: string;
  resolution: string;
  ecosystem: string;
  facts: Array<{ label: string; value: string }>;
  identityItems: string[];
  knownFeatures: string[];
  verifyItems: string[];
};

export type WyreStormSummary = {
  heading: string;
  detail: string;
  comparisonFacts: Array<{ label: string; value: string }>;
};

export type CompareCoreFact = {
  label: string;
  competitor: string;
  wyrestorm: string;
  result: string;
};

// ─── Spec Analysis ────────────────────────────────────────────────────────────

export function compareValueCount(value: string): number | null {
  const match = value.match(/(\d+)\s*(?:ports?|inputs?|outputs?)/i);
  return match ? Number(match[1]) : null;
}

export function compareSharesToken(value: string, tokens: string[]): boolean {
  const lower = value.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

export function compareOutputMode(value: string): "mirrored" | "loop" | "local-monitor" | "routed" | "unknown" {
  const lower = value.toLowerCase();
  if (/mirrored/i.test(lower)) return "mirrored";
  if (/loop/i.test(lower)) return "loop";
  if (/local.?monitor/i.test(lower)) return "local-monitor";
  if (/routed/i.test(lower)) return "routed";
  return "unknown";
}

export function compareOutputFamilies(value: string): string[] {
  const families: string[] = [];
  if (/hdmi/i.test(value)) families.push("HDMI");
  if (/hdbaset/i.test(value)) families.push("HDBaseT");
  if (/usb/i.test(value)) families.push("USB");
  if (/ethernet|network/i.test(value)) families.push("Ethernet");
  return families;
}

export function compareOutputEvidenceResult(competitor: string, wyrestorm: string): string | null {
  const compFamilies = compareOutputFamilies(competitor);
  const wyFamilies = compareOutputFamilies(wyrestorm);

  if (compFamilies.length === 0 || wyFamilies.length === 0) return null;

  const shared = compFamilies.filter((f) => wyFamilies.includes(f));
  if (shared.length === compFamilies.length && shared.length === wyFamilies.length) {
    return "Both systems provide the same output families.";
  }
  if (shared.length > 0) {
    return `Shared families: ${shared.join(", ")}.`;
  }
  return "Output families differ.";
}

export function compareRowResult(label: string, competitor: string, wyrestorm: string): string {
  if (!competitor && !wyrestorm) return "Both need verification";
  if (!competitor) return "Competitor needs verification";
  if (!wyrestorm) return "WyreStorm needs verification";

  const compLower = competitor.toLowerCase();
  const wyLower = wyrestorm.toLowerCase();

  // Exact match
  if (compLower === wyLower) return "Same";

  // Port count comparison
  const compCount = compareValueCount(competitor);
  const wyCount = compareValueCount(wyrestorm);
  if (compCount !== null && wyCount !== null) {
    if (compCount === wyCount) return "Same count";
    if (compCount > wyCount) return `Competitor has ${compCount - wyCount} more`;
    return `WyreStorm has ${wyCount - compCount} more`;
  }

  // Token sharing
  if (compareSharesToken(competitor, ["4k", "60hz", "hdcp", "hdr"])) {
    if (compareSharesToken(wyrestorm, ["4k", "60hz", "hdcp", "hdr"])) {
      return "Similar capability";
    }
  }

  return "Different";
}

// ─── Comparison Facts ─────────────────────────────────────────────────────────

export function buildCoreComparisonFacts(
  competitor: CompetitorSummary,
  _competitorProfile: CompetitorProfile,
  wyrestorm: WyreStormSummary,
  candidate: ScoredCandidate,
): CompareCoreFact[] {
  const facts: CompareCoreFact[] = [];

  // I/O comparison
  facts.push({
    label: "Inputs",
    competitor: competitor.facts.find((f) => /input/i.test(f.label))?.value || "Unknown",
    wyrestorm: wyrestorm.comparisonFacts.find((f) => /input/i.test(f.label))?.value || "Unknown",
    result: compareRowResult(
      "Inputs",
      competitor.facts.find((f) => /input/i.test(f.label))?.value || "",
      wyrestorm.comparisonFacts.find((f) => /input/i.test(f.label))?.value || "",
    ),
  });

  facts.push({
    label: "Outputs",
    competitor: competitor.facts.find((f) => /output/i.test(f.label))?.value || "Unknown",
    wyrestorm: wyrestorm.comparisonFacts.find((f) => /output/i.test(f.label))?.value || "Unknown",
    result: compareRowResult(
      "Outputs",
      competitor.facts.find((f) => /output/i.test(f.label))?.value || "",
      wyrestorm.comparisonFacts.find((f) => /output/i.test(f.label))?.value || "",
    ),
  });

  // Transport
  facts.push({
    label: "Connection",
    competitor: competitor.transport || "Unknown",
    wyrestorm: candidate.product.transport || "Unknown",
    result: compareRowResult("Connection", competitor.transport, candidate.product.transport),
  });

  // Resolution
  facts.push({
    label: "Resolution",
    competitor: competitor.resolution || "Unknown",
    wyrestorm: wyrestorm.comparisonFacts.find((f) => /resolution/i.test(f.label))?.value || "Unknown",
    result: compareRowResult(
      "Resolution",
      competitor.resolution,
      wyrestorm.comparisonFacts.find((f) => /resolution/i.test(f.label))?.value || "",
    ),
  });

  return facts;
}

// ─── Status & Verdict ─────────────────────────────────────────────────────────

export const COMPARE_REPORTED_STATUS_OPTIONS: Array<{
  key: CompareReportedStatus;
  label: string;
}> = [
  { key: "match", label: "Match" },
  { key: "checks", label: "Checks required" },
  { key: "partial", label: "Partial match" },
  { key: "no-match", label: "No match" },
];

export function CompareReportedStatusRail({
  status,
}: {
  status: CompareReportedStatus;
}) {
  return (
    <div
      className="compare-reported-status-rail"
      role="list"
      aria-label="Comparison result status"
    >
      <span className="compare-reported-status-label">Assessment</span>
      {COMPARE_REPORTED_STATUS_OPTIONS.filter((option) => option.key === status).map((option) => (
        <span
          key={option.key}
          role="listitem"
          className={`compare-reported-status compare-reported-status--${option.key} is-active`}
          aria-current="true"
        >
          {option.label}
        </span>
      ))}
    </div>
  );
}

export function compareReportedStatus(
  candidate: ScoredCandidate,
  _competitor: CompetitorSummary,
): CompareReportedStatus {
  if (candidate.verdict === "GOOD MATCH") return "match";
  if (candidate.verdict === "PARTIAL MATCH") return "partial";
  if (candidate.verdict === "NO MATCH") return "no-match";
  if (candidate.checks.length > 0) return "checks";
  return "checks";
}

export function compareReportedStatusMeta(status: CompareReportedStatus): {
  heading: string;
  guidance: string;
} {
  switch (status) {
    case "match":
      return {
        heading: "Strong WyreStorm direction",
        guidance: "This competitor product has a direct or near-direct WyreStorm equivalent.",
      };
    case "checks":
      return {
        heading: "WyreStorm direction with checks",
        guidance: "A viable WyreStorm option exists but needs specific verification before quoting.",
      };
    case "partial":
      return {
        heading: "Partial WyreStorm direction",
        guidance: "This is a role-compatible alternative but does not cover all competitor features.",
      };
    case "no-match":
      return {
        heading: "No direct WyreStorm match",
        guidance: "No comparable WyreStorm product was found. Consider an architecture alternative or escalation.",
      };
  }
}

export function verdictClass(verdict: string): string {
  if (/good match/i.test(verdict)) return "verdict--match";
  if (/partial/i.test(verdict)) return "verdict--partial";
  if (/no match/i.test(verdict)) return "verdict--no-match";
  if (/verify/i.test(verdict)) return "verdict--verify";
  return "verdict--unknown";
}

// ─── Sales Copy ───────────────────────────────────────────────────────────────

export function salesAskCustomer(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  const questions: string[] = [];

  if (candidate.checks.length > 0) {
    questions.push(candidate.checks[0]);
  }

  if (/matrix/i.test(competitor.recognisedClass) && candidate.product.productClass !== "Matrix") {
    questions.push("Confirm the customer needs matrix routing vs. AVoIP distribution.");
  }

  if (/hdbaset/i.test(competitor.transport) && !/hdbaset/i.test(candidate.product.transport)) {
    questions.push("Confirm cable infrastructure supports the proposed transport.");
  }

  return questions.slice(0, 3);
}

// ─── Summary Builders ─────────────────────────────────────────────────────────

export function buildWyrestormSummary(candidate: ScoredCandidate): WyreStormSummary {
  return {
    heading: `${candidate.product.sku} — ${candidate.product.family}`,
    detail: candidate.product.name || candidate.product.family,
    comparisonFacts: [
      { label: "Inputs", value: String(candidate.product.productClass || "Confirm") },
      { label: "Outputs", value: String(candidate.product.transport || "Confirm") },
      { label: "Resolution", value: "4K60" },
    ],
  };
}

// ─── Evidence Helpers ─────────────────────────────────────────────────────────

export function surfaceValueResolved(value: string): boolean {
  return value.length > 0 && !/unknown|confirm|needs verification/i.test(value);
}

export function openGuruForCompareResult(
  competitor: CompetitorSummary,
  candidate: ScoredCandidate,
  status: CompareReportedStatus,
): void {
  // Open the Guru drawer with context about this comparison
  const event = new CustomEvent("wingman:guru-open", {
    detail: {
      context: "compare-result",
      competitor: `${competitor.heading}`,
      candidate: candidate.product.sku,
      status,
    },
  });
  window.dispatchEvent(event);
}

export function ProductMoreLink({ sku }: { sku: string }): JSX.Element {
  return (
    <a
      className="compare-native-more wm-ui-button wm-ui-button-secondary"
      href={`/wingman/product-call-cards/${encodeURIComponent(sku)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Source/spec page
    </a>
  );
}

// ─── Decision Helpers ────────────────────────────────────────────────────────

export function compareDecisionTone(decisionType?: string | null): string {
  if (!decisionType) return "unknown";
  if (decisionType === "confirmed-equivalent") return "good";
  if (decisionType === "closest-technical-match") return "good";
  if (decisionType === "architecture-alternative") return "alternative";
  if (decisionType === "review-required") return "review";
  if (decisionType === "no-suitable-match") return "reject";
  return "unknown";
}

export function compareDecisionIcon(decisionType?: string | null): string {
  if (!decisionType) return "?";
  if (decisionType === "confirmed-equivalent") return "✓";
  if (decisionType === "closest-technical-match") return "≈";
  if (decisionType === "architecture-alternative") return "⇄";
  if (decisionType === "review-required") return "!";
  if (decisionType === "no-suitable-match") return "×";
  return "?";
}

export function compareDecisionButtonClass(
  buttonType: string,
  existingDecision?: { decisionType?: string } | null,
): string {
  const isActive = existingDecision?.decisionType === buttonType;
  return isActive ? "compare-decision-button--active" : "";
}

export function governedEndpointRole(profile: CompetitorProfile): "transmitter" | "receiver" | "transceiver" | "matrix" | "switcher" | "extender-kit" | "processor" | "controller" | "accessory" | "unknown" {
  const role = `${profile.role} ${profile.productClass}`.toLowerCase();

  if (/transceiver|encoder\/decoder|trx/.test(role)) return "transceiver";
  if (/encoder|transmitter|\btx\b/.test(role)) return "transmitter";
  if (/decoder|receiver|\brx\b/.test(role)) return "receiver";
  if (/matrix/.test(role)) return "matrix";
  if (/switch|splitter/.test(role)) return "switcher";
  if (/extender|repeater|kit/.test(role)) return "extender-kit";
  if (/processor|wall/.test(role)) return "processor";
  if (/control/.test(role)) return "controller";
  return "unknown";
}

export function governedTransportClass(profile: CompetitorProfile): "hdmi" | "hdbaset" | "avoip-1g" | "avoip-10g" | "usb" | "hybrid" | "unknown" {
  const transport = profile.transport.toLowerCase();

  if (/hdmi/.test(transport)) return "hdmi";
  if (/hdbaset/.test(transport)) return "hdbaset";
  if (/ip|network|ethernet/.test(transport)) return "avoip-1g";
  if (/usb/.test(transport)) return "usb";
  return "unknown";
}

export function governedDecisionIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isGovernedEvidenceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// ─── Re-exports for backward compatibility ────────────────────────────────────

export { uniqueText, salesWhyBullets, salesImportantDifference, compactCompareQuoteChecks };
