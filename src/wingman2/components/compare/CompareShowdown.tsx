/**
 * CompareShowdown - supplemental verified evidence view.
 *
 * Runs the spec-first engine (compareSpecEngine) for the selected competitor
 * brand + SKU, then renders:
 *   1. Competitor identity battle card (shown even before a match is chosen)
 *   2. Head-to-head battle cards with win/lose stat highlighting
 *   3. Proof table with citations + advantage rows
 *   4. "Print customer one-pager" export (printable HTML, no dependencies)
 *
 * Fail-closed: if the SKU is not in the verified catalogue, a coverage notice
 * is shown and NO match is guessed; the legacy evidence workflow handles the
 * data-gathering path.
 */

import { useEffect, useMemo, useState } from "react";
import {
  runSpecShowdown,
  type ShowdownMatch,
  type ShowdownResult,
  type SpecSheet,
} from "../../lib/compareSpecEngine";
import { BattleCard } from "./BattleCard";
import { CompareConfidenceTier, TONE_GLYPH, type CompareConfidenceTone } from "./CompareConfidenceTier";
import { CompareProofTable } from "./CompareProofTable";

export type ShowdownStatus = "idle" | "loading" | "verified" | "unverified" | "missing";
export type ShowdownView = "all" | "cards" | "proof";

const DECISION_LABEL: Record<ShowdownMatch["decision"], string> = {
  "confirmed-equivalent": "Confirmed equivalent",
  "closest-technical-match": "Closest technical match",
  "architecture-alternative": "Architecture alternative",
};

function bestForLabel(sheet: SpecSheet): string {
  switch (sheet.specClass) {
    case "AVOIP": return "AV-over-IP distribution";
    case "HDBASET": return "Long-distance HDMI extension";
    case "MATRIX": return "Multi-room switching";
    case "PRESENTATION": return "Meeting-room presentation";
    case "VIDEO_WALL": return "Video wall displays";
    case "MULTIVIEW": return "Multi-source displays";
    case "EXTENDER": return "Point-to-point extension";
    case "USB_EXTENSION": return "USB device extension";
    case "WIRELESS_PRESENTATION": return "Wireless screen sharing";
    case "AUDIO": return "Room audio";
    case "CONTROL": return "System control";
    case "CAMERA": return "Conferencing capture";
    default: return "AV systems";
  }
}

function wyrestormFootnote(sheet: SpecSheet): string {
  switch (sheet.verificationStatus) {
    case "verified":
      return "Verified from WyreStorm official documentation";
    case "verified-with-warning":
      return "Official source located — some fields require structured review";
    case "conflicting":
      return "Technical data conflict — do not quote from this card";
    case "inferred":
      return "Technical fields inferred — confirm current WyreStorm datasheet";
    default:
      return "Confirm current WyreStorm datasheet before quoting";
  }
}

/* ------------------------------------------------------- printable export *//* ------------------------------------------------------- printable export */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the printable customer one-pager. `tier` carries the same explicit
 * confidence label (with its colour-blind-safe glyph) the on-screen verdict
 * lead / side-by-side header shows, so the print export and the screen can
 * never disagree. Exported for the render tests.
 */
export function buildOnePagerHtml(
  competitor: SpecSheet,
  match: ShowdownMatch,
  tier?: ShowdownVerdictTier,
): string {
  const ws = match.sheet;
  const rows = match.verdicts
    .map((row) => {
      const verdictText =
        row.verdict === "match" ? "Match" : row.verdict === "exceeds" ? "WyreStorm wins" : row.verdict === "gap" ? "Gap" : "Unverified";
      const color =
        row.verdict === "match" ? "#0f766e" : row.verdict === "exceeds" ? "#166534" : row.verdict === "gap" ? "#b45309" : "#64748b";
      return `<tr>
        <td class="field">${escapeHtml(row.label)}</td>
        <td>${escapeHtml(row.competitorValue)}</td>
        <td>${escapeHtml(row.wyrestormValue)}</td>
        <td style="color:${color};font-weight:700">${verdictText}${row.note ? `<div class="note">${escapeHtml(row.note)}</div>` : ""}</td>
      </tr>`;
    })
    .join("");

  const citations = [...competitor.citations.map((c) => ({ side: competitor.brand, ...c })), ...ws.citations.map((c) => ({ side: "WyreStorm", ...c }))]
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.side)}:</strong> ${c.url ? `<a href="${escapeHtml(c.url)}">${escapeHtml(c.label)}</a>` : escapeHtml(c.label)}${c.detail ? ` — ${escapeHtml(c.detail)}` : ""}</li>`,
    )
    .join("");

  const advantages = match.advantages.map((a) => `<li>${escapeHtml(a)}</li>`).join("");
  const cautions = match.cautions.map((c) => `<li>${escapeHtml(c)}</li>`).join("");

  const tierPill = tier
    ? `<span class="decision tier tier--${tier.tone}">${TONE_GLYPH[tier.tone]} ${escapeHtml(tier.label)}</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>WyreStorm ${escapeHtml(ws.sku)} vs ${escapeHtml(competitor.brand)} ${escapeHtml(competitor.sku)}</title>
