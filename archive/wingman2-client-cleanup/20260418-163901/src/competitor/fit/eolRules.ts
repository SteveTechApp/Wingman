const EOL_PATTERNS: RegExp[] = [
  /^NHD-4\d{2}/i,
  /^NHD-400/i,
  /^NHD-410/i,
  /^NHD-420/i,
  /^NHD-440/i
];

export function isEolSku(sku: string): boolean {
  const value = String(sku || "").trim();
  return EOL_PATTERNS.some((pattern) => pattern.test(value));
}

export function filterActiveSkus<T extends { sku: string }>(items: T[]): T[] {
  return items.filter((item) => !isEolSku(item.sku));
}