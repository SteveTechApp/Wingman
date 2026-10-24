import type { WyreStormProduct } from "../../features/compare";
import { includesAny, uniqueSkuOptions } from "./textTokens";

/**
 * How a product becomes something the compare page can score: the tag
 * vocabulary, the tag-to-class/role/transport inference, and the real
 * catalogue's own classifier.
 *
 * This was the model half of `ComparePageNew.advanced.tsx`. It is pure — no
 * React, no page state — so the page entry now reads it instead of carrying it,
 * and the same functions can be exercised directly by tests.
 */

export type ProductIntelligenceIndexEntry = {
  sku?: unknown;
  name?: unknown;
  title?: unknown;
  description?: unknown;
  summary?: unknown;
  category?: unknown;
  primarySystemFamily?: unknown;
  technologies?: unknown;
  connectors?: unknown;
  features?: unknown;
  tags?: unknown;
  classificationPath?: unknown;
  productClassification?: {
    primaryCategory?: unknown;
    category?: unknown;
    subCategory?: unknown;
    productType?: unknown;
    transportClass?: unknown;
  };
  subClassifications?: unknown;
  productRole?: unknown;
  lifecycleStatus?: unknown;
  doNotSpec?: unknown;
  technicalProfile?: unknown;
};

// Only these productRole values represent a genuine standalone product a
// customer's competitor product could sensibly be "replaced" by - cables,
// mounting brackets, power accessories and other request-only line items are
// never a valid lead compare recommendation on their own.
const REAL_CATALOG_LEAD_ELIGIBLE_ROLES = new Set([
  "primary-hardware",
  "endpoint-hardware",
  "workflow-endpoint",
  "system-controller",
]);

export function isRealCatalogEntryLeadEligible(entry: ProductIntelligenceIndexEntry): boolean {
  if (entry.doNotSpec === true) return false;
  if (String(entry.lifecycleStatus ?? "").toLowerCase() === "discontinued") return false;
  if (!REAL_CATALOG_LEAD_ELIGIBLE_ROLES.has(String(entry.productRole ?? ""))) return false;

  // Belt-and-braces: a handful of real entries have an internally
  // inconsistent productRole of "primary-hardware" despite their own
  // primarySystemFamily/productClassification explicitly saying "Accessory"
  // (e.g. IDB-300-BTN, a cable box button accessory) - trust the more
  // specific classification taxonomy over the coarser top-level role field.
  const category = String(entry.productClassification?.category ?? "");
  if (String(entry.primarySystemFamily ?? "") === "Accessory / Other" || category.toLowerCase() === "accessory") {
    return false;
  }

  return true;
}

