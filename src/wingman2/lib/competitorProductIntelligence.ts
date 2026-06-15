export type CompetitorIntelligenceTier =
  | "sku-only"
  | "family-rule"
  | "fingerprint"
  | "verified-profile"
  | "approved-compare-profile";

export type CompetitorTechnologyClass =
  | "AVOIP"
  | "HDBASET"
  | "MATRIX"
  | "PRESENTATION"
  | "VIDEO_WALL"
  | "MULTIVIEW"
  | "USB_EXTENSION"
  | "CONTROL"
  | "WIRELESS_PRESENTATION"
  | "AUDIO"
  | "NDI_CAMERA"
  | "PTZ_CAMERA"
  | "WIRELESS_CASTING"
  | "CABLE"
  | "UNKNOWN";

export type CompetitorRole =
  | "Encoder"
  | "Decoder"
  | "Transceiver"
  | "Transmitter"
  | "Receiver"
  | "Matrix"
  | "Presentation Switcher"
  | "Video Wall Processor"
  | "Multiview Processor"
  | "USB/KVM Extender"
  | "Wireless Presentation"
  | "Wireless Casting"
  | "Controller"
  | "Audio Processor"
  | "NDI Camera"
  | "PTZ Camera"
  | "Cable"
  | "Unknown";

export type CompetitorSkuSeed = {
  brand: string;
  sku: string;
};

export type NormalizedCompetitorSku = {
  brand: string;
  sku: string;
  original: string;
  corrected: boolean;
  confidence: "brand-scoped" | "known-sku" | "partial";
};

export type CompetitorFamilyRule = {
  brand: string;
  match: RegExp;
  tier: CompetitorIntelligenceTier;
  domain: CompetitorTechnologyClass;
  role: CompetitorRole;
  transport: string;
  action: string;
  requiredFacts: string[];
  presentFacts: string[];
  assumptions: string[];
  whyNotDirectEquivalent: string[];
};

export type CompetitorDecisionEvidence = {
  brand: string;
  sku: string;
  tier: CompetitorIntelligenceTier;
  domain: CompetitorTechnologyClass;
  role: CompetitorRole;
  transport: string;
  action: string;
  requiredFacts: string[];
  presentFacts: string[];
  missingFacts: string[];
  assumptions: string[];
  whyNotDirectEquivalent: string[];
  confidencePenalty: number;
  readiness: "approved" | "usable-with-review" | "needs-evidence" | "sku-only";
};

