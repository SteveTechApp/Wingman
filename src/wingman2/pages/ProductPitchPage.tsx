import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { ProductSalesKnowledgePanel } from "../components/ProductSalesKnowledgePanel";
import {
  saveRecommendationEvidenceToProject,
  useProjectStore,
  type StoredQuoteSafetyStatus,
  type StoredRecommendationEvidence,
  type StoredProductSelection,
} from "../data/projectStore";
import { readLatestDiscoveryBrief } from "../data/workflowHandoff";
import {
  buildRecommendationEvidence,
  productToSelection,
  type RecommendationEvidenceCompare,
  type RecommendationEvidenceProduct,
} from "../lib/recommendationEvidence";

type LoadState = "loading" | "ready" | "error";

interface ProductRecord {
  sku: string;
  name: string;
  family: string;
  category: string;
  summary: string;
  features: string[];
  tags: string[];
  url: string;
  sourceText: string;
}

const SKU_PATTERN = /\b(?:NHD|MX|MXV|SW|SWX|RX|RXV|TX|EX|EXA|EXF|EXP|APO|CAM|HALO|SYN|SP|CAB|AMP|COM|IDB|FOCUS|SR)-[A-Z0-9][A-Z0-9-]*\b/i;
const COMPARE_RECORDS_KEY = "wm_competitor_compare_swot_records_v1";

