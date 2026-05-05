import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const finderPath = path.join(root, "src", "wingman2", "pages", "FinderPage.tsx");
const authorityPath = path.join(root, "src", "wingman2", "styles", "wingman-authority-system.css");
const layoutIndexPath = path.join(root, "src", "wingman2", "components", "layout", "index.ts");

function fail(message) {
  console.error(`[finder-density] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(finderPath)) {
  fail("FinderPage.tsx was not found.");
}

if (!fs.existsSync(authorityPath)) {
  fail("wingman-authority-system.css was not found.");
}

if (!fs.existsSync(layoutIndexPath)) {
  fail("shared layout primitives index.ts was not found.");
}

const finder = fs.readFileSync(finderPath, "utf8");
const authority = fs.readFileSync(authorityPath, "utf8");

const cssImports = [...finder.matchAll(/import\s+["'][^"']+\.css["'];/g)];

if (cssImports.length > 0) {
  fail("FinderPage.tsx must not import CSS directly. Use wingman-style-stack.css only.");
}

if (!authority.includes("WM FINDER CLEAN WORKSPACE BEGIN")) {
  fail("Finder cleanup block is missing from wingman-authority-system.css.");
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