import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Clock3,
  Filter,
  FolderOpen,
  Link2,
  PackageSearch,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

import {
  applyCatalogOverrides,
  buildFacetIndex,
  createDefaultCatalogFilterState,
  filterCatalogProducts,
  getCatalogBadges,
  getCatalogMatchReasons,
  parseDependencySkuText,
  uniqueStrings,
  type CatalogDeploymentRole,
  type CatalogFamily,
  type CatalogFilterState,
  type CatalogProduct as EnrichedCatalogProduct,
  type CatalogRole,
  type CatalogTechnology,
} from "./catalogIntelligence";

type RawCatalogProduct = {
  id: string;
  sku: string;
  name: string;
  family: string;
  series: string;
  category: string;
  summary: string;
  tags: string[];
};

type ViewMode = "grid" | "list";

type RecentSearch = {
  value: string;
  timestamp: number;
};

type SuggestionSource = {
  key: string;
  label: string;
  source: "recent" | "project" | "catalog" | "taxonomy";
};

const MAX_RECENT_SEARCHES = 8;

const TAXONOMY = {
  applications: [
    "Boardroom",
    "Meeting room",
    "Classroom",
    "Training room",
    "Video wall",
    "LED wall",
    "Hybrid UC",
    "BYOD",
    "BYOM",
    "Hospitality",
    "Retail",
    "Control room",
    "Teams room",
    "NDI",
  ],
  roomTypes: [
    "Huddle space",
    "Small room",
    "Medium room",
    "Large room",
    "Lecture hall",
    "Lobby",
    "Control room",
    "Broadcast suite",
  ],
  budgetBands: ["Entry", "Value", "Mid", "Premium", "Enterprise"],
};

const QUICK_FAMILIES: CatalogFamily[] = [
  "AV over IP",
  "Presentation Switching",
  "Video Walls",
  "Unified Communication",
  "Synergy",
];

const QUICK_ROLES: CatalogRole[] = [
  "presentation-switcher",
  "video-bar",
  "matrix-switcher",
  "video-wall-processor",
  "multiview-processor",
];

const QUICK_TECHNOLOGIES: CatalogTechnology[] = [
  "wireless-casting",
  "usb-c",
  "dante",
  "multiview",
  "hdbaset",
  "networkhd",
];

