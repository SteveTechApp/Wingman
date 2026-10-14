import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = Number(process.env.WINGMAN_BROWSER_SMOKE_PORT || 4177);
const previewCommand = process.platform === "win32" ? "cmd.exe" : "npx";
const previewArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", `npx vite preview --host 127.0.0.1 --port ${port}`]
  : ["vite", "preview", "--host", "127.0.0.1", "--port", String(port)];

function stopWindowsPortListener() {
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
    // Best-effort cleanup for stale local preview servers.
  }
}

async function waitForPreview() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/wingman/proposal`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  throw new Error("Vite preview did not become ready.");
}

async function assertPageText(page, pathname, expectedText) {
  await page.goto(`http://127.0.0.1:${port}${pathname}`, { waitUntil: "networkidle" });
  const text = await page.locator("body").innerText();
  if (!text.toLowerCase().includes(expectedText.toLowerCase())) {
    throw new Error(`Expected ${pathname} to contain "${expectedText}". Actual page: ${text.slice(0, 1600)}`);
  }
}

async function assertCompareWorkflow(page) {
  await page.goto(`http://127.0.0.1:${port}/wingman/compare`, { waitUntil: "networkidle" });

  // Minimum-card Compare is a single manufacturer + SKU form.
  // Both controls are datalist-backed inputs and expose the combobox role.
  const manufacturerInput = page.getByRole("combobox", { name: /^Manufacturer$/i });
  const skuInput = page.getByRole("combobox", { name: /^Competitor SKU$/i });

  await manufacturerInput.fill("Crestron");
  await skuInput.fill("DM-NVX-350");

  // Exact known SKUs may auto-advance immediately. If they do not, the same
  // form retains an explicit Compare submit path for typed/unknown entries.
  const resultHeading = page.getByRole("heading", { name: "Comparison result" });

  if (!(await resultHeading.isVisible().catch(() => false))) {
    const compareButton = page.getByRole("button", { name: "Compare", exact: true });

    if (await compareButton.isVisible().catch(() => false)) {
      await compareButton.click();
    }
  }

  await resultHeading.waitFor({ state: "visible", timeout: 15_000 });

  const cards = page.locator('[aria-label="Compare product cards"]');
  await cards.waitFor({ state: "visible", timeout: 15_000 });

  const competitorCard = cards.locator('[aria-label="Competitor product card"]');
  const wyrestormCard = cards.locator('[aria-label="WyreStorm product card"]');

  await competitorCard.waitFor({ state: "visible", timeout: 10_000 });
  await wyrestormCard.waitFor({ state: "visible", timeout: 10_000 });

  const competitorText = await competitorCard.innerText();
  const wyrestormText = await wyrestormCard.innerText();
  const bodyText = await page.locator("body").innerText();

  if (!competitorText.includes("DM-NVX-350")) {
    throw new Error("Compare workflow did not retain the selected competitor SKU on the competitor card.");
  }

  if (bodyText.includes("Product data not loaded")) {
    throw new Error("Compare workflow could not load product data.");
  }

  if (!/NHD-|NetworkHD|WyreStorm/i.test(wyrestormText)) {
    throw new Error("Compare workflow did not render a sensible WyreStorm match on the primary product card.");
  }

  for (const blockedSku of ["APO-210-UC", "APO-SKY-MIC", "COM-MIC-HUB", "CAM-210-PTZ"]) {
    if (wyrestormText.includes(blockedSku)) {
      throw new Error(`Compare workflow rendered blocked non-equivalent candidate ${blockedSku}.`);
    }
  }
}

stopWindowsPortListener();

const preview = spawn(previewCommand, previewArgs, {
  cwd: projectRoot,
  env: {
    ...process.env,
    WINGMAN_UI_PORT: String(port),
  },
  stdio: "ignore",
  windowsHide: true,
});

let browser;
try {
  await waitForPreview();
  browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  page.on("pageerror", error => console.error(error.stack));
  await assertPageText(page, "/wingman/ingest", "Decode the incoming request");
  await assertPageText(page, "/wingman/compare", "Competitor Compare");
  await assertCompareWorkflow(page);

  // A fresh browser context has no active project, so the response builder
  // prompts the salesperson to open one before preparing customer output.
  await assertPageText(page, "/wingman/proposal", "Open a project before building a response");

  // Was "Editable requirements". That string is still in ProjectDetailPage.tsx
  // (check:workflow asserts it) but renders only once requirement records
  // exist, so it is not reachable from a cold start. The project name proves
  // what this step is really for: the route resolves and seeded project data
  // loads.
  await assertPageText(page, "/wingman/projects/northbridge-meeting-room-refresh", "Northbridge Meeting Room Refresh");

  await assertPageText(page, "/wingman/videowall", "One wall. The right signal path.");
  await page.getByLabel("Columns", { exact: true }).fill("3");
  await page.getByLabel("Rows", { exact: true }).fill("3");
  if (!(await page.getByRole("button", { name: "Save to project", exact: true }).isDisabled())) {
    throw new Error("An undersized matrix must not save a 3-by-3 wall.");
  }
  await page.getByRole("button", { name: /^NetworkHD 500 · receiver per display/ }).click();
  const receiverRow = page.locator("tr").filter({ hasText: "NHD-500-RX" });
  if ((await receiverRow.locator("td").first().innerText()) !== "9") {
    throw new Error("A 3-by-3 direct LCD wall must have nine receivers.");
  }
  for (const name of [/^LCD · looped/, /^LED · processor input/, /^Large single projection/]) {
    await page.getByRole("button", { name }).click();
    if ((await page.getByRole("button", { name }).getAttribute("aria-pressed")) !== "true") {
      throw new Error("Video wall application selection did not update.");
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const wallSize = await page.locator(".vw-builder").evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  if (wallSize.scroll > wallSize.width + 1) throw new Error("Video wall builder overflows on mobile.");

  console.log("[browser-smoke] Verified built app pages, Compare workflow, project detail route, and video wall options in a real browser.");
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
  stopWindowsPortListener();
}
