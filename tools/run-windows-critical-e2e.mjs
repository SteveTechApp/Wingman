#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_PORT = 8903;
const UI_PORT = 4193;
const baseURL = `http://127.0.0.1:${UI_PORT}`;
const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-windows-critical-"));

function ps(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function listeners(port) {
  const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -join ','`], { encoding: "utf8" }).trim();
  return output ? output.split(",").map(Number).filter(Number.isFinite) : [];
}
function stop(pid) {
  if (!pid) return;
  execFileSync("powershell.exe", ["-NoProfile", "-Command", `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`], { stdio: "ignore" });
}
async function waitFor(url, label) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch { /* server still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready at ${url}`);
}
function start(command, args, env, stdout, stderr, name) {
  const environment = Object.entries(env).map(([key, value]) => `$env:${key}=${ps(value)}`).join("; ");
  const argumentList = args.map(ps).join(",");
  const pidFile = path.join(runDir, `${name}.pid`);
  const script = `${environment}; $p=Start-Process -FilePath ${ps(command)} -ArgumentList @(${argumentList}) -WorkingDirectory ${ps(root)} -WindowStyle Hidden -RedirectStandardOutput ${ps(stdout)} -RedirectStandardError ${ps(stderr)} -PassThru; Set-Content -LiteralPath ${ps(pidFile)} -Value $p.Id; exit`;
  execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { stdio: "ignore" });
  return Number(fs.readFileSync(pidFile, "utf8").trim());
}

if (listeners(API_PORT).length || listeners(UI_PORT).length) {
  throw new Error(`Critical E2E ports must be free before launch (API ${API_PORT}, UI ${UI_PORT}).`);
}

let apiPid;
let uiPid;
let passed = false;
let cleanupError;
try {
  apiPid = start(process.execPath, ["server/competitor-lookup-server.mjs"], {
    PORT: API_PORT,
    WINGMAN_UI_PORT: UI_PORT,
    WINGMAN_DATA_DIR: path.join(runDir, "data"),
    WINGMAN_STORAGE_MODE: "file",
    WINGMAN_SESSION_COOKIE_SECURE: "false",
  }, path.join(runDir, "api.out.log"), path.join(runDir, "api.err.log"), "api");
  await waitFor(`http://127.0.0.1:${API_PORT}/api/health`, "API");
  uiPid = start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(UI_PORT), "--strictPort"], {
    WINGMAN_UI_PORT: UI_PORT,
    VITE_WINGMAN_LOCAL_BACKEND_PORT: API_PORT,
  }, path.join(runDir, "ui.out.log"), path.join(runDir, "ui.err.log"), "ui");
  await waitFor(baseURL, "UI");

  const requestedArgs = process.argv.slice(2);
  const visual = requestedArgs.includes("--visual");
  const offline = requestedArgs.includes("--offline");
  const responsive = requestedArgs.includes("--responsive");
  const forwardedArgs = requestedArgs.filter((arg) => !["--visual", "--offline", "--responsive"].includes(arg));
  const testArgs = visual
    ? ["e2e/visual-regression.spec.ts", "--project=chromium"]
    : offline
      ? ["e2e/offline-reconnect.spec.ts", "--project=chromium"]
      : responsive
        ? ["e2e/production-critical-workflows.spec.ts", "--project=windows-critical-tablet", "--project=windows-critical-mobile"]
        : ["e2e/production-critical-workflows.spec.ts", "--project=windows-critical-desktop", "--project=windows-critical-tablet", "--project=windows-critical-mobile"];
  const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...testArgs, "--retries=0", "--reporter=list,html", ...forwardedArgs], {
    cwd: root,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL, PLAYWRIGHT_HTML_REPORT: path.join(root, "playwright-report", visual ? "visual-regression" : offline ? "offline-reconnect" : "windows-critical"), PLAYWRIGHT_HTML_OPEN: "never" },
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`Playwright exited with status ${result.status ?? "unknown"}. Logs: ${runDir}`);
  passed = true;
} finally {
  stop(uiPid);
  stop(apiPid);
  if (listeners(API_PORT).length || listeners(UI_PORT).length) {
    cleanupError = new Error(`Critical E2E cleanup left a listener active. Logs: ${runDir}`);
  }
  if (passed) fs.rmSync(runDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
if (cleanupError) throw cleanupError;
