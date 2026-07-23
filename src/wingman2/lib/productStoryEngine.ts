import { getProductStory, productStoryRelatedText } from "../data/productStories";
import {
  resolveProductRole,
  type ProductClassificationFacts,
  type ProductRoleResolution,
} from "./productRoleResolution";
export type ProductRole =
  | "camera"
  | "audio"
  | "avoip"
  | "matrix"
  | "multiview"
  | "videoWall"
  | "presentation"
  | "extension"
  | "wireless"
  | "general";

export type ProductTechnicalDataSummary = {
  status: "verified" | "official-structured" | "inferred" | "missing";
  statusLabel: string;
  completeness: number;
  compareReady: boolean;
  sourceTier: "verified-profile" | "official-structured" | "text-inferred" | "missing";
  productClass?: string;
  role?: string;
  transport: string[];
  maxResolution?: string;
  chroma?: string;
  dependencies: string[];
  compatibleFamilies: string[];
  evidence: string[];
  missingFields: string[];
  warnings: string[];
};

export type ProductSpec = {
  sku: string;
  name: string;
  family: string;
  category: string;
  productType: string;
  description: string;
  purpose: string;
  summary: string;
  keyFeatures: string[];
  capabilityTags?: string[];
  applications: string[];
  ioSummary: string[];
  video: string[];
  audio: string[];
  usb: string[];
  network: string[];
  control: string[];
  power: string[];
  physical: string[];
  checks: string[];
  related: string[];
  technicalData?: ProductTechnicalDataSummary;
  // The governed taxonomy from the product intelligence index. Carried through
  // normalisation rather than discarded, so role resolution can use the
  // authored classification instead of guessing from marketing prose.
  classification?: ProductClassificationFacts;
};

// How much of this narrative is trusted, governed copy versus auto-generated
// scaffolding. Surfaced in the UI so a non-expert rep knows when to verify
// against the datasheet before quoting, instead of treating every card as
// equally authoritative.
export type NarrativeConfidence = "high" | "medium" | "low";

export type ProductNarrative = {
  role: ProductRole;
  headline: string;
  whatItIs: string;
  whereItSits: string;
  familyFit: string;
  customerChallenge: string;
  whyItHelps: string;
  whyCustomerCares: string;
  useWhen: string;
  avoidIf: string;
  suggestedWording: string;
  demoPrompt: string;
  askNow: string[];
  diagramSource: string;
  diagramOutput: string;
  visualPrompt: string;
  // Provenance signal. Optional so the role-template builders do not have to set
  // it; the public buildProductNarrative entry point always populates it.
  confidence?: NarrativeConfidence;
  // Plain-language note shown to the rep when confidence is not "high".
  reviewNote?: string;
};

const genericWords = new Set([
  "product reference",
  "product selection",
  "sku lookup",
  "compatibility",
  "product",
  "wyrestorm",
  "application",
  "sales",
  "solution",
  "room",
  "system",
  "meeting room",
  "classroom"
]);

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  return "";
}

export function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toList).map((item) => item.trim()).filter(Boolean);

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;|\|/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const text = toText(value);
  return text ? [text] : [];
}

export function cleanUsefulList(values: string[], limit = 8): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const item = value.replace(/\s+/g, " ").trim();
    const key = item.toLowerCase();

    if (!item) continue;
    if (item.length < 3) continue;
    if (genericWords.has(key)) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);

    if (result.length >= limit) break;
  }

  return result;
}

function firstText(source: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const text = toText(source[key]);
    if (text) return text;
  }

  return fallback;
}

function firstList(source: Record<string, unknown>, keys: string[], fallback: string[]): string[] {
  for (const key of keys) {
    const values = toList(source[key]);
    if (values.length) return cleanUsefulList(values, fallback.length || 8);
  }

  return fallback;
}

// Like firstList, but concatenates EVERY listed key. Used for capability tags so
// both `features` and `technologies` contribute (the index splits them).
function mergedList(source: Record<string, unknown>, keys: string[], fallback: string[], limit = 18): string[] {
  const merged = keys.flatMap((key) => toList(source[key]));
  const cleaned = cleanUsefulList(merged, limit);
  return cleaned.length ? cleaned : fallback;
}

export function extractRawProducts(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;

  const root = asRecord(data);
  const likelyKeys = ["products", "items", "records", "index", "data", "productIntelligence"];

  for (const key of likelyKeys) {
    const candidate = root[key];

    if (Array.isArray(candidate)) return candidate;

    const nested = asRecord(candidate);
    const values = Object.values(nested);

    if (values.length) return values;
  }

  return Object.values(root);
}

export function normaliseProductRecord(entry: unknown, index: number): ProductSpec | null {
  const source = asRecord(entry);
  if (!Object.keys(source).length) return null;

  const sku = firstText(source, ["sku", "SKU", "model", "partNumber", "productSku", "productCode"], `PRODUCT-${index + 1}`);
  const name = firstText(source, ["name", "title", "productName", "modelName", "shortName"], sku);
  const family = firstText(source, ["family", "series", "range", "productFamily"], "WyreStorm");
  const category = firstText(source, ["category", "productCategory", "type", "application"], "Product");
  const productType = firstText(source, ["productType", "type", "hardwareType", "commercialRole"], category);
  const description = firstText(source, ["description", "summary", "overview", "shortDescription"], "Product description not yet available.");
  const purpose = firstText(source, ["purpose", "salientPoint", "headline", "positioning"], description);
  const summary = firstText(source, ["plainEnglishSummary", "salesSummary", "summary", "description"], purpose);

  return {
    sku,
    name,
    family,
    category,
    productType,
    description,
    purpose,
    summary,
    keyFeatures: firstList(source, ["keyFeatures", "features", "majorFeatures", "featureSummary", "capabilities"], ["Key features not yet fully confirmed in the product intelligence record."]),
    // Full capability-tag pool (features + technologies) used only for headline
    // feature extraction - kept out of productText so it never skews role inference.
    capabilityTags: mergedList(source, ["features", "technologies", "keyFeatures", "capabilities", "majorFeatures"], []),
    applications: firstList(source, ["applications", "useCases", "applicationFit", "verticals", "rooms", "bestFor"], ["Application fit not yet classified."]),
    ioSummary: firstList(source, ["ioSummary", "iOSummary", "inputsOutputs", "ports", "connectivity", "connections", "connectors"], ["I/O details are not yet confirmed in the product intelligence record."]),
    video: firstList(source, ["video", "videoInputs", "videoOutputs", "resolution", "hdmi", "hdbaset", "ndi", "avoip"], ["Video specification not yet confirmed in the product intelligence record."]),
    audio: firstList(source, ["audio", "audioInputs", "audioOutputs", "dante", "dsp", "amplifier"], ["Audio specification not yet confirmed or not applicable."]),
    usb: firstList(source, ["usb", "usbInputs", "usbOutputs", "usbC", "host", "device"], ["USB requirement not yet confirmed or not applicable."]),
    network: firstList(source, ["network", "ethernet", "lan", "poe", "poh", "ip"], ["Network requirement not yet confirmed or not applicable."]),
    control: firstList(source, ["control", "rs232", "ir", "cec", "api", "gpio", "relay"], ["Control requirement not yet confirmed or not applicable."]),
    power: firstList(source, ["power", "psu", "consumption", "mains"], ["Power detail must be confirmed from current datasheet."]),
    physical: firstList(source, ["physical", "dimensions", "mounting", "rack", "formFactor", "weight"], ["Physical details must be confirmed from current datasheet."]),
    checks: firstList(source, ["checks", "beforeRecommending", "beforeQuoting", "whatToCheck", "designChecks"], ["Confirm source count, display count, signal type, distance, USB, audio, control, network and power requirements."]),
    related: firstList(source, ["related", "relatedProducts", "alternatives", "companionProducts"], []),
    classification: readClassificationFacts(source)
  };
}

