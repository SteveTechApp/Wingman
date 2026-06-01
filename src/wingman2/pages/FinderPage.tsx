import { useEffect, useMemo, useRef, useState } from "react";
import { classifyWingmanProduct, isWingmanProductEligibleForFinderNeed, wingmanHardwareTypePriority } from "../lib/productClassification";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FolderPlus,
  PackageSearch,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { ProductSalesKnowledgePanel } from "../components/ProductSalesKnowledgePanel";
import { WingmanCoachPanel } from "../components/WingmanCoachPanel";
import {
  saveProductSelectionToProject,
  upsertStoredProject,
  useProjectStore,
  type StoredProject,
} from "../data/projectStore";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { discoveryBriefToFinderNeed, readLatestDiscoveryBrief } from "../data/workflowHandoff";
import { buildWingmanCoachState } from "../lib/wingmanCoach";

type MatchStatus = "recommended" | "alternative" | "caution";
type ProductVoiceId = "endUser" | "systemIntegrator" | "consultant";

type ProductSalesVoice = {
  label?: string;
  headline?: string;
  pitch?: string;
  value?: string;
  talkTrack?: string[];
  discoveryPrompts?: string[];
  positioningNotes?: string[];
  avoidPositioningAs?: string[];
};

type ProductSalesLanguage = {
  headline?: string;
  plainEnglishSummary?: string;
  customerValue?: string;
  realWorldApplication?: string;
  salespersonCue?: string;
  thirdOutputUseCase?: string;
  talkTrack?: string[];
  discoveryPrompts?: string[];
  positioningNotes?: string[];
  avoidPositioningAs?: string[];
  marketApplications?: string[];
  voices?: Partial<Record<ProductVoiceId, ProductSalesVoice>>;
};

type FinderProduct = {
  sku: string;
  title: string;
  family: string;
  category: string;
  description: string;
  tags: string[];
  searchText: string;
  source: "seed" | "index";
  salesLanguage?: ProductSalesLanguage;
  commercialRole?: string;
  finderVisibility?: string;
  bomRole?: string;
  dependencyType?: string;
  primarySystemFamily?: string;
  showWhenRequestedBy?: string[];
};

type FinderNeed = {
  query: string;
  technicalRequirement: string;
  productPath: string;
  technologyType: string;
  signalType: string;
  sourceConnector: string;
  displayConnector: string;
  inputs: string;
  outputs: string;
  distance: string;
  resolution: string;
  usb: string;
  audio: string;
  network: string;
  processing: string;
  control: string;
};

type FinderStep = "start" | "signal" | "size" | "specialist" | "results";

type ProductMatch = FinderProduct & {
  score: number;
  status: MatchStatus;
};

type ProductSelection = {
  sku: string;
  title: string;
  family: string;
  category: string;
  status: MatchStatus;
  tags: string[];
  addedAt: string;
  source: "Product Finder";
  evidence?: string[];
  cautions?: string[];
};

type FinderFeatureFilter = {
  id: string;
  label: string;
  weight: number;
  matches: (product: FinderProduct) => boolean;
};

type UnknownRecord = Record<string, unknown>;

const PRODUCT_SELECTION_STORE_KEY = "wingman-project-product-selections-v1";
const STANDALONE_SHORTLIST_KEY = "wingman-finder-standalone-shortlist-v1";

const technicalRequirementOptions = [
  "Extend HDMI over distance",
  "Extend HDMI and USB together",
  "Connect USB-C laptop",
  "Wireless presentation",
  "BYOD / UC conferencing",
  "Route sources to multiple displays",
  "Dual display / MST",
  "Create multiview layout",
  "Build LCD video wall",
  "Feed LED wall processor",
  "Distribute AV over network",
  "Bring NDI camera into AV system",
  "Extract or route audio",
  "Control displays / system",
];

const productPathOptions = [
  "Presentation switcher",
  "HDMI / USB extender",
  "HDBaseT extender",
  "Matrix / routing",
  "AVoIP",
  "Video wall",
  "UC / conferencing",
  "Wireless presentation",
  "NDI / camera",
  "Audio / control",
];
const technologyTypeOptions = [
  "Core hardware first",
  "All hardware types",
  "AVoIP",
  "Matrix",
  "Presentation / Room Core",
  "Switcher",
  "Splitter / Distribution",
  "Extender / HDBaseT",
  "Unified Comms",
  "Camera / Capture",
  "Video Wall / Multiview",
  "Audio / Control",
  "Dongle",
  "Accessory",
  "Cable",
];

const signalTypeOptions = [
  "HDMI video",
  "USB-C video",
  "HDMI + USB",
  "USB only",
  "NDI / network video",
  "Audio only",
  "Control only",
  "Mixed AV system",
];

const connectorOptions = [
  "HDMI",
  "USB-C",
  "USB-A",
  "USB-B",
  "HDBaseT",
  "RJ45 / network",
  "Fibre",
  "Audio analogue",
  "Dante / AES67",
  "RS-232",
  "IR",
  "Unknown",
];

const inputOptions = ["1", "2", "3-4", "5-8", "9+", "Unknown"];
const outputOptions = ["1", "2", "3-4", "5-8", "9+", "Unknown"];

const distanceOptions = [
  "Local <5m",
  "Short 5-10m",
  "Medium 10-35m",
  "Long 35-70m",
  "Very long 70-100m",
  "Network / site-wide",
  "Unknown",
];

const resolutionOptions = ["1080p", "4K30", "4K60 4:2:0", "4K60 4:4:4", "8K / specialist", "Unknown"];

const usbOptions = [
  "No USB",
  "USB 2.0 enough",
  "USB 3.x required",
  "USB camera",
  "Speakerphone / audio USB",
  "Touch return",
  "Keyboard / mouse",
  "Unknown",
];

const audioOptions = [
  "No audio requirement",
  "Audio de-embed",
  "Mic / speakerphone",
  "DSP integration",
  "Dante / AES67",
  "Amplifier / speakers",
  "Unknown",
];

const networkOptions = [
  "Not required",
  "Existing LAN",
  "Dedicated AV network",
  "10G network",
  "NDI source present",
  "Unknown",
];

const processingOptions = [
  "No processing",
  "Scaling",
  "Seamless switching",
  "Multiview",
  "Video wall processing",
  "Matrix routing",
  "AVoIP routing",
  "Unknown",
];

const controlOptions = [
  "No control",
  "IR",
  "RS-232",
  "Display power control",
  "Web UI",
  "Button panel",
  "Touch panel",
  "Third-party control",
  "Unknown",
];

const seedProducts: FinderProduct[] = [
  {
    sku: "SW-130-TX-UK",
    title: "In-wall HDMI / USB-C presentation transmitter",
    family: "Presentation / HDBaseT",
    category: "HDMI / USB extender",
    description:
      "Use when the user needs a single room input point carrying HDMI, USB-C video, and USB for BYOD or BYOD style workflows.",
    tags: ["HDMI", "USB-C", "USB 2.0", "HDBaseT", "BYOD / UC", "Presentation Switcher"],
    searchText: "sw-130-tx-uk in wall hdmi usb-c usb hdbaset transmitter byod byom hdmi usb extender",
    source: "seed",
  },
  {
    sku: "EX-100-KVM",
    title: "4K HDMI and USB extender kit over HDBaseT",
    family: "HDBaseT",
    category: "HDMI / USB extender",
    description:
      "Use when HDMI and USB 2.0 need to travel together over distance as an integrated extender or KVM style requirement.",
    tags: ["HDMI", "USB 2.0", "HDBaseT", "KVM", "Extender"],
    searchText: "ex-100-kvm hdmi usb extender kit hdbaset kvm usb 2.0",
    source: "seed",
  },
  {
    sku: "RX-35",
    title: "HDBaseT receiver for shorter video-only paths",
    family: "HDBaseT",
    category: "HDBaseT extender",
    description:
      "Use when USB transport is not required and the system only needs a shorter-distance HDBaseT video receive path.",
    tags: ["HDBaseT", "Video only", "Receiver", "Shorter distance"],
    searchText: "rx-35 hdbaset receiver video only hdmi extension shorter distance",
    source: "seed",
  },
  {
    sku: "RX-70",
    title: "HDBaseT receiver for longer video-only paths",
    family: "HDBaseT",
    category: "HDBaseT extender",
    description:
      "Use when USB transport is not required and the system needs a longer-distance HDBaseT video receive path.",
    tags: ["HDBaseT", "Video only", "Receiver", "Longer distance"],
    searchText: "rx-70 hdbaset receiver video only hdmi extension longer distance",
    source: "seed",
  },
  {
    sku: "MX-0402-MST",
    title: "Dual-display / MST presentation switcher",
    family: "Presentation switching",
    category: "Presentation switcher",
    description:
      "Use when a USB-C laptop, dual-display presentation behaviour, or MST-style workflow is required in a compact room-core switcher.",
    tags: ["Presentation switcher", "Dual display", "MST", "USB-C"],
    searchText: "mx-0402-mst presentation switcher dual display mst usb-c",
    source: "seed",
  },
  {
    sku: "MX-0403-H3-MST",
    title: "Multi-output presentation switcher with HDBaseT",
    family: "Presentation switching",
    category: "Presentation switcher",
    description:
      "Use for rooms needing multiple outputs, USB-C or HDMI source handling, MST-style behaviour, and HDBaseT extension.",
    tags: ["Presentation switcher", "Dual display", "MST", "USB-C", "HDBaseT"],
    searchText: "mx-0403-h3-mst presentation switcher hdbaset usb-c hdmi dual display mst",
    source: "seed",
  },
  {
    sku: "MX-0404-SCL",
    title: "4x4 seamless matrix switcher",
    family: "Seamless matrix",
    category: "Matrix / routing",
    description:
      "Use when several sources must route to several displays with scaling or seamless switching in a fixed I/O design.",
    tags: ["Matrix", "4x4", "Scaling", "Seamless switching", "HDMI"],
    searchText: "mx-0404-scl 4x4 seamless matrix switcher hdmi scaling routing",
    source: "seed",
  },
  {
    sku: "MX-0808-SCL",
    title: "8x8 seamless matrix switcher",
    family: "Seamless matrix",
    category: "Matrix / routing",
    description:
      "Use for larger fixed I/O systems where multiple sources need to route to multiple displays with scaling.",
    tags: ["Matrix", "8x8", "Scaling", "Seamless switching", "HDMI"],
    searchText: "mx-0808-scl 8x8 seamless matrix switcher hdmi scaling routing",
    source: "seed",
  },
  {
    sku: "SW-0204-VW",
    title: "Preset-layout video wall processor",
    family: "Video wall processor",
    category: "Video wall",
    description:
      "Use for basic LCD wall layouts where a simple dedicated processor is more appropriate than AVoIP.",
    tags: ["Video wall", "LCD wall", "Processor", "Preset layouts"],
    searchText: "sw-0204-vw video wall processor lcd wall preset layouts",
    source: "seed",
  },
  {
    sku: "SW-0206-VW",
    title: "4K60 video wall processor",
    family: "Video wall processor",
    category: "Video wall",
    description:
      "Use for LCD wall opportunities where fixed 4K60 wall processing is more appropriate than networked AVoIP.",
    tags: ["Video wall", "LCD wall", "4K60", "Processor", "Non-AVoIP"],
    searchText: "sw-0206-vw video wall processor lcd wall 4k60 non avoip",
    source: "seed",
  },
  {
    sku: "NHD-120-TX",
    title: "NetworkHD 100 series encoder",
    family: "NetworkHD 100",
    category: "AVoIP",
    description:
      "Cost-effective AVoIP encoder for flexible NetworkHD 100 distribution over standard network infrastructure.",
    tags: ["AVoIP", "NetworkHD 100", "Encoder", "HDMI"],
    searchText: "nhd-120-tx networkhd 100 avoip encoder hdmi transmitter",
    source: "seed",
  },
  {
    sku: "NHD-120-RX",
    title: "NetworkHD 100 series decoder",
    family: "NetworkHD 100",
    category: "AVoIP",
    description:
      "Cost-effective AVoIP decoder for flexible NetworkHD 100 distribution over standard network infrastructure.",
    tags: ["AVoIP", "NetworkHD 100", "Decoder", "HDMI"],
    searchText: "nhd-120-rx networkhd 100 avoip decoder hdmi receiver",
    source: "seed",
  },
  {
    sku: "NHD-150-RX",
    title: "NetworkHD 100 multiview decoder",
    family: "NetworkHD 100",
    category: "AVoIP",
    description:
      "Use in NetworkHD 100 systems where cost-effective AVoIP distribution and multiview output are required.",
    tags: ["AVoIP", "NetworkHD 100", "Multiview", "Decoder", "Cost-effective"],
    searchText: "nhd-150-rx networkhd 100 avoip multiview decoder h265",
    source: "seed",
  },
  {
    sku: "NHD-128-NDI-TRX",
    title: "NDI to NetworkHD 100 bridge / transceiver",
    family: "NetworkHD 100 / NDI",
    category: "NDI / camera",
    description:
      "Use where NDI sources need to be brought into a NetworkHD 100 H.265 AVoIP workflow.",
    tags: ["NDI", "AVoIP", "NetworkHD 100", "Camera", "H.265"],
    searchText: "nhd-128-ndi-trx ndi networkhd 100 h265 avoip camera bridge",
    source: "seed",
  },
  {
    sku: "NHD-500-TX",
    title: "NetworkHD 500 4K60 AVoIP encoder",
    family: "NetworkHD 500",
    category: "AVoIP",
    description:
      "Premium 4K60 AVoIP path where flexible routing, low latency, stronger USB support, or Dante-ready workflows matter.",
    tags: ["AVoIP", "NetworkHD 500", "4K60", "USB", "Dante"],
    searchText: "nhd-500-tx networkhd 500 4k60 avoip encoder usb dante",
    source: "seed",
  },
  {
    sku: "NHD-500-RX",
    title: "NetworkHD 500 4K60 AVoIP decoder",
    family: "NetworkHD 500",
    category: "AVoIP",
    description:
      "Premium 4K60 AVoIP decoder for higher-quality networked video distribution.",
    tags: ["AVoIP", "NetworkHD 500", "4K60", "USB", "Dante"],
    searchText: "nhd-500-rx networkhd 500 4k60 avoip decoder usb dante",
    source: "seed",
  },
  {
    sku: "NHD-0401-MV",
    title: "NetworkHD 500 multiview processor",
    family: "NetworkHD 500",
    category: "AVoIP",
    description:
      "Use for NetworkHD 500 multiview source composition and monitoring workflows.",
    tags: ["AVoIP", "NetworkHD 500", "Multiview", "Processor"],
    searchText: "nhd-0401-mv networkhd 500 multiview processor source composition",
    source: "seed",
  },
  {
    sku: "NHD-600-TRX",
    title: "NetworkHD 600 10G transceiver",
    family: "NetworkHD 600",
    category: "AVoIP",
    description:
      "Highest-performance lossless zero-latency AVoIP path for demanding 10G networked AV systems.",
    tags: ["AVoIP", "NetworkHD 600", "10G", "Lossless", "Zero latency"],
    searchText: "nhd-600-trx networkhd 600 10g lossless zero latency avoip transceiver",
    source: "seed",
  },
  {
    sku: "CAM-210-NDI-PTZ",
    title: "NDI PTZ camera",
    family: "Unified Communication",
    category: "NDI / camera",
    description:
      "PTZ camera with NDI support for conferencing, capture, streaming, and network video workflows.",
    tags: ["NDI", "PTZ", "Camera", "Streaming"],
    searchText: "cam-210-ndi-ptz ndi camera ptz streaming lecture capture",
    source: "seed",
  },
  {
    sku: "CAM-420-PTZ",
    title: "PTZ camera",
    family: "Unified Communication",
    category: "NDI / camera",
    description:
      "PTZ camera for meeting, teaching, and conferencing applications where camera capture is required.",
    tags: ["PTZ", "Camera", "USB", "HDMI"],
    searchText: "cam-420-ptz camera ptz meeting room training lecture capture",
    source: "seed",
  },
  {
    sku: "CAM-0402-BRG",
    title: "Camera bridge and mixer",
    family: "Unified Communication",
    category: "UC / conferencing",
    description:
      "Camera bridge and mixer for integrating cameras into conferencing and capture workflows.",
    tags: ["Camera bridge", "Mixer", "USB conferencing"],
    searchText: "cam-0402-brg camera bridge mixer usb conferencing",
    source: "seed",
  },
  {
    sku: "IDB-300",
    title: "In-desk cable management box",
    family: "In-Desk Box",
    category: "Presentation switcher",
    description:
      "In-desk cable management box for BYOD and meeting room cable access.",
    tags: ["In-desk", "Cable management", "BYOD", "USB-C", "HDMI"],
    searchText: "idb-300 in desk cable management byod hdmi usb-c",
    source: "seed",
  },
  {
    sku: "APO-DG2",
    title: "Apollo 4K USB-C wireless casting and conferencing dongle",
    family: "Apollo / Wireless Collaboration",
    category: "Wireless presentation",
    description:
      "Use when the room requires plug-and-play USB-C wireless casting or wireless conferencing into compatible Apollo and wireless presentation systems.",
    tags: [
      "Wireless presentation",
      "Wireless conferencing",
      "USB-C",
      "BYOD / UC",
      "Apollo",
      "Dongle",
      "Workflow endpoint",
      "Meeting room",
      "UC / conferencing",
    ],
    searchText:
      "apo-dg2 apollo dg2 usb-c wireless casting wireless conferencing byod byom meeting room presentation dongle apollo sw-620 sw-640",
    source: "seed",
  },
  {
    sku: "APO-DG2-PRO",
    title: "Apollo 4K USB-C wireless casting and conferencing dongle - Pro",
    family: "Apollo / Wireless Collaboration",
    category: "Wireless presentation",
    description:
      "Use when the room requires USB-C wireless casting or wireless conferencing with the professional Apollo dongle workflow.",
    tags: [
      "Wireless presentation",
      "Wireless conferencing",
      "USB-C",
      "BYOD / UC",
      "Apollo",
      "Dongle",
      "Workflow endpoint",
      "Meeting room",
      "UC / conferencing",
    ],
    searchText:
      "apo-dg2-pro apollo dg2 pro usb-c wireless casting wireless conferencing byod byom meeting room presentation dongle apollo sw-620 sw-640",
    source: "seed",
  },
];

