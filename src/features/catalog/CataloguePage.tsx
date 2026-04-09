import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Clock3, Filter, FolderOpen, PackageSearch, RotateCcw, Search, Sparkles, Tag, X } from "lucide-react";

type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  family: string;
  series: string;
  category: string;
  summary: string;
  tags: string[];
};

type CatalogState = {
  search: string;
  family: string;
  series: string;
  category: string;
  application: string;
  roomType: string;
  budgetBand: string;
  viewMode: "grid" | "list";
  matchMode: "find" | "filter";
};

type RecentSearch = {
  value: string;
  timestamp: number;
};

type SuggestionSource = {
  key: string;
  label: string;
  source: "recent" | "project" | "catalog" | "taxonomy";
};

const DEFAULT_STATE: CatalogState = {
  search: "",
  family: "",
  series: "",
  category: "",
  application: "",
  roomType: "",
  budgetBand: "",
  viewMode: "list",
  matchMode: "find",
};

const MAX_RECENT_SEARCHES = 8;
const MAX_FIELD_HISTORY = 12;

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

const QUICK_FAMILIES = ["NHD", "Presentation", "Video Wall", "Apollo"];

const QUICK_SERIES = ["NHD-100 Series", "NHD-500 Series", "NHD-600 Series"];

const QUICK_APPLICATIONS = [
  "Meeting room",
  "Boardroom",
  "Teams room",
  "Classroom",
  "Video wall",
  "BYOD",
  "NDI",
];

const FALLBACK_PRODUCTS: CatalogProduct[] = [
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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

function normalizeProducts(input: unknown): CatalogProduct[] {
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
            skuUpper.startsWith("NHD-128")
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

      if (!series) {
        series = family || "Other";
      }

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
      } satisfies CatalogProduct;
    })
    .filter((item): item is CatalogProduct => Boolean(item));

  return mapped.length > 0 ? mapped : FALLBACK_PRODUCTS;
}

function hasIntent(state: CatalogState): boolean {
  return Boolean(
    state.search.trim() ||
      state.family ||
      state.series ||
      state.category ||
      state.application.trim() ||
      state.roomType.trim() ||
      state.budgetBand.trim(),
  );
}

function scoreProduct(product: CatalogProduct, state: CatalogState): number {
  let score = 0;
  const q = state.search.trim().toLowerCase();

  if (q) {
    if (product.sku.toLowerCase() === q) score += 160;
    else if (product.sku.toLowerCase().includes(q)) score += 80;
    if (product.name.toLowerCase().includes(q)) score += 50;
    if (product.family.toLowerCase().includes(q)) score += 24;
    if (product.series.toLowerCase().includes(q)) score += 26;
    if (product.category.toLowerCase().includes(q)) score += 20;
    if (product.tags.some((tag) => tag.toLowerCase().includes(q))) score += 18;
    if (product.summary.toLowerCase().includes(q)) score += 10;
  }

  if (state.family && product.family.toLowerCase() === state.family.toLowerCase()) score += 40;
  if (state.series && product.series.toLowerCase() === state.series.toLowerCase()) score += 46;
  if (state.category && product.category.toLowerCase() === state.category.toLowerCase()) score += 28;

  if (state.application.trim()) {
    const a = state.application.trim().toLowerCase();
    if (product.tags.some((tag) => tag.toLowerCase().includes(a))) score += 20;
    if (product.summary.toLowerCase().includes(a)) score += 8;
  }

  if (state.roomType.trim()) {
    const r = state.roomType.trim().toLowerCase();
    if (product.tags.some((tag) => tag.toLowerCase().includes(r))) score += 8;
  }

  if (state.budgetBand.trim()) {
    const b = state.budgetBand.trim().toLowerCase();
    if (product.tags.some((tag) => tag.toLowerCase().includes(b))) score += 6;
  }

  if (q.includes("ndi") || q.includes("camera") || q.includes("ptz") || q.includes("bridge")) {
    if (product.series === "NHD-100 Series") score += 34;
  }

  if (q.includes("hdmi 2.0") || q.includes("dante av-a") || q.includes("usb routing") || q.includes("economy")) {
    if (product.series === "NHD-500 Series") score += 34;
  }

  if (q.includes("10g") || q.includes("no compromise") || q.includes("highest quality") || q.includes("best quality")) {
    if (product.series === "NHD-600 Series") score += 40;
  }

  return score;
}

