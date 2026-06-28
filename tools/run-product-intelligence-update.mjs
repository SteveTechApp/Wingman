import { spawnSync } from "node:child_process";
import fs from "node:fs";

function run(command, args) {
  console.log(`\n==> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasScript(name) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  return Boolean(pkg.scripts?.[name]);
}

run("node", ["tools/ingest-wyrestorm-catalogue.mjs"]);
run("node", ["tools/ingest-competitor-fingerprints.mjs"]);
run("node", ["tools/reconcile-product-updates.mjs"]);
run("node", ["tools/audit-new-product-stories.mjs"]);
run("node", ["tools/audit-competitor-coverage.mjs"]);

for (const script of ["lifecycle:reconcile", "audit:story-coverage", "check:known-compare-profiles", "check:matrix-output-model", "check:wingman-scenarios"]) {
  if (hasScript(script)) {
    run("npm", ["run", script]);
  }
}

console.log("\n[product-update:all] Complete. Review docs/product-intelligence-update-reconciliation.md before promoting data.");
