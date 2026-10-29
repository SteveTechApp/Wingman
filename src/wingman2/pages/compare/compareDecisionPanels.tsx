/**
 * The panels that state the decision: battle card, minimum cards, governed run,
 * the summary and the live-research status.
 *
 * These are the surfaces a rep reads last, so they carry the verdict's own words
 * and the governed evidence beside them. Presentational, like the search cards:
 * the page owns the run and the selection, this module owns what the decision
 * looks like once it exists.
 */
import { useState } from "react";
import { compareVerdictTier, uniqueText, commercializeCompareCopy } from "../../lib/repScript";
import { type ScoredCandidate } from "../../features/compare";
import {
  saveCompetitorMatchDecision,
  type CompareDecisionType,
  type CompetitorMatchDecision,
} from "../../lib/competitorMatchDecisionLedger";
import { governedDecisionLabel } from "../../lib/governedCompareRuntime";
import type { CompareCoreFact, CompetitorProfile, CompetitorSummary } from "./compareTypes";
import { buildCoreComparisonFacts, buildWyrestormSummary } from "./compareComparisonFacts";
import {
  type LiveCompetitorResearchAssessment,
  type LiveCompetitorResearchStatus,
} from "../../lib/liveCompetitorResearch";
import {
  compareDecisionButtonClass,
  compareDecisionIcon,
  compareDecisionTone,
  governedDecisionIdPart,
  governedEndpointRole,
  governedTransportClass,
  isGovernedEvidenceUrl,
} from "./compareDecisionCopy";
import { compareReportedStatus, compareReportedStatusMeta } from "./compareReportedStatus";
import { CompareReportedStatusRail } from "./compareSearchCards";

export type PrimaryBattleCardSide = "competitor" | "wyrestorm";

export function primaryBattleCardFamily(productClass: string): string {
  const value = productClass.toLowerCase();
  if (/matrix|switcher|classroom/.test(value)) return "Switcher / matrix";
  if (/av-over-ip|avoip|networkhd|encoder|decoder|transceiver/.test(value)) return "AV-over-IP endpoint";
  if (/hdbaset|extender/.test(value)) return "Extender / HDBaseT";
  if (/distribution|splitter|\bda\b/.test(value)) return "Distribution";
  if (/wireless|\buc\b|byom/.test(value)) return "Wireless / UC";
  if (/multiview|video wall|processor/.test(value)) return "Video processing";
  return "Specialist device";
}

export const PRIMARY_BATTLE_GROUPS = [
  { key: "connections", label: "Connections", fields: ["Inputs", "Outputs", "Other video I/O", "USB", "Control / network"] },
  { key: "capabilities", label: "Capabilities", fields: ["HDMI / HDCP", "Network class"] },
  { key: "performance", label: "Performance", fields: ["HDBaseT class / reach", "Max resolution", "Transport", "Signal direction"] },
] as const;

