import React, { useMemo, useState } from "react";
import { addToCart } from "@/proposal/QuoteCartService";
import { listAll, isSelectable } from "@/catalog/CatalogService";
import type { Product } from "@/catalog/model";

function pill(s: string) {
  return (<div className="wm-page">

    <span className="wm-chip" style={{ marginRight: 8 }}>
      {s}
    </span>
  
</div>);
}

export default function ProductCatalogPage() {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string>("All");

  const all = useMemo(() => listAll(), []);
  const families = useMemo(() => {
    const set = new Set(all.map(p => p.family).filter(Boolean) as string[]);
    return ["All", ...Array.from(set).sort()];
  }, [all]);

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return all
      .filter(p => (family === "All" ? true : p.family === family))
      .filter(p => {
        if (!qq) return true;
        return (
          p.sku.toLowerCase().includes(qq) ||
          p.name.toLowerCase().includes(qq) ||
          (p.category || "").toLowerCase().includes(qq) ||
          (p.role || "").toLowerCase().includes(qq)
        );
      })
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [all, q, family]);

  return (
    <div className="wm-page wm-container">
      <div className="wm-card wm-card-pad">
        <div className="wm-card-title">Product Catalog</div>
        <div className="wm-muted" style={{ marginTop: 6 }}>
          Seed dataset (Phase 2). Next: replace with real Wingman catalog.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search SKU / name / category / role…"
            style={{ padding: 10, minWidth: 260, flex: 1 }}
          />
          <select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10 }}>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 14, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "10px 8px" }}>SKU</th>
                <th style={{ padding: "10px 8px" }}>Name</th>
                <th style={{ padding: "10px 8px" }}>Tags</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p: Product) => {
                const ok = isSelectable(p);
                return (
                  <tr key={p.sku} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 700 }}>{p.sku}</td>
                    <td style={{ padding: "10px 8px" }}>{p.name}</td>
                    <td style={{ padding: "10px 8px" }}>
                      {p.family && pill(p.family)}
                      {p.category && pill(p.category)}
                      {p.role && pill(p.role)}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span className="wm-muted">{ok ? "Selectable" : "Blocked (EoL)"}</span>
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right" }}>
                      <button
                        className="wm-btn"
                        disabled={!ok}
                        onClick={() =>
                          addToCart({
                            sku: p.sku,
                            name: p.name,
                            qty: 1,
                            source: "catalog",
                          })
                        }
                      >
                        Add to Quote
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 16 }} className="wm-muted">
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}