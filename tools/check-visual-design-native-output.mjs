import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const proposalPath = resolve(
  root,
  "src/wingman2/pages/ProposalVisualsPage.tsx",
);
const canvasPath = resolve(
  root,
  "src/wingman2/components/VisualStudioCanvas.tsx",
);
const cssPath = resolve(
  root,
  "src/wingman2/styles/wingman-style-stack.css",
);

const failures = [];

function readRequired(filePath, label) {
  if (!existsSync(filePath)) {
    failures.push(`Missing ${label}: ${filePath}`);
    return "";
  }

  return readFileSync(filePath, "utf8");
}

const proposal = readRequired(proposalPath, "Proposal Visuals page");
const canvas = readRequired(canvasPath, "native Visual Studio canvas");
const css = readRequired(cssPath, "Wingman style stack");

const requiredProposalMarkers = [
  'data-wingman-proposal-visuals="true"',
  "VisualStudioCanvas",
  "buildWholeProjectVisualDiagram",
  "Generate visual",
];

const requiredCanvasMarkers = [
  "ReactFlow",
  "Native diagram canvas",
  "Export SVG",
  "Export PNG",
  "Export Visio (.vsdx)",
  "data-diagram-id={model.id}",
  "Save to project",
];

const requiredCssMarkers = [
  ".wm-vs-canvas-shell",
  ".wm-vs-flow-node",
  ".wm-vs-canvas",
  ".wm-vs-schematic-footer",
];

const forbiddenLegacyText = [
  "Paste this Mermaid into Whimsical",
  "Copy the Mermaid while the visual editor is being developed.",
];

const missingProposal = requiredProposalMarkers.filter(
  (marker) => !proposal.includes(marker),
);
const missingCanvas = requiredCanvasMarkers.filter(
  (marker) => !canvas.includes(marker),
);
const missingCss = requiredCssMarkers.filter(
  (marker) => !css.includes(marker),
);
const forbidden = forbiddenLegacyText.filter(
  (marker) => proposal.includes(marker) || canvas.includes(marker),
);

if (missingProposal.length) {
  failures.push(
    `Missing Proposal Visuals markers: ${missingProposal.join(", ")}`,
  );
}

if (missingCanvas.length) {
  failures.push(
    `Missing native canvas markers: ${missingCanvas.join(", ")}`,
  );
}

if (missingCss.length) {
  failures.push(
    `Missing current visual CSS markers: ${missingCss.join(", ")}`,
  );
}

if (forbidden.length) {
  failures.push(
    `Forbidden legacy workflow text found: ${forbidden.join(", ")}`,
  );
}

if (failures.length) {
  console.error("Proposal Visuals native output guard failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "Proposal Visuals native output guard passed: project-aware ReactFlow canvas with save/export support is present.",
);