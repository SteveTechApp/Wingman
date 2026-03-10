import React from "react";
import { getBoundCatalogue } from "@/core/wingman/storeBridge";

export default function ProductCatalogPage() {
  const items = getBoundCatalogue();

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
          <div>
            <div className="wm-title-xl">Product Catalogue</div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Live project binding is active. Catalogue remains on fallback data until the real SKU source is confirmed.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn">Filter</button>
            <button type="button" className="wm-btn wm-btn-primary">Compare Products</button>
          </div>
        </div>
      </section>

      <section className="wm-panel" style={{ padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 180px 1fr 1.4fr", gap: 8, marginBottom: 8 }}>
          <div className="wm-body-sm">SKU</div>
          <div className="wm-body-sm">Family</div>
          <div className="wm-body-sm">Title</div>
          <div className="wm-body-sm">Notes</div>
        </div>

        <div className="wm-grid" style={{ gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.sku}
              className="wm-card"
              style={{ display: "grid", gridTemplateColumns: "220px 180px 1fr 1.4fr", gap: 8, alignItems: "center" }}
            >
              <div className="wm-title-lg">{item.sku}</div>
              <div><span className="wm-tag">{item.family}</span></div>
              <div className="wm-body">{item.title}</div>
              <div className="wm-body">{item.note}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}