import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { getBestProductPositioningCardForSku } from "../data/productPositioningCards";
import { getProductStory, productStoryRelatedText } from "../data/productStories";
import {
  createProjectForProductSelection,
  getCurrentWorkflowProject,
  readProjectStore,
  saveDiscoveryBriefToProject,
  saveProductSelectionToProject,
  setActiveProjectId,
  useProjectStore,
} from "../data/projectStore";
import { buildProductNarrative, normaliseProductRecord, type ProductNarrative } from "../lib/productStoryEngine";
import { hydrateProductSpecWithTechnicalData } from "../lib/governedProductTechnicalData";
import {
  classifyProductCallCard,
  PRODUCT_CALL_CARD_HEADINGS,
  productCallCardClassificationText,
  type ClassifiedProductCallCardHeading,
} from "../lib/productCallCardClassification";
import { resolveWyrestormSkuAlias } from "../lib/skuAliasResolver";
import { getProductCallCommercialOverride } from "../lib/productCallCommercialOverrides";
import { selectWingmanProducts } from "../lib/productSelectorEngine";
import { useDebouncedValue } from "../lib/useDebouncedValue";
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
import { useGlossaryHighlightsEnabled } from "../lib/glossaryHighlightPreference";
import {
  ProductFilterPanel,
  ProductSearchField,
  ProductWorkspaceHeader,
  ProductWorkspaceNav,
} from "../components/ProductWorkspaceChrome";
import { cleanText, unique } from "../lib/productCallCardText";
import { renderGuruGlossaryLinks } from "../components/guruGlossaryLinks";
import type { ProductCard } from "../lib/productCallCardTypes";
import { buildProductSalesHelperCopy } from "../lib/productSalesHelperCopy";
import {
  recordProductView,
  recordProductUse,
  getRecentlyViewed,
  getFrequentlyUsed,
} from "../lib/productCallCardHistory";
import {
  getQuestionNotes,
  saveQuestionNotes,
  allNotesAsText,
} from "../lib/productCallCardNotes";

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

// The six-stage workflow every call card walks a rep through. Rendered as a
// guide in the product-mode header; the terms are also contract-checked by
// tools/check-product-positioning-cards.mjs.
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

  if (!spec) {
    return null;
  }

  // Governed-first: the seed carries the product-intelligence technicalProfile
  // (and sourceCatalog), so hydrate the spec before building narrative copy.
  // Without this the generated pitch claims are drawn from marketing tags that
  // can contradict the verified spec (e.g. "Video Wall"/"Processing" tags on a
  // presentation switcher). The hydration is a no-op for data-less fallback
  // seeds (missing tier), so curated fallback copy is untouched.
  return buildProductNarrative(hydrateProductSpecWithTechnicalData(spec, seed));
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


type ProductPayload = {
  products?: ProductSeed[];
};



// Simplified from 5 tabs to 3 focused panels.
type ProductPanelId = "overview" | "salesGuide" | "technical";


