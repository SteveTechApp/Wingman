import * as React from "react";
import {
  getCatalogCategories,
  getCatalogFamilies,
  getCatalogFeatures,
  queryCatalogProducts
} from "@/catalog";

export default function CatalogPage() {
  const [q, setQ] = React.useState("");
  const [family, setFamily] = React.useState("All");
  const [category, setCategory] = React.useState("All");
  const [feature, setFeature] = React.useState("All");

  const families = React.useMemo(() => ["All", ...getCatalogFamilies()], []);
  const categories = React.useMemo(() => ["All", ...getCatalogCategories()], []);
  const features = React.useMemo(() => ["All", ...getCatalogFeatures()], []);

  const items = React.useMemo(() => {
    return queryCatalogProducts({
      q,
      family,
      category,
      feature,
      transport: "All",
      status: "All",
    });
  }, [q, family, category, feature]);

  return (
    <div className="wm-page" style={{ padding: 16 }}>
      <div className="wm-card wm-card-pad">
        <div className="wm-h1">WyreStorm Catalog</div>
        <p className="wm-p" style={{ marginTop: 8 }}>
          Phase 3 enriched catalog with normalized filtering.
        </p>

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            marginTop: 14,
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search SKU, family, category, feature"
            style={{ padding: 10, borderRadius: 10 }}
          />
          <select value={family} onChange={(e) => setFamily(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
            {families.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
            {categories.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select value={feature} onChange={(e) => setFeature(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
            {features.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 14, opacity: 0.8 }}>
          {items.length} product(s)
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {items.map((p) => (
            <div key={p.sku} className="wm-card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 800 }}>
                {p.sku} - {p.name}
              </div>

              <div style={{ marginTop: 6, opacity: 0.85 }}>
                {p.family} / {p.category} / {p.transport}
              </div>

              <div style={{ marginTop: 6, fontSize: 14 }}>
                {p.summary}
              </div>

              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.82 }}>
                {p.ioSummary}
              </div>

              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.82 }}>
                Control: {p.controlSummary}
              </div>

              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.82 }}>
                Video: {p.video?.maxResolution || "Not set"}
              </div>

              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.82 }}>
                Distance: {p.distance?.meters ?? 0}m
              </div>

              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                Tags: {(p.normalizedTags || []).join(", ") || "None"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}