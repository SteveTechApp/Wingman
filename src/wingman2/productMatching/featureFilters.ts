import type { FinderFeatureFilter, FinderNeed, FinderProduct, ProductMatch } from "./types";
import {
  classifyProduct,
  cleanFinderProduct,
  getFinderMatchText,
  getFinderNeedText,
  normaliseText,
  productHasAllFeatureGroups,
  productHasAny,
  productHasFeatureAny,
  textIncludesAny,
} from "./text";

export function expectedProductPathForRequirement(requirement: string) {
  if (requirement === "Extend HDMI and USB together") return "HDMI / USB extender";
  if (requirement === "Extend HDMI over distance") return "HDBaseT extender";
  if (requirement === "Connect USB-C laptop") return "Presentation switcher";
  if (requirement === "Wireless presentation") return "Wireless presentation";
  if (requirement === "BYOD / UC conferencing") return "UC / conferencing";
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

export function inferPathFromNeed(need: FinderNeed) {
  const expected = expectedProductPathForRequirement(need.technicalRequirement);
  if (need.productPath) return need.productPath;
  if (expected) return expected;

  if (["3-4", "5-8", "9+"].includes(need.inputs) || ["3-4", "5-8", "9+"].includes(need.outputs)) {
    return "Matrix / routing";
  }

  if (need.network === "Dedicated AV network" || need.network === "10G network") return "AVoIP";
  if (need.processing === "Video wall processing") return "Video wall";
  if (need.processing === "Multiview") return "AVoIP";
  if (need.usb === "Touch return" || need.usb === "Keyboard / mouse") return "HDMI / USB extender";
  if (need.usb === "USB camera" || need.usb === "Speakerphone / audio USB") return "UC / conferencing";
  if (need.usb === "No USB" && need.distance) return "HDBaseT extender";

  return "";
}

export function hasIntegratedHdmiUsbNeed(need: FinderNeed) {
  const query = normaliseText(need.query);
  return (
    need.technicalRequirement === "Extend HDMI and USB together" ||
    need.signalType === "HDMI + USB" ||
    (query.includes("hdmi") && query.includes("usb") && (query.includes("extend") || query.includes("extender")))
  );
}

export function isControlOnlyProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")}`);

  return (
    sku.startsWith("SYN-") ||
    sku.startsWith("TS-") ||
    text.includes("keypad controller") ||
    text.includes("touchscreen controller") ||
    text.includes("touchpad ip controller") ||
    text.includes("control only")
  );
}

export function isReceiverOnlyProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = normaliseText(`${product.title} ${product.category} ${product.description} ${product.tags.join(" ")}`);
  return sku.startsWith("RX-") || (text.includes("receiver") && text.includes("video only"));
}