function stringListFrom(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

// Builds the same kind of free-text blob buildCompetitorProfile() builds for a
// typed competitor description, so the real catalogue can be classified with
// the SAME extractTags/productClassFromTags/roleFromTags/transportFromTags
// functions already used for the competitor side - directly addressing the
// "WyreStorm and competitor data aren't classified the same way" gap.
function realCatalogEntryText(entry: ProductIntelligenceIndexEntry): string {
  const classification = entry.productClassification;

  return [
    entry.sku,
    entry.name,
    entry.title,
    entry.category,
    entry.primarySystemFamily,
    entry.description,
    entry.summary,
    ...stringListFrom(entry.technologies),
    ...stringListFrom(entry.connectors),
    ...stringListFrom(entry.features),
    ...stringListFrom(entry.tags),
    ...stringListFrom(entry.classificationPath),
    classification?.primaryCategory,
    classification?.category,
    classification?.subCategory,
    classification?.productType,
  ]
    .filter((item): item is string | number => typeof item === "string" || typeof item === "number")
    .join(" ")
    .toUpperCase();
}

// Classifies a real catalogue entry's productClass from WyreStorm's own
// curated taxonomy (primarySystemFamily / productClassification /
// subClassifications) rather than extractTags() run over the full free-text
// blob. This matters because real WyreStorm datasheet copy routinely lists
// downstream USE CASES alongside the product's own nature (e.g. an AVoIP
// encoder's description legitimately says it supports "video wall, multiview
// or AVoIP transport" as applications) - extractTags() over that combined
// text can match a use-case keyword before it reaches the product's actual
// category. The taxonomy fields are WyreStorm's own per-product
// classification, not marketing prose, so they don't have this problem.
// Returns null when the taxonomy doesn't map cleanly, so the caller can fall
// back to the shared extractTags-based heuristic (same as the competitor side).
function productClassFromRealCatalogTaxonomy(entry: ProductIntelligenceIndexEntry): string | null {
  const classification = entry.productClassification;
  const family = String(entry.primarySystemFamily ?? "");
  const combined = [
    classification?.category,
    classification?.subCategory,
    classification?.productType,
    ...stringListFrom(entry.subClassifications),
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();

  if (family === "Camera / Capture") {
    return combined.includes("ndi") ? "NDI camera" : "PTZ camera";
  }

  if (family === "Unified Communications") {
    return combined.includes("wireless") || combined.includes("dongle") || combined.includes("casting")
      ? "Wireless casting"
      : "USB conferencing";
  }

  if (family === "Audio") return "Network audio";
  if (combined.includes("video wall")) return "Video wall";
  if (combined.includes("multiview") || combined.includes("multi-view")) return "Multiview";
  if (combined.includes("splitter") || combined.includes("distribution amplifier")) return "HDMI splitter";
  // Product family describes purpose; HDBaseT inside a presentation switcher
  // is a transport/output capability, not evidence that the product is an
  // extender. Keep the purpose check ahead of connector-derived classes.
  if (family === "Presentation / Room Core" || combined.includes("presentation")) return "Presentation switcher";
  if (combined.includes("hdbaset") && !combined.includes("matrix")) return "HDBaseT extender";
  if (combined.includes("matrix")) return "Matrix";

  if (family === "NetworkHD AV over IP" || combined.includes("avoip") || combined.includes("av-over-ip") || combined.includes("av over ip")) {
    return "AV-over-IP";
  }

  // "Extension" family covers both HDBaseT and USB/KVM point-to-point
  // extenders (e.g. EX-100-KVM-IP's own category is "USB / KVM extender",
  // which doesn't contain the literal word "hdbaset" and would otherwise fall
  // through to the noisy extractTags fallback below - real KVM-extender copy
  // often mentions "camera"/"webcam" as a downstream use case, which
  // previously misclassified these as PTZ/NDI cameras). "HDBaseT extender" is
  // the existing generic point-to-point-extender bucket in this file's
  // vocabulary (see the hand-typed EX-60-USB2 USB extender entry above, which
  // uses the same productClass with role "USB extender" to stay specific).
  if (family === "Extension") return "HDBaseT extender";

  // "Control" family covers keypads, touch panels and control processors -
  // never a sensible lead compare recommendation for any of this file's other
  // product classes, so give it its own bucket rather than falling through.
  if (family === "Control") return "Control accessory";

  return null;
}

// Companion to productClassFromRealCatalogTaxonomy(): derives role from the
// same curated taxonomy fields for the two families empirically found to
// need it (Extension, NetworkHD AV over IP). Real "Extension"-family
// descriptions routinely mention "webcam"/"camera" as a USB pass-through
// example (e.g. RX-700's own datasheet: "supports data transmission of USB
// 2.0 devices like HD webcams, smart whiteboards..."), which previously
// leaked into `technologies`/`tags` upstream in
// tools/enrich-wyrestorm-product-intelligence.mjs and made the extractTags()
// -based roleFromTags() fallback below mislabel these products' role as
// "PTZ Camera"/"NDI Camera" even after productClass itself was fixed to
// "HDBaseT extender". Returns null for every other family so the existing
// tag-based derivation (unaffected by this specific contamination) is used.
function roleFromRealCatalogTaxonomy(entry: ProductIntelligenceIndexEntry): string | null {
  const family = String(entry.primarySystemFamily ?? "");
  const category = String(entry.productClassification?.category ?? "").toLowerCase();
  const subCategory = String(entry.productClassification?.subCategory ?? "").toLowerCase();

  if (family === "Extension") return "TX/RX extender kit";
  if (family === "Distribution" || category.includes("splitter") || category.includes("distribution amplifier")) {
    return "Distribution amplifier";
  }
  if (family === "Matrix / Routing" || category.includes("matrix")) return "Matrix switcher";
  if (family === "Camera / Capture") return subCategory.includes("ndi") ? "NDI Camera" : "PTZ Camera";
  if (family === "Audio") return "Audio processor";
  if (family === "Control") return "Control processor";
  if (family === "Unified Communications") return "UC room endpoint";
  if (family === "Presentation / Room Core") return "Presentation switcher";

  if (family === "NetworkHD AV over IP") {
    if (subCategory.includes("encoder")) return "Encoder / transmitter";
    if (subCategory.includes("decoder")) return "Decoder / receiver";
    if (subCategory.includes("transceiver")) return "Transceiver";
    if (subCategory.includes("controller")) return "Controller";
    if (subCategory.includes("multiview")) return "Multiview processor";
    return "Endpoint";
  }

  return null;
}

// Transport is an architectural fact, so prefer the governed product taxonomy
// and structured technical profile over free-text feature tags. Marketing-page
// parsing has historically leaked unrelated labels (for example NDI from a
// generic page sentence) into `technologies`; allowing those tags to define
// transport made an HDBaseT extender render as "NDI / HDMI".
function transportFromRealCatalogTaxonomy(entry: ProductIntelligenceIndexEntry): string | null {
  const classification = entry.productClassification;
  const classified = stringListFrom(classification?.transportClass);
  const technical = entry.technicalProfile as {
    transports?: unknown;
    governedSpecification?: { transport?: unknown };
  } | undefined;
  const governed = stringListFrom(technical?.governedSpecification?.transport);
  const structured = stringListFrom(technical?.transports);
  const evidence = [...governed, ...classified, ...structured].join(" / ");
  const productClass = productClassFromRealCatalogTaxonomy(entry);

  // Purpose/classification is authoritative when noisy legacy arrays contain
  // a contradictory protocol token. An Extension-family HDBaseT endpoint can
  // carry HDMI locally, but it cannot become an NDI transport product merely
  // because a stale enrichment label says NDI.
  if (productClass === "HDBaseT extender") return "HDBaseT";
  if (/\bHDBaseT\b/i.test(evidence)) return "HDBaseT";
  if (/\b(?:AV[- ]over[- ]IP|AVoIP|NetworkHD)\b/i.test(evidence)) return /10\s*GbE/i.test(evidence) ? "10GbE AVoIP" : "1GbE AVoIP";
  if (/\b(?:NDI)\b/i.test(evidence)) return "NDI / HDMI";
  if (/\bDante\b|\bAES67\b/i.test(evidence)) return "Dante / AES67 / network audio";
  if (/\bWireless\b|\bWi-?Fi\b/i.test(evidence)) return "Wi-Fi / Ethernet";
  if (/\bUSB\b/i.test(evidence) && !/\bHDMI\b/i.test(evidence)) return "USB";

  if (productClass === "HDMI splitter") return "HDMI distribution";
  if (["Matrix", "Video wall", "Multiview"].includes(productClass ?? "")) return "HDMI / processing";
  return null;
}

export function mapRealCatalogEntryToCompareCandidate(entry: ProductIntelligenceIndexEntry): WyreStormProduct | null {
  const sku = String(entry.sku ?? "").trim();
  if (!sku) return null;

  const text = realCatalogEntryText(entry);
  const tags = extractTags(text);
  const family = String(entry.primarySystemFamily ?? entry.category ?? "WyreStorm");
  const name = String(entry.name ?? entry.title ?? sku);
  const productClass = productClassFromRealCatalogTaxonomy(entry) ?? productClassFromTags(tags);

  const candidate: WyreStormProduct = {
    sku,
    name,
    family,
    productClass,
    role: roleFromRealCatalogTaxonomy(entry) ?? roleFromTags(tags),
    transport: transportFromRealCatalogTaxonomy(entry) ?? transportFromTags(tags),
    tags,
    caveat: "Confirm the current specification and required accessories against the datasheet before quoting.",
  };

  // buildWyrestormCompareProfile() (wyrestormCompareProfile.ts) reads a
  // `technicalProfile` field when present to derive real structured I/O
  // instead of inferring from text - WyreStormProduct doesn't declare this
  // field, so it's attached via a permissive cast rather than widening the
  // shared type everywhere it's used.
  if (entry.technicalProfile) {
    return { ...candidate, technicalProfile: entry.technicalProfile } as WyreStormProduct;
  }

  return candidate;
}

export function buildRealWyrestormCandidates(indexPayload: unknown): WyreStormProduct[] {
  const products = (indexPayload as { products?: unknown })?.products;
  if (!Array.isArray(products)) return [];

  const candidates: WyreStormProduct[] = [];

  for (const entry of products as ProductIntelligenceIndexEntry[]) {
    if (!isRealCatalogEntryLeadEligible(entry)) continue;

    const candidate = mapRealCatalogEntryToCompareCandidate(entry);
    if (candidate) candidates.push(candidate);
  }

  return candidates;
}

// Real catalogue entries win on SKU collision - they carry genuine structured
// data, while the hand-typed list is a hand-maintained approximation. Any
// hand-typed entry whose SKU isn't in the real catalogue (e.g. synthesized
// AVoIP-family placeholders) is kept as-is rather than dropped.
export function mergeRealWyrestormCatalog(base: WyreStormProduct[], real: WyreStormProduct[]): WyreStormProduct[] {
  if (real.length === 0) return base;

  const bySku = new Map<string, WyreStormProduct>();

  for (const product of base) {
    bySku.set(compareSkuKey(product.sku), product);
  }

  for (const product of real) {
    bySku.set(compareSkuKey(product.sku), product);
  }

  return Array.from(bySku.values());
}

// One SKU key for both sides of a collision: the catalogue merge compares a
// real entry against a hand-typed one by the same normalised key the page uses
// to look a product up.
export function normalizeCompetitorSku(value: string): string {
  return value.trim().toUpperCase();
}

export function compareSkuKey(value: string): string {
  return normalizeCompetitorSku(value).replace(/[^A-Z0-9]/g, "");
}

export function extractTags(text: string): string[] {
  const tags: string[] = [];

  if (includesAny(text, [
    "AVOIP",
    "AV OVER IP",
    "AV-OVER-IP",
    "IP350UHD",
    "IP300UHD",
    "IP250UHD",
    "IP200UHD",
    "OMNISTREAM",
    "AT-OMNI",
    "DM-NVX",
    "DMNVX",
    "NAV E",
    "NAV D",
    "NAVE",
    "NAVD",
    "ZYPER",
    "MXNET",
    "JUST ADD POWER",
    "JAP",
    "SDVOE",
  ])) tags.push("avoip");
  if (includesAny(text, ["TX", "ENCODER", "TRANSMITTER", "SOURCE"])) tags.push("encoder");
  if (includesAny(text, ["RX", "DECODER", "RECEIVER", "DISPLAY"])) tags.push("decoder");
  if (includesAny(text, ["TRX", "TRANSCEIVER"])) tags.push("transceiver");
  if (includesAny(text, ["EXTENDER", "EXTENSION", "POINT-TO-POINT", "TX/RX KIT", "TX RX KIT", "TRANSMITTER RECEIVER"])) tags.push("extender");
  if (includesAny(text, ["MATRIX", "8X8", "4X4", "16X16", "MATRIX SWITCHER"])) tags.push("matrix");
  if (includesAny(text, ["SPLITTER", "DISTRIBUTION AMPLIFIER", "DISTRIBUTION AMP", "DUPLICATOR"])) tags.push("splitter");
  if (includesAny(text, ["VIDEO WALL", "VIDEOWALL", "WALL PROCESSOR", "LCD WALL", "LED WALL"])) tags.push("video wall");
  if (includesAny(text, ["MULTIVIEW", "MULTI VIEW", "QUAD VIEW", "4 INPUT"])) tags.push("multiview");
  if (includesAny(text, ["NDI", "BIRDDOG", "MARSHALL CV", "NDI CAMERA"])) tags.push("ndi camera");
  if (includesAny(text, ["PTZ", "VISCA", "PELCO", "BRC", "EVI", "SRG"])) tags.push("ptz camera");
  if (includesAny(text, ["CAMERA", "HUDDLY", "VADDIO", "RALLY BAR", "MEETUP", "BRIO", "WEBCAM"])) tags.push("camera");
  if (includesAny(text, ["WIRELESS", "CLICKSHARE", "SOLSTICE", "MERSIVE", "AIRTAME", "AIRPLAY", "MIRACAST", "CHROMECAST"])) tags.push("wireless casting");
  if (includesAny(text, ["SPEAKERPHONE", "SOUNDBAR", "VIDEO BAR", "CONFERENCING BAR", "USB CAMERA", "CONFERENCE CAMERA"])) tags.push("usb conferencing");
  if (includesAny(text, ["MINI", "HUDDLE ROOM", "SMALL ROOM", "SMALL MEETING ROOM", "HOME OFFICE"])) tags.push("compact room");
  if (includesAny(text, ["MEDIUM ROOM", "MEDIUM MEETING ROOM", "8-10 PEOPLE", "8 TO 10 PEOPLE"])) tags.push("medium room");
  // The bare word "AMPLIFIER" also appears in "distribution amplifier" - the
  // real product-naming convention for HDMI/video splitters (e.g. WyreStorm's
  // own SP-0104-H2 datasheet describes its role as "Distribution amplifier"),
  // not an audio amp. Excluded here so a splitter doesn't get misclassified as
  // network audio equipment; the "splitter" tag above already covers it.
  if (
    includesAny(text, ["DANTE", "AES67", "AUDIO DSP", "NETWORK AUDIO", "Q-SYS", "QSYS", "TESIRA", "DEVIO", "AUDIO PROCESSOR"]) ||
    (text.includes("AMPLIFIER") && !text.includes("DISTRIBUTION AMPLIFIER") && !text.includes("DISTRIBUTION AMP"))
  ) {
    tags.push("network audio");
  }
  if (includesAny(text, ["USB", "UC", "BYOD", "BYOM", "TEAMS", "ZOOM", "USB-C"])) tags.push("usb");
  if (includesAny(text, ["HDBASET", "DTP"])) tags.push("hdbaset");
  if (includesAny(text, ["4K60", "60HZ", "HDMI 2.0"])) tags.push("4k60");
  if (includesAny(text, ["4:4:4", "444"])) tags.push("444");
  if (includesAny(text, ["18G", "18GBPS", "18GB"])) tags.push("18g");
  if (includesAny(text, ["HDR"])) tags.push("hdr");
  if (includesAny(text, ["CLASS A", "70M", "70 M", "100M"])) tags.push("class a");
  if (includesAny(text, ["CLASS B", "35M", "35 M"])) tags.push("class b");
  if (includesAny(text, ["10G", "SDVOE", "ZERO LATENCY"])) tags.push("10g");

  return uniqueSkuOptions(tags);
}

export function productClassFromTags(tags: string[]): string {
  if (tags.includes("ndi camera")) return "NDI camera";
  if (tags.includes("ptz camera")) return "PTZ camera";
  // Checked ahead of the generic "camera" fallback below: a genuine UC video
  // bar / soundbar competitor description almost always mentions "camera" as
  // one of its built-in components (e.g. "camera, microphone and speaker in
  // one device"), which would otherwise misclassify it as a bare PTZ camera
  // instead of the all-in-one conferencing device it actually is.
  if (tags.includes("usb conferencing")) return "USB conferencing";
  if (tags.includes("camera")) return "PTZ camera";
  // Checked ahead of the generic "network audio" tag below: a real AV-over-IP
  // product commonly ALSO carries embedded/de-embedded Dante or AES67 audio as
  // one feature among many (e.g. WyreStorm's own NHD-500 series datasheet
  // explicitly lists AES67) - that must not outrank the product's actual
  // architecture. Same for matrix/video-wall/multiview/splitter/extender,
  // which can equally carry an incidental audio feature without being audio
  // products themselves.
  if (tags.includes("wireless casting")) return "Wireless casting";
  if (tags.includes("video wall")) return "Video wall";
  if (tags.includes("multiview")) return "Multiview";
  if (tags.includes("matrix")) return "Matrix";
  if (tags.includes("splitter")) return "HDMI splitter";
  if (tags.includes("hdbaset") || tags.includes("extender")) return "HDBaseT extender";
  if (tags.includes("avoip")) return "AV-over-IP";
  if (tags.includes("network audio")) return "Network audio";
  if (tags.includes("usb")) return "Presentation switcher";
  return "Unknown";
}

export function roleFromTags(tags: string[]): string {
  if (tags.includes("ndi camera")) return "NDI Camera";
  if (tags.includes("ptz camera")) return "PTZ Camera";
  // Same "usb conferencing" vs bare "camera" ordering as productClassFromTags
  // above - keep both in sync so role/productClass never disagree about
  // whether this is an all-in-one conferencing device or a bare camera.
  if (tags.includes("usb conferencing")) return "Conference bar / USB conferencing";
  if (tags.includes("camera")) return "Camera";
  if (tags.includes("wireless casting")) return "Wireless casting";
  if (tags.includes("transceiver")) return "Transceiver";
  if (tags.includes("extender") && tags.includes("usb")) return "USB extender";
  if (tags.includes("extender") || tags.includes("hdbaset")) return "TX/RX extender kit";
  // Checked ahead of encoder/decoder: a splitter's own description often
  // contains generic wording like "one source to multiple displays", which
  // false-matches the bare "SOURCE"/"DISPLAY" keywords those tags are built
  // from. A product already confirmed as a splitter should never be
  // relabelled an AVoIP encoder/decoder because of that wording.
  if (tags.includes("splitter")) return "Distribution amplifier";
  // Also checked ahead of "network audio": a real AVoIP encoder/decoder that
  // also carries embedded/de-embedded Dante or AES67 audio (a common real
  // feature, not a distinct product) must keep its actual transport role
  // rather than being relabelled a bare audio processor.
  if (tags.includes("encoder")) return "Encoder / transmitter";
  if (tags.includes("decoder")) return "Decoder / receiver";
  if (tags.includes("matrix")) return "Switcher";
  if (tags.includes("network audio")) return "Audio processor";
  if (tags.includes("usb")) return "Switcher";
  if (tags.includes("video wall") || tags.includes("multiview")) return "Processor";
  return "Unknown";
}

export function transportFromTags(tags: string[]): string {
  if (tags.includes("ndi camera")) return "NDI / HDMI";
  if (tags.includes("ptz camera")) return "HDMI / USB / IP";
  // Same ordering as productClassFromTags/roleFromTags above.
  if (tags.includes("usb conferencing")) return "USB / HDMI / network collaboration";
  if (tags.includes("camera")) return "HDMI / USB / IP";
  if (tags.includes("wireless casting")) return "Wi-Fi / Ethernet";
  // Checked ahead of "network audio": a real AVoIP product's transport is its
  // network video path, even when it also carries embedded Dante/AES67 audio.
  if (tags.includes("10g")) return "10GbE AVoIP";
  if (tags.includes("avoip")) return "1GbE AVoIP";
  if (tags.includes("hdbaset")) return "HDBaseT";
  if (tags.includes("splitter")) return "HDMI distribution";
  if (tags.includes("matrix") || tags.includes("video wall") || tags.includes("multiview")) return "HDMI / processing";
  if (tags.includes("network audio")) return "Dante / AES67 / network audio";
  return "Unknown";
}
