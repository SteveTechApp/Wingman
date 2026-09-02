#!/usr/bin/env node
// Guards the dependency OVERRIDE floors in package.json against silent loss.
//
// Two advisory-driven floors are currently load-bearing:
//   - browserslist must stay pinned at ^4.28.8 (GHSA-73wf-gq98-2v4g and the
//     sibling browserslist records were fixed in 4.28.7; the caret keeps the
//     whole installable range on the fixed side).
//   - postcss-selector-parser in the ^6.0.10 family must stay pinned at ^6.1.4
//     (GHSA-w9m9-85wc-3x92, uncontrolled AST recursion, fixed in 6.1.3).
//
// npm install never removes an override, but a hand edit of package.json or a
// resolve-from-scratch flow (delete lockfile + npm install) can: without the
// override, browserslist/postcss-selector-parser resolve back into the
// affected range and the lockfile records the vulnerable version with no red
// flag on the next commit. This check fails if either override is REMOVED,
// LOWERED below its advisory floor, or if the committed lockfile still records
// a version under the floor (a regeneration that dropped the pin).
//
// Usage: node tools/check-override-floors.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { semverCompare } from "./check-build-deps.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_PATH = path.join(projectRoot, "package.json");
const LOCK_PATH = path.join(projectRoot, "package-lock.json");

// The floors this gate enforces. `overrideKey` is the package.json overrides
// key (exact, or a prefix for family-scoped keys); `floor` is the minimum
// version the override must demand; `lockFamily` bounds which lockfile
// versions must also clear the floor.
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
}

function collectLockfileProblems(lock, problems) {
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    const packageName = key.slice("node_modules/".length).split("/node_modules/").pop();
    if (!entry?.version) continue;
    if (packageName === "browserslist") {
      if (semverCompare(entry.version, "4.28.8") !== null && semverCompare(entry.version, "4.28.8") < 0) {
        problems.push(
          `package-lock.json records browserslist ${entry.version}, below the 4.28.8 advisory floor - ` +
            "the override did not survive the last install/regeneration. Run npm install and commit the new lock.",
        );
      }
    }
    if (packageName === "postcss-selector-parser") {
      const inFamily =
        semverCompare(entry.version, "6.0.10") !== null && semverCompare(entry.version, "6.0.10") >= 0 &&
        semverCompare(entry.version, "7.0.0") !== null && semverCompare(entry.version, "7.0.0") < 0;
      if (inFamily && semverCompare(entry.version, "6.1.4") !== null && semverCompare(entry.version, "6.1.4") < 0) {
        problems.push(
          `package-lock.json records postcss-selector-parser ${entry.version} (${key}), inside the 6.1.0-6.1.3 ` +
            "affected range - the override did not survive the last install/regeneration. Run npm install and commit the new lock.",
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

export function checkOverrideFloors() {
  const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, "utf8"));
  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
  return collectOverrideFloorProblems(packageJson, lock);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const problems = checkOverrideFloors();
  if (problems.length) {
    console.error("[override-floors] Check failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("[override-floors] OK - browserslist ^4.28.8 and postcss-selector-parser ^6.1.4 override floors are intact and the lockfile honours them.");
}