// The governed taxonomy travels with the spec instead of being flattened away.
// Top-level `classificationPath` / `subClassifications` are read as a fallback
// because some records carry them alongside `productClassification` rather
// than only inside it.
export function readClassificationFacts(source: Record<string, unknown>): ProductClassificationFacts | undefined {
  const governed = asRecord(source.productClassification);
  const hasGoverned = Boolean(Object.keys(governed).length);

  const subClassifications = toList(
    hasGoverned && governed.subClassifications ? governed.subClassifications : source.subClassifications,
  );
  const classificationPath = toList(
    hasGoverned && governed.classificationPath ? governed.classificationPath : source.classificationPath,
  );

  if (!hasGoverned && !subClassifications.length && !classificationPath.length) {
    return undefined;
  }

  const confidence = Number(governed.confidence);

  return {
    primaryCategory: toText(governed.primaryCategory) || undefined,
    category: toText(governed.category) || undefined,
    systemRole: toText(governed.systemRole) || undefined,
    subClassifications,
    classificationPath,
    signalDomains: toList(governed.signalDomains),
    transportClass: toList(governed.transportClass),
    confidence: Number.isFinite(confidence) ? confidence : undefined,
  };
}


export function applyProductStoryToSpec(product: ProductSpec): ProductSpec {
  const story = getProductStory(product.sku);

  if (!story) {
    return product;
  }

  return {
    ...product,
    name: story.plainEnglishName || product.name,
    family: story.family || product.family,
    category: story.category || product.category,
    productType: story.productType || product.productType,
    description: story.whatItIs || product.description,
    purpose: story.oneLinePosition || product.purpose,
    summary: story.whatItDoes || product.summary,
    keyFeatures: cleanUsefulList([...story.keyFeatures, ...product.keyFeatures], 10),
    applications: cleanUsefulList([...story.idealApplications, ...product.applications], 10),
    checks: cleanUsefulList([...story.quoteChecks, ...product.checks], 10),
    related: cleanUsefulList([...productStoryRelatedText(story), ...product.related], 12),
  };
}

export function productText(product: ProductSpec) {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.productType,
    product.description,
    product.purpose,
    product.summary,
    ...product.keyFeatures,
    ...product.applications,
    ...product.ioSummary,
    ...product.video,
    ...product.audio,
    ...product.usb,
    ...product.network,
    ...product.control
  ].join(" ").toLowerCase();
}

// Resolve the narrative role, with provenance. Prefer this over
// `inferProductRole` where the caller can act on a soft result - `needsReview`
// marks a role that was guessed from prose because the product carried no
// governed classification.
export function resolveProductRoleWithEvidence(product: ProductSpec): ProductRoleResolution {
  return resolveProductRole(product, productText(product), {
    isUcRoomProduct: isUcRoomProduct(product),
  });
}

export function inferProductRole(product: ProductSpec): ProductRole {
  return resolveProductRoleWithEvidence(product).role;
}

function firstMeaningful(values: string[], fallback: string) {
  const useful = cleanUsefulList(values, 1);
  return useful[0] || fallback;
}

// --- SKU-specific narrative composition --------------------------------------
// The role templates below give each product family a consistent voice. These
// helpers layer the individual SKU's identity on top - what kind of product it
// is, its real headline features and connections, whether it is multi-function,
// and where it sits in its range - so two products in the same family (e.g. an
// encoder vs a decoder, or a 100 vs a 600 series) no longer read identically.

// Split on the pipe and real bullet/middot separators the product index uses.
const FEATURE_SPLITTER = /\s*(?:\||•|·)\s*/;

const NETWORKHD_SERIES_NOTE: Record<string, string> = {
  "100": "the NetworkHD 100 series - H.264/H.265 over standard 1GbE, the bandwidth-light, budget-friendly tier for signage and lower-motion content",
  "400": "the NetworkHD 400 series - JPEG2000 4K over 1GbE (largely superseded by the 500 series for new designs)",
  "500": "the NetworkHD 500 series - visually lossless JPEG-XS 4K60 4:4:4 over 1GbE, the mainstream choice for most distributed-AV jobs",
  "600": "the NetworkHD 600 series - uncompressed 10GbE SDVoE with zero frame latency, for the most demanding 4K60 4:4:4 and video-wall work",
};

function networkHdSeries(product: ProductSpec): "100" | "400" | "500" | "600" | null {
  const match = product.sku.toUpperCase().match(/NHD-?(\d)/);
  if (!match) return null;
  const lead = match[1];
  if (lead === "6") return "600";
  if (lead === "5") return "500";
  if (lead === "4") return "400";
  if (lead === "1") return "100";
  return null;
}

function endpointRole(sku: string): "encoder" | "decoder" | "transceiver" | null {
  const key = sku.toUpperCase();
  if (/TRX/.test(key)) return "transceiver";
  if (/-?TX(\b|-|$)/.test(key)) return "encoder";
  if (/-?RX(\b|-|$)/.test(key)) return "decoder";
  return null;
}

function isCameraBridgeProduct(product: ProductSpec): boolean {
  const text = `${product.sku} ${product.name} ${product.productType} ${product.description}`.toLowerCase();
  return /\bbrg\b/.test(text) || text.includes("camera bridge") || text.includes("multi-camera video bridge");
}

function isUcRoomProduct(product: ProductSpec): boolean {
  const sku = product.sku.toUpperCase();
  const text = productText(product);

  if (/^HALO-(30|60|80|90)$/.test(sku)) return true;
  if (/^(HALO-VX10|APO-VX20)/.test(sku)) return true;
  if (sku === "APO-210-UC") return true;

  return /conference speakerphone|video[\s-]?speakerphone|video[\s-]?bar/.test(text);
}

function isDockingSpeakerphone(product: ProductSpec): boolean {
  return product.sku.toUpperCase() === "HALO-90";
}

function isConferenceSpeakerphone(product: ProductSpec): boolean {
  const sku = product.sku.toUpperCase();
  const text = productText(product);

  return /^HALO-(30|60|80|90)$/.test(sku) || /conference speakerphone/.test(text);
}

function productKind(product: ProductSpec, role: ProductRole): string {
  const endpoint = endpointRole(product.sku);

  if (isDockingSpeakerphone(product)) {
    return "USB-C docking conference speakerphone";
  }

  if (isConferenceSpeakerphone(product)) {
    return "conference speakerphone";
  }

  if (/^(HALO-VX10|APO-VX20)/i.test(product.sku)) {
    return "all-in-one UC video bar";
  }

  if (product.sku.toUpperCase() === "APO-210-UC") {
    return "video-speakerphone room switcher";
  }

  // Apollo (APO-) is WyreStorm's UC / wireless collaboration line, not a camera,
  // even though a video bar has an integrated camera the records mention.
  if (/^APO/i.test(product.sku)) {
    const key = product.sku.toUpperCase();
    if (/VX20/.test(key)) return "Apollo all-in-one UC video bar";
    if (/DG\d/.test(key)) return "Apollo USB-C wireless casting device";
    if (/MIC/.test(key)) return "Apollo add-on microphone";
    return "Apollo UC room device";
  }

  // A NetworkHD endpoint is defined by its transmit/receive role even when the
  // record also mentions video-wall or multiview capability (which would
  // otherwise make role inference report it as a processor).
  if (networkHdSeries(product) && endpoint) {
    if (endpoint === "encoder") return "AV-over-IP encoder (the transmit end of the link)";
    if (endpoint === "decoder") return "AV-over-IP decoder (the receive end of the link)";
    return "AV-over-IP transceiver (transmit or receive)";
  }

  switch (role) {
    case "avoip":
      if (endpoint === "encoder") return "AV-over-IP encoder (the transmit end of the link)";
      if (endpoint === "decoder") return "AV-over-IP decoder (the receive end of the link)";
      if (endpoint === "transceiver") return "AV-over-IP transceiver (transmit or receive)";
      return "NetworkHD AV-over-IP endpoint";
    case "camera":
      if (isCameraBridgeProduct(product)) {
        return /\bndi\b/i.test(productText(product))
          ? "multi-camera bridge with USB, HDMI and NDI workflow support"
          : "multi-camera bridge for USB and HDMI workflow integration";
      }
      if (/\bptz\b/i.test(productText(product))) {
        return /\bndi\b/i.test(productText(product)) ? "NDI-capable PTZ camera" : "PTZ conference camera";
      }
      return /\bndi\b/i.test(productText(product)) ? "NDI-capable room camera" : "room camera";
    case "matrix":
      return "HDMI / HDBaseT matrix switcher";
    case "multiview":
      return "multiview processor";
    case "videoWall":
      return "video-wall processor";
    case "presentation":
      return "presentation and BYOD/BYOM switcher";
    case "extension":
      if (endpoint === "encoder") return "HDBaseT transmitter (extender)";
      if (endpoint === "decoder") return "HDBaseT receiver (extender)";
      return "HDBaseT extension product";
    case "audio":
      return "networked audio / amplification product";
    case "wireless":
      return "wireless presentation / casting device";
    default: {
      const type = product.productType.toLowerCase();
      return type && !/(hardware|endpoint|default|product)$/.test(type) ? type : "WyreStorm AV product";
    }
  }
}

