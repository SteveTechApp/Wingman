import type { DiscoverySummaryItem } from "./discoveryTypes";

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
  onConfigureVideoWall?: () => void;
  compact?: boolean;
};

export function DiscoverySummaryCard({
  items,
  isDiscoveryComplete,
  savedMessage,
  onMoveNext,
  onSaveProgress,
  videoWallRequired = false,
  onConfigureVideoWall,
  compact = false,
}: DiscoverySummaryCardProps) {
  return (
    <section className={`wm-discovery-summary-card wm-ui-section wm-ui-card wm-ui-copy${compact ? " is-compact" : ""}`}>
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
        {items.map((item) => (
          <article className="wm-ui-card" key={item.id}>
            <strong>{item.label}</strong>
            <span>{item.answer}</span>
            {item.note && <p className="wm-ui-copy">{item.note}</p>}
          </article>
        ))}
      </div>

      {videoWallRequired && onConfigureVideoWall && (
        <div className="wm-discovery-live-tip">
          <strong>Video wall configuration required</strong>
          <p className="wm-ui-copy">The selected display requirement needs wall type, layout, source-window and processing decisions before product matching.</p>
          <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={onConfigureVideoWall}>Configure video wall</button>
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
