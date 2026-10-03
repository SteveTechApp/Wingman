export type WingmanProductClass =
  | "distribution-amplifier"
  | "signal-extender-kit"
  | "transmitter"
  | "receiver"
  | "avoip-encoder"
  | "avoip-decoder"
  | "avoip-transceiver"
  | "matrix-switch"
  | "presentation-switcher"
  | "hdmi-switcher"
  | "uc-room-core"
  | "wireless-presentation"
  | "camera"
  | "camera-bridge"
  | "video-wall-processor"
  | "multiview-processor"
  | "audio-amplifier"
  | "audio-dsp"
  | "control-interface"
  | "cable"
  | "accessory"
  | "software-service"
  | "unknown";

export type WingmanTransportClass =
  | "hdmi"
  | "hdbaset"
  | "hdbaset-3"
  | "avoip-1g"
  | "avoip-10g"
  | "fibre"
  | "usb"
  | "wireless"
  | "audio"
  | "control"
  | "unknown";

export type WingmanFinderNeedLike = {
  query?: string;
  technologyType?: string;
  technicalRequirement?: string;
  productPath?: string;
  signalType?: string;
  sourceConnector?: string;
  displayConnector?: string;
  inputs?: string;
  outputs?: string;
  distance?: string;
  resolution?: string;
  usb?: string;
  processing?: string;
  network?: string;
  audio?: string;
  control?: string;
};

export type WingmanProductLike = {
  sku?: string;
  title?: string;
  name?: string;
  family?: string;
  category?: string;
  description?: string;
  tags?: string[];
  searchText?: string;
  primarySystemFamily?: string;
  commercialRole?: string;
  finderVisibility?: string;
  dependencyType?: string;
  showWhenRequestedBy?: string[];
  technicalProfile?: unknown;
};

export type WingmanSpecEvidenceSource = "governed" | "inferred";

/**
 * Compact governed-spec facts a rep can read at a glance: the verified I/O
 * count, USB version and signal reach behind a recommendation, plus whether
 * those facts came from the curated technicalProfile (`governed`) or were
 * inferred from catalogue text (`inferred`). Surfaces on the Recommendations
 * and Catalog pages answer "why did this product pass the gates" with the
 * actual spec evidence, not just the pass/fail verdict.
 */
export type WingmanSpecEvidence = {
  io: string | null;
  usb: string | null;
  reach: string | null;
  connectors: string[];
  transport: WingmanTransportClass[];
  source: WingmanSpecEvidenceSource;
};

