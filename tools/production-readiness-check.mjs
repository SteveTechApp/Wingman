import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const requiredFiles = [
  path.join(projectRoot, "docs", "production-readiness-audit.md"),
  path.join(projectRoot, "data", "catalog", "wyrestormSkuCatalog.2026.json"),
  path.join(projectRoot, "data", "catalog", "wyrestorm-catalog.phase1.json"),
  path.join(projectRoot, "data", "catalog", "competitor-catalog.phase4.json"),
  path.join(projectRoot, "data", "catalog", "competitor-compare.seed.json"),
  path.join(projectRoot, "data", "governance", "wingman-governance.json"),
  path.join(projectRoot, "public", "product-intelligence-index.json"),
];

const errors = [];
let publicProducts = [];

for (const filePath of requiredFiles) {
  if (!existsSync(filePath)) {
    errors.push(`Missing required runtime file: ${path.relative(projectRoot, filePath)}`);
  }
}

const publicIndexPath = path.join(projectRoot, "public", "product-intelligence-index.json");
if (existsSync(publicIndexPath)) {
  const index = JSON.parse(readFileSync(publicIndexPath, "utf8"));
  const products = Array.isArray(index?.products) ? index.products : [];
  const sources = Array.isArray(index?.meta?.sourceFiles) ? index.meta.sourceFiles : [];
  publicProducts = products;

  if (products.length === 0) {
    errors.push("Public product intelligence index is empty.");
  }

  if (sources.length === 0) {
    errors.push("Public product intelligence index does not record any canonical source files.");
  }

  const exactDependencySkus = ["RX-500", "RX-700", "RX3-100", "NHD-120-RX", "NHD-120-TX", "NHD-500-RX", "NHD-500-TX", "NHD-150-RX", "NHD-0401-MV", "SW-0204-VW", "SW-0206-VW"];
  const indexedSkus = new Set(publicProducts.map((product) => String(product?.sku ?? "").toUpperCase()));
  for (const sku of exactDependencySkus) {
    if (!indexedSkus.has(sku)) {
      errors.push(`Exact dependency governance SKU is missing from the public product index: ${sku}.`);
    }
  }
}

const catalogFilesSource = readFileSync(
  path.join(projectRoot, "server", "catalog", "files.mjs"),
  "utf8",
);

if (catalogFilesSource.includes('"src", "data"') || catalogFilesSource.includes("SRC_DATA_DIR")) {
  errors.push("server/catalog/files.mjs still references legacy src/data paths.");
}

const storeSource = readFileSync(
  path.join(projectRoot, "server", "wingman-app-store.mjs"),
  "utf8",
);

if (storeSource.includes('"src", "data", "governance"')) {
  errors.push("server/wingman-app-store.mjs still references legacy src/data governance paths.");
}

const competitorServerSource = readFileSync(
  path.join(projectRoot, "server", "competitor-lookup-server.mjs"),
  "utf8",
);

if (
  !competitorServerSource.includes("/api/wingman/competitor-lookup") ||
  !competitorServerSource.includes("Competitor lookup requires an authenticated Wingman workspace session.")
) {
  errors.push("Protected competitor lookup endpoint guard is missing.");
}

const liveLookupSource = readFileSync(
  path.join(projectRoot, "server", "competitor", "live-lookup.mjs"),
  "utf8",
);

if (!liveLookupSource.includes("ALLOWED_VENDOR_HOSTS") || !liveLookupSource.includes("normalizeAllowedProductUrl")) {
  errors.push("Competitor live lookup URL allowlist guard is missing.");
}

const guruDrawerSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "components", "WingmanGuruDrawer.tsx"),
  "utf8",
);

if (!guruDrawerSource.includes("VITE_WINGMAN_ENABLE_GURU_EXTERNAL_LOOKUP")) {
  errors.push("Guru external lookup privacy flag is missing.");
}

const projectStoreSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "data", "projectStore.ts"),
  "utf8",
);

for (const marker of [
  "activeProjectId",
  "syncStatus",
  "StoredRequirementRecord",
  "saveProjectRequirementsToProject",
  "saveDiscoveryBriefToProject",
  "saveProductSelectionToProject",
  "saveIngestAnalysisToProject",
  "saveCompareRunToProject",
  "saveProjectProposalToProject",
]) {
  if (!projectStoreSource.includes(marker)) {
    errors.push(`Project workflow store marker is missing: ${marker}.`);
  }
}

const documentExtractSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "lib", "documentExtract.ts"),
  "utf8",
);

