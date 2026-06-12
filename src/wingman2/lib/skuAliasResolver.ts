export interface CanonicalSkuAlias {
  canonicalSku: string;
  aliases: readonly string[];
  note: string;
}

export const WYRESTORM_CANONICAL_SKU_ALIASES: readonly CanonicalSkuAlias[] = [
  {
    canonicalSku: "MXV-0808-H2A-V3",
    aliases: ["MXV-0808-H2A", "MXV0808H2A", "MXV 0808 H2A", "MXV-0808-H2A-V3", "MXV0808H2AV3"],
    note: "Resolve base MXV-0808-H2A request to current indexed V3 SKU.",
  },
  {
    canonicalSku: "MXV-0808-H2A-70-V3",
    aliases: ["MXV-0808-70-H2A", "MXV080870H2A", "MXV 0808 70 H2A", "MXV-0808-H2A-70", "MXV-0808-H2A-70-V3", "MXV0808H2A70V3"],
    note: "Resolve 70m/Class A wording to current indexed MXV-0808-H2A-70-V3 SKU.",
  },
  {
    canonicalSku: "MXV-0808-H2A-KIT",
    aliases: ["MXV-0808-H2A-KIT", "MXV0808H2AKIT", "MXV 0808 H2A KIT"],
    note: "8x8 HDBaseT matrix kit with receivers in current index.",
  },
  {
    canonicalSku: "MX-0808-KIT-V2",
    aliases: ["MX-0808-KIT", "MX0808KIT", "MX 0808 KIT", "MX-0808-KIT-V2", "MX0808KITV2"],
    note: "Resolve base MX-0808-KIT request to current indexed V2 SKU.",
  },
  {
    canonicalSku: "MX-0808-H2A-MK2",
    aliases: ["MX-0808-H2A", "MX0808H2A", "MX 0808 H2A", "MX-0808-H2A-MK2", "MX0808H2AMK2"],
    note: "Resolve base MX HDMI matrix SKU to current indexed MK2 SKU.",
  },
];

export function normaliseSkuKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

export function resolveWyrestormSkuAlias(inputSku: string): string {
  const inputKey = normaliseSkuKey(inputSku);

  if (!inputKey) {
    return inputSku;
  }

  for (const entry of WYRESTORM_CANONICAL_SKU_ALIASES) {
    if (normaliseSkuKey(entry.canonicalSku) === inputKey) {
      return entry.canonicalSku;
    }

    if (entry.aliases.some((alias) => normaliseSkuKey(alias) === inputKey)) {
      return entry.canonicalSku;
    }
  }

  return inputSku;
}

export function skuAliasMatches(candidateSku: string, productSku: string): boolean {
  return normaliseSkuKey(resolveWyrestormSkuAlias(candidateSku)) === normaliseSkuKey(resolveWyrestormSkuAlias(productSku));
}

export function skuAliasSummary(): string[] {
  return WYRESTORM_CANONICAL_SKU_ALIASES.map((entry) => `${entry.canonicalSku}: ${entry.aliases.join(", ")}`);
}