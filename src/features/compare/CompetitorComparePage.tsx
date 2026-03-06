import * as React from "react";
import { matchCompetitor, parseCompetitorInput } from "@/competitor/CompetitorMatchService";
import type { MatchResult } from "@/competitor/types";

function badgeLabel(pct: number) {
  if (pct >= 90) return "Direct equivalent";
  if (pct >= 75) return "Strong match";
  if (pct >= 55) return "Closest option";
  return "Low confidence";
}

function scoreAccent(pct: number) {
  if (pct >= 90) return "77,183,255";
  if (pct >= 75) return "94,234,212";
  if (pct >= 55) return "251,191,36";
  return "248,113,113";
}

export default function CompetitorComparePage() {
  const [input, setInput] = React.useState("");
  const [results, setResults] = React.useState<MatchResult[] | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  const best = results?.[0] ?? null;

  const hint = React.useMemo(
    () => "Enter competitor SKU (optionally include brand), e.g. Extron DTP2 T 211",
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

  function clearAll() {
    setInput("");
    setResults(null);
    setExpanded(false);
  }

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">COMPARE</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Competitor Compare
          </h1>
          <div
            style={{
              maxWidth: 760,
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.45,
            }}
          >
            Enter a competitor SKU to get the best WyreStorm starting point first, then review detail only if needed.
          </div>
        </div>

        <section className="wm-card wm-card-pad" style={{ borderRadius: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <input
              className="wm-input"
              style={{ minWidth: 220 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Competitor SKU"
              onKeyDown={(e) => {
                if (e.key === "Enter") run();
              }}
            />

            <button className="wm-btn wm-btn-primary" onClick={run}>
              Find match
            </button>

            <button className="wm-btn" onClick={clearAll}>
              Clear
            </button>
          </div>

          {!results && (
            <div className="wm-p" style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
              {hint}
            </div>
          )}
        </section>

        {results && best && (
          <section
            className="wm-card wm-card-pad"
            style={{
              borderRadius: 18,
              borderColor: `rgba(${scoreAccent(best.percent)},0.24)`,
              background: `linear-gradient(180deg, rgba(${scoreAccent(best.percent)},0.08) 0%, rgba(255,255,255,0.03) 100%)`,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) auto",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.66)",
                  }}
                >
                  Best match
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontWeight: 900,
                    fontSize: 22,
                    lineHeight: 1.2,
                    color: "rgba(255,255,255,0.97)",
                  }}
                >
                  {best.product.sku}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.86)",
                    lineHeight: 1.4,
                  }}
                >
                  {best.product.name || "WyreStorm product"}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.90)",
                  }}
                >
                  {badgeLabel(best.percent)}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div className="wm-h2" style={{ margin: 0 }}>
                  {best.percent}%
                </div>
                <div className="wm-p" style={{ opacity: 0.75, fontSize: 12 }}>
                  Match
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="wm-btn"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Hide detail" : "Show detail"}
              </button>

              <button
                className="wm-btn"
                onClick={() => navigator.clipboard?.writeText(best.product.sku)}
              >
                Copy SKU
              </button>
            </div>

            {expanded && (
              <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                <div>
                  <div className="wm-h3" style={{ marginBottom: 6 }}>
                    Why this match
                  </div>

                  <ul
                    className="wm-p"
                    style={{
                      opacity: 0.9,
                      fontSize: 13,
                      marginLeft: 18,
                      marginBottom: 0,
                    }}
                  >
                    {best.reasons
                      .filter((r) => r.score > 0)
                      .sort((a, b) => b.score - a.score)
                      .map((r) => (
                        <li key={r.key} style={{ marginBottom: 6 }}>
                          {r.text}{" "}
                          <span style={{ opacity: 0.7 }}>
                            ({Math.round(r.score * 100)} pts)
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>

                {results.length > 1 && (
                  <div>
                    <div className="wm-h3" style={{ marginBottom: 6 }}>
                      Alternatives
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {results.slice(1, 5).map((alt) => (
                        <div
                          key={alt.product.sku}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0,1fr) auto",
                            gap: 12,
                            alignItems: "center",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(255,255,255,0.035)",
                            padding: 10,
                          }}
                        >
                          <div
                            className="wm-p"
                            style={{ opacity: 0.95, margin: 0 }}
                          >
                            <strong>{alt.product.sku}</strong>{" "}
                            <span style={{ opacity: 0.75 }}>
                              {alt.product.name || ""}
                            </span>
                          </div>

                          <div
                            className="wm-p"
                            style={{ opacity: 0.85, margin: 0 }}
                          >
                            {alt.percent}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {results && !best && (
          <section className="wm-card wm-card-pad" style={{ borderRadius: 18 }}>
            <div className="wm-p" style={{ margin: 0 }}>
              No match found.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}