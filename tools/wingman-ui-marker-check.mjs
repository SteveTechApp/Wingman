import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function mustContain(file, marker, label) {
  if (!exists(file)) {
    failures.push(`Missing file: ${file}`);
    return;
  }

  if (!read(file).includes(marker)) {
    failures.push(`${file} missing ${label}`);
  }
}

function mustHaveRoute(key) {
  const routeFile = "src/wingman2/app/route-manifest.json";

  if (!exists(routeFile)) {
    failures.push(`Missing file: ${routeFile}`);
    return;
  }

  const routes = JSON.parse(read(routeFile));

  if (!routes.some((route) => route.key === key)) {
    failures.push(`Missing route key: ${key}`);
  }
}

[
  "dashboard",
  "projects",
  "discovery",
  "finder",
  "productFamilies",
  "productPitch",
  "compare",
  "templates",
  "videowall",
  "salesHelper",
  "callCards",
  "ingest",
  "proposal",
  "support",
].forEach(mustHaveRoute);

mustContain("src/wingman2/components/discovery/SourceDeviceCollator.tsx", 'data-wmg-step="application"', "Discovery Application step");
mustContain("src/wingman2/components/discovery/SourceDeviceCollator.tsx", "wmg-application-grid", "Discovery Application grid");
mustContain("src/wingman2/components/discovery/SourceDeviceCollator.tsx", "applications.map", "Discovery Application cards");
mustContain("src/wingman2/components/discovery/SourceDeviceCollator.tsx", "activeStep === 1", "Discovery Environment step");

mustContain("src/wingman2/pages/FinderPage.tsx", "technologyTypeOptions", "Finder Technology Type options");
mustContain("src/wingman2/pages/FinderPage.tsx", "Core hardware first", "Finder Core hardware default");
mustContain("src/wingman2/pages/FinderPage.tsx", "classifyTechnologyType", "Finder technology classifier");
mustContain("src/wingman2/pages/FinderPage.tsx", "hardwareTypePriority", "Finder hardware priority");

mustContain("src/wingman2/styles/entry.css", "PRODUCT-FINDER-SURFACE-HIERARCHY-START", "Finder surface hierarchy CSS");
mustContain("src/wingman2/styles/entry.css", "DISCOVERY-APPLICATION-STEP-RESTORE-START", "Discovery Application restore CSS");

mustContain("src/wingman2/data/proposalSafetyStandard.ts", "proposalSafetySections", "proposal safety sections");
mustContain("src/wingman2/data/proposalSafetyStandard.ts", "needs-validation", "proposal validation state");

if (failures.length > 0) {
  console.error("[wingman-ui-marker-check] Failed");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("[wingman-ui-marker-check] Passed.");