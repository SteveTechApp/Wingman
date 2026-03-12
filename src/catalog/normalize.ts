import type { CatalogFilters, CatalogProduct, CatalogTransport } from "./types";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeTransport(value: unknown): CatalogTransport {
  const v = tidy(value).toLowerCase();

  if (v.includes("hdbaset")) return "HDBaseT";
  if (v.includes("avoip") || v.includes("networkhd")) return "AVoIP";
  if (v.includes("usb")) return "USB Extension";
  if (v.includes("local")) return "Local";

  return "Unknown";
}

export function normalizeFamily(value: unknown): string {
  const v = tidy(value);
  if (!v) return "Unknown";

  const lower = v.toLowerCase();

  if (lower.includes("apollo")) return "Apollo";
  if (lower.includes("networkhd")) return "NetworkHD";
  if (lower.includes("hdbaset")) return "HDBaseT";

  return v;
}

export function normalizeCategory(value: unknown): string {
  const v = tidy(value);
  if (!v) return "Uncategorized";
  return v;
}

export function normalizeCatalogProduct(input: CatalogProduct): CatalogProduct {
  return {
    ...input,
    sku: tidy(input.sku).toUpperCase(),
    name: tidy(input.name),
    family: normalizeFamily(input.family),
    category: normalizeCategory(input.category),
    subcategory: tidy(input.subcategory),
    summary: tidy(input.summary),
    sourceUrl: tidy(input.sourceUrl),
    latency: tidy(input.latency),
    transport: normalizeTransport(input.transport),

    features: Array.isArray(input.features)
      ? input.features.map((x) => tidy(x)).filter(Boolean)
      : [],

    control: Array.isArray(input.control)
      ? input.control.map((x) => tidy(x)).filter(Boolean)
      : [],

    audio: Array.isArray(input.audio)
      ? input.audio.map((x) => tidy(x)).filter(Boolean)
      : [],

    inputs: Array.isArray(input.inputs)
      ? input.inputs.map((x) => ({
          type: tidy(x.type),
          count: Number(x.count || 0),
        }))
      : [],

    outputs: Array.isArray(input.outputs)
      ? input.outputs.map((x) => ({
          type: tidy(x.type),
          count: Number(x.count || 0),
        }))
      : [],
  };
}

export function filterCatalog(
  products: CatalogProduct[],
  filters?: CatalogFilters
): CatalogProduct[] {
  if (!filters) return products;

  const q = tidy(filters.q).toLowerCase();

  return products.filter((p) => {
    if (filters.family && filters.family !== "All" && p.family !== filters.family)
      return false;

    if (filters.category && filters.category !== "All" && p.category !== filters.category)
      return false;

    if (filters.transport && filters.transport !== "All" && p.transport !== filters.transport)
      return false;

    if (filters.status && filters.status !== "All" && p.status !== filters.status)
      return false;

    if (!q) return true;

    const blob = [
      p.sku,
      p.name,
      p.family,
      p.category,
      p.subcategory,
      p.summary,
      ...(p.features || []),
      ...(p.control || []),
      ...(p.audio || []),
    ]
      .join(" ")
      .toLowerCase();

    return blob.includes(q);
  });
}
