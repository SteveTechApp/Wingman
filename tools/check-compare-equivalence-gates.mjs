import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const guardPath = resolve(repoRoot, "src/wingman2/lib/compareEquivalenceGuard.ts");
const comparePagePath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.tsx");

function fail(message) {
  console.error(`[compare-equivalence-gates] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} is missing marker: ${marker}`);
}

assert(existsSync(guardPath), "Missing src/wingman2/lib/compareEquivalenceGuard.ts");
assert(existsSync(comparePagePath), "Missing src/wingman2/pages/ComparePageNew.tsx");

const guard = readFileSync(guardPath, "utf8");
const comparePage = readFileSync(comparePagePath, "utf8");

assertIncludes(guard, "applyCompareEquivalenceGuards", "guard");
assertIncludes(guard, "gateDirectEquivalence", "guard");
assertIncludes(guard, "LOW_CONFIDENCE_DIRECT_MATCH_FLOOR", "guard");
assertIncludes(guard, "No safe direct WyreStorm equivalent", "guard");
assertIncludes(guard, "Same-family products with hard blockers", "guard");
assertIncludes(guard, "Candidate product role is incomplete", "guard");
assertIncludes(comparePage, "applyCompareEquivalenceGuards", "ComparePageNew");
assertIncludes(comparePage, "applyCompareEquivalenceGuards(rigorousCompare", "ComparePageNew");

console.log("[compare-equivalence-gates] Compare equivalence gate checks passed.");