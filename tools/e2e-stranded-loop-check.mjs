/**
 * End-to-end stranded-defaults loop: boots the REAL API server (file-mode,
 * throwaway data dir) and the Vite dev UI on distinct ports, then drives a
 * browser through the full quick-start → strand → remove cycle and asserts the
 * notice clears and the stranded answer becomes unanswered again.
 *
 * Flow:
 *   1. Seed a lecture-hall quick start (Quick Start → Lecture hall → confirm
 *      the room profile). The seed pre-fills display-behaviour as
 *      "independent-routing-per-display" and the applied-defaults record is
 *      populated at the same moment.
 *   2. Walk the interview to the displays question and answer "1 display /
 *      output". The interview filters independent routing out of the behaviour
 *      options for a single display, so the pre-filled behaviour answer is
 *      now STRANDED (its option no longer exists).
 *   3. Assert the stranded-defaults notice appears in the summary card with
 *      the Remove action (only an untouched quick-start pre-fill offers it —
 *      a rep-typed answer must keep it hidden).
 *   4. Click "Remove stranded answers" and assert the notice clears AND the
 *      display-behaviour answer drops out of the captured brief (it becomes
 *      unanswered — the removal action deleted the hidden value).
 *
 * Repeatable by design: every server uses an env-overridable port and a
 * throwaway data dir, and the run tears itself down (servers killed, dir
 * removed) whether it passes or fails. The dev local-session fallback signs a
 * synthetic admin on loopback, so no manual sign-in is needed.
 *
 * Run: npm run check:e2e-stranded-loop
 * Ports: API 8894 / UI 4184 (distinct from smoke 8892/4182, docx 8893/4183,
 * contract 8898, agents 8877, 413 test 8876).
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

const API_PORT = Number(process.env.STRANDED_E2E_API_PORT || 8894);
const UI_PORT = Number(process.env.STRANDED_E2E_UI_PORT || 4184);
const API_BASE = `http://127.0.0.1:${API_PORT}`;
const UI_BASE = `http://127.0.0.1:${UI_PORT}`;

// Pinned to the Basic-mode question copy (discoveryQuestions.ts). The walker
// advances by Continue until it reaches the displays question, then answers
// one-display; the seeded display-behaviour answer becomes stranded.
const DISPLAYS_QUESTION = "How many displays or outputs are needed?";
const ONE_DISPLAY_OPTION = "1 display / output";
const STRANDED_LABEL = "Different content by display or zone";
const RECS_BLOCKED_LABEL = "Resolve stranded answers first";
const RECS_OPEN_LABEL = "Add to project";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-stranded-e2e-"));
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
  throw new Error(`[e2e-stranded] ${label} did not become healthy in time (${lastError}). Logs kept at ${dataDir}/`);
}

async function seedLectureHallQuickStart(page) {
  // Fresh session: no drafts, no sticky settings. The clear must run ON the
  // discovery origin — clearing before the first navigation throws
  // SecurityError on the about:blank document.
  await page.goto(`${UI_BASE}/wingman/discovery`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    // The Quick Start entry rail renders in unguided mode only (the app
    // defaults to guided for new users); pin it so the seed entry is present.
    localStorage.setItem("wingman-ui-mode-v1", "unguided");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // 1. Open the Quick Start entry rail.
  const quickStartEntry = page.locator("button.wm-qs-entry__button");
  await quickStartEntry.waitFor({ state: "visible", timeout: 15_000 });
  await quickStartEntry.click();

  // 2. Pick the Lecture hall room card.
  const lectureCard = page.locator("button.wm-qs-card").filter({ hasText: "Lecture hall" }).first();
  await lectureCard.waitFor({ state: "visible", timeout: 10_000 });
  await lectureCard.click();
  // The quick-start panel's own Continue (the interview's nav row also has a
  // Continue button, so scope to the panel's action row).
  const panelContinue = page
    .locator(".wm-qs__actions")
    .getByRole("button", { name: "Continue", exact: true });
  await panelContinue.click();

  // 3. Lecture hall's profile disagrees with the classroom standard profile
  //    (sources, displays, behaviour, signal, control) — the confirmation
  //    step asks which profile to start from. Choose the room's own profile;
  //    the applied-defaults record is populated from the seed.
  const roomProfileButton = page.getByRole("button", { name: "Use Lecture hall profile", exact: true });
  await roomProfileButton.waitFor({ state: "visible", timeout: 10_000 });
  await roomProfileButton.click();

  // 4. The seeded interview lands on step 1 (opportunity already answered).
  //    Advance by Continue until the displays question is the active step.
  const heading = page.locator("main h2").first();
  await heading.waitFor({ state: "visible", timeout: 10_000 });
  for (let i = 0; i < 12; i += 1) {
    const text = ((await heading.textContent()) || "").trim();
    if (text === DISPLAYS_QUESTION) return;
    const cont = page
      .locator(".wm-discovery-navigation-row")
      .getByRole("button", { name: "Continue", exact: true });
    await cont.click();
    await page.waitForTimeout(350);
  }
  throw new Error(`[e2e-stranded] Interview never reached "${DISPLAYS_QUESTION}" after seeding (last heading: ${((await heading.textContent()) || "").trim()}).`);
}

async function runStrandedLoop(page) {
  await seedLectureHallQuickStart(page);

  // 2. Change displays to one-display. Single-select steps auto-advance on
  //    click, landing on the display-behaviour step next.
  const oneDisplay = page
    .locator("button.wm-discovery-option")
    .filter({ hasText: ONE_DISPLAY_OPTION })
    .first();
  await oneDisplay.waitFor({ state: "visible", timeout: 10_000 });
  await oneDisplay.click();
  await page.waitForTimeout(500);

  // 3. The seeded independent-routing answer is now stranded: assert the
  //    notice appears in the summary card WITH the Remove action (untouched
  //    quick-start origin) and names the hidden default.
  const notice = page.locator(".wm-discovery-stranded-defaults");
  await notice.waitFor({ state: "visible", timeout: 10_000 });
  const noticeText = await notice.innerText();
  if (!noticeText.includes(STRANDED_LABEL)) {
    throw new Error(`[e2e-stranded] Stranded notice did not name the hidden default "${STRANDED_LABEL}". Notice text: ${noticeText.slice(0, 300)}`);
  }
  const removeButton = page.getByTestId("remove-stranded-answers");
  await removeButton.waitFor({ state: "visible", timeout: 8_000 });

  // Sanity: the display-behaviour step itself now offers no selected option
  // (the stranded value is not in the visible option list), and the captured
  // brief still lists the hidden answer.
  const behaviourHeading = page.locator("main h2").first();
  const behaviourText = ((await behaviourHeading.textContent()) || "").trim();
  if (behaviourText !== "How should the displays behave?") {
    throw new Error(`[e2e-stranded] Expected to land on display-behaviour after answering displays; landed on "${behaviourText}".`);
  }
  const summaryRow = page
    .locator(".wm-discovery-summary-row-copy")
    .filter({ hasText: "Display behaviour" })
    .first();
  await summaryRow.waitFor({ state: "visible", timeout: 8_000 });
  // The hidden option's label cannot resolve through the visible option list,
  // so the captured brief shows the raw value (independent-routing-per-display)
  // while the notice names the human label. Assert the raw value is present.
  const summaryRowText = (await summaryRow.innerText()) || "";
  if (!summaryRowText.includes("independent-routing-per-display")) {
    throw new Error(`[e2e-stranded] Captured brief does not list the stranded display-behaviour answer before removal. Row text: ${summaryRowText.slice(0, 160)}`);
  }

  // 4. Remove the stranded answers and assert the loop closed:
  //    - the notice disappears;
  //    - display-behaviour drops out of the captured brief (now unanswered).
  await removeButton.click();
  await page.waitForTimeout(500);

  if ((await notice.count()) !== 0) {
    throw new Error(`[e2e-stranded] Stranded notice did not clear after Remove stranded answers.`);
  }
  await summaryRow.waitFor({ state: "detached", timeout: 8_000 });
  const stillThere = await page
    .locator(".wm-discovery-summary-row-copy")
    .filter({ hasText: "Display behaviour" })
    .count();
  if (stillThere !== 0) {
    throw new Error(`[e2e-stranded] display-behaviour still appears in the captured brief after removal — the hidden answer was not deleted.`);
  }

  // Bonus assertion: the display-behaviour step shows no selected option now.
  const selectedOnStep = await page
    .locator(".wm-discovery-question-card button.wm-discovery-option[aria-pressed='true']")
    .count();
  if (selectedOnStep !== 0) {
    throw new Error(`[e2e-stranded] display-behaviour still has a selected option after removal (${selectedOnStep} pressed).`);
  }

  console.log("[e2e-stranded] Full loop proven: lecture-hall seed → one-display strands the pre-filled behaviour → Remove clears the notice and the answer is unanswered again.");
}

// Recommendations leg: with the stranded default still in place, walk to
// recommendations and prove product selection REFUSES to proceed — the Add
// buttons are disabled and relabeled "Resolve stranded answers first". Then
// remove the strand from the recommendations rail and assert selection is
// allowed again on the recalculated recommendation.
async function runRecommendationsRefusal(page) {
  // Re-seed and re-strand (the discovery leg above removed the strand). Then
  // keep the strand: navigate straight to recommendations via the nav.
  await page.goto(`${UI_BASE}/wingman/discovery`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => localStorage.setItem("wingman-ui-mode-v1", "unguided"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await seedLectureHallQuickStart(page);
  const oneDisplay = page
    .locator("button.wm-discovery-option")
    .filter({ hasText: ONE_DISPLAY_OPTION })
    .first();
  await oneDisplay.waitFor({ state: "visible", timeout: 10_000 });
  await oneDisplay.click();
  await page.waitForTimeout(500);
  const notice = page.locator(".wm-discovery-stranded-defaults");
  await notice.waitFor({ state: "visible", timeout: 10_000 });

  // Move to recommendations by URL — the in-app CTA is itself gated by the
  // discovery integrity check ("Resolve N discovery checks before
  // continuing"), so a direct navigation models the rep who reaches product
  // selection through a bookmark, the project card, or the browser back
  // button. The recommendations page must refuse on its own merits.
  await page.goto(`${UI_BASE}/wingman/recommendations`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1_500);

  // Open the Resolve stage where the stranded rail lives, then the Validate
  // stage where the product-selection buttons live.
  await page.getByRole("tab", { name: /Resolve/ }).click();
  await page.waitForTimeout(400);

  // The stranded notice is on the resolve rail.
  await notice.waitFor({ state: "visible", timeout: 10_000 });

  // Selection refusal: on the Validate stage every Add button is disabled and
  // relabeled, or no safe direction is offered at all. The decision engine
  // loads asynchronously, so poll until one of the settled states is
  // observable. The per-SKU selection buttons live inside the closed
  // "Advanced matches" <details>, so open it first.
  const settledSelectionState = async (timeoutMs = 30_000) => {
    // The per-SKU selection buttons live inside the "Advanced matches"
    // <details>. evaluateAll reads DOM nodes regardless of visibility, so
    // detection works even while the details is closed; only open it when we
    // need a visible, clickable assertion at the end. Note
    // getAttribute("open") returns "" (falsy) for an open details — use the
    // boolean `open` property — and never blind-click the summary (it
    // toggles). evaluateAll takes exactly ONE extra arg, so pass both labels
    // as an array.
    const details = page.locator("details.wm-rec-advanced-matches");
    const ensureDetailsOpen = async () => {
      if ((await details.count()) === 0) return;
      if (!(await details.first().evaluate((el) => el.open))) {
        await details.first().locator("summary").click().catch(() => {});
      }
    };
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const selectionButtons = await page
        .locator("details.wm-rec-advanced-matches button")
        .evaluateAll(
          (buttons, labels) =>
            buttons
              .map((button) => ({ text: (button.textContent || "").trim(), disabled: button.disabled }))
              .filter((button) => button.text === labels.open || button.text === labels.blocked),
          { open: RECS_OPEN_LABEL, blocked: RECS_BLOCKED_LABEL },
        );
      if (selectionButtons.length > 0) {
        if (selectionButtons.some((button) => button.text === RECS_OPEN_LABEL && !button.disabled)) return "open";
        if (selectionButtons.every((button) => button.disabled)) return "refused";
        return "clickable-blocked";
      }
      if (await page.getByText("No safe product direction yet.").isVisible().catch(() => false)) return "no-direction";
      await page.waitForTimeout(400);
    }
    return "timeout";
  };
  const assertSelectionRefused = async () => {
    await page.getByRole("tab", { name: /Validate/ }).click();
    const state = await settledSelectionState();
    if (state === "refused" || state === "no-direction") return;
    const stageContent = await page.locator(".wm-rec-stage-content").innerText().catch(() => "(no stage content)");
    const buttonDump = await page
      .locator("details.wm-rec-advanced-matches button")
      .evaluateAll((buttons) =>
        buttons.map((button) => ({ text: (button.textContent || "").trim().slice(0, 60), disabled: button.disabled })),
      );
    throw new Error(`[e2e-stranded] Recommendations page did not refuse product selection while a stranded default was present (settled state: ${state}). Stage content: ${stageContent.slice(0, 500)} | Buttons: ${JSON.stringify(buttonDump)}`);
  };
  await assertSelectionRefused();
  // Remove the strand from the recommendations resolve rail itself.
  await page.getByRole("tab", { name: /Resolve/ }).click();
  await page.waitForTimeout(400);
  const removeButton = page.getByTestId("remove-stranded-answers");
  await removeButton.waitFor({ state: "visible", timeout: 8_000 });
  await removeButton.click();

  // The notice clears and product selection becomes possible again: on the
  // recalculated Validate stage an Add-to-project button renders enabled.
  await notice.waitFor({ state: "detached", timeout: 15_000 });
  await page.getByRole("tab", { name: /Validate/ }).click();
  const stateAfter = await settledSelectionState(45_000);
  if (stateAfter !== "open") {
    const pageText = await page.locator("main.wm-recommendations-page").innerText();
    throw new Error(`[e2e-stranded] Product selection did not open up after the stranded answers were removed (settled state: ${stateAfter}). Page: ${pageText.slice(0, 600)}`);
  }
  const openAdd = page
    .locator("details.wm-rec-advanced-matches button")
    .filter({ hasText: RECS_OPEN_LABEL })
    .first();
  {
    const details = page.locator("details.wm-rec-advanced-matches");
    if ((await details.count()) > 0 && !(await details.first().evaluate((el) => el.open))) {
      // The card body nests another <details> (the section help popover), so
      // scope to the outer summary explicitly.
      await details.first().locator("> summary").first().click();
    }
  }
  await openAdd.waitFor({ state: "visible", timeout: 30_000 });
  if (!(await openAdd.isEnabled())) {
    throw new Error("[e2e-stranded] Add-to-project button rendered but stayed disabled after the stranded answers were removed.");
  }

  console.log(`[e2e-stranded] Recommendations refusal proven: selection refused while a stranded default was present, selection allowed after Remove from the resolve rail.`);
}

async function main() {
  console.log(`[e2e-stranded] Booting API on :${API_PORT} and UI on :${UI_PORT} (data dir ${dataDir}).`);

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
  await waitForHealth(UI_BASE, "UI dev server", 90_000);

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    await runStrandedLoop(page);
    await runRecommendationsRefusal(page);
  } finally {
    await browser.close().catch(() => {});
  }

  console.log("[e2e-stranded] Stranded-defaults remove loop verified end to end in a real browser.");
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
    console.error(`[e2e-stranded] Server logs kept at ${path.join(dataDir, "api.log")} and ${path.join(dataDir, "ui.log")}.`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (uiChild) uiChild.kill("SIGTERM");
    if (apiChild) apiChild.kill("SIGTERM");
    stopWindowsPortListener(API_PORT);
    stopWindowsPortListener(UI_PORT);
  });