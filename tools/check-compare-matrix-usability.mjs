import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const matrixPath = path.join(ROOT, "src", "wingman2", "components", "compare", "CompactCompareMatrix.tsx");
const cssPath = path.join(ROOT, "src", "wingman2", "styles", "wingman-style-stack.css");

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing file: ${path.relative(ROOT, filePath)}`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

const matrix = read(matrixPath);
const css = read(cssPath);

const requiredMatrixMarkers = [
  "useState",
  "removedCandidateIds",
  "visibleCandidates",
  "replacementCandidates",
  "wm-compare-matrix-scroll-shell",
  "wm-compare-matrix-table",
  "wm-compare-matrix-sticky-head",
  "wm-compare-matrix-sticky-corner",
  "wm-compare-matrix-sticky-evidence",
  "wm-compare-remove-candidate",
  "wm-compare-removed-candidates",
  "wm-compare-restore-candidate",
  "wm-compare-replace-candidate"
];

const requiredCssMarkers = [
  ".wm-compare-matrix-scroll-shell",
  ".wm-compare-matrix-table",
  ".wm-compare-matrix-sticky-head",
  ".wm-compare-matrix-sticky-corner",
  ".wm-compare-matrix-sticky-evidence",
  ".wm-compare-remove-candidate",
  ".wm-compare-removed-candidates",
  ".wm-compare-restore-candidate",
  ".wm-compare-replace-candidate",
  "position: sticky"
];

for (const marker of requiredMatrixMarkers) {
  if (!matrix.includes(marker)) {
    fail(`CompactCompareMatrix missing marker: ${marker}`);
  }
}

for (const marker of requiredCssMarkers) {
  if (!css.includes(marker)) {
    fail(`CSS missing marker: ${marker}`);
  }
}

if (matrix.includes("buildRows(result, candidates)")) {
  fail("CompactCompareMatrix still builds rows from all candidates instead of visibleCandidates.");
}

if (matrix.includes("{candidates.map((candidate) => (")) {
  fail("CompactCompareMatrix still renders all candidates in the header.");
}

if (failures.length > 0) {
  console.error("[compare-matrix-usability] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[compare-matrix-usability] Verified sticky matrix header markers, removable candidate controls, restore strip and visible-candidate row wiring.");