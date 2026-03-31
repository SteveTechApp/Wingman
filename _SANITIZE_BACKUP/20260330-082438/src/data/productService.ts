import skuData from "@/data/wyrestormSkuCatalog.2026.json";

export type WingmanProduct = {
  sku: string;
  name: string;
  category?: string;
  technology?: string;
  description?: string;
  features?: string[];
  inputs?: string[];
  outputs?: string[];
  applications?: string[];
  url?: string;
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,|;/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function getAllProducts(): WingmanProduct[] {
  return (skuData as Record<string, unknown>[])
    .map((p) => ({
      sku: String(p.sku ?? p.SKU ?? "").trim(),
      name: String(p.name ?? p.productName ?? p.title ?? "").trim(),
      category: String(p.category ?? p.family ?? p.group ?? "").trim(),
      technology: String(p.technology ?? p.transport ?? p.platform ?? "").trim(),
      description: String(p.summary ?? p.description ?? p.overview ?? "").trim(),
      features: asStringArray(p.featureTags ?? p.features ?? p.keyFeatures),
      inputs: asStringArray(p.inputs ?? p.inputConnections),
      outputs: asStringArray(p.outputs ?? p.outputConnections),
      applications: asStringArray(p.applications ?? p.useCases),
      url: String(p.productUrl ?? p.url ?? "https://www.wyrestorm.com").trim(),
    }))
    .filter((p) => p.sku || p.name);
}