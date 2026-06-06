import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const stylePath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");

function fail(message) {
  throw new Error(message);
}

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, `${file}.bak-compact-room-templates-${stamp}`);
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
if (!fs.existsSync(stylePath)) fail("Cannot find src/wingman2/styles/wingman-style-stack.css.");

const sourceFiles = walk(srcDir).filter((file) => /\.(tsx|jsx|ts|js)$/.test(file));

const templateFiles = sourceFiles.filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return /Choose the right starting point faster/i.test(text)
    && /Start discovery/i.test(text)
    && /Product pitch/i.test(text)
    && /templates/i.test(text);
});

if (templateFiles.length === 0) {
  fail("Could not locate the Room Templates page source.");
}

for (const file of templateFiles) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  const pageAttr = 'data-wingman-room-templates-page="true"';

  if (!updated.includes(pageAttr)) {
    updated = updated.replace(
      /(return\s*\(\s*<)(main|section|div)\b(?![^>]*data-wingman-room-templates-page)/,
      `$1$2 ${pageAttr}`
    );
  }

  updated = updated.replace(
    /className=(["'`])([^"'`]*)(\bwm-template-hero\b|\btemplate-hero\b|\broom-template-hero\b)([^"'`]*)\1/g,
    (match, quote, before, heroClass, after) => {
      if (match.includes("wm-room-template-compact-hero")) return match;
      return `className=${quote}${before}${heroClass}${after} wm-room-template-compact-hero${quote}`;
    }
  );

  if (updated !== original) {
    backup(file);
    fs.writeFileSync(file, updated, "utf8");
    console.log(`Updated Room Templates page marker: ${path.relative(root, file)}`);
  }

  if (updated === original) {
    console.log(`No source change required: ${path.relative(root, file)}`);
  }
}

const start = "/* WINGMAN ROOM TEMPLATES COMPACT PAGE FIX - START */";
const end = "/* WINGMAN ROOM TEMPLATES COMPACT PAGE FIX - END */";

const cssBlock = `${start}

/*
  Room Templates compact layout.
  Removes the oversized "Start blank discovery / No template" strip
  and collapses the large hero area so templates are visible above the fold.
*/

[data-wingman-room-templates-page="true"] section:first-of-type:has(:is(h1, h2, h3, p, span):first-child),
[data-wingman-room-templates-page="true"] .wm-template-start-strip,
[data-wingman-room-templates-page="true"] .wm-room-template-start-strip,
[data-wingman-room-templates-page="true"] [class*="start-blank"],
[data-wingman-room-templates-page="true"] [class*="blank-discovery"] {
  display: none !important;
}

/* Text-specific safety net for the exact strip shown in the screenshot. */
[data-wingman-room-templates-page="true"] section:has(:is(h1, h2, h3, p, span):not(svg):contains("No template")) {
  display: none !important;
}

/* Compact the main hero block. */
[data-wingman-room-templates-page="true"] .wm-room-template-compact-hero,
[data-wingman-room-templates-page="true"] [class*="hero"],
[data-wingman-room-templates-page="true"] section:has(:is(h1, h2):not(svg)) {
  min-height: unset !important;
  height: auto !important;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  margin-top: 0 !important;
  margin-bottom: 0.75rem !important;
}

/* Reduce the large heading so it does not dominate the screen. */
[data-wingman-room-templates-page="true"] h1,
[data-wingman-room-templates-page="true"] h2 {
  font-size: clamp(1.65rem, 2.6vw, 2.5rem) !important;
  line-height: 1.05 !important;
  margin: 0 !important;
}

/* Move action buttons into the compact hero height. */
[data-wingman-room-templates-page="true"] .wm-room-template-compact-hero button,
[data-wingman-room-templates-page="true"] [class*="hero"] button {
  min-height: 2.25rem !important;
  padding: 0.55rem 0.85rem !important;
}

/* Bring the search/filter row up. */
[data-wingman-room-templates-page="true"] input[type="search"],
[data-wingman-room-templates-page="true"] input[placeholder*="Search room"],
[data-wingman-room-templates-page="true"] input[placeholder*="product"],
[data-wingman-room-templates-page="true"] input[placeholder*="vertical"] {
  min-height: 2.25rem !important;
}

/* Keep the template grid dense and readable. */
[data-wingman-room-templates-page="true"] [class*="grid"] {
  gap: 0.45rem !important;
}

[data-wingman-room-templates-page="true"] [class*="grid"] button,
[data-wingman-room-templates-page="true"] [class*="grid"] a,
[data-wingman-room-templates-page="true"] [class*="template"] button {
  min-height: 3.2rem !important;
  padding: 0.55rem 0.7rem !important;
  font-size: 0.78rem !important;
  line-height: 1.12 !important;
}

/* Remove excess top blank space inside large cards. */
[data-wingman-room-templates-page="true"] section,
[data-wingman-room-templates-page="true"] article,
[data-wingman-room-templates-page="true"] .wm-card,
[data-wingman-room-templates-page="true"] [class*="card"] {
  scroll-margin-top: 1rem !important;
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
console.log("Done. Room Templates page now has the compact page marker and global compact CSS.");
