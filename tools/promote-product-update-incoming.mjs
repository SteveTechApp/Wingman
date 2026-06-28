import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const mappings = [
  {
    incoming: "data-imports/incoming/wyrestorm-catalogue-source.csv",
    target: "data-imports/wyrestorm-catalogue-current.csv"
  },
  {
    incoming: "data-imports/incoming/wyrestorm-lifecycle-source.csv",
    target: "data-imports/wyrestorm-lifecycle-current.csv"
  },
  {
    incoming: "data-imports/incoming/competitor-fingerprints-source.csv",
    target: "data-imports/competitor-fingerprints-current.csv"
  },
  {
    incoming: "data-imports/incoming/competitor-review-notes-source.csv",
    target: "data-imports/competitor-review-notes.csv"
  }
];

function fail(message) {
  console.error(`[product-update:promote-incoming] ${message}`);
  process.exit(1);
}

function run(command, args) {
  console.log(`\n==> ${command} ${args.join(" ")}`);

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
    fail(`${command} ${args.join(" ")} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "-")
    .replace("Z", "");
}

run("node", ["tools/check-product-update-incoming.mjs"]);

const missing = mappings.filter((mapping) => !fs.existsSync(mapping.incoming));

if (missing.length > 0) {
  fail(`Missing incoming source file(s):\n- ${missing.map((mapping) => mapping.incoming).join("\n- ")}`);
}

const stamp = timestamp();
const backupDir = path.join("data-imports", "backups", stamp);

fs.mkdirSync(backupDir, { recursive: true });

for (const mapping of mappings) {
  if (fs.existsSync(mapping.target)) {
    const backupPath = path.join(backupDir, path.basename(mapping.target));
    fs.copyFileSync(mapping.target, backupPath);
  }

  fs.copyFileSync(mapping.incoming, mapping.target);
  console.log(`[product-update:promote-incoming] Promoted ${mapping.incoming} -> ${mapping.target}`);
}

run("node", ["tools/check-product-update-source-schema.mjs"]);
run("node", ["tools/run-product-intelligence-update.mjs"]);

console.log(`\n[product-update:promote-incoming] Complete. Previous controlled CSVs backed up in ${backupDir}`);
