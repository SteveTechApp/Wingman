import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { ProductSalesKnowledgePanel } from "../components/ProductSalesKnowledgePanel";

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
    features: ["Multiview", "5K output", "Custom layouts", "NetworkHD 500"],
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
    features: ["Video wall", "Mosaic", "Cascading", "4K60"],
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

function buildWhatItHelps(product: ProductRecord): string[] {
  const output = [
    `Position ${product.sku} clearly in the ${product.family} conversation.`,
    "Explain the customer outcome before discussing technical detail."
  ];

  if (product.features.length > 0) {
    output.push(`Connect the explanation to ${product.features.slice(0, 3).join(", ")}.`);
  }

  return output;
}

function buildBestFit(product: ProductRecord): string[] {
  const text = searchHaystack(product);
  const output: string[] = [];

  if (text.includes("meeting") || text.includes("conference") || text.includes("uc")) {
    output.push("Meeting rooms, classrooms and collaboration spaces.");
  }

  if (text.includes("networkhd") || text.includes("avoip") || text.includes("av over ip")) {
    output.push("Flexible routed systems where sources and displays may expand.");
  }

  if (text.includes("video wall") || text.includes("multiview")) {
    output.push("Applications needing processing, layout control or multiple source windows.");
  }

  if (text.includes("dante") || text.includes("audio") || text.includes("amplifier")) {
    output.push("Rooms where audio needs to be integrated, controlled and supportable.");
  }

  if (output.length === 0) {
    output.push("Projects where the customer needs a professional, supportable WyreStorm AV building block.");
  }

  return output;
}

function buildQuestions(product: ProductRecord): string[] {
  const text = searchHaystack(product);
  const output = ["What sources, displays and room locations need to be connected?"];

  if (text.includes("usb") || text.includes("camera") || text.includes("conference") || text.includes("uc")) {
    output.push("Are USB cameras, speakerphones, touch displays or BYOD workflows required?");
  }

  if (text.includes("networkhd") || text.includes("avoip") || text.includes("dante")) {
    output.push("Is there a suitable network or dedicated AV VLAN available?");
  }

  if (text.includes("hdbaset") || text.includes("extension") || text.includes("receiver")) {
    output.push("What is the real installed cable-route distance, not just the room length?");
  }

  if (text.includes("video wall") || text.includes("multiview")) {
    output.push("Does the customer need one full canvas, multiple layouts, or true multiview?");
  }

  return Array.from(new Set(output)).slice(0, 4);
}

function productSearchUrl(sku: string): string {
  return `https://wyrestorm.com/?s=${encodeURIComponent(sku)}`;
}

export function ProductPitchPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [products, setProducts] = useState<ProductRecord[]>(FALLBACK_PRODUCTS);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All");
  const [selectedSku, setSelectedSku] = useState("");
  const [userStarted, setUserStarted] = useState(false);
  const [searchParams] = useSearchParams();

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

      {selectedProduct && (
        <section className="wm-product-pitch-sheet">
          <div className="wm-product-pitch-sheet-head">
            <div>
              <p>Sales crib sheet</p>
              <h2>{selectedProduct.sku}</h2>
              <span>{selectedProduct.name}</span>
            </div>

            <div className="wm-product-pitch-sheet-links">
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
