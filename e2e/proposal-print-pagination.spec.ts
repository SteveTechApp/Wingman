import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { countPdfPages } from "../tools/lib/pdf-pages.mjs";

/**
 * The same question `check:proposal-print-pagination` asks, asked of a real
 * export instead of a document the walk writes itself.
 *
 * `check:proposal-print-pagination` runs `e2e/proposal-print-pagination-check.spec.ts`
 * over a synthetic schedule, because a gate that needed somebody to generate an
 * export first would not be a gate. This walk is the other half of that bargain:
 * the fixture is an actual proposal a rep exported (`reports/export-review/proposal.html`,
 * written by the export path — the file is not in the repository), its own
 * stylesheet and its own copy of the shipped pagination script, so a schedule long
 * enough to paginate is laid out under the rules the customer's document really
 * carries rather than under a stand-in's.
 *
 * Two readings of one printed document, because one is a claim and the other is
 * what the printer did with it:
 *
 *   - the pages the script built, read from the DOM. The chunks exist only between
 *     `beforeprint` and `afterprint`, so this dispatches `beforeprint` and reads
 *     `.wm-schedule-print-page` — which line each page ends on, the header it
 *     repeats, the footer that agrees with that line. Extracting the same facts
 *     from the PDF's text needed a Python runtime and pypdf on the runner; the
 *     chunks the printer is given are the document, and the chunks are a DOM.
 *   - how many sheets the printer wrote, read from the PDF's own bytes by
 *     `countPdfPages` (`tools/lib/pdf-pages.mjs`), the reader the gate uses. The
 *     two counts have to be one number: a chunk that fits a sheet is a PDF page,
 *     so N chunks are N sheets exactly when the printer wrote N. Fewer means a
 *     page's content was cut; more means a chunk ran past its sheet, which the
 *     per-page readings below would have had to miss.
 *
 * The three lead heights are the export's own awkward case: the schedule shares its
 * first sheet with whatever the walk left above it, so the first chunk has room for
 * fewer lines than the rest, and a lead that ends near a page edge is where the
 * script could leave a chunk carrying the header and nothing under it.
 */

const ROW_COUNT = 100;
const SCHEDULE_HEADER = "SCHEDULEHEADER";
const TOTAL = `Schedule total: £${ROW_COUNT * 10}.00 · ${ROW_COUNT} items · Excl. tax`;

interface PrintedPage {
  header: string;
  footer: string;
  rows: Array<{ item: string; description: string; runningFooter: string }>;
}

