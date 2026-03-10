export type BoundCatalogueItem = {
  sku: string;
  family: string;
  title: string;
  note: string;
};

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getFallbackCatalogueItems(): BoundCatalogueItem[] {
  const fromLocal = safeReadJson<BoundCatalogueItem[]>("wm_catalogue_items", []);
  if (fromLocal.length > 0) return fromLocal;

  return [
    {
      sku: "SW-100-TX",
      family: "HDBaseT",
      title: "Transmitter",
      note: "Fallback catalogue item until live SKU source is bound.",
    },
    {
      sku: "SW-100-RX",
      family: "HDBaseT",
      title: "Receiver",
      note: "Fallback catalogue item until live SKU source is bound.",
    },
    {
      sku: "NHD-200-TX",
      family: "AVoIP",
      title: "Network Encoder",
      note: "Fallback catalogue item until live SKU source is bound.",
    },
  ];
}