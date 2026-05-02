import fs from "node:fs";

const OUT = "./data/wyrestorm-product-intelligence.json";
const REPORT = "./data/wyrestorm-product-intelligence.rebuild-report.json";

const BASE = "https://www.wyrestorm.com";

const sitemapCandidates = [
  `${BASE}/sitemap_index.xml`,
  `${BASE}/product-sitemap.xml`,
  `${BASE}/product-sitemap1.xml`,
  `${BASE}/product-sitemap2.xml`
];

const seedCategoryPages = [
  `${BASE}/product-category/matrix-solution/`,
  `${BASE}/product-category/matrix-solution/seamless-matrix-switcher/`,
  `${BASE}/product-category/matrix-solution/hdbaset-matrix-kit/`,
  `${BASE}/product-category/networkhd-av-over-ip/`,
  `${BASE}/product-category/presentation-conferencing/`,
  `${BASE}/product-category/unified-communications/`,
  `${BASE}/product-category/video-processors/`,
  `${BASE}/product-category/hdmi-extenders/`,
  `${BASE}/product-category/usb-extenders/`,
  `${BASE}/product-category/kvm-extenders/`,
  `${BASE}/product-category/hdmi-switchers/`,
  `${BASE}/product-category/hdmi-splitters/`,
  `${BASE}/product-category/audio-system/`,
  `${BASE}/product-category/control-system/`,
  `${BASE}/product-category/cables/`,
  `${BASE}/product-category/adapters/`,
  `${BASE}/product-category/accessories/`,
  `${BASE}/product-category/discontinued-products/`
];

const pollutionMarkers = [
  "wp-content/plugins",
  "woocommerce",
  "elementor",
  "yith_wcan",
  "jquery-dgwt-wcas",
  "sourceURL=",
  "CDATA",
  "text-567082745",
  "col-835134230",
  "banner-841213675",
  "MicrosoftTeams-image-76.png",
  "transport-solutions/",
  "retail-solutions/",
  "<script",
  "<style",
  "<div",
  "<a ",
  "href=",
  "class="
];

function decodeEntities(value = "") {
  return String(value)
    .replace(/&#038;/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&raquo;/gi, " ");
}

function cleanText(value = "", maxLength = 520) {
  let text = decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\\n|\\r|\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const marker of pollutionMarkers) {
    const index = text.toLowerCase().indexOf(marker.toLowerCase());
    if (index >= 0) {
      text = text.slice(0, index).trim();
    }
  }

  if (text.length > maxLength) {
    text = `${text.slice(0, maxLength).trim()}...`;
  }

  return text;
}

