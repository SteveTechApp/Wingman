import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { getBestProductPositioningCardForSku } from "../data/productPositioningCards";
import { getProductStory, productStoryRelatedText } from "../data/productStories";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  saveProductSelectionToCurrentProject,
} from "../data/projectStore";
import { buildProductNarrative, normaliseProductRecord, type ProductNarrative } from "../lib/productStoryEngine";
import {
  classifyProductCallCard,
  PRODUCT_CALL_CARD_HEADINGS,
  productCallCardClassificationText,
  type ClassifiedProductCallCardHeading,
} from "../lib/productCallCardClassification";
import { resolveWyrestormSkuAlias } from "../lib/skuAliasResolver";
import { getProductCallCommercialOverride } from "../lib/productCallCommercialOverrides";
import { selectWingmanProducts } from "../lib/productSelectorEngine";
import { isSkuAdminBlocked } from "../lib/adminProductOverrides";
import { getCompetitorLandscape } from "../lib/competitorLandscape";
import {
  DEFAULT_SALES_CONVERSATION_TONE_ID,
  LEGACY_SALES_CONVERSATION_STORAGE_KEYS,
  SALES_CONVERSATION_TYPE_STORAGE_KEY,
  buildSalesConversationToneCopy,
  normalizeSalesConversationToneId,
  salesConversationToneOptions,
  type SalesConversationToneId,
} from "../lib/salesConversationTone";

function readStoredSalesConversationToneId(): SalesConversationToneId {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return DEFAULT_SALES_CONVERSATION_TONE_ID;
  }

  try {
    const stored = window.localStorage.getItem(SALES_CONVERSATION_TYPE_STORAGE_KEY);
    if (stored) {
      return normalizeSalesConversationToneId(stored);
    }

    for (const legacyKey of LEGACY_SALES_CONVERSATION_STORAGE_KEYS) {
      const legacyValue = window.localStorage.getItem(legacyKey);
      if (legacyValue) {
        return normalizeSalesConversationToneId(legacyValue);
      }
    }
  } catch {
    // Storage may be unavailable (private browsing, quota).
  }

  return DEFAULT_SALES_CONVERSATION_TONE_ID;
}

const productCallCardWorkflowGuide = [
  "Product identifier",
  "Scenario checkpoint",
  "Objection helper",
  "Confidence cue",
  "Sales confidence",
  "Create response wording",
];

// Reuse the role-aware Product Pitch engine so call-card copy is plain and
// sales-focused (and consistent with the Pitch page) instead of the thin,
// hollow enriched-data talk tracks ("...should be discussed around supports
// 4k60..."). The engine already prefers hand-authored stories where they exist.
function narrativeForSeed(seed: ProductSeed): ProductNarrative | null {
  const spec = normaliseProductRecord(
    {
      sku: seed.sku,
      name: seed.name,
      family: seed.family,
      category: seed.category,
      productType: seed.category,
      description: seed.description,
      // Tags feed headline-feature extraction only. They are category-ish words
      // (e.g. "HDBaseT"), not room applications, so leaving applications unset
      // avoids awkward phrasing like "the ... for hdbaset".
      features: seed.tags,
    },
    0,
  );

  return spec ? buildProductNarrative(spec) : null;
}

type ProductSeed = {
  sku: string;
  name?: string;
  title?: string;
  family?: string;
  category?: string;
  productType?: string;
  description?: string;
  summary?: string;
  tags?: string[];
  applications?: string[] | string;
  role?: string;
  productRole?: string;
  fit?: string;
  openingLine?: string;
  questions?: string[];
  proofPoints?: string[];
  officialUrl?: string;
  officialCopyStatus?: string;
  technicalProfile?: unknown;
  sourceCatalog?: unknown;
};

type ProductCard = {
  sku: string;
  name: string;
  family: string;
  category: string;
  description: string;
  fit: string;
  openingLine: string;
  questions: string[];
  proofPoints: string[];
  tags: string[];
  headings: ClassifiedProductCallCardHeading[];
  sourceSearchText: string;
  curated: boolean;
  technicalProfile?: unknown;
  sourceCatalog?: unknown;
};

type ProductPayload = {
  products?: ProductSeed[];
};

type ProductSalesHelperRole =
  | "audio"
  | "networkhd"
  | "matrix"
  | "presentation"
  | "uc"
  | "extender"
  | "camera"
  | "videoWall"
  | "multiview"
  | "control"
  | "accessory"
  | "general";

type ProductSalesHelperCopy = {
  whatItDoes: string;
  realWorldJobs: string[];
  specWatchOuts: string[];
  fitHere: string;
  useWhen: string[];
  avoidWhen: string[];
  sayThis: string;
  proofPoints: string[];
  discoveryQuestions: string[];
};

type ProductPanelId = "whatItIs" | "whatItDoes" | "howToSell" | "competitors" | "specification";

type ProductGalleryItem = {
  id: string;
  title: string;
  label: string;
  kind: "device" | "system" | "connection";
  imageUrl?: string;
};
type QuickTermLookup = {
  label: string;
  meaning: string;
};

let setProductTermLookup: ((lookup: QuickTermLookup) => void) | null = null;

const PRODUCT_PANEL_TABS: Array<{ id: ProductPanelId; label: string; hint: string }> = [
  { id: "whatItIs", label: "What it does", hint: "Plain-English role" },
  { id: "whatItDoes", label: "How it fits here", hint: "Fit and risks" },
  { id: "howToSell", label: "What to say", hint: "Talk track" },
  { id: "competitors", label: "Competitors", hint: "Brand SKUs" },
  { id: "specification", label: "Technical detail", hint: "If needed" },
];

const PAGE_SIZE = 14;

const PRODUCT_CALL_CARD_ENDPOINT = "/product-call-card-products.json";

const CURATED: Record<string, Partial<ProductCard>> = {
  "SW-620-TX-W": {
    family: "Presentation",
    description: "Wireless and wired presentation switcher for meeting and teaching spaces.",
    fit: "Use where the customer needs simple local presentation, USB-C/HDMI source access and straightforward room operation.",
    openingLine: "Strong fit for a simple meeting room or classroom presentation system without moving into full matrix or AVoIP.",
    questions: [
      "How many local sources need to connect?",
      "Is wireless presentation required?",
      "Is USB camera, microphone or BYOD conferencing also needed?",
    ],
    proofPoints: [
      "Good starting point for presentation-led rooms.",
      "Keeps the system simple.",
      "Check USB/conferencing before quoting.",
    ],
    tags: ["presentation", "wireless", "meeting room", "teaching"],
  },
  "MX-0808-KIT-V2": {
    family: "Matrix / HDBaseT",
    description: "Fixed 8x8 matrix kit direction for contained source-to-display routing over HDBaseT.",
    fit: "Use for contained hospitality, sports bar or venue systems where fixed matrix routing is simpler than AVoIP.",
    openingLine: "Good when the customer has a fixed number of sources and displays and wants reliable routing without network complexity.",
    questions: [
      "How many source devices are there?",
      "How many displays need independent selection?",
      "Are cable routes suitable for HDBaseT to a central rack?",
    ],
    proofPoints: [
      "Good fit for contained 8x8 systems.",
      "Simpler than AVoIP where expansion is limited.",
      "Check control and distances.",
    ],
    tags: ["matrix", "HDBaseT", "hospitality", "sports bar"],
  },
  "NHD-150-RX": {
    family: "NetworkHD 100 multiview",
    description: "NetworkHD 100-series multiview decoder for showing multiple sources on one output.",
    fit: "Use where several sources need to appear at once on a single display or output canvas.",
    openingLine: "Use when the customer needs multiple sources on one screen, not just one source routed to one display.",
    questions: [
      "How many sources appear on the same screen?",
      "Is this monitoring, signage or confidence viewing?",
      "Is the system already NetworkHD 100?",
    ],
    proofPoints: [
      "Correct direction for 100-series multiview.",
      "Multiview means multiple sources on one output.",
      "Confirm layout expectations.",
    ],
    tags: ["multiview", "AVoIP", "NetworkHD 100"],
  },
  "NHD-0401-MV": {
    family: "Multiview processor",
    description: "4-input multiview processor for creating one HDMI multiview output.",
    fit: "Use where the customer wants a simple four-source multiview output without building a larger AVoIP system.",
    openingLine: "Useful where the requirement is one combined multiview image rather than full system-wide AVoIP routing.",
    questions: [
      "Are four sources or fewer required?",
      "Is the output LCD, projector or LED processor?",
      "Are preset layouts needed?",
    ],
    proofPoints: [
      "Simple multiview conversation.",
      "Useful with LED processor workflows.",
      "Does not replace a full matrix or AVoIP system.",
    ],
    tags: ["multiview", "HDMI", "LED processor"],
  },
  "APO-VX20-UC-V2": {
    family: "USB / UC",
    description: "BYOD/UC soundbar direction for small meeting and collaboration spaces.",
    fit: "Use where the room needs a simple camera, speaker and microphone experience.",
    openingLine: "Fits when the customer wants a simple BYOD meeting room without separate camera, mic and speaker components.",
    questions: [
      "How many people are normally in the room?",
      "Is this BYOD, room PC or Teams appliance?",
      "Does the display need wireless presentation?",
    ],
    proofPoints: [
      "Good for simple UC spaces.",
      "Easy workflow to explain.",
      "Check room size and USB path.",
    ],
    tags: ["UC", "BYOD", "soundbar", "meeting"],
  },
  "SW-0206-VW": {
    family: "Video wall processor",
    description: "Dedicated video wall processor direction for non-AVoIP wall applications.",
    fit: "Use where a dedicated processor is cleaner than building the wall through AVoIP.",
    openingLine: "Dedicated processor route when the wall requirement is fixed enough that AVoIP adds unnecessary complexity.",
    questions: [
      "Is this LCD wall or LED wall with external processor?",
      "How many sources feed the wall?",
      "Full canvas, presets or per-screen content?",
    ],
    proofPoints: [
      "Dedicated non-AVoIP wall option.",
      "Useful alternative to AVoIP wall designs.",
      "Confirm wall type and layout behaviour.",
    ],
    tags: ["video wall", "processor", "LCD", "LED"],
  },
};

const FALLBACK_PRODUCTS: ProductSeed[] = Object.keys(CURATED).map((sku) => ({
  sku,
  name: sku,
  family: CURATED[sku].family,
  category: CURATED[sku].category,
  description: CURATED[sku].description,
  tags: CURATED[sku].tags,
}));

