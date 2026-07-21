import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function hasRouteAction(source, routeKey) {
  return new RegExp(`routeAction\\(\\s*["']${routeKey}["']`).test(source);
}

function countMatches(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

const failures = [];

const routes = read("src/wingman2/app/routes.tsx");
const routeCatalog = read("src/wingman2/app/routeCatalog.ts");
const routeManifest = JSON.parse(read("src/wingman2/app/route-manifest.json"));
const navigationHub = read("src/wingman2/pages/NavigationHubPages.tsx");
const callCardsPage = read("src/wingman2/pages/CallCardsPage.tsx");
const salesHelperPage = read("src/wingman2/pages/SalesHelperPage.tsx");

const routeImports = Array.from(routes.matchAll(/\.\.\/pages\//g));
const knownRouteKeys = new Set(routeManifest.map((route) => route.key));
const salesHelperRouteKeys = Array.from(
  salesHelperPage.matchAll(/routeKey:\s*["']([^"']+)["']/g),
  (match) => match[1],
);
const primaryNavBlock = routeCatalog.match(
  /export const consolidatedPrimaryNavKeys = \[([\s\S]*?)\]\s+as const/,
)?.[1] ?? "";
const salesHelperDiscoveryRoutes = countMatches(
  salesHelperPage,
  /routeKey:\s*["']discovery["']/g,
);
const salesHelperDiscoverySeeds = countMatches(
  salesHelperPage,
  /discoverySeed:\s*/g,
);

assert(
  routeImports.length >= 20,
  "Route registry does not appear to include the expected Wingman page imports.",
);

assert(
  routes.includes("../pages/NavigationHubPages"),
  "Consolidated hub pages should be served from NavigationHubPages.",
);

assert(
  routes.includes("../pages/CallCardsPage"),
  "Legacy /wingman/call-cards route should remain registered for safe redirects.",
);

assert(
  callCardsPage.includes("Navigate") &&
    callCardsPage.includes('to="/wingman/call-coach"') &&
    callCardsPage.includes("replace"),
  "/wingman/call-cards should be a silent legacy redirect to Call Coach.",
);

assert(
  navigationHub.includes("export function CallCoachPage"),
  "NavigationHubPages is missing CallCoachPage.",
);

assert(
  navigationHub.includes("Product-specific call") &&
    navigationHub.includes("Discovery / requirement capture") &&
    navigationHub.includes("Call-out day") &&
    navigationHub.includes("Escalation check"),
  "Call Coach is missing expected sales-facing grouping terms.",
);

assert(
  hasRouteAction(navigationHub, "productCallCards") &&
    hasRouteAction(navigationHub, "discovery") &&
    hasRouteAction(navigationHub, "salesHelper") &&
    hasRouteAction(navigationHub, "support"),
  "Call Coach should link to Product Call Cards, Discovery, Sales Helper and Support.",
);

assert(
  !hasRouteAction(navigationHub, "callCards"),
  "Call Coach should not visibly link back to the legacy Call Cards route.",
);

assert(
  !/Inbound call|Live call cards|GUIDE A LIVE CALL|\/wingman\/call-cards/i.test(navigationHub),
  "Call Coach still exposes the removed live-call / Call Cards loop.",
);

assert(
  navigationHub.includes("export function ProductsPage") &&
    navigationHub.includes("export function DocumentsPage") &&
    navigationHub.includes("export function ResponsePackPage") &&
    navigationHub.includes("export function LearnPage"),
  "NavigationHubPages is missing one or more consolidated hub page exports.",
);

assert(
  primaryNavBlock.includes('"callCoach"'),
  "Call Coach should remain the single primary navigation entry for sales conversation support.",
);

assert(
  !primaryNavBlock.includes('"salesHelper"'),
  "Sales Helper must not duplicate Call Coach in the primary sidebar.",
);

assert(
  salesHelperPage.includes("routeCatalogByKey") &&
    salesHelperPage.includes("type WingmanRouteKey"),
  "Sales Helper should use the governed route catalogue instead of hard-coded route strings.",
);

assert(
  !salesHelperPage.includes('route: "/wingman/') &&
    !salesHelperPage.includes("navigate(\"/wingman/") &&
    !salesHelperPage.includes("navigate('/wingman/"),
  "Sales Helper still contains hard-coded Wingman destinations.",
);

assert(
  salesHelperRouteKeys.length > 0 &&
    salesHelperRouteKeys.every((routeKey) => knownRouteKeys.has(routeKey)),
  "Sales Helper contains an unknown route key.",
);

assert(
  !salesHelperRouteKeys.includes("callCoach"),
  "Sales Helper must not link back to Call Coach and create a circular workflow.",
);

assert(
  !salesHelperRouteKeys.includes("recommendations"),
  "Sales Helper must not bypass Discovery and send an unqualified signal-product enquiry directly to Recommendations.",
);

assert(
  salesHelperDiscoveryRoutes >= 4 &&
    salesHelperDiscoverySeeds >= salesHelperDiscoveryRoutes,
  "Every Discovery-led Sales Helper card should carry a distinct conversation seed into Discovery.",
);

assert(
  salesHelperPage.includes("wingman:use-call-notes-in-discovery") &&
    salesHelperPage.includes("sessionStorage.setItem") &&
    salesHelperPage.includes("navigate(routeCatalogByKey[card.routeKey].path)"),
  "Sales Helper is not wiring its selected conversation context into the next workflow.",
);

if (failures.length > 0) {
  console.error("[navigation-consolidation] Failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `[navigation-consolidation] Verified ${routeImports.length} manifest routes, consolidated hub pages, governed Sales Helper handoffs, and legacy Call Cards redirect policy.`,
);
