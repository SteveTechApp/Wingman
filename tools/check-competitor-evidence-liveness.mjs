/**
 * Competitor evidence liveness gate (repeatable) - the competitor side of the
 * WyreStorm evidence gate (tools/check-wyrestorm-evidence-liveness.mjs).
 *
 * Live-checks every unique evidence URL carried by the APPROVED decisions in
 * the governed competitor ledger (data/governance/competitor-match-decisions.json)
 * so an approved decision's official source cannot silently rot or move while
 * the decision stays promoted into what a rep sees.
 *
 * Gate contract (exit non-zero):
 *   - "dead": the page returned 404/410 - the evidence URL no longer exists.
 *   - "moved": an HTML page redirected to a different product slug - the page
 *     now belongs to another product, so the evidence no longer proves this
 *     competitor SKU. PDF datasheets are exempt: serving them from a content
 *     CDN (e.g. adn.harmanpro.com) legitimately changes the path.
 *
 * Content verification for a live (200) page, in order:
 *   1. PDF datasheet (content-type or %PDF magic) -> live.
 *   2. JSON-LD Product block or og:url whose slug matches the final URL's
 *      slug (Shopify-style product pages that name the product, not the SKU).
 *   3. The citing SKU appears in the fetched HTML.
 *   4. A client-rendered shell (tiny HTML with an empty #root) -> "js-shell":
 *      reported as context, never a gate failure - the page cannot be
 *      verified by a direct fetch (the Atlona/Hall Research product pages
 *      serve the identical shell for every URL, so a byte check cannot tell a
 *      real page from a soft-404; the approval notes record the canonical
 *      source, confirmed via the search-engine index).
 *   5. Otherwise -> "suspicious": page loads but shows no product evidence.
 *
 * Transient conditions (server errors, bot-blocking 4xx, timeouts) are
 * warnings, not failures, so a flaky network cannot take the gate down.
 *
 * Output: reports/competitor-evidence-liveness.json + a summary on stdout.
 *
 * Usage: node tools/check-competitor-evidence-liveness.mjs
 *
 * Env overrides (for hermetic validation): WINGMAN_DECISIONS_FILE.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DECISIONS_FILE = process.env.WINGMAN_DECISIONS_FILE ?? path.join(root, "data/governance/competitor-match-decisions.json");
const REPORT_FILE = path.join(root, "reports/competitor-evidence-liveness.json");

const FETCH_TIMEOUT_MS = 10000;
const CONCURRENCY = 8;

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

function slugFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, "");
    return decodeURIComponent(pathname.split("/").pop() ?? "");
  } catch {
    return "";
  }
}

function sameProductSlug(leftUrl, rightUrl) {
  const left = slugFromUrl(leftUrl);
  const right = slugFromUrl(rightUrl);
  if (!left || !right) return true; // cannot compare - do not cry wolf
  return left.toLowerCase() === right.toLowerCase();
}

function isPdf(response, html) {
  const contentType = String(response.headers.get("content-type") ?? "");
  return /application\/pdf/i.test(contentType) || html.slice(0, 1024).includes("%PDF");
}

/** Shopify-style product pages name the product (JSON-LD), not the SKU. */
function jsonLdOrOgMatches(html, finalUrl) {
  const finalSlug = slugFromUrl(finalUrl);
  if (!finalSlug) return false;

  const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of jsonLdBlocks) {
    const payload = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(payload);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of candidates) {
        const product = entry["@type"] === "Product" ? entry : entry["@graph"]?.find?.((item) => item["@type"] === "Product");
        if (product && sameProductSlug(String(product.url ?? ""), finalUrl)) return true;
      }
    } catch {
      // Not a JSON block - ignore and keep scanning.
    }
  }

  const ogUrl = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1];
  return Boolean(ogUrl && sameProductSlug(ogUrl, finalUrl));
}

