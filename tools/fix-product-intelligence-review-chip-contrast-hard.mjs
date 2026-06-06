import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const stylePath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");

function fail(message) {
  throw new Error(message);
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

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, `${file}.bak-pi-review-chip-contrast-${stamp}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (!fs.existsSync(srcDir)) fail("Cannot find src folder. Run this from C:\\Users\\Steve\\Wingman.");
if (!fs.existsSync(stylePath)) fail("Cannot find src/wingman2/styles/wingman-style-stack.css.");

const sourceFiles = walk(srcDir).filter((file) => /\.(tsx|jsx|ts|js)$/.test(file));

const pageFiles = sourceFiles.filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return /Review queue/i.test(text)
    && /Competitor builder/i.test(text)
    && /Classification editor/i.test(text)
    && /Needs review/i.test(text);
});

if (pageFiles.length === 0) {
  fail("Could not locate the Product Intelligence page source.");
}

const pageAttr = 'data-wingman-product-intelligence-page="true"';

for (const file of pageFiles) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;
  let changedClasses = 0;

  if (!updated.includes(pageAttr)) {
    updated = updated.replace(
      /(return\s*\(\s*<)(main|section|div)\b(?![^>]*data-wingman-product-intelligence-page)/,
      `$1$2 ${pageAttr}`
    );
  }

  updated = updated.replace(
    /className=(["'`])([^"'`]*rounded-full[^"'`]*(?:bg-amber|bg-yellow|bg-orange|bg-\[\#fff|bg-\[\#fef|bg-\[\#ff)[^"'`]*)\1/g,
    (match, quote, classes) => {
      if (classes.includes("wm-product-intelligence-review-chip")) return match;

      const cleaned = classes
        .replace(/\bbg-(amber|yellow|orange)-\d+(?:\/\d+)?\b/g, "")
        .replace(/\bbg-\[\#(?:fff|fef|ff)[^\]]+\]/gi, "")
        .replace(/\btext-(amber|yellow|orange|cyan|sky)-\d+(?:\/\d+)?\b/g, "")
        .replace(/\btext-\[\#[0-9a-f]{3,8}\]/gi, "")
        .replace(/\bborder-(amber|yellow|orange)-\d+(?:\/\d+)?\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

      changedClasses += 1;
      return `className=${quote}${cleaned} wm-product-intelligence-review-chip${quote}`;
    }
  );

  if (updated !== original) {
    backup(file);
    fs.writeFileSync(file, updated, "utf8");
    console.log(`Updated Product Intelligence source: ${path.relative(root, file)}`);
    console.log(`  Review chip class fixes applied: ${changedClasses}`);
  }

  if (updated === original) {
    console.log(`No source change needed: ${path.relative(root, file)}`);
  }
}

const start = "/* WINGMAN PRODUCT INTELLIGENCE REVIEW CHIP CONTRAST HARD FIX - START */";
const end = "/* WINGMAN PRODUCT INTELLIGENCE REVIEW CHIP CONTRAST HARD FIX - END */";

const cssBlock = `${start}
:root {
  --wm-pi-review-chip-bg: #061826;
  --wm-pi-review-chip-border: rgba(58, 226, 245, 0.58);
  --wm-pi-review-chip-text: #8ff6ff;
}

.wm-product-intelligence-review-chip,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-amber-"],
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-yellow-"],
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-orange-"],
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-[#fff"],
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-[#fef"],
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-[#ff"],
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][style*="background"][style*="255"],
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][style*="#fff"],
:is(span, button, div, a)[class*="rounded-full"][class*="uppercase"][class*="bg-amber-"],
:is(span, button, div, a)[class*="rounded-full"][class*="uppercase"][class*="bg-yellow-"],
:is(span, button, div, a)[class*="rounded-full"][class*="uppercase"][class*="bg-orange-"],
:is(span, button, div, a)[class*="rounded-full"][class*="uppercase"][style*="background"][style*="255"],
:is(span, button, div, a)[class*="rounded-full"][class*="uppercase"][style*="#fff"] {
  background: var(--wm-pi-review-chip-bg) !important;
  background-color: var(--wm-pi-review-chip-bg) !important;
  background-image: none !important;
  border: 1px solid var(--wm-pi-review-chip-border) !important;
  color: var(--wm-pi-review-chip-text) !important;
  -webkit-text-fill-color: var(--wm-pi-review-chip-text) !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 18px rgba(58, 226, 245, 0.16) !important;
  text-shadow: none !important;
  white-space: nowrap !important;
}

.wm-product-intelligence-review-chip *,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-amber-"] *,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-yellow-"] *,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-orange-"] *,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-[#fff"] *,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-[#fef"] *,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][class*="bg-[#ff"] *,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][style*="background"][style*="255"] *,
body:has([data-wingman-product-intelligence-page="true"]) :is(span, button, div, a)[class*="rounded-full"][style*="#fff"] * {
  color: var(--wm-pi-review-chip-text) !important;
  -webkit-text-fill-color: var(--wm-pi-review-chip-text) !important;
}
${end}`;

const originalCss = fs.readFileSync(stylePath, "utf8");
let updatedCss = originalCss;

const blockRegex = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

if (blockRegex.test(updatedCss)) {
  updatedCss = updatedCss.replace(blockRegex, cssBlock);
}

if (!blockRegex.test(originalCss)) {
  updatedCss = `${updatedCss.trimEnd()}\n\n${cssBlock}\n`;
}

if (updatedCss !== originalCss) {
  backup(stylePath);
  fs.writeFileSync(stylePath, updatedCss, "utf8");
  console.log(`Updated CSS: ${path.relative(root, stylePath)}`);
}

console.log("");
console.log("Done. Restart Vite if it is running, then hard refresh the Product Intelligence page.");