// Discrete AV capability phrases. Lets a marketing-sentence description
// ("...1080p PTZ camera with AI tracking, USB 3.0...") still yield real headline
// features, not one long unusable string.
// Ordered strongest-differentiator first, so the punchiest specs lead the
// headline and weaker, ubiquitous ones (USB/HDMI/PoE) fall to the back.
const CAPABILITY_PATTERNS: RegExp[] = [
  /\b\d{3,4}p(?:\d{2,3})?\b/gi,
  /\b[48]K\s?(?:60|30|120)?\b/gi,
  /\b4:4:4\b/g,
  /\b4:2:[02]\b/g,
  /\bdolby vision\b/gi,
  /\bHDR(?:10\+?)?\b/gi,
  /\bAI[\s-]?tracking\b/gi,
  /\bauto[\s-]?framing\b/gi,
  /\bNDI\b/gi,
  /\bDante\b/gi,
  /\bAES67\b/gi,
  /\bSDVoE\b/gi,
  /\bJPEG[\s-]?XS\b/gi,
  /\bH\.26[45](?:\/H\.26[45])?\b/gi,
  /\b(?:1|10)\s?GbE\b/gi,
  /\bvideo wall\b/gi,
  /\bmultiview\b/gi,
  /\b\d{1,2}\s?x\s?\d{1,2}\b/g,
  /\bseamless(?:\sswitching)?\b/gi,
  /\bscaling\b/gi,
  /\bKVM\b/gi,
  /\bUSB[\s-]?(?:3\.\d|3\.x|2\.0)\b/gi,
  /\bUSB-?C\b/gi,
  /\bHDMI\s?2\.\d\b/gi,
  /\beARC\b/gi,
  /\bARC\b/gi,
  /\bPoE\+?\b/gi,
];

function capabilitiesFromText(text: string): string[] {
  const found: string[] = [];
  for (const pattern of CAPABILITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) found.push(...matches.map((match) => match.replace(/\s+/g, " ").trim()));
  }
  return found;
}

const KIND_WORDS = /\b(encoder|decoder|transceiver|matrix|switcher|processor|extender|camera|ptz|pan\/tilt\/zoom)\b/gi;
const BARE_GENERIC_FEATURE = /^(video|audio|control|network|hdmi|usb|ethernet|switching|capture)$/i;

// Strip the kind noun so a feature does not just echo the product type, and tidy
// any punctuation the strip leaves behind.
function cleanFeatureToken(item: string): string {
  return item
    // Collapse USB 3.0 / 3.1 / 3.2 / 3.x to a single token so they don't dedupe-dodge.
    .replace(/\bUSB[\s-]?3(?:\.[012x])?\b/gi, "USB 3.x")
    .replace(KIND_WORDS, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s/|,&·-]+|[\s/|,&·-]+$/g, "")
    .trim();
}

// Structured spec sources (the index's own fields) versus free marketing prose.
// Capability tokens scraped from a sentence can belong to a companion product the
// description happens to name ("...pairs with our 4K60 4:4:4 decoder..."), so the
// lead headline must be built only from structured sources. A pipe-delimited
// description is a spec list, not a sentence, so its tokens are trustworthy too.
function structuredFeaturePool(product: ProductSpec): string[] {
  const tags = product.capabilityTags ?? [];
  const structuredText = [...tags, ...product.video, ...product.audio, ...product.keyFeatures].join(" | ");
  const extracted = capabilitiesFromText(structuredText);
  const pipeTokens = product.description.includes("|") ? product.description.split(FEATURE_SPLITTER) : [];

  return [...extracted, ...pipeTokens, ...tags, ...product.video, ...product.audio, ...product.keyFeatures];
}

// `verifiedOnly` restricts extraction to structured spec fields and drops
// capability tokens scraped from free description/name prose. Use it for the
// prominent lead headline; the fuller whatItIs sentence can stay broad because it
// is clearly framed and lower-prominence.
function headlineFeatures(product: ProductSpec, limit = 6, opts: { verifiedOnly?: boolean } = {}): string[] {
  const prosePool = opts.verifiedOnly
    ? []
    : capabilitiesFromText([product.description, product.name].join(" "));
  const pool = [...structuredFeaturePool(product), ...prosePool];

  return cleanUsefulList(
    pool
      .map(cleanFeatureToken)
      .filter(
        (item) =>
          item.length >= 3 &&
          item.length <= 48 &&
          !BARE_GENERIC_FEATURE.test(item) &&
          !/not yet|must be confirmed|not applicable|not confirmed/i.test(item),
      ),
    limit,
  );
}

function connectionList(product: ProductSpec, limit = 5): string[] {
  return cleanUsefulList(
    [...product.ioSummary, ...product.control].filter((item) => !/not yet|not applicable|not confirmed/i.test(item)),
    limit,
  );
}

// Translate a verified capability token into a plain, customer-facing benefit -
// what the feature actually DOES for the customer - so generated copy positions
// value instead of listing spec tokens. Order matters: more specific tokens
// (4:4:4, USB-C) are tested before broader ones (4K, USB). A token with no rule
// is simply not surfaced as a benefit rather than being echoed raw.
const FEATURE_BENEFIT_RULES: Array<{ test: RegExp; benefit: string }> = [
  { test: /\b4:4:4\b/i, benefit: "crisp text and fine detail with no colour smearing, so spreadsheets, CAD and signage stay sharp" },
  { test: /dolby vision|\bHDR/i, benefit: "richer contrast and colour on HDR content" },
  { test: /\b[48]K/i, benefit: "a sharp, detailed picture that holds up on large screens" },
  { test: /USB-?C/i, benefit: "one cable for video, USB and laptop charging, so people walk up and connect" },
  { test: /USB[\s-]?(?:3|super)/i, benefit: "fast USB for cameras and high-resolution room peripherals" },
  { test: /\bKVM\b/i, benefit: "keyboard-and-mouse control of a remote PC from the screen position" },
  { test: /PoE/i, benefit: "power over the network cable, so no separate supply is needed at the far end" },
  { test: /\bNDI\b/i, benefit: "camera and AV over standard IP that the network and production tools already understand" },
  { test: /dante|aes67/i, benefit: "room audio shared over the network to other rooms and systems" },
  { test: /sdvoe|10\s?gbe/i, benefit: "uncompressed, zero-latency video across a 10G network" },
  { test: /jpeg[\s-]?xs/i, benefit: "visually lossless video at low bandwidth on an ordinary 1G network" },
  { test: /seamless/i, benefit: "clean, glitch-free cuts between sources" },
  { test: /scaling/i, benefit: "each screen gets a correctly sized picture whatever the source resolution" },
  { test: /e?arc/i, benefit: "TV or soundbar audio returns down the same HDMI cable" },
  { test: /multiview/i, benefit: "several sources visible on one screen at once" },
  { test: /video wall/i, benefit: "one picture spread across a group of screens" },
];

function featureBenefit(token: string): string | null {
  for (const rule of FEATURE_BENEFIT_RULES) {
    if (rule.test.test(token)) return rule.benefit;
  }
  return null;
}

