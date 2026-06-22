import activeSkuSource from "../../../WyreStorm Active SKU 2026.txt?raw";
import cableSkuSource from "../../../Wyrestorm Cables 2026.txt?raw";
import discontinuedSkuSource from "../../../WyreStorm Discon Products 2026.txt?raw";
import doNotSpecSkuSource from "../../../Wyrestorm Do Not Spec List 2026.txt?raw";
import { normaliseSkuKey, resolveWyrestormSkuAlias } from "./skuAliasResolver";

export type WyreStormSkuBusinessStatus =
  | "active"
  | "discontinued"
  | "do-not-spec"
  | "cable"
  | "unlisted";

function canonicalSkuKey(value: unknown): string {
  return normaliseSkuKey(resolveWyrestormSkuAlias(String(value ?? "")));
}

function parseSkuSource(source: string): Set<string> {
  const values = source
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((sku) => canonicalSkuKey(sku))
    .filter(Boolean);

  return new Set(values);
}

const ACTIVE_SKU_KEYS = parseSkuSource(activeSkuSource);
const DISCONTINUED_SKU_KEYS = parseSkuSource(discontinuedSkuSource);
const DO_NOT_SPEC_SKU_KEYS = parseSkuSource(doNotSpecSkuSource);
const CABLE_SKU_KEYS = parseSkuSource(cableSkuSource);

export function getWyreStormSkuBusinessStatus(sku: string): WyreStormSkuBusinessStatus {
  const key = canonicalSkuKey(sku);

  if (!key) {
    return "unlisted";
  }

  if (ACTIVE_SKU_KEYS.has(key)) {
    return "active";
  }

  if (DISCONTINUED_SKU_KEYS.has(key)) {
    return "discontinued";
  }

  if (DO_NOT_SPEC_SKU_KEYS.has(key)) {
    return "do-not-spec";
  }

  if (CABLE_SKU_KEYS.has(key)) {
    return "cable";
  }

  return "unlisted";
}

export function isWyreStormSkuCompareLeadAllowed(sku: string): boolean {
  return getWyreStormSkuBusinessStatus(sku) === "active";
}

export function getWyreStormCompareLeadBlockReason(sku: string): string | null {
  switch (getWyreStormSkuBusinessStatus(sku)) {
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
