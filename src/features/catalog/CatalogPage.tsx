import * as React from "react";
import {
  ExternalLink,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import {
  getCatalogProducts,
  getCatalogCategories,
  getCatalogFamilies,
  getCatalogFeatures,
  queryCatalogProducts,
} from "@/catalog";
import type { CatalogProduct } from "@/catalog/types";
import {
  getLiveProductDataStatus,
  getLiveProductDataRecords,
  refreshLiveProductData,
  subscribeLiveProductData,
} from "@/services/liveProductDataStore";
import { flagProductIntelligenceRecord } from "@/services/productIntelligenceService";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";

import CatalogReferenceSchematic from "./CatalogReferenceSchematic";

type CatalogTone = "cyan" | "indigo" | "emerald" | "amber";

type FamilyReferenceCard = {
  family: string;
  count: number;
  categories: string[];
  transport: string;
  sampleSkus: string[];
};

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

function formatStatus(value: CatalogProduct["status"]): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Active";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatTagLabel(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatVideoSummary(product: CatalogProduct): string {
  const parts: string[] = [];
  if (product.video?.maxResolution) parts.push(product.video.maxResolution);
  if (product.video?.hdr) parts.push("HDR");
  if (typeof product.video?.bandwidthGbps === "number") parts.push(`${product.video.bandwidthGbps}Gbps`);
  return parts.join(" · ") || "Not set";
}

function formatDistanceSummary(product: CatalogProduct): string {
  if (product.distance?.meters) return `${product.distance.meters}m`;
  if (product.distance?.notes) return product.distance.notes;
  if (product.transport === "AVoIP") return "Network dependent";
  return "Project-led";
}

function getVisibleReferenceTags(product: CatalogProduct, limit = 6): string[] {
  const featureTags = (product.features || []).filter(Boolean).slice(0, limit);
  if (featureTags.length > 0) return featureTags;
  return (product.normalizedTags || []).filter(Boolean).slice(0, limit).map(formatTagLabel);
}

function getProductMetrics(product: CatalogProduct): Array<{ label: string; value: string }> {
  return [
    { label: "Type", value: product.subcategory || product.category || "General" },
    { label: "Transport", value: formatTransport(product.transport) },
    { label: "Video", value: formatVideoSummary(product) },
    { label: "Reach", value: formatDistanceSummary(product) },
    { label: "I/O", value: product.ioSummary || "Mixed I/O" },
    { label: "Control", value: product.controlSummary || "Standard" },
  ];
}

function scoreProductForLookup(product: CatalogProduct, query: string): number {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  const sku = product.sku.toLowerCase();
  const name = product.name.toLowerCase();
  const summary = String(product.summary ?? "").toLowerCase();
  const tags = [...(product.features || []), ...(product.normalizedTags || [])].join(" ").toLowerCase();

  let score = 0;

  if (normalizedQuery) {
    if (sku === normalizedQuery) score += 400;
    if (name === normalizedQuery) score += 320;
    if (sku.startsWith(normalizedQuery)) score += 220;
    if (sku.includes(normalizedQuery)) score += 180;
    if (name.includes(normalizedQuery)) score += 120;
    if (summary.includes(normalizedQuery)) score += 70;
    if (tags.includes(normalizedQuery)) score += 50;
  }

  if (product.sourceUrl) score += 16;
  if (product.summary) score += 8;
  if (product.video?.maxResolution) score += 8;
  if (product.distance?.meters) score += 6;
  if ((product.features || []).length > 0) score += 6;
  if ((product.inputs || []).length + (product.outputs || []).length > 0) score += 4;

  return score;
}

function sortProductsForLookup(products: CatalogProduct[], query: string): CatalogProduct[] {
  return [...products].sort((left, right) => {
    const delta = scoreProductForLookup(right, query) - scoreProductForLookup(left, query);
    if (delta !== 0) return delta;
    return left.sku.localeCompare(right.sku);
  });
}

