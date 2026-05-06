import { useEffect, useMemo, useState } from "react";
import {
  WingmanActionBar,
  WingmanCard,
  WingmanFilterBar,
  WingmanPageFrame,
  WingmanPageHero,
  WingmanPanel
} from "../components/layout";

type UnknownRecord = Record<string, unknown>;

type ProductPitchRecord = {
  id: string;
  sku: string;
  name: string;
  family: string;
  role: string;
  category: string;
  summary: string;
  description: string;
  features: string[];
  tags: string[];
  searchable: string;
  raw: UnknownRecord;
};

const FAMILY_OPTIONS = [
  "All",
  "NetworkHD",
  "Matrix",
  "Presentation",
  "Extender",
  "USB / UC",
  "Camera",
  "Audio",
  "Control",
  "Video Wall",
  "Accessory"
];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "";
}

function firstText(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = textFromUnknown(record[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

function listFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(textFromUnknown)
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,|;/]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function firstList(record: UnknownRecord, keys: string[]): string[] {
  for (const key of keys) {
    const list = listFromUnknown(record[key]);

    if (list.length > 0) {
      return list;
    }
  }

  return [];
}

function findProductArrays(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const likelyKeys = ["products", "items", "entries", "index", "data", "records"];

  for (const key of likelyKeys) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  const values = Object.values(payload);

  if (values.length > 0 && values.every(isRecord)) {
    return values.filter(isRecord);
  }

  return [];
}

function familyFromRecord(record: UnknownRecord, sku: string, combinedText: string): string {
  const explicit = firstText(record, [
    "family",
    "productFamily",
    "product_family",
    "technologyFamily",
    "series"
  ]);

  if (explicit) return explicit;

  const haystack = `${sku} ${combinedText}`.toLowerCase();

  if (haystack.includes("nhd") || haystack.includes("networkhd") || haystack.includes("avoip")) return "NetworkHD";
  if (haystack.includes("matrix") || sku.startsWith("MX-")) return "Matrix";
  if (haystack.includes("presentation") || haystack.includes("mst") || haystack.includes("switcher")) return "Presentation";
  if (haystack.includes("extender") || sku.startsWith("EX-")) return "Extender";
  if (haystack.includes("usb") || haystack.includes("uc") || haystack.includes("byod") || haystack.includes("byom")) return "USB / UC";
  if (haystack.includes("camera") || haystack.includes("ptz") || sku.includes("CAM")) return "Camera";
  if (haystack.includes("audio") || haystack.includes("dante") || haystack.includes("amp")) return "Audio";
  if (haystack.includes("control") || haystack.includes("touch")) return "Control";
  if (haystack.includes("video wall") || haystack.includes("videowall") || sku.includes("VW")) return "Video Wall";
  if (haystack.includes("rack") || haystack.includes("mount") || haystack.includes("psu") || haystack.includes("cable")) return "Accessory";

  return "Other";
}

function normaliseProduct(record: UnknownRecord, index: number): ProductPitchRecord {
  const sku = firstText(record, ["sku", "SKU", "model", "partNumber", "part_number", "id"]) || `PRODUCT-${index + 1}`;
  const name =
    firstText(record, ["name", "title", "productName", "product_name", "displayName"]) ||
    sku;

  const summary =
    firstText(record, [
      "summary",
      "shortDescription",
      "short_description",
      "headline",
      "positioning",
      "descriptionShort"
    ]) || "";

  const description =
    firstText(record, [
      "description",
      "longDescription",
      "long_description",
      "overview",
      "body",
      "notes"
    ]) || summary;

  const features = Array.from(
    new Set(
      [
        ...firstList(record, ["features", "featureTags", "feature_tags", "capabilities", "keyFeatures"]),
        ...firstList(record, ["tags", "keywords", "signals", "technologies"])
      ].filter(Boolean)
    )
  ).slice(0, 10);

  const tags = Array.from(
    new Set(firstList(record, ["tags", "keywords", "classificationTags", "filters"]).filter(Boolean))
  ).slice(0, 10);

  const combinedText = [
    sku,
    name,
    summary,
    description,
    features.join(" "),
    tags.join(" "),
    JSON.stringify(record)
  ].join(" ");

  const family = familyFromRecord(record, sku, combinedText);

  const role =
    firstText(record, ["role", "productRole", "routingRole", "classification", "hardwareRole"]) ||
    family;

  const category =
    firstText(record, ["category", "type", "productType", "technologyType", "visibility"]) ||
    family;

  return {
    id: `${sku}-${index}`,
    sku,
    name,
    family,
    role,
    category,
    summary,
    description,
    features,
    tags,
    searchable: combinedText.toLowerCase(),
    raw: record
  };
}

function buildPitch(product: ProductPitchRecord, audience: string) {
  const audienceText =
    audience === "user"
      ? "Focus on outcome, ease of use, and reliability."
      : audience === "consultant"
        ? "Focus on signal path, specification fit, and risk reduction."
        : "Focus on fit, install value, and quick qualification.";

  const shortSummary =
    product.summary ||
    product.description ||
    `${product.sku} is a WyreStorm ${product.family} product for projects where the system requirement matches its signal path and feature set.`;

  return {
    headline: `${product.sku}: ${product.name}`,
    positioning: shortSummary,
    bestFit: [
      product.family ? `Product family: ${product.family}` : "",
      product.role ? `Role: ${product.role}` : "",
      product.category ? `Category: ${product.category}` : ""
    ].filter(Boolean),
    talkTrack: [
      `Use ${product.sku} when the customer requirement matches the ${product.family.toLowerCase()} workflow.`,
      audienceText,
      "Confirm the source, display, distance, USB/audio/control, and network requirements before presenting it as the final SKU."
    ],
    qualification: [
      "What sources need to connect, and where are they physically located?",
      "How many displays or outputs are required?",
      "Is USB, audio, camera, control, or network transport part of the requirement?",
      "What is the installed cable route distance, not just the straight-line distance?",
      "Are there any must-have features such as multiview, MST, NDI, video wall, Dante, or BYOD?"
    ]
  };
}

export function ProductPitchPage() {
  const [products, setProducts] = useState<ProductPitchRecord[]>([]);
  const [status, setStatus] = useState("Loading product index...");
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("All");
  const [audience, setAudience] = useState("trade");
  const [selectedSku, setSelectedSku] = useState("");
useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const response = await fetch("/product-intelligence-index.json", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Product index returned ${response.status}`);
        }

        const payload = await response.json();
        const rawProducts = findProductArrays(payload);
        const normalised = rawProducts
          .map(normaliseProduct)
          .filter((product) => product.sku || product.name)
          .sort((a, b) => a.sku.localeCompare(b.sku));

        if (cancelled) return;

        setProducts(normalised);
        setStatus(normalised.length ? `${normalised.length} products loaded.` : "No products found in the index.");
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : "Unable to load product index.";
        setStatus(message);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products
      .filter((product) => {
        const familyMatch = family === "All" || product.family.toLowerCase().includes(family.toLowerCase());
        const queryMatch = !query || product.searchable.includes(query);

        return familyMatch && queryMatch;
      })
      .slice(0, 36);
  }, [family, products, search]);

  useEffect(() => {
    if (selectedSku) {
      const stillVisible = visibleProducts.some((product) => product.sku === selectedSku);

      if (stillVisible) {
        return;
      }
    }

    setSelectedSku(visibleProducts[0]?.sku ?? "");
  }, [selectedSku, visibleProducts]);

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.sku === selectedSku) ?? visibleProducts[0] ?? null;
  }, [products, selectedSku, visibleProducts]);

  const pitch = selectedProduct ? buildPitch(selectedProduct, audience) : null;

  return (
    <WingmanPageFrame mode="wide" className="wm-page-migrated wm-page-migrated--product-pitch">
      <WingmanPageHero
        eyebrow="Product pitch"
        title="Create a one-page WyreStorm product pitch."
        subtitle="Select a SKU, choose the audience, then use the generated talking points to position the product clearly."
        actions={
          <WingmanActionBar>
            <a href="/wingman/finder" role="button">
              Open Product Finder
            </a>
            <a href="/wingman/product-families" role="button">
              Open Product Families
            </a>
          </WingmanActionBar>
        }
      />

      <WingmanPanel
        title="Choose the product"
        subtitle={status}
      >
        <WingmanFilterBar title="Pitch setup">
          <label>
            Search SKU or requirement
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. NHD-150-RX, USB-C, multiview, video wall"
            />
          </label>

          <label>
            Product family
            <select value={family} onChange={(event) => setFamily(event.target.value)}>
              {FAMILY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          
        </WingmanFilterBar>

        <div className="wm-product-pitch-grid">
          {visibleProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              className={product.sku === selectedSku ? "wm-product-pitch-choice is-selected" : "wm-product-pitch-choice"}
              onClick={() => setSelectedSku(product.sku)}
            >
              <strong>{product.sku}</strong>
              <span>{product.name}</span>
              <small>{product.family}</small>
            </button>
          ))}
        </div>
      </WingmanPanel>

      {selectedProduct && pitch ? (
        <WingmanPanel
          title={pitch.headline}
          subtitle="Customer-safe product positioning"
          actions={
            <WingmanActionBar>
              <button type="button" onClick={() => navigator.clipboard?.writeText(`${pitch.headline}\n\n${pitch.positioning}`)}>
                Copy summary
              </button>
            </WingmanActionBar>
          }
        >
          <div className="wm-product-pitch-detail-grid">
            <WingmanCard
              meta="Overview"
              title="Positioning"
              subtitle={pitch.positioning}
            >
              <div className="wm-product-pitch-pill-list">
                {[selectedProduct.family, selectedProduct.role, selectedProduct.category]
                  .filter(Boolean)
                  .map((item) => (
                    <span key={item} className="wm-product-pitch-pill">
                      {item}
                    </span>
                  ))}
              </div>
            </WingmanCard>

            <WingmanCard
              meta="Best fit"
              title="Use when"
            >
              <ul>
                {pitch.bestFit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </WingmanCard>

            <WingmanCard
              meta="Talk track"
              title="What to say"
            >
              <ul>
                {pitch.talkTrack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </WingmanCard>

            <WingmanCard
              meta="Qualify"
              title="Questions to ask"
            >
              <ul>
                {pitch.qualification.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </WingmanCard>
          </div>

          {selectedProduct.features.length > 0 ? (
            <WingmanCard
              meta="Feature cues"
              title="Useful feature points"
              className="wm-product-pitch-feature-card"
            >
              <div className="wm-product-pitch-pill-list">
                {selectedProduct.features.map((feature) => (
                  <span key={feature} className="wm-product-pitch-pill">
                    {feature}
                  </span>
                ))}
              </div>
            </WingmanCard>
          ) : null}
        </WingmanPanel>
      ) : (
        <WingmanPanel title="No product pitch loaded" subtitle="Search for a SKU or choose a product family to reveal matching WyreStorm products.">
          <p>The pitch page stays clear until a product is selected.</p>
        </WingmanPanel>
      )}
    </WingmanPageFrame>
  );
}

export default ProductPitchPage;
