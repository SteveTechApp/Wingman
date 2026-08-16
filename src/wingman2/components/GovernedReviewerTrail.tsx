/**
 * GovernedReviewerTrail - the human reviewer trail behind a "Verified governed
 * data" badge: who confirmed the profile, when, which spec-critical fields,
 * and the official source used. Rendered under the governed badge wherever a
 * verified product surfaces (Product Pitch workspace + result rows, Catalog
 * browser cards) so every surface tells the same story as the dashboard's
 * verified list. Only rendered when the governed profile is human-verified.
 */

import type { GovernedReviewerTrail as GovernedReviewerTrailData } from "../lib/productStoryEngine";
import { specCriticalFieldLabel } from "../lib/governedConfirmationBacklog";

function confirmedFieldLabel(field: string): string {
  // The review pass only records spec-critical keys; anything unexpected
  // renders as-is rather than being silently relabelled.
  if (field === "max-resolution" || field === "routed-io" || field === "power") {
    return specCriticalFieldLabel(field);
  }
  return field;
}

export function GovernedReviewerTrail({ trail }: { trail: GovernedReviewerTrailData }) {
  return (
    <div className="wm-governed-reviewer-trail" aria-label="Human confirmation trail">
      <span className="wm-governed-reviewer-trail__reviewer">
        Confirmed by {trail.verifiedBy}
        {trail.reviewedOn ? ` · ${trail.reviewedOn}` : ""}
      </span>
      {trail.confirmedFields.length > 0 ? (
        <span className="wm-governed-reviewer-trail__fields">
          {trail.confirmedFields.map(confirmedFieldLabel).join(" · ")}
        </span>
      ) : null}
      {trail.evidenceUrl ? (
        <a
          className="wm-governed-reviewer-trail__evidence"
          href={trail.evidenceUrl}
          target="_blank"
          rel="noreferrer"
          title="Official source used for this confirmation"
        >
          {trail.evidenceUrl.replace(/^https?:\/\//, "")}
        </a>
      ) : null}
    </div>
  );
}
