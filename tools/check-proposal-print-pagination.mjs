#!/usr/bin/env node
/**
 * Checks the printed proposal's priced schedule is split into pages, not cut.
 *
 * A proposal's equipment schedule is one table in the exported document, and a
 * long one does not fit a sheet of A4. The export therefore ships a small script
 * (`proposalPrintPaginationHtml()`, `src/wingman2/lib/proposalPrintPagination.ts`)
 * that runs on `beforeprint`: it clones the priced schedule into page-sized
 * chunks, repeats the header, prints each page's running total as its footer,
 * and hides the original. Two failures matter to a rep and neither is visible on
 * screen, because the chunks only exist between `beforeprint` and `afterprint`:
 *
 *   - the schedule is printed as one block and the printer drops everything past
 *     the first page, so the customer never sees the equipment the quote is for;
 *   - a page ends without saying how far down the schedule it got, or repeats the
 *     order total on every page, so the numbers a customer reads do not add up.
 *
 * Both are layout behaviour, so this is a browser reading rather than a marker
 * search: the tool runs `e2e/proposal-print-pagination-check.spec.ts` in Chromium
 * with print media emulated, where the real script paginates a synthetic long
 * schedule and the walk reads back the pages — every line exactly once, the
 * header on each page, a footer that agrees with the page's own last line, no
 * page taller than the printable area, and the document restored after printing.
 *
 * The chunks being page-sized is still a claim about the layout, so the walk also
 * prints the paginated document to a real PDF and counts the pages the printer
 * wrote (`countPdfPages`, `tools/lib/pdf-pages.mjs`, no Python needed). The two
 * counts have to be one number: a chunk that fits the printable area and starts a
 * new page is a PDF page, so N chunks are N printed pages exactly when the printer
 * wrote N. Fewer means content was dropped past a sheet; more means a chunk
 * overflowed. That number is required in the walk's report for the same reason the
 * rest are — a run that measured the DOM and never asked the printer must not be
 * quotable as a passed gate.
 *
 * Usage: node tools/check-proposal-print-pagination.mjs
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const spec = "e2e/proposal-print-pagination-check.spec.ts";
if (!fs.existsSync(path.join(root, spec))) {
  console.error(`[proposal-print-pagination] the browser walk is missing: ${spec}`);
  process.exit(1);
}

const measurements = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wm-print-pagination-")), "measurements.json");
const run = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/@playwright/test/cli.js"),
    "test",
    spec,
    "--project=chromium",
    "--workers=1",
    "--retries=0",
  ],
  {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    env: { ...process.env, WINGMAN_PRINT_PAGINATION_MEASUREMENTS: measurements },
  },
);
if (run.error) throw run.error;
if (run.status !== 0) process.exit(run.status ?? 1);

// The walk's assertions are the gate; the numbers it measured are what the
// summary reports. A report that is absent or says nothing was split means the
// walk passed without asking the question, so it is refused rather than quoted.
if (!fs.existsSync(measurements)) {
  console.error(
    `[proposal-print-pagination] the walk passed but wrote no measurements to ${measurements}, so nothing proves it ` +
      "paginated a schedule. Restore the report write in " + spec + ".",
  );
  process.exit(1);
}
const measured = JSON.parse(fs.readFileSync(measurements, "utf8"));
if (!(measured.pages >= 3) || measured.rows !== measured.expectedRows) {
  console.error(
    `[proposal-print-pagination] the walk measured ${measured.rows} of ${measured.expectedRows} schedule lines over ` +
      `${measured.pages} page(s). A priced schedule that fits one page is not a paginated one, so this run asked ` +
      "nothing; make the walk's schedule long enough to need splitting.",
  );
  process.exit(1);
}
// The printer's half of the reading, refused here as well as in the walk: a report
// written by a walk that counted the chunks and never printed them would otherwise
// read as "both counts agree" when only one was taken.
if (measured.printedPages !== measured.pages) {
  console.error(
    `[proposal-print-pagination] the walk built ${measured.pages} page-sized chunk(s) and reported ` +
      `${measured.printedPages ?? "no"} printed PDF page(s). The browser's chunking and the printer's own ` +
      "breaks are the same count or they are two different documents, so this run is refused.",
  );
  process.exit(1);
}

console.log(
  `[proposal-print-pagination] PASS — a ${measured.rows}-line priced schedule is split over ${measured.pages} printed ` +
    `pages (${measured.rowsPerPage.join(" / ")} lines), each ${measured.pageWidthPx}px wide and at most ` +
    `${measured.tallestPagePx}px of the ${measured.budgetPx - 2}px printable height, every line printed once, each page ` +
    `carrying the schedule header and a footer that agrees with its own last line, and the printer wrote ` +
    `${measured.printedPages} PDF page(s) of its own (${measured.printedSource}, ${measured.pdfBytes} bytes) — the ` +
    "same count, so each chunk landed on one sheet.",
);
