import { describe, expect, it } from "vitest";
import { countPdfPages } from "./pdf-pages.mjs";

/**
 * The two readings are built into the fixtures rather than mocked, because the
 * question this reader answers is what a printed file says about itself: a test
 * that stubbed the regex would pin the code's shape and leave the parse unread.
 */
function pdf(objects) {
  return Buffer.from(`%PDF-1.4\n${objects}\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`, "latin1");
}

const page = (id) => `${id} 0 obj\n<< /Type /Page /Parent 1 0 R >>\nendobj`;

describe("countPdfPages", () => {
  it("reads the page tree's count when the tree and its pages agree", () => {
    const file = pdf([
      "1 0 obj\n<< /Type /Pages /Kids [2 0 R 3 0 R 4 0 R] /Count 3 >>\nendobj",
      page(2),
      page(3),
      page(4),
    ].join("\n"));
    expect(countPdfPages(file)).toEqual({ pages: 3, source: "page tree /Count", pageObjects: 3 });
  });

  it("takes the root's count, not an inner node's", () => {
    const file = pdf([
      "1 0 obj\n<< /Type /Pages /Kids [5 0 R 2 0 R] /Count 3 >>\nendobj",
      "5 0 obj\n<< /Type /Pages /Parent 1 0 R /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj",
      page(2),
      page(3),
      page(4),
    ].join("\n"));
    expect(countPdfPages(file).pages).toBe(3);
  });

  it("counts page objects when no tree declares a count", () => {
    const file = pdf([page(2), page(3)].join("\n"));
    expect(countPdfPages(file)).toEqual({ pages: 2, source: "page objects", pageObjects: 2 });
  });

  it("does not read a /Type /Pages dictionary as a page", () => {
    const file = pdf([
      "1 0 obj\n<< /Type /Pages /Kids [2 0 R] /Count 1 >>\nendobj",
      page(2),
    ].join("\n"));
    expect(countPdfPages(file).pageObjects).toBe(1);
  });

  it("refuses a file whose two readings disagree, naming both", () => {
    const file = pdf([
      "1 0 obj\n<< /Type /Pages /Kids [2 0 R] /Count 3 >>\nendobj",
      page(2),
    ].join("\n"));
    expect(() => countPdfPages(file)).toThrow(/declares 3 page\(s\) where 1 page object\(s\)/);
  });

  it("refuses a file that is not a PDF", () => {
    expect(() => countPdfPages(Buffer.from("<html>not printed</html>", "latin1"))).toThrow(/not a PDF/);
  });

  it("refuses a PDF with neither a tree count nor page objects", () => {
    expect(() => countPdfPages(pdf("1 0 obj\n<< /Type /Catalog >>\nendobj"))).toThrow(/no page count/);
  });
});
