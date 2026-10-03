// Small, framework-independent text helper shared by the Product Call Cards
// page and the Guru glossary renderer. Moved verbatim from
// ProductCallCardsPage.tsx.

export function cleanText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

export function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const clean = value.trim();

    if (!clean) {
      return;
    }

    const key = clean.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(clean);
  });

  return output;
}
