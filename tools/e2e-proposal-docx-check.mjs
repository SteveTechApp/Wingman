/**
 * End-to-end proposal DOCX check: boots the REAL API server (file-mode,
 * throwaway data dir) and the Vite dev UI on distinct ports, drives a browser
 * through Discovery → Recommendations → the proposal wizard, exports the
 * formatted DOCX, and verifies the download is a real .docx (PK zip magic
 * bytes) — no manual session needed.
 *
 * Flow:
 *   1. Discovery: walk a small meeting-room scenario with no camera/mic need,
 *      audio by others, separate room dimensions, site conditions and measured
 *      signal routes; save the project and continue to Recommendations.
 *   2. Proposal: add the generated system, complete customer/delivery details
 *      and the post-install survey checks, then report unresolved checks.
 *   3. Export: require the actual export gate to pass, read the DOCX archive and
 *      confirm the room facts and equipment schedule survived with no pricing.
 *
 * Run: node tools/e2e-proposal-docx-check.mjs
 * Ports: API 8893 / UI 4183 (distinct from the e2e smoke 8892/4182,
 * contract 8898, agents 8877).
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import JSZip from "jszip";

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
  "What type of opportunity is this?": "Meeting room / boardroom",
  "What is the approximate room or system scale?": "Single small room",
  "How many source positions are likely?": "2-4 sources",
  "How many displays or outputs are needed?": "1 display / output",
  "How should the displays behave?": "Same content on all displays",
  "What camera, microphone or capture workflows are required?": "No camera or microphone requirements",
  "Which source profile best describes the room?": "Fixed sources plus user presentation",
  "Which of these sounds closest to what the customer needs?": "Standard / most economical",
  "Where should the room's sound come out?": "Audio system designed by others",
};
const ANSWER_BY_QUESTION_ID = {
  opportunity: "Meeting room / boardroom",
  scale: "Single small room",
  "uc-purpose": "No camera or microphone requirements",
  audio: "Audio system designed by others",
  "source-connection": "Fixed sources plus user presentation",
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
  await page.goto(`${UI_BASE}/wingman/discovery`, { waitUntil: "networkidle", timeout: 60_000 });
  const expertView = page.locator(".wm-topbar-mode-toggle").getByTestId("ui-mode-expert");
  await expertView.click();
  const marketEntry = page.getByTestId("discovery-market-entry");
  await marketEntry.getByTestId("discovery-market-corporate").click();
  await marketEntry.getByTestId("discovery-environment-meeting").click();
  await page.getByTestId("discovery-essential-capture").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByTestId("discovery-room-builder-toggle").click();
  const wizard = page.getByTestId("discovery-room-wizard");
  await wizard.waitFor({ state: "visible", timeout: 10_000 });

  let answered = 0;
  let completed = false;
  for (let i = 0; i < 80; i += 1) {
    const stage = await wizard.getAttribute("data-room-wizard-stage");
    if (stage === "equipment") {
      if (await wizard.getByTestId("discovery-build-layout").isVisible().catch(() => false)) {
        await wizard.getByTestId("discovery-build-layout").click();
      }
      for (const status of await wizard.locator("[aria-label^='Route length status']").all()) {
        await status.selectOption("confirmed");
      }
      for (const metres of await wizard.locator("[aria-label^='Route length metres']").all()) {
        await metres.fill("12");
      }
      for (const basis of await wizard.locator("[aria-label^='Route length basis']").all()) {
        await basis.fill("Measured along the agreed cable route during the site survey.");
      }
      await wizard.getByTestId("discovery-review-brief").click();
      continue;
    }
    if (stage === "review") {
      const save = wizard.getByTestId("discovery-save-brief");
      await save.click();
      await page.getByTestId("discovery-save-status").waitFor({ state: "visible", timeout: 10_000 });
      await wizard.getByTestId("discovery-find-products").click();
      completed = true;
      break;
    }

    const heading = wizard.locator("h2[data-discovery-question-id]");
    await heading.waitFor({ state: "visible", timeout: 8_000 });
    const id = await heading.getAttribute("data-discovery-question-id");
    const answer = ANSWER_BY_QUESTION_ID[id] || QUESTION_TO_OPTION[(await heading.innerText()).trim()];
    const options = wizard.locator("button.wm-room-wizard-option");
    let option = answer ? options.filter({ hasText: answer }).first() : options.first();
    if (!(await option.isVisible().catch(() => false))) option = options.first();
    if (await option.isVisible().catch(() => false)) {
      const optionText = (await option.innerText()).trim();
      if (answer && !optionText.includes(answer)) {
        throw new Error(`[proposal-e2e] Could not locate requested ${id} answer "${answer}"; first rendered option was "${optionText}".`);
      }
      await option.click();
      if (id === "uc-purpose" || id === "audio") {
        console.log(`[proposal-e2e] Selected ${id}: ${optionText.split("\n")[0]}.`);
      }
    }
    if (id === "scale") {
      for (const [field, value] of [["guided-room-length", "9"], ["guided-room-width", "7"], ["guided-room-height", "3.2"]]) {
        await wizard.locator(`#${field}`).fill(value);
      }
      const siteValues = {
        "site-overall-construction": "Reinforced concrete frame with masonry infill.",
        "site-room-structure": "Concrete slab and masonry walls; confirm fixing capacity on site.",
        "site-floor-type": "Raised access floor with removable tiles.",
        "site-ceiling-type": "Suspended acoustic tile ceiling below concrete slab.",
        "site-wall-construction": "Masonry display wall; fixing points to be verified.",
        "site-ceiling-construction": "Concrete soffit above accessible suspended ceiling.",
        "site-containment-type": "Existing cable tray and floor boxes; capacity to be checked.",
        "site-cable-route": "Table to display wall through floor boxes and ceiling void.",
        "site-power-rack": "Local rack cupboard with mains; outlet count and ventilation to be checked.",
        "site-lighting-acoustics": "Daylight from side windows; room echo to be checked.",
        "site-access-constraints": "Normal business hours access; confirm installation window.",
      };
      for (const [field, value] of Object.entries(siteValues)) await wizard.locator(`#${field}`).fill(value);
    }
    await wizard.getByTestId("discovery-continue").click();
    answered += 1;
    await page.waitForFunction((previousId) => {
      const node = document.querySelector(".wm-room-wizard");
      return node?.getAttribute("data-room-wizard-stage") !== "questions"
        || node.querySelector("h2[data-discovery-question-id]")?.getAttribute("data-discovery-question-id") !== previousId;
    }, id, { timeout: 8_000 });
  }
  if (!completed) throw new Error(`[proposal-e2e] Discovery did not reach review after ${answered} questions.`);
  await page.waitForURL("**/wingman/recommendations", { timeout: 20_000 });
  console.log(`[proposal-e2e] Completed current Discovery workflow (${answered} questions) and opened Recommendations.`);
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
  const buildTab = page.getByRole("tab").filter({ hasText: "Build" });
  if (!(await buildTab.isVisible({ timeout: 20_000 }).catch(() => false))) {
    const visibleText = (await page.locator("body").innerText().catch(() => "")).slice(0, 3000);
    throw new Error(`[proposal-e2e] Recommendations did not expose its Build stage. ${visibleText}`);
  }
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
  const designFacts = await page.evaluate(() => {
    try {
      const store = JSON.parse(localStorage.getItem("wingman-project-store-v1") || "{}");
      const active = (store.projects || []).find((item) => item.id === store.activeProjectId);
      const brief = active?.discoveryBrief;
      const room = brief?.roomModel ?? {};
      return {
        decision: room.decidedRoomType,
        opportunity: room.application,
        scale: room.scale,
        dimensions: room.roomDimensions,
        siteConditions: room.siteConditions,
        sourceProfile: room.sourceProfile,
        ucPurpose: room.unifiedCommsSummary,
        audioPath: room.audioPath,
        audioFeed: room.audioSignalPath,
        primaryDisplay: room.primaryDisplayArrangement,
        products: (active?.productSelections ?? []).map((item) => item.sku),
      };
    } catch { return null; }
  });
  console.log(`[proposal-e2e] Saved design facts: ${JSON.stringify(designFacts)}`);
  if (!designFacts?.dimensions?.includes("Length: 9 m") || !designFacts.dimensions.includes("Width: 7 m") || !designFacts.dimensions.includes("Height: 3.2 m")) {
    throw new Error(`[proposal-e2e] The saved Discovery record did not preserve separate room dimensions: ${designFacts?.dimensions || "missing"}.`);
  }
  if (Object.keys(designFacts.siteConditions || {}).length < 8) {
    throw new Error(`[proposal-e2e] The saved Discovery record lost the room/site conditions.`);
  }
  if (designFacts.audioPath !== "Audio system designed by others") {
    throw new Error(`[proposal-e2e] Audio-by-others did not survive the Discovery-to-project handoff: ${designFacts.audioPath || "missing"}.`);
  }
  if (!designFacts.audioFeed?.toLowerCase().includes("video switching")) {
    throw new Error(`[proposal-e2e] Audio-by-others handoff did not retain the required switching-feed question: ${designFacts.audioFeed || "missing"}.`);
  }
  if (!designFacts.decision?.toLowerCase().includes("huddle") || !designFacts.sourceProfile?.toLowerCase().includes("fixed sources plus user presentation")) {
    throw new Error(`[proposal-e2e] The saved room decision contradicts the captured small-room, mixed-source scenario: ${JSON.stringify({ decision: designFacts.decision, sourceProfile: designFacts.sourceProfile })}.`);
  }
}

