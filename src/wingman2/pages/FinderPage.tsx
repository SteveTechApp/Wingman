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
import { StatusChip } from "../components/StatusChip";

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
  application: string;
  productPath: string;
  inputs: string;
  outputs: string;
  distance: string;
  resolution: string;
  usb: string;
  network: string;
  wall: string;
  behaviour: string;
};

type ProductMatch = FinderProduct & {
  score: number;
  status: MatchStatus;
  reasons: string[];
  cautions: string[];
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

const applicationOptions = [
  "Meeting room",
  "Boardroom",
  "Classroom",
  "Training room",
  "Lecture space",
  "Retail signage",
  "Hospitality",
  "House of worship",
  "Control room",
  "Multi-zone venue",
  "Display wall / large format wall",
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
  "BYOD / BYOM",
  "Camera / speakerphone",
  "Touch return",
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

const wallOptions = [
  "No wall",
  "LCD wall 2x2",
  "LCD wall 3x3+",
  "LED wall",
  "Multiview wall",
  "Unknown",
];

const behaviourOptions = [
  "Simple presentation",
  "Presentation + conferencing",
  "Dual display",
  "Source per display",
  "Multiview",
  "Signage loop",
  "Distributed zones",
  "Streaming / recording",
];

const seedProducts: FinderProduct[] = [
  {
    sku: "SW-130-TX-UK",
    title: "In-wall HDMI / USB-C presentation transmitter",
    family: "Presentation / HDBaseT",
    category: "HDMI / USB extender",
    description:
      "Use when the user asks for a single in-room HDMI/USB-C/USB transport point rather than separate HDMI and USB extenders.",
    tags: ["Meeting room", "Boardroom", "USB 2.0", "USB-C", "HDBaseT", "BYOD / BYOM"],
    searchText: "sw-130-tx-uk in wall hdmi usb-c usb hdbaset transmitter meeting room byod byom",
    source: "seed",
  },
  {
    sku: "RX-35",
    title: "HDBaseT receiver for shorter video-only receiver paths",
    family: "HDBaseT",
    category: "HDBaseT extender",
    description:
      "Use when USB transport is not required and the design only needs the appropriate HDBaseT receiver distance class.",
    tags: ["HDBaseT", "Video only", "Receiver", "Shorter distance"],
    searchText: "rx-35 hdbaset receiver video only hdmi extension shorter distance",
    source: "seed",
  },
  {
    sku: "RX-70",
    title: "HDBaseT receiver for longer video-only receiver paths",
    family: "HDBaseT",
    category: "HDBaseT extender",
    description:
      "Use when USB transport is not required and the distance requirement pushes the design toward the longer HDBaseT receiver class.",
    tags: ["HDBaseT", "Video only", "Receiver", "Longer distance"],
    searchText: "rx-70 hdbaset receiver video only hdmi extension longer distance",
    source: "seed",
  },
  {
    sku: "SW-0206-VW",
    title: "4K60 video wall processor",
    family: "Video wall processor",
    category: "Video wall",
    description:
      "Dedicated non-AVoIP wall processor path for LCD wall opportunities where a fixed processor is more appropriate than a networked AVoIP design.",
    tags: ["Video wall", "LCD wall", "4K60", "Processor", "Non-AVoIP"],
    searchText: "sw-0206-vw video wall processor lcd wall 4k60 non avoip",
    source: "seed",
  },
  {
    sku: "SW-0204-VW",
    title: "Preset-layout video wall processor",
    family: "Video wall processor",
    category: "Video wall",
    description:
      "Simpler wall processor path for basic LCD wall layouts where preset-style processing is sufficient.",
    tags: ["Video wall", "LCD wall", "Processor", "Preset layouts"],
    searchText: "sw-0204-vw video wall processor lcd wall preset layouts",
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
    searchText: "nhd-150-rx networkhd 100 avoip multiview decoder",
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
    sku: "MX-0402-MST",
    title: "Dual-display / MST presentation switcher",
    family: "Presentation switching",
    category: "Presentation switcher",
    description:
      "Use when the opportunity needs dual-display presentation behaviour, MST-style workflows, or a compact room-core switcher.",
    tags: ["Presentation switcher", "Dual display", "MST", "USB-C", "Meeting room"],
    searchText: "mx-0402-mst presentation switcher dual display mst usb-c meeting room",
    source: "seed",
  },
];

const initialNeed: FinderNeed = {
  query: "",
  application: "",
  productPath: "",
  inputs: "",
  outputs: "",
  distance: "",
  resolution: "",
  usb: "",
  network: "",
  wall: "",
  behaviour: "",
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function textIncludesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normaliseText(term)));
}

