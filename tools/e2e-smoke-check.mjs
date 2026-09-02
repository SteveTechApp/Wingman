/**
 * End-to-end smoke check: boots the REAL API server (competitor-lookup-server)
 * and the Vite dev UI on throwaway ports, then drives a real browser through
 * Discovery → Recommendations and the Compare workflow, and pins the 413
 * oversized-body contract through the UI→API proxy chain.
 *
 * Repeatable by design: every server uses an env-overridable port and a throwaway
 * data dir, and the whole run tears itself down (servers killed, dir removed)
 * whether it passes or fails. On failure the server logs are preserved so the
 * failure is diagnosable off the box.
 *
 * Run: npm run check:e2e-smoke
 * Ports: API 8892 / UI 4182 (distinct from the 413 test 8876, agents 8877,
 * contract check 8898, workflow check 8899, browser smoke 4177).
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const API_PORT = Number(process.env.E2E_SMOKE_API_PORT || 8892);
const UI_PORT = Number(process.env.E2E_SMOKE_UI_PORT || 4182);
const API_BASE = `http://127.0.0.1:${API_PORT}`;
const UI_BASE = `http://127.0.0.1:${UI_PORT}`;
// Default MAX_JSON_BODY_BYTES is 1 MiB; send 2 MiB to trip the 413 contract.
const OVERSIZED_BODY = JSON.stringify({ manufacturer: "Crestron", model: "x".repeat(2 * 1024 * 1024) });

// Discovery walk: current question heading text → the option label to click.
// Pinned to the six Basic-mode essential questions (discoveryQuestions.ts /
// BASIC_MODE_REQUIRED_IDS); single-select steps auto-advance on click, the two
// multi-select steps advance via Continue. Completion is the panel CTA
// "Next: find matching products" (DiscoveryCompletionPanel).
const QUESTION_TO_OPTION = {
  "What type of opportunity is this?": "Meeting room / boardroom",
  "What is the approximate room or system scale?": "Single large room",
  "How many source positions are likely?": "2-4 sources",
  "How many displays or outputs are needed?": "1 display / output",
  "How should the displays behave?": "Same content on all displays",
  "What camera, microphone or capture workflows are required?": "No camera or microphone requirements",
};

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-e2e-smoke-"));
const apiLogFd = fs.openSync(path.join(dataDir, "api.log"), "a");
const uiLogFd = fs.openSync(path.join(dataDir, "ui.log"), "a");

let apiChild = null;
let uiChild = null;

function stopWindowsPortListener(port) {
  if (process.platform !== "win32") return;
  const command = [
    `$ids = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
    "| Select-Object -ExpandProperty OwningProcess -Unique;",
    "foreach ($id in $ids) {",
    "if ($id) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }",
    "}",
  ].join(" ");
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { stdio: "ignore" });
  } catch {
    // Best-effort cleanup for stale local listeners.
  }
}

async function waitForHealth(baseUrl, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`[e2e-smoke] ${label} did not become healthy in time (${lastError}). ` +
    `Logs kept at ${dataDir}/`);
}

async function postJson(baseUrl, requestPath, body, cookie = "") {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${baseUrl}${requestPath}`, { method: "POST", headers, body });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON bodies still leave status to assert on.
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie() };
}

async function assert413ThroughProxy() {
  // Sign up through the UI origin so the whole browser→vite→API chain is exercised.
  const signup = await postJson(
    UI_BASE,
    "/api/wingman/auth/signup",
    JSON.stringify({
      name: "E2E Smoke User",
      company: "E2E Co",
      email: "e2esmoke@example.com",
      password: "e2e-smoke-pass",
    }),
  );
  if (signup.status !== 200) {
    throw new Error(`[e2e-smoke] signup through the UI proxy failed with HTTP ${signup.status}.`);
  }
  const setCookie = signup.setCookie.find((header) => header.startsWith("wingman_session="));
  if (!setCookie) {
    throw new Error("[e2e-smoke] signup through the UI proxy did not issue a wingman_session cookie.");
  }
  const cookie = setCookie.split(";")[0];

  const proxyHealth = await fetch(`${UI_BASE}/api/health`);
  if (!proxyHealth.ok) {
    throw new Error(`[e2e-smoke] /api/health through the UI proxy returned HTTP ${proxyHealth.status}.`);
  }

  const lookup = await postJson(UI_BASE, "/api/competitor/liveLookup", OVERSIZED_BODY, cookie);
  const resolve = await postJson(UI_BASE, "/api/competitor/resolveMatch", OVERSIZED_BODY, cookie);
  const control = await postJson(
    UI_BASE,
    "/api/competitor/liveLookup",
    JSON.stringify({ manufacturer: "Extron" }),
    cookie,
  );

  if (lookup.status !== 413) {
    throw new Error(`[e2e-smoke] oversized liveLookup returned ${lookup.status}, expected 413 (${JSON.stringify(lookup.json).slice(0, 160)}).`);
  }
  if (resolve.status !== 413) {
    throw new Error(`[e2e-smoke] oversized resolveMatch returned ${resolve.status}, expected 413 (${JSON.stringify(resolve.json).slice(0, 160)}).`);
  }
  if (control.status === 413) {
    throw new Error(`[e2e-smoke] small-body liveLookup incorrectly returned 413 — the contract is over-broad.`);
  }
  console.log("[e2e-smoke] 413 oversized-body contract verified through the UI→API proxy chain.");
  return cookie;
}

async function walkDiscovery(page) {
  await page.goto(`${UI_BASE}/wingman/discovery`, { waitUntil: "networkidle", timeout: 45_000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Guided mode defaults to Basic (pressed); pin it in case a prior session
  // left Expert selected in the sticky settings.
  const basicToggle = page.getByRole("button", { name: "Basic", exact: true });
  if (
    (await basicToggle.isVisible().catch(() => false)) &&
    (await basicToggle.getAttribute("aria-pressed")) !== "true"
  ) {
    await basicToggle.click();
    await page.waitForTimeout(300);
  }

  const optionButton = (label) =>
    page.locator("button.wm-discovery-option").filter({ hasText: label }).first();

  let answered = 0;
  for (let i = 0; i < 12; i += 1) {
    // Completion panel CTA appears once every essential question has an answer.
    const cta = page.getByRole("button", { name: "Next: find matching products", exact: true });
    if (await cta.isVisible({ timeout: 800 }).catch(() => false)) {
      await cta.click();
      break;
    }

    const heading = page.locator("main h2").first();
    if (!(await heading.isVisible({ timeout: 800 }).catch(() => false))) {
      throw new Error("[e2e-smoke] Discovery rendered neither a question nor the completion CTA.");
    }
    const questionText = ((await heading.textContent()) || "").trim();
    const label = QUESTION_TO_OPTION[questionText];
    if (!label) {
      throw new Error(`[e2e-smoke] Discovery walked into unexpected question "${questionText}".`);
    }

    const option = optionButton(label);
    if (!(await option.isVisible({ timeout: 2_000 }).catch(() => false))) {
      throw new Error(`[e2e-smoke] Option "${label}" for "${questionText}" did not render.`);
    }
    await option.click();
    answered += 1;
    await page.waitForTimeout(350);

    // Multi-select steps stay put after a click — advance via Continue.
    if (((await heading.textContent()) || "").trim() === questionText) {
      const cont = page.getByRole("button", { name: "Continue", exact: true });
      if (
        (await cont.isVisible({ timeout: 1_000 }).catch(() => false)) &&
        (await cont.isEnabled().catch(() => false))
      ) {
        await cont.click();
        await page.waitForTimeout(300);
      }
    }
  }

  let landed = false;
  try {
    await page.waitForURL("**/wingman/recommendations", { timeout: 15_000 });
    landed = true;
  } catch {
    // Fall through to the diagnostic below.
  }
  if (!landed) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    throw new Error(
      `[e2e-smoke] Discovery walk did not land on Recommendations (answered ${answered} questions; ` +
        `url=${page.url()}). ${bodyText.slice(0, 300)}`,
    );
  }
  console.log(`[e2e-smoke] Discovery walked (${answered} answers) → ${page.url()}`);
}

