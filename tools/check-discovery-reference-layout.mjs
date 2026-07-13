import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "src", "wingman2", "pages", "DiscoveryPage.tsx");
const themePath = path.join(root, "src", "wingman2", "styles", "wingman-workflow-theme.css");
const mainPath = path.join(root, "src", "main.tsx");
const errors = [];

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${path.relative(root, filePath)}`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) {
    errors.push(`${label} missing marker: ${marker}`);
  }
}

const page = read(pagePath);
const theme = read(themePath);
const main = read(mainPath);

[
  "wm-discovery-capture-hero",
  "wm-discovery-completion-card",
  "wm-discovery-trail-card",
  "wm-discovery-step-pills",
  "wm-discovery-question-layout",
  "wm-discovery-option-list",
  "wm-discovery-capture-card",
  "wm-discovery-live-tip",
  "One question at a time",
  "Discovery trail",
  "Why this matters",
  "Customer wording / notes",
].forEach((marker) => requireMarker("DiscoveryPage.tsx", page, marker));

[
  'html[data-wingman-route="discovery"] .wm-discovery-capture-page',
  ".wm-discovery-capture-hero",
  "grid-template-columns: minmax(0, 1fr) auto",
  ".wm-discovery-step-pills",
  "grid-auto-flow: column",
  ".wm-discovery-question-layout",
  "minmax(320px, 370px)",
  ".wm-discovery-option-list",
  "repeat(2, minmax(0, 1fr))",
  ".wm-discovery-capture-card",
  "position: sticky",
  "@media (max-width: 960px)",
  "@media (max-width: 700px)",
].forEach((marker) => requireMarker("wingman-workflow-theme.css", theme, marker));

requireMarker(
  "src/main.tsx",
  main,
  'import "./wingman2/styles/wingman-workflow-theme.css";',
);

if (errors.length) {
  console.error("[discovery-reference-layout] Check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  "[discovery-reference-layout] Verified compact hero, scrollable discovery trail, two-column options and sticky capture workspace.",
);