/** A client-rendered shell serves the same tiny HTML for every URL. */
function isJsShell(html) {
  return html.length < 10000 && /<div[^>]*id=["']root["'][^>]*>\s*<\/div>/i.test(html);
}

function extractTitle(html, sku) {
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);

  return cleanText(h1Match?.[1] || ogTitleMatch?.[1] || titleMatch?.[1] || "")
    .replace(new RegExp(`^${sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–—:]?\\s*`, "i"), "")
    .replace(/\s*[|–—]\s*(AMX|Atlona|Hall Research|AVPro( Edge| Global)?|WyreStorm|.*\.com).*$/i, "")
    .trim();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "WingmanCompetitorEvidenceLivenessCheck/1.0",
        accept: "text/html,application/xhtml+xml,application/xml,application/pdf;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function skuMentionedOnPage(html, skus) {
  return skus.some((sku) => new RegExp(sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(html));
}

async function checkUrl(manufacturer, skus, url) {
  const result = {
    manufacturer,
    sku: skus[0],
    skus,
    url,
    status: 0,
    kind: "unreachable",
    finalUrl: url,
    title: "",
    warning: "",
  };

  let response;

  try {
    response = await fetchWithTimeout(url);
  } catch (error) {
    result.warning = error?.name === "AbortError" ? "Request timed out" : (error instanceof Error ? error.message : "Network error");
    return result;
  }

  result.status = response.status;
  result.finalUrl = response.url || url;

  if (response.ok) {
    result.kind = "live";
    const html = await response.text().catch(() => "");
    result.title = extractTitle(html, skus[0]);

    if (isPdf(response, html)) {
      return result; // Datasheet PDFs - redirects to a CDN are how they are served.
    }

    if (!sameProductSlug(url, result.finalUrl)) {
      result.kind = "moved";
      result.warning = `HTML page redirected to ${result.finalUrl}, which points at a different product slug.`;
      return result;
    }

    if (jsonLdOrOgMatches(html, result.finalUrl) || skuMentionedOnPage(html, skus)) {
      return result;
    }

    if (isJsShell(html)) {
      result.warning = "Client-rendered shell - content cannot be verified by a direct fetch (JS SPA); confirm via the search-engine index.";
      return result;
    }

    result.warning = `Page loads but mentions none of ${skus.length === 1 ? "its SKU" : "the citing SKUs"} (${skus.join(", ")}) and carries no matching product metadata - verify the page is still this product.`;
    return result;
  }

  if (response.status === 404 || response.status === 410) {
    result.kind = "dead";
    result.warning = `Official page returned ${response.status}.`;
    return result;
  }

  if (response.status >= 500) {
    result.kind = "server-error";
    result.warning = `Official page returned ${response.status} (may be transient).`;
    return result;
  }

  result.kind = "blocked";
  result.warning = `Official page returned ${response.status} (bot protection or access denied).`;
  return result;
}

async function mapWithConcurrency(items, worker) {
  const results = new Array(items.length);

  for (let offset = 0; offset < items.length; offset += CONCURRENCY) {
    const batch = items.slice(offset, offset + CONCURRENCY);
    const settled = await Promise.all(batch.map(worker));
    settled.forEach((value, index) => {
      results[offset + index] = value;
    });
  }

  return results;
}

async function main() {
  const raw = JSON.parse(await readFile(DECISIONS_FILE, "utf8"));
  const ledger = Array.isArray(raw) ? { decisions: raw } : raw;
  const decisions = Array.isArray(ledger.decisions) ? ledger.decisions : [];

  const approved = decisions.filter((decision) => decision.reviewStatus === "approved");
  const urlToSkus = new Map();
  const urlToManufacturer = new Map();

  for (const decision of approved) {
    for (const evidence of decision.evidence ?? []) {
      if (evidence?.sourceUrl) {
        const skus = urlToSkus.get(evidence.sourceUrl) ?? [];
        skus.push(decision.competitorSku);
        urlToSkus.set(evidence.sourceUrl, skus);
        urlToManufacturer.set(evidence.sourceUrl, decision.competitorManufacturer);
      }
    }
  }

  const urls = [...urlToSkus.keys()].sort();
  const results = await mapWithConcurrency(urls, (url) => checkUrl(urlToManufacturer.get(url), urlToSkus.get(url), url));

  const summary = { live: 0, dead: 0, moved: 0, blocked: 0, "server-error": 0, unreachable: 0 };
  for (const result of results) summary[result.kind] += 1;

  const gateFailures = results.filter((result) => result.kind === "dead" || result.kind === "moved");
  // Shells and suspicious pages are live pages whose content the gate cannot
  // (or does not) confirm - counted under live, listed separately for humans.
  const shells = results.filter((result) => result.kind === "live" && result.warning && isJsShellWarning(result.warning));
  const suspicious = results.filter((result) => result.kind === "live" && result.warning && !shells.includes(result));
  const transient = results.filter((result) => result.kind === "blocked" || result.kind === "server-error" || result.kind === "unreachable");

  const report = {
    generatedAt: new Date().toISOString(),
    approvedDecisionCount: approved.length,
    evidenceUrlCount: urls.length,
    summary,
    gateFailures,
    shells,
    suspicious,
    transient,
  };

  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Approved decision evidence URLs checked: ${urls.length} (from ${approved.length} approved decisions)`);
  console.log(`Live: ${summary.live} | Dead: ${summary.dead} | Moved: ${summary.moved} | Blocked: ${summary.blocked} | Server error: ${summary["server-error"]} | Unreachable: ${summary.unreachable}`);
  console.log(`Of the live pages: ${shells.length} client-rendered shells (content unverifiable by direct fetch) | ${suspicious.length} suspicious`);

  for (const failure of gateFailures) {
    console.error(`GATE FAIL - ${failure.kind.toUpperCase()}: ${failure.manufacturer} ${failure.sku} ${failure.url} (${failure.warning})`);
  }
  if (shells.length) {
    console.warn(`JS-rendered shells (content unverifiable by direct fetch - not gate failures): ${shells.length}`);
    for (const item of shells.slice(0, 5)) {
      console.warn(`- ${item.manufacturer} ${item.sku} ${item.url}: ${item.warning}`);
    }
  }
  if (suspicious.length) {
    console.warn(`Suspicious (page may no longer be this product): ${suspicious.length}`);
    for (const item of suspicious.slice(0, 5)) {
      console.warn(`- ${item.manufacturer} ${item.sku} ${item.url}: ${item.warning}`);
    }
  }
  if (transient.length) {
    console.warn(`Transient/unreachable (not gate failures): ${transient.length}`);
    for (const item of transient.slice(0, 5)) {
      console.warn(`- ${item.manufacturer} ${item.sku} ${item.url}: ${item.warning}`);
    }
  }

  console.log(`Wrote ${path.relative(root, REPORT_FILE)}`);

  if (gateFailures.length) {
    process.exitCode = 1;
  }
}

function isJsShellWarning(warning) {
  return String(warning).includes("Client-rendered shell");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
