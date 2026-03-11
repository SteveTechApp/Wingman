import * as React from "react";
import {
  Database,
  Layers3,
  RadioTower,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tags,
} from "lucide-react";
import {
  getCatalogProducts,
  getCatalogCategories,
  getCatalogFamilies,
  getCatalogFeatures,
  queryCatalogProducts
} from "@/catalog";
import type { CatalogProduct } from "@/catalog/types";
import {
  getLiveProductDataStatus,
  refreshLiveProductData,
  subscribeLiveProductData,
} from "@/services/liveProductDataStore";

type CatalogTone = "cyan" | "indigo" | "emerald" | "amber";

function formatTimestamp(value: string): string {
  if (!value) return "Not synced yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function toneForProduct(product: CatalogProduct): CatalogTone {
  const seed = `${product.family}:${product.category}:${product.transport}:${product.sku}`.toLowerCase();
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ["cyan", "indigo", "emerald", "amber"][hash % 4] as CatalogTone;
}

function formatTransport(value: string | undefined): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Platform";
  return normalized.replace(/[-_/]+/g, " ");
}

function getVisibleTags(tags: string[] | undefined, limit = 4): string[] {
  return (tags || []).filter(Boolean).slice(0, limit);
}

function getProductMetrics(product: CatalogProduct): Array<{ label: string; value: string }> {
  return [
    { label: "I/O", value: product.ioSummary || "Mixed I/O" },
    { label: "Control", value: product.controlSummary || "Standard" },
    { label: "Video", value: product.video?.maxResolution || "Not set" },
    { label: "Reach", value: product.distance?.meters ? `${product.distance.meters}m` : "Project-led" },
  ];
}