const FALLBACK_PRODUCTS: ProductRecord[] = [
  {
    sku: "NHD-500-TX",
    name: "NetworkHD 500 Encoder",
    family: "NetworkHD",
    category: "AV over IP",
    summary: "Premium 4K60 AV-over-IP encoder for low-latency networked video distribution.",
    features: ["4K60", "AV over IP", "Low latency", "USB support"],
    tags: ["NetworkHD", "Encoder", "4K"],
    url: "",
    sourceText: ""
  },
  {
    sku: "NHD-500-RX",
    name: "NetworkHD 500 Decoder",
    family: "NetworkHD",
    category: "AV over IP",
    summary: "Premium 4K60 AV-over-IP decoder for NetworkHD 500 systems.",
    features: ["4K60", "AV over IP", "Video wall", "USB support"],
    tags: ["NetworkHD", "Decoder", "4K"],
    url: "",
    sourceText: ""
  },
  {
    sku: "NHD-150-RX",
    name: "NetworkHD 100 Multiview Decoder",
    family: "NetworkHD",
    category: "AV over IP multiview",
    summary: "NetworkHD 100 decoder with multiview capability for showing multiple sources on one screen.",
    features: ["Multiview", "NetworkHD 100", "Single-screen monitoring"],
    tags: ["NetworkHD", "Multiview"],
    url: "",
    sourceText: ""
  },
  {
    sku: "NHD-0401-MV",
    name: "Advanced Multiview Processor",
    family: "NetworkHD",
    category: "Multiview processor",
    summary: "Advanced multiview processor for NetworkHD 500 workflows and flexible source window layouts.",
    features: ["Multiview", "Custom layouts", "NetworkHD 500"],
    tags: ["NetworkHD", "Multiview", "Processor"],
    url: "",
    sourceText: ""
  },
  {
    sku: "SW-0206-VW",
    name: "Video Wall Processor",
    family: "Video wall",
    category: "Video wall processor",
    summary: "Dedicated video wall processor for non-AV-over-IP video wall projects.",
    features: ["Video wall", "Mosaic", "Cascading", "Dedicated processing"],
    tags: ["Video wall", "Processor"],
    url: "",
    sourceText: ""
  },
  {
    sku: "MX-0402-MST",
    name: "Presentation Switcher with MST",
    family: "Presentation",
    category: "Room core",
    summary: "Meeting-room presentation switcher for USB-C, HDMI and dual-display MST workflows.",
    features: ["USB-C", "MST", "Dual display", "Meeting room"],
    tags: ["Presentation", "BYOD", "MST"],
    url: "",
    sourceText: ""
  },
  {
    sku: "MX-0403-H3-MST",
    name: "Presentation Switcher with HDBaseT Extension",
    family: "Presentation",
    category: "Room core with extension",
    summary: "Presentation switcher with USB-C, HDMI, MST and HDBaseT output for extended dual-display rooms.",
    features: ["USB-C", "MST", "HDBaseT", "Dual display"],
    tags: ["Presentation", "BYOD", "HDBaseT"],
    url: "",
    sourceText: ""
  },
  {
    sku: "SW-640L-TX-W",
    name: "Wireless Presentation and Conferencing System",
    family: "Presentation",
    category: "Wireless collaboration",
    summary: "Wireless presentation and conferencing system for modern meeting rooms.",
    features: ["Wireless casting", "Wireless conferencing", "USB-C", "Dual output"],
    tags: ["Presentation", "Wireless", "BYOD"],
    url: "",
    sourceText: ""
  },
  {
    sku: "APO-VX20-UC",
    name: "All-in-One Video Bar",
    family: "Apollo",
    category: "Video bar",
    summary: "All-in-one camera, microphone, speaker and presentation solution for small meeting rooms.",
    features: ["Camera", "Microphone", "Speaker", "Wireless casting"],
    tags: ["UC", "Video bar", "Meeting room"],
    url: "",
    sourceText: ""
  },
  {
    sku: "AMP-260-DNT",
    name: "Dante Network Amplifier",
    family: "Audio",
    category: "Network amplifier",
    summary: "Network amplifier with Dante and DSP capability for installed room audio.",
    features: ["Dante", "DSP", "Amplifier", "Installed audio"],
    tags: ["Audio", "Dante", "Amplifier"],
    url: "",
    sourceText: ""
  }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = asString(record[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

function readStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  const output: string[] = [];

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      value.forEach((item) => {
        const text = asString(item);

        if (text) {
          output.push(text);
        }
      });
    }

    if (typeof value === "string") {
      value
        .split(/[|,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => output.push(item));
    }
  }

  return Array.from(new Set(output)).slice(0, 10);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleFromSku(sku: string): string {
  return sku
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function inferFamilyFromSku(sku: string): string {
  if (sku.startsWith("NHD-")) {
    return "NetworkHD";
  }

  if (sku.startsWith("MX") || sku.startsWith("SW-") || sku.startsWith("SWX-")) {
    return "Switching";
  }

  if (sku.startsWith("EX") || sku.startsWith("RX") || sku.startsWith("TX")) {
    return "Extension";
  }

  if (sku.startsWith("APO") || sku.startsWith("CAM") || sku.startsWith("HALO") || sku.startsWith("COM")) {
    return "UC / Audio";
  }

  if (sku.startsWith("CAB")) {
    return "Cables";
  }

  return "WyreStorm";
}

function makeSourceText(record: Record<string, unknown>): string {
  try {
    return JSON.stringify(record).slice(0, 5000);
  } catch {
    return "";
  }
}

function normalizeProduct(record: Record<string, unknown>, pathKey: string): ProductRecord | null {
  const pathMatch = pathKey.match(SKU_PATTERN);
  const explicitSku = readString(record, ["sku", "SKU", "model", "modelNumber", "productSku", "partNumber"]);
  const sku = normalizeText(explicitSku || pathMatch?.[0] || "").toUpperCase();

  if (!sku || !SKU_PATTERN.test(sku)) {
    return null;
  }

  const name =
    readString(record, ["name", "productName", "title", "modelName", "displayName"]) ||
    titleFromSku(sku);

  const family =
    readString(record, ["family", "productFamily", "series", "range"]) ||
    inferFamilyFromSku(sku);

  const category =
    readString(record, ["category", "role", "type", "application", "productType"]) ||
    family;

  const summary =
    readString(record, ["summary", "description", "shortDescription", "overview", "pitch"]) ||
    `${sku} is a WyreStorm ${category.toLowerCase()} product for professional AV applications.`;

  const features = readStringArray(record, [
    "features",
    "featureTags",
    "keyFeatures",
    "capabilities",
    "connections",
    "inputs",
    "outputs"
  ]);

  const tags = readStringArray(record, ["tags", "keywords", "applications", "useCases"]);

  const url = readString(record, ["url", "productUrl", "link", "href"]);

  return {
    sku,
    name,
    family,
    category,
    summary,
    features,
    tags,
    url,
    sourceText: makeSourceText(record)
  };
}

function flattenProductIndex(payload: unknown): ProductRecord[] {
  const found = new Map<string, ProductRecord>();

  function visit(value: unknown, pathKey: string, depth: number): void {
    if (depth > 6) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${pathKey}.${index}`, depth + 1));
      return;
    }

    if (!isRecord(value)) {
      return;
    }

    const product = normalizeProduct(value, pathKey);

    if (product) {
      found.set(product.sku, product);
    }

    Object.entries(value).forEach(([key, child]) => {
      if (typeof child === "string") {
        return;
      }

      if (typeof child === "number") {
        return;
      }

      visit(child, key, depth + 1);
    });
  }

  visit(payload, "", 0);

  return Array.from(found.values()).sort((a, b) => a.sku.localeCompare(b.sku));
}

function searchHaystack(product: ProductRecord): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.summary,
    ...product.features,
    ...product.tags,
    product.sourceText
  ]
    .join(" ")
    .toLowerCase();
}

function buildPitchHeadline(product: ProductRecord): string {
  if (product.category) {
    return `${product.sku}: ${product.category} in a real application`;
  }

  return `${product.sku}: product context for a customer conversation`;
}

function productSearchUrl(sku: string): string {
  return `https://wyrestorm.com/?s=${encodeURIComponent(sku)}`;
}

function readCompareContext(compareId: string): RecommendationEvidenceCompare | null {
  if (typeof window === "undefined" || !compareId) return null;

  try {
    const raw = window.localStorage.getItem(COMPARE_RECORDS_KEY);
    if (!raw) return null;
    const records = JSON.parse(raw) as Array<Record<string, unknown>>;
    const record = records.find((item) => asString(item.id) === compareId);
    if (!record) return null;

    const competitor = isRecord(record.competitor) ? record.competitor : {};
    const shortlist = Array.isArray(record.shortlist) ? record.shortlist : [];
    const top = shortlist.find(isRecord) ?? {};

    return {
      id: asString(record.id),
      competitorBrand: asString(record.manufacturer) || asString(competitor.manufacturer),
      competitorSku: asString(record.model) || asString(competitor.sku),
      competitorName: asString(competitor.title),
      wyrestormSku: asString(top.sku),
      wyrestormTitle: asString(top.title),
      matchScore: Number.isFinite(Number(record.matchScore)) ? Number(record.matchScore) : Number(top.confidence),
      confidence: asString(top.confidence),
      summary: asString(competitor.summary),
      warnings: readStringArray(record, ["reviewNotes"]),
      evidence: readStringArray(competitor, ["evidence"]),
      source: "Competitor Compare",
    };
  } catch {
    return null;
  }
}

function productEvidenceContext(product: ProductRecord): RecommendationEvidenceProduct {
  return {
    sku: product.sku,
    title: product.name,
    name: product.name,
    family: product.family,
    category: product.category,
    summary: product.summary,
    features: product.features,
    tags: product.tags,
    source: "Product Pitch",
    isFallback: !product.sourceText,
  };
}

function quoteSafetyLabel(status: StoredQuoteSafetyStatus) {
  if (status === "quote-ready") return "Quote-ready draft";
  if (status === "validate-before-quote") return "Validate before quote";
  return "Do not quote yet";
}

function quoteSafetyClassName(status: StoredQuoteSafetyStatus) {
  if (status === "quote-ready") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (status === "validate-before-quote") return "border-cyan-200 bg-cyan-50 text-cyan-950";
  return "border-rose-200 bg-rose-50 text-rose-950";
}

function compactList(items: string[], empty: string) {
  return items.length ? items : [empty];
}

function evidenceSelection(product: RecommendationEvidenceProduct, evidence: StoredRecommendationEvidence): StoredProductSelection {
  const status =
    evidence.quoteSafetyStatus === "quote-ready"
      ? "recommended"
      : evidence.quoteSafetyStatus === "do-not-quote-yet"
        ? "caution"
        : "alternative";
  const selection = productToSelection(product, "Product Pitch");

  return {
    ...selection,
    status,
    evidence: evidence.evidenceUsed.slice(0, 8),
    cautions: [...evidence.missingInformation, ...evidence.quoteChecks].slice(0, 8),
  };
}

function EvidenceList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
        {compactList(items, empty).map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProductPitchPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [products, setProducts] = useState<ProductRecord[]>(FALLBACK_PRODUCTS);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All");
  const [selectedSku, setSelectedSku] = useState("");
  const [userStarted, setUserStarted] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [searchParams] = useSearchParams();
  const { activeProject } = useProjectStore();

  useEffect(() => {
    let cancelled = false;

    async function loadProducts(): Promise<void> {
      try {
        const response = await fetch("/product-intelligence-index.json", { cache: "no-store" });

        if (!response.ok) {
          setLoadState("ready");
          return;
        }

        const payload = (await response.json()) as unknown;
        const indexedProducts = flattenProductIndex(payload);

        if (cancelled) {
          return;
        }

        if (indexedProducts.length > 0) {
          setProducts(indexedProducts);
        }

        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setLoadState("error");
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const skuParam = (searchParams.get("sku") ?? "").trim().toUpperCase();
    const queryParam = (searchParams.get("q") ?? "").trim();
    const familyParam = (searchParams.get("family") ?? "").trim();

    if (skuParam) {
      setQuery(skuParam);
      setSelectedSku(skuParam);
      setUserStarted(true);
      return;
    }

    if (queryParam) {
      setQuery(queryParam);
      setSelectedSku("");
      setUserStarted(true);
      return;
    }

    if (familyParam) {
      setFamily(familyParam);
      setSelectedSku("");
      setUserStarted(true);
      return;
    }
  }, [searchParams]);

  const families = useMemo(() => {
    return ["All", ...Array.from(new Set(products.map((product) => product.family).filter(Boolean))).sort()];
  }, [products]);

  const selectedProduct = useMemo(() => {
    if (!selectedSku) {
      return null;
    }

    return products.find((product) => product.sku === selectedSku) ?? null;
  }, [products, selectedSku]);

  const selectedEvidenceProduct = useMemo(
    () => (selectedProduct ? productEvidenceContext(selectedProduct) : null),
    [selectedProduct],
  );

  const compareContext = useMemo(
    () => readCompareContext((searchParams.get("compare") ?? "").trim()),
    [searchParams],
  );

  const discoveryBrief = useMemo(
    () => activeProject?.discoveryBrief ?? readLatestDiscoveryBrief(),
    [activeProject],
  );

  const recommendationEvidence = useMemo(() => {
    if (!selectedEvidenceProduct) return null;

    return buildRecommendationEvidence({
      source: compareContext ? "Competitor Compare" : searchParams.get("source") === "finder" ? "Product Finder" : "Product Pitch",
      project: activeProject,
      discoveryBrief,
      product: selectedEvidenceProduct,
      compare: compareContext,
      query,
    });
  }, [activeProject, compareContext, discoveryBrief, query, searchParams, selectedEvidenceProduct]);

  const visibleProducts = useMemo(() => {
    if (!userStarted) {
      return [];
    }

    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery && family === "All") {
      return [];
    }

    return products
      .filter((product) => {
        const familyMatches = family === "All" || product.family === family;
        const queryMatches = !cleanQuery || searchHaystack(product).includes(cleanQuery);

        return familyMatches && queryMatches;
      })
      .slice(0, 16);
  }, [family, products, query, userStarted]);

  function handleQueryChange(value: string): void {
    setQuery(value);
    setSelectedSku("");
    setUserStarted(true);
  }

  function handleFamilyChange(value: string): void {
    setFamily(value);
    setSelectedSku("");
    setUserStarted(true);
  }

  function handleProductSelect(sku: string): void {
    setSelectedSku(sku);
    setUserStarted(true);
    setSaveMessage("");
  }

  function savePitchEvidence(): void {
    if (!selectedEvidenceProduct || !recommendationEvidence) return;

    const project = saveRecommendationEvidenceToProject(
      recommendationEvidence,
      evidenceSelection(selectedEvidenceProduct, recommendationEvidence),
    );
    setSaveMessage(`Saved pitch evidence to ${project.name}.`);
  }

  return (
    <div className="wm-product-pitch-page" data-has-product={selectedProduct ? "true" : "false"} data-user-started={userStarted ? "true" : "false"}>
      <section className="wm-product-pitch-hero">
        <div>
          <p>Product Pitch</p>
          <h1>Product conversation and system-positioning crib sheet</h1>
          <span>Explain what the product is, where it sits, what it works with, and how to talk about it with the right audience.</span>
        </div>

        <div className="wm-product-pitch-actions">
          <Link to={routeCatalogByKey.productFamilies.path}>Open Product Families</Link>
          <Link to={routeCatalogByKey.finder.path}>Open Product Finder</Link>
        </div>
      </section>

      <section className="wm-product-pitch-start">
        <div className="wm-product-pitch-start-copy">
          <p>Start from scratch</p>
          <h2>No product pitch is loaded yet</h2>
          <span>Type a SKU, search by feature, or select a product family. The results window stays clear until the user takes action.</span>
        </div>

        <div className="wm-product-pitch-controls">
          <label>
            Search SKU or requirement
            <input
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Example: NHD-500-RX, multiview, USB-C, Dante, video wall"
            />
          </label>

          <label>
            Product family
            <select value={family} onChange={(event) => handleFamilyChange(event.target.value)}>
              {families.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loadState === "loading" && (
        <section className="wm-product-pitch-empty">
          <strong>Loading product reference...</strong>
          <span>The pitch area will remain blank until a SKU or filter is selected.</span>
        </section>
      )}

      {loadState === "error" && (
        <section className="wm-product-pitch-empty">
          <strong>Using fallback pitch list</strong>
          <span>The product intelligence index could not be loaded, so Wingman is using a small fallback SKU set.</span>
        </section>
      )}

      {!userStarted && (
        <section className="wm-product-pitch-empty">
          <strong>Results window clear</strong>
          <span>Select a family or type a requirement to reveal matching WyreStorm products.</span>
        </section>
      )}

      {userStarted && !selectedProduct && visibleProducts.length === 0 && (
        <section className="wm-product-pitch-empty">
          <strong>No matching products shown yet</strong>
          <span>Try a SKU, family name, connection type, feature, or application.</span>
        </section>
      )}

      {visibleProducts.length > 0 && !selectedProduct && (
        <section className="wm-product-pitch-results">
          <div className="wm-product-pitch-results-head">
            <p>Matching products</p>
            <strong>Select one SKU to generate the sales, system-positioning and in-situ diagram crib sheet.</strong>
          </div>

          <div className="wm-product-pitch-grid">
            {visibleProducts.map((product) => (
              <button key={product.sku} type="button" onClick={() => handleProductSelect(product.sku)}>
                <span>{product.family}</span>
                <strong>{product.sku}</strong>
                <small>{product.name}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedProduct && recommendationEvidence && (
        <section className="wm-product-pitch-sheet">
          <div className="wm-product-pitch-sheet-head">
            <div>
              <p>Sales conversation pitch</p>
              <h2>{selectedProduct.sku}</h2>
              <span>{selectedProduct.name}</span>
            </div>

            <div className="wm-product-pitch-sheet-links">
              <button
                type="button"
                onClick={savePitchEvidence}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                Save pitch to project
              </button>
              {selectedProduct.url && (
                <a href={selectedProduct.url} target="_blank" rel="noreferrer">
                  Product page
                </a>
              )}
              <a href={productSearchUrl(selectedProduct.sku)} target="_blank" rel="noreferrer">
                WyreStorm search
              </a>
            </div>
          </div>

          {saveMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
              {saveMessage}
            </p>
          ) : null}

          <article className="wm-product-pitch-main-card">
            <p>Quote safety status</p>
            <h3>{quoteSafetyLabel(recommendationEvidence.quoteSafetyStatus)}</h3>
            <span>{recommendationEvidence.quoteSafetyMessage}</span>
          </article>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Customer requirement</p>
              <p className="mt-2 text-sm leading-6 text-[#edf6ff]">{recommendationEvidence.customerRequirement}</p>
            </div>
            <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Product direction</p>
              <p className="mt-2 text-sm font-black leading-6 text-[#edf6ff]">{recommendationEvidence.productDirection}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${quoteSafetyClassName(recommendationEvidence.quoteSafetyStatus)}`}>
              <p className="text-xs font-black uppercase tracking-[0.14em]">Quote safety</p>
              <p className="mt-2 text-sm font-black leading-6">{quoteSafetyLabel(recommendationEvidence.quoteSafetyStatus)}</p>
              <p className="mt-1 text-xs leading-5">{recommendationEvidence.nextBestQuestion}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Suggested system shape</p>
            <p className="mt-2 text-sm leading-6 text-[#edf6ff]">{recommendationEvidence.systemShape}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <EvidenceList title="Why this fits" items={recommendationEvidence.whyThisFits} empty={selectedProduct.summary} />
            <EvidenceList title="Evidence used" items={recommendationEvidence.evidenceUsed} empty="No structured evidence has been captured yet." />
            <EvidenceList title="What to check before quoting" items={recommendationEvidence.quoteChecks} empty="Run final datasheet and dependency checks before issue." />
            <EvidenceList title="Missing information" items={recommendationEvidence.missingInformation} empty="No major missing information is currently flagged." />
            <EvidenceList title="Required dependencies" items={recommendationEvidence.requiredDependencies} empty="No governed required dependency is selected yet." />
            <EvidenceList title="Optional upgrades" items={recommendationEvidence.optionalUpgrades} empty="No optional upgrade path is currently suggested." />
            <EvidenceList title="Alternatives / when not to use this product" items={recommendationEvidence.alternatives} empty="Validate whether a simpler product family is a better fit." />
            <EvidenceList title="Customer-safe wording" items={recommendationEvidence.customerSafeWording} empty="Confirm the requirement before presenting customer wording." />
            <EvidenceList title="Internal guidance" items={recommendationEvidence.internalGuidance} empty="Keep this as an internal design direction until validation is complete." />
          </div>

          <article className="wm-product-pitch-main-card">
            <p>Customer explanation</p>
            <h3>{buildPitchHeadline(selectedProduct)}</h3>
            <span>{selectedProduct.summary}</span>
          </article>
          <ProductSalesKnowledgePanel product={selectedProduct} mode="pitch" />

          {selectedProduct.features.length > 0 && (
            <div className="wm-product-pitch-tags">
              {selectedProduct.features.slice(0, 10).map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>
          )}

          <div className="wm-product-pitch-reset">
            <button type="button" onClick={() => handleProductSelect("")}>
              Choose another SKU
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductPitchPage;

