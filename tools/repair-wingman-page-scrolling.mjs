import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");

function fail(message) {
  throw new Error(message);
}

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, `${file}.bak-scroll-repair-${stamp}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (!fs.existsSync(cssPath)) {
  fail("Cannot find src/wingman2/styles/wingman-style-stack.css. Run this from C:\\Users\\Steve\\Wingman.");
}

const start = "/* WINGMAN GLOBAL PAGE SCROLL REPAIR - START */";
const end = "/* WINGMAN GLOBAL PAGE SCROLL REPAIR - END */";

const cssBlock = `${start}
/*
  Global Wingman scroll repair.

  Purpose:
  - Keep the left navigation and top bar stable.
  - Make the main Wingman content area scroll when page content runs below the viewport.
  - Stop page cards, page hosts and route wrappers from clipping content off the bottom.
  - Add safe bottom padding so buttons/content are not hidden behind the browser/taskbar edge.
*/

/* App root must occupy the viewport, but not trap content invisibly. */
html,
body,
#root {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 100% !important;
}

html {
  height: 100% !important;
  overflow: hidden !important;
}

body,
#root {
  height: 100dvh !important;
  max-height: 100dvh !important;
  overflow: hidden !important;
}

/* Main shell: fixed viewport shell with internal scrolling on the content lane. */
.wingman-shell,
.wingman-authority-shell,
#root > .wingman-shell,
#root > .wingman-authority-shell {
  height: 100dvh !important;
  max-height: 100dvh !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

/* Horizontal app layout must allow the workspace to shrink and scroll internally. */
.wingman-workspace,
.wingman-mobile-shell,
.wingman-shell > div,
.wingman-authority-shell > div {
  min-height: 0 !important;
  max-height: 100dvh !important;
  overflow: hidden !important;
}

/* The top bar remains visible; the main page underneath becomes the scrolling region. */
.wingman-app-main,
main.wingman-app-main {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: calc(100dvh - var(--wingman-topbar-height, 4rem)) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  scrollbar-gutter: stable both-edges !important;
  padding-bottom: max(3.5rem, env(safe-area-inset-bottom)) !important;
}

/* Make route/page wrappers expand naturally inside the scrolling main area. */
.wingman-page-host,
.wm-page,
[data-wingman-page],
[data-wingman-screen],
[data-wingman-dashboard-page],
[data-wingman-room-templates-page],
[data-wingman-product-intelligence-page],
[data-wingman-compare-screen],
[data-wingman-route] .wingman-page-host {
  min-height: auto !important;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}

/* Stop common full-screen utility classes from clipping route content inside the page host. */
.wingman-page-host [class~="h-screen"],
.wingman-page-host [class~="max-h-screen"],
.wingman-page-host [class*="h-[100vh"],
.wingman-page-host [class*="max-h-[100vh"],
.wingman-page-host [class*="h-dvh"],
.wingman-page-host [class*="max-h-dvh"] {
  height: auto !important;
  max-height: none !important;
}

/* Sections/cards should not hide content unless they are deliberate internal scrollers. */
.wingman-page-host section,
.wingman-page-host article,
.wingman-page-host form,
.wingman-page-host .wm-card,
.wingman-page-host [class*="card"],
.wingman-page-host [class*="panel"] {
  max-height: none !important;
}

/* Undo broad overflow-hidden on page-level containers, while preserving obvious internal UI controls. */
.wingman-page-host > div[class*="overflow-hidden"],
.wingman-page-host > section[class*="overflow-hidden"],
.wingman-page-host > article[class*="overflow-hidden"],
.wingman-page-host .wm-page[class*="overflow-hidden"],
.wingman-page-host [data-wingman-page][class*="overflow-hidden"],
.wingman-page-host [data-wingman-screen][class*="overflow-hidden"] {
  overflow: visible !important;
}

/* Keep deliberate list panes usable when a page has a two-column browser/list layout. */
.wingman-page-host [class*="record-list"],
.wingman-page-host [class*="term-list"],
.wingman-page-host [class*="search-results"],
.wingman-page-host [class*="template-list"],
.wingman-page-host [class*="result-list"],
.wingman-page-host [class*="scroll-panel"],
.wingman-page-host [data-wingman-scroll-panel="true"] {
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

/* Make bottom actions reachable on every page. */
.wingman-page-host::after,
.wm-page::after {
  content: "";
  display: block;
  height: 2.25rem;
  flex: 0 0 auto;
}

/* Mobile/narrow displays need a little more breathing room at the bottom. */
@media (max-width: 980px) {
  .wingman-app-main,
  main.wingman-app-main {
    max-height: calc(100dvh - var(--wingman-topbar-height, 3.5rem)) !important;
    padding-bottom: max(5rem, env(safe-area-inset-bottom)) !important;
  }
}

/* Fallback for browsers where dvh behaves unexpectedly. */
@supports not (height: 100dvh) {
  body,
  #root,
  .wingman-shell,
  .wingman-authority-shell {
    height: 100vh !important;
    max-height: 100vh !important;
  }

  .wingman-app-main,
  main.wingman-app-main {
    max-height: calc(100vh - var(--wingman-topbar-height, 4rem)) !important;
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
console.log("Global page scroll repair applied.");
console.log("Next: run typecheck/build, restart Vite, then hard refresh.");
