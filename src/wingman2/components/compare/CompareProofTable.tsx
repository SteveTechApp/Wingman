/**
 * CompareProofTable — the "absolute proof" panel.
 *
 * Field-by-field spec table (competitor vs WyreStorm) with a verdict on every
 * row, followed by the evidence sources both columns were read from, and the
 * WyreStorm advantage rows for sales positioning.
 */

import type { FieldVerdict, ShowdownMatch, SpecSheet } from "../../lib/compareSpecEngine";

const VERDICT_LABEL: Record<FieldVerdict["verdict"], string> = {
  match: "MATCH",
  exceeds: "WYRESTORM WINS",
  gap: "GAP",
  unverified: "UNVERIFIED",
};

export function CompareProofTable({
  competitor,
  match,
}: {
  competitor: SpecSheet;
  match: ShowdownMatch;
}) {
  const ws = match.sheet;

  return (
    <section className="wm-proof" aria-label={`Spec proof: ${competitor.sku} vs ${ws.sku}`}>
      <header className="wm-proof__header">
        <h3>Proof of decision — verified spec comparison</h3>
        <p>
          {match.matchedFields} of {match.comparableFields} verified fields match or exceed
          {match.gapFields > 0 ? ` · ${match.gapFields} gap${match.gapFields === 1 ? "" : "s"} to confirm` : " · no gaps found"}
        </p>
      </header>

      <table className="wm-proof__table">
        <thead>
          <tr>
            <th scope="col">Spec field</th>
            <th scope="col">{competitor.brand} {competitor.sku}</th>
            <th scope="col">WyreStorm {ws.sku}</th>
            <th scope="col">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {match.verdicts.map((row) => (
            <tr key={row.field} className={`wm-proof__row wm-proof__row--${row.verdict}`}>
              <th scope="row">{row.label}</th>
              <td>{row.competitorValue}</td>
              <td>{row.wyrestormValue}</td>
              <td>
                <span className={`wm-proof__verdict wm-proof__verdict--${row.verdict}`}>
                  {VERDICT_LABEL[row.verdict]}
                </span>
                {row.note ? <span className="wm-proof__note">{row.note}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {match.advantages.length > 0 ? (
        <section className="wm-proof__advantages" aria-label="WyreStorm advantages">
          <h4>Where WyreStorm out-performs</h4>
          <ul>
            {match.advantages.map((advantage) => (
              <li key={advantage}>{advantage}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {match.cautions.length > 0 ? (
        <section className="wm-proof__cautions" aria-label="Confirm before quoting">
          <h4>Confirm before quoting</h4>
          <ul>
            {match.cautions.map((caution) => (
              <li key={caution}>{caution}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="wm-proof__sources" aria-label="Evidence sources">
        <h4>Evidence sources</h4>
        <ul>
          {competitor.citations.map((citation) => (
            <li key={`comp-${citation.label}-${citation.url ?? citation.detail ?? ""}`}>
              <strong>{competitor.brand}:</strong>{" "}
              {citation.url ? (
                <a href={citation.url} target="_blank" rel="noreferrer">{citation.label}</a>
              ) : (
                citation.label
              )}
              {citation.detail ? ` — ${citation.detail}` : ""}
            </li>
          ))}
          {ws.citations.map((citation) => (
            <li key={`ws-${citation.label}-${citation.url ?? citation.detail ?? ""}`}>
              <strong>WyreStorm:</strong>{" "}
              {citation.url ? (
                <a href={citation.url} target="_blank" rel="noreferrer">{citation.label}</a>
              ) : (
                citation.label
              )}
              {citation.detail ? ` — ${citation.detail}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

export default CompareProofTable;
