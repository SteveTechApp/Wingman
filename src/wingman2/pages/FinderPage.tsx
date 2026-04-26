import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
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
import {
  readProjectStore,
  useProjectStore,
  writeProjectStore,
  type StoredProject,
} from "../data/projectStore";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

type MatchStatus = "recommended" | "alternative" | "caution";

type FinderProduct = {
  sku: string;
  title: string;
  family: string;
  category: string;
  description: string;
  tags: string[];
  searchText: string;
  source: "seed" | "index";
};

type FinderNeed = {
  query: string;
  technicalRequirement: string;
  productPath: string;
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
};

type UnknownRecord = Record<string, unknown>;

const PRODUCT_SELECTION_STORE_KEY = "wingman-project-product-selections-v1";
const STANDALONE_SHORTLIST_KEY = "wingman-finder-standalone-shortlist-v1";

const technicalRequirementOptions = [
  "Extend HDMI over distance",
  "Extend HDMI and USB together",
  "Connect USB-C laptop",
  "Wireless presentation",
  "BYOD / BYOM conferencing",
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
      "Use when the user needs a single room input point carrying HDMI, USB-C video, and USB for BYOD or BYOM style workflows.",
    tags: ["HDMI", "USB-C", "USB 2.0", "HDBaseT", "BYOD / BYOM", "Presentation Switcher"],
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
];

const initialNeed: FinderNeed = {
  query: "",
  technicalRequirement: "",
  productPath: "",
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
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasTextNoise(value: unknown) {
  const text = String(value ?? "");
  return /[ÃƒÆ’Ãƒâ€šÃƒÂ¢Ã¯Â¿Â½]|[\u0080-\u024f]/.test(text);
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
  return Object.values(need).some((value) => value.trim().length >= 2);
}

function expectedProductPathForRequirement(requirement: string) {
  if (requirement === "Extend HDMI and USB together") return "HDMI / USB extender";
  if (requirement === "Extend HDMI over distance") return "HDBaseT extender";
  if (requirement === "Connect USB-C laptop") return "Presentation switcher";
  if (requirement === "Wireless presentation") return "Wireless presentation";
  if (requirement === "BYOD / BYOM conferencing") return "UC / conferencing";
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
  if (need.usb === "USB 3.x required") return "HDMI / USB extender";
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

function productHasAll(product: FinderProduct, terms: string[]) {
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`);
  return terms.every((term) => text.includes(normaliseText(term)));
}

function productHasAny(product: FinderProduct, terms: string[]) {
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`);
  return terms.some((term) => text.includes(normaliseText(term)));
}

function isReceiverOnlyProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.title} ${product.category} ${product.description} ${product.tags.join(" ")}`);
  return sku.startsWith("RX-") || (text.includes("receiver") && text.includes("video only"));
}

function isIntegratedHdmiUsbProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const title = normaliseText(product.title);
  const category = normaliseText(product.category);
  const description = normaliseText(product.description);
  const tags = normaliseText(product.tags.join(" "));
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`);

  if (sku === "SW-130-TX-UK") return true;
  if (sku === "EX-100-KVM") return true;

  if (sku.startsWith("RX-")) return false;
  if (category.includes("in desk")) return false;
  if (title.includes("in desk")) return false;
  if (tags.includes("cable management")) return false;
  if (description.includes("usb transport is not required")) return false;
  if (description.includes("video only")) return false;
  if (title.includes("video only")) return false;

  const hasHdmi = text.includes("hdmi");
  const hasUsb = text.includes("usb");
  const hasTransportRole =
    text.includes("extender") ||
    text.includes("kvm") ||
    text.includes("transmitter") ||
    text.includes("receiver kit") ||
    text.includes("hdbaset");

  const isAccessoryOnly =
    text.includes("cable management") ||
    text.includes("in desk") ||
    text.includes("mount") ||
    text.includes("bracket") ||
    text.includes("microphone") ||
    text.includes("camera");

  return hasHdmi && hasUsb && hasTransportRole && !isAccessoryOnly;
}

