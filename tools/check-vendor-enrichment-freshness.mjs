#!/usr/bin/env node
// Vendor enrichment freshness guard.
//
// data-sources/wyrestorm/enrichment.json is the root of the product data DAG:
// enrichment -> canonical store -> product intelligence index -> everything
// Wingman tells a rep about a product. It is produced by scraping the vendor's
// official product pages, and that scrape is a deliberate manual step - it is
// not part of `build`, because a build must not depend on a third-party site
// being reachable.
//
// The risk that creates is silence. The enrichment can sit frozen for months
// while the catalogue moves underneath it, and nothing says so. This guard
// makes the age visible, and hard-fails on the one state that must never be
// committed: output from an `--offline` run, which cannot fetch datasheets and
// therefore produces a hollowed-out profile.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
// Read the tracked status record, not reports/ - reports/ is gitignored, so a
// guard pointed at it would pass locally and fail on a fresh clone or in CI.
const statusPath = path.join(projectRoot, "data-sources", "wyrestorm", "enrichment-status.json");

// Warn well before the data is dangerous; fail only when it is clearly stale.
const WARN_AFTER_DAYS = 45;
const FAIL_AFTER_DAYS = 120;

function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

async function main() {
  let status;
  try {
    status = JSON.parse(await fs.readFile(statusPath, "utf8"));
  } catch {
    console.error("[enrichment-freshness] FAIL - data-sources/wyrestorm/enrichment-status.json is missing.");
    console.error("Run: npm run data:refresh-vendor");
    process.exitCode = 1;
    return;
  }

  const problems = [];

  // An offline run cannot reach the vendor pages, so every technical profile it
  // writes is derived from whatever was already in the file. Committing that
  // silently discards the scraped evidence the compare and spec surfaces rely
  // on, and it looks like a normal refresh.
  if (status.offlineMode === true) {
    problems.push(
      "The enrichment summary was produced by an --offline run. Offline output must never be the committed source of truth: it cannot fetch datasheets and drops the scraped technical evidence. Re-run `npm run data:refresh-vendor`.",
    );
  }

  const generatedAt = status.generatedAt ? new Date(status.generatedAt) : null;

  if (!generatedAt || Number.isNaN(generatedAt.getTime())) {
    problems.push("The enrichment summary has no usable generatedAt timestamp, so its age cannot be checked.");
  } else {
    const age = daysBetween(generatedAt, new Date());
    console.log(`[enrichment-freshness] Vendor enrichment last refreshed ${age} day(s) ago (${status.generatedAt}).`);

    if (age >= FAIL_AFTER_DAYS) {
      problems.push(
        `Vendor enrichment is ${age} days old (fail threshold ${FAIL_AFTER_DAYS}). Product specs, lifecycle and classification may no longer match the live catalogue. Run \`npm run data:refresh-vendor\`.`,
      );
    } else if (age >= WARN_AFTER_DAYS) {
      console.warn(
        `[enrichment-freshness] WARNING - ${age} days old (warn threshold ${WARN_AFTER_DAYS}). Schedule \`npm run data:refresh-vendor\`.`,
      );
    }
  }

  const fetched = status.officialPageFetchSummary ?? {};
  const ok = Number(fetched["200"] ?? 0);
  if (status.offlineMode !== true && ok > 0) {
    console.log(`[enrichment-freshness] Official pages fetched successfully: ${ok}.`);
  }

  if (problems.length) {
    console.error(`[enrichment-freshness] FAIL - ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log("[enrichment-freshness] PASS - vendor enrichment is live-sourced and within the freshness window.");
}

main().catch((error) => {
  console.error("[enrichment-freshness] Failed to run:", error);
  process.exitCode = 1;
});
