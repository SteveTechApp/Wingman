import { spawnSync } from "node:child_process";
import fs from "node:fs";

function run(command, args, options = {}) {
  const { optional = false } = options;

  console.log(`\n==> ${command} ${args.join(" ")}`);

  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const result = spawnSync(executable, args, {
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
    const message = `${command} ${args.join(" ")} failed to start: ${result.error.message}`;

    if (optional) {
      console.warn(`[product-update:all] Optional check skipped: ${message}`);
      return false;
    }

    console.error(`[product-update:all] ${message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    const message = `${command} ${args.join(" ")} failed with exit code ${result.status}.`;

    if (optional) {
      console.warn(`[product-update:all] Optional check failed but did not block product update: ${message}`);
      return false;
    }

    console.error(`[product-update:all] ${message}`);
    process.exit(result.status ?? 1);
  }

  return true;
}

function hasScript(name) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  return Boolean(pkg.scripts?.[name]);
}

if (!hasScript("check:product-update-source-schema")) {
  console.error("[product-update:all] Missing required script: check:product-update-source-schema");
  process.exit(1);
}

const requiredSteps = [
  ["npm", ["run", "check:product-update-source-schema"]],
  ["node", ["tools/ingest-wyrestorm-catalogue.mjs"]],
  ["node", ["tools/ingest-competitor-fingerprints.mjs"]],
  ["node", ["tools/reconcile-product-updates.mjs"]],
  ["node", ["tools/audit-new-product-stories.mjs"]],
  ["node", ["tools/audit-competitor-coverage.mjs"]]
];

for (const [command, args] of requiredSteps) {
  run(command, args);
}

const optionalScripts = [
  "lifecycle:reconcile",
  "audit:story-coverage",
  "check:known-compare-profiles",
  "check:matrix-output-model",
  "check:wingman-scenarios"
];

const optionalResults = [];

for (const script of optionalScripts) {
  if (hasScript(script)) {
    optionalResults.push({
      script,
      passed: run("npm", ["run", script], { optional: true })
    });
  }
}

const failedOptional = optionalResults.filter((result) => !result.passed);

if (failedOptional.length > 0) {
  console.warn("\n[product-update:all] Optional audit warnings:");
  for (const result of failedOptional) {
    console.warn(`- ${result.script}`);
  }
}

console.log("\n[product-update:all] Complete. Review docs/product-intelligence-update-reconciliation.md before promoting data.");
