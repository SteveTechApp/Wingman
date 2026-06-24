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
    label: "Compare page retained",
    relativePath: "src/wingman2/pages/ComparePageNew.tsx",
  },
  {
    label: "Compare controls retained",
    relativePath: "src/wingman2/components/compare/CompareControls.tsx",
  },
  {
    label: "Native selector avoidance retained",
    relativePath: "src/wingman2/components/compare/CompareControls.tsx",
    forbidden: ["<select", "<datalist"],
  },
];

const guardFailures = [];

for (const guard of retainedGuards) {
  if (!exists(guard.relativePath)) {
    guardFailures.push(`${guard.label}: missing ${guard.relativePath}`);
    continue;
  }

  const source = read(guard.relativePath);

  if (guard.forbidden?.length) {
    const presentForbidden = guard.forbidden.filter((marker) => source.includes(marker));

    if (presentForbidden.length > 0) {
      guardFailures.push(`${guard.label}: forbidden ${presentForbidden.join(", ")}`);
    }
  }
}

const suites = [
  {
    label: "Custom compare controls render path",
    files: ["src/wingman2/components/compare/CompareControls.test.tsx"],
  },
  {
    label: "Rendered compare workflow handoff",
    files: ["src/__tests__/compareWorkflowRendered.test.tsx"],
  },
  {
    label: "Brand-scoped SKU normalization",
    files: ["src/wingman2/lib/compareSkuNormalization.test.ts"],
  },
];

const suiteResults = suites.map((suite) => ({
  ...suite,
  result: runVitest(suite.files),
}));

const failedSuites = suiteResults.filter((suite) => suite.result.status === "fail");

if (guardFailures.length > 0 || failedSuites.length > 0) {
  console.error("[compare-typeahead-skus] Check failed:");

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

console.log("[compare-typeahead-skus] Marker guards retained only for file presence and native-control avoidance.");
console.log("[compare-typeahead-skus] Behavioural coverage passed for custom combobox controls, SKU suggestion selection, and compare workflow handoff.");