function getProductReferenceLink(product: CatalogProduct): { href: string; isDirect: boolean } {
  const direct = String(product.sourceUrl ?? "").trim();
  if (direct) return { href: direct, isDirect: true };
  return {
    href: `https://www.wyrestorm.com/product/${encodeURIComponent(product.sku.toLowerCase())}/`,
    isDirect: false,
  };
}

function getReferenceUseCase(product: CatalogProduct): string {
  const parts: string[] = [];

  if (product.category) parts.push(product.category.toLowerCase());
  if (product.transport && product.transport !== "Unknown") {
    parts.push(`${formatTransport(product.transport).toLowerCase()} workflows`);
  }
  if (product.distance?.meters) parts.push(`${product.distance.meters}m signal runs`);
  if ((product.features || []).length > 0) parts.push("feature-led specification checks");

  if (parts.length === 0) {
    return "Use this as a quick reference point when you need a high-level product read before going deeper.";
  }

  return `Use this when the conversation points toward ${parts.slice(0, 3).join(", ")}.`;
}

function getReferenceConfidence(product: CatalogProduct, isDirectLink: boolean): string {
  if (isDirectLink) return "Direct product page link captured from catalog intelligence.";
  return "Product page link generated from the SKU pattern for faster hand-off to WyreStorm.com.";
}

