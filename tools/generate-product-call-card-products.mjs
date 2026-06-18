import fs from "node:fs/promises";

const root = process.cwd();
const sourcePath = `${root}/public/product-intelligence-index.json`;
const outputPath = `${root}/public/product-call-card-products.json`;

const SOURCE_KEYS = {
  sku: [
    "sku",
    "SKU",
    "model",
    "modelNumber",
    "model_number",
    "partNumber",
    "part_number",
    "productCode",
    "product_code",
    "id"
  ],
  name: [
    "name",
    "title",
    "productName",
    "product_name",
    "label",
    "displayName",
    "display_name",
    "shortName",
    "short_name"
  ],
  family: [
    "family",
    "productFamily",
    "product_family",
    "series",
    "range",
    "platform"
  ],
  category: [
    "category",
    "type",
    "productType",
    "product_type",
    "class",
    "technology"
  ],
  description: [
    "description",
    "shortDescription",
    "short_description",
    "summary",
    "overview",
    "copy",
    "salientPoint",
    "salient_point",
    "applicationFit",
    "application_fit"
  ],
  manufacturer: [
    "manufacturer",
    "brand",
    "vendor",
    "make"
  ],
  tags: [
    "tags",
    "keywords",
    "applications",
    "applicationTags",
    "application_tags",
    "features",
    "capabilities",
    "useCases",
    "use_cases",
    "markets",
    "verticals"
  ]
};

const WYRESTORM_PREFIXES = [
  "NHD",
  "MX",
  "MXV",
  "SW",
  "EX",
  "EXP",
  "TX",
  "RX",
  "APO",
  "CAM",
  "SYN",
  "CAB",
  "CBL",
  "SPK",
  "AMP",
  "FO",
  "FIB",
  "WAP",
  "HAL"
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clean(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function getByKeys(record, keys) {
  for (const wanted of keys) {
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase() === wanted.toLowerCase()) {
        const direct = clean(value);

        if (direct) {
          return direct;
        }
      }
    }
  }

  return "";
}

function arrayFromValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const direct = clean(item);

        if (direct) {
          return direct;
        }

        if (isRecord(item)) {
          return getByKeys(item, ["name", "label", "title", "value", "text", "sku"]);
        }

        return "";
      })
      .filter(Boolean);
  }

  const direct = clean(value);

  if (!direct) {
    return [];
  }

  return direct
    .split(/[,|;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getArraysByKeys(record, keys) {
  const output = [];

  for (const wanted of keys) {
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase() === wanted.toLowerCase()) {
        output.push(...arrayFromValue(value));
      }
    }
  }

  return output;
}

function unique(values) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const cleaned = clean(value);

    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(cleaned);
  }

  return output;
}

function normaliseSku(value) {
  return clean(value).toUpperCase().replace(/\s+/g, "");
}

function isLikelyWyreStormSku(value) {
  const sku = normaliseSku(value);

  if (sku.length < 5 || sku.length > 42) {
    return false;
  }

  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(sku)) {
    return false;
  }

  return WYRESTORM_PREFIXES.some((prefix) => sku.startsWith(`${prefix}-`));
}

function classifyFromText(textInput) {
  const text = textInput.toLowerCase();

  if (text.includes("networkhd 600") || text.includes("nhd-600") || text.includes("10g")) {
    return "NetworkHD 600";
  }

  if (text.includes("networkhd 500") || text.includes("nhd-500")) {
    return "NetworkHD 500";
  }

  if (text.includes("networkhd 100") || text.includes("nhd-1")) {
    return "NetworkHD 100";
  }

  if (text.includes("networkhd") || text.includes("av-over-ip") || text.includes("avoip")) {
    return "NetworkHD";
  }

  if (text.includes("video wall") || text.includes("videowall") || text.includes("-vw")) {
    return "Video wall";
  }

  if (text.includes("multiview") || text.includes("multi-view") || text.includes("-mv")) {
    return "Multiview";
  }

  if (text.includes("usb") || text.includes("uc") || text.includes("byod") || text.includes("conference")) {
    return "USB / UC";
  }

  if (text.includes("hdbaset") || text.includes("hdbt") || text.includes("extender")) {
    return "HDBaseT";
  }

  if (text.includes("matrix") || text.startsWith("mx-")) {
    return "Matrix";
  }

  if (text.includes("presentation") || text.includes("switcher") || text.startsWith("sw-")) {
    return "Presentation";
  }

  if (text.includes("camera") || text.includes("ptz") || text.includes("ndi")) {
    return "Cameras";
  }

  if (text.includes("touch") || text.includes("control")) {
    return "Control";
  }

  return "WyreStorm product";
}

