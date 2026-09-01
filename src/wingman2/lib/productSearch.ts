import { loadProductIntelligenceIndex } from "./productIntelligenceIndexCache";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface ProductSearchResult {
  sku: string;
  name: string;
  category: string;
  description: string;
  technologies: string[];
  connectors: string[];
  lifecycleStatus: string;
  brand: string;
  classificationPath: string[];
}

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */

function normalise(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesQuery(product: Record<string, unknown>, query: string): boolean {
  const q = normalise(query);
  if (!q) return false;

  // Direct SKU match (exact or prefix) — keep hyphens for SKU matching
  const rawSku = String(product.sku ?? "").toUpperCase();
  const qUpper = query.toUpperCase().replace(/[^A-Z0-9-]+/g, "");
  if (rawSku === qUpper || rawSku.startsWith(qUpper)) return true;

  // Normalised SKU match (handles "NHD120" matching "NHD-120-TX")
  const sku = normalise(product.sku);
  if (sku === q || sku.startsWith(q)) return true;

  // Name match
  const name = normalise(product.name);
  if (name.includes(q)) return true;

  // Description match
  const desc = normalise(product.description || product.summary);
  if (desc.includes(q)) return true;

  // Technology match
  const techs = Array.isArray(product.technologies)
    ? product.technologies.map(normalise).join(" ")
    : "";
  if (techs.includes(q)) return true;

  // Category match
  const cat = normalise(product.category);
  if (cat.includes(q)) return true;

  return false;
}

/**
 * Search the product intelligence index for products matching the query.
 * Returns up to `limit` results, prioritising active products and exact SKU matches.
 */
export async function searchProducts(
  query: string,
  limit = 8,
): Promise<ProductSearchResult[]> {
  if (!query || query.length < 2) return [];

  const index = (await loadProductIntelligenceIndex()) as {
    products?: Array<Record<string, unknown>>;
  };
  const products = index?.products ?? [];

  const matches = products.filter((p) => matchesQuery(p, query));

  // Score results: exact SKU > SKU prefix > name > description
  const q = normalise(query);
  const qUpper = query.toUpperCase().replace(/[^A-Z0-9-]+/g, "");
  const scored = matches.map((p) => {
    const rawSku = String(p.sku ?? "").toUpperCase();
    const sku = normalise(p.sku);
    let score = 0;
    if (rawSku === qUpper || sku === q) score = 100;
    else if (rawSku.startsWith(qUpper) || sku.startsWith(q)) score = 80;
    else if (normalise(p.name).includes(q)) score = 60;
    else score = 40;

    // Boost active products
    if (p.lifecycleStatus === "active" && !p.doNotSpec) score += 10;

    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ product: p }) => ({
    sku: String(p.sku ?? ""),
    name: String(p.name ?? ""),
    category: String(p.category ?? ""),
    description: String(p.description || p.summary || ""),
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    connectors: Array.isArray(p.connectors) ? p.connectors : [],
    lifecycleStatus: String(p.lifecycleStatus ?? ""),
    brand: String(p.brand ?? "WyreStorm"),
    classificationPath: Array.isArray(p.classificationPath) ? p.classificationPath : [],
  }));
}
