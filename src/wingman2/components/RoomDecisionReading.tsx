import type { RoomDecision } from "../lib/roomBrief";

/** Shared decision detail rendered by both the focused brief and expert review. */
export function RoomDecisionReading({ decision }: { decision: RoomDecision }) {
  return <>
    <p className="wm-ui-copy">{decision.summary}</p>
    <div className="wm-section-card">
      <h3 className="wm-section-title">What this room needs</h3>
      <ul>{decision.requirements.map((requirement) => <li key={requirement.key}>
        <strong>{requirement.label}</strong> — {requirement.quantity}
        <p className="wm-ui-copy">{requirement.because}</p>
      </li>)}</ul>
    </div>
    <div className="wm-template-preview-split">
      <section><h3>Check on site</h3><ul>{decision.verifyOnSite.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3>Assumed</h3><ul>{decision.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>
    <div className="wm-section-card">
      <h3 className="wm-section-title">This changes if</h3>
      <ul>{decision.changesIf.map((item) => <li key={item}>{item}</li>)}</ul>
      {decision.unresolved.length ? <p className="wm-ui-copy">
        The answers still fit {decision.unresolved.length} other room type{decision.unresolved.length === 1 ? "" : "s"}. Ask what would tell them apart before the design is finalised.
      </p> : null}
    </div>
  </>;
}
