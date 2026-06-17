export type ProductFamilyScoreLike = {
  family: string;
  score: number;
};

export type ProductShortlistItemLike = {
  sku?: string;
  family?: string;
  category?: string;
  title?: string;
  name?: string;
};

const FAMILY_ALIASES: Record<string, string[]> = {
  networkhd: ["networkhd", "network hd", "nhd", "avoip", "av over ip", "av-over-ip", "ip"],
  matrixhdbaset: ["matrix", "hdbaset", "hd base t", "hd-base-t", "hdbt", "extender"],
  presentationuc: ["presentation", "uc", "byod", "byom", "usb-c", "usbc", "conference", "collaboration"],
  videowallprocessor: ["video wall", "videowall", "wall processor", "processor", "multiview", "multi-view"],
  corereview: ["review", "core"],
};

function normalise(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function familyKey(family: string | undefined): string {
  const normalised = normalise(family);

  if (!normalised) {
    return "corereview";
  }

  if (normalised.includes("networkhd") || normalised.includes("network hd")) {
    return "networkhd";
  }

  if (normalised.includes("matrix") || normalised.includes("hdbaset") || normalised.includes("hd base t")) {
    return "matrixhdbaset";
  }

  if (normalised.includes("presentation") || normalised.includes("uc")) {
    return "presentationuc";
  }

  if (normalised.includes("video wall") || normalised.includes("videowall")) {
    return "videowallprocessor";
  }

  return normalised.replace(/\s+/g, "");
}

function itemSearchText(item: ProductShortlistItemLike): string {
  return normalise([item.sku, item.family, item.category, item.title, item.name].filter(Boolean).join(" "));
}

function itemMatchesFamily(item: ProductShortlistItemLike, family: string): boolean {
  const key = familyKey(family);
  const aliases = FAMILY_ALIASES[key] ?? [normalise(family)];
  const searchText = itemSearchText(item);

  return aliases.some((alias) => {
    const normalisedAlias = normalise(alias);

    if (!normalisedAlias) {
      return false;
    }

    if (searchText.includes(normalisedAlias)) {
      return true;
    }

    if (normalisedAlias === "nhd" && searchText.includes("nhd")) {
      return true;
    }

    return false;
  });
}

export function scoreProductForFamilyPath(
  item: ProductShortlistItemLike,
  scores: ProductFamilyScoreLike[] | undefined,
): number {
  const familyScores = scores ?? [];

  if (!familyScores.length) {
    return 0;
  }

  return familyScores.reduce((total, familyScore) => {
    if (!itemMatchesFamily(item, familyScore.family)) {
      return total;
    }

    return total + familyScore.score;
  }, 0);
}

export function rankProductsByFamilyScores<TProduct extends ProductShortlistItemLike>(
  products: TProduct[],
  scores: ProductFamilyScoreLike[] | undefined,
): TProduct[] {
  if (!products.length) {
    return products;
  }

  if (!scores?.length) {
    return [...products];
  }

  return products
    .map((product, index) => ({
      product,
      index,
      score: scoreProductForFamilyPath(product, scores),
    }))
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.product);
}
