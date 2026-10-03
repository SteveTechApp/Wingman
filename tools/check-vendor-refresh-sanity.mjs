#!/usr/bin/env node
// Vendor refresh sanity gate.
//
// The weekly refresh runs unattended against a third-party website. That site
// can be partially down, rate-limit us, move its URLs or return a consent wall
// instead of a datasheet, and the enrichment step will happily write a thinner
// file without complaining - which is exactly how a "successful" refresh
// quietly strips the technical evidence the compare and spec surfaces depend
// on.
//
// This compares the refreshed enrichment against the committed one and fails
// on material regression. It is deliberately one-directional: gaining data is
// always fine, losing it needs a human.
//
// Run after `npm run data:enrich-wyrestorm-products`, before opening a PR.

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const relativeEnrichmentPath = "data-sources/wyrestorm/enrichment.json";

// Thresholds are tolerant of normal catalogue churn and intolerant of the
// failure modes above. A vendor legitimately retiring a few products should not
// page anyone; losing a tenth of the catalogue should.
const MAX_RECORD_LOSS_RATIO = 0.05;
const MAX_EVIDENCE_LOSS_RATIO = 0.05;
const MAX_FETCH_SUCCESS_LOSS_RATIO = 0.2;
const MAX_PROFILE_SHRINK_COUNT = 10;

function products(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["products", "records", "items", "catalog", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Object.values(payload ?? {}).find(Array.isArray) ?? [];
}

function measure(payload) {
  const list = products(payload).filter((entry) => entry && entry.sku);
  const bySku = new Map(list.map((entry) => [String(entry.sku).toUpperCase(), entry]));
  let withEvidence = 0;
  let fetchedOk = 0;

  for (const entry of list) {
    const profile = entry.technicalProfile ?? {};
    const evidence = profile.evidence;
    const count = Array.isArray(evidence) ? evidence.length : Object.keys(evidence ?? {}).length;
    if (count > 0) withEvidence += 1;
    if (String(profile.sourceQuality?.officialPageStatus ?? "") === "200") fetchedOk += 1;
  }

  return { list, bySku, records: list.length, withEvidence, fetchedOk };
}

function readCommittedEnrichment() {
  try {
    const raw = execFileSync("git", ["show", `HEAD:${relativeEnrichmentPath}`], {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const current = JSON.parse(
    await fs.readFile(path.join(projectRoot, relativeEnrichmentPath), "utf8"),
  );
  const committed = readCommittedEnrichment();

  if (!committed) {
    console.log("[refresh-sanity] No committed enrichment to compare against; skipping regression checks.");
    return;
  }

  const before = measure(committed);
  const after = measure(current);

  console.log(
    `[refresh-sanity] records ${before.records} -> ${after.records}, ` +
      `with evidence ${before.withEvidence} -> ${after.withEvidence}, ` +
      `pages fetched OK ${before.fetchedOk} -> ${after.fetchedOk}`,
  );

  const problems = [];

  const lostSkus = [...before.bySku.keys()].filter((sku) => !after.bySku.has(sku));
  if (before.records && lostSkus.length / before.records > MAX_RECORD_LOSS_RATIO) {
    problems.push(
      `${lostSkus.length} of ${before.records} SKUs disappeared (limit ${Math.round(MAX_RECORD_LOSS_RATIO * 100)}%): ${lostSkus.slice(0, 10).join(", ")}`,
    );
  } else if (lostSkus.length) {
    console.log(`[refresh-sanity] ${lostSkus.length} SKU(s) dropped, within tolerance: ${lostSkus.slice(0, 10).join(", ")}`);
  }

  if (before.withEvidence && (before.withEvidence - after.withEvidence) / before.withEvidence > MAX_EVIDENCE_LOSS_RATIO) {
    problems.push(
      `Technical evidence coverage fell from ${before.withEvidence} to ${after.withEvidence}. A refresh that loses evidence usually means the vendor pages did not load.`,
    );
  }

  if (before.fetchedOk && (before.fetchedOk - after.fetchedOk) / before.fetchedOk > MAX_FETCH_SUCCESS_LOSS_RATIO) {
    problems.push(
      `Successful page fetches fell from ${before.fetchedOk} to ${after.fetchedOk}. The vendor site was probably unreachable, rate-limiting, or has moved its URLs.`,
    );
  }

  const shrunk = [];
  for (const [sku, beforeEntry] of before.bySku) {
    const afterEntry = after.bySku.get(sku);
    if (!afterEntry) continue;
    const beforeSize = JSON.stringify(beforeEntry.technicalProfile ?? {}).length;
    const afterSize = JSON.stringify(afterEntry.technicalProfile ?? {}).length;
    if (beforeSize > 400 && afterSize < beforeSize * 0.6) shrunk.push(`${sku} (${beforeSize} -> ${afterSize})`);
  }

  if (shrunk.length > MAX_PROFILE_SHRINK_COUNT) {
    problems.push(
      `${shrunk.length} technical profiles shrank by more than 40% (limit ${MAX_PROFILE_SHRINK_COUNT}): ${shrunk.slice(0, 10).join(", ")}`,
    );
  } else if (shrunk.length) {
    console.log(`[refresh-sanity] ${shrunk.length} profile(s) shrank, within tolerance: ${shrunk.slice(0, 5).join(", ")}`);
  }

  if (problems.length) {
    console.error(`[refresh-sanity] FAIL - refreshed data looks worse than what is committed:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("\nDo not publish this refresh. Investigate the vendor source before re-running.");
    process.exitCode = 1;
    return;
  }

  console.log("[refresh-sanity] PASS - refreshed data is no worse than the committed data.");
}

main().catch((error) => {
  console.error("[refresh-sanity] Failed to run:", error);
  process.exitCode = 1;
});