// Benefit claims must be per-SKU accurate, so they are extracted ONLY from the
// resolved technical spec fields (video / audio) and a pipe-delimited spec
// description - NOT from capabilityTags, which is a broad family-level tag soup
// (e.g. a 4K30 encoder carries "8K"/"Video Wall"/"USB-C power delivery" tags for
// the NetworkHD family, none of which are that encoder's own capability). PoC /
// USB-C *power* is stripped so it is never mis-sold as a USB-C data/video input
// ("walk up and connect").
function benefitCapabilityTokens(product: ProductSpec): string[] {
  const structured = [...product.video, ...product.audio].join(" | ");
  const pipeDescription = product.description.includes("|") ? product.description : "";
  const text = `${structured} | ${pipeDescription}`
    .replace(/USB-?C\s*(?:power delivery|power|pd)\b/gi, " ")
    .replace(/\bPo[CH]\b/gi, " ");
  return capabilitiesFromText(text).filter((token) => !/not yet|not confirmed|not applicable/i.test(token));
}

function collectFeatureBenefits(product: ProductSpec, limit: number): Array<{ token: string; benefit: string }> {
  const tokens = benefitCapabilityTokens(product);
  const seen = new Set<string>();
  const out: Array<{ token: string; benefit: string }> = [];

  for (const token of tokens) {
    const benefit = featureBenefit(token);
    if (!benefit || seen.has(benefit)) continue;
    seen.add(benefit);
    out.push({ token: token.replace(/\s+/g, " ").trim(), benefit });
    if (out.length >= limit) break;
  }

  return out;
}

// "Feature - plain benefit" lines, per-SKU accurate (see benefitCapabilityTokens).
export function buildProductFeatureBenefits(product: ProductSpec, limit = 5): string[] {
  return collectFeatureBenefits(product, limit).map(({ token, benefit }) => `${token} - ${benefit}.`);
}

// The benefit phrases alone (no "token -" prefix), for weaving into a sentence.
function featureBenefitPhrases(product: ProductSpec, limit = 2): string[] {
  return collectFeatureBenefits(product, limit).map(({ benefit }) => benefit);
}

function rangeRelationship(product: ProductSpec): string {
  const series = networkHdSeries(product);
  if (!series) return "";

  const endpoint = endpointRole(product.sku);
  const pairing =
    endpoint === "encoder"
      ? "Pair it with matching NetworkHD decoders (RX) on the same series"
      : endpoint === "decoder"
        ? "Pair it with matching NetworkHD encoders (TX) on the same series"
        : "Pair encoders and decoders on the same series";

  const ladder: Record<string, string> = {
    "100": "Step up to the 500 series for visually lossless JPEG-XS 4K60, or the 600 series for uncompressed 10GbE.",
    "400": "Most new designs use the 500 series (JPEG-XS) in its place; the 600 series adds uncompressed 10GbE.",
    "500": "Step up to the 600 series for uncompressed 10GbE/SDVoE zero latency, or down to the 100 series for budget H.264.",
    "600": "The 500 series (JPEG-XS over 1GbE) covers most jobs at lower cost; the 100 series is the budget H.264 tier.",
  };

  return `Part of ${NETWORKHD_SERIES_NOTE[series]}. ${pairing}, all run under an NHD-CTL-PRO controller. ${ladder[series]} Never mix 1GbE and 10GbE NetworkHD families on the same job.`;
}

// Where the device physically lives in the room and the signal chain. A
// salesperson who has never seen the product still needs to be able to say
// "this sits behind the screen" or "this goes in the rack" with confidence.
function roomPlacement(product: ProductSpec, role: ProductRole): string {
  const endpoint = endpointRole(product.sku);

  switch (role) {
    case "camera":
      return "Mounted in the room with a clear view of whoever needs to be seen - on top of or below the display for a presenter, on a rear or side wall for the whole room, or ceiling-mounted in larger spaces. Its video then runs back to the room PC, UC host or the network, so confirm where that host lives and how far the cable has to travel.";
    case "audio":
      return "Usually lives in the rack, an AV cupboard or a local cabinet near the room, with speaker cabling running out to the loudspeakers and an audio feed coming in from the source, DSP or network. It is back-of-house kit - the customer hears it but never sees it.";
    case "avoip":
      if (endpoint === "encoder")
        return "Sits at each source - next to the laptop input, media player, camera or rack output it is encoding - and connects into the AV network switch. One encoder per source you want to send.";
      if (endpoint === "decoder")
        return "Sits at each display - behind the screen, above the projector or in the rack feeding a processor - and connects into the AV network switch. One decoder per screen you want to feed.";
      return "Sits at a source or a display and connects into the AV network switch. The switch and the NHD-CTL-PRO controller are the heart of the system; the endpoints are the edges.";
    case "matrix":
      return "Central kit - it lives in the rack or AV cupboard with every source cabled into its inputs and every display (or its receiver) cabled out of its outputs. The whole system fans out from this one box, so plan the rack space and cable routes around it.";
    case "multiview":
      return "Sits between several sources and the one screen that shows the combined picture - usually in or near the rack, feeding an operator monitor, confidence display or processor input.";
    case "videoWall":
      return "Sits in the rack or near the wall, between the sources and the wall displays (or the LED processor). Sources come in, the shaped wall layout goes out to the screens.";
    case "presentation":
      return "The room hub - typically at the table, in a credenza, at the lectern or behind the front display. This is where users plug in or cast, and where the cable to the display starts, so its position is driven by where people sit and where the screen is.";
    case "extension":
      if (endpoint === "encoder")
        return "The transmit end sits at the source position - table, lectern, wall plate or rack - and sends the signal down the installed cable to its matching receiver at the far end.";
      if (endpoint === "decoder")
        return "The receive end sits at the display - behind the screen or above the projector - and rebuilds the signal arriving from its matching transmitter.";
      return "One end sits at the source and the other at the display, linked by the installed category or fibre cable run between them.";
    case "wireless":
      return "Connects to the room display or presentation system, with the user's own laptop or phone casting to it over the network - so nothing of theirs has to be plugged in.";
    default:
      return "Confirm where it physically sits - at the source, at the display, in the rack, on the network or at the user's table - because that drives the cable routes, power and who installs it.";
  }
}

