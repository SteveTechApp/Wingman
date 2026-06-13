/**
 * Competitor Spec Registry
 *
 * Resolves a competitor SKU/name to a STRUCTURED specification profile drawn
 * from real datasheets, rather than parsing whatever free text the user typed.
 *
 * Resolution order:
 *   1. Curated fingerprint (exact or family) with verified datasheet specs.
 *   2. Family-rule evidence (domain/role/transport) from competitorProductIntelligence.
 *   3. Generic parsing of the input (I/O counts, resolution) as a last resort.
 *
 * The output matches the CompareDecisionProfile shape consumed by
 * classifyCompetitorCompareDecision, so the live page can compare like-for-like
 * structured specs instead of keyword guesses. Fields we are NOT confident about
 * are left undefined so the classifier returns VERIFY rather than a false blocker.
 */

import type { CompareDecisionProfile, CompareSpecFacts } from "./competitorCompareDecision";
import {
  buildCompetitorDecisionEvidence,
  normalizeCompetitorSku,
  type CompetitorTechnologyClass,
} from "./competitorProductIntelligence";
import { findCompetitorSourceProduct, type CompetitorSourceProduct } from "../data/competitorSourceFeeds";
import competitorCompareCatalogRaw from "../../../data/catalog/competitor-catalog.phase4.json";

export type CompetitorSpecTier = "verified-profile" | "family-rule" | "sku-only";

export type ResolvedCompetitorProfile = CompareDecisionProfile & {
  brand: string;
  specTier: CompetitorSpecTier;
  readiness: "approved" | "usable-with-review" | "needs-evidence" | "sku-only";
  assumptions: string[];
  whyNotDirectEquivalent: string[];
  missingFacts: string[];
  confidencePenalty: number;
  source: "fingerprint" | "family-rule" | "typed-text";
  datasheetUrl?: string;
};

type Fingerprint = {
  brand: string;
  /** Canonical example SKU used for display. */
  sku: string;
  /** Normalised keys (lowercase alphanumeric) that map to this fingerprint. */
  keys: string[];
  domain: CompetitorTechnologyClass;
  role: string;
  maxResolution?: string;
  chroma?: string;
  inputCount?: number;
  outputCount?: number;
  features?: Record<string, boolean>;
  specs?: CompareSpecFacts;
  datasheetUrl?: string;
};

/** Canonical transport derived from the technology class. Keeping transport a
 * function of domain prevents brand-specific wording (DTP, DXLink, NAVÃ¢â‚¬Â¦) from
 * producing false transport-mismatch blockers in the classifier. */
export function canonicalTransport(domain?: string): string | undefined {
  switch ((domain || "").toUpperCase()) {
    case "AVOIP":
      return "AVoIP";
    case "HDBASET":
      return "HDBaseT";
    case "MATRIX":
      return "HDMI matrix";
    case "PRESENTATION":
      return "HDMI";
    case "VIDEO_WALL":
      return "HDMI";
    case "MULTIVIEW":
      return "HDMI";
    case "USB_EXTENSION":
      return "USB";
    case "WIRELESS_PRESENTATION":
      return "Wireless";
    case "AUDIO":
      return "Audio";
    case "CONTROL":
      return "Control";
    default:
      return undefined;
  }
}

function normKey(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function textFromSourceUrl(rawUrl: unknown): string {
  const value = String(rawUrl ?? "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    return decodeURIComponent([
      parsed.hostname,
      parsed.pathname,
      parsed.search,
    ].join(" "));
  } catch {
    return value;
  }
}

