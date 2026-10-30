import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { countPdfPages } from "../tools/lib/pdf-pages.mjs";
import { proposalPrintPaginationHtml } from "../src/wingman2/lib/proposalPrintPagination";

/**
 * The reading `check:proposal-print-pagination` is built on.
 *
 * The pagination is browser code — `proposalPrintPaginationHtml()` ships a
 * `<style>` and a `<script>` inside the exported proposal, and the script
 * re-lays the priced schedule into page-sized chunks when the document is about
 * to print. Nothing in this repository can read that without a layout engine:
 * jsdom reports every box as 0×0, so the chunking loop would put all sixty lines
 * on one page and pass. So the walk is a real Chromium page with print media
 * emulated, and the schedule here is written by the walk rather than copied from
 * a generated export — a fixture on disk would make this gate depend on somebody
 * having run the export first, which is what keeps `proposal-print-pagination.spec.ts`
 * (the same question, asked of a real export's PDF) a review walk instead of a gate.
 *
 * And it is a PDF reading as well, because the chunks being page-sized is a claim
 * about the layout rather than a page break: the walk prints the paginated
 * document to a real PDF and counts the pages the printer wrote
 * (`countPdfPages`, `tools/lib/pdf-pages.mjs`). The two counts have to be the
 * same one, and together they are what either alone only suggests — a chunk that
 * fits the printable area and starts a new page is a PDF page, so N chunks that
 * each fit and each break are N printed pages exactly when the printer wrote N.
 * Fewer means the printer dropped the content past a chunk's first sheet; more
 * means a chunk overflowed onto a second one, which the height reading below would
 * have to have missed. `e2e/proposal-print-pagination.spec.ts` asks the same
 * question of an export a rep generated, and answers it with this same reader on
 * the PDF it prints from that document's chunks; both halves are Node, so neither
 * the gate nor the review walk needs a runtime outside the browser it starts.
 */

const ROW_COUNT = 60;
const TITLE = "Equipment schedule";
const CONTINUED = `${TITLE} — continued`;
const TOTAL = `Schedule total: £${ROW_COUNT * 10}.00 · ${ROW_COUNT} items · Excl. tax`;
const HEADER_LABELS = ["Item", "Description", "Qty", "Unit price", "Line total"];

/** One priced line, carrying the running total the export writes on each row. */
function scheduleRows(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const item = `ROW-${String(index + 1).padStart(3, "0")}`;
    const total = (index + 1) * 10;
    return (
      `<tr data-running-footer="Running priced total: £${total}.00 · ${index + 1} items · Excl. tax">`
      + `<td>${item}</td>`
      + `<td>ROWSTART${index} Wall plate, HDMI extension and commissioning detail for the Northstar operations room ROWEND${index}</td>`
      + `<td>1</td><td>£10.00</td><td>£${total}.00</td>`
      + "</tr>"
    );
  }).join("");
}

/**
 * A document shaped the way the export is: a heading and a lead paragraph, then
 * the priced schedule the pagination script marks with `data-priced-schedule`.
 * The `@page` rule and the body font are what give the walk the page it measures
 * against — they are not the export's own stylesheet, which is why the
 * assertions are about the chunking rather than about millimetres.
 */
