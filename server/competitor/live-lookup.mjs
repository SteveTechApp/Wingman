import fs from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { COMPETITOR_LIVE_LOOKUP_DB_FILE as LIVE_LOOKUP_DB_FILE } from "../catalog/files.mjs";
import { normaliseProductTechnology } from "./technology-normalizer.mjs";

const LIVE_LOOKUP_MEMORY_CACHE = new Map();
/* COMPETITOR-LIVE-LOOKUP-ALLOWLIST-GUARD-START */
const ALLOWED_VENDOR_HOSTS = new Set([
  // Search / discovery sources
  "bing.com",
  "www.bing.com",
  "duckduckgo.com",
  "html.duckduckgo.com",

  // Alternative reference sources
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "wikipedia.org",
  "www.wikipedia.org",
  "en.wikipedia.org",

  // Core competitor manufacturers
  "crestron.com",
  "www.crestron.com",
  "extron.com",
  "www.extron.com",
  "atlona.com",
  "www.atlona.com",
  "kramerav.com",
  "www.kramerav.com",
  "www1.kramerav.com",
  "blustream.co.uk",
  "www.blustream.co.uk",
  "blustream-us.com",
  "www.blustream-us.com",
  "lightware.com",
  "www.lightware.com",
  "zeevee.com",
  "www.zeevee.com",
  "barco.com",
  "www.barco.com",
  "amx.com",
  "www.amx.com",

  // Additional AV manufacturers / common comparison sources
  "visionary-av.com",
  "www.visionary-av.com",
  "avproedge.com",
  "www.avproedge.com",
  "justaddpower.com",
  "www.justaddpower.com",
  "auroramm.com",
  "www.auroramm.com",
  "qsys.com",
  "www.qsys.com",
  "cypeurope.com",
  "www.cypeurope.com",
  "sy.co.uk",
  "www.sy.co.uk",
  "hdanywhere.com",
  "www.hdanywhere.com",
  "support.hdanywhere.com",
  "turtleav.com",
  "www.turtleav.com",
  "blackbox.com",
  "www.blackbox.com",
  "datapath.co.uk",
  "www.datapath.co.uk",
  "matrox.com",
  "www.matrox.com",
  "netgear.com",
  "www.netgear.com",

  // Trusted public AV catalogue / reseller / distribution sources
  "avitdirect.co.uk",
  "www.avitdirect.co.uk",
  "markertek.com",
  "www.markertek.com",
  "bzbgear.com",
  "www.bzbgear.com",
  "proav.co.uk",
  "www.proav.co.uk",
  "midwich.com",
  "www.midwich.com",
  "exertis.co.uk",
  "www.exertis.co.uk",
  "bhphotovideo.com",
  "www.bhphotovideo.com",
  "av-iq.com",
  "www.av-iq.com",
  "fullcompass.com",
  "www.fullcompass.com",
  "projectorcentral.com",
  "www.projectorcentral.com",
  "touchboards.com",
  "www.touchboards.com",
  "cdw.com",
  "www.cdw.com",
  "connection.com",
  "www.connection.com",
  "manualslib.com",
  "www.manualslib.com",
  "device.report",
  "www.device.report",
  "hdbaset.org",
  "www.hdbaset.org",
  "products.hdbaset.org",
  "fccid.io",
  "www.fccid.io",
  "creationnetworks.net",
  "www.creationnetworks.net",
  "manualzz.com",
  "www.manualzz.com",
  "aa-iot.com",
  "www.aa-iot.com",
  "manuals.plus",
  "www.manuals.plus"
]);

for (const host of String(process.env.LOOKUP_ALLOWED_SOURCE_HOSTS || "")
  .split(/[,\s]+/)
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean)) {
  ALLOWED_VENDOR_HOSTS.add(host);
}

