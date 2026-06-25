export type WyrestormDecisionCapability =
  | "mst"
  | "multiview"
  | "videoWall"
  | "mosaicVideoWall"
  | "ledWall"
  | "wirelessCasting"
  | "airplay"
  | "miracast"
  | "chromecast"
  | "wirelessDongle"
  | "losslessZeroLatency";

type CapabilityProfile = {
  capabilities: readonly WyrestormDecisionCapability[];
};

/*
 * Capability truth used by Finder and recommendation evidence. It deliberately
 * records workflow capabilities rather than connector counts, and only covers
 * products called out in the 2026 Product Guide / solution brochures. A known
 * SKU without a capability is treated as not supporting it; unknown SKUs may
 * still fall back to catalogue text.
 */
const CAPABILITY_PROFILES: Record<string, CapabilityProfile> = {
  "SW-640L-TX-W": {
    capabilities: ["mst", "multiview", "wirelessCasting", "airplay", "miracast", "chromecast", "wirelessDongle"],
  },
  "SW-620-TX-W": {
    capabilities: ["mst", "multiview", "wirelessCasting", "airplay", "miracast", "wirelessDongle"],
  },
  "MX-0402-MST": { capabilities: ["mst"] },
  "MX-0403-H3-MST": { capabilities: ["mst"] },
  "APO-VX20-UC": { capabilities: ["multiview", "wirelessCasting", "airplay", "miracast", "wirelessDongle"] },
  "APO-VX20-UC-V2": { capabilities: ["multiview", "wirelessCasting", "airplay", "miracast", "wirelessDongle"] },
  "CAM-0402-BRG": { capabilities: ["multiview"] },
  "CAM-0402-NDI-BRG": { capabilities: ["multiview"] },
  "MV-0401-PRO": { capabilities: ["multiview", "ledWall"] },
  "NHD-0401-MV": { capabilities: ["multiview", "ledWall"] },
  "NHD-150-RX": { capabilities: ["multiview", "videoWall", "mosaicVideoWall"] },
  "NHD-120-RX": { capabilities: ["videoWall", "mosaicVideoWall"] },
  "NHD-500-RX": { capabilities: ["videoWall", "mosaicVideoWall"] },
  "NHD-500-E-RX": { capabilities: ["videoWall", "mosaicVideoWall"] },
  "NHD-600-TRX": { capabilities: ["multiview", "videoWall", "ledWall", "losslessZeroLatency"] },
  "NHD-600-TRXF": { capabilities: ["multiview", "videoWall", "ledWall", "losslessZeroLatency"] },
  "SW-0204-VW": { capabilities: ["videoWall"] },
  "SW-0206-VW": { capabilities: ["videoWall"] },
  "MX-0812-SCL": { capabilities: ["multiview", "videoWall", "ledWall"] },
  "MX-1007-HYB": { capabilities: ["multiview", "videoWall"] },
};

function canonicalSku(value: unknown) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getWyrestormCapabilityProfile(sku: unknown): CapabilityProfile | null {
  const canonical = canonicalSku(sku);
  const withoutRevision = canonical.replace(/-V\d+$/, "");
  return CAPABILITY_PROFILES[canonical] ?? CAPABILITY_PROFILES[withoutRevision] ?? null;
}

/**
 * Returns null when the SKU is not in the source-backed capability set. That
 * allows callers to retain a text-search fallback for catalogue products that
 * have not yet been profiled.
 */
export function wyrestormCapabilityVerdict(
  sku: unknown,
  capability: WyrestormDecisionCapability,
): boolean | null {
  const profile = getWyrestormCapabilityProfile(sku);
  if (!profile) return null;
  return profile.capabilities.includes(capability);
}

export function wyrestormCapabilityFallbackTerms(capability: WyrestormDecisionCapability): string[] {
  const terms: Record<WyrestormDecisionCapability, string[]> = {
    mst: ["mst", "multi-stream transport", "extended display"],
    multiview: ["multiview", "multi view", "multi-view", "picture in picture", "pip", "quad view"],
    videoWall: ["video wall", "videowall", "wall processor", "lcd wall"],
    mosaicVideoWall: ["mosaic video wall", "mosaic"],
    ledWall: ["led wall", "led processor", "led sender", "novastar"],
    wirelessCasting: ["wireless casting", "wireless presentation", "screensharing", "screen sharing"],
    airplay: ["airplay"],
    miracast: ["miracast"],
    chromecast: ["chromecast", "chrome cast"],
    wirelessDongle: ["apo-dg2", "wireless dongle", "casting dongle"],
    losslessZeroLatency: ["lossless", "zero latency", "zero-latency", "genlock", "sdvoe"],
  };

  return terms[capability];
}