export function isAvOverIpProduct(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = getFinderMatchText(product);
  return sku.startsWith("NHD-") || textIncludesAny(text, ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver"]);
}

function getFinderMetadataValue(product: FinderProduct, key: string) {
  const value = (product as FinderProduct & Record<string, unknown>)[key];

  if (Array.isArray(value)) {
    return value.map(String).join(" ");
  }

  return String(value ?? "");
}

function inferFinderCommercialRole(product: FinderProduct) {
  const explicitRole = getFinderMetadataValue(product, "commercialRole").trim();

  if (explicitRole) {
    return explicitRole;
  }

  const text = normaliseText(`${product.sku} ${product.title} ${product.description} ${product.tags.join(" ")}`);

  if (textIncludesAny(text, ["nhd touch", "companion control app", "software app", "cloud management", "sygma"])) {
    return "software-app";
  }

  if (textIncludesAny(text, ["rack", "rack mount", "psu", "power supply", "mount", "bracket", "dock", "adapter", "adaptor", "cable"])) {
    return "accessory";
  }

  if (textIncludesAny(text, ["dongle"]) && product.sku.toUpperCase() !== "APO-DG2" && product.sku.toUpperCase() !== "APO-DG2-PRO") {
    return "accessory";
  }

  if (textIncludesAny(text, ["receiver", "decoder", "encoder", "transmitter", "transceiver", "extender"])) {
    return "endpoint-hardware";
  }

  return "primary-hardware";
}

function isAvIoCountCandidate(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = getFinderMatchText(product);
  const role = inferFinderCommercialRole(product);
  const hasSwitchingCore = productHasFeatureAny(product, [
    "matrix",
    "switcher",
    "splitter",
    "extender",
    "hdbaset",
    "video wall",
    "wall processor",
    "presentation",
    "apollo",
  ]);

  if (
    (role.includes("accessory") && !hasSwitchingCore) ||
    role.includes("rack") ||
    role.includes("software") ||
    sku.startsWith("AMP-") ||
    sku.startsWith("CAB-") ||
    sku.startsWith("CBL-") ||
    sku.startsWith("IDB-US") ||
    sku.startsWith("IDB-PWR") ||
    sku.startsWith("IDB-CBL") ||
    isControlOnlyProduct(product)
  ) {
    return false;
  }

  if (text.includes("amplifier") || (text.includes("speakerphone") && !text.includes("switcher"))) {
    return false;
  }

  return hasSwitchingCore;
}

function getRequestedIoCount(value: string) {
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3-4") return 3;
  if (value === "5-8") return 5;
  if (value === "9+") return 9;
  return 0;
}

export function getProductIoCapacity(product: FinderProduct) {
  if (!isAvIoCountCandidate(product)) {
    return { inputs: 0, outputs: 0 };
  }

  const text = getFinderMatchText(product);
  let inputs = 0;
  let outputs = 0;

  const xPattern = /(?:^|\s)(\d{1,2})\s*x\s*(\d{1,2})(?:\s|$)/g;
  for (const match of text.matchAll(xPattern)) {
    const left = Number(match[1]);
    const right = Number(match[2]);

    if (Number.isFinite(left) && Number.isFinite(right) && left <= 32 && right <= 32) {
      inputs = Math.max(inputs, left);
      outputs = Math.max(outputs, right);
    }
  }

  const inputPattern = /(?:^|\s)(\d{1,2})\s*(?:-| )?\s*inputs?\b/g;
  for (const match of text.matchAll(inputPattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value <= 32) inputs = Math.max(inputs, value);
  }

  const outputPattern = /(?:^|\s)(\d{1,2})\s*(?:-| )?\s*(?:outputs?|out)\b/g;
  for (const match of text.matchAll(outputPattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value <= 32) outputs = Math.max(outputs, value);
  }

  if ((text.includes("usb c") && text.includes("hdmi") && text.includes("input")) || text.includes("hdmi usb c input")) {
    inputs = Math.max(inputs, 2);
  }

  if (text.includes("single") && textIncludesAny(text, ["transmitter", "receiver", "encoder", "decoder", "extender"])) {
    inputs = Math.max(inputs, 1);
    outputs = Math.max(outputs, 1);
  }

  return { inputs, outputs };
}

export function productSupportsIoCount(product: FinderProduct, key: "inputs" | "outputs", value: string) {
  const requested = getRequestedIoCount(value);
  if (!requested) return false;

  const capacity = getProductIoCapacity(product)[key];
  if (capacity >= requested) return true;

  if (requested >= 9 && isAvOverIpProduct(product) && !isReceiverOnlyProduct(product) && !isControlOnlyProduct(product)) {
    return true;
  }

  return false;
}

function needHasUcAudioOrCameraContext(need: FinderNeed) {
  const text = getFinderNeedText(need);

  return (
    need.technicalRequirement === "BYOD / UC conferencing" ||
    need.productPath === "UC / conferencing" ||
    need.usb === "USB camera" ||
    need.usb === "Speakerphone / audio USB" ||
    need.audio === "Mic / speakerphone" ||
    textIncludesAny(text, [
      "conferencing",
      "conference",
      "byod",
      "byom",
      "camera",
      "speakerphone",
      "microphone",
      "mic",
      "audio usb",
      "usb audio",
    ])
  );
}

function isUcCentricSwitcher(product: FinderProduct) {
  const sku = product.sku.toUpperCase();
  const text = getFinderMatchText(product);

  return sku === "APO-210-UC" || (sku.startsWith("APO-") && text.includes("speakerphone") && text.includes("switcher"));
}

export function isAllowedFeatureSearchProduct(product: FinderProduct, need: FinderNeed) {
  if (need.query.trim() && product.sku.toLowerCase() === need.query.trim().toLowerCase()) {
    return true;
  }

  if (isUcCentricSwitcher(product) && !needHasUcAudioOrCameraContext(need)) {
    return false;
  }

  return true;
}

export function makeAnyFeatureFilter(id: string, label: string, terms: string[], weight = 28): FinderFeatureFilter {
  return {
    id,
    label,
    weight,
    matches: (product) => productHasFeatureAny(product, terms),
  };
}

export function makeAllFeatureFilter(id: string, label: string, termGroups: string[][], weight = 34): FinderFeatureFilter {
  return {
    id,
    label,
    weight,
    matches: (product) => productHasAllFeatureGroups(product, termGroups),
  };
}

export function makeCustomFeatureFilter(
  id: string,
  label: string,
  weight: number,
  matches: (product: FinderProduct) => boolean,
): FinderFeatureFilter {
  return { id, label, weight, matches };
}

export function isNeutralFeatureValue(value: string) {
  return ["", "Unknown", "No audio requirement", "No processing", "No control", "Not required"].includes(value);
}

export function queryFeatureFilter(query: string): FinderFeatureFilter | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const normalised = normaliseText(trimmed);

  if (normalised.includes("usb 3")) {
    return makeAnyFeatureFilter("query:usb3", "USB 3.x", ["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"], 40);
  }

  if (normalised.includes("usb 2")) {
    return makeAnyFeatureFilter("query:usb2", "USB 2.0", ["usb 2", "usb 2.0", "usb 2 0", "usb over ip", "kvm"], 40);
  }

  const stopWords = new Set(["a", "an", "and", "for", "products", "product", "devices", "device", "required", "require", "using", "with", "support", "supports", "the"]);
  const words = normalised.split(/\s+/).filter((word) => word.length >= 2 && !stopWords.has(word));

  return makeCustomFeatureFilter("query", trimmed, 34, (product) => {
    const text = getFinderMatchText(product);
    if (text.includes(normalised)) return true;
    return words.length > 0 && words.every((word) => text.includes(word));
  });
}

