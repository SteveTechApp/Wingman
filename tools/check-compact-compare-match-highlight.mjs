import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const componentPath = resolve(repoRoot, "src/wingman2/components/compare/CompactCompareMatrix.tsx");
const cssPath = resolve(repoRoot, "src/wingman2/styles/wingman-style-stack.css");

function fail(message) {
  console.error(`[compact-compare-match-highlight] ${message}`);
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

assert(existsSync(componentPath), "Missing CompactCompareMatrix.tsx");
assert(existsSync(cssPath), "Missing wingman-style-stack.css");

const component = readFileSync(componentPath, "utf8");
const css = readFileSync(cssPath, "utf8");

assertIncludes(component, "wm-compact-cell-${value.verdict}", "CompactCompareMatrix");
assertIncludes(css, "WM COMPACT COMPARE MATCH HIGHLIGHT START", "CSS");
assertIncludes(css, ".wm-compact-cell-match", "CSS");
assertIncludes(css, "rgba(22, 101, 52", "CSS");
assertIncludes(css, ".wm-compact-cell-no-match", "CSS");
assertIncludes(css, ".wm-compact-cell-partial", "CSS");
assertIncludes(css, ".wm-compact-cell-plus", "CSS");

console.log("[compact-compare-match-highlight] Match highlight checks passed.");