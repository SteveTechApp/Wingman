import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readCsv } from "./product-update-utils.mjs";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const incomingRoot = path.join(root, "data-sources", "incoming");
const incomingCompetitors = path.join(incomingRoot, "competitors");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(root, checkOnly ? "data-sources/.incoming-preflight" : "archive/product-data-source-backups", stamp);

function fail(message) {
  throw new Error(message);
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`${process.execPath} ${args.join(" ")} failed with exit code ${result.status}.`);
}

function rows(file) {
  return readCsv(path.relative(root, file).replace(/\\/g, "/"));
}

function copyWithBackup(incoming, target, backups) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const backup = path.join(backupRoot, path.relative(root, target));
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  if (fs.existsSync(target)) fs.copyFileSync(target, backup);
  else fs.writeFileSync(`${backup}.missing`, "", "utf8");
  fs.copyFileSync(incoming, target);
  backups.push({ target, backup });
}

function restore(backups) {
  for (const { target, backup } of [...backups].reverse()) {
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, target);
    } else if (fs.existsSync(`${backup}.missing`) && fs.existsSync(target)) {
      fs.rmSync(target);
    }
  }
}

const wyrestormProducts = path.join(incomingRoot, "wyrestorm-products.csv");
const wyrestormLifecycle = path.join(incomingRoot, "wyrestorm-lifecycle.csv");
const hasProducts = fs.existsSync(wyrestormProducts);
const hasLifecycle = fs.existsSync(wyrestormLifecycle);
if (hasProducts !== hasLifecycle) {
  fail("WyreStorm incoming products and lifecycle files must be staged together.");
}

const candidates = [];
if (hasProducts) {
  if (rows(wyrestormProducts).length < 100 || rows(wyrestormLifecycle).length < 100) {
    fail("WyreStorm incoming files look incomplete; full replacements must contain at least 100 rows.");
  }
  candidates.push(
    { incoming: wyrestormProducts, target: path.join(root, "data-sources/wyrestorm/products.csv") },
    { incoming: wyrestormLifecycle, target: path.join(root, "data-sources/wyrestorm/lifecycle.csv") },
  );
}

if (fs.existsSync(incomingCompetitors)) {
  for (const entry of fs.readdirSync(incomingCompetitors, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".csv")) continue;
    const incoming = path.join(incomingCompetitors, entry.name);
    if (rows(incoming).length === 0) fail(`Incoming competitor file is empty: ${entry.name}`);
    candidates.push({
      incoming,
      target: path.join(root, "data-sources", "competitors", entry.name),
    });
  }
}

if (!candidates.length) {
  fail("No incoming product source updates are staged.");
}

const backups = [];
fs.mkdirSync(backupRoot, { recursive: true });
try {
  for (const candidate of candidates) copyWithBackup(candidate.incoming, candidate.target, backups);
  runNode(["tools/build-product-data-sources.mjs", "--check"]);
  if (checkOnly) {
    restore(backups);
    console.log("[product-source-incoming] Incoming sources passed preflight; active sources were restored.");
  } else {
    runNode(["tools/build-product-data-sources.mjs"]);
    runNode(["tools/generate-product-intelligence-index.mjs"]);
    runNode(["tools/sanitize-product-intelligence-index.mjs"]);
    console.log(`[product-source-incoming] Promoted ${candidates.length} source file(s). Previous versions archived in ${path.relative(root, backupRoot)}.`);
  }
} catch (error) {
  restore(backups);
  throw error;
} finally {
  if (checkOnly && fs.existsSync(path.join(root, "data-sources/.incoming-preflight"))) {
    fs.rmSync(path.join(root, "data-sources/.incoming-preflight"), { recursive: true, force: true });
  }
}
