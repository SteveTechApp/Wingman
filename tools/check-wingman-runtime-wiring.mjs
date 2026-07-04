import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const files = {
  main: read("src/main.tsx"),
  routes: read("src/wingman2/app/routes.tsx"),
  templates: read("src/wingman2/pages/TemplatesPage.tsx"),
  templateReview: read("src/wingman2/pages/TemplateReviewPage.tsx"),
  compare: read("src/wingman2/pages/ComparePageNew.advanced.tsx"),
  profile: read("src/wingman2/pages/ProfilePage.tsx"),
  guru: read("src/wingman2/components/WingmanGuruDrawer.tsx"),
  agentRoutes: read("server/routes/agents.mjs"),
  dockerfile: read("Dockerfile"),
  deploy: read(".github/workflows/deploy.yml"),
};

const checks = [
  ["Template cards use the BOM-backed room template source", files.templates.includes('from "../lib/roomTemplates"')],
  ["Template cards link to the template review route", /to=\{`\$\{routeCatalogByKey\.templates\.path\}\/\$\{template\.id\}`\}/.test(files.templates)],
  ["Template detail route is registered", files.routes.includes('path: "templates/:templateId"')],
  ["Unknown template IDs do not fall back to another room", !files.templateReview.includes("?? allRoomTemplates[0]") && !files.templateReview.includes("?? roomTemplates[0]")],
  ["Live Compare imports the governed runtime pipeline", /from\s+["']\.\.\/lib\/compareRuntimePipeline["']/.test(files.compare)],
  ["Live Compare executes the governed runtime pipeline", /runCompareRuntimePipeline\(/.test(files.compare)],
  ["Live Compare executes eligibility ranking", /const\s+ranked\s*=\s*applyCompareEligibilityRanking\(/.test(files.compare)],
  ["Rendered Compare candidates come from rigorous results", files.compare.includes("rigorousResult.matches")],
  ["New Project is owned by the React shell", !files.main.includes("__wingmanNewProjectHandlerInstalled") && !files.main.includes('text.includes("new project")')],
  ["Legacy Product Call Cards DOM patch is not loaded", !files.main.includes("wingmanProductCallCardsCleanUi")],
  ["Legacy Product Call Cards multi-page implementation is retired", !exists("src/wingman2/pages/productCallCards/ProductCallCardsSetupPage.tsx")],
  ["Settings imports real workspace authentication", files.profile.includes("loginWingmanWorkspace") && files.profile.includes("signUpWingmanWorkspace")],
  ["Settings triggers project hydration after authentication", files.profile.includes("hydrateProjectStoreFromBackend()")],
  ["Guru calls the protected grounded service", files.guru.includes('"/api/wingman/agents/guru"')],
  ["Guru server route executes the agent", files.agentRoutes.includes("await runGuruAgent(body)")],
  ["Frontend container compiles project sync configuration", files.dockerfile.includes("ARG VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC=true")],
  ["Deployment builds the backend image", files.deploy.includes("file: Dockerfile.server")],
  ["Deployment uses a configured trigger instead of a placeholder", files.deploy.includes("DEPLOY_WEBHOOK_URL") && !files.deploy.includes("Deploy (placeholder)")],
];

const failed = checks.filter(([, passes]) => !passes);

for (const [label, passes] of checks) {
  console.log(`[runtime-wiring] ${passes ? "PASS" : "FAIL"} ${label}`);
}

if (failed.length) {
  process.exitCode = 1;
  console.error(`[runtime-wiring] ${failed.length} runtime wiring check(s) failed.`);
} else {
  console.log(`[runtime-wiring] Verified ${checks.length} critical route, engine, service and deployment connections.`);
}