function containsPollution(value = "") {
  const lower = String(value).toLowerCase();
  return pollutionMarkers.some((marker) => lower.includes(marker.toLowerCase()));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "WingmanProductRebuilder/1.0 product-data-only"
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractUrls(text) {
  const urls = new Set();
  const decoded = decodeEntities(text);

  for (const match of decoded.matchAll(/https?:\/\/www\.wyrestorm\.com\/product\/[a-z0-9._-]+\/?/gi)) {
    const url = match[0].replace(/[?#].*$/, "").replace(/\/?$/, "/");
    urls.add(url);
  }

  for (const match of decoded.matchAll(/href=["'](\/product\/[a-z0-9._-]+\/?)["']/gi)) {
    urls.add(`${BASE}${match[1]}`.replace(/\/?$/, "/"));
  }

  return [...urls];
}

function metaContent(html, nameOrProperty) {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1], 700);
  }

  return "";
}

function extractJsonLdProducts(html) {
  const products = [];

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeEntities(match[1]).trim();

    try {
      const parsed = JSON.parse(raw);
      walkJsonLd(parsed, products);
    } catch {
      // Ignore malformed JSON-LD.
    }
  }

  return products;
}

function walkJsonLd(node, products) {
  if (!node) return;

  if (Array.isArray(node)) {
    node.forEach((item) => walkJsonLd(item, products));
    return;
  }

  if (typeof node !== "object") return;

  const type = Array.isArray(node["@type"]) ? node["@type"].join(" ") : String(node["@type"] ?? "");

  if (/product/i.test(type)) {
    products.push(node);
  }

  for (const value of Object.values(node)) {
    walkJsonLd(value, products);
  }
}

function slugFromUrl(url) {
  return new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
}

function skuFromSlug(url) {
  return slugFromUrl(url).toUpperCase();
}

function extractSku(html, url, jsonProduct) {
  const candidates = [
    jsonProduct?.sku,
    jsonProduct?.mpn,
    jsonProduct?.productID,
    skuFromSlug(url)
  ].filter(Boolean).map(String);

  const topHtml = html.split(/related products|<footer|#### Products/i)[0].slice(0, 90000);
  const visibleText = cleanText(topHtml, 90000);

  const skuMatch = visibleText.match(/\b(?:SKU|MODEL|Model)\s*:\s*([A-Z0-9][A-Z0-9 ._-]{2,40})/i);
  if (skuMatch?.[1]) {
    candidates.unshift(skuMatch[1]);
  }

  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/^SKU\s*:\s*/i, "")
      .replace(/^MODEL\s*:\s*/i, "")
      .replace(/\s+/g, "-")
      .replace(/[^A-Z0-9._-]/gi, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toUpperCase();

    if (/^[A-Z0-9][A-Z0-9._-]{2,40}$/.test(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

function extractName(html, jsonProduct) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";

  const candidates = [
    jsonProduct?.name,
    metaContent(html, "og:title"),
    h1,
    title.replace(/\s*[-|]\s*WyreStorm.*$/i, "")
  ];

  for (const candidate of candidates) {
    const cleaned = cleanText(candidate, 180);
    if (cleaned && !containsPollution(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

function extractDescription(html, jsonProduct) {
  const candidates = [
    jsonProduct?.description,
    metaContent(html, "description"),
    metaContent(html, "og:description")
  ];

  for (const candidate of candidates) {
    const cleaned = cleanText(candidate, 520);
    if (cleaned && !containsPollution(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

function addUnique(array, values) {
  const seen = new Set(array.map((item) => String(item).toLowerCase()));

  for (const value of values) {
    if (!value) continue;
    const key = String(value).toLowerCase();
    if (seen.has(key)) continue;
    array.push(value);
    seen.add(key);
  }
}

function classifyProduct({ sku, name, description, url }) {
  const text = `${sku} ${name} ${description} ${url}`.toLowerCase();
  const features = [];
  let family = "Product";
  let role = "Primary hardware";
  let productRole = "primary-hardware";
  let catalogVisibility = "default";

  const isMatrix = /^mx/i.test(sku) || /\bmatrix\b/i.test(text);
  const isSclMatrix = isMatrix && /\bscl\b/i.test(text);
  const isCable = /^cab|cable|\bhdmi cable\b|\busb-c cable\b/i.test(text);
  const isAccessory = /\b(accessory|mount|bracket|psu|power supply|adapter ring|dock|module|card)\b/i.test(text);
  const isSoftware = /\b(app|software|license|cloud)\b/i.test(text);

  if (isCable) {
    family = "Cable";
    role = "Cable / request-only";
    productRole = "cable";
    catalogVisibility = "request-only";
  }

  if (isAccessory && !isMatrix) {
    family = "Accessory";
    role = "Accessory / request-only";
    productRole = "accessory";
    catalogVisibility = "request-only";
  }

  if (isSoftware) {
    family = "Software / Service";
    role = "Software or service / request-only";
    productRole = "software-app";
    catalogVisibility = "request-only";
  }

  if (isMatrix) {
    family = "Matrix Switcher";
    role = isSclMatrix ? "Seamless scaling matrix switcher" : "Matrix switcher";
    productRole = "primary-hardware";
    catalogVisibility = "default";
    addUnique(features, ["Matrix", "Switching"]);
  }

  if (/networkhd|\bnhd-/i.test(text)) {
    family = "NetworkHD AVoIP";
    role = "AVoIP endpoint / system component";
    productRole = "endpoint-hardware";
    addUnique(features, ["AVoIP", "NetworkHD"]);
  }

  if (/\bsw-/i.test(sku) || /video wall|processor/i.test(text)) {
    family = "Video Processor";
    role = "Video processing hardware";
    addUnique(features, ["Video Wall", "Processing"]);
  }

  if (/hdbaset/i.test(text)) addUnique(features, ["HDBaseT"]);
  if (/usb-c|usbc|type-c/i.test(text)) addUnique(features, ["USB-C"]);
  if (/\busb\b/i.test(text)) addUnique(features, ["USB"]);
  if (/hdmi/i.test(text)) addUnique(features, ["HDMI"]);
  if (/dante/i.test(text)) addUnique(features, ["Dante"]);
  if (/aes67/i.test(text)) addUnique(features, ["AES67"]);
  if (/\bndi\b/i.test(text)) addUnique(features, ["NDI"]);
  if (/video wall/i.test(text)) addUnique(features, ["Video Wall"]);
  if (/scal/i.test(text)) addUnique(features, ["Scaling"]);
  if (/seamless/i.test(text)) addUnique(features, ["Seamless Switching"]);
  if (/wireless|casting/i.test(text)) addUnique(features, ["Wireless Casting"]);
  if (/byod|byom/i.test(text)) addUnique(features, ["BYOD/BYOM"]);
  if (/multiview|multi-view|picture-in-picture|\bpip\b|quad view/i.test(text)) addUnique(features, ["Multiview"]);
  if (isSclMatrix) {
    addUnique(features, [
      "Multiview",
      "Multi-view",
      "Picture-in-Picture",
      "PIP",
      "Quad view",
      "multi-window",
      "multiple sources on one output",
      "Seamless Scaling Matrix"
    ]);
  }

  return { family, role, productRole, catalogVisibility, features };
}

function rejectBadRecord(record) {
  if (!record.sku || !record.name || !record.url) return "missing sku/name/url";

  const values = Object.values(record).flatMap((value) => Array.isArray(value) ? value : [value]);

  for (const value of values) {
    if (typeof value !== "string") continue;
    if (containsPollution(value)) return `pollution marker in ${record.sku}`;
    if (/<[a-z][\s\S]*>/i.test(value)) return `html tag in ${record.sku}`;
    if (value.length > 1400) return `oversized string in ${record.sku}`;
  }

  if (/\/product-category\/|\/retail-solutions\/|\/transport-solutions\//i.test(record.url)) {
    return `non-product url in ${record.sku}`;
  }

  return "";
}

async function discoverProductUrls() {
  const urls = new Set();

  for (const sitemap of sitemapCandidates) {
    try {
      console.log(`[discover] Fetching ${sitemap}`);
      const xml = await fetchText(sitemap);

      const nested = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => decodeEntities(match[1]));

      for (const loc of nested) {
        if (/\/product\/[a-z0-9._-]+\/?$/i.test(loc)) {
          urls.add(loc.replace(/\/?$/, "/"));
        }

        if (/product.*sitemap/i.test(loc)) {
          try {
            console.log(`[discover] Fetching nested sitemap ${loc}`);
            const nestedXml = await fetchText(loc);
            extractUrls(nestedXml).forEach((url) => urls.add(url));
          } catch (error) {
            console.warn(`[discover] Nested sitemap failed: ${loc} (${error.message})`);
          }
        }
      }

      extractUrls(xml).forEach((url) => urls.add(url));
    } catch (error) {
      console.warn(`[discover] Sitemap failed: ${sitemap} (${error.message})`);
    }
  }

  for (const page of seedCategoryPages) {
    try {
      console.log(`[discover] Fetching category ${page}`);
      const html = await fetchText(page);
      extractUrls(html).forEach((url) => urls.add(url));
    } catch (error) {
      console.warn(`[discover] Category failed: ${page} (${error.message})`);
    }
  }

  return [...urls].sort();
}

async function mapLimit(items, limit, mapper) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function buildRecord(url) {
  const html = await fetchText(url);
  const jsonProducts = extractJsonLdProducts(html);
  const jsonProduct = jsonProducts[0] ?? {};

  const sku = extractSku(html, url, jsonProduct);
  const name = extractName(html, jsonProduct);
  const description = extractDescription(html, jsonProduct);

  const classification = classifyProduct({ sku, name, description, url });

  const record = {
    id: sku,
    brand: "WyreStorm",
    vendorType: "wyrestorm",
    sku,
    name,
    title: name,
    url,
    description,
    family: classification.family,
    role: classification.role,
    productRole: classification.productRole,
    catalogVisibility: classification.catalogVisibility,
    features: classification.features,
    featureTags: classification.features,
    tags: classification.features,
    capabilities: classification.features,
    searchTerms: [sku, name, classification.family, classification.role, ...classification.features].filter(Boolean),
    source: {
      type: "official-product-page",
      url,
      capturedFieldsOnly: true
    }
  };

  const rejection = rejectBadRecord(record);
  if (rejection) {
    return { ok: false, url, reason: rejection };
  }

  return { ok: true, record };
}

const urls = await discoverProductUrls();

console.log(`[rebuild] Discovered ${urls.length} candidate product URLs.`);

const results = await mapLimit(urls, 6, async (url, index) => {
  try {
    console.log(`[rebuild] ${index + 1}/${urls.length} ${url}`);
    return await buildRecord(url);
  } catch (error) {
    return { ok: false, url, reason: error.message };
  }
});

const productsBySku = new Map();
const rejected = [];

for (const result of results) {
  if (!result?.ok) {
    rejected.push(result);
    continue;
  }

  const existing = productsBySku.get(result.record.sku);
  if (!existing || result.record.description.length > existing.description.length) {
    productsBySku.set(result.record.sku, result.record);
  }
}

const products = [...productsBySku.values()].sort((a, b) => a.sku.localeCompare(b.sku));

const remainingPollution = JSON.stringify(products).toLowerCase();

for (const marker of pollutionMarkers) {
  if (remainingPollution.includes(marker.toLowerCase())) {
    throw new Error(`Rebuilt data still contains pollution marker: ${marker}`);
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(products, null, 2)}\n`, "utf8");

fs.writeFileSync(
  REPORT,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      discoveredUrlCount: urls.length,
      productCount: products.length,
      rejectedCount: rejected.length,
      rejected: rejected.slice(0, 200),
      families: products.reduce((acc, product) => {
        acc[product.family] = (acc[product.family] ?? 0) + 1;
        return acc;
      }, {})
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`[rebuild] Wrote ${products.length} clean product records to ${OUT}`);
console.log(`[rebuild] Rejected ${rejected.length} candidates. See ${REPORT}`);