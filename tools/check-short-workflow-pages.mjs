import fs from "node:fs";
import path from "node:path";
import { verifyChainIncludes } from "./verify-chain.mjs";

const repoRoot = process.cwd();

const files = {
  guruDrawer: path.join(repoRoot, "src", "wingman2", "components", "WingmanGuruDrawer.tsx"),
  callInterpreter: path.join(repoRoot, "src", "wingman2", "components", "GuruCallNotesInterpreter.tsx"),
  discovery: path.join(repoRoot, "src", "wingman2", "pages", "DiscoveryPage.tsx"),
  css: path.join(repoRoot, "src", "wingman2", "styles", "wingman-route-overrides.css"),
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

function refuseMarker(label, source, marker) {
  if (source.includes(marker)) {
    errors.push(`${label} must not contain marker: ${marker}`);
  }
}

const guruDrawer = read(files.guruDrawer);
const callInterpreter = read(files.callInterpreter);
const discovery = read(files.discovery);
const css = read(files.css);
const packageJson = JSON.parse(read(files.packageJson) || "{}");

// The Guru drawer is intentionally decluttered: the assistant is header ->
// conversation -> composer only. The quick-ask rail and the embedded support /
// call-note tool drawers were removed to simplify the interface.
[
  'className="wingman-guru-quick-section"',
  'className="wingman-guru-support-drawer"',
  'className="wingman-guru-tool-drawer"',
  "<GuruCallNotesInterpreter />",
].forEach((marker) => refuseMarker("WingmanGuruDrawer.tsx", guruDrawer, marker));

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
].forEach((marker) => requireMarker("wingman-route-overrides.css", css, marker));

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length) {
  errors.push("wingman-route-overrides.css must not contain active @import lines.");
}

if (!packageJson.scripts?.["check:short-workflow-pages"]) {
  errors.push("package.json missing check:short-workflow-pages script.");
}

if (!verifyChainIncludes(packageJson.scripts, "check:short-workflow-pages")) {
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
