import type { CatalogProduct } from "./types";

export type ProductTypeGroup =
  | "distribution"
  | "extender"
  | "matrix"
  | "avoip"
  | "camera"
  | "audio"
  | "uc"
  | "switcher"
  | "control"
  | "casting"
  | "videowall"
  | "other";

export type ProductTypeClassification = {
  group: ProductTypeGroup;
  primaryType: string;
  category: string;
  label: string;
  tags: string[];
  requiredTags: string[];
};

type ProductTypeInput = {
  sku?: string;
  family?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  summary?: string;
  description?: string;
  technology?: string;
  topology?: string;
  role?: string;
  directionality?: string;
  outputBehavior?: string;
  transport?: string;
  features?: string[];
  audio?: string[];
  control?: string[];
  notes?: string;
  normalizedTags?: string[];
  matchKeywords?: string[];
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeText(...values: unknown[]): string {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-z0-9+./ -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupe(values: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(values).map((value) => tidy(value).toLowerCase()).filter(Boolean)));
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function buildClassification(input: {
  group: ProductTypeGroup;
  primaryType: string;
  category: string;
  label: string;
  tags?: string[];
  requiredTags?: string[];
}): ProductTypeClassification {
  const tags = dedupe([input.group, input.primaryType, ...(input.tags || [])]);
  const requiredTags = dedupe(input.requiredTags || [input.primaryType]);
  return {
    group: input.group,
    primaryType: input.primaryType,
    category: input.category,
    label: input.label,
    tags,
    requiredTags,
  };
}

export function classifyProductType(input: ProductTypeInput): ProductTypeClassification {
  const sku = tidy(input.sku).toUpperCase();
  const family = tidy(input.family).toUpperCase();
  const text = normalizeText(
    sku,
    family,
    input.name,
    input.category,
    input.subcategory,
    input.summary,
    input.description,
    input.technology,
    input.topology,
    input.role,
    input.directionality,
    input.outputBehavior,
    input.transport,
    input.features,
    input.audio,
    input.control,
    input.normalizedTags,
    input.matchKeywords,
  );

  const apolloFamily =
    sku.startsWith("APO-") || family.startsWith("APO") || has(text, /\bapollo\b/);
  const synergyFamily =
    sku.startsWith("SW-") || family === "SW" || family.includes("SWITCHER");
  const matrixFamily =
    sku.startsWith("MX-") || family.startsWith("MX") || has(text, /\bmatrix\b/);
  const wirelessCasting = has(text, /\bwireless casting\b|\bwireless presentation\b|\bwireless conference\b|airplay|miracast/);
  const usbDongle =
    !apolloFamily &&
    !has(text, /\bspeakerphone\b/) &&
    !has(text, /\bmic(?:rophone)?\b/) &&
    !has(text, /\bspeaker\b|\bspeakers\b|\bvideo[- ]speakerphone\b|\bsoundbar\b/) &&
    has(text, /\bdongle\b/) &&
    (wirelessCasting || has(text, /\busb[- ]?c\b|\busb c\b/));
  const videoBar = has(text, /\bvideo bar\b|\bvideobar\b|\bsoundbar\b/);
  const webcam = has(text, /\bweb ?cam\b/);
  const cameraLike = webcam || has(text, /\bcamera\b|\bptz\b|\bndi\b/);
  const ptzCamera = has(text, /\bptz\b/);
  const ndiCamera = cameraLike && has(text, /\bndi\b/);
  const streamingCamera = cameraLike && has(text, /\bstream(?:ing)?\b|\bnetwork streaming\b/);
  const dante = has(text, /\bdante\b|\baes67\b/);
  const amplifier = has(text, /\bamp(?:lifier)?\b/);
  const microphone = has(text, /\bmic(?:rophone)?\b/);
  const speaker =
    has(text, /\bspeaker\b|\bspeakers\b|\bvideo[- ]speakerphone\b|\bsoundbar\b/);
  const usb = has(text, /\busb(?:[- ]?c|[- ]?a|[- ]?b|[- ]?2\.0|[- ]?3\.0|[- ]?3\.2|\b)/);
  const speakerphone = has(text, /\bspeakerphone\b/);
  const avoipLike =
    family.startsWith("NHD") ||
    has(text, /\bnetworkhd\b|\bav over ip\b|\bavoip\b|\bsdvoe\b|\bdante av-a\b/);
  const encoder = has(text, /\bencoder\b|\btx\b|\btransmitter\b/);
  const decoder = has(text, /\bdecoder\b|\brx\b|\breceiver\b/);
  const controller =
    family.includes("CTL") ||
    has(text, /\bcontroller\b|\bcontrol processor\b|\bcontrol gateway\b|\bmanagement controller\b|\bav controller\b/);
  const matrix =
    !synergyFamily &&
    (matrixFamily ||
      has(text, /\bmatrix(?: switch| switcher| kit| chassis)\b/) ||
      (has(text, /\bmatrix\b/) && has(text, /\b\d+x\d+\b/)));
  const matrixKit =
    matrix &&
    (has(text, /\bmatrix kit\b|\bwith included receivers\b|\bincludes \d+ receivers\b|\bincluded receivers\b/) ||
      (has(text, /\bkit\b/) && has(text, /\breceiver\b|\breceivers\b/)));
  const matrixDock =
    matrix &&
    !matrixKit &&
    (has(text, /\bmst\b|\bdock(?:ing)?\b/) ||
      (has(text, /\busb[- ]?c\b/) &&
        has(text, /\bcharging\b|\bpassthrough\b|\bgpio\b|\b1gbe\b|\b2\.5gbe\b/)));
  const advancedMatrix =
    matrix &&
    !matrixKit &&
    !matrixDock &&
    has(text, /\bvideo wall\b|\bvideowall\b|\bmultiview\b|\bseamless\b/);
  const splitter =
    family === "SP" ||
    has(text, /\bsplitter\b|\bdistribution amplifier\b|\bdistribution amp\b|\bhdmi da\b/);
  const extendersByFamily =
    family === "EX" ||
    family === "EX3" ||
    family === "EXA" ||
    family === "EXF" ||
    family === "TX" ||
    family === "TX3" ||
    family === "RX" ||
    family === "RX3" ||
    family === "RXF" ||
    family === "RXV";
  const extenderLike =
    !avoipLike &&
    (extendersByFamily ||
      has(text, /\bextender\b|\bhdbaset extender\b|\btransmitter\b|\breceiver\b/));
  const extenderKit =
    extenderLike &&
    (has(text, /\bextender set\b|\bextender kit\b|\btransmitter and receiver kit\b/) ||
      (has(text, /\bkit\b|\bset\b/) && has(text, /\breceiver\b|\btransmitter\b|\bextender\b/)));
  const extenderTransmitter =
    extenderLike && !extenderKit && (family === "TX" || family === "TX3" || has(text, /\btransmitter\b|\btx\b/));
  const extenderReceiver =
    extenderLike && !extenderKit && (family === "RX" || family === "RX3" || family === "RXV" || has(text, /\breceiver\b|\brx\b/));
  const micHub =
    has(text, /\bmicrophone hub\b|\bmicrophone mixer\b|\bmixer\b/) ||
    (has(text, /\bhub\b/) && microphone);
  const ucSignals =
    has(text, /\bunified communications\b|\bconference\b|\bteams\b|\bzoom\b|\bbyom\b|\bbyod\b|\bmeeting appliance\b|\bvideo[- ]speakerphone\b/);
  const presentationSwitcher =
    !extenderLike &&
    !apolloFamily &&
    (has(text, /\bpresentation switcher\b|\bmulti[- ]?format\b/) ||
      (synergyFamily && has(text, /\bswitcher\b|\bswitch\b/)) ||
      (has(text, /\bswitcher\b|\bswitch\b/) && has(text, /\bpresentation\b|\busb[- ]?c\b|\bdual[- ]view\b|\bquad view\b/)));
  const ucAppliance =
    !cameraLike &&
    !extenderLike &&
    !avoipLike &&
    !matrix &&
    ((apolloFamily && (ucSignals || microphone || speaker || speakerphone || wirelessCasting || usb)) ||
      has(text, /\bpresentation and uc\b|\bunified communications\b|\bmeeting appliance\b|\bbyom\b|\bvideo[- ]speakerphone\b/) ||
      ((speakerphone || microphone || speaker) &&
        (presentationSwitcher || wirelessCasting || usb || ucSignals)));
  const touchController = has(text, /\btouch(?:screen|pad)?\b/) && controller;
  const videoWall = has(text, /\bvideo wall\b|\bvideowall\b/);

  if (usbDongle) {
    return buildClassification({
      group: "casting",
      primaryType: "usb-casting-dongle",
      category: "Accessories",
      label: "USB Casting Dongle",
      tags: ["wireless-casting"],
      requiredTags: ["usb-casting-dongle"],
    });
  }

  if (videoBar) {
    return buildClassification({
      group: "uc",
      primaryType: "uc-soundbar",
      category: "UC",
      label: "UC Soundbar",
      tags: wirelessCasting ? ["wireless-casting"] : [],
      requiredTags: ["uc-soundbar", ...(wirelessCasting ? ["wireless-casting"] : [])],
    });
  }

  if (ucAppliance) {
    return buildClassification({
      group: "uc",
      primaryType: "uc-appliance",
      category: "UC",
      label: "UC Appliance",
      tags: [
        ...(presentationSwitcher ? ["presentation-switcher"] : []),
        ...(wirelessCasting ? ["wireless-casting"] : []),
      ],
      requiredTags: ["uc-appliance"],
    });
  }

  if (cameraLike) {
    const tags = new Set<string>(["camera"]);
    const requiredTags = new Set<string>();
    let primaryType = "camera";
    let label = "Camera";

    if (webcam) {
      primaryType = "webcam";
      label = "Webcam";
      requiredTags.add("webcam");
      tags.add("webcam");
    }

    if (ptzCamera) {
      primaryType = primaryType === "camera" ? "ptz-camera" : primaryType;
      label = primaryType === "ptz-camera" ? "PTZ Camera" : label;
      requiredTags.add("ptz-camera");
      tags.add("ptz-camera");
    }

    if (streamingCamera) {
      if (primaryType === "camera") {
        primaryType = "streaming-camera";
        label = "Streaming Camera";
      }
      requiredTags.add("streaming-camera");
      tags.add("streaming-camera");
    }

    if (ndiCamera) {
      primaryType = "ndi-camera";
      label = "NDI Camera";
      requiredTags.add("ndi-camera");
      tags.add("ndi-camera");
    }

    return buildClassification({
      group: "camera",
      primaryType,
      category: "Camera",
      label,
      tags: Array.from(tags),
      requiredTags: requiredTags.size > 0 ? Array.from(requiredTags) : ["camera"],
    });
  }

  if (dante && amplifier) {
    return buildClassification({
      group: "audio",
      primaryType: "dante-amplifier",
      category: "Audio",
      label: "Dante Amplifier",
    });
  }

  if (micHub) {
    return buildClassification({
      group: "audio",
      primaryType: "microphone-hub",
      category: "Audio",
      label: "Microphone Hub",
    });
  }

  if (speakerphone) {
    return buildClassification({
      group: "audio",
      primaryType: "speakerphone",
      category: "Audio",
      label: "USB Speakerphone",
      tags: usb ? ["usb-microphone"] : [],
      requiredTags: ["speakerphone"],
    });
  }

  if (microphone && usb) {
    return buildClassification({
      group: "audio",
      primaryType: "usb-microphone",
      category: "Audio",
      label: "USB Microphone",
    });
  }

  if (avoipLike && encoder && decoder) {
    return buildClassification({
      group: "avoip",
      primaryType: "avoip-endpoint",
      category: "AVoIP",
      label: "AVoIP Endpoint",
      tags: ["avoip", "avoip-encoder", "avoip-decoder"],
      requiredTags: ["avoip-endpoint"],
    });
  }

  if (avoipLike && encoder) {
    return buildClassification({
      group: "avoip",
      primaryType: "avoip-encoder",
      category: "AVoIP",
      label: "AVoIP Encoder",
      tags: ["avoip", "avoip-endpoint"],
      requiredTags: ["avoip-encoder"],
    });
  }

  if (avoipLike && decoder) {
    return buildClassification({
      group: "avoip",
      primaryType: "avoip-decoder",
      category: "AVoIP",
      label: "AVoIP Decoder",
      tags: ["avoip", "avoip-endpoint"],
      requiredTags: ["avoip-decoder"],
    });
  }

  if (avoipLike && controller) {
    return buildClassification({
      group: "avoip",
      primaryType: "avoip-controller",
      category: "Control",
      label: "AVoIP Controller",
      tags: ["avoip"],
      requiredTags: ["avoip-controller"],
    });
  }

  if (splitter) {
    return buildClassification({
      group: "distribution",
      primaryType: "splitter",
      category: "Distribution",
      label: "Splitter",
    });
  }

  if (matrixKit) {
    return buildClassification({
      group: "matrix",
      primaryType: "matrix-kit",
      category: "Matrix",
      label: "Matrix Kit",
      tags: ["matrix-switch"],
      requiredTags: ["matrix-kit"],
    });
  }

  if (matrixDock) {
    return buildClassification({
      group: "matrix",
      primaryType: "matrix-dock",
      category: "Matrix",
      label: "Matrix Dock",
      tags: has(text, /\bhdbase?t\b|\bhdbaset\b/) ? ["hybrid-output"] : [],
      requiredTags: ["matrix-dock"],
    });
  }

  if (advancedMatrix) {
    return buildClassification({
      group: "matrix",
      primaryType: "advanced-matrix",
      category: "Matrix",
      label: "Advanced Matrix",
      tags: ["matrix-switch"],
      requiredTags: ["advanced-matrix"],
    });
  }

  if (matrix) {
    return buildClassification({
      group: "matrix",
      primaryType: "matrix-switch",
      category: "Matrix",
      label: "Matrix Switch",
      tags: has(text, /\bkit\b/) ? ["matrix-kit"] : [],
      requiredTags: ["matrix-switch"],
    });
  }

  if (presentationSwitcher) {
    const multiFormat = has(text, /\bmulti[- ]?format\b/) || (has(text, /\bhdmi\b/) && has(text, /\busb[- ]?c\b/));
    return buildClassification({
      group: "switcher",
      primaryType: "presentation-switcher",
      category: "Switcher",
      label: multiFormat ? "Multi Format Presentation Switcher" : "Presentation Switcher",
      tags: wirelessCasting ? ["wireless-casting"] : [],
      requiredTags: ["presentation-switcher", ...(wirelessCasting ? ["wireless-casting"] : [])],
    });
  }

  if (extenderKit) {
    return buildClassification({
      group: "extender",
      primaryType: "extender-kit",
      category: "Extender",
      label: "Extender Kit",
      tags: ["extender", "extender-endpoint"],
      requiredTags: ["extender-kit"],
    });
  }

  if (extenderTransmitter) {
    return buildClassification({
      group: "extender",
      primaryType: "extender-transmitter",
      category: "Extender",
      label: "Extender Transmitter",
      tags: ["extender", "extender-endpoint"],
      requiredTags: ["extender-transmitter"],
    });
  }

  if (extenderReceiver) {
    return buildClassification({
      group: "extender",
      primaryType: "extender-receiver",
      category: "Extender",
      label: "Extender Receiver",
      tags: ["extender", "extender-endpoint"],
      requiredTags: ["extender-receiver"],
    });
  }

  if (touchController) {
    return buildClassification({
      group: "control",
      primaryType: "touch-controller",
      category: "Control",
      label: "Touch Controller",
      tags: ["controller"],
      requiredTags: ["touch-controller"],
    });
  }

  if (controller) {
    return buildClassification({
      group: "control",
      primaryType: "controller",
      category: "Control",
      label: "Controller",
    });
  }

  if (videoWall) {
    return buildClassification({
      group: "videowall",
      primaryType: "video-wall-processor",
      category: "VideoWall",
      label: "Video Wall Processor",
    });
  }

  if (wirelessCasting) {
    return buildClassification({
      group: "casting",
      primaryType: "wireless-casting",
      category: "Switcher",
      label: "Wireless Casting",
      requiredTags: ["wireless-casting"],
    });
  }

  if (has(text, /\bswitcher\b|\bswitch\b/)) {
    return buildClassification({
      group: "switcher",
      primaryType: "switcher",
      category: "Switcher",
      label: "Switcher",
    });
  }

  if (has(text, /\baudio\b|\bspeaker\b|\bamplifier\b|\bmicrophone\b|\bmic\b/)) {
    return buildClassification({
      group: "audio",
      primaryType: "audio-device",
      category: "Audio",
      label: "Audio Device",
      requiredTags: ["audio"],
    });
  }

  if (has(text, /\bcamera\b/)) {
    return buildClassification({
      group: "camera",
      primaryType: "camera",
      category: "Camera",
      label: "Camera",
      requiredTags: ["camera"],
    });
  }

  return buildClassification({
    group: "other",
    primaryType: "other",
    category: "Other",
    label: "Other",
    requiredTags: ["other"],
  });
}

export function classifyCatalogProduct(product: Partial<CatalogProduct>): ProductTypeClassification {
  return classifyProductType({
    sku: product.sku,
    family: product.family,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    summary: product.summary,
    technology: product.technology,
    topology: product.topology,
    role: product.role,
    directionality: product.directionality,
    outputBehavior: product.outputBehavior,
    transport: product.transport,
    features: product.features,
    audio: product.audio,
    control: product.control,
    notes: product.notes,
    normalizedTags: product.normalizedTags,
    matchKeywords: product.matchKeywords,
  });
}

export function areProductTypesCompatible(
  requested: ProductTypeClassification,
  candidate: ProductTypeClassification,
): boolean {
  if (requested.group === "other" || candidate.group === "other") {
    return false;
  }

  if (requested.group !== candidate.group) {
    return false;
  }

  const candidateTags = new Set(candidate.tags);
  return requested.requiredTags.every((tag) => candidateTags.has(tag));
}
