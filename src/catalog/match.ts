import type { CatalogMatchRequest, CatalogMatchResult, CatalogProduct } from "./types";

function tidy(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function scoreCatalogMatch(
  product: CatalogProduct,
  request?: CatalogMatchRequest
): CatalogMatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (!request) {
    return { product, score, reasons };
  }

  if (request.family && tidy(request.family) === tidy(product.family)) {
    score += 30;
    reasons.push("Family match");
  }

  if (request.category && tidy(request.category) === tidy(product.category)) {
    score += 20;
    reasons.push("Category match");
  }

  if (
    request.transport &&
    request.transport !== "All" &&
    tidy(request.transport) === tidy(product.transport)
  ) {
    score += 15;
    reasons.push("Transport match");
  }

  if (typeof request.minDistanceM === "number") {
    const distance = Number(product.distance?.meters || 0);
    if (distance >= request.minDistanceM) {
      score += 15;
      reasons.push(`Distance >= ${request.minDistanceM}m`);
    }
  }

  const productTags = new Set((product.normalizedTags || []).map((x) => tidy(x)));
  const requiredFeatures = Array.isArray(request.requiredFeatures)
    ? request.requiredFeatures.map((x) => tidy(x)).filter(Boolean)
    : [];

  for (const feature of requiredFeatures) {
    if (productTags.has(feature)) {
      score += 10;
      reasons.push(`Feature: ${feature}`);
    }
  }

  if (request.q) {
    const q = tidy(request.q);
    const blob = (product.matchKeywords || []).join(" ");
    if (blob.includes(q)) {
      score += 10;
      reasons.push("Keyword match");
    }
  }

  return { product, score, reasons };
}

export function rankCatalogMatches(
  products: CatalogProduct[],
  request?: CatalogMatchRequest
): CatalogMatchResult[] {
  return products
    .map((product) => scoreCatalogMatch(product, request))
    .sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku));
}