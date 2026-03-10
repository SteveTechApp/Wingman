import * as skuSource from "@/data/wyrestormSkuCatalog.2026";
import { listAll } from "@/catalog/CatalogService";

export type BoundCatalogueItem = {
  sku: string;
  family: string;
  title: string;
  note: string;
};

type AnyRecord = Record<string, unknown>;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" ? (value as AnyRecord) : null;
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function pickItemsFromSkuModule(): AnyRecord[] {
  const root = skuSource as unknown as AnyRecord;

  const candidates: unknown[] = [
    root.default,
    root.catalog,
    root.items,
    root.WyreStormSkuCatalog,
    root.default && asRecord(root.default)?.items,
    root.catalog && asRecord(root.catalog)?.items,
    root.default && asRecord(root.default)?.catalog,
    root.default && asRecord(root.default)?.default,
  ];

  for (const candidate of candidates) {
    const directArray = asArray<AnyRecord>(candidate);
    if (directArray.length > 0) return directArray;

    const rec = asRecord(candidate);
    if (!rec) continue;

    const items = asArray<AnyRecord>(rec.items);
    if (items.length > 0) return items;
  }

  const nestedDefault = asRecord(root.default);
  if (nestedDefault) {
    const nestedItems = asArray<AnyRecord>(nestedDefault.items);
    if (nestedItems.length > 0) return nestedItems;
  }

  return [];
}

function mapSkuItem(item: AnyRecord): BoundCatalogueItem {
  const sku = text(item.sku, "UNKNOWN-SKU");
  const family = text(item.family, "General");
  const description = text(item.description);
  const name = text(item.name);
  const title = name || description || sku;
  const tier = text(item.tier);
  const category = text(item.category);
  const noteParts = [description, category, tier].filter(Boolean);

  return {
    sku,
    family,
    title,
    note: noteParts.join(" · ") || "Live SKU catalog item",
  };
}

function getSkuModuleItems(): BoundCatalogueItem[] {
  const rows = pickItemsFromSkuModule();
  return rows
    .map(mapSkuItem)
    .filter((x) => x.sku && x.title);
}

function getCatalogServiceItems(): BoundCatalogueItem[] {
  try {
    const rows = listAll() as unknown as AnyRecord[];
    return asArray<AnyRecord>(rows)
      .map((item) => ({
        sku: text(item.sku, "UNKNOWN-SKU"),
        family: text(item.family, "General"),
        title: text(item.name) || text(item.title) || text(item.sku, "Unnamed Product"),
        note:
          text(item.category) ||
          text(item.role) ||
          text(item.transport) ||
          "Catalog service item",
      }))
      .filter((x) => x.sku && x.title);
  } catch {
    return [];
  }
}

export function getLiveCatalogueItems(): BoundCatalogueItem[] {
  const fromSkuModule = getSkuModuleItems();
  if (fromSkuModule.length > 0) {
    return fromSkuModule.sort((a, b) => a.sku.localeCompare(b.sku));
  }

  const fromCatalogService = getCatalogServiceItems();
  if (fromCatalogService.length > 0) {
    return fromCatalogService.sort((a, b) => a.sku.localeCompare(b.sku));
  }

  return [
    {
      sku: "SW-100-TX",
      family: "HDBaseT",
      title: "Transmitter",
      note: "Fallback catalogue item until live source resolves",
    },
    {
      sku: "SW-100-RX",
      family: "HDBaseT",
      title: "Receiver",
      note: "Fallback catalogue item until live source resolves",
    },
    {
      sku: "NHD-200-TX",
      family: "AVoIP",
      title: "Network Encoder",
      note: "Fallback catalogue item until live source resolves",
    },
  ];
}

export function getLiveCatalogueFamilies(): string[] {
  return Array.from(new Set(getLiveCatalogueItems().map((x) => x.family))).sort((a, b) =>
    a.localeCompare(b),
  );
}