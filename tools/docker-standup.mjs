#!/usr/bin/env node
// Stand up the documented docker-compose deployment (nginx frontend + API
// backend) and smoke-validate the production-shaped request path: browser ->
// nginx:80 -> /api/ proxy -> backend:8787. This is the environment to rebuild
// against when validating dependency fixes, because it exercises the real
// images (clean `npm ci` inside Docker) rather than the local dev servers.
//
// The helper passes explicit ports to the tracked Compose file so
// the stack coexists with the dev UI/API that hold 3000/8787 on this machine.
//
// Usage:
//   node tools/docker-standup.mjs          # build, start, wait, smoke-check
//   node tools/docker-standup.mjs --down   # stop the stack
//   WINGMAN_UI_PORT=3100 WINGMAN_API_PORT=8788 node tools/docker-standup.mjs

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const UI_PORT = Number(process.env.WINGMAN_UI_PORT || 3100);
const API_PORT = Number(process.env.WINGMAN_API_PORT || 8788);
const READY_TIMEOUT_MS = Number(process.env.WINGMAN_DOCKER_READY_TIMEOUT_MS || 300_000);
const POLL_INTERVAL_MS = 5_000;
const composeFile = fileURLToPath(new URL("../docker-compose.yml", import.meta.url));
const composeEnv = { ...process.env, WINGMAN_UI_PORT: String(UI_PORT), WINGMAN_API_PORT: String(API_PORT) };
for (const port of [UI_PORT, API_PORT]) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Docker ports must be integers between 1 and 65535");
}
if (UI_PORT === API_PORT) throw new Error("Docker UI and API ports must differ");

function fail(message) {
  console.error(`[docker-standup] ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env: composeEnv, windowsHide: true, ...options });
  if (result.error) {
    if (result.error.code === "ENOENT") {
      fail(
        `${command} is not available on PATH. Install Docker Desktop (or another ` +
          `Docker runtime with the compose plugin), then re-run this script.`
      );
    }
    fail(`${command} failed to start: ${result.error.message}`);
  }
  return result.status ?? 1;
}

function dockerAvailable() {
  const probe = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (probe.error || probe.status !== 0) return false;
  const compose = spawnSync("docker", ["compose", "version"], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  return !compose.error && compose.status === 0;
}

async function get(url) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  return { status: response.status, text: await response.text() };
}

async function waitForEndpoint(label, url, accept) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastSeen = "no response";
  while (Date.now() < deadline) {
    try {
      const { status, text } = await get(url);
      if (accept(status, text)) {
        console.log(`[docker-standup] ${label} OK (${url} -> ${status})`);
        return true;
      }
      lastSeen = `status ${status}`;
    } catch (error) {
      lastSeen = error.cause?.code || error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  fail(`${label} did not become ready within ${READY_TIMEOUT_MS / 1000}s (last: ${lastSeen})`);
}

if (process.argv.includes("--down")) {
  const status = run("docker", ["compose", "-f", composeFile, "down"]);
  process.exit(status);
}

if (!dockerAvailable()) {
  fail(
    "Docker runtime not reachable. Install Docker Desktop and start it, then re-run. " +
      "Nothing was built or started."
  );
}

console.log("[docker-standup] building images and starting the stack (this compiles both images from a clean npm ci)...");
const upStatus = run("docker", ["compose", "-f", composeFile, "up", "-d", "--build"]);
if (upStatus !== 0) {
  fail(`docker compose up failed with exit code ${upStatus}`);
}

console.log("[docker-standup] waiting for the backend healthcheck...");
// Direct backend port: proves the API container is healthy on its own.
await waitForEndpoint("backend health", `http://127.0.0.1:${API_PORT}/api/product-intelligence/health`, (status) =>
  statusOk(status)
);
// Through nginx: proves the documented browser-facing path (SPA + /api/ proxy)
// works end to end, which the direct-port check alone cannot show.
await waitForEndpoint("frontend index", `http://127.0.0.1:${UI_PORT}/`, (status) => statusOk(status));
await waitForEndpoint("proxied /api/ready", `http://127.0.0.1:${UI_PORT}/api/ready`, (status) => statusOk(status));

const ps = spawnSync("docker", ["compose", "-f", composeFile, "ps"], { stdio: "inherit", env: composeEnv, windowsHide: true });
if (ps.error || ps.status !== 0) {
  fail("docker compose ps failed");
}

console.log(
  `[docker-standup] stack is up: UI http://localhost:${UI_PORT} (nginx), API http://localhost:${API_PORT} ` +
    `(also reachable as /api/ through the UI origin, as in production).`
);

function statusOk(status) {
  return status >= 200 && status < 300;
}
