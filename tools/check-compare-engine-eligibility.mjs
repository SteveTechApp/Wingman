import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();

function resolve(relativePath) {
  return path.resolve(root, relativePath);
}

function exists(relativePath) {
  return existsSync(resolve(relativePath));
}

function read(relativePath) {
  return readFileSync(resolve(relativePath), "utf8");
}

function tail(output, lineCount = 10) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-lineCount)
    .join("\n");
}

function runVitest(files) {
  const vitestEntry = path.join(path.dirname(createRequire(import.meta.url).resolve("vitest/package.json")), "vitest.mjs");

  try {
    const output = execFileSync(process.execPath, [vitestEntry, "run", ...files], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });

    return { status: "pass", output };
  } catch (error) {
    return {
      status: "fail",
      output: [error.stdout, error.stderr, error.message].filter(Boolean).join("\n"),
    };
  }
}

const retainedGuards = [
  {
    label: "Eligibility engine file retained",
    relativePath: "src/wingman2/lib/compareEligibilityEngine.ts",
  },
  {
    label: "Compare page wiring retained",
    relativePath: "src/wingman2/pages/ComparePageNew.tsx",
    markers: ["applyCompareEligibilityRanking", "const curatedResult = applyKnownCompareProfileOverrides"],
  },
  {
    label: "Competitor spec registry retained",
    relativePath: "src/wingman2/lib/competitorSpecRegistry.ts",
  },
];

const guardFailures = [];

for (const guard of retainedGuards) {
  if (!exists(guard.relativePath)) {
    guardFailures.push(`${guard.label}: missing ${guard.relativePath}`);
    continue;
  }

  if (!guard.markers?.length) continue;

  const source = read(guard.relativePath);
  const missingMarkers = guard.markers.filter((marker) => !source.includes(marker));

  if (missingMarkers.length > 0) {
    guardFailures.push(`${guard.label}: missing ${missingMarkers.join(", ")}`);
  }
}

const suites = [
  {
    label: "Eligibility ranking scenarios",
    files: ["src/wingman2/lib/compareEligibilityEngine.test.ts"],
  },
  {
    label: "Runtime compare behaviour scenarios",
    files: ["src/wingman2/lib/competitorCompareBehaviour.test.ts"],
  },
  {
    label: "SKU normalization and structured profile handoff",
    files: ["src/wingman2/lib/compareSkuNormalization.test.ts"],
  },
];

const suiteResults = suites.map((suite) => ({
  ...suite,
  result: runVitest(suite.files),
}));

const failedSuites = suiteResults.filter((suite) => suite.result.status === "fail");

if (guardFailures.length > 0 || failedSuites.length > 0) {
  console.error("[compare-engine-eligibility] Check failed:");

  if (guardFailures.length > 0) {
    console.error("Retained guards to repair:");
    for (const failure of guardFailures) {
      console.error("- " + failure);
    }
  }

  if (failedSuites.length > 0) {
    console.error("Behavioural suites to repair:");
    for (const suite of failedSuites) {
      console.error("- " + suite.label);
      console.error(tail(suite.result.output));
    }
  }

  process.exit(1);
}

console.log("[compare-engine-eligibility] Marker guards retained only for file/wiring safety.");
console.log("[compare-engine-eligibility] Behavioural coverage passed for eligibility ranking, runtime compare behaviour, and structured SKU/profile handoff.");
