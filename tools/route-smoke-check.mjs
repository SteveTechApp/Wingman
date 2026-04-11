import fs from "fs";

const routeMapContent = fs.readFileSync("src/core/wingman/routeMap.ts", "utf-8");
const appRoutesContent = fs.readFileSync("src/AppRoutes.tsx", "utf-8");

const mainSection = routeMapContent.split("const legacyRouteRedirects")[0];

if (mainSection.includes("/wingman/")) {
  throw new Error("Legacy /wingman/ routes found in main routeMap");
}

const requiredRoutes = [
  "tools/compare",
  "tools/guru",
  "tools/training",
  "tools/video-wall",
  "tools/sales",
];

for (const route of requiredRoutes) {
  if (!appRoutesContent.includes(`path=\"${route}\"`)) {
    throw new Error(`Missing routed tool path: ${route}`);
  }
}

if (
  appRoutesContent.includes('path="tools/compare" element={<Navigate to="diagnostics" replace />}')
) {
  throw new Error("Competitor compare is still redirected to diagnostics");
}

console.log("Route check passed");
