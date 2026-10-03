export const defaultCatalog = [
  {
    sku: "SW-0206-VW",
    families: ["video-wall-processor", "video-wall"],
    role: "processor",
    summary: "Dedicated non-AVoIP video wall processor for suitable wall applications.",
  },
  {
    sku: "NHD-0401-MV",
    families: ["AVoIP-500", "multiview", "video-wall", "led"],
    role: "processor",
    summary: "Value-engineered multiview processor for simple wall and LED feed scenarios.",
  },
  {
    sku: "NHD-500-E-TX",
    families: ["AVoIP-500"],
    role: "transmitter",
    summary: "AVoIP 500-series encoder.",
  },
  {
    sku: "NHD-500-E-RX",
    families: ["AVoIP-500"],
    role: "receiver",
    summary: "AVoIP 500-series decoder.",
  },
  {
    sku: "NHD-600-TRX",
    families: ["AVoIP-600", "video-wall"],
    role: "transceiver",
    summary: "Higher-end AVoIP transceiver for advanced routed AV and wall applications.",
  },
  {
    sku: "NHD-150-RX",
    families: ["AVoIP-100", "multiview"],
    role: "receiver",
    summary: "Entry series receive endpoint with fixed-grid multiview capability.",
  },
  {
    sku: "NHD-120-RX",
    families: ["AVoIP-100"],
    role: "receiver",
    summary: "Basic decoder for simpler AV-over-IP deployments.",
  },
  {
    sku: "SW-640L-TX-W",
    families: ["HDBaseT", "presentation"],
    role: "switcher",
    summary: "Presentation switcher/transmitter for small meeting spaces.",
  },
  {
    sku: "RX-70-4K-G2",
    families: ["HDBaseT"],
    role: "receiver",
    summary: "HDBaseT receiver for point-to-point extension.",
  },
  {
    sku: "MX-0402-HDBT-H2A-KIT",
    families: ["matrix"],
    role: "matrix",
    summary: "Compact matrix switching kit.",
  },
];

export const defaultCompatibilityRules = [
  "Proposal and BOM output must not use competitor data.",
  "Validation must be stricter than architecture recommendation.",
  "Missing critical discovery data must lower confidence and may block proposal readiness.",
];

export const defaultVideoWallRules = [
  "Consider SW-0206-VW alongside AVoIP wall solutions where simplicity and cost control matter.",
  "Consider NHD-0401-MV as a value-engineered option for simple wall and LED input scenarios where appropriate.",
  "Use per-display decode paths for higher-flexibility AVoIP wall deployments.",
];

export const defaultProductIntelligenceNotes = [
  "NHD-0401-MV is the correct NetworkHD 500 multiview processor SKU.",
  "Gold and 500-series decisions should be checked against real project requirements before proposal generation.",
];
