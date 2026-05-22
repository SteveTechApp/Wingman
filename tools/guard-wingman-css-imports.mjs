import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const mainEntry = path.join(root, "src", "main.tsx");
const styleStack = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");
const allowed = new Set([
  "src/main.tsx"
]);

const expectedMainCssImport = "./wingman2/styles/wingman-style-stack.css";
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
  console.error("Blocked: CSS imports are only allowed through src/main.tsx -> wingman-style-stack.css");
  console.error("");

  for (const offender of offenders) {
    console.error(`${offender.file} imports ${offender.import}`);
  }

  process.exit(1);
}

const mainRaw = fs.readFileSync(mainEntry, "utf8");
const mainCssImports = [...mainRaw.matchAll(/import\s+["']([^"']+\.css)["'];/g)].map((match) => match[1]);

if (mainCssImports.length !== 1 || mainCssImports[0] !== expectedMainCssImport) {
  console.error("Blocked: src/main.tsx must import exactly one stylesheet: wingman-style-stack.css");
  console.error(`Found: ${mainCssImports.length ? mainCssImports.join(", ") : "none"}`);
  process.exit(1);
}

const styleStackRaw = fs.readFileSync(styleStack, "utf8");

if (/@import\s+["']/.test(styleStackRaw)) {
  console.error("Blocked: wingman-style-stack.css must not import page, route, or patch stylesheets.");
  console.error("Keep the Wingman design system central in the style stack.");
  process.exit(1);
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

console.log("CSS import guard passed. Only main.tsx imports the Wingman style stack.");
