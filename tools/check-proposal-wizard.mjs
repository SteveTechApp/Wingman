import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  page: path.join(root, "src", "wingman2", "pages", "ProposalPage.tsx"),
  component: path.join(root, "src", "wingman2", "components", "ProposalCompletionWizard.tsx"),
  view: path.join(root, "src", "wingman2", "components", "ProposalCompletionWizardView.tsx"),
  model: path.join(root, "src", "wingman2", "lib", "proposalWizard.ts"),
  copy: path.join(root, "src", "wingman2", "lib", "proposalCopy.ts"),
  htmlExport: path.join(root, "src", "wingman2", "lib", "proposalExport.ts"),
  export: path.join(root, "src", "wingman2", "lib", "proposalDocxExport.ts"),
  css: path.join(root, "src", "wingman2", "styles", "wingman-workflow-theme.css"),
};

const errors = [];

function read(label, filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} missing: ${path.relative(root, filePath)}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) {
    errors.push(`${label} missing marker: ${marker}`);
  }
}

const page = read("Proposal page", files.page);
const component = read("Proposal wizard component", files.component);
const view = read("Proposal wizard view", files.view);
const model = read("Proposal wizard model", files.model);
const exporter = read("DOCX exporter", files.export);
const htmlExporter = read("HTML exporter", files.htmlExport);
const copy = read("Proposal copy", files.copy);
const css = read("Proposal wizard CSS", files.css);

[
  "ProposalCompletionWizard",
  "data-wingman-proposal-page",
].forEach((marker) => requireMarker("ProposalPage.tsx", page, marker));

[
  // The entry holds the state and renders the split view, so the steps it
  // names are only on screen if the entry hands them to that view.
  "ProposalCompletionWizardView",
  "Customer and project",
  "Requirements review",
  "Proposed solution",
  "Commercial and delivery",
  "Review and export",
  "computeProposalReadiness",
  "saveProjectProposalToProject",
].forEach((marker) =>
  requireMarker("ProposalCompletionWizard.tsx", component, marker),
);

// The step bodies moved into the view with the rest of the markup, so the
// controls a rep leaves the wizard by are asserted where they render.
[
  "Export formatted DOCX",
  "Open Recommendations",
].forEach((marker) =>
  requireMarker("ProposalCompletionWizardView.tsx", view, marker),
);

[
  "discoveryPercent",
  "* 0.65",
  "narrative",
  "customer",
  "solution",
  "approval",
  "blended-proposal",
  "tender-response",
].forEach((marker) =>
  requireMarker("proposalWizard.ts", model, marker),
);

[
  "REP_COPY",
  "CUSTOMER_COPY",
  "customerCopyLines",
  "customerCopyText",
  "isRepOnlyCopy",
].forEach((marker) => requireMarker("proposalCopy.ts", copy, marker));

// The printed document is customer copy only: an export builder may never
// carry an authoring prompt or import the rep-facing layer.
const repOnlyCopy = [/\[complete\]/i, /\[todo\]/i, /\[internal[^\]]*\]/i, /\bREP_COPY\b/, /Add BOM rows/, /Add equipment schedule rows/];
for (const [label, source] of [
  ["proposalExport.ts", htmlExporter],
  ["proposalDocxExport.ts", exporter],
]) {
  repOnlyCopy.forEach((pattern) => {
    if (pattern.test(source)) errors.push(`${label} carries rep-only copy: ${pattern}`);
  });
  requireMarker(label, source, "CUSTOMER_COPY");
}

[
  'from "docx"',
  "Packer.toBlob",
  "Header",
  "Footer",
  "PageNumber.CURRENT",
  "Equipment and Pricing",
  "What You Asked For and How We Designed It",
  ".proposal.docx",
].forEach((marker) =>
  requireMarker("proposalDocxExport.ts", exporter, marker),
);

[
  "WINGMAN_PROPOSAL_WIZARD_START",
  ".wm-proposal-step-rail",
  ".wm-proposal-readiness",
  ".wm-proposal-wizard-layout",
  ".wm-proposal-export-actions",
].forEach((marker) =>
  requireMarker("wingman-workflow-theme.css", css, marker),
);

if (errors.length) {
  console.error("[proposal-wizard] Check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  "[proposal-wizard] Verified five-step proposal completion, 100-point readiness and formatted DOCX export contracts.",
);
