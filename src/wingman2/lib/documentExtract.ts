import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

export type ExtractedDocument = {
  fileName: string;
  text: string;
  warnings: string[];
};

const readableTextFilePattern = /\.(txt|rtf|md|csv|eml)$/i;
const docxPattern = /\.docx$/i;
const pdfPattern = /\.pdf$/i;
const xlsxPattern = /\.xlsx$/i;

// Browser-side extraction guards: a 1,000-page PDF or a 200 MB spec sheet must
// not tie up the renderer. Truncation is surfaced as a warning, never silent.
const MAX_PDF_PAGES = 200;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function extensionWarning(fileName: string) {
  if (/\.doc$/i.test(fileName)) {
    return "Legacy .doc files are not supported yet. Convert to DOCX or PDF for extraction.";
  }

  return `${fileName} is not a supported ingest format yet.`;
}

async function extractPdfText(file: File, onWarning: (warning: string) => void): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages: string[] = [];
  let sawImage = false;
  let truncated = false;

  const pageCount = pdf.numPages;
  const extractedPageCount = Math.min(pageCount, MAX_PDF_PAGES);
  if (pageCount > MAX_PDF_PAGES) {
    truncated = true;
    onWarning(`${file.name} has ${pageCount} pages; extracted the first ${MAX_PDF_PAGES} to protect the browser. Review the remainder or split the document.`);
  }

  for (let pageNumber = 1; pageNumber <= extractedPageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    // Scanned PDFs have no text layer but plenty of painted images - detecting
    // them lets the UI say "this looks scanned" instead of a dead "no text".
    if (!sawImage && content.items.length === 0) {
      try {
        const operatorList = await (page as unknown as {
          getOperatorList(): Promise<{ fnsArray: number[] }>;
        }).getOperatorList();
        const paintImageOp = (pdfjs as unknown as { OPS?: Record<string, number> }).OPS?.paintImageXObject;
        if (paintImageOp !== undefined) {
          sawImage = operatorList.fnsArray.includes(paintImageOp);
        }
      } catch {
        // Operator-list inspection is best-effort; fall back to the text check.
      }
    }

    const positionedItems = content.items
      .map((item: { str?: string; transform?: number[] }) => ({
        text: String(item.str ?? "").trim(),
        x: Number(item.transform?.[4] ?? 0),
        y: Number(item.transform?.[5] ?? 0),
      }))
      .filter((item) => item.text);
    const lineMap = new Map<number, Array<{ text: string; x: number }>>();

    positionedItems.forEach((item) => {
      const lineKey = Math.round(item.y / 2) * 2;
      lineMap.set(lineKey, [...(lineMap.get(lineKey) ?? []), { text: item.text, x: item.x }]);
    });

    const pageText = Array.from(lineMap.entries())
      .sort(([leftY], [rightY]) => rightY - leftY)
      .map(([, items]) => items.sort((left, right) => left.x - right.x).map((item) => item.text).join("\t"))
      .join("\n")
      .trim();

    if (pageText) pages.push(pageText);
  }

  const text = pages.join("\n\n");

  if (!text && sawImage) {
    onWarning(`${file.name} appears to be a scanned PDF (images with no text layer). OCR is not available in the browser yet - convert it to searchable text or paste the request manually.`);
  } else if (!text) {
    onWarning(`${file.name} contained no extractable text.`);
  } else if (truncated) {
    // Truncation warning was already emitted above.
  }

  return text;
}

async function extractDocxText(file: File) {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return String(result.value || "").trim();
}

function xmlDocument(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function spreadsheetColumnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return letters.split("").reduce((value, letter) => (value * 26) + letter.charCodeAt(0) - 64, 0) - 1;
}

async function extractXlsxText(file: File) {
  const { default: JSZip } = await import("jszip");
  const workbook = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedStringsXml = await workbook.file("xl/sharedStrings.xml")?.async("string");
  const sharedStrings = sharedStringsXml
    ? Array.from(xmlDocument(sharedStringsXml).querySelectorAll("si")).map((node) =>
        Array.from(node.querySelectorAll("t")).map((textNode) => textNode.textContent ?? "").join(""))
    : [];
  const worksheets = Object.keys(workbook.files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const output: string[] = [];

  for (const worksheetPath of worksheets) {
    const sheetXml = await workbook.file(worksheetPath)?.async("string");
    if (!sheetXml) continue;
    const sheet = xmlDocument(sheetXml);
    const rows = Array.from(sheet.querySelectorAll("sheetData > row"));

    for (const row of rows) {
      const values: string[] = [];
      for (const cell of Array.from(row.querySelectorAll("c"))) {
        const reference = cell.getAttribute("r") ?? "A1";
        const type = cell.getAttribute("t");
        const rawValue = cell.querySelector("v")?.textContent ?? "";
        const inlineValue = Array.from(cell.querySelectorAll("is t")).map((node) => node.textContent ?? "").join("");
        const value = type === "s"
          ? sharedStrings[Number(rawValue)] ?? ""
          : type === "inlineStr"
            ? inlineValue
            : rawValue;
        values[spreadsheetColumnIndex(reference)] = value;
      }
      const rowText = values.map((value) => String(value ?? "").trim()).join("\t").trim();
      if (rowText) output.push(rowText);
    }
  }

  return output.join("\n");
}

export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  try {
    const warnings: string[] = [];

    if (file.size > MAX_FILE_BYTES) {
      warnings.push(`${file.name} is larger than 20 MB; only smaller readable documents are extracted in the browser. Split the file or paste the request manually.`);
      return {
        fileName: file.name,
        text: "",
        warnings,
      };
    }

    if (readableTextFilePattern.test(file.name)) {
      return {
        fileName: file.name,
        text: await file.text(),
        warnings: [],
      };
    }

    if (docxPattern.test(file.name)) {
      return {
        fileName: file.name,
        text: await extractDocxText(file),
        warnings,
      };
    }

    if (pdfPattern.test(file.name)) {
      return {
        fileName: file.name,
        text: await extractPdfText(file, (warning) => warnings.push(warning)),
        warnings,
      };
    }

    if (xlsxPattern.test(file.name)) {
      return {
        fileName: file.name,
        text: await extractXlsxText(file),
        warnings,
      };
    }

    return {
      fileName: file.name,
      text: "",
      warnings: [extensionWarning(file.name)],
    };
  } catch (error) {
    return {
      fileName: file.name,
      text: "",
      warnings: [`${file.name} could not be extracted: ${error instanceof Error ? error.message : "unknown parser error"}.`],
    };
  }
}

export async function extractDocuments(files: File[]) {
  return Promise.all(files.map(extractDocumentText));
}
