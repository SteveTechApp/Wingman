import type { BomLine, Money, PriceTier, Proposal } from "./types";

type BomCategory = NonNullable<BomLine["category"]>;

export type CommercialTier = "Bronze" | "Silver" | "Gold";
export type OfferCostBand = "Low" | "Medium" | "High";
export type BomLineDisposition = "included" | "optional" | "held";

export type CommercialTierProfile = {
  tier: CommercialTier;
  costBand: OfferCostBand;
  scopeLabel: string;
  description: string;
  includedCategories: readonly BomCategory[];
  optionalCategories: readonly BomCategory[];
};

export type BomLineCoverage = {
  category: BomCategory;
  disposition: BomLineDisposition;
  label: "Included" | "Optional" | "Held back";
  reason: string;
};

export type TierCoverageSummary = CommercialTierProfile & {
  totalLines: number;
  totalQty: number;
  includedLines: number;
  optionalLines: number;
  heldBackLines: number;
  includedQty: number;
  optionalQty: number;
  heldBackQty: number;
  includedCoveragePct: number;
};

export const DEFAULT_COMMERCIAL_TIER: CommercialTier = "Silver";

const ALL_CATEGORIES = [
  "Core",
  "Endpoints",
  "Cabling",
  "Services",
  "Accessories",
  "Other",
] as const satisfies readonly BomCategory[];

const COMMERCIAL_TIER_PROFILES: Record<CommercialTier, CommercialTierProfile> = {
  Bronze: {
    tier: "Bronze",
    costBand: "Low",
    scopeLabel: "Lean core offer",
    description: "Keeps the BOM tight around essential system hardware and installation basics.",
    includedCategories: ["Core", "Cabling"],
    optionalCategories: ["Endpoints"],
  },
  Silver: {
    tier: "Silver",
    costBand: "Medium",
    scopeLabel: "Balanced system offer",
    description: "Adds endpoints and key accessories so the offer feels more complete without going fully premium.",
    includedCategories: ["Core", "Cabling", "Endpoints", "Accessories"],
    optionalCategories: ["Other"],
  },
  Gold: {
    tier: "Gold",
    costBand: "High",
    scopeLabel: "Enhanced full-scope offer",
    description: "Carries the most complete BOM by default, including services and finishing items.",
    includedCategories: ALL_CATEGORIES,
    optionalCategories: [],
  },
};

const CATEGORY_PATTERNS: Array<{ category: BomCategory; patterns: RegExp[] }> = [
  {
    category: "Services",
    patterns: [
      /\bservice\b/i,
      /\btraining\b/i,
      /\bcommission(?:ing)?\b/i,
      /\bprogram(?:ming)?\b/i,
      /\bsupport\b/i,
      /\binstall(?:ation)?\b/i,
      /\bsetup\b/i,
      /\blabou?r\b/i,
    ],
  },
  {
    category: "Cabling",
    patterns: [
      /\bcable\b/i,
      /\bfiber\b/i,
      /\bfibre\b/i,
      /\bhdmi\b/i,
      /\busb\b/i,
      /\bcat(?:5|6|7)\b/i,
      /\bpatch\b/i,
      /\blead\b/i,
      /\bcord\b/i,
    ],
  },
  {
    category: "Accessories",
    patterns: [
      /\bmount\b/i,
      /\bbracket\b/i,
      /\badapter\b/i,
      /\baccessor(?:y|ies)\b/i,
      /\bpower supply\b/i,
      /\bpsu\b/i,
      /\bremote\b/i,
      /\bplate\b/i,
      /\brack\b/i,
      /\bkit\b/i,
    ],
  },
  {
    category: "Endpoints",
    patterns: [
      /\bdecoder\b/i,
      /\bencoder\b/i,
      /\breceiver\b/i,
      /\btransmitter\b/i,
      /\btouch(?:panel)?\b/i,
      /\bpanel\b/i,
      /\bdisplay\b/i,
      /\bcamera\b/i,
      /\bwallplate\b/i,
      /\btx\b/i,
      /\brx\b/i,
    ],
  },
  {
    category: "Core",
    patterns: [
      /\bswitch(?:er)?\b/i,
      /\bmatrix\b/i,
      /\bcontroller\b/i,
      /\bprocessor\b/i,
      /\bhub\b/i,
      /\bgateway\b/i,
      /\bamplifier\b/i,
      /\bserver\b/i,
      /\brouter\b/i,
    ],
  },
];