function inputByLabel(page, labelText) {
  return page.locator("label.wm-proposal-field").filter({ hasText: labelText }).locator("input").first();
}

async function fillProposalTo100(page) {
  await addRecommendedSystem(page);

  await page.goto(`${UI_BASE}/wingman/proposal`, { waitUntil: "networkidle", timeout: 60_000 });

  // The wizard renders only for an active project.
  await page.locator("h1", { hasText: "Make the proposal yours." }).waitFor({ state: "visible", timeout: 15_000 });
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

  // Customer and project details complete the cover without introducing
  // commercial fields: Wingman generates the technical response and schedule.
  await page.getByRole("button", { name: "Customer and project" }).click();
  await inputByLabel(page, "Customer / organisation").fill("Acme Holdings Ltd");
  await inputByLabel(page, "Project name").fill("Boardroom AV system");
  await inputByLabel(page, "Proposal reference").fill("WQR-0912");
  await page.waitForTimeout(400);

  // Step 2 — Requirements review: ensure the executive summary is non-empty
  // (defaults pre-fill it from the Discovery summary; make sure it stuck).
  await page.getByRole("button", { name: /Requirements review/ }).click();
  const execSummary = page.locator("label.wm-proposal-field", { hasText: "Executive summary" }).locator("textarea");
  const execCurrent = (await execSummary.inputValue().catch(() => "")).trim();
  if (!execCurrent) {
    await execSummary.fill("Provide a reliable AV distribution system for the boardroom, sourced, configured and verified.");
    await page.waitForTimeout(400);
  }

  // Proposed solution: preserve the architecture and captured display intent.
  await page.getByRole("button", { name: /Proposed solution/ }).click();
  const proposeBox = page.locator("label.wm-proposal-field", { hasText: "Proposed solution" }).locator("textarea");
  if (!(await proposeBox.inputValue()).trim()) {
    await proposeBox.fill("Provide the captured room display system with a governed WyreStorm signal path and a documented equipment schedule.");
  }
  const architecture = page.locator("label.wm-proposal-field", { hasText: "Technical architecture" }).locator("textarea");
  if (!(await architecture.inputValue()).trim()) {
    await architecture.fill("The design follows the captured sources, display arrangement and room infrastructure. Verify open site conditions before installation.");
  }
  const scheduleRows = page.locator(".wm-proposal-equipment-schedule tbody tr");
  console.log(`[proposal-e2e] Unpriced equipment schedule contains ${await scheduleRows.count()} line item(s).`);
  await page.waitForTimeout(400);

  // Complete delivery scope and go directly to export. Completion percentage
  // is a summary; only a technical/export blocker should prevent the design.
  await page.getByRole("button", { name: "Scope and delivery" }).click();
  const firstEmptyTextarea = page.locator(".wm-proposal-step-card label.wm-proposal-field textarea").first();
  if (!(await firstEmptyTextarea.inputValue()).trim()) {
    await firstEmptyTextarea.fill("Confirm access, containment and final site dimensions before installation.");
  }
  await page.getByRole("button", { name: "Go to export" }).click();
  await page.waitForTimeout(500);

  const installChecks = page.getByTestId("survey-install-details").locator("input[type='checkbox']");
  for (const checkbox of await installChecks.all()) {
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
  const recordDependency = page.getByRole("button", { name: /Record .* as a documented dependency/ });
  let dependenciesRecorded = 0;
  while (await recordDependency.first().isVisible({ timeout: 500 }).catch(() => false)) {
    await recordDependency.first().click();
    dependenciesRecorded += 1;
    await page.waitForTimeout(200);
  }
  if (dependenciesRecorded) {
    console.log(`[proposal-e2e] Recorded ${dependenciesRecorded} unresolved system roles as documented dependencies for customer-safe scope.`);
  }

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
  console.log(`[proposal-e2e] Wizard design readiness: ${final}% [${await breakdown()}]`);
  if (gate.length) console.log(`[proposal-e2e] Open technical checks retained in the proposal: ${gate.join(" | ")}`);
}

async function exportAndVerifyDocx(page) {
  const exportButton = page.getByRole("button", { name: "Export formatted DOCX" });
  await exportButton.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(1_000);
  if (!(await exportButton.isEnabled())) {
    const validation = (await page.locator(".wm-proposal-validation-gate").innerText().catch(() => "No export validation panel rendered."));
    const survey = (await page.getByTestId("survey-install-details").innerText().catch(() => "No installation survey rendered."));
    const details = (await page.locator(".wm-proposal-final-grid").innerText().catch(() => ""));
    const designReview = (await page.locator(".wm-design-review__issues").innerText().catch(() => "No design review issues rendered."));
    throw new Error(`[proposal-e2e] DOCX export remains blocked after completing the scenario. Readiness: ${await page.locator(".wm-proposal-readiness strong").first().innerText()}. Validation: ${validation}. Design blockers: ${designReview}. Survey: ${survey}. Final review: ${details}`);
  }

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
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error(`[proposal-e2e] Exported DOCX is missing word/document.xml.`);
  const documentText = documentXml.replace(/<w:tab\b[^>]*\/>/g, " ").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  const documentTextLower = documentText.toLowerCase();
  for (const required of ["Acme Holdings Ltd", "Boardroom AV system", "Equipment schedule", "Length: 9 m", "Raised access floor", "Suspended acoustic tile ceiling", "Existing cable tray", "Audio system designed by others"]) {
    if (!documentTextLower.includes(required.toLowerCase())) {
      throw new Error(`[proposal-e2e] DOCX is valid but missing expected proposal content: ${required}.`);
    }
  }
  if (/Unit price|Subtotal|Tax total|Grand total|Currency/i.test(documentText)) {
    throw new Error("[proposal-e2e] Exported DOCX still contains a pricing field or total.");
  }
  console.log(`[proposal-e2e] Exported ${fileName} (${buffer.length} bytes), DOCX archive and proposal content verified; no pricing fields found.`);
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

  console.log("[proposal-e2e] Discovery produced an unpriced system proposal DOCX with captured room/site facts and an equipment schedule.");
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
