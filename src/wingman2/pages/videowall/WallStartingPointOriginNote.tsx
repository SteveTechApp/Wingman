import type { WallRequirements } from "../../lib/videowallOptions";
import {
  wallStartingPointDrift,
  type WallStartingPointOrigin,
} from "../../lib/wallStartingPointOrigin";

/**
 * The card this set of answers started on, and how far the room has moved it.
 *
 * A rep picks a card because it is close, not because it is right, so the panel
 * has to answer two questions without being opened: which wall was the starting
 * point, and what did I change. The count is the answer a rep checks before
 * saving ("three answers from the card, all deliberate"); the list is the one a
 * colleague reads afterwards to see what the room asked for.
 *
 * With no origin there is nothing to compare against — a wall answered from
 * scratch is its own starting point — so the panel renders nothing rather than
 * claiming an origin the rep never picked. Survey measurements are not answers:
 * they belong to one room, so measuring a cable does not change the count.
 */
export function WallStartingPointOriginNote({
  origin,
  requirements,
}: {
  origin?: WallStartingPointOrigin | null;
  requirements: WallRequirements;
}) {
  const drift = wallStartingPointDrift(origin, requirements);
  if (!drift) return null;

  return (
    <section className="vw-start-origin" data-testid="videowall-starting-point" data-starting-point={drift.card.key}>
      <p className="vw-start-origin-lead">
        <span>Started from</span>
        <strong>{drift.card.label}</strong>
      </p>
      {/*
        Not a live region: this is context, not a result. The save confirmation
        owns the status role on both views, and a count that announced itself
        every time an answer changed would talk over it.
      */}
      <p className="vw-start-origin-count" data-testid="videowall-starting-point-drift">
        {drift.text}
      </p>
      {drift.changes.length ? (
        <details className="vw-start-origin-changes" data-testid="videowall-starting-point-changes">
          <summary>
            See the {drift.changes.length} changed answer{drift.changes.length === 1 ? "" : "s"}
          </summary>
          <ul>
            {drift.changes.map((change) => (
              <li key={change.key} data-changed-answer={change.key}>
                <span>{change.label}</span>
                <span>
                  <s>{change.from}</s> → <strong>{change.to}</strong>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
