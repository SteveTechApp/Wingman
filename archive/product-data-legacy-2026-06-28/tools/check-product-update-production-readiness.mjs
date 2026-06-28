import fs from "node:fs";
import { spawnSync } from "node:child_process";

const requiredScripts = [
  "check:product-update-source-schema",
  "check:product-update-sources:strict",
  "product-update:all",
  "check:product-update-pipeline",
  "lifecycle:reconcile",
  "audit:story-coverage",
  "check:known-compare-profiles",
  "check:matrix-output-model",
  "check:wingman-scenarios"
];

function fail(message) {
  console.error(`[product-update:ready-for-production] ${message}`);
  process.exit(1);
}

function runNpmScript(script) {
  const npmCli = process.env.npm_execpath;

  const command = npmCli && fs.existsSync(npmCli)
    ? process.execPath
    : "npm";

  const args = npmCli && fs.existsSync(npmCli)
    ? [npmCli, "run", script]
    : ["run", script];

  console.log(`\n==> npm run ${script}`);

  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    fail(`npm run ${script} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`npm run ${script} failed with exit code ${result.status}.`);
  }
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const scripts = pkg.scripts ?? {};

const missingScripts = requiredScripts.filter((script) => !scripts[script]);

if (missingScripts.length > 0) {
  fail(`Missing required package scripts:\n- ${missingScripts.join("\n- ")}`);
}

for (const script of requiredScripts) {
  runNpmScript(script);
}

console.log("\n[product-update:ready-for-production] Product update sources and guards are production-ready.");
