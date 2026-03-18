export type CatalogAccent = {
  key: string;
  rgb: string;
  border: string;
  chipBg: string;
  chipText: string;
};

export const CATEGORY_ACCENTS: Record<string, CatalogAccent> = {
  avoip: {
    key: "avoip",
    rgb: "34,211,238",
    border: "rgba(34,211,238,0.22)",
    chipBg: "rgba(34,211,238,0.12)",
    chipText: "#a5f3fc",
  },
  hdbaset: {
    key: "hdbaset",
    rgb: "96,165,250",
    border: "rgba(96,165,250,0.22)",
    chipBg: "rgba(96,165,250,0.12)",
    chipText: "#bfdbfe",
  },
  matrix: {
    key: "matrix",
    rgb: "167,139,250",
    border: "rgba(167,139,250,0.22)",
    chipBg: "rgba(167,139,250,0.12)",
    chipText: "#ddd6fe",
  },
  uc: {
    key: "uc",
    rgb: "52,211,153",
    border: "rgba(52,211,153,0.22)",
    chipBg: "rgba(52,211,153,0.12)",
    chipText: "#bbf7d0",
  },
  videowall: {
    key: "videowall",
    rgb: "251,191,36",
    border: "rgba(251,191,36,0.22)",
    chipBg: "rgba(251,191,36,0.12)",
    chipText: "#fde68a",
  },
  audio: {
    key: "audio",
    rgb: "251,146,60",
    border: "rgba(251,146,60,0.22)",
    chipBg: "rgba(251,146,60,0.12)",
    chipText: "#fdba74",
  },
  accessories: {
    key: "accessories",
    rgb: "148,163,184",
    border: "rgba(148,163,184,0.20)",
    chipBg: "rgba(148,163,184,0.10)",
    chipText: "#e2e8f0",
  },
  default: {
    key: "default",
    rgb: "125,140,160",
    border: "rgba(148,163,184,0.16)",
    chipBg: "rgba(148,163,184,0.08)",
    chipText: "#cbd5e1",
  },
};

export function getCategoryAccentKey(value: string): keyof typeof CATEGORY_ACCENTS {
  const v = String(value || "").toLowerCase();

  if (v.includes("avoip") || v.includes("networkhd") || v.includes("ip")) return "avoip";
  if (v.includes("hdbaset") || v.includes("extender") || v.includes("extension")) return "hdbaset";
  if (v.includes("matrix") || v.includes("switch")) return "matrix";
  if (v.includes("uc") || v.includes("presentation") || v.includes("apollo") || v.includes("conference")) return "uc";
  if (v.includes("video wall") || v.includes("videowall") || v.includes("wall processor")) return "videowall";
  if (v.includes("audio") || v.includes("dante") || v.includes("amp") || v.includes("dsp")) return "audio";
  if (v.includes("accessor") || v.includes("mount") || v.includes("cable") || v.includes("dock")) return "accessories";

  return "default";
}

export function getCategoryAccent(value: string): CatalogAccent {
  return CATEGORY_ACCENTS[getCategoryAccentKey(value)] ?? CATEGORY_ACCENTS.default;
}

export function buildAccentCardStyle(value: string) {
  const accent = getCategoryAccent(value);

  return {
    border: `1px solid ${accent.border}`,
    background: [
      "linear-gradient(180deg, rgba(3,18,24,0.98), rgba(4,13,18,0.98))",
      `radial-gradient(circle at top right, rgba(${accent.rgb},0.10), transparent 42%)`,
    ].join(", "),
    boxShadow: "0 10px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.02)",
    accentBar: `linear-gradient(180deg, rgba(${accent.rgb},0.95), rgba(${accent.rgb},0.35))`,
    chipBg: accent.chipBg,
    chipText: accent.chipText,
  };
}