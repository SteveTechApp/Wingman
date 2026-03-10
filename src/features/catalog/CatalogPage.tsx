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
    <div className="wm-page wm-catalog-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div className="wm-grid">
            <div className="wm-kicker">Products</div>
            <div className="wm-title-xl">WyreStorm Catalog</div>
            <div className="wm-body-sm wm-page-subtitle-muted">
              Filter by family, category, and features to move quickly from solution direction to candidate SKUs.
            </div>
          </div>

          <div className="wm-save-pill">{items.length} product(s)</div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Filters</h2>
            <p>Narrow the catalog to shortlist project-fit options.</p>
          </div>
        </div>

        <div className="wm-catalog-page__filters">
          <label className="wm-form-field wm-catalog-page__search">
            <span className="wm-form-label">Search</span>
            <input
              className="wm-form-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search SKU, family, category, feature"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Family</span>
            <select className="wm-form-input" value={family} onChange={(e) => setFamily(e.target.value)}>
              {families.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Category</span>
            <select className="wm-form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Feature</span>
            <select className="wm-form-input" value={feature} onChange={(e) => setFeature(e.target.value)}>
              {features.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Catalog results</h2>
            <p>Shortlist platform options for the active project workflow.</p>
          </div>
        </div>

        <div className="wm-grid-cards">
          {items.map((p) => (
            <article key={p.sku} className="wm-work-card">
              <div className="wm-title-lg">
                {p.sku} - {p.name}
              </div>

              <div className="wm-body-sm">
                {p.family} / {p.category} / {p.transport}
              </div>

              <div className="wm-body">{p.summary}</div>

              <div className="wm-catalog-page__meta-list">
                <div className="wm-body-sm">{p.ioSummary}</div>
                <div className="wm-body-sm">Control: {p.controlSummary}</div>
                <div className="wm-body-sm">Video: {p.video?.maxResolution || "Not set"}</div>
                <div className="wm-body-sm">Distance: {p.distance?.meters ?? 0}m</div>
              </div>

              <div className="wm-body-sm">
                Tags: {(p.normalizedTags || []).join(", ") || "None"}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