const QUICK_FINDERS = [
  "All",
  "0-9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

type GuruTechnicalTerm = {
  label: string;
  aliases: string[];
  plainEnglish: string;
};

const GURU_TECHNICAL_TERMS: GuruTechnicalTerm[] = [
  {
    label: "Low Z",
    aliases: ["Low Z", "Low-Z", "Low impedance", "low-impedance"],
    plainEnglish: "Low impedance speaker wiring, normally used for shorter speaker runs and direct amplifier-to-speaker connections.",
  },
  {
    label: "High Z",
    aliases: ["High Z", "High-Z", "70V", "100V", "constant voltage"],
    plainEnglish: "High impedance / constant-voltage speaker systems, normally used for longer cable runs or multiple speakers across a zone.",
  },
  {
    label: "Dante",
    aliases: ["Dante"],
    plainEnglish: "Networked digital audio over standard IP networks, often used to route audio between DSPs, amplifiers and audio devices.",
  },
  {
    label: "AES67",
    aliases: ["AES67"],
    plainEnglish: "An audio-over-IP interoperability standard used to help different network audio systems pass audio between each other.",
  },
  {
    label: "DSP",
    aliases: ["DSP"],
    plainEnglish: "Digital signal processing for audio, used for EQ, mixing, routing, echo cancellation, limiting and room tuning.",
  },
  {
    label: "GPIO",
    aliases: ["GPIO"],
    plainEnglish: "General purpose input/output ports used for simple triggers, contact closures or control integration.",
  },
  {
    label: "RS-232",
    aliases: ["RS-232", "RS232"],
    plainEnglish: "Serial control used to send commands to displays, switchers, projectors and other AV devices.",
  },
  {
    label: "IR",
    aliases: ["IR", "infrared"],
    plainEnglish: "Infrared control, usually used to control source devices or displays in the same way as a handheld remote.",
  },
  {
    label: "HDBaseT",
    aliases: ["HDBaseT", "HDBT"],
    plainEnglish: "AV extension technology that can carry HDMI video, control and sometimes power over category cable.",
  },
  {
    label: "PoE",
    aliases: ["PoE", "Power over Ethernet"],
    plainEnglish: "Power over Ethernet, allowing a network cable to provide power as well as data.",
  },
  {
    label: "PoH",
    aliases: ["PoH", "Power over HDBaseT"],
    plainEnglish: "Power over HDBaseT, allowing a transmitter or receiver to be powered through the HDBaseT cable path.",
  },
  {
    label: "ARC/eARC",
    aliases: ["ARC", "eARC"],
    plainEnglish: "Audio return from a display back into the AV system, commonly used to send TV/display audio to an amplifier or sound system.",
  },
  {
    label: "EDID",
    aliases: ["EDID"],
    plainEnglish: "Display information used by a source to understand supported resolution, audio and format capabilities.",
  },
  {
    label: "HDCP",
    aliases: ["HDCP"],
    plainEnglish: "Copy protection used on HDMI video signals. Version mismatch can stop protected content from displaying correctly.",
  },
  {
    label: "4:4:4",
    aliases: ["4:4:4"],
    plainEnglish: "Full colour sampling, useful for sharp PC text, spreadsheets, CAD and detailed graphics.",
  },
  {
    label: "HDR",
    aliases: ["HDR", "Dolby Vision"],
    plainEnglish: "High dynamic range video for improved brightness, contrast and colour when the full signal chain supports it.",
  },
  {
    label: "CEC",
    aliases: ["CEC"],
    plainEnglish: "HDMI control signalling, often used for basic power/input control between connected HDMI devices.",
  },
  {
    label: "USB-C",
    aliases: ["USB-C"],
    plainEnglish: "Modern reversible connector that may carry video, USB data and laptop charging depending on the device.",
  },
  {
    label: "USB 3.0",
    aliases: ["USB 3.0", "USB3"],
    plainEnglish: "Higher-bandwidth USB, often important for cameras and conferencing devices.",
  },
  {
    label: "BYOD",
    aliases: ["BYOD"],
    plainEnglish: "Bring Your Own Device. A participant brings their own laptop or device to present or join a call.",
  },
  {
    label: "BYOM",
    aliases: ["BYOM"],
    plainEnglish: "Bring Your Own Meeting. A participant runs the meeting from their own laptop while using the room camera, microphone and speakers.",
  },
  {
    label: "Multiview",
    aliases: ["Multiview", "multi-view"],
    plainEnglish: "Showing more than one source at the same time on a single output canvas.",
  },
  {
    label: "H.265",
    aliases: ["H.265", "HEVC"],
    plainEnglish: "Efficient video compression used to reduce network bandwidth in some AV-over-IP systems.",
  },
  {
    label: "H.264",
    aliases: ["H.264"],
    plainEnglish: "Common video compression format used for compatibility and lower-bandwidth video transport.",
  },
  {
    label: "JPEG XS",
    aliases: ["JPEG XS", "JPEG-XS"],
    plainEnglish: "Low-latency, high-quality compression used in premium AV-over-IP systems.",
  },
  {
    label: "SDVoE",
    aliases: ["SDVoE"],
    plainEnglish: "10G AV-over-IP technology used for very high-performance video distribution with extremely low latency.",
  },
  {
    label: "NDI",
    aliases: ["NDI"],
    plainEnglish: "Network Device Interface, commonly used for video production and camera workflows over IP networks.",
  },
  {
    label: "MST",
    aliases: ["MST", "Multi-Stream Transport"],
    plainEnglish: "DisplayPort/USB-C feature that can support multiple display streams from one connection.",
  },
  {
    label: "Line level",
    aliases: ["line level", "line-level"],
    plainEnglish: "An audio signal level used between AV/audio devices before amplification to speakers.",
  },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const GURU_TERM_LOOKUP = new Map<string, GuruTechnicalTerm>();

GURU_TECHNICAL_TERMS.forEach((term) => {
  term.aliases.forEach((alias) => {
    GURU_TERM_LOOKUP.set(alias.toLowerCase(), term);
  });
});

const GURU_TERM_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9])(${GURU_TECHNICAL_TERMS.flatMap((term) => term.aliases).sort((a, b) => b.length - a.length).map(escapeRegex).join("|")})(?=$|[^A-Za-z0-9])`,
  "gi",
);

function findGuruTerm(value: string): GuruTechnicalTerm | undefined {
  return GURU_TERM_LOOKUP.get(value.toLowerCase());
}

function askGuruAboutTerm(termText: string, _product?: ProductCard): void {
  const term = findGuruTerm(termText);
  const label = term?.label || termText;
  const meaning = term?.plainEnglish || "A technical AV term. Check how it affects the product, signal path or customer requirement.";

  if (setProductTermLookup) {
    setProductTermLookup({
      label,
      meaning,
    });

    return;
  }

  window.alert(`Guru says: ${label}\n\n${meaning}`);
}

function renderWithGuruLinks(text: string, product?: ProductCard): ReactNode {
  const source = cleanText(text);

  if (!source) {
    return null;
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  GURU_TERM_PATTERN.lastIndex = 0;

  let match = GURU_TERM_PATTERN.exec(source);

  while (match) {
    const prefix = match[1] || "";
    const matchedTerm = match[2] || "";
    const termStart = match.index + prefix.length;

    if (termStart > lastIndex) {
      nodes.push(source.slice(lastIndex, termStart));
    }

    const guruTerm = findGuruTerm(matchedTerm);

    if (guruTerm) {
      nodes.push(
        <button
          key={`${matchedTerm}-${termStart}`}
          type="button"
          className="wm-pcc-guru-term wm-ui-button wm-ui-button-primary"
          onClick={() => askGuruAboutTerm(matchedTerm, product)}
          title={`Guru says: ${guruTerm.label}`}
        >
          {matchedTerm}
        </button>,
      );
    }

    if (!guruTerm) {
      nodes.push(matchedTerm);
    }

    lastIndex = termStart + matchedTerm.length;
    match = GURU_TERM_PATTERN.exec(source);
  }

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }

  return <>{nodes}</>;
}

function cleanText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normaliseSku(value: string): string {
  return resolveWyrestormSkuAlias(value).trim().toUpperCase().replace(/\s+/g, "");
}

// Some seed rows carry a superseded SKU (e.g. "APO-VX20-UC") alongside its
// alias-resolved successor (e.g. "APO-VX20-UC-V2") as a separate product
// record. Both normalise to the same canonical SKU, which produced duplicate
// list entries (and a duplicate React key) for the same physical product.
// Prefer whichever seed's own SKU already matches the canonical form.
function dedupeProductSeedsBySku(seeds: ProductSeed[]): ProductSeed[] {
  const bySku = new Map<string, ProductSeed>();

  seeds.forEach((seed) => {
    const canonicalSku = normaliseSku(seed.sku);
    const existing = bySku.get(canonicalSku);

    if (!existing) {
      bySku.set(canonicalSku, seed);
      return;
    }

    const seedIsAuthoritative = String(seed.sku || "").trim().toUpperCase().replace(/\s+/g, "") === canonicalSku;
    const existingIsAuthoritative =
      String(existing.sku || "").trim().toUpperCase().replace(/\s+/g, "") === canonicalSku;

    if (seedIsAuthoritative && !existingIsAuthoritative) {
      bySku.set(canonicalSku, seed);
    }
  });

  return Array.from(bySku.values());
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const clean = value.trim();

    if (!clean) {
      return;
    }

    const key = clean.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(clean);
  });

  return output;
}

function classify(seed: ProductSeed): string {
  const text = `${seed.sku} ${seed.name || ""} ${seed.family || ""} ${seed.category || ""} ${seed.description || ""} ${(seed.tags || []).join(" ")}`.toLowerCase();

  if (text.includes("nhd-600") || text.includes("networkhd 600") || text.includes("10g")) {
    return "NetworkHD 600";
  }

  if (text.includes("nhd-500") || text.includes("networkhd 500")) {
    return "NetworkHD 500";
  }

  if (text.includes("nhd-1") || text.includes("networkhd 100")) {
    return "NetworkHD 100";
  }

  if (text.includes("networkhd") || text.includes("avoip") || text.includes("av-over-ip")) {
    return "NetworkHD";
  }

  if (text.includes("video wall") || text.includes("videowall") || text.includes("-vw")) {
    return "Video wall";
  }

  if (text.includes("multiview") || text.includes("-mv")) {
    return "Multiview";
  }

  if (text.includes("usb") || text.includes("uc") || text.includes("byod") || text.includes("conference")) {
    return "USB / UC";
  }

  if (text.includes("hdbaset") || text.includes("hdbt") || text.includes("extender")) {
    return "HDBaseT";
  }

  if (text.includes("matrix") || text.startsWith("mx-")) {
    return "Matrix";
  }

  if (text.includes("presentation") || text.includes("switcher") || text.startsWith("sw-")) {
    return "Presentation";
  }

  if (text.includes("camera") || text.includes("ptz") || text.includes("ndi")) {
    return "Cameras";
  }

  if (text.includes("touch") || text.includes("control")) {
    return "Control";
  }

  return "WyreStorm product";
}

function questionsFor(product: ProductCard): string[] {
  const text = `${product.sku} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")}`.toLowerCase();

  if (text.includes("networkhd") || text.includes("avoip") || text.includes("av-over-ip")) {
    return [
      "How many sources and displays are required?",
      "Who owns the network and switch configuration?",
      "Is USB, multiview, video wall or low latency required?",
    ];
  }

  if (text.includes("usb") || text.includes("uc") || text.includes("byod")) {
    return [
      "Is the room BYOD, room PC, Teams appliance or mixed use?",
      "Which USB devices need to be connected?",
      "Where are the laptop, display and USB devices located?",
    ];
  }

  if (text.includes("video wall") || text.includes("multiview")) {
    return [
      "What wall size or layout is required?",
      "Do they need full canvas, presets, multiview or per-screen content?",
      "How many sources need to be shown?",
    ];
  }

  if (text.includes("matrix") || text.includes("hdbaset")) {
    return [
      "How many sources and displays are required?",
      "Where are the rack and displays located?",
      "What control method does the customer expect?",
    ];
  }

  return [
    "What problem is the customer trying to solve?",
    "How many sources and displays are involved?",
    "Is USB, audio, control or networking part of the requirement?",
  ];
}

