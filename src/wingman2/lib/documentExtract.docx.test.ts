import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractDocumentText } from "./documentExtract";

/**
 * Word paragraphs, read out of the archive the way ingest does it.
 *
 * The .docx path is the same OOXML reading as the spreadsheet path: the zip's
 * `word/document.xml` is parsed and the runs inside each paragraph are joined.
 * These specs build real archives rather than mocking a parser, so what is
 * asserted is that a rep's dropped proposal comes out as lines and that a spec
 * table still reads as columns — the two things a text parser would have given
 * for free and this hand reading has to keep.
 */

function bodyDocument(inner: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>${inner}</w:body>
    </w:document>`;
}

const paragraph = (text: string) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

async function docxFile(name: string, files: Record<string, string>) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const archive = await zip.generateAsync({ type: "arraybuffer" });
  return { name, arrayBuffer: async () => archive } as File;
}

describe("document DOCX extraction", () => {
  it("turns paragraphs and table rows into readable ingest text", async () => {
    const file = await docxFile("proposal-brief.docx", {
      "word/document.xml": bodyDocument(`
        ${paragraph("Wingman proposal requirements")}
        <w:p><w:r><w:t>Boardroom</w:t></w:r><w:r><w:t xml:space="preserve"> display</w:t></w:r></w:p>
        <w:tbl>
          <w:tr>
            <w:tc>${paragraph("Brand")}</w:tc>
            <w:tc>${paragraph("SKU")}</w:tc>
          </w:tr>
          <w:tr>
            <w:tc>${paragraph("Blustream")}</w:tc>
            <w:tc>${paragraph("HEX100CS-KIT")}</w:tc>
          </w:tr>
        </w:tbl>
        ${paragraph("Budget: 12 displays")}
      `),
    });

    const extracted = await extractDocumentText(file);

    expect(extracted.warnings).toEqual([]);
    expect(extracted.text.split("\n")).toEqual([
      "Wingman proposal requirements",
      // Runs of one paragraph join without a break; the text is one sentence.
      "Boardroom display",
      // A row is one line, its cells tab-separated, so a spec table keeps columns.
      "Brand\tSKU",
      "Blustream\tHEX100CS-KIT",
      "Budget: 12 displays",
    ]);
  });

  it("reads a document whose table cells hold several paragraphs as one cell", async () => {
    const file = await docxFile("multi-paragraph-cell.docx", {
      "word/document.xml": bodyDocument(`
        <w:tbl>
          <w:tr>
            <w:tc>${paragraph("Display")}${paragraph("55 inch")}</w:tc>
            <w:tc>${paragraph("Quantity")}${paragraph("12")}</w:tc>
          </w:tr>
        </w:tbl>
      `),
    });

    const extracted = await extractDocumentText(file);

    expect(extracted.text).toBe("Display 55 inch\tQuantity 12");
  });

  it("returns no text rather than a parser error for an archive without a body", async () => {
    const file = await docxFile("styles-only.docx", {
      "word/styles.xml": bodyDocument(paragraph("not the document body")),
    });

    const extracted = await extractDocumentText(file);

    expect(extracted.text).toBe("");
    expect(extracted.warnings).toEqual([]);
  });
});
