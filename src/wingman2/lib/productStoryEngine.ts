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
};

export type ProductNarrative = {
  role: ProductRole;
  headline: string;
  whatItIs: string;
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
    related: firstList(source, ["related", "relatedProducts", "alternatives", "companionProducts"], [])
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

export function inferProductRole(product: ProductSpec): ProductRole {
  const text = productText(product);

  if (text.includes("ptz") || text.includes("camera") || text.includes("ndi")) return "camera";
  if (text.includes("amplifier") || text.includes("dante") || text.includes("dsp") || text.includes("speaker")) return "audio";
  if (text.includes("multiview") || text.includes("multi-view") || text.includes("quad")) return "multiview";
  if (text.includes("video wall") || text.includes("videowall") || text.includes("led wall")) return "videoWall";
  if (text.includes("networkhd") || text.includes("avoip") || text.includes("av over ip") || text.includes("encoder") || text.includes("decoder")) return "avoip";
  if (text.includes("matrix")) return "matrix";
  if (text.includes("presentation") || text.includes("usb-c") || text.includes("byod") || text.includes("byom")) return "presentation";
  if (text.includes("hdbaset") || text.includes("extender") || text.includes("transmitter") || text.includes("receiver")) return "extension";
  if (text.includes("wireless") || text.includes("airplay") || text.includes("miracast")) return "wireless";

  return "general";
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

const FEATURE_SPLITTER = /\s*[|•·]\s*/;

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

function productKind(product: ProductSpec, role: ProductRole): string {
  const endpoint = endpointRole(product.sku);

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
      return /\bndi\b/i.test(productText(product)) ? "NDI-capable PTZ conference camera" : "PTZ conference camera";
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

function headlineFeatures(product: ProductSpec, limit = 6): string[] {
  const tags = product.capabilityTags ?? [];
  const broadText = [product.description, product.name, ...tags, ...product.video, ...product.audio].join(" | ");
  const extracted = capabilitiesFromText(broadText);
  const pipeTokens = product.description.includes("|") ? product.description.split(FEATURE_SPLITTER) : [];
  // Extracted capability phrases lead (clean and specific), then pipe-delimited
  // spec tokens, then the full capability-tag pool.
  const pool = [...extracted, ...pipeTokens, ...tags, ...product.video, ...product.audio];

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

// Multi-function vs single-purpose, judged by how many distinct capability
// dimensions the product carries (video + USB + audio + control + power).
function functionBreadth(product: ProductSpec): "multi" | "single" {
  const feats = headlineFeatures(product, 12).join(" | ").toLowerCase();
  const dimensions = [
    /usb/,
    /dante|audio|s\/pdif|arc|de-?embed/,
    /\bir\b|rs-?232|control|cec|\bapi\b/,
    /poe|power delivery/,
    /4k|hdr|dolby|4:4:4/,
  ].filter((pattern) => pattern.test(feats)).length;

  return dimensions >= 3 ? "multi" : "single";
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

function skuHeadline(product: ProductSpec, role: ProductRole): string {
  const feats = headlineFeatures(product, 3);
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

function skuWhatItIs(product: ProductSpec, role: ProductRole): string {
  const kind = productKind(product, role);
  const feats = headlineFeatures(product, 5);
  const featureClause = feats.length ? ` Headline capability: ${feats.join(", ")}.` : "";
  const connections = connectionList(product, 5);
  const connectionClause = connections.length ? ` It connects via ${connections.join(", ")}.` : "";
  const breadthClause =
    functionBreadth(product) === "multi"
      ? " This is a multi-function endpoint - it carries video plus USB, audio and control together rather than doing one job."
      : " It is a focused, single-purpose device.";
  const range = rangeRelationship(product);
  const rangeClause = range ? ` ${range}` : "";

  return `${product.sku} (${product.name}) is ${articleFor(kind)} ${kind}.${featureClause}${connectionClause}${breadthClause}${rangeClause}`;
}

function skuSuggestedWording(product: ProductSpec, role: ProductRole, fallback: string): string {
  const kind = productKind(product, role);
  const feats = headlineFeatures(product, 3);
  const application = firstMeaningful(product.applications, "this kind of room or system").toLowerCase();
  const lead = feats.length ? `, leading with ${feats.slice(0, 3).join(", ")}` : "";
  const range = rangeRelationship(product);
  const pitch = `"${product.sku} is the ${kind} for ${application}${lead}."`;

  return range ? `${pitch} Then place it in the range: ${range}` : `${pitch} ${fallback}`;
}

function buildRoleNarrative(product: ProductSpec): ProductNarrative {
  const role = inferProductRole(product);
  const mainApplication = firstMeaningful(product.applications, "the right room or system workflow");
  const mainFeature = firstMeaningful(product.keyFeatures, product.productType);
  const whatItIs = `${product.sku} is a ${product.productType.toLowerCase()} for ${mainApplication.toLowerCase()}.`;

  if (role === "camera") {
    return {
      role,
      headline: "Use this when a basic webcam is not enough.",
      whatItIs,
      customerChallenge: "The customer needs better room coverage, zoom, framing or capture flexibility than a fixed USB webcam can provide.",
      whyItHelps: `${product.sku} gives the design a controllable camera path that can support conferencing, capture, streaming or network video depending on how the room is being used.`,
      whyCustomerCares: "It helps the room feel more professional on calls and gives the system designer more ways to route or capture the camera image.",
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
    return {
      role,
      headline: "Use this when audio needs proper amplification and network-aware integration.",
      whatItIs,
      customerChallenge: "The customer needs room audio that is reliable, controllable and suitable for the space rather than relying on display speakers or ad-hoc amplification.",
      whyItHelps: `${product.sku} supports a cleaner audio design by combining amplification, processing and integration points that can sit inside a wider AV system.`,
      whyCustomerCares: "It helps make speech, programme audio and room reinforcement easier to manage and more professional for everyday users.",
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
      whyItHelps: `${product.sku} sits in a NetworkHD-style architecture where endpoints, switching and network planning define the system shape.`,
      whyCustomerCares: "It helps support future expansion, flexible routing and distributed AV where a simple point-to-point connection is not enough.",
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
      whyItHelps: `${product.sku} helps create a combined view so a display, processor or monitoring point can show more than one source at once.`,
      whyCustomerCares: "It makes the display more useful for monitoring, sports, signage, operations or teaching workflows.",
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
      whyItHelps: `${product.sku} helps define the wall behaviour before the design jumps to AVoIP or matrix switching.`,
      whyCustomerCares: "It reduces confusion around wall layout, source behaviour and processor input expectations.",
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
      whyItHelps: `${product.sku} helps centralise the presentation workflow so source selection, display output and any USB/BYOD requirements are easier to explain.`,
      whyCustomerCares: "It can make the room easier to use and reduce support calls.",
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
      whyItHelps: `${product.sku} gives the system a defined extension or transport path that can be checked against distance, resolution and USB needs.`,
      whyCustomerCares: "It makes the installation more predictable and reduces signal-risk surprises.",
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

  return {
    role,
    headline: "Use this when the product role matches the customer's real requirement.",
    whatItIs,
    customerChallenge: "The customer needs a product that solves the actual room or system problem, not just a part number.",
    whyItHelps: `${product.sku} may fit when the application, I/O, signal path and install conditions match its role.`,
    whyCustomerCares: "It gives the customer a clearer reason to consider the product and gives the salesperson a safer way to position it.",
    useWhen: `Use it where ${product.purpose.toLowerCase()}`,
    avoidIf: "Avoid making a firm recommendation until the application, signal path, I/O, distance and control requirements are confirmed.",
    suggestedWording: `${product.sku} is worth considering where the customer requirement matches its core role: ${product.purpose}`,
    demoPrompt: "Suggest a demo or evaluation where the customer needs confidence before choosing the product.",
    askNow: ["What's the one thing they're hoping this will fix or make easier?", "What's in the room today, and what's frustrating about it?", "Who uses the room, and how comfortable are they with technology?", "What would make them feel confident enough to go ahead?"],
    diagramSource: "Customer source / system input",
    diagramOutput: "Display / room system / destination",
    visualPrompt: `Create a realistic AV room concept showing ${product.sku} used in context with labelled source, WyreStorm device, display, network/control and any TBC devices.`
  };
}

// Public entry point: take the role template (for consistent family voice) and
// override the most prominent, previously-generic fields with SKU-specific,
// feature-led, range-aware language so every product reads as itself.
export function buildProductNarrative(product: ProductSpec): ProductNarrative {
  const base = buildRoleNarrative(product);

  return {
    ...base,
    headline: skuHeadline(product, base.role),
    whatItIs: skuWhatItIs(product, base.role),
    suggestedWording: skuSuggestedWording(product, base.role, base.suggestedWording),
  };
}