for (const leadMm of [0, 210, 230]) {
  test(`long schedule repeats header and totals without an orphan header after ${leadMm}mm lead`, async ({ page }, testInfo) => {
    const fixture = process.env.WINGMAN_PRINT_FIXTURE || path.resolve("reports/export-review/proposal.html");
    expect(fs.existsSync(fixture), "Generate the actual proposal export fixture first").toBe(true);
    await page.setContent(fs.readFileSync(fixture, "utf8"), { waitUntil: "load" });
    // The export marks the schedule with `data-priced-schedule` — the attribute its
    // own script paginates — rather than with a class of its own.
    await page.evaluate(({ height, header, total, rows: count }) => {
      const table = document.querySelector<HTMLTableElement>("table[data-priced-schedule]");
      if (!table) throw new Error("Equipment schedule footer missing from the actual export");
      const headerCell = table.querySelector("thead th");
      if (!headerCell) throw new Error("Equipment header missing");
      headerCell.textContent = header;
      const template = table.tBodies[0].rows[0];
      if (!template) throw new Error("Priced fixture has no rows");
      const rows = Array.from({ length: count }, (_, index) => {
        const row = template.cloneNode(true) as HTMLTableRowElement;
        const values = [
          `ROW-${String(index + 1).padStart(3, "0")}`,
          `ROWSTART${index} Equipment ${"with installation detail ".repeat(index % 3 + 1)}ROWEND${index}`,
          "1",
          "£10.00",
          "£10.00",
          `£${(index + 1) * 10}.00`,
        ];
        [...row.cells].forEach((cell, column) => { cell.textContent = values[column]; });
        row.dataset.runningFooter = `Running priced total: £${(index + 1) * 10}.00 · ${index + 1} items · Excl. tax`;
        return row;
      });
      table.tBodies[0].replaceChildren(...rows);
      table.tFoot!.rows[0].cells[0].textContent = total;
      const clone = table.cloneNode(true);
      document.body.replaceChildren();
      const lead = document.createElement("div");
      lead.style.height = `${height}mm`;
      lead.textContent = "Schedule lead-in";
      document.body.append(lead, clone);
    }, { height: leadMm, header: SCHEDULE_HEADER, total: TOTAL, rows: ROW_COUNT });

    // Nothing is paginated on screen: the chunks are the script's answer to a
    // print, so a build that left them standing would print the schedule twice.
    await expect(page.locator(".wm-schedule-print-page")).toHaveCount(0);
    await expect(page.locator("table[data-priced-schedule] tbody tr")).toHaveCount(ROW_COUNT);

    // The script listens for `beforeprint` itself, which `page.pdf()` does not
    // fire from the page's side, so the walk dispatches it and then reads what the
    // script built. Print media is emulated first because the chunk's width and
    // `break-before` rules live in the exported `@media print` block.
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));

    const reading = await page.evaluate(() => {
      const text = (node: Element | null | undefined) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();
      const pages = [...document.querySelectorAll(".wm-schedule-print-page")].map((chunk) => {
        const table = chunk.querySelector("table") as HTMLTableElement | null;
        return {
          header: [...(table?.tHead?.rows[0]?.cells ?? [])].map((cell) => text(cell)).join(" | "),
          footer: text(table?.tFoot?.rows[0]?.cells[0]),
          rows: [...(table?.tBodies[0]?.rows ?? [])].map((row) => ({
            item: text(row.cells[0]),
            description: text(row.cells[1]),
            runningFooter: (row as HTMLTableRowElement).dataset.runningFooter ?? "",
          })),
        };
      });
      // The lead the walk put above the schedule, and the same 255mm ruler the
      // shipped script measures its chunks against: the lead takes a sheet of its
      // own, so the printer's count is the chunks plus however many sheets that is.
      const lead = document.body.firstElementChild as HTMLElement | null;
      const ruler = document.createElement("div");
      ruler.style.height = "255mm";
      document.body.append(ruler);
      const budgetPx = ruler.getBoundingClientRect().height;
      ruler.remove();
      return { pages, leadPx: lead ? lead.getBoundingClientRect().height : 0, budgetPx };
    });
    const pages: PrintedPage[] = reading.pages;

    // A schedule this long cannot fit one page. If it does, the script did nothing
    // and every reading below would be about an unpaginated table.
    expect(
      pages.length,
      `the export's script put a ${ROW_COUNT}-line schedule on ${pages.length} page(s) after a ${leadMm}mm lead, so the pagination never split it`,
    ).toBeGreaterThan(2);

    for (const [index, printed] of pages.entries()) {
      const label = `page ${index + 1} of ${pages.length} (${leadMm}mm lead)`;
      expect(printed.header, `${label} lost the schedule header, so a continued page prints lines with no columns named`).toContain(SCHEDULE_HEADER);
      expect(printed.rows.length, `${label} carries the header with no line under it, which is the orphan header the lead is meant to avoid`).toBeGreaterThan(0);

      const last = printed.rows[printed.rows.length - 1];
      const lastOrdinal = Number(last.item.slice(4));
      if (lastOrdinal === ROW_COUNT) {
        expect(printed.footer.toLowerCase(), `${label} ends on the schedule's last line and does not print the order total`).toContain("schedule total:");
        expect(printed.footer).toContain(`£${ROW_COUNT * 10}.00 · ${ROW_COUNT} items`);
      } else {
        expect(
          printed.footer.toLowerCase(),
          `${label} prints a footer that is not the running total of the line it ends on (${last.item})`,
        ).toContain("running priced total:");
        // Derived from the printed line rather than the fixture, so a footer copied
        // from an earlier page fails even if the fixture's own text moved.
        expect(printed.footer).toContain(`£${lastOrdinal * 10}.00 · ${lastOrdinal} items`);
      }
    }

    // Each line once, and whole: a row split across a page boundary would print its
    // description's opening on one sheet and its end on the next.
    for (let index = 0; index < ROW_COUNT; index++) {
      const item = `ROW-${String(index + 1).padStart(3, "0")}`;
      const carrying = pages.filter((printed) => printed.rows.some((row) => row.item === item));
      expect(carrying, `${item} should be printed on exactly one page after a ${leadMm}mm lead`).toHaveLength(1);
      const row = carrying[0].rows.find((candidate) => candidate.item === item)!;
      expect(row.description, `${item} is split across pages: its description starts on one sheet and ends on another`).toContain(`ROWSTART${index} `);
      expect(row.description).toContain(`ROWEND${index}`);
    }

    // The printer's own breaks, held to the chunks the script built. The PDF is
    // only its page count here: which line a sheet ends on is the chunk's answer,
    // and the two counts agreeing is what makes a chunk a sheet.
    const pdf = testInfo.outputPath(`long-schedule-${leadMm}mm.pdf`);
    const bytes = await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
    const printed = countPdfPages(bytes);
    // The lead is content above the schedule, and the first chunk carries
    // `break-before: page`, so the lead never shares a sheet with it: it takes one
    // of its own, and nothing at all when the walk gave it none. That sheet is
    // measured rather than assumed — the lead is read against the same 255mm ruler
    // the script measures its chunks against, so a lead taller than a page would
    // fail here instead of being read as a chunk that overflowed.
    const leadSheets = reading.leadPx > 1 ? 1 : 0;
    expect(
      reading.leadPx,
      `the ${leadMm}mm lead is ${Math.round(reading.leadPx)}px tall against a ${Math.round(reading.budgetPx)}px page, so it no longer ` +
        "fits the one sheet the printer count below allows for it",
    ).toBeLessThanOrEqual(reading.budgetPx);
    expect(
      printed.pages,
      `the printer wrote ${printed.pages} PDF page(s) (${printed.source}) for the ${pages.length} page-sized chunk(s) the export's ` +
        `script built after a ${leadMm}mm lead, which is the lead's ${leadSheets} sheet plus those chunks, so the browser's chunking ` +
        "and the printer's own breaks do not agree: " +
        (printed.pages < pages.length + leadSheets
          ? `the printer wrote ${pages.length + leadSheets - printed.pages} fewer sheet(s) than there are chunks, so it merged chunks onto one sheet or dropped the content past a chunk's first`
          : `${printed.pages - pages.length - leadSheets} chunk(s) ran onto another sheet`),
    ).toBe(pages.length + leadSheets);
  });
}