const PRODUCT_PANEL_TABS: Array<{ id: ProductPanelId; label: string; hint: string }> = [
  { id: "overview", label: "Overview", hint: "What & when" },
  { id: "salesGuide", label: "Sales guide", hint: "What to say" },
  { id: "technical", label: "Technical", hint: "Specs & checks" },
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

export default function ProductCallCardsPage() {
  const navigate = useNavigate();
  const { projects, activeProject } = useProjectStore();
  const pathSku = getSkuFromPath();

  const [products, setProducts] = useState<ProductCard[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [activeFamily, setActiveFamily] = useState("All");
  const [activeQuickFinder, setActiveQuickFinder] = useState("All");
  const [selectedSku, setSelectedSku] = useState(pathSku);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeProductPanel, setActiveProductPanel] = useState<ProductPanelId>("overview");
  const [projectTargetOpen, setProjectTargetOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareSkus, setCompareSkus] = useState<string[]>([]);
  const [recentSkus, setRecentSkus] = useState<string[]>(() => getRecentlyViewed());
  const [frequentSkus, setFrequentSkus] = useState<string[]>(() => getFrequentlyUsed());
  const glossaryHighlightsEnabled = useGlossaryHighlightsEnabled();
  const renderWithGuruLinks = (text: string, _product?: ProductCard) =>
    renderGuruGlossaryLinks(text, glossaryHighlightsEnabled);
  const [conversationToneId, setConversationToneId] = useState<SalesConversationToneId>(
    readStoredSalesConversationToneId,
  );

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
      query: debouncedQuery,
      includeBrowseOnly: true,
    })
      .filter((decision) => decision.eligible)
      .map((decision) => decision.product);

    governedProducts
      .filter((product) => productPresentationMatches(product, debouncedQuery, activeFamily, "All"))
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
  }, [products, debouncedQuery, activeFamily]);

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
      query: debouncedQuery,
      includeBrowseOnly: true,
    })
      .filter((decision) => decision.eligible)
      .map((decision) => decision.product);

    return governedProducts.filter((product) => productPresentationMatches(product, debouncedQuery, activeFamily, activeQuickFinder));
  }, [products, debouncedQuery, activeFamily, activeQuickFinder]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageProducts = filteredProducts.slice(safePageIndex * PAGE_SIZE, safePageIndex * PAGE_SIZE + PAGE_SIZE);

  const selectedProduct = selectedSku
    ? products.find((product) => product.sku === selectedSku) ?? null
    : null;
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

  const [questionNotes, setQuestionNotes] = useState<string[]>([]);
  const notesSku = selectedProduct?.sku ?? "";

  useEffect(() => {
    if (notesSku) {
      setQuestionNotes(getQuestionNotes(notesSku));
    } else {
      setQuestionNotes([]);
    }
  }, [notesSku]);

  function updateNote(index: number, value: string): void {
    setQuestionNotes((prev) => {
      const next = [...prev];
      next[index] = value;
      if (notesSku) saveQuestionNotes(notesSku, next);
      return next;
    });
  }

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
  const compareProducts = useMemo(
    () => compareSkus.map((sku) => products.find((p) => p.sku === sku)).filter((p): p is ProductCard => p != null),
    [compareSkus, products],
  );

  function toggleCompare(sku: string): void {
    setCompareSkus((prev) => {
      if (prev.includes(sku)) {
        return prev.filter((s) => s !== sku);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, sku];
    });
  }

  const firstVisible = filteredProducts.length === 0 ? 0 : safePageIndex * PAGE_SIZE + 1;
  const lastVisible = Math.min(filteredProducts.length, (safePageIndex + 1) * PAGE_SIZE);
  const curatedCount = products.filter((product) => product.curated).length;

  function returnToProductSelection(): void {
    setSelectedSku("");
    setActiveProductPanel("overview");

    if (window.location.pathname !== "/wingman/product-call-cards") {
      window.history.replaceState({}, "", "/wingman/product-call-cards");
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function productSelection() {
    if (!selectedProduct) return null;
    return {
      sku: selectedProduct.sku,
      title: selectedProduct.name,
      family: selectedProduct.family,
      category: selectedProduct.category,
      source: "Product call cards",
    };
  }

  function finishProjectHandoff(projectId: string): void {
    if (!selectedProduct) {
      return;
    }

    recordProductUse(selectedProduct.sku);
    setFrequentSkus(getFrequentlyUsed());

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

    const selection = productSelection();
    if (!selection) return;
    setActiveProjectId(projectId);
    saveProductSelectionToProject(projectId, selection);

    try {
      window.sessionStorage.setItem("wingman.pendingProjectProduct", JSON.stringify(payload));
    } catch {
      // Continue with navigation even if storage is unavailable.
    }

    const params = new URLSearchParams();
    params.set("addSku", selectedProduct.sku);
    params.set("source", "product-discussion");

    navigate(`/wingman/projects/${projectId}?${params.toString()}`);
  }

  function createProjectAndAddProduct(): void {
    const selection = productSelection();
    if (!selection) return;
    const project = createProjectForProductSelection(newProjectName, selection);
    setProjectTargetOpen(false);
    finishProjectHandoff(project.id);
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

    navigate(`/wingman/discovery?${params.toString()}`);
  }
return (
    <section
      className={`wm-pcc-select-shell wm-ui-section ${
        selectedProduct ? "wm-pcc-shell-product-mode" : "wm-pcc-shell-selection-mode"
      }`}
    >      {projectTargetOpen && selectedProduct && typeof document !== "undefined" && createPortal((
        <div className="wm-pcc-project-target-backdrop" role="presentation">
          <section className="wm-pcc-project-target-dialog wm-ui-card" role="dialog" aria-modal="true" aria-labelledby="wm-pcc-project-target-title">
            <header>
              <div>
                <p className="wm-ui-kicker">Add {selectedProduct.sku} to a proposal</p>
                <h2 id="wm-pcc-project-target-title">Choose the project this product belongs to</h2>
                <p>The proposal is built from a project record. Select an existing opportunity or create a new one now.</p>
              </div>
              <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setProjectTargetOpen(false)} aria-label="Close project selection">×</button>
            </header>

            {activeProject && (
              <button type="button" className="wm-pcc-project-target-current wm-ui-button wm-ui-button-primary" onClick={() => finishProjectHandoff(activeProject.id)}>
                Add to current project: {activeProject.name}
              </button>
            )}

            {projects.length > 0 && (
              <div className="wm-pcc-project-target-existing">
                <h3>{activeProject ? "Or choose another project" : "Choose an existing project"}</h3>
                <div>
                  {projects.filter((project) => project.id !== activeProject?.id).map((project) => (
                    <button key={project.id} type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => finishProjectHandoff(project.id)}>
                      <strong>{project.name}</strong><span>{project.stage} · {project.updated}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="wm-pcc-project-target-new">
              <label htmlFor="wm-pcc-new-project-name">Create a new project</label>
              <div>
                <input id="wm-pcc-new-project-name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder={`${selectedProduct.sku} opportunity`} />
                <button type="button" className="wm-ui-button wm-ui-button-primary" onClick={createProjectAndAddProduct}>Create and add product</button>
              </div>
            </div>
          </section>
        </div>
      ), document.body)}

      {selectedProduct ? (
        <header className="wm-pcc-header wm-ui-card-header wm-pcc-header-product-mode">
          <div>
          <p className="wm-pcc-eyebrow wm-ui-copy wm-ui-kicker">
            Product discussion
          </p>
          <h1 className="wm-pcc-title wm-ui-title">
            {selectedProduct.sku}
          </h1>
          <p className="wm-pcc-subtitle wm-ui-copy">
            {[selectedProduct.family, selectedProduct.category].filter(Boolean).join(" · ")}
          </p>
          <ol className="wm-ui-copy" aria-label="Call card workflow">
            {productCallCardWorkflowGuide.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          </div>
          <button
            type="button"
            className="wm-ui-button wm-ui-button-secondary wm-pcc-return-button"
            onClick={returnToProductSelection}
          >
            Return to product selection
          </button>
        </header>
      ) : (
        <>
          <ProductWorkspaceHeader
            eyebrow="Products / Call cards"
            title="Find a product call card"
            description="Search or filter the governed range, then open concise facts and customer-ready sales guidance."
          />
          <ProductWorkspaceNav />
          <ProductFilterPanel>
          <ProductSearchField
            value={query}
            onChange={setQuery}
            label="Search products"
            placeholder="Search SKU, family, product type or application..."
          />
          </ProductFilterPanel>
        </>
      )}

      <main
        className={`wm-pcc-grid wm-ui-page wingman-page-host ${
          selectedProduct ? "wm-pcc-product-mode" : "wm-pcc-selection-mode"
        }`}
      >

      {!selectedProduct && (recentSkus.length > 0 || frequentSkus.length > 0) && (
        <section className="wm-pcc-quick-access" aria-label="Quick access">
          {recentSkus.length > 0 && (
            <div className="wm-pcc-quick-group">
              <h3 className="wm-pcc-quick-heading">Recently viewed</h3>
              <div className="wm-pcc-quick-chips">
                {recentSkus.slice(0, 6).map((sku) => {
                  const product = products.find((p) => p.sku === sku);
                  if (!product) return null;
                  return (
                    <button
                      key={sku}
                      type="button"
                      className="wm-ui-button wm-ui-button-secondary wm-pcc-quick-chip"
                      onClick={() => {
                        setSelectedSku(sku);
                        setActiveProductPanel("overview");
                        recordProductView(sku);
                        setRecentSkus(getRecentlyViewed());
                        window.requestAnimationFrame(() => {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        });
                      }}
                    >
                      <span className="wm-pcc-quick-chip-sku">{sku}</span>
                      <span className="wm-pcc-quick-chip-family">{product.family}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {frequentSkus.length > 0 && (
            <div className="wm-pcc-quick-group">
              <h3 className="wm-pcc-quick-heading">Frequently used</h3>
              <div className="wm-pcc-quick-chips">
                {frequentSkus.slice(0, 6).map((sku) => {
                  const product = products.find((p) => p.sku === sku);
                  if (!product) return null;
                  return (
                    <button
                      key={sku}
                      type="button"
                      className="wm-ui-button wm-ui-button-secondary wm-pcc-quick-chip"
                      onClick={() => {
                        setSelectedSku(sku);
                        setActiveProductPanel("overview");
                        recordProductView(sku);
                        setRecentSkus(getRecentlyViewed());
                        window.requestAnimationFrame(() => {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        });
                      }}
                    >
                      <span className="wm-pcc-quick-chip-sku">{sku}</span>
                      <span className="wm-pcc-quick-chip-family">{product.family}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

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

          <div className="wm-pcc-status">
            <span>
              Showing {firstVisible}-{lastVisible} of {filteredProducts.length} matching · {products.length} total · {curatedCount} curated
              {compareMode && compareSkus.length > 0 && (
                <> · <strong>{compareSkus.length}/3</strong> selected for compare</>
              )}
            </span>

            <button
              type="button"
              className={["wm-ui-button wm-ui-button-secondary", compareMode ? "wm-pcc-compare-active" : ""].filter(Boolean).join(" ")}
              onClick={() => {
                setCompareMode(!compareMode);
                if (compareMode) {
                  setCompareSkus([]);
                }
              }}
            >
              {compareMode ? "Exit compare" : "Compare"}
            </button>

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
              <button className={["wm-ui-button wm-ui-button-secondary", `wm-pcc-product ${selectedProduct?.sku === product.sku && !compareMode ? "wm-pcc-product-active" : ""} ${compareSkus.includes(product.sku) ? "wm-pcc-product-compare" : ""}`].filter(Boolean).join(" ")}
                key={product.sku}
                type="button"
                onClick={() => {
                  if (compareMode) {
                    toggleCompare(product.sku);
                    return;
                  }
                  setSelectedSku(product.sku);
                  setActiveProductPanel("overview");
                  recordProductView(product.sku);
                  setRecentSkus(getRecentlyViewed());

                  window.requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  });
                }}

              >
                {compareMode && (
                  <span className="wm-pcc-compare-badge">
                    {compareSkus.includes(product.sku)
                      ? `${compareSkus.indexOf(product.sku) + 1}`
                      : "+"}
                  </span>
                )}
                <span className="wm-pcc-sku">{product.sku}</span>
                <span className="wm-pcc-family">
                  {product.curated ? "Curated · " : ""}
                  {product.family}
                </span>
                {(product.openingLine || product.description) && (
                  <span className="wm-pcc-hint">
                    {product.openingLine || product.description}
                  </span>
                )}

              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div className="wm-pcc-empty">
                No matching product call cards found. Try a SKU, product family or application keyword.
              </div>
            )}
          </div>
        </section>

        {compareMode && compareProducts.length >= 2 && (
          <section className="wm-pcc-card wm-pcc-compare-panel wm-ui-card">
            <div className="wm-pcc-compare-header">
              <h2 className="wm-ui-title">Compare {compareProducts.length} products</h2>
              <button
                type="button"
                className="wm-ui-button wm-ui-button-secondary"
                onClick={() => { setCompareSkus([]); setCompareMode(false); }}
              >
                Clear & exit
              </button>
            </div>

            <div className="wm-pcc-compare-grid" style={{ gridTemplateColumns: `repeat(${compareProducts.length}, minmax(0, 1fr))` }}>
              {compareProducts.map((product) => (
                <div key={product.sku} className="wm-pcc-compare-col">
                  <div className="wm-pcc-compare-col-head">
                    <h3 className="wm-pcc-compare-sku wm-ui-title">{product.sku}</h3>
                    <p className="wm-pcc-compare-family wm-ui-copy">{product.family}</p>
                  </div>

                  <div className="wm-pcc-compare-section">
                    <p className="wm-pcc-compare-label">What it does</p>
                    <p className="wm-pcc-compare-value wm-ui-copy">{product.description}</p>
                  </div>

                  <div className="wm-pcc-compare-section">
                    <p className="wm-pcc-compare-label">Best fit</p>
                    <p className="wm-pcc-compare-value wm-ui-copy">{product.fit}</p>
                  </div>

                  <div className="wm-pcc-compare-section">
                    <p className="wm-pcc-compare-label">Opening line</p>
                    <p className="wm-pcc-compare-value wm-ui-copy">{product.openingLine}</p>
                  </div>

                  {product.proofPoints.length > 0 && (
                    <div className="wm-pcc-compare-section">
                      <p className="wm-pcc-compare-label">Proof points</p>
                      <ul className="wm-pcc-compare-list">
                        {product.proofPoints.slice(0, 3).map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {product.headings.length > 0 && (
                    <div className="wm-pcc-compare-section">
                      <p className="wm-pcc-compare-label">Categories</p>
                      <p className="wm-pcc-compare-value wm-ui-copy">{product.headings.join(', ')}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="wm-ui-button wm-ui-button-primary wm-pcc-compare-add"
                    onClick={() => {
                      setSelectedSku(product.sku);
                      setCompareMode(false);
                      setCompareSkus([]);
                      setActiveProductPanel('overview');
                    }}
                  >
                    Open call card
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <aside className="wm-pcc-card wm-pcc-preview wm-ui-card">
          <div className="wm-pcc-product-summary">
            <p className="wm-pcc-label wm-ui-copy">Product discussion</p>
            {selectedProduct && <h2 className="wm-pcc-preview-sku wm-ui-title">{selectedProduct.sku}</h2>}
            {selectedProduct && (
              <p className="wm-pcc-preview-family wm-ui-copy">
                {selectedProduct.family}
              </p>
            )}
          </div>

          {selectedProduct && (
            <div className="wm-pcc-gallery-strip" aria-label="Quick actions">
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

                  navigate(`/wingman/proposal-visuals?${params.toString()}`);
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
                  tab.id !== "technical" ? "wm-pcc-section-tab-core" : "",
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
              {activeProductPanel === "overview" && salesHelperCopy && (
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



              {activeProductPanel === "salesGuide" && salesHelperCopy && (
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

                  <p className="wm-pcc-response-subhead wm-ui-copy">Discovery questions</p>
                  <ul className="wm-pcc-response-list wm-ui-card">
                    {salesHelperCopy.discoveryQuestions.slice(0, 4).map((line) => (
                      <li key={line}>{renderWithGuruLinks(line, selectedProduct)}</li>
                    ))}
                  </ul>

                  <details className="wm-pcc-notes-section">
                    <summary className="wm-pcc-response-subhead wm-ui-copy">Capture answers for Discovery</summary>
                    <p className="wm-pcc-notes-hint wm-ui-copy">
                      Type answers below. They are saved locally and can be sent to the project's Discovery brief.
                    </p>
                    {salesHelperCopy.discoveryQuestions.slice(0, 4).map((question, idx) => (
                      <div key={question} className="wm-pcc-notes-row">
                        <label className="wm-pcc-notes-label" htmlFor={`note-${notesSku}-${idx}`}>{question}</label>
                        <input
                          id={`note-${notesSku}-${idx}`}
                          className="wm-pcc-notes-input"
                          type="text"
                          placeholder="Your answer…"
                          value={questionNotes[idx] || ""}
                          onChange={(e) => updateNote(idx, e.target.value)}
                        />
                      </div>
                    ))}
                    {questionNotes.some((n) => n?.trim()) && (
                      <button
                        type="button"
                        className="wm-ui-button wm-ui-button-primary wm-pcc-notes-send"
                        onClick={() => {
                          const currentProject = getCurrentWorkflowProject(readProjectStore());
                          if (!currentProject) return;
                          const existing = currentProject.discoveryBrief ?? {};
                          const existingNotes = String(existing.roomModel?.callCardNotes ?? "");
                          const newNotes = allNotesAsText();
                          const merged = existingNotes ? `${existingNotes}\n${newNotes}` : newNotes;
                          saveDiscoveryBriefToProject({
                            ...existing,
                            roomModel: {
                              ...(existing.roomModel ?? {}),
                              callCardNotes: merged,
                            },
                          }, currentProject.id);
                          setProjectTargetOpen(true);
                        }}
                      >
                        Send to Discovery
                      </button>
                    )}
                  </details>

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

              {activeProductPanel === "salesGuide" && competitorLandscape && (
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

              {activeProductPanel === "technical" && (
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
                onClick={() => {
                  setNewProjectName("");
                  setProjectTargetOpen(true);
                }}
                disabled={!selectedProduct}
                className={`wm-pcc-action-button wm-pcc-primary ${!selectedProduct ? "wm-pcc-disabled" : ""}`}
              >
                Add to proposal
              </button>
              <p className="wm-pcc-action-help wm-ui-copy">Choose or create the project that will own this proposal.</p>
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
