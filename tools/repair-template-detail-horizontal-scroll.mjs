import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const cssPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");

function fail(message) {
  throw new Error(message);
}

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, `${file}.bak-template-detail-horizontal-scroll-${stamp}`);
}

function walk(dir) {
  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".git"].includes(entry.name)) continue;
      out.push(...walk(full));
      continue;
    }

    out.push(full);
  }

  return out;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (!fs.existsSync(srcDir)) fail("Cannot find src folder. Run this from C:\\Users\\Steve\\Wingman.");
if (!fs.existsSync(cssPath)) fail("Cannot find src/wingman2/styles/wingman-style-stack.css.");

const sourceFiles = walk(srcDir).filter((file) => /\.(tsx|jsx|ts|js)$/.test(file));

const templateDetailFiles = sourceFiles.filter((file) => {
  const text = fs.readFileSync(file, "utf8");

  return /Room template review/i.test(text)
    || /Room design template/i.test(text)
    || /Example connectivity view/i.test(text)
    || /Room schematic/i.test(text)
    || /Export BOM/i.test(text);
});

if (templateDetailFiles.length === 0) {
  fail("Could not find the Room Template detail source. Search manually for 'Example connectivity view'.");
}

for (const file of templateDetailFiles) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  const detailAttr = 'data-wingman-template-detail-page="true"';

  if (!updated.includes(detailAttr)) {
    updated = updated.replace(
      /(return\s*\(\s*<)(main|section|div)\b/,
      `$1$2 ${detailAttr}`
    );
  }

  updated = updated.replace(
    /className=(["'`])([^"'`]*(?:overflow-x-auto|overflow-auto|whitespace-nowrap|flex-nowrap)[^"'`]*)\1/g,
    (match, quote, classes) => {
      const cleaned = classes
        .replace(/\boverflow-x-auto\b/g, "overflow-x-hidden")
        .replace(/\boverflow-auto\b/g, "overflow-y-auto overflow-x-hidden")
        .replace(/\bwhitespace-nowrap\b/g, "whitespace-normal")
        .replace(/\bflex-nowrap\b/g, "flex-wrap")
        .replace(/\s+/g, " ")
        .trim();

      return `className=${quote}${cleaned}${quote}`;
    }
  );

  updated = updated.replace(
    /className=(["'`])([^"'`]*(?:Room schematic|Example connectivity view|schematic|connectivity|signal|flow)[^"'`]*)\1/gi,
    (match, quote, classes) => {
      if (classes.includes("wm-template-detail-no-horizontal-scroll")) return match;
      return `className=${quote}${classes} wm-template-detail-no-horizontal-scroll${quote}`;
    }
  );

  if (updated !== original) {
    backup(file);
    fs.writeFileSync(file, updated, "utf8");
    console.log(`Updated template detail source: ${path.relative(root, file)}`);
  }

  if (updated === original) {
    console.log(`No source edits required: ${path.relative(root, file)}`);
  }
}

const start = "/* WINGMAN TEMPLATE DETAIL NO HORIZONTAL SCROLL - START */";
const end = "/* WINGMAN TEMPLATE DETAIL NO HORIZONTAL SCROLL - END */";

const cssBlock = `${start}
/*
  Template detail repair:
  - Removes the horizontal scrollbar from the room schematic / connectivity flow.
  - Converts the flow into a wrapping grid.
  - Keeps vertical scroll only if the full workflow cannot fit on one screen.
*/

html[data-wingman-route="templates"] body,
html[data-wingman-route="templates"] #root,
html[data-wingman-route="templates"] .wingman-shell,
html[data-wingman-route="templates"] .wingman-workspace,
html[data-wingman-route="templates"] .wingman-app-main,
html[data-wingman-route="templates"] .wingman-page-host,
[data-wingman-template-detail-page="true"] {
  max-width: 100vw !important;
  overflow-x: hidden !important;
}

[data-wingman-template-detail-page="true"] *,
html[data-wingman-route="templates"] .wingman-page-host * {
  min-width: 0 !important;
  box-sizing: border-box !important;
}

[data-wingman-template-detail-page="true"] [class*="overflow-x-auto"],
[data-wingman-template-detail-page="true"] [class*="overflow-auto"],
html[data-wingman-route="templates"] .wingman-page-host [class*="overflow-x-auto"],
html[data-wingman-route="templates"] .wingman-page-host [class*="overflow-auto"] {
  overflow-x: hidden !important;
  max-width: 100% !important;
}

/* The schematic flow should wrap instead of scrolling sideways. */
[data-wingman-template-detail-page="true"] .wm-template-detail-no-horizontal-scroll,
[data-wingman-template-detail-page="true"] [class*="schematic"],
[data-wingman-template-detail-page="true"] [class*="connectivity"],
[data-wingman-template-detail-page="true"] [class*="signal-flow"],
html[data-wingman-route="templates"] .wingman-page-host [class*="schematic"],
html[data-wingman-route="templates"] .wingman-page-host [class*="connectivity"],
html[data-wingman-route="templates"] .wingman-page-host [class*="signal-flow"] {
  max-width: 100% !important;
  overflow-x: hidden !important;
}

/* Convert long horizontal card rows into wrapped rows. */
[data-wingman-template-detail-page="true"] .wm-template-detail-no-horizontal-scroll > div,
[data-wingman-template-detail-page="true"] [class*="schematic"] > div,
[data-wingman-template-detail-page="true"] [class*="connectivity"] > div,
[data-wingman-template-detail-page="true"] [class*="signal-flow"] > div,
html[data-wingman-route="templates"] .wingman-page-host [class*="schematic"] > div,
html[data-wingman-route="templates"] .wingman-page-host [class*="connectivity"] > div,
html[data-wingman-route="templates"] .wingman-page-host [class*="signal-flow"] > div {
  max-width: 100% !important;
  flex-wrap: wrap !important;
}

/* Cards in the flow become responsive tiles. */
[data-wingman-template-detail-page="true"] .wm-template-detail-no-horizontal-scroll :is(article, section, div)[class*="card"],
[data-wingman-template-detail-page="true"] [class*="schematic"] :is(article, section, div)[class*="card"],
[data-wingman-template-detail-page="true"] [class*="connectivity"] :is(article, section, div)[class*="card"],
[data-wingman-template-detail-page="true"] [class*="signal-flow"] :is(article, section, div)[class*="card"] {
  flex: 1 1 min(15rem, 100%) !important;
  width: auto !important;
  max-width: 100% !important;
}

/* Catch Tailwind width utilities used by the flow cards. */
[data-wingman-template-detail-page="true"] [class*="w-["],
html[data-wingman-route="templates"] .wingman-page-host [class*="w-["] {
  max-width: 100% !important;
}

/* Remove visual arrow separators where wrapping would make them misleading. */
[data-wingman-template-detail-page="true"] .wm-template-detail-no-horizontal-scroll svg,
[data-wingman-template-detail-page="true"] [class*="schematic"] svg,
[data-wingman-template-detail-page="true"] [class*="connectivity"] svg,
[data-wingman-template-detail-page="true"] [class*="signal-flow"] svg {
  flex: 0 0 auto !important;
  max-width: 1.25rem !important;
}

/* Route-specific hard stop for the bottom horizontal scrollbar seen on template detail pages. */
html[data-wingman-route="templates"] .wingman-page-host {
  overflow-x: hidden !important;
}

html[data-wingman-route="templates"] .wingman-app-main {
  overflow-x: hidden !important;
  overflow-y: auto !important;
}
${end}`;

const originalCss = fs.readFileSync(cssPath, "utf8");
let updatedCss = originalCss;

const blockRegex = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

if (blockRegex.test(updatedCss)) {
  updatedCss = updatedCss.replace(blockRegex, cssBlock);
}

if (!blockRegex.test(originalCss)) {
  updatedCss = `${updatedCss.trimEnd()}\n\n${cssBlock}\n`;
}

if (updatedCss !== originalCss) {
  backup(cssPath);
  fs.writeFileSync(cssPath, updatedCss, "utf8");
  console.log(`Updated CSS: ${path.relative(root, cssPath)}`);
}

console.log("");
console.log("Template detail horizontal scroll repair applied.");
