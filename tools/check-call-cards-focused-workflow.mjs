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
const routes = read("src/wingman2/app/routes.tsx");

assert(
  callCardsPage.includes("Live Call Cards has moved into Call Coach"),
  "/wingman/call-cards should render the consolidation handoff page."
);

assert(
  callCardsPage.includes("/wingman/call-coach") &&
    callCardsPage.includes("/wingman/discovery") &&
    callCardsPage.includes("/wingman/compare") &&
    callCardsPage.includes("/wingman/product-call-cards"),
  "Call Cards consolidation page should route users to Call Coach, Discovery, Compare and Product Call Cards."
);

assert(
  callCardsPage.includes("Product Call Cards are still active"),
  "Consolidation page should clearly distinguish Product Call Cards from the demoted live-call workflow."
);

assert(
  routes.includes("../pages/CallCardsPage"),
  "Route should remain safe for old /wingman/call-cards links."
);

assert(
  productCallCardsPage.includes("ProductCallCards") || productCallCardsPage.includes("productCallCards"),
  "Product Call Cards page should remain present and distinct."
);

console.log("[call-cards-focused-workflow] Verified Live Call Cards consolidation into Call Coach and Product Call Cards preservation.");