const initialNeed: FinderNeed = {
  query: "",
  technicalRequirement: "",
  productPath: "",
  technologyType: "Core hardware first",
  signalType: "",
  sourceConnector: "",
  displayConnector: "",
  inputs: "",
  outputs: "",
  distance: "",
  resolution: "",
  usb: "",
  audio: "",
  network: "",
  processing: "",
  control: "",
};

const finderSteps: Array<{
  id: FinderStep;
  label: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "start",
    label: "Start",
    eyebrow: "Step 1",
    description: "Pick the commercial starting point, search by SKU or set the likely product path.",
  },
  {
    id: "signal",
    label: "Signal path",
    eyebrow: "Step 2",
    description: "Confirm what signal is moving and the connectors at each end.",
  },
  {
    id: "size",
    label: "System size",
    eyebrow: "Step 3",
    description: "Use I/O count, distance and resolution to narrow the architecture.",
  },
  {
    id: "specialist",
    label: "Specialist needs",
    eyebrow: "Step 4",
    description: "Add the extra needs that change product fit, such as USB, network, audio or control.",
  },
  {
    id: "results",
    label: "Recommendation",
    eyebrow: "Step 5",
    description: "Review products, evidence, cautions, shortlist and project handoff.",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanDisplayText(value: unknown) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&#x2122;|&#8482;|&trade;/gi, " TM ")
    .replace(/&#x00ae;|&#174;|&reg;/gi, " R ")
    .replace(/&#x2013;|&#8211;|&ndash;/gi, "-")
    .replace(/&#x2014;|&#8212;|&mdash;/gi, "-")
    .replace(/&#x2018;|&#8216;|&lsquo;/gi, "'")
    .replace(/&#x2019;|&#8217;|&rsquo;/gi, "'")
    .replace(/&#x201c;|&#8220;|&ldquo;/gi, '"')
    .replace(/&#x201d;|&#8221;|&rdquo;/gi, '"')
    .replace(/&#x2022;|&#8226;|&bull;/gi, "-")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2022/g, "-")
    .replace(/[\u0080-\u024f]+/g, " ")
    .replace(/[^\u0020-\u007e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasTextNoise(value: unknown) {
  const text = String(value ?? "");
  return /(?:\u00c3|\u00c2|\u00e2|\ufffd)|[\u0080-\u024f]/.test(text);
}

function normaliseText(value: unknown) {
  return cleanDisplayText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanDisplayText).filter(Boolean)));
}

function textIncludesAny(text: string, terms: string[]) {
  const normalised = normaliseText(text);
  return terms.some((term) => normalised.includes(normaliseText(term)));
}

function valueAsString(value: unknown) {
  if (typeof value === "string") return cleanDisplayText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function deepText(value: unknown, depth = 0): string {
  if (depth > 4 || value == null) return "";
  if (typeof value === "string") return cleanDisplayText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => deepText(item, depth + 1)).join(" ");
  if (typeof value === "object") {
    return Object.values(value as UnknownRecord)
      .map((item) => deepText(item, depth + 1))
      .join(" ");
  }
  return "";
}

function asSalesLanguage(value: unknown): ProductSalesLanguage | undefined {
  if (value && typeof value === "object") return value as ProductSalesLanguage;
  return undefined;
}

function finderSalesLanguage(product: FinderProduct) {
  return product.salesLanguage;
}

function finderSalesSummary(product: FinderProduct) {
  const language = finderSalesLanguage(product);
  return cleanDisplayText(language?.plainEnglishSummary || language?.voices?.endUser?.pitch || product.description);
}

function getFirstString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = valueAsString(record[key]);
    if (value.trim()) return value.trim();
  }
  return "";
}

function collectProductRecords(value: unknown, output: UnknownRecord[] = [], depth = 0) {
  if (depth > 5 || value == null) return output;

  if (Array.isArray(value)) {
    value.forEach((item) => collectProductRecords(item, output, depth + 1));
    return output;
  }

  if (typeof value !== "object") return output;

  const record = value as UnknownRecord;
  const sku = getFirstString(record, ["sku", "SKU", "model", "Model", "id", "productCode"]);
  const title = getFirstString(record, ["title", "name", "productName", "Product Name", "description"]);

  if (sku || title) output.push(record);

  Object.values(record).forEach((item) => {
    if (Array.isArray(item)) collectProductRecords(item, output, depth + 1);
  });

  return output;
}

function classifyProduct(product: FinderProduct) {
  const text = normaliseText(`${product.sku} ${product.title} ${product.description} ${product.searchText}`);

  if (textIncludesAny(text, ["video wall", "lcd wall", "wall processor", "sw 0206 vw", "sw 0204 vw"])) return "Video wall";
  if (textIncludesAny(text, ["ndi", "camera", "ptz", "cam"])) return "NDI / camera";
  if (textIncludesAny(text, ["networkhd", "nhd", "avoip", "av over ip", "encoder", "decoder", "transceiver"])) return "AVoIP";
  if (textIncludesAny(text, ["matrix", "routing", "mx 0404", "mx 0808", "mx 0812"])) return "Matrix / routing";
  if (textIncludesAny(text, ["hdbaset", "rx", "tx", "extender", "kvm"])) return "HDBaseT extender";
  if (textIncludesAny(text, ["wireless", "miracast", "airplay"])) return "Wireless presentation";
  if (textIncludesAny(text, ["usb", "conference", "byom", "byod", "speakerphone", "microphone"])) return "UC / conferencing";
  if (textIncludesAny(text, ["presentation", "switcher", "usb c", "sw"])) return "Presentation switcher";

  return product.category || "Other";
}

function classifyTechnologyType(product: FinderProduct) {
  return classifyWingmanProduct(product).technologyType;
}

function hardwareTypePriority(product: FinderProduct) {
  return wingmanHardwareTypePriority(product);
}

function matchesTechnologyType(product: FinderProduct, selectedTechnologyType: string) {
  if (!selectedTechnologyType) return true;
  if (selectedTechnologyType === "Core hardware first") return true;
  if (selectedTechnologyType === "All hardware types") return true;

  return classifyWingmanProduct(product).technologyType === selectedTechnologyType;
}

function compareProductMatches(a: ProductMatch, b: ProductMatch) {
  const priorityDelta = hardwareTypePriority(a) - hardwareTypePriority(b);

  if (priorityDelta !== 0) return priorityDelta;
  if (b.score !== a.score) return b.score - a.score;

  return a.sku.localeCompare(b.sku);
}
function isWyreStormProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const brandText = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.description} ${product.searchText}`);
  const prefixes = ["NHD-", "SW-", "MX-", "RX-", "TX-", "EX-", "EXP-", "APO-", "CAM-", "SP-", "CAB-", "CBL-", "IDB-", "AMP-", "USB-", "CON-", "WP-"];

  if (brandText.includes("wyrestorm")) return true;
  return prefixes.some((prefix) => sku.startsWith(prefix));
}

function cleanFinderProduct(product: FinderProduct): FinderProduct {
  const cleaned: FinderProduct = {
    ...product,
    sku: cleanDisplayText(product.sku),
    title: cleanDisplayText(product.title),
    family: cleanDisplayText(product.family),
    category: cleanDisplayText(product.category),
    description: cleanDisplayText(product.description),
    tags: unique(product.tags),
    searchText: cleanDisplayText(product.searchText),
  };

  if (hasTextNoise(product.family) || !cleaned.family) cleaned.family = classifyProduct(cleaned);
  if (hasTextNoise(product.category) || !cleaned.category) cleaned.category = classifyProduct(cleaned);

  return cleaned;
}

function normaliseIndexProduct(record: UnknownRecord): FinderProduct | null {
  const sku = getFirstString(record, ["sku", "SKU", "model", "Model", "id", "productCode", "product_code"]);
  const title = getFirstString(record, ["title", "name", "productName", "Product Name"]) || sku || "WyreStorm product";

  if (!sku && !title) return null;

  const description =
    getFirstString(record, ["description", "summary", "shortDescription", "productDescription"]) ||
    deepText(record).slice(0, 260);

  const family = getFirstString(record, ["family", "series", "category", "productFamily"]) || "WyreStorm";
  const technicalProfile = record.technicalProfile;
  const salesLanguage =
    asSalesLanguage(record.salesLanguage) ||
    (technicalProfile && typeof technicalProfile === "object"
      ? asSalesLanguage((technicalProfile as UnknownRecord).salesLanguage)
      : undefined);
  const tags = unique([
    family,
    getFirstString(record, ["category", "type", "technology"]),
    ...deepText(record)
      .split(/\s+/)
      .filter((word) => /^(usb|hdbaset|hdmi|avoip|networkhd|ndi|4k|8k|matrix|video|wall|wireless|dante|audio|control|rs232)$/i.test(word))
      .slice(0, 10),
  ]);

  const product: FinderProduct = {
    sku: sku || title,
    title,
    family,
    category: getFirstString(record, ["category", "type", "technology"]) || "WyreStorm product",
    description,
    tags,
    searchText: deepText(record),
    source: "index",
    salesLanguage,
    commercialRole: getFirstString(record, ["commercialRole"]),
    finderVisibility: getFirstString(record, ["finderVisibility"]),
    bomRole: getFirstString(record, ["bomRole"]),
    dependencyType: getFirstString(record, ["dependencyType"]),
    primarySystemFamily: getFirstString(record, ["primarySystemFamily"]),
    showWhenRequestedBy: Array.isArray(record.showWhenRequestedBy)
      ? record.showWhenRequestedBy.map(String).filter(Boolean)
      : [],
  };

  const cleaned = cleanFinderProduct({ ...product, category: classifyProduct(product) });

  if (!isWyreStormProduct(cleaned)) return null;
  if (hasTextNoise(cleaned.title) || hasTextNoise(cleaned.description)) return null;

  return cleaned;
}

function normaliseProductIndex(data: unknown) {
  const records = collectProductRecords(data);
  const products = records.map(normaliseIndexProduct).filter((product): product is FinderProduct => Boolean(product));
  const bySku = new Map<string, FinderProduct>();

  [...seedProducts, ...products].map(cleanFinderProduct).forEach((product) => {
    if (!isWyreStormProduct(product)) return;

    const key = product.sku.toUpperCase();
    const existing = bySku.get(key);

    if (!existing) {
      bySku.set(key, product);
      return;
    }

    if (existing.source === "seed") {
      bySku.set(key, {
        ...existing,
        salesLanguage: existing.salesLanguage || product.salesLanguage,
        tags: unique([...existing.tags, ...product.tags]),
        searchText: cleanDisplayText(`${existing.searchText} ${product.searchText}`),
      });
      return;
    }

    bySku.set(key, {
      ...existing,
      ...product,
      tags: unique([...existing.tags, ...product.tags]),
      searchText: cleanDisplayText(`${existing.searchText} ${product.searchText}`),
    });
  });

  return Array.from(bySku.values()).map(cleanFinderProduct);
}

function hasFinderIntent(need: FinderNeed) {
  const neutralValues = new Set([
    "",
    "Unknown",
    "Any / not known",
    "Core hardware first",
    "All hardware types",
  ]);

  return (Object.keys(need) as (keyof FinderNeed)[]).some((key) => {
    const value = need[key].trim();

    if (!value) return false;
    if (key === "query") return value.length >= 2;
    if (key === "technologyType") return value !== "Core hardware first" && value !== "All hardware types";

    return !neutralValues.has(value);
  });
}

function getFinderMetadataValue(product: FinderProduct, key: string) {
  const value = (product as FinderProduct & Record<string, unknown>)[key];

  if (Array.isArray(value)) {
    return value.map(String).join(" ");
  }

  return String(value ?? "");
}

function inferFinderCommercialRole(product: FinderProduct) {
  const explicitRole = getFinderMetadataValue(product, "commercialRole").trim();

  if (explicitRole) {
    return explicitRole;
  }

  const text = normaliseText(`${product.sku} ${product.title} ${product.description} ${product.tags.join(" ")}`);

  if (textIncludesAny(text, ["nhd touch", "companion control app", "software app", "cloud management", "sygma"])) {
    return "software-app";
  }

  if (textIncludesAny(text, ["rack", "rack mount", "psu", "power supply", "mount", "bracket", "dock", "adapter", "adaptor", "cable"])) {
    return "accessory";
  }

  if (textIncludesAny(text, ["dongle"]) && product.sku.toUpperCase() !== "APO-DG2" && product.sku.toUpperCase() !== "APO-DG2-PRO") {
    return "accessory";
  }

  if (textIncludesAny(text, ["receiver", "decoder", "encoder", "transmitter", "transceiver", "extender"])) {
    return "endpoint-hardware";
  }

  return "primary-hardware";
}

function inferFinderVisibility(product: FinderProduct) {
  const explicitVisibility = getFinderMetadataValue(product, "finderVisibility").trim();

  if (explicitVisibility) {
    return explicitVisibility;
  }

  const role = inferFinderCommercialRole(product);

  if (role === "primary-hardware" || role === "endpoint-hardware") {
    return "default";
  }

  if (role === "system-controller" || role === "workflow-endpoint") {
    return "conditional-default";
  }

  return "request-only";
}

function needRequestsSupportItems(need: FinderNeed) {
  const text = normaliseText(Object.values(need).join(" "));

  return textIncludesAny(text, [
    "accessory",
    "accessories",
    "rack",
    "rack mount",
    "rack kit",
    "psu",
    "power supply",
    "mount",
    "wall mount",
    "bracket",
    "cable",
    "dongle",
    "adapter",
    "adaptor",
    "dock",
    "software",
    "app",
    "control app",
    "nhd touch",
    "companion app",
    "spare",
    "dependency",
    "dependencies",
    "what else",
  ]);
}

function needRequestsWirelessCollaborationEndpoint(need: FinderNeed) {
  const text = normaliseText(Object.values(need).join(" "));

  return (
    need.technicalRequirement === "Wireless presentation" ||
    need.technicalRequirement === "BYOD / UC conferencing" ||
    need.productPath === "Wireless presentation" ||
    textIncludesAny(text, [
      "wireless presentation",
      "wireless conferencing",
      "wireless casting",
      "byod",
      "byom",
      "apollo",
      "dg2",
      "apo dg2",
      "usb c wireless",
      "sw 620",
      "sw 640",
    ])
  );
}

function needRequestsControlProducts(need: FinderNeed) {
  const text = normaliseText(Object.values(need).join(" "));

  return (
    need.control === "Touch panel" ||
    need.control === "Button panel" ||
    need.control === "Third-party control" ||
    need.technicalRequirement === "Control displays / system" ||
    textIncludesAny(text, ["control", "controller", "touch panel", "button panel", "networkhd controller", "syn touch", "syn key"])
  );
}

function isFinderVisibleForNeed(product: FinderProduct, need: FinderNeed) {
  const sku = product.sku.toUpperCase();
  const role = inferFinderCommercialRole(product);
  const visibility = inferFinderVisibility(product);

  if (sku === "APO-DG2" || sku === "APO-DG2-PRO") {
    return needRequestsWirelessCollaborationEndpoint(need) || needRequestsSupportItems(need);
  }

  if (visibility === "default") {
    return true;
  }

  if (visibility === "conditional-default" && role === "system-controller") {
    return needRequestsControlProducts(need) || needRequestsSupportItems(need);
  }

  if (visibility === "conditional-default" && role === "workflow-endpoint") {
    return needRequestsWirelessCollaborationEndpoint(need) || needRequestsSupportItems(need);
  }

  if (visibility === "request-only" || visibility === "dependency-only") {
    return needRequestsSupportItems(need);
  }

  if (visibility === "hide") {
    return false;
  }

  return role === "primary-hardware" || role === "endpoint-hardware";
}


function applyFinderVisibilityToMatch(match: ProductMatch, need: FinderNeed): ProductMatch {
  if (isFinderVisibleForNeed(match, need)) {
    return match;
  }

  return {
    ...match,
    score: -999,
    status: "caution",
  };
}


function getFinderNeedText(need: FinderNeed) {
  return normaliseText(Object.values(need).join(" "));
}

function getFinderMatchText(match: FinderProduct) {
  return normaliseText(
    `${match.sku} ${match.title} ${match.family} ${match.category} ${match.description} ${match.tags.join(" ")} ${match.searchText}`
  );
}

function finderMatchHasAny(match: FinderProduct, terms: string[]) {
  return textIncludesAny(getFinderMatchText(match), terms);
}

function finderNeedHasAny(need: FinderNeed, terms: string[]) {
  return textIncludesAny(getFinderNeedText(need), terms);
}

function suppressFinderMatch(match: ProductMatch): ProductMatch {
  return {
    ...match,
    score: -999,
    status: "caution",
  };
}

function promoteFinderMatch(match: ProductMatch, score = 96): ProductMatch {
  return {
    ...match,
    score: Math.max(match.score, score),
    status: "recommended",
  };
}

function isNetworkHdProduct(match: FinderProduct) {
  const sku = match.sku.toUpperCase();
  const text = getFinderMatchText(match);

  if (sku.startsWith("NHD-")) {
    return true;
  }

  return textIncludesAny(text, ["networkhd", "network hd"]);
}

function isDedicatedNetworkHdMultiviewProduct(match: FinderProduct) {
  const sku = match.sku.toUpperCase();
  const text = getFinderMatchText(match);

  if (sku === "NHD-150-RX") {
    return true;
  }

  if (sku === "NHD-0401-MV") {
    return true;
  }

  return sku.startsWith("NHD-") && textIncludesAny(text, ["multiview", "multi view", "multi-view", "mv"]);
}

function isGeneralMultiviewProduct(match: FinderProduct) {
  const sku = match.sku.toUpperCase();
  const text = getFinderMatchText(match);

  if (isDedicatedNetworkHdMultiviewProduct(match)) {
    return true;
  }

  if (sku === "MX-0404-SCL" || sku === "MX-0808-SCL" || sku === "MX-0812-SCL") {
    return true;
  }

  return textIncludesAny(text, [
    "multiview",
    "multi view",
    "multi-view",
    "pip",
    "picture in picture",
    "quad view",
    "quad-view",
    "mosaic",
  ]);
}

function finderRequirementPath(need: FinderNeed) {
  if (need.productPath) {
    return need.productPath;
  }

  return inferPathFromNeed(need);
}

function applyFinderRequirementGate(match: ProductMatch, need: FinderNeed): ProductMatch {
  if (match.score < 0) {
    return match;
  }

  const sku = match.sku.toUpperCase();
  const path = finderRequirementPath(need);

  const requiresMultiview =
    need.technicalRequirement === "Create multiview layout" ||
    need.processing === "Multiview" ||
    finderNeedHasAny(need, ["multiview", "multi view", "multi-view", "pip", "quad view"]);

  if (requiresMultiview && path === "AVoIP") {
    if (isDedicatedNetworkHdMultiviewProduct(match)) {
      return promoteFinderMatch(match, sku === "NHD-150-RX" || sku === "NHD-0401-MV" ? 99 : 94);
    }

    return suppressFinderMatch(match);
  }

  if (requiresMultiview) {
    if (isGeneralMultiviewProduct(match)) {
      return promoteFinderMatch(match, 94);
    }

    return suppressFinderMatch(match);
  }

  if (path === "AVoIP") {
    if (isNetworkHdProduct(match)) {
      return match;
    }

    return suppressFinderMatch(match);
  }

  if (path === "Video wall") {
    if (finderMatchHasAny(match, ["video wall", "videowall", "wall processor", "networkhd", "nhd-", "sw-0204-vw", "sw-0206-vw"])) {
      return match;
    }

    return suppressFinderMatch(match);
  }

  if (need.technicalRequirement === "Bring NDI camera into AV system") {
    if (finderMatchHasAny(match, ["ndi", "camera", "ptz", "nhd-128-ndi"])) {
      return match;
    }

    return suppressFinderMatch(match);
  }

  if (need.technicalRequirement === "Extend HDMI and USB together") {
    if (finderMatchHasAny(match, ["hdmi", "usb", "kvm", "hdbaset 3", "swx", "rx3", "tx3"])) {
      const text = getFinderMatchText(match);

      if (text.includes("hdmi") && (text.includes("usb") || text.includes("kvm"))) {
        return match;
      }

      if (text.includes("usb c") || text.includes("usb-c")) {
        return match;
      }
    }

    return suppressFinderMatch(match);
  }

  if (need.technicalRequirement === "Connect USB-C laptop") {
    if (finderMatchHasAny(match, ["usb-c", "usb c", "presentation switcher", "apollo", "sw-120", "sw-130", "mx-0402", "mx-0403"])) {
      return match;
    }

    return suppressFinderMatch(match);
  }

  if (need.technicalRequirement === "Wireless presentation") {
    if (finderMatchHasAny(match, ["wireless", "airplay", "miracast", "apollo", "apo-dg2", "apo-dg2-pro", "sw-640", "sw-620"])) {
      return match;
    }

    return suppressFinderMatch(match);
  }

  return match;
}

function expectedProductPathForRequirement(requirement: string) {
  if (requirement === "Extend HDMI and USB together") return "HDMI / USB extender";
  if (requirement === "Extend HDMI over distance") return "HDBaseT extender";
  if (requirement === "Connect USB-C laptop") return "Presentation switcher";
  if (requirement === "Wireless presentation") return "Wireless presentation";
  if (requirement === "BYOD / UC conferencing") return "UC / conferencing";
  if (requirement === "Route sources to multiple displays") return "Matrix / routing";
  if (requirement === "Dual display / MST") return "Presentation switcher";
  if (requirement === "Create multiview layout") return "AVoIP";
  if (requirement === "Build LCD video wall") return "Video wall";
  if (requirement === "Feed LED wall processor") return "Video wall";
  if (requirement === "Distribute AV over network") return "AVoIP";
  if (requirement === "Bring NDI camera into AV system") return "NDI / camera";
  if (requirement === "Extract or route audio") return "Audio / control";
  if (requirement === "Control displays / system") return "Audio / control";
  return "";
}

function inferPathFromNeed(need: FinderNeed) {
  const expected = expectedProductPathForRequirement(need.technicalRequirement);
  if (need.productPath) return need.productPath;
  if (expected) return expected;

  if (["3-4", "5-8", "9+"].includes(need.inputs) || ["3-4", "5-8", "9+"].includes(need.outputs)) {
    return "Matrix / routing";
  }

  if (need.network === "Dedicated AV network" || need.network === "10G network") return "AVoIP";
  if (need.processing === "Video wall processing") return "Video wall";
  if (need.processing === "Multiview") return "AVoIP";
  if (need.usb === "Touch return" || need.usb === "Keyboard / mouse") return "HDMI / USB extender";
  if (need.usb === "USB camera" || need.usb === "Speakerphone / audio USB") return "UC / conferencing";
  if (need.usb === "No USB" && need.distance) return "HDBaseT extender";

  return "";
}

function hasMultiInputNeed(need: FinderNeed) {
  return ["3-4", "5-8", "9+"].includes(need.inputs) || ["3-4", "5-8", "9+"].includes(need.outputs);
}

function hasIntegratedHdmiUsbNeed(need: FinderNeed) {
  const query = normaliseText(need.query);
  return (
    need.technicalRequirement === "Extend HDMI and USB together" ||
    need.signalType === "HDMI + USB" ||
    (query.includes("hdmi") && query.includes("usb") && (query.includes("extend") || query.includes("extender")))
  );
}

function productHasAny(product: FinderProduct, terms: string[]) {
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`);
  return terms.some((term) => text.includes(normaliseText(term)));
}

function productHasFeatureTerm(product: FinderProduct, term: string) {
  const text = ` ${getFinderMatchText(product)} `;
  const normalisedTerm = normaliseText(term);

  if (!normalisedTerm) return false;
  if (normalisedTerm.length <= 3 && !normalisedTerm.includes(" ")) {
    return text.includes(` ${normalisedTerm} `);
  }

  return text.includes(normalisedTerm);
}

function productHasFeatureAny(product: FinderProduct, terms: string[]) {
  return terms.some((term) => productHasFeatureTerm(product, term));
}

function productHasAllFeatureGroups(product: FinderProduct, termGroups: string[][]) {
  return termGroups.every((terms) => productHasFeatureAny(product, terms));
}

function isAvIoCountCandidate(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = getFinderMatchText(product);
  const role = inferFinderCommercialRole(product);
  const hasSwitchingCore = productHasFeatureAny(product, [
    "matrix",
    "switcher",
    "splitter",
    "extender",
    "hdbaset",
    "video wall",
    "wall processor",
    "presentation",
    "apollo",
  ]);

  if (
    role.includes("accessory") && !hasSwitchingCore ||
    role.includes("rack") ||
    role.includes("software") ||
    sku.startsWith("AMP-") ||
    sku.startsWith("CAB-") ||
    sku.startsWith("CBL-") ||
    sku.startsWith("IDB-US") ||
    sku.startsWith("IDB-PWR") ||
    sku.startsWith("IDB-CBL") ||
    isControlOnlyProduct(product)
  ) {
    return false;
  }

  if (text.includes("amplifier") || text.includes("speakerphone") && !text.includes("switcher")) {
    return false;
  }

  return hasSwitchingCore;
}

function getRequestedIoCount(value: string) {
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3-4") return 3;
  if (value === "5-8") return 5;
  if (value === "9+") return 9;
  return 0;
}

function getProductIoCapacity(product: FinderProduct) {
  if (!isAvIoCountCandidate(product)) {
    return { inputs: 0, outputs: 0 };
  }

  const text = getFinderMatchText(product);
  let inputs = 0;
  let outputs = 0;

  const xPattern = /(?:^|\s)(\d{1,2})\s*x\s*(\d{1,2})(?:\s|$)/g;
  for (const match of text.matchAll(xPattern)) {
    const left = Number(match[1]);
    const right = Number(match[2]);

    if (Number.isFinite(left) && Number.isFinite(right) && left <= 32 && right <= 32) {
      inputs = Math.max(inputs, left);
      outputs = Math.max(outputs, right);
    }
  }

  const inputPattern = /(?:^|\s)(\d{1,2})\s*(?:-| )?\s*inputs?\b/g;
  for (const match of text.matchAll(inputPattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value <= 32) inputs = Math.max(inputs, value);
  }

  const inputPhrasePattern = /(?:^|\s)(\d{1,2})\s+(?:[a-z0-9]+\s+){0,3}inputs?\b/g;
  for (const match of text.matchAll(inputPhrasePattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value <= 32) inputs = Math.max(inputs, value);
  }

  const outputPattern = /(?:^|\s)(\d{1,2})\s*(?:-| )?\s*(?:outputs?|out)\b/g;
  for (const match of text.matchAll(outputPattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value <= 32) outputs = Math.max(outputs, value);
  }

  const outputPhrasePattern = /(?:^|\s)(\d{1,2})\s+(?:[a-z0-9]+\s+){0,3}(?:outputs?|out)\b/g;
  for (const match of text.matchAll(outputPhrasePattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value <= 32) outputs = Math.max(outputs, value);
  }

  if ((text.includes("usb c") && text.includes("hdmi") && text.includes("input")) || text.includes("hdmi usb c input")) {
    inputs = Math.max(inputs, 2);
  }

  const outputMentions = (text.match(/\bout\b/g) ?? []).length;
  if (outputMentions >= 2 && (text.includes("hdmi out") || text.includes("hdbaset"))) {
    outputs = Math.max(outputs, Math.min(outputMentions, 4));
  }

  if (text.includes("single") && textIncludesAny(text, ["transmitter", "receiver", "encoder", "decoder", "extender"])) {
    inputs = Math.max(inputs, 1);
    outputs = Math.max(outputs, 1);
  }

  return { inputs, outputs };
}

function productSupportsIoCount(product: FinderProduct, key: "inputs" | "outputs", value: string) {
  const requested = getRequestedIoCount(value);
  if (!requested) return false;

  const capacity = getProductIoCapacity(product)[key];
  if (capacity >= requested) return true;

  if (requested >= 9 && isAvOverIpProduct(product) && !isReceiverOnlyProduct(product) && !isControlOnlyProduct(product)) {
    return true;
  }

  return false;
}

function needHasUcAudioOrCameraContext(need: FinderNeed) {
  const text = getFinderNeedText(need);

  return (
    need.technicalRequirement === "BYOD / UC conferencing" ||
    need.productPath === "UC / conferencing" ||
    need.usb === "USB camera" ||
    need.usb === "Speakerphone / audio USB" ||
    need.audio === "Mic / speakerphone" ||
    textIncludesAny(text, [
      "conferencing",
      "conference",
      "byod",
      "byom",
      "camera",
      "speakerphone",
      "microphone",
      "mic",
      "audio usb",
      "usb audio",
    ])
  );
}

function isUcCentricSwitcher(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = getFinderMatchText(product);

  return sku === "APO-210-UC" || sku.startsWith("APO-") && text.includes("speakerphone") && text.includes("switcher");
}

function isAllowedFeatureSearchProduct(product: FinderProduct, need: FinderNeed) {
  if (need.query.trim() && product.sku.toLowerCase() === need.query.trim().toLowerCase()) {
    return true;
  }

  if (isUcCentricSwitcher(product) && !needHasUcAudioOrCameraContext(need)) {
    return false;
  }

  return true;
}

function makeAnyFeatureFilter(id: string, label: string, terms: string[], weight = 28): FinderFeatureFilter {
  return {
    id,
    label,
    weight,
    matches: (product) => productHasFeatureAny(product, terms),
  };
}

function makeAllFeatureFilter(id: string, label: string, termGroups: string[][], weight = 34): FinderFeatureFilter {
  return {
    id,
    label,
    weight,
    matches: (product) => productHasAllFeatureGroups(product, termGroups),
  };
}

function makeCustomFeatureFilter(
  id: string,
  label: string,
  weight: number,
  matches: (product: FinderProduct) => boolean,
): FinderFeatureFilter {
  return { id, label, weight, matches };
}

function isNeutralFeatureValue(value: string) {
  return [
    "",
    "Unknown",
    "No audio requirement",
    "No processing",
    "No control",
    "Not required",
  ].includes(value);
}

function queryFeatureFilter(query: string): FinderFeatureFilter | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const normalised = normaliseText(trimmed);

  if (normalised.includes("usb 3")) {
    return makeAnyFeatureFilter("query:usb3", "USB 3.x", ["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"], 40);
  }

  if (normalised.includes("usb 2")) {
    return makeAnyFeatureFilter("query:usb2", "USB 2.0", ["usb 2", "usb 2.0", "usb 2 0", "usb over ip", "kvm"], 40);
  }

  const stopWords = new Set([
    "a",
    "an",
    "and",
    "for",
    "products",
    "product",
    "devices",
    "device",
    "required",
    "require",
    "using",
    "with",
    "support",
    "supports",
    "the",
  ]);
  const words = normalised.split(/\s+/).filter((word) => word.length >= 2 && !stopWords.has(word));

  return makeCustomFeatureFilter("query", trimmed, 34, (product) => {
    const text = getFinderMatchText(product);
    if (text.includes(normalised)) return true;
    return words.length > 0 && words.every((word) => text.includes(word));
  });
}

function usbFeatureFilter(value: string): FinderFeatureFilter | null {
  if (!value || value === "Unknown") return null;

  if (value === "No USB") {
    return makeCustomFeatureFilter("usb:no-usb", value, 30, (product) => {
      const hasUsb = productHasAny(product, ["usb", "usb-c", "usb c"]);
      const hasAvRole = productHasAny(product, [
        "hdmi",
        "hdbaset",
        "receiver",
        "transmitter",
        "matrix",
        "switcher",
        "video wall",
        "wall processor",
        "networkhd",
        "encoder",
        "decoder",
      ]);

      return !hasUsb && hasAvRole;
    });
  }

  if (value === "USB 2.0 enough") {
    return makeAnyFeatureFilter("usb:2", value, ["usb 2", "usb 2.0", "usb 2 0", "usb over ip", "kvm", "hid"], 42);
  }

  if (value === "USB 3.x required") {
    return makeAnyFeatureFilter(
      "usb:3",
      value,
      ["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"],
      46,
    );
  }

  if (value === "USB camera") {
    return makeAllFeatureFilter("usb:camera", value, [["usb", "usb 2", "usb 3", "usb-c", "usb c"], ["camera", "webcam", "ptz", "video-speakerphone"]], 40);
  }

  if (value === "Speakerphone / audio USB") {
    return makeAnyFeatureFilter("usb:audio", value, ["speakerphone", "microphone", "companion mic", "audio usb", "usb audio"], 38);
  }

  if (value === "Touch return") {
    return makeAnyFeatureFilter("usb:touch", value, ["touch", "touchscreen", "touch return", "usb 2", "kvm", "hid"], 36);
  }

  if (value === "Keyboard / mouse") {
    return makeAnyFeatureFilter("usb:hid", value, ["keyboard", "mouse", "hid", "kvm", "usb 2", "usb over ip"], 36);
  }

  return null;
}

function productPathFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const pathTerms: Record<string, string[]> = {
    "Presentation switcher": ["presentation switcher", "switcher", "usb-c", "usb c", "byod", "byom"],
    "HDMI / USB extender": ["hdmi", "usb", "kvm", "hdbaset", "extender"],
    "HDBaseT extender": ["hdbaset", "hdbt", "extender", "receiver", "transmitter"],
    "Matrix / routing": ["matrix", "routing", "multi output", "multiple outputs", "seamless"],
    AVoIP: ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver"],
    "Video wall": ["video wall", "videowall", "wall processor", "lcd wall", "sw-0204", "sw-0206"],
    "UC / conferencing": ["uc", "conference", "conferencing", "speakerphone", "microphone", "camera", "byod", "byom"],
    "Wireless presentation": ["wireless", "airplay", "miracast", "casting", "apollo", "dongle"],
    "NDI / camera": ["ndi", "camera", "ptz", "webcam"],
    "Audio / control": ["audio", "dante", "aes67", "amplifier", "rs-232", "rs232", "ir", "control", "gpio"],
  };

  return makeCustomFeatureFilter(`path:${value}`, value, 36, (product) => {
    return product.category === value || classifyProduct(product) === value || productHasFeatureAny(product, pathTerms[value] ?? [value]);
  });
}

function technicalRequirementFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  if (value === "Extend HDMI and USB together") {
    return makeAllFeatureFilter("requirement:hdmi-usb", value, [["hdmi", "usb-c", "usb c"], ["usb", "kvm"], ["extender", "hdbaset", "hdbt", "transmitter", "receiver"]], 42);
  }

  if (value === "HDMI + USB") {
    return makeAllFeatureFilter("signal:hdmi-usb", value, [["hdmi"], ["usb", "kvm"]], 38);
  }

  const requirementTerms: Record<string, string[]> = {
    "Extend HDMI over distance": ["hdbaset", "hdbt", "extender", "receiver", "transmitter", "hdmi"],
    "Connect USB-C laptop": ["usb-c", "usb c", "presentation switcher", "byod", "byom", "laptop"],
    "Wireless presentation": ["wireless", "airplay", "miracast", "casting", "apollo", "dongle"],
    "BYOD / UC conferencing": ["byod", "byom", "conference", "conferencing", "speakerphone", "camera", "usb-c", "usb c"],
    "Route sources to multiple displays": ["matrix", "routing", "multi output", "multiple outputs", "switcher", "networkhd"],
    "Dual display / MST": ["dual display", "dual-output", "multi output", "mst", "matrix", "presentation"],
    "Create multiview layout": ["multiview", "multi view", "multi-view", "pip", "quad view", "processor"],
    "Build LCD video wall": ["video wall", "lcd wall", "videowall", "wall processor", "networkhd"],
    "Feed LED wall processor": ["led wall", "video wall", "wall processor", "processor", "scaler"],
    "Distribute AV over network": ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver", "1gbe", "10g"],
    "Bring NDI camera into AV system": ["ndi", "camera", "ptz", "networkhd"],
    "Extract or route audio": ["audio", "dante", "aes67", "de-embed", "de embed", "amplifier", "speaker"],
    "Control displays / system": ["control", "rs-232", "rs232", "ir", "cec", "gpio", "relay", "web ui"],
  };

  return makeAnyFeatureFilter(`requirement:${value}`, value, requirementTerms[value] ?? [value], 38);
}

function signalFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  if (value === "HDMI + USB") {
    return makeAllFeatureFilter("signal:hdmi-usb", value, [["hdmi"], ["usb", "kvm"]], 38);
  }

  const signalTerms: Record<string, string[]> = {
    "HDMI video": ["hdmi"],
    "USB-C video": ["usb-c", "usb c", "dp alt mode", "alt-mode"],
    "USB only": ["usb", "usb 2", "usb 3", "usb hub", "usb over ip"],
    "NDI / network video": ["ndi", "network video", "networkhd", "av over ip", "avoip"],
    "Audio only": ["audio", "dante", "aes67", "amplifier", "speaker", "mic"],
    "Control only": ["control", "rs-232", "rs232", "ir", "cec", "gpio", "relay"],
    "Mixed AV system": ["matrix", "switcher", "networkhd", "av over ip", "audio", "control"],
  };

  return makeAnyFeatureFilter(`signal:${value}`, value, signalTerms[value] ?? [value], 34);
}

function connectorFeatureFilter(key: string, value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const connectorTerms: Record<string, string[]> = {
    HDMI: ["hdmi"],
    "USB-C": ["usb-c", "usb c"],
    "USB-A": ["usb-a", "usb a", "usb-a ports", "usb a ports"],
    "USB-B": ["usb-b", "usb b"],
    HDBaseT: ["hdbaset", "hdbt"],
    "RJ45 / network": ["rj45", "network", "1gbe", "10g", "ethernet", "lan"],
    Fibre: ["fibre", "fiber", "sfp"],
    "Audio analogue": ["analog audio", "analogue audio", "audio"],
    "Dante / AES67": ["dante", "aes67"],
    "RS-232": ["rs-232", "rs232"],
    IR: ["ir"],
  };

  return makeAnyFeatureFilter(`${key}:${value}`, value, connectorTerms[value] ?? [value], 32);
}

