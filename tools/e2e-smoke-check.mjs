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
 * The run also asks the dev-pair sync question (`check-dev-pair-sync.mjs`) while
 * the pair is still up: it signs in to the local dev workspace once with no
 * local projects and once over the starter examples the page seeds. That second
 * pass is the one a fresh workspace cannot show — demo data the browser only
 * ever held as sample text has to take the workspace copy rather than be
 * reported as a team member's change — so the regression is gated here instead
 * of waiting for a developer to notice it.
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
import { checkDevPairHealth } from "./check-dev-pair-health.mjs";
import { checkDevPairSync } from "./check-dev-pair-sync.mjs";
import { runBrowserSmokeSession } from "./lib/browser-smoke-session.mjs";
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

/**
 * Open a page and wait for it to be ready to drive, not for its network to fall
 * idle.
 *
 * `waitUntil: "networkidle"` asks whether the page has gone quiet, and this app
 * does not stay quiet on purpose: the shell batches analytics to the telemetry
 * endpoint every 30 s, a comparison re-runs the competitor lookup as soon as it
 * is made, and one slow module or asset holds a connection open past any window
 * a step can reasonably wait for. Whichever it is, the navigation then sat
 * behind a request the step never needed, so a slow run failed the compare step
 * before its first keystroke and the report read like a missing product rather
 * than a wait that asked the wrong question. A page is ready when the control
 * the next line uses is on it, which is what this waits for; whatever the page
 * is still fetching is asserted by the steps that depend on it.
 */
