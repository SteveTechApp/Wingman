import type {
  CatalogueFilterGroup,
  CatalogueFilters,
  CatalogueTechnology,
  CatalogueProduct,
  ProductCardView,
} from "./catalogue.types";

function normalise(value: string): string {
  return value.toLowerCase().replace(/[\s/_-]+/g, "");
}

function scoreProduct(product: CatalogueProduct, search: string): number {
  const q = normalise(search);
  if (!q) return 0;

  const sku = normalise(product.sku);
  const name = normalise(product.name);
  const tech = product.technologyTags.map(normalise).join(" ");
  const category = normalise(product.category);
  const subType = normalise(product.subType);
  const summary = normalise(product.summary);
  const tags = product.featureTags.map(normalise);
  const apps = product.applications.map(normalise);

  let score = 0;

  if (sku === q) score += 100;
  if (sku.includes(q)) score += 40;
  if (name.includes(q)) score += 25;
  if (tech.includes(q)) score += 20;
  if (category.includes(q)) score += 15;
  if (subType.includes(q)) score += 14;
  if (summary.includes(q)) score += 10;
  if (tags.some((tag) => tag.includes(q))) score += 18;
  if (apps.some((app) => app.includes(q))) score += 8;

  return score;
}

function getProductLineKey(product: CatalogueProduct): string {
  const sku = (product.sku ?? "").toUpperCase().trim();
  const name = (product.name ?? "").trim();

  const skuFamily =
    sku.match(/^(NHD-\d{3,4})/)?.[1] ??
    sku.match(/^(APO-\d{3,4}(?:-UC)?)/)?.[1] ??
    sku.match(/^(MX-\d{4,}(?:-[A-Z0-9]+)?)/)?.[1] ??
    sku.match(/^(SW-\d{3,4}[A-Z]?)/)?.[1] ??
    sku.match(/^(EX-\d{2,4}[A-Z0-9-]*)/)?.[1] ??
    sku.match(/^(CAB-[A-Z0-9-]+)/)?.[1] ??
    sku.match(/^([A-Z]+-\d{2,4})/)?.[1] ??
    sku.match(/^([A-Z]{2,8})/)?.[1];

  if (skuFamily) {
    return skuFamily;
  }

  const nameFamily =
    name.match(/^([A-Za-z]+(?:\s+[A-Za-z0-9]+){0,2})/)?.[1]
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") ?? "misc";

  return nameFamily;
}

function getNormalisedTechnologyBucket(value: string): string {
  const v = normalise(value);

  if (v === "hdbaset" || v === "hdbaset20") {
    return "hdbaset20";
  }

  if (v === "hdbaset30" || v === "hdbt30" || v === "hdbaset3") {
    return "hdbaset30";
  }

  return v;
}

function matchesOneOf(selected: string[], actual: string): boolean {
  if (selected.length === 0) {
    return true;
  }

  const actualNorm = getNormalisedTechnologyBucket(actual);
  return selected.some((item) => getNormalisedTechnologyBucket(item) === actualNorm);
}

function matchesTechnology(selected: CatalogueTechnology[], actual: CatalogueTechnology[]): boolean {
  if (selected.length === 0) {
    return true;
  }

  const actualNorm = new Set(actual.map(getNormalisedTechnologyBucket));
  return selected.some((item) => actualNorm.has(getNormalisedTechnologyBucket(item)));
}

function matchesAnyTag(selected: string[], actualTags: string[]): boolean {
  if (selected.length === 0) {
    return true;
  }

  const actualNorm = new Set(actualTags.map((tag) => normalise(tag)));
  return selected.some((tag) => actualNorm.has(normalise(tag)));
}

export type CatalogueSort = "relevance" | "sku-asc" | "sku-desc" | "technology";

export type CatalogueProductGroup = {
  key: CatalogueTechnology;
  title: CatalogueTechnology;
  items: ProductCardView[];
  categories: string[];
  subTypes: string[];
};

