import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const routeManifestPath = path.join(projectRoot, "src", "wingman2", "app", "route-manifest.json");
const featureAuditPath = path.join(projectRoot, "src", "wingman2", "content", "feature-audit.json");

const routeManifest = JSON.parse(readFileSync(routeManifestPath, "utf8"));
const featureAudit = JSON.parse(readFileSync(featureAuditPath, "utf8"));

const routeKeys = new Set();
const routePaths = new Set();
const errors = [];

for (const route of routeManifest) {
  if (!route.key || !route.path || !route.pageFile) {
    errors.push(`Route entry is missing required fields: ${JSON.stringify(route)}`);
    continue;
  }

  if (routeKeys.has(route.key)) {
    errors.push(`Duplicate route key found: ${route.key}`);
  }

  if (routePaths.has(route.path)) {
    errors.push(`Duplicate route path found: ${route.path}`);
  }

  routeKeys.add(route.key);
  routePaths.add(route.path);

  const pagePath = path.join(projectRoot, "src", "wingman2", "pages", route.pageFile);
  if (!existsSync(pagePath)) {
    errors.push(`Missing page component for route ${route.key}: ${pagePath}`);
  }
}

const auditedKeys = new Set();

for (const entry of featureAudit) {
  if (!entry.routeKey || !entry.status || !entry.summary) {
    errors.push(`Feature audit entry is missing required fields: ${JSON.stringify(entry)}`);
    continue;
  }

  if (!routeKeys.has(entry.routeKey)) {
    errors.push(`Feature audit entry references unknown route key: ${entry.routeKey}`);
  }

  if (auditedKeys.has(entry.routeKey)) {
    errors.push(`Duplicate feature audit entry found: ${entry.routeKey}`);
  }

  auditedKeys.add(entry.routeKey);
}

for (const routeKey of routeKeys) {
  if (!auditedKeys.has(routeKey)) {
    errors.push(`Missing feature audit entry for route: ${routeKey}`);
  }
}

if (errors.length) {
  console.error("[route-smoke] Audit failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `[route-smoke] Checked ${routeManifest.length} routes and ${featureAudit.length} feature audit entries.`,
);
