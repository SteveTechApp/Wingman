export type ExtractorResult = { text: string; meta?: Record<string, any> };
export type TextExtractor = (input: unknown) => ExtractorResult;

export function extractPlainText(input: unknown): ExtractorResult {
  if (input == null) return { text: "" };
  if (typeof input === "string") return { text: input };

  // File/Blob: handled async by extractTextFromFile
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return { text: "", meta: { note: "Blob provided; use extractTextFromFile() async." } };
  }

  if (Array.isArray(input)) {
    const joined = input.map(x => extractPlainText(x).text).filter(Boolean).join("\n");
    return { text: joined };
  }

  if (typeof input === "object") {
    try { return { text: JSON.stringify(input, null, 2), meta: { format: "json" } }; }
    catch { return { text: String(input) }; }
  }

  return { text: String(input) };
}

export async function extractFromBlobAsync(blob: Blob): Promise<ExtractorResult> {
  const text = await blob.text();
  return { text, meta: { format: "blobText" } };
}

/**
 * Expected by ImportIntakePage.tsx
 * Reads a File (or Blob) and returns extracted text.
 * Minimal implementation: uses .text() (works for txt, csv, json, many doc exports).
 */
export async function extractTextFromFile(file: File | Blob): Promise<string> {
  const res = await extractFromBlobAsync(file as Blob);
  return res.text || "";
}

export function extractKeyValueLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  (text || "").split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([^:]{2,50})\s*:\s*(.+)\s*$/);
    if (!m) return;
    const key = m[1].trim();
    const val = m[2].trim();
    if (key && val) out[key] = val;
  });
  return out;
}

export const textExtractors = {
  extractPlainText,
  extractFromBlobAsync,
  extractTextFromFile,
  extractKeyValueLines
};

export default textExtractors;