function ioCountFeatureFilter(key: "inputs" | "outputs", value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  return makeCustomFeatureFilter(`${key}:${value}`, `${key} ${value}`, 22, (product) => productSupportsIoCount(product, key, value));
}

function distanceFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const distanceTerms: Record<string, string[]> = {
    "Local <5m": ["switcher", "matrix", "local", "in-wall", "in wall", "in-desk", "in desk"],
    "Short 5-10m": ["10m", "15m", "short", "cable", "switcher", "hdbaset"],
    "Medium 10-35m": ["35m", "hdbaset", "hdbt", "extender", "receiver", "transmitter"],
    "Long 35-70m": ["70m", "100m", "hdbaset", "hdbt", "extender", "receiver", "transmitter"],
    "Very long 70-100m": ["100m", "hdbaset", "hdbt", "fiber", "fibre", "sfp", "networkhd"],
    "Network / site-wide": ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver", "ndi"],
  };

  return makeAnyFeatureFilter(`distance:${value}`, value, distanceTerms[value] ?? [value], 28);
}

function resolutionFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const resolutionTerms: Record<string, string[]> = {
    "1080p": ["1080p", "1080p60", "full hd"],
    "4K30": ["4k30", "4k 30"],
    "4K60 4:2:0": ["4k60", "4k 60", "4:2:0", "4 2 0", "4k60hz"],
    "4K60 4:4:4": ["4k60", "4k 60", "4:4:4", "4 4 4", "4k60hz"],
    "8K / specialist": ["8k", "specialist", "10g", "lossless"],
  };

  return makeAnyFeatureFilter(`resolution:${value}`, value, resolutionTerms[value] ?? [value], 30);
}

function audioFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const audioTerms: Record<string, string[]> = {
    "Audio de-embed": ["audio de-embed", "audio de embed", "de-embed", "de embed"],
    "Mic / speakerphone": ["mic", "microphone", "speakerphone", "companion mic"],
    "DSP integration": ["dsp", "mixer", "audio processing"],
    "Dante / AES67": ["dante", "aes67"],
    "Amplifier / speakers": ["amplifier", "amp", "speaker", "70v", "100v"],
  };

  return makeAnyFeatureFilter(`audio:${value}`, value, audioTerms[value] ?? [value], 34);
}

function networkFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const networkTerms: Record<string, string[]> = {
    "Existing LAN": ["network", "lan", "ethernet", "1gbe", "web ui"],
    "Dedicated AV network": ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver"],
    "10G network": ["10g", "10gbe", "sfp+", "networkhd 600", "sdvoe"],
    "NDI source present": ["ndi", "network video", "camera"],
  };

  return makeAnyFeatureFilter(`network:${value}`, value, networkTerms[value] ?? [value], 32);
}

function processingFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const processingTerms: Record<string, string[]> = {
    Scaling: ["scaling", "scaler", "down-scaling", "down scaling"],
    "Seamless switching": ["seamless", "seamless switching"],
    Multiview: ["multiview", "multi view", "multi-view", "pip", "quad view"],
    "Video wall processing": ["video wall", "wall processor", "lcd wall", "videowall"],
    "Matrix routing": ["matrix", "routing", "multi output", "multiple outputs"],
    "AVoIP routing": ["networkhd", "av over ip", "avoip", "encoder", "decoder"],
  };

  return makeAnyFeatureFilter(`processing:${value}`, value, processingTerms[value] ?? [value], 34);
}

function controlFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const controlTerms: Record<string, string[]> = {
    IR: ["ir"],
    "RS-232": ["rs-232", "rs232"],
    "Display power control": ["cec", "display power", "control"],
    "Web UI": ["web ui", "web gui", "tcp/ip", "tcp ip"],
    "Button panel": ["button panel", "keypad", "syn-key"],
    "Touch panel": ["touch panel", "touchscreen", "syn-touch"],
    "Third-party control": ["third-party control", "third party control", "rs-232", "rs232", "tcp/ip", "api"],
  };

  return makeAnyFeatureFilter(`control:${value}`, value, controlTerms[value] ?? [value], 32);
}

function getFeatureFilterForNeedField(key: keyof FinderNeed, value: string): FinderFeatureFilter | null {
  if (key === "query") return queryFeatureFilter(value);
  if (key === "technicalRequirement") return technicalRequirementFeatureFilter(value);
  if (key === "productPath") return productPathFeatureFilter(value);
  if (key === "signalType") return signalFeatureFilter(value);
  if (key === "sourceConnector" || key === "displayConnector") return connectorFeatureFilter(key, value);
  if (key === "inputs" || key === "outputs") return ioCountFeatureFilter(key, value);
  if (key === "distance") return distanceFeatureFilter(value);
  if (key === "resolution") return resolutionFeatureFilter(value);
  if (key === "usb") return usbFeatureFilter(value);
  if (key === "audio") return audioFeatureFilter(value);
  if (key === "network") return networkFeatureFilter(value);
  if (key === "processing") return processingFeatureFilter(value);
  if (key === "control") return controlFeatureFilter(value);
  return null;
}

function getActiveFeatureFilters(need: FinderNeed) {
  return (Object.keys(need) as (keyof FinderNeed)[])
    .map((key) => getFeatureFilterForNeedField(key, need[key]))
    .filter((filter): filter is FinderFeatureFilter => Boolean(filter));
}


function makeFinderClassSet(values: string[]) {
  return new Set(values.filter(Boolean));
}

function normalisedFinderClassForTechnology(technologyType: string) {
  const value = normaliseText(technologyType);

  if (!value) return "";
  if (value.includes("cable")) return "cable";
  if (value.includes("accessory")) return "accessory";
  if (value.includes("dongle")) return "dongle";
  if (value.includes("video wall") || value.includes("multiview")) return "video-wall";
  if (value.includes("avoip")) return "avoip";
  if (value.includes("matrix")) return "matrix";
  if (value.includes("presentation") || value.includes("room core")) return "presentation";
  if (value.includes("unified comms")) return "uc";
  if (value.includes("camera") || value.includes("capture")) return "camera";
  if (value.includes("splitter") || value.includes("distribution")) return "splitter";
  if (value.includes("extender") || value.includes("hdbaset")) return "hdbaset";
  if (value.includes("switcher")) return "switcher";
  if (value.includes("audio") || value.includes("control")) return "audio-control";
  if (value.includes("core hardware")) return "core";

  return "";
}

function inferFinderStrictProductClass(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`);

  if (/^(CAB-|CBL-|EXP-CAB-|EXP-4KUHD-|EXP-8KUHD-)/.test(sku)) return "cable";
  if (textIncludesAny(text, ["active optical cable", "hdmi cable", "usb-c cable", "usb c cable", "aoc cable"])) return "cable";

  if (/^(APO-DG|IDB-)/.test(sku)) return "dongle";
  if (textIncludesAny(text, ["casting dongle", "apollo dongle", "in-desk", "in desk", "cable management"])) return "dongle";

  if (textIncludesAny(text, ["rack mount", "rackmount", "rack kit", "mounting bracket", "faceplate", "replacement psu", "power supply", "accessory only"])) return "accessory";

  if (sku.startsWith("NHD-") || textIncludesAny(text, ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver"])) return "avoip";

  if (
    sku === "SW-0204-VW" ||
    sku === "SW-0206-VW" ||
    textIncludesAny(text, ["video wall", "videowall", "wall processor", "lcd wall", "led wall"])
  ) {
    return "video-wall";
  }

  if (
    sku === "MX-0402-MST" ||
    sku === "MX-0403-H3-MST" ||
    sku === "MX-1007-HYB" ||
    textIncludesAny(text, ["presentation switcher", "room core", "conference room switcher", "usb-c presentation", "usb c presentation"])
  ) {
    return "presentation";
  }

  if (textIncludesAny(text, ["seamless matrix", "hdbaset matrix", "matrix switch", "matrix switching", "matrix routing", "mxv", "mx-0404", "mx-0808", "mx-0812", "mx-1616"])) return "matrix";
  if (textIncludesAny(text, ["apollo", "halo", "unified comms", "unified communications", "video bar", "speakerphone", "conference", "conferencing", "byod", "byom"])) return "uc";
  if (textIncludesAny(text, ["camera", "ptz", "ndi", "camera bridge", "video bridge"])) return "camera";
  if (textIncludesAny(text, ["splitter", "distribution amplifier", "sp-0104", "sp-0108", "1x2", "1x4", "1x8"])) return "splitter";
  if (textIncludesAny(text, ["hdbaset", "hdbt", "extender", "kvm extender", "receiver", "transmitter", "wall plate", "wall-plate", "rx3", "rx-500", "rx-700", "ex-100", "ex-70", "ex-35", "swx"])) return "hdbaset";
  if (textIncludesAny(text, ["switcher", "switching", "sw-510", "sw-515", "exp-sw"])) return "switcher";
  if (textIncludesAny(text, ["audio", "dante", "aes67", "amplifier", "microphone", "touch panel", "keypad", "controller", "rs-232", "rs232", "ir control", "syn-"])) return "audio-control";

  return normalisedFinderClassForTechnology(classifyTechnologyType(product)) || "core";
}

function classesForFinderTechnologyType(technologyType: string) {
  if (!technologyType) return makeFinderClassSet([]);
  if (technologyType === "Core hardware first") return makeFinderClassSet([]);
  if (technologyType === "All hardware types") return makeFinderClassSet([]);

  const mapped = normalisedFinderClassForTechnology(technologyType);
  return mapped ? makeFinderClassSet([mapped]) : makeFinderClassSet([]);
}

function classesForFinderProductPath(productPath: string) {
  if (productPath === "Presentation switcher") return makeFinderClassSet(["presentation"]);
  if (productPath === "HDMI / USB extender") return makeFinderClassSet(["hdbaset", "presentation"]);
  if (productPath === "HDBaseT extender") return makeFinderClassSet(["hdbaset"]);
  if (productPath === "Matrix / routing") return makeFinderClassSet(["matrix", "avoip", "presentation"]);
  if (productPath === "AVoIP") return makeFinderClassSet(["avoip"]);
  if (productPath === "Video wall") return makeFinderClassSet(["video-wall", "avoip", "matrix"]);
  if (productPath === "UC / conferencing") return makeFinderClassSet(["uc", "presentation"]);
  if (productPath === "Wireless presentation") return makeFinderClassSet(["uc", "presentation", "dongle"]);
  if (productPath === "NDI / camera") return makeFinderClassSet(["camera", "avoip"]);
  if (productPath === "Audio / control") return makeFinderClassSet(["audio-control"]);
  return makeFinderClassSet([]);
}

function classesForFinderTechnicalRequirement(requirement: string) {
  if (requirement === "Extend HDMI over distance") return makeFinderClassSet(["hdbaset"]);
  if (requirement === "Extend HDMI and USB together") return makeFinderClassSet(["hdbaset", "presentation"]);
  if (requirement === "Connect USB-C laptop") return makeFinderClassSet(["presentation", "uc", "hdbaset"]);
  if (requirement === "Wireless presentation") return makeFinderClassSet(["uc", "presentation", "dongle"]);
  if (requirement === "BYOD / UC conferencing") return makeFinderClassSet(["uc", "presentation", "hdbaset"]);
  if (requirement === "Route sources to multiple displays") return makeFinderClassSet(["matrix", "avoip", "presentation"]);
  if (requirement === "Dual display / MST") return makeFinderClassSet(["presentation", "matrix", "avoip"]);
  if (requirement === "Create multiview layout") return makeFinderClassSet(["video-wall", "avoip", "matrix"]);
  if (requirement === "Build LCD video wall") return makeFinderClassSet(["video-wall", "avoip"]);
  if (requirement === "Feed LED wall processor") return makeFinderClassSet(["video-wall", "presentation", "matrix"]);
  if (requirement === "Distribute AV over network") return makeFinderClassSet(["avoip"]);
  if (requirement === "Bring NDI camera into AV system") return makeFinderClassSet(["camera", "avoip"]);
  if (requirement === "Extract or route audio") return makeFinderClassSet(["audio-control", "matrix", "presentation", "avoip"]);
  if (requirement === "Control displays / system") return makeFinderClassSet(["audio-control"]);
  return makeFinderClassSet([]);
}

function expectedStrictFinderClassesForNeed(need: FinderNeed) {
  const technologyClasses = classesForFinderTechnologyType(need.technologyType);

  if (technologyClasses.size > 0) {
    return technologyClasses;
  }

  const requirementClasses = classesForFinderTechnicalRequirement(need.technicalRequirement);

  if (requirementClasses.size > 0) {
    return requirementClasses;
  }

  const pathClasses = classesForFinderProductPath(need.productPath);

  if (pathClasses.size > 0) {
    return pathClasses;
  }

  return makeFinderClassSet([]);
}

function isSupportOnlyFinderClass(productClass: string) {
  return productClass === "cable" || productClass === "accessory" || productClass === "dongle";
}

function needExplicitlyRequestsSupportClass(need: FinderNeed, productClass: string) {
  const needText = normaliseText(Object.values(need).join(" "));

  if (productClass === "cable") {
    return need.technologyType === "Cable" || textIncludesAny(needText, ["cable", "active optical", "aoc", "hdmi cable", "usb-c cable", "usb c cable"]);
  }

  if (productClass === "accessory") {
    return need.technologyType === "Accessory" || textIncludesAny(needText, ["accessory", "rack", "mount", "bracket", "psu", "power supply", "faceplate"]);
  }

  if (productClass === "dongle") {
    return need.technologyType === "Dongle" || textIncludesAny(needText, ["dongle", "adapter", "adaptor", "dock", "wireless dongle", "apo-dg2", "dg2"]);
  }

  return false;
}

function isFinderStrictClassAllowed(product: FinderProduct, need: FinderNeed) {
  const productClass = inferFinderStrictProductClass(product);
  const expectedClasses = expectedStrictFinderClassesForNeed(need);

  if (expectedClasses.has(productClass)) {
    return true;
  }

  if (isSupportOnlyFinderClass(productClass)) {
    return needExplicitlyRequestsSupportClass(need, productClass);
  }

  if (expectedClasses.size === 0) {
    return true;
  }

  return false;
}

function suppressedFinderClassMatch(product: FinderProduct): ProductMatch {
  return {
    ...cleanFinderProduct(product),
    score: -999,
    status: "caution",
  };
}
function toFeatureSearchMatch(product: FinderProduct, need: FinderNeed, filters: FinderFeatureFilter[], strictMatch: boolean): ProductMatch {
  const suppressedByWingmanClassification = !isWingmanProductEligibleForFinderNeed(product, need);
  const cleanProduct = cleanFinderProduct(product);
  const matchingFilters = filters.filter((filter) => filter.matches(cleanProduct));

  if (!isFinderStrictClassAllowed(cleanProduct, need)) {
    return suppressedFinderClassMatch(cleanProduct);
  }
  const featureScore = 40 + matchingFilters.reduce((sum, filter) => sum + filter.weight, 0) + (strictMatch ? 12 : 0);
  const score = Math.min(99, featureScore);

  return {
    ...cleanProduct,
    score,
    status: strictMatch && score >= 72 ? "recommended" : score >= 52 ? "alternative" : "caution",
  };
}

function isReceiverOnlyProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.title} ${product.category} ${product.description} ${product.tags.join(" ")}`);
  return sku.startsWith("RX-") || (text.includes("receiver") && text.includes("video only"));
}

function isControlOnlyProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")}`);

  return (
    sku.startsWith("SYN-") ||
    sku.startsWith("TS-") ||
    text.includes("keypad controller") ||
    text.includes("touchscreen controller") ||
    text.includes("touchpad ip controller") ||
    text.includes("control only")
  );
}

