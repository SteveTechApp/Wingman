import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const componentPath = resolve(repoRoot, "src/wingman2/components/compare/CompactCompareMatrix.tsx");
const comparePagePath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.tsx");
const cssPath = resolve(repoRoot, "src/wingman2/styles/wingman-style-stack.css");

function fail(message) {
  console.error(`[compact-compare-matrix] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

assert(existsSync(componentPath), "Missing CompactCompareMatrix component.");
assert(existsSync(comparePagePath), "Missing ComparePageNew.");
assert(existsSync(cssPath), "Missing wingman-style-stack.css.");

const component = readFileSync(componentPath, "utf8");
const comparePage = readFileSync(comparePagePath, "utf8");
const css = readFileSync(cssPath, "utf8");

assertIncludes(component, "CompactCompareMatrix", "component");
assertIncludes(component, "data-wingman-compact-compare", "component");
assertIncludes(component, "Mirrored outputs", "component");
assertIncludes(component, "Loop outputs", "component");
assertIncludes(component, "Receiver package", "component");
assertIncludes(component, "maxCandidates", "component");
assertIncludes(component, "aNumbers.join(\"|\") !== bNumbers.join(\"|\")", "component");
assertIncludes(component, "withMatrixTopology", "component");
assertIncludes(component, "classifyMatrixOutputTopology", "component");

assertIncludes(comparePage, "CompactCompareMatrix", "ComparePageNew");
assertIncludes(comparePage, "maxCandidates={4}", "ComparePageNew");

assertIncludes(css, "WM COMPACT COMPARE MATRIX START", "CSS");
assertIncludes(css, ".wm-compact-compare-table", "CSS");
assertIncludes(css, ".wm-compact-verdict-match", "CSS");
assertIncludes(css, ".wm-compact-verdict-no-match", "CSS");

console.log("[compact-compare-matrix] Compact comparison matrix checks passed.");
