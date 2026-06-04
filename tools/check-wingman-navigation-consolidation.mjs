import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, "src", "wingman2", "app", "route-manifest.json");
const routesPath = path.join(repoRoot, "src", "wingman2", "app", "routes.tsx");
const catalogPath = path.join(repoRoot, "src", "wingman2", "app", "routeCatalog.ts");
const shellPath = path.join(repoRoot, "src", "wingman2", "layout", "AppShell.tsx");
const hubPath = path.join(repoRoot, "src", "wingman2", "pages", "NavigationHubPages.tsx");

const errors = [];

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${path.relative(repoRoot, filePath)}`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

const manifestRaw = read(manifestPath);
const routesSource = read(routesPath);
const catalogSource = read(catalogPath);
const shellSource = read(shellPath);
const hubSource = read(hubPath);

if (manifestRaw.charCodeAt(0) === 0xfeff) {
  errors.push("route-manifest.json has a UTF-8 BOM.");
}

let manifest = [];
try {
  manifest = JSON.parse(manifestRaw);
} catch (error) {
  errors.push(`route-manifest.json is not valid JSON: ${error.message}`);
}

const routeKeys = new Set();
const routePaths = new Set();

for (const route of manifest) {
  if (!route?.key || !route?.path || !route?.segment || !route?.navLabel || !route?.pageFile) {
    errors.push(`Route entry is missing required fields: ${JSON.stringify(route)}`);
    continue;
  }

  if (routeKeys.has(route.key)) errors.push(`Duplicate route key in manifest: ${route.key}`);
  if (routePaths.has(route.path)) errors.push(`Duplicate route path in manifest: ${route.path}`);

  routeKeys.add(route.key);
  routePaths.add(route.path);

  const pagePath = path.join(repoRoot, "src", "wingman2", "pages", route.pageFile);
  if (!fs.existsSync(pagePath)) {
    errors.push(`Route ${route.key} points at a missing page file: ${route.pageFile}`);
  }
}

const pageRegistryBlock = routesSource.match(/const pageRegistry[\s\S]*?};/m)?.[0] ?? "";
const pageRegistryKeys = [...pageRegistryBlock.matchAll(/^\s*([A-Za-z0-9_]+):\s*lazy/mg)].map((match) => match[1]);
const pageRegistryKeySet = new Set(pageRegistryKeys);

for (const key of routeKeys) {
  if (!pageRegistryKeySet.has(key)) {
    errors.push(`Missing page registry entry for route key: ${key}`);
  }
}

for (const key of pageRegistryKeys) {
  if (pageRegistryKeys.indexOf(key) !== pageRegistryKeys.lastIndexOf(key)) {
    errors.push(`Duplicate page registry key: ${key}`);
  }
}

const expectedPrimaryNav = [
  ["dashboard", "Home"],
  ["callCoach", "Call Coach"],
  ["products", "Products"],
  ["compare", "Compare"],
  ["documents", "Documents"],
  ["responsePack", "Response Pack"],
  ["projects", "Projects"],
  ["learn", "Learn"],
  ["profile", "Settings"],
];

if (!catalogSource.includes("consolidatedPrimaryNavKeys")) {
  errors.push("routeCatalog.ts does not export consolidatedPrimaryNavKeys.");
}

if (!shellSource.includes("consolidatedPrimaryNavKeys")) {
  errors.push("AppShell does not use consolidatedPrimaryNavKeys for primary navigation.");
}

for (const [key, navLabel] of expectedPrimaryNav) {
  const route = manifest.find((entry) => entry.key === key);
  if (!route) {
    errors.push(`Missing consolidated primary route: ${key}`);
    continue;
  }

  if (route.navLabel !== navLabel) {
    errors.push(`Route ${key} navLabel should be ${navLabel}, found ${route.navLabel}.`);
  }

  if (!catalogSource.includes(`"${key}"`)) {
    errors.push(`consolidatedPrimaryNavKeys source is missing ${key}.`);
  }
}

const productCallCards = manifest.find((entry) => entry.key === "productCallCards");
if (!productCallCards) {
  errors.push("Product Call Cards route is missing.");
} else if (productCallCards.path !== "/wingman/product-call-cards") {
  errors.push(`Product Call Cards route has unexpected path: ${productCallCards.path}`);
}

const hiddenFromPrimary = [
  "callCards",
  "discovery",
  "salesHelper",
  "finder",
  "productFamilies",
  "productPitch",
  "productCallCards",
  "ingest",
  "proposal",
  "support",
  "intelligence",
  "templates",
  "videowall",
  "visualDesign",
  "glossary",
];

for (const key of hiddenFromPrimary) {
  if (expectedPrimaryNav.some(([primaryKey]) => primaryKey === key)) {
    errors.push(`Overlapping old route is still primary: ${key}`);
  }

  const linkedFromHub =
    hubSource.includes(`routeCatalogByKey.${key}.path`) ||
    hubSource.includes(`routeAction("${key}"`);

  if (!linkedFromHub) {
    errors.push(`Old route ${key} is not linked from consolidated hub pages.`);
  }
}

for (const term of [
  "Inbound call",
  "SKU Call Card",
  "Upload / Paste",
  "Technical review required",
  "Commercial review required before quotation",
  "Product Intelligence",
]) {
  if (!hubSource.includes(term)) {
    errors.push(`NavigationHubPages is missing expected grouping term: ${term}`);
  }
}

if (errors.length) {
  console.error("[navigation-consolidation] Failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`[navigation-consolidation] Verified ${manifest.length} manifest routes, consolidated primary nav, and grouped legacy routes.`);
