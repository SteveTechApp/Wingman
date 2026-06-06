import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const finderPath = path.join(root, "src", "wingman2", "pages", "FinderPage.tsx");
const styleStackPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");
const layoutIndexPath = path.join(root, "src", "wingman2", "components", "layout", "index.ts");

function fail(message) {
  console.error(`[finder-density] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(finderPath)) {
  fail("FinderPage.tsx was not found.");
}

if (!fs.existsSync(styleStackPath)) {
  fail("wingman-style-stack.css was not found.");
}

if (!fs.existsSync(layoutIndexPath)) {
  fail("shared layout primitives index.ts was not found.");
}

const finder = fs.readFileSync(finderPath, "utf8");
const styleStack = fs.readFileSync(styleStackPath, "utf8");

const cssImports = [...finder.matchAll(/import\s+["'][^"']+\.css["'];/g)];

if (cssImports.length > 0) {
  fail("FinderPage.tsx must not import CSS directly. Use wingman-style-stack.css only.");
}

if (
  !styleStack.includes("WINGMAN FINDER STABLE RECOVERY START") &&
  !styleStack.includes("WINGMAN-FINDER-TOP-FILTER-REDESIGN-START")
) {
  fail("Finder cleanup rules are missing from wingman-style-stack.css.");
}

const paragraphCount = [...finder.matchAll(/<p[\s>]/g)].length;
const smallCount = [...finder.matchAll(/<small[\s>]/g)].length;
const buttonCount = [...finder.matchAll(/<button[\s>]/g)].length;

const report = {
  finderPage: path.relative(root, finderPath).replaceAll("\\", "/"),
  paragraphCount,
  smallCount,
  buttonCount,
  hasSharedLayoutImports: finder.includes("components/layout") || finder.includes("../components/layout"),
  cssImports: cssImports.length,
};

console.log("[finder-density] Finder density snapshot:");
console.log(JSON.stringify(report, null, 2));

if (paragraphCount > 140) {
  console.warn("[finder-density] Finder still has a high number of <p> nodes. Next step should be TSX layout migration.");
}

console.log("[finder-density] Passed.");
