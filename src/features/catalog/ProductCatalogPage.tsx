import React from "react";
import { getLiveCatalogueFamilies, getLiveCatalogueItems } from "@/core/wingman/catalogBridge";

export default function ProductCatalogPage() {
  const [query, setQuery] = React.useState("");
  const [family, setFamily] = React.useState("All");

  const items = React.useMemo(() => getLiveCatalogueItems(), []);
  const families = React.useMemo(() => ["All", ...getLiveCatalogueFamilies()], []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      const familyOk = family === "All" || item.family === family;
      const queryOk =
        q.length === 0 ||
        item.sku.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.family.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q);

      return familyOk && queryOk;
    });
  }, [items, query, family]);

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <div className="wm-title-xl">Product Catalogue</div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Browse WyreStorm SKUs by family and quickly locate product notes before opening detailed references.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn">Filter</button>
            <button type="button" className="wm-btn wm-btn-primary">Compare Products</button>
          </div>
        </div>
      </section>

      <section className="wm-panel" style={{ padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 8, marginBottom: 10 }}>
          <div
            className="wm-input-shell"
            style={{ height: 40 }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SKU, family, title or notes"
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: "var(--wm-text)",
                outline: "none",
              }}
            />
          </div>

          <div
            className="wm-input-shell"
            style={{ height: 40, padding: 0 }}
          >
            <select
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "transparent",
                color: "var(--wm-text)",
                outline: "none",
                padding: "0 12px",
              }}
            >
              {families.map((item) => (
                <option key={item} value={item} style={{ color: "#000" }}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 180px 1fr 1.4fr", gap: 8, marginBottom: 8 }}>
          <div className="wm-body-sm">SKU</div>
          <div className="wm-body-sm">Family</div>
          <div className="wm-body-sm">Title</div>
          <div className="wm-body-sm">Notes</div>
        </div>

        <div className="wm-grid" style={{ gap: 8 }}>
          {filtered.map((item) => (
            <div
              key={item.sku}
              className="wm-card"
              style={{
                display: "grid",
                gridTemplateColumns: "220px 180px 1fr 1.4fr",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div className="wm-title-lg">{item.sku}</div>
              <div><span className="wm-tag">{item.family}</span></div>
              <div className="wm-body">{item.title}</div>
              <div className="wm-body">{item.note}</div>
            </div>
          ))}

          {filtered.length === 0 ? (
            <div className="wm-panel-soft" style={{ padding: 12 }}>
              <div className="wm-title-lg">No matching products</div>
              <div className="wm-body" style={{ marginTop: 6 }}>
                Try clearing the search or switching family filter.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
