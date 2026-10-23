import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const python = process.env.WINGMAN_BUNDLED_PYTHON || (process.platform === "win32"
  ? "C:/Users/steve/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe" : "python3");

for (const leadMm of [0, 210, 230]) {
  test(`long schedule repeats header and totals without an orphan header after ${leadMm}mm lead`, async ({ page }, testInfo) => {
    const fixture = process.env.WINGMAN_PRINT_FIXTURE || path.resolve("reports/export-review/proposal.html");
    expect(fs.existsSync(fixture), "Generate the actual proposal export fixture first").toBe(true);
    await page.setContent(fs.readFileSync(fixture, "utf8"), { waitUntil: "load" });
    await page.evaluate((height) => {
      const table = document.querySelector<HTMLTableElement>("table.wm-priced-schedule");
      if (!table) throw new Error("Equipment schedule footer missing from the actual export");
      const header = table.querySelector("thead th");
      if (!header) throw new Error("Equipment header missing");
      header.textContent = "SCHEDULEHEADER";
      const template = table.tBodies[0].rows[0];
      if (!template) throw new Error("Priced fixture has no rows");
      const rows = Array.from({ length: 100 }, (_, index) => {
        const row = template.cloneNode(true) as HTMLTableRowElement;
        const values = [`ROW-${String(index + 1).padStart(3, "0")}`, `ROWSTART${index} Equipment ${"with installation detail ".repeat(index % 3 + 1)}ROWEND${index}`, "1", "£10.00", "£10.00", `£${(index + 1) * 10}.00`];
        [...row.cells].forEach((cell, column) => { cell.textContent = values[column]; });
        row.dataset.runningFooter = `Running priced total: £${(index + 1) * 10}.00 · ${index + 1} items · Excl. tax`;
        return row;
      });
      table.tBodies[0].replaceChildren(...rows);
      table.tFoot!.rows[0].cells[0].textContent = "Schedule total: £1000.00 · 100 items · Excl. tax";
      const clone = table.cloneNode(true);
      document.body.replaceChildren();
      const lead = document.createElement("div");
      lead.style.height = `${height}mm`;
      lead.textContent = "Schedule lead-in";
      document.body.append(lead, clone);
    }, leadMm);
    await page.emulateMedia({ media: "print" });
    const pdf = testInfo.outputPath("long-schedule.pdf");
    await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
    await expect(page.locator(".wm-schedule-print-page")).toHaveCount(0);
    await expect(page.locator("table.wm-priced-schedule tbody tr")).toHaveCount(100);
    const result = spawnSync(python, ["-c", "import json,sys; from pypdf import PdfReader; print(json.dumps([p.extract_text() or '' for p in PdfReader(sys.argv[1]).pages]))", pdf], { encoding: "utf8" });
    expect(result.status, result.stderr || result.error?.message).toBe(0);
    const pages: string[] = JSON.parse(result.stdout);
    const schedulePages = pages.filter((text) => /ROW-\d{3}/.test(text));
    expect(schedulePages.length).toBeGreaterThan(2);
    for (const text of schedulePages) {
      expect(text).toContain("SCHEDULEHEADER");
      const rowNumbers = [...text.matchAll(/ROW-(\d{3})/g)].map(match => Number(match[1]));
      const last = Math.max(...rowNumbers);
      expect(text.toLowerCase()).toContain(last === 100 ? "schedule total:" : "running priced total:");
      expect(text.replace(/\s+/g, " ").toLowerCase()).toContain(`£${last * 10}.00 · ${last} items`);
    }
    for (const text of pages.filter((text) => text.includes("SCHEDULEHEADER"))) expect(text).toMatch(/ROW-\d{3}/);
    for (let index = 0; index < 100; index++) {
      const matches = pages.filter((text) => text.includes(`ROWSTART${index} `));
      expect(matches, `row ${index} should occur on one page`).toHaveLength(1);
      expect(matches[0]).toContain(`ROWEND${index}`);
    }
  });
}
