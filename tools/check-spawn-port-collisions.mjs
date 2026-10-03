#!/usr/bin/env node
// Static guard: no two spawn-based files may claim the same fixed port.
//
// Vitest runs server e2e files in parallel workers, and each suite spawns a
// real server on a hard-coded port. When two suites picked the same port the
// result was a nondeterministic EADDRINUSE flake (see 74e3ab02, which freed
// the unread-tail suite's ports from the agents e2e collision). Tools that
// spawn servers (api-contract-check, e2e-smoke-check, ...) share the same
// registry: the repo convention is one global partition, documented in each
// file's "distinct from ..." comments.
//
// A CLAIM is a port that will actually be bound by something the file spawns
// or starts. Two gates keep claims honest:
//   1. The file must be spawn-capable (imports node:child_process, or binds
//      .listen( directly, or launches vite with --port). Files that merely
//      WRITE port literals - e.g. a test that embeds fixture sources - can
//      never bind anything, so their literals are not claims.
//   2. Only the extracted forms below count; comments are stripped first.
//
// Extracted forms:
//   - const PORT = 8877; / const NEG_PORT = 8878;   (port-named constant)
//   - const API_PORT = Number(process.env.X || 8892); (env-defaulted constant)
//   - server.listen(8898)                            (literal bind)
//   - vite preview --port 4177                       (CLI port flag)
//   - PORT: "8876"                                   (literal env passed to a spawn)
//
// Deliberately NOT claims:
//   - WINGMAN_UI_PORT values: the server reads them only to build the CORS
//     allow-origin string (competitor-lookup-server.mjs lines 88-91); nothing
//     binds them, so two suites sharing "3996" is harmless.
//   - comments (the reservation comments literally name every other port)
//   - listen(0) / ephemeral binds
//
// Reserved dev ports (AGENTS.md): npm run dev binds API 8787 + UI 3000. A
// test that hard-codes one of these collides with any running dev server.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const RESERVED_DEV_PORTS = new Map([
  [8787, "dev API (npm run dev / competitor-lookup-server default)"],
  [3000, "dev UI (npm run dev / vite default)"],
]);

// A file can only bind a port if it can spawn or listen. This gate keeps the
// checker's own fixtures (and any future test that embeds source samples)
// from phantom-claiming ports they merely mention.
const SPAWN_CAPABLE_RE =
  /child_process|\.listen\(\s*\d|--port(?:\s+|=)\d|vite (preview|dev)/;

const SELF_PREFIX = "check-spawn-port-collisions";

// ---------------------------------------------------------------------------
// Claim extraction (pure, fixture-testable)
// ---------------------------------------------------------------------------

export function extractClaims(source) {
  const claims = new Map(); // port -> [line numbers]
  const lines = source.split("\n");
  let inBlockComment = false;

  const add = (port, lineNo) => {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) return;
    if (!claims.has(port)) claims.set(port, []);
    claims.get(port).push(lineNo);
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    const start = line.indexOf("/*");
    if (start !== -1) {
      line = line.slice(0, start);
      if (!line.includes("*/")) inBlockComment = true;
    }
    // Strip line comments (claims never come from prose).
    line = line.replace(/\/\/.*$/, "");
    const n = i + 1;

    // const PORT = 8877 | const API_PORT = Number(process.env.X || 8892)
    // Case-insensitive, anchored so the identifier ENDS in "port"
    // (API_PORT, NEG_PORT, UI_PORT, port) rather than merely containing it.
    const constRe =
      /\b(?:const|let|var)\s+[A-Za-z0-9_]*port\b\s*=\s*(?:Number\(\s*process\.env\.[A-Za-z0-9_]+\s*\|\|\s*)?(\d{4,5})/gi;
    for (const m of line.matchAll(constRe)) add(Number(m[1]), n);

    // server.listen(8898)
    for (const m of line.matchAll(/\blisten\(\s*(\d{4,5})/g)) add(Number(m[1]), n);

    // --port 4177 / --port=4177
    for (const m of line.matchAll(/--port(?:\s+|=)(\d{4,5})/g)) add(Number(m[1]), n);

    // PORT: "8876" (literal env object entry; \bPORT keeps WINGMAN_UI_PORT out)
    for (const m of line.matchAll(/(?:^|[{,]\s*)PORT\s*:\s*"(\d{4,5})"/g)) add(Number(m[1]), n);
  }
  return claims;
}

// ---------------------------------------------------------------------------
// Discovery + analysis
// ---------------------------------------------------------------------------

function listFiles(dir, out, suffix) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // sandbox fixtures may not create every directory
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, out, suffix);
    } else if (entry.isFile() && (suffix ? entry.name.endsWith(suffix) : true)) {
      out.push(full);
    }
  }
}

