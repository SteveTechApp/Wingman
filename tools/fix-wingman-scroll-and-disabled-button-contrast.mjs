import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stylePath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");

function fail(message) {
  throw new Error(message);
}

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, `${file}.bak-scroll-disabled-contrast-${stamp}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (!fs.existsSync(stylePath)) {
  fail("Cannot find src/wingman2/styles/wingman-style-stack.css. Run this from C:\\Users\\Steve\\Wingman.");
}

const start = "/* WINGMAN GLOBAL SCROLL AND DISABLED BUTTON CONTRAST FIX - START */";
const end = "/* WINGMAN GLOBAL SCROLL AND DISABLED BUTTON CONTRAST FIX - END */";

const cssBlock = `${start}

/* 
  Global page scroll repair.
  Several Wingman pages are taller than one screen, but fixed-height / overflow-hidden wrappers
  can prevent the browser from scrolling to the lower content.
*/
html,
body,
#root {
  min-height: 100% !important;
  height: auto !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

body {
  min-height: 100svh !important;
}

#root {
  min-height: 100svh !important;
}

/* Top-level app wrappers should not lock the entire UI to one viewport height. */
#root > div,
#root > main,
#root > section {
  min-height: 100svh !important;
  height: auto !important;
  max-height: none !important;
}

/* Common Tailwind viewport-height classes used on shell wrappers. */
#root > [class*="h-screen"],
#root > [class*="min-h-screen"],
#root > div > [class*="h-screen"],
#root > div > [class*="min-h-screen"],
#root main[class*="h-screen"],
#root main[class*="min-h-screen"] {
  min-height: 100svh !important;
  height: auto !important;
  max-height: none !important;
}

/* Main content areas should be allowed to extend and let the page scroll. */
main,
[role="main"],
[data-wingman-page],
[data-wingman-screen],
[data-wingman-glossary-page],
[data-wingman-product-intelligence-page="true"] {
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
}

/* Keep panels usable where content is intentionally scrollable, but do not trap the whole page. */
main[class*="overflow-hidden"],
[role="main"][class*="overflow-hidden"],
[data-wingman-page][class*="overflow-hidden"],
[data-wingman-screen][class*="overflow-hidden"] {
  overflow-y: visible !important;
  overflow-x: hidden !important;
}

/*
  Disabled / unavailable button contrast repair.
  Fixes pale pills such as "Use in call" while keeping them visibly disabled.
*/
button:disabled,
button[disabled],
button[aria-disabled="true"],
[role="button"][aria-disabled="true"],
a[aria-disabled="true"] {
  background: rgba(6, 24, 38, 0.96) !important;
  background-color: rgba(6, 24, 38, 0.96) !important;
  background-image: none !important;
  border: 1px solid rgba(58, 226, 245, 0.34) !important;
  color: rgba(143, 246, 255, 0.74) !important;
  -webkit-text-fill-color: rgba(143, 246, 255, 0.74) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.035) !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
  text-shadow: none !important;
}

button:disabled *,
button[disabled] *,
button[aria-disabled="true"] *,
[role="button"][aria-disabled="true"] *,
a[aria-disabled="true"] * {
  color: rgba(143, 246, 255, 0.74) !important;
  -webkit-text-fill-color: rgba(143, 246, 255, 0.74) !important;
}

/* Extra protection against light Tailwind disabled states. */
button:disabled[class*="bg-white"],
button:disabled[class*="bg-slate-"],
button:disabled[class*="bg-gray-"],
button:disabled[class*="bg-zinc-"],
button:disabled[class*="bg-neutral-"],
button:disabled[class*="bg-stone-"],
button[disabled][class*="bg-white"],
button[disabled][class*="bg-slate-"],
button[disabled][class*="bg-gray-"],
button[disabled][class*="bg-zinc-"],
button[disabled][class*="bg-neutral-"],
button[disabled][class*="bg-stone-"] {
  background: rgba(6, 24, 38, 0.96) !important;
  background-color: rgba(6, 24, 38, 0.96) !important;
  color: rgba(143, 246, 255, 0.74) !important;
  -webkit-text-fill-color: rgba(143, 246, 255, 0.74) !important;
}

/* Disabled light pill / badge style buttons. */
:is(button, a, [role="button"]):disabled[class*="rounded-full"],
:is(button, a, [role="button"])[disabled][class*="rounded-full"],
:is(button, a, [role="button"])[aria-disabled="true"][class*="rounded-full"] {
  background: #061826 !important;
  background-color: #061826 !important;
  border-color: rgba(58, 226, 245, 0.38) !important;
  color: rgba(143, 246, 255, 0.72) !important;
  -webkit-text-fill-color: rgba(143, 246, 255, 0.72) !important;
}

${end}`;

const original = fs.readFileSync(stylePath, "utf8");
let updated = original;

const blockRegex = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

if (blockRegex.test(updated)) {
  updated = updated.replace(blockRegex, cssBlock);
}

if (!blockRegex.test(original)) {
  updated = `${updated.trimEnd()}\n\n${cssBlock}\n`;
}

if (updated !== original) {
  backup(stylePath);
  fs.writeFileSync(stylePath, updated, "utf8");
  console.log(`Updated CSS: ${path.relative(root, stylePath)}`);
}

console.log("");
console.log("Done. Restart Vite, then hard refresh the browser.");
