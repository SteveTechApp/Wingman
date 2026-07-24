import fs from "node:fs";
import path from "node:path";
import { verifyChainIncludes } from "./verify-chain.mjs";

const repoRoot = process.cwd();

const files = {
  component: path.join(repoRoot, "src", "wingman2", "components", "AVSignalFlowDiagram.tsx"),
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

const component = read(files.component);
const css = read(files.css);
const packageJson = JSON.parse(read(files.packageJson) || "{}");

[
  'data-wingman-optional-visual-support="true"',
  'data-wingman-av-flow="true"',
  "Show AV system shape",
  "Optional visual support",
  "Visual system shape",
].forEach((marker) => requireMarker("AVSignalFlowDiagram.tsx", component, marker));

[
  "WINGMAN OPTIONAL VISUAL SUPPORT START",
  ".wm-av-flow-shell[data-wingman-optional-visual-support=\"true\"]",
  "WINGMAN OPTIONAL VISUAL SUPPORT END",
].forEach((marker) => requireMarker("wingman-style-stack.css", css, marker));

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length) {
  errors.push("wingman-style-stack.css must not contain active @import lines.");
}

if (!packageJson.scripts?.["check:optional-visual-support"]) {
  errors.push("package.json missing check:optional-visual-support script.");
}

if (!verifyChainIncludes(packageJson.scripts, "check:optional-visual-support")) {
  errors.push("package.json verify script missing check:optional-visual-support.");
}

if (errors.length) {
  console.error("[optional-visual-support] Check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[optional-visual-support] Verified AV visual support is available but collapsed by default.");