export function usbFeatureFilter(value: string): FinderFeatureFilter | null {
  if (!value || value === "Unknown") return null;

  if (value === "No USB") {
    return makeCustomFeatureFilter("usb:no-usb", value, 30, (product) => {
      const hasUsb = productHasAny(product, ["usb", "usb-c", "usb c"]);
      const hasAvRole = productHasAny(product, [
        "hdmi",
        "hdbaset",
        "receiver",
        "transmitter",
        "matrix",
        "switcher",
        "video wall",
        "wall processor",
        "networkhd",
        "encoder",
        "decoder",
      ]);

      return !hasUsb && hasAvRole;
    });
  }

  if (value === "USB 2.0 enough") {
    return makeAnyFeatureFilter("usb:2", value, ["usb 2", "usb 2.0", "usb 2 0", "usb over ip", "kvm", "hid"], 42);
  }

  if (value === "USB 3.x required") {
    return makeAnyFeatureFilter(
      "usb:3",
      value,
      ["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"],
      46,
    );
  }

  if (value === "USB camera") {
    return makeAllFeatureFilter("usb:camera", value, [["usb", "usb 2", "usb 3", "usb-c", "usb c"], ["camera", "webcam", "ptz", "video-speakerphone"]], 40);
  }

  if (value === "Speakerphone / audio USB") {
    return makeAnyFeatureFilter("usb:audio", value, ["speakerphone", "microphone", "companion mic", "audio usb", "usb audio"], 38);
  }

  if (value === "Touch return") {
    return makeAnyFeatureFilter("usb:touch", value, ["touch", "touchscreen", "touch return", "usb 2", "kvm", "hid"], 36);
  }

  if (value === "Keyboard / mouse") {
    return makeAnyFeatureFilter("usb:hid", value, ["keyboard", "mouse", "hid", "kvm", "usb 2", "usb over ip"], 36);
  }

  return null;
}

