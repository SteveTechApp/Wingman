export type CatalogueMode = "avoip" | "matrix" | "video-wall";

export type CatalogueProduct = {
  sku: string;
  name: string;
  category: string;
  tags?: string[];
};

export type RecommendationSource = "catalogue" | "fallback";

export type ResolvedRecommendation = {
  sku: string;
  name: string;
  role: string;
  qty: number;
  reason: string;
  source: RecommendationSource;
};

export type ResolveInput = {
  mode: CatalogueMode;
  sourceCount: number;
  displayCount: number;
  distanceM: number;
  multiview: boolean;
};

const FALLBACK_PRODUCTS: CatalogueProduct[] = [
  { sku: "MX-0808-H2A-MK2", name: "8x8 HDMI Matrix", category: "matrix", tags: ["matrix", "switching"] },
  { sku: "EX-70-H2C", name: "70m HDMI Extender", category: "extender", tags: ["extension", "distance"] },
  { sku: "NHD-150-RX", name: "Multiview Decoder", category: "decoder", tags: ["avoip", "multiview"] },
  { sku: "NHD-120-series", name: "120 Series Encoder Family", category: "encoder", tags: ["avoip", "1g"] },
  { sku: "NHD-500-TX/RX v2", name: "500 Series JPEG2000 Endpoint", category: "endpoint", tags: ["avoip", "1g", "4k60"] },
  { sku: "NHD-500-E", name: "500 Series Lite Endpoint", category: "endpoint", tags: ["avoip", "cost-down"] },
  { sku: "NHD-500-IW-TX", name: "In-wall Encoder", category: "encoder", tags: ["avoip", "room-input"] },
  { sku: "NHD-600-TRX", name: "600 Series 10Gb Transceiver", category: "transceiver", tags: ["avoip", "10g", "premium"] },
  { sku: "NHD-600-TRXF", name: "600 Series Fiber Transceiver", category: "transceiver", tags: ["avoip", "10g", "fiber"] },
  { sku: "NHD-600-E-TX/RX", name: "600 Series 10Gb Endpoint", category: "endpoint", tags: ["avoip", "10g"] },
  { sku: "NHD-CTL-PRO", name: "System Controller", category: "control", tags: ["control", "automation"] },
  { sku: "SW-100-08P", name: "Managed PoE Network Switch", category: "switch", tags: ["network", "switch", "poe"] }
];

function normaliseProducts(raw: unknown): CatalogueProduct[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const results: CatalogueProduct[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;

    const sku =
      typeof record.sku === "string"
        ? record.sku
        : typeof record.id === "string"
          ? record.id
          : "";

    if (!sku) {
      continue;
    }

    const name =
      typeof record.name === "string"
        ? record.name
        : typeof record.title === "string"
          ? record.title
          : sku;

    const category =
      typeof record.category === "string"
        ? record.category
        : typeof record.family === "string"
          ? record.family
          : "unknown";

    const tags =
      Array.isArray(record.tags)
        ? record.tags.filter((value): value is string => typeof value === "string")
        : undefined;

    results.push({
      sku,
      name,
      category,
      tags,
    });
  }

  return results;
}

