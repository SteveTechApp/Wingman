import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.resolve(root, relativePath), "utf8");
}

function exists(relativePath) {
  return existsSync(path.resolve(root, relativePath));
}

function createMarkerGuard({ label, relativePath, markers = [] }) {
  if (!exists(relativePath)) {
    return {
      label,
      status: "fail",
      detail: `${relativePath} is missing.`,
    };
  }

  if (!markers.length) {
    return {
      label,
      status: "pass",
      detail: `${relativePath} exists.`,
    };
  }

  const source = read(relativePath);
  const missingMarkers = markers.filter((marker) => !source.includes(marker));

  if (missingMarkers.length > 0) {
    return {
      label,
      status: "fail",
      detail: `${relativePath} is missing ${missingMarkers.join(", ")}.`,
    };
  }

  return {
    label,
    status: "pass",
    detail: `${relativePath} keeps the required route or workflow wiring guard.`,
  };
}

function tail(output, lineCount = 8) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-lineCount)
    .join("\n");
}

function runVitestSuite(files) {
  const vitestEntry = path.join(path.dirname(createRequire(import.meta.url).resolve("vitest/package.json")), "vitest.mjs");

  try {
    const output = execFileSync(process.execPath, [vitestEntry, "run", ...files], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });

    return {
      status: "pass",
      output,
    };
  } catch (error) {
    return {
      status: "fail",
      output: [error.stdout, error.stderr, error.message].filter(Boolean).join("\n"),
    };
  }
}

const markerGuards = [
  createMarkerGuard({
    label: "Discovery route catalog guard retained",
    relativePath: "src/wingman2/app/route-manifest.json",
    markers: ['"key": "discovery"', '"/wingman/discovery"'],
  }),
  createMarkerGuard({
    label: "Compare route catalog guard retained",
    relativePath: "src/wingman2/app/route-manifest.json",
    markers: ['"key": "compare"', '"/wingman/compare"'],
  }),
  createMarkerGuard({
    label: "Product Pitch route catalog guard retained",
    relativePath: "src/wingman2/app/route-manifest.json",
    markers: ['"key": "productPitch"', '"/wingman/product-pitch"'],
  }),
  createMarkerGuard({
    label: "Workflow page imports retained",
    relativePath: "src/wingman2/app/routes.tsx",
    markers: ["../pages/DiscoveryPage", "../pages/ComparePageNew", "../pages/ProductPitchPage"],
  }),
  createMarkerGuard({
    label: "Priority workflow pages retained",
    relativePath: "src/wingman2/pages/DiscoveryPage.tsx",
  }),
  createMarkerGuard({
    label: "Priority workflow pages retained",
    relativePath: "src/wingman2/pages/ComparePageNew.tsx",
  }),
  createMarkerGuard({
    label: "Priority workflow pages retained",
    relativePath: "src/wingman2/pages/ProductPitchPage.tsx",
  }),
];

const replacedChecks = [
  {
    previous: "src/__tests__/finderProductFamilyRanking.test.ts",
    replacement: "Scenario-level ranking assertions for hospitality sports-bar routing.",
  },
  {
    previous: "src/__tests__/finderProductFamilyReason.test.ts",
    replacement: "Scenario-level ranking reason assertions for NDI camera workflow.",
  },
  {
    previous: "src/__tests__/productFamilyScoreSurfacing.test.ts",
    replacement: "Store persistence checks for proposal and recommendation product-family evidence.",
  },
  {
    previous: "src/__tests__/projectDetailProductFamilyReason.test.ts",
    replacement: "Rendered Project Detail coverage for product-family decision, blockers, and evidence trace.",
  },
  {
    previous: "src/__tests__/projectDetailRankingReasonRendered.test.tsx source check",
    replacement: "Rendered Project Detail page assertions only; source-marker assertions removed.",
  },
];