function buildFamilyReferenceCards(products: CatalogProduct[]): FamilyReferenceCard[] {
  const grouped = new Map<
    string,
    {
      count: number;
      categories: Map<string, number>;
      transports: Map<string, number>;
      sampleSkus: string[];
    }
  >();

  for (const product of products) {
    if (!product.family) continue;

    let group = grouped.get(product.family);
    if (!group) {
      group = {
        count: 0,
        categories: new Map<string, number>(),
        transports: new Map<string, number>(),
        sampleSkus: [],
      };
      grouped.set(product.family, group);
    }

    group.count += 1;
    group.categories.set(product.category, (group.categories.get(product.category) || 0) + 1);
    group.transports.set(formatTransport(product.transport), (group.transports.get(formatTransport(product.transport)) || 0) + 1);

    if (group.sampleSkus.length < 3) {
      group.sampleSkus.push(product.sku);
    }
  }

  return Array.from(grouped.entries())
    .map(([family, group]) => ({
      family,
      count: group.count,
      categories: Array.from(group.categories.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 2)
        .map(([category]) => category),
      transport:
        Array.from(group.transports.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ||
        "Mixed",
      sampleSkus: group.sampleSkus,
    }))
    .sort((left, right) => right.count - left.count || left.family.localeCompare(right.family))
    .slice(0, 6);
}

export default function CatalogPage() {
  const [q, setQ] = React.useState("");
  const [family, setFamily] = React.useState("All");
  const [category, setCategory] = React.useState("All");
  const [feature, setFeature] = React.useState("All");
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshNotice, setRefreshNotice] = React.useState("");
  const [selectedSku, setSelectedSku] = React.useState("");
  const [diagramExtras, setDiagramExtras] = React.useState<string[]>([]);
  const [flagNote, setFlagNote] = React.useState("");
  const [flagging, setFlagging] = React.useState(false);
  const [flagMessage, setFlagMessage] = React.useState("");

  const deferredQuery = React.useDeferredValue(q);

  const liveStatus = React.useSyncExternalStore(
    subscribeLiveProductData,
    getLiveProductDataStatus,
    getLiveProductDataStatus,
  );

  React.useEffect(() => {
    void refreshLiveProductData({ minIntervalMs: 5 * 60 * 1000 });
  }, []);

  React.useEffect(() => {
    setFlagMessage("");
    setFlagNote("");
  }, [selectedSku]);

  const catalogProducts = getCatalogProducts();
  const families = ["All", ...getCatalogFamilies()];
  const categories = ["All", ...getCatalogCategories()];
  const features = ["All", ...getCatalogFeatures()];
  const totalCatalogRecords = catalogProducts.length;
  const hasActiveFilters = Boolean(q.trim()) || family !== "All" || category !== "All" || feature !== "All";

  const items = sortProductsForLookup(
    queryCatalogProducts({
      q: deferredQuery,
      family,
      category,
      feature,
      transport: "All",
      status: "All",
    }),
    deferredQuery,
  );

  const shortlistItems = items.slice(0, 18);
  const activeSku = items.some((product) => product.sku === selectedSku) ? selectedSku : items[0]?.sku ?? "";
  const selectedProduct = items.find((product) => product.sku === activeSku) ?? null;
  const itemSkuSignature = React.useMemo(() => items.map((product) => product.sku).join("|"), [items]);

  React.useEffect(() => {
    setDiagramExtras((current) => {
      const next = current
        .filter((sku) => sku !== activeSku && items.some((product) => product.sku === sku))
        .slice(0, 3);

      return next.length === current.length && next.every((sku, index) => sku === current[index])
        ? current
        : next;
    });
  }, [activeSku, itemSkuSignature, items]);

  const familyReferenceCards = buildFamilyReferenceCards(hasActiveFilters ? items : catalogProducts);

  const clearFilters = React.useCallback(() => {
    setQ("");
    setFamily("All");
    setCategory("All");
    setFeature("All");
    setSelectedSku("");
    setDiagramExtras([]);
  }, []);

  const focusFamily = React.useCallback((nextFamily: string, fallbackSku?: string) => {
    setQ("");
    setCategory("All");
    setFeature("All");
    setFamily(nextFamily);
    setSelectedSku(fallbackSku ?? "");
    setDiagramExtras([]);
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
    if (feature !== "All") out.push(`Feature: ${formatTagLabel(feature)}`);
    return out;
  }, [category, family, feature, q]);

  const toggleDiagramExtra = React.useCallback((sku: string) => {
    if (sku === activeSku) return;

    setDiagramExtras((current) => {
      if (current.includes(sku)) {
        return current.filter((item) => item !== sku);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, sku];
    });
  }, [activeSku]);

  const clearDiagramExtras = React.useCallback(() => {
    setDiagramExtras([]);
  }, []);

  const selectedProductMetrics = selectedProduct ? getProductMetrics(selectedProduct) : [];
  const selectedProductTags = selectedProduct ? getVisibleReferenceTags(selectedProduct) : [];
  const selectedProductTone = selectedProduct ? toneForProduct(selectedProduct) : "cyan";
  const selectedProductLink = selectedProduct ? getProductReferenceLink(selectedProduct) : null;
  const diagramProducts = React.useMemo(() => {
    if (!selectedProduct) return [];

    const selectedExtras = diagramExtras
      .map((sku) => items.find((product) => product.sku === sku))
      .filter((product): product is CatalogProduct => Boolean(product));

    return [selectedProduct, ...selectedExtras].slice(0, 4);
  }, [diagramExtras, items, selectedProduct]);
  const productIntelligenceRecord = selectedProduct
    ? getLiveProductDataRecords("wyrestorm").find((record) => record.sku === selectedProduct.sku) ?? null
    : null;

  const flagCurrentProduct = React.useCallback(async () => {
    if (!selectedProduct) return;

    setFlagging(true);
    const result = await flagProductIntelligenceRecord({
      vendorType: "wyrestorm",
      brand: "WyreStorm",
      sku: selectedProduct.sku,
      kind: "categorisation",
      message: flagNote.trim() || `Review the family/category/group association for ${selectedProduct.sku}.`,
      note: "Flag raised from the product reference lookup page.",
      source: "catalog-reference",
      createdBy: "catalog-user",
      record: productIntelligenceRecord || {
        vendorType: "wyrestorm",
        brand: "WyreStorm",
        sku: selectedProduct.sku,
        name: selectedProduct.name,
        family: selectedProduct.family,
        category: selectedProduct.category,
        subcategory: selectedProduct.subcategory,
        summary: selectedProduct.summary,
        features: selectedProduct.features || [],
        transport: selectedProduct.transport,
        sourceUrls: selectedProduct.sourceUrl ? [selectedProduct.sourceUrl] : [],
      },
    });
    setFlagging(false);
    setFlagMessage(result.message);
    setFlagNote("");
  }, [flagNote, productIntelligenceRecord, selectedProduct]);

  return (
    <div className="wm-page wm-catalog-page">
      <section className="wm-hero wm-catalog-page__hero">
        <div className="wm-catalog-page__hero-grid">
          <div className="wm-catalog-page__hero-copy">
            <div className="wm-kicker">Reference lookup</div>
            <div className="wm-title-xl">WyreStorm product reference</div>
            <div className="wm-body-sm wm-page-subtitle-muted">
              Search by SKU, family, or feature to get a high-level product overview, then jump to the WyreStorm
              product page for the full specification and supporting detail.
            </div>
          </div>

          <div className="wm-catalog-page__search-panel">
            <div className="wm-catalog-page__search-panel-head">
              <div className="wm-catalog-page__panel-kicker">
                <Sparkles size={15} />
                <span>Lookup assistant</span>
              </div>
              <button
                type="button"
                className="wm-btn wm-catalog-page__refresh-btn"
                onClick={() => void refreshCatalog()}
                disabled={refreshing}
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "wm-catalog-page__refresh-icon is-spinning" : "wm-catalog-page__refresh-icon"}
                />
                <span>{refreshing ? "Refreshing..." : "Refresh data"}</span>
              </button>
            </div>

            <label className="wm-form-field wm-catalog-page__hero-search">
              <span className="wm-form-label">Start with a SKU, family, or capability</span>
              <div className="wm-catalog-page__search-shell">
                <Search size={18} className="wm-catalog-page__search-icon" />
                <input
                  className="wm-catalog-page__search-input"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search SKU, product name, family, category, feature"
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
                  {families.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="wm-form-field wm-catalog-page__filter-field">
                <span className="wm-form-label">Category</span>
                <select className="wm-form-input" value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="wm-form-field wm-catalog-page__filter-field">
                <span className="wm-form-label">Feature</span>
                <select className="wm-form-input" value={feature} onChange={(event) => setFeature(event.target.value)}>
                  {features.map((item) => (
                    <option key={item} value={item}>
                      {formatTagLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wm-catalog-page__search-foot">
              <div className="wm-catalog-page__search-foot-copy">
                <SlidersHorizontal size={15} />
                <span>
                  {hasActiveFilters
                    ? "Filters are narrowing the shortlist so you can inspect one product at a time."
                    : "Use a SKU for the fastest answer, or browse by family when you only know the solution area."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wm-section wm-section--tone-cyan">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Reference result</h2>
            <p>
              {items.length === 0
                ? "No products match the current filters."
                : "Inspect the selected product overview on the left and use the shortlist to jump between matches."}
            </p>
          </div>
        </div>

        {selectedProduct && selectedProductLink ? (
          <div className="wm-catalog-page__reference-layout">
            <article
              className={`wm-work-card wm-catalog-page__result-card wm-catalog-page__reference-card wm-catalog-page__result-card--${selectedProductTone}`}
            >
              <div className="wm-catalog-page__result-head">
                <div className="wm-catalog-page__result-copy">
                  <div className="wm-catalog-page__result-meta">
                    <strong>{selectedProduct.sku}</strong>
                    <span>
                      {selectedProduct.family} · {selectedProduct.category}
                      {selectedProduct.status !== "active" ? ` · ${formatStatus(selectedProduct.status)}` : ""}
                    </span>
                  </div>
                  <div className="wm-catalog-page__result-title">{selectedProduct.name}</div>
                </div>

                <div className={`wm-catalog-page__transport-pill wm-catalog-page__transport-pill--${selectedProductTone}`}>
                  {formatTransport(selectedProduct.transport)}
                </div>
              </div>

              <div className="wm-catalog-page__result-summary">
                {selectedProduct.summary || "High-level product summary not yet available for this record."}
              </div>

              <div className="wm-catalog-page__reference-overview">
                <div className="wm-catalog-page__reference-overview-card">
                  <span className="wm-catalog-page__reference-overview-label">Use this when</span>
                  <strong className="wm-catalog-page__reference-overview-value">{getReferenceUseCase(selectedProduct)}</strong>
                </div>
                <div className="wm-catalog-page__reference-overview-card">
                  <span className="wm-catalog-page__reference-overview-label">Further information</span>
                  <strong className="wm-catalog-page__reference-overview-value">{getReferenceConfidence(selectedProduct, selectedProductLink.isDirect)}</strong>
                </div>
              </div>

              <div className="wm-catalog-page__metric-grid">
                {selectedProductMetrics.map((metric) => (
                  <div key={`${selectedProduct.sku}_${metric.label}`} className="wm-catalog-page__metric-card">
                    <span className="wm-catalog-page__metric-label">{metric.label}</span>
                    <strong className="wm-catalog-page__metric-value">{metric.value}</strong>
                  </div>
                ))}
              </div>

              {selectedProductTags.length > 0 ? (
                <div className="wm-catalog-page__tag-row">
                  {selectedProductTags.map((tag) => (
                    <span key={`${selectedProduct.sku}_${tag}`} className="wm-catalog-page__tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <section className="wm-catalog-page__schematic-section">
                <div className="wm-catalog-page__schematic-section-head">
                  <div>
                    <div className="wm-catalog-page__reference-overview-label">Reference schematic</div>
                    <div className="wm-catalog-page__schematic-section-title">
                      Visualise how the selected WyreStorm products fit between example sources and room outputs.
                    </div>
                  </div>

                  {diagramExtras.length > 0 ? (
                    <button type="button" className="wm-btn" onClick={clearDiagramExtras}>
                      Clear extras
                    </button>
                  ) : null}
                </div>

                <div className="wm-body-sm">
                  Primary SKU: {selectedProduct.sku}
                  {diagramExtras.length > 0
                    ? ` · Also in view: ${diagramExtras.join(", ")}`
                    : " · Add up to three extra shortlisted products to see how they sit in the same signal path."}
                </div>

                <CatalogReferenceSchematic products={diagramProducts} />
              </section>

              <div className="wm-catalog-page__reference-actions">
                <a
                  className="wm-btn wm-catalog-page__external-link"
                  href={selectedProductLink.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} />
                  <span>Open product page</span>
                </a>
                <button
                  type="button"
                  className="wm-btn"
                  onClick={() => void flagCurrentProduct()}
                  disabled={flagging}
                >
                  {flagging ? "Flagging..." : "Flag categorisation"}
                </button>
              </div>

              <div className="wm-catalog-page__flag-form">
                <label className="wm-form-field">
                  <span className="wm-form-label">Review note</span>
                  <input
                    className="wm-form-input"
                    value={flagNote}
                    onChange={(event) => setFlagNote(event.target.value)}
                    placeholder="Optional note for the administrator"
                  />
                </label>
                {flagMessage ? <div className="wm-body-sm">{flagMessage}</div> : null}
              </div>
            </article>

            <aside className="wm-work-card wm-catalog-page__shortlist-card">
              <div className="wm-catalog-page__shortlist-head">
                <div className="wm-title-lg">Shortlist</div>
                <div className="wm-body-sm">
                  {items.length > shortlistItems.length
                    ? `Showing the first ${shortlistItems.length} of ${items.length} matches. Refine the search for a tighter set.`
                    : `${items.length} ${items.length === 1 ? "match" : "matches"} ready to inspect.`}
                </div>
              </div>

              <div className="wm-catalog-page__shortlist">
                {shortlistItems.map((product) => {
                  const tone = toneForProduct(product);
                  const isActive = product.sku === activeSku;
                  const isInSchematic = isActive || diagramExtras.includes(product.sku);
                  const schematicFull = !isInSchematic && diagramExtras.length >= 3;

                  return (
                    <button
                      key={product.sku}
                      type="button"
                      className={`wm-catalog-page__shortlist-item${isActive ? " is-active" : ""}`}
                      onClick={() => setSelectedSku(product.sku)}
                    >
                      <div className="wm-catalog-page__shortlist-row">
                        <span className="wm-catalog-page__sku-pill">{product.sku}</span>
                        <span className={`wm-catalog-page__transport-pill wm-catalog-page__transport-pill--${tone}`}>
                          {formatTransport(product.transport)}
                        </span>
                      </div>

                      <div className="wm-catalog-page__shortlist-title">{product.name}</div>

                      <div className="wm-catalog-page__shortlist-copy">
                        {product.family} · {product.category}
                      </div>

                      <div className="wm-catalog-page__shortlist-copy">
                        {product.summary || "Open to inspect the high-level reference overview."}
                      </div>

                      <div className="wm-catalog-page__shortlist-actions">
                        <button
                          type="button"
                          className={`wm-catalog-page__shortlist-action-btn${isInSchematic ? " is-active" : ""}`}
                          disabled={isActive || schematicFull}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isActive && !schematicFull) {
                              toggleDiagramExtra(product.sku);
                            }
                          }}
                        >
                          {isActive
                            ? "Primary in schematic"
                            : isInSchematic
                              ? "Remove from schematic"
                              : schematicFull
                                ? "Schematic full"
                                : "Add to schematic"}
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        ) : (
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
        )}
      </section>

      <section className="wm-section wm-section--tone-emerald">
        <CollapsibleCard
          id="catalog-browse-families"
          title={hasActiveFilters ? "Families in this view" : "Browse by family"}
          subtitle={hasActiveFilters
            ? "Pivot quickly by family without resetting the full search."
            : "Optional family overviews when the exact SKU is not known yet."}
          defaultCollapsed
        >
          <div className="wm-catalog-page__family-grid">
            {familyReferenceCards.map((card) => (
              <article key={card.family} className="wm-work-card wm-catalog-page__family-card">
                <div className="wm-catalog-page__family-head">
                  <div>
                    <div className="wm-catalog-page__family-title">{card.family}</div>
                    <div className="wm-catalog-page__family-count">
                      {card.count} {card.count === 1 ? "product" : "products"}
                    </div>
                  </div>
                </div>

                <div className="wm-catalog-page__family-copy">
                  Typical categories: {card.categories.join(" · ") || "Mixed"}.
                </div>

                <div className="wm-catalog-page__family-copy">
                  Primary transport: {card.transport}
                </div>

                <div className="wm-catalog-page__tag-row">
                  {card.sampleSkus.map((sku) => (
                    <span key={`${card.family}_${sku}`} className="wm-catalog-page__tag">
                      {sku}
                    </span>
                  ))}
                </div>

                <div className="wm-actions-row">
                  <button
                    type="button"
                    className="wm-btn"
                    onClick={() => focusFamily(card.family, card.sampleSkus[0])}
                  >
                    Filter this family
                  </button>
                </div>
              </article>
            ))}
          </div>
        </CollapsibleCard>
      </section>

      <section className="wm-section wm-section--tone-indigo wm-catalog-page__status-section">
        <CollapsibleCard
          id="catalog-reference-status"
          title="Reference data status"
          subtitle={liveStatus.available
            ? "Live product intelligence is feeding this lookup tool."
            : "You are browsing the latest cached or seeded catalog snapshot."}
          defaultCollapsed
        >
          <div className="wm-catalog-page__status-head">
            <div className="wm-body-sm">
              {activeFilters.length > 0 ? activeFilters.join(" · ") : "All products in view"}
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
              <div className="wm-body-sm">WyreStorm records ready for lookup</div>
            </article>
            <article className="wm-work-card wm-catalog-page__status-card wm-catalog-page__status-card--emerald">
              <div className="wm-catalog-page__status-label">Matches</div>
              <div className="wm-title-lg">{items.length}</div>
              <div className="wm-body-sm">Products matching the current search</div>
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
        </CollapsibleCard>
      </section>
    </div>
  );
}