<style>
  body{font-family:"Segoe UI",Arial,sans-serif;color:#0f172a;margin:32px;line-height:1.45}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:#475569;margin:0 0 18px;font-size:13px}
  .decision{display:inline-block;background:#0f766e;color:#fff;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:16px}
  .tier{background:#fff;border:1.5px solid;margin-left:8px}
  .tier--strong{color:#166534;border-color:#166534}
  .tier--confirm,.tier--pending{color:#b45309;border-color:#b45309}
  .tier--none{color:#b91c1c;border-color:#b91c1c}
  table{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:18px}
  th,td{border:1px solid #cbd5e1;padding:7px 9px;text-align:left;vertical-align:top}
  thead th{background:#0f172a;color:#fff}
  td.field{font-weight:600}
  .note{font-weight:400;color:#64748b;font-size:11px;margin-top:2px}
  h2{font-size:15px;margin:16px 0 6px}
  ul{margin:0 0 10px 18px;padding:0;font-size:13px}
  .rating{font-size:13px;color:#334155;margin-bottom:14px}
  footer{margin-top:22px;font-size:11px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:8px}
  @media print{ a{color:#0f172a;text-decoration:none} }
</style></head><body>
<h1>Why we recommend WyreStorm ${escapeHtml(ws.sku)} to replace ${escapeHtml(competitor.brand)} ${escapeHtml(competitor.sku)}</h1>
<p class="sub">${escapeHtml(ws.name)} · ${escapeHtml(ws.family)}</p>
<span class="decision">${DECISION_LABEL[match.decision]}</span>${tierPill}
<p class="rating"><strong>${match.matchedFields} of ${match.comparableFields}</strong> independently verified specification fields match or exceed the competitor product (${match.rating}% verified match rating). Every value below is taken from the cited manufacturer documentation — nothing is estimated.</p>
<table>
<thead><tr><th>Specification</th><th>${escapeHtml(competitor.brand)} ${escapeHtml(competitor.sku)}</th><th>WyreStorm ${escapeHtml(ws.sku)}</th><th>Verdict</th></tr></thead>
<tbody>${rows}</tbody>
</table>
${advantages ? `<h2>Where WyreStorm out-performs</h2><ul>${advantages}</ul>` : ""}
${cautions ? `<h2>Items to confirm during design review</h2><ul>${cautions}</ul>` : ""}
<h2>Evidence sources</h2><ul>${citations}</ul>
<footer>Generated by Wingman Compare · ${new Date().toLocaleDateString()} · Specifications should be re-confirmed against current manufacturer documentation before final order.</footer>
<script>window.addEventListener("load",function(){window.print()});</script>
</body></html>`;
}

function openOnePager(competitor: SpecSheet, match: ShowdownMatch, tier?: ShowdownVerdictTier): void {
  const printWindow = window.open("", "_blank", "noopener=false");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildOnePagerHtml(competitor, match, tier));
  printWindow.document.close();
}

/* ---------------------------------------------------------------- component */

/**
 * The Compare page's explicit confidence tier (Strong direction / Plausible -
 * confirm / Evidence pending / No equivalent), rendered as the same chip the
 * Recommendation tab's verdict lead shows. Optional: the showdown is a generic
 * evidence view and can render without it.
 */
export type ShowdownVerdictTier = {
  label: string;
  tone: CompareConfidenceTone;
};

export function CompareShowdown({
  brand,
  competitorSku,
  active,
  onStatus,
  view = "all",
  selectedWyrestormSku,
  onSelectedWyrestormSkuChange,
  verdictTier,
}: {
  brand: string;
  competitorSku: string;
  active: boolean;
  onStatus?: (status: ShowdownStatus) => void;
  view?: ShowdownView;
  selectedWyrestormSku?: string;
  onSelectedWyrestormSkuChange?: (sku: string) => void;
  verdictTier?: ShowdownVerdictTier;
}) {
  const [result, setResult] = useState<ShowdownResult | null>(null);
  const [status, setStatus] = useState<ShowdownStatus>("idle");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!active || !competitorSku.trim()) {
      setStatus("idle");
      setResult(null);
      onStatus?.("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    onStatus?.("loading");
    runSpecShowdown(brand, competitorSku)
      .then((showdown) => {
        if (cancelled) return;
        setResult(showdown);
        setSelectedIndex(0);
        const next: ShowdownStatus =
          showdown.coverage === "missing" ? "missing" : showdown.verified ? "verified" : "unverified";
        setStatus(next);
        onStatus?.(next);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[wingman] CompareShowdown: runSpecShowdown failed", error);
        setStatus("unverified");
        onStatus?.("unverified");
      });
    return () => {
      cancelled = true;
    };
  }, [active, brand, competitorSku, onStatus]);

  const match = useMemo(() => {
    if (!result || result.coverage !== "found") return null;

    if (selectedWyrestormSku) {
      return result.matches.find(
        (candidate) => candidate.sheet.sku.toUpperCase() === selectedWyrestormSku.toUpperCase(),
      ) ?? null;
    }

    return result.matches[selectedIndex] ?? result.matches[0] ?? null;
  }, [result, selectedIndex, selectedWyrestormSku]);

  const effectiveSelectedIndex = useMemo(() => {
    if (!result || result.coverage !== "found" || !match) return 0;
    const index = result.matches.findIndex(
      (candidate) => candidate.sheet.sku.toUpperCase() === match.sheet.sku.toUpperCase(),
    );
    return index >= 0 ? index : 0;
  }, [match, result]);

  if (!active || status === "idle") return null;

  if (status === "loading") return null;

  if (!result) return null;

  if (result.coverage === "missing") return null;

  if (!match) {
    return selectedWyrestormSku ? (
      <section className="wm-showdown wm-ui-card" role="status">
        Verified side-by-side evidence is not available for the selected WyreStorm candidate {selectedWyrestormSku}.
      </section>
    ) : null;
  }

  return (
    <section className="wm-showdown wm-ui-card" aria-live="polite">
      {view !== "proof" ? <header className="wm-showdown__header">
        <div>
          {verdictTier ? (
            <CompareConfidenceTier label={verdictTier.label} tone={verdictTier.tone} />
          ) : null}
          <h3>{result.verified ? "Verified head-to-head" : "Head-to-head comparison"}</h3>
          <p>
            <span className={`wm-showdown__decision wm-showdown__decision--${match.decision}`}>
              {DECISION_LABEL[match.decision]}
            </span>{" "}
            {match.matchedFields}/{match.comparableFields} comparable fields · {match.rating}% rating
            {!result.verified ? " · Verify against current datasheets before quoting" : ""}
          </p>
        </div>
        <div className="wm-showdown__actions">
          {result.matches.length > 1 ? (
            <label className="wm-showdown__alt">
              Candidate
              <select
                value={effectiveSelectedIndex}
                onChange={(event) => {
                  const nextIndex = Number(event.target.value);
                  setSelectedIndex(nextIndex);
                  const nextSku = result.matches[nextIndex]?.sheet.sku;
                  if (nextSku) onSelectedWyrestormSkuChange?.(nextSku);
                }}
              >
                {result.matches.map((candidate, index) => (
                  <option key={candidate.sheet.sku} value={index}>
                    {candidate.sheet.sku} · {candidate.rating}%
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={() => openOnePager(result.competitor, match, verdictTier)}>
            Print customer one-pager
          </button>
        </div>
      </header> : null}

      {view !== "proof" ? <div className="wm-showdown__face-off">
        <BattleCard
          sheet={result.competitor}
          counterpart={match.sheet}
          accent="competitor"
          bestFor={bestForLabel(result.competitor)}
          footnote={result.verified ? "Verified from manufacturer documentation" : "Competitor evidence requires datasheet verification"}
        />
        <div className="wm-showdown__vs" aria-hidden="true">VS</div>
        <BattleCard
          sheet={match.sheet}
          counterpart={result.competitor}
          accent="wyrestorm"
          bestFor={bestForLabel(match.sheet)}
          footnote={wyrestormFootnote(match.sheet)}
        />
      </div> : null}

      {view !== "cards" ? <CompareProofTable competitor={result.competitor} match={match} /> : null}
    </section>
  );
}

export default CompareShowdown;