export function PrimaryBattleCard({
  side,
  eyebrow,
  heading,
  detail,
  productClass,
  rows,
  matchTone,
}: {
  side: PrimaryBattleCardSide;
  eyebrow: string;
  heading: string;
  detail: string;
  productClass: string;
  rows: CompareCoreFact[];
  matchTone?: ReturnType<typeof compareVerdictTier>["tone"];
}) {
  const valueFor = (row: CompareCoreFact): string => row[side] || "Needs verification";
  const visibleGroups = PRIMARY_BATTLE_GROUPS.map((group) => ({
    ...group,
    rows: group.fields
      .map((field) => rows.find((row) => row.label === field))
      .filter((row): row is CompareCoreFact => Boolean(row)),
  })).filter((group) => group.rows.length > 0);

  return (
    <article
      className={`compare-compact-result__product compare-primary-battle-card compare-primary-battle-card--${side} wm-ui-card${side === "wyrestorm" ? " compare-compact-result__product--wyrestorm" : ""}`}
      aria-label={side === "competitor" ? "Competitor product card" : "WyreStorm product card"}
      data-match-tone={side === "wyrestorm" ? matchTone : undefined}
    >
      <header className="compare-primary-battle-card__header">
        <span>{eyebrow}</span>
        <strong>{heading}</strong>
        <small>{detail}</small>
        <p>{primaryBattleCardFamily(productClass)} · {productClass}</p>
      </header>
      <div className="compare-primary-battle-card__sections">
        {visibleGroups.map((group) => (
          <section className={`compare-primary-battle-card__section compare-primary-battle-card__section--${group.key}`} key={group.key} aria-label={group.label}>
            <h3>{group.label}</h3>
            <dl>
              {group.rows.map((row) => (
                <div key={row.label} data-evidence-state={/needs verification|not verified/i.test(valueFor(row)) ? "unverified" : "verified"}>
                  <dt>{row.label}</dt>
                  <dd>{valueFor(row)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </article>
  );
}

// WINGMAN_MINIMUM_COMPARE_CARDS_V2
export function MinimumCompareCards({ competitor, competitorProfile, candidate }: {
  competitor: CompetitorSummary;
  competitorProfile: CompetitorProfile;
  candidate: ScoredCandidate | null;
}) {
  const status = compareReportedStatus(candidate, competitor);
  const statusMeta = compareReportedStatusMeta(status);
  const evidencePending = status === "no-match" && !competitorProfile.resolvedSpec;
  const matchTone = compareVerdictTier(status, { evidencePending }).tone;
  const wyrestorm = candidate ? buildWyrestormSummary(candidate) : null;
  const noMatchFactPriority = (label: string): number => {
    if (/^inputs$/i.test(label)) return 0;
    if (/^outputs$/i.test(label)) return 1;
    return 2;
  };
  const confirmedRoutedFacts = [
    competitorProfile.resolvedSpec?.inputCount
      ? { label: "Inputs", value: `${competitorProfile.resolvedSpec.inputCount}x routed source inputs` }
      : null,
    competitorProfile.resolvedSpec?.outputCount
      ? { label: "Outputs", value: `${competitorProfile.resolvedSpec.outputCount}x routed display outputs` }
      : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));
  const rows = candidate && wyrestorm
    ? buildCoreComparisonFacts(competitor, competitorProfile, wyrestorm, candidate).slice(0, 12)
    : [...confirmedRoutedFacts, ...competitor.facts.filter((fact) => !confirmedRoutedFacts.some((confirmed) => confirmed.label === fact.label))]
        .sort((a, b) => noMatchFactPriority(a.label) - noMatchFactPriority(b.label))
        .slice(0, 12)
        .map((fact) => ({ label: fact.label, competitor: fact.value, wyrestorm: "", result: "" }));
  const reason = candidate
    ? commercializeCompareCopy(candidate.matched[0] || candidate.partialMatches[0] || candidate.mismatches[0] || candidate.unknowns[0] || statusMeta.guidance)
    : competitorProfile.resolvedSpec?.inputCount && competitorProfile.resolvedSpec?.outputCount
      ? `No current WyreStorm candidate satisfies the confirmed ${competitorProfile.resolvedSpec.inputCount}x${competitorProfile.resolvedSpec.outputCount} routed I/O requirement without an input or output capacity shortfall.`
    : competitor.warning || "The available evidence does not support a safe WyreStorm equivalent.";
  const closestOnly = Boolean(candidate && status === "no-match");
  const visibleHeading = closestOnly ? "No direct equivalent — closest option shown" : statusMeta.heading;
  const visibleGuidance = closestOnly
    ? "This product performs a similar job, but it has confirmed differences. Use the comparison below to decide whether those differences matter in this project."
    : reason;
  const importantDifferences = candidate
    ? uniqueText([...candidate.mismatches, ...candidate.gaps, ...candidate.blockers], 4)
        .map((item) => commercializeCompareCopy(item))
    : [];
  return (
    <section className="compare-compact-result wm-ui-section wm-ui-card" aria-label="Compare product cards">
      <CompareReportedStatusRail status={status} />
      <header className="compare-compact-result__headline"><div><h2 className="wm-ui-title">{visibleHeading}</h2><p className="wm-ui-copy">{visibleGuidance}</p></div></header>
      <div className="compare-compact-result__products">
        <PrimaryBattleCard side="competitor" eyebrow="Competitor product" heading={competitor.heading} detail={competitor.detail} productClass={competitor.recognisedClass} rows={rows} />
        <span className="compare-compact-result__arrow" aria-hidden="true">→</span>
        {candidate && wyrestorm
          ? <PrimaryBattleCard side="wyrestorm" eyebrow="WyreStorm alternative" heading={candidate.product.sku} detail={candidate.product.name} productClass={wyrestorm.productType} rows={rows} matchTone={matchTone} />
          : <article className="compare-compact-result__product compare-compact-result__product--wyrestorm wm-ui-card" aria-label="No WyreStorm product match" data-match-tone={matchTone}><span>WyreStorm alternative</span><strong>No suitable match</strong><small>Confirm the competitor specification or add evidence before positioning an alternative.</small></article>}
      </div>
      {closestOnly && importantDifferences.length ? (
        <section className="compare-compact-result__warnings wm-ui-card" aria-label="Why this is not a direct match">
          <strong>Why this is not a direct match</strong>
          <ul>{importantDifferences.map((difference) => <li key={difference}>{difference}</li>)}</ul>
        </section>
      ) : null}
    </section>
  );
}

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

      {message ? <p className="wm-ui-copy">{message}</p> : null}
    </section>
  );
}

export function CompareSummaryPanel({ summary, requestLiveLookup, sourceUrl }: { summary: string; requestLiveLookup: boolean; sourceUrl: string }) {
  return (
    <details className="wm-ui-card wm-ui-copy">
      <summary>Copyable summary</summary>
      <pre>{summary}</pre>
      {requestLiveLookup ? <p className="wm-ui-copy">Live lookup recommended for source validation. {sourceUrl}</p> : null}
    </details>
  );
}

export function LiveResearchStatusCard({
  status,
  assessment,
  error,
}: {
  status: LiveCompetitorResearchStatus;
  assessment: LiveCompetitorResearchAssessment | null;
  error: string;
}) {
  if (status === "idle") return null;

  const stored = assessment?.sourceMode === "stored-intelligence";
  const heading =
    status === "loading"
      ? "Checking competitor intelligence"
      : status === "error"
        ? "Competitor research could not complete"
        : stored
          ? "Approved competitor intelligence loaded"
          : assessment?.outcome === "candidate"
            ? "Live research found a WyreStorm direction"
            : "Live research found no safe WyreStorm direction";

  const detail =
    status === "loading"
      ? "Wingman is checking approved competitor intelligence first, then live product evidence when needed."
      : status === "error"
        ? error || "Competitor research is unavailable. Use the evidence tools below to confirm the product manually."
        : stored
          ? assessment?.summary || "The approved competitor profile is now being used by Compare."
          : assessment?.outcome === "candidate"
            ? `${assessment.candidateSku} is a researched direction only. Review the evidence before quotation or approval.`
            : assessment?.summary || "No safe WyreStorm product match was established from the researched evidence.";

  return (
    <section
      className="wm-ui-card wm-ui-section"
      role="status"
      data-live-research-status={status}
    >
      <strong>{heading}</strong>
      <p className="wm-ui-copy">{detail}</p>
      {assessment?.sourceUrl ? (
        <a
          className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary"
          href={assessment.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open researched source
        </a>
      ) : null}
    </section>
  );
}
