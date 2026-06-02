import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const files = {
  callCards: path.join(repoRoot, "src", "wingman2", "pages", "CallCardsPage.tsx"),
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

const callCards = read(files.callCards);
const css = read(files.css);
const packageJson = JSON.parse(read(files.packageJson) || "{}");

[
  "callNotesStorageKey",
  "window.sessionStorage.setItem(callNotesStorageKey",
  "Live Call Cards handoff",
  "cca-supportDetails",
  "Show Wingman interpretation",
  "cca-supportDetailsBody",
].forEach((marker) => requireMarker("CallCardsPage.tsx", callCards, marker));

[
  "WINGMAN CALL CARDS FOCUSED WORKFLOW START",
  ".cca-page .cca-supportDetails",
  ".cca-page .cca-typeStrip button span",
  "WINGMAN CALL CARDS FOCUSED WORKFLOW END",
].forEach((marker) => requireMarker("wingman-style-stack.css", css, marker));

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length) {
  errors.push("wingman-style-stack.css must not contain active @import lines.");
}

if (!packageJson.scripts?.["check:call-cards-focused-workflow"]) {
  errors.push("package.json missing check:call-cards-focused-workflow script.");
}

if (!String(packageJson.scripts?.verify || "").includes("check:call-cards-focused-workflow")) {
  errors.push("package.json verify script missing check:call-cards-focused-workflow.");
}

if (errors.length) {
  console.error("[call-cards-focused-workflow] Check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[call-cards-focused-workflow] Verified Live Call Cards focused workflow and Discovery handoff.");