export default function CatalogPage() {
  const [q, setQ] = React.useState("");
  const [family, setFamily] = React.useState("All");
  const [category, setCategory] = React.useState("All");
  const [feature, setFeature] = React.useState("All");
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshNotice, setRefreshNotice] = React.useState("");

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
  const totalCatalogRecords = liveStatus.summary.byVendorType.wyrestorm || getCatalogProducts().length;
  const hasActiveFilters = Boolean(q.trim()) || family !== "All" || category !== "All" || feature !== "All";

  const items = queryCatalogProducts({
    q,
    family,
    category,
    feature,
    transport: "All",
    status: "All",
  });

  const clearFilters = React.useCallback(() => {
    setQ("");
    setFamily("All");
    setCategory("All");
    setFeature("All");
  }, []);

  const refreshCatalog = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const snapshot = await refreshLiveProductData({ force: true, minIntervalMs: 0 });
      if (!snapshot) {
        setRefreshNotice("Catalog refresh could not complete. Showing the last available data.");
        return;
      }

      if (snapshot.warnings.length > 0) {
        setRefreshNotice(snapshot.warnings[0]);
        return;
      }

      setRefreshNotice("");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const notices = React.useMemo(() => {
    const out = [...liveStatus.warnings];
    if (refreshNotice && !out.includes(refreshNotice)) out.unshift(refreshNotice);
    return out;
  }, [liveStatus.warnings, refreshNotice]);

  const activeFilters = React.useMemo(() => {
    const out: string[] = [];
    if (q.trim()) out.push(`Search: ${q.trim()}`);
    if (family !== "All") out.push(`Family: ${family}`);
    if (category !== "All") out.push(`Category: ${category}`);
    if (feature !== "All") out.push(`Feature: ${feature}`);
    return out;
  }, [category, family, feature, q]);

  return (
    <div className="wm-page wm-catalog-page">
      <section className="wm-hero wm-catalog-page__hero">
        <div className="wm-catalog-page__hero-grid">
          <div className="wm-catalog-page__hero-copy">
            <div className="wm-kicker">Products</div>
            <div className="wm-title-xl">WyreStorm Catalog</div>
            <div className="wm-body-sm wm-page-subtitle-muted">
              Search by SKU, family, or feature and build a shortlist fast.
            </div>

            <div className="wm-catalog-page__hero-chips">
              <div className="wm-catalog-page__hero-chip wm-catalog-page__hero-chip--cyan">
                <RadioTower size={15} />
                <span>{liveStatus.available ? "Live feed" : "Cached snapshot"}</span>
              </div>
              <div className="wm-catalog-page__hero-chip wm-catalog-page__hero-chip--indigo">
                <Database size={15} />
                <span>{totalCatalogRecords} records</span>
              </div>
              <div className="wm-catalog-page__hero-chip wm-catalog-page__hero-chip--emerald">
                <Layers3 size={15} />
                <span>{families.length - 1} families</span>
              </div>
              <div className="wm-catalog-page__hero-chip wm-catalog-page__hero-chip--amber">
                <Tags size={15} />
                <span>{items.length} shown</span>
              </div>
            </div>
          </div>

          <div className="wm-catalog-page__search-panel">
            <div className="wm-catalog-page__search-panel-head">
              <div className="wm-catalog-page__panel-kicker">
                <Sparkles size={15} />
                <span>Quick shortlist</span>
              </div>
              <button
                type="button"
                className="wm-btn wm-catalog-page__refresh-btn"
                onClick={() => void refreshCatalog()}
                disabled={refreshing}
              >
                <RefreshCw size={15} className={refreshing ? "wm-catalog-page__refresh-icon is-spinning" : "wm-catalog-page__refresh-icon"} />
                <span>{refreshing ? "Refreshing..." : "Refresh data"}</span>
              </button>
            </div>

            <label className="wm-form-field wm-catalog-page__hero-search">
              <span className="wm-form-label">SKU, family, or feature</span>
              <div className="wm-catalog-page__search-shell">
                <Search size={18} className="wm-catalog-page__search-icon" />
                <input
                  className="wm-catalog-page__search-input"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search SKU, family, category, feature"
                />
                {hasActiveFilters ? (
                  <button type="button" className="wm-catalog-page__clear-btn" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : null}
              </div>
            </label>

            <div className="wm-catalog-page__filters">
              <label className="wm-form-field wm-catalog-page__filter-field">
                <span className="wm-form-label">Family</span>
                <select className="wm-form-input" value={family} onChange={(event) => setFamily(event.target.value)}>
                  {families.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="wm-form-field wm-catalog-page__filter-field">
                <span className="wm-form-label">Category</span>
                <select className="wm-form-input" value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="wm-form-field wm-catalog-page__filter-field">
                <span className="wm-form-label">Feature</span>
                <select className="wm-form-input" value={feature} onChange={(event) => setFeature(event.target.value)}>
                  {features.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <div className="wm-catalog-page__search-foot">
              <div className="wm-catalog-page__search-foot-copy">
                <SlidersHorizontal size={15} />
                <span>{hasActiveFilters ? "Filters are shaping a tighter shortlist." : "Start broad, then narrow as the conversation develops."}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wm-section wm-section--tone-indigo wm-catalog-page__status-section">
        <div className="wm-catalog-page__status-head">
          <div className="wm-section__titles">
            <h2>Catalog pulse</h2>
            <p>{liveStatus.available ? "Live product intelligence is feeding this shortlist." : "You are browsing the latest cached or seeded catalog snapshot."}</p>
          </div>

          <div className="wm-catalog-page__active-filters">
            {activeFilters.length > 0 ? (
              activeFilters.map((activeFilter) => (
                <span key={activeFilter} className="wm-catalog-page__active-filter">
                  {activeFilter}
                </span>
              ))
            ) : (
              <span className="wm-catalog-page__active-filter wm-catalog-page__active-filter--all">All products in view</span>
            )}
          </div>
        </div>

        <div className="wm-catalog-page__status-grid">
          <article className="wm-work-card wm-catalog-page__status-card wm-catalog-page__status-card--cyan">
            <div className="wm-catalog-page__status-label">Source</div>
            <div className="wm-title-lg">{liveStatus.available ? "Live" : "Fallback"}</div>
            <div className="wm-body-sm">{liveStatus.mode}</div>
          </article>
          <article className="wm-work-card wm-catalog-page__status-card wm-catalog-page__status-card--indigo">
            <div className="wm-catalog-page__status-label">Catalog</div>
            <div className="wm-title-lg">{totalCatalogRecords}</div>
            <div className="wm-body-sm">WyreStorm records ready to search</div>
          </article>
          <article className="wm-work-card wm-catalog-page__status-card wm-catalog-page__status-card--emerald">
            <div className="wm-catalog-page__status-label">Shortlist</div>
            <div className="wm-title-lg">{items.length}</div>
            <div className="wm-body-sm">Products matching the current view</div>
          </article>
          <article className="wm-work-card wm-catalog-page__status-card wm-catalog-page__status-card--amber">
            <div className="wm-catalog-page__status-label">Last sync</div>
            <div className="wm-title-lg">{formatTimestamp(liveStatus.fetchedAt)}</div>
            <div className="wm-body-sm">{liveStatus.endpoint ?? "No endpoint configured"}</div>
          </article>
        </div>

        {notices.length > 0 ? (
          <div className="wm-catalog-page__warnings">
            {notices.map((warning) => (
              <div key={warning} className="wm-catalog-page__warning-item">
                {warning}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="wm-section wm-section--tone-emerald">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Browse candidates</h2>
            <p>{items.length === totalCatalogRecords ? "The full range is in view." : "A filtered shortlist is ready for the project conversation."}</p>
          </div>
        </div>

        <div className="wm-catalog-page__results">
          {items.length === 0 ? (
            <article className="wm-work-card wm-catalog-page__empty-state">
              <div className="wm-title-lg">No catalogue matches found</div>
              <div className="wm-body">
                Try a broader search term or clear the family, category, and feature filters to bring products back into view.
              </div>
              <div className="wm-actions-row">
                <button type="button" className="wm-btn" onClick={clearFilters}>
                  Reset filters
                </button>
              </div>
            </article>
          ) : (
            items.map((product) => {
              const tone = toneForProduct(product);
              const visibleTags = getVisibleTags(product.normalizedTags);
              const metrics = getProductMetrics(product);

              return (
                <article key={product.sku} className={`wm-work-card wm-catalog-page__result-card wm-catalog-page__result-card--${tone}`}>
                  <div className="wm-catalog-page__result-head">
                    <div className="wm-catalog-page__result-copy">
                      <div className="wm-catalog-page__result-pills">
                        <span className="wm-catalog-page__sku-pill">{product.sku}</span>
                        <span className="wm-catalog-page__meta-pill">{product.family}</span>
                        <span className="wm-catalog-page__meta-pill">{product.category}</span>
                      </div>
                      <div className="wm-catalog-page__result-title">{product.name}</div>
                    </div>

                    <div className={`wm-catalog-page__transport-pill wm-catalog-page__transport-pill--${tone}`}>
                      {formatTransport(product.transport)}
                    </div>
                  </div>

                  <div className="wm-catalog-page__result-summary">{product.summary}</div>

                  <div className="wm-catalog-page__metric-grid">
                    {metrics.map((metric) => (
                      <div key={`${product.sku}_${metric.label}`} className="wm-catalog-page__metric-card">
                        <span className="wm-catalog-page__metric-label">{metric.label}</span>
                        <strong className="wm-catalog-page__metric-value">{metric.value}</strong>
                      </div>
                    ))}
                  </div>

                  {visibleTags.length > 0 ? (
                    <div className="wm-catalog-page__tag-row">
                      {visibleTags.map((tag) => (
                        <span key={`${product.sku}_${tag}`} className="wm-catalog-page__tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
