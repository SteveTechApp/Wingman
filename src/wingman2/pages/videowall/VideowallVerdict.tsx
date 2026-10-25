import {
  wallDecisionSummary,
  wallFamilyProfiles,
  wallFitReasons,
  type WallDecision,
} from "../../lib/videowallDecision";
import { WALL_RESEARCH_DATE, type WallOption, type WallRequirements } from "../../lib/videowallOptions";

export function VideowallVerdict({ decision, selected, requirements, extraChecks = [], variantLabel = null, onUse, onUnblock, onApply }: {
  decision: WallDecision;
  selected: WallOption | null;
  requirements: WallRequirements;
  /** Requirements captured outside the product model, such as HDCP or 24/7 operation. */
  extraChecks?: string[];
  /** The build the equipment and checks below are quoted in, when it is not the catalogue one. */
  variantLabel?: string | null;
  onUse: (id: string) => void;
  onUnblock: (next: WallRequirements) => void;
  onApply: (id: string) => void;
}) {
  if (!selected) {
    return (
      <section className="vw-builder-verdict" aria-labelledby="wall-selected-title">
        <p className="wm-ui-kicker">Wingman&apos;s decision</p>
        <h2 id="wall-selected-title">These answers do not meet in one design yet</h2>
        <p className="vw-builder-verdict-summary">{wallDecisionSummary(decision)}</p>
        <ol className="vw-builder-unblockers">
          {decision.unblockers.map((unblocker, index) => (
            <li key={unblocker.label}>
              <div>
                <strong>{unblocker.label}</strong>
                <p>{unblocker.detail}</p>
                <small>Opens {unblocker.unlocks} design{unblocker.unlocks === 1 ? "" : "s"}.</small>
              </div>
              <button type="button" onClick={() => onUnblock(unblocker.next)}>
                {index === 0 ? "Use this decision" : "Use this"}
              </button>
            </li>
          ))}
        </ol>
        <p className="vw-builder-note">
          The alternative is a requirement change, not a product compromise. Every change above is recorded in the saved design.
        </p>
      </section>
    );
  }

  const family = wallFamilyProfiles[selected.id];
  const isLead = decision.recommended?.option.id === selected.id;
  const reasons = isLead ? decision.recommended!.reasons : wallFitReasons(selected, requirements);
  const checks = [...new Set([...selected.checks, ...extraChecks])];

  return (
    <section className="vw-builder-verdict" aria-labelledby="wall-selected-title">
      <div className="vw-builder-verdict-head">
        <div>
          <p className="wm-ui-kicker">{isLead ? "Wingman's decision" : "Your selection"}</p>
          <h2 id="wall-selected-title">{selected.title}</h2>
          <p className="vw-builder-verdict-family">{family?.label} · {family?.rationale}</p>
          {/* The part numbers and the check below follow the build, so the
              title says which build they are rather than leaving a rep to
              infer it from a swapped SKU. */}
          {variantLabel ? (
            <p className="vw-builder-verdict-build" data-testid="videowall-selected-build">Ordering build: {variantLabel}</p>
          ) : null}
        </div>
        <span className="vw-builder-verdict-status">{isLead ? "Recommended" : "Not the recommendation"}</span>
      </div>
      <p className="vw-builder-verdict-summary">{wallDecisionSummary(decision)}</p>

      {!isLead && decision.recommended ? (
        <div className="vw-builder-verdict-switch">
          <p>Wingman still recommends <strong>{decision.recommended.headline}</strong> for these answers.</p>
          <button type="button" onClick={() => onUse(decision.recommended!.option.id)}>Use the recommendation</button>
        </div>
      ) : null}

      {/* The answer in plain words comes before its evidence: this is the route
          the signal takes, which a rep can read out to a customer, and the
          reasons and checks below say why it is right. */}
      <ol className="vw-builder-path" aria-label="Signal path">
        {selected.path.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
      </ol>

      <div className="vw-builder-verdict-fit">
        <h3>Why this meets the need</h3>
        <ul className="vw-builder-reasons">
          {reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </div>

      {/* A working checklist, not part of the pitch: folded to its count so the
          decision is not read through six warnings a rep needs at ordering time. */}
      <details className="vw-builder-checks-details">
        <summary>
          <h3>Confirm before ordering</h3>
          <span>{checks.length} checks</span>
        </summary>
        <ul className="vw-builder-checks">
          {checks.map((check) => <li key={check}>{check}</li>)}
        </ul>
        <div className="vw-builder-references">
          {selected.sources.map((item) => (
            <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.label} ↗</a>
          ))}
        </div>
        <p className="vw-builder-note">Manufacturer references checked {WALL_RESEARCH_DATE}.</p>
      </details>

      <div className="vw-builder-equipment">
        <h3>Equipment allowance</h3>
        <div className="vw-builder-table-wrap">
          <table>
            <thead><tr><th scope="col">Qty</th><th scope="col">Product</th><th scope="col">Purpose</th></tr></thead>
            <tbody>
              {selected.equipment.map((item) => (
                <tr key={`${item.sku}-${item.role}`}>
                  <td>{item.quantity}</td>
                  <th scope="row">{item.sku}</th>
                  <td>{item.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="vw-builder-note">
          Allow separately for displays, network switches, power, cables, transport, mounting and control programming.
          V2 encoder/receiver ordering codes need local catalogue confirmation.
        </p>
      </div>

      {decision.alternative && isLead ? (
        <div className="vw-builder-alternative">
          <div>
            <p className="wm-ui-kicker">If that is not right</p>
            <h3>{decision.alternative.headline}</h3>
            <p>{decision.alternative.when}</p>
            <small>{decision.alternative.family.label} · {decision.alternative.family.rationale}</small>
          </div>
          <button type="button" onClick={() => onApply(decision.alternative!.option.id)}>
            Show this design
          </button>
        </div>
      ) : null}
    </section>
  );
}
