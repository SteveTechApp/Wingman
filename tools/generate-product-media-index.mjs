import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const productIndexPath = path.join(repoRoot, "public", "product-intelligence-index.json");
const outputPath = path.join(repoRoot, "public", "product-media-index.json");

const imageUrlPattern = /https?:[^"'\s<>]+?\.(?:png|jpe?g|webp)(?:\?[^"'\s<>]*)?/gi;
const sizeSuffixPattern = /-\d+x\d+(?=\.(?:png|jpe?g|webp)(?:$|\?))/i;

const manualViewOverrides = {
  "NHD-0401-MV": {
    front: /NHD-0401-MV-2(?:-\d+x\d+)?\.(?:png|jpe?g|webp)$/i,
    rear: /NHD-0401-MV-1(?:-\d+x\d+)?\.(?:png|jpe?g|webp)$/i,
  },
};

function readProducts() {
  const parsed = JSON.parse(fs.readFileSync(productIndexPath, "utf8"));
  return Array.isArray(parsed) ? parsed : parsed.products ?? [];
}

function text(value) {
  return String(value ?? "").trim();
}

function officialProductUrl(product) {
  return (
    product?.technicalProfile?.sourceQuality?.officialProductUrl ||
    product?.raw?.technicalProfile?.sourceQuality?.officialProductUrl ||
    product?.url ||
    ""
  );
}

function slugTokens(sku) {
  const base = sku.toLowerCase();
  const tokens = new Set([
    base,
    base.replace(/-ndi-/g, "-"),
    base.replace(/-(?:uk|us|eu|au|v2|mk2|c)$/g, ""),
    base.replace(/-v\d+$/g, ""),
  ]);

  return [...tokens].filter((item) => item.length >= 6);
}

function decodeImageUrl(url) {
  return url
    .replace(/\\/g, "")
    .replace(/&amp;/g, "&")
    .replace(/[?#].*$/, "");
}

function canonicalImageKey(url) {
  return url
    .toLowerCase()
    .replace(sizeSuffixPattern, "")
    .replace(/-scaled(?=\.(?:png|jpe?g|webp)$)/i, "");
}

function scoreImageVariant(url) {
  const filename = path.posix.basename(url).toLowerCase();
  if (!sizeSuffixPattern.test(filename) && !filename.includes("-scaled.")) return 100000;

  const size = filename.match(/-(\d+)x(\d+)(?=\.(?:png|jpe?g|webp))/i);
  if (size) return Number(size[1]) * Number(size[2]);

  if (filename.includes("-scaled.")) return 90000;
  return 0;
}

function dedupeImages(urls) {
  const best = new Map();

  for (const url of urls) {
    const key = canonicalImageKey(url);
    const current = best.get(key);

    if (!current || scoreImageVariant(url) > scoreImageVariant(current)) {
      best.set(key, url);
    }
  }

  return [...best.values()];
}

function viewFromFilename(url) {
  const filename = path.posix.basename(url).toLowerCase();

  if (/(?:rear|back|bck|connector|connections)/i.test(filename)) return "rear";
  if (/(?:front|frnt)/i.test(filename)) return "front";
  if (/side/i.test(filename)) return "side";
  if (/top/i.test(filename)) return "top";
  if (/(?:detail|close)/i.test(filename)) return "detail";
  if (/(?:per|angle|tilt|angled|render|rndr)/i.test(filename)) return "angle";
  return "unknown";
}

function makeAsset(product, url, view, confidence) {
  const sku = text(product.sku);
  const name = text(product.name) || sku;

  return {
    url,
    view,
    alt: `${sku} ${name} ${view} product image`,
    sourceUrl: officialProductUrl(product),
    confidence,
  };
}

function pickManualAsset(product, urls, view) {
  const override = manualViewOverrides[text(product.sku)]?.[view];
  if (!override) return null;

  const match = urls.find((url) => override.test(path.posix.basename(url)));
  return match ? makeAsset(product, match, view, "HIGH") : null;
}

function mediaSetFromImages(product, urls, fetchedAt) {
  const gallery = urls.map((url) => makeAsset(product, url, viewFromFilename(url), "MEDIUM"));
  const manualFront = pickManualAsset(product, urls, "front");
  const manualRear = pickManualAsset(product, urls, "rear");
  const explicitFront = gallery.find((asset) => asset.view === "front");
  const explicitRear = gallery.find((asset) => asset.view === "rear");
  const rear = manualRear || explicitRear;
  const firstNonRearImage = gallery.find((asset) => asset.url !== rear?.url && asset.view !== "rear");
  const firstImage = firstNonRearImage || gallery.find((asset) => asset.url !== rear?.url) || gallery[0];
  const front = manualFront || explicitFront || (firstImage ? { ...firstImage, view: "primary", confidence: "LOW" } : undefined);
  const notes = [];

  if (!front) {
    notes.push("No product image was found on the official product page.");
  } else if (front.view === "primary") {
    notes.push("Primary image is shown because no explicit front-view filename was found.");
  }

  if (!rear) {
    notes.push("Rear or connector-view image was not identified; verify before using in customer-facing output.");
  }

  let status = "no-gallery";
  if (front && rear && front.confidence === "HIGH" && rear.confidence === "HIGH") status = "verified-front-back";
  else if (front && rear) status = "partial-front";
  else if (front && gallery.length > 1) status = "gallery-only";
  else if (front) status = "primary-only";

  return {
    sku: text(product.sku),
    productName: text(product.name),
    officialProductUrl: officialProductUrl(product),
    status,
    front,
    rear,
    gallery,
    notes,
    lastChecked: fetchedAt,
  };
}

function productImageUrlsFromHtml(product, html) {
  const sku = text(product.sku);
  const tokens = slugTokens(sku);
  const all = [...html.matchAll(imageUrlPattern)]
    .map((match) => decodeImageUrl(match[0]))
    .filter((url) => /wyrestorm\.com\/wp-content\/uploads/i.test(url));

  const skuImages = all.filter((url) => {
    const lower = url.toLowerCase();
    if (!tokens.some((token) => lower.includes(token))) return false;
    if (/logo|icon|warranty|support|facebook|linkedin|youtube|twitter/i.test(lower)) return false;
    return true;
  });

  return dedupeImages([...new Set(skuImages)]).slice(0, 16);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Wingman product media indexer",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function main() {
  const products = readProducts().filter((product) => text(product.sku));
  const fetchedAt = new Date().toISOString().slice(0, 10);
  const records = [];

  for (const [index, product] of products.entries()) {
    const sku = text(product.sku);
    const url = officialProductUrl(product);

    if (!url) {
      records.push({
        sku,
        productName: text(product.name),
        status: "no-official-page",
        gallery: [],
        notes: ["No official product URL is present in the product intelligence index."],
        lastChecked: fetchedAt,
      });
      continue;
    }

    try {
      const html = await fetchText(url);
      const images = productImageUrlsFromHtml(product, html);
      records.push(mediaSetFromImages(product, images, fetchedAt));
      console.log(`[product-media] ${index + 1}/${products.length} ${sku}: ${images.length} image(s)`);
    } catch (error) {
      records.push({
        sku,
        productName: text(product.name),
        officialProductUrl: url,
        status: "no-gallery",
        gallery: [],
        notes: [`Could not read official product page: ${error.message}`],
        lastChecked: fetchedAt,
      });
      console.log(`[product-media] ${index + 1}/${products.length} ${sku}: ${error.message}`);
    }
  }

  const withFront = records.filter((record) => record.front).length;
  const withRear = records.filter((record) => record.rear).length;
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: "Official WyreStorm product pages listed in public/product-intelligence-index.json",
      productCount: products.length,
      mediaRecordCount: records.length,
      withFront,
      withRear,
      verifiedFrontBack: records.filter((record) => record.status === "verified-front-back").length,
    },
    products: records,
    lookup: Object.fromEntries(records.map((record) => [record.sku, record])),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`[product-media] Wrote ${path.relative(repoRoot, outputPath)} (${withFront} with front/primary, ${withRear} with rear/connector).`);
}

main().catch((error) => {
  console.error(`[product-media] ${error.stack || error.message}`);
  process.exit(1);
});