export function collectClaims(repoRoot) {
  // Server test suites + every tools/*.mjs (test or tool; files without
  // claims contribute nothing). The checker's own pair is self-excluded:
  // its fixture sources embed the very literals being scanned for.
  const files = [];
  listFiles(path.join(repoRoot, "server"), files, ".test.mjs");
  listFiles(path.join(repoRoot, "tools"), files, ".mjs");
  const byFile = new Map(); // file -> { claims, reservedHits }
  for (const file of files) {
    const base = path.basename(file);
    if (base.startsWith(SELF_PREFIX)) continue;
    const source = readFileSync(file, "utf8");
    if (!SPAWN_CAPABLE_RE.test(source)) continue;
    const claims = extractClaims(source);
    if (claims.size === 0) continue;
    const reservedHits = [];
    for (const port of claims.keys()) {
      if (RESERVED_DEV_PORTS.has(port)) reservedHits.push(port);
    }
    byFile.set(path.relative(repoRoot, file).replace(/\\/g, "/"), { claims, reservedHits });
  }
  return byFile;
}

export function findPortCollisions(repoRoot) {
  const byFile = collectClaims(repoRoot);
  const portToFiles = new Map();
  for (const [file, { claims }] of byFile) {
    for (const port of claims.keys()) {
      if (!portToFiles.has(port)) portToFiles.set(port, []);
      portToFiles.get(port).push(file);
    }
  }
  const collisions = [];
  const reservedConflicts = [];
  for (const [port, owners] of portToFiles) {
    if (owners.length > 1) {
      collisions.push({ port, owners, lines: owners.map((f) => byFile.get(f).claims.get(port)) });
    }
  }
  for (const [file, { reservedHits }] of byFile) {
    for (const port of reservedHits) {
      reservedConflicts.push({ port, file, line: byFile.get(file).claims.get(port)[0], reason: RESERVED_DEV_PORTS.get(port) });
    }
  }
  return { byFile, collisions, reservedConflicts };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function main(repoRoot = process.cwd()) {
  const { byFile, collisions, reservedConflicts } = findPortCollisions(repoRoot);
  let failed = false;

  if (collisions.length > 0) {
    failed = true;
    console.log("[spawn-port-collisions] FAIL - fixed ports claimed by more than one file:");
    for (const { port, owners, lines } of collisions) {
      console.log(`  port ${port}:`);
      owners.forEach((f, i) => console.log(`    - ${f} (lines ${lines[i].join(", ")})`));
    }
  }
  if (reservedConflicts.length > 0) {
    failed = true;
    console.log("[spawn-port-collisions] FAIL - reserved dev ports claimed by test files:");
    for (const { port, file, line, reason } of reservedConflicts) {
      console.log(`  port ${port} (${reason}) claimed by ${file} (line ${line})`);
    }
  }

  if (failed) {
    console.log(
      "Remediation: pick a distinct fixed port, or switch the file to an ephemeral bind (listen(0) / port 0).\n" +
        "Keep the global registry in mind when choosing a new port: the other claimers are listed above.",
    );
    return 1;
  }

  console.log("[spawn-port-collisions] OK - fixed-port registry is collision-free");
  for (const [file, { claims }] of [...byFile.entries()].sort()) {
    console.log(`  ${file}: ${[...claims.keys()].sort((a, b) => a - b).join(", ")}`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  process.exitCode = main();
}