export function productPathFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const pathTerms: Record<string, string[]> = {
    "Presentation switcher": ["presentation switcher", "switcher", "usb-c", "usb c", "byod", "byom"],
    "HDMI / USB extender": ["hdmi", "usb", "kvm", "hdbaset", "extender"],
    "HDBaseT extender": ["hdbaset", "hdbt", "extender", "receiver", "transmitter"],
    "Matrix / routing": ["matrix", "routing", "multi output", "multiple outputs", "seamless"],
    AVoIP: ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver"],
    "Video wall": ["video wall", "videowall", "wall processor", "lcd wall", "sw-0204", "sw-0206"],
    "UC / conferencing": ["uc", "conference", "conferencing", "speakerphone", "microphone", "camera", "byod", "byom"],
    "Wireless presentation": ["wireless", "airplay", "miracast", "casting", "apollo", "dongle"],
    "NDI / camera": ["ndi", "camera", "ptz", "webcam"],
    "Audio / control": ["audio", "dante", "aes67", "amplifier", "rs-232", "rs232", "ir", "control", "gpio"],
  };

  return makeCustomFeatureFilter(`path:${value}`, value, 36, (product) => {
    return product.category === value || classifyProduct(product) === value || productHasFeatureAny(product, pathTerms[value] ?? [value]);
  });
}

export function technicalRequirementFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  if (value === "Extend HDMI and USB together") {
    return makeAllFeatureFilter("requirement:hdmi-usb", value, [["hdmi", "usb-c", "usb c"], ["usb", "kvm"], ["extender", "hdbaset", "hdbt", "transmitter", "receiver"]], 42);
  }

  const requirementTerms: Record<string, string[]> = {
    "Extend HDMI over distance": ["hdbaset", "hdbt", "extender", "receiver", "transmitter", "hdmi"],
    "Connect USB-C laptop": ["usb-c", "usb c", "presentation switcher", "byod", "byom", "laptop"],
    "Wireless presentation": ["wireless", "airplay", "miracast", "casting", "apollo", "dongle"],
    "BYOD / UC conferencing": ["byod", "byom", "conference", "conferencing", "speakerphone", "camera", "usb-c", "usb c"],
    "Route sources to multiple displays": ["matrix", "routing", "multi output", "multiple outputs", "switcher", "networkhd"],
    "Dual display / MST": ["dual display", "dual-output", "multi output", "mst", "matrix", "presentation"],
    "Create multiview layout": ["multiview", "multi view", "multi-view", "pip", "quad view", "processor"],
    "Build LCD video wall": ["video wall", "lcd wall", "videowall", "wall processor", "networkhd"],
    "Feed LED wall processor": ["led wall", "video wall", "wall processor", "processor", "scaler"],
    "Distribute AV over network": ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver", "1gbe", "10g"],
    "Bring NDI camera into AV system": ["ndi", "camera", "ptz", "networkhd"],
    "Extract or route audio": ["audio", "dante", "aes67", "de-embed", "de embed", "amplifier", "speaker"],
    "Control displays / system": ["control", "rs-232", "rs232", "ir", "cec", "gpio", "relay", "web ui"],
  };

  return makeAnyFeatureFilter(`requirement:${value}`, value, requirementTerms[value] ?? [value], 38);
}

