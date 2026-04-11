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

function mustNotExist(relativePath, label) {
  const fullPath = path.join(repoRoot, relativePath);
  if (fs.existsSync(fullPath)) {
    throw new Error(`${label} should not exist in live source: ${relativePath}`);
  }
}

mustExist("src/features/projects/projectStore.ts", "Canonical project store");
mustExist("src/features/compare/CompetitorComparePage.tsx", "Compare page");
mustExist("src/features/projects/ProjectsPage.tsx", "Projects page");
mustExist("src/app/providers/WingmanProviders.tsx", "Providers");
mustExist("src/pages/LoginPage.tsx", "Login page");
mustExist("src/pages/SignupPage.tsx", "Signup page");
mustExist("src/pages/PublicLandingPage.tsx", "Public landing page");

mustNotExist("src/context/GenerationContext.tsx", "Legacy generation context");
mustNotExist("src/features/projects/WingmanSavedProjectsPanel.tsx", "Legacy saved projects panel");
mustNotExist("src/app/logic/wingmanProjectPersistence.ts", "Legacy project persistence");
mustNotExist("src/proposal/bom/persist.ts", "Legacy proposal persistence");

mustContain("src/features/projects/projectStore.ts", "export function createProject(", "Project creation");
mustContain("src/features/projects/projectStore.ts", "export function ensureActiveProject(", "Active project creation");
mustContain("src/features/projects/projectStore.ts", "export function applyCompareToProject(", "Compare saveback export");
mustContain("src/features/projects/projectStore.ts", "export function setActiveProjectId(", "Active project selection");
mustContain("src/features/projects/projectStore.ts", "export function getActiveProject(", "Active project lookup");

mustContain("src/features/compare/CompetitorComparePage.tsx", "applyCompareToProject(", "Compare saveback usage");
mustContain("src/features/compare/CompetitorComparePage.tsx", "ensureActiveProject(", "Compare project ensure usage");
mustContain("src/features/compare/CompetitorComparePage.tsx", "buildProjectCompareRecord(", "Compare record builder");
mustContain("src/features/compare/CompetitorComparePage.tsx", "useNavigate()", "Compare router navigation hook");
mustContain("src/features/compare/CompetitorComparePage.tsx", "WM_ROUTES.catalog", "Compare catalogue route usage");

mustNotContain("src/app/providers/WingmanProviders.tsx", "GenerationProvider", "Legacy provider wrapper");

mustContain("src/pages/LoginPage.tsx", "signInDemo(", "Explicit demo mode on login page");
mustContain("src/pages/SignupPage.tsx", "signInDemo(", "Explicit demo mode on signup page");
mustContain("src/pages/PublicLandingPage.tsx", "signInDemo(", "Explicit demo mode on public landing page");

console.log("Canonical store regression check passed");