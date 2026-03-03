import React, { useMemo, useState } from "react";
import { matchCompetitor, parseCompetitorInput } from "@/competitor/CompetitorMatchService";
import type { MatchResult } from "@/competitor/types";

function badgeLabel(pct: number) {
  if (pct >= 90) return "Direct equivalent";
  if (pct >= 75) return "Strong match";
  if (pct >= 55) return "Closest option";
  return "Low confidence";
}

export default function CompetitorComparePage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const best = results?.[0] ?? null;

  const hint = useMemo(
    () => "Enter competitor SKU (optionally include brand), e.g. “Extron DTP2 T 211”",
    []
  );

  function run() {
    const item = parseCompetitorInput(input);
    if (!item.sku.trim()) {
      setResults(null);
      setExpanded(false);
      return;
    }
    const r = matchCompetitor(item, { topN: 5 });
    setResults(r);
    setExpanded(false);
  }

  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div className="wm-h1">Competitor Compare</div>
        <div className="wm-p" style={{ opacity: 0.85, marginTop: 6 }}>{hint}</div>
      </div>

      <div className="wm-card wm-card-pad" style={{ marginTop: 12 }}>
        <div className="wm-row" style={{ gap: 10, alignItems: "center" }}>
          <input
            className="wm-input"
            style={{ flex: 1, minWidth: 260 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Competitor SKU"
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
          />
          <button className="wm-btn wm-btn-primary" onClick={run}>Find match</button>
          <button className="wm-btn" onClick={() => { setInput(""); setResults(null); setExpanded(false); }}>Clear</button>
        </div>

        {!results && (
          <div className="wm-p" style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
            Examples: <span style={{ opacity: 0.9 }}>Crestron DM-NVX-350</span>,{" "}
            <span style={{ opacity: 0.9 }}>Extron DTP2 T 211</span>,{" "}
            <span style={{ opacity: 0.9 }}>Atlona AT-UHD-EX-100CE</span>
          </div>
        )}
      </div>

      {results && best && (
        <div className="wm-card wm-card-pad" style={{ marginTop: 12 }}>
          <div className="wm-row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div className="wm-h2" style={{ marginBottom: 4 }}>
                {best.product.sku}
              </div>
              <div className="wm-p" style={{ opacity: 0.85 }}>
                {best.product.name || "WyreStorm product"}
              </div>
              <div className="wm-p" style={{ opacity: 0.8, marginTop: 6, fontSize: 12 }}>
                {badgeLabel(best.percent)}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div className="wm-h2">{best.percent}%</div>
              <div className="wm-p" style={{ opacity: 0.75, fontSize: 12 }}>Match</div>
              <div className="wm-row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                <button className="wm-btn" onClick={() => setExpanded(v => !v)}>
                  {expanded ? "Hide info" : "More info"}
                </button>
                <button className="wm-btn" onClick={() => navigator.clipboard?.writeText(best.product.sku)}>
                  Copy SKU
                </button>
              </div>
            </div>
          </div>

          {expanded && (
            <div style={{ marginTop: 12 }}>
              <div className="wm-h3" style={{ marginBottom: 6 }}>Why this match</div>
              <ul className="wm-p" style={{ opacity: 0.9, fontSize: 13, marginLeft: 18 }}>
                {best.reasons
                  .filter(r => r.score > 0)
                  .sort((a,b) => b.score - a.score)
                  .map(r => (
                    <li key={r.key} style={{ marginBottom: 6 }}>
                      {r.text} <span style={{ opacity: 0.7 }}>({Math.round(r.score * 100)} pts)</span>
                    </li>
                  ))}
              </ul>

              {results.length > 1 && (
                <>
                  <div className="wm-h3" style={{ marginTop: 12, marginBottom: 6 }}>Alternatives</div>
                  <div className="wm-col" style={{ gap: 8 }}>
                    {results.slice(1, 5).map((alt) => (
                      <div key={alt.product.sku} className="wm-row" style={{ justifyContent: "space-between", gap: 12 }}>
                        <div className="wm-p" style={{ opacity: 0.95 }}>
                          <strong>{alt.product.sku}</strong>{" "}
                          <span style={{ opacity: 0.75 }}>{alt.product.name || ""}</span>
                        </div>
                        <div className="wm-p" style={{ opacity: 0.85 }}>{alt.percent}%</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {results && !best && (
        <div className="wm-card wm-card-pad" style={{ marginTop: 12 }}>
          <div className="wm-p">No match found.</div>
        </div>
      )}
    </div>
  );
}