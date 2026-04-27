import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

export type ExtractedDocument = {
  fileName: string;
  text: string;
  warnings: string[];
};

const readableTextFilePattern = /\.(txt|rtf|md|csv|eml)$/i;
const docxPattern = /\.docx$/i;
const pdfPattern = /\.pdf$/i;

function extensionWarning(fileName: string) {
  if (/\.doc$/i.test(fileName)) {
    return "Legacy .doc files are not supported yet. Convert to DOCX or PDF for extraction.";
  }

  return `${fileName} is not a supported ingest format yet.`;
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: { str?: string }) => item.str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function extractDocxText(file: File) {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return String(result.value || "").trim();
}

export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  try {
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
        warnings: [],
      };
    }

    if (pdfPattern.test(file.name)) {
      return {
        fileName: file.name,
        text: await extractPdfText(file),
        warnings: [],
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
