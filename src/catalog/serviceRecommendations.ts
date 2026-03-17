import { findRecommendationCatalogItemBySku, type RecommendationTier } from "./recommendationCatalog";

export type SolutionRecommendationTier = Exclude<RecommendationTier, "Unclassified">;

export type SolutionRecommendationFamily =
  | "Apollo"
  | "HDBaseT"
  | "AVoIP"
  | "Matrix"
  | "USB Extension"
  | "Video Wall";

export type SolutionRecommendationConfidence = "Low" | "Medium" | "High";

export type SolutionFamilyProfile = {
  family: SolutionRecommendationFamily;
  aliases: string[];
  keywords: string[];
  confidence: SolutionRecommendationConfidence;
  starterSkus: string[];
  tierSkus: Record<SolutionRecommendationTier, string[]>;
};

export type SolutionFamilyMatch = {
  family: SolutionRecommendationFamily;
  confidence: SolutionRecommendationConfidence;
  score: number;
  matchedKeywords: string[];
  skus: string[];
};

const RAW_FAMILY_PROFILES: SolutionFamilyProfile[] = [
  {
    family: "Apollo",
    aliases: ["presentation", "presentation and uc", "wireless presentation", "uc", "byom", "conference"],
    keywords: ["meeting", "boardroom", "huddle", "byod", "byom", "usb-c", "wireless", "conference", "presentation"],
    confidence: "High",
    starterSkus: ["SW-220-TX-W", "APO-DG2"],
    tierSkus: {
      Bronze: ["APO-210-UC"],
      Silver: ["SW-220-TX-W"],
      Gold: ["SW-640L-TX-W", "APO-DG2"],
    },
  },
  {
    family: "HDBaseT",
    aliases: ["extender", "extenders and kvm", "hdbaset extension"],
    keywords: ["hdbaset", "extender", "cat6", "distance", "long run", "point to point"],
    confidence: "Medium",
    starterSkus: ["EX-100-H2", "SW-510-TX"],
    tierSkus: {
      Bronze: ["EX-70-H2"],
      Silver: ["EX-100-H2"],
      Gold: ["SW-510-TX"],
    },
  },
  {
    family: "AVoIP",
    aliases: ["avoip", "networkhd", "av over ip", "network-distributed"],
    keywords: ["avoip", "networkhd", "multicast", "distributed", "encoder", "decoder", "jpeg", "dante", "10gbe"],
    confidence: "High",
    starterSkus: ["NHD-500-TX", "NHD-500-E-RX", "NHD-CTL-PRO-V2"],
    tierSkus: {
      Bronze: ["NHD-120-TX", "NHD-120-RX"],
      Silver: ["NHD-500-TX", "NHD-500-RX"],
      Gold: ["NHD-600-TRX", "NHD-610-RX", "NHD-CTL-PRO-V2"],
    },
  },
  {
    family: "Matrix",
    aliases: ["matrix switching", "switching", "routing", "matrix routing"],
    keywords: ["matrix", "routing", "switching", "multi-input", "multi-display"],
    confidence: "Medium",
    starterSkus: ["MX-0808-H2A-MK2"],
    tierSkus: {
      Bronze: ["MX-0404-HDMI"],
      Silver: ["MX-0808-H2A-MK2"],
      Gold: ["MX-1616-SCL"],
    },
  },
  {
    family: "USB Extension",
    aliases: ["usb", "usb extension", "usb peripherals", "kvm"],
    keywords: ["usb extension", "usb 3", "usb 2", "peripheral", "webcam", "kvm"],
    confidence: "Low",
    starterSkus: ["EX-100-USB3"],
    tierSkus: {
      Bronze: ["EX-60-USB2"],
      Silver: ["EX-100-USB3"],
      Gold: ["NHD-USB-TRX"],
    },
  },
  {
    family: "Video Wall",
    aliases: ["videowall", "wall processing", "processor-led wall"],
    keywords: ["video wall", "videowall", "2x2", "3x3", "processor", "canvas", "multiview"],
    confidence: "Medium",
    starterSkus: ["SW-0206-VW", "NHD-0401-MV"],
    tierSkus: {
      Bronze: ["SW-0204-VW"],
      Silver: ["SW-0206-VW"],
      Gold: ["SW-0206-VW", "NHD-0401-MV"],
    },
  },
];

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeKey(value: unknown): string {
  return tidy(value).toLowerCase().replace(/\s+/g, " ");
}

function uniqueOrdered(values: string[], limit = Number.POSITIVE_INFINITY): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value).toUpperCase();
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(text);

    if (out.length >= limit) break;
  }

  return out;
}

function rankConfidence(value: SolutionRecommendationConfidence): number {
  if (value === "High") return 3;
  if (value === "Medium") return 2;
  return 1;
}

function selectValidSkus(candidates: string[], limit = Number.POSITIVE_INFINITY): string[] {
  const valid = uniqueOrdered(
    candidates.filter((sku) => Boolean(findRecommendationCatalogItemBySku(sku))),
    limit,
  );

  if (valid.length > 0) return valid;
  return uniqueOrdered(candidates, limit);
}

function resolveProfile(profile: SolutionFamilyProfile): SolutionFamilyProfile {
  return {
    ...profile,
    starterSkus: selectValidSkus(profile.starterSkus),
    tierSkus: {
      Bronze: selectValidSkus(profile.tierSkus.Bronze),
      Silver: selectValidSkus(profile.tierSkus.Silver),
      Gold: selectValidSkus(profile.tierSkus.Gold),
    },
  };
}