function buildDocument({ rows, extraTables = "" }: { rows: string; extraTables?: string }) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 18mm; }
  body { margin: 0; font: 12px/1.45 "Helvetica Neue", Arial, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
</style>
${proposalPrintPaginationHtml()}
</head>
<body>
<h2>${TITLE}</h2>
<p>Priced equipment for the Northstar operations room, per the approved bill of materials.</p>
<table class="wm-priced-schedule" data-priced-schedule>
  <thead><tr>${HEADER_LABELS.map((label) => `<th>${label}</th>`).join("")}</tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="${HEADER_LABELS.length}">${TOTAL}</td></tr></tfoot>
</table>
${extraTables}
</body></html>`;
}

interface PrintedPage {
  heading: string;
  header: string[];
  footer: string;
  rows: Array<{ item: string; runningFooter: string }>;
  height: number;
  width: number;
  breakBefore: string;
}

interface PrintReading {
  pages: PrintedPage[];
  /** The printable height the shipped script measures against, read the same way it does. */
  budgetPx: number;
  originalDisplay: string;
  originalRows: number;
  originalFooter: string;
  titleDisplay: string;
}

interface HeldOriginals {
  __wmOriginalTitle?: Element | null;
  __wmOriginalSchedule?: HTMLTableElement | null;
}

/**
 * Keep a handle on the heading and the table before anything is printed.
 *
 * A selector cannot answer for them afterwards: the first page is inserted
 * before the heading it repeats, so the first `h2` in the document is the clone
 * inside that page, and `querySelector` would read the copy as if it were the
 * original — the copy is meant to be visible, so that reading would pass a
 * document that had never hidden anything.
 */
async function holdOriginals(page: Page) {
  await page.evaluate(() => {
    const held = window as unknown as HeldOriginals;
    held.__wmOriginalTitle = document.querySelector("h2");
    held.__wmOriginalSchedule = document.querySelector("table[data-priced-schedule]");
  });
}

/** Print the document the way the browser does, then read what the script left. */
async function print(page: Page) {
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
}

/**
 * The printer's own answer to the same question, read out of the PDF it wrote.
 *
 * `page.pdf()` is CDP's `printToPDF`: it lays the document out under print media
 * and writes the sheets the printer would, and it does not fire `beforeprint` —
 * which is why this is called after the walk paginated the document itself. The
 * chunks are in the DOM and visible, so what it prints is the paginated document.
 */
async function printedPdf(page: Page) {
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  return { ...countPdfPages(pdf), bytes: pdf.length };
}

async function readPrint(page: Page): Promise<PrintReading> {
  return page.evaluate(() => {
    const text = (node: Element | null | undefined) => (node?.textContent ?? "").trim();
    const pages = [...document.querySelectorAll(".wm-schedule-print-page")].map((chunk) => {
      const table = chunk.querySelector("table") as HTMLTableElement | null;
      const style = getComputedStyle(chunk);
      const box = chunk.getBoundingClientRect();
      return {
        heading: text(chunk.querySelector("h2, h3")),
        header: [...(table?.tHead?.rows[0]?.cells ?? [])].map((cell) => text(cell)),
        footer: text(table?.tFoot?.rows[0]?.cells[0]),
        rows: [...(table?.tBodies[0]?.rows ?? [])].map((row) => ({
          item: text(row.cells[0]),
          runningFooter: (row as HTMLTableRowElement).dataset.runningFooter ?? "",
        })),
        height: box.height,
        width: box.width,
        breakBefore: style.breakBefore || style.pageBreakBefore,
      };
    });
    // The same 255mm ruler the shipped script builds, read here so the page
    // heights are compared against a budget this walk measured, not one it assumed.
    const ruler = document.createElement("div");
    ruler.style.height = "255mm";
    document.body.append(ruler);
    const budgetPx = ruler.getBoundingClientRect().height;
    ruler.remove();
    const held = window as unknown as { __wmOriginalTitle?: Element | null; __wmOriginalSchedule?: HTMLTableElement | null };
    const original = held.__wmOriginalSchedule ?? null;
    const title = held.__wmOriginalTitle ?? null;
    return {
      pages,
      budgetPx,
      originalDisplay: original ? getComputedStyle(original).display : "missing",
      originalRows: original?.tBodies[0]?.rows.length ?? -1,
      originalFooter: text(original?.tFoot?.rows[0]?.cells[0]),
      titleDisplay: title ? getComputedStyle(title).display : "missing",
    };
  });
}

const printedItems = (reading: PrintReading) => reading.pages.flatMap((page) => page.rows.map((row) => row.item));
const expectedItems = Array.from({ length: ROW_COUNT }, (_, index) => `ROW-${String(index + 1).padStart(3, "0")}`);

test("splits a long priced schedule into pages that each carry the header and a footer that agrees with their last line", async ({ page }) => {
  await page.setContent(buildDocument({ rows: scheduleRows(ROW_COUNT) }), { waitUntil: "load" });
  await holdOriginals(page);
  await print(page);
  const reading = await readPrint(page);

  // A schedule this long cannot fit one page. If it does, the script did nothing
  // and every reading below would be about an unpaginated table.
  expect(
    reading.pages.length,
    `a ${ROW_COUNT}-line priced schedule came out as ${reading.pages.length} printed page(s), so the pagination never split it`,
  ).toBeGreaterThanOrEqual(3);

  expect(
    printedItems(reading),
    "the printed pages do not carry every schedule line exactly once, in order",
  ).toEqual(expectedItems);

  // The printer's own page breaks, held to the chunks the script built. This is
  // read before the per-page readings below and after the page count above, so a
  // schedule that never split is reported as that rather than as a PDF mismatch.
  const printed = await printedPdf(page);
  expect(
    printed.pages,
    `the printer wrote ${printed.pages} PDF page(s) (${printed.source}) for the ${reading.pages.length} page-sized ` +
      `chunk(s) the script built, so the browser's chunking and the printer's own breaks do not agree: ` +
      (printed.pages < reading.pages.length
        ? `the printer wrote ${reading.pages.length - printed.pages} fewer sheet(s) than there are chunks, so it merged chunks ` +
          "onto one sheet or dropped the content past a chunk's first"
        : `${printed.pages - reading.pages.length} chunk(s) ran onto another sheet`),
  ).toBe(reading.pages.length);

  expect(reading.originalDisplay, "the original schedule is still laid out, so the print would show every line a second time after the pages").toBe("none");
  expect(reading.titleDisplay, "the heading the first page repeats is still laid out above the pages").toBe("none");
  expect(reading.originalRows, "the hidden original lost lines, so the pages were built from a table that no longer held the schedule").toBe(ROW_COUNT);

  const runningFooters = reading.pages.slice(0, -1).map((page) => page.footer);
  expect(
    new Set(runningFooters).size,
    `every page printed the same footer (${runningFooters[0] ?? "none"}), so a rep cannot tell how far down the schedule a page got`,
  ).toBe(runningFooters.length);

  for (const [index, printed] of reading.pages.entries()) {
    const label = `page ${index + 1} of ${reading.pages.length}`;
    expect(printed.header, `${label} lost the schedule header, so a continued page prints lines with no columns named`).toEqual(HEADER_LABELS);
    expect(printed.breakBefore, `${label} does not start on a new printed page (computed break-before: ${printed.breakBefore})`).toBe("page");
    expect(Math.abs(printed.width - reading.pages[0].width), `${label} is not laid out at the page width the first one is`).toBeLessThan(0.5);
    expect(
      printed.height,
      `${label} is ${Math.round(printed.height)}px tall against the ${Math.round(reading.budgetPx - 2)}px printable area, so the printer would cut its last line`,
    ).toBeLessThanOrEqual(reading.budgetPx - 2 + 1);

    const last = printed.rows[printed.rows.length - 1];
    const lastOrdinal = Number(last.item.slice(4));
    if (index === reading.pages.length - 1) {
      expect(printed.footer, `${label} is the last page and does not print the schedule total`).toBe(TOTAL);
      expect(printed.footer).toContain(`· ${ROW_COUNT} items`);
    } else {
      expect(
        printed.footer,
        `${label} prints a footer that is not the running total of the line it ends on (${last.item})`,
      ).toBe(last.runningFooter);
      // Derived from the printed line rather than the fixture, so a stale footer
      // copied from an earlier page fails even if the fixture's own text moved.
      expect(printed.footer).toContain(`· ${lastOrdinal} items`);
    }
    expect(printed.heading, `${label} does not say which schedule it continues`).toBe(index === 0 ? TITLE : CONTINUED);
  }

  const reportPath = process.env.WINGMAN_PRINT_PAGINATION_MEASUREMENTS;
  if (reportPath) {
    fs.writeFileSync(reportPath, JSON.stringify({
      expectedRows: ROW_COUNT,
      rows: printedItems(reading).length,
      pages: reading.pages.length,
      printedPages: printed.pages,
      printedSource: printed.source,
      pdfBytes: printed.bytes,
      pageWidthPx: Math.round(reading.pages[0].width),
      budgetPx: Math.round(reading.budgetPx),
      tallestPagePx: Math.round(Math.max(...reading.pages.map((printed) => printed.height))),
      rowsPerPage: reading.pages.map((printed) => printed.rows.length),
    }, null, 2));
  }
});

test("puts the document back after printing, so a second print is the same document again", async ({ page }) => {
  await page.setContent(buildDocument({ rows: scheduleRows(ROW_COUNT) }), { waitUntil: "load" });
  await holdOriginals(page);
  await print(page);
  const first = await readPrint(page);
  expect(first.pages.length).toBeGreaterThanOrEqual(3);

  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  const restored = await page.evaluate(() => {
    const held = window as unknown as { __wmOriginalTitle?: Element | null; __wmOriginalSchedule?: HTMLTableElement | null };
    const original = held.__wmOriginalSchedule as HTMLTableElement;
    const title = held.__wmOriginalTitle ?? null;
    return {
      pages: document.querySelectorAll(".wm-schedule-print-page").length,
      display: getComputedStyle(original).display,
      titleDisplay: title ? getComputedStyle(title).display : "missing",
      rows: original.tBodies[0].rows.length,
      footer: (original.tFoot?.rows[0]?.cells[0]?.textContent ?? "").trim(),
    };
  });
  expect(restored.pages, "the paginated pages are still in the document after printing, so the rep is left reading a duplicate schedule").toBe(0);
  expect(restored.display, "the original schedule is still hidden after printing").not.toBe("none");
  expect(restored.titleDisplay, "the schedule heading is still hidden after printing").not.toBe("none");
  expect(restored.rows).toBe(ROW_COUNT);
  expect(restored.footer).toBe(TOTAL);

  await print(page);
  const second = await readPrint(page);
  expect(second.pages.length, `the second print made ${second.pages.length} pages where the first made ${first.pages.length}`).toBe(first.pages.length);
  expect(printedItems(second), "the second print put a different set of lines on the pages than the first").toEqual(printedItems(first));
  expect(second.pages.map((printed) => printed.footer), "the second print's running totals differ from the first's").toEqual(first.pages.map((printed) => printed.footer));
});

test("leaves a schedule with no lines, and a table it was not asked to paginate, alone", async ({ page }) => {
  const unmarked = `<table class="wm-priced-schedule" id="unmarked">
  <thead><tr>${HEADER_LABELS.map((label) => `<th>${label}</th>`).join("")}</tr></thead>
  <tbody>${scheduleRows(5)}</tbody>
  <tfoot><tr><td colspan="${HEADER_LABELS.length}">Schedule total: £50.00 · 5 items · Excl. tax</td></tr></tfoot>
</table>`;
  await page.setContent(buildDocument({ rows: "", extraTables: unmarked }), { waitUntil: "load" });
  await print(page);
  const reading = await page.evaluate(() => {
    const empty = document.querySelector("table[data-priced-schedule]") as HTMLTableElement;
    const unmarkedTable = document.querySelector("#unmarked") as HTMLTableElement;
    return {
      pages: document.querySelectorAll(".wm-schedule-print-page").length,
      emptyDisplay: getComputedStyle(empty).display,
      emptyRows: empty.tBodies[0].rows.length,
      unmarkedDisplay: getComputedStyle(unmarkedTable).display,
      unmarkedRows: unmarkedTable.tBodies[0].rows.length,
    };
  });
  expect(reading.pages, `a schedule with no priced lines was printed as ${reading.pages} empty page(s)`).toBe(0);
  expect(reading.emptyDisplay, "a schedule with no lines was hidden, so the print shows nothing where the empty schedule was").not.toBe("none");
  expect(reading.emptyRows).toBe(0);
  expect(reading.unmarkedDisplay, "a table the export did not mark as the priced schedule was paginated anyway").not.toBe("none");
  expect(reading.unmarkedRows, "a table the walk did not mark was rewritten").toBe(5);
});
