function replaceKnownMojibake(value: string): string {
  return value
    .split("\u00E2\u0080\u0099")
    .join("'")
    .split("\u00E2\u0080\u0098")
    .join("'")
    .split("\u00E2\u0080\u009C")
    .join('"')
    .split("\u00E2\u0080\u009D")
    .join('"')
    .split("\u00E2\u0080\u0093")
    .join("-")
    .split("\u00E2\u0080\u0094")
    .join("-")
    .split("\u00C2\u00B7")
    .join(" - ")
    .split("\u00C2")
    .join(" ");
}

function removeUnsafeDisplayCharacters(value: string): string {
  let output = "";

  for (const character of value) {
    const code = character.charCodeAt(0);

    if (code < 32 || code === 127 || code > 126) {
      output += " ";
      continue;
    }

    output += character;
  }

  return output;
}

export function cleanCompareDisplayText(value: unknown): string {
  const raw = String(value ?? "");
  const normalised = replaceKnownMojibake(raw);

  return removeUnsafeDisplayCharacters(normalised)
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