async function openPage(page, pathname, ready) {
  await page.goto(`${UI_BASE}${pathname}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await ready.waitFor({ state: "visible", timeout: 30_000 });
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
  const workspacePage = page.getByTestId("workflow-page-workspace");
  await openPage(page, "/wingman/profile", workspacePage);
  await workspacePage.click();
  const workspaceSection = page.locator('section[aria-labelledby="wingman-settings-workspace"]');
  await workspaceSection.waitFor({ state: "visible", timeout: 15_000 });

  // A session left behind by an earlier run (or by the developer's own sign-in)
  // hides the form, so sign it out first and let this run's credentials be the
  // ones exercised. The dev server issues no session of its own: the endpoint
  // is the real API's, proxied.
  const signOutButton = workspaceSection.getByTestId("workspace-sign-out");
  if (await signOutButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await signOutButton.click();
  }

  const signInButton = workspaceSection.getByTestId("workspace-sign-in");
  await signInButton.waitFor({ state: "visible", timeout: 10_000 });

  // The workspace section holds a Mode <select> then Email + Password inputs.
  const inputs = workspaceSection.locator("input.wm-input");
  await inputs.nth(0).fill(WORKSPACE_EMAIL);
  await inputs.nth(1).fill(WORKSPACE_PASSWORD);
  await signInButton.click();

  await workspaceSection
     .getByTestId("workspace-signed-in")
    .waitFor({ state: "visible", timeout: 20_000 });

  const cookies = await page.context().cookies(`${UI_BASE}/`);
  if (!cookies.some((cookie) => cookie.name === "wingman_session")) {
    throw new Error("[e2e-smoke] Settings sign-in succeeded in the UI but no wingman_session cookie was set on the UI origin.");
  }
  console.log("[e2e-smoke] Signed in via the settings form; wingman_session cookie active on the UI origin.");
}

async function saveDiscoveryProjectAndExportBrief(page) {
  // Save the discovery project through the focused room brief, then export
  //    the discovery brief as a real HTML download blob and content-check it.
  await page.getByTestId("discovery-save-brief").click();
  await page
    .getByTestId("discovery-save-status")
    .waitFor({ state: "visible", timeout: 10_000 });
  console.log("[e2e-smoke] Discovery project saved via the focused room brief.");

  const exportButton = page.getByTestId("discovery-export-brief");
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
  for (const expected of ["<!doctype html>", "Discovery Brief", "Meeting room / boardroom", "Room Completion Schedule", "cable distances, equipment positions and network/IT policy"]) {
    if (!briefHtml.includes(expected)) {
      throw new Error(`[e2e-smoke] Discovery brief HTML export is missing "${expected}".`);
    }
  }
  console.log(`[e2e-smoke] Discovery brief exported as HTML blob (${briefFileName}, ${briefHtml.length} chars) with captured answers.`);
}

/**
 * Start the walk from an empty browser store, without waiting for the page to
 * fall idle first.
 *
 * The old order was open → clear → reload: clearing had to happen on a page
 * that had finished booting, because the app writes its own first-run keys
 * while it mounts, so a clear during the boot could be undone by the very keys
 * it meant to remove. Waiting for that boot is what needed `networkidle`, and
 * this app is never idle by design — so the walk either waited on a request it
 * never needed or cleared a half-booted page and reloaded into an uncertain
 * store.
 *
 * Clearing from an init script asks the question in the right order instead:
 * the script runs before the document's own scripts, so the app's first read is
 * already the empty store and one navigation is enough. The session sentinel
 * means it happens once — later steps keep the state they create, so the sign-in
 * before this walk and the comparison after it are untouched.
 */
const STORAGE_RESET_SENTINEL = "wingman:e2e-smoke-storage-reset";

async function resetBrowserStoreBeforeBoot(page) {
  await page.addInitScript((sentinel) => {
    try {
      if (window.sessionStorage.getItem(sentinel) === "1") return;
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.sessionStorage.setItem(sentinel, "1");
    } catch {
      // Storage can be denied; the walk then runs on whatever the browser holds.
    }
  }, STORAGE_RESET_SENTINEL);
}

async function walkDiscovery(page) {
  await resetBrowserStoreBeforeBoot(page);
  // The guided landing is the room brief now, so that card is the ready
  // condition: it is what the walk reads next, and the market entry the expert
  // view adds is asserted below, so nothing here waits on a quiet network.
  await openPage(page, "/wingman/discovery", page.getByTestId("room-brief"));

  const marketEntry = page.getByTestId("discovery-market-entry");
  const viewSwitcher = page.locator(".wm-topbar-mode-toggle");
  const focusedView = viewSwitcher.getByTestId("ui-mode-focused");
  const expertView = viewSwitcher.getByTestId("ui-mode-expert");
  if (!(await viewSwitcher.isVisible().catch(() => false)) || !(await focusedView.isVisible().catch(() => false)) || !(await expertView.isVisible().catch(() => false))) {
    throw new Error("[e2e-smoke] Focused and Expert view switches are not both visible in the header.");
  }
  await expertView.click();
  await expertView.waitFor({ state: "visible", timeout: 3_000 });
  if ((await expertView.getAttribute("aria-pressed")) !== "true") {
    throw new Error("[e2e-smoke] Expert view did not activate from the header switch.");
  }
  await focusedView.click();
  if ((await focusedView.getAttribute("aria-pressed")) !== "true") {
    throw new Error("[e2e-smoke] Focused view did not activate from the header switch.");
  }

  await expertView.click();
  const corporateButton = marketEntry.getByTestId("discovery-market-corporate");
  await corporateButton.waitFor({ state: "visible", timeout: 15_000 });
  await corporateButton.click();
  await marketEntry.getByTestId("discovery-environment-meeting").click();

  // Streamlined discovery flow: template + activity land on the essentials capture first.
  // "Room builder" in the capture tools row is the action that reveals the full builder region.
  const essentialCapture = page.getByTestId("discovery-essential-capture");
  await essentialCapture.waitFor({ state: "visible", timeout: 15_000 });
  await page.getByTestId("discovery-room-builder-toggle").click();

  const wizard = page.getByTestId("discovery-room-wizard");
  await wizard.waitFor({ state: "visible", timeout: 10_000 });
  let answered = 0;
  let completed = false;
  for (let i = 0; i < 80; i += 1) {
    const stage = await wizard.getAttribute("data-room-wizard-stage");
    if (stage === "equipment") {
      const buildLayout = wizard.getByTestId("discovery-build-layout");
      if (await buildLayout.isVisible().catch(() => false)) await buildLayout.click();
      await wizard.getByTestId("discovery-review-brief").click();
      continue;
    }

    if (stage === "review") {
      await saveDiscoveryProjectAndExportBrief(page);
      await wizard.getByTestId("discovery-find-products").click();
      completed = true;
      break;
    }

    const heading = wizard.locator("h2[data-discovery-question-id]");
    if (!(await heading.isVisible({ timeout: 2_000 }).catch(() => false))) {
      const bodyText = await page.locator("body").innerText().catch(() => "");
      throw new Error(`[e2e-smoke] Focused Discovery rendered no question at stage ${stage || "unknown"}. ${bodyText.slice(0, 2500)}`);
    }
    const questionId = await heading.getAttribute("data-discovery-question-id");
    const options = wizard.locator("button.wm-room-wizard-option");
    if (await options.count()) await options.first().click();
    if (answered === 0) {
      await page.getByTestId("discovery-detailed-toggle").click();
      const expertBuilder = page.getByTestId("discovery-expert-builder");
      await expertBuilder.waitFor({ state: "visible", timeout: 5_000 });
      if (!(await expertBuilder.locator(".wm-room-wizard-option[aria-pressed='true']").count())) {
        throw new Error("[e2e-smoke] Expert view did not retain the answer just entered in Focused Discovery.");
      }
      if (!(await expertBuilder.getByTestId("discovery-room-sections").isVisible())) {
        throw new Error("[e2e-smoke] Expert Discovery did not render its room design sections.");
      }
      await page.getByTestId("discovery-room-builder-toggle").click();
      await wizard.waitFor({ state: "visible", timeout: 5_000 });
      if (!(await wizard.locator("button.wm-room-wizard-option[aria-pressed='true']").count())) {
        throw new Error("[e2e-smoke] Focused view did not retain the answer entered before switching views.");
      }
    }
    const continueButton = wizard.getByTestId("discovery-continue");
    if (!(await continueButton.isVisible().catch(() => false))) {
      throw new Error(`[e2e-smoke] Focused Discovery question "${questionId}" has no Continue action.`);
    }
    await continueButton.click();
    answered += 1;
    await page.waitForFunction((previousId) => {
      const roomWizard = document.querySelector(".wm-room-wizard");
      return roomWizard?.getAttribute("data-room-wizard-stage") !== "questions"
        || roomWizard.querySelector("h2[data-discovery-question-id]")?.getAttribute("data-discovery-question-id") !== previousId;
    }, questionId, { timeout: 8_000 });
  }

  if (!completed) throw new Error(`[e2e-smoke] Focused Discovery did not reach its review action after ${answered} questions.`);
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
        `url=${page.url()}). ${bodyText.slice(0, 5000)}`,
    );
  }
  console.log(`[e2e-smoke] Discovery walked (${answered} answers) → ${page.url()}`);
}

async function runCompare(page) {
  const manufacturerInput = page.getByTestId("compare-manufacturer");
  const skuInput = page.getByTestId("compare-sku");
  // The compare form is the ready condition: it is what the next line types
  // into, and any lookup the page starts on its own is not something this step
  // should be waiting for.
  await openPage(page, "/wingman/compare", manufacturerInput);
  await manufacturerInput.fill("Crestron");
  await skuInput.fill("DM-NVX-350");

  // Exact known SKUs may auto-advance immediately; typed entries use the Compare button.
  const resultHeading = page.getByTestId("compare-result");
  if (!(await resultHeading.isVisible().catch(() => false))) {
    const compareButton = page.getByTestId("compare-submit");
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
  await page.getByTestId("compare-save-history").click();
  await page.getByTestId("compare-review-history").click();
  const historySection = page.locator('[aria-label="Saved comparison history"]');
  await historySection.waitFor({ state: "visible", timeout: 10_000 });
  await historySection.waitFor({ state: "visible", timeout: 8_000 });
  if (!(await historySection.innerText()).includes("DM-NVX-350")) throw new Error("Saved history lacks the selected competitor SKU");
  console.log("[e2e-smoke] Comparison saved to history via the Save comparison action (Crestron DM-NVX-350 snapshot visible).");

  // 4. Export the saved history as a CSV download blob and content-check it.
  const [csvDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 15_000 }),
    historySection.getByTestId("compare-export-history").click(),
  ]);
  const csvFileName = csvDownload.suggestedFilename();
  if (!/^wingman-.+-comparisons[.]csv$/.test(csvFileName)) {
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
      // The dev-pair check below reads the Projects chip after signing in to the
      // local workspace, and that chip can only report the backend when project
      // sync is on. `npm run dev` gets this from the developer's own `.env`,
      // which a CI checkout does not have, so the pair this harness boots is a
      // sync-disabled one unless the flag is passed here: the smoke run then
      // fails on a workspace it never enabled. `.env.example` ships the flag as
      // true, so this makes the booted pair match the documented dev default
      // rather than turning on something the app does not normally do.
      VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC: "true",
    },
    stdio: ["ignore", uiLogFd, uiLogFd],
    windowsHide: true,
  });
  // Vite's first dev-server boot (cold dependency pre-bundle) can take a while
  // on a clean CI checkout; give it a wider health window than the API.
  await waitForHealth(UI_BASE, "UI dev server", 90_000);

  await checkDevPairHealth(UI_BASE, API_BASE);
  await assert413ThroughProxy();

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });
  await runBrowserSmokeSession({ browser, dataDir, signIn: signInViaSettings, walkDiscovery, runCompare });

  // The starter-example merge runs on this pair so the gate costs no second
  // server boot: the check opens its own contexts and signs in as the local dev
  // workspace, which the workspace account above never touches.
  const { emptyScope, seededScope } = await checkDevPairSync({ uiBase: UI_BASE, apiBase: API_BASE });

  console.log(
    "[e2e-smoke] Settings sign-in, discovery project save, compare history save, HTML+CSV export blobs, and the 413 contract all verified end to end.",
  );
  console.log(
    `[e2e-smoke] Dev-pair sync verified: the Projects chip reported the workspace backend with no local projects and over ` +
    `${seededScope.samples} seeded starter examples, never a conflict ("${emptyScope.chip.text}").`,
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