function isRoutingCapableProduct(product: FinderProduct) {
  return productHasAny(product, [
    "matrix",
    "routing",
    "presentation switcher",
    "multi output",
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

function isProductAllowedForNeed(product: FinderProduct, need: FinderNeed) {
  if (!isWyreStormProduct(product)) return false;

  const query = normaliseText(need.query);
  const path = inferPathFromNeed(need);

  if (query && product.sku.toLowerCase() === need.query.trim().toLowerCase()) return true;

  if (hasIntegratedHdmiUsbNeed(need)) {
    return isIntegratedHdmiUsbProduct(product);
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
    return isIntegratedHdmiUsbProduct(product);
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
  if (match.score < 42) return false;
  return true;
}

function scoreProduct(product: FinderProduct, need: FinderNeed): ProductMatch {
  const cleanProduct = cleanFinderProduct(product);
  const text = normaliseText(`${cleanProduct.sku} ${cleanProduct.title} ${cleanProduct.family} ${cleanProduct.category} ${cleanProduct.description} ${cleanProduct.tags.join(" ")} ${cleanProduct.searchText}`);
  const selectedPath = inferPathFromNeed(need);
  let score = 0;

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
  if (need.signalType && productHasAny(cleanProduct, [need.signalType])) score += 10;
  if (need.sourceConnector && productHasAny(cleanProduct, [need.sourceConnector])) score += 12;
  if (need.displayConnector && productHasAny(cleanProduct, [need.displayConnector])) score += 12;
  if (need.resolution && productHasAny(cleanProduct, [need.resolution])) score += 10;

  if (hasIntegratedHdmiUsbNeed(need) && isIntegratedHdmiUsbProduct(cleanProduct)) score += 70;
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
  if (hasIntegratedHdmiUsbNeed(need) && !isIntegratedHdmiUsbProduct(cleanProduct)) score -= 120;
  if (isReceiverOnlyProduct(cleanProduct) && hasIntegratedHdmiUsbNeed(need)) score -= 120;
  if (isAvOverIpProduct(cleanProduct) && need.technicalRequirement === "Extend HDMI and USB together" && !productHasAny(cleanProduct, ["usb"])) score -= 60;
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

  if (need.query.trim()) lines.push("Matches the search term or product intent.");
  if (path && match.category === path) lines.push(`Fits the likely product path: ${path}.`);
  if (need.technicalRequirement) lines.push(`Supports the selected technical requirement: ${need.technicalRequirement}.`);
  if (hasIntegratedHdmiUsbNeed(need)) {
    lines.push("Integrated HDMI and USB transport requirement.");
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

  if (hasIntegratedHdmiUsbNeed(need) && !isIntegratedHdmiUsbProduct(match)) {
    lines.unshift("This is not a true integrated HDMI and USB transport product.");
  }

  if (need.usb === "USB 3.x required" && !textIncludesAny(match.searchText, ["usb 3", "3.0"])) {
    lines.unshift("USB 3.x is requested. Confirm high-bandwidth USB support before quoting.");
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

function productToSelection(product: ProductMatch | FinderProduct): ProductSelection {
  return {
    sku: product.sku,
    title: product.title,
    family: product.family,
    category: product.category,
    status: "status" in product ? product.status : "alternative",
    tags: product.tags,
    addedAt: nowIso(),
    source: "Product Finder",
  };
}

function addProductToProject(projectId: string, product: ProductMatch | FinderProduct) {
  const selections = readProductSelections();
  const existing = selections[projectId] ?? [];
  const withoutDuplicate = existing.filter((item) => item.sku !== product.sku);

  writeProductSelections({
    ...selections,
    [projectId]: [productToSelection(product), ...withoutDuplicate],
  });

  const snapshot = readProjectStore();
  const projects = snapshot.projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          stage: "Finder" as const,
          status: "status" in product ? product.status : project.status,
          resumeTo: routeCatalogByKey.finder.path,
          updated: "Just now",
          updatedAt: nowIso(),
        }
      : project,
  );

  writeProjectStore({ ...snapshot, projects });
}

function createProjectFromProduct(projectName: string, owner: string, product: ProductMatch | FinderProduct) {
  const snapshot = readProjectStore();
  const timestamp = nowIso();
  const id = createId("finder-project");

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
  };

  writeProjectStore({
    ...snapshot,
    projects: [project, ...snapshot.projects],
  });

  addProductToProject(id, product);
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

export function FinderPage() {
  const { projects } = useProjectStore();
  const [products, setProducts] = useState<FinderProduct[]>(seedProducts.map(cleanFinderProduct));
  const [indexState, setIndexState] = useState<"loading" | "ready" | "fallback">("loading");
  const [need, setNeed] = useState<FinderNeed>(initialNeed);
  const [selectedProduct, setSelectedProduct] = useState<ProductMatch | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectOwner, setNewProjectOwner] = useState("Steve");
  const [message, setMessage] = useState("");
  const [shortlist, setShortlist] = useState<ProductSelection[]>(() => readStandaloneShortlist());

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

  const hasIntent = hasFinderIntent(need);

  const matches = useMemo(() => {
    if (!hasIntent) return [];

    return products
      .map((product) => scoreProduct(product, need))
      .filter((match) => shouldShowMatch(match, need))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [hasIntent, need, products]);

  const bestMatch = matches[0] ?? null;

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

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

  function clearFinder() {
    setNeed(initialNeed);
    setSelectedProduct(null);
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
    }
  }

  function applyDiscoveryBrief() {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem("wingman-discovery-brief");

    if (!raw) {
      setMessage("No saved Discovery brief found yet.");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { roomModel?: Record<string, unknown> };
      const roomModel = parsed.roomModel ?? {};
      const sourceConnections = Array.isArray(roomModel.sourceConnections) ? roomModel.sourceConnections.join(" ") : "";
      const usbNeeds = Array.isArray(roomModel.usbNeeds) ? roomModel.usbNeeds.join(" ") : "";

      setNeed((current) => ({
        ...current,
        inputs: valueAsString(roomModel.sourceCount),
        outputs: valueAsString(roomModel.displayCount),
        distance: valueAsString(roomModel.longestRun),
        sourceConnector: sourceConnections.includes("USB-C")
          ? "USB-C"
          : sourceConnections.includes("HDMI")
            ? "HDMI"
            : current.sourceConnector,
        usb: usbNeeds.includes("USB 3")
          ? "USB 3.x required"
          : usbNeeds.includes("USB")
            ? "USB 2.0 enough"
            : current.usb,
        network: sourceConnections.includes("NDI") ? "NDI source present" : current.network,
        processing: valueAsString(roomModel.wallLayout) ? "Video wall processing" : current.processing,
      }));

      setMessage("Discovery brief loaded into technical Finder filters.");
    } catch {
      setMessage("Discovery brief exists, but Finder could not read it.");
    }
  }

  function openAddPanel(product: ProductMatch) {
    setSelectedProduct(product);
    setSelectedProjectId(projects[0]?.id ?? "");
    setNewProjectName(`${product.sku} Selection`);
    setMessage("");
  }

  function closeAddPanel() {
    setSelectedProduct(null);
    setSelectedProjectId("");
    setMessage("");
  }

  function addToStandaloneShortlist(product: ProductMatch) {
    const selection = productToSelection(product);
    const next = [selection, ...shortlist.filter((item) => item.sku !== product.sku)].slice(0, 20);
    setShortlist(next);
    writeStandaloneShortlist(next);
    setMessage(`${product.sku} added to standalone shortlist.`);
  }

  function addToExistingProject() {
    if (!selectedProduct || !selectedProjectId) return;
    addProductToProject(selectedProjectId, selectedProduct);
    setMessage(`Added ${selectedProduct.sku} to ${activeProject?.name ?? "selected project"}.`);
  }

  function addToNewProject() {
    if (!selectedProduct) return;
    const project = createProjectFromProduct(newProjectName, newProjectOwner, selectedProduct);
    setSelectedProjectId(project.id);
    setMessage(`Created ${project.name} and added ${selectedProduct.sku}.`);
  }

  return (
    <div className="pb-8">
      <PageHero
        eyebrow="Product Finder"
        title="Find products from technical requirements, not room labels."
        purpose="Use Finder as a technical selector. Start with the required feature or signal path: HDMI extension, USB transport, USB-C input, AVoIP, multiview, video wall processing, NDI camera integration, audio, or control."
        nextMove="Pick the technical requirement first. Finder will infer the likely product family, then refine using signal type, connectors, distance, USB, processing, network, audio, and control."
        actions={[
          { label: "Load Discovery brief", variant: "secondary", onClick: applyDiscoveryBrief },
          { label: "Open projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Technical Product Finder"
        subtitle="Feature-led filtering replaces room-type filtering. Product selection is driven by signal path, transport, processing, USB, network, audio, and control needs."
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-amber-950">Start with the technical job</p>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  The first decision is the technical requirement. This avoids random product lists and helps explain why a product family is needed.
                </p>
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

          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_330px]">
            <aside className="grid content-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-black text-slate-900">Technical filters</p>
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

              <label className="grid gap-1">
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
              <FieldSelect label="Signal type" value={need.signalType} options={signalTypeOptions} onChange={(value) => setNeedField("signalType", value)} />

              <div className="grid grid-cols-2 gap-3">
                <FieldSelect label="Source connector" value={need.sourceConnector} options={connectorOptions} onChange={(value) => setNeedField("sourceConnector", value)} />
                <FieldSelect label="Display / output" value={need.displayConnector} options={connectorOptions} onChange={(value) => setNeedField("displayConnector", value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldSelect label="Inputs" value={need.inputs} options={inputOptions} onChange={(value) => setNeedField("inputs", value)} />
                <FieldSelect label="Outputs" value={need.outputs} options={outputOptions} onChange={(value) => setNeedField("outputs", value)} />
              </div>

              <FieldSelect label="Distance" value={need.distance} options={distanceOptions} onChange={(value) => setNeedField("distance", value)} />
              <FieldSelect label="Resolution" value={need.resolution} options={resolutionOptions} onChange={(value) => setNeedField("resolution", value)} />
              <FieldSelect label="USB" value={need.usb} options={usbOptions} onChange={(value) => setNeedField("usb", value)} />
              <FieldSelect label="Processing" value={need.processing} options={processingOptions} onChange={(value) => setNeedField("processing", value)} />
              <FieldSelect label="Network" value={need.network} options={networkOptions} onChange={(value) => setNeedField("network", value)} />
              <FieldSelect label="Audio" value={need.audio} options={audioOptions} onChange={(value) => setNeedField("audio", value)} />
              <FieldSelect label="Control" value={need.control} options={controlOptions} onChange={(value) => setNeedField("control", value)} />
            </aside>

            <main className="grid content-start gap-3">
              {!hasIntent ? (
                <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="max-w-xl">
                    <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-xl font-black text-slate-950">Start with a technical requirement</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Finder waits for a feature, signal path, connector, distance, USB, network, processing, audio, or control requirement before showing products.
                    </p>
                  </div>
                </div>
              ) : matches.length ? (
                matches.map((match, index) => (
                  <article key={`${match.sku}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-slate-950">{match.sku}</h3>
                          <StatusPill status={match.status} />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{match.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{match.family} | {match.category}</p>
                      </div>

                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        Fit score {Math.min(99, match.score)}%
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-700">{match.description}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.tags.slice(0, 7).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Why it appears</p>
                        <ul className="mt-2 space-y-1 text-sm leading-5 text-emerald-950">
                          {getReasonLines(match, need).map((reason) => (
                            <li key={reason}>- {reason}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Validate before quoting</p>
                        <ul className="mt-2 space-y-1 text-sm leading-5 text-amber-950">
                          {getCautionLines(match, need).map((caution) => (
                            <li key={caution}>- {caution}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
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
                  </article>
                ))
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
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-black text-slate-900">Selection logic</p>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Finder scores WyreStorm products by technical requirement, product family, signal type, source/output connector, distance, USB class, resolution, processing, network, audio, and control.
                </p>

                {bestMatch ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Current best match</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{bestMatch.sku}</p>
                    <p className="mt-1 text-sm text-slate-600">{bestMatch.title}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-900">Standalone shortlist</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Use this when there is no project yet.</p>

                <div className="mt-3 space-y-2">
                  {shortlist.length ? (
                    shortlist.slice(0, 6).map((item) => (
                      <div key={`${item.sku}-${item.addedAt}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-black text-slate-900">{item.sku}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.title}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                      No standalone products shortlisted yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-900">Advisory notice</p>
                <p className="mt-2 text-sm leading-6 text-red-800">
                  Product Finder and project/proposal builders only display and save WyreStorm products. Competitor or non-WyreStorm products are comparison-only and must never be added to product, project, BOM, or proposal flows. Wingman/Guru can make mistakes, so always validate datasheets, receiver/accessory requirements, firmware notes, and commercial suitability before quoting.
                </p>
              </div>
            </aside>
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