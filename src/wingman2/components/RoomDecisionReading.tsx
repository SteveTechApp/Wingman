import type { RoomDecision } from "../lib/roomBrief";

/**
 * The decided room, rendered once for both depths.
 *
 * The brief and the expert workspace ask their questions differently and owe
 * the same answer: the room's type, what it needs with the reason each
 * requirement was asked for, what a person still has to check on site, what the
 * decision took for granted, and what would change it. A surface that carried
 * its own version of that reading would be a second method in the shape of a
 * component, so this is the only place it is written.
 *
 * It renders the reading and not the page: the kicker and the room's title
 * belong to whichever surface is ending on it.
 */
export function RoomDecisionReading({ decision }: { decision: RoomDecision }) {
  return (
    <>
      <p className="wm-ui-copy">{decision.summary}</p>

      <div className="wm-section-card">
        <h3 className="wm-section-title">What this room needs</h3>
        <ul>
          {decision.requirements.map((requirement) => (
            <li key={requirement.key}>
              <strong>{requirement.label}</strong> — {requirement.quantity}
              <p className="wm-ui-copy">{requirement.because}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="wm-template-preview-split">
        <section>
          <h3>Check on site</h3>
          <ul>{decision.verifyOnSite.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section>
          <h3>Assumed</h3>
          <ul>{decision.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <div className="wm-section-card">
        <h3 className="wm-section-title">This changes if</h3>
        <ul>{decision.changesIf.map((item) => <li key={item}>{item}</li>)}</ul>
        {decision.unresolved.length ? (
          <p className="wm-ui-copy">
            The answers still fit {decision.unresolved.length} other room type
            {decision.unresolved.length === 1 ? "" : "s"}. Ask what would tell them apart before
            this is priced.
          </p>
        ) : null}
      </div>
    </>
  );
}
