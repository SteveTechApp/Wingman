#!/usr/bin/env node
/**
 * Runs the proposal-export load benchmark (tools/proposal-export-load.test.mjs)
 * with a production-style iteration count (default 60, override with the
 * LOAD_ITERATIONS env var, e.g. LOAD_ITERATIONS=120).
 *
 * Vitest is spawned as a child process rather than invoked with an env prefix
 * in package.json because npm runs scripts through cmd.exe on Windows, where
 * `VAR=x cmd ...` is not valid syntax.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const iterations = process.env.LOAD_ITERATIONS || "60";

const result = spawnSync(
  process.execPath,
  [path.join("node_modules", "vitest", "dist", "cli.js"), "run", "tools/proposal-export-load.test.mjs"],
  { cwd: projectRoot, stdio: "inherit", env: { ...process.env, LOAD_ITERATIONS: iterations } },
);

process.exit(result.status === null ? 1 : result.status);
