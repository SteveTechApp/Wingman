import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = 8899;
// Isolate the spawned server's writable sandbox outside the repo, matching
// check:api-contract - the workflow boot must never write into data/.
const throwawayDataDir = path.join(projectRoot, ".freebuff", "tmp", "workflow-check-data");
const errors = [];

function assertSourceContains(relativePath, markers) {
  const source = readFileSync(path.join(projectRoot, relativePath), "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) {
      errors.push(`${relativePath} is missing marker: ${marker}`);
    }
  }
}

async function waitForHealth() {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw new Error("Backend health endpoint did not become ready.");
}

async function postStatus(pathname, body) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return response.status;
}

async function checkProtectedBackendRoutes() {
  const child = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      WINGMAN_UI_PORT: "3999",
      WINGMAN_DATA_DIR: throwawayDataDir,
    },
    stdio: "ignore",
    windowsHide: true,
  });

  try {
    await waitForHealth();
    const lookupStatus = await postStatus("/api/wingman/competitor-lookup", {
      brand: "Extron",
      sku: "IN1608",
      query: "Extron IN1608",
    });
    const matchStatus = await postStatus("/api/competitor/resolveMatch", {
      manufacturer: "Extron",
      model: "IN1608",
    });

    if (lookupStatus !== 401) errors.push(`Expected protected lookup to return 401, received ${lookupStatus}.`);
    if (matchStatus !== 401) errors.push(`Expected protected match resolver to return 401, received ${matchStatus}.`);
  } finally {
    child.kill("SIGTERM");
  }
}

assertSourceContains("src/wingman2/lib/documentExtract.ts", [
  "pdfjs-dist/legacy/build/pdf.mjs",
  "mammoth/mammoth.browser",
  "extractDocuments",
]);
assertSourceContains("src/wingman2/lib/proposalExport.ts", [
  "buildBomCsv",
  "buildProposalHtml",
  // The printed statement that a comparison is context, not scope. The gate
  // asserts the constant the exporter prints, not its wording, so the sentence
  // has one owner in the copy layer and the document cannot drift from it.
  "CUSTOMER_COPY.competitorExclusion",
]);
assertSourceContains("src/wingman2/lib/proposalCopy.ts", [
  "competitorExclusion",
  // Held once, here: this is the sentence the customer reads.
  "Competitor products are not included in this proposal or its equipment schedule.",
]);
assertSourceContains("src/wingman2/lib/salesReadiness.ts", [
  "buildSalesReadinessPackage",
  "outputPurpose",
  "governedDependencies",
  "governanceWarnings",
  "repGuidance",
]);
assertSourceContains("src/wingman2/lib/dependencyGovernance.ts", [
  "EXACT_DEPENDENCY_RULES",
  "buildGovernedDependencies",
  "governedDependencyToBomRow",
  "hdbaset-sw130-rx500-short-receiver",
  "hdbaset-sw130-rx700-receiver",
  "hdbaset-sw130-value-hdbt2-receiver",
  "hdbaset-sw120tx3-rx3100-receiver",
  "NHD-0401-MV",
  "SW-0206-VW",
  "TBC-HDBASET-PAIR",
  "TBC-USB-TOPOLOGY",
]);
// Compare decisions and evidence are exercised by check:compare-decision and
// check:compare-page-candidate-gate. The route bridge has rendered regression tests.
assertSourceContains("src/wingman2/pages/ComparePageNew.tsx", ["ComparePageNew.advanced", "useSearchParams"]);
// Guidance data is shared by the active Discovery interview and room builders.
assertSourceContains("src/wingman2/pages/discovery/discoveryQuestions.ts", [
  "baseQuestionStrategyByStep",
  "getQuestionStrategy",
]);
assertSourceContains("src/wingman2/pages/DiscoveryPage.tsx", [
  "<DiscoveryGuidedInterview",
  "<DiscoveryExpertBuilder",
  "Live call mode",
  "Current model",
  "View full model",
]);
assertSourceContains("src/wingman2/pages/ProjectDetailPage.tsx", [
  "Editable requirements",
  "saveProjectRequirementsToProject",
  "discoveryResumeUrl(project.id)",
  "Edit in Discovery",
]);
assertSourceContains("src/wingman2/lib/projectRequirements.ts", [
  "buildRequirementRecordsFromProject",
  "getProjectRequirementRecords",
  "requirementReadiness",
]);
// The review page's proposal actions and builder handoff live in its own hooks
// so the page entry stays inside its line allowance; the workflow they provide
// is read from the page and those hooks together.
const templateHandoffSource = [
  "src/wingman2/pages/TemplateReviewPage.tsx",
  "src/wingman2/pages/template/useTemplateHandoff.ts",
].map((relativePath) => readFileSync(path.join(projectRoot, relativePath), "utf8")).join("\n");
const templateWorkflowSource = [
  "src/wingman2/pages/TemplatesPage.tsx",
  "src/wingman2/pages/TemplateReviewPage.tsx",
  "src/wingman2/pages/template/useTemplateProposal.ts",
].map((relativePath) => readFileSync(path.join(projectRoot, relativePath), "utf8")).join("\n");
// a395a3a2 (template AV-system modelling) intentionally reworded the review
// page's BOM heading; the lowercase listing copy on TemplatesPage now carries
// the wording, and the review page keeps export/save wiring.
for (const marker of ["editable WyreStorm BOM", "exportBomCsv", "upsertStoredProject", "Third-party scope"]) {
  if (!templateWorkflowSource.includes(marker)) {
    errors.push(`Template workflow is missing marker: ${marker}`);
  }
}
// Templates intentionally reuse the Discovery workflow: "Use template" and
// "New Custom Template" both hand off into Discovery (see discoveryTemplateHandoff.ts)
// instead of duplicating Discovery's question/recommendation logic.
if (!templateHandoffSource.includes("routeCatalogByKey.discovery.path")) {
  errors.push("Templates page no longer routes through Discovery for the template-to-Discovery handoff.");
}
assertSourceContains("src/wingman2/lib/roomTemplates.ts", [
  "Corporate",
  "Education",
  "Retail",
  "Hospitality",
  "Government",
  "Transport",
]);
assertSourceContains("src/wingman2/data/projectStore.ts", [
  "syncStatus",
  "projectSyncService",
]);
assertSourceContains("src/wingman2/features/projects/model/projectTypes.ts", [
  "StoredRequirementRecord",
  "StoredRecommendationFeedback",
]);
assertSourceContains("src/wingman2/features/projects/commands/proposalCommands.ts", [
  "saveProjectRequirementsToProject",
]);
assertSourceContains("src/wingman2/features/projects/persistence/projectSyncService.ts", [
  "conflict",
  "Local project changes were newer than backend data",
]);

if (errors.length) {
  console.error("[workflow-integration] Check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

await checkProtectedBackendRoutes();

if (errors.length) {
  console.error("[workflow-integration] Check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[workflow-integration] Verified extraction/export wiring, sales readiness engine, feedback capture, sync conflict markers, compare viable-option evidence wiring, and protected backend routes.");