function productRoleForSalesHelper(product: ProductCard): ProductSalesHelperRole {
  const sku = product.sku.toUpperCase();
  const text = `${product.sku} ${product.name} ${product.family} ${product.category} ${product.description} ${product.fit} ${product.tags.join(" ")}`.toLowerCase();
  const familyText = `${product.name} ${product.family} ${product.category} ${product.tags.join(" ")}`.toLowerCase();

  if (sku === "NHD-0401-MV") {
    return "multiview";
  }

  if (sku.startsWith("SW-0204-VW") || sku.startsWith("SW-0206-VW")) {
    return "videoWall";
  }

  if (sku.startsWith("AMP-")) {
    return "audio";
  }

  if (sku.startsWith("NHD-")) {
    return "networkhd";
  }

  if (sku.startsWith("MX-") || sku.startsWith("MXV-")) {
    return "matrix";
  }

  if (sku.startsWith("SW-")) {
    return "presentation";
  }

  if (sku.startsWith("APO-")) {
    return "uc";
  }

  if (sku.startsWith("EX-") || sku.startsWith("RX-") || sku.startsWith("TX-")) {
    return "extender";
  }

  if (sku.startsWith("CAM-")) {
    return "camera";
  }

  if (sku.startsWith("SYN-")) {
    return "control";
  }

  if (/\b(video wall|videowall|wall processor)\b/.test(text)) {
    return "videoWall";
  }

  if (/\b(multiview|multi-view|quad view)\b/.test(text)) {
    return "multiview";
  }

  if (/\b(networkhd|avoip|av-over-ip|encoder|decoder|transceiver)\b/.test(text)) {
    return "networkhd";
  }

  if (/\b(matrix|routed switching)\b/.test(familyText)) {
    return "matrix";
  }

  if (/\b(presentation|usb-c|wireless presentation|switcher|byod)\b/.test(familyText)) {
    return "presentation";
  }

  if (/\b(uc|byom|video bar|soundbar|conference|speakerphone)\b/.test(familyText)) {
    return "uc";
  }

  if (/\b(extender|extension|hdbaset|hdbt|transmitter|receiver)\b/.test(familyText)) {
    return "extender";
  }

  if (/\b(camera|ptz|ndi)\b/.test(familyText)) {
    return "camera";
  }

  if (/\b(control|touch panel|controller|relay|gpio)\b/.test(familyText)) {
    return "control";
  }

  if (/\b(audio|amplifier|dante|aes67|speaker|dsp)\b/.test(familyText)) {
    return "audio";
  }

  if (/\b(cable|mount|bracket|psu|power supply|accessory|dongle)\b/.test(familyText)) {
    return "accessory";
  }

  return "general";
}

function firstSentence(value: string): string {
  const clean = cleanText(value).replace(/\s+/g, " ");

  if (!clean) {
    return "";
  }

  const match = clean.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1] : clean;
}

