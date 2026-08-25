/**
 * GovernedDecisionPanel — Human-reviewed decision desk for compare results.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 */
import { useState } from "react";
import { governedDecisionLabel } from "../../lib/governedCompareRuntime";
import {
  saveCompetitorMatchDecision,
  type CompareDecisionType,
  type CompetitorMatchDecision,
} from "../../lib/competitorMatchDecisionLedger";
import { uniqueText } from "../../lib/repScript";
import { type ScoredCandidate } from "../../lib/compareVerdictPipeline";
import type { CompetitorProfile } from "./compareUtilities";
import {
  compareDecisionTone,
  compareDecisionIcon,
  compareDecisionButtonClass,
  governedEndpointRole,
  governedTransportClass,
  governedDecisionIdPart,
  isGovernedEvidenceUrl,
} from "./compareUtilities";

// ─── Main Component ───────────────────────────────────────────────────────────

export function GovernedDecisionPanel({
  profile,
  candidate,
  existingDecision,
  onSaved,
}: {
  profile: CompetitorProfile;
  candidate: ScoredCandidate | null;
  existingDecision: CompetitorMatchDecision | null;
  onSaved: () => void;
}) {
  const [reviewer, setReviewer] = useState(existingDecision?.reviewer ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(
    existingDecision?.evidence[0]?.sourceUrl ??
      profile.resolvedSpec?.sourceUrl ??
      "",
  );
  const [message, setMessage] = useState("");

  function saveDecision(
    decisionType: CompareDecisionType,
    reviewStatus: "approved" | "pending-review" = "approved",
  ): void {
    if (typeof window === "undefined") return;

    const reviewerName = reviewer.trim();
    const requiresApprovedReviewer = reviewStatus === "approved";

    if (requiresApprovedReviewer && !reviewerName) {
      setMessage("Enter the reviewer name before approving this decision.");
      return;
    }

    if (
      decisionType === "confirmed-equivalent" &&
      (!candidate ||
        candidate.verdict !== "GOOD MATCH" ||
        candidate.blockers.length > 0 ||
        candidate.unknowns.length > 0 ||
        !candidate.necessaryCoverage ||
        candidate.necessaryCoverage.failed > 0 ||
        candidate.necessaryCoverage.unknown > 0 ||
        candidate.necessaryCoverage.confirmed !== candidate.necessaryCoverage.total ||
        candidate.solutionType !== "direct-equivalent")
    ) {
      setMessage("Confirmed equivalent is only available when every necessary requirement is evidenced, no blockers or unknowns remain, and the result is a direct equivalent.");
      return;
    }

    if (
      decisionType === "confirmed-equivalent" &&
      !isGovernedEvidenceUrl(evidenceUrl.trim())
    ) {
      setMessage("Add a valid manufacturer or datasheet source URL before confirming equivalence.");
      return;
    }

    if (
      decisionType !== "no-suitable-match" &&
      decisionType !== "review-required" &&
      !candidate
    ) {
      setMessage("No WyreStorm candidate is available for this decision.");
      return;
    }

    const now = new Date().toISOString();
    const wyrestormSku =
      decisionType === "no-suitable-match" ? null : candidate?.product.sku ?? null;
    const sourceUrl = evidenceUrl.trim();
    const specs = profile.resolvedSpec?.specs;

    const governedDecision: CompetitorMatchDecision = {
      id: [
        governedDecisionIdPart(profile.brand),
        governedDecisionIdPart(profile.sku),
        governedDecisionIdPart(wyrestormSku ?? decisionType),
      ].join("--"),
      competitorManufacturer: profile.brand,
      competitorSku: profile.sku,
      fingerprint: {
        productClass: profile.productClass || "Unknown product class",
        endpointRole: governedEndpointRole(profile),
        transportClass: governedTransportClass(profile),
        codec: profile.requestedTags.find((tag) => /jpeg|h\.?26|sdvoe/i.test(tag)) ?? null,
        maxResolution: profile.resolvedSpec?.maxResolution ?? null,
        chroma: profile.resolvedSpec?.chroma ?? null,
        hdr: profile.videoTags.some((tag) => /hdr/i.test(tag)) || null,
        inputCount: profile.resolvedSpec?.inputCount ?? null,
        routedOutputCount: profile.resolvedSpec?.outputCount ?? null,
        mirroredOutputCount: null,
        loopOutputCount: null,
        usb: specs?.usbStandard ?? (profile.requestedTags.includes("usb") ? "USB requirement present" : null),
        audio: specs?.dante ? "Dante" : specs?.audioDeEmbed ? "Audio de-embed" : null,
        control: specs?.ethernetControl ? "Ethernet control" : specs?.rs232 ? "RS-232" : null,
        distanceMetres: specs?.hdbasetDistance ?? null,
        dependencies: candidate?.dependencies ?? [],
        notes: profile.resolvedSpec?.profileWarnings ?? [],
      },
      wyrestormSku,
      decisionType,
      reviewStatus,
      reviewer: reviewerName || null,
      reviewedAt: reviewStatus === "approved" ? now : null,
      matchedPoints: candidate?.matched ?? [],
      importantDifferences: uniqueText([
        ...(candidate?.mismatches ?? []),
        ...(candidate?.partialMatches ?? []),
        ...(candidate?.gaps ?? []),
      ], 12),
      dependencies: candidate?.dependencies ?? [],
      quoteBlockers: candidate?.blockers ?? [],
      evidence: isGovernedEvidenceUrl(sourceUrl)
        ? [
            {
              sourceUrl,
              sourceType: "manufacturer",
              checkedAt: now,
              note: "Reviewed from the Compare decision desk.",
            },
          ]
        : [],
      createdAt: existingDecision?.createdAt ?? now,
      updatedAt: now,
    };

    saveCompetitorMatchDecision(window.localStorage, governedDecision);
    setMessage(
      reviewStatus === "pending-review"
        ? "Saved as review required. It will not override heuristic matching until approved."
        : `${governedDecisionLabel(governedDecision)} saved as review evidence. Live matching will continue to use current product data.`,
    );
    onSaved();
  }

  const equivalentAllowed =
    Boolean(candidate) &&
    candidate?.verdict === "GOOD MATCH" &&
    candidate.blockers.length === 0;

  return (
    <section className="compare-native-card wm-ui-section wm-ui-card" data-wingman-governed-decision>
      <div className="compare-native-section-title wm-ui-title">
        <h3 className="wm-ui-title">Governed match decision</h3>
        <p className="wm-ui-copy">
          A reviewed decision overrides automatic ranking for this manufacturer and SKU.
        </p>
      </div>

      {existingDecision ? (
        <p className={`wm-ui-copy compare-governed-status compare-governed-status--${compareDecisionTone(existingDecision.decisionType)}`}>
          <span className="compare-decision-icon" aria-hidden="true">{compareDecisionIcon(existingDecision.decisionType)}</span>
          <strong>Current decision:</strong> {governedDecisionLabel(existingDecision)}
          {existingDecision.wyrestormSku ? ` - ${existingDecision.wyrestormSku}` : ""}
          {existingDecision.reviewer ? ` | Reviewer: ${existingDecision.reviewer}` : ""}
        </p>
      ) : (
        <p className="wm-ui-copy">
          No approved decision is stored yet. Automatic results remain advisory until reviewed.
        </p>
      )}

      <div className="wm-form-grid">
        <label className="wm-field">
          Reviewer
          <input
            className="wm-input"
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
            placeholder="Name of technical reviewer"
          />
        </label>
        <label className="wm-field">
          Manufacturer or datasheet source
          <input
            className="wm-input"
            value={evidenceUrl}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://manufacturer.example/product"
          />
        </label>
      </div>

      <div className="compare-native-action-row wm-ui-action-row wm-ui-card">
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("confirmed-equivalent", existingDecision)}`}
          disabled={!equivalentAllowed}
          onClick={() => saveDecision("confirmed-equivalent")}
          aria-pressed={existingDecision?.decisionType === "confirmed-equivalent"}
        >
          <span className="compare-decision-icon" aria-hidden="true">✓</span>
          Confirm equivalent
        </button>
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("closest-technical-match", existingDecision)}`}
          disabled={!candidate}
          onClick={() => saveDecision("closest-technical-match")}
          aria-pressed={existingDecision?.decisionType === "closest-technical-match"}
        >
          <span className="compare-decision-icon" aria-hidden="true">≈</span>
          Approve closest match
        </button>
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("architecture-alternative", existingDecision)}`}
          disabled={!candidate}
          onClick={() => saveDecision("architecture-alternative")}
          aria-pressed={existingDecision?.decisionType === "architecture-alternative"}
        >
          <span className="compare-decision-icon" aria-hidden="true">⇄</span>
          Approve architecture alternative
        </button>
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("review-required", existingDecision)}`}
          onClick={() => saveDecision("review-required", "pending-review")}
          aria-pressed={existingDecision?.decisionType === "review-required"}
        >
          <span className="compare-decision-icon" aria-hidden="true">!</span>
          Mark review required
        </button>
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("no-suitable-match", existingDecision)}`}
          onClick={() => saveDecision("no-suitable-match")}
          aria-pressed={existingDecision?.decisionType === "no-suitable-match"}
        >
          <span className="compare-decision-icon" aria-hidden="true">×</span>
          Reject: no suitable match
        </button>
      </div>

      {message ? <p className="compare-native-muted wm-ui-copy">{message}</p> : null}
    </section>
  );
}

export default GovernedDecisionPanel;
