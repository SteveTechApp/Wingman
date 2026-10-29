import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UNOWNED_ADDRESS, normaliseAddress, readRouteOwnership } from "./lib/route-ownership.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const routeManifestPath = path.join(projectRoot, "src", "wingman2", "app", "route-manifest.json");
const featureAuditPath = path.join(projectRoot, "src", "wingman2", "content", "feature-audit.json");
const routerPath = path.join(projectRoot, "src", "wingman2", "app", "routes.tsx");
const appEntryPath = path.join(projectRoot, "src", "wingman2", "app", "WingmanApp.tsx");

const routeManifest = JSON.parse(readFileSync(routeManifestPath, "utf8"));
const featureAudit = JSON.parse(readFileSync(featureAuditPath, "utf8"));
const routerSource = readFileSync(routerPath, "utf8");
const appEntrySource = readFileSync(appEntryPath, "utf8");

const routeKeys = new Set();
const routePaths = new Set();
const errors = [];

// The addresses the router serves, read out of the router's own table by
// `readRouteOwnership`, which `route-ownership.test.mjs` holds against router sources
// written for each shape — the catalogue spread, both skip-lists, a written-out
// `path:` literal, a splat, and an address nothing declares. What is left here is the
// manifest's half: the fields, the duplicates, the page files, and each entry's
// address against the table the reading produced.
const { servedAddresses, catchAll, problems: ownershipProblems } =
  readRouteOwnership({ routerSource, appEntrySource, routeManifest });
// The reading's own doubts — a spread it could not credit, an address nothing declares
// that came back served, an empty table, a splat inside the shell — are reported first
// and verbatim, because they say the table cannot be read at all rather than that one
// route is missing.
errors.push(...ownershipProblems);

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

  // The address, not the key: a manifest entry whose `path` and `segment` disagree
  // names an address the router serves under the other one, and a rep following the
  // manifest's own link reaches a page the entry does not describe.
  if (!servedAddresses.has(normaliseAddress(route.path))) {
    errors.push(
      `No route serves ${route.path} (${route.key}): src/wingman2/app/routes.tsx registers neither that `
        + "segment nor a catalogue entry for it"
        + (catchAll
          ? `, so the address falls through to the catch-all (path: "*" in WingmanApp.tsx, which sends a rep to ${catchAll})`
          : ", so the address reaches nothing")
        + ". Point the manifest at the address the router serves, or register the route — a manifest entry "
        + "alone is not a page, and its page file and audit row pass whether or not anything serves it.",
    );
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
  `[route-smoke] Checked ${routeManifest.length} routes and ${featureAudit.length} feature audit entries, `
    + `and held each manifest address to one of the ${servedAddresses.size} the router serves — reading `
    + `${UNOWNED_ADDRESS}, which nothing declares, as unserved.`,
);