function usefulProductLine(value: string): string {
  const sentence = firstSentence(value);

  if (!sentence) {
    return "";
  }

  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function roleName(role: ProductSalesHelperRole, product: ProductCard): string {
  switch (role) {
    case "audio":
      return "an audio amplifier or audio integration product";
    case "networkhd":
      return "a NetworkHD AV-over-IP product";
    case "matrix":
      return "a fixed video routing product";
    case "presentation":
      return "a room presentation switcher";
    case "uc":
      return "a UC and BYOD collaboration product";
    case "extender":
      return "a point-to-point signal extension product";
    case "camera":
      return "a meeting-room camera product";
    case "videoWall":
      return "a video-wall processing product";
    case "multiview":
      return "a multiview processing product";
    case "control":
      return "a room-control product";
    case "accessory":
      return "a supporting accessory or service part";
    default:
      return `a ${product.family.toLowerCase()} product`;
  }
}

function roleJobLine(role: ProductSalesHelperRole): string {
  switch (role) {
    case "audio":
      return "turning the room's audio requirement into the right speaker load, zones, sources and control path.";
    case "networkhd":
      return "moving video, USB, audio or control across a managed AV network when the system needs to scale beyond a fixed switch.";
    case "matrix":
      return "routing several sources to several displays from a known rack-and-room layout.";
    case "presentation":
      return "letting users connect laptops, cast wirelessly, pick the right source and get content onto the display without designing a whole matrix or AV-over-IP system.";
    case "uc":
      return "making the room usable for calls by joining camera, microphone, speaker and laptop or room-computer workflows.";
    case "extender":
      return "getting one source to one display over distance while carrying the required control, audio, USB or network pass-through.";
    case "camera":
      return "capturing the room properly for conferencing, teaching, streaming or recording.";
    case "videoWall":
      return "turning multiple screens or a processor input into the display canvas the customer expects.";
    case "multiview":
      return "showing several live sources together on one output for monitoring, teaching, production or confidence viewing.";
    case "control":
      return "giving the user a repeatable room action instead of a pile of remotes and manual device settings.";
    case "accessory":
      return "making the parent system installable, serviceable or complete.";
    default:
      return "matching the product family to the real room problem before a quote is written.";
  }
}

function roleFitTrigger(role: ProductSalesHelperRole): string {
  switch (role) {
    case "audio":
      return "speaker coverage, amplifier loading, source selection or audio-zone control is part of the outcome";
    case "networkhd":
      return "sources and displays are spread out, expected to grow, or need flexible routing through a managed network";
    case "matrix":
      return "the source and display count is known and a fixed rack-based router is simpler than AV-over-IP";
    case "presentation":
      return "the room is really about easy laptop, wireless or USB-C presentation for everyday users";
    case "uc":
      return "meetings, BYOD/BYOM conferencing or room PC connectivity are central to the brief";
    case "extender":
      return "a source and display are in different locations and the cable path must carry more than a short HDMI lead can handle";
    case "camera":
      return "the quality of the far-end meeting view, teaching capture or stream depends on the camera choice";
    case "videoWall":
      return "the customer is asking for one image, repeatable layouts or multiple sources across a display wall";
    case "multiview":
      return "operators need to see multiple sources at the same time on one screen";
    case "control":
      return "the sale needs a simple user action such as present, call, source select, room on or room off";
    case "accessory":
      return "the main product cannot be installed or used correctly without the supporting part";
    default:
      return "the room problem maps to this product family after the dependencies are checked";
  }
}

function roleRealWorldJobs(role: ProductSalesHelperRole): string[] {
  switch (role) {
    case "audio":
      return [
        "Drive the loudspeakers or audio zone the rest of the room depends on.",
        "Translate speaker quantity, impedance or 70V/100V taps into a quoteable amplifier choice.",
        "Confirm whether the user needs simple audio, DSP integration, Dante/AES67, mute control or remote level control.",
      ];
    case "networkhd":
      return [
        "Put AV sources and displays onto the network so routing can be changed without rewiring the building.",
        "Support larger or growing systems where fixed input/output counts would become restrictive.",
        "Expose the network design questions early: switches, controller, VLANs, bandwidth, latency and who owns configuration.",
      ];
    case "matrix":
      return [
        "Take several sources in the rack and route them to several known displays.",
        "Keep a contained room, bar, venue or house system simpler than a networked AV design.",
        "Bring HDBaseT receiver, distance, audio breakout and control requirements into the quote conversation.",
      ];
    case "presentation":
      return [
        "Give users a reliable way to connect laptops by HDMI, USB-C, wireless sharing or a mix.",
        "Keep the room focused on presenting content rather than multi-room routing.",
        "Find out whether this is presentation-only, BYOD/BYOM conferencing, or a room that also needs a camera and USB path.",
      ];
    case "uc":
      return [
        "Connect the camera, microphone, speaker and host computer path so meetings actually work in the room.",
        "Clarify whether the user is bringing a laptop, using a room PC, using Teams/Zoom hardware or mixing modes.",
        "Check USB version, host location, cable distance and certified-platform expectations before quote.",
      ];
    case "extender":
      return [
        "Move HDMI or AV signals between a source and display when a direct cable is not practical.",
        "Carry the supporting signals the room needs, such as IR, RS-232, Ethernet, USB, audio or power.",
        "Validate the transmitter/receiver pairing and cable path before treating it as a simple add-on.",
      ];
    case "camera":
      return [
        "Frame the room so remote participants or viewers can actually see the people or content that matters.",
        "Match the camera output to the rest of the system: USB, HDMI, NDI or a bridge/switcher input.",
        "Confirm room size, mounting position, field of view and whether tracking or PTZ presets are needed.",
      ];
    case "videoWall":
      return [
        "Create the display canvas, layout presets or per-screen content the customer expects from the wall.",
        "Separate video-wall processing from basic source switching early in the conversation.",
        "Confirm wall size, source count, aspect ratio, bezel/LED processor behaviour and control method.",
      ];
    case "multiview":
      return [
        "Show several sources on one screen at the same time for monitoring or confidence viewing.",
        "Clarify whether the customer needs fixed layouts, live layout changes or simply multiple outputs.",
        "Confirm where the multiview output goes: display, projector, recorder, streamer or LED processor.",
      ];
    case "control":
      return [
        "Turn the room into simple repeatable actions rather than manual source, display and audio steps.",
        "Identify which devices need IP, RS-232, IR, relay or GPIO control.",
        "Confirm who will configure, maintain and support the control interface after install.",
      ];
    case "accessory":
      return [
        "Complete the parent system with the correct cable, mount, power supply, dongle or service part.",
        "Prevent small compatibility misses from becoming install-day problems.",
        "Confirm the exact host product and install condition before quoting it alone.",
      ];
    default:
      return [
        "Use the SKU as a direction, then translate the room problem into source, display, audio, USB, control and network requirements.",
        "Check the product's role in the full system before treating it as a standalone answer.",
        "Use the technical detail tab to catch missing datasheet items before quote.",
      ];
  }
}

function roleUseWhen(role: ProductSalesHelperRole, product: ProductCard): string[] {
  switch (role) {
    case "audio":
      return [
        "The brief mentions speakers, ceiling audio, background music, paging, classroom voice reinforcement or meeting-room audio.",
        "You can confirm speaker type, total load, zone count and the source feeding the amplifier.",
        "Control expectations are clear enough to quote: front-panel, IP, RS-232, GPIO, DSP or touch-panel.",
      ];
    case "networkhd":
      return [
        "The system needs flexible source-to-display routing across rooms, floors or future phases.",
        "The network owner can confirm switch model, bandwidth, VLAN/QoS plan and controller placement.",
        "The brief includes functions such as USB, video wall, multiview, Dante, low latency or central control.",
      ];
    case "matrix":
      return [
        "The number of sources and displays is known and unlikely to change significantly.",
        "A rack-based router with dedicated outputs is easier for the customer than a networked AV system.",
        "Cable distances, HDBaseT receivers and control paths can be confirmed before quote.",
      ];
    case "presentation":
      return [
        "The customer needs an easy front-of-room experience for guest laptops or local room sources.",
        "Wired, USB-C, HDMI or wireless sharing is part of the day-to-day user workflow.",
        "The room does not need a full matrix or NetworkHD design just to solve the presentation problem.",
      ];
    case "uc":
      return [
        "The sale is about real meetings, not only showing laptop content on a display.",
        "Camera, microphone, speaker and host-computer ownership can be mapped clearly.",
        "The customer can state whether the room is BYOD, BYOM, room PC, appliance-based or mixed mode.",
      ];
    case "extender":
      return [
        "There is a clear source-to-display cable path that is too long or too awkward for direct HDMI.",
        "The install needs supporting functions such as USB, Ethernet, IR, RS-232, PoH/PoE or audio return.",
        "The transmitter, receiver and cable category can be confirmed as a matched path.",
      ];
    case "camera":
      return [
        "The meeting or teaching experience depends on how well the room is seen by remote participants.",
        "The required output format and host device are known.",
        "Mounting position, viewing angle and control/tracking expectations are part of the brief.",
      ];
    case "videoWall":
      return [
        "The customer is asking for a display wall, canvas, presets or source layouts across multiple screens.",
        "Wall size, source count and control expectations are known enough to validate the processor path.",
        "A dedicated wall processor is a cleaner fit than forcing the job through a simple switcher.",
      ];
    case "multiview":
      return [
        "A user needs to monitor several sources at the same time on one display.",
        "The multiview output destination and layout expectations are clear.",
        "The customer is not really asking for independent routed outputs or a full video wall.",
      ];
    case "control":
      return [
        "The room needs a repeatable user interface for source select, display power, audio level or room mode.",
        "The controlled devices and protocols are known.",
        "Someone can own configuration, updates and support after installation.",
      ];
    case "accessory":
      return [
        "The parent product and compatibility path are known.",
        "The accessory solves a specific install, service, power, mounting or connection need.",
        "It is being quoted with the main system rather than sold as a vague catch-all item.",
      ];
    default:
      return [
        `The requirement genuinely maps to ${product.family} rather than a neighbouring product family.`,
        "The source, display, USB, audio, control and network dependencies have been checked.",
        "The customer can explain the real user workflow, not just a requested part number.",
      ];
  }
}

function roleAvoidWhen(role: ProductSalesHelperRole): string[] {
  switch (role) {
    case "audio":
      return [
        "Speaker impedance, tap settings, zone count or total load are unknown.",
        "The room needs DSP, conferencing echo cancellation or certified UC audio that this SKU does not provide by itself.",
      ];
    case "networkhd":
      return [
        "The network cannot be specified, configured or owned by the AV team or IT partner.",
        "The job is a small fixed I/O room where a matrix, extender or presentation switcher is cleaner.",
      ];
    case "matrix":
      return [
        "The source/display count is likely to change or the customer wants flexible routing across many rooms.",
        "The customer actually needs AV-over-IP features such as scalable routing, video wall zones or network distribution.",
      ];
    case "presentation":
      return [
        "The requirement is really a certified UC appliance, room video bar or managed Teams/Zoom room.",
        "The customer needs multi-room routing, independent display routing or a large distributed system.",
      ];
    case "uc":
      return [
        "The job is only laptop-to-screen presentation with no camera, microphone or call workflow.",
        "Platform certification, USB cable distance or host ownership cannot be confirmed.",
      ];
    case "extender":
      return [
        "The customer needs many-to-many routing rather than one source to one display.",
        "Cable distance, cable quality or transmitter/receiver pairing is uncertain.",
      ];
    case "camera":
      return [
        "The room already has an approved camera path and this SKU is being added only because the word conferencing appears.",
        "Mounting, field of view, output type or host integration are unknown.",
      ];
    case "videoWall":
      return [
        "The customer only needs one display or mirrored displays.",
        "The required layouts, canvas size or source count are not understood.",
      ];
    case "multiview":
      return [
        "The customer needs independent outputs rather than several sources on one output.",
        "The destination device, layout or control expectation is unknown.",
      ];
    case "control":
      return [
        "Nobody has identified the controlled devices or supported control protocols.",
        "The customer needs custom automation beyond the product or project scope.",
      ];
    case "accessory":
      return [
        "The parent SKU or compatibility path is not known.",
        "It is being used to answer the main system requirement instead of completing a known design.",
      ];
    default:
      return [
        "The SKU is only being chosen because it sounds close to the requirement.",
        "The technical detail panel is missing the values the quote depends on.",
      ];
  }
}

function roleDiscoveryQuestions(role: ProductSalesHelperRole): string[] {
  switch (role) {
    case "audio":
      return [
        "What speaker type and quantity are we driving, and is it Low Z, 70V/100V or mixed?",
        "How many audio zones are required, and do they need independent level or source control?",
        "What is feeding the amplifier: HDMI audio, analogue, DSP, Dante/AES67 or a microphone system?",
      ];
    case "networkhd":
      return [
        "How many sources and displays are needed now, and what growth should we design for?",
        "Who owns the network switch configuration, VLANs, bandwidth and controller placement?",
        "Do they need USB, video wall, multiview, Dante, low latency or control integration?",
      ];
    case "matrix":
      return [
        "How many independent sources and displays are required, not including local monitor loops?",
        "Which displays are local HDMI and which need HDBaseT receivers or longer cable runs?",
        "What control method does the customer expect: front panel, IR, RS-232, IP or touch panel?",
      ];
    case "presentation":
      return [
        "How do users connect in a normal week: HDMI, USB-C, wireless, guest laptop, room PC or all of these?",
        "Is this room presentation-only, or does it also need BYOD/BYOM conferencing with camera and USB devices?",
        "How many displays are in the room, and do outputs need to mirror or behave independently?",
        "Does IT allow wireless sharing, and are there required wireless platforms or network policies?",
      ];
    case "uc":
      return [
        "Is the customer bringing a laptop, using a room PC, using a Teams/Zoom appliance or mixing workflows?",
        "Where are the camera, microphone, speaker and USB host located?",
        "What USB version and cable distance does the room need?",
        "Is platform certification or managed-room behaviour required?",
      ];
    case "extender":
      return [
        "What source is being extended to what display, and how far apart are they?",
        "What else must travel with video: USB, IR, RS-232, Ethernet, audio or power?",
        "What cable type and condition is available in the route?",
      ];
    case "camera":
      return [
        "How large is the room and where will the camera be mounted?",
        "What output does the host system need: USB, HDMI, NDI or another bridge path?",
        "Do they need PTZ presets, speaker tracking, auto-framing or a fixed shot?",
      ];
    case "videoWall":
      return [
        "What is the wall size, display type and aspect ratio?",
        "Do they need one full image, fixed presets, multiple sources or per-screen content?",
        "How will the wall be controlled day to day?",
      ];
    case "multiview":
      return [
        "How many sources need to be visible on one screen at the same time?",
        "Does the user need fixed layouts or live layout changes?",
        "Where does the multiview output go: monitor, projector, recorder, streamer or processor?",
      ];
    case "control":
      return [
        "Which devices need to be controlled and by what protocols?",
        "What actions should the user see: present, call, source select, room on/off or presets?",
        "Who will configure and support the system after handover?",
      ];
    case "accessory":
      return [
        "Which parent SKU is this accessory being used with?",
        "What exact function is it completing: power, mounting, cable, USB, service access or adapter?",
        "Is the required length, connector, region or compatibility confirmed?",
      ];
    default:
      return [
        "What real room problem is this SKU solving?",
        "How many sources, displays and users are involved?",
        "Is USB, audio, control, network or platform certification part of the requirement?",
      ];
  }
}

function roleProofPoints(role: ProductSalesHelperRole, product: ProductCard): string[] {
  switch (role) {
    case "presentation":
      return [
        "Keeps the sale anchored on user workflow: connect, present, share, leave.",
        "Useful when the room needs presentation switching without the cost or complexity of full routing infrastructure.",
      ];
    case "uc":
      return [
        "Keeps camera, audio and USB ownership in the conversation instead of only counting HDMI inputs.",
        "Helps separate a real collaboration room from a presentation-only room.",
      ];
    case "networkhd":
      return [
        "Scales better than fixed I/O when the project needs flexible routing or future expansion.",
        "Forces the network and controller dependencies to be qualified before quote.",
      ];
    case "matrix":
      return [
        "A strong direction when the system has known fixed I/O and a clear rack-to-display topology.",
        "Keeps the install understandable for contained spaces that do not need networked AV.",
      ];
    case "audio":
      return [
        "Makes the quote depend on real speaker load and source/control requirements, not guesswork.",
        "Helps catch 70V/100V, Low Z and zone-count mistakes before install.",
      ];
    case "extender":
      return [
        "Good fit when the job is distance and signal transport rather than source routing.",
        "The right questions quickly reveal whether USB, control, power or audio pass-through changes the SKU choice.",
      ];
    case "camera":
      return [
        "Keeps the discussion tied to room coverage and host compatibility.",
        "Avoids selling a camera before field of view, mounting and output path are understood.",
      ];
    case "videoWall":
      return [
        "Moves the conversation from screen count to canvas, layouts, source count and control.",
        "Helps avoid under-specifying a wall with a simple switcher.",
      ];
    case "multiview":
      return [
        "Clear fit when the user needs simultaneous monitoring on one output.",
        "Separates multiview from independent routed outputs or video-wall processing.",
      ];
    case "control":
      return [
        "Turns a technical pile of devices into simple repeatable room actions.",
        "Forces device protocol and support ownership to be confirmed.",
      ];
    case "accessory":
      return [
        "Reduces install friction by checking compatibility with the parent SKU.",
        "Keeps accessories attached to a real system need rather than quoted in isolation.",
      ];
    default:
      return [
        `Treat ${product.sku} as a direction until the application and dependencies are confirmed.`,
        "The strongest sales proof is the fit between the SKU, the user workflow and the missing technical checks.",
      ];
  }
}

function roleSpecificationWatchOuts(
  role: ProductSalesHelperRole,
  productChecks: string[],
): string[] {
  const generalChecks = [
    ...productChecks,
    "If the detail panel does not show the values the quote depends on, treat that as a datasheet check before committing the SKU.",
  ];

  switch (role) {
    case "presentation":
      return unique([
        "Confirm actual input mix, wireless policy, USB path, display output behaviour and whether conferencing is part of the same room.",
        "Do not assume a presentation switcher replaces a UC appliance, matrix or NetworkHD design.",
        ...generalChecks,
      ]);
    case "uc":
      return unique([
        "Confirm host mode, USB version, cable distance, camera/mic/speaker ownership and platform certification expectations.",
        "Do not quote from the word conferencing alone; map the complete BYOD/BYOM or room-PC workflow.",
        ...generalChecks,
      ]);
    case "networkhd":
      return unique([
        "Confirm series compatibility, controller, switch model, bandwidth/VLAN design, latency and any USB/Dante/video-wall requirements.",
        "Do not mix NetworkHD series or assume the customer's existing network is ready without evidence.",
        ...generalChecks,
      ]);
    case "matrix":
      return unique([
        "Confirm true independent source/display count, HDBaseT receiver need, distance, audio breakout and control method.",
        "Do not count mirrored or local monitor outputs as independent routed outputs.",
        ...generalChecks,
      ]);
    case "audio":
      return unique([
        "Confirm speaker type, impedance/tap settings, total load, zones, source type and control requirement.",
        "Do not quote power output without matching it to the loudspeaker load and install topology.",
        ...generalChecks,
      ]);
    case "extender":
      return unique([
        "Confirm transmitter/receiver pairing, cable category, distance, resolution, power method and required pass-through signals.",
        "Do not treat every extender as interchangeable; USB, control, Ethernet and audio support vary by SKU.",
        ...generalChecks,
      ]);
    case "camera":
      return unique([
        "Confirm output type, host compatibility, room size, mounting position, field of view, tracking and control expectations.",
        "Do not quote the camera without knowing how it lands in the meeting, AV or streaming chain.",
        ...generalChecks,
      ]);
    case "videoWall":
      return unique([
        "Confirm wall size, canvas/layouts, source count, display/LED processor behaviour, scaling and control.",
        "Do not assume a video wall means simple mirrored outputs.",
        ...generalChecks,
      ]);
    case "multiview":
      return unique([
        "Confirm input count, output destination, layout control and whether the customer actually needs independent routed outputs instead.",
        "Do not confuse multiview monitoring with matrix routing or video-wall processing.",
        ...generalChecks,
      ]);
    case "control":
      return unique([
        "Confirm device protocols, required user actions, configuration ownership and support responsibility.",
        "Do not quote control until the controlled devices and desired room states are known.",
        ...generalChecks,
      ]);
    case "accessory":
      return unique([
        "Confirm parent SKU compatibility, exact connector/region/length/mounting need and whether it is included elsewhere.",
        "Do not let an accessory stand in for the main system solution.",
        ...generalChecks,
      ]);
    default:
      return unique(generalChecks);
  }
}

function buildProductSalesHelperCopy(
  product: ProductCard,
  knownApplication: string,
  productChecks: string[],
): ProductSalesHelperCopy {
  const role = productRoleForSalesHelper(product);
  const application = cleanText(knownApplication) || "this opportunity";
  const plainDescription =
    usefulProductLine(product.description) ||
    usefulProductLine(product.fit) ||
    `${product.sku} is a ${product.family.toLowerCase()} product direction.`;
  const fitLine =
    usefulProductLine(product.fit) ||
    usefulProductLine(product.openingLine) ||
    plainDescription;
  const roleQuestions = roleDiscoveryQuestions(role);
  const discoveryQuestions = unique([
    ...(product.questions || []),
    ...roleQuestions,
    ...productChecks,
  ]).slice(0, 7);
  const firstQuestion =
    discoveryQuestions[0] ||
    "What does the room need to do for the user on a normal day?";

  return {
    whatItDoes: `${product.sku} is ${roleName(role, product)}. ${plainDescription} In salesperson terms, it is there for ${roleJobLine(role)}`,
    realWorldJobs: unique([
      ...roleRealWorldJobs(role),
      `In the product record, the useful starting point is: ${fitLine}`,
    ]).slice(0, 4),
    specWatchOuts: roleSpecificationWatchOuts(role, productChecks).slice(0, 5),
    fitHere: `${product.sku} fits ${application} when ${roleFitTrigger(role)}. ${fitLine} Treat it as a strong direction, not a final quote line, until the checks below are answered.`,
    useWhen: roleUseWhen(role, product).slice(0, 4),
    avoidWhen: roleAvoidWhen(role).slice(0, 3),
    sayThis: `${usefulProductLine(product.openingLine) || fitLine} Then qualify it plainly: "${firstQuestion}"`,
    proofPoints: unique([
      ...roleProofPoints(role, product),
      ...(product.proofPoints || []),
    ]).slice(0, 5),
    discoveryQuestions,
  };
}

function toProductCard(seed: ProductSeed): ProductCard {
  const sku = normaliseSku(seed.sku);
  const overlay = CURATED[sku] || {};
  const story = getProductStory(sku);
  const storyProofPoints = story
    ? [
        ...story.keyFeatures,
        ...productStoryRelatedText(story),
        ...story.quoteChecks,
      ]
    : undefined;
  const storyTags = story
    ? [
        story.family,
        story.category,
        story.productType,
        ...story.idealApplications,
      ]
    : [];
  const positioningCard = getBestProductPositioningCardForSku(sku);

  const narrative = narrativeForSeed(seed);

  const family = cleanText(story?.family) || cleanText(overlay.family) || cleanText(seed.family) || classify(seed);
  const category = cleanText(story?.category) || cleanText(overlay.category) || cleanText(seed.category) || family;
  const name = cleanText(story?.plainEnglishName) || cleanText(overlay.name) || cleanText(seed.name) || sku;
  // Plain "what it is" from the engine wins over the raw marketing description
  // (e.g. "Part of the latest generation of... for the latest generation of...").
  const description =
    cleanText(story?.whatItIs) ||
    cleanText(overlay.description) ||
    cleanText(positioningCard?.oneMinuteBrief) ||
    cleanText(narrative?.whatItIs) ||
    cleanText(seed.description) ||
    `${name} from the Wingman product index.`;

  const base: ProductCard = {
    sku,
    name,
    family,
    category,
    description,
    fit:
      cleanText(story?.whatItDoes) ||
      cleanText(overlay.fit) ||
      cleanText(positioningCard?.oneMinuteBrief) ||
      cleanText(positioningCard?.oneLinePositioning) ||
      cleanText(seed.fit) ||
      cleanText(narrative?.whyItHelps) ||
      `Use this when the customer requirement matches ${family.toLowerCase()} applications. Confirm I/O, signal distance, USB, audio, control and network dependencies before quoting.`,
    // Sales-focused talk track: hand-authored story/overlay first, then the
    // engine's "say it like this" wording, then (only as a last resort) the
    // weak enriched seed copy.
    openingLine:
      cleanText(story?.oneLinePosition) ||
      cleanText(story?.salesTalkTrack) ||
      cleanText(overlay.openingLine) ||
      cleanText(positioningCard?.followUpWording) ||
      cleanText(positioningCard?.oneMinuteBrief) ||
      cleanText(narrative?.suggestedWording) ||
      cleanText(seed.openingLine) ||
      `${sku} is a ${family.toLowerCase()} product direction. Use it as a starting point, then validate the room requirement before making a firm recommendation.`,
    questions:
      (story?.discoveryQuestions?.length ? story.discoveryQuestions : undefined) ||
      (overlay.questions?.length ? overlay.questions : undefined) ||
      (positioningCard?.openingQuestions?.length ? positioningCard.openingQuestions : undefined) ||
      (positioningCard?.qualificationQuestions?.length ? positioningCard.qualificationQuestions : undefined) ||
      (narrative?.askNow?.length ? narrative.askNow : undefined) ||
      seed.questions ||
      [],
    proofPoints:
      storyProofPoints ||
      (positioningCard
        ? [
            positioningCard.salientPoint,
            ...positioningCard.wyrestormFit,
            ...positioningCard.reviewGates,
          ]
        : undefined) ||
      overlay.proofPoints ||
      seed.proofPoints || [
        "Pulled from the Wingman product intelligence data.",
        "Use this as a product direction until the requirement is validated.",
        "Confirm dependencies before quoting.",
      ],
    tags: unique([
      ...(seed.tags || []),
      ...((overlay.tags as string[] | undefined) || []),
      ...storyTags,
      ...(positioningCard
        ? [
            positioningCard.productFamily,
            positioningCard.technologyType,
            ...positioningCard.bestFitApplications,
          ]
        : []),
      family,
      category,
    ]),
    headings: [],
    sourceSearchText: "",
    curated: Boolean(CURATED[sku] || story),
    technicalProfile: seed.technicalProfile,
    sourceCatalog: seed.sourceCatalog,
  };

  const classificationSource = {
    ...seed,
    sku,
    name,
    family,
    category,
    productType: cleanText(story?.productType) || cleanText(seed.productType),
    description,
    tags: base.tags,
    applications: story?.idealApplications?.length ? story.idealApplications : seed.applications,
  };

  base.headings = classifyProductCallCard(classificationSource);
  base.sourceSearchText = productCallCardClassificationText(classificationSource);

  if (base.questions.length === 0) {
    base.questions = questionsFor(base);
  }

  return base;
}

// Renders only the technical fields that actually have sourced evidence -
// no "N/A" placeholder rows for gaps in the underlying data.
function technicalProfileRows(profile: unknown): Array<{ label: string; value: string }> {
  if (!profile || typeof profile !== "object") {
    return [];
  }

  const p = profile as Record<string, unknown>;
  const rows: Array<{ label: string; value: string }> = [];

  const asRecord = (value: unknown): Record<string, unknown> | undefined =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((item) => cleanText(String(item))).filter(Boolean) : [];
  const joinUnique = (values: string[]): string => unique(values).join(", ");

  const video = asRecord(p.video);
  if (video?.present) {
    const bits = joinUnique([
      ...asStringArray(video.standards),
      ...asStringArray(video.maxResolutions),
      ...asStringArray(video.bandwidth),
    ]);
    if (bits) {
      rows.push({ label: "Resolution / HDMI", value: bits });
    }
  }

  const hdbaset = asRecord(p.hdbaset);
  if (hdbaset?.present) {
    const bits = joinUnique([
      hdbaset.version ? `HDBaseT ${cleanText(String(hdbaset.version))}` : "",
      ...asStringArray(hdbaset.distance),
    ]);
    if (bits) {
      rows.push({ label: "HDBaseT", value: bits });
    }
  }

  const usb = asRecord(p.usb);
  if (usb?.present) {
    const bits = joinUnique([
      ...asStringArray(usb.versions),
      ...asStringArray(usb.connectors),
      ...asStringArray(usb.roles),
      usb.powerDelivery ? "Power delivery" : "",
    ]);
    if (bits) {
      rows.push({ label: "USB", value: bits });
    }
  }

  const network = asRecord(p.network);
  if (network?.present) {
    const bits = joinUnique([
      ...asStringArray(network.protocols),
      ...asStringArray(network.linkSpeeds),
      ...asStringArray(network.powerOverNetwork),
    ]);
    if (bits) {
      rows.push({ label: "Network", value: bits });
    }
  }

  const control = asRecord(p.control);
  if (control?.present) {
    const bits = joinUnique(asStringArray(control.protocols));
    if (bits) {
      rows.push({ label: "Control protocols", value: bits });
    }
  }

  const audio = asRecord(p.audio);
  if (audio?.present) {
    const bits = joinUnique([
      ...asStringArray(audio.formats),
      ...asStringArray(audio.networkAudio),
      ...asStringArray(audio.processing),
    ]);
    if (bits) {
      rows.push({ label: "Audio", value: bits });
    }
  }

  const features = Array.isArray(p.features) ? p.features : [];
  const featureLabels = features
    .map((feature) => (feature && typeof feature === "object" ? cleanText(String((feature as Record<string, unknown>).label ?? "")) : cleanText(String(feature))))
    .filter(Boolean);

  const wirelessCasting = featureLabels.filter((label) => /wireless|airplay|miracast|chromecast/i.test(label));
  if (wirelessCasting.length) {
    rows.push({ label: "Wireless casting", value: joinUnique(wirelessCasting) });
  }

  const multiview = featureLabels.filter((label) => /multi[-\s]?view/i.test(label));
  if (multiview.length) {
    rows.push({ label: "Multiview", value: joinUnique(multiview) });
  }

  const io = asRecord(p.io);
  const ports = Array.isArray(io?.ports) ? (io?.ports as Array<Record<string, unknown>>) : [];
  if (ports.length) {
    const portSummary = joinUnique(
      ports.map((port) => `${cleanText(String(port.count ?? ""))}x ${cleanText(String(port.connector ?? ""))}`.trim()),
    );
    if (portSummary) {
      rows.push({ label: "I/O ports", value: portSummary });
    }
  }

  return rows;
}

function isProductSeed(value: unknown): value is ProductSeed {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Boolean(cleanText(record.sku));
}

function extractProductSeeds(value: unknown): ProductSeed[] {
  if (Array.isArray(value)) {
    return value.filter(isProductSeed);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const payload = value as ProductPayload;

  if (Array.isArray(payload.products)) {
    return payload.products.filter(isProductSeed);
  }

  return [];
}

// The product-call-card-products.json generator merges in new SKUs but never
// refreshes fields on entries that already exist, so it never carries the
// richer technicalProfile/sourceCatalog data added to the product
// intelligence index later. Merge those two fields in by SKU from the
// intelligence index so "Technical detail" has real data to show, without
// disturbing the curated call-card copy those seeds already carry.
function mergeTechnicalData(seeds: ProductSeed[], enrichedSeeds: ProductSeed[]): ProductSeed[] {
  if (enrichedSeeds.length === 0) {
    return seeds;
  }

  const enrichedBySku = new Map<string, ProductSeed>();
  for (const enriched of enrichedSeeds) {
    const sku = normaliseSku(enriched.sku);
    if (sku) {
      enrichedBySku.set(sku, enriched);
    }
  }

  return seeds.map((seed) => {
    if (seed.technicalProfile) {
      return seed;
    }
    const enriched = enrichedBySku.get(normaliseSku(seed.sku));
    if (!enriched) {
      return seed;
    }
    return {
      ...seed,
      technicalProfile: enriched.technicalProfile,
      sourceCatalog: enriched.sourceCatalog,
    };
  });
}

async function loadProductSeeds(): Promise<ProductSeed[]> {
  let intelligenceSeeds: ProductSeed[] = [];

  try {
    const payload = await loadProductIntelligenceIndex();
    intelligenceSeeds = extractProductSeeds(payload);
  } catch {
    // Fall through to curated fallback products.
  }

  let enrichmentSeeds: ProductSeed[] = [];
  try {
    const response = await fetch(PRODUCT_CALL_CARD_ENDPOINT, { cache: "no-store" });

    if (response.ok) {
      const payload = await response.json();
      enrichmentSeeds = extractProductSeeds(payload);
    }
  } catch {
    // The call-card overlay is enrichment only; keep the governed catalogue.
  }

  if (intelligenceSeeds.length > 0) {
    return mergeTechnicalData(intelligenceSeeds, enrichmentSeeds);
  }

  if (enrichmentSeeds.length > 0) {
    return mergeTechnicalData(enrichmentSeeds, []);
  }

  return FALLBACK_PRODUCTS;
}

function matchesFamily(product: ProductCard, family: string): boolean {
  if (family === "All") {
    return true;
  }

  return product.headings.includes(family as ClassifiedProductCallCardHeading);
}

function productPresentationMatches(product: ProductCard, query: string, family: string, quickFinder: string): boolean {
  const firstSkuChar = product.sku.charAt(0).toUpperCase();

  if (quickFinder === "0-9" && !/^[0-9]$/.test(firstSkuChar)) {
    return false;
  }

  if (quickFinder !== "All" && quickFinder !== "0-9" && firstSkuChar !== quickFinder) {
    return false;
  }

  const haystack = [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.description,
    product.fit,
    product.openingLine,
    ...product.questions,
    ...product.proofPoints,
    ...product.tags,
    product.sourceSearchText,
  ]
    .join(" ")
    .toLowerCase();

  if (!matchesFamily(product, family)) {
    return false;
  }

  if (!query.trim()) {
    return true;
  }

  return haystack.includes(query.trim().toLowerCase());
}

function getSkuFromPath(): string {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";

  if (last === "select" || last === "product-call-cards") {
    return "";
  }

  return normaliseSku(decodeURIComponent(last));
}

function goTo(path: string): void {
  window.location.assign(path);
}

export default function ProductCallCardsPage() {
  const pathSku = getSkuFromPath();

  const [products, setProducts] = useState<ProductCard[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFamily, setActiveFamily] = useState("All");
  const [activeQuickFinder, setActiveQuickFinder] = useState("All");
  const [selectedSku, setSelectedSku] = useState(pathSku);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeProductPanel, setActiveProductPanel] = useState<ProductPanelId>("whatItIs");
  const [activeGalleryItem, setActiveGalleryItem] = useState<ProductGalleryItem | null>(null);
  const [activeTermLookup, setActiveTermLookup] = useState<QuickTermLookup | null>(null);
  const [conversationToneId, setConversationToneId] = useState<SalesConversationToneId>(
    readStoredSalesConversationToneId,
  );

  useEffect(() => {
    setProductTermLookup = setActiveTermLookup;


return () => {
      setProductTermLookup = null;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      const seeds = await loadProductSeeds();

      if (!active) {
        return;
      }

      const cards = dedupeProductSeedsBySku(seeds)
        .map(toProductCard)
        .filter((product) => product.sku)
        .sort((a, b) => a.sku.localeCompare(b.sku));

      setProducts(cards);
      setIsFallback(seeds === FALLBACK_PRODUCTS);

      if (pathSku && cards.some((product) => product.sku === pathSku)) {
        setSelectedSku(pathSku);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [pathSku]);

  useEffect(() => {
    setPageIndex(0);
  }, [query, activeFamily, activeQuickFinder]);

  const availableQuickFinders = useMemo(() => {
    const available = new Set<string>();
    available.add("All");

    const governedProducts = selectWingmanProducts(products, {
      mode: "call-card",
      query,
      includeBrowseOnly: true,
    })
      .filter((decision) => decision.eligible)
      .map((decision) => decision.product);

    governedProducts
      .filter((product) => productPresentationMatches(product, query, activeFamily, "All"))
      .forEach((product) => {
        const firstSkuChar = product.sku.charAt(0).toUpperCase();

        if (/^[0-9]$/.test(firstSkuChar)) {
          available.add("0-9");
          return;
        }

        if (/^[A-Z]$/.test(firstSkuChar)) {
          available.add(firstSkuChar);
        }
      });

    return available;
  }, [products, query, activeFamily]);

  useEffect(() => {
    if (activeQuickFinder === "All") {
      return;
    }

    if (availableQuickFinders.has(activeQuickFinder)) {
      return;
    }

    setActiveQuickFinder("All");
  }, [activeQuickFinder, availableQuickFinders]);

  const filteredProducts = useMemo(() => {
    const governedProducts = selectWingmanProducts(products, {
      mode: "call-card",
      query,
      includeBrowseOnly: true,
    })
      .filter((decision) => decision.eligible)
      .map((decision) => decision.product);

    return governedProducts.filter((product) => productPresentationMatches(product, query, activeFamily, activeQuickFinder));
  }, [products, query, activeFamily, activeQuickFinder]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageProducts = filteredProducts.slice(safePageIndex * PAGE_SIZE, safePageIndex * PAGE_SIZE + PAGE_SIZE);

  const selectedProduct =
    products.find((product) => product.sku === selectedSku) ||
    pageProducts[0] ||
    filteredProducts[0] ||
    null;
  const competitorLandscape = useMemo(
    () => (selectedProduct ? getCompetitorLandscape(selectedProduct) : null),
    [selectedProduct],
  );
  const knownApplication = useMemo(() => {
    const project = getCurrentWorkflowProject(readProjectStore());
    const roomModel = project?.discoveryBrief?.roomModel;
    const values = [roomModel?.roomType, roomModel?.outcome, roomModel?.application]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim())
      .filter((value, index, all) => all.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index)
      .slice(0, 2);

    return values.join(" - ");
  }, []);
  const selectedPositioningCard = useMemo(
    () => (selectedProduct ? getBestProductPositioningCardForSku(selectedProduct.sku) : undefined),
    [selectedProduct],
  );
  const commercialOverride = useMemo(
    () => (selectedProduct ? getProductCallCommercialOverride(selectedProduct.sku) : null),
    [selectedProduct],
  );
  const conversationToneCopy = useMemo(
    () => buildSalesConversationToneCopy("callCards", conversationToneId),
    [conversationToneId],
  );

  function selectConversationTone(toneId: SalesConversationToneId): void {
    setConversationToneId(toneId);

    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(SALES_CONVERSATION_TYPE_STORAGE_KEY, toneId);
    } catch {
      // Storage may be unavailable (private browsing, quota).
    }
  }

  const productChecks = useMemo(() => {
    if (!selectedProduct) {
      return [];
    }

    const positionedChecks = [
      ...(selectedPositioningCard?.technicalCheckQuestions || []),
      ...(selectedPositioningCard?.reviewGates || []),
    ];

    if (positionedChecks.length > 0) {
      return unique(positionedChecks).slice(0, 4);
    }

    const sku = selectedProduct.sku.toUpperCase();
    const family = `${selectedProduct.family} ${selectedProduct.category}`.toLowerCase();

    if (sku.startsWith("AMP-") || family.includes("audio") || family.includes("amplifier")) {
      return [
        "Confirm speaker type: Low Z, High Z / 70V / 100V, or mixed.",
        "Confirm speaker quantity, speaker load and how many audio zones are required.",
        "Confirm the audio source: local analogue, Dante, AES67, HDMI audio breakout or DSP output.",
        "Check whether DSP, RS-232, GPIO, trigger input or network control is required.",
      ];
    }

    if (sku.startsWith("NHD-")) {
      return [
        "Confirm whether this is a new NetworkHD system or an addition to an existing system.",
        "Confirm the required NetworkHD series; do not assume cross-series interoperability.",
        "Confirm source count, display count, NHD controller and network switch requirements.",
        "Check whether USB, multiview, video wall, Dante or low-latency operation is required.",
      ];
    }

    if (sku.startsWith("MX-") || sku.startsWith("MXV-")) {
      return [
        "Confirm real source count and display count before assuming the matrix size is correct.",
        "Confirm independent routed outputs versus mirrored, loop or local monitor outputs.",
        "Confirm HDBaseT receiver requirement, cable distance and cable quality.",
        "Check whether audio breakout, IR, RS-232, ARC/eARC or IP control is required.",
      ];
    }

    if (sku.startsWith("SW-0204-VW") || sku.startsWith("SW-0206-VW")) {
      return [
        "Confirm wall type: LCD wall, LED processor input, projector blend or other display canvas.",
        "Confirm source count and required layouts.",
      "Check whether the customer needs fixed presets, full canvas, multiview or per-display content.",
        "Confirm whether a dedicated processor is better than an AV-over-IP wall approach.",
      ];
    }

    if (sku === "NHD-0401-MV" || family.includes("multiview")) {
      return [
        "Confirm how many sources need to appear on the same output at the same time.",
        "Confirm whether the output feeds a display, projector, recorder, streamer or LED processor.",
      "Check whether the customer needs fixed layouts or live layout control.",
        "Do not confuse multiview with simply having multiple HDMI outputs.",
      ];
    }

    if (sku.startsWith("SW-") || family.includes("presentation")) {
      return [
      "Confirm how people connect: HDMI, USB-C, wireless or a mix.",
        "Confirm whether the room is presentation-only, BYOD/BYOM conferencing or mixed use.",
        "Confirm display count and whether the outputs need mirrored or independent behaviour.",
        "Check whether USB device switching, room control or touch-panel operation is required.",
      ];
    }

    if (sku.startsWith("APO-") || family.includes("usb") || family.includes("uc")) {
      return [
        "Confirm whether the workflow is BYOD, BYOM, room PC, Teams appliance or mixed use.",
        "Confirm camera, microphone, speakerphone and USB host location.",
        "Check USB version, cable distance and whether USB switching or extension is required.",
        "Confirm whether wireless presentation or a dongle workflow is part of the requirement.",
      ];
    }

    if (sku.startsWith("EX-") || family.includes("hdbaset") || family.includes("extender")) {
      return [
        "Confirm point-to-point source and display locations.",
        "Confirm cable distance, cable quality and required video format.",
        "Check whether PoH/PoE, IR, RS-232, Ethernet pass-through or audio breakout is required.",
        "Confirm transmitter/receiver pairing before specifying.",
      ];
    }

    if (sku.startsWith("CAB-") || sku.startsWith("CBL-") || family.includes("cable") || family.includes("accessory")) {
      return [
        "Confirm the parent product or device this accessory is being used with.",
        "Confirm connector type, cable length and installation route.",
        "Check whether the required function is video, USB data, charging, power, mounting or service access.",
        "Do not position an accessory as the main system solution.",
      ];
    }

    if (sku.startsWith("CAM-") || family.includes("camera")) {
      return [
        "Confirm camera output type: USB, HDMI, NDI or mixed.",
        "Confirm room size, camera position and required field of view.",
        "Check whether PTZ control, presets, tracking or camera bridge/mixer support is required.",
        "Confirm how the camera connects into the UC, AV or streaming workflow.",
      ];
    }

    if (sku.startsWith("SYN-") || family.includes("control")) {
      return [
        "Confirm which devices need to be controlled.",
        "Confirm control method: IP, RS-232, IR, relay or GPIO.",
      "Check whether the customer needs simple presets, room mode selection or full device control.",
        "Confirm who will configure and maintain the control interface.",
      ];
    }

    return [
      "Confirm the parent application for this product.",
      "Confirm what device or system it must connect to.",
      "Check source, display, audio, USB, control and power dependencies before adding it to a project.",
    ];
  }, [selectedPositioningCard, selectedProduct]);

  const salesHelperCopy = useMemo(
    () => (selectedProduct ? buildProductSalesHelperCopy(selectedProduct, knownApplication, productChecks) : null),
    [knownApplication, productChecks, selectedProduct],
  );

  const productSpecificationRows = useMemo(() => {
    if (!selectedProduct) {
      return [];
    }

    const rows: Array<{ label: string; value: string }> = [
      { label: "SKU", value: selectedProduct.sku },
      { label: "Family", value: selectedProduct.family },
      { label: "Category", value: selectedProduct.category },
    ];

    const matrixIo = selectedProduct.sku.toUpperCase().match(/(?:MX|MXV)-(\d{2})(\d{2})/);

    if (matrixIo) {
      rows.push({
        label: "SKU I/O guide",
        value: `${Number(matrixIo[1])} inputs / ${Number(matrixIo[2])} outputs. Confirm routed outputs versus mirrored or local outputs.`,
      });
    }

    const usefulTags = selectedProduct.tags
      .filter((tag) => tag.length <= 32)
      .slice(0, 8)
      .join(", ");

    if (usefulTags) {
      rows.push({
        label: "Useful tags",
        value: usefulTags,
      });
    }

    rows.push(...technicalProfileRows(selectedProduct.technicalProfile));

    return rows;
  }, [selectedProduct]);
  const firstVisible = filteredProducts.length === 0 ? 0 : safePageIndex * PAGE_SIZE + 1;
  const lastVisible = Math.min(filteredProducts.length, (safePageIndex + 1) * PAGE_SIZE);
  const curatedCount = products.filter((product) => product.curated).length;

  function addProductToProject(): void {
    if (!selectedProduct) {
      return;
    }

    const payload = {
      sku: selectedProduct.sku,
      name: selectedProduct.name,
      family: selectedProduct.family,
      category: selectedProduct.category,
      description: selectedProduct.description,
      fit: selectedProduct.fit,
      openingLine: selectedProduct.openingLine,
      questions: selectedProduct.questions,
      proofPoints: selectedProduct.proofPoints,
      tags: selectedProduct.tags,
      source: "product-discussion",
    };

    // Persist into the canonical project store so the product actually lands in the
    // current project (ProjectsPage reads projectStore). The sessionStorage payload is
    // kept for richer call-card context, but the store is what makes the handoff stick.
    saveProductSelectionToCurrentProject({
      sku: selectedProduct.sku,
      title: selectedProduct.name,
      family: selectedProduct.family,
      category: selectedProduct.category,
      source: "Product call cards",
    });

    try {
      window.sessionStorage.setItem("wingman.pendingProjectProduct", JSON.stringify(payload));
    } catch {
      // Continue with navigation even if storage is unavailable.
    }

    const params = new URLSearchParams();
    params.set("addSku", selectedProduct.sku);
    params.set("source", "product-discussion");

    goTo(`/wingman/projects?${params.toString()}`);
  }

  function startRoomBuilderWithProduct(): void {
    if (!selectedProduct) {
      return;
    }

    const payload = {
      sku: selectedProduct.sku,
      name: selectedProduct.name,
      family: selectedProduct.family,
      category: selectedProduct.category,
      description: selectedProduct.description,
      source: "product-discussion",
    };

    try {
      window.sessionStorage.setItem("wingman.roomBuilderSeedProduct", JSON.stringify(payload));
    } catch {
      // Continue with navigation even if storage is unavailable.
    }

    const params = new URLSearchParams();
    params.set("seedSku", selectedProduct.sku);
    params.set("source", "product-discussion");

    goTo(`/wingman/discovery?${params.toString()}`);
  }
return (
    <section className="wm-pcc-select-shell wm-ui-section">

      {activeGalleryItem && selectedProduct && (
        <div
          className="wm-pcc-gallery-modal wm-ui-title"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeGalleryItem.title} gallery view`}
        >
          <div className="wm-pcc-gallery-modal-card wm-ui-card">
            <div className="wm-pcc-gallery-modal-head">
              <div>
                <p className="wm-pcc-gallery-modal-kicker wm-ui-copy wm-ui-kicker">Product gallery</p>
                <h3 className="wm-pcc-gallery-modal-title wm-ui-title">{activeGalleryItem.title}</h3>
              </div>

              <button
                type="button"
                className="wm-pcc-gallery-modal-close wm-ui-button wm-ui-button-secondary"
                onClick={() => setActiveGalleryItem(null)}
                aria-label="Close product gallery"
              >
                ×
              </button>
            </div>

            <div className="wm-pcc-gallery-visual">
              {activeGalleryItem.imageUrl ? (
                <img src={activeGalleryItem.imageUrl} alt={activeGalleryItem.title} />
              ) : (
                <div className="wm-pcc-gallery-device-card wm-ui-card">
                  <strong>{selectedProduct.sku}</strong>
                  <span>{activeGalleryItem.label}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTermLookup && (
        <aside className="wm-pcc-guru-says-popover" role="dialog" aria-live="polite">
          <div className="wm-pcc-guru-says-head">
            <div>
              <p className="wm-pcc-guru-says-kicker wm-ui-copy wm-ui-kicker">Guru says</p>
              <h3 className="wm-pcc-guru-says-title wm-ui-title">{activeTermLookup.label}</h3>
            </div>

            <button
              type="button"
              className="wm-pcc-guru-says-close wm-ui-button wm-ui-button-secondary"
              onClick={() => setActiveTermLookup(null)}
              aria-label="Close term explanation"
            >
              ×
            </button>
          </div>

          <p className="wm-pcc-guru-says-body wm-ui-copy">{activeTermLookup.meaning}</p>
        </aside>
      )}

      <header className="wm-pcc-header wm-ui-card-header">
        <div>
          <p className="wm-pcc-eyebrow wm-ui-copy wm-ui-kicker">Wingman workspace</p>
          <h1 className="wm-pcc-title wm-ui-title">Product Discussion</h1>
          <p className="wm-pcc-subtitle wm-ui-copy">Discuss one product, then add it to a project only when needed.</p>
        </div>

        <input
          className="wm-pcc-search wm-ui-input"
          aria-label="Search WyreStorm SKU or product type"
          placeholder="Search SKU, family, product type or application..."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </header>

      <main className="wm-pcc-grid wm-ui-page wingman-page-host">
      <details className="wm-ui-card wm-pcc-workflow-guide" aria-label="Product Call Cards workflow guide">
        <summary className="wm-ui-title">How to use this call card</summary>
        <ul className="wm-ui-copy">
          {productCallCardWorkflowGuide.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
      </details>


<section className="wm-pcc-card wm-pcc-left wm-ui-section wm-ui-card">
          <div className="wm-pcc-chips">
            {PRODUCT_CALL_CARD_HEADINGS.map((family) => (
              <button className={["wm-ui-button wm-ui-button-secondary", `wm-pcc-chip ${activeFamily === family ? "wm-pcc-chip-active" : ""}`].filter(Boolean).join(" ")}
                key={family}
                type="button"
                onClick={() => setActiveFamily(family)}

              >
                {family}
              </button>
            ))}
          </div>

          <div className="wm-pcc-quick-finder" aria-label="Quick SKU finder">
            {QUICK_FINDERS.map((letter) => {
              const isQuickDisabled = letter !== "All" && !availableQuickFinders.has(letter);

              return (
                <button className={["wm-ui-button wm-ui-button-secondary", `wm-pcc-quick-button ${letter === "All" || letter === "0-9" ? "wm-pcc-quick-button-wide" : ""} ${
                    activeQuickFinder === letter ? "wm-pcc-quick-button-active" : ""
                  } ${isQuickDisabled ? "wm-pcc-quick-button-disabled" : ""}`].filter(Boolean).join(" ")}
                  key={letter}
                  type="button"
                  disabled={isQuickDisabled}
                  onClick={() => {
                    if (isQuickDisabled) {
                      return;
                    }

                    setActiveQuickFinder(letter);
                  }}

                  title={
                    isQuickDisabled
                      ? `No matching SKUs beginning with ${letter}`
                      : `Show SKUs beginning with ${letter}`
                  }
                >
                  {letter}
                </button>
              );
            })}
          </div>

          <div className="wm-pcc-status">
            <span>
              Showing {firstVisible}-{lastVisible} of {filteredProducts.length} matching · {products.length} total · {curatedCount} curated{activeQuickFinder !== "All" ? ` · ${activeQuickFinder}` : ""}
            </span>

            <div className="wm-pcc-pager">
              <button className={["wm-ui-button wm-ui-button-secondary", `wm-pcc-pager-button ${safePageIndex <= 0 ? "wm-pcc-disabled" : ""}`].filter(Boolean).join(" ")}
                type="button"
                onClick={() => setPageIndex(Math.max(0, safePageIndex - 1))}
                disabled={safePageIndex <= 0}

              >
                Previous
              </button>

              <span>Page {safePageIndex + 1} of {pageCount}</span>

              <button className={["wm-ui-button wm-ui-button-secondary", `wm-pcc-pager-button ${safePageIndex >= pageCount - 1 ? "wm-pcc-disabled" : ""}`].filter(Boolean).join(" ")}
                type="button"
                onClick={() => setPageIndex(Math.min(pageCount - 1, safePageIndex + 1))}
                disabled={safePageIndex >= pageCount - 1}

              >
                Next
              </button>
            </div>
          </div>

          {isFallback && (
            <div className="wm-pcc-warning">
              Product index was not loaded, so this page is showing the curated fallback set only.
            </div>
          )}

          <div className="wm-pcc-product-grid">
            {pageProducts.map((product) => (
              <button className={["wm-ui-button wm-ui-button-secondary", `wm-pcc-product ${selectedProduct?.sku === product.sku ? "wm-pcc-product-active" : ""}`].filter(Boolean).join(" ")}
                key={product.sku}
                type="button"
                onClick={() => {
                  setSelectedSku(product.sku);
                  setActiveTermLookup(null);
                }}

              >
                <span className="wm-pcc-sku">{product.sku}</span>
                <span className="wm-pcc-family">
                  {product.curated ? "Curated · " : ""}
                  {product.family}
                </span>

              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div className="wm-pcc-empty">
                No matching product call cards found. Try a SKU, product family or application keyword.
              </div>
            )}
          </div>
        </section>

        <aside className="wm-pcc-card wm-pcc-preview wm-ui-card">
          <div>
            <p className="wm-pcc-label wm-ui-copy">Product discussion</p>
            {selectedProduct && <h2 className="wm-pcc-preview-sku wm-ui-title">{selectedProduct.sku}</h2>}
            {selectedProduct && (
              <p className="wm-pcc-preview-family wm-ui-copy">
                {selectedProduct.family}
              </p>
            )}
          </div>

          {selectedProduct && (
            <div className="wm-pcc-gallery-strip" aria-label="Product gallery">
              {[
                {
                  id: "device",
                  title: selectedProduct.sku,
                  label: "Product identity",
                  kind: "device" as const,
                  imageUrl:
                    ((selectedProduct as ProductCard & {
                      imageUrl?: string;
                      image?: string;
                      heroImage?: string;
                      thumbnailUrl?: string;
                      productImage?: string;
                    }).imageUrl ||
                      (selectedProduct as ProductCard & {
                        imageUrl?: string;
                        image?: string;
                        heroImage?: string;
                        thumbnailUrl?: string;
                        productImage?: string;
                      }).productImage ||
                      (selectedProduct as ProductCard & {
                        imageUrl?: string;
                        image?: string;
                        heroImage?: string;
                        thumbnailUrl?: string;
                        productImage?: string;
                      }).heroImage ||
                      (selectedProduct as ProductCard & {
                        imageUrl?: string;
                        image?: string;
                        heroImage?: string;
                        thumbnailUrl?: string;
                        productImage?: string;
                      }).thumbnailUrl ||
                      (selectedProduct as ProductCard & {
                        imageUrl?: string;
                        image?: string;
                        heroImage?: string;
                        thumbnailUrl?: string;
                        productImage?: string;
                      }).image ||
                      ""),
                },
                {
                  id: "system",
                  title: "Typical use",
                  label: selectedProduct.family,
                  kind: "system" as const,
                },
                {
                  id: "connection",
                  title: "Connection focus",
                  label: selectedProduct.category,
                  kind: "connection" as const,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="wm-pcc-gallery-tile wm-ui-button wm-ui-button-secondary wm-ui-card"
                  onClick={() => setActiveGalleryItem(item)}
                >
                  <span className="wm-pcc-gallery-thumb" aria-hidden="true">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      <span className="wm-pcc-gallery-icon">
                        {item.kind === "device" ? "SKU" : item.kind === "system" ? "SYS" : "I/O"}
                      </span>
                    )}
                  </span>

                  <span>
                    <span className="wm-pcc-gallery-title wm-ui-title">{item.title}</span>
                    <span className="wm-pcc-gallery-label">{item.label}</span>
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="wm-pcc-visual-studio-button wm-ui-button wm-ui-button-secondary"
                onClick={() => {
                  if (!selectedProduct) {
                    return;
                  }

                  try {
                    window.sessionStorage.setItem(
                      "wingman.visualStudio.productSeed",
                      JSON.stringify({
                        source: "product-discussion",
                        sku: selectedProduct.sku,
                        family: selectedProduct.family,
                        category: selectedProduct.category,
                        description: selectedProduct.description,
                        questions: selectedProduct.questions,
                        proofPoints: selectedProduct.proofPoints,
                      }),
                    );
                  } catch {
                    // Continue with navigation even if storage is unavailable.
                  }

                  const params = new URLSearchParams();
                  params.set("seedSku", selectedProduct.sku);
                  params.set("source", "product-discussion");

                  goTo(`/wingman/visual-studio?${params.toString()}`);
                }}
              >
                Visualise in Studio
              </button>
            </div>
          )}
          <div className="wm-pcc-section-tabs" aria-label="Product discussion sections">
            {PRODUCT_PANEL_TABS.map((tab) => (
              <button className={["wm-ui-button wm-ui-button-secondary", [
                  "wm-pcc-section-tab",
                  tab.id !== "specification" ? "wm-pcc-section-tab-core" : "",
                  activeProductPanel === tab.id ? "wm-pcc-section-tab-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")].filter(Boolean).join(" ")}
                key={tab.id}
                type="button"
                onClick={() => setActiveProductPanel(tab.id)}
                aria-pressed={activeProductPanel === tab.id}

              >
                <strong>{tab.label}</strong>
                <span>{tab.hint}</span>
              </button>
            ))}
          </div>

          {!selectedProduct && (
            <div className="wm-pcc-empty">
              Search for a SKU or choose a product family to begin.
            </div>
          )}

          {selectedProduct && (
            <section className="wm-pcc-focus-panel wm-ui-section wm-ui-card">
              {activeProductPanel === "whatItIs" && salesHelperCopy && (
                <>
                  <h3 className="wm-pcc-section-heading wm-ui-title">What it does</h3>
                  <p className="wm-pcc-response-copy wm-ui-copy">
                    {renderWithGuruLinks(salesHelperCopy.whatItDoes, selectedProduct)}
                  </p>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Real-world jobs</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {salesHelperCopy.realWorldJobs.map((line) => (
                      <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                    ))}
                  </ul>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Specification watch-outs</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {salesHelperCopy.specWatchOuts.map((line) => (
                      <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                    ))}
                  </ul>

                  <p className="wm-pcc-response-copy wm-ui-copy">
                    <strong>Product text:</strong>{" "}
                    {renderWithGuruLinks(selectedProduct.description, selectedProduct)}
                  </p>
                </>
              )}

              {activeProductPanel === "whatItDoes" && salesHelperCopy && (
                <>
                  <h3 className="wm-pcc-section-heading wm-ui-title">How it fits here</h3>
                  <p className="wm-pcc-response-copy wm-ui-copy">
                    {renderWithGuruLinks(salesHelperCopy.fitHere, selectedProduct)}
                  </p>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Use it when</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {salesHelperCopy.useWhen.map((line) => (
                      <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                    ))}
                  </ul>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Do not lead with it when</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {salesHelperCopy.avoidWhen.map((line) => (
                      <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                    ))}
                  </ul>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Ask this next</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {salesHelperCopy.discoveryQuestions.slice(0, 4).map((line) => (
                      <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                    ))}
                  </ul>
                </>
              )}

              {activeProductPanel === "howToSell" && salesHelperCopy && (
                <>
                  <h3 className="wm-pcc-section-heading wm-ui-title">What to say</h3>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Say it like this</p>
                  <p className="wm-pcc-response-copy wm-ui-copy">
                    {renderWithGuruLinks(salesHelperCopy.sayThis, selectedProduct)}
                  </p>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Why this is credible</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {salesHelperCopy.proofPoints.slice(0, 4).map((line) => (
                      <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                    ))}
                  </ul>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Ask next</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {salesHelperCopy.discoveryQuestions.slice(0, 5).map((line) => (
                      <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                    ))}
                  </ul>

                  <div className="wm-pcc-tone-select" role="group" aria-label="Conversation tone">
                    <p className="wm-pcc-response-subhead wm-ui-copy">Frame this for</p>
                    <div className="wm-pcc-tone-options">
                      {salesConversationToneOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`wm-ui-button wm-ui-button-secondary wm-pcc-tone-button ${
                            conversationToneId === option.id ? "wm-pcc-tone-button-active" : ""
                          }`}
                          aria-pressed={conversationToneId === option.id}
                          title={option.shortDescription}
                          onClick={() => selectConversationTone(option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="wm-pcc-response-copy wm-ui-copy">{conversationToneCopy.opener}</p>
                  </div>

                  {commercialOverride?.conversationStarters?.length ? (
                    <>
                      <p className="wm-pcc-response-subhead wm-ui-copy">Conversation openers</p>
                      <ul className="wm-pcc-response-list wm-ui-card">
                        {commercialOverride.conversationStarters.map((line) => (
                          <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {commercialOverride?.askNext?.length ? (
                    <>
                      <p className="wm-pcc-response-subhead wm-ui-copy">Ask next</p>
                      <ul className="wm-pcc-response-list wm-ui-card">
                        {commercialOverride.askNext.map((line) => (
                          <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {commercialOverride?.objections?.length ? (
                    <>
                      <p className="wm-pcc-response-subhead wm-ui-copy">If they push back</p>
                      <ul className="wm-pcc-response-list wm-ui-card">
                        {commercialOverride.objections.map((line) => (
                          <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                        ))}
                      </ul>
                    </>
                  ) : selectedPositioningCard?.objectionHandling?.length ? (
                    <>
                      <p className="wm-pcc-response-subhead wm-ui-copy">If they push back</p>
                      <ul className="wm-pcc-response-list wm-ui-card">
                        {selectedPositioningCard.objectionHandling.map((entry) => (
                          <li key={entry.objection}>
                            <strong>{entry.objection}</strong>{" "}
                            {renderWithGuruLinks(entry.response, selectedProduct)}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {commercialOverride?.followUp ? (
                    <>
                      <p className="wm-pcc-response-subhead wm-ui-copy">Follow-up wording</p>
                      <p className="wm-pcc-response-copy wm-ui-copy">
                        {renderWithGuruLinks(commercialOverride.followUp, selectedProduct)}
                      </p>
                    </>
                  ) : null}

                  {(selectedProduct.sku.toUpperCase().startsWith("AMP-") ||
                    `${selectedProduct.family} ${selectedProduct.category}`.toLowerCase().includes("audio") ||
                    `${selectedProduct.family} ${selectedProduct.category}`.toLowerCase().includes("amplifier")) && (
                    <details className="wm-pcc-response-list wm-ui-card">
                      <summary className="wm-pcc-response-subhead wm-ui-copy">Example system shapes</summary>
                      <div className="wm-pcc-example-grid">
                        {[
                          {
                            title: "100V / High Z distributed speaker zone",
                            body:
                              "One amplifier channel can feed several 100V ceiling or wall speakers across a zone. Each speaker is set to a wattage tap, for example 3W, 6W or 10W. Add the taps together and leave amplifier headroom. This suits background audio, classrooms, corridors, retail areas and larger distributed zones.",
                          },
                          {
                            title: "Low impedance stereo room",
                            body:
                              "Two amplifier channels can drive left and right low-impedance speakers, typically 4 ohm or 8 ohm. This suits a local room where stereo playback, clearer music reproduction or a pair of front speakers is required. Check speaker impedance, cable run, channel load and amplifier power per channel.",
                          },
                        ].map((example) => (
                          <article key={example.title} className="wm-pcc-example-card wm-ui-card wm-ui-title">
                            <h4 className="wm-pcc-example-title wm-ui-title">{example.title}</h4>
                            <p className="wm-pcc-example-body wm-ui-copy">
                              {renderWithGuruLinks(example.body, selectedProduct)}
                            </p>
                          </article>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}

              {activeProductPanel === "competitors" && competitorLandscape && (
                <>
                  <h3 className="wm-pcc-section-heading wm-ui-title">Known competitors &amp; brand SKUs</h3>
                  <p className="wm-pcc-response-copy wm-ui-copy">{competitorLandscape.note}</p>

                  {competitorLandscape.entries.length ? (
                    <ul className="wm-pcc-response-list wm-ui-card">
                      {competitorLandscape.entries.map((entry) => (
                        <li key={`${entry.brand}-${entry.sku}`}>
                          <strong>{entry.brand} {entry.sku}</strong>
                          {entry.category ? <> - {entry.category}</> : null}
                          {entry.summary ? <>. {entry.summary}</> : null}
                          {entry.knownLimitations ? <> Known limitation: {entry.knownLimitations}</> : null}
                          {entry.wingmanEquivalent ? <> Logged WyreStorm equivalent: {entry.wingmanEquivalent}.</> : null}
                          {" "}(Evidence confidence: {entry.confidence})
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}

              {activeProductPanel === "specification" && (
                <>
                  <h3 className="wm-pcc-section-heading wm-ui-title">Technical detail</h3>

                  <ul className="wm-pcc-response-list wm-ui-card">
                    {productSpecificationRows.map((row) => (
                      <li key={row.label}>
                        <strong>{row.label}:</strong> {renderWithGuruLinks(row.value, selectedProduct)}
                      </li>
                    ))}
                  </ul>

                  <p className="wm-pcc-response-subhead wm-ui-copy">Check before quoting</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {productChecks.slice(0, 4).map((point) => (
                      <li key={point}>{renderWithGuruLinks(point, selectedProduct)}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <div className="wm-pcc-actions">
            <div className="wm-pcc-action-wrap">
              <button
                type="button"
                onClick={addProductToProject}
                disabled={!selectedProduct}
                className={`wm-pcc-action-button wm-pcc-primary ${!selectedProduct ? "wm-pcc-disabled" : ""}`}
              >
                Add to project
              </button>
              <p className="wm-pcc-action-help wm-ui-copy">Attach this SKU to an opportunity.</p>
            </div>

            <div className="wm-pcc-action-wrap">
              <button
                type="button"
                onClick={startRoomBuilderWithProduct}
                disabled={!selectedProduct}
                className={`wm-pcc-action-button wm-pcc-secondary ${!selectedProduct ? "wm-pcc-disabled" : ""}`}
              >
                Start room builder
              </button>
              <p className="wm-pcc-action-help wm-ui-copy">Move into room/system discovery.</p>
            </div>
          </div>
        </aside>
      </main>
    </section>
  );
}
