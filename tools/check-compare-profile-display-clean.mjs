import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();

const comparePagePath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.tsx");
const knownProfilePath = resolve(repoRoot, "src/wingman2/lib/knownCompareProfiles.ts");
const cleanerPath = resolve(repoRoot, "src/wingman2/lib/compareDisplayText.ts");

function fail(message) {
  console.error(`[compare-profile-display-clean] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

assert(existsSync(comparePagePath), "Missing ComparePageNew.tsx");
assert(existsSync(knownProfilePath), "Missing knownCompareProfiles.ts");
assert(existsSync(cleanerPath), "Missing compareDisplayText.ts");

const comparePage = readFileSync(comparePagePath, "utf8");
const knownProfile = readFileSync(knownProfilePath, "utf8");
const cleaner = readFileSync(cleanerPath, "utf8");

const fatalPatterns = [
  [/^\s*mport\b/m, "mport import corruption"],
  [/^\s*functon\b/m, "functon corruption"],
  [/\bstrng\b/, "strng corruption"],
  [/\bcompettor\b/, "compettor corruption"],
  [/\bprofle\b/, "profle corruption"],
  [/\bmatrx\b/, "matrx corruption"],
  [/\.\.\/lb\//, "../lb import corruption"],
  [/Array\.sArray/, "Array.sArray corruption"],
];

for (const [pattern, label] of fatalPatterns) {
  assert(!pattern.test(comparePage), `ComparePageNew.tsx still contains ${label}`);
  assert(!pattern.test(knownProfile), `knownCompareProfiles.ts still contains ${label}`);
}

assert(!/[^\x00-\x7F]/.test(comparePage), "ComparePageNew.tsx still contains non-ASCII characters.");
assert(!/[^\x00-\x7F]/.test(knownProfile), "knownCompareProfiles.ts still contains non-ASCII characters.");

assert(knownProfile.includes("C88CS_SAFE_PROFILE_SUMMARY"), "Known C88CS clean profile summary missing.");
assert(knownProfile.includes("displaySummary: C88CS_SAFE_PROFILE_SUMMARY"), "Known profile displaySummary override missing.");
assert(knownProfile.includes("rawText: C88CS_SAFE_PROFILE_SUMMARY"), "Known profile rawText override missing.");
assert(cleaner.includes("cleanCompareDisplayBlock"), "cleanCompareDisplayBlock helper missing.");
assert(comparePage.includes("as RigorousCompareResult"), "ComparePageNew missing RigorousCompareResult cast.");

console.log("[compare-profile-display-clean] Compare profile display guard passed.");