function roundCurrency(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function toPositiveInteger(value?: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(1, Math.round(parsed));
}

function normalizeCategory(value: unknown): BomCategory | undefined {
  if (
    value === "Core" ||
    value === "Endpoints" ||
    value === "Cabling" ||
    value === "Services" ||
    value === "Accessories" ||
    value === "Other"
  ) {
    return value;
  }

  return undefined;
}

function inferCategoryFromText(text: string): BomCategory | undefined {
  const source = text.trim();
  if (!source) return undefined;

  for (const matcher of CATEGORY_PATTERNS) {
    if (matcher.patterns.some((pattern) => pattern.test(source))) {
      return matcher.category;
    }
  }

  return undefined;
}

function getCoverageReason(category: BomCategory, tier: CommercialTier, disposition: BomLineDisposition): string {
  if (tier === "Gold") {
    return "Gold carries the fullest BOM by default, so this line stays in scope.";
  }

  if (tier === "Bronze") {
    if (disposition === "included") {
      return category === "Cabling"
        ? "Lean offers still keep install-ready cabling in place."
        : "Bronze keeps the essential system hardware in scope.";
    }

    if (disposition === "optional") {
      return "This can be added to step the offer up from lean to balanced.";
    }

    if (category === "Services") {
      return "Services stay out of the low-cost base offer unless the project needs them.";
    }

    return "This is held back to keep the Bronze offer lighter by default.";
  }

  if (disposition === "included") {
    return category === "Accessories"
      ? "Silver includes key supporting items so the offer is easier to land as a working system."
      : "Silver keeps this line in scope as part of the balanced offer.";
  }

  if (disposition === "optional") {
    return "This sits as an add-on in the medium-cost offer until the user wants more scope.";
  }

  return "Silver leaves services for the high-cost offer unless the project specifically requires them.";
}

export function money(currency: Money["currency"], value: number): Money {
  return { currency, value: roundCurrency(value) };
}

export function coerceCurrency(
  currency: unknown,
  fallback: Money["currency"] = "USD",
): Money["currency"] {
  if (currency === "GBP" || currency === "EUR" || currency === "USD" || currency === "OTHER") {
    return currency;
  }
  return fallback;
}

export function normalizePriceTier(tier?: PriceTier | null): CommercialTier {
  if (tier === "Bronze" || tier === "Silver" || tier === "Gold") {
    return tier;
  }

  if (tier === "Dealer") return "Silver";
  if (tier === "Distributor" || tier === "MSRP") return "Gold";

  return DEFAULT_COMMERCIAL_TIER;
}

export function getCommercialTierProfile(tier?: PriceTier | null): CommercialTierProfile {
  return COMMERCIAL_TIER_PROFILES[normalizePriceTier(tier)];
}

export function inferBomLineCategory(line: Pick<BomLine, "category" | "sku" | "description" | "notes">): BomCategory {
  const explicitCategory = normalizeCategory(line.category);
  const inferredCategory = inferCategoryFromText([line.sku, line.description, line.notes].filter(Boolean).join(" "));

  if (explicitCategory && explicitCategory !== "Core") {
    return explicitCategory;
  }

  if (inferredCategory) {
    return inferredCategory;
  }

  return explicitCategory ?? "Core";
}

export function getBomLineCoverage(line: BomLine, tier?: PriceTier | null): BomLineCoverage {
  const normalizedTier = normalizePriceTier(tier ?? line.tier);
  const profile = getCommercialTierProfile(normalizedTier);
  const category = inferBomLineCategory(line);

  let disposition: BomLineDisposition = "held";
  if (profile.includedCategories.includes(category)) {
    disposition = "included";
  } else if (profile.optionalCategories.includes(category)) {
    disposition = "optional";
  }

  return {
    category,
    disposition,
    label:
      disposition === "included"
        ? "Included"
        : disposition === "optional"
          ? "Optional"
          : "Held back",
    reason: getCoverageReason(category, normalizedTier, disposition),
  };
}

export function getTierCoverageSummary(
  lines: BomLine[],
  tier?: PriceTier | null,
): TierCoverageSummary {
  const profile = getCommercialTierProfile(tier);

  const summary = lines.reduce(
    (acc, line) => {
      const quantity = toPositiveInteger(line.qty);
      const coverage = getBomLineCoverage(line, profile.tier);

      acc.totalLines += 1;
      acc.totalQty += quantity;

      if (coverage.disposition === "included") {
        acc.includedLines += 1;
        acc.includedQty += quantity;
        return acc;
      }

      if (coverage.disposition === "optional") {
        acc.optionalLines += 1;
        acc.optionalQty += quantity;
        return acc;
      }

      acc.heldBackLines += 1;
      acc.heldBackQty += quantity;
      return acc;
    },
    {
      totalLines: 0,
      totalQty: 0,
      includedLines: 0,
      optionalLines: 0,
      heldBackLines: 0,
      includedQty: 0,
      optionalQty: 0,
      heldBackQty: 0,
    },
  );

  const includedCoveragePct =
    summary.totalLines > 0 ? Math.round((summary.includedLines / summary.totalLines) * 100) : 0;

  return {
    ...profile,
    ...summary,
    includedCoveragePct,
  };
}

export function applyPricingModel(proposal: Proposal): Proposal {
  const priceTier = normalizePriceTier(proposal.meta.priceTier);
  const currency = coerceCurrency(proposal.meta.currency, "USD");

  return {
    ...proposal,
    meta: {
      ...proposal.meta,
      currency,
      priceTier,
    },
    lines: proposal.lines.map((line) => ({
      ...line,
      qty: toPositiveInteger(line.qty),
      category: inferBomLineCategory(line),
      tier: priceTier,
      // Wingman does not currently store live price data, so clear legacy values.
      unitCost: money(currency, 0),
      unitSell: money(currency, 0),
    })),
  };
}
