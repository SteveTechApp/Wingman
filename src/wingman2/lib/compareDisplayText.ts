export function cleanCompareDisplayText(value: unknown): string {
  const raw = String(value ?? "");

  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\u009d/g, '"')
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/Â·/g, " - ")
    .replace(/Â/g, " ")
    .replace(/™/g, " TM")
    .replace(/®/g, "")
    .replace(/©/g, "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,.;:]){2,}/g, "$1")
    .trim();
}

export function compactVerdictLabel(verdict: string): string {
  if (verdict === "match") return "OK";
  if (verdict === "no-match") return "NO";
  if (verdict === "plus") return "+";
  return "CHK";
}

export function cleanCompareDisplayBlock(value: unknown, maxLength = 260): string {
  const cleaned = cleanCompareDisplayText(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength).trim()}...`;
}