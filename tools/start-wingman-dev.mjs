import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, "..");
const nodeCommand = process.execPath;
const backendEntry = path.join(repoRoot, "server", "competitor-lookup-server.mjs");
const viteEntry = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");
const children = new Set();
let stopping = false;

function start(label, entry, args = []) {
  const child = spawn(nodeCommand, [entry, ...args], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (stopping) return;

    const reason = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
    console.error(`[wingman-dev] ${label} stopped with ${reason}. Stopping the remaining service.`);
    stopAll(code ?? 1);
  });

  child.once("error", (error) => {
    console.error(`[wingman-dev] Could not start ${label}: ${error.message}`);
    stopAll(1);
  });
}

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.once("SIGINT", () => stopAll(0));
process.once("SIGTERM", () => stopAll(0));

console.log("[wingman-dev] Starting product/compare API on http://127.0.0.1:8787");
start("backend API", backendEntry);

console.log("[wingman-dev] Starting Wingman UI on http://127.0.0.1:3000");
start("frontend UI", viteEntry);