export const COMPETITOR_SKU_SEED_CATALOG: Record<string, string[]> = {
  "Crestron": [
    "DM-NVX-350",
    "DM-NVX-351",
    "DM-NVX-360",
    "DM-NVX-363",
    "DM-NVX-D30",
    "DM-NVX-E30",
    "DMPS3-4K-350-C",
    "HD-MD4X2-4KZ-E",
    "HD-RX-4K-510-C-E",
    "HD-TX-4KZ-211-2G"
  ],
  "Extron": [
    "DTP2 R 211",
    "DTP2 T 211",
    "DTP3 R 201",
    "DTP3 T 202",
    "IN1608 xi",
    "NAV D 101",
    "NAV D 121",
    "NAV D 501",
    "NAV E 101",
    "NAV E 121",
    "NAV E 501"
  ],
  "Atlona": [
    "AT-OME-CS31-SA",
    "AT-OME-EX-KIT",
    "AT-OME-MS42",
    "AT-OME-PS62",
    "AT-OMNI-111",
    "AT-OMNI-112",
    "AT-OMNI-121",
    "AT-OMNI-122",
    "AT-UHD-EX-100CE-KIT",
    "AT-UHD-PRO3-88M"
  ],
  "Kramer": [
    "KDS-7-DEC7",
    "KDS-7-EN7",
    "KDS-100",
    "KDS-DEC6",
    "KDS-EN6",
    "VP-440X",
    "VP-551X",
    "VP-554X",
    "VS-44H2A",
    "VS-88H2A"
  ],
  "Lightware": [
    "MMX2-4x1-H20",
    "MMX4x2-HDMI",
    "MMX6x2-HT200",
    "MMX6x2-HT210",
    "MMX8x4-HT400MC",
    "MMX8x4-HT420M",
    "MMX8x8-HDMI-4K-A",
    "TAURUS UCX-2x1-HC30",
    "TAURUS UCX-4x2-HC30",
    "TPX-2x1-TX20-3x3-RX20",
    "UCX-4x2-HC40",
    "UBEX-PRO20-HDMI-F100",
    "UBEX-PRO20-HDMI-F110",
    "VINX-110-HDMI-ENC",
    "VINX-120-HDMI-ENC",
    "VINX-210AP-HDMI-DEC"
  ],
  "Blustream": [
    "ACM210",
    "C44-KIT",
    "C88CS",
    "HMX44-18G-KIT",
    "HMX88-18G-KIT",
    "IP200UHD-RX",
    "IP200UHD-TX",
    "IP250UHD-RX",
    "IP250UHD-TX",
    "IP300UHD-RX",
    "IP300UHD-TX",
    "IP350UHD-RX",
    "IP350UHD-TX",
    "PLA88CS"
  ],
  "Barco": [
    "C-5",
    "C-10",
    "CX-20",
    "CX-30",
    "CX-50",
    "CX-50 Gen2"
  ],
  "ZeeVee": [
    "ZyPer4K Decoder",
    "ZyPer4K Encoder",
    "ZyPerUHD Decoder",
    "ZyPerUHD Encoder",
    "ZyPerUHD60 Decoder",
    "ZyPerUHD60 Encoder"
  ],
  "AMX": [
    "DGX1600-ENC",
    "DGX6400-ENC",
    "DVX-2265-4K",
    "DXL-RX-4K60",
    "DXL-TX-4K60",
    "MUSE Automator",
    "NMX-DEC-N2422A",
    "NMX-DEC-N2622S",
    "NMX-DEC-N2625D-WP",
    "NMX-ENC-N2412A",
    "NMX-ENC-N2612S",
    "NMX-ENC-N2615D-WP",
    "NMX-ENC-N3312D",
    "NX-1200",
    "NX-2200"
  ],
  "AVPro Edge": [
    "AC-EX40-444-KIT",
    "AC-EX70-444-KIT",
    "AC-EX70-444-R3",
    "AC-MX-42X",
    "AC-MX-44HDBT",
    "AC-MX-88",
    "MXNet-1G-D",
    "MXNet-1G-E",
    "MXNet-10G-TCVR"
  ],
  "Binary": [
    "B-260-HDMI-CTRL",
    "B-660-EXT-444-100A",
    "B-660-MTRX-4x4",
    "B-660-MTRX-8x8",
    "B-900-MOIP-4K-RX",
    "B-900-MOIP-4K-TX"
  ],
  "Visionary": [
    "D5200"
  ],
  "BirdDog": [
    "P100",
    "P200",
    "P400",
    "MAKI ULTRA",
    "FLEX 4K",
    "Eyes HDMI",
    "Eyes SDI",
    "Air 4K Quad",
    "4K EYE"
  ],
  "Marshall": [
    "CV420-18X-NDI",
    "CV605-NDI",
    "CV630-IP",
    "CV730-NDI",
    "CV420-30X-IP",
    "VS-PTC-200NDI"
  ],
  "Mersive": [
    "Solstice Gen3",
    "Solstice Pod Gen3",
    "Solstice Active Learning"
  ],
  "Barco ClickShare": [
    "CS-100 Huddle",
    "CX-20",
    "CX-30",
    "CX-50",
    "CX-50 Gen2",
    "CS-100",
    "CS-100 Huddle",
    "CX-20 Gen2",
    "CX-30 Gen2"
  ],
  "Airtame": [
    "Airtame 2",
    "Airtame Cloud"
  ],
  "Sony": [
    "BRC-X400",
    "BRC-X1000",
    "EVI-H100V",
    "SRG-300H",
    "SRG-300SE",
    "SRG-X120",
    "SRG-XP1"
  ],
  "Other": []
};

