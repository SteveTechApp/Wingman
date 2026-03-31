import type { TemplateSeed as WorkbenchTemplateSeed } from "@/app/schema/templateSeed";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  createProject,
  type DiscoveryProductFamily,
  type ProjectCatalogBomItem,
  type ProjectDiscovery,
  type ProjectTemplateContext,
  type ProjectTemplateTier,
  type StoredProject,
} from "@/features/projects/projectStore";
import { buildDesignBom, type DesignBomItem } from "@/features/systemDesign/designBom";
import type {
  DiscoverySeed,
  ProjectDevice,
  TemplateSeed as DesignTemplateSeed,
  VideoWallSeed,
} from "@/features/systemDesign/designTypes";
import { designRoom } from "@/services/roomDesignerService";

type TemplateRoom = WorkbenchTemplateSeed["roomType"] & {
  story?: string;
  designPurpose?: string;
};

type RichWorkbenchTemplateSeed = WorkbenchTemplateSeed & {
  roomType: TemplateRoom;
  solutionSummary?: string;
  customerScenario?: string;
  sourceOutput?: string;
  tierFit?: string;
  baseline?: string[];
  operationalPriorities?: string[];
  ioProfile?: {
    sources?: string;
    outputs?: string;
    operators?: string;
    sourceCount?: number;
    displayCount?: number;
  };
  starterDevices?: ProjectDevice[];
};

type ReadyMadeTemplateOverrides = {
  name?: string;
  customer?: string;
  site?: string;
  roomName?: string;
};

type TemplateDesignShape = {
  projectName: string;
  templateId?: string;
  market: string;
  roomId?: string;
  roomName: string;
  roomStory?: string;
  designPurpose?: string;
  solutionSummary?: string;
  includedSystems?: string[];
  uplift?: string[];
  assumptions?: string[];
  recommendedFamilies?: string[];
  recommendedTool?: string;
  tier: ProjectTemplateTier;
  starterDevices?: ProjectDevice[];
  sourceCount?: number;
  displayCount?: number;
};

const ALLOWED_FAMILIES: DiscoveryProductFamily[] = [
  "Apollo",
  "HDBaseT",
  "AVoIP",
  "Matrix",
  "USB Extension",
  "Video Wall",
];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => text(value)).filter(Boolean)));
}

function uniqueFamilies(values?: string[]): DiscoveryProductFamily[] {
  return unique(Array.isArray(values) ? values : []).filter((value): value is DiscoveryProductFamily =>
    ALLOWED_FAMILIES.includes(value as DiscoveryProductFamily),
  );
}

function hasAny(blob: string, checks: string[]): boolean {
  return checks.some((check) => blob.includes(check));
}