export type WingmanProductProfile = {
  sku: string;
  productClass: WingmanProductClass;
  productRole: "primary" | "endpoint" | "accessory" | "software" | "unknown";
  salesType: string;
  technologyType: string;
  family: string;
  inputCount: number | null;
  outputCount: number | null;
  connectors: string[];
  transport: WingmanTransportClass[];
  /** Governed-spec summary surfaced next to recommendations (I/O, USB, reach). */
  specEvidence: WingmanSpecEvidence;
  features: {
    mst: boolean;
    wirelessCasting: boolean;
    multiview: boolean;
    videoWall: boolean;
    scaling: boolean;
    seamless: boolean;
    kvm: boolean;
    usb2: boolean;
    usb3: boolean;
    ir: boolean;
    rs232: boolean;
    telnet: boolean;
    ipControl: boolean;
    audioDeEmbed: boolean;
    audioEmbed: boolean;
    dante: boolean;
    dsp: boolean;
    relay: boolean;
    phantomPower: boolean;
    hdbaset: boolean;
    hdbaset3: boolean;
    network1g: boolean;
    network10g: boolean;
  };
  visibility: "default" | "request-only";
  validProductPaths: string[];
  invalidProductPaths: string[];
  searchBlob: string;
  /** Longest verified signal reach in metres (headline figure from the governed technicalProfile), null when not evidenced. */
  distanceMeters: number | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalise(value: unknown) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function squash(value: unknown) {
  return normalise(value).replace(/[^a-z0-9]+/g, "");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function includesAny(text: string, terms: string[]) {
  const n = normalise(text);
  return terms.some((term) => n.includes(normalise(term)));
}

function startsAny(value: string, prefixes: string[]) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function getText(product: WingmanProductLike) {
  return [
    product.sku,
    product.title,
    product.name,
    product.family,
    product.category,
    product.description,
    ...(Array.isArray(product.tags) ? product.tags : []),
    product.searchText,
    product.primarySystemFamily,
    product.commercialRole,
    product.finderVisibility,
    product.dependencyType,
    ...(Array.isArray(product.showWhenRequestedBy) ? product.showWhenRequestedBy : []),
  ]
    .map(clean)
    .join(" ");
}

function numberFromSkuSegment(segment: string) {
  const match = segment.match(/(\d)(\d)/);
  if (!match) return null;
  return {
    inputs: Number(match[1]),
    outputs: Number(match[2]),
  };
}

function inferIoFromSku(sku: string, text: string, productClass: WingmanProductClass) {
  const normalisedSku = sku.toUpperCase();

  // Cable/accessory/point-to-point SKUs encode length or item counts
  // (CAB-HAOC-15 is a 15m cable, EX-35-H2 reaches 35m) rather than I/O, so
  // their digit runs are never port figures - the class fallback below is
  // authoritative for them.
  const nonPortDigitClasses = new Set<WingmanProductClass>([
    "cable",
    "accessory",
    "signal-extender-kit",
    "transmitter",
    "receiver",
  ]);
  const explicit = normalisedSku.match(/(?:^|[-_])(\d{2,4})(?:[-_]|$)/);
  if (explicit && !nonPortDigitClasses.has(productClass)) {
    const digits = explicit[1];

    if (digits.length === 2) {
      const parsed = numberFromSkuSegment(digits);
      if (parsed) return parsed;
    }

    if (digits.length === 4) {
      const inputs = Number(digits.slice(0, 2));
      const outputs = Number(digits.slice(2, 4));
      if (Number.isFinite(inputs) && Number.isFinite(outputs)) return { inputs, outputs };
    }
  }

  if (productClass === "distribution-amplifier") {
    if (/1x2|1 x 2|one input.*two output/.test(text)) return { inputs: 1, outputs: 2 };
    if (/1x4|1 x 4|one input.*four output/.test(text)) return { inputs: 1, outputs: 4 };
    if (/1x8|1 x 8|one input.*eight output/.test(text)) return { inputs: 1, outputs: 8 };
    return { inputs: 1, outputs: null };
  }

  if (productClass === "signal-extender-kit") return { inputs: 1, outputs: 1 };
  if (productClass === "transmitter") return { inputs: 1, outputs: 1 };
  if (productClass === "receiver") return { inputs: 1, outputs: 1 };
  if (productClass === "avoip-encoder") return { inputs: 1, outputs: 1 };
  if (productClass === "avoip-decoder") return { inputs: 1, outputs: 1 };
  if (productClass === "avoip-transceiver") return { inputs: 1, outputs: 1 };
  if (productClass === "cable") return { inputs: 1, outputs: 1 };
  if (productClass === "accessory") return { inputs: null, outputs: null };

  if (productClass === "presentation-switcher") {
    if (normalisedSku.includes("0403")) return { inputs: 4, outputs: 3 };
    if (normalisedSku.includes("0402")) return { inputs: 4, outputs: 2 };
    if (normalisedSku.includes("0804")) return { inputs: 8, outputs: 4 };
    if (normalisedSku.includes("1007")) return { inputs: 10, outputs: 7 };
    if (/4 input|four input/.test(text)) return { inputs: 4, outputs: null };
  }

  return { inputs: null, outputs: null };
}

function inferConnectors(text: string, sku: string) {
  const connectors: string[] = [];

  if (includesAny(text, ["hdmi"])) connectors.push("HDMI");
  if (includesAny(text, ["usb-c", "usb c", "type c"])) connectors.push("USB-C");
  if (includesAny(text, ["usb-a", "usb a"])) connectors.push("USB-A");
  if (includesAny(text, ["usb-b", "usb b"])) connectors.push("USB-B");
  if (includesAny(text, ["hdbaset", "hdbt"])) connectors.push("HDBaseT");
  if (includesAny(text, ["rj45", "ethernet", "lan", "network", "1gbe", "10gbe", "10g"])) connectors.push("RJ45 / network");
  if (includesAny(text, ["fibre", "fiber", "sfp", "sfp+"]) || sku.includes("HAOC")) connectors.push("Fibre");
  if (includesAny(text, ["dante", "aes67"])) connectors.push("Dante / AES67");
  if (includesAny(text, ["rs-232", "rs232"])) connectors.push("RS-232");
  if (includesAny(text, ["ir"])) connectors.push("IR");
  if (includesAny(text, ["analogue audio", "analog audio", "line out", "audio out", "audio in"])) connectors.push("Audio analogue");
  if (includesAny(text, ["spdif", "toslink", "digital audio"])) connectors.push("Audio digital");
  if (includesAny(text, ["mic", "microphone"])) connectors.push("Mic");

  return unique(connectors);
}

function inferFeatures(text: string, sku: string) {
  return {
    mst: sku.includes("-MST") || includesAny(text, ["mst", "multi stream", "dual display"]),
    wirelessCasting: sku.endsWith("-W") || includesAny(text, ["wireless casting", "airplay", "miracast", "chromecast", "wireless presentation"]),
    multiview: sku.includes("-MV") || includesAny(text, ["multiview", "multi view", "multi-view", "quad view", "pip"]),
    videoWall: sku.includes("-VW") || includesAny(text, ["video wall", "videowall", "lcd wall", "led wall"]),
    scaling: includesAny(text, ["scaler", "scaling", "downscale", "down-scale", "upscale"]),
    seamless: includesAny(text, ["seamless"]),
    kvm: includesAny(text, ["kvm"]),
    usb2: includesAny(text, ["usb 2", "usb2", "usb 2.0"]),
    usb3: includesAny(text, ["usb 3", "usb3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed"]),
    ir: includesAny(text, ["ir"]),
    rs232: includesAny(text, ["rs-232", "rs232"]),
    telnet: includesAny(text, ["telnet"]),
    ipControl: includesAny(text, ["ip control", "web ui", "web gui", "tcp/ip", "tcp ip", "api"]),
    audioDeEmbed: includesAny(text, ["audio de-embed", "audio de embed", "de-embed", "de embed"]),
    audioEmbed: includesAny(text, ["audio embed", "audio embedding"]),
    dante: includesAny(text, ["dante", "aes67"]) || sku.includes("-DNT"),
    dsp: includesAny(text, ["dsp", "audio processing"]),
    relay: includesAny(text, ["relay"]),
    phantomPower: includesAny(text, ["phantom"]),
    hdbaset: includesAny(text, ["hdbaset", "hdbt"]),
    hdbaset3: includesAny(text, ["hdbaset 3", "hdbt 3", "hdbaset 3.0", "hdbt 3.0", "rx3", "tx3"]),
    network1g: includesAny(text, ["1g", "1gbe", "gigabit", "networkhd 100", "networkhd 500"]),
    network10g: includesAny(text, ["10g", "10gbe", "sfp+", "networkhd 600"]),
  };
}

// ---------------------------------------------------------------------------
// Governed technicalProfile reading.
//
// Canonical rows (and the generated runtime index) carry a curated
// technicalProfile: per-port structured I/O, USB versions, transports and
// processing evidence extracted from official WyreStorm product pages. When
// that evidence exists it wins over the free-text keyword matchers, because
// marketing tags routinely mention OTHER products' capabilities in a
// compatibility sense ("compatible with HDBaseT", "feeds a video wall") that
// the structured profile does not share. The keyword matchers remain the
// fallback for rows without governed evidence.
// ---------------------------------------------------------------------------

type TechnicalProfileLike = {
  io?: {
    ports?: Array<{
      count?: unknown;
      connector?: unknown;
      direction?: unknown;
      category?: unknown;
    }>;
  };
  usb?: {
    versions?: unknown[];
    roles?: unknown[];
  };
  transports?: unknown[];
  video?: {
    distance?: unknown[];
    processing?: unknown[];
  };
  features?: Array<{ id?: unknown }>;
};

function technicalProfile(product: WingmanProductLike): TechnicalProfileLike | null {
  const raw = (product as { technicalProfile?: unknown }).technicalProfile;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as TechnicalProfileLike;
  }
  return null;
}

function techFeatureIds(tp: TechnicalProfileLike | null): Set<string> {
  const ids = new Set<string>();
  if (!tp || !Array.isArray(tp.features)) return ids;
  for (const feature of tp.features) {
    const id = clean(feature?.id).toLowerCase();
    if (id) ids.add(id);
  }
  return ids;
}

/** Map a governed port connector string to the classifier's connector vocabulary. */
function connectorFamily(value: unknown): string {
  const low = normalise(value);
  if (!low) return "";
  if (low.startsWith("hdmi")) return "HDMI";
  if (low.startsWith("usb")) {
    if (low.includes("usb-c") || low.includes("usb c") || low.includes("type c")) return "USB-C";
    if (low.includes("type a") || low.includes("usb-a")) return "USB-A";
    if (low.includes("type b") || low.includes("usb-b")) return "USB-B";
    return "";
  }
  if (/hdbaset|hdbt/.test(low)) return "HDBaseT";
  if (/rj\s*45|\blan\b|\bethernet\b|\bnetwork\b/.test(low)) return "RJ45 / network";
  if (/fibre|fiber|sfp/.test(low)) return "Fibre";
  if (/dante|aes67/.test(low)) return "Dante / AES67";
  if (/rs\s*232/.test(low)) return "RS-232";
  if (/^ir\b/.test(low)) return "IR";
  if (/mic|microphone/.test(low)) return "Mic";
  if (/spdif|toslink|digital audio/.test(low)) return "Audio digital";
  if (/trs|analog|line out|audio/.test(low)) return "Audio analogue";
  return "";
}

/** Video input/output counts + connector families from the structured port list. */
function governedIoCounts(tp: TechnicalProfileLike | null) {
  const ports = Array.isArray(tp?.io?.ports) ? tp.io.ports : [];
  const connectorSet = new Set<string>();
  if (!ports.length) return { inputs: null, outputs: null, connectors: [] };

  let inputs = 0;
  let outputs = 0;

  for (const port of ports) {
    const family = connectorFamily(port.connector);
    if (family) connectorSet.add(family);

    const category = clean(port.category).toLowerCase();
    if (category !== "video") continue;

    const count = Number(port.count || 0);
    if (!Number.isFinite(count) || count <= 0) continue;

    const direction = clean(port.direction).toLowerCase();
    if (direction === "input") inputs += Math.round(count);
    if (direction === "output") outputs += Math.round(count);
  }

  return {
    inputs: inputs > 0 ? inputs : null,
    outputs: outputs > 0 ? outputs : null,
    connectors: Array.from(connectorSet),
  };
}

/** Feature flags evidenced by the governed profile; only flags WITH evidence are set. */
function governedFeatureFlags(tp: TechnicalProfileLike | null): Partial<WingmanProductProfile["features"]> {
  if (!tp) return {};

  const ids = techFeatureIds(tp);
  const usb = tp.usb && typeof tp.usb === "object" ? tp.usb : null;
  const usbVersions = Array.isArray(usb?.versions) ? usb.versions.map(clean) : [];
  const usbRoles = Array.isArray(usb?.roles) ? usb.roles.map(clean) : [];
  const versionText = usbVersions.join(" ").toLowerCase();
  const roleText = usbRoles.join(" ").toLowerCase();
  const transportText = Array.isArray(tp.transports) ? tp.transports.map(clean).join(" ").toLowerCase() : "";
  const processingText = Array.isArray(tp.video?.processing) ? tp.video.processing.map(clean).join(" ").toLowerCase() : "";

  const flags: Partial<WingmanProductProfile["features"]> = {};

  if (usbVersions.length) {
    flags.usb2 = /2\.\d|\busb 2\b/.test(versionText);
    flags.usb3 = /3\.\d|3\.x|\busb 3\b/.test(versionText);
  }
  if (usbRoles.length) {
    flags.kvm = /kvm|hid/.test(roleText);
  }
  if (transportText) {
    flags.hdbaset = /hdbaset|hdbt/.test(transportText);
    flags.hdbaset3 = /hdbaset\s*3|hdbt\s*3/.test(transportText);
    flags.network1g = /1g\b|1gbe|gigabit|networkhd 100|networkhd 500/.test(transportText);
    flags.network10g = /10g\b|10gbe|sfp/.test(transportText);
    flags.wirelessCasting = /wireless|wi-?fi/.test(transportText);
    flags.dante = /dante|aes67/.test(transportText);
  }
  if (processingText) {
    flags.multiview = /multiview|multi-?view/.test(processingText);
    flags.seamless = /seamless/.test(processingText);
    flags.scaling = /scal/.test(processingText);
    flags.videoWall = /video\s*wall/.test(processingText);
  }

  const idFlags: Array<[string, keyof WingmanProductProfile["features"]]> = [
    ["usb-30", "usb3"],
    ["usb-20", "usb2"],
    ["kvm", "kvm"],
    ["hdbaset-3", "hdbaset3"],
    ["hdbaset", "hdbaset"],
    ["multiview", "multiview"],
    ["seamless-switching", "seamless"],
    ["scaling", "scaling"],
    ["video-wall", "videoWall"],
    ["wireless-presentation", "wirelessCasting"],
    ["wireless-conferencing", "wirelessCasting"],
    ["dante", "dante"],
    ["aes67", "dante"],
    ["audio-breakout", "audioDeEmbed"],
    ["ip-control", "ipControl"],
    ["rs232", "rs232"],
    ["ir", "ir"],
    ["relay", "relay"],
    ["sfp", "network10g"],
  ];
  for (const [id, flag] of idFlags) {
    if (ids.has(id)) flags[flag] = true;
  }

  return flags;
}

/** Headline reach in metres: the first numeric distance entry on the governed profile. */
function governedDistanceMeters(tp: TechnicalProfileLike | null): number | null {
  const distance = Array.isArray(tp?.video?.distance) ? tp.video.distance : [];
  for (const entry of distance) {
    const match = String(entry ?? "").match(/(\d+(?:\.\d+)?)\s*m/i);
    if (match) {
      const metres = Number(match[1]);
      if (Number.isFinite(metres) && metres > 0) return metres;
    }
  }
  return null;
}

// Two-pass classification: WyreStorm's SKU prefixes are an authoritative, unambiguous
// product-family signal, but the free-text spec blob (tags/description/applications)
// routinely mentions OTHER product categories in a compatibility or bundled-inclusion
// sense - e.g. a plain HDBaseT receiver's tags list "unified communications" and
// "camera" because it's compatible with UC/camera workflows, and an encoder's tags list
// "2x Rack Mounting Brackets" among its box contents. Matching those phrases before the
// product's own SKU prefix is checked previously caused real hardware (encoders,
// receivers, matrix switches, UC cores) to be misclassified by whatever unrelated phrase
// happened to appear in its tags. So: check every recognized SKU prefix first (pass 1,
// no free text involved at all), and only fall back to free-text phrase matching (pass 2)
// for SKUs that don't carry a recognized family prefix.
function inferProductClassBySkuPrefix(sku: string, text: string): WingmanProductClass | null {
  if (startsAny(sku, ["CAB-", "CBL-"]) || sku.includes("HAOC")) return "cable";
  if (sku.includes("-RACK") || startsAny(sku, ["PSU-"])) return "accessory";
  if (startsAny(sku, ["SP-"]) || /^SP\d/i.test(sku)) return "distribution-amplifier";

  if (startsAny(sku, ["EX-"])) return "signal-extender-kit";

  if (sku.startsWith("NHD-")) {
    if (sku.endsWith("-TRX") || sku.includes("-TRX-")) return "avoip-transceiver";
    if (sku.endsWith("-TX") || sku.includes("-TX-")) return "avoip-encoder";
    if (sku.endsWith("-RX") || sku.includes("-RX-")) return "avoip-decoder";
    if (sku.includes("0401") && (sku.includes("MV") || includesAny(text, ["multiview"]))) return "multiview-processor";
    if (includesAny(text, ["encoder"])) return "avoip-encoder";
    if (includesAny(text, ["decoder"])) return "avoip-decoder";
    return "avoip-transceiver";
  }

  if (startsAny(sku, ["MX-", "MXV-"])) return "matrix-switch";
  if (startsAny(sku, ["APO-", "UC-"])) return "uc-room-core";

  if (startsAny(sku, ["CAM-"])) {
    if (includesAny(text, ["bridge", "mixer", "capture"])) return "camera-bridge";
    return "camera";
  }

  if (startsAny(sku, ["AMP-"])) {
    if (includesAny(text, ["dsp", "processor"])) return "audio-dsp";
    return "audio-amplifier";
  }

  if (startsAny(sku, ["SYN-", "CTL-"])) return "control-interface";

  if (startsAny(sku, ["RX-"])) return "receiver";
  if (startsAny(sku, ["TX-"])) return "transmitter";

  if (startsAny(sku, ["SW-"])) {
    // Suffix rules only for the wall/multiview processors: -VW / -MV are
    // unambiguous product identities. The free-text "video wall"/"multiview"
    // hints are deliberately NOT consulted here - marketing tags routinely
    // carry "Video Wall | Processing" as an APPLICATION of a plain room
    // switcher, which previously mislabeled SW-620-TX-W / SW-640L-TX-W as wall
    // processors and emptied every presentation-room recommendation.
    if (sku.includes("-VW") || includesAny(text, ["wall processor"])) return "video-wall-processor";
    if (sku.includes("-MV")) return "multiview-processor";
    // Presentation switcher beats the "-W" wireless suffix: SW-640L-TX-W,
    // SW-620-TX-W and friends are wireless-capable presentation switchers (the
    // governed profiles classify them presentation-switcher), not bare casting
    // dongles. The wireless-casting flag itself is still driven by -W / evidence.
    if (includesAny(text, ["presentation switcher", "usb-c", "usb c", "byod", "byom", "conference room"])) return "presentation-switcher";
    if (sku.endsWith("-W") || includesAny(text, ["wireless presentation", "wireless casting", "airplay", "miracast"])) return "wireless-presentation";
    return "hdmi-switcher";
  }

  const compactSku = squash(sku);
  if (compactSku.includes("MST")) return "presentation-switcher";

  return null;
}

function inferProductClassByFreeText(text: string): WingmanProductClass {
  if (includesAny(text, ["matrix switch", "matrix routing", "matrix switching", "seamless matrix"])) return "matrix-switch";
  if (includesAny(text, ["video bar", "unified comms", "unified communications", "speakerphone", "apollo", "halo"])) return "uc-room-core";
  if (includesAny(text, ["ptz camera", "camera"])) {
    return includesAny(text, ["bridge", "mixer", "capture"]) ? "camera-bridge" : "camera";
  }
  if (includesAny(text, ["controller", "touch panel", "keypad", "button panel", "control interface"])) return "control-interface";
  if (includesAny(text, ["presentation switcher", "room core", "conference room switcher"])) return "presentation-switcher";
  if (includesAny(text, ["hdbaset extender", "extender kit", "kvm extender"])) return "signal-extender-kit";
  if (includesAny(text, ["transmitter"])) return "transmitter";
  if (includesAny(text, ["receiver"])) return "receiver";
  if (includesAny(text, ["active optical cable", "hdmi cable", "usb c cable", "usb-c cable", "cable only"])) return "cable";
  if (includesAny(text, ["distribution amplifier", "splitter", "1x2", "1x4", "1x8"])) return "distribution-amplifier";
  if (includesAny(text, ["rack mount", "rackmount", "rack kit", "mounting bracket", "replacement psu", "power supply", "faceplate", "accessory only"])) return "accessory";

  return "unknown";
}

function inferProductClass(product: WingmanProductLike): WingmanProductClass {
  const sku = clean(product.sku || product.title || product.name).toUpperCase();
  const text = normalise(getText(product));

  return inferProductClassBySkuPrefix(sku, text) ?? inferProductClassByFreeText(text);
}

function inferTransport(productClass: WingmanProductClass, text: string, features: WingmanProductProfile["features"]) {
  const transport: WingmanTransportClass[] = [];

  if (includesAny(text, ["hdmi"])) transport.push("hdmi");
  if (features.hdbaset3) transport.push("hdbaset-3");
  if (features.hdbaset && !features.hdbaset3) transport.push("hdbaset");
  if (features.network10g) transport.push("avoip-10g");
  if (features.network1g) transport.push("avoip-1g");
  if (includesAny(text, ["fibre", "fiber", "sfp", "active optical"])) transport.push("fibre");
  if (includesAny(text, ["usb"])) transport.push("usb");
  if (features.wirelessCasting) transport.push("wireless");
  if (includesAny(text, ["audio", "dante", "aes67"])) transport.push("audio");
  if (features.ir || features.rs232 || features.ipControl || features.telnet || productClass === "control-interface") transport.push("control");

  return unique(transport) as WingmanTransportClass[];
}

function productClassToTechnologyType(productClass: WingmanProductClass) {
  if (productClass === "cable") return "Cable";
  if (productClass === "accessory") return "Accessory";
  if (productClass === "distribution-amplifier") return "Splitter / Distribution";
  if (productClass === "signal-extender-kit" || productClass === "transmitter" || productClass === "receiver") return "Extender / HDBaseT";
  if (productClass === "avoip-encoder" || productClass === "avoip-decoder" || productClass === "avoip-transceiver") return "AVoIP";
  if (productClass === "matrix-switch") return "Matrix";
  if (productClass === "presentation-switcher") return "Presentation / Room Core";
  if (productClass === "hdmi-switcher") return "Switcher";
  if (productClass === "uc-room-core" || productClass === "wireless-presentation") return "Unified Comms";
  if (productClass === "camera" || productClass === "camera-bridge") return "Camera / Capture";
  if (productClass === "video-wall-processor" || productClass === "multiview-processor") return "Video Wall / Multiview";
  if (productClass === "audio-amplifier" || productClass === "audio-dsp" || productClass === "control-interface") return "Audio / Control";
  return "Core Hardware";
}

function productClassToSalesType(productClass: WingmanProductClass) {
  if (productClass === "distribution-amplifier") return "Distribution amplifier / splitter";
  if (productClass === "signal-extender-kit") return "Signal extender kit";
  if (productClass === "transmitter") return "Transmitter";
  if (productClass === "receiver") return "Receiver";
  if (productClass === "avoip-encoder") return "IP encoder";
  if (productClass === "avoip-decoder") return "IP decoder";
  if (productClass === "avoip-transceiver") return "IP transceiver";
  if (productClass === "matrix-switch") return "Matrix switch";
  if (productClass === "presentation-switcher") return "HDMI / presentation switcher";
  if (productClass === "hdmi-switcher") return "HDMI switcher";
  if (productClass === "uc-room-core") return "Unified Comms / room core";
  if (productClass === "wireless-presentation") return "Wireless presentation";
  if (productClass === "camera") return "Camera";
  if (productClass === "camera-bridge") return "Camera bridge / mixer";
  if (productClass === "video-wall-processor") return "Video wall processor";
  if (productClass === "multiview-processor") return "Multiview processor";
  if (productClass === "audio-amplifier") return "Audio amplifier";
  if (productClass === "audio-dsp") return "Audio DSP";
  if (productClass === "control-interface") return "Control interface";
  if (productClass === "cable") return "Cable";
  if (productClass === "accessory") return "Accessory";
  if (productClass === "software-service") return "Software / service";
  return "Unknown";
}

function inferValidPaths(productClass: WingmanProductClass, features: WingmanProductProfile["features"]) {
  const paths: string[] = [];

  if (productClass === "presentation-switcher" || productClass === "uc-room-core" || productClass === "wireless-presentation") paths.push("Presentation switcher", "UC / conferencing");
  if (productClass === "signal-extender-kit" || productClass === "transmitter" || productClass === "receiver") paths.push("HDBaseT extender", "HDMI / USB extender");
  if (productClass === "matrix-switch") paths.push("Matrix / routing");
  if (productClass === "avoip-encoder" || productClass === "avoip-decoder" || productClass === "avoip-transceiver") paths.push("AVoIP", "Matrix / routing");
  if (productClass === "video-wall-processor") paths.push("Video wall");
  if (productClass === "multiview-processor") paths.push("Video wall", "Matrix / routing");
  if (productClass === "camera" || productClass === "camera-bridge") paths.push("NDI / camera", "UC / conferencing");
  if (productClass === "audio-amplifier" || productClass === "audio-dsp" || productClass === "control-interface") paths.push("Audio / control");
  if (productClass === "distribution-amplifier") paths.push("Splitter / Distribution");
  if (features.multiview) paths.push("Video wall");
  if (features.videoWall) paths.push("Video wall");
  if (features.mst) paths.push("Presentation switcher");

  return unique(paths);
}

function inferRole(productClass: WingmanProductClass): WingmanProductProfile["productRole"] {
  if (productClass === "cable" || productClass === "accessory") return "accessory";
  if (productClass === "software-service") return "software";
  if (["transmitter", "receiver", "avoip-encoder", "avoip-decoder", "avoip-transceiver"].includes(productClass)) return "endpoint";
  if (productClass === "unknown") return "unknown";
  return "primary";
}

function inferVisibility(productClass: WingmanProductClass) {
  if (productClass === "cable" || productClass === "accessory") return "request-only" as const;
  return "default" as const;
}

export function classifyWingmanProduct(product: WingmanProductLike): WingmanProductProfile {
  const sku = clean(product.sku || product.title || product.name);
  const searchBlob = getText(product);
  const text = normalise(searchBlob);
  const productClass = inferProductClass(product);
  const tp = technicalProfile(product);
  const governedIo = governedIoCounts(tp);
  const keywordIo = inferIoFromSku(sku, text, productClass);
  const features = { ...inferFeatures(text, sku.toUpperCase()), ...governedFeatureFlags(tp) };
  let inputCount = governedIo.inputs ?? keywordIo.inputs;
  let outputCount = governedIo.outputs ?? keywordIo.outputs;
  // A point-to-point extender/transmitter/receiver is single-channel by
  // definition: it moves ONE source to ONE display. A governed profile that
  // lists several "video" outputs for one is counting control signals carried
  // over the link (IR TX/RX, phoenix) as ports, which would surface a
  // misleading "3 out" on a 1-in/1-out product. Cap the routed counts at 1.
  if (DISTANCE_GATED_PRODUCT_CLASSES.has(productClass)) {
    if (inputCount != null) inputCount = Math.min(inputCount, 1);
    if (outputCount != null) outputCount = Math.min(outputCount, 1);
  }
  const connectors = unique([...governedIo.connectors, ...inferConnectors(text, sku.toUpperCase())]);
  const transport = inferTransport(productClass, text, features);
  const distanceMeters = governedDistanceMeters(tp);
  const ioParts = [
    inputCount != null ? `${inputCount} in` : null,
    outputCount != null ? `${outputCount} out` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    sku,
    productClass,
    productRole: inferRole(productClass),
    salesType: productClassToSalesType(productClass),
    technologyType: productClassToTechnologyType(productClass),
    family: clean(product.family || product.primarySystemFamily || product.category || productClassToTechnologyType(productClass)),
    // Structured port counts win when the governed profile evidences them;
    // SKU-digit parsing and free-text remain the fallback.
    inputCount,
    outputCount,
    connectors,
    transport,
    specEvidence: {
      io: ioParts.length ? ioParts.join(" / ") : null,
      usb: features.usb3 ? "USB 3.x" : features.usb2 ? "USB 2.0" : null,
      reach: distanceMeters != null ? `${distanceMeters}m` : null,
      connectors,
      transport,
      source: tp ? "governed" : "inferred",
    },
    features,
    visibility: inferVisibility(productClass),
    validProductPaths: inferValidPaths(productClass, features),
    invalidProductPaths: [],
    searchBlob,
    distanceMeters,
  };
}

function needIsNeutral(value: unknown) {
  const text = clean(value);
  return !text || text === "Unknown" || text === "Any / not known" || text === "Core hardware first" || text === "All hardware types";
}

function minCountForNeed(value: string) {
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3-4") return 3;
  if (value === "5-8") return 5;
  if (value === "9+") return 9;
  return null;
}

// Only product classes that expose a genuine, fixed multi-port I/O count
// (a matrix/switcher SKU whose port count is a real spec) are gated by the
// captured source/display count. Single-channel network endpoints (AVoIP
// encoders/decoders/transceivers, HDBaseT transmitters/receivers) and
// accessories/DSPs/cameras/etc. have no per-unit port count that scales with
// system size - a distributed AVoIP design with 9+ displays is built from
// many individual 1-in/1-out transceivers, not one SKU with 9 ports, so
// requiring profile.inputCount/outputCount >= the system's source/display
// count for those classes rejected every eligible endpoint product outright.
const FIXED_PORT_PRODUCT_CLASSES = new Set<WingmanProductClass>([
  "matrix-switch",
  "presentation-switcher",
  "hdmi-switcher",
]);

function matchesCount(available: number | null, requested: string | undefined, productClass: WingmanProductClass) {
  if (!requested || needIsNeutral(requested)) return true;
  if (!FIXED_PORT_PRODUCT_CLASSES.has(productClass)) return true;

  const min = minCountForNeed(requested);
  if (min == null) return true;
  if (available == null) return false;

  return available >= min;
}

function allowedClassesForTechnologyType(value: string | undefined) {
  if (needIsNeutral(value)) return new Set<WingmanProductClass>();

  if (value === "Cable") return new Set<WingmanProductClass>(["cable"]);
  if (value === "Accessory") return new Set<WingmanProductClass>(["accessory"]);
  if (value === "Splitter / Distribution") return new Set<WingmanProductClass>(["distribution-amplifier"]);
  if (value === "Extender / HDBaseT") return new Set<WingmanProductClass>(["signal-extender-kit", "transmitter", "receiver"]);
  if (value === "AVoIP") return new Set<WingmanProductClass>(["avoip-encoder", "avoip-decoder", "avoip-transceiver", "multiview-processor"]);
  if (value === "Matrix") return new Set<WingmanProductClass>(["matrix-switch"]);
  if (value === "Presentation / Room Core") return new Set<WingmanProductClass>(["presentation-switcher"]);
  if (value === "Switcher") return new Set<WingmanProductClass>(["hdmi-switcher", "presentation-switcher"]);
  if (value === "Unified Comms") return new Set<WingmanProductClass>(["uc-room-core", "wireless-presentation", "presentation-switcher"]);
  if (value === "Camera / Capture") return new Set<WingmanProductClass>(["camera", "camera-bridge"]);
  if (value === "Video Wall / Multiview") return new Set<WingmanProductClass>(["video-wall-processor", "multiview-processor", "avoip-decoder", "avoip-transceiver"]);
  if (value === "Audio / Control") return new Set<WingmanProductClass>(["audio-amplifier", "audio-dsp", "control-interface"]);

  return new Set<WingmanProductClass>();
}

function allowedClassesForPath(value: string | undefined) {
  if (needIsNeutral(value)) return new Set<WingmanProductClass>();

  if (value === "Presentation switcher") return new Set<WingmanProductClass>(["presentation-switcher"]);
  if (value === "HDMI / USB extender") return new Set<WingmanProductClass>(["signal-extender-kit", "transmitter", "receiver", "presentation-switcher"]);
  if (value === "HDBaseT extender") return new Set<WingmanProductClass>(["signal-extender-kit", "transmitter", "receiver"]);
  if (value === "Matrix / routing") return new Set<WingmanProductClass>(["matrix-switch", "presentation-switcher", "avoip-encoder", "avoip-decoder", "avoip-transceiver"]);
  if (value === "AVoIP") return new Set<WingmanProductClass>(["avoip-encoder", "avoip-decoder", "avoip-transceiver", "multiview-processor"]);
  if (value === "Video wall") return new Set<WingmanProductClass>(["video-wall-processor", "multiview-processor", "avoip-decoder", "avoip-transceiver"]);
  if (value === "UC / conferencing") return new Set<WingmanProductClass>(["uc-room-core", "presentation-switcher", "camera", "camera-bridge"]);
  if (value === "Wireless presentation") return new Set<WingmanProductClass>(["wireless-presentation", "uc-room-core", "presentation-switcher"]);
  if (value === "NDI / camera") return new Set<WingmanProductClass>(["camera", "camera-bridge", "avoip-encoder", "avoip-transceiver"]);
  if (value === "Audio / control") return new Set<WingmanProductClass>(["audio-amplifier", "audio-dsp", "control-interface"]);

  return new Set<WingmanProductClass>();
}

function allowedClassesForTechnicalRequirement(value: string | undefined) {
  if (needIsNeutral(value)) return new Set<WingmanProductClass>();

  if (value === "Extend HDMI over distance") return new Set<WingmanProductClass>(["signal-extender-kit", "transmitter", "receiver"]);
  if (value === "Extend HDMI and USB together") return new Set<WingmanProductClass>(["signal-extender-kit", "presentation-switcher"]);
  if (value === "Connect USB-C laptop") return new Set<WingmanProductClass>(["presentation-switcher", "uc-room-core", "signal-extender-kit"]);
  if (value === "Wireless presentation") return new Set<WingmanProductClass>(["wireless-presentation", "uc-room-core", "presentation-switcher"]);
  if (value === "BYOD / UC conferencing") return new Set<WingmanProductClass>(["uc-room-core", "presentation-switcher", "signal-extender-kit"]);
  if (value === "Route sources to multiple displays") return new Set<WingmanProductClass>(["matrix-switch", "presentation-switcher", "avoip-encoder", "avoip-decoder", "avoip-transceiver"]);
  if (value === "Dual display / MST") return new Set<WingmanProductClass>(["presentation-switcher", "matrix-switch", "avoip-decoder", "avoip-transceiver"]);
  if (value === "Create multiview layout") return new Set<WingmanProductClass>(["multiview-processor", "video-wall-processor", "avoip-decoder"]);
  if (value === "Build LCD video wall") return new Set<WingmanProductClass>(["video-wall-processor", "multiview-processor", "avoip-decoder", "avoip-transceiver"]);
  if (value === "Feed LED wall processor") return new Set<WingmanProductClass>(["video-wall-processor", "presentation-switcher", "matrix-switch"]);
  if (value === "Distribute AV over network") return new Set<WingmanProductClass>(["avoip-encoder", "avoip-decoder", "avoip-transceiver", "multiview-processor"]);
  if (value === "Bring NDI camera into AV system") return new Set<WingmanProductClass>(["camera", "camera-bridge", "avoip-encoder", "avoip-transceiver"]);
  if (value === "Extract or route audio") return new Set<WingmanProductClass>(["audio-amplifier", "audio-dsp", "matrix-switch", "presentation-switcher", "avoip-decoder"]);
  if (value === "Control displays / system") return new Set<WingmanProductClass>(["control-interface"]);

  return new Set<WingmanProductClass>();
}

function intersectClassSets(a: Set<WingmanProductClass>, b: Set<WingmanProductClass>) {
  if (a.size === 0) return b;
  if (b.size === 0) return a;

  return new Set(Array.from(a).filter((item) => b.has(item)));
}

function resolveAllowedClasses(need: WingmanFinderNeedLike) {
  let allowed = new Set<WingmanProductClass>();

  allowed = intersectClassSets(allowed, allowedClassesForTechnologyType(need.technologyType));
  allowed = intersectClassSets(allowed, allowedClassesForTechnicalRequirement(need.technicalRequirement));
  allowed = intersectClassSets(allowed, allowedClassesForPath(need.productPath));

  return allowed;
}

function explicitlyRequestsSupport(productClass: WingmanProductClass, need: WingmanFinderNeedLike) {
  const text = normalise(Object.values(need).join(" "));

  if (productClass === "cable") return need.technologyType === "Cable" || includesAny(text, ["cable", "aoc", "active optical", "hdmi cable", "usb c cable", "usb-c cable"]);
  if (productClass === "accessory") return need.technologyType === "Accessory" || includesAny(text, ["accessory", "rack", "mount", "bracket", "psu", "power supply"]);
  return false;
}

function connectorAllowed(profile: WingmanProductProfile, requested: string | undefined) {
  if (needIsNeutral(requested)) return true;
  return profile.connectors.some((connector) => normalise(connector) === normalise(requested));
}

function supportsUsbNeed(profile: WingmanProductProfile, requested: string | undefined) {
  if (needIsNeutral(requested)) return true;
  if (requested === "No USB") return true;
  if (requested === "USB 2.0 enough") return profile.features.usb2 || profile.features.usb3 || profile.transport.includes("usb");
  if (requested === "USB 3.x required") return profile.features.usb3;
  if (requested === "KVM / HID") return profile.features.kvm || profile.transport.includes("usb");
  if (requested === "BYOD / UC") return profile.productClass === "uc-room-core" || profile.productClass === "presentation-switcher" || profile.features.usb2 || profile.features.usb3;
  return true;
}

function supportsProcessingNeed(profile: WingmanProductProfile, requested: string | undefined) {
  if (needIsNeutral(requested)) return true;
  if (requested === "Scaling") return profile.features.scaling;
  if (requested === "Seamless switching") return profile.features.seamless || profile.productClass === "matrix-switch" || profile.productClass === "presentation-switcher";
  if (requested === "Multiview") return profile.features.multiview || profile.productClass === "multiview-processor";
  if (requested === "Video wall processing") return profile.features.videoWall || profile.productClass === "video-wall-processor";
  if (requested === "Matrix routing") return profile.productClass === "matrix-switch" || profile.productClass === "presentation-switcher" || profile.productClass.startsWith("avoip");
  if (requested === "AVoIP routing") return profile.productClass.startsWith("avoip") || profile.productClass === "multiview-processor";
  return true;
}

function supportsNetworkNeed(profile: WingmanProductProfile, requested: string | undefined) {
  if (needIsNeutral(requested)) return true;
  if (requested === "Existing LAN") return profile.transport.includes("avoip-1g") || profile.transport.includes("control") || profile.features.ipControl;
  if (requested === "Dedicated AV network") return profile.transport.includes("avoip-1g") || profile.transport.includes("avoip-10g");
  if (requested === "10G network") return profile.transport.includes("avoip-10g") || profile.features.network10g;
  if (requested === "NDI source present") return profile.productClass === "camera" || profile.productClass === "camera-bridge" || profile.productClass.startsWith("avoip");
  return true;
}

function supportsAudioNeed(profile: WingmanProductProfile, requested: string | undefined) {
  if (needIsNeutral(requested)) return true;
  if (requested === "Audio de-embed") return profile.features.audioDeEmbed;
  if (requested === "Mic / speakerphone") return profile.connectors.includes("Mic") || profile.productClass === "uc-room-core";
  if (requested === "DSP integration") return profile.features.dsp || profile.productClass === "audio-dsp";
  if (requested === "Dante / AES67") return profile.features.dante;
  if (requested === "Amplifier / speakers") {
    return (
      profile.productClass === "audio-amplifier" ||
      profile.productClass === "audio-dsp" ||
      profile.features.audioDeEmbed ||
      profile.productClass === "presentation-switcher" ||
      profile.productClass === "matrix-switch" ||
      profile.productClass === "uc-room-core"
    );
  }
  return true;
}

function supportsControlNeed(profile: WingmanProductProfile, requested: string | undefined) {
  if (needIsNeutral(requested)) return true;
  if (requested === "IR") return profile.features.ir;
  if (requested === "RS-232") return profile.features.rs232;
  if (requested === "Display power control") return profile.features.ipControl || profile.features.rs232 || profile.features.ir;
  if (requested === "Web UI") return profile.features.ipControl;
  if (requested === "Button panel") return profile.productClass === "control-interface";
  if (requested === "Touch panel") {
    return (
      profile.productClass === "control-interface" ||
      profile.features.ipControl ||
      profile.features.rs232 ||
      profile.features.telnet
    );
  }
  if (requested === "Third-party control") return profile.features.rs232 || profile.features.ipControl || profile.features.telnet;
  return true;
}

// Distance is a hard selector criterion only for point-to-point transport
// classes where reach IS the product's identity (HDBaseT extenders and
// transmitters/receivers). Other classes are skipped: a matrix's "distance"
// is its local rack, a camera's is its lens reach - neither selects a product.
// Products WITHOUT verified reach evidence fail open rather than being
// rejected on missing data; only a verified reach below the requested run
// rejects.
export const DISTANCE_GATED_PRODUCT_CLASSES = new Set<WingmanProductClass>([
  "signal-extender-kit",
  "transmitter",
  "receiver",
]);

export function distanceBucketMinMeters(requested: string | undefined) {
  switch (requested) {
    case "Local <5m": return 0;
    case "Short 5-10m": return 5;
    case "Medium 10-35m": return 10;
    case "Long 35-70m": return 35;
    case "Very long 70-100m": return 70;
    default: return null;
  }
}

/** Non-empty when the product's verified reach cannot cover the requested run. */
export function distanceGateReason(profile: WingmanProductProfile, requested: string | undefined): string {
  if (!requested || needIsNeutral(requested)) return "";
  if (!DISTANCE_GATED_PRODUCT_CLASSES.has(profile.productClass)) return "";
  const requestedMin = distanceBucketMinMeters(requested);
  if (requestedMin == null || profile.distanceMeters == null) return "";
  if (profile.distanceMeters >= requestedMin) return "";
  return `Verified reach (${profile.distanceMeters}m) is below the requested ${requested} run.`;
}

/**
 * Positive evidence lines for a requirement the product actually satisfied.
 * Mirrors the exact predicates in isWingmanProductEligibleForFinderNeed so a
 * claim is only made when the gate genuinely evaluated that dimension (fixed
 * I/O classes, non-neutral USB need, distance-gated point-to-point classes),
 * and the caller is expected to have already confirmed eligibility.
 */
export function matchedGateReasons(profile: WingmanProductProfile, need: WingmanFinderNeedLike): string[] {
  const reasons: string[] = [];

  if (FIXED_PORT_PRODUCT_CLASSES.has(profile.productClass)) {
    const requestedInputs = need.inputs;
    const minInputs = requestedInputs ? minCountForNeed(requestedInputs) : null;
    if (minInputs != null && profile.inputCount != null && profile.inputCount >= minInputs) {
      reasons.push(`I/O gate passed: ${profile.inputCount} inputs cover the ${requestedInputs} source brief.`);
    }
    const requestedOutputs = need.outputs;
    const minOutputs = requestedOutputs ? minCountForNeed(requestedOutputs) : null;
    if (minOutputs != null && profile.outputCount != null && profile.outputCount >= minOutputs) {
      reasons.push(`I/O gate passed: ${profile.outputCount} outputs cover the ${requestedOutputs} display brief.`);
    }
  }

  if (!needIsNeutral(need.usb) && need.usb !== "No USB" && supportsUsbNeed(profile, need.usb)) {
    if (need.usb === "USB 3.x required" && profile.features.usb3) {
      reasons.push("USB gate passed: USB 3.x is evidenced on this product.");
    } else if (need.usb === "USB 2.0 enough" && (profile.features.usb2 || profile.features.usb3 || profile.transport.includes("usb"))) {
      reasons.push("USB gate passed: USB connectivity is evidenced on this product.");
    } else if (need.usb === "KVM / HID") {
      reasons.push(
        profile.features.kvm
          ? "USB gate passed: KVM / HID routing is evidenced on this product."
          : "USB gate passed: USB routing is evidenced on this product.",
      );
    } else {
      reasons.push(`USB gate passed for the "${need.usb}" requirement.`);
    }
  }

  if (!needIsNeutral(need.distance) && DISTANCE_GATED_PRODUCT_CLASSES.has(profile.productClass)) {
    const requestedMin = distanceBucketMinMeters(need.distance);
    if (requestedMin != null && profile.distanceMeters != null && profile.distanceMeters >= requestedMin) {
      reasons.push(`Reach gate passed: ${profile.distanceMeters}m reach covers the ${need.distance} run.`);
    }
  }

  return reasons;
}

export function isWingmanProductEligibleForFinderNeed(product: WingmanProductLike, need: WingmanFinderNeedLike) {
  const profile = classifyWingmanProduct(product);
  const allowedClasses = resolveAllowedClasses(need);

  if ((profile.productClass === "cable" || profile.productClass === "accessory") && !explicitlyRequestsSupport(profile.productClass, need)) {
    return false;
  }

  if (allowedClasses.size > 0 && !allowedClasses.has(profile.productClass)) {
    return false;
  }

  if (!matchesCount(profile.inputCount, need.inputs, profile.productClass)) {
    return false;
  }

  if (!matchesCount(profile.outputCount, need.outputs, profile.productClass)) {
    return false;
  }

  if (!connectorAllowed(profile, need.sourceConnector)) {
    return false;
  }

  if (!connectorAllowed(profile, need.displayConnector)) {
    return false;
  }

  if (!supportsUsbNeed(profile, need.usb)) {
    return false;
  }

  if (!supportsProcessingNeed(profile, need.processing)) {
    return false;
  }

  if (!supportsNetworkNeed(profile, need.network)) {
    return false;
  }

  if (!supportsAudioNeed(profile, need.audio)) {
    return false;
  }

  if (!supportsControlNeed(profile, need.control)) {
    return false;
  }

  if (!needIsNeutral(need.distance) && distanceGateReason(profile, need.distance)) {
    return false;
  }

  return true;
}

export function wingmanHardwareTypePriority(product: WingmanProductLike) {
  const profile = classifyWingmanProduct(product);

  if (profile.productClass === "matrix-switch") return 10;
  if (profile.productClass === "presentation-switcher") return 12;
  if (profile.productClass === "uc-room-core") return 14;
  if (profile.productClass === "avoip-encoder" || profile.productClass === "avoip-decoder" || profile.productClass === "avoip-transceiver") return 16;
  if (profile.productClass === "video-wall-processor" || profile.productClass === "multiview-processor") return 18;
  if (profile.productClass === "signal-extender-kit") return 24;
  if (profile.productClass === "transmitter" || profile.productClass === "receiver") return 28;
  if (profile.productClass === "distribution-amplifier") return 30;
  if (profile.productClass === "hdmi-switcher") return 32;
  if (profile.productClass === "camera" || profile.productClass === "camera-bridge") return 34;
  if (profile.productClass === "audio-amplifier" || profile.productClass === "audio-dsp" || profile.productClass === "control-interface") return 40;
  if (profile.productClass === "cable") return 110;
  if (profile.productClass === "accessory") return 120;

  return 80;
}

export function wingmanProductClassLabel(product: WingmanProductLike) {
  return classifyWingmanProduct(product).salesType;
}