function isSimpleHdmiSwitcherOnly(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")}`);

  return (
    sku.startsWith("EXP-SW-") &&
    text.includes("hdmi switcher") &&
    !text.includes("mst") &&
    !text.includes("dual display") &&
    !text.includes("multi output") &&
    !text.includes("usb c")
  );
}

function isDualDisplayCapableProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`);

  if (isControlOnlyProduct(product)) return false;
  if (isSimpleHdmiSwitcherOnly(product)) return false;
  if (isReceiverOnlyProduct(product)) return false;

  if (sku === "MX-0402-MST") return true;
  if (sku === "MX-0403-H3-MST") return true;

  return (
    text.includes("mst") ||
    text.includes("dual display") ||
    text.includes("dual-display") ||
    text.includes("dual independent") ||
    text.includes("multi output") ||
    text.includes("multiple outputs") ||
    text.includes("usb c") && text.includes("presentation switcher") ||
    text.includes("matrix") ||
    text.includes("networkhd") ||
    text.includes("avoip")
  );
}
function isRoutingCapableProduct(product: FinderProduct) {
  if (isControlOnlyProduct(product)) return false;
  if (isSimpleHdmiSwitcherOnly(product)) return false;

  return productHasAny(product, [
    "matrix",
    "routing",
    "presentation switcher",
    "multi output",
    "multiple outputs",
    "dual display",
    "mst",
    "networkhd",
    "avoip",
    "encoder",
    "decoder",
  ]);
}

function isVideoWallCapableProduct(product: FinderProduct) {
  return productHasAny(product, ["video wall", "lcd wall", "wall processor", "sw-0204", "sw-0206", "multiview", "networkhd"]);
}

function isNdiCapableProduct(product: FinderProduct) {
  return productHasAny(product, ["ndi", "camera", "ptz", "networkhd", "h265"]);
}

function isAvOverIpProduct(product: FinderProduct) {
  return productHasAny(product, ["networkhd", "avoip", "encoder", "decoder", "transceiver", "10g"]);
}

function hasPointToPointOneInOneOutNeed(need: FinderNeed) {
  const oneInput = !need.inputs || need.inputs === "1" || need.inputs === "Unknown";
  const oneOutput = !need.outputs || need.outputs === "1" || need.outputs === "Unknown";

  return hasIntegratedHdmiUsbNeed(need) && oneInput && oneOutput;
}

function isStandaloneHdmiUsbExtenderProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`);

  if (sku === "EX-100-KVM") return true;
  if (sku === "SW-130-TX-UK") return true;

  if (sku.startsWith("RX-")) return false;
  if (sku.startsWith("NHD-")) return false;
  if (sku.startsWith("MX-")) return false;
  if (sku.startsWith("APO-")) return false;

  if (text.includes("matrix")) return false;
  if (text.includes("networkhd")) return false;
  if (text.includes("avoip")) return false;
  if (text.includes("seamless")) return false;
  if (text.includes("video-speakerphone")) return false;
  if (text.includes("speakerphone")) return false;
  if (text.includes("camera")) return false;
  if (text.includes("controller")) return false;
  if (text.includes("keypad")) return false;
  if (text.includes("touchscreen")) return false;
  if (text.includes("touchpad")) return false;
  if (text.includes("in desk")) return false;
  if (text.includes("cable management")) return false;
  if (text.includes("for rx3-100")) return false;
  if (text.includes("for mx-1007-hyb")) return false;

  const hasHdmi = text.includes("hdmi");
  const hasUsb = text.includes("usb");
  const hasExtenderLanguage =
    text.includes("extender") ||
    text.includes("kvm") ||
    text.includes("hdbt3") ||
    text.includes("hdbaset 3") ||
    text.includes("hdbaset");

  const isKitOrCompletePath =
    text.includes("kit") ||
    text.includes("extender kit") ||
    text.includes("receiver") && text.includes("transmitter") ||
    sku.startsWith("EX-");

  return hasHdmi && hasUsb && hasExtenderLanguage && isKitOrCompletePath;
}

function isEndpointOnlyProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  return sku.startsWith("RX-") || sku.startsWith("TX-");
}

function hasEndpointOnlyIntent(need: FinderNeed) {
  const text = normaliseText(
    `${need.query} ${need.technicalRequirement} ${need.productPath} ${need.signalType} ${need.sourceConnector} ${need.displayConnector}`,
  );

  return (
    text.includes("transmitter only") ||
    text.includes("receiver only") ||
    text.includes("tx only") ||
    text.includes("rx only") ||
    text.includes("standalone transmitter") ||
    text.includes("standalone receiver") ||
    text.includes("projector hdbaset input") ||
    text.includes("display hdbaset input") ||
    text.includes("hdbaset input on projector") ||
    text.includes("hdbaset input on display") ||
    text.includes("replace transmitter") ||
    text.includes("replace receiver")
  );
}

function shouldSuppressEndpointOnlyProduct(product: FinderProduct, need: FinderNeed) {
  if (!isEndpointOnlyProduct(product)) return false;
  if (hasEndpointOnlyIntent(need)) return false;

  const query = need.query.trim().toUpperCase();
  if (query && product.sku.toUpperCase() === query) return false;

  return true;
}

function isProductAllowedForNeed(product: FinderProduct, need: FinderNeed) {
  if (!isWingmanProductEligibleForFinderNeed(product, need)) return false;
  if (!isWyreStormProduct(product)) return false;

  const query = normaliseText(need.query);
  const path = inferPathFromNeed(need);

  if (query && product.sku.toLowerCase() === need.query.trim().toLowerCase()) return true;

  if (shouldSuppressEndpointOnlyProduct(product, need)) return false;

  if (hasPointToPointOneInOneOutNeed(need)) {
    return isStandaloneHdmiUsbExtenderProduct(product);
  }

  if (hasIntegratedHdmiUsbNeed(need)) {
    return isStandaloneHdmiUsbExtenderProduct(product);
  }

  if (need.technicalRequirement === "Dual display / MST") {
    return isDualDisplayCapableProduct(product);
  }

  if (hasMultiInputNeed(need)) {
    return isRoutingCapableProduct(product) && !isReceiverOnlyProduct(product);
  }

  if (need.technicalRequirement === "Extend HDMI over distance") {
    return productHasAny(product, ["hdbaset", "extender", "receiver", "transmitter"]) && !isAvOverIpProduct(product);
  }

  if (need.technicalRequirement === "Distribute AV over network") {
    return isAvOverIpProduct(product);
  }

  if (need.technicalRequirement === "Bring NDI camera into AV system") {
    return isNdiCapableProduct(product);
  }

  if (need.technicalRequirement === "Build LCD video wall" || need.technicalRequirement === "Feed LED wall processor") {
    return isVideoWallCapableProduct(product);
  }

  if (need.technicalRequirement === "Create multiview layout") {
    return productHasAny(product, ["multiview", "networkhd", "processor"]);
  }

  if (path === "Matrix / routing") {
    return isRoutingCapableProduct(product) && !isReceiverOnlyProduct(product);
  }

  if (path === "Presentation switcher" && need.technicalRequirement === "Dual display / MST") {
    return isDualDisplayCapableProduct(product);
  }

  if (path === "AVoIP") {
    return isAvOverIpProduct(product);
  }

  if (path === "Video wall") {
    return isVideoWallCapableProduct(product);
  }

  if (path === "NDI / camera") {
    return isNdiCapableProduct(product);
  }

  if (path === "HDMI / USB extender") {
    return isStandaloneHdmiUsbExtenderProduct(product);
  }

  if (path === "HDBaseT extender") {
    return productHasAny(product, ["hdbaset", "extender", "receiver", "transmitter"]) && !isAvOverIpProduct(product);
  }

  if (!query) return true;

  const queryWords = query.split(/\s+/).filter((word) => word.length >= 3);
  const productText = normaliseText(`${product.sku} ${product.title} ${product.category} ${product.description} ${product.tags.join(" ")}`);

  return queryWords.length > 0 && queryWords.every((word) => productText.includes(word));
}

function shouldShowMatch(match: ProductMatch, need: FinderNeed) {
  if (!isProductAllowedForNeed(match, need)) return false;
  if (!isFinderStrictClassAllowed(match, need)) return false;
  if (match.score < 42) return false;
  return true;
}

function scoreProduct(product: FinderProduct, need: FinderNeed): ProductMatch {
  const cleanProduct = cleanFinderProduct(product);
  const text = normaliseText(`${cleanProduct.sku} ${cleanProduct.title} ${cleanProduct.family} ${cleanProduct.category} ${cleanProduct.description} ${cleanProduct.tags.join(" ")} ${cleanProduct.searchText}`);
  const selectedPath = inferPathFromNeed(need);
  let score = 0;

  if (need.technologyType) {
    const matchesSelectedTechnology = matchesTechnologyType(product, need.technologyType);

    if (matchesSelectedTechnology) {
      score += need.technologyType === "Core hardware first" ? Math.max(0, 48 - hardwareTypePriority(product)) : 65;
    }

    if (!matchesSelectedTechnology && need.technologyType !== "Core hardware first" && need.technologyType !== "All hardware types") {
      score -= 120;
    }
  }
if (!isProductAllowedForNeed(cleanProduct, need)) {
    return {
      ...cleanProduct,
      score: 0,
      status: "caution",
    };
  }

  if (need.query.trim()) {
    const query = normaliseText(need.query);
    const words = query.split(/\s+/).filter((word) => word.length >= 3);

    if (cleanProduct.sku.toLowerCase() === need.query.trim().toLowerCase()) score += 80;
    if (text.includes(query)) score += 36;
    if (!text.includes(query) && words.length && words.every((word) => text.includes(word))) score += 24;
  }

  if (selectedPath && cleanProduct.category === selectedPath) score += 36;
  if (selectedPath && classifyProduct(cleanProduct) === selectedPath) score += 28;

  if (need.technicalRequirement && productHasAny(cleanProduct, [need.technicalRequirement])) score += 22;
  if (need.signalType && productHasAny(cleanProduct, [need.signalType]) && !hasIntegratedHdmiUsbNeed(need)) score += 10;
  if (need.sourceConnector && productHasAny(cleanProduct, [need.sourceConnector])) score += 12;
  if (need.displayConnector && productHasAny(cleanProduct, [need.displayConnector])) score += 12;
  if (need.resolution && productHasAny(cleanProduct, [need.resolution])) score += 10;

  if (hasIntegratedHdmiUsbNeed(need) && isStandaloneHdmiUsbExtenderProduct(cleanProduct)) score += 90;
  if (hasMultiInputNeed(need) && isRoutingCapableProduct(cleanProduct)) score += 44;

  if (need.technicalRequirement === "Extend HDMI over distance" && productHasAny(cleanProduct, ["hdbaset", "extender", "receiver", "transmitter"])) score += 32;
  if (need.technicalRequirement === "Distribute AV over network" && isAvOverIpProduct(cleanProduct)) score += 42;
  if (need.technicalRequirement === "Bring NDI camera into AV system" && isNdiCapableProduct(cleanProduct)) score += 42;
  if (need.technicalRequirement === "Build LCD video wall" && isVideoWallCapableProduct(cleanProduct)) score += 40;
  if (need.technicalRequirement === "Create multiview layout" && productHasAny(cleanProduct, ["multiview", "processor", "networkhd"])) score += 38;
  if (need.technicalRequirement === "Dual display / MST" && productHasAny(cleanProduct, ["dual", "mst", "multi output", "presentation"])) score += 36;

  if (need.usb === "No USB" && productHasAny(cleanProduct, ["video only", "receiver", "hdbaset"])) score += 16;
  if (need.usb === "USB 2.0 enough" && productHasAny(cleanProduct, ["usb 2", "usb", "kvm", "byod", "byom"])) score += 22;
  if (need.usb === "USB 3.x required" && productHasAny(cleanProduct, ["usb 3", "3.0"])) score += 28;

  if ((need.distance === "Medium 10-35m" || need.distance === "Long 35-70m") && productHasAny(cleanProduct, ["hdbaset", "extender", "receiver", "transmitter"])) {
    score += 18;
  }

  if ((need.distance === "Very long 70-100m" || need.distance === "Network / site-wide") && productHasAny(cleanProduct, ["networkhd", "avoip", "10g", "hdbaset"])) {
    score += 22;
  }

  if ((need.network === "Dedicated AV network" || need.network === "10G network" || need.network === "NDI source present") && isAvOverIpProduct(cleanProduct)) {
    score += 26;
  }

  if (need.processing && productHasAny(cleanProduct, [need.processing])) score += 18;

  if (isReceiverOnlyProduct(cleanProduct) && hasMultiInputNeed(need)) score -= 100;
  if (hasIntegratedHdmiUsbNeed(need) && !isStandaloneHdmiUsbExtenderProduct(cleanProduct)) score -= 180;
  if (isReceiverOnlyProduct(cleanProduct) && hasIntegratedHdmiUsbNeed(need)) score -= 120;
  if (need.technicalRequirement === "Dual display / MST" && !isDualDisplayCapableProduct(cleanProduct)) score -= 150;
  if (isControlOnlyProduct(cleanProduct)) score -= 150;
  if (isSimpleHdmiSwitcherOnly(cleanProduct)) score -= 120;
  if (isAvOverIpProduct(cleanProduct) && need.technicalRequirement === "Extend HDMI and USB together" && !productHasAny(cleanProduct, ["usb"])) score -= 60;
  if (shouldSuppressEndpointOnlyProduct(cleanProduct, need)) score -= 250;
  if (cleanProduct.source === "seed") score += 4;

  const finalScore = Math.max(0, score);
  const status: MatchStatus = finalScore >= 72 ? "recommended" : finalScore >= 42 ? "alternative" : "caution";

  return {
    ...cleanProduct,
    score: finalScore,
    status,
  };
}

