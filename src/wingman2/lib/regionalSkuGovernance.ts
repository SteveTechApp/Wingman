import governedTechnicalProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import lifecycleSource from "../../../data-sources/wyrestorm/lifecycle.csv?raw";
import type { StoredProductSelection } from "../data/projectStore";
import type { DesignAssuranceItem } from "./productAssurance";

type UnknownRecord = Record<string, unknown>;

export type RegionalSkuAssuranceInput = {
  products: StoredProductSelection[];
  /** The rep's market/region from the Wingman profile (e.g. "United Kingdom"). */
  region?: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function normaliseSku(value: string): string {
  return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

const REGIONAL_SUFFIXES = ["UK", "US", "EU", "AU", "IN"] as const;
type RegionalSuffix = (typeof REGIONAL_SUFFIXES)[number];

function regionalSuffixOf(sku: string): RegionalSuffix | null {
  const upper = sku.toUpperCase();
  for (const suffix of REGIONAL_SUFFIXES) {
    if (upper.endsWith(`-${suffix}`)) return suffix;
  }
  return null;
}

/**
 * A base SKU (e.g. SW-130-TX) whose regional variants (SW-130-TX-UK /
 * SW-130-TX-US) are the actual orderable products. The base is a family/range
 * reference and must never be quoted directly.
 */
export type RegionalVariantFamily = {
  baseSku: string;
  variants: Record<string, string[]>;
};

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

function lifecycleRecords(source: string): Record<string, string>[] {
  const [headers = [], ...rows] = parseCsv(source);
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

const lifecycleBySku = new Map(
  lifecycleRecords(lifecycleSource).map((row) => [normaliseSku(row.sku), row]),
);

function profileSkus(): string[] {
  const profiles = ((record(governedTechnicalProfiles).profiles as UnknownRecord[]) ?? []);
  return profiles.map((profile) => normaliseSku(text(profile.sku))).filter(Boolean);
}

/**
 * Discovers regional variant families from the governed data. A family exists
 * when a base SKU and one or more regional-suffixed variants share the same
 * stem (e.g. SW-130-TX / SW-130-TX-UK / SW-130-TX-US). The lifecycle CSV
 * explicitly documents these (SW-130-TX is marked "family/range reference, not
 * an individually orderable SKU - real products are the regional variants").
 */
export function regionalVariantFamilies(): RegionalVariantFamily[] {
  // Raw (hyphenated) SKU forms from both governed sources. The lifecycle CSV
  // keys are normalised for status lookup, but the suffix/stem logic needs the
  // real SKU text (SW-130-TX-UK), so collect those separately.
  const rawLifecycleSkus = lifecycleRecords(lifecycleSource).map((row) => row.sku).filter(Boolean);
  const allSkus = Array.from(new Set([...profileSkus(), ...rawLifecycleSkus]));
  const byStem = new Map<string, string[]>();

  for (const sku of allSkus) {
    const suffix = regionalSuffixOf(sku);
    const stem = suffix ? sku.slice(0, -(suffix.length + 1)) : sku;
    const existing = byStem.get(stem) ?? [];
    if (!existing.includes(sku)) existing.push(sku);
    byStem.set(stem, existing);
  }

  const families: RegionalVariantFamily[] = [];
  for (const [baseSku, members] of byStem) {
    const variants: Record<string, string[]> = {};
    let hasVariant = false;
    for (const member of members) {
      const suffix = regionalSuffixOf(member);
      if (!suffix || member === baseSku) continue;
      hasVariant = true;
      const existing = variants[suffix] ?? [];
      if (!existing.includes(member)) existing.push(member);
      variants[suffix] = existing;
    }
    if (hasVariant) families.push({ baseSku, variants });
  }

  return families.sort((a, b) => a.baseSku.localeCompare(b.baseSku));
}

const familyByBaseSku = new Map(
  regionalVariantFamilies().map((family) => [normaliseSku(family.baseSku), family]),
);

function familyForSku(sku: string): RegionalVariantFamily | null {
  const key = normaliseSku(sku);
  const direct = familyByBaseSku.get(key);
  if (direct) return direct;

  // The raw (hyphenated) form carries the region marker; the normalised key
  // does not, so detect the suffix and stem on the original SKU text.
  const suffix = regionalSuffixOf(sku);
  if (!suffix) return null;
  const stem = sku.slice(0, -(suffix.length + 1));
  const family = familyByBaseSku.get(normaliseSku(stem));
  return family ?? null;
}

/**
 * Maps a Wingman profile region string to a regional SKU suffix. Conservative:
 * unknown or ambiguous regions return null so nothing is falsely flagged.
 */
export function regionToSkuSuffix(region: string | undefined): RegionalSuffix | null {
  const value = text(region).toLowerCase();
  if (!value || value === "global" || value === "worldwide") return null;
  if (/\buk\b|united kingdom|britain|ireland|europe|eu\b|emea|gb\b|middle east|africa/.test(value)) return "UK";
  if (/\bus\b|united states|usa|america|north america|canada|mexico/.test(value)) return "US";
  return null;
}

function lifecycleStatusOf(sku: string): string {
  return text(lifecycleBySku.get(normaliseSku(sku))?.lifecycle_status).toLowerCase();
}

/**
 * Regional SKU gating. Catches two real-world traps before they reach a quote:
 *
 * 1. A family/range base SKU (SW-130-TX) is selected instead of the actual
 *    orderable regional variant (SW-130-TX-UK). The lifecycle list marks the
 *    base as a range reference, so this must never be quoted directly.
 * 2. A regional variant is selected for the wrong market (e.g. a UK rep
 *    selecting SW-130-TX-US), or the rep's market variant is unknown while a
 *    regional decision is still required.
 */
export function buildRegionalSkuAssurance(input: RegionalSkuAssuranceInput): DesignAssuranceItem[] {
  const items: DesignAssuranceItem[] = [];

  for (const product of input.products) {
    const sku = text(product.sku);
    const key = normaliseSku(sku);
    const family = familyForSku(sku);

    if (family && key === normaliseSku(family.baseSku)) {
      const variantList = REGIONAL_SUFFIXES
        .flatMap((suffix) => (family.variants[suffix] ?? []).map((variant) => `${variant} (${suffix})`))
        .join(", ");
      items.push({
        id: `regional-base-sku-${key}`,
        severity: "blocker",
        domain: "product",
        sku: sku.toUpperCase(),
        message: `${sku.toUpperCase()} is a family/range reference, not an orderable SKU. The real products are the regional variants: ${variantList}. Select the variant for the customer's market before quoting.`,
      });
      continue;
    }

    if (!family) {
      // A regional-suffixed SKU whose base family is not in the governed data
      // still needs a market sanity check.
      const suffix = regionalSuffixOf(key);
      if (suffix) {
        const status = lifecycleStatusOf(sku);
        if (status === "do-not-spec" || status === "discontinued") {
          items.push({
            id: `regional-inactive-${key}`,
            severity: "blocker",
            domain: "product",
            sku: sku.toUpperCase(),
            message: `${sku.toUpperCase()} is marked ${status.replace("-", " ")} in the governed business list - confirm the correct regional variant for the market before quoting.`,
          });
        }
      }
      continue;
    }

    const suffix = regionalSuffixOf(sku) as RegionalSuffix | null;
    const marketSuffix = regionToSkuSuffix(input.region);

    if (suffix && marketSuffix && suffix !== marketSuffix) {
      const preferred = family.variants[marketSuffix]?.[0];
      const preferredNote = preferred ? ` Select ${preferred} for this market.` : "";
      items.push({
        id: `regional-mismatch-${key}`,
        severity: "warning",
        domain: "product",
        sku: sku.toUpperCase(),
        message: `${sku.toUpperCase()} is a ${suffix} regional variant, but the rep's market is ${text(input.region)} (${marketSuffix}).${preferredNote}`,
      });
    }

    if (!suffix && marketSuffix) {
      const preferred = family.variants[marketSuffix]?.[0];
      if (preferred) {
        items.push({
          id: `regional-variant-required-${key}`,
          severity: "warning",
          domain: "product",
          sku: sku.toUpperCase(),
          message: `${sku.toUpperCase()} has regional variants and the rep's market is ${text(input.region)}. Confirm the correct variant (${preferred} or the applicable market variant) is what is actually being quoted.`,
        });
      }
    }
  }

  return items;
}