function getProfile(family: SolutionRecommendationFamily): SolutionFamilyProfile {
  const profile = RAW_FAMILY_PROFILES.find((item) => item.family === family);
  return resolveProfile(profile ?? RAW_FAMILY_PROFILES[0]);
}

export function getSolutionFamilyProfiles(): SolutionFamilyProfile[] {
  return RAW_FAMILY_PROFILES.map(resolveProfile);
}

export function normalizeSolutionRecommendationFamily(value: string): SolutionRecommendationFamily | null {
  const normalized = normalizeKey(value);
  if (!normalized) return null;

  for (const profile of RAW_FAMILY_PROFILES) {
    if (normalizeKey(profile.family) === normalized) return profile.family;
    if (profile.aliases.some((alias) => normalizeKey(alias) === normalized)) return profile.family;
  }

  if (normalized.includes("video wall")) return "Video Wall";
  if (normalized.includes("usb")) return "USB Extension";
  if (normalized.includes("apollo") || normalized.includes("presentation") || normalized.includes("conference")) return "Apollo";
  if (normalized.includes("networkhd") || normalized.includes("avoip")) return "AVoIP";
  if (normalized.includes("matrix")) return "Matrix";
  if (normalized.includes("hdbaset") || normalized.includes("extender")) return "HDBaseT";

  return null;
}

export function inferRecommendationTierFromText(text: string): SolutionRecommendationTier {
  const normalized = normalizeKey(text);

  if (/\bgold\b|\bpremium\b|\benterprise\b|\bexecutive\b|\bmission critical\b|\bhigh end\b|\b10gbe\b/.test(normalized)) {
    return "Gold";
  }

  if (/\bbronze\b|\bbudget\b|\bentry\b|\bbasic\b|\blean\b|\bcost effective\b/.test(normalized)) {
    return "Bronze";
  }

  return "Silver";
}

export function getFamiliesForTransport(transport: string): SolutionRecommendationFamily[] {
  const normalized = normalizeKey(transport);
  if (!normalized) return [];

  if (normalized.includes("video wall")) return ["Video Wall"];
  if (normalized.includes("usb")) return ["USB Extension"];
  if (normalized.includes("apollo")) return ["Apollo"];
  if (normalized.includes("avoip") || normalized.includes("networkhd")) return ["AVoIP"];
  if (normalized.includes("hdbaset") && normalized.includes("matrix")) return ["HDBaseT", "Matrix"];
  if (normalized.includes("matrix")) return ["Matrix"];
  if (normalized.includes("hdbaset")) return ["HDBaseT"];

  return [];
}

export function getStarterSkusForFamily(family: string, limit = 4): string[] {
  const normalized = normalizeSolutionRecommendationFamily(family);
  if (!normalized) return [];
  return selectValidSkus(getProfile(normalized).starterSkus, limit);
}

export function getTierSkusForFamily(
  family: string,
  tier: SolutionRecommendationTier,
  limit = 4,
): string[] {
  const normalized = normalizeSolutionRecommendationFamily(family);
  if (!normalized) return [];

  const profile = getProfile(normalized);
  const tierSkus = selectValidSkus(profile.tierSkus[tier], limit);
  if (tierSkus.length > 0) return tierSkus;

  return selectValidSkus(profile.starterSkus, limit);
}

export function recommendSkusForFamilies(
  families: string[],
  tier: SolutionRecommendationTier,
  limit = 8,
): string[] {
  const recommended: string[] = [];

  for (const family of families) {
    recommended.push(...getTierSkusForFamily(family, tier));
  }

  if (recommended.length === 0) {
    recommended.push(...getTierSkusForFamily("Apollo", tier));
  }

  return uniqueOrdered(recommended, limit);
}

export function recommendSkusForTransport(transport: string, limit = 4): string[] {
  const families = getFamiliesForTransport(transport);
  const recommended: string[] = [];

  for (const family of families) {
    recommended.push(...getStarterSkusForFamily(family));
  }

  if (recommended.length === 0) {
    recommended.push(...getStarterSkusForFamily("HDBaseT"));
  }

  return uniqueOrdered(recommended, limit);
}

export function matchSolutionFamiliesForPrompt(
  prompt: string,
  options?: { transport?: string; tier?: SolutionRecommendationTier; limit?: number },
): SolutionFamilyMatch[] {
  const normalizedPrompt = normalizeKey(prompt);
  const boostedFamilies = getFamiliesForTransport(options?.transport ?? "");
  const tier = options?.tier ?? inferRecommendationTierFromText(prompt);
  const matches: SolutionFamilyMatch[] = [];

  for (const profile of RAW_FAMILY_PROFILES) {
    const matchedKeywords = profile.keywords.filter((keyword) => normalizedPrompt.includes(normalizeKey(keyword)));
    const transportBoost = boostedFamilies.includes(profile.family) ? 2 : 0;
    const score = matchedKeywords.length + transportBoost;

    if (score <= 0) continue;

    matches.push({
      family: profile.family,
      confidence: profile.confidence,
      score,
      matchedKeywords,
      skus: getStarterSkusForFamily(profile.family, 4).length > 0
        ? getStarterSkusForFamily(profile.family, 4)
        : getTierSkusForFamily(profile.family, tier, 4),
    });
  }

  matches.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return rankConfidence(right.confidence) - rankConfidence(left.confidence);
  });

  return matches.slice(0, options?.limit ?? 3);
}
