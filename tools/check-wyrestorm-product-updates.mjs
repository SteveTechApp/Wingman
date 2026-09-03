import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { atomicWriteJson } from "./lib/atomic-json-writer.mjs";

const repoRoot = process.cwd();

const productIndexPath = path.join(repoRoot, "public", "product-intelligence-index.json");
const reportPath = path.join(repoRoot, "public", "wyrestorm-product-update-check.json");
const candidatePath = path.join(repoRoot, "data", "wyrestorm-product-update-candidates.json");

const sourceUrls = [
  "https://www.wyrestorm.com/sitemap_index.xml",
  "https://www.wyrestorm.com/product-sitemap.xml",
  "https://www.wyrestorm.com/sitemap.xml",
  "https://www.wyrestorm.com/products/",
  "https://wyrestorm.com/products/",
  "https://wyrestorm.com/product-sitemap.xml",
  "https://wyrestorm.com/sitemap_products.xml",
  "https://wyrestorm.com/sitemap.xml",
];

const productPrefixPattern = /^(NHD|SW|SWX|MX|MXV|RX|RXV|TX|EX|EXA|EXP|APO|HALO|CAM|FOCUS|AMP|COM|SYN|SP|CAB|IDB|SR)-/i;
const skuPattern = /\b(?:NHD|SWX?|MXV?|MX|RXV?|RX|TX|EXA?|EXP|APO|HALO|CAM|FOCUS|AMP|COM|SYN|SP|CAB|IDB|SR)-[A-Z0-9][A-Z0-9-]{1,48}\b/gi;
const productUrlPattern = /https?:\/\/(?:www\.)?wyrestorm\.com\/(?:global\/)?product\/([^"'<)\s]+)\/?/gi;
const sitemapUrlPattern = /https?:\/\/(?:www\.)?wyrestorm\.com\/[^"'<>\s]*sitemap[^"'<>\s]*/gi;

function cleanText(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&#x2122;|&#8482;|&trade;/gi, "TM")
    .replace(/&#x00ae;|&#174;|&reg;/gi, "R")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseSku(value) {
  return cleanText(value)
    .replace(/^product\//i, "")
    .replace(/^global\//i, "")
    .replace(/^product-/i, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9-]/gi, "")
    .replace(/-+$/g, "")
    .toUpperCase();
}

function likelyProductSku(value) {
  const sku = normaliseSku(value);

  if (!sku.includes("-")) return false;
  if (sku.length < 5) return false;
  if (sku.length > 52) return false;
  if (/^(PRODUCT|CATEGORY|SUPPORT|DOWNLOAD|NEWS|BLOG|WHERE|ABOUT)-/i.test(sku)) return false;
  if (/(?:^|-)\d{2,4}X\d{2,4}(?:-|$)/i.test(sku)) return false;
  if (/(?:-SCALED|-PER\d*(?:-|$)|-SIDE(?:-|$)|-MAIN(?:-|$)|-FRONT(?:-|$)|-BACK(?:-|$)|-TOP(?:-|$)|-BOTTOM(?:-|$)|-CALLOUT(?:-|$))/i.test(sku)) return false;

  return productPrefixPattern.test(sku);
}

function numericSuffixBases(value) {
  const bases = [];
  let sku = normaliseSku(value);

  while (/-\d+$/.test(sku)) {
    sku = sku.replace(/-\d+$/, "");
    if (likelyProductSku(sku)) {
      bases.push(sku);
    }
  }

  return bases;
}

function extractTitle(html, sku) {
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);

  const title = cleanText(h1Match?.[1] || ogTitleMatch?.[1] || titleMatch?.[1] || "");
  return title
    .replace(/\s*-\s*WyreStorm.*$/i, "")
    .replace(new RegExp(`^${sku}\\s*[-–—:]?\\s*`, "i"), "")
    .trim();
}

function extractDescription(html) {
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);

  return cleanText(descMatch?.[1] || ogDescMatch?.[1] || "");
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response;

  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "WingmanProductUpdateCheck/1.0",
        accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${url} timed out`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
}

async function readIndexedSkus() {
  const raw = await readFile(productIndexPath, "utf8");
  const parsed = JSON.parse(raw);
  const products = Array.isArray(parsed.products) ? parsed.products : [];
  const skus = new Set();

  for (const product of products) {
    const sku = normaliseSku(product?.sku || product?.id || "");
    if (sku) skus.add(sku);
  }

  return { skus, count: products.length };
}

function collectProductLinks(html) {
  const links = new Map();

  for (const match of html.matchAll(productUrlPattern)) {
    const rawSlug = decodeURIComponent(match[1] || "");
    const sku = normaliseSku(rawSlug);

    if (!likelyProductSku(sku)) continue;

    links.set(sku, `https://www.wyrestorm.com/product/${sku.toLowerCase()}/`);
  }

  for (const match of html.matchAll(skuPattern)) {
    const sku = normaliseSku(match[0]);

    if (!likelyProductSku(sku)) continue;
    if (links.has(sku)) continue;

    links.set(sku, `https://www.wyrestorm.com/product/${sku.toLowerCase()}/`);
  }

  return links;
}

function collectSitemapUrls(html) {
  return [...html.matchAll(sitemapUrlPattern)]
    .map((match) => cleanText(match[0]))
    .filter(Boolean)
    .filter((url) => /wyrestorm\.com/i.test(url))
    .filter((url) => /product/i.test(url));
}

async function discoverProducts() {
  const discovered = new Map();
  const warnings = [];
  const queuedUrls = [...sourceUrls];
  const visitedUrls = new Set();

  for (let index = 0; index < queuedUrls.length && index < 12; index += 1) {
    const url = queuedUrls[index];
    const visitKey = url.toLowerCase();

    if (visitedUrls.has(visitKey)) continue;

    visitedUrls.add(visitKey);

    try {
      const html = await fetchText(url);
      const links = collectProductLinks(html);
      const sitemapUrls = collectSitemapUrls(html);

      for (const [sku, productUrl] of links) {
        discovered.set(sku, productUrl);
      }

      for (const sitemapUrl of sitemapUrls) {
        if (!visitedUrls.has(sitemapUrl.toLowerCase()) && queuedUrls.length < 80) {
          queuedUrls.push(sitemapUrl);
        }
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `Unable to fetch ${url}`);
    }
  }

  return { discovered, warnings };
}

async function enrichCandidate(candidate) {
  try {
    const html = await fetchText(candidate.url);
    const title = extractTitle(html, candidate.sku);
    const description = extractDescription(html);

    return {
      ...candidate,
      title: title || candidate.title || "Potential new WyreStorm product",
      description,
      sourceStatus: "page fetched",
    };
  } catch (error) {
    return {
      ...candidate,
      title: candidate.title || "Potential new WyreStorm product",
      description: "",
      sourceStatus: error instanceof Error ? error.message : "Unable to fetch product page",
    };
  }
}

async function main() {
  const generatedAt = new Date().toISOString();

  const { skus: indexedSkus, count: indexedCount } = await readIndexedSkus();
  const { discovered, warnings } = await discoverProducts();

  const candidateEntries = [...discovered.entries()].filter(([sku]) => !indexedSkus.has(sku));
  const candidateSkuSet = new Set(candidateEntries.map(([sku]) => sku));
  const candidateBasics = candidateEntries
    .filter(([sku]) => !numericSuffixBases(sku).some((baseSku) => indexedSkus.has(baseSku) || candidateSkuSet.has(baseSku)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sku, url]) => ({
      sku,
      url,
      reason: "Found on WyreStorm product pages but not present in Wingman product-intelligence index.",
    }));

  const candidates = await Promise.all(candidateBasics.slice(0, 30).map((candidate) => enrichCandidate(candidate)));

  const enrichedBySku = new Map(candidates.map((candidate) => [candidate.sku, candidate]));
  const allCandidates = candidateBasics.map((candidate) =>
    enrichedBySku.get(candidate.sku) || {
      ...candidate,
      title: candidate.title || "Potential new WyreStorm product",
      description: "",
      sourceStatus: "queued for review",
    }
  );

  const report = {
    generatedAt,
    sourceUrl: "https://www.wyrestorm.com/sitemap_index.xml",
    indexedCount,
    discoveredCount: discovered.size,
    newCandidateCount: candidateBasics.length,
    enrichedCandidateSampleCount: candidates.length,
    candidates,
    warnings,
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await mkdir(path.dirname(candidatePath), { recursive: true });

  await atomicWriteJson(reportPath, report);
  await atomicWriteJson(candidatePath, { generatedAt, candidates: allCandidates });

  console.log(`Indexed SKUs: ${indexedCount}`);
  console.log(`Discovered SKUs: ${discovered.size}`);
  console.log(`New candidate SKUs: ${candidateBasics.length}`);
  console.log(`Wrote ${path.relative(repoRoot, reportPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, candidatePath)}`);

  if (warnings.length) {
    console.warn("Warnings:");

    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
