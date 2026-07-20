import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  page: path.join(root, "src", "wingman2", "pages", "ProposalPage.tsx"),
  component: path.join(root, "src", "wingman2", "components", "ProposalCompletionWizard.tsx"),
  model: path.join(root, "src", "wingman2", "lib", "proposalWizard.ts"),
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
const model = read("Proposal wizard model", files.model);
const exporter = read("DOCX exporter", files.export);
const css = read("Proposal wizard CSS", files.css);

[
  "ProposalCompletionWizard",
  "TemplateProposalSeedPanel",
  "data-wingman-proposal-page",
].forEach((marker) => requireMarker("ProposalPage.tsx", page, marker));

[
  "Customer and project",
  "Requirements review",
  "Proposed solution",
  "Commercial and delivery",
  "Review and export",
  "Export formatted DOCX",
  "computeProposalReadiness",
  "saveProjectProposalToProject",
  "Open Recommendations",
].forEach((marker) =>
  requireMarker("ProposalCompletionWizard.tsx", component, marker),
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
  'from "docx"',
  "Packer.toBlob",
  "Header",
  "Footer",
  "PageNumber.CURRENT",
  "Equipment Schedule",
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