export type CatalogFamily =
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
  | "camera"
  | "audio-endpoint"
  | "extender";

export type CatalogTechnology =
  | "camera"
  | "speaker"
  | "microphone"
  | "hdmi"
  | "usb-c"
  | "usb"
  | "wireless-casting"
  | "hdbaset"
  | "networkhd"
  | "dante"
  | "multiview"
  | "video-wall-processing"
  | "dual-display"
  | "ndi"
  | "led-processing"
  | "10gb";

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
  matchMode: "find",
  includeAccessories: false,
  standaloneOnly: false,
  excludeEolSoon: true,
  dependencySkus: [],
};

const MANUAL_OVERRIDES: Record<string, ProductOverride> = {
  "APO-VX20-UC V2": {
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
    technologies: ["speaker", "microphone", "hdmi", "hdbaset", "wireless-casting", "multiview", "usb-c"],
    deploymentRole: "standalone-core",
    standalone: true,
    dependencies: { required: [], recommended: ["APO-DG2"], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "eol-soon", excludeFromNewRecommendations: true },
    summary:
      "Conference speakerphone and presentation switcher crossover product retained for reference but suppressed from new recommendations.",
    tags: ["UC", "Wireless presentation", "Speakerphone", "Legacy planning"],
  },
  "APO-UC210": {
    family: "Apollo",
    series: "Apollo",
    category: "UC Switcher",
    families: ["Unified Communication", "Presentation Switching", "Synergy"],
    roles: ["presentation-switcher", "uc-endpoint", "usb-peripheral-host", "audio-endpoint"],
    technologies: ["speaker", "microphone", "hdmi", "hdbaset", "wireless-casting", "multiview", "usb-c"],
    deploymentRole: "standalone-core",
    standalone: true,
    dependencies: { required: [], recommended: ["APO-DG2"], compatibleHosts: [] },
    lifecycle: { publicStatus: "active", internalStatus: "eol-soon", excludeFromNewRecommendations: true },
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
      compatibleHosts: ["SW-620-TX-W", "SW-640L-TX-W", "APO-VX20-UC V2", "APO-VX20-UC", "APO-210-UC"],
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
      compatibleHosts: ["SW-620-TX-W", "SW-640L-TX-W", "APO-VX20-UC V2", "APO-VX20-UC"],
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
    technologies: ["hdmi", "usb", "dante", "multiview", "10gb"],
    deploymentRole: "system-core",
    standalone: true,
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

export function parseDependencySkuText(value: string): string[] {
  return uniqueStrings(
    value
      .split(",")
      .map((item) => normalizeSku(item))
      .filter(Boolean),
  );
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function containsText(text: string, query: string): boolean {
  return normalizeText(text).includes(normalizeText(query));
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
    ...product.dependencies.required,
    ...product.dependencies.recommended,
    ...product.dependencies.compatibleHosts,
  ]
    .join(" ")
    .toLowerCase();
}

function inferFamilies(input: {
  sku: string;
  name: string;
  family: string;
  series: string;
  category: string;
  summary: string;
  tags: string[];
}): CatalogFamily[] {
  const text = [
    input.sku,
    input.name,
    input.family,
    input.series,
    input.category,
    input.summary,
    ...input.tags,
  ]
    .join(" ")
    .toLowerCase();

  const families: CatalogFamily[] = [];

  if (text.includes("apollo") || text.includes("conference") || text.includes("teams") || text.includes("uc")) {
    families.push("Unified Communication");
  }
  if (text.includes("presentation") || text.includes("byod") || text.includes("byom") || text.includes("switcher")) {
    families.push("Presentation Switching");
  }
  if (text.includes("synergy") || text.includes("wireless host") || text.includes("wireless casting")) {
    families.push("Synergy");
  }
  if (text.includes("matrix") || text.includes("hyb")) {
    families.push("Matrix Switching");
  }
  if (text.includes("nhd") || text.includes("avoip") || text.includes("av over ip")) {
    families.push("AV over IP");
  }
  if (text.includes("video wall") || text.includes("vw") || text.includes("mosaic")) {
    families.push("Video Walls");
  }
  if (text.includes("multiview")) {
    families.push("Multiview");
  }
  if (text.includes("wireless")) {
    families.push("Wireless Presentation");
  }
  if (text.includes("usb")) {
    families.push("USB Extension");
  }
  if (text.includes("dante") || text.includes("speaker") || text.includes("microphone") || text.includes("audio")) {
    families.push("Audio");
  }
  if (text.includes("control") || text.includes("ndi")) {
    families.push("Control");
  }
  if (text.includes("led")) {
    families.push("LED");
  }
  if (text.includes("dongle") || text.includes("accessory")) {
    families.push("Accessories");
  }

  return uniqueStrings(families);
}

function inferRoles(input: {
  sku: string;
  name: string;
  category: string;
  summary: string;
  tags: string[];
}): CatalogRole[] {
  const text = [input.sku, input.name, input.category, input.summary, ...input.tags].join(" ").toLowerCase();
  const roles: CatalogRole[] = [];

  if (text.includes("video bar")) roles.push("video-bar");
  if (text.includes("presentation") || text.includes("switcher")) roles.push("presentation-switcher");
  if (text.includes("matrix")) roles.push("matrix-switcher");
  if (text.includes("wireless host")) roles.push("wireless-casting-host");
  if (text.includes("dongle")) roles.push("wireless-casting-dongle");
  if (text.includes("encoder")) roles.push("av-over-ip-encoder");
  if (text.includes("decoder")) roles.push("av-over-ip-decoder");
  if (text.includes("transceiver") || text.includes("trx")) roles.push("av-over-ip-transceiver");
  if (text.includes("video wall")) roles.push("video-wall-processor");
  if (text.includes("multiview")) roles.push("multiview-processor");
  if (text.includes("usb")) roles.push("usb-peripheral-host");
  if (text.includes("uc") || text.includes("conference")) roles.push("uc-endpoint");
  if (text.includes("accessory") || text.includes("dongle")) roles.push("accessory");
  if (text.includes("camera") || text.includes("ptz")) roles.push("camera");
  if (text.includes("speaker") || text.includes("microphone")) roles.push("audio-endpoint");
  if (text.includes("extender")) roles.push("extender");
  if (roles.includes("presentation-switcher") || roles.includes("matrix-switcher")) roles.push("room-core");

  return uniqueStrings(roles);
}

function inferTechnologies(input: {
  sku: string;
  name: string;
  summary: string;
  tags: string[];
}): CatalogTechnology[] {
  const text = [input.sku, input.name, input.summary, ...input.tags].join(" ").toLowerCase();
  const technologies: CatalogTechnology[] = [];

  if (text.includes("camera") || text.includes("ptz")) technologies.push("camera");
  if (text.includes("speaker")) technologies.push("speaker");
  if (text.includes("microphone") || text.includes("mic")) technologies.push("microphone");
  if (text.includes("hdmi")) technologies.push("hdmi");
  if (text.includes("usb-c")) technologies.push("usb-c");
  if (text.includes("usb")) technologies.push("usb");
  if (text.includes("wireless")) technologies.push("wireless-casting");
  if (text.includes("hdbaset")) technologies.push("hdbaset");
  if (text.includes("networkhd")) technologies.push("networkhd");
  if (text.includes("dante")) technologies.push("dante");
  if (text.includes("multiview")) technologies.push("multiview");
  if (text.includes("video wall") || text.includes("mosaic")) technologies.push("video-wall-processing");
  if (text.includes("dual display") || text.includes("dual output")) technologies.push("dual-display");
  if (text.includes("ndi")) technologies.push("ndi");
  if (text.includes("led")) technologies.push("led-processing");
  if (text.includes("10gb")) technologies.push("10gb");

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

  if (text.includes("eol") || text.includes("do not recommend")) {
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
      compatibleHosts: ["SW-620-TX-W", "SW-640L-TX-W", "APO-VX20-UC V2", "APO-VX20-UC", "APO-210-UC"],
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
      };

      const override = mergedOverrides[normalizedSku];
      const families = override?.families ?? inferFamilies(seed);
      const roles = override?.roles ?? inferRoles(seed);
      const technologies = override?.technologies ?? inferTechnologies(seed);
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
    technologies: uniqueStrings(products.flatMap((product) => product.technologies)).sort(),
    deploymentRoles: uniqueStrings(products.map((product) => product.deploymentRole)).sort(),
  };
}

function strictMatch(product: CatalogProduct, state: CatalogFilterState): boolean {
  if (state.families.length > 0 && !intersects(product.families, state.families)) return false;
  if (state.series.length > 0 && !state.series.includes(product.series)) return false;
  if (state.categories.length > 0 && !state.categories.includes(product.category)) return false;
  if (state.roles.length > 0 && !intersects(product.roles, state.roles)) return false;
  if (state.technologies.length > 0 && !intersects(product.technologies, state.technologies)) return false;
  if (state.deploymentRoles.length > 0 && !state.deploymentRoles.includes(product.deploymentRole)) return false;
  if (state.standaloneOnly && !product.standalone) return false;
  if (!state.includeAccessories && (product.deploymentRole === "accessory" || product.deploymentRole === "companion")) return false;
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
    if (!tokens.every((token) => haystack.includes(token))) return false;
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

  if (q.includes("uc") || q.includes("teams") || q.includes("conference") || q.includes("byom")) {
    if (product.families.includes("Unified Communication")) score += 18;
  }
  if (q.includes("wireless") || q.includes("dg2") || q.includes("casting")) {
    if (product.families.includes("Wireless Presentation") || product.roles.includes("wireless-casting-host")) score += 18;
  }
  if (q.includes("video wall") || q.includes("mosaic")) {
    if (product.families.includes("Video Walls")) score += 20;
  }
  if (q.includes("matrix") || q.includes("hyb")) {
    if (product.families.includes("Matrix Switching")) score += 18;
  }
  if (q.includes("multiview")) {
    if (product.families.includes("Multiview")) score += 18;
  }
  if (q.includes("dante")) {
    if (product.technologies.includes("dante")) score += 18;
  }

  return score;
}

export function filterCatalogProducts(products: CatalogProduct[], state: CatalogFilterState): CatalogProduct[] {
  const ranked = products
    .map((product) => ({
      product,
      strict: strictMatch(product, state),
      score: scoreProduct(product, state),
    }))
    .sort((left, right) => right.score - left.score || left.product.sku.localeCompare(right.product.sku));

  if (state.matchMode === "filter") {
    return ranked.filter((entry) => entry.strict).map((entry) => entry.product);
  }

  return ranked.filter((entry) => entry.score > 0 || entry.strict).map((entry) => entry.product);
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
