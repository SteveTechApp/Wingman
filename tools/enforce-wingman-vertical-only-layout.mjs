import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");

function fail(message) {
  throw new Error(message);
}

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, `${file}.bak-vertical-only-layout-${stamp}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (!fs.existsSync(cssPath)) {
  fail("Cannot find src/wingman2/styles/wingman-style-stack.css. Run this from C:\\Users\\Steve\\Wingman.");
}

const start = "/* WINGMAN VERTICAL ONLY LAYOUT POLICY - START */";
const end = "/* WINGMAN VERTICAL ONLY LAYOUT POLICY - END */";

const cssBlock = `${start}
/*
  Wingman vertical-only layout policy.

  Rules:
  - No page-level horizontal scrolling.
  - Main route content may scroll vertically only when unavoidable.
  - Nested flex/grid/card containers must shrink instead of forcing the viewport wider.
  - Long labels, SKUs, URLs and product names wrap rather than creating horizontal overflow.
  - Tables/media/diagrams scale or wrap inside the page instead of widening the page.
*/

/* Absolute page-level horizontal scroll lock. */
html,
body,
#root,
.wingman-shell,
.wingman-authority-shell,
.wingman-mobile-shell,
.wingman-workspace,
.wingman-app-main,
main.wingman-app-main,
.wingman-page-host,
.wm-page {
  max-width: 100vw !important;
  overflow-x: hidden !important;
}

/* The app shell remains viewport based; only the main content lane scrolls vertically. */
html,
body,
#root {
  width: 100% !important;
  min-width: 0 !important;
}

body,
#root,
.wingman-shell,
.wingman-authority-shell {
  height: 100dvh !important;
  max-height: 100dvh !important;
  overflow: hidden !important;
}

.wingman-app-main,
main.wingman-app-main {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior-y: contain !important;
  scrollbar-gutter: stable !important;
  padding-bottom: max(3.5rem, env(safe-area-inset-bottom)) !important;
}

/* Route wrappers must not create their own horizontal viewport. */
.wingman-page-host,
.wingman-page-host > *,
.wm-page,
[data-wingman-page],
[data-wingman-screen],
[data-wingman-route],
[data-wingman-dashboard-page],
[data-wingman-room-templates-page],
[data-wingman-compare-screen],
[data-wingman-glossary-page],
[data-wingman-product-intelligence-page] {
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

/* Critical fix for nested flex/grid layouts. Without min-width:0, cards force sideways overflow. */
.wingman-page-host *,
.wm-page *,
.wingman-app-main *,
main.wingman-app-main * {
  box-sizing: border-box !important;
  min-width: 0;
}

.wingman-page-host :is(.flex, [class*="flex"], .grid, [class*="grid"]),
.wm-page :is(.flex, [class*="flex"], .grid, [class*="grid"]) {
  min-width: 0 !important;
  max-width: 100% !important;
}

.wingman-page-host :is(.flex, [class*="flex"]) > *,
.wm-page :is(.flex, [class*="flex"]) > *,
.wingman-page-host :is(.grid, [class*="grid"]) > *,
.wm-page :is(.grid, [class*="grid"]) > * {
  min-width: 0 !important;
  max-width: 100% !important;
}

/* Cards, panels and forms should wrap content, not widen the page. */
.wingman-page-host :is(section, article, form, aside, header, footer),
.wm-page :is(section, article, form, aside, header, footer),
.wingman-page-host :is(.wm-card, [class*="card"], [class*="panel"], [class*="hero"]),
.wm-page :is(.wm-card, [class*="card"], [class*="panel"], [class*="hero"]) {
  min-width: 0 !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

/* Text-heavy AV/product content must wrap instead of creating horizontal scroll. */
.wingman-page-host :is(p, li, dd, dt, span, strong, small, label, h1, h2, h3, h4, h5, h6, button, a),
.wm-page :is(p, li, dd, dt, span, strong, small, label, h1, h2, h3, h4, h5, h6, button, a) {
  overflow-wrap: anywhere !important;
  word-break: normal !important;
}

/* Inputs must fit the page width. */
.wingman-page-host :is(input, textarea, select),
.wm-page :is(input, textarea, select) {
  max-width: 100% !important;
}

/* Media and diagrams scale to their container rather than forcing sideways overflow. */
.wingman-page-host :is(img, svg, canvas, video, iframe),
.wm-page :is(img, svg, canvas, video, iframe) {
  max-width: 100% !important;
}

/* Tables should fit the available page width; cells wrap. */
.wingman-page-host table,
.wm-page table {
  width: 100% !important;
  max-width: 100% !important;
  table-layout: fixed !important;
  border-collapse: collapse !important;
}

.wingman-page-host :is(th, td),
.wm-page :is(th, td) {
  overflow-wrap: anywhere !important;
  word-break: normal !important;
  white-space: normal !important;
}

/* Code/pre blocks are a common hidden horizontal-scroll source. Wrap them in Wingman UI. */
.wingman-page-host :is(pre, code),
.wm-page :is(pre, code) {
  max-width: 100% !important;
  white-space: pre-wrap !important;
  overflow-wrap: anywhere !important;
  overflow-x: hidden !important;
}

/* Button rows and chip rows should wrap instead of extending sideways. */
.wingman-page-host :is([class*="button-row"], [class*="actions"], [class*="chips"], [class*="filters"], [class*="tabs"]),
.wm-page :is([class*="button-row"], [class*="actions"], [class*="chips"], [class*="filters"], [class*="tabs"]) {
  flex-wrap: wrap !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

/* Dense grids should reduce columns automatically on narrower screens. */
@media (max-width: 1320px) {
  .wingman-page-host [class*="grid-cols-6"],
  .wingman-page-host [class*="grid-cols-7"],
  .wingman-page-host [class*="grid-cols-8"],
  .wm-page [class*="grid-cols-6"],
  .wm-page [class*="grid-cols-7"],
  .wm-page [class*="grid-cols-8"] {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 980px) {
  .wingman-page-host [class*="grid-cols-4"],
  .wingman-page-host [class*="grid-cols-5"],
  .wingman-page-host [class*="grid-cols-6"],
  .wingman-page-host [class*="grid-cols-7"],
  .wingman-page-host [class*="grid-cols-8"],
  .wm-page [class*="grid-cols-4"],
  .wm-page [class*="grid-cols-5"],
  .wm-page [class*="grid-cols-6"],
  .wm-page [class*="grid-cols-7"],
  .wm-page [class*="grid-cols-8"] {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .wingman-app-main,
  main.wingman-app-main {
    padding-bottom: max(5rem, env(safe-area-inset-bottom)) !important;
  }
}
${end}`;

const original = fs.readFileSync(cssPath, "utf8");
let updated = original;

const blockRegex = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

if (blockRegex.test(updated)) {
  updated = updated.replace(blockRegex, cssBlock);
}

if (!blockRegex.test(original)) {
  updated = `${updated.trimEnd()}\n\n${cssBlock}\n`;
}

if (updated !== original) {
  backup(cssPath);
  fs.writeFileSync(cssPath, updated, "utf8");
  console.log(`Updated CSS: ${path.relative(root, cssPath)}`);
}

console.log("");
console.log("Vertical-only layout policy applied.");
console.log("Next: typecheck, build, restart Vite and hard refresh.");
