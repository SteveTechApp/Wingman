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

  const explicit = normalisedSku.match(/(?:^|[-_])(\d{2,4})(?:[-_]|$)/);
  if (explicit) {
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
    if (sku.includes("-VW") || includesAny(text, ["video wall", "videowall", "wall processor"])) return "video-wall-processor";
    if (sku.includes("-MV") || includesAny(text, ["multiview", "multi-view", "multi view"])) return "multiview-processor";
    if (sku.endsWith("-W") || includesAny(text, ["wireless presentation", "wireless casting", "airplay", "miracast"])) return "wireless-presentation";
    if (includesAny(text, ["presentation switcher", "usb-c", "usb c", "byod", "byom", "conference room"])) return "presentation-switcher";
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
  const features = inferFeatures(text, sku.toUpperCase());
  const io = inferIoFromSku(sku, text, productClass);

  return {
    sku,
    productClass,
    productRole: inferRole(productClass),
    salesType: productClassToSalesType(productClass),
    technologyType: productClassToTechnologyType(productClass),
    family: clean(product.family || product.primarySystemFamily || product.category || productClassToTechnologyType(productClass)),
    inputCount: io.inputs,
    outputCount: io.outputs,
    connectors: inferConnectors(text, sku.toUpperCase()),
    transport: inferTransport(productClass, text, features),
    features,
    visibility: inferVisibility(productClass),
    validProductPaths: inferValidPaths(productClass, features),
    invalidProductPaths: [],
    searchBlob,
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

function matchesCount(available: number | null, requested: string | undefined) {
  if (!requested || needIsNeutral(requested)) return true;

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

export function isWingmanProductEligibleForFinderNeed(product: WingmanProductLike, need: WingmanFinderNeedLike) {
  const profile = classifyWingmanProduct(product);
  const allowedClasses = resolveAllowedClasses(need);

  if ((profile.productClass === "cable" || profile.productClass === "accessory") && !explicitlyRequestsSupport(profile.productClass, need)) {
    return false;
  }

  if (allowedClasses.size > 0 && !allowedClasses.has(profile.productClass)) {
    return false;
  }

  if (!matchesCount(profile.inputCount, need.inputs)) {
    return false;
  }

  if (!matchesCount(profile.outputCount, need.outputs)) {
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