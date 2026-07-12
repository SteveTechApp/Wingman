import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const files = {
  css: path.join(repoRoot, "src", "wingman2", "styles", "wingman-style-stack.css"),
  packageJson: path.join(repoRoot, "package.json"),
};

const errors = [];

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${path.relative(repoRoot, filePath)}`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) {
    errors.push(`${label} missing marker: ${marker}`);
  }
}

const css = read(files.css);
const packageJson = JSON.parse(read(files.packageJson) || "{}");

[
  "WINGMAN DASHBOARD CANONICAL LAYOUT START",
  "main.wm-dashboard-shell .wm-dashboard-main",
  "overflow-y: auto",
  "main.wm-dashboard-shell .wm-dashboard-grid",
  "main.wm-dashboard-shell .wm-dashboard-project-grid",
  "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  "gap: clamp(10px, 1vw, 16px)",
  "@media (max-width: 1180px)",
  "grid-template-columns: minmax(0, 1fr)",
  "WINGMAN DASHBOARD CANONICAL LAYOUT END",
].forEach((marker) => requireMarker("wingman-style-stack.css", css, marker));

[
  "data-wingman-dashboard-menu",
  "WINGMAN DASHBOARD MENU LAYOUT REPAIR START",
  ".wm-dashboard-workflow-card",
  ".wm-dashboard-workflow-panel",
  "grid-template-columns: repeat(5, minmax(180px, 1fr))",
].forEach((marker) => {
  if (css.includes(marker)) errors.push(`Obsolete Dashboard menu-density marker is still present: ${marker}`);
});

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length) {
  errors.push("wingman-style-stack.css must not contain active @import lines.");
}

if (!packageJson.scripts?.["check:dashboard-menu-layout-density"]) {
  errors.push("package.json missing check:dashboard-menu-layout-density script.");
}

if (!String(packageJson.scripts?.verify || "").includes("check:dashboard-menu-layout-density")) {
  errors.push("package.json verify script missing check:dashboard-menu-layout-density.");
}

if (errors.length) {
  console.error("[dashboard-menu-layout-density] Check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[dashboard-menu-layout-density] Verified current Dashboard grid density safeguards.");
