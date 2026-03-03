import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PRODUCT_URLS = [
  "https://www.wyrestorm.com/product/sw-640l-tx-w/",
  "https://www.wyrestorm.com/product/ex-100-kvm-ip/",
  "https://www.wyrestorm.com/product/com-mic-hub/",
  "https://www.wyrestorm.com/product/apo-dg2/",
  "https://www.wyrestorm.com/product/mx-0808-h2a-mk2/",
];

function cleanText(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function matchOne(html, regex) {
  const m = html.match(regex);
  return m?.[1] ? cleanText(m[1]) : "";
}

function collectTagSection(html, heading) {
  const safe = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`####\\s*${safe}[\\s\\S]*?(?=####|##|Product categories)`, "i");
  const m = html.match(rx);
  if (!m) return [];
  const text = cleanText(m[0]);
  return text
    .replace(new RegExp(`^${heading}`, "i"), "")
    .split(" ")
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 16);
}

async function fetchProduct(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "WingmanCatalogSync/1.0 (+local dev)",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed ${res.status} for ${url}`);
  }

  const html = await res.text();

  const name =
    matchOne(html, /<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i) ||
    matchOne(html, /<title[^>]*>\s*([^<]+?)\s*<\/title>/i) ||
    "Unknown Product";

  const sku =
    matchOne(html, /SKU:\s*([^<\n\r]+)/i) ||
    matchOne(html, /MODEL:\s*([^<\n\r]+)/i) ||
    "UNKNOWN";

  const summary =
    matchOne(html, /Login as a partner to view prices[\s\S]*?<p[^>]*>\s*([^<].*?)<\//i) ||
    matchOne(html, /Contact Sales for Price[\s\S]*?<p[^>]*>\s*([^<].*?)<\//i) ||
    "";

  const supportedResolution = collectTagSection(html, "Supported Resolution");
  const transmissionTechnology = collectTagSection(html, "Transmission Technology");
  const features = collectTagSection(html, "Features");
  const control = collectTagSection(html, "Control");

  return {
    sku,
    name,
    family: "WyreStorm",
    category: "Imported",
    role: "",
    status: "unknown",
    summary,
    io: [],
    connectivity: transmissionTechnology,
    control,
    features: [...supportedResolution, ...features].filter((v, i, a) => a.indexOf(v) === i),
    bestFor: [],
    sourceUrl: url,
  };
}

async function main() {
  const imported = [];

  for (const url of PRODUCT_URLS) {
    try {
      const item = await fetchProduct(url);
      imported.push(item);
      console.log(`Imported ${item.sku}`);
    } catch (err) {
      console.warn(`Skip ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const out = `import type { GuruCatalogItem } from "./guruCatalog.seed";

export const WYRESTORM_CATALOG: GuruCatalogItem[] = ${JSON.stringify(imported, null, 2)};

export default WYRESTORM_CATALOG;
`;

  const here = path.dirname(fileURLToPath(import.meta.url));
  const target = path.resolve(here, "../src/features/guru/guruCatalog.generated.ts");
  await writeFile(target, out, "utf8");

  console.log(`Wrote ${target}`);
  console.log(`Imported ${imported.length} product entries`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});