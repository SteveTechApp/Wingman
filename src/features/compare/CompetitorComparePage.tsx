import * as React from "react";
import { useNavigate } from "react-router-dom";
import { findCatalogProductBySku, getCatalogProducts } from "@/catalog";
import { getCompetitorBrands, matchCompetitorProducts } from "@/competitor";
import { explainWyreStormAdvantage } from "@/competitor";
import type { CatalogProduct } from "@/catalog/types";
import type { CompetitorProduct } from "@/competitor/repository";

function panelStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    background: "rgba(16,22,32,0.72)",
    padding: 14,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.92)",
    font: "inherit",
    outline: "none",
  };
}

function buttonStyle(primary?: boolean): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "9px 12px",
    border: primary
      ? "1px solid rgba(120,200,255,0.24)"
      : "1px solid rgba(255,255,255,0.10)",
    background: primary
      ? "rgba(120,200,255,0.12)"
      : "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    font: "inherit",
  };
}

function chip(text: string): React.ReactNode {
  return (
    <span
      key={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function joinPorts(
  ports?: Array<{ type: string; count: number }>
): string {
  if (!Array.isArray(ports) || ports.length === 0) return "None";
  return ports.map((p) => `${p.count}x ${p.type}`).join(", ");
}

function renderProductFacts(p?: CatalogProduct | CompetitorProduct | null) {
  if (!p) return null;

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <div><strong>Family:</strong> {p.family}</div>
      <div><strong>Category:</strong> {p.category}</div>
      <div><strong>Transport:</strong> {p.transport || "Unknown"}</div>
      <div><strong>Video:</strong> {p.video?.maxResolution || "Not set"}</div>
      <div><strong>Distance:</strong> {p.distance?.meters ?? 0}m</div>
      <div><strong>Inputs:</strong> {joinPorts(p.inputs)}</div>
      <div><strong>Outputs:</strong> {joinPorts(p.outputs)}</div>
      <div><strong>Control:</strong> {(p.control || []).join(", ") || "None"}</div>
      <div><strong>Features:</strong> {(p.features || []).join(", ") || "None"}</div>
      {p.summary ? <div><strong>Summary:</strong> {p.summary}</div> : null}
    </div>
  );
}

export default function CompetitorComparePage() {
  const nav = useNavigate();
  const wyrestormProducts = React.useMemo(() => getCatalogProducts(), []);
  const competitorBrands = React.useMemo(() => ["All", ...getCompetitorBrands()], []);

  const [selectedSku, setSelectedSku] = React.useState<string>(
    wyrestormProducts[0]?.sku || ""
  );
  const [brand, setBrand] = React.useState<string>("All");
  const [query, setQuery] = React.useState<string>("");

  const selected = React.useMemo(
    () => findCatalogProductBySku(selectedSku) || null,
    [selectedSku]
  );

  const matches = React.useMemo(() => {
    if (!selected) return [];

    const ranked = matchCompetitorProducts({
      family: selected.family,
      category: selected.category,
      transport: selected.transport || "All",
      requiredFeatures: selected.features || [],
      minDistanceM: selected.distance?.meters,
      q: query || selected.name,
    });

    const filtered = ranked.filter((x) => {
      const competitor = x.product as CompetitorProduct;
      return brand === "All" || String(competitor.brand || "").trim() === brand;
    });

    return filtered.slice(0, 8);
  }, [selected, brand, query]);

  function handoffToProposal(p: CompetitorProduct) {
    if (!selected) return;

    const payload = {
      source: "competitor-compare",
      wyrestormSku: selected.sku,
      wyrestormName: selected.name,
      competitorBrand: p.brand || "Unknown",
      competitorSku: p.sku,
      competitorName: p.name,
      family: selected.family,
      category: selected.category,
    };

    try {
      localStorage.setItem("wm_compare_handoff", JSON.stringify(payload));
    } catch {}

    nav("/app/tools/proposal-builder");
  }

  return (
    <div className="wm-page" style={{ padding: 16 }}>
      <div style={{ ...panelStyle(), marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Competitor Compare</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>
          Select a WyreStorm product and rank competitor alternatives using shared catalog logic.
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "2fr 1fr 1fr",
            marginTop: 14,
          }}
        >
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            style={inputStyle()}
          >
            {wyrestormProducts.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.sku} - {p.name}
              </option>
            ))}
          </select>

          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={inputStyle()}
          >
            {competitorBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Optional keyword bias"
            style={inputStyle()}
          />
        </div>

        {selected ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {chip(`Family: ${selected.family}`)}
            {chip(`Category: ${selected.category}`)}
            {chip(`Transport: ${selected.transport || "Unknown"}`)}
            {chip(`Distance: ${selected.distance?.meters ?? 0}m`)}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "minmax(320px, 1fr) minmax(420px, 1.4fr)",
        }}
      >
        <div style={panelStyle()}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            Selected WyreStorm Product
          </div>

          {selected ? (
            <>
              <div style={{ marginTop: 10, fontWeight: 800 }}>
                {selected.sku} - {selected.name}
              </div>
              {renderProductFacts(selected)}
            </>
          ) : (
            <div style={{ marginTop: 10, opacity: 0.8 }}>No product selected.</div>
          )}
        </div>

        <div style={panelStyle()}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            Ranked Competitor Matches
          </div>

          <div style={{ marginTop: 6, opacity: 0.8 }}>
            {matches.length} ranked match(es)
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {matches.map((m) => {
              const p = m.product as CompetitorProduct;
              const positioning = selected
                ? explainWyreStormAdvantage(selected, p)
                : { score: 0, reasons: [], summary: "" };

              return (
                <div
                  key={`${p.brand || "Unknown"}-${p.sku}`}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.04)",
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {String(p.brand || "Unknown")} - {p.sku}
                      </div>
                      <div style={{ marginTop: 4 }}>{p.name}</div>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          border: "1px solid rgba(120,200,255,0.24)",
                          background: "rgba(120,200,255,0.10)",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                        }}
                      >
                        Match {m.score}
                      </div>

                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          border: "1px solid rgba(134,239,172,0.20)",
                          background: "rgba(134,239,172,0.10)",
                          whiteSpace: "nowrap",
                          textAlign: "center",
                        }}
                      >
                        Win {positioning.score}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {chip(p.family)}
                    {chip(p.category)}
                    {chip(p.transport || "Unknown")}
                    {chip(`${p.distance?.meters ?? 0}m`)}
                  </div>

                  {renderProductFacts(p)}

                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.82 }}>
                    <strong>Match reasons:</strong> {m.reasons.join(", ") || "No rule hits"}
                  </div>

                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.86 }}>
                    <strong>Why WyreStorm wins:</strong> {positioning.summary || "No strong differentiator detected"}
                  </div>

                  {positioning.reasons.length ? (
                    <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, opacity: 0.82 }}>
                      {positioning.reasons.slice(0, 5).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={buttonStyle(true)}
                      onClick={() => handoffToProposal(p)}
                    >
                      Send to Proposal Builder
                    </button>
                  </div>
                </div>
              );
            })}

            {matches.length === 0 ? (
              <div style={{ opacity: 0.8 }}>
                No competitor matches found for the current selection.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}