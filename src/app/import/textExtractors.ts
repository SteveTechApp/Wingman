export type ExtractResult = { text: string; meta?: any };

export function extractPlainText(input: unknown): ExtractResult {
  if (input == null) return { text: "" };
  if (typeof input === "string") return { text: input };
  return { text: "", meta: { note: "Unsupported" } };
}

export function extractKeyValueLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of (text || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([^:]+):\s*(.+)\s*$/);
    if (!m) continue;
    out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

export default { extractPlainText, extractKeyValueLines };
