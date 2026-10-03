import lifecycleSource from "../../../data-sources/wyrestorm/lifecycle.csv?raw";
import { normaliseSkuKey, resolveWyrestormSkuAlias } from "./skuAliasResolver";
import { isSkuAdminBlocked } from "./adminProductOverrides";

export type WyreStormSkuBusinessStatus =
  | "active"
  | "discontinued"
  | "do-not-spec"
  | "cable"
  | "unlisted";

function canonicalSkuKey(value: unknown): string {
  return normaliseSkuKey(resolveWyrestormSkuAlias(String(value ?? "")));
}

function sourceSkuKey(value: unknown): string {
  return normaliseSkuKey(String(value ?? ""));
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function records(source: string): Record<string, string>[] {
  const [headers = [], ...rows] = parseCsv(source);
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

const lifecycleRecords = records(lifecycleSource);
const lifecycleBySku = new Map(
  lifecycleRecords.map((row) => [sourceSkuKey(row.sku), row.lifecycle_status.toLowerCase()]),
);
const CABLE_SKU_KEYS = new Set(
  lifecycleRecords
    .filter((row) => row.business_status.toLowerCase() === "cable")
    .map((row) => sourceSkuKey(row.sku)),
);
const ACTIVE_SKU_KEYS = new Set(
  [...lifecycleBySku].filter(([, status]) => status === "active").map(([sku]) => sku),
);
const DISCONTINUED_SKU_KEYS = new Set(
  [...lifecycleBySku]
    .filter(([, status]) => ["discontinued", "eol", "superseded", "archive"].includes(status))
    .map(([sku]) => sku),
);
const DO_NOT_SPEC_SKU_KEYS = new Set(
  [...lifecycleBySku].filter(([, status]) => status === "do-not-spec").map(([sku]) => sku),
);

export function getWyreStormForbiddenBusinessSkus(): string[] {
  return [
    ...new Set([
      ...lifecycleRecords.filter((row) => row.lifecycle_status === "do-not-spec").map((row) => row.sku),
      ...lifecycleRecords.filter((row) => row.business_status.toLowerCase() === "cable").map((row) => row.sku),
    ]),
  ];
}

function isDefinitiveKey(key: string): boolean {
  return (
    ACTIVE_SKU_KEYS.has(key) || DISCONTINUED_SKU_KEYS.has(key) || DO_NOT_SPEC_SKU_KEYS.has(key) || CABLE_SKU_KEYS.has(key)
  );
}

export function getWyreStormSkuBusinessStatus(sku: string): WyreStormSkuBusinessStatus {
  const exactKey = sourceSkuKey(sku);
  const canonicalKey = canonicalSkuKey(sku);

  if (!exactKey) {
    return "unlisted";
  }

  // The raw/typed SKU's own explicit lifecycle status wins whenever the CSV
  // gives one of the four definitive statuses (active/discontinued/do-not-spec/
  // cable) - a SKU's real recorded status must never be overridden by an alias.
  // Only when the raw key is either absent entirely, or present with a
  // non-definitive placeholder status (the CSV importer writes a "review" row
  // whenever it couldn't find the exact legacy string in the source business
  // lists), do we fall through to the alias-resolved canonical SKU. Without
  // this, a legacy alias with a vague import placeholder (e.g. "NHD-610-TX",
  // whose canonical replacement "NHD-610-TX-V2" is confirmed active) would be
  // reported as unresolved forever, even though skuAliasResolver.ts already
  // knows exactly what current product it maps to.
  const effectiveKey = isDefinitiveKey(exactKey) ? exactKey : canonicalKey;

  if (DISCONTINUED_SKU_KEYS.has(effectiveKey)) {
    return "discontinued";
  }

  if (DO_NOT_SPEC_SKU_KEYS.has(effectiveKey)) {
    return "do-not-spec";
  }

  if (CABLE_SKU_KEYS.has(effectiveKey)) {
    return "cable";
  }

  if (ACTIVE_SKU_KEYS.has(effectiveKey)) {
    return "active";
  }

  return "unlisted";
}

export function isWyreStormSkuCompareLeadAllowed(sku: string): boolean {
  return getWyreStormSkuBusinessStatus(sku) === "active" && !isSkuAdminBlocked(sku);
}

export function getWyreStormCompareLeadBlockReason(sku: string): string | null {
  const status = getWyreStormSkuBusinessStatus(sku);
  const adminBlocked = isSkuAdminBlocked(sku);

  if ((status === "active" || status === "unlisted") && adminBlocked) {
    return `${sku} is blocked by an admin override and must not be suggested as a current compare lead.`;
  }

  switch (status) {
    case "active":
      return null;
    case "discontinued":
      return `${sku} is marked discontinued in the 2026 WyreStorm business list and must not be suggested as a current compare lead.`;
    case "do-not-spec":
      return `${sku} is on the 2026 WyreStorm do-not-spec list and must not be positioned as a compare lead.`;
    case "cable":
      return `${sku} is a cable/accessory SKU in the 2026 business list and must not be suggested as a lead product direction.`;
    case "unlisted":
    default:
      return `${sku} is not present in the current 2026 active, discontinued, do-not-spec or cable business lists. Treat it as unresolved compare-risk until reviewed.`;
  }
}
