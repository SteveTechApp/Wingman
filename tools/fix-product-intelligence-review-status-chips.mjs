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
  fs.copyFileSync(file, `${file}.bak-product-intelligence-status-${stamp}`);
}

if (!fs.existsSync(srcDir)) fail("Cannot find src folder. Run this from C:\\Users\\Steve\\Wingman.");
if (!fs.existsSync(stylePath)) fail("Cannot find src/wingman2/styles/wingman-style-stack.css.");

const sourceFiles = walk(srcDir).filter((file) => /\.(tsx|jsx|ts|js)$/.test(file));

const pageFiles = sourceFiles.filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return /Review queue/i.test(text) && /Competitor builder/i.test(text) && /Classification editor/i.test(text);
});

if (pageFiles.length === 0) {
  fail("Could not locate the Product Intelligence page source. Search for Review queue / Competitor builder manually.");
}

const pageAttr = 'data-wingman-product-intelligence-page="true"';

for (const file of pageFiles) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  if (!updated.includes(pageAttr)) {
    const openers = [
      /<main\b(?![^>]*data-wingman-product-intelligence-page)/,
      /<section\b(?![^>]*data-wingman-product-intelligence-page)/,
      /<div\b(?![^>]*data-wingman-product-intelligence-page)/
    ];

    for (const opener of openers) {
      if (updated === original && opener.test(updated)) {
        updated = updated.replace(opener, (match) => `${match} ${pageAttr}`);
      }
    }
  }

  if (updated !== original) {
    backup(file);
    fs.writeFileSync(file, updated, "utf8");
    console.log(`Updated page marker: ${path.relative(root, file)}`);
  }

  if (updated === original) {
    console.log(`Page marker already present or no wrapper changed: ${path.relative(root, file)}`);
  }
}

const start = "/* WINGMAN PRODUCT INTELLIGENCE REVIEW STATUS CHIPS - START */";
const end = "/* WINGMAN PRODUCT INTELLIGENCE REVIEW STATUS CHIPS - END */";

const cssBlock = `${start}
[data-wingman-product-intelligence-page="true"] [class*="bg-amber-"]:not(input):not(select):not(textarea),
[data-wingman-product-intelligence-page="true"] [class*="bg-yellow-"]:not(input):not(select):not(textarea),
[data-wingman-product-intelligence-page="true"] [class*="bg-orange-"]:not(input):not(select):not(textarea),
[data-wingman-product-intelligence-page="true"] [class*="bg-[#fff"]:not(input):not(select):not(textarea),
[data-wingman-product-intelligence-page="true"] [class*="bg-[#fef"]:not(input):not(select):not(textarea),
[data-wingman-product-intelligence-page="true"] [class*="bg-[#ffed"]:not(input):not(select):not(textarea),
[data-wingman-product-intelligence-page="true"] [class*="bg-[#fff4"]:not(input):not(select):not(textarea) {
  background: rgba(58, 226, 245, 0.12) !important;
  border: 1px solid rgba(58, 226, 245, 0.46) !important;
  color: #8ff6ff !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 10px 26px rgba(0, 0, 0, 0.22) !important;
}

[data-wingman-product-intelligence-page="true"] [class*="bg-amber-"]:not(input):not(select):not(textarea) *,
[data-wingman-product-intelligence-page="true"] [class*="bg-yellow-"]:not(input):not(select):not(textarea) *,
[data-wingman-product-intelligence-page="true"] [class*="bg-orange-"]:not(input):not(select):not(textarea) *,
[data-wingman-product-intelligence-page="true"] [class*="bg-[#fff"]:not(input):not(select):not(textarea) *,
[data-wingman-product-intelligence-page="true"] [class*="bg-[#fef"]:not(input):not(select):not(textarea) *,
[data-wingman-product-intelligence-page="true"] [class*="bg-[#ffed"]:not(input):not(select):not(textarea) *,
[data-wingman-product-intelligence-page="true"] [class*="bg-[#fff4"]:not(input):not(select):not(textarea) * {
  color: #8ff6ff !important;
}

[data-wingman-product-intelligence-page="true"] [class*="bg-amber-"]:not(input):not(select):not(textarea),
[data-wingman-product-intelligence-page="true"] [class*="bg-yellow-"]:not(input):not(select):not(textarea),
[data-wingman-product-intelligence-page="true"] [class*="bg-orange-"]:not(input):not(select):not(textarea) {
  min-height: unset !important;
  width: fit-content !important;
  max-width: max-content !important;
  border-radius: 999px !important;
  padding: 0.42rem 0.72rem !important;
  font-size: 0.72rem !important;
  line-height: 1 !important;
  font-weight: 800 !important;
  letter-spacing: 0.055em !important;
  text-transform: uppercase !important;
  text-shadow: none !important;
  white-space: nowrap !important;
}

[data-wingman-product-intelligence-page="true"] [class*="text-amber-"],
[data-wingman-product-intelligence-page="true"] [class*="text-yellow-"],
[data-wingman-product-intelligence-page="true"] [class*="text-orange-"] {
  color: #8ff6ff !important;
}
${end}`;

const originalCss = fs.readFileSync(stylePath, "utf8");
let updatedCss = originalCss;

const blockRegex = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

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
console.log("Done. Restart Vite if needed, then hard refresh the Product Intelligence page.");
