import { getActiveProject, subscribeProjects, updateProject } from "@/features/projects/projectStore";
import { getCatalogProducts } from "@/catalog";
import * as React from "react";
import CatalogueHeader from "./CatalogueHeader";
import SelectedSystemPanel from "./SelectedSystemPanel";
import CatalogueFilters from "./CatalogueFilters";
import SolutionFamilyFilterPanel from "@/features/catalog/components/SolutionFamilyFilterPanel";
import { EMPTY_CATALOGUE_FILTER_STATE } from "@/features/catalog/catalogFamilyFilterModel";
import { filterCatalogueProducts, hasActiveFamilyFilters } from "@/features/catalog/catalogFamilyFilterUtils";
import ProductCard from "./ProductCard";
import ProductDigestRow from "./ProductDigestRow";
import CompareDrawer from "./CompareDrawer";
import ProductDetailDrawer from "./ProductDetailDrawer";
import { subscribeLiveProductData, getLiveProductDataToken } from "@/services/liveProductDataStore";
import { getCategoryAccent } from "./catalogCategoryAccent";
import { getRealCatalogueProducts } from "./catalogue.data.generated";
import {
  buildFilterGroups,
  filterProducts,
  groupProductsByTechnology,
  uniqueValues,
  type CatalogueSort,
} from "./catalogue.utils";
import type {
  CatalogueFilters as CatalogueFiltersState,
  CatalogueStatus,
} from "./catalogue.types";
import { TECHNOLOGY_OPTIONS, type CatalogueTechnology } from "./catalogue.types";
import "./catalogue2.css";
import type { CatalogueProduct } from "./catalogue.types";
import { getRecommendedCatalogFamilyFromProject } from "./catalogFamilyRecommendation";

const STATUS_OPTIONS: CatalogueStatus[] = ["Current", "Legacy", "Coming Soon"];

function toggleInArray<T>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

