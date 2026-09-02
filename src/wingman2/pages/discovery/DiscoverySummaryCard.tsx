import { useState } from "react";
import type { DiscoverySummaryItem } from "./discoveryTypes";
import type { StrandedQuickStartDefault } from "./discoveryAnswerUtils";
import { DiscoveryStrandedDefaultsNotice, type DiscoveryApplicationDrift } from "./DiscoveryStrandedDefaultsNotice";

// Presentational "Captured brief" summary. Renders the captured answers/notes
// and, while discovery is still in progress, the move-next / save-progress
// actions. Extracted verbatim from DiscoveryPage.tsx.

type DiscoverySummaryCardProps = {
  items: DiscoverySummaryItem[];
  isDiscoveryComplete: boolean;
  savedMessage: string;
  onMoveNext: () => void;
  onSaveProgress: () => void;
  videoWallRequired?: boolean;
  videoWallConfigured?: boolean;
  onConfigureVideoWall?: () => void;
  /** Toggle a row between "confirmed with customer" and open. */
  onToggleConfirmed?: (stepId: string) => void;
  compact?: boolean;
  /** Quick-start defaults stranded by a later answer — visible beyond the step that caused them. */
  strandedQuickStart?: ReadonlyArray<StrandedQuickStartDefault>;
  /** Post-seed application switch: answers still following the previous profile. */
  applicationDrift?: DiscoveryApplicationDrift | null;
  /** Jump the interview to the step owning a stranded default. */
  onOpenStrandedStep?: (questionId: string) => void;
  /** Clear every stranded default from the answers at once. */
  onRemoveStranded?: () => void;
};

export function DiscoverySummaryCard({
  items,
  isDiscoveryComplete,
  savedMessage,
  onMoveNext,
  onSaveProgress,
  videoWallRequired = false,
  videoWallConfigured = false,
  onConfigureVideoWall,
  onToggleConfirmed,
  compact = false,
  strandedQuickStart = [],
  applicationDrift = null,
  onOpenStrandedStep,
  onRemoveStranded,
}: DiscoverySummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = compact && items.length > 6;
  const visibleItems = canExpand && !expanded ? items.slice(0, 6) : items;
  return (
    <section className={`wm-discovery-summary-card wm-ui-section wm-ui-card wm-ui-copy${compact ? " is-compact" : ""}${expanded ? " is-expanded" : ""}`}>
      <div className="wm-discovery-summary-heading wm-ui-card wm-ui-title wm-ui-copy">
        <span>{compact ? "Current room model" : "Captured brief"}</span>
        <p className="wm-ui-copy">
          {compact
            ? `${items.length} decision${items.length === 1 ? "" : "s"} captured. Review these as the room takes shape.`
            : isDiscoveryComplete
            ? "Use this as the working discovery summary before moving into product direction."
            : "Carry on when ready — the captured brief saves to your project, so the next step picks it up."}
        </p>
      </div>

      <div className="wm-discovery-summary-grid wm-ui-card wm-ui-copy">
        {visibleItems.map((item) => (
          <article className="wm-ui-card" key={item.id}>
            <div className="wm-discovery-summary-row">
              <div className="wm-discovery-summary-row-copy">
                <strong>{item.label}</strong>
                <span>{item.answer}</span>
                {item.note && <p className="wm-ui-copy">{item.note}</p>}
              </div>
              {onToggleConfirmed && (
                <button
                  className={`wm-discovery-confirm-toggle${item.confirmed ? " is-confirmed" : ""}`}
                  type="button"
                  aria-pressed={item.confirmed === true}
                  onClick={() => onToggleConfirmed(item.id)}
                  title={item.confirmed ? "Confirmed with customer — click to reopen" : "Not confirmed with customer — click to confirm"}
                >
                  {item.confirmed ? "Confirmed" : "Confirm with customer"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <DiscoveryStrandedDefaultsNotice items={strandedQuickStart} applicationDrift={applicationDrift} onOpenStep={onOpenStrandedStep} onRemoveStranded={onRemoveStranded} />

      {canExpand && (
        <button
          className="wm-discovery-summary-toggle"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Collapse model" : `View all ${items.length} decisions`}
        </button>
      )}

      {videoWallRequired && onConfigureVideoWall && (
        <div className={`wm-discovery-live-tip${videoWallConfigured ? " is-configured" : ""}`}>
          <strong>{videoWallConfigured ? "Video wall configured" : "Video wall configuration required"}</strong>
          <p className="wm-ui-copy">
            {videoWallConfigured
              ? "The wall type, layout, source-window and processing decisions are saved to this project and ready for product matching."
              : "The selected display requirement needs wall type, layout, source-window and processing decisions before product matching."}
          </p>
          <button
            className={`wm-ui-button ${videoWallConfigured ? "wm-ui-button-secondary" : "wm-ui-button-primary"}`}
            type="button"
            onClick={onConfigureVideoWall}
          >
            {videoWallConfigured ? "Review video wall" : "Configure video wall"}
          </button>
        </div>
      )}

      {!compact && !isDiscoveryComplete && (
        <div className="wm-discovery-capture-actions">
          <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={onMoveNext}>Next discovery question</button>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={onSaveProgress}>Save progress</button>
        </div>
      )}
      {!compact && !isDiscoveryComplete && savedMessage && <p className="wm-discovery-muted-note wm-ui-copy">{savedMessage}</p>}
    </section>
  );
}
