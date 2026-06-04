import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const files = {
  dashboard: path.join(repoRoot, "src", "wingman2", "pages", "DashboardPage.tsx"),
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

const dashboard = read(files.dashboard);
const css = read(files.css);
const packageJson = JSON.parse(read(files.packageJson) || "{}");

[
  "What are you trying to do?",
  "Guide a customer call",
  "Position a specific WyreStorm product",
  "Compare a competitor",
  "Review a document or BOM",
  "Create a response pack",
  "Continue a project",
  "routeCatalogByKey.callCoach.path",
  "routeCatalogByKey.products.path",
  "routeCatalogByKey.documents.path",
  "routeCatalogByKey.responsePack.path",
].forEach((marker) => requireMarker("DashboardPage.tsx", dashboard, marker));

[
  "WINGMAN DASHBOARD WORKFLOW MENU START",
  ".wm-dashboard-page[data-wingman-dashboard-menu=\"true\"]",
  ".wm-dashboard-menu-section",
  ".wm-dashboard-workflow-card.is-primary",
  "WINGMAN DASHBOARD WORKFLOW MENU END",
].forEach((marker) => requireMarker("wingman-style-stack.css", css, marker));

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length) {
  errors.push("wingman-style-stack.css must not contain active @import lines.");
}

if (!packageJson.scripts?.["check:dashboard-workflow-menu"]) {
  errors.push("package.json missing check:dashboard-workflow-menu script.");
}

if (!packageJson.scripts?.["check:navigation-consolidation"]) {
  errors.push("package.json missing check:navigation-consolidation script.");
}

if (!String(packageJson.scripts?.verify || "").includes("check:dashboard-workflow-menu")) {
  errors.push("package.json verify script missing check:dashboard-workflow-menu.");
}

if (errors.length) {
  console.error("[dashboard-workflow-menu] Check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[dashboard-workflow-menu] Verified Dashboard is a focused workflow menu.");
