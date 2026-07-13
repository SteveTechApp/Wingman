import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const mainEntry = path.join(root, "src", "main.tsx");
const styleStack = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");
const referenceTheme = path.join(root, "src", "wingman2", "styles", "wingman-reference-theme.css");
const workflowTheme = path.join(root, "src", "wingman2", "styles", "wingman-workflow-theme.css");
const allowed = new Set([
  "src/main.tsx",
]);

const expectedMainCssImports = [
  "./wingman2/styles/wingman-style-stack.css",
  "./wingman2/styles/wingman-reference-theme.css",
  "./wingman2/styles/wingman-workflow-theme.css",
];
const retiredPageStyleFiles = [
  "discovery-output-preview.css",
  "product-pitch-safe-layout.css",
  "product-pitch-source-safe.css",
  "wingman-dashboard-command-layout.css",
  "wingman-dashboard-unified-theme.css",
  "wingman-finder-render-stability.css",
  "wingman-finder-route-layout.css",
  "wingman-fixed-guidance-retirement.css",
  "wingman-floating-guidance.css",
  "wingman-futuristic-global-system.css",
  "wingman-guru-overlay-retirement.css",
  "wingman-page-polish-contract.css",
  "wingman-polish-cascade-lock.css",
  "wingman-topbar-control-layout.css",
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", "archive", "backups"].includes(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }

    if ([".ts", ".tsx"].includes(path.extname(entry.name))) {
      out.push(full);
    }
  }

  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

const offenders = [];

for (const file of walk(srcRoot)) {
  const relative = rel(file);
  const raw = fs.readFileSync(file, "utf8");
  const matches = [...raw.matchAll(/import\s+["']([^"']+\.css)["'];/g)];

  if (matches.length === 0) continue;
  if (allowed.has(relative)) continue;

  for (const match of matches) {
    offenders.push({
      file: relative,
      import: match[1],
    });
  }
}

if (offenders.length > 0) {
  console.error("Blocked: CSS imports are only allowed through the app-wide styles in src/main.tsx");
  console.error("");

  for (const offender of offenders) {
    console.error(`${offender.file} imports ${offender.import}`);
  }

  process.exit(1);
}

const mainRaw = fs.readFileSync(mainEntry, "utf8");
const mainCssImports = [...mainRaw.matchAll(/import\s+["']([^"']+\.css)["'];/g)].map((match) => match[1]);

if (
  mainCssImports.length !== expectedMainCssImports.length
  || mainCssImports.some((cssImport, index) => cssImport !== expectedMainCssImports[index])
) {
  console.error("Blocked: src/main.tsx must import only the governed Wingman global styles in the required order.");
  console.error(`Found: ${mainCssImports.length ? mainCssImports.join(", ") : "none"}`);
  process.exit(1);
}

for (const globalStyle of [styleStack, referenceTheme, workflowTheme]) {
  if (!fs.existsSync(globalStyle)) {
    console.error(`Blocked: missing governed global stylesheet ${rel(globalStyle)}.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(globalStyle, "utf8");

  if (/@import\s+["']/.test(raw)) {
    console.error(`Blocked: ${rel(globalStyle)} must not import route or patch stylesheets.`);
    console.error("Keep Wingman styling governed through the three app-wide layers.");
    process.exit(1);
  }
}

const retiredFilesStillPresent = retiredPageStyleFiles
  .map((fileName) => path.join(root, "src", "wingman2", "styles", fileName))
  .filter((filePath) => fs.existsSync(filePath))
  .map(rel);

if (retiredFilesStillPresent.length > 0) {
  console.error("Blocked: retired page-level style patch files are present.");
  console.error("");

  for (const file of retiredFilesStillPresent) {
    console.error(file);
  }

  process.exit(1);
}

console.log("CSS import guard passed. Wingman uses the governed base, reference and workflow themes only.");
