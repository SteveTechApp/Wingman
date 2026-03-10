type ProductSuggestion = {
  sku: string;
  family: string;
  confidence: "Low" | "Medium" | "High";
  rationale: string;
};

export type ProductSuggestionResponse = {
  ok: true;
  mode: "deterministic-fallback";
  service: "productService";
  prompt: string;
  recommendations: ProductSuggestion[];
};

type FamilyRule = {
  family: string;
  confidence: "Low" | "Medium" | "High";
  keywords: string[];
  skus: string[];
};

const FAMILY_RULES: FamilyRule[] = [
  {
    family: "Apollo",
    confidence: "High",
    keywords: ["meeting", "boardroom", "huddle", "byod", "usb-c", "wireless", "camera"],
    skus: ["SW-220-TX-W", "APO-DG2"],
  },
  {
    family: "HDBaseT",
    confidence: "Medium",
    keywords: ["hdbaset", "distance", "extender", "cat6", "long run"],
    skus: ["EX-100-H2", "SW-510-TX"],
  },
  {
    family: "AVoIP",
    confidence: "Medium",
    keywords: ["avoip", "network", "multicast", "jpeg-xs", "distributed"],
    skus: ["NHD-500-TX", "NHD-500-RX"],
  },
  {
    family: "Matrix",
    confidence: "Medium",
    keywords: ["matrix", "multi-source", "route", "switching"],
    skus: ["MX-0808-H2A-MK2"],
  },
  {
    family: "Video Wall",
    confidence: "Medium",
    keywords: ["video wall", "processor", "2x2", "lobby"],
    skus: ["SW-0204-VW"],
  },
  {
    family: "USB Extension",
    confidence: "Low",
    keywords: ["usb extension", "usb 3", "peripheral"],
    skus: ["EX-USB-H2"],
  },
];

function normalizePrompt(value: string): string {
  return value.trim().toLowerCase();
}

function scoreRule(prompt: string, rule: FamilyRule): number {
  return rule.keywords.reduce((score, keyword) => {
    return prompt.includes(keyword) ? score + 1 : score;
  }, 0);
}

export async function suggestProducts(prompt: string): Promise<ProductSuggestionResponse> {
  const normalizedPrompt = normalizePrompt(prompt);

  const ranked = FAMILY_RULES
    .map((rule) => ({ rule, score: scoreRule(normalizedPrompt, rule) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = ranked.length > 0 ? ranked : [{ rule: FAMILY_RULES[0], score: 1 }];

  const recommendations = selected.slice(0, 3).flatMap((item) => {
    return item.rule.skus.map((sku) => ({
      sku,
      family: item.rule.family,
      confidence: item.rule.confidence,
      rationale: `Matched ${item.score} keyword${item.score === 1 ? "" : "s"} for ${item.rule.family}.`,
    }));
  });

  return {
    ok: true,
    mode: "deterministic-fallback",
    service: "productService",
    prompt,
    recommendations,
  };
}
