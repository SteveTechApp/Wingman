import type { ProductMediaSet } from "../types/productPositioning";

export type ProductMediaIndex = {
  meta?: {
    generatedAt?: string;
    source?: string;
    productCount?: number;
    mediaRecordCount?: number;
    withFront?: number;
    withRear?: number;
    verifiedFrontBack?: number;
  };
  products: ProductMediaSet[];
  lookup: Record<string, ProductMediaSet>;
};

const mediaIndexSources = [
  "/product-media-index.json",
  "/wingman/product-media-index.json",
];

let productMediaIndexPromise: Promise<ProductMediaIndex | null> | null = null;

function normaliseSku(value: string): string {
  return value.trim().toUpperCase();
}

function isProductMediaIndex(value: unknown): value is ProductMediaIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ProductMediaIndex>;
  return Array.isArray(candidate.products) && typeof candidate.lookup === "object" && candidate.lookup !== null;
}

async function fetchProductMediaIndex(): Promise<ProductMediaIndex | null> {
  for (const source of mediaIndexSources) {
    try {
      const response = await fetch(source, { cache: "no-store" });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as unknown;

      if (isProductMediaIndex(data)) {
        return data;
      }
    } catch {
      // Try the next public path. The app may be hosted under /wingman.
    }
  }

  return null;
}

export function loadProductMediaIndex(): Promise<ProductMediaIndex | null> {
  productMediaIndexPromise ??= fetchProductMediaIndex();
  return productMediaIndexPromise;
}

export function getProductMediaBySku(index: ProductMediaIndex | null, sku: string): ProductMediaSet | undefined {
  if (!index) {
    return undefined;
  }

  const normalisedSku = normaliseSku(sku);
  const exact = index.lookup[normalisedSku];

  if (exact) {
    return exact;
  }

  if (/^NHD-500[-\s]/.test(normalisedSku)) {
    return index.products.find((item) => normaliseSku(item.sku).startsWith("NHD-500-"));
  }

  if (/^MX-0403-H3-MST/.test(normalisedSku)) {
    return index.lookup["MX-0403-H3-MST"] ?? index.lookup["MX-0403-MST"];
  }

  if (/^MX-0808-KIT/.test(normalisedSku)) {
    return index.lookup["MX-0808-KIT-V2"] ?? index.lookup["MX-0808-KIT"];
  }

  return undefined;
}
