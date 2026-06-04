import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const errors = [];

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function expectMarkers(relativePath, markers) {
  const source = read(relativePath);

  for (const marker of markers) {
    if (!source.includes(marker)) {
      errors.push(`${relativePath} is missing marker: ${marker}`);
    }
  }
}

expectMarkers(".env.example", [
  "VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC=false",
  "WINGMAN_STORAGE_MODE=auto",
  "SUPABASE_WINGMAN_PROJECTS_TABLE=wingman_projects",
]);

expectMarkers("src/wingman2/data/projectStore.ts", [
  "projectBackendSyncEnabled",
  "http-only-cookie",
  "resetProjectBackendSyncSessionState",
  "credentials: \"include\"",
  "PROJECT_SYNC_SIGN_IN_MESSAGE",
]);

expectMarkers("src/wingman2/api/wingmanApi.ts", [
  "getWingmanSession",
  "signUpWingmanWorkspace",
  "loginWingmanWorkspace",
  "logoutWingmanWorkspace",
  "credentials: \"include\"",
]);

expectMarkers("src/wingman2/pages/ProfilePage.tsx", [
  "Workspace sync",
  "Live-call recovery",
  "Create workspace",
  "hydrateProjectStoreFromBackend",
  "resetProjectBackendSyncSessionState",
]);

expectMarkers("server/wingman-app-store.mjs", [
  "handleWingmanAuthSignupPost",
  "handleWingmanAuthLoginPost",
  "handleWingmanProjectsSyncPost",
  "HttpOnly",
  "wingman_projects",
]);

const packageJson = JSON.parse(read("package.json"));
if (!packageJson.scripts?.["check:project-sync"]) {
  errors.push("package.json is missing check:project-sync.");
}

if (!String(packageJson.scripts?.verify ?? "").includes("check:project-sync")) {
  errors.push("npm run verify does not include check:project-sync.");
}

if (errors.length) {
  console.error("[project-sync] Failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[project-sync] Verified backend project sync flag, Settings auth UI, cookie-backed sync path and guarded server routes.");
