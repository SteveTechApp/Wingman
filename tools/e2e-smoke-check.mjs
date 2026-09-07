/**
 * End-to-end smoke check: boots the REAL API server (competitor-lookup-server)
 * and the Vite dev UI on throwaway ports, then drives a real browser through
 * Discovery → Recommendations and the Compare workflow, and pins the 413
 * oversized-body contract through the UI→API proxy chain.
 *
 * The browser run covers four user flows end to end, no manual session needed:
 *   1. Sign in via the workspace settings form (Profile page) - the session
 *      cookie flows through the UI→API proxy exactly like a real user's. (In
 *      DEV the loopback local-session fallback pre-signs a synthetic admin;
 *      the smoke signs that out first so the real form is exercised.)
 *   2. Save a discovery project - the completion panel's "Save to project"
 *      action, asserted via the panel's saved confirmation.
 *   3. Save a comparison to history - the results' "Save comparison" action,
 *      asserted via the "Saved comparison history" panel on the Compare page.
 *   4. Report/export blobs - the discovery brief is exported as an HTML
 *      download and the saved-comparison history as a CSV download; both
 *      files are read back and content-asserted (a real <a download> blob
 *      through the browser, not an API mock).
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

// Workspace account used for the settings-form sign-in. The 413 stage signs
// this account up through the UI proxy first; the browser then signs in with
// the same credentials through the Profile page form.
const WORKSPACE_EMAIL = "e2esmoke@example.com";
const WORKSPACE_PASSWORD = "e2e-smoke-pass";

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

async function signInViaSettings(page) {
  // 1. Sign in through the workspace settings form (Profile → Live-call
  //    recovery). The login request goes through the Vite proxy to the real
  //    API server and its Set-Cookie lands on the UI origin, exactly like a
  //    real user session - no cookie is injected for this flow.
  await page.goto(`${UI_BASE}/wingman/profile`, { waitUntil: "networkidle", timeout: 60_000 });
  const workspaceSection = page.locator('section[aria-labelledby="wingman-settings-workspace"]');
  await workspaceSection.waitFor({ state: "visible", timeout: 15_000 });

  // The Vite dev server installs a local-session fallback that answers the
  // session endpoint with a synthetic "Local Wingman Admin" (DEV + loopback
  // only, src/wingman2/utils/installWingmanLocalSessionFallback.ts). The
  // Profile page therefore opens already "signed in" - sign that session out
  // first so the real Email/Password form is revealed and exercised.
  const signOutButton = workspaceSection.getByRole("button", { name: "Sign out", exact: true });
  if (await signOutButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await signOutButton.click();
  }

  const signInButton = workspaceSection.getByRole("button", { name: "Sign in", exact: true });
  await signInButton.waitFor({ state: "visible", timeout: 10_000 });

  // The workspace section holds a Mode <select> then Email + Password inputs.
  const inputs = workspaceSection.locator("input.wm-input");
  await inputs.nth(0).fill(WORKSPACE_EMAIL);
  await inputs.nth(1).fill(WORKSPACE_PASSWORD);
  await signInButton.click();

  await workspaceSection
    .getByText(new RegExp(`Signed in as ${WORKSPACE_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\.`))
    .waitFor({ state: "visible", timeout: 20_000 });

  const cookies = await page.context().cookies(`${UI_BASE}/`);
  if (!cookies.some((cookie) => cookie.name === "wingman_session")) {
    throw new Error("[e2e-smoke] Settings sign-in succeeded in the UI but no wingman_session cookie was set on the UI origin.");
  }
  console.log("[e2e-smoke] Signed in via the settings form; wingman_session cookie active on the UI origin.");
}

async function saveDiscoveryProjectAndExportBrief(page) {
  // 2. Save the discovery project through the completion panel, then 4. export
  //    the discovery brief as a real HTML download blob and content-check it.
  await page.getByRole("button", { name: /Save to project/ }).click();
  await page
    .getByText(/Discovery saved to your project\./)
    .waitFor({ state: "visible", timeout: 10_000 });
  console.log("[e2e-smoke] Discovery project saved via the completion panel.");

  const exportButton = page.locator('[data-testid="discovery-brief-export"]');
  await exportButton.waitFor({ state: "visible", timeout: 8_000 });
  const [briefDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 15_000 }),
    exportButton.click(),
  ]);
  const briefFileName = briefDownload.suggestedFilename();
  if (!briefFileName.endsWith(".discovery-brief.html")) {
    throw new Error(`[e2e-smoke] Discovery brief export produced unexpected file name "${briefFileName}".`);
  }
  const briefPath = await briefDownload.path();
  const briefHtml = fs.readFileSync(briefPath, "utf8");
  for (const expected of ["<!doctype html>", "Meeting room / boardroom"]) {
    if (!briefHtml.includes(expected)) {
      throw new Error(`[e2e-smoke] Discovery brief HTML export is missing "${expected}".`);
    }
  }
  console.log(`[e2e-smoke] Discovery brief exported as HTML blob (${briefFileName}, ${briefHtml.length} chars) with captured answers.`);
}

async function walkDiscovery(page) {
  await page.goto(`${UI_BASE}/wingman/discovery`, { waitUntil: "networkidle", timeout: 60_000 });
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
      await saveDiscoveryProjectAndExportBrief(page);
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
  await page.goto(`${UI_BASE}/wingman/compare`, { waitUntil: "networkidle", timeout: 60_000 });

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

  // 3. Save a comparison to history: the results' "Save comparison" action
  //    writes a saved-history run into the active project (mode
  //    "saved-history", so it shows in the "Saved comparison history" panel
  //    below). Open the panel if collapsed, then assert the DM-NVX-350
  //    snapshot row is present.
  await page.getByRole("button", { name: "Save comparison to history" }).click();
  const historySection = page.locator('section[aria-label="Saved comparison history"]');
  await historySection.waitFor({ state: "visible", timeout: 10_000 });
  const savedCount = historySection.getByText(/\d+ snapshots saved\./);
  if (!(await savedCount.isVisible({ timeout: 1_500 }).catch(() => false))) {
    await historySection.locator("summary").click();
    await savedCount.waitFor({ state: "visible", timeout: 8_000 });
  }
  await historySection.getByText(/DM-NVX-350/).first().waitFor({ state: "visible", timeout: 8_000 });
  console.log("[e2e-smoke] Comparison saved to history via the Save comparison action (Crestron DM-NVX-350 snapshot visible).");

  // 4. Export the saved history as a CSV download blob and content-check it.
  await historySection.getByRole("button", { name: "Export", exact: true }).click();
  const [csvDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 15_000 }),
    page.getByRole("menuitem", { name: "Export CSV" }).click(),
  ]);
  const csvFileName = csvDownload.suggestedFilename();
  if (csvFileName !== "wingman-saved-comparisons.csv") {
    throw new Error(`[e2e-smoke] Compare history export produced unexpected file name "${csvFileName}".`);
  }
  const csvPath = await csvDownload.path();
  const csvText = fs.readFileSync(csvPath, "utf8");
  for (const expected of ["\"Competitor SKU\"", "\"Crestron\"", "\"DM-NVX-350\""]) {
    if (!csvText.includes(expected)) {
      throw new Error(`[e2e-smoke] Saved-comparison CSV export is missing ${expected}.`);
    }
  }
  console.log(`[e2e-smoke] Saved-comparison history exported as CSV blob (${csvFileName}, ${csvText.length} chars) with the run row.`);
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
  // Vite's first dev-server boot (cold dependency pre-bundle) can take a while
  // on a clean CI checkout; give it a wider health window than the API.
  await waitForHealth(UI_BASE, "UI dev server", 90_000);

  await assert413ThroughProxy();

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    // No session cookie is injected: the settings-form sign-in establishes the
    // session through the real UI→API proxy path, exactly like a user.
    const page = await context.newPage();

    await signInViaSettings(page);
    await walkDiscovery(page);
    await runCompare(page);
  } finally {
    await browser.close().catch(() => {});
  }

  console.log(
    "[e2e-smoke] Settings sign-in, discovery project save, compare history save, HTML+CSV export blobs, and the 413 contract all verified end to end.",
  );
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