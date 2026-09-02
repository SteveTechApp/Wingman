#!/usr/bin/env node
// Guards the dependency OVERRIDE floors in package.json against silent loss.
//
// The overrides block currently pins three load-bearing packages:
//   - browserslist must stay pinned at ^4.28.8 (GHSA-73wf-gq98-2v4g and the
//     sibling browserslist records were fixed in 4.28.7; the caret keeps the
//     whole installable range on the fixed side).
//   - postcss-selector-parser in the ^6.0.10 family must stay pinned at ^6.1.4
//     (GHSA-w9m9-85wc-3x92, uncontrolled AST recursion, fixed in 6.1.3).
//   - fast-uri must stay pinned at ^3.1.7 (host confusion / SSRF via IDN,
//     IPv6 and percent-encoding normalization, fixed in 3.1.7).
//
// npm install never removes an override, but a hand edit of package.json or a
// resolve-from-scratch flow (delete lockfile + npm install) can: without the
// override, the package resolves back into the affected range and the lockfile
// records the vulnerable version with no red flag on the next commit. This
// check fails if an override is REMOVED, LOWERED below its advisory floor, or
// if the committed lockfile still records a version under the floor.
//
// Coverage runs both directions: every floor row must have a live override
// (removed/lowered detection above), and every overrides key in package.json
// must be claimed by a floor row — so an override added tomorrow without an
// advisory floor row fails this gate instead of silently being unprotected.
//
// Usage: node tools/check-override-floors.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { semverCompare } from "./check-build-deps.mjs";

const DEFAULT_PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_PATH = path.join(DEFAULT_PROJECT_ROOT, "package.json");
const LOCK_PATH = path.join(DEFAULT_PROJECT_ROOT, "package-lock.json");

// The floors this gate enforces. `overrideKey` is the package.json overrides
// key (exact, or a prefix for family-scoped keys); `floor` is the minimum
// version the override must demand. `lockFamilyMin`/`lockFamilyMaxExclusive`
// optionally bound which lockfile versions must also clear the floor (unset =
// every installed version of the package must clear it).
const OVERRIDE_FLOORS = [
  {
    overrideKey: "browserslist",
    packageName: "browserslist",
    floor: "4.28.8",
    why: "browserslist GHSA-73wf-gq98-2v4g / GHSA-c83g-rgw3-j3cx / GHSA-w8qv-6jwh-64r5 were fixed in 4.28.7",
  },
  {
    overrideKeyPrefix: "postcss-selector-parser@",
    packageName: "postcss-selector-parser",
    floor: "6.1.4",
    // Only lockfile versions inside the family the override claims (^6.0.10)
    // must clear the floor; 7.x resolves under a different range.
    lockFamilyMin: "6.0.10",
    lockFamilyMaxExclusive: "7.0.0",
    why: "postcss-selector-parser GHSA-w9m9-85wc-3x92 (uncontrolled AST recursion) was fixed in 6.1.3",
  },
  {
    overrideKey: "fast-uri",
    packageName: "fast-uri",
    floor: "3.1.7",
    why: "fast-uri GHSA-5jgf-p345-68v8 / GHSA-f65p-4m7j-42xc / GHSA-fph4-wmhf-6fwf / GHSA-jqff-g426-hqxp (host confusion / SSRF via IDN, IPv6 and percent-encoding normalization) were fixed in 3.1.7",
  },
];

// The numeric floor of an npm version spec: '^4.28.8'/'~4.28.8'/'>=4.28.8'/
// '4.28.8' all floor at 4.28.8. Compound specs use the first comparator.
// Wildcards ('*', 'latest', 'x') have no floor and return null.
export function specFloor(spec) {
  const trimmed = String(spec ?? "").trim();
  if (!trimmed) return null;
  if (trimmed === "*" || trimmed === "latest" || trimmed === "x" || /^[<>^~]=?\s*$/.test(trimmed)) return null;
  const match = trimmed.match(/^([<>^~]?=?\s*)(\d+(?:\.\d+){0,2}(?:-\S+)?)/);
  if (!match) return null;
  return match[2].split("-")[0];
}

// Which floor row claims an overrides key, if any: an exact overrideKey match
// or a prefix match for family-scoped keys like "postcss-selector-parser@^6".
function floorForOverrideKey(key) {
  return OVERRIDE_FLOORS.find(
    (floor) =>
      (floor.overrideKey !== undefined && floor.overrideKey === key) ||
      (floor.overrideKeyPrefix !== undefined && key.startsWith(floor.overrideKeyPrefix)),
  );
}

