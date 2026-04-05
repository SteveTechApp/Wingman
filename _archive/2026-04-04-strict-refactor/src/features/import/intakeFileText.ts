import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import type { ProjectAttachment } from "@/features/projects/projectStore";

export type IntakeImportedFileStatus = "ready" | "needs-summary" | "unsupported" | "error";

export type IntakeImportedFile = {
  id: string;
  fingerprint: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  attachmentKind: ProjectAttachment["kind"];
  extractedText: string;
  excerpt: string;
  status: IntakeImportedFileStatus;
  statusMessage: string;
};

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".json",
  ".log",
  ".rtf",
  ".eml",
]);

let pdfWorkerConfigured = false;

function extensionOf(fileName: string): string {
  const normalized = fileName.toLowerCase().trim();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
}

function makeFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clipText(value: string, maxChars: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function normalizeText(value: string): string {
  return value
    .split(String.fromCharCode(0))
    .join(" ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildExcerpt(value: string, fallback: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return fallback;
  return clipText(normalized, 240);
}

function resolveSupportedTextMode(file: File): "text" | "docx" | "pdf" | "unsupported" {
  const extension = extensionOf(file.name);
  const contentType = file.type.toLowerCase();

  if (
    TEXT_EXTENSIONS.has(extension) ||
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("message/rfc822")
  ) {
    return "text";
  }

  if (
    extension === ".docx" ||
    contentType.includes("wordprocessingml.document") ||
    contentType.includes("msword")
  ) {
    return "docx";
  }

  if (extension === ".pdf" || contentType === "application/pdf") {
    return "pdf";
  }

  return "unsupported";
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!pdfWorkerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
    pdfWorkerConfigured = true;
  }

  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const document = await task.promise;

  try {
    const pages: string[] = [];

    for (let index = 1; index <= document.numPages; index += 1) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => {
          const candidate = item as { str?: string };
          return candidate.str ?? "";
        })
        .join(" ");

      const normalized = normalizeText(text);
      if (normalized) {
        pages.push(normalized);
      }
    }

    return pages.join("\n\n");
  } finally {
    await document.destroy();
  }
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return normalizeText(result.value ?? "");
}

async function extractText(file: File): Promise<string> {
  const mode = resolveSupportedTextMode(file);

  if (mode === "text") {
    return normalizeText(await file.text());
  }

  if (mode === "docx") {
    return extractDocxText(await file.arrayBuffer());
  }

  if (mode === "pdf") {
    return extractPdfText(await file.arrayBuffer());
  }

  return "";
}

export async function importIntakeFile(
  file: File,
  attachmentKind: ProjectAttachment["kind"],
): Promise<IntakeImportedFile> {
  const fingerprint = makeFingerprint(file);
  const mode = resolveSupportedTextMode(file);
  const id = makeId("intake_file");

  if (mode === "unsupported") {
    return {
      id,
      fingerprint,
      name: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      attachmentKind,
      extractedText: "",
      excerpt: buildExcerpt("", "Uploaded for reference only."),
      status: "unsupported",
      statusMessage: "Attached for reference only. Add a manual summary below so Wingman can use it.",
    };
  }

  try {
    const extractedText = clipText(await extractText(file), 18000);

    if (!extractedText) {
      return {
        id,
        fingerprint,
        name: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        attachmentKind,
        extractedText: "",
        excerpt: buildExcerpt("", "No selectable text found."),
        status: "needs-summary",
        statusMessage: "No selectable text was found. Add a short manual summary so the intake can use it.",
      };
    }

    return {
      id,
      fingerprint,
      name: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      attachmentKind,
      extractedText,
      excerpt: buildExcerpt(extractedText, "Uploaded and ready."),
      status: "ready",
      statusMessage: "Text extracted and ready for interrogation.",
    };
  } catch (error) {
    return {
      id,
      fingerprint,
      name: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      attachmentKind,
      extractedText: "",
      excerpt: buildExcerpt("", "Upload could not be interrogated."),
      status: "error",
      statusMessage: error instanceof Error
        ? `Unable to read this file automatically: ${error.message}`
        : "Unable to read this file automatically. Add a manual summary below.",
    };
  }
}

export function mergeImportedFiles(
  current: IntakeImportedFile[],
  incoming: IntakeImportedFile[],
): IntakeImportedFile[] {
  const byFingerprint = new Map<string, IntakeImportedFile>();

  for (const item of current) {
    byFingerprint.set(item.fingerprint, item);
  }

  for (const item of incoming) {
    byFingerprint.set(item.fingerprint, item);
  }

  return Array.from(byFingerprint.values());
}
