export type CatalogFamily =
  | "Signal Processing"
  | "Unified Communication"
  | "Presentation Switching"
  | "Synergy"
  | "Matrix Switching"
  | "Extenders"
  | "AV over IP"
  | "Video Walls"
  | "Multiview"
  | "Wireless Presentation"
  | "USB Extension"
  | "Audio"
  | "KVM"
  | "Control"
  | "LED"
  | "Accessories";

export type CatalogRole =
  | "room-core"
  | "video-bar"
  | "presentation-switcher"
  | "matrix-switcher"
  | "wireless-casting-host"
  | "wireless-casting-dongle"
  | "av-over-ip-encoder"
  | "av-over-ip-decoder"
  | "av-over-ip-transceiver"
  | "video-wall-processor"
  | "multiview-processor"
  | "usb-peripheral-host"
  | "uc-endpoint"
  | "accessory"
  | "cable"
  | "camera"
  | "audio-endpoint"
  | "controller"
  | "distribution-amplifier"
  | "extender"
  | "network-switch"
  | "signal-processor"
  | "splitter";

export type CatalogTechnology =
  | "camera"
  | "speaker"
  | "microphone"
  | "hdmi"
  | "hdmi-2.0"
  | "usb-c"
  | "usb"
  | "usb-2.0"
  | "usb-3.0"
  | "kvm"
  | "wireless-casting"
  | "hdbaset"
  | "hdbaset-3.0"
  | "networkhd"
  | "dante"
  | "multiview"
  | "video-wall-processing"
  | "dual-display"
  | "1gbe"
  | "ndi"
  | "led-processing"
  | "10gb";

const EVIDENCE_TECHNOLOGY_FILTERS = new Set<CatalogTechnology>([
  "kvm",
  "1gbe",
  "usb-2.0",
  "usb-3.0",
  "hdmi-2.0",
  "hdbaset-3.0",
]);

export type CatalogDeploymentRole =
  | "standalone-core"
  | "system-core"
  | "endpoint"
  | "accessory"
  | "companion"
  | "expansion";

export type CatalogLifecycle = {
  publicStatus: "active" | "coming-soon" | "discontinued" | "unknown";
  internalStatus: "active" | "legacy" | "eol-soon" | "do-not-recommend";
  excludeFromNewRecommendations: boolean;
};

export type CatalogDependencies = {
  required: string[];
  recommended: string[];
  compatibleHosts: string[];
};

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  family: string;
  series: string;
  category: string;
  summary: string;
  tags: string[];
  families: CatalogFamily[];
  roles: CatalogRole[];
  technologies: CatalogTechnology[];
  deploymentRole: CatalogDeploymentRole;
  standalone: boolean;
  lifecycle: CatalogLifecycle;
  dependencies: CatalogDependencies;
};

export type CatalogFilterState = {
  search: string;
  families: CatalogFamily[];
  series: string[];
  categories: string[];
  roles: CatalogRole[];
  technologies: CatalogTechnology[];
  deploymentRoles: CatalogDeploymentRole[];
  application: string;
  roomType: string;
  budgetBand: string;
  matchMode: "find" | "filter";
  includeAccessories: boolean;
  standaloneOnly: boolean;
  excludeEolSoon: boolean;
  dependencySkus: string[];
};

export type CatalogFacetIndex = {
  families: CatalogFamily[];
  series: string[];
  categories: string[];
  roles: CatalogRole[];
  technologies: CatalogTechnology[];
  deploymentRoles: CatalogDeploymentRole[];
};

type ProductOverride = Partial<
  Pick<
    CatalogProduct,
    | "families"
    | "roles"
    | "technologies"
    | "deploymentRole"
    | "standalone"
    | "lifecycle"
    | "dependencies"
    | "summary"
    | "tags"
    | "family"
    | "series"
    | "category"
  >
>;

export const DEFAULT_CATALOG_FILTER_STATE: CatalogFilterState = {
  search: "",
  families: [],
  series: [],
  categories: [],
  roles: [],
  technologies: [],
  deploymentRoles: [],
  application: "",
  roomType: "",
  budgetBand: "",
  matchMode: "filter",
  includeAccessories: false,
  standaloneOnly: false,
  excludeEolSoon: true,
  dependencySkus: [],
};

