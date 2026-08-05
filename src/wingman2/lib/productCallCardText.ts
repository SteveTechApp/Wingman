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