export function signalFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  if (value === "HDMI + USB") {
    return makeAllFeatureFilter("signal:hdmi-usb", value, [["hdmi"], ["usb", "kvm"]], 38);
  }

  const signalTerms: Record<string, string[]> = {
    "HDMI video": ["hdmi"],
    "USB-C video": ["usb-c", "usb c", "dp alt mode", "alt-mode"],
    "USB only": ["usb", "usb 2", "usb 3", "usb hub", "usb over ip"],
    "NDI / network video": ["ndi", "network video", "networkhd", "av over ip", "avoip"],
    "Audio only": ["audio", "dante", "aes67", "amplifier", "speaker", "mic"],
    "Control only": ["control", "rs-232", "rs232", "ir", "cec", "gpio", "relay"],
    "Mixed AV system": ["matrix", "switcher", "networkhd", "av over ip", "audio", "control"],
  };

  return makeAnyFeatureFilter(`signal:${value}`, value, signalTerms[value] ?? [value], 34);
}

export function connectorFeatureFilter(key: string, value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const connectorTerms: Record<string, string[]> = {
    HDMI: ["hdmi"],
    "USB-C": ["usb-c", "usb c"],
    "USB-A": ["usb-a", "usb a", "usb-a ports", "usb a ports"],
    "USB-B": ["usb-b", "usb b"],
    HDBaseT: ["hdbaset", "hdbt"],
    "RJ45 / network": ["rj45", "network", "1gbe", "10g", "ethernet", "lan"],
    Fibre: ["fibre", "fiber", "sfp"],
    "Audio analogue": ["analog audio", "analogue audio", "audio"],
    "Dante / AES67": ["dante", "aes67"],
    "RS-232": ["rs-232", "rs232"],
    IR: ["ir"],
  };

  return makeAnyFeatureFilter(`${key}:${value}`, value, connectorTerms[value] ?? [value], 32);
}

export function ioCountFeatureFilter(key: "inputs" | "outputs", value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;
  return makeCustomFeatureFilter(`${key}:${value}`, `${key} ${value}`, 22, (product) => productSupportsIoCount(product, key, value));
}

export function distanceFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const distanceTerms: Record<string, string[]> = {
    "Local <5m": ["switcher", "matrix", "local", "in-wall", "in wall", "in-desk", "in desk"],
    "Short 5-10m": ["10m", "15m", "short", "cable", "switcher", "hdbaset"],
    "Medium 10-35m": ["35m", "hdbaset", "hdbt", "extender", "receiver", "transmitter"],
    "Long 35-70m": ["70m", "100m", "hdbaset", "hdbt", "extender", "receiver", "transmitter"],
    "Very long 70-100m": ["100m", "hdbaset", "hdbt", "fiber", "fibre", "sfp", "networkhd"],
    "Network / site-wide": ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver", "ndi"],
  };

  return makeAnyFeatureFilter(`distance:${value}`, value, distanceTerms[value] ?? [value], 28);
}

export function resolutionFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const resolutionTerms: Record<string, string[]> = {
    "1080p": ["1080p", "1080p60", "full hd"],
    "4K30": ["4k30", "4k 30"],
    "4K60 4:2:0": ["4k60", "4k 60", "4:2:0", "4 2 0", "4k60hz"],
    "4K60 4:4:4": ["4k60", "4k 60", "4:4:4", "4 4 4", "4k60hz"],
    "8K / specialist": ["8k", "specialist", "10g", "lossless"],
  };

  return makeAnyFeatureFilter(`resolution:${value}`, value, resolutionTerms[value] ?? [value], 30);
}

export function audioFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const audioTerms: Record<string, string[]> = {
    "Audio de-embed": ["audio de-embed", "audio de embed", "de-embed", "de embed"],
    "Mic / speakerphone": ["mic", "microphone", "speakerphone", "companion mic"],
    "DSP integration": ["dsp", "mixer", "audio processing"],
    "Dante / AES67": ["dante", "aes67"],
    "Amplifier / speakers": ["amplifier", "amp", "speaker", "70v", "100v"],
  };

  return makeAnyFeatureFilter(`audio:${value}`, value, audioTerms[value] ?? [value], 34);
}

