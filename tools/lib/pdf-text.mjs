/**
 * The words on each page of a printed PDF, read in Node.
 *
 * `e2e/proposal-output-parity.spec.ts` asks whether one proposal says the same
 * things on screen, in DOCX and in the PDF — a semantic reading, not a page
 * count. Two of those three are text in a file; the PDF is not: its words live in
 * content streams, encoded against fonts the document embeds, and a proposal
 * exports thirteen pages of them. `pypdf` answered that and needed a Python
 * runtime on the runner, which is the one thing the rest of the Playwright suite
 * never asks for — so the parity walk could only run on a machine that had it,
 * and CI installed it as a step of its own.
 *
 * This asks the same fact of the file with `pdfjs-dist`'s legacy build, which is
 * already a dependency: the ingest reader uses it in the browser, and the legacy
 * build is the one written to run without a DOM, so the test process can parse
 * the PDF the walk just printed. One dependency, no runtime outside the browser
 * the suite already starts.
 *
 * Page texts rather than one string, because the walk reads the cover on its own:
 * the document control block belongs to page one, and the running header,
 * reference and page numbers to the pages after it. Reading them per page is what
 * lets that hold; a single blob would have the cover's furniture and page two's in
 * the same sentence.
 *
 * The parser is given the bytes and nothing else — no worker, no eval, no fetch —
 * because this runs in a test process on a document a browser produced. It is a
 * parser reading untrusted bytes, so it gets the narrowest configuration that can
 * answer.
 */
export async function readPdfPages(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const head = buffer.subarray(0, 5).toString("latin1");
  if (head !== "%PDF-") {
    throw new Error(
      `The exported document is not a PDF: it starts ${JSON.stringify(buffer.subarray(0, 8).toString("latin1"))} ` +
        'rather than "%PDF-", so there is no page text in it to compare with the screen and the DOCX.',
    );
  }

  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  try {
    const pages = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      // Items carry the strings the page draws; marked content carries no text of
      // its own, so it contributes nothing rather than an empty join artefact.
      const words = content.items.map((item) => ("str" in item ? item.str : ""));
      pages.push(words.join(" "));
    }
    return pages;
  } finally {
    // The walk reads one document per run, but a parser holding a document open is
    // a leak the next reader inherits.
    await pdf.destroy();
  }
}