const REQUIRED_FACTS: Record<CompetitorTechnologyClass, string[]> = {
  AVOIP: ["endpoint role", "network class or codec", "max resolution", "transport", "controller/network requirement", "input/output endpoint count"],
  HDBASET: ["TX/RX role or kit status", "distance class", "max resolution", "HDCP/HDMI generation", "power method", "control/USB support"],
  MATRIX: ["input count", "output count", "output transport", "max resolution", "HDCP/HDMI generation", "receiver dependency"],
  PRESENTATION: ["input types", "output types", "USB-C/USB behaviour", "scaling", "audio support", "control support"],
  VIDEO_WALL: ["wall layout", "output count", "source handling", "scaling/layout presets", "control method"],
  MULTIVIEW: ["single output canvas proof", "source window count", "layout modes", "output resolution"],
  USB_EXTENSION: ["USB version", "host/peripheral direction", "bandwidth", "distance/topology"],
  CONTROL: ["control role", "network/control ports", "AV transport absence", "compatible ecosystem"],
  WIRELESS_PRESENTATION: ["wireless protocol", "HDMI/USB integration", "conferencing support", "network/security requirements"],
  AUDIO: ["audio transport", "I/O type", "Dante/AES67 support", "DSP/mic support"],
  NDI_CAMERA: ["NDI version (NDI 5 / HX2 / HX3)", "PTZ protocol (VISCA-over-IP / Pelco-D)", "sensor resolution", "frame rate", "zoom range", "PoE class"],
  PTZ_CAMERA: ["PTZ protocol (VISCA / Pelco-D / ONVIF)", "sensor resolution", "frame rate", "optical zoom", "PoE class", "IP control method"],
  WIRELESS_CASTING: ["wireless standard (Wi-Fi 5 / Wi-Fi 6)", "screen mirroring protocols (Miracast / AirPlay / Chromecast)", "max simultaneous users", "4K wireless support", "moderation workflow"],
  CABLE: ["cable category or fiber type", "max rated distance", "shielding (UTP / STP / SFTP)", "connector type", "plenum/LSOH rating"],
  UNKNOWN: ["technology class", "product role", "transport", "I/O count", "max resolution"],
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function key(value: unknown): string {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasAny(text: string, terms: string[]): boolean {
  const value = clean(text).toLowerCase();
  return terms.some((term) => value.includes(term.toLowerCase()));
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function defaultRule(brand: string, sku: string): CompetitorFamilyRule {
  return {
    brand,
    match: /.*/,
    tier: "sku-only",
    domain: "UNKNOWN",
    role: "Unknown",
    transport: "Unknown",
    action: "Needs product evidence before comparison.",
    requiredFacts: REQUIRED_FACTS.UNKNOWN,
    presentFacts: ["brand", "sku"],
    assumptions: ["Only a SKU suggestion is stored. Product role and specifications are not approved."],
    whyNotDirectEquivalent: [
      "No technology class has been verified.",
      "No role, transport, I/O or feature evidence is stored.",
    ],
  };
}

const FAMILY_RULES: CompetitorFamilyRule[] = [
  {
    brand: "AMX",
    match: /^nmxenc/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Encoder",
    transport: "AVoIP",
    action: "Treat as AMX SVSI source-side AVoIP encoder until datasheet proves a stronger profile.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["endpoint role", "transport", "brand family"],
    assumptions: ["NMX-ENC pattern indicates SVSI encoder family."],
    whyNotDirectEquivalent: ["Exact codec, network class, USB/audio capability and control dependency still need datasheet evidence."],
  },
  {
    brand: "AMX",
    match: /^nmxdec/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Decoder",
    transport: "AVoIP",
    action: "Treat as AMX SVSI display-side AVoIP decoder until datasheet proves a stronger profile.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["endpoint role", "transport", "brand family"],
    assumptions: ["NMX-DEC pattern indicates SVSI decoder family."],
    whyNotDirectEquivalent: ["Exact codec, network class, USB/audio capability and control dependency still need datasheet evidence."],
  },
  {
    brand: "AMX",
    match: /^dvx/i,
    tier: "family-rule",
    domain: "PRESENTATION",
    role: "Presentation Switcher",
    transport: "HDMI / DXLink / presentation switching",
    action: "Compare against room switcher or hybrid presentation system direction, not an AVoIP endpoint.",
    requiredFacts: REQUIRED_FACTS.PRESENTATION,
    presentFacts: ["product role", "transport family", "application class"],
    assumptions: ["DVX pattern indicates AMX presentation switcher/all-in-one room system."],
    whyNotDirectEquivalent: ["May require a system-shape comparison rather than a like-for-like SKU replacement."],
  },
  {
    brand: "AMX",
    match: /^dgx/i,
    tier: "family-rule",
    domain: "MATRIX",
    role: "Matrix",
    transport: "Modular matrix",
    action: "Treat as enterprise modular matrix platform and compare only against matrix or system-architecture alternatives.",
    requiredFacts: REQUIRED_FACTS.MATRIX,
    presentFacts: ["product role", "transport family"],
    assumptions: ["DGX pattern indicates AMX Enova DGX modular matrix platform."],
    whyNotDirectEquivalent: ["Usually not a direct one-box equivalent to WyreStorm smaller matrix or AVoIP endpoint products."],
  },
  {
    brand: "AMX",
    match: /^dxl(?:tx|rx)/i,
    tier: "family-rule",
    domain: "HDBASET",
    role: "Transmitter",
    transport: "DXLink / HDBaseT-class extension",
    action: "Compare against HDBaseT extension only after TX/RX pairing, power and USB/control are confirmed.",
    requiredFacts: REQUIRED_FACTS.HDBASET,
    presentFacts: ["transport family", "extension family"],
    assumptions: ["DXL pattern indicates DXLink/DXLite extension family."],
    whyNotDirectEquivalent: ["DXLink/DXLite ecosystem details and pairing requirements must be verified."],
  },
  {
    brand: "AMX",
    match: /^(nx|muse)/i,
    tier: "family-rule",
    domain: "CONTROL",
    role: "Controller",
    transport: "Control / LAN",
    action: "Normally return NO MATCH against WyreStorm AV signal transport products.",
    requiredFacts: REQUIRED_FACTS.CONTROL,
    presentFacts: ["product role", "transport"],
    assumptions: ["NX/MUSE pattern indicates AMX control platform product."],
    whyNotDirectEquivalent: ["Control processors are not AV transport products."],
  },
  {
    brand: "Crestron",
    match: /^dmnvx/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Transceiver",
    transport: "AVoIP",
    action: "Compare against NetworkHD AVoIP architecture and validate endpoint role.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["transport", "brand family"],
    assumptions: ["DM-NVX pattern indicates Crestron AVoIP endpoint family."],
    whyNotDirectEquivalent: ["Exact endpoint mode, network class, USB/audio and control requirements need verification."],
  },
  {
    brand: "Crestron",
    match: /^dmps|^hdmd|^hdtx|^hdrx/i,
    tier: "family-rule",
    domain: "PRESENTATION",
    role: "Presentation Switcher",
    transport: "HDMI / HDBaseT",
    action: "Compare against WyreStorm SW/MX room switching or extension direction depending on I/O.",
    requiredFacts: REQUIRED_FACTS.PRESENTATION,
    presentFacts: ["brand family", "transport family"],
    assumptions: ["Crestron DMPS/HD-MD/HD-TX/HD-RX patterns indicate presentation or extension family."],
    whyNotDirectEquivalent: ["Exact I/O, USB and control behaviour needs datasheet confirmation."],
  },
  {
    brand: "Extron",
    match: /^nave/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Encoder",
    transport: "AVoIP",
    action: "Treat as Extron NAV source-side endpoint.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["endpoint role", "transport", "brand family"],
    assumptions: ["NAV E pattern indicates Extron NAV encoder."],
    whyNotDirectEquivalent: ["Exact NAV codec/network class and feature set must be verified."],
  },
  {
    brand: "Extron",
    match: /^navd/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Decoder",
    transport: "AVoIP",
    action: "Treat as Extron NAV display-side endpoint.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["endpoint role", "transport", "brand family"],
    assumptions: ["NAV D pattern indicates Extron NAV decoder."],
    whyNotDirectEquivalent: ["Exact NAV codec/network class and feature set must be verified."],
  },
  {
    brand: "Extron",
    match: /^dtp/i,
    tier: "family-rule",
    domain: "HDBASET",
    role: "Transmitter",
    transport: "DTP / HDBaseT-class extension",
    action: "Compare against WyreStorm HDBaseT extension once TX/RX pairing and distance are confirmed.",
    requiredFacts: REQUIRED_FACTS.HDBASET,
    presentFacts: ["transport family", "extension family"],
    assumptions: ["DTP pattern indicates Extron twisted-pair extension family."],
    whyNotDirectEquivalent: ["DTP and HDBaseT interoperability/details should not be assumed."],
  },
  {
    brand: "Extron",
    match: /^in/i,
    tier: "family-rule",
    domain: "PRESENTATION",
    role: "Presentation Switcher",
    transport: "HDMI / presentation switching",
    action: "Compare against room switcher/scaler direction.",
    requiredFacts: REQUIRED_FACTS.PRESENTATION,
    presentFacts: ["role family"],
    assumptions: ["IN pattern indicates Extron presentation scaler/switcher family."],
    whyNotDirectEquivalent: ["I/O, scaling, audio and USB must be verified."],
  },
  {
    brand: "Atlona",
    match: /^atomni/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Transceiver",
    transport: "AVoIP",
    action: "Compare against NetworkHD AVoIP architecture.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["transport", "brand family"],
    assumptions: ["AT-OMNI pattern indicates Atlona OmniStream AVoIP family."],
    whyNotDirectEquivalent: ["Endpoint role and codec/network details must be verified."],
  },
  {
    brand: "Atlona",
    match: /^atome/i,
    tier: "family-rule",
    domain: "PRESENTATION",
    role: "Presentation Switcher",
    transport: "HDMI / USB-C / HDBaseT",
    action: "Compare against WyreStorm SW/MX meeting-room switchers.",
    requiredFacts: REQUIRED_FACTS.PRESENTATION,
    presentFacts: ["role family", "transport family"],
    assumptions: ["AT-OME pattern indicates Atlona Omega presentation/collaboration family."],
    whyNotDirectEquivalent: ["USB host/peripheral behaviour and exact output topology need confirmation."],
  },
  {
    brand: "Kramer",
    match: /^kds/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Transceiver",
    transport: "AVoIP",
    action: "Compare against NetworkHD AVoIP architecture and validate endpoint role.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["transport", "brand family"],
    assumptions: ["KDS pattern indicates Kramer AVoIP endpoint family."],
    whyNotDirectEquivalent: ["Endpoint mode, codec, network class and feature set need verification."],
  },
  {
    brand: "Kramer",
    match: /^vp/i,
    tier: "family-rule",
    domain: "PRESENTATION",
    role: "Presentation Switcher",
    transport: "HDMI / presentation switching",
    action: "Compare against WyreStorm room switcher/scaler direction.",
    requiredFacts: REQUIRED_FACTS.PRESENTATION,
    presentFacts: ["role family"],
    assumptions: ["VP pattern indicates Kramer presentation switcher/scaler family."],
    whyNotDirectEquivalent: ["I/O, scaling, audio, USB and HDBaseT must be verified."],
  },
  {
    brand: "Kramer",
    match: /^vs/i,
    tier: "family-rule",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI matrix",
    action: "Compare against WyreStorm matrix/switching direction.",
    requiredFacts: REQUIRED_FACTS.MATRIX,
    presentFacts: ["role family", "transport family"],
    assumptions: ["VS pattern indicates Kramer matrix/switching family."],
    whyNotDirectEquivalent: ["Exact I/O, HDCP, HDMI and audio/control features must be verified."],
  },
  {
    brand: "Lightware",
    match: /^ubex|^vinx/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Transceiver",
    transport: "AVoIP",
    action: "Compare against NetworkHD AVoIP architecture.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["transport", "brand family"],
    assumptions: ["UBEX/VINX pattern indicates Lightware networked AV family."],
    whyNotDirectEquivalent: ["Endpoint role, codec and network class must be verified."],
  },
  {
    brand: "Lightware",
    match: /^taurus|^ucx/i,
    tier: "family-rule",
    domain: "PRESENTATION",
    role: "Presentation Switcher",
    transport: "USB-C / HDMI / collaboration switching",
    action: "Compare against WyreStorm meeting-room switcher and USB-C workflow direction.",
    requiredFacts: REQUIRED_FACTS.PRESENTATION,
    presentFacts: ["role family", "USB-C family"],
    assumptions: ["Taurus pattern indicates Lightware UCX collaboration switcher family."],
    whyNotDirectEquivalent: ["USB version, host/peripheral topology and output behaviour must be verified."],
  },
  {
    brand: "Blustream",
    match: /^ip\d+/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Transceiver",
    transport: "AVoIP",
    action: "Compare against NetworkHD AVoIP architecture and validate TX/RX role.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["transport", "brand family"],
    assumptions: ["IP-series pattern indicates Blustream AVoIP endpoint family."],
    whyNotDirectEquivalent: ["Endpoint role, codec/network class and controller behaviour must be verified."],
  },
  {
    brand: "Blustream",
    match: /^hmx|^c\d|^pla/i,
    tier: "family-rule",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI / HDBaseT matrix",
    action: "Compare against WyreStorm matrix direction.",
    requiredFacts: REQUIRED_FACTS.MATRIX,
    presentFacts: ["role family", "transport family"],
    assumptions: ["HMX/C/PLA patterns indicate Blustream matrix family."],
    whyNotDirectEquivalent: ["Kit contents, receiver dependencies and audio/control details must be verified."],
  },
  {
    brand: "Barco",
    match: /^(cx|c)/i,
    tier: "family-rule",
    domain: "WIRELESS_PRESENTATION",
    role: "Wireless Presentation",
    transport: "Wireless presentation / USB conferencing",
    action: "Compare only against WyreStorm wireless/presentation workflows where wireless sharing is required.",
    requiredFacts: REQUIRED_FACTS.WIRELESS_PRESENTATION,
    presentFacts: ["wireless role", "brand family"],
    assumptions: ["ClickShare C/CX pattern indicates Barco wireless presentation/conferencing family."],
    whyNotDirectEquivalent: ["WyreStorm may be a room switching/BYOD alternative, not a direct ClickShare equivalent."],
  },
  {
    brand: "ZeeVee",
    match: /^zyper/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Transceiver",
    transport: "AVoIP",
    action: "Compare against NetworkHD AVoIP architecture and validate encoder/decoder role.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["transport", "brand family"],
    assumptions: ["ZyPer pattern indicates ZeeVee AVoIP family."],
    whyNotDirectEquivalent: ["Exact ZyPer codec/network class and endpoint role need verification."],
  },
  {
    brand: "AVPro Edge",
    match: /^mxnet/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Transceiver",
    transport: "AVoIP",
    action: "Compare against NetworkHD AVoIP architecture.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["transport", "brand family"],
    assumptions: ["MXNet pattern indicates AVPro Edge AVoIP family."],
    whyNotDirectEquivalent: ["Network class, codec and endpoint role require verification."],
  },
  {
    brand: "AVPro Edge",
    match: /^acex/i,
    tier: "family-rule",
    domain: "HDBASET",
    role: "Transmitter",
    transport: "HDBaseT extension",
    action: "Compare against WyreStorm HDBaseT extension after distance and kit contents are confirmed.",
    requiredFacts: REQUIRED_FACTS.HDBASET,
    presentFacts: ["transport family", "extension family"],
    assumptions: ["AC-EX pattern indicates AVPro Edge extension family."],
    whyNotDirectEquivalent: ["TX/RX kit contents, distance and feature support must be verified."],
  },
  {
    brand: "AVPro Edge",
    match: /^acmx/i,
    tier: "family-rule",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI / HDBaseT matrix",
    action: "Compare against WyreStorm matrix direction.",
    requiredFacts: REQUIRED_FACTS.MATRIX,
    presentFacts: ["role family"],
    assumptions: ["AC-MX pattern indicates AVPro Edge matrix family."],
    whyNotDirectEquivalent: ["Exact I/O, output transport and kit dependencies need verification."],
  },
  {
    brand: "Binary",
    match: /^b900moip/i,
    tier: "family-rule",
    domain: "AVOIP",
    role: "Transceiver",
    transport: "AVoIP",
    action: "Compare against NetworkHD AVoIP architecture.",
    requiredFacts: REQUIRED_FACTS.AVOIP,
    presentFacts: ["transport", "brand family"],
    assumptions: ["B-900-MOIP pattern indicates Binary AVoIP family."],
    whyNotDirectEquivalent: ["Endpoint role, codec/network class and control model require verification."],
  },
  {
    brand: "Binary",
    match: /^b660mtrx/i,
    tier: "family-rule",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI / HDBaseT matrix",
    action: "Compare against WyreStorm matrix direction.",
    requiredFacts: REQUIRED_FACTS.MATRIX,
    presentFacts: ["role family"],
    assumptions: ["B-660-MTRX pattern indicates Binary matrix family."],
    whyNotDirectEquivalent: ["Exact I/O, receiver kit status and HDCP/HDMI generation must be verified."],
  },
  {
    brand: "Binary",
    match: /^b660ext/i,
    tier: "family-rule",
    domain: "HDBASET",
    role: "Transmitter",
    transport: "HDBaseT extension",
    action: "Compare against WyreStorm HDBaseT extension.",
    requiredFacts: REQUIRED_FACTS.HDBASET,
    presentFacts: ["transport family", "extension family"],
    assumptions: ["B-660-EXT pattern indicates Binary extension family."],
    whyNotDirectEquivalent: ["Distance, TX/RX kit status and feature support must be verified."],
  },
  {
    brand: "BirdDog",
    match: /^(p100|p200|p400|maki|flex|eye|air)/i,
    tier: "family-rule",
    domain: "NDI_CAMERA",
    role: "NDI Camera",
    transport: "NDI / HDMI",
    action: "BirdDog NDI camera â€” compare against the WyreStorm CAM-210-NDI-PTZ (NDI PTZ camera) or CAM-0402-NDI-BRG (NDI multi-camera bridge). Confirm NDI version and PTZ control before quoting.",
    requiredFacts: REQUIRED_FACTS.NDI_CAMERA,
    presentFacts: ["NDI output", "PTZ capability", "brand family"],
    assumptions: ["BirdDog cameras output NDI natively. WyreStorm CAM-210-NDI-PTZ is the closest NDI PTZ camera counterpart."],
    whyNotDirectEquivalent: ["Confirm NDI version (NDI 5 / HX), VISCA-over-IP control and zoom range against CAM-210-NDI-PTZ before positioning as a like-for-like swap."],
  },
  {
    brand: "Marshall",
    match: /^(cv|vs-ptc)/i,
    tier: "family-rule",
    domain: "NDI_CAMERA",
    role: "NDI Camera",
    transport: "NDI / HDMI / SDI",
    action: "Marshall NDI camera â€” compare against the WyreStorm CAM-210-NDI-PTZ or CAM-0402-NDI-BRG. Confirm NDI version, SDI/HDMI output and PTZ control.",
    requiredFacts: REQUIRED_FACTS.NDI_CAMERA,
    presentFacts: ["NDI output", "PTZ capability", "brand family"],
    assumptions: ["Marshall CV-NDI series outputs NDI. WyreStorm CAM-210-NDI-PTZ is the closest NDI camera counterpart."],
    whyNotDirectEquivalent: ["Confirm SDI vs HDMI output, NDI version and PTZ control parity against CAM-210-NDI-PTZ."],
  },
  {
    brand: "Sony",
    match: /^(brc|evi|srg)/i,
    tier: "family-rule",
    domain: "PTZ_CAMERA",
    role: "PTZ Camera",
    transport: "HDMI / SDI / IP",
    action: "Sony PTZ camera â€” compare against the WyreStorm CAM-210-PTZ or CAM-420-PTZ. Confirm PTZ protocol (VISCA), optical zoom range and sensor resolution.",
    requiredFacts: REQUIRED_FACTS.PTZ_CAMERA,
    presentFacts: ["PTZ control protocol", "HDMI output", "brand family"],
    assumptions: ["Sony BRC/SRG/EVI use VISCA-over-IP or VISCA serial. WyreStorm CAM-210-PTZ / CAM-420-PTZ are the closest PTZ camera counterparts."],
    whyNotDirectEquivalent: ["Confirm optical zoom range, sensor resolution and VISCA/IP control parity against CAM-210-PTZ / CAM-420-PTZ."],
  },
  {
    brand: "Mersive",
    match: /^solstice/i,
    tier: "family-rule",
    domain: "WIRELESS_CASTING",
    role: "Wireless Casting",
    transport: "Wi-Fi / Ethernet",
    action: "Mersive Solstice wireless presentation â€” compare against WyreStorm Apollo series for wireless casting workflow.",
    requiredFacts: REQUIRED_FACTS.WIRELESS_CASTING,
    presentFacts: ["wireless protocol", "simultaneous users", "brand family"],
    assumptions: ["Mersive Solstice uses software-defined wireless presentation over Wi-Fi. Apollo series is the closest WyreStorm alternative."],
    whyNotDirectEquivalent: ["Confirm Apollo protocol support (Miracast, AirPlay, Chromecast) against Solstice capabilities before quoting."],
  },
  {
    brand: "Barco ClickShare",
    match: /^c[sx]-/i,
    tier: "family-rule",
    domain: "WIRELESS_CASTING",
    role: "Wireless Casting",
    transport: "Wi-Fi / USB dongle",
    action: "Barco ClickShare wireless presentation â€” compare against WyreStorm Apollo series for wireless casting workflow.",
    requiredFacts: REQUIRED_FACTS.WIRELESS_CASTING,
    presentFacts: ["wireless protocol", "USB dongle workflow", "brand family"],
    assumptions: ["ClickShare uses USB dongle plus Wi-Fi. Apollo series comparison should confirm dongle vs. app-based workflow."],
    whyNotDirectEquivalent: ["ClickShare uses a proprietary USB dongle + base unit workflow. Apollo uses software-only / BYOD approach. Confirm customer preference before quoting."],
  },
  {
    brand: "Airtame",
    match: /^airtame/i,
    tier: "family-rule",
    domain: "WIRELESS_CASTING",
    role: "Wireless Casting",
    transport: "Wi-Fi",
    action: "Airtame wireless screen sharing â€” compare against WyreStorm Apollo series.",
    requiredFacts: REQUIRED_FACTS.WIRELESS_CASTING,
    presentFacts: ["wireless protocol", "brand family"],
    assumptions: ["Airtame is an app-based wireless casting platform."],
    whyNotDirectEquivalent: ["Confirm Apollo wireless protocols, user count and cloud management against Airtame before quoting."],
  },
];

export function competitorSkuSeeds(): CompetitorSkuSeed[] {
  return Object.entries(COMPETITOR_SKU_SEED_CATALOG).flatMap(([brand, skus]) => skus.map((sku) => ({ brand, sku })));
}

export function competitorBrandCounts(): Array<{ brand: string; count: number }> {
  return Object.entries(COMPETITOR_SKU_SEED_CATALOG).map(([brand, skus]) => ({
    brand,
    count: skus.length,
  }));
}

function cleanBrand(value: unknown): string {
  const brand = clean(value);
  return brand === "Auto-detect where possible" || brand === "Other" ? "" : brand;
}

function canonicalBrand(value: unknown): string {
  const requested = key(value);
  if (!requested) return "";

  return Object.keys(COMPETITOR_SKU_SEED_CATALOG).find((brand) => key(brand) === requested) || clean(value);
}

function skuSeedCandidates(brand?: string): CompetitorSkuSeed[] {
  const requestedBrand = canonicalBrand(brand);
  const scoped = requestedBrand && COMPETITOR_SKU_SEED_CATALOG[requestedBrand]
    ? COMPETITOR_SKU_SEED_CATALOG[requestedBrand].map((sku) => ({ brand: requestedBrand, sku }))
    : competitorSkuSeeds();

  return scoped
    .filter((seed) => key(seed.brand) !== "other")
    .sort((a, b) => key(b.sku).length - key(a.sku).length);
}

export function normalizeCompetitorSku(rawSku: string, providedBrand?: string): NormalizedCompetitorSku | null {
  const original = clean(rawSku);
  const requestedBrand = cleanBrand(providedBrand);
  const compact = key(original);
  if (!compact || !/[a-z]/i.test(compact) || !/\d/.test(compact)) return null;

  const brandScoped = Boolean(requestedBrand);
  const candidates = skuSeedCandidates(requestedBrand);

  for (const seed of candidates) {
    const seedKey = key(seed.sku);
    if (!seedKey) continue;

    const exact = compact === seedKey;
    const containsKnownSku = seedKey.length >= 5 && compact.includes(seedKey);
    const brandScopedPartial = brandScoped && compact.length >= 5 && (seedKey.includes(compact) || compact.includes(seedKey));
    const unscopedKnownSku = !brandScoped && containsKnownSku;

    if (exact || brandScopedPartial || unscopedKnownSku) {
      return {
        brand: seed.brand,
        sku: seed.sku,
        original,
        corrected: original !== seed.sku,
        confidence: brandScoped ? "brand-scoped" : exact || containsKnownSku ? "known-sku" : "partial",
      };
    }
  }

  return null;
}

function findSeedFromSku(rawSku: string): CompetitorSkuSeed | null {
  const normalised = normalizeCompetitorSku(rawSku);
  return normalised ? { brand: normalised.brand, sku: normalised.sku } : null;
}

function findRule(brand: string, sku: string): CompetitorFamilyRule {
  const skuKey = key(sku);

  return FAMILY_RULES.find((rule) => rule.brand === brand && rule.match.test(skuKey)) || defaultRule(brand, sku);
}

function mergePresentFacts(rule: CompetitorFamilyRule, profileText: string): string[] {
  const facts = [...rule.presentFacts];

  if (hasAny(profileText, ["4k", "1080p", "8k", "60hz", "hdcp", "hdmi"])) facts.push("max resolution");
  if (hasAny(profileText, ["usb", "usb-c", "kvm", "byod", "byom"])) facts.push("USB-C/USB behaviour", "control/USB support");
  if (hasAny(profileText, ["dante", "aes67", "audio", "mic"])) facts.push("audio support");
  if (hasAny(profileText, ["poe", "poh", "poc", "power"])) facts.push("power method");
  if (hasAny(profileText, ["igmp", "multicast", "vlan", "1g", "10g", "sdvoe", "jpeg", "h.264", "h.265"])) facts.push("network class or codec", "controller/network requirement");
  if (hasAny(profileText, ["input", "output", "4x4", "8x8", "16x16", "6x2"])) facts.push("input count", "output count", "input/output endpoint count");
  if (hasAny(profileText, ["multiview", "multi-view", "pip", "pbp", "canvas"])) facts.push("single output canvas proof");

  return uniq(facts);
}

function readinessFor(tier: CompetitorIntelligenceTier, missingFacts: string[]): CompetitorDecisionEvidence["readiness"] {
  if (tier === "approved-compare-profile" && missingFacts.length === 0) return "approved";
  if (tier === "verified-profile" && missingFacts.length <= 2) return "usable-with-review";
  if (tier === "fingerprint" || tier === "family-rule") return missingFacts.length <= 3 ? "usable-with-review" : "needs-evidence";
  return "sku-only";
}

export function buildCompetitorDecisionEvidence(profile: {
  sku?: string;
  title?: string;
  manufacturer?: string;
  brand?: string;
  domain?: string;
  role?: string;
  transport?: string;
  maxResolution?: string;
  inputCount?: number;
  outputCount?: number;
  features?: Record<string, boolean | undefined>;
}): CompetitorDecisionEvidence {
  const normalised = normalizeCompetitorSku(clean(profile.sku || profile.title || ""), profile.brand || profile.manufacturer);
  const rawText = [
    normalised?.brand,
    profile.brand,
    profile.manufacturer,
    normalised?.sku,
    profile.sku,
    profile.title,
    profile.domain,
    profile.role,
    profile.transport,
    profile.maxResolution,
    profile.inputCount ? `${profile.inputCount} input` : "",
    profile.outputCount ? `${profile.outputCount} output` : "",
    ...Object.entries(profile.features ?? {})
      .filter(([, value]) => Boolean(value))
      .map(([name]) => name),
  ].join(" ");

  const seed = findSeedFromSku(rawText);
  const brand = clean(normalised?.brand || profile.brand || profile.manufacturer || seed?.brand || "Unknown");
  const sku = clean(normalised?.sku || seed?.sku || profile.sku || profile.title || "Unknown competitor product");
  const rule = findRule(brand, sku);
  const profileText = clean(rawText).toLowerCase();
  const presentFacts = mergePresentFacts(rule, profileText);
  const requiredFacts = uniq(rule.requiredFacts);
  const missingFacts = requiredFacts.filter((fact) => !presentFacts.includes(fact));
  const tier = rule.tier;
  const readiness = readinessFor(tier, missingFacts);
  const confidencePenalty = tier === "sku-only"
    ? 24
    : tier === "family-rule"
      ? Math.min(18, missingFacts.length * 4)
      : tier === "fingerprint"
        ? Math.min(12, missingFacts.length * 3)
        : Math.min(8, missingFacts.length * 2);

  return {
    brand,
    sku,
    tier,
    domain: rule.domain,
    role: rule.role,
    transport: rule.transport,
    action: rule.action,
    requiredFacts,
    presentFacts,
    missingFacts,
    assumptions: uniq(rule.assumptions),
    whyNotDirectEquivalent: uniq(rule.whyNotDirectEquivalent),
    confidencePenalty,
    readiness,
  };
}

export function buildCompetitorIntelligenceAudit(): {
  brandCounts: Array<{ brand: string; count: number }>;
  tierCounts: Record<CompetitorIntelligenceTier, number>;
  totalSkuCount: number;
  familyRuleCoverageCount: number;
  skuOnlyCount: number;
  nextDataTasks: string[];
} {
  const seeds = competitorSkuSeeds();
  const tierCounts: Record<CompetitorIntelligenceTier, number> = {
    "sku-only": 0,
    "family-rule": 0,
    fingerprint: 0,
    "verified-profile": 0,
    "approved-compare-profile": 0,
  };

  for (const seed of seeds) {
    const profile = buildCompetitorDecisionEvidence({
      brand: seed.brand,
      sku: seed.sku,
    });

    tierCounts[profile.tier] += 1;
  }

  return {
    brandCounts: competitorBrandCounts(),
    tierCounts,
    totalSkuCount: seeds.length,
    familyRuleCoverageCount: seeds.length - tierCounts["sku-only"],
    skuOnlyCount: tierCounts["sku-only"],
    nextDataTasks: [
      "Promote high-use family-rule records into fingerprints with exact I/O, transport, resolution and feature evidence.",
      "Create verified profiles for AMX SVSI N2600/N2400/N3300, Crestron DM-NVX, Extron NAV, Kramer KDS, ZeeVee ZyPer and Blustream IP products.",
      "Record controller/platform products as NO MATCH against AV transport endpoints by default.",
      "Add datasheet URL, lifecycle status, region availability and direct replacement notes to every approved compare profile.",
    ],
  };
}
