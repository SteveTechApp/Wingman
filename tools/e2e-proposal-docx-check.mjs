/**
 * End-to-end proposal DOCX check: boots the REAL API server (file-mode,
 * throwaway data dir) and the Vite dev UI on distinct ports, drives a browser
 * through Discovery → the proposal wizard to 100% completion, exports the
 * formatted DOCX, and verifies the download is a real .docx (PK zip magic
 * bytes) — no manual session needed.
 *
 * Flow:
 *   1. Discovery: walk the six Basic-mode essential questions, marking each
 *      answer "Confirm with customer" so the conversation rows are settled
 *      (an unconfirmed row would cap the product-readiness gate below 100),
 *      then save the project.
 *   2. Proposal: open the wizard, fill the scored narrative/customer fields,
 *      confirm the solution (continue without a final BOM — Discovery alone
 *      selects no products), and complete the final customer-safe review.
 *   3. Export: the wizard blocks DOCX until the score is 100; the snapshot
 *      of the wizard's own "Remaining items" list is printed, and after the
 *      export click the downloaded *.proposal.docx file is read back and its
 *      first bytes must be the ZIP magic 0x50 0x4B ("PK").
 *
 * Run: npm run check:proposal-docx
 * Ports: API 8893 / UI 4183 (distinct from the e2e smoke 8892/4182,
 * contract 8898, agents 8877).
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

const API_PORT = Number(process.env.PROPOSAL_E2E_API_PORT || 8893);
const UI_PORT = Number(process.env.PROPOSAL_E2E_UI_PORT || 4183);
const API_BASE = `http://127.0.0.1:${API_PORT}`;
const UI_BASE = `http://127.0.0.1:${UI_PORT}`;

// The six Basic-mode essential questions (discoveryQuestions.ts /
// BASIC_MODE_REQUIRED_IDS) with the option label to click for each.
const QUESTION_TO_OPTION = {
  // AV-over-IP route: its SMART_DEFAULTS and system slots produce a
  // chain-complete BOM (endpoints + controller). The meeting-room route
  // leaves dependency roles as TBC placeholders, which the export gate
  // correctly blocks — so this profile is what lets the wizard reach 100.
  "What type of opportunity is this?": "Distributed video (many rooms or long distances)",
  "What is the approximate room or system scale?": "Single large room",
  "How many source positions are likely?": "2-4 sources",
  "How many displays or outputs are needed?": "1 display / output",
  "How should the displays behave?": "Same content on all displays",
  "What camera, microphone or capture workflows are required?": "No camera or microphone requirements",
  // Expert questions that the forward-only walk can miss when they sit
  // behind the current index (source-connection) or after the route planner
  // (avoip-profile). Pinned here so the by-id completion pass cannot touch
  // the unknown/TBC options.
  "Which source profile best describes the room?": "Fixed sources plus user presentation",
  "Which of these sounds closest to what the customer needs?": "Standard / most economical",
};

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-proposal-e2e-"));
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
  throw new Error(`[proposal-e2e] ${label} did not become healthy in time (${lastError}). Logs kept at ${dataDir}/`);
}

async function walkDiscovery(page) {
  // Batch view: discovery renders every question of the current mode inline
  // (option chips carry the wm-discovery-option class). No ?interview=1 — the
  // single-question card view is a different surface.
  await page.goto(`${UI_BASE}/wingman/discovery`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const stepCard = page.locator("[data-discovery-step]").first();
  const firstUnpressed = stepCard.locator("button.wm-discovery-option:not([aria-pressed='true'])").first();
  const pinnedChip = (label) =>
    stepCard.locator("button.wm-discovery-option").filter({ hasText: label }).first();

  // Smart defaults auto-fill most answers in Basic mode, so chips may already
  // be pressed when a step is reached. Clicking a pressed chip DESELECTS it —
  // so only click unpressed chips and use the advance control to move on.
  const clickUnansweredChip = async (preferLabel) => {
    const option = preferLabel ? pinnedChip(preferLabel) : firstUnpressed;
    if (!(await option.isVisible({ timeout: 1_500 }).catch(() => false))) {
      // The "Room layout & cabling" step renders the route planner instead
      // of option chips. Each choice pick commits the evolving topology via
      // handleTopologyChange; walk the planner steps with first choices and
      // its own "Next question" until the answer lands.
      const planner = stepCard.locator('[aria-label="Signal distance check"]');
      if (await planner.isVisible({ timeout: 800 }).catch(() => false)) {
        // Unknown/TBC choices make the emitted topology content-less, which
        // DELETES the locations-connections answer — pick concrete choices only.
        const concreteChoices = planner.locator(
          "button.wm-route-choice:not([aria-pressed='true'])",
        ).filter({ hasText: /^(?!.*(?:Not yet known|unknown|TBC|to be confirmed))/i });
        // Pin a far distance band first: over-100 m makes the planner mark an
        // ip-av-vlan network path (topology's "Dedicated or governed AV-over-IP
        // VLAN indicated" summary), which is what proves the network gate.
        const farDistance = planner
          .locator('button.wm-route-choice')
          .filter({ hasText: "Different floor, building or 100 m+" })
          .first();
        const distanceFallback = planner
          .locator('button.wm-route-choice')
          .filter({ hasText: "Across a large room" })
          .first();
        for (const distanceOption of [farDistance, distanceFallback]) {
          if (
            (await distanceOption.isVisible({ timeout: 600 }).catch(() => false)) &&
            (await distanceOption.getAttribute("aria-pressed")) !== "true"
          ) {
            await distanceOption.click();
            await page.waitForTimeout(250);
            return true;
          }
        }
        const routeChoice = concreteChoices.first();
        if (await routeChoice.isVisible({ timeout: 800 }).catch(() => false)) {
          await routeChoice.click();
          await page.waitForTimeout(250);
          return true;
        }
        const next = planner.getByRole("button", { name: "Next question", exact: true });
        if (
          (await next.isVisible({ timeout: 800 }).catch(() => false)) &&
          (await next.isEnabled().catch(() => false))
        ) {
          await next.click();
          await page.waitForTimeout(250);
          return true;
        }
      }
      return false;
    }
    if ((await option.getAttribute("aria-pressed")) === "true") {
      return false;
    }
    await option.click();
    return true;
  };

  const advanceControls = async () => {
    const nextQuestion = page.getByRole("button", { name: /Next question/ }).first();
    if (await nextQuestion.isVisible({ timeout: 800 }).catch(() => false)) {
      await nextQuestion.click();
      return true;
    }
    // The nav row labels its final-step button "Complete discovery" and the
    // rest "Continue"; both live inside the step card.
    const navButton = stepCard.getByRole("button", { name: /^(Continue|Complete discovery)$/ }).first();
    if (
      (await navButton.isVisible({ timeout: 800 }).catch(() => false)) &&
      (await navButton.isEnabled().catch(() => false))
    ) {
      await navButton.click();
      return true;
    }
    const cont = page.getByRole("button", { name: "Continue", exact: true });
    if (
      (await cont.isVisible({ timeout: 800 }).catch(() => false)) &&
      (await cont.isEnabled().catch(() => false))
    ) {
      await cont.click();
      return true;
    }
    return false;
  };

  const answeredOnStep = async () => {
    const chips = await stepCard.locator("button.wm-discovery-option[aria-pressed='true']").count();
    const routes = await stepCard.locator("button.wm-route-choice[aria-pressed='true']").count();
    return chips + routes;
  };

  // Advance ONLY when the current step really has an answer. Early in the
  // flow a step's chips can lag a frame behind the heading; advancing then
  // silently skips the question (source-connection and avoip-profile were
  // skipped exactly this way).
  const advanceIfAnswered = async (questionText) => {
    if (((await page.locator("main h2").first().textContent().catch(() => "")) || "").trim() !== questionText) {
      return true;
    }
    if ((await answeredOnStep()) > 0) {
      await advanceControls();
    } else {
      await page.waitForTimeout(450);
    }
    return false;
  };

  let answered = 0;
  for (let i = 0; i < 50; i += 1) {
    const cta = page.getByRole("button", { name: "Next: find matching products", exact: true });
    if (await cta.isVisible({ timeout: 800 }).catch(() => false)) {
      break;
    }

    const heading = page.locator("main h2").first();
    if (!(await heading.isVisible({ timeout: 1_500 }).catch(() => false))) {
      await page.waitForTimeout(1000);
      continue;
    }
    const questionText = ((await heading.textContent()) || "").trim();
    const pinned = QUESTION_TO_OPTION[questionText];
    const clicked = await clickUnansweredChip(pinned);
    if (clicked) {
      answered += 1;
      await page.waitForTimeout(300);
    }
    await advanceIfAnswered(questionText);
  }
  if (answered === 0) {
    const counts = await page.evaluate(() => ({
      rows: document.querySelectorAll("[data-question-id]").length,
      chips: document.querySelectorAll("button.wm-discovery-option").length,
      disclosure: document.querySelectorAll("[data-wingman-progressive-disclosure]").length,
      disclosureHtml: (document.querySelector("[data-wingman-progressive-disclosure]")?.innerHTML ?? "").slice(0, 400),
    }));
    const bodyNow = (await page.locator("body").innerText().catch(() => "")).slice(0, 300);
    throw new Error(
      `[proposal-e2e] Discovery walk answered no questions (rows=${counts.rows}, chips=${counts.chips}, disclosure=${counts.disclosure}); disclosure HTML: ${counts.disclosureHtml} | Body: ${bodyNow}`,
    );
  }

  // Save the project (active for the wizard), then escalate Basic → Expert
  // via the completion panel's unlock CTA so the remaining questions appear
  // (smart defaults usually pre-fill them; the walk then confirms each row).
  await page.getByRole("button", { name: /Save to project/ }).click();
  await page
    .getByText(/Discovery saved to your project\./)
    .waitFor({ state: "visible", timeout: 10_000 });

  const unlock = page.locator('[data-testid="unlock-expert-cta"]');
  if (await unlock.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await unlock.click();
    const confirmSwitch = page.getByRole("button", { name: "Switch to Expert", exact: true });
    if (await confirmSwitch.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmSwitch.click();
    }
    await page.waitForTimeout(600);
  }

  // Expert remainder: walk any newly visible steps the same way; smart
  // defaults usually filled them already, so this mostly presses through.
  let expertAnswered = 0;
  for (let i = 0; i < 40; i += 1) {
    const cta = page.getByRole("button", { name: "Next: find matching products", exact: true });
    if (await cta.isVisible({ timeout: 800 }).catch(() => false)) {
      break;
    }

    const heading = page.locator("main h2").first();
    if (!(await heading.isVisible({ timeout: 1_500 }).catch(() => false))) {
      await page.waitForTimeout(1200);
      continue;
    }
    const questionText = ((await heading.textContent()) || "").trim();
    const pinned = QUESTION_TO_OPTION[questionText];
    const clicked = await clickUnansweredChip(pinned);
    if (clicked) {
      expertAnswered += 1;
      await page.waitForTimeout(300);
    }
    await advanceIfAnswered(questionText);
  }

  // By-id completion pass: the forward-only walk can strand questions that
  // sit behind the current index (source-connection) or after the route
  // planner (avoip-profile). The page's documented ?edit=<id> URL repositions
  // the interview at exactly that question (auto-switching to Expert), which
  // lets the pinned chip close the gap.
  const QUESTION_ID_BY_TEXT = {
    "Which source profile best describes the room?": "source-connection",
    "Which of these sounds closest to what the customer needs?": "avoip-profile",
  };
  for (const [question, id] of Object.entries(QUESTION_ID_BY_TEXT)) {
    const hasAnswer = await page.evaluate((answerId) => {
      try {
        const snap = JSON.parse(localStorage.getItem("wingman-discovery-snapshot-v3") || "null");
        return Boolean(snap?.state?.answers?.[answerId]);
      } catch {
        return true;
      }
    }, id);
    if (hasAnswer) continue;

    const dismissWarning = async () => {
      const cont = page.getByRole("button", { name: "Continue existing Discovery", exact: true });
      if (await cont.isVisible({ timeout: 2_500 }).catch(() => false)) {
        await cont.click();
        await page.waitForTimeout(400);
      }
    };

    await page.goto(`${UI_BASE}/wingman/discovery?edit=${id}`, { waitUntil: "networkidle", timeout: 60_000 });
    await dismissWarning();
    await page.waitForTimeout(900);
    const chip = stepCard
      .locator("button.wm-discovery-option")
      .filter({ hasText: QUESTION_TO_OPTION[question] })
      .first();
    if (await chip.isVisible({ timeout: 6_000 }).catch(() => false)) {
      if ((await chip.getAttribute("aria-pressed")) !== "true") {
        await chip.click();
        expertAnswered += 1;
        await page.waitForTimeout(400);
      }
    }
    // Return to the walk state (also persists the answer into the snapshot).
    await page.goto(`${UI_BASE}/wingman/discovery`, { waitUntil: "networkidle", timeout: 60_000 });
    await dismissWarning();
    await page.waitForTimeout(700);
  }

  // Complete via the CTA (idempotent if already done) and report the
  // page's own captured readout as ground truth.
  const ctaAfter = page.getByRole("button", { name: "Next: find matching products", exact: true });
  if (!(await ctaAfter.isVisible({ timeout: 2_000 }).catch(() => false))) {
    await page.waitForTimeout(1000);
    const stats = await page.evaluate(() => {
      const planner = document.querySelector("[data-discovery-step] [aria-label='Signal distance check']");
      return {
        pressed: document.querySelectorAll("[data-discovery-step] button.wm-discovery-option[aria-pressed='true']").length,
        unpressed: document.querySelectorAll("[data-discovery-step] button.wm-discovery-option:not([aria-pressed='true'])").length,
        step: document.querySelector("[data-discovery-step]")?.getAttribute("data-discovery-step"),
        completionCard: document.querySelector('[aria-label="Discovery completion"]')?.textContent?.trim(),
        plannerVisible: Boolean(planner),
        plannerText: planner ? (planner.textContent ?? "").slice(0, 300) : "",
        pressedChoices: planner ? planner.querySelectorAll("button.wm-route-choice[aria-pressed='true']").length : -1,
        unpressedChoices: planner ? planner.querySelectorAll("button.wm-route-choice:not([aria-pressed='true'])").length : -1,
        answeredIds: (() => {
          try {
            const snap = JSON.parse(localStorage.getItem("wingman-discovery-snapshot-v3") || "null");
            const answers = snap?.state?.answers ?? {};
            return Object.keys(answers).join(",");
          } catch {
            return "unreadable";
          }
        })(),
      };
    });
    const bodyNow = (await page.locator("body").innerText().catch(() => "")).slice(0, 1400);
    throw new Error(
      `[proposal-e2e] Discovery never showed the completion CTA (expertAnswered=${expertAnswered}, stats=${JSON.stringify(stats)}). Body: ${bodyNow}`,
    );
  }

  const saveProject = async () => {
    const saveButton = page.getByRole("button", { name: /Save to project/ });
    if (await saveButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await saveButton.click();
      await page
        .getByText(/Discovery saved to your project\./)
        .waitFor({ state: "visible", timeout: 10_000 });
    }
  };

  // Persist the full-expert brief, then confirm rows from the completion
  // panel's review trail; the per-row "Confirm with customer" toggles live
  // there. The confirmed flags ride the SECOND save below.
  await saveProject();
  const reviewButton = page.getByRole("button", { name: /Review answers/ });
  if (await reviewButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await reviewButton.click();
    await page.waitForTimeout(600);
  }
  let confirmed = 0;
  for (let i = 0; i < 40; i += 1) {
    const confirmButton = page.getByRole("button", { name: "Confirm with customer", exact: true }).first();
    if (!(await confirmButton.isVisible({ timeout: 1_200 }).catch(() => false))) {
      break;
    }
    await confirmButton.click();
    confirmed += 1;
    await page.waitForTimeout(250);
  }
  console.log(`[proposal-e2e] Confirmed ${confirmed} discovery rows from the review trail.`);
  await saveProject();
  const completionReadout = (await page
    .locator('[aria-label="Discovery completion"]')
    .innerText()
    .catch(() => "unavailable")).replace(/\n/g, " ");
  console.log(`[proposal-e2e] Discovery walked (${answered} basic + ${expertAnswered} expert answers, ${confirmed} rows confirmed; captured ${completionReadout}); project saved twice.`);
}

async function addRecommendedSystem(page) {
  // Land on Recommendations and add the coherent shortlist to the project so
  // the proposal wizard's technical release gate has real governed products
  // (with zero selections the gate fires "No core WyreStorm product is
  // selected" and caps the solution score at 0, unreachable via the wizard).
  await page.goto(`${UI_BASE}/wingman/recommendations`, { waitUntil: "networkidle", timeout: 60_000 });

  // The recommendations page is a five-step review rail; the proposed
  // system (slots, lead products, the "Add complete system" footer) renders
  // under the Build stage.
  const buildTab = page.getByRole("tab", { name: /Build/ });
  await buildTab.waitFor({ state: "visible", timeout: 20_000 });
  await buildTab.click();

  const addSystem = page.getByRole("button", { name: "Add complete system to project" });
  await addSystem.waitFor({ state: "visible", timeout: 15_000 });
  await addSystem.click();
  await page.waitForTimeout(800);

  // PROJECT_STORE_KEY = "wingman-project-store-v1" (projectStore.ts).
  const selectedCount = await page.evaluate(() => {
    try {
      const store = JSON.parse(localStorage.getItem("wingman-project-store-v1") || "{}");
      const active = (store.projects || []).find((item) => item.id === store.activeProjectId);
      return (active?.productSelections ?? []).length;
    } catch {
      return -1;
    }
  });
  if (selectedCount <= 0) {
    throw new Error(`[proposal-e2e] No product selections landed in the active project after the add action (count ${selectedCount}).`);
  }
  console.log(`[proposal-e2e] Recommended system added to the project (${selectedCount} selections).`);
}

function inputByLabel(page, labelText) {
  return page.locator("label.wm-proposal-field").filter({ hasText: labelText }).locator("input").first();
}

async function fillProposalTo100(page) {
  await addRecommendedSystem(page);

  await page.goto(`${UI_BASE}/wingman/proposal`, { waitUntil: "networkidle", timeout: 60_000 });

  // The wizard renders only for an active project.
  await page.locator("h1", { hasText: "Complete and export the customer proposal" }).waitFor({ state: "visible", timeout: 15_000 });
  const scoreText = async () => {
    const strong = page.locator(".wm-proposal-readiness strong").first();
    const raw = ((await strong.textContent()) || "").trim();
    return Number(raw.replace(/[^0-9]/g, ""));
  };
  const breakdown = async () =>
    (await page.locator(".wm-proposal-score-breakdown span").allTextContents())
      .map((text) => text.trim())
      .join(" | ");
  console.log(`[proposal-e2e] Wizard initial readiness: ${await scoreText()}% [${await breakdown()}]`);

  // Step 1 — Customer and project: the two scored fields that start empty.
  await page.getByRole("button", { name: "Customer and project" }).click();
  await inputByLabel(page, "Customer / organisation").fill("Acme Holdings Ltd");
  await inputByLabel(page, "Proposal reference").fill("WQR-0912");
  await page.waitForTimeout(400);

  // Step 2 — Requirements review: ensure the executive summary is non-empty
  // (defaults pre-fill it from the Discovery summary; make sure it stuck).
  await page.getByRole("button", { name: "Requirements review" }).click();
  const execSummary = page.locator("label.wm-proposal-field", { hasText: "Executive summary" }).locator("textarea");
  const execCurrent = (await execSummary.inputValue().catch(() => "")).trim();
  if (!execCurrent) {
    await execSummary.fill("Provide a reliable AV distribution system for the boardroom, sourced, configured and verified.");
    await page.waitForTimeout(400);
  }

  // Step 3 — Proposed solution: scored narrative field + the solution-review
  // confirmation. Discovery alone selects no products, so explicitly continue
  // without a final BOM to satisfy the commercial gate.
  await page.getByRole("button", { name: "Proposed solution" }).click();
  const proposeBox = page.locator("label.wm-proposal-field", { hasText: "Proposed solution" }).locator("textarea");
  await proposeBox.fill("Supply and configure a WyreStorm AV-over-IP routing solution with one display, local source inputs and unified control, delivered as a design/specification response pending the final equipment schedule.");
  const bomRows = page.locator(".wm-proposal-bom-table tbody tr");
  const bomCount = await bomRows.count();
  const bomSkus = [];
  console.log(`[proposal-e2e] Wizard shows ${bomCount} BOM row(s); setting nominal unit prices.`);
  for (let index = 0; index < bomCount; index += 1) {
    const row = bomRows.nth(index);
    const skuCell = ((await row.locator("td").nth(0).innerText()) || "").trim();
    bomSkus.push(skuCell);
    const price = row.getByRole("spinbutton", { name: `Unit price for ${skuCell}` });
    await price.fill("0.01");
  }
  console.log(`[proposal-e2e] BOM SKUs: ${bomSkus.join(", ")}.`);
  await page.getByText("I have reviewed the proposed architecture, product direction and equipment schedule for this proposal.").click();
  await page.waitForTimeout(400);

  // Step 5 — Review and export: final review confirmation, then read whatever
  // the wizard itself says is still missing and keep closing gaps.
  await page.getByRole("button", { name: "Review and export" }).click();
  await page.getByText("I have reviewed the proposal wording, scope, assumptions, validation items and customer-facing product statements.").click();
  await page.waitForTimeout(500);

  const remainingItems = async () => {
    const section = page.locator(".wm-proposal-final-grid section", { hasText: "Remaining items" }).first();
    const lis = section.locator("ul li");
    return (await lis.allTextContents()).map((text) => text.trim()).filter(Boolean);
  };
  const releaseGate = async () => {
    const section = page.locator(".wm-proposal-final-grid section", { hasText: "Technical release gate" }).first();
    const lis = section.locator("ul li");
    return (await lis.allTextContents()).map((text) => text.trim()).filter(Boolean);
  };
  const missing = await remainingItems();
  const gate = await releaseGate();
  if (missing.length) console.log(`[proposal-e2e] Wizard "Remaining items": ${missing.join(" | ")}`);
  if (gate.length) console.log(`[proposal-e2e] Technical release gate: ${gate.join(" | ")}`);

  const final = await scoreText();
  console.log(`[proposal-e2e] Wizard readiness after completion inputs: ${final}% [${await breakdown()}]`);
  if (final < 100) {
    throw new Error(`[proposal-e2e] Proposal readiness stuck at ${final}%. Items: ${missing.join("; ")} | Gate: ${gate.join("; ")}`);
  }
}

async function exportAndVerifyDocx(page) {
  // The export button is disabled until readiness is 100; wait for it to
  // become enabled, then capture the real download blob.
  const exportButton = page.getByRole("button", { name: "Export formatted DOCX" });
  await exportButton.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForFunction(async () => {
    const button = [...document.querySelectorAll("button")].find((el) => el.textContent.includes("Export formatted DOCX"));
    return button && !button.disabled;
  }, { timeout: 10_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    exportButton.click(),
  ]);

  const fileName = download.suggestedFilename();
  if (!fileName.endsWith(".proposal.docx")) {
    throw new Error(`[proposal-e2e] DOCX export produced unexpected file name "${fileName}".`);
  }
  const filePath = await download.path();
  const buffer = fs.readFileSync(filePath);
  const magic = buffer.subarray(0, 4);
  const isPkZip =
    buffer.length > 512 &&
    magic[0] === 0x50 && magic[1] === 0x4b && // "PK"
    magic[2] >= 0x03 && magic[2] <= 0x08; // zip entry/archive markers
  if (!isPkZip) {
    throw new Error(`[proposal-e2e] Exported "${fileName}" is not a valid .docx: first bytes ${[...magic].map((b) => b.toString(16).padStart(2, "0")).join(" ")}, length ${buffer.length}.`);
  }
  console.log(`[proposal-e2e] Exported ${fileName} (${buffer.length} bytes), PK zip magic verified (${[...magic].map((b) => `0x${b.toString(16).toUpperCase().padStart(2, "0")}`).join(" ")}).`);
}

async function main() {
  console.log(`[proposal-e2e] Booting API on :${API_PORT} and UI on :${UI_PORT} (data dir ${dataDir}).`);

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
    const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
    await walkDiscovery(page);
    await fillProposalTo100(page);
    await exportAndVerifyDocx(page);
  } finally {
    await browser.close().catch(() => {});
  }

  console.log("[proposal-e2e] 100% proposal wizard completed and the Export formatted DOCX path emitted a valid .docx (PK zip magic) end to end.");
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
    console.error(`[proposal-e2e] Server logs kept at ${path.join(dataDir, "api.log")} and ${path.join(dataDir, "ui.log")}.`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (uiChild) uiChild.kill("SIGTERM");
    if (apiChild) apiChild.kill("SIGTERM");
    stopWindowsPortListener(API_PORT);
    stopWindowsPortListener(UI_PORT);
  });