// How the product relates to the rest of its WyreStorm family: the step up, the
// step down, and the partner products it is usually sold alongside. For
// NetworkHD this is the governed series ladder; for the other families it is a
// plain-language "where this one sits" so the salesperson is never caught out by
// "what's the difference between this and the other one?".
function familyRelationship(product: ProductSpec, role: ProductRole): string {
  const networkHd = rangeRelationship(product);
  if (networkHd) return networkHd;

  const sku = product.sku.toUpperCase();
  const endpoint = endpointRole(product.sku);

  if (/^APO/.test(sku)) {
    if (/VX20/.test(sku))
      return "Part of the Apollo all-in-one UC range - the visible camera/mic/speaker bar for small-to-medium rooms. Add APO-DG2 when the same room also wants cable-free wireless presentation. Step away from Apollo to separate camera, DSP and speakers once the room is too big for one bar to cover.";
    if (/DG\d/.test(sku))
      return "An Apollo add-on, not a system on its own - it bolts wireless presentation onto an Apollo room (typically alongside APO-VX20-UC). If the room needs to manage several wired sources as well, move the conversation to a presentation switcher.";
    if (/MIC/.test(sku))
      return "An Apollo accessory that extends microphone pickup for larger Apollo rooms. It only makes sense attached to an Apollo bar, so always confirm the host product first.";
    return "Part of the Apollo UC family for simple meeting-room collaboration. Position it alongside the Apollo bar and casting devices rather than against full installed AV systems.";
  }

  if (/^SW-?0?20[46]/.test(sku) || role === "videoWall") {
    return "Sits in the dedicated video-wall processor family. SW-0204-VW is the simpler, preset-layout step; SW-0206-VW is the more capable step up. Both are the non-networked alternative to building the wall through NetworkHD AV-over-IP - reach for AVoIP only when routing flexibility and expansion outweigh the simplicity of a dedicated processor.";
  }

  if (/^SW-?6/.test(sku) || (role === "presentation" && /^SW/.test(sku))) {
    return "Part of the room presentation-switcher family. SW-620L-TX-W is the compact core; SW-640-TX-W is the step up for more inputs or dual-output rooms. Pair either with SYN-TOUCH10 when the room needs a clean touch interface, or add an Apollo bar when video calls matter as much as presenting. Move up to a matrix or NetworkHD only when the job becomes multi-room routing.";
  }

  if (role === "presentation") {
    return "Part of the presentation / BYOD family aimed at making one room easy to use. Step up to a matrix or AV-over-IP only when the requirement grows from one room into routing many sources to many displays.";
  }

  if (role === "matrix") {
    return "Part of the HDMI/HDBaseT matrix family - the central-routing answer for fixed systems. Smaller matrices suit one rack feeding a known set of screens; for many rooms, heavy future expansion or any-source-anywhere routing across a site, position NetworkHD AV-over-IP instead.";
  }

  if (role === "camera") {
    const text = productText(product);
    if (/\bbridge\b|-BRG/i.test(text + sku))
      return "Part of the WyreStorm camera family, on the bridge/switching side - it turns one or more cameras into a single feed the meeting platform or recorder can use. Pair it with the PTZ cameras; reach for a plain camera instead when a single fixed view is all the room needs.";
    return "Part of the WyreStorm camera family. NDI models join network-video workflows; PTZ models give controllable framing; camera bridges (CAM-...-BRG) combine several cameras into one feed. Match the model to where the picture has to end up - UC call, recorder, stream or network - not just to the camera spec.";
  }

  if (role === "extension") {
    const pairing =
      endpoint === "encoder"
        ? "It needs its matching receiver at the far end to be a complete link"
        : endpoint === "decoder"
          ? "It needs its matching transmitter at the source end to be a complete link"
          : "Transmitter and receiver are sold and quoted as a pair";
    return `Part of the HDBaseT extension family, which solves distance rather than switching. ${pairing} - a half-quoted extender is the classic missed line. When the real need is choosing between several sources or feeding many screens, move up to a switcher, matrix or AV-over-IP.`;
  }

  if (role === "audio") {
    return "Part of the WyreStorm audio family that completes a room beyond video. It sits alongside the video products rather than replacing them, and works with DSP, microphones, speakers and Dante/network-audio where the design calls for it. If people speak in the room, an audio product almost always belongs in the quote.";
  }

  if (role === "wireless") {
    return "Part of the wireless-presentation family - the cable-free way to share. It usually rides alongside a presentation switcher or UC room rather than standing alone, so confirm the wider room workflow and the customer's network policy.";
  }

  return "";
}

function skuHeadline(product: ProductSpec, role: ProductRole): string {
  // Lead claim: structured specs only, so the rep is never handed a punchy
  // headline figure that was scraped from prose and cannot be defended.
  const feats = headlineFeatures(product, 3, { verifiedOnly: true });
  // Headline uses the short kind (no parenthetical) so it reads as a punchy hook;
  // whatItIs keeps the fuller "(transmit end)" detail.
  const kind = productKind(product, role).replace(/\s*\([^)]*\)\s*$/, "");

  if (feats.length >= 2) return `${feats.join(" · ")} - ${kind}.`;
  if (feats.length === 1) return `${feats[0]} - ${kind}.`;
  return `${product.name} - ${kind}.`;
}

// "a" vs "an" for the controlled set of product-kind phrases (acronyms like
// AV / NDI / HDMI / HDBaseT take "an").
function articleFor(kind: string): string {
  return /^(av\b|ndi|hdmi|hdbaset|8|[aeiou])/i.test(kind) ? "an" : "a";
}

function isPlaceholderText(value: string): boolean {
  return /not yet|to be|confirm|classified|unknown|tbd|n\/a/i.test(value);
}

// A lower-cased, trimmed purpose phrase usable inside a sentence, or null when
// the record carries no real purpose. Stops the fallback narrative repeating an
// empty placeholder back to the rep as if it were a requirement.
function purposePhrase(product: ProductSpec): string | null {
  const purpose = product.purpose.trim();
  if (!purpose || isPlaceholderText(purpose)) return null;
  return purpose.toLowerCase().replace(/\.$/, "");
}

// True only for products that actually drive loudspeakers or process installed
// room audio (amplifiers, DSP). Self-contained audio devices that merely have
// their own speaker - speakerphones, microphones, video-speakerphones such as
// APO-VX20-UC - are role "audio" too (the description mentions "speaker"), but must
// NOT be described as "powering the room's speakers", or the quote-facing copy is
// false. Those fall back to a generic audio clause.
function drivesRoomSpeakers(product: ProductSpec): boolean {
  const text = `${product.sku} ${product.name} ${product.productType} ${product.description} ${product.keyFeatures.join(" ")}`.toLowerCase();
  if (/speakerphone|video[\s-]?bar|conference (?:camera|phone)|\bmic\b|microphone|webcam/.test(text)) return false;
  return /amplif|\bamp\b|\bdsp\b|\bwatt\b|\bohm\b|loudspeaker|power output|\bpa system\b/.test(text);
}

// A plain, concrete sentence saying what the product actually does in the signal
// chain, written so a non-AV salesperson can repeat it on a call. It replaces the
// old meta line ("the real check is how video, USB, audio and control move through
// the room"), which described the sales conversation rather than the product.
function plainFunctionClause(product: ProductSpec, role: ProductRole): string {
  const endpoint = endpointRole(product.sku);

  if (isDockingSpeakerphone(product)) {
    return " It combines the room's conference speakerphone with a USB-C dock, carrying call audio, display video, USB peripherals and laptop charging through the intended host connection.";
  }

  if (isConferenceSpeakerphone(product)) {
    return " It connects to the meeting host and provides the room microphone pickup and call loudspeaker in one tabletop device.";
  }

  if (/^(HALO-VX10|APO-VX20)/i.test(product.sku)) {
    return " It combines camera, microphones and loudspeakers at the display and presents them to the room PC or BYOD laptop as the room conferencing device.";
  }

  switch (role) {
    case "avoip":
      if (endpoint === "encoder")
        return " It puts one source onto the network so any matching screen on the system can show it.";
      if (endpoint === "decoder")
        return " It takes a source off the network and puts it on one screen.";
      if (endpoint === "transceiver")
        return " It sits at a source or a screen and moves that picture across the network to anywhere else on the system.";
      return " It carries AV over the network, so sources and screens are matched up in software instead of by cable.";
    case "matrix":
      return " It connects several sources to several screens at once and lets each screen show whichever source you pick.";
    case "multiview":
      return " It puts several sources on one screen at the same time, instead of switching between them one at a time.";
    case "videoWall":
      return " It drives a group of screens as one wall - one large picture spread across them all, or different content on each.";
    case "presentation":
      return " It takes the laptops and room devices plugged into it and sends the chosen one to the screen, so people share without swapping cables.";
    case "extension":
      if (endpoint === "encoder")
        return " It sends one source down a single long cable run to its matching receiver at the far end.";
      if (endpoint === "decoder")
        return " It rebuilds the picture arriving over a long cable run and feeds it to the screen.";
      return " It carries one source over a long cable run that an ordinary HDMI lead could not reach.";
    case "camera":
      if (isCameraBridgeProduct(product))
        return " It takes several cameras or room sources and hands a meeting, recording or streaming system one combined feed.";
      return /\bptz\b/i.test(productText(product))
        ? " It shows the room or the presenter on calls, recordings or streams, and the shot can pan, tilt and zoom to follow what matters."
        : " It gives calls, recordings or streams a clear, fixed view of the room or the presenter.";
    case "audio":
      return drivesRoomSpeakers(product)
        ? " It powers the room's speakers and keeps speech and programme sound clear and loud enough for everyone in the space."
        : " It is part of the room's audio, helping people hear and be heard clearly in the space.";
    case "wireless":
      return " It puts whatever is on a laptop or phone onto the room screen without anyone plugging in a cable.";
    default:
      return "";
  }
}