export function networkFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const networkTerms: Record<string, string[]> = {
    "Existing LAN": ["network", "lan", "ethernet", "1gbe", "web ui"],
    "Dedicated AV network": ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver"],
    "10G network": ["10g", "10gbe", "sfp+", "networkhd 600", "sdvoe"],
    "NDI source present": ["ndi", "network video", "camera"],
  };

  return makeAnyFeatureFilter(`network:${value}`, value, networkTerms[value] ?? [value], 32);
}

export function processingFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const processingTerms: Record<string, string[]> = {
    Scaling: ["scaling", "scaler", "down-scaling", "down scaling"],
    "Seamless switching": ["seamless", "seamless switching"],
    Multiview: ["multiview", "multi view", "multi-view", "pip", "quad view"],
    "Video wall processing": ["video wall", "wall processor", "lcd wall", "videowall"],
    "Matrix routing": ["matrix", "routing", "multi output", "multiple outputs"],
    "AVoIP routing": ["networkhd", "av over ip", "avoip", "encoder", "decoder"],
  };

  return makeAnyFeatureFilter(`processing:${value}`, value, processingTerms[value] ?? [value], 34);
}

export function controlFeatureFilter(value: string): FinderFeatureFilter | null {
  if (isNeutralFeatureValue(value)) return null;

  const controlTerms: Record<string, string[]> = {
    IR: ["ir"],
    "RS-232": ["rs-232", "rs232"],
    "Display power control": ["cec", "display power", "control"],
    "Web UI": ["web ui", "web gui", "tcp/ip", "tcp ip"],
    "Button panel": ["button panel", "keypad", "syn-key"],
    "Touch panel": ["touch panel", "touchscreen", "syn-touch"],
    "Third-party control": ["third-party control", "third party control", "rs-232", "rs232", "tcp/ip", "api"],
  };

  return makeAnyFeatureFilter(`control:${value}`, value, controlTerms[value] ?? [value], 32);
}

export function getFeatureFilterForNeedField(key: keyof FinderNeed, value: string): FinderFeatureFilter | null {
  if (key === "query") return queryFeatureFilter(value);
  if (key === "technicalRequirement") return technicalRequirementFeatureFilter(value);
  if (key === "productPath") return productPathFeatureFilter(value);
  if (key === "signalType") return signalFeatureFilter(value);
  if (key === "sourceConnector" || key === "displayConnector") return connectorFeatureFilter(key, value);
  if (key === "inputs" || key === "outputs") return ioCountFeatureFilter(key, value);
  if (key === "distance") return distanceFeatureFilter(value);
  if (key === "resolution") return resolutionFeatureFilter(value);
  if (key === "usb") return usbFeatureFilter(value);
  if (key === "audio") return audioFeatureFilter(value);
  if (key === "network") return networkFeatureFilter(value);
  if (key === "processing") return processingFeatureFilter(value);
  if (key === "control") return controlFeatureFilter(value);
  return null;
}

export function getActiveFeatureFilters(need: FinderNeed) {
  return (Object.keys(need) as (keyof FinderNeed)[])
    .map((key) => getFeatureFilterForNeedField(key, need[key]))
    .filter((filter): filter is FinderFeatureFilter => Boolean(filter));
}

export function toFeatureSearchMatch(product: FinderProduct, _need: FinderNeed, filters: FinderFeatureFilter[], strictMatch: boolean): ProductMatch {
  const cleanProduct = cleanFinderProduct(product);
  const matchingFilters = filters.filter((filter) => filter.matches(cleanProduct));
  const featureScore = 40 + matchingFilters.reduce((sum, filter) => sum + filter.weight, 0) + (strictMatch ? 12 : 0);
  const score = Math.min(99, featureScore);

  return {
    ...cleanProduct,
    score,
    status: strictMatch && score >= 72 ? "recommended" : score >= 52 ? "alternative" : "caution",
  };
}
