import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { ProductMediaPanel } from "../components/ProductMediaPanel";
import { getBestProductPositioningCardForSku } from "../data/productPositioningCards";
import { buildProductSalesNarrative } from "../lib/productSalesPositioning";
import {
  WINGMAN_APPLICATION_CONTEXTS,
  WINGMAN_AUDIENCES,
  WINGMAN_CALL_MODES,
  type WingmanApplicationContext,
  type WingmanAudience,
  type WingmanCallMode,
} from "../types/productPositioning";

type LoadState = "loading" | "ready" | "error";
type ProductRaw = Record<string, unknown>;

type CallCardProduct = {
  sku: string;
  title: string;
  family: string;
  category: string;
  // Positioning statement (plain-English, customer-facing)
  whatItIs: string;
  summary: string;
  realWorld: string;
  customerValue: string;
  howToTalk: string;
  talkingPoints: string[];
  applications: string[];
  features: string[];
  raw: ProductRaw;
};

const productIndexSources = [
  "/product-intelligence-index.json",
  "/wingman/product-intelligence-index.json",
  "/products.json",
];

const SKU_PATTERN = /\b(?:NHD|MX|MXV|SW|EX|APO|CAM|TX|RX|CON|CTL|SPK|EXP|CAB|HDL|H2|H2L|H2X|HDBT|HALO|FOCUS|SP|AMP|SCL|VW)-[A-Z0-9][A-Z0-9-]{2,}\b/i;
const SKU_SCAN_PATTERN = /\b(?:NHD|MX|MXV|SW|EX|APO|CAM|TX|RX|CON|CTL|SPK|EXP|CAB|HDL|H2|H2L|H2X|HDBT|HALO|FOCUS|SP|AMP|SCL|VW)-[A-Z0-9][A-Z0-9-]{2,}\b/gi;

function isPlainObject(value: unknown): value is ProductRaw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normaliseKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normaliseText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normaliseSku(value: unknown): string {
  return normaliseText(value).toUpperCase().replace(/\s+/g, "-").trim();
}

function findValueByKeys(source: unknown, keys: string[], depth = 0): unknown {
  if (depth > 4) {
    return undefined;
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findValueByKeys(item, keys, depth + 1);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  if (!isPlainObject(source)) {
    return undefined;
  }

  for (const [key, value] of Object.entries(source)) {
    if (keys.includes(normaliseKey(key))) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const found = findValueByKeys(value, keys, depth + 1);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function pickText(record: ProductRaw, keys: string[]): string {
  return normaliseText(findValueByKeys(record, keys.map(normaliseKey)));
}

function toTextList(value: unknown): string[] {
  const output: string[] = [];

  if (typeof value === "string") {
    const split = value
      .split(/\r?\n|;|•|\u2022/g)
      .map((item) => item.trim())
      .filter(Boolean);

    return split.length > 1 ? split.slice(0, 8) : [value.trim()].filter(Boolean);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" || typeof item === "number") {
        output.push(String(item).trim());
      }

      if (isPlainObject(item)) {
        const label =
          pickText(item, ["label", "title", "name", "text", "value", "description"]) ||
          Object.values(item)
            .map(normaliseText)
            .find(Boolean) ||
          "";

        if (label) {
          output.push(label);
        }
      }
    }
  }

  if (isPlainObject(value)) {
    for (const item of Object.values(value)) {
      if (typeof item === "string" || typeof item === "number") {
        output.push(String(item).trim());
      }
    }
  }

  return Array.from(new Set(output.filter(Boolean))).slice(0, 8);
}

function pickList(record: ProductRaw, keys: string[]): string[] {
  return toTextList(findValueByKeys(record, keys.map(normaliseKey)));
}

function collectTextValues(value: unknown, depth = 0): string[] {
  if (depth > 3) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextValues(item, depth + 1));
  }

  if (isPlainObject(value)) {
    return Object.values(value).flatMap((item) => collectTextValues(item, depth + 1));
  }

  return [];
}

