import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = 8899;
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
  "Competitor products are excluded",
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
assertSourceContains("src/wingman2/pages/ComparePage.tsx", [
  "runCompetitorMatch",
  "Match evidence",
  "matchScore",
  "saveRecommendationFeedback",
]);
assertSourceContains("src/wingman2/pages/DiscoveryPage.tsx", [
  "baseQuestionStrategyByStep",
  "getQuestionStrategy",
  "Ask less, explain more",
]);
assertSourceContains("src/wingman2/pages/ProjectDetailPage.tsx", [
  "Editable requirements",
  "saveProjectRequirementsToProject",
  "requirementReadiness",
]);
assertSourceContains("src/wingman2/lib/projectRequirements.ts", [
  "buildRequirementRecordsFromProject",
  "getProjectRequirementRecords",
  "requirementReadiness",
]);
assertSourceContains("src/wingman2/pages/TemplatesPage.tsx", [
  "Editable WyreStorm BOM",
  "saveTemplateProject",
  "exportTemplateBom",
  "Other AV design scope",
]);
if (
  readFileSync(path.join(projectRoot, "src/wingman2/pages/TemplatesPage.tsx"), "utf8").includes(
    "routeCatalogByKey.discovery.path",
  )
) {
  errors.push("Templates page still routes through Discovery.");
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
  "conflict",
  "StoredRequirementRecord",
  "StoredRecommendationFeedback",
  "Local project changes were newer than backend data",
]);

await checkProtectedBackendRoutes();

if (errors.length) {
  console.error("[workflow-integration] Check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[workflow-integration] Verified extraction/export wiring, sales readiness engine, feedback capture, sync conflict markers, match evidence wiring, and protected backend routes.");
