/**
 * The compare page's text vocabulary: one keyword test over an uppercased
 * product blob, and the de-duplicating list tags are collected through.
 *
 * They live here because two layers read them — the page's own profile and
 * scoring helpers, and the product taxonomy below — and neither should own the
 * other's tokens.
 */
export function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function uniqueSkuOptions(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
