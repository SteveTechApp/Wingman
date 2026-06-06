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
  fs.copyFileSync(file, `${file}.bak-room-templates-safe-${stamp}`);
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
      /(return\s*\(\s*<)(main|section|div)\b/,
      `$1$2 ${pageAttr}`
    );
  }

  /*
    Mark the top "Start blank discovery / No template" panel for hiding.
    This works by finding the JSX block around the known text.
  */
  updated = updated.replace(
    /(<(?:section|article|div)\b(?=[\s\S]{0,900}Start blank discovery)(?=[\s\S]{0,900}No template)([^>]*)className=(["'`])([^"'`]*)(["'`])([^>]*>))/i,
    (match, before, middle, quote1, classes, quote2, after) => {
      if (classes.includes("wm-room-template-blank-strip")) return match;
      return `${before}${middle}className=${quote1}${classes} wm-room-template-blank-strip${quote2}${after}`;
    }
  );

  /*
    Mark the large hero section for compaction.
  */
  updated = updated.replace(
    /(<(?:section|article|div)\b(?=[\s\S]{0,1000}Choose the right starting point faster)([^>]*)className=(["'`])([^"'`]*)(["'`])([^>]*>))/i,
    (match, before, middle, quote1, classes, quote2, after) => {
      if (classes.includes("wm-room-template-compact-hero")) return match;
      return `${before}${middle}className=${quote1}${classes} wm-room-template-compact-hero${quote2}${after}`;
    }
  );

  if (updated !== original) {
    backup(file);
    fs.writeFileSync(file, updated, "utf8");
    console.log(`Updated Room Templates source: ${path.relative(root, file)}`);
  }

  if (updated === original) {
    console.log(`No source change required: ${path.relative(root, file)}`);
  }
}

const start = "/* WINGMAN ROOM TEMPLATES COMPACT SAFE FIX - START */";
const end = "/* WINGMAN ROOM TEMPLATES COMPACT SAFE FIX - END */";

const cssBlock = `${start}
[data-wingman-room-templates-page="true"] .wm-room-template-blank-strip {
  display: none !important;
}

[data-wingman-room-templates-page="true"] .wm-room-template-compact-hero {
  min-height: unset !important;
  height: auto !important;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  margin-top: 0 !important;
  margin-bottom: 0.75rem !important;
}

[data-wingman-room-templates-page="true"] .wm-room-template-compact-hero h1,
[data-wingman-room-templates-page="true"] .wm-room-template-compact-hero h2 {
  font-size: clamp(1.65rem, 2.6vw, 2.5rem) !important;
  line-height: 1.05 !important;
  margin: 0 !important;
}

[data-wingman-room-templates-page="true"] .wm-room-template-compact-hero button {
  min-height: 2.25rem !important;
  padding: 0.55rem 0.85rem !important;
}

[data-wingman-room-templates-page="true"] input[type="search"],
[data-wingman-room-templates-page="true"] input[placeholder*="Search room"],
[data-wingman-room-templates-page="true"] input[placeholder*="product"],
[data-wingman-room-templates-page="true"] input[placeholder*="vertical"] {
  min-height: 2.25rem !important;
}

[data-wingman-room-templates-page="true"] [class*="grid"] {
  gap: 0.45rem !important;
}

[data-wingman-room-templates-page="true"] [class*="grid"] button,
[data-wingman-room-templates-page="true"] [class*="grid"] a {
  min-height: 3.2rem !important;
  padding: 0.55rem 0.7rem !important;
  font-size: 0.78rem !important;
  line-height: 1.12 !important;
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
console.log("Done. Safe Room Templates compact patch applied.");
