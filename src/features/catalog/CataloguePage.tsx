import * as React from "react";
import CatalogueHeader from "./CatalogueHeader";
import CatalogueQuickChips from "./CatalogueQuickChips";
import CatalogueFilters from "./CatalogueFilters";
import ProductCard from "./ProductCard";
import CompareDrawer from "./CompareDrawer";
import ProductDetailDrawer from "./ProductDetailDrawer";
import { realCatalogueProducts } from "./catalogue.data.generated";
import { filterProducts, uniqueValues, type CatalogueSort } from "./catalogue.utils";
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
    <div className="wm-cat2">
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

        <main className="wm-cat2__results">
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
          </div>

          {!hasActiveFilters ? (
            <div className="wm-cat2__empty">
              <h3>Search the WyreStorm product catalogue</h3>
              <p>
                Start by entering a SKU, choosing a technology type, or selecting a feature to display matching products.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="wm-cat2__empty">
              <h3>No matching products found</h3>
              <p>Try removing one or more filters or use a broader search term.</p>
              <button type="button" className="wm-cat2__btn wm-cat2__btn--primary" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="wm-cat2__grid">
              {results.map((product) => (
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
        </main>

        <CompareDrawer
          products={compareProducts}
          onRemove={(sku) => setCompareSkus((prev) => prev.filter((x) => x !== sku))}
        />
      </div>

      <ProductDetailDrawer product={selectedProduct} onClose={() => setSelectedSku(null)} />
    </div>
  );
}