import * as React from "react";
import CatalogueHeader from "./CatalogueHeader";
import CatalogueQuickChips from "./CatalogueQuickChips";
import CatalogueFilters from "./CatalogueFilters";
import ProductCard from "./ProductCard";
import ProductDigestRow from "./ProductDigestRow";
import CompareDrawer from "./CompareDrawer";
import ProductDetailDrawer from "./ProductDetailDrawer";
import { getCategoryAccent } from "./catalogCategoryAccent";
import { realCatalogueProducts } from "./catalogue.data.generated";
import {
  filterProducts,
  groupProductsByTechnology,
  uniqueValues,
  type CatalogueSort,
} from "./catalogue.utils";
import type {
  CatalogueFilters as CatalogueFiltersState,
  CatalogueStatus,
  CatalogueTechnology,
} from "./catalogue.types";
import { TECHNOLOGY_OPTIONS } from "./catalogue.types";
import "./catalogue2.css";

const STATUS_OPTIONS: CatalogueStatus[] = ["Current", "New", "Legacy", "Coming Soon"];

function toggleInArray<T>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

export default function CataloguePage() {
  const [viewMode, setViewMode] = React.useState<"list" | "cards">("list");
  const [filters, setFilters] = React.useState<CatalogueFiltersState>({
    search: "",
    technology: [],
    category: [],
    featureTags: [],
    status: [],
  });

  const [compareSkus, setCompareSkus] = React.useState<string[]>([]);
  const [selectedSku, setSelectedSku] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<CatalogueSort>("relevance");

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.technology.length > 0 ||
    filters.category.length > 0 ||
    filters.featureTags.length > 0 ||
    filters.status.length > 0;

  const categoryOptions = React.useMemo<string[]>(
    () => uniqueValues<string>(realCatalogueProducts.map((x) => x.category)).sort(),
    []
  );

  const featureOptions = React.useMemo<string[]>(
    () => uniqueValues<string>(realCatalogueProducts.flatMap((x) => x.featureTags)).sort(),
    []
  );

  const results = React.useMemo(
    () => {
      if (!hasActiveFilters) {
        return [];
      }
      return filterProducts(realCatalogueProducts, filters, sortBy);
    },
    [filters, sortBy, hasActiveFilters]
  );

  const compareProducts = React.useMemo(
    () => realCatalogueProducts.filter((product) => compareSkus.includes(product.sku)),
    [compareSkus]
  );

  const selectedProduct = React.useMemo(
    () => realCatalogueProducts.find((product) => product.sku === selectedSku) ?? null,
    [selectedSku]
  );

  const resultGroups = React.useMemo(() => groupProductsByTechnology(results), [results]);

  function toggleTechnology(value: CatalogueTechnology) {
    setFilters((prev) => ({ ...prev, technology: toggleInArray(prev.technology, value) }));
  }

  function toggleCategory(value: string) {
    setFilters((prev) => ({ ...prev, category: toggleInArray(prev.category, value) }));
  }

  function toggleFeature(value: string) {
    setFilters((prev) => ({ ...prev, featureTags: toggleInArray(prev.featureTags, value) }));
  }

  function toggleStatus(value: CatalogueStatus) {
    setFilters((prev) => ({ ...prev, status: toggleInArray(prev.status, value) }));
  }

  function toggleCompare(sku: string) {
    setCompareSkus((prev) => {
      if (prev.includes(sku)) {
        return prev.filter((item) => item !== sku);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, sku];
    });
  }

  function clearFilters() {
    setFilters({
      search: "",
      technology: [],
      category: [],
      featureTags: [],
      status: [],
    });
    setSortBy("relevance");
  }

  return (
    <div className="wm-page wm-catalog-page wm-cat2">
      <section className="wm-hero">
        <CatalogueHeader
          search={filters.search}
          onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
          resultCount={results.length}
          compareCount={compareSkus.length}
        />

        <CatalogueQuickChips
          technologies={TECHNOLOGY_OPTIONS}
          selected={filters.technology}
          onToggle={toggleTechnology}
        />
      </section>

      <section className="wm-section wm-section--tone-cyan">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Catalogue workspace</h2>
            <p>Filter by technology, compare shortlist options, and inspect product detail without leaving the catalog.</p>
          </div>
        </div>

        <div className="wm-section__body">
          <div className="wm-cat2__layout">
            <CatalogueFilters
              technologyOptions={TECHNOLOGY_OPTIONS}
              categoryOptions={categoryOptions}
              featureOptions={featureOptions}
              statusOptions={STATUS_OPTIONS}
              selectedTechnology={filters.technology}
              selectedCategory={filters.category}
              selectedFeatures={filters.featureTags}
              selectedStatus={filters.status}
              onToggleTechnology={toggleTechnology}
              onToggleCategory={toggleCategory}
              onToggleFeature={toggleFeature}
              onToggleStatus={toggleStatus}
              onClear={clearFilters}
            />

            <main className="wm-work-card wm-cat2__results">
              <div className="wm-cat2__toolbar wm-cat2__toolbar--stack">
                <div>
                  <h2>Results</h2>
                  <p>Search by SKU, technology family, or specific capability.</p>
                </div>

                <div className="wm-cat2__sort">
                  <label htmlFor="wm-cat2-sort">Sort</label>
                  <select
                    id="wm-cat2-sort"
                    className="wm-cat2__select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as CatalogueSort)}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="sku-asc">SKU A-Z</option>
                    <option value="sku-desc">SKU Z-A</option>
                    <option value="technology">Technology</option>
                  </select>
                </div>

                <div className="wm-cat2__view-toggle" role="tablist" aria-label="Catalog view">
                  <button
                    type="button"
                    className={viewMode === "list" ? "wm-cat2__view-btn is-active" : "wm-cat2__view-btn"}
                    onClick={() => setViewMode("list")}
                  >
                    Digest list
                  </button>
                  <button
                    type="button"
                    className={viewMode === "cards" ? "wm-cat2__view-btn is-active" : "wm-cat2__view-btn"}
                    onClick={() => setViewMode("cards")}
                  >
                    Cards
                  </button>
                </div>
              </div>

              {!hasActiveFilters ? (
                <div className="wm-work-card wm-cat2__empty">
                  <h3>Search the WyreStorm product catalogue</h3>
                  <p>
                    Start by entering a SKU, choosing a technology type, or selecting a feature to display matching products.
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="wm-work-card wm-cat2__empty">
                  <h3>No matching products found</h3>
                  <p>Try removing one or more filters or use a broader search term.</p>
                  <button type="button" className="wm-cat2__btn wm-cat2__btn--primary" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="wm-cat2__groups">
                  {resultGroups.map((group) => {
                    const accent = getCategoryAccent(group.title);
                    const categoryPreview = group.categories.slice(0, 3).join(" · ");
                    const extraCategoryCount = Math.max(group.categories.length - 3, 0);
                    const groupStyle = {
                      "--wm-cat2-group-accent": accent.chipBg,
                      "--wm-cat2-group-accent-border": accent.border,
                      "--wm-cat2-group-accent-text": accent.chipText,
                    } as React.CSSProperties;

                    return (
                      <section key={group.key} className="wm-cat2__group" style={groupStyle}>
                        <div className="wm-cat2__group-head">
                          <div className="wm-cat2__group-copy">
                            <p className="wm-cat2__group-label">Product type</p>
                            <h3>{group.title}</h3>
                            <p>
                              {categoryPreview || "Catalog products"}
                              {extraCategoryCount > 0 ? ` +${extraCategoryCount} more` : ""}
                            </p>
                          </div>
                          <span className="wm-cat2__group-count">
                            {group.items.length} {group.items.length === 1 ? "item" : "items"}
                          </span>
                        </div>

                        {viewMode === "list" ? (
                          <div className="wm-cat2__list">
                            {group.items.map((product) => (
                              <ProductDigestRow
                                key={product.sku}
                                product={product}
                                compared={compareSkus.includes(product.sku)}
                                onToggleCompare={toggleCompare}
                                onViewDetails={setSelectedSku}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="wm-cat2__grid">
                            {group.items.map((product) => (
                              <ProductCard
                                key={product.sku}
                                product={product}
                                compared={compareSkus.includes(product.sku)}
                                onToggleCompare={toggleCompare}
                                onViewDetails={setSelectedSku}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </main>

            <CompareDrawer
              products={compareProducts}
              onRemove={(sku) => setCompareSkus((prev) => prev.filter((x) => x !== sku))}
            />
          </div>
        </div>
      </section>

      <ProductDetailDrawer product={selectedProduct} onClose={() => setSelectedSku(null)} />
    </div>
  );
}