const FALLBACK_PRODUCTS: RawCatalogProduct[] = [
  {
    id: "nhd-100-tx",
    sku: "NHD-100-TX",
    name: "Low Bandwidth AV over IP Encoder",
    family: "NHD",
    series: "NHD-100 Series",
    category: "AVoIP Encoder",
    summary: "Lower-bandwidth AV over IP encoder for value-led deployments where efficient transport and practical control features matter.",
    tags: ["AVoIP", "Low bandwidth", "IR pass-through", "Value"],
  },
  {
    id: "nhd-100-rx",
    sku: "NHD-100-RX",
    name: "Low Bandwidth AV over IP Decoder",
    family: "NHD",
    series: "NHD-100 Series",
    category: "AVoIP Decoder",
    summary: "Matching low-bandwidth decoder with IR pass-through and practical deployment flexibility for everyday AV distribution.",
    tags: ["AVoIP", "Low bandwidth", "IR pass-through", "Meeting room"],
  },
  {
    id: "nhd-128-ndi-brg",
    sku: "NHD-128-NDI-BRG",
    name: "NDI Bridge Gateway",
    family: "NHD",
    series: "NHD-100 Series",
    category: "NDI Bridge",
    summary: "NDI bridge product for integrating NDI workflows and compatible PTZ camera sources into the NHD ecosystem.",
    tags: ["NDI", "NDI bridge", "Camera integration", "APO-210-NDI-PTZ", "Multiview"],
  },
  {
    id: "nhd-500-rx-v2",
    sku: "NHD-500-RX v2",
    name: "Ultra-Low Latency 4K Decoder",
    family: "NHD",
    series: "NHD-500 Series",
    category: "AVoIP Decoder",
    summary: "4K60 HDMI 2.0 decoder with ultra-low latency, Dante AV-A readiness and USB routing support.",
    tags: ["AVoIP", "HDMI 2.0", "Dante AV-A", "USB routing", "Meeting room"],
  },
  {
    id: "nhd-500-e-tx",
    sku: "NHD-500-E-TX",
    name: "Economy 4K Encoder",
    family: "NHD",
    series: "NHD-500 Series",
    category: "AVoIP Encoder",
    summary: "Economy 4K encoder option within the 500 Series for cost-optimised HDMI 2.0 AV over IP deployments.",
    tags: ["AVoIP", "HDMI 2.0", "Economy", "Encoder"],
  },
  {
    id: "nhd-500-tx",
    sku: "NHD-500-TX",
    name: "Full Feature 4K Encoder",
    family: "NHD",
    series: "NHD-500 Series",
    category: "AVoIP Encoder",
    summary: "Full-feature 500 Series encoder supporting HDMI 2.0, USB routing and Dante AV-A capable workflows.",
    tags: ["AVoIP", "HDMI 2.0", "USB routing", "Dante AV-A", "Encoder"],
  },
  {
    id: "nhd-600-trx",
    sku: "NHD-600-TRX",
    name: "Lossless Zero Latency Transceiver",
    family: "NHD",
    series: "NHD-600 Series",
    category: "AVoIP Transceiver",
    summary: "10Gb no-compromise transceiver delivering the highest video quality with multiview, USB and Dante workflow options.",
    tags: ["10Gb", "No compromise", "Highest quality", "Multiview", "USB", "Dante"],
  },
  {
    id: "sw-0206-vw",
    sku: "SW-0206-VW",
    name: "Video Wall Processor",
    family: "Video Wall",
    series: "Video Wall",
    category: "Processor",
    summary: "Non-AVoIP multi-layout video wall processor supporting MxN walls and mosaic layouts.",
    tags: ["Video wall", "Non-AVoIP", "Mosaic", "Processor"],
  },
  {
    id: "mx-0402-mst",
    sku: "MX-0402-MST",
    name: "Presentation Switcher",
    family: "Presentation",
    series: "Presentation",
    category: "Switcher",
    summary: "5K/4K presentation switcher with dual outputs, MST and USB-C collaboration support.",
    tags: ["Presentation", "USB-C", "BYOD", "MST", "Meeting room"],
  },
  {
    id: "mx-0403-h3-mst",
    sku: "MX-0403-H3-MST",
    name: "Presentation Switcher with Extension",
    family: "Presentation",
    series: "Presentation",
    category: "Switcher",
    summary: "Multi-output room switcher with HDMI, USB-C, MST and extension-friendly room connectivity.",
    tags: ["Presentation", "USB-C", "BYOD", "MST", "Boardroom"],
  },
  {
    id: "apo-vx20-uc-v2",
    sku: "APO-VX20-UC v2",
    name: "Dual Output 4K Video Bar",
    family: "Apollo",
    series: "Apollo",
    category: "UC",
    summary: "Premium conference bar with dual HDMI outputs, wireless conferencing and AI tracking.",
    tags: ["UC", "Video bar", "Wireless conferencing", "Teams room"],
  },
];

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeProducts(input: unknown): RawCatalogProduct[] {
  if (!Array.isArray(input)) return FALLBACK_PRODUCTS;

  const mapped = input
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;

      const rawSku = String(record.sku ?? record.model ?? record.code ?? "").trim();
      const skuUpper = rawSku.toUpperCase();
      const name = String(record.name ?? record.title ?? record.productName ?? rawSku).trim();

      let family = String(record.family ?? record.productFamily ?? "Other").trim();
      let series = String(record.series ?? "").trim();
      const category = String(record.category ?? record.type ?? record.productType ?? "Product").trim();
      const summary = String(record.summary ?? record.description ?? record.shortDescription ?? "").trim();

      if (skuUpper.startsWith("NHD-")) {
        family = "NHD";
        if (!series) {
          if (
            skuUpper.startsWith("NHD-100") ||
            skuUpper.startsWith("NHD-110") ||
            skuUpper.startsWith("NHD-120") ||
            skuUpper.startsWith("NHD-128") ||
            skuUpper.startsWith("NHD-150")
          ) {
            series = "NHD-100 Series";
          } else if (skuUpper.startsWith("NHD-500")) {
            series = "NHD-500 Series";
          } else if (skuUpper.startsWith("NHD-600")) {
            series = "NHD-600 Series";
          } else {
            series = "NHD";
          }
        }
      }

      if (!series) series = family || "Other";

      const tags = uniqueStrings([
        ...(Array.isArray(record.tags) ? record.tags.map(String) : []),
        ...(Array.isArray(record.features) ? record.features.map(String) : []),
        ...(Array.isArray(record.featureTags) ? record.featureTags.map(String) : []),
        ...(Array.isArray(record.applications) ? record.applications.map(String) : []),
      ]).slice(0, 10);

      return {
        id: String(record.id ?? `${skuUpper || name || "product"}-${index}`).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sku: rawSku || name || `Product ${index + 1}`,
        name: name || rawSku || `Product ${index + 1}`,
        family,
        series,
        category: category || "Product",
        summary,
        tags,
      } satisfies RawCatalogProduct;
    })
    .filter((item): item is RawCatalogProduct => Boolean(item));

  return mapped.length > 0 ? mapped : FALLBACK_PRODUCTS;
}