const behaviouralSuites = [
  {
    label: "Scenario coverage added: recommendation architecture scenarios",
    scenarios: [
      "hospitality / sports bar",
      "Teams boardroom / BYOD / USB",
      "video wall",
      "NetworkHD distributed AV",
      "NDI camera workflow",
    ],
    files: [
      "src/wingman2/lib/recommendationEvidence.priority3.test.ts",
      "src/__tests__/recommendationEvidence.test.ts",
    ],
  },
  {
    label: "Render coverage added: Discovery handoff",
    scenarios: ["Discovery saves structured hospitality evidence and Recommendations handoff data"],
    files: ["src/__tests__/discoveryWorkflowRendered.test.tsx"],
  },
  {
    label: "Render coverage added: Compare-to-Product-Pitch flow",
    scenarios: ["competitor lookup", "wrong-product avoidance", "quote-safe compare evidence"],
    files: ["src/__tests__/compareWorkflowRendered.test.tsx"],
  },
  {
    label: "Render coverage added: Product Pitch story and handoff",
    scenarios: ["NDI camera workflow", "product story output", "handoff evidence"],
    files: ["src/__tests__/productPitchWorkflowRendered.test.tsx"],
  },
  {
    label: "Render coverage added: Project evidence surfacing",
    scenarios: ["recommendation evidence", "missing information", "quote safety", "product-family decision"],
    files: [
      "src/__tests__/projectDetailRankingReasonRendered.test.tsx",
      "src/__tests__/productFamilyScoreSurfacing.test.ts",
    ],
  },
  {
    label: "Scenario coverage added: Finder and compare shortlist reasons",
    scenarios: ["hospitality routing lead", "NDI family reason", "compare reason visibility"],
    files: [
      "src/__tests__/finderProductFamilyRanking.test.ts",
      "src/__tests__/finderProductFamilyReason.test.ts",
      "src/__tests__/finderProductFamilyRenderedFlow.test.tsx",
      "src/__tests__/compareCandidateProductFamilyReason.test.tsx",
    ],
  },
];

console.log("[priority3-recommendation-audit] Wingman recommendation accuracy audit");
console.log("");

console.log("## Marker guard retained");
for (const guard of markerGuards) {
  const prefix = guard.status === "pass" ? "PASS" : "FAIL";
  console.log(`- ${prefix}: ${guard.label}`);
  console.log(`  ${guard.detail}`);
}

console.log("");
console.log("## Marker check replaced");
for (const item of replacedChecks) {
  console.log(`- ${item.previous}`);
  console.log(`  replaced by ${item.replacement}`);
}

console.log("");
console.log("## Scenario/render coverage added");

const suiteResults = behaviouralSuites.map((suite) => ({
  ...suite,
  result: runVitestSuite(suite.files),
}));

for (const suite of suiteResults) {
  const prefix = suite.result.status === "pass" ? "PASS" : "FAIL";
  console.log(`- ${prefix}: ${suite.label}`);
  console.log(`  Files: ${suite.files.join(", ")}`);
  console.log(`  Scenarios: ${suite.scenarios.join("; ")}`);

  if (suite.result.status === "fail") {
    console.log(`  Output:\n${tail(suite.result.output)}`);
  }
}

const failedGuards = markerGuards.filter((guard) => guard.status === "fail");
const failedSuites = suiteResults.filter((suite) => suite.result.status === "fail");

console.log("");
console.log("## Priority 3 conclusion");

if (failedGuards.length === 0 && failedSuites.length === 0) {
  console.log("Priority 3 now keeps only route/file guards as marker checks and proves Discovery, Compare, Product Pitch, Finder, Project Detail, and recommendation scenarios through behavioural coverage.");
} else {
  if (failedGuards.length > 0) {
    console.log("Marker guards to repair:");
    for (const guard of failedGuards) {
      console.log(`- ${guard.label}`);
    }
  }

  if (failedSuites.length > 0) {
    console.log("Behavioural suites to repair:");
    for (const suite of failedSuites) {
      console.log(`- ${suite.label}`);
    }
  }
}

if (failedGuards.length > 0 || failedSuites.length > 0) {
  process.exitCode = 1;
}