async function runCompare(page) {
  await page.goto(`${UI_BASE}/wingman/compare`, { waitUntil: "networkidle", timeout: 45_000 });

  const manufacturerInput = page.getByRole("combobox", { name: /^Manufacturer$/i });
  const skuInput = page.getByRole("combobox", { name: /^Competitor SKU$/i });
  await manufacturerInput.fill("Crestron");
  await skuInput.fill("DM-NVX-350");

  // Exact known SKUs may auto-advance immediately; typed entries use the Compare button.
  const resultHeading = page.getByRole("heading", { name: "Comparison result" });
  if (!(await resultHeading.isVisible().catch(() => false))) {
    const compareButton = page.getByRole("button", { name: "Compare", exact: true });
    if (await compareButton.isVisible().catch(() => false)) {
      await compareButton.click();
    }
  }

  await resultHeading.waitFor({ state: "visible", timeout: 20_000 });
  const cards = page.locator('[aria-label="Compare product cards"]');
  await cards.waitFor({ state: "visible", timeout: 20_000 });
  const competitorCard = cards.locator('[aria-label="Competitor product card"]');
  const wyrestormCard = cards.locator('[aria-label="WyreStorm product card"]');
  await competitorCard.waitFor({ state: "visible", timeout: 15_000 });
  await wyrestormCard.waitFor({ state: "visible", timeout: 15_000 });

  const competitorText = await competitorCard.innerText();
  const wyrestormText = await wyrestormCard.innerText();
  const bodyText = await page.locator("body").innerText();

  if (!competitorText.includes("DM-NVX-350")) {
    throw new Error("[e2e-smoke] Compare workflow did not retain the selected competitor SKU on the competitor card.");
  }
  if (bodyText.includes("Product data not loaded")) {
    throw new Error("[e2e-smoke] Compare workflow could not load product data.");
  }
  if (!/NHD-|NetworkHD|WyreStorm/i.test(wyrestormText)) {
    throw new Error("[e2e-smoke] Compare workflow did not render a sensible WyreStorm match on the primary product card.");
  }
  for (const blockedSku of ["APO-210-UC", "APO-SKY-MIC", "COM-MIC-HUB", "CAM-210-PTZ"]) {
    if (wyrestormText.includes(blockedSku)) {
      throw new Error(`[e2e-smoke] Compare workflow rendered blocked non-equivalent candidate ${blockedSku}.`);
    }
  }
  console.log("[e2e-smoke] Compare workflow rendered real match cards for Crestron DM-NVX-350.");
}

