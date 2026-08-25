import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagesDir = path.join(root, "src", "wingman2", "pages");
const styleStackPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");
const routeOverridesPath = path.join(root, "src", "wingman2", "styles", "wingman-route-overrides.css");
const layoutIndexPath = path.join(root, "src", "wingman2", "components", "layout", "index.ts");

function fail(message) {
  console.error(`[page-density] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(pagesDir)) {
  fail("src/wingman2/pages was not found.");
}

if (!fs.existsSync(styleStackPath)) {
  fail("wingman-style-stack.css was not found.");
}

if (!fs.existsSync(layoutIndexPath)) {
  fail("shared layout primitives index.ts was not found.");
}

const styleStack = fs.readFileSync(styleStackPath, "utf8");
const routeOverrides = fs.existsSync(routeOverridesPath) ? fs.readFileSync(routeOverridesPath, "utf8") : "";
const combinedCss = styleStack + routeOverrides;

if (!combinedCss.includes(".wingman-page-host") || !combinedCss.includes(".wingman-section-card")) {
  fail("Shared page frame/card rules are missing from wingman style layers.");
}

const pageFiles = fs
  .readdirSync(pagesDir)
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => path.join(pagesDir, name));

const rows = [];

for (const file of pageFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll("\\", "/");

  const cssImports = [...raw.matchAll(/import\s+["'][^"']+\.css["'];/g)].length;
  const paragraphCount = [...raw.matchAll(/<p[\s>]/g)].length;
  const smallCount = [...raw.matchAll(/<small[\s>]/g)].length;
  const buttonCount = [...raw.matchAll(/<button[\s>]/g)].length;
  const helperMentions = [...raw.matchAll(/helper|guidance|support|callout|description/gi)].length;
  const layoutPrimitiveImports =
    raw.includes("components/layout") ||
    raw.includes("../components/layout") ||
    raw.includes("./components/layout");

  rows.push({
    file: relative,
    cssImports,
    paragraphs: paragraphCount,
    small: smallCount,
    buttons: buttonCount,
    helperMentions,
    usesLayoutPrimitives: layoutPrimitiveImports,
  });
}

const offenders = rows.filter((row) => row.cssImports > 0);

if (offenders.length > 0) {
  console.error("[page-density] Page-level CSS imports are not allowed:");
  offenders.forEach((row) => {
    console.error(`${row.file}: ${row.cssImports}`);
  });
  process.exit(1);
}

rows.sort((a, b) => {
  const aScore = a.paragraphs + a.small + a.helperMentions;
  const bScore = b.paragraphs + b.small + b.helperMentions;
  return bScore - aScore;
});

console.log("[page-density] Wingman page density snapshot:");
console.table(rows);

const reportDir = path.join(root, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const reportPath = path.join(reportDir, "wingman-page-density-report.json");
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  pages: rows,
}, null, 2));

console.log(`[page-density] Report written to ${path.relative(root, reportPath).replaceAll("\\", "/")}`);
console.log("[page-density] Passed.");
