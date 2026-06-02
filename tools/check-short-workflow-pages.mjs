import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const files = {
  workspace: path.join(repoRoot, "src", "wingman2", "components", "WingmanWorkspacePage.tsx"),
  guruDrawer: path.join(repoRoot, "src", "wingman2", "components", "WingmanGuruDrawer.tsx"),
  callInterpreter: path.join(repoRoot, "src", "wingman2", "components", "GuruCallNotesInterpreter.tsx"),
  discovery: path.join(repoRoot, "src", "wingman2", "pages", "DiscoveryPage.tsx"),
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

const workspace = read(files.workspace);
const guruDrawer = read(files.guruDrawer);
const callInterpreter = read(files.callInterpreter);
const discovery = read(files.discovery);
const css = read(files.css);
const packageJson = JSON.parse(read(files.packageJson) || "{}");

[
  'data-wingman-short-workflow="true"',
  'data-wingman-primary-workflow="true"',
  'data-wingman-support-details="true"',
  "Show supporting design reasoning, warnings and evidence",
  "wm-guided-support-details",
].forEach((marker) => requireMarker("WingmanWorkspacePage.tsx", workspace, marker));

[
  "GuruCallNotesInterpreter",
  "<GuruCallNotesInterpreter />",
].forEach((marker) => requireMarker("WingmanGuruDrawer.tsx", guruDrawer, marker));

[
  'data-wingman-call-notes-interpreter="true"',
  "Listen to my call",
  "Use this in Discovery",
  "SpeechRecognition",
  "wingman-guru-call-notes-transcript",
].forEach((marker) => requireMarker("GuruCallNotesInterpreter.tsx", callInterpreter, marker));

[
  "callNotesStorageKey",
  "wingman:use-call-notes-in-discovery",
  "window.sessionStorage.getItem(callNotesStorageKey)",
  "setAnswers((current) =>",
].forEach((marker) => requireMarker("DiscoveryPage.tsx", discovery, marker));

[
  "WINGMAN SHORT WORKFLOW PAGES START",
  ".wm-guided-support-details",
  ".wingman-guru-call-interpreter",
  "WINGMAN SHORT WORKFLOW PAGES END",
].forEach((marker) => requireMarker("wingman-style-stack.css", css, marker));

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length) {
  errors.push("wingman-style-stack.css must not contain active @import lines.");
}

if (!packageJson.scripts?.["check:short-workflow-pages"]) {
  errors.push("package.json missing check:short-workflow-pages script.");
}

if (!String(packageJson.scripts?.verify || "").includes("check:short-workflow-pages")) {
  errors.push("package.json verify script missing check:short-workflow-pages.");
}

if (errors.length) {
  console.error("[short-workflow-pages] Check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[short-workflow-pages] Verified primary workflow focus, collapsed support detail and Guru call-note intake.");