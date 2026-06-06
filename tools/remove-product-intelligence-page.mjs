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
  fs.copyFileSync(file, `${file}.bak-remove-product-intelligence-${stamp}`);
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

if (!fs.existsSync(srcDir)) {
  fail("Cannot find src folder. Run this from C:\\Users\\Steve\\Wingman.");
}

if (!fs.existsSync(stylePath)) {
  fail("Cannot find src/wingman2/styles/wingman-style-stack.css.");
}

const sourceFiles = walk(srcDir).filter((file) => /\.(tsx|jsx|ts|js)$/.test(file));

const pageFiles = sourceFiles.filter((file) => {
  const text = fs.readFileSync(file, "utf8");

  return /Product Intelligence/i.test(text)
    && /Review queue/i.test(text)
    && /Competitor builder/i.test(text)
    && /Classification editor/i.test(text)
    && /wm-intel/i.test(text);
});

if (pageFiles.length === 0) {
  fail("Could not find the Product Intelligence page source.");
}

if (pageFiles.length > 1) {
  console.log("Multiple Product Intelligence candidates found:");
  for (const file of pageFiles) console.log(` - ${path.relative(root, file)}`);
  fail("Refusing to overwrite more than one page. Inspect the candidates above.");
}

const pageFile = pageFiles[0];

const replacement = `import { useEffect } from "react";

export function ProductIntelligencePage() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const targetPath = "/wingman/products";

    if (window.location.pathname !== targetPath) {
      window.location.replace(targetPath);
    }
  }, []);

  return null;
}

export default ProductIntelligencePage;
`;

backup(pageFile);
fs.writeFileSync(pageFile, replacement, "utf8");

console.log(`Removed Product Intelligence page UI by redirecting: ${path.relative(root, pageFile)}`);

const start = "/* WINGMAN REMOVE PRODUCT INTELLIGENCE PAGE - START */";
const end = "/* WINGMAN REMOVE PRODUCT INTELLIGENCE PAGE - END */";

const cssBlock = `${start}
a[href="/wingman/intelligence"],
a[href$="/wingman/intelligence"],
button[data-route="intelligence"],
button[data-wingman-route="intelligence"],
[data-route="intelligence"],
[data-wingman-route="intelligence"],
[data-to="/wingman/intelligence"],
[data-href="/wingman/intelligence"] {
  display: none !important;
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
  console.log(`Added route-link hide CSS: ${path.relative(root, stylePath)}`);
}

console.log("");
console.log("Done. /wingman/intelligence now redirects to /wingman/products.");
