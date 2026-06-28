import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const incomingDir = "data-imports/incoming";
const backupRoot = "data-imports/backups";

const mappings = [
  {
    source: "data-imports/wyrestorm-catalogue-current.csv",
    incoming: "data-imports/incoming/wyrestorm-catalogue-source.csv"
  },
  {
    source: "data-imports/wyrestorm-lifecycle-current.csv",
    incoming: "data-imports/incoming/wyrestorm-lifecycle-source.csv"
  },
  {
    source: "data-imports/competitor-fingerprints-current.csv",
    incoming: "data-imports/incoming/competitor-fingerprints-source.csv"
  },
  {
    source: "data-imports/competitor-review-notes.csv",
    incoming: "data-imports/incoming/competitor-review-notes-source.csv"
  }
];

function fail(message) {
  console.error(`[product-update:test-promote-incoming] ${message}`);
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

function listBackupDirs() {
  if (!fs.existsSync(backupRoot)) {
    return new Set();
  }

  return new Set(
    fs
      .readdirSync(backupRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(backupRoot, entry.name))
  );
}

function createIncomingFiles() {
  fs.mkdirSync(incomingDir, { recursive: true });

  for (const mapping of mappings) {
    if (!fs.existsSync(mapping.source)) {
      fail(`Missing controlled source file: ${mapping.source}`);
    }

    fs.copyFileSync(mapping.source, mapping.incoming);
    console.log(`[product-update:test-promote-incoming] Created ${mapping.incoming}`);
  }
}

function removeIncomingFiles() {
  for (const mapping of mappings) {
    if (fs.existsSync(mapping.incoming)) {
      fs.rmSync(mapping.incoming, { force: true });
      console.log(`[product-update:test-promote-incoming] Removed ${mapping.incoming}`);
    }
  }
}

const mode = process.argv.includes("--create-only") ? "create-only" : "test";

createIncomingFiles();

if (mode === "create-only") {
  console.log("\n[product-update:test-promote-incoming] Incoming test files created.");
  process.exit(0);
}

const backupsBefore = listBackupDirs();

try {
  run("node", ["tools/promote-product-update-incoming.mjs"]);
  run("node", ["tools/check-product-update-source-schema.mjs"]);
  run("node", ["tools/run-product-intelligence-update.mjs"]);
  run("node", ["tools/check-product-update-pipeline.mjs"]);
} finally {
  removeIncomingFiles();

  const backupsAfter = listBackupDirs();

  for (const backupDir of backupsAfter) {
    if (!backupsBefore.has(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
      console.log(`[product-update:test-promote-incoming] Removed test backup ${backupDir}`);
    }
  }
}

console.log("\n[product-update:test-promote-incoming] Incoming promotion test passed.");
