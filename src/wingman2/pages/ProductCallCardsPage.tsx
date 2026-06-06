import { useEffect, useMemo, useState } from "react";

type LoadState = "loading" | "ready" | "error";
type ProductRaw = Record<string, unknown>;

type CallCardProduct = {
  sku: string;
  title: string;
  family: string;
  category: string;
  description: string;
  salientPoint: string;
  customerChallenge: string;
  wyrestormFit: string;
  proofPoint: string;
  applicationFit: string[];
  keyFacts: string[];
  validationQuestions: string[];
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

function createProduct(record: ProductRaw, sku: string): CallCardProduct {
  const title =
    pickText(record, ["title", "productName", "name", "modelName", "displayName"]) ||
    sku;

  return {
    sku,
    title: title === sku ? sku : title,
    family: pickText(record, ["family", "productFamily", "series", "range"]) || "WyreStorm product",
    category: pickText(record, ["category", "type", "productType", "technology"]) || "Product call card",
    description:
      pickText(record, ["description", "shortDescription", "summary", "overview"]) ||
      "Select this SKU to discuss the customer requirement, application fit and key facts before recommending it.",
    salientPoint:
      pickText(record, ["salientPoint", "salesPoint", "positioning", "headline"]) ||
      "Use this SKU when its core capability matches the customer requirement and the signal path.",
    customerChallenge:
      pickText(record, ["customerChallenge", "challenge", "problemSolved", "painPoint"]) ||
      "Confirm the customer's source, display, USB, control, audio, distance and scaling requirements before positioning this product.",
    wyrestormFit:
      pickText(record, ["wyrestormFit", "fit", "whyWyrestorm", "recommendedFit"]) ||
      "Check the product facts, connection types and system shape before presenting it as the recommended option.",
    proofPoint:
      pickText(record, ["proofPoint", "evidence", "validation", "reasonToBelieve"]) ||
      "Use verified product data and the customer requirement to support the recommendation.",
    applicationFit: pickList(record, ["applicationFit", "applications", "useCases", "verticals", "roomTypes"]),
    keyFacts: pickList(record, ["keyFacts", "features", "majorFeatures", "specifications", "facts"]),
    validationQuestions: pickList(record, ["validationQuestions", "questions", "qualifyingQuestions"]),
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

  return (
    <main className="wm-product-call-cards-page" data-wingman-page="product-call-cards">
      <section className="wm-page-hero wm-product-call-cards-hero">
        <p className="wm-navhub-eyebrow">Product call cards</p>
        <h1>Select the WyreStorm SKU you want to talk about</h1>
        <p>
          Search or select a product first. Wingman will then show the relevant customer conversation
          guidance, product facts and validation questions for that SKU.
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
            </div>
            <button type="button" onClick={() => chooseProduct("")}>
              Clear selection
            </button>
          </div>

          <div className="wm-product-call-card-grid">
            <section className="wm-product-call-card-panel wm-product-call-card-panel-wide">
              <h3>Salient point</h3>
              <p>{selectedProduct.salientPoint}</p>
            </section>

            <section className="wm-product-call-card-panel">
              <h3>Customer challenge</h3>
              <p>{selectedProduct.customerChallenge}</p>
            </section>

            <section className="wm-product-call-card-panel">
              <h3>WyreStorm fit</h3>
              <p>{selectedProduct.wyrestormFit}</p>
            </section>

            <section className="wm-product-call-card-panel">
              <h3>Proof point</h3>
              <p>{selectedProduct.proofPoint}</p>
            </section>

            <section className="wm-product-call-card-panel">
              <h3>Product category</h3>
              <p>{selectedProduct.category}</p>
            </section>

            <DetailList title="Key product facts" items={selectedProduct.keyFacts} />
            <DetailList title="Application fit" items={selectedProduct.applicationFit} />
            <DetailList title="Validation questions" items={selectedProduct.validationQuestions} />
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