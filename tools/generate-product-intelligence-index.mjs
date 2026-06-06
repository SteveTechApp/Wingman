import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const sourceCandidates = [
  "data/product-intelligence-db.json",
];

const outputTargets = [
  { type: "json", path: "public/product-intelligence-index.json" },
];

const generatedAt = "source-controlled";

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
    if (Array.isArray(value.records)) return value.records;
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

function asArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.map(asString).filter(Boolean)));
}

function collectTextValues(value, output = []) {
  if (typeof value === "string" || typeof value === "number") {
    const text = asString(value);
    if (text) output.push(text);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, output));
    return output;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectTextValues(item, output));
  }

  return output;
}

function cleanText(value) {
  return asString(value)
    .replace(/&amp;/gi, "&")
    .replace(/&#x2122;|&#8482;|&trade;/gi, " TM ")
    .replace(/&#x00ae;|&#174;|&reg;/gi, " R ")
    .replace(/&#x2013;|&#8211;|&ndash;/gi, "-")
    .replace(/&#x2014;|&#8212;|&mdash;/gi, "-")
    .replace(/&#x2018;|&#8216;|&lsquo;/gi, "'")
    .replace(/&#x2019;|&#8217;|&rsquo;/gi, "'")
    .replace(/&#x201c;|&#8220;|&ldquo;/gi, '"')
    .replace(/&#x201d;|&#8221;|&rdquo;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseText(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function textIncludesAny(text, terms) {
  const normalised = normaliseText(text);
  return terms.some((term) => normalised.includes(normaliseText(term)));
}

function buildTextBlob(product) {
  return [
    product.sku,
    product.name,
    product.title,
    product.description,
    product.summary,
    product.category,
    product.family,
    ...(Array.isArray(product.tags) ? product.tags : []),
    ...(Array.isArray(product.technologies) ? product.technologies : []),
    ...(Array.isArray(product.connectors) ? product.connectors : []),
    ...(Array.isArray(product.features) ? product.features : []),
    ...(Array.isArray(product.applications) ? product.applications : []),
  ].map(asString).join(" ");
}

function classifyFamily(product, text) {
  const sku = asString(product.sku).toUpperCase();

  if (sku.startsWith("NHD-")) {
    if (sku.includes("600") || text.includes("networkhd 600")) return "NetworkHD 600";
    if (sku.includes("500") || sku.includes("510") || sku === "NHD-0401-MV" || text.includes("networkhd 500")) return "NetworkHD 500";
    if (sku.includes("120") || sku.includes("124") || sku.includes("128") || sku.includes("150") || text.includes("networkhd 100")) return "NetworkHD 100";
    return "NetworkHD";
  }

  if (sku.startsWith("SW-") || sku.startsWith("MX-")) return "Switching / Matrix";
  if (sku.startsWith("EX-") || sku.startsWith("RX-") || sku.startsWith("TX-") || sku.startsWith("SWX-")) return "Extension";
  if (sku.startsWith("APO-") || sku.startsWith("HALO-") || sku.startsWith("CAM-") || sku.startsWith("COM-")) return "UC / Conferencing";
  if (sku.startsWith("CAB-") || sku.startsWith("EXP-CAB") || sku.startsWith("EXP-8K") || sku.startsWith("EXP-4K")) return "Cables";
  if (sku.startsWith("SYN-")) return "Control";
  if (sku.startsWith("AMP-")) return "Audio";

  return asString(product.family) || asString(product.category) || "WyreStorm";
}

function classifyProductGranularity(product) {
  const sku = asString(product.sku).toUpperCase();
  const text = normaliseText(buildTextBlob(product));
  const rawCategory = asString(product.category);
  const primarySystemFamily = classifyFamily(product, text);
  const explicitProductRole = asString(product.productRole);
  const explicitCatalogVisibility = asString(product.catalogVisibility);
  const explicitClassification = product.productClassification && typeof product.productClassification === "object"
    ? product.productClassification
    : null;

  if (explicitProductRole && explicitCatalogVisibility) {
    const dependencyTypeByRole = {
      "primary-hardware": "primary-device",
      "endpoint-hardware": "endpoint",
      "system-controller": "control-interface",
      "workflow-endpoint": "workflow-endpoint",
      cable: "cable",
      accessory: "accessory",
      "rack-mount": "rack-mount",
      "power-accessory": "power-accessory",
      "software-app": "software-app",
      "cloud-service": "cloud-service",
    };
    const bomRoleByRole = {
      "primary-hardware": "primary-line-item",
      "endpoint-hardware": "required-endpoint",
      "system-controller": "required-or-optional-control",
      "workflow-endpoint": "optional-workflow-endpoint",
      cable: "optional-cable",
      accessory: "optional-accessory",
      "rack-mount": "dependency-accessory",
      "power-accessory": "dependency-accessory",
      "software-app": "optional-software",
      "cloud-service": "optional-service",
    };
    const requestedBy = unique([
      ...(Array.isArray(product.showWhenRequestedBy) ? product.showWhenRequestedBy : []),
      ...(Array.isArray(explicitClassification?.subClassifications) ? explicitClassification.subClassifications : []),
      ...(Array.isArray(product.subClassifications) ? product.subClassifications : []),
    ]);

    return {
      commercialRole: explicitProductRole,
      finderVisibility: explicitCatalogVisibility,
      bomRole: bomRoleByRole[explicitProductRole] || "primary-line-item",
      dependencyType: dependencyTypeByRole[explicitProductRole] || explicitProductRole,
      primarySystemFamily: asString(explicitClassification?.primaryCategory) || primarySystemFamily,
      showWhenRequestedBy: explicitCatalogVisibility === "default" ? [] : requestedBy,
    };
  }

  if (sku === "APO-DG2" || sku === "APO-DG2-PRO") {
    return {
      commercialRole: "workflow-endpoint",
      finderVisibility: "conditional-default",
      bomRole: "optional-workflow-endpoint",
      dependencyType: "wireless-collaboration-dongle",
      primarySystemFamily: "Apollo / Wireless Collaboration",
      showWhenRequestedBy: [
        "DG2",
        "APO-DG2",
        "wireless presentation",
        "wireless conferencing",
        "BYOD",
        "BYOM",
        "USB-C wireless",
        "Apollo",
        "SW-620",
        "SW-640",
      ],
    };
  }

  if (textIncludesAny(text, ["nhd touch", "companion control app", "visual control app", "control app", "software app", "ios app", "android app"])) {
    return {
      commercialRole: "software-app",
      finderVisibility: "request-only",
      bomRole: "optional-software",
      dependencyType: "software-app",
      primarySystemFamily,
      showWhenRequestedBy: ["software", "app", "NHD Touch", "Companion app", "control app"],
    };
  }

  if (textIncludesAny(text, ["sygma", "cloud management", "cloud based management"])) {
    return {
      commercialRole: "cloud-service",
      finderVisibility: "request-only",
      bomRole: "optional-service",
      dependencyType: "cloud-service",
      primarySystemFamily,
      showWhenRequestedBy: ["SYGMA", "cloud", "remote management", "device management"],
    };
  }

  if (textIncludesAny(text, ["rack", "rack mount", "rackmount", "rack kit", "rack ears", "1u", "6u", "12 slot", "slot rack"])) {
    return {
      commercialRole: "rack-mount",
      finderVisibility: "request-only",
      bomRole: "dependency-accessory",
      dependencyType: "rack-mount",
      primarySystemFamily,
      showWhenRequestedBy: ["rack", "rack mount", "rack kit", "1U", "6U"],
    };
  }

  if (textIncludesAny(text, ["psu", "power supply", "replacement power", "power adapter", "dc adapter"])) {
    return {
      commercialRole: "power-accessory",
      finderVisibility: "request-only",
      bomRole: "dependency-accessory",
      dependencyType: "power-accessory",
      primarySystemFamily,
      showWhenRequestedBy: ["PSU", "power supply", "power adapter", "spare power"],
    };
  }

  if (textIncludesAny(text, ["mount", "wall mount", "display mount", "camera mount", "bracket", "wall plate accessory"])) {
    return {
      commercialRole: "mounting-accessory",
      finderVisibility: "request-only",
      bomRole: "dependency-accessory",
      dependencyType: "mounting-accessory",
      primarySystemFamily,
      showWhenRequestedBy: ["mount", "wall mount", "bracket", "display mount", "camera mount"],
    };
  }

  if (textIncludesAny(text, ["dock", "docking station", "adapter", "adaptor", "dongle"]) || sku.includes("-DG-") || sku.endsWith("-DG1")) {
    return {
      commercialRole: "accessory",
      finderVisibility: "request-only",
      bomRole: "optional-accessory",
      dependencyType: "collaboration-accessory",
      primarySystemFamily,
      showWhenRequestedBy: ["dongle", "dock", "adapter", "adaptor", "wireless accessory", "Apollo accessory"],
    };
  }

  if (sku.startsWith("CAB-") || sku.startsWith("EXP-CAB") || textIncludesAny(text, ["cable", "aoc", "active optical", "hdmi cable", "usb c cable", "usb-c cable"])) {
    return {
      commercialRole: "cable",
      finderVisibility: "request-only",
      bomRole: "optional-cable",
      dependencyType: "cable",
      primarySystemFamily,
      showWhenRequestedBy: ["cable", "HDMI cable", "USB-C cable", "AOC", "active optical"],
    };
  }

  if (sku === "NHD-CTL-PRO" || sku === "NHD-CTL-PRO-V2" || sku === "SYN-TOUCH10" || sku === "SYN-KEY10" || sku === "SYN-CTL-HUB") {
    return {
      commercialRole: "system-controller",
      finderVisibility: "conditional-default",
      bomRole: "required-or-optional-control",
      dependencyType: "control-interface",
      primarySystemFamily,
      showWhenRequestedBy: ["control", "controller", "touch panel", "button panel", "NetworkHD control", "system control"],
    };
  }

  if (textIncludesAny(text, ["receiver", "decoder", "encoder", "transmitter", "transceiver", "extender", "usb extender", "kvm extender"])) {
    return {
      commercialRole: "endpoint-hardware",
      finderVisibility: "default",
      bomRole: "required-endpoint",
      dependencyType: "endpoint",
      primarySystemFamily,
      showWhenRequestedBy: [],
    };
  }

  if (textIncludesAny(text, ["switcher", "matrix", "processor", "video wall", "multiview", "amplifier", "camera", "speakerphone", "video bar", "microphone hub", "bridge", "mixer"])) {
    return {
      commercialRole: "primary-hardware",
      finderVisibility: "default",
      bomRole: "primary-line-item",
      dependencyType: "primary-device",
      primarySystemFamily,
      showWhenRequestedBy: [],
    };
  }

  return {
    commercialRole: "primary-hardware",
    finderVisibility: rawCategory ? "default" : "request-only",
    bomRole: "primary-line-item",
    dependencyType: "unknown",
    primarySystemFamily,
    showWhenRequestedBy: [],
  };
}

function normalizeProduct(item, index, sourceFile) {
  const brand =
    asString(item?.brand) ||
    asString(item?.manufacturer) ||
    asString(item?.vendor) ||
    asString(item?.make);

  const vendorType =
    asString(item?.vendorType) ||
    (brand.toLowerCase() === "wyrestorm" ? "wyrestorm" : "");

  const sku =
    asString(item?.sku) ||
    asString(item?.SKU) ||
    asString(item?.partNumber) ||
    asString(item?.part_number) ||
    asString(item?.model) ||
    asString(item?.id);

  const name =
    cleanText(item?.name) ||
    cleanText(item?.title) ||
    cleanText(item?.productName) ||
    cleanText(item?.product_name) ||
    sku ||
    `Product ${index + 1}`;

  const description =
    cleanText(item?.description) ||
    cleanText(item?.summary) ||
    cleanText(item?.overview) ||
    cleanText(item?.notes);

  const category =
    cleanText(item?.category) ||
    cleanText(item?.family) ||
    cleanText(item?.productFamily) ||
    cleanText(item?.product_family);

  const summary =
    cleanText(item?.summary) ||
    description ||
    cleanText(item?.overview);

  const technologies = asArray(item?.technologies);
  const connectors = asArray(item?.connectors);

  const features = Array.isArray(item?.features)
    ? item.features
        .map((feature) =>
          typeof feature === "string"
            ? feature.trim()
            : asString(feature?.name || feature?.label || feature)
        )
        .filter(Boolean)
    : [];

  const applications = asArray(item?.applications);
  const productClassification = item?.productClassification && typeof item.productClassification === "object"
    ? item.productClassification
    : null;
  const technicalProfile = item?.technicalProfile && typeof item.technicalProfile === "object"
    ? item.technicalProfile
    : null;
  const salesLanguage =
    item?.salesLanguage && typeof item.salesLanguage === "object"
      ? item.salesLanguage
      : technicalProfile?.salesLanguage && typeof technicalProfile.salesLanguage === "object"
        ? technicalProfile.salesLanguage
        : null;
  const classificationPath = asArray(item?.classificationPath);
  const subClassifications = asArray(item?.subClassifications);
  const profileFeatureLabels = Array.isArray(technicalProfile?.features)
    ? technicalProfile.features.map((feature) => asString(feature?.label || feature)).filter(Boolean)
    : [];
  const profileTransports = asArray(technicalProfile?.transports);
  const profileApplications = asArray(technicalProfile?.applications);
  const salesLanguageTerms = collectTextValues(salesLanguage);

  const tags = unique([
    ...(Array.isArray(item?.tags) ? item.tags : []),
    ...(Array.isArray(item?.featureTags) ? item.featureTags : []),
    ...(Array.isArray(item?.applicationTags) ? item.applicationTags : []),
    ...classificationPath,
    ...subClassifications,
    ...profileFeatureLabels,
  ]);

  const provisionalProduct = {
    id: sku || `generated-${index + 1}`,
    brand,
    vendorType,
    sku,
    name,
    title: name,
    description,
    summary,
    category,
    family: cleanText(item?.family) || category,
    technologies,
    connectors,
    features,
    applications,
    tags,
    productRole: asString(item?.productRole),
    catalogVisibility: asString(item?.catalogVisibility),
    productClassification,
    subClassifications,
    showWhenRequestedBy: asArray(item?.showWhenRequestedBy),
  };

  const granularity = classifyProductGranularity(provisionalProduct);

  const searchTerms = unique([
    brand,
    vendorType,
    sku,
    name,
    category,
    summary,
    granularity.commercialRole,
    granularity.finderVisibility,
    granularity.bomRole,
    granularity.dependencyType,
    granularity.primarySystemFamily,
    ...granularity.showWhenRequestedBy,
    ...technologies,
    ...profileTransports,
    ...connectors,
    ...features,
    ...profileFeatureLabels,
    ...applications,
    ...profileApplications,
    ...salesLanguageTerms,
    ...tags,
  ]).map((value) => value.toLowerCase());

  return {
    id: sku || `generated-${index + 1}`,
    brand,
    vendorType,
    sku,
    name,
    description,
    summary,
    category,
    technologies,
    connectors,
    features,
    applications: unique([...applications, ...profileApplications]),
    tags: unique([
      ...tags,
      granularity.commercialRole,
      granularity.dependencyType,
      granularity.primarySystemFamily,
    ]),
    searchTerms,
    commercialRole: granularity.commercialRole,
    finderVisibility: granularity.finderVisibility,
    bomRole: granularity.bomRole,
    dependencyType: granularity.dependencyType,
    primarySystemFamily: granularity.primarySystemFamily,
    showWhenRequestedBy: granularity.showWhenRequestedBy,
    productRole: asString(item?.productRole),
    catalogVisibility: asString(item?.catalogVisibility),
    technologyType: asString(item?.technologyType),
    hardwareType: asString(item?.hardwareType),
    productClassification,
    classificationPath,
    subClassifications,
    technicalProfile,
    salesLanguage,
    source: path.relative(projectRoot, sourceFile).replace(/\\/g, "/"),
    raw: {
      ...item,
      commercialRole: granularity.commercialRole,
      finderVisibility: granularity.finderVisibility,
      bomRole: granularity.bomRole,
      dependencyType: granularity.dependencyType,
      primarySystemFamily: granularity.primarySystemFamily,
      showWhenRequestedBy: granularity.showWhenRequestedBy,
    },
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

function buildRoleSummary(products) {
  const summary = {};

  for (const product of products) {
    const role = product.commercialRole || "unknown";
    const visibility = product.finderVisibility || "unknown";
    const key = `${role} / ${visibility}`;
    summary[key] = (summary[key] || 0) + 1;
  }

  return summary;
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
      generatedAt,
      sourceFiles: discoveredSources.map((filePath) =>
        path.relative(projectRoot, filePath).replace(/\\/g, "/")
      ),
      count: products.length,
      generator: "tools/generate-product-intelligence-index.mjs",
      roleSummary: buildRoleSummary(products),
    },
    products,
    lookup: {
      bySku,
      byName,
    },
  };
}

async function writeFileEnsured(filePath, content) {
  const fsp = await import("node:fs/promises");
  const pathModule = await import("node:path");

  await fsp.mkdir(pathModule.dirname(filePath), { recursive: true });

  const lockErrorCodes = new Set(["EBUSY", "EPERM", "EACCES", "UNKNOWN"]);
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  let existingContent = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      existingContent = await fsp.readFile(filePath, "utf8");
      break;
    } catch (error) {
      if (error && error.code === "ENOENT") {
        break;
      }

      if (!error || !lockErrorCodes.has(error.code) || attempt === 5) {
        existingContent = null;
        break;
      }

      await wait(200 * attempt);
    }
  }

  if (existingContent === content) {
    console.log(`[product-intelligence-index] Unchanged ${filePath}`);
    return;
  }

  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;

  await fsp.writeFile(tempPath, content, "utf8");

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await fsp.rename(tempPath, filePath);
      return;
    } catch (error) {
      const isLockError = error && lockErrorCodes.has(error.code);

      if (!isLockError || attempt === 10) {
        try {
          await fsp.rm(tempPath, { force: true });
        } catch {
          // best-effort cleanup only
        }

        throw error;
      }

      await wait(250 * attempt);
    }
  }
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
    }

    if (target.type !== "json") {
      await writeFileEnsured(absoluteOutputPath, toTsModule(index));
    }

    console.log(`[product-intelligence-index] Wrote ${target.path}`);
  }

  if (products.length === 0) {
    console.log(
      "[product-intelligence-index] No source product JSON files were found. Generated an empty index so the build can continue."
    );
  }

  if (products.length > 0) {
    console.log(
      `[product-intelligence-index] Indexed ${products.length} product entries from ${discoveredSources.length} source file(s).`
    );
    console.log("[product-intelligence-index] Role summary:");
    console.log(JSON.stringify(index.meta.roleSummary, null, 2));
  }
}

main().catch((error) => {
  console.error("[product-intelligence-index] Generation failed.");
  console.error(error);
  process.exit(1);
});
