export type CompetitorSourceProduct = {
  sourceName: string;
  sourceCollection: string;
  manufacturer: string;
  sku: string;
  title: string;
  summary: string;
  domain:
    | "AVOIP"
    | "HDBASET"
    | "PRESENTATION"
    | "MATRIX"
    | "VIDEO_WALL"
    | "MULTIVIEW"
    | "USB_EXTENSION"
    | "CONTROL"
    | "WIRELESS_COLLAB"
    | "UNKNOWN";
  role:
    | "Transceiver"
    | "Encoder"
    | "Decoder"
    | "Presentation Switcher"
    | "Matrix"
    | "Video Wall Processor"
    | "Multiview Processor"
    | "Extender"
    | "USB Extender"
    | "Controller"
    | "Wireless Collaboration"
    | "Unknown";
  transport: string;
  family: string;
  maxResolution: string;
  chroma: string;
  latency: string;
  performanceTier: string;
  inputCount?: number;
  outputCount?: number;
  features: Record<string, boolean>;
  sourceUrl?: string;
  evidence: string[];
};

function squash(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalised(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export const competitorSourceProducts: CompetitorSourceProduct[] = [
  {
    sourceName: "AVITdirect video products",
    sourceCollection: "https://avitdirect.co.uk/collections/video",
    manufacturer: "Lightware",
    sku: "UCX-4x2-HC40",
    title: "Lightware UCX-4x2-HC40 Universal Switcher",
    summary: "Universal room switcher with HDMI 2.0, USB-C, USB 3.1 peripheral support, Ethernet/control and 4K60 4:4:4 meeting-room collaboration behaviour.",
    domain: "PRESENTATION",
    role: "Presentation Switcher",
    transport: "HDMI / USB-C / room switching",
    family: "Lightware UCX",
    maxResolution: "4K60",
    chroma: "4:4:4",
    latency: "Room switching",
    performanceTier: "USB-C collaboration switcher",
    inputCount: 4,
    outputCount: 2,
    features: {
      usbC: true,
      usbRouting: true,
      conferencing: true,
      hdmiOutput: true,
      simultaneousOutputs: true,
      control: true,
      audioDeEmbed: true,
    },
    sourceUrl: "https://avitdirect.co.uk/collections/matrix-switchers/products/ucx-4x2-hc40",
    evidence: [
      "AVITdirect source feed: UCX-4x2-HC40 is a Lightware universal switcher with HDMI 2.0 and USB-C connectivity.",
      "Classified as presentation/collaboration switching, not AVoIP or HDBaseT matrix.",
    ],
  },
  {
    sourceName: "AVITdirect video products",
    sourceCollection: "https://avitdirect.co.uk/collections/video",
    manufacturer: "Lightware",
    sku: "MMX4x2-HDMI",
    title: "Lightware MMX4x2-HDMI 4x2 HDMI Matrix Switcher",
    summary: "Compact 4x2 HDMI matrix switcher with 4K/UHD support, audio embedding/de-embedding and Event Manager control automation.",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI",
    family: "Lightware MMX",
    maxResolution: "4K30",
    chroma: "4:4:4 at supported UHD modes",
    latency: "Matrix switching",
    performanceTier: "Compact HDMI matrix",
    inputCount: 4,
    outputCount: 2,
    features: {
      hdmiOutput: true,
      audioDeEmbed: true,
      scaling: false,
      control: true,
    },
    sourceUrl: "https://avitdirect.co.uk/collections/lightware/products/lighware-mmx4x2-hdmi",
    evidence: [
      "AVITdirect source feed: MMX4x2-HDMI is a compact 4x2 HDMI matrix switcher.",
      "Classified as MATRIX / Matrix rather than presentation collaboration or AVoIP.",
    ],
  },
  {
    sourceName: "AVITdirect video distribution",
    sourceCollection: "https://avitdirect.co.uk/collections/video-distribution",
    manufacturer: "Lightware",
    sku: "TPX-2x1-TX20-3x3-RX20",
    title: "Lightware TPX-2x1-TX20 & UCX-3x3-TPX-RX20 Bundle",
    summary: "Taurus TPX transmitter/receiver bundle for video, USB, Ethernet and control over a single CAT cable up to 100m.",
    domain: "HDBASET",
    role: "Extender",
    transport: "CAT / TPX extension",
    family: "Lightware Taurus TPX",
    maxResolution: "4K60",
    chroma: "4:4:4",
    latency: "Extension path",
    performanceTier: "USB-C / HDMI long-distance room extension",
    inputCount: 2,
    outputCount: 3,
    features: {
      usbC: true,
      usbRouting: true,
      hdbtOutput: true,
      ethernet: true,
      control: true,
    },
    sourceUrl: "https://avitdirect.co.uk/collections/video-distribution/products/tpx-2x1-tx20-3x3-rx20-bundle",
    evidence: [
      "AVITdirect source feed: TPX bundle extends video, USB, Ethernet and control over CAT up to 100m.",
      "Classified as extension/transport, not a matrix or AVoIP endpoint.",
    ],
  },
  {
    sourceName: "AVITdirect video products",
    sourceCollection: "https://avitdirect.co.uk/collections/video",
    manufacturer: "Lightware",
    sku: "MMX6x2-HT200",
    title: "Lightware MMX6x2-HT200 6x2 HDMI/TPS Matrix Switcher",
    summary: "6x2 HDMI/TPS matrix switcher with four HDMI and two TPS inputs, two HDMI outputs, PoE over TPS, audio handling and Event Manager automation.",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI / TPS",
    family: "Lightware MMX",
    maxResolution: "4K/UHD",
    chroma: "Verify",
    latency: "Matrix switching",
    performanceTier: "Multiport HDMI/TPS matrix",
    inputCount: 6,
    outputCount: 2,
    features: {
      hdbtOutput: true,
      hdmiOutput: true,
      audioDeEmbed: true,
      poc: true,
      control: true,
    },
    sourceUrl: "https://avitdirect.co.uk/products/lightware-mmx6x2-ht200",
    evidence: [
      "AVITdirect source feed: MMX6x2-HT200 is a 6x2 HDMI/TPS matrix switcher.",
    ],
  },
  {
    sourceName: "AVITdirect video products",
    sourceCollection: "https://avitdirect.co.uk/collections/video",
    manufacturer: "Lightware",
    sku: "MMX6x2-HT210",
    title: "Lightware MMX6x2-HT210 6x2 HDMI/TPS Matrix Switcher",
    summary: "6x2 HDMI/TPS matrix switcher with mirrored TPS output, PoE over TPS, audio handling and Event Manager automation.",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI / TPS",
    family: "Lightware MMX",
    maxResolution: "4K/UHD",
    chroma: "Verify",
    latency: "Matrix switching",
    performanceTier: "Multiport HDMI/TPS matrix",
    inputCount: 6,
    outputCount: 2,
    features: {
      hdbtOutput: true,
      hdmiOutput: true,
      simultaneousOutputs: true,
      audioDeEmbed: true,
      poc: true,
      control: true,
    },
    sourceUrl: "https://avitdirect.co.uk/products/lightware-mmx6x2-ht210",
    evidence: [
      "AVITdirect source feed: MMX6x2-HT210 is a 6x2 HDMI/TPS matrix with mirrored TPS output.",
    ],
  },
  {
    sourceName: "AVITdirect video products",
    sourceCollection: "https://avitdirect.co.uk/collections/video",
    manufacturer: "Lightware",
    sku: "MMX8x4-HT400MC",
    title: "Lightware MMX8x4-HT400MC 8x4 Multiport HDMI/TPS Matrix Switcher",
    summary: "8x4 HDMI/TPS matrix switcher with four HDMI and four TPS inputs, special audio input, built-in mixer/ducking, PoE over TPS and Event Manager automation.",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI / TPS",
    family: "Lightware MMX",
    maxResolution: "4K/UHD",
    chroma: "Verify",
    latency: "Matrix switching",
    performanceTier: "8x4 HDMI/TPS matrix",
    inputCount: 8,
    outputCount: 4,
    features: {
      hdbtOutput: true,
      hdmiOutput: true,
      microphone: true,
      audioDeEmbed: true,
      poc: true,
      control: true,
    },
    sourceUrl: "https://avitdirect.co.uk/products/lightware-mmx8x4-ht400mc",
    evidence: [
      "AVITdirect source feed: MMX8x4-HT400MC is an 8x4 HDMI/TPS matrix switcher.",
    ],
  },
  {
    sourceName: "AVITdirect video products",
    sourceCollection: "https://avitdirect.co.uk/collections/video",
    manufacturer: "Lightware",
    sku: "MMX8x4-HT420M",
    title: "Lightware MMX8x4-HT420M 8x4 HDMI/TPS Matrix Switcher",
    summary: "8x4 HDMI/TPS matrix with two HDMI and two TPS outputs, special audio input, mixer/ducking and RS-232/IR/Ethernet/relay/GPIO control.",
    domain: "MATRIX",
    role: "Matrix",
    transport: "HDMI / TPS",
    family: "Lightware MMX",
    maxResolution: "4K/UHD",
    chroma: "Verify",
    latency: "Matrix switching",
    performanceTier: "8x4 HDMI/TPS matrix",
    inputCount: 8,
    outputCount: 4,
    features: {
      hdbtOutput: true,
      hdmiOutput: true,
      microphone: true,
      audioDeEmbed: true,
      irRs232: true,
      control: true,
    },
    sourceUrl: "https://avitdirect.co.uk/products/lightware-mmx8x4-ht420m",
    evidence: [
      "AVITdirect source feed: MMX8x4-HT420M is an 8x4 HDMI/TPS matrix with mixed HDMI/TPS outputs.",
    ],
  },
  {
    sourceName: "AVITdirect video products",
    sourceCollection: "https://avitdirect.co.uk/collections/video",
    manufacturer: "Lightware",
    sku: "MMX2-4x1-H20",
    title: "Lightware MMX2-4x1-H20 HDMI 2.0 Switcher",
    summary: "4x1 HDMI 2.0 switcher/matrix with 4K60 4:4:4 support, audio de-embedding, secure Ethernet integration and occupancy/control features.",
    domain: "PRESENTATION",
    role: "Presentation Switcher",
    transport: "HDMI",
    family: "Lightware MMX2",
    maxResolution: "4K60",
    chroma: "4:4:4",
    latency: "Room switching",
    performanceTier: "Compact HDMI presentation switching",
    inputCount: 4,
    outputCount: 1,
    features: {
      hdmiOutput: true,
      audioDeEmbed: true,
      control: true,
    },
    sourceUrl: "https://avitdirect.co.uk/products/lightware-mmx2-4x1-h20",
    evidence: [
      "AVITdirect source feed: MMX2-4x1-H20 is a compact 4x1 HDMI 2.0 switcher.",
    ],
  },
  {
    sourceName: "AVITdirect video distribution",
    sourceCollection: "https://avitdirect.co.uk/collections/video-distribution",
    manufacturer: "Visionary",
    sku: "D5200",
    title: "Visionary D5200 Decoder",
    summary: "PacketAV Duet 4K60 4:4:4 decoder with Dante/AES67 audio, USB over IP and Gigabit Ethernet transport.",
    domain: "AVOIP",
    role: "Decoder",
    transport: "AVoIP",
    family: "Visionary PacketAV Duet",
    maxResolution: "4K60",
    chroma: "4:4:4",
    latency: "Low-latency AVoIP",
    performanceTier: "1G AVoIP decoder with Dante/AES67",
    features: {
      oneGig: true,
      dante: true,
      aes67: true,
      usbRouting: true,
      control: true,
    },
    sourceUrl: "https://avitdirect.co.uk/collections/video-distribution/products/d5200-decoder",
    evidence: [
      "AVITdirect source feed: Visionary D5200 is a 4K60 4:4:4 AVoIP decoder with Dante/AES67.",
      "Classified as AVoIP decoder, not HDBaseT receiver.",
    ],
  },
];

export function findCompetitorSourceProduct(
  manufacturer: string,
  sku: string,
  sourceUrl = "",
): CompetitorSourceProduct | null {
  const brandKey = squash(manufacturer);
  const skuKey = squash(sku);
  const url = normalised(sourceUrl);

  if (!skuKey) return null;

  const exact = competitorSourceProducts.find((product) => {
    return squash(product.manufacturer) === brandKey && squash(product.sku) === skuKey;
  });

  if (exact) return exact;

  const sourceScoped = competitorSourceProducts.find((product) => {
    const productUrlMatch = url && product.sourceUrl && normalised(product.sourceUrl) === url;
    const collectionMatch = url && (
      normalised(product.sourceCollection) === url ||
      url.includes("avitdirect.co.uk/collections/video") ||
      url.includes("avitdirect.co.uk/collections/video-distribution")
    );

    return Boolean(productUrlMatch || collectionMatch) && squash(product.sku) === skuKey;
  });

  if (sourceScoped) return sourceScoped;

  return null;
}
