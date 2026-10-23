import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { atomicWriteJsonSync } from "./lib/atomic-json-writer.mjs";
import { BASELINE_PATH, collectDeadSelectors, compareDeadSelectors, relativePath } from "./lib/dead-css.mjs";

/**
 * Dead-class CSS gate.
 *
 * The consolidation pass removed the dead selectors that had accumulated in the
 * stylesheets. This gate makes the result durable: every unmatchable selector
 * currently accepted is listed in `tools/wingman-dead-css-baseline.json`, and a
 * new one fails the verify chain. The baseline only ratchets down — deleting a
 * dead rule also requires removing its entry, so the file cannot quietly keep
 * stale allowances alive.
 *
 * "Unmatchable" is structural, not per-token: `.wm-gone .wm-card` fails while
 * `.wm-card` is still rendered. See `tools/lib/dead-css.mjs`.
 *
 * Usage:
 *   node tools/check-wingman-dead-css-baseline.mjs                  # verify
 *   node tools/check-wingman-dead-css-baseline.mjs --update-baseline
 *   node tools/check-wingman-dead-css-baseline.mjs --prune-stale
 *
 * `--prune-stale` only removes allowances this run no longer needs. It never
 * adopts a new dead selector, so it is safe to run unattended (the pre-commit
 * autofix does): a newly dead rule still fails the gate that follows.
 */

export function runDeadCssGate({
  root = process.cwd(),
  updateBaseline = false,
  pruneStale = false,
  log = console.log,
  error = console.error,
} = {}) {
  const baselinePath = path.join(root, BASELINE_PATH);
  const current = collectDeadSelectors(root);
  const unique = [...new Map(current.map((entry) => [`${entry.file}::${entry.selector}`, entry])).values()]
    .sort((left, right) => left.file.localeCompare(right.file) || left.selector.localeCompare(right.selector));

  if (updateBaseline) {
    atomicWriteJsonSync(baselinePath, {
      updatedAt: new Date().toISOString(),
      rule: "Every entry is a CSS selector that cannot match shipped markup, already accepted in src/wingman2. The gate fails when such a selector is not listed, or when a listed selector is no longer dead. Regenerate with npm run audit:dead-css:baseline only after removing dead rules or accepting reviewed debt.",
      deadSelectors: unique.map(({ file, selector }) => ({ file, selector })),
    });
    log(`[dead-css] Baseline updated: ${relativePath(root, baselinePath)} (${unique.length} dead selector${unique.length === 1 ? "" : "s"})`);
    return 0;
  }

  if (!fs.existsSync(baselinePath)) {
    error(`[dead-css] Missing baseline: ${relativePath(root, baselinePath)}`);
    error("[dead-css] Run: npm run audit:dead-css:baseline");
    return 1;
  }

  let baselineFile;
  try {
    baselineFile = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch (caught) {
    error(`[dead-css] Baseline is not valid JSON: ${relativePath(root, baselinePath)}`);
    error(`[dead-css] ${caught instanceof Error ? caught.message : String(caught)}`);
    return 1;
  }

  if (!Array.isArray(baselineFile.deadSelectors)) {
    error(`[dead-css] Baseline has no deadSelectors array: ${relativePath(root, baselinePath)}`);
    error("[dead-css] Run: npm run audit:dead-css:baseline");
    return 1;
  }

  const { added, stale } = compareDeadSelectors(unique, baselineFile.deadSelectors);

  if (pruneStale) {
    if (stale.length === 0) {
      log(`[dead-css] Baseline already current: ${unique.length} dead selector${unique.length === 1 ? "" : "s"}, nothing to prune.`);
      return 0;
    }
    const currentKeys = new Set(unique.map((entry) => `${entry.file}::${entry.selector}`));
    const kept = baselineFile.deadSelectors.filter((entry) => currentKeys.has(`${entry.file}::${entry.selector}`));
    atomicWriteJsonSync(baselinePath, {
      ...baselineFile,
      updatedAt: new Date().toISOString(),
      deadSelectors: kept.map(({ file, selector }) => ({ file, selector })),
    });
    log(`[dead-css] Baseline pruned: dropped ${stale.length} allowance${stale.length === 1 ? "" : "s"} that are no longer dead; ${kept.length} still accepted.`);
    if (added.length > 0) log(`[dead-css] ${added.length} newly dead selector${added.length === 1 ? "" : "s"} were not adopted; the gate reports them.`);
    return 0;
  }

  let failed = false;

  if (added.length > 0) {
    failed = true;
    error("[dead-css] FAILED. CSS selectors that cannot match shipped markup and are not in the baseline:");
    added.forEach((entry) => error(`- ${entry.file} — ${entry.selector} (${entry.bytes} B)`));
    error("[dead-css] Remove the rule or the class reference. Accepting the debt requires a reviewed `npm run audit:dead-css:baseline`.");
    error("[dead-css] To remove fully dead rules, review the diff from `npm run audit:dead-css:deletions`, then apply it with `npm run apply:dead-css:deletions`.");
  }

  if (stale.length > 0) {
    failed = true;
    error("[dead-css] FAILED. Baseline entries that are no longer dead:");
    stale.forEach((entry) => error(`- ${entry.file} — ${entry.selector}`));
    error("[dead-css] Removing a dead rule must also remove its allowance: run `npm run audit:dead-css:baseline`.");
  }

  if (failed) return 1;

  log(`[dead-css] OK. ${unique.length} known unmatchable selector${unique.length === 1 ? "" : "s"}, no additions.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(
    runDeadCssGate({
      updateBaseline: process.argv.includes("--update-baseline"),
      pruneStale: process.argv.includes("--prune-stale"),
    }),
  );
}
