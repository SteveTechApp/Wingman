/**
 * CompareProofTable — the "absolute proof" panel.
 *
 * Field-by-field spec table (competitor vs WyreStorm) with a verdict on every
 * row, followed by the evidence sources both columns were read from, and the
 * WyreStorm advantage rows for sales positioning.
 */

import type { FieldProvenance, FieldVerdict, ShowdownMatch, SpecSheet } from "../../lib/compareSpecEngine";

const VERDICT_LABEL: Record<FieldVerdict["verdict"], string> = {
  match: "MATCH",
  exceeds: "WYRESTORM WINS",
  gap: "GAP",
  unverified: "UNVERIFIED",
};

/** Per-field provenance tag copy, weakest to strongest. */
const PROVENANCE_META: Record<FieldProvenance, { label: string; className: string }> = {
  unverified: { label: "Unverified", className: "wm-proof__provenance--unverified" },
  inferred: { label: "Inferred", className: "wm-proof__provenance--inferred" },
  official: { label: "Official", className: "wm-proof__provenance--official" },
  verified: { label: "Verified", className: "wm-proof__provenance--verified" },
};

const PROVENANCE_LADDER: FieldProvenance[] = ["unverified", "inferred", "official", "verified"];

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
          <span className={`wm-proof__weakest wm-proof__weakest--${match.provenance}`}>
            Weakest data tier: {PROVENANCE_META[match.provenance].label}
          </span>
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
              <td>
                {row.competitorValue}
                <span className={`wm-proof__provenance ${PROVENANCE_META[row.competitorProvenance].className}`}>
                  {PROVENANCE_META[row.competitorProvenance].label}
                </span>
              </td>
              <td>
                {row.wyrestormValue}
                {row.wyrestormProvenance === "verified" && ws.reviewerEvidence ? (
                  <a
                    className="wm-proof__provenance wm-proof__provenance--verified"
                    href={ws.reviewerEvidence.url}
                    target="_blank"
                    rel="noreferrer"
                    title={`Human-confirmed by ${ws.reviewerEvidence.reviewer}${ws.reviewerEvidence.reviewedOn ? ` on ${ws.reviewerEvidence.reviewedOn}` : ""} - official source`}
                  >
                    {PROVENANCE_META.verified.label}
                  </a>
                ) : (
                  <span className={`wm-proof__provenance ${PROVENANCE_META[row.wyrestormProvenance].className}`}>
                    {PROVENANCE_META[row.wyrestormProvenance].label}
                  </span>
                )}
              </td>
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

      <section className="wm-proof__provenance-legend" aria-label="Data provenance legend">
        <h4>Data provenance per field</h4>
        <p>
          {PROVENANCE_LADDER.map((tier) => (
            <span key={tier} className={`wm-proof__provenance ${PROVENANCE_META[tier].className}`}>
              {PROVENANCE_META[tier].label}
            </span>
          ))}
          <span className="wm-proof__provenance-copy">
            Verified = human-reviewed governed data · Official = structured source, review required ·
            Inferred = read from text · Unverified = no value resolved.
          </span>
        </p>
      </section>

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