// Overrides keys in package.json that no floor row claims. Every override is
// load-bearing by definition (it exists to change resolution), so an override
// without a floor row is an unprotected one.
export function unclaimedOverrideKeys(packageJson) {
  const overrides = packageJson.overrides ?? {};
  return Object.keys(overrides).filter((key) => floorForOverrideKey(key) === undefined);
}

function collectPackageJsonProblems(packageJson, problems) {
  const overrides = packageJson.overrides ?? {};
  for (const floor of OVERRIDE_FLOORS) {
    const entry = floor.overrideKey !== undefined ? overrides[floor.overrideKey] : undefined;
    const prefixedEntry =
      floor.overrideKeyPrefix !== undefined
        ? Object.entries(overrides).find(([key]) => key.startsWith(floor.overrideKeyPrefix))?.[1]
        : undefined;
    const spec = entry ?? prefixedEntry;
    if (spec === undefined) {
      problems.push(
        `package.json overrides no longer pins ${floor.packageName} at ${floor.floor}+ (${floor.why}). ` +
          "A lockfile regeneration can silently resolve back into the affected range - restore the override.",
      );
      continue;
    }
    const lower = specFloor(spec);
    if (lower === null || semverCompare(lower, floor.floor) !== null && semverCompare(lower, floor.floor) < 0) {
      problems.push(
        `package.json override for ${floor.packageName} is "${spec}" - floor ${lower ?? "none"} is below the ` +
          `required ${floor.floor} (${floor.why}). Raise the floor back to at least ${floor.floor}.`,
      );
    }
  }
  // The reverse direction: an override with no floor row is unprotected.
  for (const key of unclaimedOverrideKeys(packageJson)) {
    problems.push(
      `package.json overrides key "${key}" has no floor row in OVERRIDE_FLOORS (tools/check-override-floors.mjs) - ` +
        "this gate cannot detect it being dropped or lowered. Add a floor row with its advisory floor.",
    );
  }
}

function collectLockfileProblems(lock, problems) {
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    const packageName = key.slice("node_modules/".length).split("/node_modules/").pop();
    if (!entry?.version) continue;
    for (const floor of OVERRIDE_FLOORS) {
      if (packageName !== floor.packageName) continue;
      // Family scoping: rows may bound which installed versions must clear
      // the floor. A version outside the family resolves under a different
      // range than the override claims and is not this override's concern.
      if (floor.lockFamilyMin !== undefined) {
        const aboveMin = semverCompare(entry.version, floor.lockFamilyMin);
        if (aboveMin === null || aboveMin < 0) continue;
      }
      if (floor.lockFamilyMaxExclusive !== undefined) {
        const belowMax = semverCompare(entry.version, floor.lockFamilyMaxExclusive);
        if (belowMax === null || belowMax >= 0) continue;
      }
      const belowFloor = semverCompare(entry.version, floor.floor);
      if (belowFloor !== null && belowFloor < 0) {
        problems.push(
          `package-lock.json records ${floor.packageName} ${entry.version} (${key}), below the ${floor.floor} advisory floor - ` +
            "the override did not survive the last install/regeneration (e.g. a lockfile regeneration that resolved " +
            "under the floor). Restore the override, run npm install, and commit the regenerated lock.",
        );
      }
    }
  }
}

export function collectOverrideFloorProblems(packageJson, lock) {
  const problems = [];
  collectPackageJsonProblems(packageJson, problems);
  collectLockfileProblems(lock, problems);
  return problems;
}

export function checkOverrideFloors(projectRoot = DEFAULT_PROJECT_ROOT) {
  const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(path.join(projectRoot, "package-lock.json"), "utf8"));
  return collectOverrideFloorProblems(packageJson, lock);
}

// Drill helper: one call that reports every problem plus the pass/fail verdict
// the standalone CLI derives from it (exit 0 when ok), so the drill tests can
// pin both the library path and the CLI contract against fixture sandboxes.
export function evaluateOverrideFloors(packageJson, lock) {
  const problems = collectOverrideFloorProblems(packageJson, lock);
  return { problems, ok: problems.length === 0 };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const problems = checkOverrideFloors();
  if (problems.length) {
    console.error("[override-floors] Check failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    `[override-floors] OK - all ${OVERRIDE_FLOORS.length} override floors are intact, every override key is covered by a floor row, and the lockfile honours them.`,
  );
}
