import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pagePath = resolve(root, "src/wingman2/pages/VisualDesignStudioPage.tsx");
const cssPath = resolve(root, "src/wingman2/styles/wingman-style-stack.css");

const page = readFileSync(pagePath, "utf8");
const css = readFileSync(cssPath, "utf8");

const requiredPageMarkers = [
  "PortSchematicPanel",
  "NativeSchematicCanvas",
  "DeploymentVisualPanel",
  "data-wingman-av-schematic",
  "data-wingman-native-schematic",
  "data-wingman-generated-deployment-visual",
  "Generated in Wingman",
  "Generate the schematic and deployment visual directly on this page.",
];

const requiredCssMarkers = [
  ".wm-generated-output-stack",
  ".wm-port-schematic-panel",
  ".wm-port-schematic-board",
  ".wm-native-schematic-panel",
  ".wm-deployment-visual-panel",
  ".wm-native-schematic-canvas",
  ".wm-schematic-review-panel",
];

const forbiddenPrimaryWorkflowText = [
  "Paste this Mermaid into Whimsical",
  "Copy the Mermaid while the visual editor is being developed.",
];

const missingPage = requiredPageMarkers.filter((marker) => !page.includes(marker));
const missingCss = requiredCssMarkers.filter((marker) => !css.includes(marker));
const forbidden = forbiddenPrimaryWorkflowText.filter((marker) => page.includes(marker));

if (missingPage.length || missingCss.length || forbidden.length) {
  console.error("Visual Design native output guard failed.");

  if (missingPage.length) {
    console.error(`Missing page markers: ${missingPage.join(", ")}`);
  }

  if (missingCss.length) {
    console.error(`Missing CSS markers: ${missingCss.join(", ")}`);
  }

  if (forbidden.length) {
    console.error(`Forbidden legacy workflow text found: ${forbidden.join(", ")}`);
  }

  process.exit(1);
}

console.log("Visual Design native output guard passed.");