function getReasonLines(match: ProductMatch, need: FinderNeed) {
  const lines: string[] = [];
  const path = inferPathFromNeed(need);
  const featureLabels = getActiveFeatureFilters(need)
    .filter((filter) => filter.matches(match))
    .map((filter) => filter.label);

  if (featureLabels.length) lines.push(`Uses selected feature${featureLabels.length > 1 ? "s" : ""}: ${featureLabels.slice(0, 3).join(", ")}.`);
  if (need.query.trim()) lines.push("Matches the search term or product intent.");
  if (path && match.category === path) lines.push(`Fits the likely product path: ${path}.`);
  if (need.technicalRequirement === "Dual display / MST") {
    lines.push("Supports dual-display, MST, multi-output presentation, matrix, or AVoIP routing behaviour.");
  }

  if (need.technicalRequirement && need.technicalRequirement !== "Dual display / MST") {
    lines.push(`Supports the selected technical requirement: ${need.technicalRequirement}.`);
  }
  if (hasIntegratedHdmiUsbNeed(need)) {
    lines.push("Standalone HDMI and USB transport/extender requirement.");
  }

  if (need.signalType && !hasIntegratedHdmiUsbNeed(need)) {
    lines.push(`Relevant to the selected signal type: ${need.signalType}.`);
  }
  if (need.sourceConnector) lines.push(`References the source connector: ${need.sourceConnector}.`);
  if (need.displayConnector) lines.push(`References the display or output connection: ${need.displayConnector}.`);

  if (["3-4", "5-8", "9+"].includes(need.inputs) || ["3-4", "5-8", "9+"].includes(need.outputs)) {
    lines.push("Higher I/O count points toward matrix, presentation switcher, or AVoIP architecture.");
  }

  if (!lines.length) lines.push("Partial match only. Add more technical detail to improve confidence.");

  return unique(lines).slice(0, 4);
}

function getCautionLines(match: ProductMatch, need: FinderNeed) {
  const lines = ["Confirm current datasheet, receiver/accessory set, firmware notes, and cable assumptions."];

  if (isUcCentricSwitcher(match)) {
    lines.unshift("UC-centred switcher: normally position with conferencing, camera, speakerphone, microphone, or BYOD requirements rather than as a generic room matrix.");
  }

  if (isEndpointOnlyProduct(match)) {
    lines.unshift("Endpoint-only RX/TX part: only use when the compatible opposite endpoint or native HDBaseT display/projector input is confirmed.");
  }

  if (hasIntegratedHdmiUsbNeed(need) && !isStandaloneHdmiUsbExtenderProduct(match)) {
    lines.unshift("This is not a standalone HDMI and USB extender path.");
  }

  if (need.usb === "USB 3.x required" && !finderMatchHasAny(match, ["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"])) {
    lines.unshift("USB 3.x is requested. Confirm high-bandwidth USB support before customer issue.");
  }

  if ((need.inputs === "3-4" || need.inputs === "5-8" || need.inputs === "9+") && match.category === "HDBaseT extender") {
    lines.unshift("Multiple inputs normally need a switcher, matrix, or AVoIP design rather than a receiver-only path.");
  }

  if (match.category === "AVoIP" && (need.distance === "Local <5m" || need.distance === "Short 5-10m")) {
    lines.unshift("AVoIP may be over-specified for a short local run unless routing or expansion is required.");
  }

  return unique(lines).slice(0, 3);
}

