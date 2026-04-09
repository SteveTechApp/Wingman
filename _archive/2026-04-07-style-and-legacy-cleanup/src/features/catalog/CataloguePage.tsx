import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  FolderOpen,
  Layers3,
  PackageSearch,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import {
  enrichProductClassification,
  matchesFeatureFilter,
  shouldHideHybridInMatrixView,
  type FunctionalRole,
  type ProductFamily,
  type RoutingClass,
} from "./productClassification";

type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  family: ProductFamily | string;
  functionalRole: FunctionalRole | string;
  routingClass: RoutingClass | string;
  category: string;
  summary: string;
  applications: string[];
  featureTags: string[];
  commercialTags: string[];
  matrixCapable: boolean;
  trueMatrix: boolean;
  conferencingOptimised: boolean;
  distributionOptimised: boolean;
  notes?: string;
};

type CatalogState = {
  search: string;
  family: string;
  functionalRole: string;
  routingClass: string;
  application: string;
  roomType: string;
  budgetBand: string;
  selectedFeatures: string[];
  showHybridProducts: boolean;
  viewMode: "list" | "grid";
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
  functionalRole: "",
  routingClass: "",
  application: "",
  roomType: "",
  budgetBand: "",
  selectedFeatures: [],
  showHybridProducts: true,
  viewMode: "list",
};

const MAX_RECENT_SEARCHES = 8;
const MAX_FIELD_HISTORY = 12;

const TAXONOMY = {
  applications: [
    "Boardroom",
    "Meeting room",
    "Classroom",
    "Training room",
    "Teams room",
    "BYOD",
    "BYOM",
    "Hybrid UC",
    "Video wall",
    "LED wall",
    "Retail",
    "Control room",
    "Hospitality",
  ],
  roomTypes: [
    "Huddle space",
    "Small room",
    "Medium room",
    "Large room",
    "Lecture hall",
    "Boardroom",
    "Control room",
    "Lobby",
  ],
  budgetBands: ["Entry", "Value", "Mid", "Premium", "Enterprise"],
};

