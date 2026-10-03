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
  fs.copyFileSync(file, `${file}.bak-force-pi-chip-dark-${stamp}`);
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

const targetFiles = sourceFiles.filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return /Product Intelligence/i.test(text)
    && /Review queue/i.test(text)
    && /Needs review/i.test(text);
});

if (targetFiles.length === 0) {
  fail("Could not find the Product Intelligence source file containing Needs review.");
}

const chipClass = "wm-product-intelligence-status-chip";

for (const file of targetFiles) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  /*
    Replace likely light status utility classes in this page only.
    This handles mapped status style objects, template strings and direct className strings.
  */
  updated = updated
    .replace(/\bbg-(amber|yellow|orange|stone|neutral|zinc|slate|gray)-(50|100|200|300)(?:\/\d+)?\b/g, "bg-[#061826]")
    .replace(/\bborder-(amber|yellow|orange|stone|neutral|zinc|slate|gray)-(50|100|200|300|400)(?:\/\d+)?\b/g, "border-[#3ae2f5]/45")
    .replace(/\btext-(amber|yellow|orange|stone|neutral|zinc|slate|gray)-(700|800|900|950)(?:\/\d+)?\b/g, "text-[#8ff6ff]")
    .replace(/\bbg-\[#(?:fff|fef|ffed|fff4|fff2|fff3|fffa|fdf|fef3|fef9|faf|f8f|f5f)[0-9a-f]*\]/gi, "bg-[#061826]")
    .replace(/\bborder-\[#(?:fff|fef|ffed|fff4|fff2|fff3|fffa|fdf|fef3|fef9|faf|f8f|f5f)[0-9a-f]*\]/gi, "border-[#3ae2f5]/45")
    .replace(/\btext-\[#(?:0f172a|111827|1f2937|334155|374151|422006|451a03|713f12|78350f|7c2d12|854d0e|92400e)\]/gi, "text-[#8ff6ff]");

  /*
    Add a guaranteed semantic chip class to rounded status elements on this page.
    This catches source structures where the chip class is assembled across several tokens.
  */
  updated = updated.replace(
    /className=(["'`])([^"'`]*(?:rounded-full|rounded-\[999px\])[^"'`]*)\1/g,
    (match, quote, classes) => {
      if (classes.includes(chipClass)) return match;

      const isStatusLike =
        /Needs review|Approved|Rejected|Draft|Review|status|confidence|uppercase|text-xs|tracking/i.test(classes)
        || /bg-\[#061826\]|border-\[#3ae2f5\]|text-\[#8ff6ff\]/i.test(classes);

      if (!isStatusLike) return match;

      return `className=${quote}${classes} ${chipClass}${quote}`;
    }
  );

  if (updated !== original) {
    backup(file);
    fs.writeFileSync(file, updated, "utf8");
    console.log(`Updated Product Intelligence source: ${path.relative(root, file)}`);
  }

  if (updated === original) {
    console.log(`No source edits required: ${path.relative(root, file)}`);
  }
}

const start = "/* WINGMAN PRODUCT INTELLIGENCE STATUS CHIP FINAL OVERRIDE - START */";
const end = "/* WINGMAN PRODUCT INTELLIGENCE STATUS CHIP FINAL OVERRIDE - END */";

const cssBlock = `${start}
.wm-product-intelligence-status-chip {
  background: #061826 !important;
  background-color: #061826 !important;
  background-image: none !important;
  border: 1px solid rgba(58, 226, 245, 0.48) !important;
  color: #8ff6ff !important;
  -webkit-text-fill-color: #8ff6ff !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 18px rgba(58, 226, 245, 0.14) !important;
  text-shadow: none !important;
  opacity: 1 !important;
}

.wm-product-intelligence-status-chip *,
.wm-product-intelligence-status-chip span {
  color: #8ff6ff !important;
  -webkit-text-fill-color: #8ff6ff !important;
}

/* Global safety net for any remaining pale rounded status pills in the dark Wingman UI. */
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-amber-50"],
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-amber-100"],
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-yellow-50"],
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-yellow-100"],
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-orange-50"],
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-orange-100"],
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-white"],
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-slate-50"],
#root :is(span, button, div, a)[class*="rounded-full"][class*="bg-gray-50"] {
  background: #061826 !important;
  background-color: #061826 !important;
  border-color: rgba(58, 226, 245, 0.48) !important;
  color: #8ff6ff !important;
  -webkit-text-fill-color: #8ff6ff !important;
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
console.log("Done. The Product Intelligence Needs review pills are now patched at source level.");
