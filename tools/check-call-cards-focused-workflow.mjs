import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[call-cards-focused-workflow] ${message}`);
    process.exit(1);
  }
}

const callCardsPage = read("src/wingman2/pages/CallCardsPage.tsx");
const productCallCardsPage = read("src/wingman2/pages/ProductCallCardsPage.tsx");
const navigationHub = read("src/wingman2/pages/NavigationHubPages.tsx");
const routes = read("src/wingman2/app/routes.tsx");

assert(
  callCardsPage.includes("Navigate") &&
    callCardsPage.includes('to="/wingman/call-coach"') &&
    callCardsPage.includes("replace"),
  "/wingman/call-cards should redirect directly to Call Coach."
);

assert(
  !callCardsPage.includes("Open Call Coach") &&
    !callCardsPage.includes("Choose the next sales action") &&
    !callCardsPage.includes("Product Call Cards remain available"),
  "/wingman/call-cards should not render a redundant handoff-button page."
);

assert(
  !/title:\s*"Inbound call"/i.test(navigationHub) &&
    !/Live call cards/i.test(navigationHub),
  "Call Coach should not expose the redundant Inbound call / Live Call Cards tile."
);

assert(
  routes.includes("../pages/CallCardsPage"),
  "Route should remain safe for old /wingman/call-cards links."
);

assert(
  productCallCardsPage.includes("ProductCallCards") || productCallCardsPage.includes("productCallCards"),
  "Product Call Cards page should remain present and distinct."
);

console.log("[call-cards-focused-workflow] Verified /wingman/call-cards redirects to Call Coach and redundant live-call buttons are removed.");