function readProductSelections(): Record<string, ProductSelection[]> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(PRODUCT_SELECTION_STORE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ProductSelection[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeProductSelections(selections: Record<string, ProductSelection[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRODUCT_SELECTION_STORE_KEY, JSON.stringify(selections));
  window.dispatchEvent(new CustomEvent("wingman:project-product-selections-updated"));
}

function productToSelection(product: ProductMatch | FinderProduct, need?: FinderNeed): ProductSelection {
  const evidence = need && "score" in product ? getReasonLines(product, need) : [];
  const cautions = need && "score" in product ? getCautionLines(product, need) : [];

  return {
    sku: product.sku,
    title: product.title,
    family: product.family,
    category: product.category,
    status: "status" in product ? product.status : "alternative",
    tags: product.tags,
    addedAt: nowIso(),
    source: "Product Finder",
    evidence,
    cautions,
  };
}

function addProductToProject(projectId: string, product: ProductMatch | FinderProduct, need?: FinderNeed) {
  const selection = productToSelection(product, need);
  const selections = readProductSelections();
  const existing = selections[projectId] ?? [];
  const withoutDuplicate = existing.filter((item) => item.sku !== product.sku);

  writeProductSelections({
    ...selections,
    [projectId]: [selection, ...withoutDuplicate],
  });

  saveProductSelectionToProject(projectId, selection);
}

function createProjectFromProduct(projectName: string, owner: string, product: ProductMatch | FinderProduct, need?: FinderNeed) {
  const timestamp = nowIso();
  const id = createId("finder-project");
  const selection = productToSelection(product, need);

  const project: StoredProject = {
    id,
    name: projectName.trim() || `${product.sku} Product Selection`,
    owner: owner.trim() || "Finder user",
    stage: "Finder",
    status: "status" in product ? product.status : "alternative",
    updated: "Just now",
    resumeTo: routeCatalogByKey.finder.path,
    createdAt: timestamp,
    updatedAt: timestamp,
    productSelections: [selection],
    workflow: {
      source: "Product Finder",
      lastStep: "Product selected",
      nextRoute: routeCatalogByKey.projects.path,
      updatedAt: timestamp,
    },
  };

  upsertStoredProject(project);

  writeProductSelections({
    ...readProductSelections(),
    [id]: [selection],
  });
  return project;
}

function readStandaloneShortlist(): ProductSelection[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STANDALONE_SHORTLIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProductSelection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStandaloneShortlist(items: ProductSelection[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STANDALONE_SHORTLIST_KEY, JSON.stringify(items));
}

function ChipButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[30px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-black transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      >
        <option value="">Any / not known</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: MatchStatus }) {
  const label = status === "recommended" ? "Recommended" : status === "alternative" ? "Alternative" : "Check fit";
  const classes =
    status === "recommended"
      ? "bg-emerald-100 text-emerald-700"
      : status === "alternative"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>{label}</span>;
}

function FinderStepFooter({
  activeStep,
  onPrevious,
  onNext,
  onRecommendation,
}: {
  activeStep: FinderStep;
  onPrevious: () => void;
  onNext: () => void;
  onRecommendation: () => void;
}) {
  const activeIndex = finderSteps.findIndex((step) => step.id === activeStep);
  const isFirstStep = activeIndex <= 0;
  const isLastStep = activeIndex === finderSteps.length - 1;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirstStep}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      <div className="flex flex-wrap justify-end gap-2">
        {!isLastStep ? (
          <button
            type="button"
            onClick={onRecommendation}
            className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 transition hover:bg-amber-100"
          >
            View recommendation
          </button>
        ) : null}

        <button
          type="button"
          onClick={onNext}
          disabled={isLastStep}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function FinderPage() {
  const discoveryHandoffAppliedRef = useRef(false);

  useEffect(() => {
    document.body.classList.add("wm-product-finder-active");
    return () => document.body.classList.remove("wm-product-finder-active");
  }, []);

  const { projects, activeProjectId } = useProjectStore();
  const [products, setProducts] = useState<FinderProduct[]>(seedProducts.map(cleanFinderProduct));
  const [indexState, setIndexState] = useState<"loading" | "ready" | "fallback">("loading");
  const [need, setNeed] = useState<FinderNeed>(initialNeed);
  const [selectedProduct, setSelectedProduct] = useState<ProductMatch | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectOwner, setNewProjectOwner] = useState("Steve");
  const [message, setMessage] = useState("");
  const [shortlist, setShortlist] = useState<ProductSelection[]>(() => readStandaloneShortlist());
  const [expandedResultKey, setExpandedResultKey] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<FinderStep>("start");

  useEffect(() => {
    let active = true;

    fetch("/product-intelligence-index.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active) return;

        const parsedProducts = normaliseProductIndex(data);

        if (parsedProducts.length > seedProducts.length) {
          setProducts(parsedProducts);
          setIndexState("ready");
          return;
        }

        setProducts(seedProducts.map(cleanFinderProduct));
        setIndexState("fallback");
      })
      .catch(() => {
        if (!active) return;
        setProducts(seedProducts.map(cleanFinderProduct));
        setIndexState("fallback");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (discoveryHandoffAppliedRef.current) return;

    const draftNeed = discoveryBriefToFinderNeed(readLatestDiscoveryBrief());
    if (!draftNeed) return;

    discoveryHandoffAppliedRef.current = true;
    setNeed((current) => ({
      ...current,
      ...draftNeed,
    }));
    setActiveStep("results");
    setMessage("Discovery brief automatically loaded into Finder. Results now reflect the collected room requirement.");
  }, []);

  const hasIntent = hasFinderIntent(need);

  const matches = useMemo(() => {
    if (!hasIntent) return [];

    const featureFilters = getActiveFeatureFilters(need);

    if (featureFilters.length) {
      const featureMatches = products
        .map(cleanFinderProduct)
        .filter((product) => isAllowedFeatureSearchProduct(product, need))
        .filter((product) => featureFilters.every((filter) => filter.matches(product)))
        .map((product) => toFeatureSearchMatch(product, need, featureFilters, true));

      return featureMatches.sort((a, b) => b.score - a.score || a.sku.localeCompare(b.sku));
    }

    return products
      .map((product) => applyFinderRequirementGate(applyFinderVisibilityToMatch(scoreProduct(product, need), need), need))
      .filter((match) => shouldShowMatch(match, need))
      .sort(compareProductMatches)
      .slice(0, hasPointToPointOneInOneOutNeed(need) ? 4 : 8);
  }, [hasIntent, need, products]);

  const bestMatch = matches[0] ?? null;

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const workflowProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId),
    [activeProjectId, projects],
  );

  const finderCoach = useMemo(
    () =>
      buildWingmanCoachState({
        source: "finder",
        audience: "dealer",
        finderNeed: need,
        totalProducts: products.length,
        visibleMatches: matches,
        shortlistedCount: shortlist.length,
        selectedProducts: activeProject?.productSelections ?? workflowProject?.productSelections ?? [],
      }),
    [activeProject?.productSelections, matches, need, products.length, shortlist.length, workflowProject?.productSelections],
  );

  const activeStepIndex = Math.max(0, finderSteps.findIndex((step) => step.id === activeStep));
  const activeStepDefinition = finderSteps[activeStepIndex];
  const needSummaryItems = [
    ["Technology", need.technologyType],
    ["Requirement", need.technicalRequirement],
    ["Product path", need.productPath],
    ["Signal", need.signalType],
    ["Source", need.sourceConnector],
    ["Output", need.displayConnector],
    ["Inputs", need.inputs],
    ["Outputs", need.outputs],
    ["Distance", need.distance],
    ["Resolution", need.resolution],
    ["USB", need.usb],
    ["Processing", need.processing],
    ["Network", need.network],
    ["Audio", need.audio],
    ["Control", need.control],
  ].filter(([, value]) => Boolean(value));

  function goToPreviousStep() {
    setActiveStep(finderSteps[Math.max(activeStepIndex - 1, 0)].id);
  }

  function goToNextStep() {
    setActiveStep(finderSteps[Math.min(activeStepIndex + 1, finderSteps.length - 1)].id);
  }

  function setNeedField<K extends keyof FinderNeed>(key: K, value: FinderNeed[K]) {
    setNeed((current) => {
      const next = { ...current, [key]: value };

      if (key === "signalType" && value === "HDMI + USB") {
        next.technicalRequirement = "Extend HDMI and USB together";
        next.productPath = "HDMI / USB extender";
        next.usb = "USB 2.0 enough";
      }

      if (key === "technicalRequirement") {
        const path = expectedProductPathForRequirement(value);
        next.productPath = path || current.productPath;

        if (value === "Extend HDMI and USB together") {
          next.signalType = "HDMI + USB";
          next.usb = "USB 2.0 enough";
          next.sourceConnector = "HDMI";
          next.displayConnector = "HDBaseT";
        }

        if (value === "Extend HDMI over distance") {
          next.signalType = "HDMI video";
          next.usb = "No USB";
          next.sourceConnector = "HDMI";
          next.displayConnector = "HDBaseT";
        }

        if (value === "Distribute AV over network") {
          next.network = "Dedicated AV network";
          next.processing = "AVoIP routing";
        }

        if (value === "Bring NDI camera into AV system") {
          next.signalType = "NDI / network video";
          next.network = "NDI source present";
        }

        if (value === "Build LCD video wall") {
          next.signalType = "HDMI video";
          next.outputs = "3-4";
          next.processing = "Video wall processing";
        }

        if (value === "Create multiview layout") {
          next.processing = "Multiview";
        }

        if (value === "Dual display / MST") {
          next.processing = "Matrix routing";
        }
      }

      if ((key === "inputs" || key === "outputs") && ["3-4", "5-8", "9+"].includes(String(value))) {
        if (!next.technicalRequirement) next.technicalRequirement = "Route sources to multiple displays";
        if (!next.productPath) next.productPath = "Matrix / routing";
      }

      return next;
    });
  }

  function toggleExpandedResult(resultKey: string) {
    setExpandedResultKey((current) => (current === resultKey ? null : resultKey));
  }

  function clearFinder() {
    setNeed(initialNeed);
    setSelectedProduct(null);
    setExpandedResultKey(null);
    setActiveStep("start");
    setMessage("");
  }

  function applyQuickStart(kind: "hdmi" | "usb" | "usbC" | "wall" | "avoip" | "ndi") {
    if (kind === "hdmi") {
      setNeed({
        ...initialNeed,
        technicalRequirement: "Extend HDMI over distance",
        productPath: "HDBaseT extender",
        signalType: "HDMI video",
        sourceConnector: "HDMI",
        displayConnector: "HDBaseT",
        distance: "Long 35-70m",
        resolution: "4K60 4:2:0",
        usb: "No USB",
      });
      setActiveStep("size");
    }

    if (kind === "usb") {
      setNeed({
        ...initialNeed,
        technicalRequirement: "Extend HDMI and USB together",
        productPath: "HDMI / USB extender",
        signalType: "HDMI + USB",
        sourceConnector: "HDMI",
        displayConnector: "HDBaseT",
        distance: "Medium 10-35m",
        resolution: "4K60 4:2:0",
        usb: "USB 2.0 enough",
        query: "hdmi usb extender",
      });
      setActiveStep("size");
    }

    if (kind === "usbC") {
      setNeed({
        ...initialNeed,
        technicalRequirement: "Connect USB-C laptop",
        productPath: "Presentation switcher",
        signalType: "USB-C video",
        sourceConnector: "USB-C",
        inputs: "2",
        outputs: "1",
        usb: "USB 2.0 enough",
        processing: "Scaling",
      });
      setActiveStep("specialist");
    }

    if (kind === "wall") {
      setNeed({
        ...initialNeed,
        technicalRequirement: "Build LCD video wall",
        productPath: "Video wall",
        signalType: "HDMI video",
        outputs: "3-4",
        resolution: "4K60 4:4:4",
        processing: "Video wall processing",
      });
      setActiveStep("size");
    }

    if (kind === "avoip") {
      setNeed({
        ...initialNeed,
        technicalRequirement: "Distribute AV over network",
        productPath: "AVoIP",
        signalType: "Mixed AV system",
        inputs: "5-8",
        outputs: "5-8",
        distance: "Network / site-wide",
        network: "Dedicated AV network",
        processing: "AVoIP routing",
      });
      setActiveStep("size");
    }

    if (kind === "ndi") {
      setNeed({
        ...initialNeed,
        technicalRequirement: "Bring NDI camera into AV system",
        productPath: "NDI / camera",
        signalType: "NDI / network video",
        sourceConnector: "RJ45 / network",
        distance: "Network / site-wide",
        network: "NDI source present",
        processing: "AVoIP routing",
        query: "NDI NetworkHD",
      });
      setActiveStep("signal");
    }
  }

  function applyDiscoveryBrief() {
    const draftNeed = discoveryBriefToFinderNeed(readLatestDiscoveryBrief());

    if (!draftNeed) {
      setMessage("No Discovery brief found yet. Complete Discovery or open a project with a saved Discovery brief.");
      return;
    }

    setNeed((current) => ({
      ...current,
      ...draftNeed,
    }));

    setActiveStep("results");
    setMessage("Discovery brief loaded into technical Finder filters.");
  }

  function openAddPanel(product: ProductMatch) {
    setSelectedProduct(product);
    setSelectedProjectId(activeProjectId ?? projects[0]?.id ?? "");
    setNewProjectName(`${product.sku} Selection`);
    setMessage("");
  }

  function closeAddPanel() {
    setSelectedProduct(null);
    setSelectedProjectId("");
    setMessage("");
  }

  function addToStandaloneShortlist(product: ProductMatch) {
    const selection = productToSelection(product, need);
    const next = [selection, ...shortlist.filter((item) => item.sku !== product.sku)].slice(0, 20);
    setShortlist(next);
    writeStandaloneShortlist(next);
    setMessage(`${product.sku} added to standalone shortlist.`);
  }

  function addToExistingProject() {
    if (!selectedProduct || !selectedProjectId) return;
    addProductToProject(selectedProjectId, selectedProduct, need);
    setMessage(`Added ${selectedProduct.sku} to ${activeProject?.name ?? "selected project"}.`);
  }

  function addToNewProject() {
    if (!selectedProduct) return;
    const project = createProjectFromProduct(newProjectName, newProjectOwner, selectedProduct, need);
    setSelectedProjectId(project.id);
    setMessage(`Created ${project.name} and added ${selectedProduct.sku}.`);
  }

  return (
    <div className="wm-finder-redesign-page pb-0">
      <PageHero
        eyebrow="Product Finder"
        title="Find the right WyreStorm product path."
        purpose="Search by SKU, application or technical need. Use the compact top filters to narrow the result set without sacrificing product result space."
        nextMove="Start with a quick-start path, SKU search or one technical requirement. Then refine using the top filter rail."
        actions={[
          { label: "Load Discovery brief", variant: "secondary", onClick: applyDiscoveryBrief },
          { label: "Open projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Technical Product Finder"
        subtitle="Use the top filter rail to describe the signal problem. Results stay clear and occupy the main workspace."
      >
        <div className="grid gap-4">
          <div className="wm-finder-two-column-layout">
            <section className="wm-finder-input-column" aria-label="Finder input filters">
          <div className="wm-finder-quickstart grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-amber-950">Quick-start filters</p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-800">
                <Database className="h-3.5 w-3.5" />
                {indexState === "ready" ? `${products.length} indexed products` : indexState === "loading" ? "Loading index" : "Clean fallback library"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ChipButton active={false} label="HDMI over distance" onClick={() => applyQuickStart("hdmi")} />
              <ChipButton active={false} label="HDMI + USB together" onClick={() => applyQuickStart("usb")} />
              <ChipButton active={false} label="USB-C laptop input" onClick={() => applyQuickStart("usbC")} />
              <ChipButton active={false} label="Video wall processing" onClick={() => applyQuickStart("wall")} />
              <ChipButton active={false} label="AVoIP distribution" onClick={() => applyQuickStart("avoip")} />
              <ChipButton active={false} label="NDI camera workflow" onClick={() => applyQuickStart("ndi")} />
            </div>
          </div>

<aside className="wm-finder-filter-panel grid content-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="wm-finder-filter-header flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-black text-slate-900">Technical filters</p>
                    <span className="text-xs text-slate-500">Work left to right: product type, signal path, system size, then specialist needs.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearFinder}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>

              <section className="wm-finder-filter-group wm-finder-filter-group-start">
                <div className="wm-finder-filter-group-title">
                  <span>1</span>
                  <div>
                    <strong>Start here</strong>
                    <small>Choose the product direction or search directly.</small>
                  </div>
                </div>

                <div className="wm-finder-filter-group-body wm-finder-filter-group-body-start">
                  <label className="wm-finder-technology-field grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Technology Type
                    <select
                      id="finder-technology-type"
                      value={need.technologyType}
                      onChange={(event) => setNeed((current) => ({ ...current, technologyType: event.target.value }))}
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      {technologyTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="wm-finder-search-field grid gap-1">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Search SKU or requirement</span>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        value={need.query}
                        onChange={(event) => setNeedField("query", event.target.value)}
                        placeholder="e.g. HDMI USB extender, NHD-150-RX, multiview"
                        className="h-9 flex-1 border-0 bg-transparent px-0 text-sm text-slate-900 outline-none"
                      />
                    </div>
                  </label>

                  <FieldSelect label="Technical requirement" value={need.technicalRequirement} options={technicalRequirementOptions} onChange={(value) => setNeedField("technicalRequirement", value)} />
                  <FieldSelect label="Likely product path" value={need.productPath} options={productPathOptions} onChange={(value) => setNeedField("productPath", value)} />
                </div>
              </section>

              <section className="wm-finder-filter-group">
                <div className="wm-finder-filter-group-title">
                  <span>2</span>
                  <div>
                    <strong>Signal path</strong>
                    <small>Define what signal is moving and how it connects.</small>
                  </div>
                </div>

                <div className="wm-finder-filter-group-body">
                  <FieldSelect label="Signal type" value={need.signalType} options={signalTypeOptions} onChange={(value) => setNeedField("signalType", value)} />
                  <FieldSelect label="Source connector" value={need.sourceConnector} options={connectorOptions} onChange={(value) => setNeedField("sourceConnector", value)} />
                  <FieldSelect label="Display / output" value={need.displayConnector} options={connectorOptions} onChange={(value) => setNeedField("displayConnector", value)} />
                </div>
              </section>

              <section className="wm-finder-filter-group">
                <div className="wm-finder-filter-group-title">
                  <span>3</span>
                  <div>
                    <strong>System size</strong>
                    <small>Use count, distance and resolution to separate extender, matrix and AVoIP designs.</small>
                  </div>
                </div>

                <div className="wm-finder-filter-group-body">
                  <FieldSelect label="Inputs" value={need.inputs} options={inputOptions} onChange={(value) => setNeedField("inputs", value)} />
                  <FieldSelect label="Outputs" value={need.outputs} options={outputOptions} onChange={(value) => setNeedField("outputs", value)} />
                  <FieldSelect label="Distance" value={need.distance} options={distanceOptions} onChange={(value) => setNeedField("distance", value)} />
                  <FieldSelect label="Resolution" value={need.resolution} options={resolutionOptions} onChange={(value) => setNeedField("resolution", value)} />
                </div>
              </section>

              <section className="wm-finder-filter-group wm-finder-filter-group-advanced">
                <div className="wm-finder-filter-group-title">
                  <span>4</span>
                  <div>
                    <strong>Advanced needs</strong>
                    <small>Add USB, audio, processing, network and control requirements only when they matter.</small>
                  </div>
                </div>

                <div className="wm-finder-filter-group-body">
                  <FieldSelect label="USB" value={need.usb} options={usbOptions} onChange={(value) => setNeedField("usb", value)} />
                  <FieldSelect label="Processing" value={need.processing} options={processingOptions} onChange={(value) => setNeedField("processing", value)} />
                  <FieldSelect label="Network" value={need.network} options={networkOptions} onChange={(value) => setNeedField("network", value)} />
                  <FieldSelect label="Audio" value={need.audio} options={audioOptions} onChange={(value) => setNeedField("audio", value)} />
                  <FieldSelect label="Control" value={need.control} options={controlOptions} onChange={(value) => setNeedField("control", value)} />
                </div>
              </section>
            </aside>
            </section>

            <section className="wm-finder-output-column" aria-label="Finder guidance and results">
          <WingmanCoachPanel coach={finderCoach} compact showFunnel showVisuals={false} />

              <div className="wm-finder-results-and-logic">
            <main className="wm-finder-results-panel grid content-start gap-3">
              {!hasIntent ? (
                <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="max-w-xl">
                    <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-xl font-black text-slate-950">No products shown yet</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Use the top filter rail to start. Choose one technical requirement, quick-start button, SKU search, connector, distance, USB need, processing need, network requirement, audio path, or control requirement. Finder will then show matching WyreStorm products.
                    </p>
                  </div>
                </div>
              ) : matches.length ? (
                matches.map((match, index) => {
                  const resultKey = `${match.sku}-${index}`;
                  const isExpanded = expandedResultKey === resultKey;
                  const reasonLines = getReasonLines(match, need);
                  const cautionLines = getCautionLines(match, need);

                  return (
                    <article key={resultKey} className="wm-finder-result-card rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleExpandedResult(resultKey)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            aria-expanded={isExpanded}
                          >
                            <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>

                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-lg font-black text-slate-950">{match.sku}</span>
                                <StatusPill status={match.status} />
                              </span>

                              <span className="mt-1 block text-sm font-semibold text-slate-700">{match.title}</span>
                              <span className="mt-1 block text-xs text-slate-500">{match.family} | {match.category}</span>

                              {!isExpanded ? (
                                <span className="mt-2 block text-sm leading-5 text-slate-600">
                                  {finderSalesSummary(match)}
                                </span>
                              ) : null}
                            </span>
                          </button>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                              Fit score {Math.min(99, match.score)}%
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpandedResult(resultKey)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                            >
                              {isExpanded ? "Close details" : "Open details"}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {match.tags.slice(0, isExpanded ? 7 : 4).map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {isExpanded ? (
                          <div className="grid gap-3 border-t border-slate-100 pt-3">
                            <p className="text-sm leading-6 text-slate-700">{finderSalesSummary(match)}</p>

                            <ProductSalesKnowledgePanel product={match} mode="finder" />

                            {match.salesLanguage ? (
                              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">Sales read</p>
                                <p className="mt-2 text-sm font-black text-slate-950">
                                  {cleanDisplayText(match.salesLanguage.headline || match.salesLanguage.voices?.endUser?.headline || match.sku)}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-700">
                                  {cleanDisplayText(match.salesLanguage.salespersonCue || match.salesLanguage.customerValue || match.salesLanguage.realWorldApplication)}
                                </p>
                                {match.salesLanguage.thirdOutputUseCase ? (
                                  <p className="mt-2 text-sm leading-6 text-sky-950">{cleanDisplayText(match.salesLanguage.thirdOutputUseCase)}</p>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="grid gap-3 lg:grid-cols-2">
                              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Why it appears</p>
                                <ul className="mt-2 space-y-1 text-sm leading-5 text-emerald-950">
                                  {reasonLines.map((reason) => (
                                    <li key={reason}>- {reason}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Validate before issue</p>
                                <ul className="mt-2 space-y-1 text-sm leading-5 text-amber-950">
                                  {cautionLines.map((caution) => (
                                    <li key={caution}>- {caution}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addToStandaloneShortlist(match)}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                          >
                            Shortlist only
                          </button>

                          <button
                            type="button"
                            onClick={() => openAddPanel(match)}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                          >
                            <FolderPlus className="h-4 w-4" />
                            Add to project
                          </button>

                          <Link to={routeCatalogByKey.compare.path} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                            Compare
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="font-black">No strong match yet</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    Broaden the technical requirement, remove one constraint, or search by SKU.
                  </p>
                </div>
              )}
            </main>

            <aside className="grid content-start gap-3">
              <details className="wm-decision-details">
                <summary>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Selection logic
                </summary>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Finder first checks the product class and role, then scores eligible WyreStorm products by technical requirement, signal path, I/O count, source/output connector, distance, USB, resolution, processing, network, audio and control.
                </p>

                {bestMatch ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Current best match</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{bestMatch.sku}</p>
                    <p className="mt-1 text-sm text-slate-600">{bestMatch.title}</p>
                  </div>
                ) : null}
              </details>

              {shortlist.length ? (
                <details className="wm-decision-details">
                  <summary>Standalone shortlist</summary>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Use this when there is no project yet.</p>

                  <div className="mt-3 space-y-2">
                    {shortlist.slice(0, 6).map((item) => (
                      <div key={`${item.sku}-${item.addedAt}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-black text-slate-900">{item.sku}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.title}</p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

            </aside>
              </div>
            </section>
          </div>
        </div>
      </SectionCard>

      {message ? (
        <div className="fixed bottom-5 right-5 z-[130] max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-xl">
          {message}
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Add WyreStorm product to project</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">{selectedProduct.sku}</h2>
                <p className="mt-1 text-sm text-slate-300">{selectedProduct.title}</p>
              </div>

              <button
                type="button"
                onClick={closeAddPanel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                aria-label="Close add to project panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black">Add to existing project</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Attach this product to an existing opportunity.</p>

                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addToExistingProject}
                  disabled={!selectedProjectId}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Add to existing project
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black">Create new project</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Start a new Finder-stage project with this product attached.</p>

                <input
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder="Project name"
                  className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400"
                />

                <input
                  value={newProjectOwner}
                  onChange={(event) => setNewProjectOwner(event.target.value)}
                  placeholder="Owner"
                  className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-amber-400"
                />

                <button
                  type="button"
                  onClick={addToNewProject}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-slate-100"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create project and add
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => addToStandaloneShortlist(selectedProduct)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-white/10"
              >
                Shortlist only
              </button>

              <Link to={routeCatalogByKey.projects.path} className="rounded-full border border-white/10 px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-white/10">
                Open projects
              </Link>

              <Link to={routeCatalogByKey.proposal.path} className="rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-white">
                Continue to proposal
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FinderPage;