function objectHasProductCue(record: ProductRaw): boolean {
  const cueKeys = [
    "sku",
    "wyrestormsku",
    "productsku",
    "model",
    "modelnumber",
    "partnumber",
    "part",
    "title",
    "name",
    "productname",
    "description",
    "category",
    "family",
  ];

  return Object.keys(record).some((key) => cueKeys.includes(normaliseKey(key)));
}

function extractSku(record: ProductRaw, contextKey?: string): string {
  const direct = findValueByKeys(record, [
    "sku",
    "wyrestormsku",
    "productsku",
    "model",
    "modelnumber",
    "partnumber",
    "part",
  ]);

  const directSku = normaliseSku(direct);

  if (directSku && SKU_PATTERN.test(directSku)) {
    return directSku;
  }

  const contextSku = normaliseSku(contextKey);

  if (contextSku && SKU_PATTERN.test(contextSku)) {
    return contextSku;
  }

  if (!objectHasProductCue(record)) {
    return "";
  }

  const text = collectTextValues(record).join(" ");
  const match = text.match(SKU_SCAN_PATTERN);

  return match?.[0]?.toUpperCase() ?? "";
}

function isWyrestormProduct(record: ProductRaw, sku: string): boolean {
  const brand = pickText(record, ["brand", "manufacturer", "vendor", "make"]);

  if (brand) {
    return /wyrestorm/i.test(brand);
  }

  return SKU_PATTERN.test(sku);
}

function salesLanguageOf(record: ProductRaw): ProductRaw {
  const value = (record as { salesLanguage?: unknown }).salesLanguage;
  return isPlainObject(value) ? value : {};
}

function createProduct(record: ProductRaw, sku: string): CallCardProduct {
  const sl = salesLanguageOf(record);

  const title =
    pickText(record, ["title", "productName", "name", "modelName", "displayName"]) || sku;
  const family = pickText(record, ["family", "productFamily", "series", "range"]) || "WyreStorm product";
  const category = pickText(record, ["category", "type", "productType", "technology"]);

  // Strip a leading "SKU:" prefix that some headlines carry.
  const headline = normaliseText(sl.headline).replace(new RegExp(`^${sku}\\s*[:\\-–]\\s*`, "i"), "").trim();
  const summary =
    normaliseText(sl.plainEnglishSummary) ||
    pickText(record, ["description", "shortDescription", "summary", "overview"]);
  const realWorld =
    normaliseText(sl.realWorldApplication) ||
    pickList(record, ["applications", "useCases", "verticals", "roomTypes"]).join(" • ");
  const talkingPoints = toTextList(sl.talkTrack);
  const applications = pickList(record, ["applications", "useCases", "verticals", "roomTypes"]);
  const features = pickList(record, ["features", "majorFeatures", "keyFacts", "technologies"]);

  return {
    sku,
    title: title === sku ? sku : title,
    family,
    category,
    whatItIs: headline || summary || [title, category].filter(Boolean).join(" — "),
    summary,
    realWorld,
    customerValue: normaliseText(sl.customerValue),
    howToTalk: normaliseText(sl.salespersonCue),
    talkingPoints:
      talkingPoints.length > 0
        ? talkingPoints
        : features.slice(0, 4),
    applications,
    features,
    raw: record,
  };
}

function collectProducts(input: unknown): CallCardProduct[] {
  const products = new Map<string, CallCardProduct>();

  function visit(value: unknown, depth = 0, contextKey?: string): void {
    if (depth > 10) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, depth + 1);
      }

      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    const sku = extractSku(value, contextKey);

    if (sku && isWyrestormProduct(value, sku) && !products.has(sku)) {
      products.set(sku, createProduct(value, sku));
    }

    for (const [key, child] of Object.entries(value)) {
      visit(child, depth + 1, key);
    }
  }

  visit(input);

  return Array.from(products.values()).sort((a, b) =>
    a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: "base" }),
  );
}

