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
    throw new Error(`Expected ${pathname} to contain "${expectedText}".`);
  }
}

async function assertCompareWorkflow(page) {
  await page.goto(`http://127.0.0.1:${port}/wingman/compare`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Crestron" }).click();
  const nextProductStep = page.getByRole("button", { name: "Next: choose competitor product" });
  if (await nextProductStep.isVisible().catch(() => false)) {
    await nextProductStep.click();
  }
  // getByLabel("Competitor SKU") is ambiguous: it matches both the input and
  // the <section aria-label="Competitor SKU lookup"> that wraps it, so Playwright
  // fails on a strict-mode violation. Target the textbox role explicitly.
  // This check had never run in CI, so the drift went unnoticed.
  await page.getByRole("textbox", { name: "Competitor SKU" }).fill("DM-NVX-360");
  await page.getByRole("button", { name: "Review WyreStorm direction", exact: true }).click();
  // The result panel used to be headed "Suggested WyreStorm direction". That
  // string no longer exists anywhere in src/ - the heading is now "Comparison
  // result". Anchoring on a heading role rather than a loose text match keeps
  // this tied to the actual result state rather than incidental body copy.
  await page.getByRole("heading", { name: "Comparison result" }).waitFor({ state: "visible", timeout: 15_000 });
  const text = await page.locator("body").innerText();

  if (text.includes("Product data not loaded")) {
    throw new Error("Compare workflow could not load product data.");
  }

  if (!/NHD-|NetworkHD|WyreStorm/i.test(text)) {
    throw new Error("Compare workflow did not render a sensible WyreStorm match.");
  }

  for (const blockedSku of ["APO-210-UC", "APO-SKY-MIC", "COM-MIC-HUB", "CAM-210-PTZ"]) {
    if (text.includes(blockedSku)) {
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

  await assertPageText(page, "/wingman/ingest", "Document Ingest");
  await assertPageText(page, "/wingman/compare", "Competitor Compare");
  await assertCompareWorkflow(page);

  // This check had never been run by CI, so several assertions had drifted away
  // from the UI. Each expectation below was re-derived by driving the real app
  // rather than by reading source, and the strings were confirmed present.
  //
  // "Proposal Builder" no longer appears in src/. A smoke run always starts
  // with an empty localStorage and therefore no active project, so the proposal
  // route deterministically renders its empty state.
  await assertPageText(page, "/wingman/proposal", "Open a project before building a proposal");

  // Was "Editable requirements". That string is still in ProjectDetailPage.tsx
  // (check:workflow asserts it) but renders only once requirement records
  // exist, so it is not reachable from a cold start. The project name proves
  // what this step is really for: the route resolves and seeded project data
  // loads.
  await assertPageText(page, "/wingman/projects/northbridge-meeting-room-refresh", "Northbridge Meeting Room Refresh");

  console.log("[browser-smoke] Verified built app pages, Compare workflow, and project detail route in a real browser.");
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
  stopWindowsPortListener();
}
