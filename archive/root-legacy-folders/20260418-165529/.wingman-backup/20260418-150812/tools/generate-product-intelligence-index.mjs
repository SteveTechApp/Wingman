import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const sourceCandidates = [
  "data/products.json",
  "data/catalog.json",
  "src/data/products.json",
  "src/data/catalog.json",
  "src/content/products.json",
  "src/content/catalog.json",
  "public/products.json",
  "public/catalog.json",
  "public/data/products.json",
  "public/data/catalog.json",
];

const outputTargets = [
  { type: "json", path: "src/generated/product-intelligence-index.json" },
  { type: "ts", path: "src/generated/product-intelligence-index.ts" },
  { type: "json", path: "src/data/product-intelligence-index.json" },
  { type: "ts", path: "src/data/product-intelligence-index.ts" },
  { type: "json", path: "public/product-intelligence-index.json" },
];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function ensureArrayPayload(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.products)) return value.products;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.catalog)) return value.catalog;
    if (Array.isArray(value.data)) return value.data;
  }
  return [];
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeProduct(item, index, sourceFile) {
  const sku =
    asString(item?.sku) ||
    asString(item?.SKU) ||
    asString(item?.partNumber) ||
    asString(item?.part_number) ||
    asString(item?.model) ||
    asString(item?.id);

  const name =
    asString(item?.name) ||
    asString(item?.title) ||
    asString(item?.productName) ||
    asString(item?.product_name) ||
    sku ||
    `Product ${index + 1}`;

  const description =
    asString(item?.description) ||
    asString(item?.summary) ||
    asString(item?.overview);

  const category =
    asString(item?.category) ||
    asString(item?.family) ||
    asString(item?.productFamily) ||
    asString(item?.product_family);

  const technologies = Array.isArray(item?.technologies)
    ? item.technologies.map(asString).filter(Boolean)
    : [];

  const connectors = Array.isArray(item?.connectors)
    ? item.connectors.map(asString).filter(Boolean)
    : [];

  const features = Array.isArray(item?.features)
    ? item.features
        .map((feature) =>
          typeof feature === "string"
            ? feature.trim()
            : asString(feature?.name || feature?.label || feature)
        )
        .filter(Boolean)
    : [];

  const applications = Array.isArray(item?.applications)
    ? item.applications.map(asString).filter(Boolean)
    : [];

  const searchTerms = [
    sku,
    name,
    category,
    description,
    ...technologies,
    ...connectors,
    ...features,
    ...applications,
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean);

  return {
    id: sku || `generated-${index + 1}`,
    sku,
    name,
    description,
    category,
    technologies,
    connectors,
    features,
    applications,
    searchTerms: Array.from(new Set(searchTerms)),
    source: path.relative(projectRoot, sourceFile).replace(/\\/g, "/"),
    raw: item,
  };
}

function dedupeProducts(products) {
  const seen = new Set();
  const results = [];

  for (const product of products) {
    const key = [
      product.sku?.toLowerCase() || "",
      product.name?.toLowerCase() || "",
    ].join("::");

    if (seen.has(key)) continue;
    seen.add(key);
    results.push(product);
  }

  return results;
}

function buildIndex(products, discoveredSources) {
  const bySku = {};
  const byName = {};

  for (const product of products) {
    if (product.sku) bySku[product.sku] = product.id;
    if (product.name) byName[product.name] = product.id;
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFiles: discoveredSources.map((filePath) =>
        path.relative(projectRoot, filePath).replace(/\\/g, "/")
      ),
      count: products.length,
      generator: "tools/generate-product-intelligence-index.mjs",
    },
    products,
    lookup: {
      bySku,
      byName,
    },
  };
}

async function writeFileEnsured(targetPath, content) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
}

function toTsModule(indexObject) {
  const serialized = JSON.stringify(indexObject, null, 2);
  return `export const productIntelligenceIndex = ${serialized} as const;\n\nexport default productIntelligenceIndex;\n`;
}

async function main() {
  const discoveredSources = [];
  const normalizedProducts = [];

  for (const relativePath of sourceCandidates) {
    const absolutePath = path.join(projectRoot, relativePath);

    if (!(await pathExists(absolutePath))) continue;

    try {
      const parsed = await readJsonFile(absolutePath);
      const items = ensureArrayPayload(parsed);

      if (items.length === 0) continue;

      discoveredSources.push(absolutePath);

      items.forEach((item, index) => {
        normalizedProducts.push(normalizeProduct(item, index, absolutePath));
      });
    } catch (error) {
      console.warn(`[product-intelligence-index] Skipping ${relativePath}: ${error.message}`);
    }
  }

  const products = dedupeProducts(normalizedProducts);
  const index = buildIndex(products, discoveredSources);

  for (const target of outputTargets) {
    const absoluteOutputPath = path.join(projectRoot, target.path);

    if (target.type === "json") {
      await writeFileEnsured(absoluteOutputPath, JSON.stringify(index, null, 2) + "\n");
    } else {
      await writeFileEnsured(absoluteOutputPath, toTsModule(index));
    }

    console.log(`[product-intelligence-index] Wrote ${target.path}`);
  }

  if (products.length === 0) {
    console.log(
      "[product-intelligence-index] No source product JSON files were found. Generated an empty index so the build can continue."
    );
  } else {
    console.log(
      `[product-intelligence-index] Indexed ${products.length} product entries from ${discoveredSources.length} source file(s).`
    );
  }
}

main().catch((error) => {
  console.error("[product-intelligence-index] Generation failed.");
  console.error(error);
  process.exit(1);
});