function matchesAny(product: CatalogueProduct, terms: string[]): boolean {
  const haystack = [
    product.sku,
    product.name,
    product.category,
    ...(product.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function getCatalogueProducts(): {
  products: CatalogueProduct[];
  source: RecommendationSource;
} {
  const globalAny = globalThis as Record<string, unknown>;
  const candidates = [
    globalAny.__WINGMAN_LOCAL_CATALOGUE__,
    globalAny.__WINGMAN_PRODUCT_CATALOGUE__,
    globalAny.__CATALOGUE_PRODUCTS__,
  ];

  for (const candidate of candidates) {
    const products = normaliseProducts(candidate);
    if (products.length > 0) {
      return {
        products,
        source: "catalogue",
      };
    }
  }

  return {
    products: FALLBACK_PRODUCTS,
    source: "fallback",
  };
}

function pickFirst(
  products: CatalogueProduct[],
  terms: string[],
  fallbackSku: string
): CatalogueProduct {
  const found = products.find((product) => matchesAny(product, terms));
  if (found) {
    return found;
  }

  const fallback = FALLBACK_PRODUCTS.find((product) => product.sku === fallbackSku);
  if (fallback) {
    return fallback;
  }

  return {
    sku: fallbackSku,
    name: fallbackSku,
    category: "fallback",
  };
}

export function resolveCatalogueRecommendations(
  input: ResolveInput
): ResolvedRecommendation[] {
  const { products, source } = getCatalogueProducts();
  const { mode, sourceCount, displayCount, distanceM, multiview } = input;

  if (mode === "matrix") {
    const matrixCore = pickFirst(products, ["mx-", "matrix"], "MX-0808-H2A-MK2");
    const extender = pickFirst(products, ["extender", "ex-70", "distance"], "EX-70-H2C");
    const controller = pickFirst(products, ["ctl", "control", "automation"], "NHD-CTL-PRO");

    const items: ResolvedRecommendation[] = [
      {
        sku: matrixCore.sku,
        name: matrixCore.name,
        role: "Matrix core",
        qty: 1,
        reason: "Traditional direct routing path selected.",
        source,
      },
      {
        sku: extender.sku,
        name: extender.name,
        role: "Display extension",
        qty: distanceM > 20 ? Math.max(displayCount, 1) : 0,
        reason: "Used where display runs push beyond short local patch lengths.",
        source,
      },
      {
        sku: controller.sku,
        name: controller.name,
        role: "Control",
        qty: 1,
        reason: "Adds presets, recall, and cleaner user operation.",
        source,
      },
    ];

    return items.filter((item) => item.qty > 0);
  }

  if (mode === "video-wall" || distanceM > 100) {
    const trx = pickFirst(products, ["600-trx", "10g", "sdvoe"], "NHD-600-TRX");
    const trxf = pickFirst(products, ["trxf", "fiber"], "NHD-600-TRXF");
    const endpoint = pickFirst(products, ["600-e", "10g"], "NHD-600-E-TX/RX");

    const items: ResolvedRecommendation[] = [
      {
        sku: trx.sku,
        name: trx.name,
        role: "Premium transport",
        qty: Math.max(sourceCount + displayCount, 2),
        reason: "Selected for premium video wall or long-reach transport.",
        source,
      },
      {
        sku: trxf.sku,
        name: trxf.name,
        role: "Fiber path",
        qty: distanceM > 100 ? Math.max(displayCount, 1) : 0,
        reason: "Use where the backbone or endpoint path needs fiber-class reach.",
        source,
      },
      {
        sku: endpoint.sku,
        name: endpoint.name,
        role: "10Gb endpoint",
        qty: displayCount >= 6 ? Math.max(displayCount, 1) : 0,
        reason: "Supports larger premium endpoint counts.",
        source,
      },
    ];

    return items.filter((item) => item.qty > 0);
  }

  if (multiview) {
    const mvRx = pickFirst(products, ["150-rx", "multiview"], "NHD-150-RX");
    const encoder = pickFirst(products, ["120", "encoder", "1g"], "NHD-120-series");
    const controller = pickFirst(products, ["ctl", "control"], "NHD-CTL-PRO");

    const items: ResolvedRecommendation[] = [
      {
        sku: mvRx.sku,
        name: mvRx.name,
        role: "Multiview endpoint",
        qty: Math.max(displayCount, 1),
        reason: "Selected because the design pattern suggests multiview behaviour.",
        source,
      },
      {
        sku: encoder.sku,
        name: encoder.name,
        role: "Source encoding",
        qty: Math.max(sourceCount, 1),
        reason: "Provides the low-bandwidth source ecosystem for multiview workflows.",
        source,
      },
      {
        sku: controller.sku,
        name: controller.name,
        role: "Control",
        qty: 1,
        reason: "Supports preset recall and routing control.",
        source,
      },
    ];

    return items;
  }

  const endpoint = pickFirst(products, ["500", "j2k", "endpoint", "4k60"], "NHD-500-TX/RX v2");
  const lite = pickFirst(products, ["500-e", "cost-down"], "NHD-500-E");
  const iw = pickFirst(products, ["500-iw", "in-wall", "room-input"], "NHD-500-IW-TX");
  const switcher = pickFirst(products, ["switch", "network", "poe"], "SW-100-08P");
  const controller = pickFirst(products, ["ctl", "control"], "NHD-CTL-PRO");

  const items: ResolvedRecommendation[] = [
    {
      sku: endpoint.sku,
      name: endpoint.name,
      role: "Main endpoint platform",
      qty: Math.max(sourceCount + displayCount, 2),
      reason: "General-purpose 1Gb 4K60 AVoIP recommendation.",
      source,
    },
    {
      sku: lite.sku,
      name: lite.name,
      role: "Cost-down endpoint",
      qty: displayCount >= 4 ? Math.max(displayCount, 1) : 0,
      reason: "Use where not every endpoint needs the full primary feature set.",
      source,
    },
    {
      sku: iw.sku,
      name: iw.name,
      role: "Room input plate",
      qty: sourceCount <= 3 ? Math.max(sourceCount, 1) : 0,
      reason: "Useful for podium, desk, and wall-plate source points.",
      source,
    },
    {
      sku: switcher.sku,
      name: switcher.name,
      role: "Network switch",
      qty: 1,
      reason: "Supports transport and endpoint control.",
      source,
    },
    {
      sku: controller.sku,
      name: controller.name,
      role: "Control",
      qty: 1,
      reason: "Adds automation and preset recall.",
      source,
    },
  ];

  return items.filter((item) => item.qty > 0);
}