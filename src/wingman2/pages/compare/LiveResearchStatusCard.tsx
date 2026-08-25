/**
 * LiveResearchStatusCard — Shows the status of live competitor research.
 *
 * Extracted from ComparePageNew.advanced.tsx for maintainability.
 */
import type { LiveCompetitorResearchAssessment, LiveCompetitorResearchStatus } from "../../lib/liveCompetitorResearch";

// ─── Main Component ───────────────────────────────────────────────────────────

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
      className="wm-ui-card wm-ui-section compare-live-research-status"
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

export default LiveResearchStatusCard;