if (!documentExtractSource.includes("mammoth/mammoth.browser") || !documentExtractSource.includes("pdfjs-dist/legacy/build/pdf.mjs")) {
  errors.push("Browser-side PDF/DOCX document extraction wiring is missing.");
}

const proposalExportSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "lib", "proposalExport.ts"),
  "utf8",
);

if (!proposalExportSource.includes("buildProposalHtml") || !proposalExportSource.includes("buildBomCsv")) {
  errors.push("Proposal/BOM export helpers are missing.");
}

const salesReadinessSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "lib", "salesReadiness.ts"),
  "utf8",
);
const dependencyGovernanceSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "lib", "dependencyGovernance.ts"),
  "utf8",
);

for (const marker of [
  "buildSalesReadinessPackage",
  "outputPurpose",
  "governedDependencies",
  "governanceWarnings",
  "validationNotes",
  "readinessScore",
]) {
  if (!salesReadinessSource.includes(marker)) {
    errors.push(`Sales readiness engine marker is missing: ${marker}.`);
  }
}

for (const marker of [
  "EXACT_DEPENDENCY_RULES",
  "buildGovernedDependencies",
  "GovernedDependency",
  "governedDependencyToBomRow",
  "hdbaset-sw130-rx500-short-receiver",
  "hdbaset-sw130-rx700-receiver",
  "hdbaset-sw130-value-hdbt2-receiver",
  "hdbaset-sw120tx3-rx3100-receiver",
  "NHD-0401-MV",
  "SW-0206-VW",
  "TBC-NHD-ENDPOINTS",
  "TBC-USB-TOPOLOGY",
]) {
  if (!dependencyGovernanceSource.includes(marker)) {
    errors.push(`Dependency governance marker is missing: ${marker}.`);
  }
}

const proposalPageSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "pages", "ProposalPage.tsx"),
  "utf8",
);

if (!proposalPageSource.includes("saveRecommendationFeedback") || !proposalPageSource.includes("Recommendation feedback")) {
  errors.push("Recommendation feedback capture is missing from Proposal.");
}

const templatesPageSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "pages", "TemplatesPage.tsx"),
  "utf8",
);
const roomTemplatesSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "lib", "roomTemplates.ts"),
  "utf8",
);

for (const marker of [
  "roomTemplates",
  "Editable WyreStorm BOM",
  "saveTemplateProject",
  "exportTemplateBom",
  "Other AV design scope",
]) {
  if (!templatesPageSource.includes(marker)) {
    errors.push(`Standalone room template marker is missing: ${marker}.`);
  }
}

if (templatesPageSource.includes("routeCatalogByKey.discovery.path")) {
  errors.push("Templates page still routes through Discovery.");
}

for (const marker of ["Corporate", "Education", "Retail", "Hospitality", "Healthcare", "Government", "Venue", "Transport"]) {
  if (!roomTemplatesSource.includes(marker)) {
    errors.push(`Room template vertical is missing: ${marker}.`);
  }
}

const projectDetailSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "pages", "ProjectDetailPage.tsx"),
  "utf8",
);

if (!projectDetailSource.includes("Editable requirements") || !projectDetailSource.includes("saveProjectRequirementsToProject")) {
  errors.push("Project detail requirement editor is missing.");
}

const projectRequirementsSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "lib", "projectRequirements.ts"),
  "utf8",
);

if (!projectRequirementsSource.includes("buildRequirementRecordsFromProject") || !projectRequirementsSource.includes("requirementReadiness")) {
  errors.push("Project requirement record builder is missing.");
}

const discoveryPageSource = readFileSync(
  path.join(projectRoot, "src", "wingman2", "pages", "DiscoveryPage.tsx"),
  "utf8",
);

if (!discoveryPageSource.includes("baseQuestionStrategyByStep") || !discoveryPageSource.includes("getQuestionStrategy")) {
  errors.push("Application-specific discovery question guidance is missing.");
}

const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
if (!packageJson.scripts?.["check:workflow"] || !packageJson.scripts?.["check:browser"]) {
  errors.push("Workflow integration or browser smoke check scripts are missing.");
}

if (errors.length > 0) {
  console.error("[readiness] Audit failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const index = JSON.parse(readFileSync(publicIndexPath, "utf8"));
console.log(
  `[readiness] Verified canonical runtime data, guarded lookup paths, project workflow state, extraction/export wiring, sales readiness engine, feedback capture, test scripts, and public product index (${index.products.length} products).`,
);
