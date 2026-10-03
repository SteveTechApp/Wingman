import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagesDir = path.join(root, "src", "wingman2", "pages");

function fail(message) {
  console.error(`[page-frame-check] ${message}`);
  process.exit(1);
}

const pageFiles = fs
  .readdirSync(pagesDir)
  .filter((name) => name.endsWith("Page.tsx") || name.endsWith("BuilderPage.tsx"))
  .map((name) => path.join(pagesDir, name))
  .sort();

const rows = [];

for (const file of pageFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll("\\", "/");

  rows.push({
    file: relative,
    usesFrame: raw.includes("WingmanPageFrame"),
    usesLayoutImport: raw.includes("../components/layout") || raw.includes("components/layout"),
    cssImports: [...raw.matchAll(/import\s+["'][^"']+\.css["'];/g)].length,
  });
}

console.table(rows);

const cssOffenders = rows.filter((row) => row.cssImports > 0);

if (cssOffenders.length > 0) {
  fail("Page-level CSS imports are not allowed.");
}

const missingFrame = rows.filter((row) => !row.usesFrame);

if (missingFrame.length > 0) {
  console.warn("[page-frame-check] Some pages are not frame-migrated yet:");
  for (const row of missingFrame) {
    console.warn(`- ${row.file}`);
  }
}

console.log("[page-frame-check] Passed.");