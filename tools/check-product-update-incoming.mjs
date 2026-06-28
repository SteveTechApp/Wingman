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
  console.error(`[product-update:check-incoming] ${message}`);
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
    throw new Error(`${command} ${args.join(" ")} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "-")
    .replace("Z", "");
}

const missingIncoming = mappings.filter((mapping) => !fs.existsSync(mapping.incoming));

if (missingIncoming.length > 0) {
  fail(`Missing incoming source file(s):\n- ${missingIncoming.map((mapping) => mapping.incoming).join("\n- ")}`);
}

const missingTargets = mappings.filter((mapping) => !fs.existsSync(mapping.target));

if (missingTargets.length > 0) {
  fail(`Missing controlled source file(s):\n- ${missingTargets.map((mapping) => mapping.target).join("\n- ")}`);
}

const tempDir = path.join("data-imports", ".incoming-preflight", timestamp());

fs.mkdirSync(tempDir, { recursive: true });

try {
  for (const mapping of mappings) {
    fs.copyFileSync(mapping.target, path.join(tempDir, path.basename(mapping.target)));
    fs.copyFileSync(mapping.incoming, mapping.target);
  }

  run("node", ["tools/check-product-update-source-schema.mjs"]);

  console.log("\n[product-update:check-incoming] Incoming source files passed schema preflight.");
} catch (error) {
  console.error(`\n[product-update:check-incoming] Incoming source preflight failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  for (const mapping of mappings) {
    const backupPath = path.join(tempDir, path.basename(mapping.target));

    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, mapping.target);
    }
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
