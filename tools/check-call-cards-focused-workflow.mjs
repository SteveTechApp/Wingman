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
  callCardsPage.includes("Use Call Coach during customer conversations"),
  "/wingman/call-cards should present a salesperson-facing Call Coach handoff."
);

assert(
  callCardsPage.includes("Choose the next sales action"),
  "Call Cards handoff should use sales-facing direction, not developer or release-note wording."
);

assert(
  callCardsPage.includes("/wingman/call-coach") &&
    callCardsPage.includes("/wingman/discovery") &&
    callCardsPage.includes("/wingman/compare") &&
    callCardsPage.includes("/wingman/product-call-cards"),
  "Call Cards handoff should route users to Call Coach, Discovery, Compare and Product Call Cards."
);

assert(
  callCardsPage.includes("Product Call Cards remain available"),
  "Handoff page should clearly preserve Product Call Cards as the SKU-specific sales guidance route."
);

assert(
  !/workflow consolidated|has moved into|old .*workflow|confusing|demoted|deprecated|archived/i.test(callCardsPage),
  "Call Cards handoff contains developer-facing transition wording."
);

assert(
  routes.includes("../pages/CallCardsPage"),
  "Route should remain safe for existing /wingman/call-cards links."
);

assert(
  productCallCardsPage.includes("ProductCallCards") || productCallCardsPage.includes("productCallCards"),
  "Product Call Cards page should remain present and distinct."
);

console.log("[call-cards-focused-workflow] Verified salesperson-facing Call Coach handoff and Product Call Cards preservation.");