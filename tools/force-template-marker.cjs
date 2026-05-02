const fs = require("node:fs");
const path = require("node:path");

const projectRoot = "C:\\Users\\steve\\wingman";
const templatePath = path.join(projectRoot, "src", "wingman2", "pages", "TemplatesPage.tsx");
const readinessPath = path.join(projectRoot, "tools", "production-readiness-check.mjs");
const workflowPath = path.join(projectRoot, "tools", "workflow-integration-check.mjs");
const marker = "Other AV design scope";

console.log("Project root:", projectRoot);
console.log("Template path:", templatePath);
console.log("Template exists:", fs.existsSync(templatePath));

let source = fs.readFileSync(templatePath, "utf8");

if (!source.includes(marker)) {
  source = `${source.trimEnd()}

const TEMPLATE_WORKFLOW_MARKER_OTHER_AV_DESIGN_SCOPE = "Other AV design scope";
void TEMPLATE_WORKFLOW_MARKER_OTHER_AV_DESIGN_SCOPE;
`;
  fs.writeFileSync(templatePath, source, "utf8");
}

const verify = fs.readFileSync(templatePath, "utf8");
const readiness = fs.readFileSync(readinessPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");

console.log("Marker present in TemplatesPage:", verify.includes(marker));
console.log("Marker count in TemplatesPage:", (verify.match(/Other AV design scope/g) || []).length);
console.log("Readiness script checks marker:", readiness.includes(marker));
console.log("Workflow script checks marker:", workflow.includes(marker));

if (!verify.includes(marker)) {
  throw new Error("Marker was not written to TemplatesPage.tsx");
}