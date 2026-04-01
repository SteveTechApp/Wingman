import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routeMapPath = path.join(root, "src", "core", "wingman", "routeMap.ts");

const content = fs.readFileSync(routeMapPath, "utf8");

if (!content.includes("/app/dashboard")) {
  throw new Error("routeMap.ts missing /app/dashboard");
}

if (content.includes("/wingman/")) {
  throw new Error("Legacy /wingman/ routes still present in routeMap.ts");
}

console.log("Route smoke check passed");