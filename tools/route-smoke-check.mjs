import fs from "fs";

const content = fs.readFileSync("src/core/wingman/routeMap.ts", "utf-8");

// Only check BEFORE legacy redirects
const mainSection = content.split("const legacyRouteRedirects")[0];

if (mainSection.includes("/wingman/")) {
  throw new Error("Legacy /wingman/ routes found in main routeMap");
}

console.log("Route check passed");
