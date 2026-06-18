import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
    label: "Compare decision classifier retained",
    relativePath: "src/wingman2/lib/competitorCompareDecision.ts",
  },
  {
    label: "Competitor intelligence dependency retained",
    relativePath: "src/wingman2/lib/competitorCompareDecision.ts",
    markers: ["buildCompetitorDecisionEvidence(competitor)"],
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

const suite = runVitest(["src/wingman2/lib/competitorCompareDecision.test.ts"]);

if (guardFailures.length > 0 || suite.status === "fail") {
  console.error("[competitor-compare-decision] Check failed:");

  if (guardFailures.length > 0) {
    console.error("Retained guards to repair:");
    for (const failure of guardFailures) {
      console.error("- " + failure);
    }
  }

  if (suite.status === "fail") {
    console.error("Behavioural suite to repair:");
    console.error(tail(suite.output));
  }

  process.exit(1);
}

console.log("[competitor-compare-decision] Marker guards retained only for classifier existence and intelligence wiring.");
console.log("[competitor-compare-decision] Behavioural coverage passed for GOOD/PARTIAL/NO MATCH decision outcomes and rep-safe next actions.");