function skuWhatItIs(product: ProductSpec, role: ProductRole): string {
  const kind = productKind(product, role);
  // Lead with what it does in plain terms, then translate its top capabilities
  // into customer benefits, and only then note the raw spec/connection facts.
  const benefits = featureBenefitPhrases(product, 2);
  const benefitClause = benefits.length ? ` In practice that means ${benefits.join(", and ")}.` : "";
  const feats = headlineFeatures(product, 5);
  // Keep the verified capability list, but demote it to a subordinate "on the
  // spec sheet" clause instead of leading with it.
  const featureClause = feats.length ? ` On the spec sheet: ${feats.join(", ")}.` : "";
  const application = firstMeaningful(product.applications, "");
  const applicationClause =
    application && !isPlaceholderText(application) ? ` It is typically used in ${application.toLowerCase()}.` : "";
  const connections = connectionList(product, 5);
  const connectionClause = connections.length ? ` It connects via ${connections.join(", ")}.` : "";
  const functionClause = plainFunctionClause(product, role);

  return `${product.sku} (${product.name}) is ${articleFor(kind)} ${kind}.${functionClause}${benefitClause}${applicationClause}${featureClause}${connectionClause}`;
}

function skuSuggestedWording(product: ProductSpec, role: ProductRole, fallback: string): string {
  const kind = productKind(product, role);
  const application = firstMeaningful(product.applications, "");
  const applicationClause =
    application && !isPlaceholderText(application) ? ` for ${application.toLowerCase()}` : "";
  // Sell the benefit, not the spec: translate the top capabilities into what
  // they do for the customer instead of listing "the practical hooks are 4K60".
  const benefits = featureBenefitPhrases(product, 2);
  const benefitClause = benefits.length ? ` For the customer that means ${benefits.join(", and ")}.` : "";
  const family = familyRelationship(product, role);
  const pitch = `"${product.sku} is the ${kind}${applicationClause}."${benefitClause}`;

  return family ? `${pitch} Then place it in the range: ${family}` : `${pitch} ${fallback}`;
}

type RoleNarrativeBase = Omit<ProductNarrative, "whereItSits" | "familyFit">;

// Adds the two "salesperson confidence" fields - where the product physically
// sits, and how it relates to the rest of its family - to every role template,
// so an unfamiliar rep can always answer "where does this go?" and "what's the
// difference between this and the other one?".
function buildRoleNarrative(product: ProductSpec): ProductNarrative {
  const base = buildRoleNarrativeBase(product);
  return {
    ...base,
    whereItSits: roomPlacement(product, base.role),
    familyFit: familyRelationship(product, base.role),
  };
}

