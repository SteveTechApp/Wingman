import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const file = path.join(root, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function fail(message) {
  failures.push(message);
}

const manifestPath = "src/wingman2/app/route-manifest.json";
const policyPath = "tools/wingman-feature-surface-policy.json";
const routeCatalogPath = "src/wingman2/app/routeCatalog.ts";
const routesPath = "src/wingman2/app/routes.tsx";
const discoveryPath = "src/wingman2/pages/DiscoveryPage.tsx";
const navigationHubPath = "src/wingman2/pages/NavigationHubPages.tsx";
const recommendationsPath = "src/wingman2/pages/RecommendationsPage.tsx";
const finderPath = "src/wingman2/pages/FinderPage.tsx";

const manifest = JSON.parse(read(manifestPath) || "[]");
const policy = JSON.parse(read(policyPath) || "{}");
const routeKeys = new Set(manifest.map((route) => route.key));
const approvedRouteKeys = new Set(Array.isArray(policy.approvedRouteKeys) ? policy.approvedRouteKeys : []);
const retiredRouteKeys = new Set(Array.isArray(policy.retiredRouteKeys) ? policy.retiredRouteKeys : []);
const routeCatalog = read(routeCatalogPath);
const routes = read(routesPath);
const discovery = read(discoveryPath);
const navigationHub = read(navigationHubPath);
const recommendations = read(recommendationsPath);

if (!approvedRouteKeys.size) fail("Feature-surface policy has no approved routes.");

for (const routeKey of routeKeys) {
  if (!approvedRouteKeys.has(routeKey)) {
    fail(`Unapproved route key entered the live app: ${routeKey}. Update the policy only after deliberate review.`);
  }
}

for (const routeKey of approvedRouteKeys) {
  if (!routeKeys.has(routeKey)) {
    fail(`Approved route is missing from the live manifest: ${routeKey}.`);
  }
}

for (const routeKey of retiredRouteKeys) {
  if (routeKeys.has(routeKey)) {
    fail(`Retired route key returned to the live manifest: ${routeKey}.`);
  }
}

if (routeKeys.has("finder")) fail("Retired route key 'finder' is back in route-manifest.json.");
if (!routeKeys.has("recommendations")) fail("The recommendations route is missing.");
if (fs.existsSync(path.join(root, finderPath))) fail("FinderPage.tsx has returned.");
if (!fs.existsSync(path.join(root, recommendationsPath))) fail("RecommendationsPage.tsx is missing.");
if (routeCatalog.includes('| "finder"') || routeCatalog.includes("finder: Search")) {
  fail("The Finder route has returned to routeCatalog.ts.");
}
if (!routeCatalog.includes('| "recommendations"')) {
  fail("Recommendations is missing from WingmanRouteKey.");
}
if (!routes.includes("../pages/RecommendationsPage")) {
  fail("RecommendationsPage is not wired into routes.tsx.");
}
if (!routes.includes('path: "finder"') || !routes.includes('to="/wingman/discovery"')) {
  fail("The old /wingman/finder URL must redirect to Discovery.");
}
if (!discovery.includes("routeCatalogByKey.recommendations.path")) {
  fail("Discovery is not handing off to Recommendations.");
}
if (/routeAction\s*\(\s*["']finder["']\s*,/m.test(navigationHub)) {
  fail("The Products hub is exposing the retired standalone Finder route.");
}
if (/routeAction\s*\(\s*["']recommendations["']\s*,\s*["']Find Product["']/m.test(navigationHub)) {
  fail("The Products hub is exposing the retired guided Find Product workflow.");
}
if (!recommendations.includes("loadWingmanProductSelectorDecisions")) {
  fail("RecommendationsPage is not using the shared governed selector.");
}
if (!recommendations.includes('mode: "recommendations"')) {
  fail("RecommendationsPage is not using recommendations selector mode.");
}

const sourceRoots = ["src"];
for (const sourceRoot of sourceRoots) {
  const stack = [path.join(root, sourceRoot)];

  while (stack.length) {
    const current = stack.pop();
    if (!fs.existsSync(current)) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }

      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const relative = path.relative(root, full).replace(/\\/g, "/");
      const source = fs.readFileSync(full, "utf8");

      if (source.includes("routeCatalogByKey.finder")) {
        fail(`${relative} still references routeCatalogByKey.finder.`);
      }

      if (source.includes("../pages/FinderPage")) {
        fail(`${relative} still imports FinderPage.`);
      }

      if (source.includes("Product Finder")) {
        fail(`${relative} still contains retired user-facing Product Finder wording.`);
      }
    }
  }
}

if (failures.length) {
  console.error("[retired-features] FAILED");
  failures.forEach((failure) => console.error("- " + failure));
  process.exit(1);
}

console.log("[retired-features] PASS — standalone Finder is retired, the route surface is policy-governed, and Recommendations is the only Discovery matching surface.");
