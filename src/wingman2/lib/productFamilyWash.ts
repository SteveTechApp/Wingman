const PRIMARY_FAMILY_WASHES: Record<string, number> = {
  "AMP": 0,
  "APO": 1,
  "CAM": 2,
  "EX": 3,
  "NHD-100": 4,
  "NHD-500": 5,
  "NHD-600": 6,
  "SW": 7,
};

export function productFamilyWashGroup(sku: string): string {
  const normalizedSku = sku.trim().toUpperCase();
  const networkHdSeries = normalizedSku.match(/^NHD-(\d{3})\b/)?.[1];

  if (networkHdSeries?.startsWith("1")) return "NHD-100";
  if (networkHdSeries?.startsWith("5")) return "NHD-500";
  if (networkHdSeries?.startsWith("6")) return "NHD-600";
  if (/^EX(?:\d|[A-Z])*-/.test(normalizedSku)) return "EX";

  return normalizedSku.match(/^([A-Z]+\d*)-/)?.[1] || "OTHER";
}

function familyWashIndex(group: string): number {
  const primary = PRIMARY_FAMILY_WASHES[group];
  if (primary !== undefined) return primary;

  let hash = 2166136261;
  for (const character of group.toLowerCase()) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return 8 + ((hash >>> 0) % 4);
}

export function productFamilyWashClass(sku: string): string {
  return `wm-catalog-group-wash-${familyWashIndex(productFamilyWashGroup(sku))}`;
}