function buildRoleNarrativeBase(product: ProductSpec): RoleNarrativeBase {
  const role = inferProductRole(product);
  const mainApplication = firstMeaningful(product.applications, "the right room or system workflow");
  const mainFeature = firstMeaningful(product.keyFeatures, product.productType);
  const whatItIs = `${product.sku} is a ${product.productType.toLowerCase()} for ${mainApplication.toLowerCase()}.`;

  if (role === "camera") {
    if (isCameraBridgeProduct(product)) {
      return {
        role,
        headline: "Use this when several cameras or room sources need to become one clean feed.",
        whatItIs,
        customerChallenge: "The customer does not just need a camera. They need several camera or AV sources to land cleanly in one conferencing, capture or streaming workflow.",
        whyItHelps: `${product.sku} takes the room's cameras and sources and hands the meeting, recording or streaming platform one clean feed, so nobody is juggling USB dongles or swapping cables mid-session.`,
        whyCustomerCares: "In a multi-camera room there is one clear point where the room AV meets the platform, so hybrid teaching and recorded sessions are easier to run and easier to support.",
        useWhen: "Use it where the project needs more than one camera or source brought into USB, HDMI or NDI workflow, and the output destination still needs to be confirmed properly.",
        avoidIf: "Avoid leading with this if one simple fixed USB camera would solve the room. Also avoid it if the audio path, platform compatibility or operator workflow has not been confirmed.",
        suggestedWording: `${product.sku} is the bridge/mixer conversation when the room needs several camera or AV sources turned into one practical feed for conferencing, recording or streaming.`,
        demoPrompt: "Show how several cameras or room sources are switched and then handed off to the conferencing, recording or capture platform. That is the real value, not the spec list.",
        askNow: ["How many cameras or room sources need to be brought together?", "What receives the final feed - a laptop, room PC, conferencing appliance, recorder or streaming platform?", "Does the workflow need USB, HDMI, NDI or a mix?", "Who controls source switching during the session, and where does the room audio enter the path?"],
        diagramSource: "Cameras, presentation source or room AV inputs",
        diagramOutput: "UC host, recorder, streamer or NDI / HDMI / USB destination",
        visualPrompt: `Create a realistic hybrid-teaching or conferencing room showing ${product.sku} between multiple camera/source inputs and the final conferencing, capture or streaming destination.`,
      };
    }

    return {
      role,
      headline: "Use this when a basic webcam is not enough.",
      whatItIs,
      customerChallenge: "The customer needs better room coverage, zoom, framing or capture flexibility than a fixed USB webcam can provide.",
      whyItHelps: `${product.sku} gives the room a camera you can aim and zoom, with a clean feed into video calls, recording, streaming or the AV network.`,
      whyCustomerCares: "Everyone on the call sees the room clearly instead of a fixed, distant webcam shot, and the picture can go wherever the job needs it.",
      useWhen: "Use it where camera position, zoom, presets, NDI, HDMI or USB connection options matter.",
      avoidIf: "Avoid leading with this if the requirement is only a small personal webcam or if the customer has not confirmed camera location and host connection.",
      suggestedWording: `${product.sku} is a flexible PTZ camera option when the customer needs better room coverage and more connection flexibility than a standard webcam.`,
      demoPrompt: "Suggest a camera demo or evaluation when the customer needs to see the difference between fixed framing and PTZ room coverage.",
      askNow: ["Who or what needs to be seen clearly - the presenter, the whole room, or a whiteboard?", "Where would the camera sit - on top of the screen, at the back, or on the ceiling?", "Is this for video calls (Teams, Zoom), recording lessons, live streaming, or a mix?", "Should someone move and zoom it, or should it just follow people on its own?"],
      diagramSource: "Presenter / room participants",
      diagramOutput: "UC host, HDMI system or NDI network",
      visualPrompt: `Create a realistic meeting or teaching space showing ${product.sku} as a PTZ camera mounted with clear sightlines to the participants, with a display, table, room PC or BYOD laptop and simple AV cabling shown conceptually.`
    };
  }

  if (role === "audio") {
    const drivesSpeakers = drivesRoomSpeakers(product);
    return {
      role,
      headline: drivesSpeakers
        ? "Use this when audio needs proper amplification and network-aware integration."
        : "Use this when the room needs to be heard clearly on calls and in the space.",
      whatItIs,
      customerChallenge: "The customer needs room audio that is reliable, controllable and suitable for the space rather than relying on display speakers or ad-hoc audio.",
      whyItHelps: drivesSpeakers
        ? `${product.sku} powers the room's speakers and ties the sound into the rest of the AV system, so speech and programme audio stay clear and loud enough without leaning on the display's built-in speakers.`
        : `${product.sku} handles the room's audio - capturing voices and playing sound back clearly - so people can hear and be heard without relying on a laptop or display's own microphone and speaker.`,
      whyCustomerCares: "People can hear and be heard in the room and on calls, without anyone straining to catch what is said.",
      useWhen: `Use it where ${mainFeature.toLowerCase()} is relevant and the room needs installed audio rather than simple display audio.`,
      avoidIf: "Avoid positioning it before confirming speaker load, room size, Dante/network requirements and who is responsible for audio tuning.",
      suggestedWording: `${product.sku} is best explained as the audio part of the system that helps make the room sound right, not just another accessory in the rack.`,
      demoPrompt: "Suggest a demo or evaluation where the customer is concerned about clarity, coverage, audio consistency or Dante integration.",
      askNow: ["Do people struggle to hear in the room, or to be heard on calls today?", "Is the sound mainly for talking (presentations, lessons), or also music and video?", "Should the sound stay in this room, or also reach other spaces?", "Is there someone on site who looks after the audio, or does it need to just work?"],
      diagramSource: "Audio source / DSP / Dante network",
      diagramOutput: "Room speakers / audio zones",
      visualPrompt: `Create a realistic meeting, classroom or hospitality room showing installed loudspeakers connected to ${product.sku}, with a rack or local equipment position and a simple network/audio path shown conceptually.`
    };
  }

  if (role === "avoip") {
    return {
      role,
      headline: "Use this when the system needs flexible AV routing over the network.",
      whatItIs,
      customerChallenge: "The customer needs sources and displays to work across rooms, zones or a larger site without being limited by a fixed local matrix.",
      whyItHelps: `${product.sku} moves AV over the network instead of direct cabling, so any source can reach any screen across the building and the routing can be changed in software later.`,
      whyCustomerCares: "The customer can add rooms, screens and sources later without re-cabling the building, and send anything to anywhere from one place.",
      useWhen: "Use it where source/display count, distance, flexibility or site-wide routing justifies AV-over-IP.",
      avoidIf: "Avoid using AVoIP as the default answer for a small local room unless routing, scale or future flexibility makes it necessary.",
      suggestedWording: `${product.sku} is part of a flexible networked AV route when the customer needs more than simple local switching.`,
      demoPrompt: "Suggest a demo where the customer needs to understand routing flexibility, multiview, endpoint behaviour or networked control.",
      askNow: ["Is this one room, a few rooms, or spread across a building or whole site?", "Do they want to send any source to any screen, and change it around easily later?", "Is anyone showing fast-moving content like live sport or gaming, where any delay would be noticed?", "Is there an IT team and a network we can use, or do we need to provide one?"],
      diagramSource: "Sources / encoders",
      diagramOutput: "Network switch / decoders / displays",
      visualPrompt: `Create a clean AV-over-IP system visual showing source devices, ${product.sku}, network switch, controller and displays across multiple room zones.`
    };
  }

  if (role === "multiview") {
    return {
      role,
      headline: "Use this when the customer needs several sources visible at the same time.",
      whatItIs,
      customerChallenge: "The customer does not just need to switch sources; they need to see multiple sources together on one output canvas.",
      whyItHelps: `${product.sku} combines several sources into one picture, so a single screen can show them all side by side instead of one at a time.`,
      whyCustomerCares: "Staff can watch everything that matters on one screen - games, feeds, channels or sources - without missing what is happening on the others.",
      useWhen: "Use it where multiview is the requirement. Multiple outputs alone does not mean multiview.",
      avoidIf: "Avoid it when the customer simply needs routing to several displays rather than multiple sources on one screen.",
      suggestedWording: `${product.sku} is for showing multiple sources together on one screen, which is different from simply routing one source to one display.`,
      demoPrompt: "Suggest a demo where the customer needs to see layout behaviour, quad view, source composition or processor feed behaviour.",
      askNow: ["Do they need to see several things on one screen at the same time, not just switch between them?", "How many need to be visible at once, and roughly how should they be arranged?", "Is this for a control room, a sports bar, a classroom, or signage?", "Which screen shows the combined view?"],
      diagramSource: "Multiple HDMI / AV sources",
      diagramOutput: "Single multiview display or processor feed",
      visualPrompt: `Create a realistic room visual showing ${product.sku} feeding a display that shows multiple sources on one screen, suitable for a sports bar, teaching space or control room.`
    };
  }

  if (role === "videoWall") {
    return {
      role,
      headline: "Use this when the customer needs a clear wall-processing path.",
      whatItIs,
      customerChallenge: "The customer needs content to appear correctly across an LCD or LED wall, and the sales user must understand whether this is fixed wall processing or flexible routing.",
      whyItHelps: `${product.sku} drives a group of screens as one wall - one large picture spread across them, or different content in each section - from the sources you feed it.`,
      whyCustomerCares: "The wall looks like one deliberate display rather than a row of unrelated screens, and everyone agrees up front how it will behave.",
      useWhen: "Use it where wall layout, source behaviour and display/processor type are central to the requirement.",
      avoidIf: "Avoid finalising the product until wall type, resolution, layout, source behaviour and processor path are confirmed.",
      suggestedWording: `${product.sku} is a wall-processing option when the customer needs a defined way to feed and manage a display wall.`,
      demoPrompt: "Suggest a demo or proof-of-concept where the customer needs to confirm wall layouts, source behaviour or processor integration.",
      askNow: ["How many screens make up the wall, and how are they arranged (for example 2 by 2)?", "Are they normal TV-style screens, or one big LED wall?", "Should it show one big picture across the whole wall, or several separate pictures?", "What will be shown on it, and who decides what's on it?"],
      diagramSource: "Sources / signage / media players",
      diagramOutput: "LCD wall or LED processor",
      visualPrompt: `Create a realistic visual of an AV room or hospitality space with a display wall fed by ${product.sku}, showing sources and a simple processor path conceptually.`
    };
  }

  if (role === "presentation") {
    return {
      role,
      headline: "Use this when the room needs a simple, user-friendly presentation core.",
      whatItIs,
      customerChallenge: "The customer needs users to connect laptops or room sources without turning the room into a complicated AV system.",
      whyItHelps: `${product.sku} gives the room one place to plug in, picks up the chosen laptop or room source and puts it on the screen, and passes the room camera and microphone back to the laptop where the model supports it.`,
      whyCustomerCares: "People walk in, connect and present without help, so the room actually gets used and the support desk hears less about it.",
      useWhen: "Use it where laptop input, local switching, display output and user experience are the main concerns.",
      avoidIf: "Avoid it where the real requirement is large-scale routing, complex AV-over-IP or specialist video-wall processing.",
      suggestedWording: `${product.sku} is a room-friendly presentation product for customers who want a cleaner way to connect and present.`,
      demoPrompt: "Suggest a demo where the customer wants to test ease of use, source switching or BYOD/BYOM behaviour.",
      askNow: ["How do people want to share - plug in a cable, or connect wirelessly?", "Do guests bring their own laptops, or is there a room PC?", "Is the room used for video calls as well as presenting?", "How many screens are in the room?"],
      diagramSource: "Laptop / room source",
      diagramOutput: "Display / projector / UC path",
      visualPrompt: `Create a realistic meeting room showing ${product.sku} as the presentation core between laptops, a room display and any USB or conferencing devices.`
    };
  }

  if (role === "extension") {
    return {
      role,
      headline: "Use this when the main problem is distance or cable path.",
      whatItIs,
      customerChallenge: "The customer needs a signal to travel reliably from source to display without assuming a short HDMI cable will work.",
      whyItHelps: `${product.sku} carries the picture from the source to a screen that is too far away for an ordinary HDMI lead, over a single installed cable run.`,
      whyCustomerCares: "The screen can go where the room needs it, with no dropouts or sparkle from a cable run that was always going to be too long.",
      useWhen: "Use it where distance, cable type or remote display/source locations drive the product choice.",
      avoidIf: "Avoid it if the customer actually needs switching, matrix routing, multiview or AV-over-IP flexibility.",
      suggestedWording: `${product.sku} is the transport part of the design, used where the signal path needs to cover distance reliably.`,
      demoPrompt: "Suggest evaluation where cable length, resolution, USB or installation conditions are uncertain.",
      askNow: ["Roughly how far apart are the source and the screen?", "Is there already cabling between them, or does it need running?", "Does anything need to plug in at the far end, like a keyboard, mouse or touchscreen?", "Is the screen a normal 4K TV, or something more specialised?"],
      diagramSource: "Source device",
      diagramOutput: "Remote display / projector",
      visualPrompt: `Create a simple room or classroom visual showing ${product.sku} extending AV from a source location to a remote display or projector.`
    };
  }

  if (role === "matrix") {
    return {
      role,
      headline: "Use this when several screens each need to show a different source.",
      whatItIs,
      customerChallenge: "The customer has several sources and several screens, and each screen needs to show its own source - not all the same picture, and not just one screen choosing between inputs.",
      whyItHelps: `${product.sku} connects every source to every screen and lets each screen show whichever source you choose, so one central box drives the whole system instead of re-plugging cables.`,
      whyCustomerCares: "Staff can put the right content on the right screen at any time - different channels in different areas, or the same one everywhere - without touching the cabling.",
      useWhen: "Use it where different displays or zones need different sources at the same time, the source and screen count is known, and the system is a fixed install rather than something that keeps growing across the site.",
      avoidIf: "Avoid it when only one screen needs to choose between sources (that is a switcher), when every screen always shows the same picture (that is a splitter), or when the customer needs easy expansion across many rooms (look at AV-over-IP).",
      suggestedWording: `${product.sku} is the central box that lets each screen show its own source, sized to the sources and screens the customer actually has.`,
      demoPrompt: "Suggest a demo where the customer wants to see independent routing - different sources on different screens - and how presets make it simple to operate.",
      askNow: ["How many sources and how many screens are there?", "Does each screen need to show something different at the same time, or do they all show the same thing?", "Are the screens close to the rack, or spread around the building?", "Who changes what's on each screen, and how do they want to do it?"],
      diagramSource: "Several sources (media players, PCs, set-top boxes)",
      diagramOutput: "Several displays or zones, each showing its own source",
      visualPrompt: `Create a realistic hospitality or boardroom visual showing ${product.sku} routing several sources to several displays, each able to show a different source.`
    };
  }

  if (role === "wireless") {
    return {
      role,
      headline: "Use this when people need to share on screen without plugging in a cable.",
      whatItIs,
      customerChallenge: "Guests and staff want to put what is on their laptop or phone onto the room screen quickly, without hunting for the right cable or adapter.",
      whyItHelps: `${product.sku} puts whatever is on a laptop or phone onto the room screen over the network, so people share in seconds without plugging anything in.`,
      whyCustomerCares: "Meetings start faster, visitors are not left looking for adapters, and the table stays tidy.",
      useWhen: "Use it where quick, cable-free sharing matters and the room's network and IT policy allow casting.",
      avoidIf: "Avoid leading with it where the network or IT policy will not allow casting, or where the room needs guaranteed, zero-delay video that only a wired path can promise.",
      suggestedWording: `${product.sku} is the cable-free way to share on the room screen, usually alongside the room's wired connection rather than instead of it.`,
      demoPrompt: "Suggest a demo where the customer wants to see how quickly a guest can share from their own device, and how it behaves on their network.",
      askNow: ["Do people want to share by plugging in a cable, connecting wirelessly, or both?", "Will guests need to share from their own laptops or phones?", "Does the IT team allow devices to connect to the room over the network?", "Is anyone showing fast-moving video where a slight delay would be a problem?"],
      diagramSource: "Laptop, tablet or phone",
      diagramOutput: "Room display or presentation system",
      visualPrompt: `Create a realistic meeting room visual showing ${product.sku} receiving a wireless share from a laptop or phone and putting it on the room display.`
    };
  }

  const purpose = purposePhrase(product);

  return {
    role,
    headline: purpose
      ? `Use this when the customer genuinely needs ${purpose}.`
      : "Use this once you have confirmed what the customer actually needs this product to do.",
    whatItIs,
    customerChallenge: purpose
      ? `The customer has a real room or system problem - ${purpose} - and needs to know this product genuinely solves it, not just that it carries the right part number.`
      : "The customer has a real room or system problem, and the useful conversation is which job they need this product to do, not its part number. Confirm the requirement before positioning it.",
    whyItHelps: `${product.sku} earns its place only when the room genuinely needs what it does. The practical check is what connects on each side, what dependencies come with it, and whether it removes a real design problem instead of adding another box.`,
    whyCustomerCares: "What earns the order is tying the product to a specific frustration the customer recognises, and being honest about where it fits and where it does not.",
    useWhen: purpose
      ? `Use it where the requirement is genuinely ${purpose}, and the room's connections, distances and control needs line up with what this product does.`
      : "Use it where the requirement matches what this product actually does, and the room's connections, distances and control needs line up with it.",
    avoidIf: "Avoid making a firm recommendation until the application, signal path, I/O, distance and control requirements are confirmed - it is always safer to ask one more question than to quote the wrong box.",
    suggestedWording: purpose
      ? `${product.sku} is worth discussing when the customer genuinely needs ${purpose}, once we can explain what it connects to and why it is the right system role.`
      : `${product.sku} is worth discussing once we have confirmed the job it needs to do and can explain what it connects to on each side.`,
    demoPrompt: "Suggest a demo or evaluation where the customer needs to see it working before they commit - especially if this is an unfamiliar product for them or for you.",
    askNow: ["What exactly is this product expected to connect to or replace?", "Where does it sit in the room or signal path today?", "What dependency would make this unsafe to quote without checking first?", "If this product is selected, what still needs to be confirmed before proposal stage?"],
    diagramSource: "Customer source / system input",
    diagramOutput: "Display / room system / destination",
    visualPrompt: `Create a realistic AV room concept showing ${product.sku} used in context with labelled source, WyreStorm device, display, network/control and any TBC devices.`
  };
}

