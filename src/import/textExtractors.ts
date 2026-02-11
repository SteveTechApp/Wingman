
import mammoth from "mammoth";

type ExtractResult = {
  text: string;
  meta: string[];
};

async function extractPdf(file: File): Promise<ExtractResult> {
  const buf = await file.arrayBuffer();

  // Dynamic import avoids TS path issues with legacy subpaths.
  // We also disable the worker for Vite/CSP stability.
  const pdfjsLib: any = await import("pdfjs-dist");

  const loadingTask = pdfjsLib.getDocument({
    data: buf,
    disableWorker: true
  });

  const pdf = await loadingTask.promise;

  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items || [])
      .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
      .filter(Boolean);
    out += strings.join(" ") + "\n";
  }

  return {
    text: out.trim(),
    meta: ["PDF detected", "Pages: " + String(pdf.numPages), "PDF text extracted via pdfjs-dist (worker disabled)"],
  };
}

async function extractDocx(file: File): Promise<ExtractResult> {
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  const meta: string[] = ["DOCX detected", "DOCX extracted via mammoth (raw text)"];
  if (res.messages && res.messages.length) {
    meta.push("DOCX notes: " + res.messages.map(m => m.message).join(" | "));
  }
  return { text: res.value || "", meta };
}

async function extractTxt(file: File): Promise<ExtractResult> {
  const t = await file.text();
  return { text: t, meta: ["Plain text detected"] };
}

export async function extractTextFromFile(file: File): Promise<ExtractResult> {
  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdf(file);
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return extractDocx(file);
  if (name.endsWith(".txt") || file.type === "text/plain") return extractTxt(file);

  return { text: "", meta: ["Unsupported file type (use PDF, DOCX, or TXT)"] };
}