function roomBlob(shape: TemplateDesignShape): string {
  return [
    shape.market,
    shape.roomId,
    shape.roomName,
    shape.roomStory,
    shape.designPurpose,
    ...(shape.recommendedFamilies ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function normalizeTier(value: string | undefined): ProjectTemplateTier {
  const normalized = text(value).toLowerCase();
  if (normalized === "bronze") return "Bronze";
  if (normalized === "gold") return "Gold";
  return "Silver";
}

function defaultRecommendedTool(families: DiscoveryProductFamily[]): string {
  if (families.includes("Video Wall")) return WM_ROUTES.videowall;
  if (families.includes("AVoIP") || families.includes("Matrix")) return WM_ROUTES.proposals;
  if (families.includes("Apollo")) return WM_ROUTES.roomDesigner;
  return WM_ROUTES.catalogue;
}

function inferSourceCount(shape: TemplateDesignShape): number {
  const direct = Math.max(0, numberOrZero(shape.sourceCount));
  if (direct > 0) return direct;

  const blob = roomBlob(shape);
  let count = 2;

  if (hasAny(blob, ["window", "waiting", "reception", "signage", "cinema", "outdoor"])) {
    count = 1;
  } else if (hasAny(blob, ["huddle", "consultation", "lounge", "suite", "home office", "home-office"])) {
    count = 2;
  } else if (hasAny(blob, ["boardroom", "training", "classroom", "seminar", "retail", "showroom"])) {
    count = 3;
  } else if (hasAny(blob, ["lecture", "townhall", "operations", "mdt", "chamber", "hearing", "courtroom", "ballroom", "event", "experience", "eoc"])) {
    count = 4;
  }

  if (shape.tier === "Gold" && count < 4 && !hasAny(blob, ["window", "waiting", "reception", "signage"])) {
    count += 1;
  }

  return Math.max(1, Math.min(6, count));
}

function inferDisplayCount(shape: TemplateDesignShape): number {
  const direct = Math.max(0, numberOrZero(shape.displayCount));
  if (direct > 0) return direct;

  const blob = roomBlob(shape);
  let count = 1;

  if (hasAny(blob, ["video wall", "video-wall"])) {
    count = 4;
  } else if (hasAny(blob, ["sports bar", "sports-bar"])) {
    count = 6;
  } else if (hasAny(blob, ["multiroom", "eoc"])) {
    count = 4;
  } else if (hasAny(blob, ["boardroom", "training", "classroom", "lecture", "townhall", "operations", "mdt", "chamber", "hearing", "courtroom"])) {
    count = 2;
  } else if (hasAny(blob, ["showroom", "experience", "event", "ballroom"])) {
    count = 3;
  }

  if (shape.recommendedFamilies?.includes("Video Wall")) {
    count = Math.max(count, 4);
  }

  return Math.max(1, Math.min(8, count));
}

function inferDisplayLocation(blob: string, displayCount: number): string {
  if (hasAny(blob, ["outdoor"])) return "Outdoor wall / terrace";
  if (hasAny(blob, ["sports bar", "sports-bar", "multiroom", "event", "ballroom"])) return "Multiple walls or zones";
  if (hasAny(blob, ["video wall", "video-wall", "experience"])) return "Central canvas";
  if (displayCount > 1) return "Front wall";
  return "Front wall";
}

function inferSourceLocation(blob: string): string {
  if (hasAny(blob, ["classroom", "training", "lecture", "seminar"])) return "Lectern";
  if (hasAny(blob, ["window", "waiting", "reception", "signage", "showroom"])) return "Central rack";
  if (hasAny(blob, ["cinema", "lounge", "suite", "outdoor", "home office", "home-office"])) return "Local rack";
  return "Table";
}

function inferTransportDistance(blob: string): { band: string; longestRun: string } {
  if (hasAny(blob, ["townhall", "lecture", "ballroom", "event", "eoc", "sports bar", "sports-bar", "multiroom"])) {
    return { band: "Long", longestRun: "35" };
  }
  if (hasAny(blob, ["boardroom", "training", "classroom", "operations", "chamber", "hearing", "courtroom", "showroom"])) {
    return { band: "Medium", longestRun: "18" };
  }
  return { band: "Short", longestRun: "8" };
}

function inferUsbNeeds(blob: string, families: DiscoveryProductFamily[]): string {
  if (families.includes("Apollo") || families.includes("USB Extension")) {
    return "USB-C BYOD workflow with room peripherals";
  }
  if (hasAny(blob, ["consultation", "telemedicine", "meeting", "boardroom", "training", "classroom", "seminar", "home office", "home-office"])) {
    return "USB conferencing and wired guest connectivity";
  }
  return "";
}

function inferAudioNeeds(blob: string): string {
  if (hasAny(blob, ["boardroom", "training", "classroom", "lecture", "townhall", "operations", "mdt", "chamber", "hearing", "courtroom", "telemedicine"])) {
    return "Speech reinforcement, microphones, and DSP";
  }
  if (hasAny(blob, ["cinema", "suite", "lounge", "bar", "ballroom", "event", "studio", "gym", "outdoor"])) {
    return "Program audio and room loudspeaker coverage";
  }
  return "";
}

function inferControlNeeds(blob: string): string {
  if (hasAny(blob, ["window", "waiting", "reception", "signage"])) {
    return "Basic display power, input select, and scheduling control";
  }
  return "Touch control, display power, source select, and room presets";
}

function inferSourceTypes(blob: string, sourceCount: number): string {
  const options = hasAny(blob, ["window", "waiting", "reception", "signage", "sports bar", "sports-bar", "cinema"])
    ? ["Media player", "Local HDMI input", "Broadcast receiver", "Spare source"]
    : hasAny(blob, ["training", "classroom", "lecture", "seminar"])
      ? ["Lectern PC", "Presenter laptop", "Document camera", "Guest HDMI"]
      : hasAny(blob, ["operations", "mdt", "chamber", "hearing", "courtroom", "telemedicine"])
        ? ["Primary PC", "Guest laptop", "Codec feed", "Evidence / reference source"]
        : ["Table BYOD", "In-room PC", "Wireless guest bridge", "Spare HDMI source"];

  return options.slice(0, sourceCount).join(", ");
}

function inferSourceNames(blob: string, count: number): string[] {
  const base = hasAny(blob, ["window", "waiting", "reception", "signage"])
    ? ["Media Player", "Local HDMI Input", "Backup Player", "Spare Input"]
    : hasAny(blob, ["sports bar", "sports-bar", "suite", "lounge", "event", "ballroom", "cinema", "outdoor"])
      ? ["Media Player", "Set-Top Box", "Guest HDMI Source", "Spare Source"]
      : hasAny(blob, ["training", "classroom", "lecture", "seminar"])
        ? ["Lectern PC", "Presenter Laptop", "Document Camera", "Guest HDMI"]
        : hasAny(blob, ["operations", "mdt", "chamber", "hearing", "courtroom", "telemedicine"])
          ? ["Primary PC", "Guest Laptop", "Codec Feed", "Evidence Source"]
          : ["Table BYOD", "In-room PC", "Wireless Guest Bridge", "Spare Source"];

  return Array.from({ length: count }, (_, index) => base[index] ?? `Source ${index + 1}`);
}

function inferDisplayNames(blob: string, count: number): string[] {
  if (hasAny(blob, ["video wall", "video-wall"])) {
    return Array.from({ length: count }, (_, index) => `Video Wall Panel ${index + 1}`);
  }
  if (hasAny(blob, ["sports bar", "sports-bar"])) {
    return Array.from({ length: count }, (_, index) => `Bar Display ${index + 1}`);
  }
  if (hasAny(blob, ["multiroom"])) {
    return Array.from({ length: count }, (_, index) => `Zone Display ${index + 1}`);
  }
  if (count === 2 && hasAny(blob, ["boardroom", "operations", "mdt", "chamber", "hearing", "courtroom"])) {
    return ["Main Display Left", "Main Display Right"];
  }
  if (count === 2) {
    return ["Primary Display", "Secondary Display"];
  }
  if (count === 1) {
    return ["Primary Display"];
  }
  return Array.from({ length: count }, (_, index) => `Display ${index + 1}`);
}

function makePorts(role: ProjectDevice["role"], family?: string): ProjectDevice["ports"] {
  if (role === "source") {
    return [{ id: "hdmi-out", name: "HDMI Out", kind: "HDMI", direction: "out" }];
  }
  if (role === "display") {
    return [{ id: "video-in", name: "Video In", kind: "HDMI", direction: "in" }];
  }
  if (role === "network" || family === "AVoIP") {
    return [{ id: "lan", name: "LAN", kind: "LAN", direction: "bidirectional" }];
  }
  if (role === "control") {
    return [{ id: "control", name: "Control", kind: "RS-232", direction: "bidirectional" }];
  }
  if (role === "audio") {
    return [{ id: "audio", name: "Audio", kind: "Audio", direction: "bidirectional" }];
  }
  if (role === "usb") {
    return [{ id: "usb", name: "USB", kind: "USB 3.x", direction: "bidirectional" }];
  }
  return [
    { id: "hdmi-in", name: "HDMI In", kind: "HDMI", direction: "in" },
    { id: "video-out", name: "Video Out", kind: family === "HDBaseT" ? "HDBaseT" : "HDMI", direction: "out" },
  ];
}

function normalizeTemplateDevices(devices: ProjectDevice[] | undefined, shape: TemplateDesignShape): ProjectDevice[] {
  const sourceCount = inferSourceCount(shape);
  const displayCount = inferDisplayCount(shape);
  const blob = roomBlob(shape);
  const sourceNames = inferSourceNames(blob, sourceCount);
  const displayNames = inferDisplayNames(blob, displayCount);

  const sourceDevices = (devices ?? []).filter((device) => device.role === "source");
  const displayDevices = (devices ?? []).filter((device) => device.role === "display");
  const switcher = (devices ?? []).find((device) => device.role === "switcher");
  const network = (devices ?? []).find((device) => device.role === "network" || text(device.family).toLowerCase().includes("avoip"));
  const processor = (devices ?? []).find((device) => device.role === "processor");
  const usb = (devices ?? []).find((device) => device.role === "usb");
  const audio = (devices ?? []).find((device) => device.role === "audio");
  const control = (devices ?? []).find((device) => device.role === "control");

  const normalized: ProjectDevice[] = [];

  for (let index = 0; index < sourceCount; index += 1) {
    const existing = sourceDevices[index];
    normalized.push({
      id: `src-${index + 1}`,
      name: text(existing?.name) || sourceNames[index],
      role: "source",
      manufacturer: text(existing?.manufacturer) || undefined,
      family: text(existing?.family) || undefined,
      sku: text(existing?.sku) || undefined,
      location: text(existing?.location) || inferSourceLocation(blob),
      ports: existing?.ports?.length ? existing.ports : makePorts("source"),
    });
  }

  for (let index = 0; index < displayCount; index += 1) {
    const existing = displayDevices[index];
    normalized.push({
      id: `disp-${index + 1}`,
      name: text(existing?.name) || displayNames[index],
      role: "display",
      manufacturer: text(existing?.manufacturer) || undefined,
      family: text(existing?.family) || undefined,
      sku: text(existing?.sku) || undefined,
      location: text(existing?.location) || inferDisplayLocation(blob, displayCount),
      ports: existing?.ports?.length ? existing.ports : makePorts("display"),
    });
  }

  if (shape.recommendedFamilies?.includes("AVoIP")) {
    normalized.push({
      id: "net-1",
      name: text(network?.name) || "AV Network Switch",
      role: "network",
      manufacturer: text(network?.manufacturer) || "WyreStorm",
      family: text(network?.family) || "AVoIP",
      sku: text(network?.sku) || undefined,
      location: text(network?.location) || "Rack",
      ports: network?.ports?.length ? network.ports : makePorts("network", "AVoIP"),
    });
  } else {
    const primaryFamily = shape.recommendedFamilies?.find((family) => family !== "USB Extension" && family !== "Video Wall") || "Apollo";
    normalized.push({
      id: "core-1",
      name: text(switcher?.name) || (primaryFamily === "Matrix" ? "Matrix Core" : primaryFamily === "HDBaseT" ? "Presentation Core" : "Apollo Collaboration Core"),
      role: "switcher",
      manufacturer: text(switcher?.manufacturer) || "WyreStorm",
      family: text(switcher?.family) || primaryFamily,
      sku: text(switcher?.sku) || undefined,
      location: text(switcher?.location) || "Rack",
      ports: switcher?.ports?.length ? switcher.ports : makePorts("switcher", primaryFamily),
    });
  }

  if (shape.recommendedFamilies?.includes("Video Wall")) {
    normalized.push({
      id: "vw-1",
      name: text(processor?.name) || "Video Wall Processor",
      role: "processor",
      manufacturer: text(processor?.manufacturer) || "WyreStorm / Third-Party",
      family: text(processor?.family) || "Video Wall",
      sku: text(processor?.sku) || undefined,
      location: text(processor?.location) || "Rack",
      ports: processor?.ports?.length ? processor.ports : makePorts("processor"),
    });
  }

  if (inferUsbNeeds(blob, uniqueFamilies(shape.recommendedFamilies))) {
    normalized.push({
      id: "usb-1",
      name: text(usb?.name) || "USB Peripheral Group",
      role: "usb",
      manufacturer: text(usb?.manufacturer) || undefined,
      family: text(usb?.family) || "USB Extension",
      sku: text(usb?.sku) || undefined,
      location: text(usb?.location) || "Table / Display",
      ports: usb?.ports?.length ? usb.ports : makePorts("usb"),
    });
  }

  if (inferAudioNeeds(blob)) {
    normalized.push({
      id: "audio-1",
      name: text(audio?.name) || "Audio DSP Endpoint",
      role: "audio",
      manufacturer: text(audio?.manufacturer) || undefined,
      family: text(audio?.family) || undefined,
      sku: text(audio?.sku) || undefined,
      location: text(audio?.location) || "Rack / Room",
      ports: audio?.ports?.length ? audio.ports : makePorts("audio"),
    });
  }

  if (inferControlNeeds(blob)) {
    normalized.push({
      id: "ctrl-1",
      name: text(control?.name) || "Room Control Interface",
      role: "control",
      manufacturer: text(control?.manufacturer) || undefined,
      family: text(control?.family) || undefined,
      sku: text(control?.sku) || undefined,
      location: text(control?.location) || "Table / Wall",
      ports: control?.ports?.length ? control.ports : makePorts("control"),
    });
  }

  return normalized;
}

function buildSourceInputDetails(blob: string, sourceCount: number, families: DiscoveryProductFamily[]) {
  const names = inferSourceNames(blob, sourceCount);
  const connectionType = inferUsbNeeds(blob, families)
    ? "HDMI plus USB"
    : families.includes("AVoIP")
      ? "AVoIP or network encoder"
      : "HDMI";
  const cableType = families.includes("AVoIP") || families.includes("HDBaseT") ? "Cat6A" : inferUsbNeeds(blob, families) ? "USB-C" : "Passive HDMI";
  const route = hasAny(blob, ["table", "meeting", "boardroom", "huddle", "consultation"])
    ? "Via table box"
    : hasAny(blob, ["training", "classroom", "lecture", "seminar"])
      ? "Direct to central rack"
      : "Direct to local rack";
  const sourceLocation = inferSourceLocation(blob);

  return names.map((name) => ({
    sourceType: name,
    connectionType,
    cableType,
    route,
    sourceLocation,
  }));
}

function buildOutputDetails(blob: string, displayCount: number, families: DiscoveryProductFamily[]) {
  const outputType = families.includes("AVoIP")
    ? "AV over IP"
    : families.includes("HDBaseT")
      ? "HDBaseT"
      : "HDMI";
  const route = families.includes("AVoIP")
    ? "Via central rack"
    : families.includes("HDBaseT")
      ? "Via local receiver"
      : "Direct to display";
  const displayLocation = inferDisplayLocation(blob, displayCount);

  return Array.from({ length: displayCount }, () => ({
    outputType,
    route,
    displayLocation,
  }));
}

function buildSolutionSummary(shape: TemplateDesignShape): string {
  const families = uniqueFamilies(shape.recommendedFamilies);
  const sourceCount = inferSourceCount(shape);
  const displayCount = inferDisplayCount(shape);
  const includedSystems = unique(shape.includedSystems ?? []);
  const summaryParts = [
    `${shape.tier} room solution for ${shape.market} ${shape.roomName}`.trim(),
    `${sourceCount} source path${sourceCount === 1 ? "" : "s"}`,
    `${displayCount} display endpoint${displayCount === 1 ? "" : "s"}`,
    families.length ? `built around ${families.join(", ")}` : "",
    includedSystems.length ? `with ${includedSystems.slice(0, 3).join(", ").toLowerCase()}` : "",
  ].filter(Boolean);

  return `${summaryParts.join(", ")}. Ready to tweak without re-starting the design.`;
}

function toTemplateShape(seed: RichWorkbenchTemplateSeed): TemplateDesignShape {
  return {
    projectName: text(seed.projectName) || `${text(seed.verticalMarket?.name)} - ${text(seed.roomType?.name)}`,
    templateId: text(seed.roomType?.id),
    market: text(seed.verticalMarket?.name) || "General",
    roomId: text(seed.roomType?.id),
    roomName: text(seed.roomType?.name) || "Room",
    roomStory: text(seed.roomType?.story),
    designPurpose: text(seed.roomType?.designPurpose),
    solutionSummary: text(seed.solutionSummary),
    includedSystems: seed.includedSystems,
    uplift: seed.uplift,
    assumptions: seed.assumptions,
    recommendedFamilies: seed.recommendedFamilies,
    recommendedTool: seed.recommendedTool,
    tier: normalizeTier(seed.tier?.label || seed.tier?.id),
    starterDevices: Array.isArray(seed.starterDevices) ? seed.starterDevices : undefined,
    sourceCount: seed.ioProfile?.sourceCount,
    displayCount: seed.ioProfile?.displayCount,
  };
}

function buildDiscoveryFromTemplate(shape: TemplateDesignShape, overrides?: ReadyMadeTemplateOverrides): ProjectDiscovery {
  const blob = roomBlob(shape);
  const families = uniqueFamilies(shape.recommendedFamilies);
  const sourceCount = inferSourceCount(shape);
  const displayCount = inferDisplayCount(shape);
  const distance = inferTransportDistance(blob);
  const displayLocation = inferDisplayLocation(blob, displayCount);
  const sourceLocation = inferSourceLocation(blob);
  const rackLocation = hasAny(blob, ["outdoor", "home office", "home-office", "lounge", "suite"]) ? "Local rack" : "Central rack";
  const notes = [
    text(shape.solutionSummary) || buildSolutionSummary(shape),
    text(shape.roomStory),
    text(shape.designPurpose),
    Array.isArray(shape.assumptions) && shape.assumptions.length ? `Assumptions: ${shape.assumptions.join("; ")}` : "",
    Array.isArray(shape.includedSystems) && shape.includedSystems.length ? `Included systems: ${shape.includedSystems.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    customer: text(overrides?.customer),
    site: text(overrides?.site),
    roomName: text(overrides?.roomName) || shape.roomName,
    applicationType: shape.roomName,
    displayLocation,
    sourceLocation,
    rackLocation,
    cableDistanceM: distance.longestRun,
    sourceToRackDistanceM: distance.band === "Long" ? "12" : distance.band === "Medium" ? "8" : "4",
    rackToDisplayDistanceM: distance.longestRun,
    transportDistanceBand: distance.band,
    transportCableType: families.includes("AVoIP") || families.includes("HDBaseT") ? "Cat6A" : "HDMI / USB-C",
    displayCount: String(displayCount),
    sourceCount: String(sourceCount),
    sourceTypes: inferSourceTypes(blob, sourceCount),
    sourcePlacement: sourceLocation,
    sourceConnectionPath: families.includes("AVoIP") ? "Central rack" : sourceLocation,
    sourceConnectionType: inferUsbNeeds(blob, families) ? "HDMI plus USB" : "HDMI",
    signalFormats: displayCount > 1 ? "4K mixed source workflow" : "4K single-canvas workflow",
    signalHdr: hasAny(blob, ["showroom", "experience", "cinema", "premium"]) ? "HDR capable" : "Standard HDR support",
    sourceCableType: families.includes("AVoIP") || families.includes("HDBaseT") ? "Cat6A" : inferUsbNeeds(blob, families) ? "USB-C" : "Passive HDMI",
    displayConnectionPath: families.includes("AVoIP") || families.includes("HDBaseT") ? "Via central rack" : "Direct to display",
    displayConnectionType: families.includes("AVoIP") ? "AV over IP" : families.includes("HDBaseT") ? "HDBaseT" : "HDMI",
    displayCableType: families.includes("AVoIP") || families.includes("HDBaseT") ? "Cat6A" : "HDMI",
    networkEnvironment: families.includes("AVoIP") ? "Managed AV VLAN or dedicated switch path" : "Standard AV local network",
    usbNeeds: inferUsbNeeds(blob, families),
    audioNeeds: inferAudioNeeds(blob),
    controlNeeds: inferControlNeeds(blob),
    notes,
    recommendedFamilies: families,
    recommendedNextTool: text(shape.recommendedTool) || defaultRecommendedTool(families),
    inputDetails: buildSourceInputDetails(blob, sourceCount, families),
    outputDetails: buildOutputDetails(blob, displayCount, families),
    createdAt: new Date().toISOString(),
  };
}

function buildDesignTemplateSeed(shape: TemplateDesignShape): DesignTemplateSeed {
  return {
    id: text(shape.templateId) || text(shape.projectName).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: text(shape.projectName) || shape.roomName,
    vertical: shape.market,
    roomType: shape.roomName,
    defaultFamilies: uniqueFamilies(shape.recommendedFamilies),
    assumptions: unique(shape.assumptions ?? []),
    starterDevices: normalizeTemplateDevices(shape.starterDevices, shape),
  };
}

function buildVideoWallSeed(shape: TemplateDesignShape): VideoWallSeed | null {
  const families = uniqueFamilies(shape.recommendedFamilies);
  const blob = roomBlob(shape);
  if (!families.includes("Video Wall") && !hasAny(blob, ["video wall", "video-wall"])) {
    return null;
  }

  const displayCount = Math.max(4, inferDisplayCount(shape));
  const columns = displayCount >= 6 ? 3 : 2;
  const rows = Math.max(1, Math.ceil(displayCount / columns));

  return {
    displayType: "LCD",
    rows,
    columns,
    sourceCount: inferSourceCount(shape),
    processorPreference: "Balanced processor and canvas control",
    qualityProfile: shape.tier === "Gold" ? "premium" : shape.tier === "Bronze" ? "cost" : "balanced",
    outputRows: rows,
    outputColumns: columns,
    warnings: ["Template video wall layout should be validated against final panel size and canvas ratio."],
    assumptions: text(shape.solutionSummary) || buildSolutionSummary(shape),
  };
}

function buildCatalogNotes(families: DiscoveryProductFamily[], bomItems: ProjectCatalogBomItem[]): string {
  const thirdPartyCount = bomItems.filter((item) => item.sku.startsWith("3P-")).length;
  return [
    `Template families: ${families.join(", ") || "Apollo"}.`,
    `Saved ${bomItems.length} BOM line${bomItems.length === 1 ? "" : "s"} for this ready-made room solution.`,
    thirdPartyCount > 0
      ? `${thirdPartyCount} line${thirdPartyCount === 1 ? "" : "s"} are descriptive non-WyreStorm completion items that require project-specific confirmation.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function toCatalogBomItems(items: DesignBomItem[]): ProjectCatalogBomItem[] {
  return items.map((item) => ({
    sku: item.sku,
    quantity: item.quantity,
    role: item.role,
    description: item.description,
    notes: item.notes,
  }));
}

function buildTemplateContext(shape: TemplateDesignShape, designTemplate: DesignTemplateSeed, families: DiscoveryProductFamily[], nextTool: string): ProjectTemplateContext {
  return {
    market: shape.market,
    application: shape.roomName,
    tier: shape.tier,
    templateId: shape.templateId,
    summary: text(shape.solutionSummary) || buildSolutionSummary(shape),
    solutionSummary: text(shape.solutionSummary) || buildSolutionSummary(shape),
    recommendedFamilies: families,
    assumptions: unique(shape.assumptions ?? []),
    includedSystems: unique(shape.includedSystems ?? []),
    uplift: unique(shape.uplift ?? []),
    nextTool,
    starterDevices: designTemplate.starterDevices,
    createdAt: new Date().toISOString(),
  };
}

function buildReadyMadeNotes(
  shape: TemplateDesignShape,
  discovery: ProjectDiscovery,
  bomItems: ProjectCatalogBomItem[],
  designSummary?: string,
): string {
  const thirdPartyCount = bomItems.filter((item) => item.sku.startsWith("3P-")).length;
  return [
    text(shape.solutionSummary) || buildSolutionSummary(shape),
    text(shape.roomStory),
    text(shape.designPurpose),
    Array.isArray(shape.includedSystems) && shape.includedSystems.length
      ? `Included systems: ${shape.includedSystems.join("; ")}`
      : "",
    Array.isArray(shape.assumptions) && shape.assumptions.length
      ? `Assumptions: ${shape.assumptions.join("; ")}`
      : "",
    designSummary ? `Design summary: ${designSummary}` : "",
    `Starter BOM saved with ${bomItems.length} line${bomItems.length === 1 ? "" : "s"}${thirdPartyCount > 0 ? `, including ${thirdPartyCount} descriptive completion item${thirdPartyCount === 1 ? "" : "s"}` : ""}.`,
    discovery.recommendedNextTool ? `Recommended next tool: ${discovery.recommendedNextTool}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildBomFromShape(shape: TemplateDesignShape, discovery: ProjectDiscovery): ProjectCatalogBomItem[] {
  const families = uniqueFamilies(shape.recommendedFamilies);
  return toCatalogBomItems(
    buildDesignBom({
      families,
      tier: shape.tier,
      sourceCount: numberOrZero(discovery.sourceCount) || inferSourceCount(shape),
      displayCount: numberOrZero(discovery.displayCount) || inferDisplayCount(shape),
      applicationType: discovery.applicationType,
      roomTypeId: shape.roomId,
      usbNeeds: discovery.usbNeeds,
      audioNeeds: discovery.audioNeeds,
      controlNeeds: discovery.controlNeeds,
    }),
  );
}

export function buildDesignTemplateSeedFromProject(project: Pick<StoredProject, "name" | "roomName" | "createdAt" | "discovery" | "template">): DesignTemplateSeed | null {
  const template = project.template;
  const families = uniqueFamilies(template?.recommendedFamilies ?? project.discovery?.recommendedFamilies);

  if (!template && families.length === 0 && !(project.roomName || project.name)) {
    return null;
  }

  const shape: TemplateDesignShape = {
    projectName: text(project.name) || text(project.roomName) || "Room Solution",
    templateId: text(template?.templateId) || text(project.roomName).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    market: text(template?.market) || "General",
    roomId: text(template?.templateId),
    roomName: text(template?.application) || text(project.roomName) || text(project.name) || "Room",
    roomStory: "",
    designPurpose: text(template?.summary),
    solutionSummary: text(template?.solutionSummary),
    includedSystems: template?.includedSystems,
    uplift: template?.uplift,
    assumptions: template?.assumptions,
    recommendedFamilies: families,
    recommendedTool: text(template?.nextTool) || text(project.discovery?.recommendedNextTool),
    tier: template?.tier ?? "Silver",
    starterDevices: template?.starterDevices,
    sourceCount: numberOrZero(project.discovery?.sourceCount),
    displayCount: numberOrZero(project.discovery?.displayCount),
  };

  return buildDesignTemplateSeed(shape);
}

export async function createReadyMadeProjectFromWorkbenchTemplate(
  seed: WorkbenchTemplateSeed,
  overrides?: ReadyMadeTemplateOverrides,
): Promise<StoredProject> {
  const richSeed = seed as RichWorkbenchTemplateSeed;
  const shape = toTemplateShape(richSeed);
  const discovery = buildDiscoveryFromTemplate(shape, overrides);
  const designTemplate = buildDesignTemplateSeed(shape);
  const videoWall = buildVideoWallSeed(shape);

  let designSummary = "";
  let suggestedSkus: string[] = [];
  let bomItems = buildBomFromShape(shape, discovery);
  let families = uniqueFamilies(shape.recommendedFamilies);
  let nextTool = text(shape.recommendedTool) || defaultRecommendedTool(families);

  try {
    const result = await designRoom({
      projectName: text(overrides?.name) || shape.projectName,
      targetTier: shape.tier,
      discovery: discovery as DiscoverySeed,
      template: designTemplate,
      videoWall,
    });
    designSummary = result.summary.proposalSummary;
    suggestedSkus = result.suggestedSkus;
    bomItems = toCatalogBomItems(result.suggestedBom);
    families = uniqueFamilies(result.recommendedFamilies);
    nextTool = text(result.nextTool) || nextTool;
  } catch {
    suggestedSkus = bomItems
      .filter((item) => !item.sku.startsWith("3P-"))
      .map((item) => item.sku);
  }

  const nextDiscovery: ProjectDiscovery = {
    ...discovery,
    recommendedFamilies: families,
    recommendedNextTool: nextTool,
  };

  const notes = buildReadyMadeNotes(shape, nextDiscovery, bomItems, designSummary);
  const templateContext = buildTemplateContext(shape, designTemplate, families, nextTool);

  return createProject({
    name: text(overrides?.name) || shape.projectName,
    customer: text(overrides?.customer),
    site: text(overrides?.site),
    roomName: text(overrides?.roomName) || shape.roomName,
    stage: "Specify",
    status: "Draft",
    notes,
    discovery: {
      ...nextDiscovery,
      notes,
    },
    template: templateContext,
    catalog: {
      selectedBrand: "WyreStorm + described third-party equipment",
      skus: unique(suggestedSkus),
      bomItems,
      notes: buildCatalogNotes(families, bomItems),
    },
    proposal: {
      selectedTier: shape.tier,
      notes: designSummary || notes,
    },
  });
}