async function loadProducts(): Promise<CallCardProduct[]> {
  for (const source of productIndexSources) {
    try {
      const response = await fetch(source, { cache: "no-store" });

      if (response.ok) {
        const data = (await response.json()) as unknown;
        const products = collectProducts(data);

        if (products.length > 0) {
          return products;
        }
      }
    } catch {
      // Continue to the next possible product index.
    }
  }

  return [];
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="wm-product-call-card-panel">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function ProductCallCardsPage() {
  const [products, setProducts] = useState<CallCardProduct[]>([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [query, setQuery] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [audience, setAudience] = useState<WingmanAudience>("DEALER");
  const [callMode, setCallMode] = useState<WingmanCallMode>("PROJECT_DISCOVERY");
  const [application, setApplication] = useState<WingmanApplicationContext>("MEETING_ROOM");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadProducts()
      .then((loadedProducts) => {
        if (!isMounted) {
          return;
        }

        setProducts(loadedProducts);
        setLoadState("ready");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setLoadState("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.sku === selectedSku),
    [products, selectedSku],
  );
  const selectedPositioningCard = useMemo(
    () => (selectedProduct ? getBestProductPositioningCardForSku(selectedProduct.sku) : undefined),
    [selectedProduct],
  );
  const selectedNarrative = useMemo(
    () =>
      selectedProduct
        ? buildProductSalesNarrative({
            product: selectedProduct,
            card: selectedPositioningCard,
            audience,
            callMode,
            application,
          })
        : null,
    [application, audience, callMode, selectedPositioningCard, selectedProduct],
  );

  const filteredSuggestions = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) {
      return [];
    }

    return products
      .filter((product) =>
        `${product.sku} ${product.title} ${product.family} ${product.category}`.toLowerCase().includes(value),
      )
      .slice(0, 8);
  }, [products, query]);

  function chooseProduct(sku: string): void {
    if (!sku) {
      setSelectedSku("");
      setQuery("");
      return;
    }

    const product = products.find((item) => item.sku === sku);

    if (!product) {
      return;
    }

    setSelectedSku(product.sku);
    setQuery(product.sku);
  }

  function updateQuery(value: string): void {
    setQuery(value);

    const exactMatch = products.find((product) => product.sku.toLowerCase() === value.trim().toLowerCase());

    if (exactMatch) {
      setSelectedSku(exactMatch.sku);
    }
  }

  async function copyFollowUpWording(): Promise<void> {
    if (!selectedNarrative) return;

    try {
      await navigator.clipboard.writeText(selectedNarrative.followUpWording);
      setCopyStatus("Follow-up wording copied.");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy unavailable. Select the wording manually.");
    }
  }

  return (
    <main className="wm-product-call-cards-page" data-wingman-page="product-call-cards">
      <section className="wm-page-hero wm-product-call-cards-hero">
        <p className="wm-navhub-eyebrow">Product Call Cards</p>
        <h1>Pick a product and shape the wording for the customer.</h1>
        <p>
          Choose a WyreStorm SKU, customer type and application. Wingman gives UK sales users wording
          that is easier to say, tied to a real room or use case, and clear about what must be checked before quoting.
        </p>
      </section>

      <section className="wm-product-call-card-selector" aria-label="Select a WyreStorm product">
        <div>
          <p className="wm-product-call-card-selector-label">Central SKU selector</p>
          <h2>Find a product call card</h2>
          <p>
            The selector contains the WyreStorm product list in alphabetical order. Type to narrow it down,
            or open the dropdown and choose the SKU directly.
          </p>
        </div>

        <div className="wm-product-call-card-controls">
          <label>
            <span>Search / type-ahead SKU</span>
            <input
              type="search"
              value={query}
              list="wm-product-call-card-skus"
              placeholder="Start typing a SKU, e.g. NHD-0401-MV"
              onChange={(event) => updateQuery(event.target.value)}
            />
          </label>

          <label>
            <span>Choose from full SKU list</span>
            <select value={selectedSku} onChange={(event) => chooseProduct(event.target.value)}>
              <option value="">Select a WyreStorm SKU</option>
              {products.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.sku} — {product.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Audience / customer type</span>
            <select value={audience} onChange={(event) => setAudience(event.target.value as WingmanAudience)}>
              {WINGMAN_AUDIENCES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Call mode</span>
            <select value={callMode} onChange={(event) => setCallMode(event.target.value as WingmanCallMode)}>
              {WINGMAN_CALL_MODES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Application / use case</span>
            <select value={application} onChange={(event) => setApplication(event.target.value as WingmanApplicationContext)}>
              {WINGMAN_APPLICATION_CONTEXTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <datalist id="wm-product-call-card-skus">
            {products.map((product) => (
              <option key={product.sku} value={product.sku}>
                {product.title}
              </option>
            ))}
          </datalist>
        </div>

        <div className="wm-product-call-card-status">
          {loadState === "loading" ? "Loading WyreStorm product index..." : null}
          {loadState === "ready" && products.length > 0 ? `${products.length} WyreStorm SKUs available` : null}
          {loadState === "ready" && products.length === 0 ? "No WyreStorm SKUs were found in the product index." : null}
          {loadState === "error" ? "Product index could not be loaded." : null}
        </div>

        {filteredSuggestions.length > 0 && !selectedProduct ? (
          <div className="wm-product-call-card-suggestions" aria-label="Matching product suggestions">
            {filteredSuggestions.map((product) => (
              <button key={product.sku} type="button" onClick={() => chooseProduct(product.sku)}>
                <strong>{product.sku}</strong>
                <span>{product.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {selectedProduct ? (
        <section className="wm-product-call-card-result" aria-label={`${selectedProduct.sku} call card`}>
          <div className="wm-product-call-card-result-hero">
            <div>
              <p className="wm-product-call-card-selector-label">{selectedProduct.family}</p>
              <h2>{selectedProduct.sku}</h2>
              <p>{selectedProduct.title}</p>
              <p>
                {selectedPositioningCard
                  ? `Curated card: ${selectedPositioningCard.dataConfidence.toLowerCase()} confidence`
                  : "Generated from product-index text. Validate before quoting."}
              </p>
            </div>
            <button type="button" onClick={() => chooseProduct("")}>
              Clear selection
            </button>
          </div>

          <ProductMediaPanel sku={selectedProduct.sku} title={selectedProduct.title} />

          <div
            className="wm-product-call-card-statement"
            style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px" }}
          >
            <section className="wm-product-call-card-panel">
              <h3>Say this</h3>
              <p>{selectedNarrative?.sayThis}</p>
            </section>

            <section className="wm-product-call-card-panel">
              <h3>Why it fits this application</h3>
              <p>{selectedNarrative?.whyItFits}</p>
              <p>{selectedNarrative?.applicationAngle}</p>
            </section>

            <section className="wm-product-call-card-panel">
              <h3>Audience guidance</h3>
              <p>{selectedNarrative?.audienceAngle}</p>
              <p>{selectedNarrative?.callModeAngle}</p>
            </section>

            <DetailList title="Ask next" items={selectedNarrative?.askNext ?? []} />
            <DetailList title="What to check before quoting" items={selectedNarrative?.checkBeforeQuoting ?? []} />
            <DetailList
              title="Worth mentioning"
              items={selectedNarrative?.proofPoints.length ? selectedNarrative.proofPoints : selectedProduct.talkingPoints}
            />
            <DetailList title="Avoid saying" items={selectedNarrative?.avoidSaying ?? []} />

            <section className="wm-product-call-card-panel">
              <h3>Follow-up wording</h3>
              <p>{selectedNarrative?.followUpWording}</p>
              <div className="wm-pitch-header-actions" style={{ marginTop: "12px" }}>
                <button type="button" onClick={copyFollowUpWording}>
                  Copy follow-up wording
                </button>
                <Link to={`${routeCatalogByKey.compare.path}?q=${encodeURIComponent(selectedProduct.sku)}`}>
                  Compare competitor
                </Link>
                <Link to={`${routeCatalogByKey.responsePack.path}?sku=${encodeURIComponent(selectedProduct.sku)}`}>
                  Create response pack
                </Link>
              </div>
              {copyStatus ? <p>{copyStatus}</p> : null}
            </section>
          </div>
        </section>
      ) : (
        <section className="wm-product-call-card-empty">
          <h2>No product selected</h2>
          <p>
            Select a SKU above to open the relevant product call card. The full product list is kept inside
            the selector rather than displayed as a long landing-page grid.
          </p>
        </section>
      )}
    </main>
  );
}

export default ProductCallCardsPage;
