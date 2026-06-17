/**
 * NetworkHD AV-over-IP Equivalence (single source of truth)
 *
 * Compare must map a competitor AVoIP endpoint to the *technically correct*
 * NetworkHD series, based on the competitor's network class and codec, not on a
 * loose keyword guess. The rules encoded here are deliberate and were set by the
 * product/sales owner:
 *
 *   - 10G / SDVoE / uncompressed / zero-latency endpoints  -> NetworkHD 600 only.
 *     The 600 series is the *only* technical match for a 10G product; never offer
 *     it as an alternative to a 1G product, and never mix a 600 candidate into a
 *     1G shortlist.
 *   - 1G endpoints using H.264 / H.265 (HEVC)              -> NetworkHD 100.
 *   - Every other 1G "visually lossless" endpoint
 *     (JPEG2000 / JPEG-XS / PURE3 / Pixel-Perfect / SDVoE-lite, the majority of
 *     like products)                                        -> NetworkHD 500.
 *   - 1G AVoIP whose codec we cannot prove                  -> NetworkHD 500 with a
 *     "verify codec" flag (500 is the safe modern default; only drop to 100 when
 *     H.264/H.265 is actually evidenced).
 *
 * 10G and 1G product families are NEVER mixed in a single recommendation.
 *
 * Banned legacy SKUs must never be specified in a comparison or quote:
 *   NHD-100, NHD-110, NHD-220, NHD-300-TX, NHD-400 (and their TX/RX/version
 *   variants). They are filtered out defensively everywhere candidates are built.
 *
 * This module is pure logic. Do not import React, CSS, routing or page code here.
 */

export type NetworkHdAvoipSeries = "100" | "500" | "600";
export type AvoipNetworkClass = "1g" | "10g" | "unknown";
export type AvoipCodecClass =
  | "uncompressed-sdvoe"
  | "h264_h265"
  | "visually-lossless"
  | "unknown";
export type AvoipEndpointRole = "encoder" | "decoder" | "transceiver" | "unknown";

export interface CompetitorAvoipClassification {
  isAvoip: boolean;
  networkClass: AvoipNetworkClass;
  codec: AvoipCodecClass;
  role: AvoipEndpointRole;
  /** Human-readable detection trail for evidence/debug. */
  signals: string[];
  /** Known competitor family label when the truth table matched. */
  knownFamily?: string;
}

export interface NetworkHdAvoipMember {
  sku: string;
  role: AvoipEndpointRole;
  /** Short note for why this member is in the family. */
  note: string;
}

export interface NetworkHdSeriesProfile {
  series: NetworkHdAvoipSeries;
  label: string;
  networkClass: Exclude<AvoipNetworkClass, "unknown">;
  codec: Exclude<AvoipCodecClass, "unknown">;
  resolution: string;
  summary: string;
  members: NetworkHdAvoipMember[];
}

export interface NetworkHdAvoipRecommendation {
  applies: boolean;
  series: NetworkHdAvoipSeries | null;
  networkClass: AvoipNetworkClass;
  /** Role-filtered, ban-filtered candidate SKUs. Never mixes network classes. */
  candidateSkus: string[];
  /** Lead candidate (mainline TX/RX/TRX for the role). */
  leadSku: string | null;
  reason: string;
  /** True when the codec could not be proven and 500 was used as the safe default. */
  verifyCodec: boolean;
  /** Candidates intentionally withheld and why (e.g. wrong network class, banned). */
  withheld: Array<{ sku: string; reason: string }>;
  /** Mandatory system controller reminder (1 per system, unless an add-on). */
  controllerReminder: string;
}

/**
 * Every NetworkHD system needs exactly one controller. Compare must always remind
 * the user to add it, unless the deployment is an add-on to an existing NetworkHD
 * system that already has one.
 */
export const NETWORKHD_CONTROLLER_SKU = "NHD-CTL-PRO-V2";

