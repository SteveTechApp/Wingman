import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const filePath = path.join(root, relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${relativePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

const main = read("src/main.tsx");
const guard = read("tools/guard-wingman-css-imports.mjs");
const canvas = read("src/wingman2/components/VisualStudioCanvas.tsx");
const factory = read("src/wingman2/lib/visualStudioDiagramFactory.ts");
const css = read("src/wingman2/styles/wingman-workflow-theme.css");

const cssImports = [
  ...main.matchAll(/import\s+["']([^"']+\.css)["'];/g),
].map((match) => match[1]);

const expectedImports = [
  "@xyflow/react/dist/style.css",
  "./wingman2/styles/wingman-style-stack.css",
  "./wingman2/styles/wingman-reference-theme.css",
  "./wingman2/styles/wingman-workflow-theme.css",
];

const errors = [];

if (
  cssImports.length < expectedImports.length ||
  expectedImports.some((expected, index) => cssImports[index] !== expected)
) {
  errors.push(`Incorrect main CSS import order: ${cssImports.join(", ")}`);
}

if (!guard.includes('"@xyflow/react/dist/style.css"')) {
  errors.push("CSS import guard does not permit the React Flow stylesheet.");
}

[
  "WINGMAN_VISUAL_STUDIO_RESIZE_FIT_START",
  "WINGMAN_VISUAL_STUDIO_RESIZE_FIT_V2_START",
  "WINGMAN_VISUAL_STUDIO_STABLE_FIT_START",
].forEach((marker) => {
  if (canvas.includes(marker)) {
    errors.push(`Retired Visual Studio fit marker remains: ${marker}`);
  }
});

[
  '"generic-avoip-network": { x: 715, y: 205 }',
  "interactionWidth: 24",
  'strokeWidth: mode === "technical" ? 3.2 : 3.6',
].forEach((marker) => {
  if (!factory.includes(marker)) {
    errors.push(`Diagram factory is missing: ${marker}`);
  }
});

[
  "WINGMAN_VISUAL_STUDIO_REACT_FLOW_FOUNDATION_START",
  ".wm-vs-canvas-stage > .react-flow",
  ".react-flow__edge-path",
  "vector-effect: non-scaling-stroke",
].forEach((marker) => {
  if (!css.includes(marker)) {
    errors.push(`Visual Studio route CSS is missing: ${marker}`);
  }
});

if (errors.length) {
  console.error("[visual-studio-react-flow] Check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  "[visual-studio-react-flow] Official React Flow CSS, deterministic diagram layout and visible edge contracts passed.",
);
