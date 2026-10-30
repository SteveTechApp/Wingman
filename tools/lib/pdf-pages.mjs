/**
 * How many pages a printed PDF has, read out of the file's own bytes.
 *
 * `check:proposal-print-pagination` asks two questions that sound like one: did
 * the browser's script split the priced schedule into page-sized chunks, and did
 * the printer honour those chunks as pages. The first is a DOM reading — the
 * `.wm-schedule-print-page` sections only exist between `beforeprint` and
 * `afterprint` — and the second is a PDF, which is not a DOM at all: the page
 * count has to come out of the bytes.
 *
 * pypdf used to answer that, and it needed Python on the runner. This module asks
 * the same fact of the bytes, in Node: `check:proposal-print-pagination` counts
 * the pages the printer wrote for the document it just paginated, and
 * `e2e/proposal-print-pagination.spec.ts` counts them for a real export a rep
 * generated first. One reader for both, so no proposal-print test needs a runtime
 * outside the browser it already starts.
 *
 * Two readings of one file, because one is a claim and two that agree are a
 * reading:
 *
 *   - the page tree's `/Count`, which is the number a PDF reader lays out its
 *     pages from. `/Type /Pages` dictionaries nest, so the root's count is the
 *     largest in the file and that is the total;
 *   - the `/Type /Page` objects themselves, counted directly — what the tree
 *     claims to point at.
 *
 * A file where the two disagree is refused rather than read one way: it is one
 * file giving two answers, so neither can be trusted, and a count that quietly
 * took the friendlier one would let a check pass on a document whose pages were
 * never written. Chromium writes both plainly and in one revision (`/Count 4`
 * beside four page objects for a four-chunk schedule), which is what makes the
 * disagreement a real defect rather than an artefact of how a writer chose to
 * lay out its cross-reference table.
 */

const PAGE_OBJECT = /\/Type\s*\/Page(?![A-Za-z])/g;

/**
 * The declared count of the page tree, taken as the largest `/Count` in the file.
 *
 * Objects are split on their own headers rather than searched for a key, because
 * a `/Count` belongs to the dictionary it sits in: an inner node of the tree
 * declares how many pages it holds, and only the root declares the total. The
 * body is matched up to `endobj` so a content stream's operators are not read as
 * a page tree — no content stream carries `/Type /Pages`, but reading object by
 * object is what makes that a fact about the parse rather than about the file.
 */
function pageTreeCount(text) {
  let claimed = null;
  for (const object of text.matchAll(/(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/g)) {
    const body = object[3];
    if (!/\/Type\s*\/Pages(?![A-Za-z])/.test(body)) continue;
    const count = body.match(/\/Count\s+(\d+)/);
    if (!count) continue;
    const value = Number(count[1]);
    if (claimed === null || value > claimed) claimed = value;
  }
  return claimed;
}

/**
 * Read the page count of a PDF.
 *
 * Returns `{ pages, source, pageObjects }` rather than a bare number so the
 * check can print which reading it trusted: a run that says "4 pages (page tree
 * /Count)" and one that says "4 pages (page objects)" are not the same evidence,
 * and the second is what is left when a writer compresses its tree.
 *
 * Throws on a file that is not a PDF, on one where no reading yields a count,
 * and on one whose two readings disagree — each with the numbers it read, since
 * "cannot read this PDF" sends a reader to the file with nothing to look for.
 */
export function countPdfPages(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const text = buffer.toString("latin1");
  if (!text.startsWith("%PDF-")) {
    throw new Error(
      `The printer's output is not a PDF: it starts ${JSON.stringify(text.slice(0, 8))} rather than "%PDF-", ` +
        "so there are no page breaks in it to hold the browser's chunks to.",
    );
  }

  const claimed = pageTreeCount(text);
  const pageObjects = (text.match(PAGE_OBJECT) || []).length;

  if (claimed !== null && pageObjects > 0 && claimed !== pageObjects) {
    throw new Error(
      `The printed PDF disagrees with itself: its page tree declares ${claimed} page(s) where ${pageObjects} ` +
        "page object(s) are written in the file. A count taken from either would describe a document the " +
        "printer did not produce, so the two readings are refused until they agree.",
    );
  }
  if (claimed === null && pageObjects === 0) {
    throw new Error(
      "The printed PDF carries no page count this reader can find: it has no /Type /Pages tree declaring a " +
        "/Count and no /Type /Page objects, so it is either not a printed document or written in a way this " +
        "reader does not describe (an object-stream-compressed page tree has neither in the clear).",
    );
  }

  return {
    pages: claimed ?? pageObjects,
    source: claimed === null ? "page objects" : "page tree /Count",
    pageObjects,
  };
}