function valueAsString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function deepText(value: unknown, depth = 0): string {
  if (depth > 4 || value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepText(item, depth + 1)).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value as UnknownRecord)
      .map((item) => deepText(item, depth + 1))
      .join(" ");
  }

  return "";
}

function getFirstString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const stringValue = valueAsString(value);

    if (stringValue.trim()) {
      return stringValue.trim();
    }
  }

  return "";
}

function collectProductRecords(value: unknown, output: UnknownRecord[] = [], depth = 0) {
  if (depth > 5 || value == null) {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectProductRecords(item, output, depth + 1));
    return output;
  }

  if (typeof value !== "object") {
    return output;
  }

  const record = value as UnknownRecord;
  const sku = getFirstString(record, ["sku", "SKU", "model", "Model", "productCode", "product_code"]);
  const title = getFirstString(record, ["title", "name", "productName", "Product Name", "description"]);

  if (sku || title) {
    output.push(record);
  }

  Object.values(record).forEach((item) => {
    if (Array.isArray(item)) {
      collectProductRecords(item, output, depth + 1);
    }
  });

  return output;
}

function classifyProduct(product: FinderProduct) {
  const text = normaliseText(`${product.sku} ${product.title} ${product.description} ${product.searchText}`);

  if (textIncludesAny(text, ["video wall", "vw", "wall processor"])) return "Video wall";
  if (textIncludesAny(text, ["networkhd", "nhd", "avoip", "av over ip", "encoder", "decoder", "transceiver"])) return "AVoIP";
  if (textIncludesAny(text, ["ndi", "camera", "ptz", "cam"])) return "NDI / camera";
  if (textIncludesAny(text, ["hdbaset", "rx", "tx", "extender"])) return "HDBaseT extender";
  if (textIncludesAny(text, ["matrix", "routing", "mx"])) return "Matrix / routing";
  if (textIncludesAny(text, ["wireless", "miracast", "airplay"])) return "Wireless presentation";
  if (textIncludesAny(text, ["usb", "conference", "byom", "byod", "speakerphone", "microphone"])) return "UC / conferencing";
  if (textIncludesAny(text, ["presentation", "switcher", "usb-c", "sw"])) return "Presentation switcher";

  return product.category || "Other";
}