function findUsefulString(record) {
  const candidates = [];

  for (const value of Object.values(record)) {
    const direct = clean(value);

    if (direct.length >= 35 && direct.length <= 260 && !direct.startsWith("http")) {
      candidates.push(direct);
    }
  }

  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || "";
}

function getSkuFromRecord(record, parentKey) {
  const direct = getByKeys(record, SOURCE_KEYS.sku);

  if (isLikelyWyreStormSku(direct)) {
    return normaliseSku(direct);
  }

  if (isLikelyWyreStormSku(parentKey)) {
    return normaliseSku(parentKey);
  }

  return "";
}

function shouldSkipRecord(record) {
  const manufacturer = getByKeys(record, SOURCE_KEYS.manufacturer).toLowerCase();

  if (!manufacturer) {
    return false;
  }

  if (manufacturer.includes("wyrestorm") || manufacturer.includes("wyre storm")) {
    return false;
  }

  return true;
}

function buildProduct(record, parentKey) {
  if (!isRecord(record)) {
    return null;
  }

  if (shouldSkipRecord(record)) {
    return null;
  }

  const sku = getSkuFromRecord(record, parentKey);

  if (!sku) {
    return null;
  }

  const name = getByKeys(record, SOURCE_KEYS.name) || sku;
  const rawFamily = getByKeys(record, SOURCE_KEYS.family);
  const category = getByKeys(record, SOURCE_KEYS.category);
  const directDescription = getByKeys(record, SOURCE_KEYS.description);
  const description = directDescription || findUsefulString(record) || `${name} from the Wingman product intelligence index.`;

  const tags = unique([
    ...getArraysByKeys(record, SOURCE_KEYS.tags),
    rawFamily,
    category,
    name
  ]);

  const family = rawFamily || classifyFromText(`${sku} ${name} ${category} ${description} ${tags.join(" ")}`);

  return {
    sku,
    name,
    family,
    category: category || family,
    description,
    tags
  };
}

function walk(value, parentKey, output, seen, depth) {
  if (depth > 8) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, parentKey, output, seen, depth + 1);
    }

    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const product = buildProduct(value, parentKey);

  if (product) {
    const existing = output.get(product.sku);

    if (!existing) {
      output.set(product.sku, product);
    }

    if (existing) {
      const betterDescription =
        product.description.length > existing.description.length ? product.description : existing.description;

      output.set(product.sku, {
        ...existing,
        ...product,
        description: betterDescription,
        tags: unique([...(existing.tags || []), ...(product.tags || [])])
      });
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (isRecord(child) || Array.isArray(child)) {
      walk(child, key, output, seen, depth + 1);
    }
  }
}

const raw = await fs.readFile(sourcePath, "utf8");
const json = JSON.parse(raw);
const productsMap = new Map();

walk(json, "", productsMap, new WeakSet(), 0);

// Merge, do not overwrite: the existing file carries curated call-card copy
// (fit, openingLine, questions, proofPoints, officialUrl, technologyProfile and
// the repair-tool fields) enriched by the downstream tools. Preserve every
// existing entry verbatim and only ADD products that are present in the current
// index but missing from the file - that is how new SKUs (e.g. the full
// extender range) get surfaced without regressing curated wording.
let existingPayload = {};
let existingProducts = [];

try {
  existingPayload = JSON.parse(await fs.readFile(outputPath, "utf8"));
  existingProducts = Array.isArray(existingPayload.products) ? existingPayload.products : [];
} catch {
  // No existing file - fall back to a clean generation.
}

const existingSkus = new Set(existingProducts.map((product) => normaliseSku(product.sku)));
const additions = Array.from(productsMap.values()).filter((product) => !existingSkus.has(normaliseSku(product.sku)));

const products = [...existingProducts, ...additions].sort((a, b) => a.sku.localeCompare(b.sku));

await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      ...existingPayload,
      generatedAt: existingPayload.generatedAt || new Date().toISOString(),
      source: "product-intelligence-index.json",
      count: products.length,
      lastToppedUpAt: new Date().toISOString(),
      addedCount: additions.length,
      products
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Total products: ${products.length} (added ${additions.length} missing from the index)`);
console.log(outputPath);

if (additions.length > 0) {
  console.log("Newly added SKUs:");
  console.log(additions.map((product) => product.sku).sort((a, b) => a.localeCompare(b)).join(", "));
}