function normalizeAllowedProductUrl(rawUrl, baseUrl = "") {
  const value = tidy(rawUrl);
  if (!value) return "";

  try {
    const parsed = baseUrl ? new URL(value, baseUrl) : new URL(value);

    if (parsed.protocol !== "https:") {
      return "";
    }

    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";

    const host = parsed.hostname.toLowerCase();
    let allowed = ALLOWED_VENDOR_HOSTS.has(host);

    if (!allowed) {
      for (const allowedHost of ALLOWED_VENDOR_HOSTS) {
        if (host.endsWith(`.${allowedHost}`)) {
          allowed = true;
          break;
        }
      }
    }

    if (!allowed) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function isAllowedCompetitorLookupUrl(rawUrl) {
  return Boolean(normalizeAllowedProductUrl(rawUrl));
}

function assertAllowedCompetitorLookupUrl(rawUrl) {
  if (isAllowedCompetitorLookupUrl(rawUrl)) {
    return;
  }

  throw new Error(`Competitor live lookup URL blocked by allowlist guard: ${String(rawUrl || "").slice(0, 160)}`);
}
/* COMPETITOR-LIVE-LOOKUP-ALLOWLIST-GUARD-END */
const DEFAULT_TIMEOUT_MS = Math.max(3500, Number(process.env.LOOKUP_TIMEOUT_MS || 9000));
const LIVE_DB_TTL_MS = Math.max(60_000, Number(process.env.LOOKUP_LIVE_DB_TTL_MS || 30 * 24 * 60 * 60 * 1000));
const MAX_FETCH_ATTEMPTS = Math.max(3, Number(process.env.LOOKUP_LIVE_MAX_ATTEMPTS || 14));


const BRAND_ADAPTERS = {
  crestron: {
    hosts: ["crestron.com", "www.crestron.com"],
    productUrls: (sku) => [`https://www.crestron.com/Products/Model/${encodeURIComponent(sku)}`],
    searchUrls: (sku) => [`https://www.crestron.com/search-results?query=${encodeURIComponent(sku)}`],
  },
  extron: {
    hosts: ["extron.com", "www.extron.com"],
    productUrls: (sku) => [`https://www.extron.com/product/${encodeURIComponent(normalizeId(sku))}`],
    searchUrls: (sku) => [`https://www.extron.com/search?searchterm=${encodeURIComponent(sku)}`],
  },
  atlona: {
    hosts: ["atlona.com", "www.atlona.com"],
    productUrls: (sku) => [`https://atlona.com/product/${encodeURIComponent(String(sku).toLowerCase())}/`],
    searchUrls: (sku) => [`https://atlona.com/?s=${encodeURIComponent(sku)}`],
  },
  kramer: {
    hosts: ["kramerav.com", "www.kramerav.com", "www1.kramerav.com"],
    productUrls: (sku) => [
      `https://www1.kramerav.com/Product/${encodeURIComponent(sku)}`,
      `https://www1.kramerav.com/us/product/${encodeURIComponent(String(sku).toLowerCase())}`,
    ],
    searchUrls: (sku) => [`https://www.kramerav.com/search?term=${encodeURIComponent(sku)}`],
  },
  blustream: {
    hosts: ["blustream.co.uk", "www.blustream.co.uk", "blustream-us.com", "www.blustream-us.com"],
    productUrls: (sku) => [
      `https://www.blustream.co.uk/product/${encodeURIComponent(sku)}`,
      `https://www.blustream-us.com/${encodeURIComponent(String(sku).toLowerCase())}`,
    ],
    searchUrls: (sku) => [
      `https://www.blustream.co.uk/search?q=${encodeURIComponent(sku)}`,
      `https://www.blustream-us.com/search?q=${encodeURIComponent(sku)}`,
    ],
  },
  lightware: {
    hosts: ["lightware.com", "www.lightware.com"],
    productUrls: (sku) => [
      `https://www.lightware.com/en/products/${encodeURIComponent(String(sku).toLowerCase())}`,
    ],
    searchUrls: (sku) => [`https://lightware.com/search?q=${encodeURIComponent(sku)}`],
  },
  zeevee: {
    hosts: ["zeevee.com", "www.zeevee.com"],
    productUrls: (sku) => [
      `https://www.zeevee.com/products/${encodeURIComponent(String(sku).toLowerCase())}`,
    ],
    searchUrls: (sku) => [`https://www.zeevee.com/?s=${encodeURIComponent(sku)}`],
  },
  barco: {
    hosts: ["barco.com", "www.barco.com"],
    productUrls: (sku) => [
      `https://www.barco.com/en/products/${encodeURIComponent(String(sku).toLowerCase())}`,
    ],
    searchUrls: (sku) => [`https://www.barco.com/en/search?query=${encodeURIComponent(sku)}`],
  },
  amx: {
    hosts: ["amx.com", "www.amx.com"],
    productUrls: (sku) => [
      `https://www.amx.com/en/search?keyword=${encodeURIComponent(sku)}`,
    ],
    searchUrls: (sku) => [`https://www.amx.com/en/search?keyword=${encodeURIComponent(sku)}`],
  },
  cyp: {
    hosts: ["cypeurope.com", "www.cypeurope.com"],
    productUrls: (sku) => [
      `https://www.cypeurope.com/product/${encodeURIComponent(String(sku).toLowerCase())}/`,
    ],
    searchUrls: (sku) => [`https://cypeurope.com/?s=${encodeURIComponent(sku)}`],
  },
  syelectronics: {
    hosts: ["sy.co.uk", "www.sy.co.uk"],
    productUrls: (sku) => [
      `https://www.sy.co.uk/product/${encodeURIComponent(String(sku).toLowerCase())}/`,
    ],
    searchUrls: (sku) => [`https://www.sy.co.uk/?s=${encodeURIComponent(sku)}`],
  },
  justaddpower: {
    hosts: ["justaddpower.com", "www.justaddpower.com"],
    productUrls: (sku) => [
      `https://www.justaddpower.com/products/${encodeURIComponent(String(sku).toLowerCase())}`,
    ],
    searchUrls: (sku) => [`https://www.justaddpower.com/search?q=${encodeURIComponent(sku)}`],
  },
  hdanywhere: {
    hosts: ["hdanywhere.com", "www.hdanywhere.com", "support.hdanywhere.com"],
    productUrls: (sku) => [
      `https://www.hdanywhere.com/product/${encodeURIComponent(String(sku).toLowerCase())}/`,
    ],
    searchUrls: (sku) => [`https://www.hdanywhere.com/?s=${encodeURIComponent(sku)}`],
  },
  turtleav: {
    hosts: ["turtleav.com", "www.turtleav.com"],
    productUrls: (sku) => [
      `https://www.turtleav.com/product/${encodeURIComponent(String(sku).toLowerCase())}/`,
    ],
    searchUrls: (sku) => [`https://turtleav.com/?s=${encodeURIComponent(sku)}`],
  },
  blackbox: {
    hosts: ["blackbox.com", "www.blackbox.com"],
    productUrls: (sku) => [
      `https://www.blackbox.com/en-us/search?text=${encodeURIComponent(sku)}`,
    ],
    searchUrls: (sku) => [`https://www.blackbox.com/en-us/search?text=${encodeURIComponent(sku)}`],
  },
  datapath: {
    hosts: ["datapath.co.uk", "www.datapath.co.uk"],
    productUrls: (sku) => [
      `https://www.datapath.co.uk/product/${encodeURIComponent(String(sku).toLowerCase())}`,
    ],
    searchUrls: (sku) => [`https://www.datapath.co.uk/?s=${encodeURIComponent(sku)}`],
  },
  matroxvideo: {
    hosts: ["matrox.com", "www.matrox.com", "video.matrox.com"],
    productUrls: (sku) => [
      `https://video.matrox.com/en/products/${encodeURIComponent(String(sku).toLowerCase())}`,
    ],
    searchUrls: (sku) => [`https://video.matrox.com/en/search?keys=${encodeURIComponent(sku)}`],
  },
  qsys: {
    hosts: ["qsys.com", "www.qsys.com"],
    productUrls: (sku) => [
      `https://www.qsys.com/ecosystem/product/${encodeURIComponent(String(sku).toLowerCase())}/`,
    ],
    searchUrls: (sku) => [`https://www.qsys.com/search/?q=${encodeURIComponent(sku)}`],
  },
};

function tidy(value) {
  return String(value ?? "").trim();
}

function normalise(value) {
  return tidy(value).toLowerCase();
}

function normalizeId(value) {
  return normalise(value).replace(/[^a-z0-9]+/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function makeLookupKey(manufacturer, model, productUrl) {
  return [
    normalizeId(manufacturer),
    normalizeId(model),
    tidy(productUrl),
  ].filter(Boolean).join("|");
}

function adapterForManufacturer(manufacturer) {
  const key = normalizeId(manufacturer);
  return BRAND_ADAPTERS[key] || null;
}

function uniqueStrings(values) {
  return [...new Set(values.map((item) => tidy(item)).filter(Boolean))];
}

async function readJsonFile(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function readLiveDb() {
  const db = await readJsonFile(LIVE_LOOKUP_DB_FILE, null);
  if (db && typeof db === "object" && db.records && typeof db.records === "object") return db;
  return {
    version: 2,
    updatedAt: nowIso(),
    records: {},
  };
}

async function writeLiveDb(db) {
  const next = {
    ...db,
    version: 2,
    updatedAt: nowIso(),
  };
  await writeJsonFile(LIVE_LOOKUP_DB_FILE, next);
}

function isFreshRecord(record) {
  const saved = Date.parse(String(record?.fetchedAt || ""));
  if (!Number.isFinite(saved)) return false;
  return Date.now() - saved <= LIVE_DB_TTL_MS;
}

function asCachedPayload(record, cacheType) {
  return {
    ok: Boolean(record?.ok),
    manufacturer: record?.manufacturer || "",
    model: record?.model || "",
    resolvedUrl: record?.resolvedUrl || "",
    title: record?.title || "",
    summary: record?.summary || "",
    keySpecs: Array.isArray(record?.keySpecs) ? record.keySpecs : [],
    technologyProfile: record?.technologyProfile && typeof record.technologyProfile === "object"
      ? record.technologyProfile
      : null,
    structuredSpecs: record?.structuredSpecs && typeof record.structuredSpecs === "object"
      ? record.structuredSpecs
      : null,
    sources: Array.isArray(record?.sources) ? record.sources : [],
    sourceUrls: Array.isArray(record?.sourceUrls) ? record.sourceUrls : [],
    text: record?.text || "",
    html: "",
    cacheHit: true,
    cacheType,
    fetchedAt: record?.fetchedAt || nowIso(),
    localDatabaseFile: LIVE_LOOKUP_DB_FILE,
  };
}

function decodeBasicEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function flattenHtmlToText(html) {
  return decodeBasicEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html, fallback = "") {
  const m = String(html || "").match(/<title[^>]*>(.*?)<\/title>/i);
  return tidy(decodeBasicEntities(m?.[1] || fallback));
}

function extractMetaDescription(html) {
  const source = String(html || "");
  const patterns = [
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']description["'][^>]*>/i,
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["'][^>]*>/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const m = source.match(pattern);
    if (m?.[1]) return tidy(decodeBasicEntities(m[1]));
  }

  return "";
}

function isBlockedVendorPage(text, html) {
  const blob = `${html || ""} ${text || ""}`.toLowerCase();
  return (
    blob.includes("request rejected") ||
    blob.includes("bot defense") ||
    blob.includes("your support id is") ||
    blob.includes("access denied") ||
    blob.includes("forbidden") ||
    blob.includes("temporarily unavailable") ||
    blob.includes("captcha") ||
    blob.includes("cloudflare")
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    assertAllowedCompetitorLookupUrl(url);
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 WingmanLiveLookup/2.0",
        Accept: "text/html, text/plain, application/xhtml+xml, application/pdf;q=0.8, */*;q=0.5",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeHttpsUrl(rawUrl, baseUrl = "") {
  return normalizeAllowedProductUrl(rawUrl, baseUrl);
}

function buildSearchEngineUrls(adapter, sku) {
  if (!adapter?.hosts?.length || !sku) return [];
  const host = adapter.hosts[0];

  return [
    `https://www.bing.com/search?q=${encodeURIComponent(`site:${host} "${sku}"`)}`,
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${host} "${sku}"`)}`,
  ];
}

function buildTrustedReferenceSourceUrls(manufacturer, model) {
  const sku = tidy(model);
  const brand = tidy(manufacturer);

  if (!sku) return [];

  const searchPhrase = [brand, sku].filter(Boolean).join(" ");

  return [
    // AVITdirect contains useful reseller/source catalogue records across video products.
    `https://avitdirect.co.uk/search?q=${encodeURIComponent(searchPhrase)}`,
    `https://avitdirect.co.uk/search?q=${encodeURIComponent(sku)}`,

    // Search high-signal public catalogues and document repositories before
    // community sources. The search engine result is discovery evidence only;
    // extracted specifications must come from an allowed destination page.
    `https://www.bing.com/search?q=${encodeURIComponent(`"${searchPhrase}" (site:av-iq.com OR site:fullcompass.com OR site:bhphotovideo.com OR site:markertek.com)`)}`,
    `https://www.bing.com/search?q=${encodeURIComponent(`"${searchPhrase}" (site:manualslib.com OR site:device.report OR site:hdbaset.org OR site:fccid.io)`)}`,

    // General search discovery sources. These are information discovery sources, not competitor vendors.
    `https://www.bing.com/search?q=${encodeURIComponent(`${searchPhrase} datasheet product page specifications`)}`,
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${searchPhrase} datasheet product page specifications`)}`,

    // Alternative reference sources. These are useful for context, issue patterns, terminology,
    // manufacturer background and real-world feedback, but should not overrule official datasheets.
    `https://www.reddit.com/search/?q=${encodeURIComponent(`${searchPhrase} AV product issue review integration`)}`,
    `https://old.reddit.com/search?q=${encodeURIComponent(`${searchPhrase} AV product issue review integration`)}`,
    `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(`${brand} ${sku}`)}`,
    `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(`${brand} AV over IP HDMI matrix video distribution`)}`,
  ];
}

function buildInitialUrls(manufacturer, model, productUrl) {
  const adapter = adapterForManufacturer(manufacturer);
  const sku = tidy(model);

  const urls = [];
  const explicit = normalizeHttpsUrl(productUrl);
  if (explicit) urls.push({ url: explicit, kind: "explicit-url" });

  if (adapter && sku) {
    for (const url of adapter.productUrls?.(sku) || []) {
      const normalized = normalizeHttpsUrl(url);
      if (normalized) urls.push({ url: normalized, kind: "vendor-product" });
    }

    for (const url of adapter.searchUrls?.(sku) || []) {
      const normalized = normalizeHttpsUrl(url);
      if (normalized) urls.push({ url: normalized, kind: "vendor-search" });
    }

    for (const url of buildSearchEngineUrls(adapter, sku)) {
      const normalized = normalizeHttpsUrl(url);
      if (normalized) urls.push({ url: normalized, kind: "search-engine" });
    }
  }

  for (const url of buildTrustedReferenceSourceUrls(manufacturer, model)) {
    const normalized = normalizeHttpsUrl(url);
    if (normalized && normalized.includes("reddit.com")) urls.push({ url: normalized, kind: "community-reference-source" });
    if (normalized && normalized.includes("wikipedia.org")) urls.push({ url: normalized, kind: "encyclopedia-reference-source" });
    if (normalized && !normalized.includes("reddit.com") && !normalized.includes("wikipedia.org")) urls.push({ url: normalized, kind: "trusted-reference-source" });
  }

  const seen = new Set();
  return urls.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function extractHrefValues(html) {
  const source = String(html || "");
  const values = [];
  const hrefPattern = /href\s*=\s*["']([^"']+)["']/gi;
  let match = hrefPattern.exec(source);

  while (match) {
    if (match[1]) values.push(decodeBasicEntities(match[1]));
    match = hrefPattern.exec(source);
  }

  return values;
}

function unwrapSearchRedirect(rawUrl) {
  const value = tidy(rawUrl);

  try {
    const parsed = new URL(value);
    const q = parsed.searchParams.get("q") || parsed.searchParams.get("u") || parsed.searchParams.get("uddg");
    if (q && q.startsWith("https://")) return q;
  } catch {
  }

  return value;
}

function extractCandidateLinks(html, currentUrl, adapter, model) {
  const skuSquash = normalizeId(model);
  const links = [];

  for (const href of extractHrefValues(html)) {
    let absoluteHref = href;
    try {
      absoluteHref = new URL(href, currentUrl).toString();
    } catch {
    }
    const unwrapped = unwrapSearchRedirect(absoluteHref);
    const normalized = normalizeHttpsUrl(unwrapped, currentUrl);
    if (!normalized) continue;

    // The URL has already passed the public-source allowlist guard.
    // Do not restrict discovered links to only the primary vendor domain, because source pages
    // such as AVITdirect, distributor catalogues and search result pages can legitimately point
    // to useful product pages, datasheets and manufacturer records.
    const linkSquash = normalizeId(normalized);
    const useful =
      !skuSquash ||
      linkSquash.includes(skuSquash) ||
      linkSquash.includes("product") ||
      linkSquash.includes("model") ||
      linkSquash.includes("download") ||
      linkSquash.includes("datasheet") ||
      linkSquash.includes("manual");

    if (useful) links.push(normalized);
  }

  return uniqueStrings(links).slice(0, 8);
}

function scorePage({ url, title, text, model, kind }) {
  const blob = normalise(`${url} ${title} ${text}`);
  const sku = normalise(model);
  const skuSquash = normalizeId(model);

  let score = 0;

  if (kind === "explicit-url") score += 20;
  if (kind === "vendor-product") score += 18;
  if (blob.includes(sku)) score += 35;
  if (normalizeId(blob).includes(skuSquash)) score += 25;
  if (normalise(title).includes(sku)) score += 20;
  if (/\b4k\b|\b8k\b|\bhdbaset\b|\bav over ip\b|\bencoder\b|\bdecoder\b|\bmatrix\b|\bswitcher\b|\busb\b|\bmultiview\b|\bvideo wall\b/.test(blob)) score += 20;
  if (blob.includes("datasheet") || blob.includes("specification") || blob.includes("specifications")) score += 12;
  if (/\b(?:av-iq|fullcompass|markertek|bhphotovideo|midwich|exertis|proav)\b/i.test(url)) score += 8;
  if (/\b(?:manualslib|device\.report|hdbaset\.org|fccid\.io)\b/i.test(url)) score += 10;

  // Community and encyclopaedia sources are useful supporting evidence, but should not outrank
  // manufacturer product pages, datasheets or distributor product pages for exact specification matching.
  if (url.includes("reddit.com")) score -= 18;
  if (url.includes("wikipedia.org")) score -= 14;
  if (kind === "community-reference-source") score -= 18;
  if (kind === "encyclopedia-reference-source") score -= 14;

  if (blob.length < 500) score -= 25;
  if (blob.includes("search results")) score -= 10;

  return score;
}

function sourceAuthority(url, kind = "") {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = normalise(url).split("/")[0];
  }
  if (/reddit\.com/.test(host) || kind === "community-reference-source") return { type: "community", tier: 4 };
  if (/wikipedia\.org/.test(host) || kind === "encyclopedia-reference-source") return { type: "encyclopedia", tier: 4 };
  if (/bing\.com|duckduckgo\.com/.test(host) || /search/i.test(kind)) return { type: "discovery-only", tier: 5 };
  if (/hdbaset\.org|fccid\.io/.test(host)) return { type: "standards-or-certification", tier: 1 };
  if (/manualslib\.com|manuals\.plus|manualzz\.com|device\.report|aa-iot\.com/.test(host)) return { type: "document-repository", tier: 2 };
  if (/av-iq\.com|fullcompass\.com|markertek\.com|bhphotovideo\.com|midwich\.com|exertis\.co\.uk|proav\.co\.uk|creationnetworks\.net|touchboards\.com|cdw\.com|connection\.com|avitdirect\.co\.uk/.test(host)) {
    return { type: "distributor-or-reseller", tier: 2 };
  }
  return { type: "manufacturer-or-product-document", tier: 1 };
}

function extractSentences(text) {
  return tidy(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|[\r\n]+/)
    .map((item) => tidy(item))
    .filter((item) => item.length > 18);
}

function extractKeySpecs(text) {
  const wanted = [
    "4k",
    "8k",
    "hdcp",
    "hdmi",
    "hdbaset",
    "av over ip",
    "usb",
    "usb-c",
    "matrix",
    "encoder",
    "decoder",
    "transmitter",
    "receiver",
    "scaler",
    "multiview",
    "video wall",
    "dante",
    "aes67",
    "hdr",
    "dolby",
    "audio",
    "ethernet",
    "poe",
  ];

  const specs = [];
  for (const sentence of extractSentences(text)) {
    const lower = sentence.toLowerCase();
    if (wanted.some((token) => lower.includes(token))) specs.push(sentence.slice(0, 260));
    if (specs.length >= 16) break;
  }

  return specs;
}

/**
 * Extract structured spec fields from raw product text.
 * Returns an object with I/O counts, resolution, transport, role, and
 * confidence scores for each extracted field.
 */
function extractStructuredSpecs(text, manufacturer = "", model = "") {
  const blob = `${manufacturer} ${model} ${text}`.toLowerCase();
  const result = {
    inputCount: null,
    outputCount: null,
    maxResolution: "",
    resolutionRank: 0,
    chroma: "",
    transport: "",
    role: "",
    confidence: {},
  };

  // Input/output counts — look for patterns like "8x8", "4 inputs", "2 HDMI outputs"
  const matrixMatch = blob.match(/\b(\d{1,2})\s*[x×]\s*(\d{1,2})\b/);
  if (matrixMatch) {
    result.inputCount = Number(matrixMatch[1]);
    result.outputCount = Number(matrixMatch[2]);
    result.confidence.inputCount = "high";
    result.confidence.outputCount = "high";
  } else {
    const inMatch = blob.match(/\b(\d{1,2})\s*(?:routed\s+)?(?:hdmi\s+)?(?:source\s+)?input/i);
    const outMatch = blob.match(/\b(\d{1,2})\s*(?:routed\s+)?(?:hdmi\s+|hdbaset\s+|display\s+)?output/i);
    if (inMatch) { result.inputCount = Number(inMatch[1]); result.confidence.inputCount = "medium"; }
    if (outMatch) { result.outputCount = Number(outMatch[1]); result.confidence.outputCount = "medium"; }
  }

  // Resolution
  const resPatterns = [
    { re: /\b8k\b|7680.*4320/i, rank: 7, label: "8K" },
    { re: /4k\s*@?\s*120|2160p.*120/i, rank: 6, label: "4K120" },
    { re: /4k\s*60\s*4\s*:\s*4\s*:\s*4|4k60.*4:4:4/i, rank: 5, label: "4K60 4:4:4" },
    { re: /4k\s*60|2160p.*60|3840.*2160.*60/i, rank: 4, label: "4K60" },
    { re: /4k\s*30|2160p.*30|\b4k\b|uhd/i, rank: 3, label: "4K" },
    { re: /1080p|1920.*1080|full\s*hd/i, rank: 2, label: "1080p" },
    { re: /720p|1280.*720/i, rank: 1, label: "720p" },
  ];
  for (const { re, rank, label } of resPatterns) {
    if (re.test(blob)) {
      result.maxResolution = label;
      result.resolutionRank = rank;
      result.confidence.resolution = "high";
      break;
    }
  }

  // Chroma
  if (/4\s*:\s*4\s*:\s*4|444/i.test(blob)) { result.chroma = "4:4:4"; result.confidence.chroma = "high"; }
  else if (/4\s*:\s*2\s*:\s*2|422/i.test(blob)) { result.chroma = "4:2:2"; result.confidence.chroma = "high"; }
  else if (/4\s*:\s*2\s*:\s*0|420/i.test(blob)) { result.chroma = "4:2:0"; result.confidence.chroma = "high"; }

  // Transport
  if (/hdbase[-\s]?t|hdbt/i.test(blob)) { result.transport = "HDBaseT"; result.confidence.transport = "high"; }
  else if (/av\s*over\s*ip|avoip|sdvoe|networkhd|1gbe|10gbe/i.test(blob)) { result.transport = "AVoIP"; result.confidence.transport = "high"; }
  else if (/\bhdmi\b/i.test(blob) && !/hdbase|network|wireless/i.test(blob)) { result.transport = "HDMI"; result.confidence.transport = "medium"; }
  else if (/wireless|casting|wifi/i.test(blob)) { result.transport = "Wireless"; result.confidence.transport = "medium"; }

  // Role
  if (/\bencoder\b|\btransmitter\b|\bsource\s*side/i.test(blob) && !/\bdecoder\b|\breceiver\b/i.test(blob)) { result.role = "encoder"; result.confidence.role = "high"; }
  else if (/\bdecoder\b|\breceiver\b|\bdisplay\s*side/i.test(blob) && !/\bencoder\b|\btransmitter\b/i.test(blob)) { result.role = "decoder"; result.confidence.role = "high"; }
  else if (/\btransceiver\b|\bbidirectional/i.test(blob)) { result.role = "transceiver"; result.confidence.role = "high"; }
  else if (/\bmatrix\b/i.test(blob)) { result.role = "matrix"; result.confidence.role = "medium"; }
  else if (/\bswitcher\b|\bswitch\b/i.test(blob)) { result.role = "switcher"; result.confidence.role = "medium"; }
  else if (/\bextender\b|\bextension\b/i.test(blob)) { result.role = "extender"; result.confidence.role = "medium"; }
  else if (/\bsplitter\b|\bdistribution/i.test(blob)) { result.role = "splitter"; result.confidence.role = "medium"; }
  else if (/\bvideo\s*wall/i.test(blob)) { result.role = "video-wall"; result.confidence.role = "medium"; }
  else if (/\bmultiview/i.test(blob)) { result.role = "multiview"; result.confidence.role = "medium"; }

  return result;
}

function summarizeText(html, text, model) {
  const meta = extractMetaDescription(html);
  if (meta) return meta.slice(0, 520);

  const sentences = extractSentences(text);
  const modelLower = normalise(model);
  const modelSentence = sentences.find((sentence) => normalise(sentence).includes(modelLower));
  if (modelSentence) return modelSentence.slice(0, 520);

  return tidy(text).slice(0, 520);
}

async function extractPdfDocument(buffer) {
  const document = await getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false, isEvalSupported: false }).promise;
  let metadataTitle = "";
  try {
    const metadata = await document.getMetadata();
    metadataTitle = tidy(metadata?.info?.Title || metadata?.metadata?.get?.("dc:title") || "");
  } catch {
    // A missing or malformed metadata dictionary must not prevent text extraction.
  }
  const pages = [];
  const pageLimit = Math.min(document.numPages, 30);
  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => tidy(item.str)).filter(Boolean).join(" "));
  }
  return {
    text: pages.join("\n").replace(/\s+/g, " ").trim(),
    metadataTitle,
  };
}

async function fetchCandidatePage(item, adapter, model) {
  const startedAt = Date.now();

  try {
    assertAllowedCompetitorLookupUrl(item.url);
    const response = await fetchWithTimeout(item.url);
    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return {
        ok: false,
        url: item.url,
        kind: item.kind,
        status,
        error: `HTTP ${status}`,
        elapsedMs: Date.now() - startedAt,
      };
    }

    // Some document URLs return an HTML bot/challenge or redirect page while
    // retaining a .pdf suffix. Trust the response MIME type when it explicitly
    // says HTML; otherwise use the suffix as a fallback for generic binary MIME.
    const isPdf = contentType.includes("application/pdf") ||
      (/\.pdf(?:$|[?#])/i.test(item.url) && !contentType.includes("html") && !contentType.includes("text"));
    if (!isPdf && !contentType.includes("text") && !contentType.includes("html") && !contentType.includes("xml")) {
      return {
        ok: false,
        url: item.url,
        kind: item.kind,
        status,
        error: `Unsupported content type ${contentType}`,
        elapsedMs: Date.now() - startedAt,
      };
    }

    const html = isPdf ? "" : await response.text();
    const pdf = isPdf ? await extractPdfDocument(await response.arrayBuffer()) : null;
    const text = isPdf ? pdf.text : flattenHtmlToText(html);
    const identityTitle = isPdf ? pdf.metadataTitle : extractTitle(html, "");
    const title = identityTitle || (isPdf ? "Technical document" : tidy(model));

    if (isBlockedVendorPage(text, html)) {
      return {
        ok: false,
        url: item.url,
        kind: item.kind,
        status,
        title,
        error: "Vendor site blocked automated lookup.",
        elapsedMs: Date.now() - startedAt,
      };
    }

    const score = scorePage({ url: item.url, title: identityTitle, text, model, kind: item.kind });
    const discoveredLinks = extractCandidateLinks(html, item.url, adapter, model);

    return {
      ok: true,
      url: item.url,
      kind: item.kind,
      status,
      title,
      identityTitle,
      html,
      text,
      score,
      discoveredLinks,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      url: item.url,
      kind: item.kind,
      status: 0,
      error: error instanceof Error ? error.message : "Fetch failed",
      elapsedMs: Date.now() - startedAt,
    };
  }
}

async function saveLookupRecord(key, record) {
  const db = await readLiveDb();
  db.records[key] = record;
  await writeLiveDb(db);
}

function buildReturnRecord({ manufacturer, model, productUrl, pages, attempts }) {
  const successful = pages.filter((page) => page.ok).sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const modelKey = normalizeId(model);
  const specificationPages = successful.filter((page) => {
    // `page.title` may be a harmless display fallback. Identity must come from
    // the source URL, actual HTML/PDF metadata, or extracted source text.
    const exactModel = !modelKey || normalizeId(`${page.url} ${page.identityTitle || ""} ${page.text}`).includes(modelKey);
    const technicalSignal = /\b(?:inputs?|outputs?|resolution|hdmi\s*\d|hdcp\s*\d|hdbase[-\s]?t|usb\s*\d|bandwidth|datasheet|technical specifications?)\b/i.test(page.text || "");
    const discoveryOnly =
      /bing\.com|duckduckgo\.com|reddit\.com|wikipedia\.org/i.test(page.url) ||
      /search/i.test(page.kind || "") ||
      /[/?&](?:s|q|query|term|search)=/i.test(page.url);
    return exactModel && technicalSignal && String(page.text || "").length >= 500 && !discoveryOnly && Number(page.score || 0) >= 45;
  });
  const evidencePages = specificationPages;
  const bestEvidence = evidencePages[0];
  const aggregateText = evidencePages.map((page) => page.text).join(" ").replace(/\s+/g, " ").trim();
  const bestHtml = bestEvidence?.html || "";
  const bestText = bestEvidence?.text || aggregateText;
  const title = tidy(bestEvidence?.title || model);
  const summary = summarizeText(bestHtml, bestText, model);
  const keySpecs = extractKeySpecs(aggregateText || bestText);
  const sourceUrls = uniqueStrings(evidencePages.map((page) => page.url));
  const technologyProfile = normaliseProductTechnology({
    manufacturer,
    model,
    sku: model,
    title,
    summary,
    rawText: aggregateText || bestText,
    features: keySpecs,
    sourceUrl: bestEvidence?.url || productUrl || sourceUrls[0] || "",
  });

  // Extract structured spec fields from the aggregated text.
  // These give the compare engine actionable I/O counts, resolution, transport
  // and role data instead of forcing it to re-parse raw text.
  const structuredSpecs = extractStructuredSpecs(aggregateText || bestText, manufacturer, model);

  return {
    ok: Boolean(bestEvidence),
    manufacturer,
    model,
    productUrl,
    resolvedUrl: bestEvidence?.url || productUrl || "",
    title,
    summary,
    keySpecs,
    technologyProfile,
    structuredSpecs,
    sources: attempts.map((attempt) => ({
      url: attempt.url,
      label: attempt.kind,
      ...sourceAuthority(attempt.url, attempt.kind),
      status: attempt.ok ? "ok" : attempt.error || `HTTP ${attempt.status || 0}`,
      score: Number(attempt.score || 0),
    })),
    sourceUrls,
    text: aggregateText.slice(0, 40_000),
    html: bestHtml.slice(0, 80_000),
    cacheHit: false,
    fetchedAt: nowIso(),
    localDatabaseFile: LIVE_LOOKUP_DB_FILE,
  };
}

export async function resolveCompetitorLiveLookup(payload = {}) {
  const manufacturer = tidy(payload.manufacturer || payload.brand);
  const model = tidy(payload.model || payload.sku);
  const productUrl = tidy(payload.productUrl || payload.url);
  const forceRefresh = Boolean(payload.forceRefresh);

  if (!model && !productUrl) {
    return {
      ok: false,
      error: "No competitor model or productUrl supplied.",
      cacheHit: false,
      fetchedAt: nowIso(),
      localDatabaseFile: LIVE_LOOKUP_DB_FILE,
    };
  }

  const key = makeLookupKey(manufacturer, model, productUrl);
  const memoryRecord = LIVE_LOOKUP_MEMORY_CACHE.get(key);

  if (!forceRefresh && memoryRecord && isFreshRecord(memoryRecord)) {
    return asCachedPayload(memoryRecord, "memory");
  }

  const db = await readLiveDb();
  const dbRecord = db.records?.[key];

  if (!forceRefresh && dbRecord && isFreshRecord(dbRecord)) {
    LIVE_LOOKUP_MEMORY_CACHE.set(key, dbRecord);
    return asCachedPayload(dbRecord, "local-json-db");
  }

  const adapter = adapterForManufacturer(manufacturer);
  const queue = buildInitialUrls(manufacturer, model, productUrl);
  const seen = new Set(queue.map((item) => item.url));
  const attempts = [];
  const pages = [];

  let cursor = 0;
  while (cursor < queue.length && attempts.length < MAX_FETCH_ATTEMPTS) {
    const item = queue[cursor];
    cursor += 1;

    const attempt = await fetchCandidatePage(item, adapter, model);
    attempts.push(attempt);

    if (attempt.ok) {
      pages.push(attempt);

      for (const discovered of attempt.discoveredLinks || []) {
        if (seen.has(discovered)) continue;
        seen.add(discovered);
        // Search results are useful only if we actually visit their destination.
        // Put exact-SKU discoveries immediately after the current attempt instead
        // of behind the long tail of generic fallback searches, which otherwise
        // exhausts MAX_FETCH_ATTEMPTS before a product page is reached.
        queue.splice(cursor, 0, { url: discovered, kind: "discovered-product-link" });
      }
    }
  }

  const result = buildReturnRecord({ manufacturer, model, productUrl, pages, attempts });
  const recordForDb = {
    ...result,
    html: "",
  };

  if (result.ok) {
    LIVE_LOOKUP_MEMORY_CACHE.set(key, recordForDb);
    await saveLookupRecord(key, recordForDb);
    return result;
  }

  await saveLookupRecord(key, {
    ...recordForDb,
    error: "No usable live source could be resolved.",
  });

  return {
    ...result,
    error: "No usable live source could be resolved.",
  };
}

// Narrowly exposed for deterministic contract tests. These helpers contain no
// network or persistence behaviour; keeping their tests close to the lookup
// boundary prevents discovery/search pages from becoming product evidence.
export const __liveLookupTest = Object.freeze({
  buildReturnRecord,
  extractCandidateLinks,
  normalizeAllowedProductUrl,
  sourceAuthority,
});