function hasIntent(state: CatalogFilterState): boolean {
  return Boolean(
    state.search.trim() ||
      state.families.length ||
      state.series.length ||
      state.categories.length ||
      state.roles.length ||
      state.technologies.length ||
      state.deploymentRoles.length ||
      state.application.trim() ||
      state.roomType.trim() ||
      state.budgetBand.trim() ||
      state.dependencySkus.length ||
      state.includeAccessories ||
      state.standaloneOnly,
  );
}

function toggleString<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function updateFilterArray<T extends string, K extends keyof CatalogFilterState>(
  state: CatalogFilterState,
  key: K,
  value: T,
): CatalogFilterState {
  const nextValues = toggleString(state[key] as T[], value);
  return {
    ...state,
    [key]: nextValues,
  } as CatalogFilterState;
}

function PillGroup<T extends string>({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: T[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  if (!values.length) return null;

  return (
    <div style={facetBlockStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      <div style={chipWrapStyle}>
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              style={active ? activeChipStyle : chipButtonStyle}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CataloguePage() {
  const [rawProducts, setRawProducts] = useState<RawCatalogProduct[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<CatalogFilterState>(createDefaultCatalogFilterState());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [restored, setRestored] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  const userId = "default-user";
  const projectId = (() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("projectId") || localStorage.getItem("wm:activeProjectId") || "global";
  })();

  const storageKey = useMemo(() => `catalog:intelligence-state:${userId}:${projectId}`, [projectId, userId]);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/product-intelligence");
        if (!response.ok) throw new Error("Product API unavailable");
        const data = await response.json();
        const source = Array.isArray(data)
          ? data
          : Array.isArray((data as { records?: unknown[] })?.records)
            ? (data as { records: unknown[] }).records
            : Array.isArray((data as { products?: unknown[] })?.products)
              ? (data as { products: unknown[] }).products
              : [];

        if (active) setRawProducts(normalizeProducts(source));
      } catch {
        if (active) setRawProducts(FALLBACK_PRODUCTS);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const saved = safeJsonParse<{
      filterState: CatalogFilterState;
      viewMode: ViewMode;
      recentSearches: RecentSearch[];
    } | null>(localStorage.getItem(storageKey), null);

    if (!saved) return;

    setFilterState({
      ...createDefaultCatalogFilterState(),
      ...saved.filterState,
      families: saved.filterState.families ?? [],
      series: saved.filterState.series ?? [],
      categories: saved.filterState.categories ?? [],
      roles: saved.filterState.roles ?? [],
      technologies: saved.filterState.technologies ?? [],
      deploymentRoles: saved.filterState.deploymentRoles ?? [],
      dependencySkus: saved.filterState.dependencySkus ?? [],
    });
    setViewMode(saved.viewMode ?? "list");
    setRecentSearches(saved.recentSearches ?? []);
    setRestored(hasIntent(saved.filterState));
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        filterState,
        viewMode,
        recentSearches,
      }),
    );
  }, [filterState, recentSearches, storageKey, viewMode]);

  const products = useMemo<EnrichedCatalogProduct[]>(() => applyCatalogOverrides(rawProducts), [rawProducts]);
  const facetIndex = useMemo(() => buildFacetIndex(products), [products]);

  const searchSuggestions = useMemo(() => {
    const q = filterState.search.trim().toLowerCase();

    const projectTerms = uniqueStrings([
      filterState.application,
      filterState.roomType,
      ...filterState.families,
      ...filterState.series,
      ...filterState.categories,
      localStorage.getItem("wm:activeProjectName") || "",
    ]);

    const recentTerms = recentSearches.map((entry) => entry.value);
    const catalogTerms = products.flatMap((product) => [
      product.sku,
      product.name,
      product.family,
      product.series,
      product.category,
      ...product.tags,
      ...product.families,
      ...product.roles,
      ...product.technologies,
    ]);

    const taxonomyTerms = [
      ...TAXONOMY.applications,
      ...TAXONOMY.roomTypes,
      ...TAXONOMY.budgetBands,
      ...facetIndex.families,
      ...facetIndex.series,
      ...facetIndex.categories,
      ...facetIndex.roles,
      ...facetIndex.technologies,
    ];

    const pool: SuggestionSource[] = [
      ...projectTerms.map((label) => ({ key: `project-${label}`, label, source: "project" as const })),
      ...recentTerms.map((label) => ({ key: `recent-${label}`, label, source: "recent" as const })),
      ...catalogTerms.map((label) => ({ key: `catalog-${label}`, label, source: "catalog" as const })),
      ...taxonomyTerms.map((label) => ({ key: `taxonomy-${label}`, label, source: "taxonomy" as const })),
    ];

    const deduped = new Map<string, SuggestionSource>();
    for (const item of pool) {
      const label = item.label.trim();
      if (!label) continue;
      const normalized = label.toLowerCase();
      if (q && !normalized.includes(q)) continue;
      if (!deduped.has(normalized)) deduped.set(normalized, item);
    }

    return [...deduped.values()].slice(0, 10);
  }, [
    facetIndex.categories,
    facetIndex.families,
    facetIndex.roles,
    facetIndex.series,
    facetIndex.technologies,
    filterState.application,
    filterState.categories,
    filterState.families,
    filterState.roomType,
    filterState.search,
    filterState.series,
    products,
    recentSearches,
  ]);

  const visibleResults = useMemo(() => {
    const results = filterCatalogProducts(products, filterState);
    return results.slice(0, viewMode === "list" ? 24 : 12);
  }, [filterState, products, viewMode]);

  function updateFilter<K extends keyof CatalogFilterState>(key: K, value: CatalogFilterState[K]) {
    setFilterState((current) => ({ ...current, [key]: value }));
  }

  function commitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    const nextRecent: RecentSearch[] = [
      { value: trimmed, timestamp: Date.now() },
      ...recentSearches.filter((item) => item.value.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(nextRecent);
  }

  function clearAll() {
    setFilterState(createDefaultCatalogFilterState());
    setViewMode("list");
    setRestored(false);
    searchRef.current?.focus();
  }

  const chips = [
    ...filterState.families.map((label) => ({ label, kind: "families" as const })),
    ...filterState.series.map((label) => ({ label, kind: "series" as const })),
    ...filterState.categories.map((label) => ({ label, kind: "categories" as const })),
    ...filterState.roles.map((label) => ({ label, kind: "roles" as const })),
    ...filterState.technologies.map((label) => ({ label, kind: "technologies" as const })),
    ...filterState.deploymentRoles.map((label) => ({ label, kind: "deploymentRoles" as const })),
    ...(filterState.application ? [{ label: filterState.application, kind: "application" as const }] : []),
    ...(filterState.roomType ? [{ label: filterState.roomType, kind: "roomType" as const }] : []),
    ...(filterState.budgetBand ? [{ label: filterState.budgetBand, kind: "budgetBand" as const }] : []),
    ...filterState.dependencySkus.map((label) => ({ label, kind: "dependencySkus" as const })),
  ];

  const showingQuietState = !hasIntent(filterState);

  return (
    <div style={pageStyle}>
      <section style={topBarStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={eyebrowStyle}>Sales Assist</div>
          <h1 style={titleStyle}>Product Finder</h1>
          <div style={tinyMutedStyle}>
            Catalog intelligence now supports overlap, companion logic, hybrid cores and dependency-aware results.
          </div>
        </div>

        <div style={topSearchWrapStyle}>
          <div style={searchBoxStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              ref={searchRef}
              list="catalog-search-suggestions"
              value={filterState.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              onBlur={() => commitSearch(filterState.search)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitSearch(filterState.search);
              }}
              placeholder="Search SKU, feature, role, technology, host dependency..."
              style={searchInputStyle}
            />
            <datalist id="catalog-search-suggestions">
              {searchSuggestions.map((item) => (
                <option key={item.key} value={item.label} />
              ))}
            </datalist>
          </div>
        </div>

        <div style={actionRowStyle}>
          <button
            type="button"
            onClick={() => updateFilter("matchMode", filterState.matchMode === "find" ? "filter" : "find")}
            style={filterState.matchMode === "find" ? activeButtonStyle : buttonStyle}
          >
            {filterState.matchMode === "find" ? "Find mode" : "Filter mode"}
          </button>
          <button type="button" onClick={() => setShowAdvanced((value) => !value)} style={buttonStyle}>
            <Filter size={16} />
            {showAdvanced ? "Hide advanced" : "Advanced"}
          </button>
          <button type="button" onClick={clearAll} style={buttonStyle}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      <section style={contextBarStyle}>
        <div style={chipWrapStyle}>
          <span style={metaPillStyle}>Project: {localStorage.getItem("wm:activeProjectName") || "General catalog"}</span>
          <span style={metaPillStyle}>Mode: {restored ? "Restored session" : "New session"}</span>
          <span style={metaPillStyle}>
            {filterState.matchMode === "find" ? "Ranked intelligence search" : "Strict facet filtering"}
          </span>
          {chips.map((chip) => (
            <button
              key={`${chip.kind}-${chip.label}`}
              type="button"
              onClick={() => {
                if (chip.kind === "application") updateFilter("application", "");
                if (chip.kind === "roomType") updateFilter("roomType", "");
                if (chip.kind === "budgetBand") updateFilter("budgetBand", "");
                if (chip.kind === "families") setFilterState((current) => updateFilterArray(current, "families", chip.label as CatalogFamily));
                if (chip.kind === "series") setFilterState((current) => updateFilterArray(current, "series", chip.label));
                if (chip.kind === "categories") setFilterState((current) => updateFilterArray(current, "categories", chip.label));
                if (chip.kind === "roles") setFilterState((current) => updateFilterArray(current, "roles", chip.label as CatalogRole));
                if (chip.kind === "technologies") setFilterState((current) => updateFilterArray(current, "technologies", chip.label as CatalogTechnology));
                if (chip.kind === "deploymentRoles") {
                  setFilterState((current) => updateFilterArray(current, "deploymentRoles", chip.label as CatalogDeploymentRole));
                }
                if (chip.kind === "dependencySkus") {
                  updateFilter(
                    "dependencySkus",
                    filterState.dependencySkus.filter((sku) => sku !== chip.label),
                  );
                }
              }}
              style={activeChipStyle}
            >
              <Tag size={12} />
              {chip.label}
              <X size={12} />
            </button>
          ))}
        </div>

        <div style={chipWrapStyle}>
          {recentSearches.slice(0, 4).map((item) => (
            <button
              key={`${item.value}-${item.timestamp}`}
              type="button"
              onClick={() => {
                updateFilter("search", item.value);
                commitSearch(item.value);
              }}
              style={chipButtonStyle}
            >
              <Clock3 size={14} />
              {item.value}
            </button>
          ))}
        </div>
      </section>

      <div style={layoutStyle}>
        <aside style={leftRailStyle}>
          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Quick families</div>
            <div style={quickGridStyle}>
              {QUICK_FAMILIES.map((family) => {
                const active = filterState.families.includes(family);
                return (
                  <button
                    key={family}
                    type="button"
                    onClick={() => setFilterState((current) => updateFilterArray(current, "families", family))}
                    style={active ? selectedQuickChipStyle : quickChipStyle}
                  >
                    {family}
                  </button>
                );
              })}
            </div>

            <div style={sectionTitleStyle}>Quick roles</div>
            <div style={quickGridStyle}>
              {QUICK_ROLES.map((role) => {
                const active = filterState.roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFilterState((current) => updateFilterArray(current, "roles", role))}
                    style={active ? selectedQuickChipStyle : quickChipStyle}
                  >
                    {role}
                  </button>
                );
              })}
            </div>

            <div style={sectionTitleStyle}>Quick technologies</div>
            <div style={quickGridStyle}>
              {QUICK_TECHNOLOGIES.map((technology) => {
                const active = filterState.technologies.includes(technology);
                return (
                  <button
                    key={technology}
                    type="button"
                    onClick={() => setFilterState((current) => updateFilterArray(current, "technologies", technology))}
                    style={active ? selectedQuickChipStyle : quickChipStyle}
                  >
                    {technology}
                  </button>
                );
              })}
            </div>

            <div style={sectionTitleStyle}>Suggestions</div>
            <div style={chipWrapStyle}>
              {searchSuggestions.slice(0, 6).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    updateFilter("search", item.label);
                    commitSearch(item.label);
                  }}
                  style={chipButtonStyle}
                >
                  {item.source === "recent" ? (
                    <Clock3 size={14} />
                  ) : item.source === "project" ? (
                    <FolderOpen size={14} />
                  ) : item.source === "catalog" ? (
                    <PackageSearch size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {item.label}
                </button>
              ))}
            </div>

            <div style={compactGridStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Application</span>
                <input
                  list="catalog-application-suggestions"
                  value={filterState.application}
                  onChange={(event) => updateFilter("application", event.target.value)}
                  placeholder="Boardroom, Teams room..."
                  style={inputStyle}
                />
                <datalist id="catalog-application-suggestions">
                  {TAXONOMY.applications.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>

              <label style={fieldStyle}>
                <span style={labelStyle}>Room type</span>
                <input
                  list="catalog-roomtype-suggestions"
                  value={filterState.roomType}
                  onChange={(event) => updateFilter("roomType", event.target.value)}
                  placeholder="Huddle, medium room..."
                  style={inputStyle}
                />
                <datalist id="catalog-roomtype-suggestions">
                  {TAXONOMY.roomTypes.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
            </div>

            <div style={compactGridStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Budget band</span>
                <input
                  list="catalog-budget-suggestions"
                  value={filterState.budgetBand}
                  onChange={(event) => updateFilter("budgetBand", event.target.value)}
                  placeholder="Entry, premium..."
                  style={inputStyle}
                />
                <datalist id="catalog-budget-suggestions">
                  {TAXONOMY.budgetBands.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>

              <label style={fieldStyle}>
                <span style={labelStyle}>Dependency SKU</span>
                <input
                  value={filterState.dependencySkus.join(", ")}
                  onChange={(event) => updateFilter("dependencySkus", parseDependencySkuText(event.target.value))}
                  placeholder="DG2, SW-620-TX-W..."
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={compactGridStyle}>
              <button
                type="button"
                onClick={() => updateFilter("standaloneOnly", !filterState.standaloneOnly)}
                style={filterState.standaloneOnly ? activeButtonStyle : buttonStyle}
              >
                Standalone only
              </button>
              <button
                type="button"
                onClick={() => updateFilter("includeAccessories", !filterState.includeAccessories)}
                style={filterState.includeAccessories ? activeButtonStyle : buttonStyle}
              >
                Include accessories
              </button>
            </div>

            {showAdvanced ? (
              <>
                <PillGroup
                  title="Families"
                  values={facetIndex.families}
                  selected={filterState.families}
                  onToggle={(value) => setFilterState((current) => updateFilterArray(current, "families", value))}
                />
                <PillGroup
                  title="Series"
                  values={facetIndex.series}
                  selected={filterState.series}
                  onToggle={(value) => setFilterState((current) => updateFilterArray(current, "series", value))}
                />
                <PillGroup
                  title="Categories"
                  values={facetIndex.categories}
                  selected={filterState.categories}
                  onToggle={(value) => setFilterState((current) => updateFilterArray(current, "categories", value))}
                />
                <PillGroup
                  title="Roles"
                  values={facetIndex.roles}
                  selected={filterState.roles}
                  onToggle={(value) => setFilterState((current) => updateFilterArray(current, "roles", value))}
                />
                <PillGroup
                  title="Technologies"
                  values={facetIndex.technologies}
                  selected={filterState.technologies}
                  onToggle={(value) => setFilterState((current) => updateFilterArray(current, "technologies", value))}
                />
                <PillGroup
                  title="Deployment"
                  values={facetIndex.deploymentRoles}
                  selected={filterState.deploymentRoles}
                  onToggle={(value) => setFilterState((current) => updateFilterArray(current, "deploymentRoles", value))}
                />
              </>
            ) : null}
          </section>
        </aside>

        <main style={mainPaneStyle}>
          {showingQuietState ? (
            <section style={starterPanelStyle}>
              <div style={starterHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Start here</div>
                  <h2 style={starterTitleStyle}>Suggested starting points</h2>
                </div>
                <div style={tinyMutedStyle}>The catalog now understands overlap, host dependencies and hybrid roles.</div>
              </div>

              <div style={starterGridStyle}>
                {[
                  { label: "AV over IP", action: () => setFilterState((current) => updateFilterArray(current, "families", "AV over IP")) },
                  { label: "Video walls", action: () => setFilterState((current) => updateFilterArray(current, "families", "Video Walls")) },
                  { label: "UC / Teams", action: () => setFilterState((current) => updateFilterArray(current, "families", "Unified Communication")) },
                  { label: "Wireless presentation", action: () => setFilterState((current) => updateFilterArray(current, "technologies", "wireless-casting")) },
                  { label: "Hybrid matrix", action: () => setFilterState((current) => updateFilterArray(current, "families", "Matrix Switching")) },
                  { label: "Multiview", action: () => setFilterState((current) => updateFilterArray(current, "families", "Multiview")) },
                ].map((item) => (
                  <button key={item.label} type="button" onClick={item.action} style={starterButtonStyle}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section style={resultsPanelStyle}>
            <div style={resultsToolbarStyle}>
              <div>
                <div style={eyebrowStyle}>{showingQuietState ? "Featured products" : "Results"}</div>
                <div style={resultsTitleStyle}>
                  {loading
                    ? "Loading product guide..."
                    : showingQuietState
                      ? `${visibleResults.length} featured products`
                      : filterState.matchMode === "find"
                        ? `${visibleResults.length} ranked products`
                        : `${visibleResults.length} filtered products`}
                </div>
              </div>

              <div style={actionRowStyle}>
                <button type="button" onClick={() => setViewMode("list")} style={viewMode === "list" ? activeButtonStyle : buttonStyle}>
                  List
                </button>
                <button type="button" onClick={() => setViewMode("grid")} style={viewMode === "grid" ? activeButtonStyle : buttonStyle}>
                  Grid
                </button>
              </div>
            </div>

            {viewMode === "list" ? (
              <div style={tableStyle}>
                <div style={tableHeaderStyle}>
                  <div>SKU</div>
                  <div>Name</div>
                  <div>Deployment</div>
                  <div>Families</div>
                  <div>Why it fits</div>
                </div>

                {visibleResults.map((product, index) => {
                  const reasons = getCatalogMatchReasons(product, filterState);
                  const badges = getCatalogBadges(product);
                  return (
                    <div key={product.id} style={index === 0 ? tableRowTopStyle : tableRowStyle}>
                      <div style={skuStyle}>{product.sku}</div>
                      <div>
                        <div style={nameStyle}>{product.name}</div>
                        <div style={tinyMutedStyle}>{product.summary}</div>
                      </div>
                      <div>
                        <div style={tinyMutedStyle}>{product.deploymentRole}</div>
                        <div style={featureInlineStyle}>{badges.slice(0, 2).join(" â€¢ ")}</div>
                      </div>
                      <div style={featureInlineStyle}>{product.families.join(" â€¢ ")}</div>
                      <div style={featureInlineStyle}>{reasons.join(" â€¢ ")}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={resultsGridStyle}>
                {visibleResults.map((product, index) => {
                  const reasons = getCatalogMatchReasons(product, filterState);
                  const badges = getCatalogBadges(product);

                  return (
                    <article
                      key={product.id}
                      style={{
                        ...resultCardStyle,
                        ...(index === 0
                          ? {
                              border: "1px solid rgba(249, 115, 22, 0.34)",
                              boxShadow: "0 0 0 1px rgba(249, 115, 22, 0.12), 0 10px 24px rgba(2, 8, 23, 0.16)",
                            }
                          : {}),
                      }}
                    >
                      <div style={resultTopStyle}>
                        <div style={{ minWidth: 0 }}>
                          <div style={skuLineStyle}>
                            <span style={skuStyle}>{product.sku}</span>
                            <span style={categoryTagStyle}>{product.category}</span>
                            {index === 0 ? <span style={topPickStyle}>Top match</span> : null}
                          </div>
                          <div style={nameStyle}>{product.name}</div>
                        </div>
                      </div>

                      <p style={summaryStyle}>{product.summary}</p>

                      <div style={whyFitStyle}>
                        <strong>Why this product:</strong> {reasons.join(" â€¢ ")}
                      </div>

                      <div style={pillWrapStyle}>
                        {badges.map((badge) => (
                          <span key={badge} style={metaPillStyle}>
                            {badge}
                          </span>
                        ))}
                      </div>

                      <div style={pillWrapStyle}>
                        {product.technologies.slice(0, 6).map((technology) => (
                          <span key={technology} style={chipButtonStyle}>
                            {technology}
                          </span>
                        ))}
                      </div>

                      <div style={resultActionsStyle}>
                        <button type="button" style={primaryButtonStyle}>
                          Add to Project
                        </button>
                        <button type="button" style={buttonStyle}>
                          Ask Guru
                        </button>
                        {product.dependencies.compatibleHosts.length > 0 ? (
                          <span style={dependencyTagStyle}>
                            <Link2 size={12} />
                            Host aware
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: 10,
  maxWidth: 1720,
  margin: "0 auto",
  color: "var(--wm-text, #e5eef8)",
  display: "grid",
  gap: 10,
};

const topBarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "end",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: 18,
  padding: 14,
  background: "rgba(15, 23, 42, 0.72)",
  backdropFilter: "blur(10px)",
};

const topSearchWrapStyle: CSSProperties = {
  maxWidth: 760,
};

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "340px minmax(0, 1fr)",
  gap: 10,
  alignItems: "start",
};

const leftRailStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
};

const mainPaneStyle: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 10,
  alignContent: "start",
};

const panelStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: 14,
  background: "rgba(15, 23, 42, 0.78)",
  padding: 12,
  boxShadow: "0 10px 24px rgba(2, 8, 23, 0.16)",
  display: "grid",
  gap: 10,
};

const starterPanelStyle: CSSProperties = {
  ...panelStyle,
};

const resultsPanelStyle: CSSProperties = {
  ...panelStyle,
};

const contextBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(15, 23, 42, 0.5)",
};

const starterHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: 8,
  flexWrap: "wrap",
};

const starterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
};

const starterButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  width: "100%",
  minHeight: 40,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(30, 41, 59, 0.42)",
  color: "inherit",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "left",
};

const starterTitleStyle: CSSProperties = {
  margin: "2px 0 0",
  fontSize: 18,
  lineHeight: 1.1,
};

const resultsToolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const resultsTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
};

const resultsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 10,
};

const resultCardStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: 14,
  padding: 12,
  background: "rgba(2, 6, 23, 0.34)",
  display: "grid",
  gap: 10,
};

const resultTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "start",
};

const resultActionsStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const chipWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  alignItems: "center",
};

const pillWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  alignItems: "center",
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const quickGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 6,
};

const compactGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 7,
};

const searchBoxStyle: CSSProperties = {
  position: "relative",
};

const searchIconStyle: CSSProperties = {
  position: "absolute",
  left: 14,
  top: 14,
  opacity: 0.65,
};

const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(2, 6, 23, 0.78)",
  color: "inherit",
  padding: "10px 12px",
  outline: "none",
  fontSize: 13,
  minHeight: 42,
};

const searchInputStyle: CSSProperties = {
  ...inputStyle,
  paddingLeft: 42,
};

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  borderRadius: 10,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(30, 41, 59, 0.6)",
  color: "inherit",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 12,
  minHeight: 38,
};

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "rgba(249, 115, 22, 0.20)",
  border: "1px solid rgba(249, 115, 22, 0.40)",
};

const activeButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "rgba(249, 115, 22, 0.18)",
  border: "1px solid rgba(249, 115, 22, 0.38)",
};

const quickChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  width: "100%",
  minHeight: 34,
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "rgba(30, 41, 59, 0.42)",
  color: "inherit",
  fontSize: 11,
  cursor: "pointer",
  textAlign: "left",
};

const selectedQuickChipStyle: CSSProperties = {
  ...quickChipStyle,
  background: "rgba(249, 115, 22, 0.16)",
  border: "1px solid rgba(249, 115, 22, 0.34)",
};

const chipButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(30, 41, 59, 0.55)",
  color: "inherit",
  cursor: "pointer",
};

const activeChipStyle: CSSProperties = {
  ...chipButtonStyle,
  background: "rgba(249, 115, 22, 0.16)",
  border: "1px solid rgba(249, 115, 22, 0.34)",
};

const metaPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(30, 41, 59, 0.55)",
};

const dependencyTagStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 11,
  border: "1px solid rgba(96, 165, 250, 0.28)",
  background: "rgba(59, 130, 246, 0.16)",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.74,
  fontWeight: 700,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.74,
  fontWeight: 700,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  opacity: 0.72,
};

const titleStyle: CSSProperties = {
  margin: "2px 0 0",
  fontSize: 28,
  lineHeight: 1.05,
};

const tinyMutedStyle: CSSProperties = {
  fontSize: 12,
  opacity: 0.72,
  lineHeight: 1.4,
};

const skuLineStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
};

const skuStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
};

const categoryTagStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 10,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(30, 41, 59, 0.42)",
};

const topPickStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  borderRadius: 999,
  padding: "3px 7px",
  fontSize: 10,
  border: "1px solid rgba(249, 115, 22, 0.34)",
  background: "rgba(249, 115, 22, 0.16)",
  color: "inherit",
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

const nameStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.3,
};

const summaryStyle: CSSProperties = {
  margin: 0,
  opacity: 0.84,
  lineHeight: 1.5,
  fontSize: 13,
};

const whyFitStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  opacity: 0.84,
};

const tableStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

const tableHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1.6fr 140px 1.2fr 1.2fr",
  fontSize: 12,
  opacity: 0.6,
  padding: "6px 8px",
};

const tableRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1.6fr 140px 1.2fr 1.2fr",
  padding: "8px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,0.1)",
  background: "rgba(15,23,42,0.6)",
  alignItems: "center",
  gap: 8,
};

const tableRowTopStyle: CSSProperties = {
  ...tableRowStyle,
  border: "1px solid rgba(249,115,22,0.4)",
};

const featureInlineStyle: CSSProperties = {
  fontSize: 12,
  opacity: 0.8,
};

const facetBlockStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};
