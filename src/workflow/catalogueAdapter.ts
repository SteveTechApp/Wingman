export type CatalogItem = {
  sku: string;
  name: string;
  family: string;
  category: string;
  tags: string[];
  sourcePath: string;
};

const CATALOG_PATHS = [
  "/src/data/catalog/products.json",
  "/src/data/products.json",
  "/src/data/catalogue.json",
  "/src/catalog/products.json",
  "/src/catalog/catalogue.json",
];

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;,|]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function toItem(raw: Record<string, unknown>, sourcePath: string): CatalogItem | null {
  const sku = pick(raw, ["sku", "SKU", "model", "Model", "partNumber", "part_number"]);
  const name = pick(raw, ["name", "title", "productName", "product_name", "description"]);
  const family = pick(raw, ["family", "productFamily", "product_family", "series"]);
  const category = pick(raw, ["category", "type", "productType", "product_type"]);
  const tags = asArray(raw["tags"]);

  if (!sku && !name) return null;

  return {
    sku: sku || name,
    name: name || sku,
    family: family || "General",
    category: category || "General",
    tags,
    sourcePath,
  };
}

async function tryLoadFromPath(path: string): Promise<CatalogItem[] | null> {
  try {
    const mod = await import(/* @vite-ignore */ path);
    const raw = mod?.default ?? mod;
    if (!Array.isArray(raw)) return null;

    const items = raw
      .map((r) => toItem(r as Record<string, unknown>, path))
      .filter((v): v is CatalogItem => !!v);

    return items;
  } catch {
    return null;
  }
}

export async function loadCatalogItems(): Promise<{ items: CatalogItem[]; sourcePath: string | null }> {
  for (const path of CATALOG_PATHS) {
    const items = await tryLoadFromPath(path);
    if (items && items.length > 0) {
      return { items, sourcePath: path };
    }
  }

  return { items: [], sourcePath: null };
}