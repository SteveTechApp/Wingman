import * as React from "react";
import {
  getCatalogCategories,
  getCatalogFamilies,
  getCatalogFeatures,
  queryCatalogProducts
} from "@/catalog";
import {
  getLiveProductDataStatus,
  refreshLiveProductData,
  subscribeLiveProductData,
} from "@/services/liveProductDataStore";

function formatTimestamp(value: string): string {
  if (!value) return "Not synced yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function CatalogPage() {
  const [q, setQ] = React.useState("");
  const [family, setFamily] = React.useState("All");
  const [category, setCategory] = React.useState("All");
  const [feature, setFeature] = React.useState("All");
  const [refreshing, setRefreshing] = React.useState(false);

  const liveStatus = React.useSyncExternalStore(
    subscribeLiveProductData,
    getLiveProductDataStatus,
    getLiveProductDataStatus,
  );

  React.useEffect(() => {
    void refreshLiveProductData({ minIntervalMs: 5 * 60 * 1000 });
  }, []);

  const families = ["All", ...getCatalogFamilies()];
  const categories = ["All", ...getCatalogCategories()];
  const features = ["All", ...getCatalogFeatures()];

  const items = queryCatalogProducts({
    q,
    family,
    category,
    feature,
    transport: "All",
    status: "All",
  });

  const refreshCatalog = React.useCallback(async () => {
    setRefreshing(true);
    await refreshLiveProductData({ force: true, minIntervalMs: 0 });
    setRefreshing(false);
  }, []);

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

          <div className="wm-actions-row">
            <div className="wm-save-pill">{items.length} product(s)</div>
            <button type="button" className="wm-btn" onClick={() => void refreshCatalog()} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Data status</h2>
            <p>
              {liveStatus.available ? "Live product intelligence is feeding this catalog." : "Catalog is running from the latest cached or seeded product data."}
            </p>
          </div>
        </div>

        <div className="wm-grid-cards">
          <article className="wm-work-card">
            <div className="wm-section-title">Mode</div>
            <div className="wm-title-lg">{liveStatus.available ? "Live" : "Fallback"}</div>
            <div className="wm-body-sm">{liveStatus.mode}</div>
          </article>
          <article className="wm-work-card">
            <div className="wm-section-title">Visible records</div>
            <div className="wm-title-lg">{liveStatus.summary.byVendorType.wyrestorm || items.length}</div>
            <div className="wm-body-sm">WyreStorm catalog records</div>
          </article>
          <article className="wm-work-card">
            <div className="wm-section-title">Last sync</div>
            <div className="wm-title-lg">{formatTimestamp(liveStatus.fetchedAt)}</div>
            <div className="wm-body-sm">{liveStatus.endpoint ?? "No endpoint configured"}</div>
          </article>
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
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search SKU, family, category, feature"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Family</span>
            <select className="wm-form-input" value={family} onChange={(event) => setFamily(event.target.value)}>
              {families.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Category</span>
            <select className="wm-form-input" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Feature</span>
            <select className="wm-form-input" value={feature} onChange={(event) => setFeature(event.target.value)}>
              {features.map((item) => <option key={item} value={item}>{item}</option>)}
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
          {items.map((product) => (
            <article key={product.sku} className="wm-work-card">
              <div className="wm-title-lg">
                {product.sku} - {product.name}
              </div>

              <div className="wm-body-sm">
                {product.family} / {product.category} / {product.transport}
              </div>

              <div className="wm-body">{product.summary}</div>

              <div className="wm-catalog-page__meta-list">
                <div className="wm-body-sm">{product.ioSummary}</div>
                <div className="wm-body-sm">Control: {product.controlSummary}</div>
                <div className="wm-body-sm">Video: {product.video?.maxResolution || "Not set"}</div>
                <div className="wm-body-sm">Distance: {product.distance?.meters ?? 0}m</div>
              </div>

              <div className="wm-body-sm">
                Tags: {(product.normalizedTags || []).join(", ") || "None"}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