const FALLBACK_PRODUCTS: Array<Record<string, unknown>> = [
  {
    sku: "MX-0402-MST",
    name: "4x2 Presentation Switcher with MST",
    family: "Presentation Switcher",
    category: "Presentation / Room Core",
    summary:
      "Conference-room presentation switcher with dual display behaviour, USB-C, MST, USB routing and room-centric conferencing workflows.",
    applications: ["Meeting room", "Boardroom", "Teams room", "BYOD", "BYOM"],
    featureTags: ["USB-C", "HDMI", "MST", "Dual Display", "USB Routing", "USB Host", "USB Device", "Scaling", "BYOD / BYOM", "MTR Ready"],
    commercialTags: ["Presentation", "Hybrid meeting", "Room core"],
  },
  {
    sku: "MX-0403-H3-MST",
    name: "3-Output Presentation Switcher with Extension",
    family: "Presentation Switcher",
    category: "Presentation / Room Core",
    summary:
      "Room-centric 3-output switcher with dual HDMI plus HDBaseT output, USB-C, MST and MTR/BYOD workflows.",
    applications: ["Meeting room", "Boardroom", "Teams room", "Classroom", "BYOD", "BYOM"],
    featureTags: ["USB-C", "HDMI", "MST", "3 Outputs", "HDBaseT Output", "USB Routing", "USB Host", "USB Device", "Ethernet Extension", "BYOD / BYOM", "MTR Ready"],
    commercialTags: ["Presentation", "Extension", "Hybrid meeting"],
  },
  {
    sku: "SW-620-TX-W",
    name: "2-Input Wireless Presentation and Conferencing System",
    family: "Presentation Switcher",
    category: "Presentation / Wireless",
    summary:
      "Meeting-room presentation switcher with dual outputs, USB-C, wireless casting and conferencing support.",
    applications: ["Meeting room", "Huddle space", "Teams room", "Hybrid UC"],
    featureTags: ["USB-C", "HDMI", "Wireless Casting", "Wireless Conferencing", "Dual Display", "USB Routing", "USB Host", "USB Device", "BYOD / BYOM"],
    commercialTags: ["Wireless presentation", "UC"],
  },
  {
    sku: "SW-640L-TX-W",
    name: "4-Input Wireless Presentation and Conferencing System",
    family: "Presentation Switcher",
    category: "Presentation / Wireless",
    summary:
      "Dual-output local room switcher with HDMI, USB-C, wireless casting, wireless conferencing and multiview for meeting rooms.",
    applications: ["Meeting room", "Boardroom", "Teams room", "Hybrid UC"],
    featureTags: ["USB-C", "HDMI", "Wireless Casting", "Wireless Conferencing", "Dual Display", "USB Routing", "USB Host", "USB Device", "Scaling", "BYOD / BYOM"],
    commercialTags: ["Wireless presentation", "Conference room"],
  },
  {
    sku: "MX-0804-EDC",
    name: "8x4 Seamless Presentation Matrix",
    family: "Matrix Switcher",
    category: "Seamless Matrix",
    summary:
      "Central routing matrix for scalable source-to-display distribution with seamless switching, DSP and Dante audio.",
    applications: ["Boardroom", "Training room", "Classroom", "Hospitality"],
    featureTags: ["USB-C", "HDMI", "4+ Outputs", "Seamless Switching", "Scaling", "Audio De-embed", "Dante / AES67", "USB Routing"],
    commercialTags: ["Matrix", "Distribution", "Infrastructure"],
  },
  {
    sku: "MXV-0808-H2A-70-V3",
    name: "8x8 HDBaseT Matrix",
    family: "HDBaseT Matrix",
    category: "HDBaseT Matrix",
    summary:
      "Infrastructure-class matrix with HDBaseT outputs for long-distance AV distribution.",
    applications: ["Boardroom", "Hospitality", "Education", "Corporate"],
    featureTags: ["HDMI", "4+ Outputs", "HDBaseT Output", "Audio De-embed", "PoE / PoH"],
    commercialTags: ["Traditional matrix", "Distribution", "Long distance"],
  },
  {
    sku: "NHD-500-RX v2",
    name: "Ultra-Low Latency 4K Decoder",
    family: "AVoIP",
    category: "AVoIP Decoder",
    summary:
      "4K60 decoder for AVoIP systems with Dante AV-A readiness and USB over IP support.",
    applications: ["Boardroom", "Campus", "Video wall", "Control room"],
    featureTags: ["HDMI", "USB Routing", "USB Device", "Video Wall", "Dante / AES67", "PoE / PoH"],
    commercialTags: ["AVoIP", "Decoder"],
  },
  {
    sku: "NHD-600-TRX",
    name: "Lossless Zero Latency Transceiver",
    family: "AVoIP",
    category: "AVoIP Transceiver",
    summary:
      "10G transceiver for lossless zero-latency AVoIP with multiview and videowall support.",
    applications: ["Control room", "LED wall", "Video wall", "Broadcast"],
    featureTags: ["HDMI", "Multiview", "Video Wall", "USB Routing", "PoE / PoH"],
    commercialTags: ["AVoIP", "10G", "Zero latency"],
  },
  {
    sku: "SW-0206-VW",
    name: "Video Wall Processor",
    family: "Video Wall",
    category: "Processor",
    summary:
      "Non-AVoIP video wall processor with multiple splicing layouts, rotation and mosaic support.",
    applications: ["Video wall", "LED wall", "Retail", "Hospitality"],
    featureTags: ["HDMI", "Video Wall", "Scaling", "Multiview"],
    commercialTags: ["Processor", "Non-AVoIP", "Mosaic"],
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

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function hasIntent(state: CatalogState): boolean {
  return (
    Boolean(state.search.trim()) ||
    Boolean(state.family) ||
    Boolean(state.functionalRole) ||
    Boolean(state.routingClass) ||
    Boolean(state.application.trim()) ||
    Boolean(state.roomType.trim()) ||
    Boolean(state.budgetBand.trim()) ||
    state.selectedFeatures.length > 0
  );
}

function featureGroup(feature: string): string {
  const map: Record<string, string> = {
    "USB-C": "Inputs / Outputs",
    HDMI: "Inputs / Outputs",
    "Wireless Casting": "Conferencing / Sharing",
    "Wireless Conferencing": "Conferencing / Sharing",
    MST: "Display Behaviour",
    "Dual Display": "Display Behaviour",
    "3 Outputs": "Inputs / Outputs",
    "4+ Outputs": "Inputs / Outputs",
    "HDBaseT Output": "Transport / Infrastructure",
    "USB Routing": "Conferencing / Sharing",
    "USB Host": "Conferencing / Sharing",
    "USB Device": "Conferencing / Sharing",
    "Audio De-embed": "Audio",
    "Dante / AES67": "Audio",
    Multiview: "Display Behaviour",
    "Video Wall": "Display Behaviour",
    "Seamless Switching": "Display Behaviour",
    Scaling: "Display Behaviour",
    "Ethernet Extension": "Transport / Infrastructure",
    "eARC / ARC": "Audio",
    "PoE / PoH": "Transport / Infrastructure",
    "BYOD / BYOM": "Conferencing / Sharing",
    "MTR Ready": "Conferencing / Sharing",
  };
  return map[feature] || "Other";
}

function scoreProduct(product: CatalogProduct, state: CatalogState): number {
  let score = 0;
  const q = state.search.trim().toLowerCase();

  if (q) {
    if (product.sku.toLowerCase() === q) score += 100;
    if (product.sku.toLowerCase().includes(q)) score += 40;
    if (product.name.toLowerCase().includes(q)) score += 24;
    if (product.featureTags.some((tag) => tag.toLowerCase().includes(q))) score += 16;
    if (product.applications.some((tag) => tag.toLowerCase().includes(q))) score += 14;
    if (product.functionalRole.toLowerCase().includes(q)) score += 18;
    if (product.routingClass.toLowerCase().includes(q)) score += 18;
  }

  if (state.family && product.family === state.family) score += 18;
  if (state.functionalRole && product.functionalRole === state.functionalRole) score += 20;
  if (state.routingClass && product.routingClass === state.routingClass) score += 16;
  for (const feature of state.selectedFeatures) {
    if (product.featureTags.includes(feature)) score += 10;
  }
  return score;
}

function normalizeProducts(input: unknown): CatalogProduct[] {
  if (!Array.isArray(input)) input = FALLBACK_PRODUCTS;

  const normalized = (input as unknown[])
    .map((item, index) => {
      const record = typeof item === "object" && item ? (item as Record<string, unknown>) : null;
      if (!record) return null;

      const sku = normalizeText(record.sku ?? record.model ?? record.code);
      const name = normalizeText(record.name ?? record.title ?? record.productName ?? sku);
      const family = normalizeText(record.family ?? record.series ?? record.productFamily ?? "Other");
      const category = normalizeText(record.category ?? record.type ?? record.productType ?? "Product");
      const summary = normalizeText(record.summary ?? record.description ?? record.shortDescription);
      const applications = normalizeArray(record.applications ?? record.applicationTags ?? record.useCases);
      const featureTags = normalizeArray(record.featureTags ?? record.features ?? record.tags ?? record.capabilities);
      const commercialTags = normalizeArray(record.commercialTags ?? record.marketingTags);

      const classification = enrichProductClassification({
        ...record,
        sku,
        name,
        family,
        category,
        summary,
        applications,
        featureTags,
      });

      const product: CatalogProduct = {
        id: "${sku || name || 'product'}-${index}".toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sku: sku || name || `Product ${index + 1}`,
        name: name || sku || `Product ${index + 1}`,
        family: classification.commercialFamily,
        functionalRole: classification.functionalRole,
        routingClass: classification.routingClass,
        category: category || "Product",
        summary,
        applications: uniqueStrings([...applications, ...classification.applicationTags]),
        featureTags: uniqueStrings([...featureTags, ...classification.featureTags]),
        commercialTags,
        matrixCapable: classification.matrixCapable,
        trueMatrix: classification.trueMatrix,
        conferencingOptimised: classification.conferencingOptimised,
        distributionOptimised: classification.distributionOptimised,
      };

      if (classification.notes) product.notes = classification.notes;
      return product;
    })
    .filter((item) => item !== null) as CatalogProduct[];

  return normalized.length > 0 ? normalized : [];
}

export default function CataloguePage() {
  const [products, setProducts] = useState<CatalogProduct[]>(normalizeProducts(FALLBACK_PRODUCTS));
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CatalogState>(DEFAULT_STATE);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [restored, setRestored] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openFeatureGroups, setOpenFeatureGroups] = useState<Record<string, boolean>>({
    "Inputs / Outputs": true,
    "Conferencing / Sharing": true,
    "Display Behaviour": false,
    "Transport / Infrastructure": false,
    Audio: false,
  });

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
          : Array.isArray(data?.records)
            ? data.records
            : Array.isArray(data?.products)
              ? data.products
              : [];

        if (active) setProducts(normalizeProducts(source));
      } catch {
        if (active) setProducts(normalizeProducts(FALLBACK_PRODUCTS));
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
  const functionalRoles = useMemo(() => uniqueStrings(products.map((p) => p.functionalRole)).sort(), [products]);
  const routingClasses = useMemo(() => uniqueStrings(products.map((p) => p.routingClass)).sort(), [products]);
  const allApplications = useMemo(
    () => uniqueStrings([...products.flatMap((p) => p.applications), ...TAXONOMY.applications]).sort(),
    [products],
  );
  const allFeatureTags = useMemo(
    () => uniqueStrings([...products.flatMap((p) => p.featureTags)]).sort(),
    [products],
  );

  const featureGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const feature of allFeatureTags) {
      const group = featureGroup(feature);
      const existing = groups.get(group) ?? [];
      groups.set(group, [...existing, feature]);
    }
    return [...groups.entries()]
      .map(([group, features]) => ({ group, features: features.sort() }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [allFeatureTags]);

  const fieldSuggestions = useMemo(() => {
    const getHistory = (field: string) =>
      safeJsonParse<string[]>(localStorage.getItem(keys.fieldHistory(field)), []);

    return {
      application: uniqueStrings([...getHistory("application"), ...allApplications]),
      roomType: uniqueStrings([...getHistory("roomType"), ...TAXONOMY.roomTypes]),
      budgetBand: uniqueStrings([...getHistory("budgetBand"), ...TAXONOMY.budgetBands]),
    };
  }, [allApplications, keys]);

  const searchSuggestions = useMemo(() => {
    const q = state.search.trim().toLowerCase();

    const projectTerms = uniqueStrings([
      state.application,
      state.roomType,
      state.family,
      state.functionalRole,
      state.routingClass,
      localStorage.getItem("wm:activeProjectName") || "",
    ]);

    const recentTerms = recentSearches.map((entry) => entry.value);

    const catalogTerms = products.flatMap((product) => [
      product.sku,
      product.name,
      product.family,
      product.functionalRole,
      product.routingClass,
      ...product.featureTags,
      ...product.applications,
    ]);

    const taxonomyTerms = [
      ...TAXONOMY.applications,
      ...TAXONOMY.roomTypes,
      ...TAXONOMY.budgetBands,
      ...families,
      ...functionalRoles,
      ...routingClasses,
      ...allFeatureTags,
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
    allFeatureTags,
    families,
    functionalRoles,
    products,
    recentSearches,
    routingClasses,
    state.application,
    state.family,
    state.functionalRole,
    state.roomType,
    state.routingClass,
    state.search,
  ]);

  const results = useMemo(() => {
    if (!hasIntent(state)) return [];

    return products
      .filter((product) => {
        if (state.family && product.family !== state.family) return false;
        if (state.functionalRole && product.functionalRole !== state.functionalRole) return false;
        if (state.routingClass && product.routingClass !== state.routingClass) return false;

        if (
          shouldHideHybridInMatrixView(
            {
              commercialFamily: product.family,
              functionalRole: product.functionalRole,
              routingClass: product.routingClass,
              featureTags: product.featureTags,
              applicationTags: product.applications,
              matrixCapable: product.matrixCapable,
              trueMatrix: product.trueMatrix,
              conferencingOptimised: product.conferencingOptimised,
              distributionOptimised: product.distributionOptimised,
              notes: product.notes,
            },
            state.family,
            state.showHybridProducts,
          )
        ) {
          return false;
        }

        if (state.application) {
          const target = state.application.toLowerCase();
          const matchesApplication =
            product.applications.some((item) => item.toLowerCase().includes(target)) ||
            product.summary.toLowerCase().includes(target);
          if (!matchesApplication) return false;
        }

        if (
          !matchesFeatureFilter(
            {
              commercialFamily: product.family,
              functionalRole: product.functionalRole,
              routingClass: product.routingClass,
              featureTags: product.featureTags,
              applicationTags: product.applications,
              matrixCapable: product.matrixCapable,
              trueMatrix: product.trueMatrix,
              conferencingOptimised: product.conferencingOptimised,
              distributionOptimised: product.distributionOptimised,
              notes: product.notes,
            },
            state.selectedFeatures,
          )
        ) {
          return false;
        }

        const q = state.search.trim().toLowerCase();
        if (!q) return true;

        const haystack = [
          product.sku,
          product.name,
          product.family,
          product.functionalRole,
          product.routingClass,
          product.category,
          product.summary,
          ...product.applications,
          ...product.featureTags,
          ...product.commercialTags,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .map((product) => ({ product, score: scoreProduct(product, state) }))
      .sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku))
      .map((entry) => entry.product);
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

  function toggleFeature(feature: string) {
    setState((current) => ({
      ...current,
      selectedFeatures: current.selectedFeatures.includes(feature)
        ? current.selectedFeatures.filter((item) => item !== feature)
        : [...current.selectedFeatures, feature],
    }));
  }

  function clearAll() {
    setState(DEFAULT_STATE);
    setRestored(false);
    searchRef.current?.focus();
  }

  function toggleFeatureGroup(group: string) {
    setOpenFeatureGroups((current) => ({ ...current, [group]: !current[group] }));
  }

  const chips = [
    state.family && { label: state.family, key: "family" as const },
    state.functionalRole && { label: state.functionalRole, key: "functionalRole" as const },
    state.routingClass && { label: state.routingClass, key: "routingClass" as const },
    state.application && { label: state.application, key: "application" as const },
    ...state.selectedFeatures.map((feature) => ({ label: feature, key: "selectedFeatures" as const })),
  ].filter(Boolean) as { label: string; key: keyof CatalogState }[];

  const showingQuietState = !hasIntent(state);

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <aside style={leftPaneStyle}>
          <section style={panelStyle}>
            <div style={headerRowStyle}>
              <div>
                <div style={eyebrowStyle}>Wingman Product Guide / Finder</div>
                <h1 style={titleStyle}>Catalog Finder</h1>
                <div style={mutedTextStyle}>
                  Compact layout with remembered input and quiet-open behaviour.
                </div>
              </div>

              <div style={actionRowStyle}>
                <button type="button" onClick={() => setShowAdvanced((value) => !value)} style={buttonStyle}>
                  <Filter size={14} />
                  {showAdvanced ? "Hide" : "Advanced"}
                </button>
                <button type="button" onClick={clearAll} style={buttonStyle}>
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>
            </div>

            <div style={stackStyle}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Search</span>
                <div style={searchWrapStyle}>
                  <Search size={14} style={searchIconStyle} />
                  <input
                    ref={searchRef}
                    list="catalog-search-suggestions"
                    value={state.search}
                    onChange={(event) => updateState("search", event.target.value)}
                    onBlur={() => commitSearch(state.search)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitSearch(state.search);
                    }}
                    placeholder="SKU, feature, role, room type..."
                    style={inputStyle}
                  />
                  <datalist id="catalog-search-suggestions">
                    {searchSuggestions.map((item) => (
                      <option key={item.key} value={item.label} />
                    ))}
                  </datalist>
                </div>
              </label>

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
                    {item.source === "recent" ? (
                      <Clock3 size={11} />
                    ) : item.source === "project" ? (
                      <FolderOpen size={11} />
                    ) : item.source === "catalog" ? (
                      <PackageSearch size={11} />
                    ) : (
                      <Sparkles size={11} />
                    )}
                    {item.label}
                  </button>
                ))}
              </div>

              <div style={filterGridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Family</span>
                  <select value={state.family} onChange={(event) => updateState("family", event.target.value)} style={selectStyle}>
                    <option value="">All families</option>
                    {families.map((family) => (
                      <option key={family} value={family}>
                        {family}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Role</span>
                  <select
                    value={state.functionalRole}
                    onChange={(event) => updateState("functionalRole", event.target.value)}
                    style={selectStyle}
                  >
                    <option value="">All roles</option>
                    {functionalRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Routing</span>
                  <select
                    value={state.routingClass}
                    onChange={(event) => updateState("routingClass", event.target.value)}
                    style={selectStyle}
                  >
                    <option value="">All routing classes</option>
                    {routingClasses.map((routingClass) => (
                      <option key={routingClass} value={routingClass}>
                        {routingClass}
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
                    style={plainInputStyle}
                  />
                  <datalist id="catalog-application-suggestions">
                    {fieldSuggestions.application.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </label>

                {showAdvanced ? (
                  <>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Room type</span>
                      <input
                        list="catalog-roomtype-suggestions"
                        value={state.roomType}
                        onChange={(event) => updateState("roomType", event.target.value)}
                        onBlur={() => rememberFieldValue("roomType", state.roomType)}
                        placeholder="Small room, lecture hall..."
                        style={plainInputStyle}
                      />
                      <datalist id="catalog-roomtype-suggestions">
                        {fieldSuggestions.roomType.map((value) => (
                          <option key={value} value={value} />
                        ))}
                      </datalist>
                    </label>

                    <label style={fieldStyle}>
                      <span style={labelStyle}>Budget</span>
                      <input
                        list="catalog-budget-suggestions"
                        value={state.budgetBand}
                        onChange={(event) => updateState("budgetBand", event.target.value)}
                        onBlur={() => rememberFieldValue("budgetBand", state.budgetBand)}
                        placeholder="Entry, premium..."
                        style={plainInputStyle}
                      />
                      <datalist id="catalog-budget-suggestions">
                        {fieldSuggestions.budgetBand.map((value) => (
                          <option key={value} value={value} />
                        ))}
                      </datalist>
                    </label>

                    <div style={fieldStyle}>
                      <span style={labelStyle}>Hybrid visibility</span>
                      <button
                        type="button"
                        onClick={() => updateState("showHybridProducts", !state.showHybridProducts)}
                        style={state.showHybridProducts ? activeButtonStyle : buttonStyle}
                      >
                        <Layers3 size={14} />
                        {state.showHybridProducts ? "Hybrid shown" : "Hybrid hidden"}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <div style={eyebrowStyle}>Feature filters</div>
              <div style={mutedTextStyle}>{state.selectedFeatures.length} selected</div>
            </div>

            <div style={stackStyle}>
              {featureGroups.map(({ group, features }) => {
                const isOpen = openFeatureGroups[group] ?? false;
                const activeCount = features.filter((feature) => state.selectedFeatures.includes(feature)).length;

                return (
                  <div key={group} style={featureGroupStyle}>
                    <button type="button" onClick={() => toggleFeatureGroup(group)} style={featureGroupHeaderStyle}>
                      <span style={featureGroupTitleStyle}>
                        {group}
                        {activeCount > 0 ? <span style={miniCountStyle}>{activeCount}</span> : null}
                      </span>
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isOpen ? (
                      <div style={chipWrapStyle}>
                        {features.map((feature) => {
                          const active = state.selectedFeatures.includes(feature);
                          return (
                            <button
                              key={feature}
                              type="button"
                              onClick={() => toggleFeature(feature)}
                              style={active ? selectedFeatureChipStyle : featureChipStyle}
                            >
                              {active ? <Check size={11} /> : null}
                              {feature}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <main style={rightPaneStyle}>
          <section style={contextPanelStyle}>
            <div style={chipWrapStyle}>
              <span style={miniPillStyle}>
                Project: {localStorage.getItem("wm:activeProjectName") || "General catalog"}
              </span>
              <span style={miniPillStyle}>Mode: {restored ? "Restored session" : "New session"}</span>

              {chips.map((chip) => (
                <button
                  key={`${chip.key}-${chip.label}`}
                  type="button"
                  onClick={() => {
                    if (chip.key === "selectedFeatures") {
                      setState((current) => ({
                        ...current,
                        selectedFeatures: current.selectedFeatures.filter((item) => item !== chip.label),
                      }));
                    } else {
                      updateState(chip.key, "" as never);
                    }
                  }}
                  style={activeChipStyle}
                >
                  <Tag size={11} />
                  {chip.label}
                  <X size={11} />
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
                  <Clock3 size={11} />
                  {item.value}
                </button>
              ))}
            </div>
          </section>

          {showingQuietState ? (
            <section style={quietStateStyle}>
              <PackageSearch size={26} style={{ opacity: 0.72 }} />
              <h2 style={quietTitleStyle}>No output until there is intent</h2>
              <p style={quietBodyStyle}>
                Start with a SKU, family, routing class, application, or feature tag.
              </p>
            </section>
          ) : (
            <section style={resultsPanelStyle}>
              <div style={resultsToolbarStyle}>
                <div style={mutedTextStyle}>
                  {loading
                    ? "Loading product guide..."
                    : `${results.length} result${results.length === 1 ? "" : "s"} matching current intent`}
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

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: state.viewMode === "grid" ? "repeat(auto-fill, minmax(320px, 1fr))" : "1fr",
                }}
              >
                {results.map((product) => (
                  <article key={product.id} style={resultCardStyle}>
                    <div style={resultHeaderStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={resultTopLineStyle}>
                          <span style={skuStyle}>{product.sku}</span>
                          <span style={categoryStyle}>{product.category}</span>
                        </div>
                        <div style={nameStyle}>{product.name}</div>
                      </div>

                      <div style={pillWrapStyle}>
                        <span style={rolePillStyle}>{product.functionalRole}</span>
                        <span style={routePillStyle}>{product.routingClass}</span>
                        {product.trueMatrix ? <span style={matrixPillStyle}>True Matrix</span> : null}
                        {product.matrixCapable && !product.trueMatrix ? (
                          <span style={hybridPillStyle}>Matrix-capable</span>
                        ) : null}
                      </div>
                    </div>

                    <div style={summaryStyle}>{product.summary}</div>

                    {product.notes ? (
                      <div style={notesStyle}>
                        <strong>Wingman logic:</strong> {product.notes}
                      </div>
                    ) : null}

                    <div style={detailsStackStyle}>
                      <div>
                        <div style={detailLabelStyle}>Applications</div>
                        <div style={pillWrapStyle}>
                          {product.applications.map((tag) => (
                            <span key={tag} style={miniPillStyle}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={detailLabelStyle}>Specific features</div>
                        <div style={pillWrapStyle}>
                          {product.featureTags.map((tag) => (
                            <span key={tag} style={miniPillStyle}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: 12,
  maxWidth: 1600,
  margin: "0 auto",
  color: "var(--wm-text, #e5eef8)",
};

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 12,
  alignItems: "start",
};

const leftPaneStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  position: "sticky",
  top: 72,
  maxHeight: "calc(100vh - 84px)",
  overflow: "auto",
  paddingRight: 2,
};

const rightPaneStyle: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 10,
};

const panelStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: 12,
  background: "rgba(15, 23, 42, 0.72)",
  padding: 10,
  boxShadow: "0 10px 24px rgba(2, 8, 23, 0.18)",
};

const contextPanelStyle: CSSProperties = {
  ...panelStyle,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const resultsPanelStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const quietStateStyle: CSSProperties = {
  ...panelStyle,
  minHeight: 260,
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  gap: 8,
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 8,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
};

const titleStyle: CSSProperties = {
  margin: "2px 0 4px",
  fontSize: 20,
  lineHeight: 1.1,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  opacity: 0.72,
};

const mutedTextStyle: CSSProperties = {
  fontSize: 12,
  opacity: 0.78,
};

const stackStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.9,
  opacity: 0.68,
};

const searchWrapStyle: CSSProperties = {
  position: "relative",
};

const searchIconStyle: CSSProperties = {
  position: "absolute",
  left: 10,
  top: 10,
  opacity: 0.58,
};

const plainInputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(2, 6, 23, 0.72)",
  color: "inherit",
  padding: "8px 10px",
  outline: "none",
  fontSize: 13,
};

const inputStyle: CSSProperties = {
  ...plainInputStyle,
  paddingLeft: 32,
};

const selectStyle: CSSProperties = {
  ...plainInputStyle,
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
  padding: "7px 10px",
  cursor: "pointer",
  fontSize: 12,
};

const activeButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "rgba(249, 115, 22, 0.16)",
  border: "1px solid rgba(249, 115, 22, 0.34)",
};

const chipWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  alignItems: "center",
};

const chipButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  borderRadius: 999,
  padding: "4px 8px",
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

const miniPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  borderRadius: 999,
  padding: "3px 7px",
  fontSize: 11,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(30, 41, 59, 0.55)",
};

const miniCountStyle: CSSProperties = {
  ...miniPillStyle,
  padding: "1px 7px",
  background: "rgba(249, 115, 22, 0.14)",
  border: "1px solid rgba(249, 115, 22, 0.26)",
};

const featureGroupStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.12)",
  borderRadius: 10,
  padding: 8,
  background: "rgba(2, 6, 23, 0.3)",
};

const featureGroupHeaderStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  border: "none",
  background: "transparent",
  color: "inherit",
  padding: 0,
  cursor: "pointer",
  fontSize: 12,
};

const featureGroupTitleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const featureChipStyle: CSSProperties = {
  ...chipButtonStyle,
};

const selectedFeatureChipStyle: CSSProperties = {
  ...chipButtonStyle,
  background: "rgba(249, 115, 22, 0.16)",
  border: "1px solid rgba(249, 115, 22, 0.34)",
};

const resultsToolbarStyle: CSSProperties = {
  ...panelStyle,
  padding: 8,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const resultCardStyle: CSSProperties = {
  ...panelStyle,
  padding: 10,
  display: "grid",
  gap: 8,
};

const resultHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const resultTopLineStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 2,
};

const skuStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: 0.2,
};

const categoryStyle: CSSProperties = {
  fontSize: 11,
  opacity: 0.7,
};

const nameStyle: CSSProperties = {
  fontSize: 13,
  opacity: 0.9,
};

const pillWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  alignItems: "center",
};

const rolePillStyle: CSSProperties = {
  ...miniPillStyle,
  background: "rgba(59, 130, 246, 0.16)",
  border: "1px solid rgba(59, 130, 246, 0.28)",
};

const routePillStyle: CSSProperties = {
  ...miniPillStyle,
  background: "rgba(16, 185, 129, 0.12)",
  border: "1px solid rgba(16, 185, 129, 0.24)",
};

const matrixPillStyle: CSSProperties = {
  ...miniPillStyle,
  background: "rgba(168, 85, 247, 0.14)",
  border: "1px solid rgba(168, 85, 247, 0.28)",
};

const hybridPillStyle: CSSProperties = {
  ...miniPillStyle,
  background: "rgba(245, 158, 11, 0.14)",
  border: "1px solid rgba(245, 158, 11, 0.28)",
};

const summaryStyle: CSSProperties = {
  lineHeight: 1.45,
  opacity: 0.84,
  fontSize: 13,
};

const notesStyle: CSSProperties = {
  borderRadius: 10,
  padding: "8px 10px",
  background: "rgba(2, 6, 23, 0.45)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  fontSize: 12,
  lineHeight: 1.45,
};

const detailsStackStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const detailLabelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  opacity: 0.64,
  marginBottom: 5,
};

const quietTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const quietBodyStyle: CSSProperties = {
  margin: 0,
  maxWidth: 560,
  opacity: 0.8,
  lineHeight: 1.45,
};