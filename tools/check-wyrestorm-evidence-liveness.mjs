/**
 * Governed evidence liveness gate (repeatable).
 *
 * Live-checks every unique official WyreStorm evidence URL carried by the
 * governed profiles (data/governance/wyrestorm-technical-profiles.json) so a
 * dead or repurposed product page is caught before a rep quotes against it.
 * The audit found official pages silently returning 404 (NHD-E series); this
 * is the scheduled guard that catches the same rot automatically.
 *
 * Gate contract (exit non-zero):
 *   - "dead": the page returned 404/410 - the evidence URL no longer exists.
 *   - "moved": the URL redirected to a different product slug - the page now
 *     belongs to another product, so the evidence no longer proves this SKU.
 *
 * Transient conditions (server errors, bot-blocking 4xx, timeouts) are
 * reported as warnings, not failures, so a flaky network or bot protection
 * cannot take the gate down. The report also flags pages whose title does not
 * mention the SKU as "suspicious" context for a human reviewer, without
 * failing the gate.
 *
 * Output: reports/wyrestorm-evidence-liveness.json + a summary on stdout.
 *
 * Usage: node tools/check-wyrestorm-evidence-liveness.mjs
 *
 * Env overrides (for hermetic validation): WINGMAN_PROFILES_FILE.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILES_FILE = process.env.WINGMAN_PROFILES_FILE ?? path.join(root, "data/governance/wyrestorm-technical-profiles.json");
const REPORT_FILE = path.join(root, "reports/wyrestorm-evidence-liveness.json");

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

function skuFromUrl(url) {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  return pathname.split("/").pop() ?? "";
}

function sameProductSlug(leftUrl, rightUrl) {
  const left = skuFromUrl(leftUrl);
  const right = skuFromUrl(rightUrl);
  if (!left || !right) return true; // cannot compare - do not cry wolf
  return left.toLowerCase() === right.toLowerCase();
}

function extractTitle(html, sku) {
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);

  return cleanText(h1Match?.[1] || ogTitleMatch?.[1] || titleMatch?.[1] || "")
    .replace(/\s*-\s*WyreStorm.*$/i, "")
    .replace(new RegExp(`^${sku}\\s*[-–—:]?\\s*`, "i"), "")
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
        "user-agent": "WingmanEvidenceLivenessCheck/1.0",
        accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function skuMentionedOnPage(html, skus) {
  // A URL may be shared by several profiles (a family page documents the TX,
  // RX and combined SKUs). Flag the page only when none of its citing SKUs
  // appears anywhere in the fetched HTML.
  return skus.some((sku) => new RegExp(sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(html));
}

async function checkUrl(skus, url) {
  const result = {
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
    if (!sameProductSlug(url, result.finalUrl)) {
      result.kind = "moved";
      result.warning = `Redirected to ${result.finalUrl}, which points at a different product slug.`;
    } else if (!skuMentionedOnPage(html, skus)) {
      // The full page is already in hand, so scan it all: family pages that
      // document one of the citing SKUs in a product table or accessory list
      // are legitimate evidence and must not be flagged.
      result.warning = `Page loads but mentions none of ${skus.length === 1 ? "its SKU" : "the citing SKUs"} (${skus.join(", ")}) - verify the page is still this product.`;
    }
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
  const raw = JSON.parse(await readFile(PROFILES_FILE, "utf8"));
  const profiles = Array.isArray(raw) ? raw : raw.profiles ?? [];
  const urlToSkus = new Map();

  for (const profile of profiles) {
    for (const evidence of profile.evidence ?? []) {
      if (evidence?.sourceUrl) {
        const skus = urlToSkus.get(evidence.sourceUrl) ?? [];
        skus.push(profile.sku);
        urlToSkus.set(evidence.sourceUrl, skus);
      }
    }
  }

  const urls = [...urlToSkus.keys()].sort();
  const results = await mapWithConcurrency(urls, (url) => checkUrl(urlToSkus.get(url), url));

  const summary = { live: 0, dead: 0, moved: 0, blocked: 0, "server-error": 0, unreachable: 0 };
  for (const result of results) summary[result.kind] += 1;

  const gateFailures = results.filter((result) => result.kind === "dead" || result.kind === "moved");
  const suspicious = results.filter((result) => result.warning && result.kind === "live");
  const transient = results.filter((result) => result.kind === "blocked" || result.kind === "server-error" || result.kind === "unreachable");

  const report = {
    generatedAt: new Date().toISOString(),
    profileCount: profiles.length,
    evidenceUrlCount: urls.length,
    summary,
    gateFailures,
    suspicious,
    transient,
  };

  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Evidence URLs checked: ${urls.length} (from ${profiles.length} profiles)`);
  console.log(`Live: ${summary.live} | Dead: ${summary.dead} | Moved: ${summary.moved} | Blocked: ${summary.blocked} | Server error: ${summary["server-error"]} | Unreachable: ${summary.unreachable}`);

  for (const failure of gateFailures) {
    console.error(`GATE FAIL - ${failure.kind.toUpperCase()}: ${failure.sku} ${failure.url} (${failure.warning})`);
  }
  if (suspicious.length) {
    console.warn(`Suspicious (page may no longer be this product): ${suspicious.length}`);
    for (const item of suspicious.slice(0, 5)) {
      console.warn(`- ${item.sku} ${item.url}: ${item.warning}`);
    }
  }
  if (transient.length) {
    console.warn(`Transient/unreachable (not gate failures): ${transient.length}`);
    for (const item of transient.slice(0, 5)) {
      console.warn(`- ${item.sku} ${item.url}: ${item.warning}`);
    }
  }

  console.log(`Wrote ${path.relative(root, REPORT_FILE)}`);

  if (gateFailures.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