// Judge how much of a generated (non-governed) narrative can be trusted, so the
// UI can tell a non-expert rep when to verify before quoting. A clear role plus
// a real application or verified spec is "medium"; an unclassified record with no
// usable purpose is "low" and should be treated as a prompt to check, not a fact.
function assessConfidence(
  product: ProductSpec,
  role: ProductRole,
): { confidence: NarrativeConfidence; reviewNote: string } {
  const application = firstMeaningful(product.applications, "");
  const hasApplication = Boolean(application) && !isPlaceholderText(application);
  const hasVerifiedFeature = headlineFeatures(product, 3, { verifiedOnly: true }).length > 0;
  const hasPurpose = purposePhrase(product) !== null;

  if (role !== "general" && hasPurpose && (hasApplication || hasVerifiedFeature)) {
    return {
      confidence: "medium",
      reviewNote:
        "This positioning is generated from the product index, not a reviewed product story. Spot-check the specification and application against the current datasheet before quoting.",
    };
  }

  return {
    confidence: "low",
    reviewNote:
      "This product has no reviewed sales story yet, so its role and positioning are inferred from a limited catalogue record. Confirm what it is, what it connects to and where it fits against the current datasheet before quoting.",
  };
}

// Public entry point: take the role template (for consistent family voice) and
// override the most prominent, previously-generic fields with SKU-specific,
// feature-led, range-aware language so every product reads as itself.
export function buildProductNarrative(product: ProductSpec): ProductNarrative {
  const enrichedProduct = applyProductStoryToSpec(product);
  const base = buildRoleNarrative(enrichedProduct);
  const story = getProductStory(enrichedProduct.sku);

  if (story) {
    return {
      ...base,
      confidence: "high",
      headline: story.oneLinePosition,
      whatItIs: story.whatItIs,
      customerChallenge: story.customerProblem,
      whyItHelps: story.whatItDoes,
      whyCustomerCares: story.familyContext,
      useWhen: story.whenToUse.join(" "),
      avoidIf: story.whenNotToUse.join(" "),
      suggestedWording: story.customerSafeWording,
      demoPrompt: story.salesTalkTrack,
      askNow: story.discoveryQuestions,
      diagramSource: story.diagramSource || base.diagramSource,
      diagramOutput: story.diagramOutput || base.diagramOutput,
      visualPrompt:
        base.role === "camera"
          ? `Create a realistic camera-focused AV room visual showing ${story.sku} in context. Show the camera position, customer problem, source path, output destination and any items still to be confirmed.`
          : `Create a realistic AV application visual showing ${story.sku} in context. Show the customer problem, related WyreStorm products where relevant, source path, display/output path and any items still to be confirmed.`,
    };
  }

  return {
    ...base,
    ...assessConfidence(enrichedProduct, base.role),
    headline: skuHeadline(enrichedProduct, base.role),
    whatItIs: skuWhatItIs(enrichedProduct, base.role),
    suggestedWording: skuSuggestedWording(enrichedProduct, base.role, base.suggestedWording),
  };
}
