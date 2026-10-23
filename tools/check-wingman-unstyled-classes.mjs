import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { atomicWriteJsonSync } from "./lib/atomic-json-writer.mjs";
import { relativePath } from "./lib/dead-css.mjs";
import {
  collectClassUsage,
  collectUtilityClasses,
  compareUnstyledClasses,
  styleSheetClassNames,
  UNSTYLED_BASELINE_PATH,
  unstyledClasses,
} from "./lib/unstyled-classes.mjs";

/**
 * Unstyled-class gate: the inverse of `check:dead-css`.
 *
 * The dead-CSS gate starts from a stylesheet and fails when markup can never
 * match the rule. This gate starts from the markup and fails when no
 * stylesheet answers the class: the element ships a name that carries no
 * declarations anywhere, so the class is either a rule that was deleted or a
 * name that never got one.
 *
 * A class is answered by a project stylesheet, by a `<style>` block an export
 * builder ships inside its generated document, or by the Tailwind compiler
 * (utilities are decided by generating them, not by an allowlist). Names
 * assembled at runtime and class names asserted in tests are out of scope —
 * see `tools/lib/unstyled-classes.mjs`.
 *
 * The baseline only ratchets down: accepted entries live in
 * `tools/wingman-unstyled-classes-baseline.json`, a new unstyled class fails,
 * and an entry that a stylesheet now answers also fails so the file cannot
 * keep stale allowances.
 *
 * Usage:
 *   node tools/check-wingman-unstyled-classes.mjs                  # verify
 *   node tools/check-wingman-unstyled-classes.mjs --update-baseline
 */

export async function runUnstyledClassGate({
  root = process.cwd(),
  updateBaseline = false,
  log = console.log,
  error = console.error,
  classifyUtilities = collectUtilityClasses,
} = {}) {
  const baselinePath = path.join(root, UNSTYLED_BASELINE_PATH);
  const usage = collectClassUsage(root);
  const stylesheetClasses = styleSheetClassNames(root);

  let utilityClasses;
  try {
    utilityClasses = await classifyUtilities([...new Set(usage.map((entry) => entry.name))], { base: root });
  } catch (caught) {
    error(`[unstyled-classes] Could not resolve Tailwind utilities: ${caught instanceof Error ? caught.message : String(caught)}`);
    error("[unstyled-classes] Install dependencies (npm install) so utilities can be told apart from project classes.");
    return 1;
  }

  const current = unstyledClasses(usage, { stylesheetClasses, utilityClasses });

  if (updateBaseline) {
    atomicWriteJsonSync(baselinePath, {
      updatedAt: new Date().toISOString(),
      rule: "Every entry is a class name used in shipped Wingman markup that no stylesheet, inline export <style> block or Tailwind utility answers. The gate fails when an unlisted class has no style, and when a listed class has gained one. Regenerate with npm run audit:unstyled-classes:baseline only after removing the class or adding its rule.",
      unstyledClasses: current.map(({ file, name }) => ({ file, name })),
    });
    log(`[unstyled-classes] Baseline updated: ${relativePath(root, baselinePath)} (${current.length} unanswered class${current.length === 1 ? "" : "es"})`);
    return 0;
  }

  if (!fs.existsSync(baselinePath)) {
    error(`[unstyled-classes] Missing baseline: ${relativePath(root, baselinePath)}`);
    error("[unstyled-classes] Run: npm run audit:unstyled-classes:baseline");
    return 1;
  }

  let baselineFile;
  try {
    baselineFile = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch (caught) {
    error(`[unstyled-classes] Baseline is not valid JSON: ${relativePath(root, baselinePath)}`);
    error(`[unstyled-classes] ${caught instanceof Error ? caught.message : String(caught)}`);
    return 1;
  }

  if (!Array.isArray(baselineFile.unstyledClasses)) {
    error(`[unstyled-classes] Baseline has no unstyledClasses array: ${relativePath(root, baselinePath)}`);
    error("[unstyled-classes] Run: npm run audit:unstyled-classes:baseline");
    return 1;
  }

  const { added, stale } = compareUnstyledClasses(current, baselineFile.unstyledClasses);
  let failed = false;

  if (added.length > 0) {
    failed = true;
    error("[unstyled-classes] FAILED. Class names used in markup that no stylesheet styles and that are not in the baseline:");
    added.forEach((entry) => error(`- ${entry.file} — ${entry.name}`));
    error("[unstyled-classes] Add the rule, remove the class, or record reviewed debt with `npm run audit:unstyled-classes:baseline`.");
  }

  if (stale.length > 0) {
    failed = true;
    error("[unstyled-classes] FAILED. Baseline entries that a stylesheet now styles:");
    stale.forEach((entry) => error(`- ${entry.file} — ${entry.name}`));
    error("[unstyled-classes] Drop the stale allowance: run `npm run audit:unstyled-classes:baseline`.");
  }

  if (failed) return 1;

  log(`[unstyled-classes] OK. ${current.length} known unanswered class${current.length === 1 ? "" : "es"}, no additions.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const status = await runUnstyledClassGate({ updateBaseline: process.argv.includes("--update-baseline") });
  process.exit(status);
}