function normaliseIndexProduct(record: UnknownRecord): FinderProduct | null {
  const sku = getFirstString(record, ["sku", "SKU", "model", "Model", "productCode", "product_code"]);
  const title =
    getFirstString(record, ["title", "name", "productName", "Product Name"]) ||
    sku ||
    "WyreStorm product";

  if (!sku && !title) {
    return null;
  }

  const description =
    getFirstString(record, ["description", "summary", "shortDescription", "productDescription"]) ||
    deepText(record).slice(0, 260);

  const family = getFirstString(record, ["family", "series", "category", "productFamily"]) || "WyreStorm";
  const tags = unique([
    family,
    getFirstString(record, ["category", "type", "technology"]),
    ...deepText(record)
      .split(/\s+/)
      .filter((word) => /^(usb|usb-c|hdbaset|hdmi|avoip|networkhd|ndi|4k|8k|matrix|video|wall|wireless|dante)$/i.test(word))
      .slice(0, 8),
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

  return {
    ...product,
    category: classifyProduct(product),
  };
}

function normaliseProductIndex(data: unknown) {
  const records = collectProductRecords(data);
  const products = records.map(normaliseIndexProduct).filter((product): product is FinderProduct => Boolean(product));
  const bySku = new Map<string, FinderProduct>();

  [...seedProducts, ...products].forEach((product) => {
    const key = product.sku.toUpperCase();

    if (!bySku.has(key)) {
      bySku.set(key, product);
      return;
    }

    const existing = bySku.get(key);

    if (!existing) {
      return;
    }

    bySku.set(key, {
      ...existing,
      ...product,
      tags: unique([...existing.tags, ...product.tags]),
      searchText: `${existing.searchText} ${product.searchText}`,
      source: product.source === "index" ? "index" : existing.source,
    });
  });

  return Array.from(bySku.values());
}

function hasFinderIntent(need: FinderNeed) {
  return Object.entries(need).some(([key, value]) => key !== "query" && value.trim()) || need.query.trim().length >= 2;
}

function scoreProduct(product: FinderProduct, need: FinderNeed): ProductMatch {
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`);
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 0;

  const category = classifyProduct(product);

  if (need.query.trim()) {
    const query = normaliseText(need.query);
    const words = query.split(/\s+/).filter(Boolean);
    const allWordsMatch = words.length > 0 && words.every((word) => text.includes(word));

    if (text.includes(query)) {
      score += product.sku.toLowerCase() === need.query.trim().toLowerCase() ? 60 : 35;
      reasons.push("Matches the search term directly.");
    }

    if (!text.includes(query) && allWordsMatch) {
      score += 22;
      reasons.push("Matches the search intent by keyword coverage.");
    }
  }

  if (need.application && textIncludesAny(text, [need.application])) {
    score += 16;
    reasons.push(`Relevant to ${need.application.toLowerCase()} applications.`);
  }

  if (need.productPath && category === need.productPath) {
    score += 34;
    reasons.push(`Matches the selected ${need.productPath.toLowerCase()} technology path.`);
  }

  if (need.productPath && category !== need.productPath && textIncludesAny(text, [need.productPath])) {
    score += 18;
    reasons.push(`Contains ${need.productPath.toLowerCase()} terminology.`);
  }

  if (need.behaviour === "Dual display" && textIncludesAny(text, ["dual", "mst", "2 output", "two output", "multi display"])) {
    score += 20;
    reasons.push("Supports the dual-display direction.");
  }

  if (need.behaviour === "Multiview" && textIncludesAny(text, ["multiview", "multi view", "video wall", "processor"])) {
    score += 22;
    reasons.push("Relevant to multiview or composition behaviour.");
  }

  if (need.behaviour === "Distributed zones" && textIncludesAny(text, ["networkhd", "avoip", "matrix", "routing", "zone"])) {
    score += 24;
    reasons.push("Fits distributed routing or zone-based AV.");
  }

  if (need.wall !== "" && need.wall !== "No wall" && textIncludesAny(text, ["video wall", "wall", "vw", "processor", "networkhd", "avoip"])) {
    score += 24;
    reasons.push("Relevant to wall processing or wall distribution.");
  }

  if (need.usb === "No USB" && textIncludesAny(text, ["hdbaset", "rx", "receiver", "video only"])) {
    score += 16;
    reasons.push("Video-only path avoids over-specifying USB transport.");
  }

  if (need.usb === "USB 2.0 enough" && textIncludesAny(text, ["usb", "hdbaset", "byod", "byom", "sw-130"])) {
    score += 20;
    reasons.push("Suitable for USB 2.0 / integrated room transport direction.");
  }

  if (need.usb === "USB 3.x required" && textIncludesAny(text, ["usb 3", "usb3", "3.0", "5gbps"])) {
    score += 26;
    reasons.push("Explicitly supports or aligns with high-bandwidth USB.");
  }

  if (need.usb === "USB 3.x required" && textIncludesAny(text, ["usb"]) && !textIncludesAny(text, ["usb 3", "usb3", "3.0", "5gbps"])) {
    cautions.push("USB is mentioned, but USB 3.x capability must be confirmed.");
  }

  if (need.distance === "Local <5m" || need.distance === "Short 5-10m") {
    if (textIncludesAny(text, ["switcher", "presentation", "local", "hdmi"])) {
      score += 15;
      reasons.push("Sensible for short local presentation paths.");
    }

    if (textIncludesAny(text, ["networkhd", "10g", "avoip"])) {
      cautions.push("May be over-specified for a short local run unless routing/flexibility is required.");
    }
  }

  if (need.distance === "Medium 10-35m" || need.distance === "Long 35-70m") {
    if (textIncludesAny(text, ["hdbaset", "extender", "rx", "tx"])) {
      score += 22;
      reasons.push("Matches a medium/long HDBaseT-style transport requirement.");
    }
  }

  if (need.distance === "Very long 70-100m" || need.distance === "Network / site-wide") {
    if (textIncludesAny(text, ["networkhd", "avoip", "fibre", "fiber", "10g", "hdbaset"])) {
      score += 24;
      reasons.push("Fits long-distance or networked AV transport.");
    }

    if (textIncludesAny(text, ["short hdmi", "local"])) {
      cautions.push("Distance appears too long for a simple local HDMI path.");
    }
  }

  if (need.network === "Dedicated AV network" || need.network === "10G network" || need.network === "NDI source present") {
    if (textIncludesAny(text, ["networkhd", "nhd", "avoip", "10g", "ndi", "network"])) {
      score += 22;
      reasons.push("Aligns with the selected networked AV requirement.");
    }
  }

  if (need.resolution === "4K60 4:4:4" && textIncludesAny(text, ["4k60", "4:4:4", "18gbps", "networkhd 500", "500"])) {
    score += 18;
    reasons.push("Relevant to higher-quality 4K60 transport.");
  }

  if (need.resolution === "8K / specialist" && textIncludesAny(text, ["8k", "48gbps", "specialist"])) {
    score += 18;
    reasons.push("Relevant to specialist high-bandwidth requirements.");
  }

  if (need.inputs === "5-8" || need.inputs === "9+" || need.outputs === "5-8" || need.outputs === "9+") {
    if (textIncludesAny(text, ["matrix", "networkhd", "avoip", "routing"])) {
      score += 20;
      reasons.push("Scales better for higher input/output counts.");
    }

    if (textIncludesAny(text, ["4x1", "2x1", "single"])) {
      cautions.push("I/O count may exceed the product class.");
    }
  }

  if (product.source === "seed") {
    score += 5;
  }

  const status: MatchStatus = score >= 72 ? "recommended" : score >= 42 ? "alternative" : "caution";

  if (!reasons.length) {
    reasons.push("Partial match only. Add more requirement details to improve confidence.");
  }

  return {
    ...product,
    score,
    status,
    reasons: unique(reasons).slice(0, 4),
    cautions: unique(cautions).slice(0, 3),
  };
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

  writeProjectStore({
    ...snapshot,
    projects,
  });
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

function ChipButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
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

function ChipGroup({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ChipButton key={option} active={value === option} label={option} onClick={() => onSelect(value === option ? "" : option)} />
        ))}
      </div>
    </div>
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

export function FinderPage() {
  const { projects } = useProjectStore();
  const [products, setProducts] = useState<FinderProduct[]>(seedProducts);
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

        if (parsedProducts.length) {
          setProducts(parsedProducts);
          setIndexState("ready");
          return;
        }

        setProducts(seedProducts);
        setIndexState("fallback");
      })
      .catch(() => {
        if (!active) return;
        setProducts(seedProducts);
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
      .filter((match) => match.score > 0 || need.query.trim())
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [hasIntent, need, products]);

  const bestMatch = matches[0] ?? null;

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  function setNeedField<K extends keyof FinderNeed>(key: K, value: FinderNeed[K]) {
    setNeed((current) => ({ ...current, [key]: value }));
  }

  function clearFinder() {
    setNeed(initialNeed);
    setSelectedProduct(null);
    setMessage("");
  }

  function applyQuickStart(kind: "meeting" | "usb" | "wall" | "avoip" | "ndi") {
    if (kind === "meeting") {
      setNeed({
        ...initialNeed,
        application: "Meeting room",
        productPath: "Presentation switcher",
        inputs: "2",
        outputs: "1",
        distance: "Medium 10-35m",
        resolution: "4K60 4:2:0",
        usb: "BYOD / BYOM",
        behaviour: "Presentation + conferencing",
      });
    }

    if (kind === "usb") {
      setNeed({
        ...initialNeed,
        application: "Meeting room",
        productPath: "HDMI / USB extender",
        distance: "Medium 10-35m",
        usb: "USB 2.0 enough",
        behaviour: "Presentation + conferencing",
        query: "hdmi usb extender",
      });
    }

    if (kind === "wall") {
      setNeed({
        ...initialNeed,
        application: "Display wall / large format wall",
        productPath: "Video wall",
        outputs: "3-4",
        resolution: "4K60 4:4:4",
        wall: "LCD wall 2x2",
        behaviour: "Multiview",
      });
    }

    if (kind === "avoip") {
      setNeed({
        ...initialNeed,
        application: "Multi-zone venue",
        productPath: "AVoIP",
        inputs: "5-8",
        outputs: "5-8",
        distance: "Network / site-wide",
        network: "Dedicated AV network",
        behaviour: "Distributed zones",
      });
    }

    if (kind === "ndi") {
      setNeed({
        ...initialNeed,
        application: "House of worship",
        productPath: "NDI / camera",
        distance: "Network / site-wide",
        network: "NDI source present",
        behaviour: "Streaming / recording",
        query: "NDI camera NetworkHD",
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
      const sourceTypes = Array.isArray(roomModel.sourceTypes) ? roomModel.sourceTypes.join(" ") : "";
      const usbNeeds = Array.isArray(roomModel.usbNeeds) ? roomModel.usbNeeds.join(" ") : "";

      setNeed((current) => ({
        ...current,
        application: valueAsString(roomModel.roomType),
        inputs: valueAsString(roomModel.sourceCount),
        outputs: valueAsString(roomModel.displayCount),
        distance: valueAsString(roomModel.longestRun),
        usb: usbNeeds.includes("USB 3") ? "USB 3.x required" : usbNeeds.includes("USB") ? "USB 2.0 enough" : current.usb,
        network: sourceTypes.includes("NDI") ? "NDI source present" : current.network,
        wall: valueAsString(roomModel.wallLayout) || current.wall,
        behaviour: valueAsString(roomModel.displayBehaviour) || current.behaviour,
      }));

      setMessage("Discovery brief loaded into Finder filters.");
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
    <div className="pb-10">
      <PageHero
        eyebrow="Product Finder"
        title="Find the correct product path before choosing a SKU."
        purpose="Use Finder as a standalone product-selection workspace. Start from the application, transport, distance, USB, wall, or routing behaviour, then review scored WyreStorm matches. Add products to a project only when required."
        nextMove="Choose a quick start or set the filters. Results stay empty until you give Finder a real requirement."
        actions={[
          { label: "Load Discovery brief", variant: "secondary", onClick: applyDiscoveryBrief },
          { label: "Open projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Standalone Product Finder"
        subtitle="No active project is required. Finder now scores products against the requirement and separates product path, transport, and save-to-project actions."
      >
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-amber-950">Start from the job-to-be-done</p>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  Finder is intentionally blank until you select a use case, product path, search term, or constraint.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-800">
                <Database className="h-3.5 w-3.5" />
                {indexState === "ready" ? `${products.length} indexed products` : indexState === "loading" ? "Loading index" : "Fallback library"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ChipButton active={false} label="Meeting room switcher" onClick={() => applyQuickStart("meeting")} />
              <ChipButton active={false} label="HDMI + USB extender" onClick={() => applyQuickStart("usb")} />
              <ChipButton active={false} label="LCD / LED wall" onClick={() => applyQuickStart("wall")} />
              <ChipButton active={false} label="AVoIP distribution" onClick={() => applyQuickStart("avoip")} />
              <ChipButton active={false} label="NDI / camera workflow" onClick={() => applyQuickStart("ndi")} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_330px]">
            <aside className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-black text-slate-900">Requirement filters</p>
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
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Search SKU or need</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={need.query}
                    onChange={(event) => setNeedField("query", event.target.value)}
                    placeholder="e.g. USB HDMI extender, NHD-150-RX, video wall"
                    className="h-9 flex-1 border-0 bg-transparent px-0 text-sm text-slate-900 outline-none"
                  />
                </div>
              </label>

              <FieldSelect label="Application" value={need.application} options={applicationOptions} onChange={(value) => setNeedField("application", value)} />
              <FieldSelect label="Product path" value={need.productPath} options={productPathOptions} onChange={(value) => setNeedField("productPath", value)} />

              <div className="grid grid-cols-2 gap-3">
                <FieldSelect label="Inputs" value={need.inputs} options={inputOptions} onChange={(value) => setNeedField("inputs", value)} />
                <FieldSelect label="Outputs" value={need.outputs} options={outputOptions} onChange={(value) => setNeedField("outputs", value)} />
              </div>

              <FieldSelect label="Distance" value={need.distance} options={distanceOptions} onChange={(value) => setNeedField("distance", value)} />
              <FieldSelect label="Resolution" value={need.resolution} options={resolutionOptions} onChange={(value) => setNeedField("resolution", value)} />
              <FieldSelect label="USB" value={need.usb} options={usbOptions} onChange={(value) => setNeedField("usb", value)} />
              <FieldSelect label="Network" value={need.network} options={networkOptions} onChange={(value) => setNeedField("network", value)} />
              <FieldSelect label="Wall" value={need.wall} options={wallOptions} onChange={(value) => setNeedField("wall", value)} />
              <FieldSelect label="Behaviour" value={need.behaviour} options={behaviourOptions} onChange={(value) => setNeedField("behaviour", value)} />
            </aside>

            <main className="grid gap-3">
              {!hasIntent ? (
                <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="max-w-xl">
                    <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-xl font-black text-slate-950">Start with a requirement</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Product Finder no longer shows a random product list. Choose a quick start, search a SKU, or select a product path so the results are intentional.
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
                          <StatusChip
                            label={match.status === "recommended" ? "Recommended" : match.status === "alternative" ? "Alternative" : "Check fit"}
                            variant={match.status}
                          />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{match.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{match.family} • {match.category}</p>
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
                          {match.reasons.map((reason) => (
                            <li key={reason}>• {reason}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Validate before quoting</p>
                        <ul className="mt-2 space-y-1 text-sm leading-5 text-amber-950">
                          {match.cautions.length ? match.cautions.map((caution) => <li key={caution}>• {caution}</li>) : <li>• Confirm current datasheet, receiver/accessory set, and cable assumptions.</li>}
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

                      <Link
                        to={routeCatalogByKey.compare.path}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                      >
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
                    Broaden the product path, remove one constraint, or search by SKU. This is better than showing a misleading product list.
                  </p>
                </div>
              )}
            </main>

            <aside className="grid content-start gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-black text-slate-900">Recommendation logic</p>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Finder scores products by application, technology path, distance, USB class, wall requirement, network need, and behaviour. It should guide the product path before final SKU validation.
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
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use this when the user has no project yet.
                </p>

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
                  Wingman/Guru can make mistakes. Always validate product datasheets, firmware notes, receiver/accessory requirements, and live stock/commercial suitability before quoting.
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Add product to project</p>
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
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Attach this product to an existing opportunity.
                </p>

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
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Start a new Finder-stage project with this product attached.
                </p>

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

              <Link
                to={routeCatalogByKey.projects.path}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-black text-slate-200 transition hover:bg-white/10"
              >
                Open projects
              </Link>

              <Link
                to={routeCatalogByKey.proposal.path}
                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-white"
              >
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