function skuCandidatesFromSourceUrl(rawUrl: unknown): string[] {
  const value = textFromSourceUrl(rawUrl);
  const candidates = value
    .split(/[/?#=&_.+\s]+/g)
    .map((item) => item.trim())
    .filter((item) => /[a-z]/i.test(item) && /\d/.test(item) && item.length >= 5 && item.length <= 48);

  return Array.from(new Set(candidates));
}

// Endpoint feature defaults shared across AVoIP transceivers.
const AVOIP_ENDPOINT_IO = { inputCount: 1, outputCount: 1 } as const;

/**
 * Curated fingerprints for the most commonly compared competitor SKUs. Specs
 * reflect public datasheet headline figures. Where a precise value is uncertain
 * it is intentionally omitted so the classifier asks the user to verify rather
 * than asserting a wrong figure.
 */
const FINGERPRINTS: Fingerprint[] = [
  // ---- Crestron DM NVX (4K60 4:4:4 AV-over-IP endpoints, 1GbE, USB/KVM) ----
  {
    brand: "Crestron",
    sku: "DM-NVX-350",
    keys: ["dmnvx350", "dmnvx351", "dmnvx360", "dmnvx363"],
    domain: "AVOIP",
    role: "Transceiver",
    maxResolution: "4K60",
    chroma: "4:4:4",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true, usbC: false, dante: false, tenGig: false },
    datasheetUrl: "https://www.crestron.com/Products/Video/DM-NVX-Series",
  },
  {
    brand: "Crestron",
    sku: "DM-NVX-E30",
    keys: ["dmnvxe30", "dmnvxe31"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    chroma: "4:4:4",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true, tenGig: false },
  },
  {
    brand: "Crestron",
    sku: "DM-NVX-D30",
    keys: ["dmnvxd30", "dmnvxd31"],
    domain: "AVOIP",
    role: "Decoder",
    maxResolution: "4K60",
    chroma: "4:4:4",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true, tenGig: false },
  },
  // ---- Extron NAV (PURE3 AV-over-IP, 4K60 4:4:4, 1GbE) ----
  {
    brand: "Extron",
    sku: "NAV E 501",
    keys: ["nave501", "nave121", "nave101"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    chroma: "4:4:4",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true, tenGig: false },
  },
  {
    brand: "Extron",
    sku: "NAV D 501",
    keys: ["navd501", "navd121", "navd101"],
    domain: "AVOIP",
    role: "Decoder",
    maxResolution: "4K60",
    chroma: "4:4:4",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true, tenGig: false },
  },
  // ---- Extron DTP (HDBaseT-class twisted-pair extension) ----
  {
    brand: "Extron",
    sku: "DTP2 T 211",
    keys: ["dtp2t211", "dtp3t202", "dtp3t201"],
    domain: "HDBASET",
    role: "Transmitter",
    maxResolution: "4K60",
    features: { hdbtOutput: true },
  },
  {
    brand: "Extron",
    sku: "DTP2 R 211",
    keys: ["dtp2r211", "dtp3r201"],
    domain: "HDBASET",
    role: "Receiver",
    maxResolution: "4K60",
    features: { receiverKit: true, hdbtOutput: true },
  },
  // ---- AMX SVSI N-Series (1G AV-over-IP) ----
  {
    brand: "AMX",
    sku: "NMX-ENC-N2412A",
    keys: ["nmxencn2412a", "nmxencn2612s", "nmxencn2615dwp"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true, tenGig: false },
  },
  {
    brand: "AMX",
    sku: "NMX-DEC-N2422A",
    keys: ["nmxdecn2422a", "nmxdecn2622s", "nmxdecn2625dwp"],
    domain: "AVOIP",
    role: "Decoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true, tenGig: false },
  },
  // ---- ZeeVee ZyPer4K (AV-over-IP) ----
  {
    brand: "ZeeVee",
    sku: "ZyPer4K Encoder",
    keys: ["zyper4kencoder", "zyperuhd60encoder", "zyperuhdencoder"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
  },
  {
    brand: "ZeeVee",
    sku: "ZyPer4K Decoder",
    keys: ["zyper4kdecoder", "zyperuhd60decoder", "zyperuhddecoder"],
    domain: "AVOIP",
    role: "Decoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
  },
  // ---- Blustream IP-series (AV-over-IP TX/RX) ----
  {
    brand: "Blustream",
    sku: "IP300UHD-TX",
    keys: ["ip200uhdtx", "ip250uhdtx", "ip300uhdtx", "ip350uhdtx"],
    domain: "AVOIP",
    role: "Transmitter",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
  },
  {
    brand: "Blustream",
    sku: "IP300UHD-RX",
    keys: ["ip200uhdrx", "ip250uhdrx", "ip300uhdrx", "ip350uhdrx"],
    domain: "AVOIP",
    role: "Receiver",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
    features: { receiverKit: true },
  },
  // ---- Kramer matrices ----
  {
    brand: "Kramer",
    sku: "VS-88H2A",
    keys: ["vs88h2a"],
    domain: "MATRIX",
    role: "Matrix",
    maxResolution: "4K60",
    inputCount: 8,
    outputCount: 8,
  },
  {
    brand: "Kramer",
    sku: "VS-44H2A",
    keys: ["vs44h2a"],
    domain: "MATRIX",
    role: "Matrix",
    maxResolution: "4K60",
    inputCount: 4,
    outputCount: 4,
  },
  // ---- Lightware AV-over-IP ----
  {
    brand: "Lightware",
    sku: "VINX-110-HDMI-ENC",
    keys: ["vinx110hdmienc", "vinx120hdmienc"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
  },
  {
    brand: "Lightware",
    sku: "VINX-210AP-HDMI-DEC",
    keys: ["vinx210aphdmidec", "vinx210hdmidec"],
    domain: "AVOIP",
    role: "Decoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
    features: { receiverKit: true },
  },
  // ---- AVPro Edge MXNet 10G transceiver (SDVoE-class, 4K60 4:4:4) ----
  {
    brand: "AVPro Edge",
    sku: "MXNet-10G-TCVR",
    keys: ["mxnet10gtcvr"],
    domain: "AVOIP",
    role: "Transceiver",
    maxResolution: "4K60",
    chroma: "4:4:4",
    ...AVOIP_ENDPOINT_IO,
    features: { tenGig: true, zeroLatency: true, lossless: true, usbRouting: true },
  },
  // ---- Barco ClickShare (wireless presentation / conferencing) ----
  {
    brand: "Barco",
    sku: "CX-50",
    keys: ["cx50", "cx30", "cx20", "c5", "c10", "cx50gen2"],
    domain: "WIRELESS_PRESENTATION",
    role: "Wireless Presentation",
    features: { wireless: true, usbC: true },
  },

  // ---- Crestron presentation / extension / matrix ----
  {
    brand: "Crestron",
    sku: "HD-MD4X2-4KZ-E",
    keys: ["hdmd4x24kze", "hdmd4x4"],
    domain: "MATRIX",
    role: "Matrix",
    maxResolution: "4K60",
    chroma: "4:4:4",
    inputCount: 4,
    outputCount: 2,
  },
  {
    brand: "Crestron",
    sku: "HD-TX-4KZ-211-2G",
    keys: ["hdtx4kz2112g", "hdtx4kz211"],
    domain: "HDBASET",
    role: "transmitter",
    maxResolution: "4K60",
    features: { hdbtOutput: true },
  },
  {
    brand: "Crestron",
    sku: "HD-RX-4K-510-C-E",
    keys: ["hdrx4k510ce", "hdrx4k510"],
    domain: "HDBASET",
    role: "receiver",
    maxResolution: "4K60",
    features: { hdbtOutput: true, receiverKit: true },
  },
  {
    brand: "Crestron",
    sku: "DMPS3-4K-350-C",
    keys: ["dmps34k350c", "dmps34k250c", "dmps3"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    maxResolution: "4K30",
    features: { usbRouting: true },
  },
  // ---- Extron presentation ----
  {
    brand: "Extron",
    sku: "IN1608 xi",
    keys: ["in1608xi", "in1608", "in1804", "in1606"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    inputCount: 8,
    outputCount: 1,
  },
  // ---- Atlona OmniStream (AV-over-IP) ----
  {
    brand: "Atlona",
    sku: "AT-OMNI-111",
    keys: ["atomni111", "atomni121", "atomni141", "atomni232"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
  },
  {
    brand: "Atlona",
    sku: "AT-OMNI-112",
    keys: ["atomni112", "atomni122", "atomni142", "atomni324"],
    domain: "AVOIP",
    role: "Decoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
  },
  // ---- Atlona Omega presentation / collaboration switchers ----
  {
    brand: "Atlona",
    sku: "AT-OME-MS42",
    keys: ["atomems42", "atomems52", "atomems63"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    maxResolution: "4K60",
    inputCount: 4,
    outputCount: 2,
    features: { usbC: true, usbRouting: true },
  },
  {
    brand: "Atlona",
    sku: "AT-OME-PS62",
    keys: ["atomeps62"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    maxResolution: "4K60",
    inputCount: 6,
    outputCount: 2,
    features: { usbC: true },
  },
  {
    brand: "Atlona",
    sku: "AT-OME-CS31-SA",
    keys: ["atomecs31sa", "atomecs31", "atomecs51"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    maxResolution: "4K60",
    inputCount: 3,
    outputCount: 1,
    features: { usbC: true },
  },
  // ---- Atlona HDBaseT extender kits (role left to verify; kit feature flagged) ----
  {
    brand: "Atlona",
    sku: "AT-OME-EX-KIT",
    keys: ["atomeexkit"],
    domain: "HDBASET",
    role: "transmitter",
    maxResolution: "4K60",
    features: { hdbtOutput: true, receiverKit: true, usbRouting: true },
  },
  {
    brand: "Atlona",
    sku: "AT-UHD-EX-100CE-KIT",
    keys: ["atuhdex100cekit", "atuhdex70", "atuhdex100"],
    domain: "HDBASET",
    role: "transmitter",
    maxResolution: "4K30",
    features: { hdbtOutput: true, receiverKit: true },
  },
  {
    brand: "Atlona",
    sku: "AT-UHD-PRO3-88M",
    keys: ["atuhdpro388m", "atuhdpro366m", "atuhdpro3"],
    domain: "MATRIX",
    role: "Matrix",
    inputCount: 8,
    outputCount: 8,
  },
  // ---- Kramer AV-over-IP endpoints ----
  {
    brand: "Kramer",
    sku: "KDS-7-EN7",
    keys: ["kds7en7", "kdsen6", "kds100"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
  },
  {
    brand: "Kramer",
    sku: "KDS-7-DEC7",
    keys: ["kds7dec7", "kdsdec6"],
    domain: "AVOIP",
    role: "Decoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
  },
  // ---- Kramer presentation switchers / scalers ----
  {
    brand: "Kramer",
    sku: "VP-440X",
    keys: ["vp440x", "vp551x", "vp554x", "vp440"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    maxResolution: "4K60",
  },
  // ---- Lightware ----
  {
    brand: "Lightware",
    sku: "MMX8x8-HDMI-4K-A",
    keys: ["mmx8x8hdmi4ka", "mmx8x8hdmi4k", "mmx6x2", "mmx4x2"],
    domain: "MATRIX",
    role: "Matrix",
    maxResolution: "4K30",
    inputCount: 8,
    outputCount: 8,
  },
  {
    brand: "Lightware",
    sku: "TAURUS UCX-2x1-HC30",
    keys: ["taurusucx2x1hc30", "taurusucx2x1", "taurusucx"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    maxResolution: "4K60",
    inputCount: 2,
    outputCount: 1,
    features: { usbC: true, usbRouting: true },
  },
  {
    brand: "Lightware",
    sku: "TAURUS UCX-4x2-HC30",
    keys: ["taurusucx4x2hc30", "taurusucx4x2"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    maxResolution: "4K60",
    inputCount: 4,
    outputCount: 2,
    features: { usbC: true, usbRouting: true },
  },
  {
    brand: "Lightware",
    sku: "UBEX-PRO20-HDMI-F100",
    keys: ["ubexpro20hdmif100", "ubexpro20hdmif110", "ubexpro20"],
    domain: "AVOIP",
    role: "Transceiver",
    maxResolution: "4K60",
    chroma: "4:4:4",
    ...AVOIP_ENDPOINT_IO,
    features: { tenGig: true, lossless: true, zeroLatency: true },
  },
  // ---- Blustream HDBaseT matrices / kits ----
  {
    brand: "Blustream",
    sku: "HMX88-18G-KIT",
    keys: ["hmx8818gkit", "c88cs", "pla88cs"],
    domain: "MATRIX",
    role: "Matrix",
    maxResolution: "4K60",
    inputCount: 8,
    outputCount: 8,
  },
  {
    brand: "Blustream",
    sku: "HMX44-18G-KIT",
    keys: ["hmx4418gkit", "c44kit"],
    domain: "MATRIX",
    role: "Matrix",
    maxResolution: "4K60",
    inputCount: 4,
    outputCount: 4,
  },
  {
    brand: "Blustream",
    sku: "ACM210",
    keys: ["acm210"],
    domain: "CONTROL",
    role: "controller",
  },
  // ---- AMX matrices / presentation / extension / AVoIP / control ----
  {
    brand: "AMX",
    sku: "DGX1600-ENC",
    keys: ["dgx1600enc", "dgx1600"],
    domain: "MATRIX",
    role: "Matrix",
    inputCount: 16,
    outputCount: 16,
  },
  {
    brand: "AMX",
    sku: "DGX6400-ENC",
    keys: ["dgx6400enc", "dgx6400"],
    domain: "MATRIX",
    role: "Matrix",
    inputCount: 64,
    outputCount: 64,
  },
  {
    brand: "AMX",
    sku: "DVX-2265-4K",
    keys: ["dvx22654k", "dvx2265", "dvx3266", "dvx2266"],
    domain: "PRESENTATION",
    role: "presentation switcher",
    maxResolution: "4K30",
  },
  {
    brand: "AMX",
    sku: "DXL-TX-4K60",
    keys: ["dxltx4k60", "dxltx"],
    domain: "HDBASET",
    role: "transmitter",
    maxResolution: "4K60",
    features: { hdbtOutput: true },
  },
  {
    brand: "AMX",
    sku: "DXL-RX-4K60",
    keys: ["dxlrx4k60", "dxlrx"],
    domain: "HDBASET",
    role: "receiver",
    maxResolution: "4K60",
    features: { hdbtOutput: true, receiverKit: true },
  },
  {
    brand: "AMX",
    sku: "NMX-ENC-N3312D",
    keys: ["nmxencn3312d", "nmxdecn3322", "nmxencn3300"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    chroma: "4:4:4",
    ...AVOIP_ENDPOINT_IO,
    features: { tenGig: true, usbRouting: true },
  },
  {
    brand: "AMX",
    sku: "NX-2200",
    keys: ["nx2200", "nx1200", "nx3200", "nx4200", "museautomator", "muse"],
    domain: "CONTROL",
    role: "controller",
  },
  // ---- AVPro Edge ----
  {
    brand: "AVPro Edge",
    sku: "MXNet-1G-E",
    keys: ["mxnet1ge"],
    domain: "AVOIP",
    role: "Encoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true },
  },
  {
    brand: "AVPro Edge",
    sku: "MXNet-1G-D",
    keys: ["mxnet1gd"],
    domain: "AVOIP",
    role: "Decoder",
    maxResolution: "4K60",
    ...AVOIP_ENDPOINT_IO,
    features: { usbRouting: true },
  },
  {
    brand: "AVPro Edge",
    sku: "AC-MX-88",
    keys: ["acmx88", "acmx1616", "acmx108"],
    domain: "MATRIX",
    role: "Matrix",
    maxResolution: "4K60",
    chroma: "4:4:4",
    inputCount: 8,
    outputCount: 8,
  },
  {
    brand: "AVPro Edge",
    sku: "AC-MX-44HDBT",
    keys: ["acmx44hdbt", "acmx42x", "acmx44"],
    domain: "MATRIX",
    role: "Matrix",
    maxResolution: "4K60",
    chroma: "4:4:4",
    inputCount: 4,
    outputCount: 4,
  },
  {
    brand: "AVPro Edge",
    sku: "AC-EX70-444-KIT",
    keys: ["acex70444kit", "acex70444r3", "acex40444kit", "acex70"],
    domain: "HDBASET",
    role: "transmitter",
    maxResolution: "4K60",
    chroma: "4:4:4",
    features: { hdbtOutput: true, receiverKit: true },
  },
  // ---- Binary (SnapAV) ----
  {
    brand: "Binary",
    sku: "B-900-MOIP-4K-TX",
    keys: ["b900moip4ktx", "b900moiptx"],
    domain: "AVOIP",
    role: "Transmitter",
    ...AVOIP_ENDPOINT_IO,
  },
  {
    brand: "Binary",
    sku: "B-900-MOIP-4K-RX",
    keys: ["b900moip4krx", "b900moiprx"],
    domain: "AVOIP",
    role: "Receiver",
    ...AVOIP_ENDPOINT_IO,
    features: { receiverKit: true },
  },
  {
    brand: "Binary",
    sku: "B-660-MTRX-8x8",
    keys: ["b660mtrx8x8"],
    domain: "MATRIX",
    role: "Matrix",
    inputCount: 8,
    outputCount: 8,
  },
  {
    brand: "Binary",
    sku: "B-660-MTRX-4x4",
    keys: ["b660mtrx4x4"],
    domain: "MATRIX",
    role: "Matrix",
    inputCount: 4,
    outputCount: 4,
  },
  {
    brand: "Binary",
    sku: "B-660-EXT-444-100A",
    keys: ["b660ext444100a", "b660ext"],
    domain: "HDBASET",
    role: "transmitter",
    maxResolution: "4K60",
    chroma: "4:4:4",
    features: { hdbtOutput: true, receiverKit: true },
  },
  {
    brand: "Binary",
    sku: "B-260-HDMI-CTRL",
    keys: ["b260hdmictrl", "b260"],
    domain: "CONTROL",
    role: "controller",
  },
];

function lookupFingerprint(rawSku: string): Fingerprint | null {
  const candidate = normKey(rawSku);
  if (!candidate) return null;

  for (const fp of FINGERPRINTS) {
    for (const key of fp.keys) {
      const isExact = candidate === key;
      const inputContainsKnownSku = key.length >= 5 && candidate.includes(key);
      const missingPrefixMatch = candidate.length >= 5 && key.endsWith(candidate);

      if (isExact || inputContainsKnownSku || missingPrefixMatch) {
        return fp;
      }
    }
  }

  return null;
}

function parseIoCounts(text: string): { inputCount?: number; outputCount?: number } {
  const match = text.match(/(\d{1,2})\s*[xÃƒâ€”]\s*(\d{1,2})/);
  if (match) {
    return { inputCount: Number(match[1]), outputCount: Number(match[2]) };
  }
  return {};
}

function quantityFromLabel(text: string, labels: string[]): number | undefined {
  for (const label of labels) {
    const labelPattern = label.replace(/\s+/g, "\\s+");
    const after = text.match(new RegExp(`\\b${labelPattern}\\b\\D{0,24}(\\d{1,2})\\b`, "i"));
    if (after) return Number(after[1]);

    const before = text.match(new RegExp(`\\b(\\d{1,2})\\s*(?:x\\s*)?${labelPattern}\\b`, "i"));
    if (before) return Number(before[1]);
  }

  return undefined;
}

function parseResolution(text: string): string | undefined {
  const value = text.toLowerCase();
  if (/8k|4320/.test(value)) return "8K";
  if (/4k\s*60|4k60|2160p\s*60|60\s*hz.*4k|4k.*60\s*hz/.test(value)) return "4K60";
  if (/4k|uhd|2160/.test(value)) return "4K30"; // conservative: ranks below 4K60, never over-claims
  if (/1080|fhd|1920/.test(value)) return "1080p";
  return undefined;
}

function parseFeatures(text: string): Record<string, boolean> {
  const value = text.toLowerCase();
  const features: Record<string, boolean> = {};
  if (/usb-?c/.test(value)) features.usbC = true;
  if (/kvm|usb routing|usb host|usb 2|usb 3|usb2|usb3/.test(value)) features.usbRouting = true;
  if (/\bdante\b/.test(value)) features.dante = true;
  if (/aes67/.test(value)) features.aes67 = true;
  if (/multiview|multi-view/.test(value)) features.multiview = true;
  if (/video\s*wall|videowall/.test(value)) features.videoWall = true;
  if (/wireless|clickshare|airmedia/.test(value)) features.wireless = true;
  if (/\b10g\b|sdvoe/.test(value)) features.tenGig = true;
  if (/hdbaset|hdbt/.test(value)) features.hdbtOutput = true;
  if (/rs-?232|ir\b|cec|relay|contact closure|control/.test(value)) features.control = true;
  if (/\bpoe\b|\bpoh\b|\bpoc\b|power over ethernet/.test(value)) features.poe = true;
  if (/\bpoc\b/.test(value)) features.poc = true;
  if (/\bpoh\b/.test(value)) features.poh = true;
  if (/audio\s*de.?embed|de.?embed/.test(value)) features.audioDeEmbed = true;
  if (/audio\s*embed/.test(value)) features.audioEmbed = true;
  return features;
}

function parseSpecFacts(text: string, inputCount?: number, outputCount?: number, features: Record<string, boolean> = {}): CompareSpecFacts {
  const value = text.toLowerCase();
  const specs: CompareSpecFacts = {};

  if (inputCount) specs.hdmiInputs = inputCount;
  if (outputCount) specs.hdmiOutputs = outputCount;

  specs.hdmiInputs = quantityFromLabel(value, ["hdmi inputs", "video inputs", "input count"]) ?? specs.hdmiInputs;
  specs.hdmiOutputs = quantityFromLabel(value, ["hdmi outputs", "video outputs", "output count"]) ?? specs.hdmiOutputs;

  specs.usbHostPorts = quantityFromLabel(value, ["usb host ports", "usb hosts", "host ports"]);
  specs.usbDevicePorts = quantityFromLabel(value, ["usb device ports", "usb client ports", "usb peripheral ports", "device ports"]);
  specs.usbTotalPorts = quantityFromLabel(value, ["usb total ports", "usb ports"]);
  if (/usb\s*host/.test(value)) specs.usbHostPorts = specs.usbHostPorts ?? 1;
  if (/usb\s*(device|client|peripheral)/.test(value)) specs.usbDevicePorts = specs.usbDevicePorts ?? 1;
  if (/usb|kvm/.test(value) || features.usbRouting) specs.usbTotalPorts = specs.usbTotalPorts ?? 1;

  specs.audioInputs = quantityFromLabel(value, ["audio inputs", "audio in ports", "mic inputs", "line inputs"]);
  specs.audioOutputs = quantityFromLabel(value, ["audio outputs", "audio out ports", "line outputs"]);
  specs.networkPorts = quantityFromLabel(value, ["network ports", "lan ports", "ethernet ports", "rj45 ports"]);
  specs.controlPorts = quantityFromLabel(value, ["control ports", "control connections"]);
  if (/audio\s*in|mic|microphone|line\s*in/.test(value)) specs.audioInputs = specs.audioInputs ?? 1;
  if (/audio\s*out|line\s*out|speaker|toslink|spdif/.test(value)) specs.audioOutputs = specs.audioOutputs ?? 1;
  if (/ethernet|lan|rj45|network/.test(value)) specs.networkPorts = specs.networkPorts ?? 1;
  if (/rs-?232|ir\b|cec|relay|gpio|contact closure|control/.test(value) || features.control) specs.controlPorts = specs.controlPorts ?? 1;

  specs.rs232 = /rs-?232/.test(value) ? true : undefined;
  specs.ir = /\bir\b|infrared/.test(value) ? true : undefined;
  specs.cec = /\bcec\b/.test(value) ? true : undefined;
  specs.relay = /relay|contact closure/.test(value) ? true : undefined;
  specs.gpio = /gpio/.test(value) ? true : undefined;
  specs.ethernetControl = /ethernet|lan|web ui|api|tcp\/ip|tcp-ip/.test(value) ? true : undefined;

  specs.audioDeEmbed = Boolean(features.audioDeEmbed || /audio\s*de.?embed|de.?embed/.test(value));
  specs.audioEmbed = Boolean(features.audioEmbed || /audio\s*embed/.test(value));
  specs.analogAudio = /analog audio|analogue audio|line in|line out|phoenix audio/.test(value) ? true : undefined;
  specs.arc = /\barc\b/.test(value) ? true : undefined;
  specs.earc = /\bearc\b/.test(value) ? true : undefined;
  specs.dante = Boolean(features.dante || /\bdante\b/.test(value));
  specs.aes67 = Boolean(features.aes67 || /aes67/.test(value));

  specs.poe = Boolean(features.poe || /\bpoe\b|power over ethernet/.test(value));
  specs.poc = Boolean(features.poc || /\bpoc\b|power over cable/.test(value));
  specs.poh = Boolean(features.poh || /\bpoh\b|power over hdbaset/.test(value));
  specs.powerDelivery = /usb-c power|power delivery|\bpd\b/.test(value) ? true : undefined;
  specs.externalPsu = /external power|dc power|power supply|psu|adapter/.test(value) ? true : undefined;
  specs.internalPsu = /internal power|iec|mains input/.test(value) ? true : undefined;

  if (specs.poh) specs.powerSupply = "PoH / HDBaseT remote power";
  else if (specs.poc) specs.powerSupply = "PoC remote power";
  else if (specs.poe) specs.powerSupply = "PoE";
  else if (specs.externalPsu) specs.powerSupply = "External PSU";
  else if (specs.internalPsu) specs.powerSupply = "Internal PSU";

  return Object.fromEntries(Object.entries(specs).filter(([, item]) => item !== undefined)) as CompareSpecFacts;
}

function sourceProductDomain(product: CompetitorSourceProduct): CompetitorTechnologyClass {
  return product.domain === "WIRELESS_COLLAB" ? "WIRELESS_PRESENTATION" : product.domain;
}

function specsFromSourceProduct(product: CompetitorSourceProduct): CompareSpecFacts {
  return {
    ...parseSpecFacts([product.summary, ...product.evidence].join(" "), product.inputCount, product.outputCount, product.features),
    hdmiInputs: product.inputCount,
    hdmiOutputs: product.outputCount,
    dante: product.features.dante,
    aes67: product.features.aes67,
    audioDeEmbed: product.features.audioDeEmbed,
    audioEmbed: product.features.audioEmbed,
    poc: product.features.poc,
    poe: product.features.poe,
    poh: product.features.poh,
    rs232: product.features.irRs232,
    controlPorts: product.features.control ? 1 : undefined,
  };
}

/* ------------------------------------------------------------------------- *
 * Structured competitor compare catalog (data/catalog/competitor-catalog.phase4.json)
 *
 * This 79-product structured catalog was previously unused. Each entry is mapped
 * into the same Fingerprint shape the curated list uses, so any catalogued
 * competitor SKU resolves to a verified-profile with real I/O, resolution and
 * feature facts. Hand-curated fingerprints still take priority; the catalog
 * fills the long tail.
 * ------------------------------------------------------------------------- */

type CatalogPort = { type?: string; count?: number };
type CatalogEntry = {
  sku?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  technology?: string;
  role?: string;
  directionality?: string;
  transport?: string;
  summary?: string;
  sourceUrl?: string;
  inputs?: CatalogPort[];
  outputs?: CatalogPort[];
  control?: string[];
  audio?: string[];
  features?: string[];
  video?: { maxResolution?: string; hdmi?: string; hdr?: boolean };
  matrixInputs?: number;
  matrixOutputs?: number;
  routedInputCount?: number;
  routedOutputCount?: number;
};

const COMPETITOR_COMPARE_CATALOG = competitorCompareCatalogRaw as unknown as CatalogEntry[];

const CATALOG_VIDEO_PORT = /(hdmi|hdbaset|displayport|\bdp\b|dtp\d?|\bdm\b|tpx|modular|analog video|av input)/i;

function catalogDomain(entry: CatalogEntry): CompetitorTechnologyClass | undefined {
  const tech = String(entry.technology ?? "").toLowerCase();
  const category = String(entry.category ?? "").toLowerCase();

  if (tech.includes("avoip") || category === "avoip") return "AVOIP";
  if (tech.includes("hdbaset") || category === "extender") return "HDBASET";
  if (tech.includes("video wall") || category === "video wall") return "VIDEO_WALL";
  if (tech.includes("matrix") || category === "matrix") return "MATRIX";
  if (tech.includes("wireless") || category === "wireless presentation") return "WIRELESS_PRESENTATION";
  if (tech.includes("usb extension")) return "USB_EXTENSION";
  if (tech.includes("control") || category === "control") return "CONTROL";
  if (tech.includes("distribution") || category === "distribution") return "MATRIX";
  if (tech.includes("presentation") || tech.includes("unified communications") || category === "switcher" || category === "uc") {
    return "PRESENTATION";
  }
  return undefined;
}

function catalogRole(entry: CatalogEntry): string | undefined {
  const role = String(entry.role ?? "").toLowerCase().replace(/[-_]+/g, " ").trim();
  const direction = String(entry.directionality ?? "").toLowerCase();

  if (!role || role === "accessory") return undefined;
  if (role === "endpoint") {
    if (direction === "tx") return "encoder";
    if (direction === "rx") return "decoder";
    return "transceiver";
  }
  if (role === "tx") return "transmitter";
  if (role === "rx") return "receiver";
  if (role === "extender" || role === "extender kit") return "transmitter";
  if (role === "matrix switcher" || role === "distribution amplifier") return "matrix";
  if (role.startsWith("wireless")) return "wireless presentation";
  if (role === "video bar") return "presentation switcher";
  return role;
}

function catalogChroma(resolution?: string): string | undefined {
  const value = String(resolution ?? "");
  if (/4:4:4/.test(value)) return "4:4:4";
  if (/4:2:2/.test(value)) return "4:2:2";
  if (/4:2:0/.test(value)) return "4:2:0";
  return undefined;
}

function countCatalogPorts(ports: CatalogPort[] | undefined, matcher: RegExp): number | undefined {
  if (!Array.isArray(ports)) return undefined;
  const total = ports
    .filter((port) => matcher.test(String(port.type ?? "")))
    .reduce((sum, port) => sum + (Number.isFinite(Number(port.count)) ? Number(port.count) : 0), 0);
  return total > 0 ? total : undefined;
}

function catalogEntryToFingerprint(entry: CatalogEntry): Fingerprint | null {
  const sku = String(entry.sku ?? "").trim();
  const brand = String(entry.brand ?? "").trim();
  if (!sku || !brand) return null;

  const domain = catalogDomain(entry);
  if (!domain) return null; // skip accessories / unmapped categories

  const role = catalogRole(entry);

  // I/O counts: matrices use routed/matrix size; AVoIP endpoints are single-stream
  // (left undefined so they are never penalised); others count physical video ports.
  let inputCount: number | undefined;
  let outputCount: number | undefined;
  if (domain === "MATRIX" || domain === "VIDEO_WALL") {
    inputCount = entry.matrixInputs ?? entry.routedInputCount ?? countCatalogPorts(entry.inputs, CATALOG_VIDEO_PORT);
    outputCount = entry.matrixOutputs ?? entry.routedOutputCount ?? countCatalogPorts(entry.outputs, CATALOG_VIDEO_PORT);
  } else if (domain !== "AVOIP") {
    inputCount = countCatalogPorts(entry.inputs, CATALOG_VIDEO_PORT);
    outputCount = countCatalogPorts(entry.outputs, CATALOG_VIDEO_PORT);
  }

  const portTypes = [
    ...(entry.inputs ?? []).map((p) => p.type ?? ""),
    ...(entry.outputs ?? []).map((p) => p.type ?? ""),
  ].join(" ");
  const blob = [
    entry.summary,
    (entry.features ?? []).join(" "),
    (entry.control ?? []).join(" "),
    (entry.audio ?? []).join(" "),
    portTypes,
    entry.video?.maxResolution,
  ].filter(Boolean).join(" ");

  const features = parseFeatures(blob);
  if (/usb-?c/i.test(portTypes)) features.usbC = true;
  if (/usb (host|device)/i.test(portTypes)) features.usbRouting = true;

  const specs: CompareSpecFacts = { ...parseSpecFacts(blob, inputCount, outputCount, features) };
  const hdmiIn = countCatalogPorts(entry.inputs, /hdmi/i);
  const hdmiOut = countCatalogPorts(entry.outputs, /hdmi/i);
  if (hdmiIn) specs.hdmiInputs = hdmiIn;
  if (hdmiOut) specs.hdmiOutputs = hdmiOut;
  const lanPorts = countCatalogPorts(entry.outputs, /lan|ethernet|network/i) ?? countCatalogPorts(entry.inputs, /lan|ethernet|network/i);
  if (lanPorts) specs.networkPorts = lanPorts;

  return {
    brand,
    sku,
    keys: [normKey(sku)],
    domain,
    role: role ?? "",
    maxResolution: parseResolution([entry.video?.maxResolution, entry.summary].filter(Boolean).join(" ")),
    chroma: catalogChroma(entry.video?.maxResolution),
    inputCount,
    outputCount,
    features: Object.keys(features).length ? features : undefined,
    specs: Object.keys(specs).length ? specs : undefined,
    datasheetUrl: entry.sourceUrl,
  };
}

const CATALOG_FINGERPRINTS: Fingerprint[] = COMPETITOR_COMPARE_CATALOG
  .map(catalogEntryToFingerprint)
  .filter((fp): fp is Fingerprint => Boolean(fp));

const CATALOG_FINGERPRINT_BY_KEY = new Map<string, Fingerprint>();
for (const fp of CATALOG_FINGERPRINTS) {
  for (const key of fp.keys) {
    if (key && !CATALOG_FINGERPRINT_BY_KEY.has(key)) CATALOG_FINGERPRINT_BY_KEY.set(key, fp);
  }
}

function lookupCatalogFingerprint(rawSku: string): Fingerprint | null {
  const candidate = normKey(rawSku);
  if (!candidate || candidate.length < 4) return null;

  const direct = CATALOG_FINGERPRINT_BY_KEY.get(candidate);
  if (direct) return direct;

  for (const fp of CATALOG_FINGERPRINTS) {
    const key = fp.keys[0];
    if (key && key.length >= 6 && (candidate.includes(key) || key.includes(candidate))) {
      return fp;
    }
  }
  return null;
}

/**
 * Resolve a competitor SKU/name to a structured spec profile.
 */
export function resolveCompetitorSpecProfile(
  rawInput: string,
  providedBrand?: string,
  sourceUrl?: string,
): ResolvedCompetitorProfile {
  const input = String(rawInput ?? "").trim();
  const normalised = normalizeCompetitorSku(input, providedBrand);
  const canonicalInput = normalised?.sku || input;
  const canonicalBrand = normalised?.brand || providedBrand;
  const evidence = buildCompetitorDecisionEvidence({
    brand: canonicalBrand,
    sku: canonicalInput,
    title: input,
  });

  const sourceUrlText = textFromSourceUrl(sourceUrl);
  const sourceSkuCandidates = skuCandidatesFromSourceUrl(sourceUrl);
  const fingerprint =
    lookupFingerprint(evidence.sku) ||
    lookupFingerprint(canonicalInput) ||
    lookupFingerprint(input) ||
    lookupFingerprint(sourceUrlText) ||
    lookupCatalogFingerprint(evidence.sku) ||
    lookupCatalogFingerprint(canonicalInput) ||
    lookupCatalogFingerprint(input) ||
    lookupCatalogFingerprint(sourceUrlText);
  // Separate catalogue lookup used only to backfill a real datasheet URL when a
  // hand-curated fingerprint wins but has no URL of its own.
  const catalogFingerprint =
    lookupCatalogFingerprint(evidence.sku) ||
    lookupCatalogFingerprint(canonicalInput) ||
    lookupCatalogFingerprint(input) ||
    lookupCatalogFingerprint(sourceUrlText);
  const sourceProduct = findCompetitorSourceProduct(
    canonicalBrand || evidence.brand,
    evidence.sku || canonicalInput,
    sourceUrl || input,
  ) || sourceSkuCandidates
    .map((candidate) => findCompetitorSourceProduct(canonicalBrand || evidence.brand, candidate, sourceUrl || input))
    .find(Boolean);

  // Domain: prefer fingerprint, fall back to family-rule evidence (UNKNOWN -> undefined).
  const domain =
    fingerprint?.domain ||
    (sourceProduct ? sourceProductDomain(sourceProduct) : undefined) ||
    (evidence.domain && evidence.domain !== "UNKNOWN" ? evidence.domain : undefined);

  const role =
    fingerprint?.role ||
    sourceProduct?.role ||
    (evidence.role && evidence.role !== "Unknown" ? evidence.role : undefined);

  const parsedIo = parseIoCounts(canonicalInput);
  const parseBasis = [canonicalInput, input, sourceUrlText].filter(Boolean).join(" ");
  const parsedFeatures = parseFeatures(parseBasis);
  const features = {
    ...(sourceProduct?.features ?? {}),
    ...parsedFeatures,
    ...(fingerprint?.features ?? {}),
  };
  const hasFeatures = Object.keys(features).length > 0;

  function competitorSpecFamilyGuardKey(value: unknown): string {
    return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  }

  function isFamilyLevelCompetitorSpecInput(rawInput: unknown, evidenceSku: unknown, providedBrand?: unknown): boolean {
    const rawKey = competitorSpecFamilyGuardKey(rawInput);
    const evidenceKey = competitorSpecFamilyGuardKey(evidenceSku);
    const brandKey = competitorSpecFamilyGuardKey(providedBrand);

    const candidates = [rawKey, evidenceKey]
      .map((value) => brandKey && value.startsWith(brandKey) ? value.slice(brandKey.length) : value)
      .filter(Boolean);

    const familyOnlyKeys = new Set([
      "DMNVX",
      "NAV",
      "DTP",
      "KDS",
      "NMX",
      "MXNET",
      "ZYPER",
      "UBEX",
      "VINX",
      "ATOMNI",
      "B900MOIP",
      "IPUHD"
    ]);

    for (const candidate of candidates) {
      if (familyOnlyKeys.has(candidate)) {
        return true;
      }

      if (!/\d/.test(candidate) && /^DMNVX[A-Z]*$/.test(candidate)) {
        return true;
      }

      if (!/\d/.test(candidate) && /^NAV[A-Z]*$/.test(candidate)) {
        return true;
      }
    }

    return false;
  }
  const familyLevelInput = isFamilyLevelCompetitorSpecInput(canonicalInput, evidence.sku, canonicalBrand || normalised?.brand || evidence.brand);
  const hasVerifiedFingerprint = Boolean(fingerprint) && !familyLevelInput;
  const hasVerifiedSourceProduct = Boolean(sourceProduct) && !familyLevelInput;

  const specTier: CompetitorSpecTier = hasVerifiedFingerprint
    ? "verified-profile"
    : hasVerifiedSourceProduct
      ? "verified-profile"
      : evidence.tier === "family-rule" || familyLevelInput
      ? "family-rule"
      : "sku-only";
  const evidenceSkuKey = normKey(evidence.sku);
  const displaySku = fingerprint && !fingerprint.keys.includes(evidenceSkuKey)
    ? fingerprint.sku
    : evidence.sku || canonicalInput;

  return {
    sku: sourceProduct?.sku || displaySku,
    title: sourceProduct?.title || canonicalInput,
    domain,
    role,
    transport: sourceProduct?.transport || canonicalTransport(domain),
    inputCount: fingerprint?.inputCount ?? sourceProduct?.inputCount ?? parsedIo.inputCount,
    outputCount: fingerprint?.outputCount ?? sourceProduct?.outputCount ?? parsedIo.outputCount,
    maxResolution: fingerprint?.maxResolution ?? sourceProduct?.maxResolution ?? parseResolution(parseBasis),
    chroma: fingerprint?.chroma ?? sourceProduct?.chroma,
    features: hasFeatures ? features : undefined,
    specs: {
      ...parseSpecFacts(parseBasis, fingerprint?.inputCount ?? sourceProduct?.inputCount ?? parsedIo.inputCount, fingerprint?.outputCount ?? sourceProduct?.outputCount ?? parsedIo.outputCount, features),
      ...(sourceProduct ? specsFromSourceProduct(sourceProduct) : {}),
      ...(fingerprint?.specs ?? {}),
    },
    sourceUrl: fingerprint?.datasheetUrl || catalogFingerprint?.datasheetUrl || sourceProduct?.sourceUrl || sourceUrl,
    // metadata
    brand: sourceProduct?.manufacturer || normalised?.brand || fingerprint?.brand || evidence.brand,
    specTier,
    readiness: hasVerifiedFingerprint || hasVerifiedSourceProduct ? "approved" : familyLevelInput ? "needs-evidence" : evidence.readiness,
    assumptions: hasVerifiedFingerprint || hasVerifiedSourceProduct ? [] : evidence.assumptions,
    whyNotDirectEquivalent: hasVerifiedFingerprint || hasVerifiedSourceProduct ? [] : evidence.whyNotDirectEquivalent,
    missingFacts: hasVerifiedFingerprint || hasVerifiedSourceProduct ? [] : familyLevelInput ? Array.from(new Set([...evidence.missingFacts, "Exact competitor model/SKU", "Datasheet or product page evidence"])) : evidence.missingFacts,
    confidencePenalty: hasVerifiedFingerprint || hasVerifiedSourceProduct ? 0 : familyLevelInput ? Math.max(evidence.confidencePenalty, 12) : evidence.confidencePenalty,
    source: hasVerifiedFingerprint ? "fingerprint" : hasVerifiedSourceProduct ? "fingerprint" : evidence.tier === "family-rule" || familyLevelInput ? "family-rule" : "typed-text",
    datasheetUrl: fingerprint?.datasheetUrl || catalogFingerprint?.datasheetUrl || sourceProduct?.sourceUrl,
    sourceLabel: sourceProduct ? `${sourceProduct.sourceName}: ${sourceProduct.sourceCollection}` : undefined,
  };
}