export const NETWORKHD_CONTROLLER_REMINDER =
  "Specify one NHD-CTL-PRO-V2 controller per system (one per system), unless this is an add-on to an existing NetworkHD system that already has a controller.";

/* ------------------------------------------------------------------------- *
 * Banned legacy SKUs
 * ------------------------------------------------------------------------- */

/** Legacy NetworkHD series numbers that must never be specified in Compare. */
export const BANNED_NETWORKHD_SERIES = ["100", "110", "220", "300", "400"] as const;

/** Canonical banned example SKUs, for messaging. */
export const BANNED_NETWORKHD_SKUS = [
  "NHD-100",
  "NHD-110",
  "NHD-220",
  "NHD-300-TX",
  "NHD-400",
] as const;

function skuKey(value: unknown): string {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

/**
 * A SKU is banned when its NetworkHD series token is one of the retired
 * platforms. Matching is on the exact 3-digit series group so that current
 * SKUs (NHD-120, NHD-124, NHD-150, NHD-500, NHD-510, NHD-600, NHD-610) are
 * never caught, while every variant of the retired families (NHD-400-TX-V2,
 * NHD-300-TX, NHD-110-RX, ...) is.
 */
export function isBannedNetworkHdSku(sku: unknown): boolean {
  const key = skuKey(sku);
  const match = key.match(/^NHD(\d{3})/);

  if (!match) {
    return false;
  }

  return (BANNED_NETWORKHD_SERIES as readonly string[]).includes(match[1]);
}

/** Remove any banned legacy SKU from a candidate list, preserving order. */
export function stripBannedNetworkHdSkus<T extends { sku?: unknown }>(items: T[]): T[] {
  return items.filter((item) => !isBannedNetworkHdSku(item?.sku));
}

/**
 * Network class of a current NetworkHD AVoIP SKU, derived from its series number:
 * 100/500 series are 1G, the 600 series is 10G. Returns "unknown" for controllers,
 * racks, multiview processors and anything that is not a current AVoIP endpoint.
 */
export function networkClassOfNetworkHdSku(sku: unknown): AvoipNetworkClass {
  const key = skuKey(sku);
  const match = key.match(/^NHD(\d)/);

  if (!match) {
    return "unknown";
  }

  if (match[1] === "6") return "10g";
  if (match[1] === "1" || match[1] === "5") return "1g";
  return "unknown";
}

/* ------------------------------------------------------------------------- *
 * NetworkHD AVoIP family truth (current 2026 catalogue, banned SKUs excluded)
 * ------------------------------------------------------------------------- */

export const NETWORKHD_AVOIP_FAMILIES: Record<NetworkHdAvoipSeries, NetworkHdSeriesProfile> = {
  "100": {
    series: "100",
    label: "NetworkHD 100",
    networkClass: "1g",
    codec: "h264_h265",
    resolution: "4K30",
    summary:
      "1GbE H.264/H.265 AVoIP. Match for competitor 1G endpoints that use H.264/H.265 (HEVC) compression.",
    members: [
      { sku: "NHD-120-TX", role: "encoder", note: "4K30 H.264/H.265 encoder" },
      { sku: "NHD-124-TX", role: "encoder", note: "4K30 quad encoder" },
      { sku: "NHD-120-IW-TX", role: "encoder", note: "4K30 in-wall encoder" },
      { sku: "NHD-120-RX", role: "decoder", note: "4K30 decoder" },
      { sku: "NHD-150-RX", role: "decoder", note: "4K30 decoder with multiview output" },
    ],
  },
  "500": {
    series: "500",
    label: "NetworkHD 500",
    networkClass: "1g",
    codec: "visually-lossless",
    resolution: "4K60 4:4:4",
    summary:
      "1GbE 4K60 4:4:4 visually-lossless AVoIP. Default match for the majority of 1G AVoIP endpoints (JPEG2000 / JPEG-XS / PURE3 / Pixel-Perfect class).",
    members: [
      { sku: "NHD-500-TX", role: "encoder", note: "4K60 4:4:4 1GbE encoder" },
      { sku: "NHD-500-E-TX", role: "encoder", note: "4K60 4:4:4 lite encoder" },
      { sku: "NHD-510-TX", role: "encoder", note: "4K60 4:4:4 encoder with Dante AV-A" },
      { sku: "NHD-500-IW-TX", role: "encoder", note: "4K60 4:4:4 in-wall encoder" },
      { sku: "NHD-500-DNT-TX", role: "encoder", note: "4K60 4:4:4 encoder with Dante/AES67" },
      { sku: "NHD-500-RX", role: "decoder", note: "4K60 4:4:4 1GbE decoder" },
      { sku: "NHD-500-E-RX", role: "decoder", note: "4K60 4:4:4 lite decoder" },
    ],
  },
  "600": {
    series: "600",
    label: "NetworkHD 600",
    networkClass: "10g",
    codec: "uncompressed-sdvoe",
    resolution: "4K60 4:4:4",
    summary:
      "10GbE SDVoE uncompressed, zero-latency AVoIP. The only technical match for a 10G/SDVoE endpoint. Never mix with 1G products.",
    members: [
      { sku: "NHD-600-TRX", role: "transceiver", note: "10G SDVoE transceiver" },
      { sku: "NHD-600-TRXF", role: "transceiver", note: "10G SDVoE fibre transceiver" },
      { sku: "NHD-610-TX", role: "encoder", note: "10G SDVoE encoder" },
      { sku: "NHD-610-RX", role: "decoder", note: "10G SDVoE decoder" },
    ],
  },
};

/* ------------------------------------------------------------------------- *
 * Competitor AVoIP classification
 * ------------------------------------------------------------------------- */

function normaliseText(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

const TEN_GIG_SIGNALS = ["10g", "10gbe", "10 gbe", "10 gig", "sdvoe", "zero latency", "zero-latency", "zero frame", "zero-frame", "uncompressed", "25g"];
const ONE_GIG_SIGNALS = ["1g", "1gbe", "1 gbe", "1 gig", "gigabit"];
const H26X_SIGNALS = ["h.264", "h264", "h.265", "h265", "hevc", "h.26", "avc"];
const VISUALLY_LOSSLESS_SIGNALS = ["jpeg2000", "jpeg 2000", "jpeg-2000", "j2k", "jpeg-xs", "jpegxs", "jpeg xs", "visually lossless", "visually-lossless", "pure3", "pixel perfect", "pixel-perfect", "light compression", "mathematically lossless"];

/**
 * High-confidence competitor family truth. Only families whose network class /
 * codec is well-established are listed; everything else is classified from
 * explicit signals and falls back to the 1G default. Keys are matched against
 * the normalised (alphanumeric, lowercase) competitor text.
 */
interface KnownAvoipFamily {
  label: string;
  keys: string[];
  networkClass: AvoipNetworkClass;
  codec: AvoipCodecClass;
}

const KNOWN_AVOIP_FAMILIES: KnownAvoipFamily[] = [
  // ---- 10G / SDVoE / uncompressed -> 600 ----
  { label: "AVPro Edge MXNet 10G", keys: ["mxnet10g", "mxnet10gtcvr"], networkClass: "10g", codec: "uncompressed-sdvoe" },
  { label: "Lightware UBEX", keys: ["ubex"], networkClass: "10g", codec: "uncompressed-sdvoe" },
  { label: "ZeeVee ZyPer4K", keys: ["zyper4k"], networkClass: "10g", codec: "uncompressed-sdvoe" },
  { label: "AMX SVSI N3000", keys: ["n3312", "n3322", "n3300", "nmxencn33", "nmxdecn33"], networkClass: "10g", codec: "uncompressed-sdvoe" },
  // ---- 1G H.264 / H.265 -> 100 ----
  { label: "ZeeVee ZyPerUHD", keys: ["zyperuhd"], networkClass: "1g", codec: "h264_h265" },
  { label: "Lightware VINX", keys: ["vinx"], networkClass: "1g", codec: "h264_h265" },
  { label: "Kramer KDS-7", keys: ["kds7", "kds7en7", "kds7dec7"], networkClass: "1g", codec: "h264_h265" },
  // ---- 1G visually lossless -> 500 ----
  { label: "Crestron DM-NVX", keys: ["dmnvx"], networkClass: "1g", codec: "visually-lossless" },
  { label: "Extron NAV (PURE3)", keys: ["nave", "navd", "navsd", "navx"], networkClass: "1g", codec: "visually-lossless" },
  { label: "AMX SVSI N2400/N2600", keys: ["n2412", "n2422", "n2612", "n2622", "n2400", "n2600", "n2615", "n2625"], networkClass: "1g", codec: "visually-lossless" },
];

const KNOWN_AVOIP_SKU_ROLE_OVERRIDES: Array<{
  keys: string[];
  role: AvoipEndpointRole;
  label: string;
}> = [
  {
    keys: ["atomni111", "atomni112", "atomni512"],
    role: "encoder",
    label: "Atlona OmniStream encoder",
  },
  {
    keys: ["atomni121", "atomni122", "atomni521"],
    role: "decoder",
    label: "Atlona OmniStream decoder",
  },
  {
    keys: ["ip200uhdtx", "ip250uhdtx", "ip300uhdtx", "ip350uhdtx"],
    role: "encoder",
    label: "Blustream IP UHD transmitter",
  },
  {
    keys: ["ip200uhdrx", "ip250uhdrx", "ip300uhdrx", "ip350uhdrx"],
    role: "decoder",
    label: "Blustream IP UHD receiver",
  },
];

function knownAvoipRoleFromSku(compact: string): { role: AvoipEndpointRole; label: string } | null {
  const match = KNOWN_AVOIP_SKU_ROLE_OVERRIDES.find((entry) =>
    entry.keys.some((key) => compact.includes(key))
  );

  if (!match) {
    return null;
  }

  return {
    role: match.role,
    label: match.label,
  };
}
function detectRole(text: string, compact: string): AvoipEndpointRole {
  const knownRole = knownAvoipRoleFromSku(compact);

  if (knownRole) {
    return knownRole.role;
  }
const isTx = /\b(encoder|transmitter|source)\b/.test(text) || /-?tx\b/.test(text) || /tx$/.test(compact) || /[^a-z]e\d{2,3}/.test(text);
  const isRx = /\b(decoder|receiver|display\s*side|sink)\b/.test(text) || /-?rx\b/.test(text) || /rx$/.test(compact) || /[^a-z]d\d{2,3}/.test(text);
  const isTrx = /\b(transceiver|trx|bidirectional|two[\s-]?way)\b/.test(text);

  if (isTrx || (isTx && isRx)) return "transceiver";
  if (isTx) return "encoder";
  if (isRx) return "decoder";
  return "unknown";
}

/**
 * Compact-text markers for the common competitor AV-over-IP product lines. These
 * identify the *domain* (this is an AVoIP endpoint) even when the codec/network
 * class is unknown; the codec truth is resolved separately.
 */
const AVOIP_FAMILY_MARKERS = [
  "dmnvx", // Crestron DM NVX
  "nave", "navd", "navsd", // Extron NAV
  "nmxenc", "nmxdec", "svsi", // AMX SVSI N-series
  "mxnet", // AVPro Edge MXNet
  "vinx", "ubex", // Lightware
  "atomni", "omnistream", // Atlona OmniStream
  "kds7", "kdsen", "kdsdec", // Kramer KDS AVoIP
  "zyper", // ZeeVee ZyPer
  "moip", "b900moip", // Binary MoIP
  "networkhd",
];

function looksLikeAvoip(text: string, compact: string): boolean {
  if (includesAny(text, ["avoip", "av over ip", "av-over-ip", "network av", "networked av", "networkhd", "sdvoe", "jpeg-xs", "jpeg xs", "jpeg2000", "ndi"])) {
    return true;
  }

  // Known AVoIP codec families imply AVoIP even without the words.
  if (KNOWN_AVOIP_FAMILIES.some((family) => family.keys.some((key) => compact.includes(key)))) {
    return true;
  }

  // Broader AVoIP product-line markers (codec unknown, domain certain).
  if (AVOIP_FAMILY_MARKERS.some((marker) => compact.includes(marker))) {
    return true;
  }

  // Blustream IP-series / Binary MoIP style endpoint codes (IP###UHD-TX, B-900-MOIP).
  if (/\bip\d{2,4}[a-z0-9]*-?(tx|rx)\b/.test(text)) {
    return true;
  }

  return false;
}

/**
 * Classify a competitor AVoIP product from free text and/or a SKU. The result
 * intentionally leaves codec "unknown" rather than guessing when there is no
 * evidence, so the mapping defaults safely to 500 with a verify flag.
 */
export function classifyCompetitorAvoip(input: string): CompetitorAvoipClassification {
  const text = normaliseText(input);
  const compact = skuKey(input).toLowerCase();
  const signals: string[] = [];

  const isAvoip = looksLikeAvoip(text, compact);

  if (!isAvoip) {
    return { isAvoip: false, networkClass: "unknown", codec: "unknown", role: "unknown", signals };
  }

  const role = detectRole(text, compact);
  if (role !== "unknown") signals.push(`role: ${role}`);

  // 1) Known-family truth table (highest confidence).
  const known = KNOWN_AVOIP_FAMILIES.find((family) => family.keys.some((key) => compact.includes(key)));

  // 2) Explicit signals from the text always win for network class.
  const explicitTenGig = includesAny(text, TEN_GIG_SIGNALS);
  const explicitH26x = includesAny(text, H26X_SIGNALS);
  const explicitLossless = includesAny(text, VISUALLY_LOSSLESS_SIGNALS);
  const explicitOneGig = includesAny(text, ONE_GIG_SIGNALS);

  let networkClass: AvoipNetworkClass = "unknown";
  let codec: AvoipCodecClass = "unknown";

  if (explicitTenGig) {
    networkClass = "10g";
    codec = "uncompressed-sdvoe";
    signals.push("explicit 10G / SDVoE / uncompressed signal");
  } else if (explicitH26x) {
    networkClass = "1g";
    codec = "h264_h265";
    signals.push("explicit H.264/H.265 codec signal");
  } else if (explicitLossless) {
    networkClass = "1g";
    codec = "visually-lossless";
    signals.push("explicit visually-lossless codec signal");
  } else if (known) {
    networkClass = known.networkClass;
    codec = known.codec;
    signals.push(`known family: ${known.label}`);
  } else if (explicitOneGig) {
    networkClass = "1g";
    signals.push("explicit 1G network signal");
  }

  // If a known family pins the network class but the text gave a codec, keep the
  // codec; otherwise let the known family fill any gaps.
  if (known) {
    if (networkClass === "unknown") networkClass = known.networkClass;
    if (codec === "unknown") codec = known.codec;
    if (!signals.some((signal) => signal.startsWith("known family"))) {
      signals.push(`known family: ${known.label}`);
    }
  }

  // Default: an AVoIP endpoint with no proven 10G/codec evidence is treated as a
  // 1G product (the common case) so it maps to the 500 series, not 600.
  if (networkClass === "unknown") {
    networkClass = "1g";
    signals.push("defaulted to 1G (no 10G evidence)");
  }

  return {
    isAvoip: true,
    networkClass,
    codec,
    role,
    signals,
    knownFamily: known?.label,
  };
}

/* ------------------------------------------------------------------------- *
 * Recommendation
 * ------------------------------------------------------------------------- */

function membersForRole(profile: NetworkHdSeriesProfile, role: AvoipEndpointRole): NetworkHdAvoipMember[] {
  if (role === "encoder") {
    return profile.members.filter((member) => member.role === "encoder" || member.role === "transceiver");
  }

  if (role === "decoder") {
    return profile.members.filter((member) => member.role === "decoder" || member.role === "transceiver");
  }

  // Transceiver or unknown role -> offer the full family (encoders + decoders +
  // transceivers) so Compare suggests everything it could for a like-for-like swap.
  return profile.members;
}

function pickSeries(classification: CompetitorAvoipClassification): NetworkHdAvoipSeries {
  if (classification.networkClass === "10g" || classification.codec === "uncompressed-sdvoe") {
    return "600";
  }

  if (classification.codec === "h264_h265") {
    return "100";
  }

  // visually-lossless or unknown 1G codec -> 500 (the safe modern default).
  return "500";
}

/**
 * Map a classified competitor AVoIP endpoint to the correct NetworkHD series and
 * candidate SKUs. 10G and 1G families are never mixed, and banned legacy SKUs are
 * never returned.
 */
export function recommendNetworkHdAvoip(
  classification: CompetitorAvoipClassification,
): NetworkHdAvoipRecommendation {
  if (!classification.isAvoip) {
    return {
      applies: false,
      series: null,
      networkClass: "unknown",
      candidateSkus: [],
      leadSku: null,
      reason: "Competitor is not an AV-over-IP endpoint; NetworkHD series mapping does not apply.",
      verifyCodec: false,
      withheld: [],
      controllerReminder: "",
    };
  }

  const series = pickSeries(classification);
  const profile = NETWORKHD_AVOIP_FAMILIES[series];
  const roleMembers = stripBannedNetworkHdSkus(membersForRole(profile, classification.role));
  const candidateSkus = roleMembers.map((member) => member.sku);
  const verifyCodec = series === "500" && classification.codec === "unknown";

  const withheld: Array<{ sku: string; reason: string }> = [];
  for (const other of Object.values(NETWORKHD_AVOIP_FAMILIES)) {
    if (other.networkClass !== profile.networkClass) {
      withheld.push({
        sku: other.members[0].sku,
        reason: `${other.label} is ${other.networkClass.toUpperCase()}; never mix it with a ${profile.networkClass.toUpperCase()} endpoint.`,
      });
    }
  }

  let reason: string;
  if (series === "600") {
    reason = "Competitor is a 10G / SDVoE endpoint, so NetworkHD 600 is the only technical match. A 1G series (100/500) would not be equivalent.";
  } else if (series === "100") {
    reason = "Competitor is a 1G H.264/H.265 endpoint, so the NetworkHD 100 series is the like-for-like codec match.";
  } else if (verifyCodec) {
    reason = "Closest WyreStorm direction for a 1GbE AV-over-IP endpoint. Confirm codec and feature requirements before quoting.";
  } else {
    reason = "Competitor is a 1G visually-lossless endpoint, so the NetworkHD 500 series is the like-for-like match.";
  }

  return {
    applies: true,
    series,
    networkClass: profile.networkClass,
    candidateSkus,
    leadSku: candidateSkus[0] ?? null,
    reason,
    verifyCodec,
    withheld,
    controllerReminder: NETWORKHD_CONTROLLER_REMINDER,
  };
}

/** Convenience: classify + recommend in one call from raw competitor text/SKU. */
export function mapCompetitorToNetworkHdAvoip(input: string): {
  classification: CompetitorAvoipClassification;
  recommendation: NetworkHdAvoipRecommendation;
} {
  const classification = classifyCompetitorAvoip(input);
  return { classification, recommendation: recommendNetworkHdAvoip(classification) };
}
