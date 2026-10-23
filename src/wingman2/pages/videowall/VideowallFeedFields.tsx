import {
  wallDisplayFeedCount,
  wallDisplayFeeds,
  wallFeedSummaryText,
  wallPanelCount,
  type WallRequirements,
} from "../../lib/videowallOptions";

/**
 * How many feeds reach the wall's displays, for the grouped LCD design. A feed
 * drives one display or a looped group of them, so the rep sets the count and
 * the grouping follows the array; the line underneath names which panels land
 * on which feed before the transport table quotes a cable for each one.
 */
export function VideowallFeedFields({ requirements, onChange }: {
  requirements: WallRequirements;
  onChange: (patch: Partial<WallRequirements>) => void;
}) {
  const panels = wallPanelCount(requirements);
  const feeds = wallDisplayFeeds(requirements);
  const active = wallDisplayFeedCount(requirements);
  // A small array offers every count; a large one offers the counts a wall is
  // actually built on so the row stays readable.
  const counts = panels <= 12
    ? Array.from({ length: panels }, (_, index) => index + 1)
    : [1, 2, 3, 4, 6, 8, Math.ceil(panels / 2), panels];
  const named = feeds.length <= 4 ? feeds : feeds.slice(0, 3);
  const grouping = `${named.map((feed) => feed.label).join(" · ")}${named.length < feeds.length ? ` · and ${feeds.length - named.length} more` : ""}`;

  return (
    <div className="vw-wizard-fieldset" data-testid="videowall-feeds">
      <p className="vw-wizard-label">Feeds to the displays</p>
      <div className="vw-wizard-chips" role="group" aria-label="Feeds to the displays">
        {counts.map((count) => (
          <button
            key={count}
            type="button"
            aria-pressed={active === count}
            onClick={() => onChange({ displayFeeds: count })}
          >
            <strong>{count}</strong>
            <span>{count === 1 ? "one feed" : "feeds"}</span>
          </button>
        ))}
      </div>
      <p className="vw-builder-starts-hint" data-testid="videowall-feed-groups">
        {`${grouping}. ${wallFeedSummaryText(requirements)}.`}
      </p>
    </div>
  );
}
