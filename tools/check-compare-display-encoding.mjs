import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();

const files = [
  "src/wingman2/lib/compareDisplayText.ts",
  "src/wingman2/components/compare/CompactCompareMatrix.tsx",
  "src/wingman2/pages/ComparePageNew.tsx",
];

function fail(message) {
  console.error(`[compare-display-encoding] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

for (const file of files) {
  const fullPath = resolve(repoRoot, file);
  assert(existsSync(fullPath), `Missing ${file}`);

  const source = readFileSync(fullPath, "utf8");
  assert(!/[ÂÃÆâ€™â€œâ€]/.test(source), `${file} still contains mojibake markers.`);
}

const compact = readFileSync(resolve(repoRoot, "src/wingman2/components/compare/CompactCompareMatrix.tsx"), "utf8");

assert(compact.includes("compactVerdictLabel"), "Compact matrix is not using ASCII verdict labels.");
assert(compact.includes("OK"), "Compact matrix does not include OK verdict label.");
assert(compact.includes("NO"), "Compact matrix does not include NO verdict label.");
assert(compact.includes("CHK"), "Compact matrix does not include CHK verdict label.");
assert(!compact.includes("✓"), "Compact matrix still contains Unicode tick.");
assert(!compact.includes("✕"), "Compact matrix still contains Unicode cross.");

console.log("[compare-display-encoding] Compare display encoding checks passed.");