export function filterProducts(
  products: CatalogueProduct[],
  filters: CatalogueFilters,
  sortBy: CatalogueSort
): ProductCardView[] {
  const filtered = products
    .map((product) => ({
      ...product,
      score: scoreProduct(product, filters.search),
    }))
    .filter((product) => {
      const technologyMatch = matchesOneOf(filters.technology, product.technology);
      const technologyTagMatch = matchesTechnology(filters.technology, product.technologyTags);
      const categoryMatch = matchesOneOf(filters.category, product.category);
      const subTypeMatch = matchesOneOf(filters.subType, product.subType);
      const statusMatch = matchesOneOf(filters.status, product.status);
      const featureMatch = matchesAnyTag(filters.featureTags, product.featureTags);

      if (!technologyMatch && !technologyTagMatch) {
        return false;
      }

      if (!categoryMatch) {
        return false;
      }

      if (!subTypeMatch) {
        return false;
      }

      if (!statusMatch) {
        return false;
      }

      if (!featureMatch) {
        return false;
      }

      if (!filters.search.trim()) {
        return true;
      }

      return (product.score ?? 0) > 0;
    });

  filtered.sort((a, b) => {
    const aLine = getProductLineKey(a);
    const bLine = getProductLineKey(b);

    if (sortBy === "sku-asc") {
      return aLine.localeCompare(bLine) || a.sku.localeCompare(b.sku);
    }

    if (sortBy === "sku-desc") {
      return aLine.localeCompare(bLine) || b.sku.localeCompare(a.sku);
    }

    if (sortBy === "technology") {
      return (
        a.technology.localeCompare(b.technology) ||
        aLine.localeCompare(bLine) ||
        a.sku.localeCompare(b.sku)
      );
    }

    if (filters.search.trim()) {
      return (
        (b.score ?? 0) - (a.score ?? 0) ||
        aLine.localeCompare(bLine) ||
        a.sku.localeCompare(b.sku)
      );
    }

    return aLine.localeCompare(bLine) || a.sku.localeCompare(b.sku);
  });

  return filtered;
}

export function uniqueValues<T>(items: readonly T[]): T[] {
  return [...new Set<T>(items)];
}

export function groupProductsByTechnology(products: ProductCardView[]): CatalogueProductGroup[] {
  const groups = new Map<CatalogueTechnology, CatalogueProductGroup>();

  for (const product of products) {
    const existing = groups.get(product.technology);

    if (existing) {
      existing.items.push(product);
      if (product.category && !existing.categories.includes(product.category)) {
        existing.categories.push(product.category);
      }
      if (product.subType && !existing.subTypes.includes(product.subType)) {
        existing.subTypes.push(product.subType);
      }
      continue;
    }

    groups.set(product.technology, {
      key: product.technology,
      title: product.technology,
      items: [product],
      categories: product.category ? [product.category] : [],
      subTypes: product.subType ? [product.subType] : [],
    });
  }

  return Array.from(groups.values());
}

function formatSubTypeSummary(subTypes: string[]): string | undefined {
  if (subTypes.length === 0) return undefined;
  const preview = subTypes.slice(0, 3).join(" · ");
  const extraCount = Math.max(subTypes.length - 3, 0);
  return extraCount > 0 ? `${preview} +${extraCount} more` : preview;
}

export function buildFilterGroups(
  products: CatalogueProduct[],
  mode: "subType" | "feature"
): CatalogueFilterGroup[] {
  const groups = new Map<string, { items: Set<string>; subTypes: Set<string> }>();

  for (const product of products) {
    const title = product.category || "Product";
    const existing = groups.get(title) ?? { items: new Set<string>(), subTypes: new Set<string>() };

    if (product.subType) {
      existing.subTypes.add(product.subType);
    }

    if (mode === "subType") {
      if (product.subType) {
        existing.items.add(product.subType);
      }
    } else {
      for (const tag of product.featureTags) {
        if (tag) existing.items.add(tag);
      }
    }

    groups.set(title, existing);
  }

  return Array.from(groups.entries())
    .map(([title, group]) => ({
      key: normalise(title) || title,
      title,
      subtitle: mode === "feature" ? formatSubTypeSummary(Array.from(group.subTypes).sort()) : undefined,
      items: Array.from(group.items).sort((left, right) => left.localeCompare(right)),
    }))
    .filter((group) => group.items.length > 0)
    .sort((left, right) => left.title.localeCompare(right.title));
}
