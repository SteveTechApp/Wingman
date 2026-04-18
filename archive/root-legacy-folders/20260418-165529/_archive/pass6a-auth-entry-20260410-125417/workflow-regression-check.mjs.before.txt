import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function mustContain(relativePath, text, label) {
  const content = read(relativePath);
  if (!content.includes(text)) {
    throw new Error(`${label} missing in ${relativePath}: ${text}`);
  }
}

function mustNotContain(relativePath, text, label) {
  const content = read(relativePath);
  if (content.includes(text)) {
    throw new Error(`${label} still present in ${relativePath}: ${text}`);
  }
}

function mustExist(relativePath, label) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${label} missing: ${relativePath}`);
  }
}

mustExist("src/AppRoutes.tsx", "App routes");
mustExist("src/core/wingman/routeMap.ts", "Route map");
mustExist("src/features/projects/ProjectsPage.tsx", "Projects page");
mustExist("src/features/compare/CompetitorComparePage.tsx", "Compare page");
mustExist("src/features/proposal/ProposalPage.tsx", "Proposal page");
mustExist("src/pages/LoginPage.tsx", "Login page");
mustExist("src/pages/SignupPage.tsx", "Signup page");
mustExist("src/pages/PublicLandingPage.tsx", "Public landing page");
mustExist("src/app/providers/WingmanProviders.tsx", "Providers");
mustExist("tools/guardrail-scan.ps1", "Guardrail scan");

mustContain("src/core/wingman/routeMap.ts", "/app/tools/proposal", "Proposal route");
mustContain("src/core/wingman/routeMap.ts", "/app/tools/catalog", "Catalogue route");
mustContain("src/core/wingman/routeMap.ts", "/app/projects", "Projects route");

mustNotContain("src/features/projects/ProjectsPage.tsx", "WingmanSavedProjectsPanel", "Legacy projects panel");
mustNotContain("src/app/providers/WingmanProviders.tsx", "GenerationProvider", "Legacy provider wrapper");

mustContain("src/pages/LoginPage.tsx", "signInDemo(", "Explicit demo mode on login page");
mustContain("src/pages/SignupPage.tsx", "signInDemo(", "Explicit demo mode on signup page");
mustContain("src/pages/PublicLandingPage.tsx", "signInDemo(", "Explicit demo mode on public landing page");

mustContain("src/features/compare/CompetitorComparePage.tsx", "navigate(WM_ROUTES.dashboard)", "Compare dashboard navigation");
mustContain("src/features/compare/CompetitorComparePage.tsx", "navigate(WM_ROUTES.tools)", "Compare tools navigation");
mustContain("src/features/compare/CompetitorComparePage.tsx", "navigate(WM_ROUTES.catalog)", "Compare catalogue navigation");
mustNotContain("src/features/compare/CompetitorComparePage.tsx", 'window.location.href = "/app/dashboard"', "Compare hard navigation");
mustNotContain("src/features/compare/CompetitorComparePage.tsx", 'window.location.href = "/app/tools"', "Compare hard navigation");
mustNotContain("src/features/compare/CompetitorComparePage.tsx", 'window.location.href = "/app/tools/catalog"', "Compare hard navigation");
mustContain("src/features/compare/CompetitorComparePage.tsx", "applyCompareToProject(", "Compare saveback");
mustContain("src/features/compare/CompetitorComparePage.tsx", "ensureActiveProject(", "Compare active project");
mustContain("src/features/compare/CompetitorComparePage.tsx", "buildProjectCompareRecord(", "Compare project record builder");

mustContain("src/features/proposal/ProposalPage.tsx", "generateProposal(", "Proposal generation");
mustContain("src/features/proposal/ProposalPage.tsx", "active project", "Proposal project-linked copy");

console.log("Workflow regression check passed");