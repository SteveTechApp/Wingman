import { spawn } from "node:child_process";
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
  await assertPageText(page, "/wingman/compare", "Competitor Comparison");
  await assertPageText(page, "/wingman/proposal", "Proposal Builder");
  await assertPageText(page, "/wingman/projects/northbridge-meeting-room-refresh", "Editable requirements");

  console.log("[browser-smoke] Verified built app pages and project detail route in a real browser.");
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
}
