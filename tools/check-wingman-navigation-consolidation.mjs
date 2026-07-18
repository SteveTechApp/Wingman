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

const failures = [];

const routes = read("src/wingman2/app/routes.tsx");
const navigationHub = read("src/wingman2/pages/NavigationHubPages.tsx");
const callCardsPage = read("src/wingman2/pages/CallCardsPage.tsx");

const routeImports = Array.from(routes.matchAll(/\.\.\/pages\//g));

assert(
  routeImports.length >= 20,
  "Route registry does not appear to include the expected Wingman page imports."
);

assert(
  routes.includes("../pages/NavigationHubPages"),
  "Consolidated hub pages should be served from NavigationHubPages."
);

assert(
  routes.includes("../pages/CallCardsPage"),
  "Legacy /wingman/call-cards route should remain registered for safe redirects."
);

assert(
  callCardsPage.includes("Navigate") &&
    callCardsPage.includes('to="/wingman/call-coach"') &&
    callCardsPage.includes("replace"),
  "/wingman/call-cards should be a silent legacy redirect to Call Coach."
);

assert(
  navigationHub.includes("export function CallCoachPage"),
  "NavigationHubPages is missing CallCoachPage."
);

assert(
  navigationHub.includes("Product-specific call") &&
    navigationHub.includes("Discovery / requirement capture") &&
    navigationHub.includes("Call-out day") &&
    navigationHub.includes("Escalation check"),
  "Call Coach is missing expected sales-facing grouping terms."
);

assert(
  hasRouteAction(navigationHub, "productCallCards") &&
    hasRouteAction(navigationHub, "discovery") &&
    hasRouteAction(navigationHub, "salesHelper") &&
    hasRouteAction(navigationHub, "support"),
  "Call Coach should link to Product Call Cards, Discovery, Sales Helper and Support."
);

assert(
  !hasRouteAction(navigationHub, "callCards"),
  "Call Coach should not visibly link back to the legacy Call Cards route."
);

assert(
  !/Inbound call|Live call cards|GUIDE A LIVE CALL|\/wingman\/call-cards/i.test(navigationHub),
  "Call Coach still exposes the removed live-call / Call Cards loop."
);

assert(
  navigationHub.includes("export function ProductsPage") &&
    navigationHub.includes("export function DocumentsPage") &&
    navigationHub.includes("export function ResponsePackPage") &&
    navigationHub.includes("export function LearnPage"),
  "NavigationHubPages is missing one or more consolidated hub page exports."
);

if (failures.length > 0) {
  console.error("[navigation-consolidation] Failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `[navigation-consolidation] Verified ${routeImports.length} manifest routes, consolidated hub pages, and legacy Call Cards redirect policy.`
);