const MANUAL_OVERRIDES: Record<string, ProductOverride> = {
  "APO-VX20-UC-V2": {
    family: "Apollo",
    series: "Apollo",
    category: "UC Video Bar",
    families: ["Unified Communication", "Presentation Switching", "Synergy"],
    roles: ["video-bar", "presentation-switcher", "wireless-casting-host", "uc-endpoint", "usb-peripheral-host"],
    technologies: ["camera", "speaker", "microphone", "hdmi", "usb-c", "wireless-casting", "dual-display"],
    deploymentRole: "standalone-core",
    standalone: true,
    dependencies: { required: [], recommended: [], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
    summary:
      "All-in-one UC video bar that overlaps conferencing, switching and presentation workflows with camera, mics, speaker, USB-C, HDMI and wireless casting.",
    tags: ["UC", "Video bar", "Wireless casting", "Dual display", "BYOM"],
  },
  "APO-VX20-UC": {
    family: "Apollo",
    series: "Apollo",
    category: "UC Video Bar",
    families: ["Unified Communication", "Presentation Switching", "Synergy"],
    roles: ["video-bar", "presentation-switcher", "wireless-casting-host", "uc-endpoint", "usb-peripheral-host"],
    technologies: ["camera", "speaker", "microphone", "hdmi", "usb-c", "wireless-casting", "dual-display"],
    deploymentRole: "standalone-core",
    standalone: true,
    dependencies: { required: [], recommended: [], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "legacy", excludeFromNewRecommendations: false },
  },
  "APO-210-UC": {
    family: "Apollo",
    series: "Apollo",
    category: "UC Switcher",
    families: ["Unified Communication", "Presentation Switching", "Synergy"],
    roles: ["presentation-switcher", "uc-endpoint", "usb-peripheral-host", "audio-endpoint"],
    technologies: ["camera", "speaker", "microphone", "hdmi", "hdbaset", "wireless-casting", "multiview", "usb-c"],
    deploymentRole: "standalone-core",
    standalone: true,
    dependencies: { required: [], recommended: ["CAM-420-PTZ", "CAM-210-PTZ", "APO-COM-MIC"], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
    summary:
      "Table-top UC video and audio switcher for rooms larger than APO-VX20-UC-V2 can cover, pairing with a dedicated PTZ camera (CAM-420-PTZ or CAM-210-PTZ). Supports wireless casting of video/audio presentation content, but is not compatible with the APO-DG2 dongle - APO-DG2's wireless data connectivity to mic, speakers and camera is exclusive to APO-VX20-UC-V2.",
    tags: ["UC", "PTZ camera pairing", "Larger room", "Table-top", "Wireless presentation casting"],
  },
  "APO-UC210": {
    family: "Apollo",
    series: "Apollo",
    category: "UC Switcher",
    families: ["Unified Communication", "Presentation Switching", "Synergy"],
    roles: ["presentation-switcher", "uc-endpoint", "usb-peripheral-host", "audio-endpoint"],
    technologies: ["camera", "speaker", "microphone", "hdmi", "hdbaset", "wireless-casting", "multiview", "usb-c"],
    deploymentRole: "standalone-core",
    standalone: true,
    dependencies: { required: [], recommended: ["CAM-420-PTZ", "CAM-210-PTZ", "APO-COM-MIC"], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
  },
  "APO-DG2": {
    family: "Apollo",
    series: "Apollo Accessories",
    category: "Wireless Casting Dongle",
    families: ["Wireless Presentation", "Synergy", "Accessories"],
    roles: ["wireless-casting-dongle", "accessory"],
    technologies: ["usb-c", "wireless-casting"],
    deploymentRole: "companion",
    standalone: false,
    dependencies: {
      required: ["Compatible host"],
      recommended: [],
      compatibleHosts: ["SW-620-TX-W", "SW-640L-TX-W", "APO-VX20-UC-V2", "APO-VX20-UC"],
    },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
    summary:
      "Host-dependent wireless presentation dongle. It should surface as a companion accessory, not a standalone room solution.",
    tags: ["Accessory", "Requires host", "Wireless casting"],
  },
  "APO-DG2-PRO": {
    family: "Apollo",
    series: "Apollo Accessories",
    category: "Wireless Casting Dongle",
    families: ["Wireless Presentation", "Synergy", "Accessories"],
    roles: ["wireless-casting-dongle", "accessory"],
    technologies: ["usb-c", "wireless-casting"],
    deploymentRole: "companion",
    standalone: false,
    dependencies: {
      required: ["Compatible host"],
      recommended: [],
      compatibleHosts: ["SW-620-TX-W", "SW-640L-TX-W", "APO-VX20-UC-V2", "APO-VX20-UC"],
    },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
  },
  "SW-620-TX-W": {
    family: "Synergy",
    series: "Synergy",
    category: "Presentation Switcher",
    families: ["Presentation Switching", "Wireless Presentation", "Synergy"],
    roles: ["presentation-switcher", "wireless-casting-host", "usb-peripheral-host", "room-core"],
    technologies: ["hdmi", "usb-c", "usb", "wireless-casting"],
    deploymentRole: "standalone-core",
    standalone: true,
    dependencies: { required: [], recommended: ["APO-DG2", "APO-DG2-PRO"], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
    summary:
      "Room presentation switcher with optional DG2 synergy. This is a standalone room core, with wireless dongles as companions rather than mandatory room hardware.",
    tags: ["BYOD", "Wireless host", "DG2 ready", "Room core"],
  },
  "SW-640L-TX-W": {
    family: "Synergy",
    series: "Synergy",
    category: "Presentation Switcher",
    families: ["Presentation Switching", "Wireless Presentation", "Synergy"],
    roles: ["presentation-switcher", "wireless-casting-host", "usb-peripheral-host", "room-core"],
    technologies: ["hdmi", "usb-c", "usb", "wireless-casting", "dual-display"],
    deploymentRole: "standalone-core",
    standalone: true,
    dependencies: { required: [], recommended: ["APO-DG2", "APO-DG2-PRO"], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
    tags: ["Dual display", "Wireless host", "DG2 ready", "Room core"],
  },
  "MX-1007-HYB": {
    family: "Matrix",
    series: "Hybrid Matrix",
    category: "Hybrid Matrix",
    families: ["Matrix Switching", "Presentation Switching", "Audio", "USB Extension"],
    roles: ["matrix-switcher", "presentation-switcher", "usb-peripheral-host", "room-core"],
    technologies: ["hdmi", "usb-c", "hdbaset", "networkhd", "dante", "multiview"],
    deploymentRole: "system-core",
    standalone: true,
    dependencies: { required: [], recommended: [], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
    summary:
      "Hybrid system core spanning matrix switching, USB host workflows, HDBaseT, NetworkHD and Dante. It should not be treated as a simple single-family switcher.",
    tags: ["Hybrid core", "Dante", "NetworkHD", "HDBaseT", "USB host"],
  },
  "SW-0206-VW": {
    family: "Video Wall",
    series: "Video Wall",
    category: "Processor",
    families: ["Video Walls"],
    roles: ["video-wall-processor"],
    technologies: ["hdmi", "video-wall-processing"],
    deploymentRole: "system-core",
    standalone: true,
    dependencies: { required: [], recommended: [], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
  },
  "NHD-0401-MV": {
    family: "NHD",
    series: "Multiview",
    category: "Multiview Processor",
    families: ["Multiview", "AV over IP"],
    roles: ["multiview-processor"],
    technologies: ["hdmi", "multiview"],
    deploymentRole: "expansion",
    standalone: false,
    dependencies: {
      required: [],
      recommended: ["NHD-500-E-TX", "NHD-500-E-RX", "NHD-600-TRX"],
      compatibleHosts: [],
    },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
    tags: ["Multiview", "Expansion"],
  },
  "NHD-600-TRX": {
    family: "NHD",
    series: "NHD-600 Series",
    category: "AVoIP Transceiver",
    families: ["AV over IP", "Multiview", "USB Extension", "Audio", "Video Walls"],
    roles: ["av-over-ip-transceiver"],
    technologies: ["hdmi", "usb", "networkhd", "dante", "multiview", "10gb"],
    deploymentRole: "endpoint",
    standalone: false,
    dependencies: { required: [], recommended: [], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "active", excludeFromNewRecommendations: false },
  },
};

export function uniqueStrings<T extends string>(values: T[]): T[] {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))] as T[];
}

export function normalizeSku(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

export function createDefaultCatalogFilterState(): CatalogFilterState {
  return { ...DEFAULT_CATALOG_FILTER_STATE };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function containsText(text: string, query: string): boolean {
  return normalizeText(text).includes(normalizeText(query));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsToken(text: string, token: string): boolean {
  const normalizedToken = escapeRegExp(normalizeText(token));
  return new RegExp(`(^|[^a-z0-9])${normalizedToken}([^a-z0-9]|$)`).test(normalizeText(text));
}

function intersects<T extends string>(left: T[], right: T[]): boolean {
  return left.some((value) => right.includes(value));
}

function getSearchableHaystack(product: CatalogProduct): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.series,
    product.category,
    product.summary,
    ...product.tags,
    ...product.families,
    ...product.roles,
    ...product.technologies,
    product.deploymentRole,
  ]
    .join(" ")
    .toLowerCase();
}

function isCableSku(sku: string, category: string): boolean {
  return /^(?:EXP-)?CAB-/i.test(sku) || containsToken(category.toLowerCase(), "cable") || containsToken(category.toLowerCase(), "cables");
}

function classificationHas(classificationText: string, token: string): boolean {
  return containsToken(classificationText, token);
}

type TechnicalEvidence = {
  usb?: { present?: boolean; versions?: unknown[]; evidence?: unknown[] };
  kvm?: { supported?: boolean; evidence?: unknown[] };
  hdmiVersions?: unknown[];
  hdbasetVersions?: unknown[];
  ethernetSpeeds?: unknown[];
};

type ProductClassification = Record<string, unknown>;

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function classificationFacetText(classification: ProductClassification): string {
  return [
    classification.primaryCategory,
    classification.category,
    classification.subCategory,
    classification.productType,
    classification.productSubType,
    classification.systemRole,
    ...strings(classification.subClassifications),
  ].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
}

function hasVersion(values: unknown[], version: string): boolean {
  return values.some((value) => typeof value === "string" && new RegExp(`(?:^|\\D)${version.replace(/\./g, "\\.")}(?:\\D|$)`).test(value));
}

// A passive cable's generic "applications" copy (meeting room, video wall, UC space, ...)
// describes rooms it might be *used in*, not what the cable *is* - so it should never
// itself carry a system-role family/role that would surface it under those filter chips.
const SYSTEM_ROLE_FAMILIES = new Set<CatalogFamily>([
  "Unified Communication",
  "Presentation Switching",
  "Synergy",
  "Matrix Switching",
  "AV over IP",
  "Video Walls",
  "Multiview",
  "Audio",
  "Control",
]);

const SYSTEM_ROLE_ROLES = new Set<CatalogRole>([
  "presentation-switcher",
  "matrix-switcher",
  "wireless-casting-host",
  "av-over-ip-encoder",
  "av-over-ip-decoder",
  "av-over-ip-transceiver",
  "video-wall-processor",
  "multiview-processor",
  "uc-endpoint",
  "camera",
  "audio-endpoint",
  "video-bar",
  "room-core",
]);

function isPresentationSwitcher(sku: string, name: string): boolean {
  if (/^(?:EXP-)?SW-/i.test(sku)) return !/-(?:VW|MV)(?:-|$)/i.test(sku);
  if (/^MX-.*(?:MST|HYB)/i.test(sku) || /^SYN-KIT-/i.test(sku)) return true;
  if (/^APO-(?:200-UC|210-UC|UC210|VX20-UC)(?:-|$)/i.test(sku)) return true;
  return /(?:presentation|conference room) switcher/i.test(name);
}

function inferFamilies(input: {
  sku: string;
  name: string;
  family: string;
  series: string;
  category: string;
  summary: string;
  tags: string[];
  classificationText: string;
}): CatalogFamily[] {
  const text = [
    input.sku,
    input.name,
    input.family,
    input.series,
    input.category,
    input.summary,
  ]
    .join(" ")
    .toLowerCase();

  const families: CatalogFamily[] = [];
  const has = (token: string) => containsToken(text, token);
  const classified = (token: string) => classificationHas(input.classificationText, token);

  // High-confidence catalog classification separates signal utilities and
  // camera endpoints from incidental audio/control wording in the summary.
  if (classified("camera endpoint") || classified("camera / capture")) return ["Unified Communication"];
  if (classified("accessory / other") || classified("rack accessory") || classified("mounting accessory")) return ["Accessories"];
  if (classified("splitter") || classified("signal utility") || classified("signal management") || classified("audio extraction") || classified("signal conditioning")) {
    return ["Signal Processing", ...(classified("audio extraction") || classified("audio conversion") ? ["Audio" as const] : [])];
  }

  // Product identity wins over references to other equipment in its description.
  if (/^(?:EX|TX|RX)-/i.test(input.sku)) {
    return ["Extenders", ...(has("usb") ? ["USB Extension" as const] : []), ...(has("kvm") ? ["KVM" as const] : [])];
  }
  if (/^CAM-/i.test(input.sku)) return ["Unified Communication"];
  if (/^AMP-/i.test(input.sku)) return ["Audio"];
  if (/^(?:MX|MXV)-/i.test(input.sku)) return ["Matrix Switching", ...(isPresentationSwitcher(input.sku, input.name) ? ["Presentation Switching" as const] : [])];
  if (/^NHD-.*CTL/i.test(input.sku)) return ["AV over IP", "Control"];
  if (classified("network switch") || classified("avoip infrastructure")) return ["AV over IP"];
  if (classified("control interface") || classified("control device")) return ["Control", ...(has("synergy") ? ["Synergy" as const] : [])];
  if (classified("hdbaset extender") || classified("signal extension endpoint")) return ["Extenders", ...(has("usb") ? ["USB Extension" as const] : [])];

  if (/^(?:EX|TX|RX)-/i.test(input.sku) || has("extender")) families.push("Extenders");
  if (has("kvm")) families.push("KVM");

  if (has("apollo") || has("conference") || has("teams") || has("uc")) {
    families.push("Unified Communication");
  }
  if (isPresentationSwitcher(input.sku, input.name)) {
    families.push("Presentation Switching");
  }
  if (has("synergy") || has("wireless host") || has("wireless casting")) {
    families.push("Synergy");
  }
  if (has("matrix") || has("hyb")) {
    families.push("Matrix Switching");
  }
  if (has("nhd") || has("avoip") || has("av over ip")) {
    families.push("AV over IP");
  }
  if (has("video wall") || has("vw") || has("mosaic")) {
    families.push("Video Walls");
  }
  if (has("multiview")) {
    families.push("Multiview");
  }
  if (has("wireless")) {
    families.push("Wireless Presentation");
  }
  if (has("usb extender") || has("usb extension") || has("kvm")) {
    families.push("USB Extension");
  }
  if (has("dante") || has("speaker") || has("microphone") || has("audio")) {
    families.push("Audio");
  }
  if (has("controller") || has("control interface") || has("keypad") || has("touch panel")) {
    families.push("Control");
  }
  if (has("led wall") || has("led processor") || has("led cabinet") || has("led display") || has("led tile")) {
    families.push("LED");
  }
  if (has("dongle") || has("accessory")) {
    families.push("Accessories");
  }

  if (isCableSku(input.sku, input.category)) {
    return uniqueStrings(families.filter((family) => !SYSTEM_ROLE_FAMILIES.has(family)).concat("Accessories"));
  }

  return uniqueStrings(families);
}

function inferRoles(input: {
  sku: string;
  name: string;
  category: string;
  summary: string;
  features: string[];
  classificationText: string;
  accessory: boolean;
}): CatalogRole[] {
  // Roles describe the item itself; application tags and compatible equipment
  // are searchable context, not evidence that the item performs that function.
  const text = [input.sku, input.name, input.category].join(" ").toLowerCase();
  const roles: CatalogRole[] = [];
  const has = (token: string) => containsToken(text, token);
  const classified = (token: string) => classificationHas(input.classificationText, token);

  if (input.accessory) return isCableSku(input.sku, input.category) ? ["accessory", "cable"] : ["accessory"];
  if (/^(?:EX|TX|RX)-/i.test(input.sku)) return ["extender"];
  if (/^CAM-/i.test(input.sku)) return ["camera"];
  if (/^AMP-/i.test(input.sku)) return ["audio-endpoint"];
  if (/^(?:MX|MXV)-/i.test(input.sku)) return ["matrix-switcher", "room-core", ...(isPresentationSwitcher(input.sku, input.name) ? ["presentation-switcher" as const] : [])];
  if (/^NHD-.*CTL/i.test(input.sku)) return ["controller"];
  if (/^NHD-.*-TRX(?:-|$)/i.test(input.sku)) return ["av-over-ip-transceiver"];
  if (/^NHD-.*-TX(?:-|$)/i.test(input.sku)) return ["av-over-ip-encoder"];
  if (/^NHD-.*-RX(?:-|$)/i.test(input.sku)) return ["av-over-ip-decoder"];
  if (/^(?:SP-|SP\d)/i.test(input.sku)) return [classified("splitter") || classified("signal distribution") ? "splitter" : "distribution-amplifier"];

  if (classified("network switch")) roles.push("network-switch");
  if (classified("signal utility") || classified("signal management") || classified("audio extraction") || classified("audio conversion") || classified("edid")) roles.push("signal-processor");
  if (classified("hdbaset extender") || classified("signal extension endpoint") || classified("usb / kvm extender")) roles.push("extender");
  if (classified("control interface") || classified("control device") || classified("system-controller") || classified("keypad") || classified("touchscreen") || classified("touch interface")) roles.push("controller");
  if (classified("camera endpoint") || classified("usb camera") || classified("camera / capture")) roles.push("camera");
  if (classified("microphone system") || classified("speakerphone") || classified("audio endpoint")) roles.push("audio-endpoint");
  if (classified("splitter") || classified("one-to-many distribution")) roles.push("splitter");

  if (has("video bar")) roles.push("video-bar");
  if (isPresentationSwitcher(input.sku, input.name)) roles.push("presentation-switcher");
  if (has("matrix")) roles.push("matrix-switcher");
  if (has("wireless host")) roles.push("wireless-casting-host");
  if (has("dongle")) roles.push("wireless-casting-dongle");
  if (has("encoder")) roles.push("av-over-ip-encoder");
  if (has("decoder")) roles.push("av-over-ip-decoder");
  if (has("transceiver") || has("trx")) roles.push("av-over-ip-transceiver");
  if (has("video wall")) roles.push("video-wall-processor");
  if (has("multiview")) roles.push("multiview-processor");
  if (has("usb host") || has("usb switcher")) roles.push("usb-peripheral-host");
  if (has("uc") || has("conference")) roles.push("uc-endpoint");
  if (has("accessory") || has("dongle")) roles.push("accessory");
  if (has("camera") || has("ptz")) roles.push("camera");
  if (has("speakerphone") || has("microphone system")) roles.push("audio-endpoint");
  if (has("extender") || /^(?:EX|TX|RX)-/i.test(input.sku)) roles.push("extender");
  if (roles.includes("presentation-switcher") || roles.includes("matrix-switcher")) roles.push("room-core");

  if (isCableSku(input.sku, input.category)) {
    return uniqueStrings(roles.filter((role) => !SYSTEM_ROLE_ROLES.has(role)).concat("accessory", "cable"));
  }

  return uniqueStrings(roles);
}

function inferTechnologies(input: {
  sku: string;
  name: string;
  summary: string;
  features: string[];
  transport: string[];
  classificationText: string;
  classification: ProductClassification;
  technicalEvidence: TechnicalEvidence | null;
}): CatalogTechnology[] {
  // Identity is useful for direct catalogue discovery. Summaries and flattened
  // feature/tag blobs are not protocol evidence: generated profiles can carry
  // boilerplate such as “KVM / USB extension” on unrelated products.
  const identityText = [input.sku, input.name].join(" ").toLowerCase();
  const summaryText = input.summary.toLowerCase();
  const featureText = input.features.join(" ").toLowerCase();
  const transportText = input.transport.join(" ").toLowerCase();
  const classificationText = classificationFacetText(input.classification);
  const evidence = input.technicalEvidence ?? {};
  const hasTechnicalEvidence = input.technicalEvidence !== null;
  const technologies: CatalogTechnology[] = [];
  const identityHas = (token: string) => containsToken(identityText, token);
  const featureHas = (token: string) => input.features.some((feature) => containsToken(feature.toLowerCase(), token));
  const transportHas = (token: string) => containsToken(transportText, token);
  const classificationHasToken = (token: string) => classificationHas(classificationText, token);
  const classificationSubtype = typeof input.classification.productSubType === "string"
    ? [input.classification.productSubType]
    : [];
  const usbPresent = hasTechnicalEvidence
    ? evidence.usb?.present === true
    : transportHas("usb") || strings(input.classification.signalDomains).some((value) => containsToken(value.toLowerCase(), "usb"))
      || identityHas("usb") || featureHas("usb");
  const explicitUsbVersions = hasTechnicalEvidence ? (evidence.usb?.versions ?? []) : classificationSubtype;
  const hdmiVersions = hasTechnicalEvidence ? (evidence.hdmiVersions ?? []) : classificationSubtype;
  const hdbasetVersions = hasTechnicalEvidence ? (evidence.hdbasetVersions ?? []) : classificationSubtype;
  const ethernetSpeeds = [...(evidence.ethernetSpeeds ?? []), ...input.transport];
  const directKvm = !hasTechnicalEvidence && (/\bkvm\b/i.test(`${input.sku} ${input.name}`)
    || /\bkvm\b/i.test(classificationText));

  if (identityHas("camera") || identityHas("ptz") || featureHas("camera endpoint") || classificationHasToken("camera endpoint")) technologies.push("camera");
  if (identityHas("speaker") || featureHas("speakerphone")) technologies.push("speaker");
  if (identityHas("microphone") || identityHas("mic") || featureHas("microphone")) technologies.push("microphone");
  if (transportHas("hdmi") || identityHas("hdmi") || featureHas("hdmi") || containsToken(summaryText, "hdmi")) technologies.push("hdmi");
  if (hasVersion(hdmiVersions, "2.0") || (!hasTechnicalEvidence && /\bhdmi\s*2\.0\b/i.test(identityText))) technologies.push("hdmi-2.0");
  if (transportHas("usb-c") || identityHas("usb-c") || featureHas("usb-c")) technologies.push("usb-c");
  if (usbPresent) technologies.push("usb");
  if (hasVersion(explicitUsbVersions, "2.0") || (!hasTechnicalEvidence && /\busb\s*2\.0\b/i.test(identityText))) technologies.push("usb-2.0");
  if (hasVersion(explicitUsbVersions, "3.0") || (!hasTechnicalEvidence && /\busb\s*3\.0\b/i.test(identityText))) technologies.push("usb-3.0");
  if (hasTechnicalEvidence ? evidence.kvm?.supported === true : directKvm) technologies.push("kvm");
  if (identityHas("wireless") || featureHas("wireless casting") || featureHas("wireless presentation")) technologies.push("wireless-casting");
  if (transportHas("hdbaset") || identityHas("hdbaset") || featureHas("hdbaset") || containsToken(summaryText, "hdbaset")) technologies.push("hdbaset");
  if (hasVersion(hdbasetVersions, "3.0") || (!hasTechnicalEvidence && (/\bhdbaset\s*3\.0\b/i.test(identityText) || /\bhdbt3\b/i.test(input.sku)))) technologies.push("hdbaset-3.0");
  if (/^NHD-/i.test(input.sku) || classificationHasToken("networkhd")) technologies.push("networkhd");
  if (identityHas("dante") || featureHas("dante")) technologies.push("dante");
  if (identityHas("multiview") || featureHas("multiview") || classificationHasToken("multiview processor")) technologies.push("multiview");
  if (identityHas("video wall") || identityHas("mosaic") || featureHas("video wall processing")) technologies.push("video-wall-processing");
  if (identityHas("dual display") || identityHas("dual output") || featureHas("dual display")) technologies.push("dual-display");
  if (identityHas("ndi") || featureHas("ndi")) technologies.push("ndi");
  if (identityHas("led wall") || identityHas("led processor") || identityHas("led cabinet") || identityHas("led display") || identityHas("led tile")) {
    technologies.push("led-processing");
  }
  if (/(?:^|[^0-9])10(?:\.3125)?\s?g(?:be|bps|b)?(?:[^a-z]|$)/i.test(`${identityText} ${transportText}`)) technologies.push("10gb");
  if (/(?:^|[^0-9])1\s?(?:gbe|gbps|gbit(?:\/s)?|gigabit(?:\s+ethernet)?)(?:$|[^a-z0-9])/i.test(ethernetSpeeds.join(" "))
    || /(?:^|[^0-9])1000\s?(?:base-?t|mbps)(?:$|[^a-z0-9])/i.test(ethernetSpeeds.join(" "))
    || /(?:^|[^0-9])1\s?(?:gbe|gbps|gbit(?:\/s)?|gigabit(?:\s+ethernet)?)(?:$|[^a-z0-9])/i.test(identityText)) {
    technologies.push("1gbe");
  }

  return uniqueStrings(technologies);
}

function inferDeploymentRole(product: {
  roles: CatalogRole[];
  families: CatalogFamily[];
  sku: string;
  summary: string;
}): CatalogDeploymentRole {
  const text = `${product.sku} ${product.summary}`.toLowerCase();

  if (product.roles.includes("wireless-casting-dongle") || text.includes("requires host")) return "companion";
  if (product.roles.includes("accessory")) return "accessory";
  if (product.roles.includes("video-bar") || product.roles.includes("uc-endpoint")) return "standalone-core";
  if (product.roles.includes("matrix-switcher") || product.roles.includes("room-core") || product.roles.includes("video-wall-processor")) {
    return "system-core";
  }
  if (
    product.roles.includes("av-over-ip-encoder") ||
    product.roles.includes("av-over-ip-decoder") ||
    product.roles.includes("av-over-ip-transceiver") ||
    product.roles.includes("camera") ||
    product.roles.includes("extender")
  ) {
    return "endpoint";
  }
  if (product.roles.includes("multiview-processor")) return "expansion";
  if (product.families.includes("Accessories")) return "accessory";

  return "system-core";
}

function inferLifecycle(product: {
  sku: string;
  name: string;
  summary: string;
  tags: string[];
}): CatalogLifecycle {
  const text = [product.sku, product.name, product.summary, ...product.tags].join(" ").toLowerCase();

  if (containsToken(text, "eol") || text.includes("do not recommend")) {
    return { publicStatus: "active", internalStatus: "do-not-recommend", excludeFromNewRecommendations: true };
  }
  if (text.includes("legacy")) {
    return { publicStatus: "active", internalStatus: "legacy", excludeFromNewRecommendations: false };
  }

  return { publicStatus: "unknown", internalStatus: "active", excludeFromNewRecommendations: false };
}

function inferDependencies(product: {
  sku: string;
  families: CatalogFamily[];
  roles: CatalogRole[];
  technologies: CatalogTechnology[];
}): CatalogDependencies {
  const sku = normalizeSku(product.sku);

  if (sku.includes("DG2")) {
    return {
      required: ["Compatible host"],
      recommended: [],
      compatibleHosts: ["SW-620-TX-W", "SW-640L-TX-W", "APO-VX20-UC-V2", "APO-VX20-UC"],
    };
  }

  if (sku === "SW-620-TX-W" || sku === "SW-640L-TX-W") {
    return { required: [], recommended: ["APO-DG2", "APO-DG2-PRO"], compatibleHosts: [] };
  }

  if (sku === "NHD-0401-MV") {
    return { required: [], recommended: ["NHD-500-E-TX", "NHD-500-E-RX", "NHD-600-TRX"], compatibleHosts: [] };
  }

  return { required: [], recommended: [], compatibleHosts: [] };
}

export function applyCatalogOverrides(input: unknown, overrideSource?: Record<string, ProductOverride>): CatalogProduct[] {
  if (!Array.isArray(input)) return [];

  const mergedOverrides = { ...MANUAL_OVERRIDES, ...(overrideSource ?? {}) };

  return input
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;

      const rawSku = String(record.sku ?? record.model ?? record.code ?? "").trim();
      const normalizedSku = normalizeSku(rawSku);
      const name = String(record.name ?? record.title ?? record.productName ?? rawSku).trim();

      let family = String(record.family ?? record.productFamily ?? "Other").trim();
      let series = String(record.series ?? "").trim();
      const category = String(record.category ?? record.type ?? record.productType ?? "Product").trim();
      const summary = String(record.summary ?? record.description ?? record.shortDescription ?? "").trim();
      const classification = record.productClassification && typeof record.productClassification === "object"
        ? record.productClassification as Record<string, unknown>
        : {};
      const classificationText = [
        classification.primaryCategory,
        classification.category,
        classification.subCategory,
        classification.productType,
        classification.productSubType,
        classification.systemRole,
        ...(Array.isArray(classification.subClassifications) ? classification.subClassifications : []),
        ...(Array.isArray(classification.classificationPath) ? classification.classificationPath : []),
      ].filter((value): value is string => typeof value === "string").join(" ");
      const productFeatures = [
        ...(Array.isArray(record.features) ? record.features.map(String) : []),
        ...(Array.isArray(record.featureTags) ? record.featureTags.map(String) : []),
        ...(Array.isArray(record.technologies) ? record.technologies.map(String) : []),
        ...(Array.isArray(record.connectors) ? record.connectors.map(String) : []),
      ];
      const transport = Array.isArray(classification.transportClass)
        ? classification.transportClass.map(String)
        : [];

      // A family landing page is not an orderable product. Keep its actual
      // transmitter/receiver and regional SKUs available as separate results.
      // Runtime records can replace the summary, so known family identities
      // must not depend on the wording of the current description.
      if (/^(?:SW-130-TX|(?:EXP-)?SW-0X01-8K)$/i.test(rawSku)
        || /\bnot an orderable SKU\b|\bnot an orderable product\b/i.test(summary)
        || (/^NHD-/i.test(rawSku) && /encoder\s*(?:&|and)\s*decoder/i.test(name))) return null;

      if (normalizedSku.startsWith("NHD-")) {
        family = "NHD";
        if (!series) {
          if (
            normalizedSku.startsWith("NHD-100") ||
            normalizedSku.startsWith("NHD-110") ||
            normalizedSku.startsWith("NHD-120") ||
            normalizedSku.startsWith("NHD-128") ||
            normalizedSku.startsWith("NHD-150")
          ) {
            series = "NHD-100 Series";
          } else if (normalizedSku.startsWith("NHD-500")) {
            series = "NHD-500 Series";
          } else if (normalizedSku.startsWith("NHD-600")) {
            series = "NHD-600 Series";
          } else {
            series = "NHD";
          }
        }
      }

      if (!series) series = family || "Other";

      const tags = uniqueStrings([
        ...(Array.isArray(record.tags) ? record.tags.map(String) : []),
        ...(Array.isArray(record.features) ? record.features.map(String) : []),
        ...(Array.isArray(record.featureTags) ? record.featureTags.map(String) : []),
        ...(Array.isArray(record.applications) ? record.applications.map(String) : []),
      ]).slice(0, 14);

      const seed = {
        sku: rawSku || name || `Product ${index + 1}`,
        name: name || rawSku || `Product ${index + 1}`,
        family,
        series,
        category: category || "Product",
        summary,
        tags,
        features: productFeatures,
        classificationText,
        classification,
        technicalEvidence: record.technicalEvidence && typeof record.technicalEvidence === "object"
          ? record.technicalEvidence as TechnicalEvidence
          : null,
        transport,
      };

      const override = mergedOverrides[normalizedSku];
      const accessory = record.commercialRole === "accessory" || record.commercialRole === "cable"
        || classificationHas(classificationText, "accessory")
        || classificationHas(classificationText, "rack mount")
        || classificationHas(classificationText, "mounting accessory")
        || classificationHas(classificationText, "usb cable")
        || classificationHas(classificationText, "hdmi cable")
        || classificationHas(classificationText, "displayport cable")
        || /^(?:PSU-|.*-(?:RACK|MNT)(?:-|$))/.test(normalizedSku);
      const families = override?.families ?? (accessory ? ["Accessories"] as CatalogFamily[] : inferFamilies(seed));
      const inferredRoles = override?.roles ?? inferRoles({ ...seed, accessory });
      const roles = isCableSku(seed.sku, seed.category)
        ? uniqueStrings([...inferredRoles, "accessory", "cable"])
        : inferredRoles;
      const inferredTechnologies = inferTechnologies(seed);
      const technologies = override?.technologies
        ? uniqueStrings([
            ...override.technologies,
            ...inferredTechnologies.filter((technology) => EVIDENCE_TECHNOLOGY_FILTERS.has(technology)),
          ])
        : inferredTechnologies;
      const deploymentRole = override?.deploymentRole ?? inferDeploymentRole({ sku: seed.sku, summary: seed.summary, families, roles });
      const lifecycle = override?.lifecycle ?? inferLifecycle(seed);
      const dependencies = override?.dependencies ?? inferDependencies({ sku: seed.sku, families, roles, technologies });

      return {
        id: String(record.id ?? `${normalizedSku || name || "product"}-${index}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-"),
        sku: seed.sku,
        name: seed.name,
        family: override?.family ?? seed.family,
        series: override?.series ?? seed.series,
        category: override?.category ?? seed.category,
        summary: override?.summary ?? seed.summary,
        tags: uniqueStrings([...(override?.tags ?? []), ...seed.tags]).slice(0, 14),
        families,
        roles,
        technologies,
        deploymentRole,
        standalone: override?.standalone ?? (deploymentRole === "standalone-core" || deploymentRole === "system-core"),
        lifecycle,
        dependencies,
      } satisfies CatalogProduct;
    })
    .filter((item): item is CatalogProduct => Boolean(item));
}

export function buildFacetIndex(products: CatalogProduct[]): CatalogFacetIndex {
  return {
    families: uniqueStrings(products.flatMap((product) => product.families)).sort(),
    series: uniqueStrings(products.map((product) => product.series)).sort(),
    categories: uniqueStrings(products.map((product) => product.category)).sort(),
    roles: uniqueStrings(products.flatMap((product) => product.roles)).sort(),
    technologies: uniqueStrings(products.flatMap((product) => product.technologies)).filter((technology) => technology !== "usb").sort(),
    deploymentRoles: uniqueStrings(products.map((product) => product.deploymentRole)).sort(),
  };
}

// Facet chips (family/role/technology/series/category/deployment role) and the
// accessory/standalone/EOL toggles are explicit, deliberate selections - they must
// always hard-exclude non-matching products, in both "Strict filter" and "Smart find"
// mode. Only free-text fields (search/application/roomType/budgetBand) get fuzzy
// scoring in "find" mode; a "Video Walls" chip should never let an unrelated cable
// back in just because it also happens to be an accessory or score a stray text point.
function passesStructuredFilters(product: CatalogProduct, state: CatalogFilterState): boolean {
  if (state.families.length > 0 && !intersects(product.families, state.families)) return false;
  if (state.series.length > 0 && !state.series.includes(product.series)) return false;
  if (state.categories.length > 0 && !state.categories.includes(product.category)) return false;
  if (state.roles.length > 0 && !intersects(product.roles, state.roles)) return false;
  if (state.technologies.length > 0 && !intersects(product.technologies, state.technologies)) return false;
  if (state.deploymentRoles.length > 0 && !state.deploymentRoles.includes(product.deploymentRole)) return false;
  if (state.standaloneOnly && !product.standalone) return false;
  const explicitCableIntent = product.roles.includes("cable") && isExplicitCableIntent(product, state);
  if (product.roles.includes("cable") && !explicitCableIntent) return false;
  if (!state.includeAccessories && (product.deploymentRole === "accessory" || product.deploymentRole === "companion") && !explicitCableIntent) return false;
  if (state.excludeEolSoon && product.lifecycle.excludeFromNewRecommendations) return false;

  if (state.dependencySkus.length > 0) {
    const dependencyHaystack = [
      ...product.dependencies.required,
      ...product.dependencies.recommended,
      ...product.dependencies.compatibleHosts,
      product.sku,
    ].map(normalizeSku);

    const matchesDependency = state.dependencySkus.some((sku) => dependencyHaystack.includes(normalizeSku(sku)));
    if (!matchesDependency) return false;
  }

  return true;
}

export function isExplicitCableIntent(product: CatalogProduct, state: CatalogFilterState): boolean {
  if (state.roles.includes("cable")) return true;
  if (/\bcables?\b|\bcabling\b/i.test(state.search)) return true;
  return Boolean(state.search.trim()) && normalizeSku(product.sku) === normalizeSku(state.search);
}

function strictMatch(product: CatalogProduct, state: CatalogFilterState): boolean {
  if (!passesStructuredFilters(product, state)) return false;

  if (state.application.trim()) {
    const applicationHaystack = `${product.summary} ${product.tags.join(" ")} ${product.name}`.toLowerCase();
    if (!containsText(applicationHaystack, state.application)) return false;
  }

  if (state.roomType.trim()) {
    const roomHaystack = `${product.summary} ${product.tags.join(" ")} ${product.name}`.toLowerCase();
    if (!containsText(roomHaystack, state.roomType)) return false;
  }

  if (state.budgetBand.trim()) {
    const budgetHaystack = `${product.summary} ${product.tags.join(" ")}`.toLowerCase();
    if (!containsText(budgetHaystack, state.budgetBand)) return false;
  }

  if (state.search.trim()) {
    const tokens = state.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = getSearchableHaystack(product);
    const skuQuery = state.search.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const skuMatch = /\d/.test(skuQuery) && product.sku.replace(/[^a-z0-9]/gi, "").toLowerCase().includes(skuQuery);
    if (!skuMatch && !tokens.every((token) => haystack.includes(token))) return false;
  }

  return true;
}

function scoreProduct(product: CatalogProduct, state: CatalogFilterState): number {
  let score = 0;
  const haystack = getSearchableHaystack(product);
  const q = state.search.trim().toLowerCase();

  if (q) {
    if (normalizeSku(product.sku) === normalizeSku(q)) score += 180;
    else if (haystack.includes(q)) score += 80;

    for (const token of q.split(/\s+/).filter(Boolean)) {
      if (haystack.includes(token)) score += 14;
    }
  }

  if (state.families.length > 0 && intersects(product.families, state.families)) score += 32;
  if (state.series.length > 0 && state.series.includes(product.series)) score += 30;
  if (state.categories.length > 0 && state.categories.includes(product.category)) score += 24;
  if (state.roles.length > 0 && intersects(product.roles, state.roles)) score += 28;
  if (state.technologies.length > 0 && intersects(product.technologies, state.technologies)) score += 26;
  if (state.deploymentRoles.length > 0 && state.deploymentRoles.includes(product.deploymentRole)) score += 20;
  if (state.standaloneOnly && product.standalone) score += 10;
  if (state.includeAccessories && (product.deploymentRole === "accessory" || product.deploymentRole === "companion")) score += 8;
  if (!state.includeAccessories && (product.deploymentRole === "accessory" || product.deploymentRole === "companion")) score -= 18;
  if (state.excludeEolSoon && product.lifecycle.excludeFromNewRecommendations) score -= 100;

  if (state.dependencySkus.length > 0) {
    const dependencyHaystack = [
      ...product.dependencies.required,
      ...product.dependencies.recommended,
      ...product.dependencies.compatibleHosts,
      product.sku,
    ].map(normalizeSku);

    const matched = state.dependencySkus.some((sku) => dependencyHaystack.includes(normalizeSku(sku)));
    if (matched) score += 34;
  }

  if (state.application.trim() && containsText(`${product.summary} ${product.tags.join(" ")}`, state.application)) score += 16;
  if (state.roomType.trim() && containsText(`${product.summary} ${product.tags.join(" ")}`, state.roomType)) score += 12;
  if (state.budgetBand.trim() && containsText(`${product.summary} ${product.tags.join(" ")}`, state.budgetBand)) score += 8;

  const qHas = (token: string) => containsToken(q, token);

  if (qHas("uc") || qHas("teams") || qHas("conference") || qHas("byom")) {
    if (product.families.includes("Unified Communication")) score += 18;
  }
  if (qHas("wireless") || qHas("dg2") || qHas("casting")) {
    if (product.families.includes("Wireless Presentation") || product.roles.includes("wireless-casting-host")) score += 18;
  }
  if (qHas("video wall") || qHas("mosaic")) {
    if (product.families.includes("Video Walls")) score += 20;
  }
  if (qHas("matrix") || qHas("hyb")) {
    if (product.families.includes("Matrix Switching")) score += 18;
  }
  if (qHas("multiview")) {
    if (product.families.includes("Multiview")) score += 18;
  }
  if (qHas("dante")) {
    if (product.technologies.includes("dante")) score += 18;
  }

  return score;
}

export function filterCatalogProducts(products: CatalogProduct[], state: CatalogFilterState): CatalogProduct[] {
  const key = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const exactSku = state.search.trim() && products.some((product) => key(product.sku) === key(state.search));
  const ranked = products
    .filter((product) => !exactSku || key(product.sku) === key(state.search))
    .filter((product) => passesStructuredFilters(product, state))
    .map((product) => ({
      product,
      strict: strictMatch(product, state),
      score: scoreProduct(product, state),
    }))
    .sort((left, right) => right.score - left.score || left.product.sku.localeCompare(right.product.sku));

  if (state.matchMode === "filter") {
    return ranked.filter((entry) => entry.strict).map((entry) => entry.product);
  }

  // Selected facets and accessory visibility must never count as a text match.
  const textState = { ...createDefaultCatalogFilterState(), search: state.search,
    application: state.application, roomType: state.roomType, budgetBand: state.budgetBand,
    excludeEolSoon: false };
  return ranked.filter((entry) => entry.strict || scoreProduct(entry.product, textState) > 0)
    .map((entry) => entry.product);
}

export function getCatalogBadges(product: CatalogProduct): string[] {
  const badges = new Set<string>();

  if (product.standalone) badges.add("Standalone");
  if (product.deploymentRole === "system-core") badges.add("Hybrid core");
  if (product.deploymentRole === "companion") badges.add("Requires host");
  if (product.roles.includes("wireless-casting-host")) badges.add("Wireless host");
  if (product.roles.includes("wireless-casting-dongle")) badges.add("Wireless dongle");
  if (product.roles.includes("uc-endpoint")) badges.add("UC endpoint");
  if (product.roles.includes("video-wall-processor")) badges.add("Video wall");
  if (product.roles.includes("multiview-processor")) badges.add("Multiview");
  if (product.technologies.includes("dual-display")) badges.add("Dual display");
  if (product.technologies.includes("dante")) badges.add("Dante");
  if (product.technologies.includes("networkhd")) badges.add("NetworkHD");
  if (product.lifecycle.excludeFromNewRecommendations) badges.add("Legacy / suppress");
  if (product.dependencies.recommended.some((sku) => normalizeSku(sku).includes("DG2"))) badges.add("DG2 ready");

  return [...badges].slice(0, 6);
}

export function getCatalogMatchReasons(product: CatalogProduct, state: CatalogFilterState): string[] {
  const reasons: string[] = [];

  if (state.families.length > 0) {
    const matched = product.families.filter((family) => state.families.includes(family));
    if (matched.length > 0) reasons.push(`Family: ${matched.join(", ")}`);
  }

  if (state.roles.length > 0) {
    const matched = product.roles.filter((role) => state.roles.includes(role));
    if (matched.length > 0) reasons.push(`Role: ${matched.join(", ")}`);
  }

  if (state.technologies.length > 0) {
    const matched = product.technologies.filter((technology) => state.technologies.includes(technology));
    if (matched.length > 0) reasons.push(`Technology: ${matched.join(", ")}`);
  }

  if (state.dependencySkus.length > 0) {
    const dependencyHaystack = [
      ...product.dependencies.required,
      ...product.dependencies.recommended,
      ...product.dependencies.compatibleHosts,
      product.sku,
    ].map(normalizeSku);
    const matched = state.dependencySkus.filter((sku) => dependencyHaystack.includes(normalizeSku(sku)));
    if (matched.length > 0) reasons.push(`Dependency match: ${matched.join(", ")}`);
  }

  if (state.application.trim() && containsText(`${product.summary} ${product.tags.join(" ")}`, state.application)) {
    reasons.push(`Application cue: ${state.application}`);
  }

  if (state.roomType.trim() && containsText(`${product.summary} ${product.tags.join(" ")}`, state.roomType)) {
    reasons.push(`Room cue: ${state.roomType}`);
  }

  if (!reasons.length) {
    reasons.push(`${product.family} • ${product.series}`);
    reasons.push(product.roles.join(" • "));
  }

  return reasons.slice(0, 3);
}