export default function CataloguePage() {
  const [projectStoreTick, setProjectStoreTick] = React.useState(0);
  void projectStoreTick;
  const activeProject = getActiveProject() ?? null;
  const [viewMode, setViewMode] = React.useState<"list" | "cards">("list");
function addSkuToProject(sku: string) {
  if (!activeProject) return;

  const existing = activeProject.catalog?.skus ?? [];

  const product = filteredProducts.find((item) => item.sku === sku) ?? catalogueProducts.find((item) => item.sku === sku);

if (existing.includes(sku)) {
  if (product) {
    ensureBomItemFromProduct(product);
  }
  return;
}

updateProject(activeProject.id, {
  catalog: {
    ...activeProject.catalog,
    skus: [...existing, sku],
    bomItems: [
      ...(activeProject.catalog?.bomItems ?? []),
      ...(product
        ? [{
            sku: product.sku,
            quantity: 1,
            role: "Product",
            description: product.summary || product.name || product.sku
          }]
        : [])
    ]
  },
});
}

function ensureBomItemFromProduct(product: { sku: string; name?: string; summary?: string }) {
  if (!activeProject) return;

  const currentCatalog = activeProject.catalog ?? { skus: [], bomItems: [] };
  const currentBomItems = currentCatalog.bomItems ?? [];
  const existing = currentBomItems.find((item) => item.sku === product.sku);

  if (existing) return;

  updateProject(activeProject.id, {
    catalog: {
      ...currentCatalog,
      skus: Array.from(new Set([...(currentCatalog.skus ?? []), product.sku])),
      bomItems: [
        ...currentBomItems,
        {
          sku: product.sku,
          quantity: 1,
          role: "Product",
          description: product.summary || product.name || product.sku
        }
      ]
    }
  });
}

function addBomQty(sku: string) {
  if (!activeProject) return;

  const currentCatalog = activeProject.catalog ?? { skus: [], bomItems: [] };
  const skus = Array.from(new Set([...(currentCatalog.skus ?? []), sku]));
  const bomItems = [...(currentCatalog.bomItems ?? [])];
  const index = bomItems.findIndex((item) => item.sku === sku);

  if (index >= 0) {
    bomItems[index] = {
      ...bomItems[index],
      quantity: Math.max(1, (bomItems[index].quantity || 0) + 1)
    };
  } else {
    bomItems.push({
      sku,
      quantity: 1,
      role: "Product",
      description: sku
    });
  }

  updateProject(activeProject.id, {
    catalog: {
      ...currentCatalog,
      skus,
      bomItems
    }
  });
}

function reduceBomQty(sku: string) {
  if (!activeProject) return;

  const currentCatalog = activeProject.catalog ?? { skus: [], bomItems: [] };
  const bomItems = [...(currentCatalog.bomItems ?? [])];
  const index = bomItems.findIndex((item) => item.sku === sku);

  if (index < 0) return;

  const nextQty = Math.max(0, (bomItems[index].quantity || 0) - 1);

  bomItems[index] = {
    ...bomItems[index],
    quantity: nextQty
  };

  updateProject(activeProject.id, {
    catalog: {
      ...currentCatalog,
      bomItems
    }
  });
}

function removeSkuFromProject(sku: string) {
  if (!activeProject) return;

  const currentCatalog = activeProject.catalog ?? { skus: [], bomItems: [] };

  updateProject(activeProject.id, {
    catalog: {
      ...currentCatalog,
      skus: (currentCatalog.skus ?? []).filter((item) => item !== sku),
      bomItems: (currentCatalog.bomItems ?? []).filter((item) => item.sku !== sku)
    }
  });
}

  const [liveDataToken, setLiveDataToken] = React.useState(() => getLiveProductDataToken());
  const [filters, setFilters] = React.useState<CatalogueFiltersState>({
    search: "",
    technology: [],
    category: [],
    subType: [],
    featureTags: [],
    status: [],
  });

  const [compareSkus, setCompareSkus] = React.useState<string[]>([]);
  const [selectedSku, setSelectedSku] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<CatalogueSort>("relevance");
  const [familyFilterState, setFamilyFilterState] = React.useState(EMPTY_CATALOGUE_FILTER_STATE);
  const recommendedFamilyHandOff = React.useMemo(
    () => getRecommendedCatalogFamilyFromProject(activeProject),
    [activeProject]
  );
  const didSeedRecommendedFamilyRef = React.useRef(false);

  React.useEffect(() => {
    return subscribeLiveProductData(() => {
      setLiveDataToken(getLiveProductDataToken());
    });
  }, []);

  React.useEffect(() => {
    return subscribeProjects(() => {
      setProjectStoreTick((value) => value + 1);
    });
  }, []);

  void liveDataToken;
  const sourceCatalogueProducts = getCatalogProducts();
  const catalogueProducts = getRealCatalogueProducts();

function productMatchesRecommendedFamily(
  product: CatalogueProduct,
  family: string
): boolean {
  const needle = String(family || "").trim().toLowerCase();

  const haystack = [
    String(product.technology ?? ""),
    ...((product.technologyTags ?? []) as string[]),
    String(product.category ?? ""),
    String(product.subType ?? ""),
    ...((product.applications ?? []) as string[]),
    ...((product.featureTags ?? []) as string[])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!needle) return true;
  if (needle === "usb extension") return haystack.includes("usb");
  if (needle === "apollo") return haystack.includes("apollo") || haystack.includes("presentation") || haystack.includes("wireless");
  if (needle === "video wall") return haystack.includes("video wall") || haystack.includes("videowall");
  return haystack.includes(needle);
}

const recommendedFamilies = activeProject?.discovery?.recommendedFamilies ?? [];

const filteredProducts = React.useMemo(() => {
  if (!recommendedFamilies.length) return catalogueProducts;

  return catalogueProducts.filter((p) =>
    recommendedFamilies.some((family) => productMatchesRecommendedFamily(p, family))
  );
}, [catalogueProducts, recommendedFamilies]);

  const familyFiltersActive = hasActiveFamilyFilters(familyFilterState);

  const familyFilteredProducts = React.useMemo(() => {
    if (!familyFiltersActive) {
      return filteredProducts;
    }

    const allowedSkus = new Set(
      filterCatalogueProducts(
        sourceCatalogueProducts.map(product => product),
        familyFilterState
      ).map(product => product.sku)
    );

    return filteredProducts.filter(product => allowedSkus.has(product.sku));
  }, [filteredProducts, familyFilterState, familyFiltersActive, sourceCatalogueProducts]);

  React.useEffect(() => {
    if (didSeedRecommendedFamilyRef.current) return;
    if (!recommendedFamilyHandOff?.family) return;

    setFamilyFilterState((prev) => {
      if (prev.family) return prev;
      return {
        ...prev,
        family: recommendedFamilyHandOff.family
      };
    });

    didSeedRecommendedFamilyRef.current = true;
  }, [recommendedFamilyHandOff]);

  const hasClassicFilters =
    filters.search.trim().length > 0 ||
    filters.technology.length > 0 ||
    filters.category.length > 0 ||
    filters.subType.length > 0 ||
    filters.featureTags.length > 0 ||
    filters.status.length > 0;
  const hasActiveFilters = hasClassicFilters || familyFiltersActive;

  const productTypeMenuProducts = React.useMemo(
    () =>
      filterProducts(
        familyFilteredProducts,
        { ...filters, search: "", category: [], subType: [], featureTags: [] },
        "relevance"
      ),
    [familyFilteredProducts, filters]
  );

  const subTypeMenuProducts = React.useMemo(
    () =>
      filterProducts(
        familyFilteredProducts,
        { ...filters, search: "", subType: [], featureTags: [] },
        "relevance"
      ),
    [familyFilteredProducts, filters]
  );

  const featureMenuProducts = React.useMemo(
    () =>
      filterProducts(
        familyFilteredProducts,
        { ...filters, search: "", featureTags: [] },
        "relevance"
      ),
    [familyFilteredProducts, filters]
  );

  const productTypeOptions = React.useMemo<string[]>(
    () => uniqueValues<string>(productTypeMenuProducts.map((x) => x.category)).sort(),
    [productTypeMenuProducts]
  );

  const subTypeGroups = React.useMemo(
    () => buildFilterGroups(subTypeMenuProducts, "subType"),
    [subTypeMenuProducts]
  );

  const featureGroups = React.useMemo(
    () => buildFilterGroups(featureMenuProducts, "feature"),
    [featureMenuProducts]
  );

  const results = React.useMemo(
    () => {
      if (!hasActiveFilters) {
        return [];
      }
      return filterProducts(familyFilteredProducts, filters, sortBy);
    },
    [familyFilteredProducts, filters, sortBy, hasActiveFilters]
  );

  const compareProducts = React.useMemo(
    () => familyFilteredProducts.filter((product) => compareSkus.includes(product.sku)),
    [familyFilteredProducts, compareSkus]
  );

  const selectedProduct = React.useMemo(
    () => familyFilteredProducts.find((product) => product.sku === selectedSku) ?? null,
    [familyFilteredProducts, selectedSku]
  );

  const resultGroups = React.useMemo(() => groupProductsByTechnology(results), [results]);

  function toggleTechnology(value: CatalogueTechnology) {
    setFilters((prev) => ({ ...prev, technology: toggleInArray(prev.technology, value) }));
  }

  function toggleCategory(value: string) {
    setFilters((prev) => ({ ...prev, category: toggleInArray(prev.category, value) }));
  }

  function toggleSubType(value: string) {
    setFilters((prev) => ({ ...prev, subType: toggleInArray(prev.subType, value) }));
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
      subType: [],
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
          {recommendedFamilyHandOff?.family ? (
            <div
              style={{
                marginBottom: 14,
                borderRadius: 16,
                border: "1px solid rgba(72,210,255,0.28)",
                background: "linear-gradient(180deg, rgba(8,33,63,0.95), rgba(6,22,43,0.95))",
                padding: "12px 14px",
                display: "grid",
                gap: 8
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.78 }}>
                Discovery recommendation
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                    {recommendedFamilyHandOff.family === "avoip" ? "AVoIP" :
                     recommendedFamilyHandOff.family === "videoWall" ? "Video Wall" :
                     recommendedFamilyHandOff.family.charAt(0).toUpperCase() + recommendedFamilyHandOff.family.slice(1)}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {recommendedFamilyHandOff.reason}
                  </div>
                </div>
                <button
                  type="button"
                  className="wm-btn"
                  onClick={() => setFamilyFilterState(EMPTY_CATALOGUE_FILTER_STATE)}
                >
                  Clear recommendation
                </button>
              </div>
            </div>
          ) : null}
          <div className="wm-cat2__layout">
            <SolutionFamilyFilterPanel
              state={familyFilterState}
              onChange={setFamilyFilterState}
            />
            <CatalogueFilters
              technologyOptions={TECHNOLOGY_OPTIONS}
              productTypeOptions={productTypeOptions}
              subTypeGroups={subTypeGroups}
              featureGroups={featureGroups}
              statusOptions={STATUS_OPTIONS}
              selectedTechnology={filters.technology}
              selectedProductTypes={filters.category}
              selectedSubTypes={filters.subType}
              selectedFeatures={filters.featureTags}
              selectedStatus={filters.status}
              onToggleTechnology={toggleTechnology}
              onToggleProductType={toggleCategory}
              onToggleSubType={toggleSubType}
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
                    const subTypePreview = group.subTypes.slice(0, 3).join(" | ");
                    const extraSubTypeCount = Math.max(group.subTypes.length - 3, 0);
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
                              {subTypePreview || "Catalog products"}
                              {extraSubTypeCount > 0 ? ` +${extraSubTypeCount} more` : ""}
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
