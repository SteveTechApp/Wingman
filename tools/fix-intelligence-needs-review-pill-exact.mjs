import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const mainCss = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");

function fail(message) {
  throw new Error(message);
}

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, `${file}.bak-needs-review-pill-exact-${stamp}`);
}

function walk(dir) {
  const output = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".git"].includes(entry.name)) continue;
      output.push(...walk(full));
      continue;
    }

    output.push(full);
  }

  return output;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (!fs.existsSync(srcDir)) fail("Cannot find src folder. Run this from C:\\Users\\Steve\\Wingman.");
if (!fs.existsSync(mainCss)) fail("Cannot find src/wingman2/styles/wingman-style-stack.css.");

const cssFiles = walk(srcDir).filter((file) => file.endsWith(".css"));

const exactRule = `.wm-intel-status-pill[data-status="needs-review"] {
  background: #061826 !important;
  background-color: #061826 !important;
  background-image: none !important;
  border: 1px solid rgba(58, 226, 245, 0.56) !important;
  color: #8ff6ff !important;
  -webkit-text-fill-color: #8ff6ff !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.045),
    0 0 16px rgba(58, 226, 245, 0.16) !important;
  text-shadow: none !important;
}`;

let changedCount = 0;

for (const file of cssFiles) {
  const original = fs.readFileSync(file, "utf8");
  let updated = original;

  updated = updated.replace(
    /\.wm-intel-status-pill\[data-status=["']needs-review["']\]\s*\{[\s\S]*?\}/g,
    exactRule
  );

  updated = updated.replace(
    /\.wm-intel-status-pill\[data-status=needs-review\]\s*\{[\s\S]*?\}/g,
    exactRule
  );

  if (updated !== original) {
    backup(file);
    fs.writeFileSync(file, updated, "utf8");
    changedCount += 1;
    console.log(`Replaced existing needs-review rule in: ${path.relative(root, file)}`);
  }
}

const start = "/* WINGMAN INTELLIGENCE NEEDS REVIEW PILL EXACT OVERRIDE - START */";
const end = "/* WINGMAN INTELLIGENCE NEEDS REVIEW PILL EXACT OVERRIDE - END */";

const finalOverride = `${start}
/*
  Exact Product Intelligence status-pill contrast fix.
  DevTools showed the pale rule was:
  .wm-intel-status-pill[data-status="needs-review"] {
    color: #7c2d12 !important;
    background: #ffedd5 !important;
  }
*/
html[data-wingman-route] body #root main.wingman-app-main .wm-intel-status-pill[data-status="needs-review"],
html[data-wingman-route] body #root .wingman-page-host .wm-intel-status-pill[data-status="needs-review"],
#root .wm-intel-status-pill[data-status="needs-review"],
.wm-intel-status-pill[data-status="needs-review"] {
  background: #061826 !important;
  background-color: #061826 !important;
  background-image: none !important;
  border: 1px solid rgba(58, 226, 245, 0.56) !important;
  color: #8ff6ff !important;
  -webkit-text-fill-color: #8ff6ff !important;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.045),
    0 0 16px rgba(58, 226, 245, 0.16) !important;
  text-shadow: none !important;
  opacity: 1 !important;
}

html[data-wingman-route] body #root main.wingman-app-main .wm-intel-status-pill[data-status="needs-review"] *,
html[data-wingman-route] body #root .wingman-page-host .wm-intel-status-pill[data-status="needs-review"] *,
#root .wm-intel-status-pill[data-status="needs-review"] *,
.wm-intel-status-pill[data-status="needs-review"] * {
  color: #8ff6ff !important;
  -webkit-text-fill-color: #8ff6ff !important;
}
${end}`;

const mainOriginal = fs.readFileSync(mainCss, "utf8");
let mainUpdated = mainOriginal;

const blockRegex = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

if (blockRegex.test(mainUpdated)) {
  mainUpdated = mainUpdated.replace(blockRegex, finalOverride);
}

if (!blockRegex.test(mainOriginal)) {
  mainUpdated = `${mainUpdated.trimEnd()}\n\n${finalOverride}\n`;
}

if (mainUpdated !== mainOriginal) {
  backup(mainCss);
  fs.writeFileSync(mainCss, mainUpdated, "utf8");
  console.log(`Added final exact override to: ${path.relative(root, mainCss)}`);
}

console.log("");
console.log(`CSS files with direct rule replaced: ${changedCount}`);
console.log("Now run typecheck/build, restart Vite and hard refresh.");