export default function CataloguePage() {
  const [products, setProducts] = useState<CatalogProduct[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CatalogState>(DEFAULT_STATE);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [restored, setRestored] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  const userId = "default-user";
  const projectId = (() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("projectId") || localStorage.getItem("wm:activeProjectId") || "global";
  })();

  const keys = useMemo(
    () => ({
      projectState: `catalog:lastState:project:${projectId}`,
      userState: `catalog:lastState:user:${userId}`,
      recentSearches: `catalog:recentSearches:user:${userId}`,
      fieldHistory: (field: string) => `catalog:recentValues:user:${userId}:${field}`,
    }),
    [projectId, userId],
  );

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

        if (active) setProducts(normalizeProducts(source));
      } catch {
        if (active) setProducts(FALLBACK_PRODUCTS);
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
    const projectState = safeJsonParse<CatalogState | null>(localStorage.getItem(keys.projectState), null);
    const userState = safeJsonParse<CatalogState | null>(localStorage.getItem(keys.userState), null);
    const nextState =
      projectState && hasIntent(projectState)
        ? projectState
        : userState && hasIntent(userState)
          ? userState
          : DEFAULT_STATE;

    setState(nextState);
    setRestored(hasIntent(nextState));
    setRecentSearches(safeJsonParse<RecentSearch[]>(localStorage.getItem(keys.recentSearches), []));
  }, [keys]);

  useEffect(() => {
    localStorage.setItem(keys.projectState, JSON.stringify(state));
    localStorage.setItem(keys.userState, JSON.stringify(state));
  }, [keys, state]);

  const families = useMemo(() => uniqueStrings(products.map((p) => p.family)).sort(), [products]);
  const seriesList = useMemo(() => uniqueStrings(products.map((p) => p.series)).sort(), [products]);
  const categories = useMemo(() => uniqueStrings(products.map((p) => p.category)).sort(), [products]);

  const fieldSuggestions = useMemo(() => {
    const getHistory = (field: string) => safeJsonParse<string[]>(localStorage.getItem(keys.fieldHistory(field)), []);
    return {
      application: uniqueStrings([...getHistory("application"), ...TAXONOMY.applications]),
      roomType: uniqueStrings([...getHistory("roomType"), ...TAXONOMY.roomTypes]),
      budgetBand: uniqueStrings([...getHistory("budgetBand"), ...TAXONOMY.budgetBands]),
    };
  }, [keys]);

  const searchSuggestions = useMemo(() => {
    const q = state.search.trim().toLowerCase();

    const projectTerms = uniqueStrings([
      state.application,
      state.roomType,
      state.family,
      state.series,
      state.category,
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
    ]);

    const taxonomyTerms = [
      ...TAXONOMY.applications,
      ...TAXONOMY.roomTypes,
      ...TAXONOMY.budgetBands,
      ...families,
      ...seriesList,
      ...categories,
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
  }, [categories, families, products, recentSearches, seriesList, state.application, state.category, state.family, state.roomType, state.search, state.series]);

  const rankedResults = useMemo(() => {
    const active = hasIntent(state);

    const ranked = products
      .map((product) => {
        const score = scoreProduct(product, state);
        const strictMatch =
          (!state.family || product.family === state.family) &&
          (!state.series || product.series === state.series) &&
          (!state.category || product.category === state.category) &&
          (!state.application.trim() ||
            product.tags.some((tag) => tag.toLowerCase().includes(state.application.trim().toLowerCase()))) &&
          (!state.roomType.trim() ||
            product.tags.some((tag) => tag.toLowerCase().includes(state.roomType.trim().toLowerCase())));

        return { product, score, strictMatch };
      })
      .sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku));

    if (!active) return ranked.slice(0, 8).map((entry) => entry.product);
    if (state.matchMode === "filter") return ranked.filter((entry) => entry.strictMatch).map((entry) => entry.product);
    return ranked.filter((entry) => entry.score > 0 || entry.strictMatch).map((entry) => entry.product);
  }, [products, state]);

  function updateState<K extends keyof CatalogState>(key: K, value: CatalogState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function rememberFieldValue(field: "application" | "roomType" | "budgetBand", value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const history = safeJsonParse<string[]>(localStorage.getItem(keys.fieldHistory(field)), []);
    const next = uniqueStrings([trimmed, ...history]).slice(0, MAX_FIELD_HISTORY);
    localStorage.setItem(keys.fieldHistory(field), JSON.stringify(next));
  }

  function commitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    const nextRecent: RecentSearch[] = [
      { value: trimmed, timestamp: Date.now() },
      ...recentSearches.filter((item) => item.value.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(nextRecent);
    localStorage.setItem(keys.recentSearches, JSON.stringify(nextRecent));
  }

  function clearAll() {
    setState(DEFAULT_STATE);
    setRestored(false);
    searchRef.current?.focus();
  }

  const chips = [
    state.family && { label: state.family, key: "family" as const },
    state.series && { label: state.series, key: "series" as const },
    state.category && { label: state.category, key: "category" as const },
    state.application && { label: state.application, key: "application" as const },
    state.roomType && { label: state.roomType, key: "roomType" as const },
    state.budgetBand && { label: state.budgetBand, key: "budgetBand" as const },
  ].filter(Boolean) as { label: string; key: keyof CatalogState }[];

  const showingQuietState = !hasIntent(state);
  const visibleResults = rankedResults.slice(0, state.viewMode === "list" ? 24 : 12);

  return (
    <div style={pageStyle}>
      <section style={topBarStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={eyebrowStyle}>Sales Assist</div>
          <h1 style={titleStyle}>Product Finder</h1>
          <div style={tinyMutedStyle}>NHD uses the Power of Three: 100 Series, 500 Series and 600 Series.</div>
        </div>

        <div style={topSearchWrapStyle}>
          <div style={searchBoxStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              ref={searchRef}
              list="catalog-search-suggestions"
              value={state.search}
              onChange={(event) => updateState("search", event.target.value)}
              onBlur={() => commitSearch(state.search)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitSearch(state.search);
              }}
              placeholder="Search SKU, feature, series, room type, application..."
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
            onClick={() => updateState("matchMode", state.matchMode === "find" ? "filter" : "find")}
            style={state.matchMode === "find" ? activeButtonStyle : buttonStyle}
          >
            {state.matchMode === "find" ? "Find mode" : "Filter mode"}
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
          <span style={metaPillStyle}>{state.matchMode === "find" ? "Ranked catalogue search" : "Strict filtered search"}</span>
          {chips.map((chip) => (
            <button key={`${chip.key}-${chip.label}`} type="button" onClick={() => updateState(chip.key, "" as never)} style={activeChipStyle}>
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
                updateState("search", item.value);
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
            <div style={sectionTitleStyle}>Quick family</div>
            <div style={quickGridStyle}>
              {QUICK_FAMILIES.map((family) => {
                const active = state.family === family;
                return (
                  <button
                    key={family}
                    type="button"
                    onClick={() => updateState("family", active ? "" : family)}
                    style={active ? selectedQuickChipStyle : quickChipStyle}
                  >
                    {family}
                  </button>
                );
              })}
            </div>

            <div style={sectionTitleStyle}>NHD Power of Three</div>
            <div style={quickGridStyle}>
              {QUICK_SERIES.map((series) => {
                const active = state.series === series;
                return (
                  <button
                    key={series}
                    type="button"
                    onClick={() => {
                      updateState("family", "NHD");
                      updateState("series", active ? "" : series);
                    }}
                    style={active ? selectedQuickChipStyle : quickChipStyle}
                  >
                    {series}
                  </button>
                );
              })}
            </div>

            <div style={sectionTitleStyle}>Quick application</div>
            <div style={quickGridStyle}>
              {QUICK_APPLICATIONS.map((application) => {
                const active = state.application === application;
                return (
                  <button
                    key={application}
                    type="button"
                    onClick={() => updateState("application", active ? "" : application)}
                    style={active ? selectedQuickChipStyle : quickChipStyle}
                  >
                    {application}
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
                    updateState("search", item.label);
                    commitSearch(item.label);
                  }}
                  style={chipButtonStyle}
                >
                  {item.source === "recent" ? <Clock3 size={14} /> : item.source === "project" ? <FolderOpen size={14} /> : item.source === "catalog" ? <PackageSearch size={14} /> : <Sparkles size={14} />}
                  {item.label}
                </button>
              ))}
            </div>

            <div style={compactGridStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Family</span>
                <select value={state.family} onChange={(event) => updateState("family", event.target.value)} style={inputStyle}>
                  <option value="">All families</option>
                  {families.map((family) => (
                    <option key={family} value={family}>
                      {family}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span style={labelStyle}>Series</span>
                <select value={state.series} onChange={(event) => updateState("series", event.target.value)} style={inputStyle}>
                  <option value="">All series</option>
                  {seriesList.map((series) => (
                    <option key={series} value={series}>
                      {series}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={compactGridStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Category</span>
                <select value={state.category} onChange={(event) => updateState("category", event.target.value)} style={inputStyle}>
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span style={labelStyle}>Application</span>
                <input
                  list="catalog-application-suggestions"
                  value={state.application}
                  onChange={(event) => updateState("application", event.target.value)}
                  onBlur={() => rememberFieldValue("application", state.application)}
                  placeholder="Boardroom, Teams room..."
                  style={inputStyle}
                />
                <datalist id="catalog-application-suggestions">
                  {fieldSuggestions.application.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
            </div>

            <div style={compactGridStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Room type</span>
                <input
                  list="catalog-roomtype-suggestions"
                  value={state.roomType}
                  onChange={(event) => updateState("roomType", event.target.value)}
                  onBlur={() => rememberFieldValue("roomType", state.roomType)}
                  placeholder="Huddle, medium room..."
                  style={inputStyle}
                />
                <datalist id="catalog-roomtype-suggestions">
                  {fieldSuggestions.roomType.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>

              {showAdvanced ? (
                <label style={fieldStyle}>
                  <span style={labelStyle}>Budget band</span>
                  <input
                    list="catalog-budget-suggestions"
                    value={state.budgetBand}
                    onChange={(event) => updateState("budgetBand", event.target.value)}
                    onBlur={() => rememberFieldValue("budgetBand", state.budgetBand)}
                    placeholder="Entry, value, premium..."
                    style={inputStyle}
                  />
                  <datalist id="catalog-budget-suggestions">
                    {fieldSuggestions.budgetBand.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </label>
              ) : (
                <div />
              )}
            </div>
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
                <div style={tinyMutedStyle}>The panel shows useful products immediately instead of staying blank.</div>
              </div>

              <div style={starterGridStyle}>
                {[
                  { label: "NHD 100 Series", family: "NHD", series: "NHD-100 Series" },
                  { label: "NHD 500 Series", family: "NHD", series: "NHD-500 Series" },
                  { label: "NHD 600 Series", family: "NHD", series: "NHD-600 Series" },
                  { label: "Video wall", application: "Video wall" },
                  { label: "Teams / UC", application: "Teams room" },
                  { label: "BYOD / USB-C", application: "BYOD" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if ("family" in item && item.family) updateState("family", item.family);
                      if ("series" in item && item.series) updateState("series", item.series);
                      if ("application" in item && item.application) updateState("application", item.application);
                    }}
                    style={starterButtonStyle}
                  >
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
                      : state.matchMode === "find"
                        ? `${visibleResults.length} ranked products`
                        : `${visibleResults.length} filtered products`}
                </div>
              </div>

              <div style={actionRowStyle}>
                <button
                  type="button"
                  onClick={() => updateState("viewMode", "list")}
                  style={state.viewMode === "list" ? activeButtonStyle : buttonStyle}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => updateState("viewMode", "grid")}
                  style={state.viewMode === "grid" ? activeButtonStyle : buttonStyle}
                >
                  Grid
                </button>
              </div>
            </div>

            {state.viewMode === "list" ? (
              <div style={tableStyle}>
                <div style={tableHeaderStyle}>
                  <div>SKU</div>
                  <div>Name</div>
                  <div>Series</div>
                  <div>Category</div>
                  <div>Why it fits</div>
                </div>

                {visibleResults.map((product, index) => (
                  <div key={product.id} style={index === 0 ? tableRowTopStyle : tableRowStyle}>
                    <div style={skuStyle}>{product.sku}</div>
                    <div>
                      <div style={nameStyle}>{product.name}</div>
                      <div style={tinyMutedStyle}>{product.summary}</div>
                    </div>
                    <div>{product.series}</div>
                    <div>{product.category}</div>
                    <div style={featureInlineStyle}>
                      {[product.family, product.series, product.category, ...product.tags.slice(0, 2)].join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={resultsGridStyle}>
                {visibleResults.map((product, index) => (
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
                      <strong>Why this product:</strong> {[product.family, product.series, product.category, ...product.tags.slice(0, 2)].join(" • ")}
                    </div>

                    <div style={pillWrapStyle}>
                      {product.tags.slice(0, 6).map((tag) => (
                        <span key={tag} style={metaPillStyle}>
                          {tag}
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
                    </div>
                  </article>
                ))}
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
  gridTemplateColumns: "120px 1.6fr 140px 120px 1.2fr",
  fontSize: 12,
  opacity: 0.6,
  padding: "6px 8px",
};

const tableRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1.6fr 140px 120px 1.2fr",
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