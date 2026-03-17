import { findCatalogProductBySku } from "@/catalog";
import type {
  CompetitorComparisonRecord,
  ComparisonProvenance,
} from "@/services/competitorComparisonService";
import type { DiscoveryProductFamily } from "@/features/projects/projectStore";

export type ManualCompetitorComparisonInput = {
  brand: string;
  competitorSku: string;
  competitorName?: string;
  category?: string;
  summary?: string;
  features?: string[] | string;
  wyrestormSku: string;
  rationale?: string;
  notes?: string[] | string;
};

export type ManualCompetitorComparisonRecord = {
  id: string;
  brand: string;
  competitorSku: string;
  competitorName?: string;
  category?: string;
  summary?: string;
  features: string[];
  wyrestormSku: string;
  rationale?: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "wm_manual_competitor_comparisons_v1";

function nowIso(): string {
  return new Date().toISOString();
}

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeId(value: unknown): string {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function normalizeSku(value: unknown): string {
  return tidy(value).toUpperCase();
}

function dedupeStrings(values: unknown[], limit = 16): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function toArray(value: string[] | string | undefined, separator: RegExp): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(separator).map((item) => item.trim());
  return [];
}

function recordId(brand: string, competitorSku: string): string {
  return `${normalizeId(brand)}::${normalizeSku(competitorSku)}`;
}

function readStorage(): ManualCompetitorComparisonRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ManualCompetitorComparisonRecord[];
    return Array.isArray(parsed) ? parsed.map((record) => sanitize(record)) : [];
  } catch {
    return [];
  }
}

function writeStorage(records: ManualCompetitorComparisonRecord[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.map((record) => sanitize(record))));
  } catch {
  }
}

function sanitize(record: Partial<ManualCompetitorComparisonRecord>): ManualCompetitorComparisonRecord {
  const brand = tidy(record.brand) || "Unknown";
  const competitorSku = normalizeSku(record.competitorSku);
  const createdAt = tidy(record.createdAt) || nowIso();

  return {
    id: tidy(record.id) || recordId(brand, competitorSku),
    brand,
    competitorSku,
    competitorName: tidy(record.competitorName) || undefined,
    category: tidy(record.category) || undefined,
    summary: tidy(record.summary) || undefined,
    features: dedupeStrings(record.features || [], 16),
    wyrestormSku: normalizeSku(record.wyrestormSku),
    rationale: tidy(record.rationale) || undefined,
    notes: dedupeStrings(record.notes || [], 12),
    createdAt,
    updatedAt: tidy(record.updatedAt) || createdAt,
  };
}

function save(records: ManualCompetitorComparisonRecord[]): ManualCompetitorComparisonRecord[] {
  const merged = new Map<string, ManualCompetitorComparisonRecord>();

  for (const record of records.map((item) => sanitize(item))) {
    merged.set(record.id, record);
  }

  const next = Array.from(merged.values()).sort(
    (left, right) =>
      left.brand.localeCompare(right.brand) ||
      left.competitorSku.localeCompare(right.competitorSku),
  );

  writeStorage(next);
  return next;
}

function familiesForWyrestormSku(sku: string): DiscoveryProductFamily[] {
  const product = findCatalogProductBySku(sku);
  if (!product) return [];

  const textBlob = [
    product.family,
    product.category,
    product.subcategory,
    product.transport,
    ...(product.features ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const families: DiscoveryProductFamily[] = [];
  if (textBlob.includes("apollo") || textBlob.includes("presentation") || textBlob.includes("byod")) families.push("Apollo");
  if (textBlob.includes("hdbaset")) families.push("HDBaseT");
  if (textBlob.includes("avoip") || textBlob.includes("networkhd") || textBlob.includes("ip")) families.push("AVoIP");
  if (textBlob.includes("matrix")) families.push("Matrix");
  if (textBlob.includes("usb")) families.push("USB Extension");
  if (textBlob.includes("video wall")) families.push("Video Wall");

  return Array.from(new Set(families));
}

function provenance(): ComparisonProvenance {
  return {
    mode: "curated",
    source: "manual",
    label: "Manual comparison library",
    fetchedAt: nowIso(),
  };
}

export function getManualCompetitorComparisonRecords(): ManualCompetitorComparisonRecord[] {
  return readStorage();
}

export function upsertManualCompetitorComparison(
  input: ManualCompetitorComparisonInput,
): ManualCompetitorComparisonRecord {
  const current = readStorage();
  const existing = current.find(
    (record) => record.id === recordId(input.brand, input.competitorSku),
  );
  const createdAt = existing?.createdAt || nowIso();

  const next = sanitize({
    id: recordId(input.brand, input.competitorSku),
    brand: input.brand,
    competitorSku: input.competitorSku,
    competitorName: input.competitorName,
    category: input.category,
    summary: input.summary,
    features: toArray(input.features, /[,;\n]+/g),
    wyrestormSku: input.wyrestormSku,
    rationale: input.rationale,
    notes: toArray(input.notes, /[\n]+/g),
    createdAt,
    updatedAt: nowIso(),
  });

  save([...current.filter((record) => record.id !== next.id), next]);
  return next;
}

export function deleteManualCompetitorComparison(
  brand: string,
  competitorSku: string,
): void {
  const id = recordId(brand, competitorSku);
  save(readStorage().filter((record) => record.id !== id));
}

export function toManualComparisonRecord(
  record: ManualCompetitorComparisonRecord,
): CompetitorComparisonRecord {
  const wyrestormProduct = findCatalogProductBySku(record.wyrestormSku);
  const recommendedFamilies = familiesForWyrestormSku(record.wyrestormSku);

  return {
    brand: record.brand,
    competitorSku: record.competitorSku,
    competitorName: record.competitorName,
    category: tidy(record.category) || "Manual comparison",
    summary:
      tidy(record.summary) ||
      `${record.brand} ${record.competitorSku} manually mapped by Wingman user.`,
    features: record.features,
    wyrestormSku: wyrestormProduct?.sku || record.wyrestormSku,
    wyrestormName: wyrestormProduct?.name || undefined,
    wyrestormCategory:
      wyrestormProduct
        ? [wyrestormProduct.family, wyrestormProduct.category, wyrestormProduct.subcategory]
            .map((value) => tidy(value))
            .filter(Boolean)
            .join(" / ")
        : "Manual / unverified",
    wyrestormVerified: Boolean(wyrestormProduct),
    confidence: wyrestormProduct ? "Medium" : "Low",
    rationale:
      tidy(record.rationale) ||
      "Manual comparison mapping stored by Wingman user for fallback lookup.",
    recommendedFamilies: recommendedFamilies.length > 0 ? recommendedFamilies : ["Apollo"],
    notes: dedupeStrings(
      [
        ...record.notes,
        wyrestormProduct
          ? "User-maintained comparison mapping."
          : `Stored WyreStorm SKU "${record.wyrestormSku}" is not currently verified in the local catalog.`,
      ],
      10,
    ),
    provenance: provenance(),
  };
}