async function main() {
  console.log(`[e2e-smoke] Booting API on :${API_PORT} and UI on :${UI_PORT} (data dir ${dataDir}).`);

  apiChild = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      WINGMAN_UI_PORT: "3996",
      WINGMAN_DATA_DIR: dataDir,
      WINGMAN_STORAGE_MODE: "file",
    },
    stdio: ["ignore", apiLogFd, apiLogFd],
    windowsHide: true,
  });
  await waitForHealth(API_BASE, "API");

  uiChild = spawn(process.execPath, [path.join("node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(UI_PORT), "--strictPort"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      WINGMAN_UI_PORT: String(UI_PORT),
      VITE_WINGMAN_LOCAL_BACKEND_PORT: String(API_PORT),
    },
    stdio: ["ignore", uiLogFd, uiLogFd],
    windowsHide: true,
  });
  await waitForHealth(UI_BASE, "UI dev server");

  const sessionCookie = await assert413ThroughProxy();

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await context.addCookies([
      { name: "wingman_session", value: sessionCookie.split("=")[1], url: `${UI_BASE}/`, httpOnly: true },
    ]);
    const page = await context.newPage();

    await walkDiscovery(page);
    await runCompare(page);
  } finally {
    await browser.close().catch(() => {});
  }

  console.log("[e2e-smoke] Discovery, Compare, and 413 contract all verified end to end.");
}

main()
  .then(() => {
    fs.closeSync(apiLogFd);
    fs.closeSync(uiLogFd);
    fs.rmSync(dataDir, { recursive: true, force: true });
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(`[e2e-smoke] Server logs kept at ${path.join(dataDir, "api.log")} and ${path.join(dataDir, "ui.log")}.`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (uiChild) uiChild.kill("SIGTERM");
    if (apiChild) apiChild.kill("SIGTERM");
    stopWindowsPortListener(API_PORT);
    stopWindowsPortListener(UI_PORT);
  });