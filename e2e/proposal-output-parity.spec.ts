import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve("docs/release-evidence/proposal-output-parity/latest");
const bundledPython = process.env.WINGMAN_BUNDLED_PYTHON
  || (process.platform === "win32"
    ? "C:/Users/steve/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe"
    : "python3");

function normalized(value: string) { return value.replace(/\s+/g, " ").trim(); }

test("canonical proposal retains semantic and visual parity across screen, DOCX and PDF", async ({ page }) => {
  const manifestPath = path.join(outputDir, "manifest.json");
  expect(fs.existsSync(manifestPath), "run the proposal DOCX parity fixture generator first").toBe(true);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const html = fs.readFileSync(path.join(outputDir, "proposal-screen.html"), "utf8");
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: path.join(outputDir, "proposal-screen.png"), fullPage: true });
  const screenText = normalized(await page.locator("body").innerText());

  const docxText = normalized(fs.readFileSync(path.join(outputDir, "proposal-docx.txt"), "utf8"));

  await page.emulateMedia({ media: "print" });
  const pdfPath = path.join(outputDir, "proposal.pdf");
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true, margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" } });
  const pdfTextPath = path.join(outputDir, "proposal-pdf.txt");
  const extraction = spawnSync(bundledPython, ["-c", "from pypdf import PdfReader; import sys; print('\\n'.join((p.extract_text() or '') for p in PdfReader(sys.argv[1]).pages))", pdfPath], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  expect(extraction.status, extraction.stderr || extraction.error?.message).toBe(0);
  fs.writeFileSync(pdfTextPath, extraction.stdout);
  const pdfText = normalized(extraction.stdout);

  const required = manifest.requiredMarkers;
  const formats = { screen: screenText, docx: docxText, pdf: pdfText };
  for (const [format, text] of Object.entries(formats)) {
    for (const marker of required) expect(text, `${format} is missing ${marker}`).toContain(marker);
  }
  for (const [sku, qty] of Object.entries(manifest.quantities) as Array<[string, number]>) {
    for (const [format, text] of Object.entries(formats)) {
      expect(text, `${format} is missing quantity ${qty} for ${sku}`).toMatch(new RegExp(`${sku.replaceAll("-", "[-‑]?-").replace(/--/g, "-")}[^]{0,180}\\b${qty}\\b`, "i"));
    }
  }

  manifest.artifacts = { ...manifest.artifacts, screenPng: "proposal-screen.png", pdf: "proposal.pdf", pdfText: "proposal-pdf.txt" };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
});
