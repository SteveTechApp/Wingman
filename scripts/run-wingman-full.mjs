import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadWingmanRuntimeEnv } from "./wingman-runtime-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const mode = String(process.argv[2] || "dev").trim().toLowerCase() === "preview" ? "preview" : "dev";
const env = loadWingmanRuntimeEnv(rootDir, {
  WINGMAN_UI_PORT: process.env.WINGMAN_UI_PORT || (mode === "preview" ? "4173" : "5173"),
});

const backendScript = path.join(rootDir, "scripts", "start-wingman-backend.mjs");
const viteBin = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
const uiHost = env.WINGMAN_UI_HOST;
const uiPort = String(env.WINGMAN_UI_PORT);
const uiUrl = `http://${uiHost}:${uiPort}`;
const healthUrl = String(env.WINGMAN_API_HEALTH_URL);

if (!fs.existsSync(backendScript)) {
  console.error(`[wingman] Missing backend launcher: ${backendScript}`);
  process.exit(1);
}

if (!fs.existsSync(viteBin)) {
  console.error("[wingman] Vite is not installed yet. Run `npm install` first.");
  process.exit(1);
}

function waitForHealth(url, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if ((response.statusCode || 0) >= 200 && (response.statusCode || 0) < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.on("error", retry);
      request.setTimeout(2_000, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Backend health check timed out after ${Math.round(timeoutMs / 1000)}s.`));
        return;
      }
      setTimeout(attempt, 500);
    };

    attempt();
  });
}

const children = [];
let shuttingDown = false;

function stopChildren(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill("SIGTERM");
      } catch {
      }
    }
  }
  setTimeout(() => process.exit(exitCode), 150);
}

function spawnNode(scriptPath, args = []) {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    env,
    stdio: "inherit",
  });
  children.push(child);
  return child;
}

const backend = spawnNode(backendScript);
backend.once("exit", (code) => {
  if (!shuttingDown) {
    console.error(`[wingman] Backend exited early with code ${code ?? 0}.`);
    stopChildren(code ?? 1);
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stopChildren(0));
}

try {
  await waitForHealth(healthUrl);
} catch (error) {
  console.error(`[wingman] ${error instanceof Error ? error.message : "Backend failed to start."}`);
  stopChildren(1);
}

console.log(`[wingman] Backend ready at ${healthUrl}`);
console.log(`[wingman] Starting ${mode === "preview" ? "preview" : "dev"} UI at ${uiUrl}`);

const frontendArgs =
  mode === "preview"
    ? [viteBin, "preview", "--host", uiHost, "--port", uiPort, "--strictPort"]
    : [viteBin, "--host", uiHost, "--port", uiPort, "--strictPort"];
const frontend = spawnNode(frontendArgs[0], frontendArgs.slice(1));

frontend.once("exit", (code) => {
  stopChildren(code ?? 0);
});
