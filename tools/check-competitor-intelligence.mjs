import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function resolve(relativePath) {
  return path.resolve(root, relativePath);
}

function exists(relativePath) {
  return existsSync(resolve(relativePath));
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
  const vitestEntry = resolve("node_modules/vitest/vitest.mjs");

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
    label: "Competitor intelligence rules retained",
    relativePath: "src/wingman2/lib/competitorProductIntelligence.ts",
  },
  {
    label: "Competitor decision classifier retained",
    relativePath: "src/wingman2/lib/competitorCompareDecision.ts",
  },
];

const guardFailures = retainedGuards
  .filter((guard) => !exists(guard.relativePath))
  .map((guard) => `${guard.label}: missing ${guard.relativePath}`);

const suites = [
  {
    label: "Competitor intelligence evidence scenarios",
    files: ["src/wingman2/lib/competitorProductIntelligence.test.ts"],
  },
  {
    label: "Competitor decision outcomes",
    files: ["src/wingman2/lib/competitorCompareDecision.test.ts"],
  },
];

const suiteResults = suites.map((suite) => ({
  ...suite,
  result: runVitest(suite.files),
}));

const failedSuites = suiteResults.filter((suite) => suite.result.status === "fail");

if (guardFailures.length > 0 || failedSuites.length > 0) {
  console.error("[competitor-intelligence] Check failed:");

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

console.log("[competitor-intelligence] Marker guards retained only for core file presence.");
console.log("[competitor-intelligence] Behavioural coverage passed for normalized competitor evidence, missing-fact warnings, controller no-match handling, and audit task output.");
