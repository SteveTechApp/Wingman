import { recommendSkusForFamilies, type SolutionRecommendationTier } from "@/catalog/serviceRecommendations";
import { buildDesignBundle } from "@/features/systemDesign/cableScheduleEngine";
import { summariseDesignBundle, writeDesignBundle } from "@/features/systemDesign/designBundleStore";
import type {
  DesignBundle,
  DiscoverySeed,
  TemplateSeed,
  VideoWallSeed,
} from "@/features/systemDesign/designTypes";

export type RoomDesignerInput = {
  roomId?: string;
  projectName?: string;
  targetTier?: "Bronze" | "Silver" | "Gold";
  discovery?: DiscoverySeed | null;
  template?: TemplateSeed | null;
  videoWall?: VideoWallSeed | null;
};

export type RoomDesignerResponse = {
  ok: true;
  mode: "deterministic-fallback";
  service: "roomDesignerService";
  roomId?: string;
  recommendedFamilies: string[];
  suggestedSkus: string[];
  nextTool: string;
  summary: {
    templateSummary: string;
    videoWallSummary: string;
    cableSummary: string;
    diagramSummary: string;
    proposalSummary: string;
  };
  notes: string[];
  bundle: DesignBundle;
};

const FAMILY_ORDER = [
  "Apollo",
  "HDBaseT",
  "AVoIP",
  "Matrix",
  "USB Extension",
  "Video Wall",
] as const;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueOrdered(values: string[]): string[] {
  return Array.from(new Set(values.filter((item) => item.trim().length > 0)));
}

function normalizeDiscovery(value: DiscoverySeed | null | undefined): DiscoverySeed {
  if (!value) return {};
  return {
    ...value,
    customer: normalizeText(value.customer),
    site: normalizeText(value.site),
    roomName: normalizeText(value.roomName),
    applicationType: normalizeText(value.applicationType),
    roomLengthM: normalizeText(value.roomLengthM),
    roomWidthM: normalizeText(value.roomWidthM),
    roomHeightM: normalizeText(value.roomHeightM),
    displayLocation: normalizeText(value.displayLocation),
    sourceLocation: normalizeText(value.sourceLocation),
    rackLocation: normalizeText(value.rackLocation),
    sourceToRackDistanceM: normalizeText(value.sourceToRackDistanceM),
    rackToDisplayDistanceM: normalizeText(value.rackToDisplayDistanceM),
    cableDistanceM: normalizeText(value.cableDistanceM),
    transportDistanceBand: normalizeText(value.transportDistanceBand),
    transportCableType: normalizeText(value.transportCableType),
    displayCount: normalizeText(value.displayCount),
    sourceCount: normalizeText(value.sourceCount),
    sourceTypes: normalizeText(value.sourceTypes),
    sourcePlacement: normalizeText(value.sourcePlacement),
    sourceConnectionPath: normalizeText(value.sourceConnectionPath),
    sourceConnectionType: normalizeText(value.sourceConnectionType),
    signalFormats: normalizeText(value.signalFormats),
    signalHdr: normalizeText(value.signalHdr),
    sourceCableType: normalizeText(value.sourceCableType),
    displayConnectionPath: normalizeText(value.displayConnectionPath),
    displayConnectionType: normalizeText(value.displayConnectionType),
    displayCableType: normalizeText(value.displayCableType),
    networkEnvironment: normalizeText(value.networkEnvironment),
    usbNeeds: normalizeText(value.usbNeeds),
    usbStandards: normalizeText(value.usbStandards),
    audioNeeds: normalizeText(value.audioNeeds),
    controlNeeds: normalizeText(value.controlNeeds),
    notes: normalizeText(value.notes),
    recommendedFamilies: Array.isArray(value.recommendedFamilies)
      ? value.recommendedFamilies.map((item) => normalizeText(item)).filter(Boolean)
      : [],
  };
}

function buildFallbackBundle(
  discovery: DiscoverySeed,
  template: TemplateSeed | null | undefined,
  videoWall: VideoWallSeed | null | undefined,
): DesignBundle {
  return {
    discovery,
    template: template ?? null,
    videoWall: videoWall ?? null,
    devices: [],
    cables: [],
    nodes: [],
    edges: [],
    assumptions: ["Fallback bundle generated with minimal defaults."],
  };
}

function inferFamilies(
  discovery: DiscoverySeed,
  template: TemplateSeed | null | undefined,
  videoWall: VideoWallSeed | null | undefined,
  bundle: DesignBundle,
): string[] {
  const families: string[] = [];

  if (Array.isArray(discovery.recommendedFamilies)) {
    families.push(...discovery.recommendedFamilies.map((item) => normalizeText(item)).filter(Boolean));
  }

  if (template?.defaultFamilies) {
    families.push(...template.defaultFamilies.map((item) => normalizeText(item)).filter(Boolean));
  }

  for (const device of bundle.devices) {
    const family = normalizeText(device.family);
    if (!family) continue;
    families.push(...family.split("/").map((part) => normalizeText(part)).filter(Boolean));
  }

  const app = normalizeText(discovery.applicationType).toLowerCase();
  const usb = normalizeText(discovery.usbNeeds).toLowerCase();
  const control = normalizeText(discovery.controlNeeds).toLowerCase();

  if (usb.includes("usb") || usb.includes("camera") || usb.includes("byod")) {
    families.push("Apollo", "USB Extension");
  }

  const hasVideoWallSeed = Boolean(
    videoWall && (
      videoWall.displayType === "LED" ||
      videoWall.rows * videoWall.columns > 1 ||
      (videoWall.outputRows ?? 1) * (videoWall.outputColumns ?? 1) > 1
    )
  );

  if (app.includes("video wall") || hasVideoWallSeed) {
    families.push("Video Wall");
  }

  if (control.includes("matrix") || control.includes("multi")) {
    families.push("Matrix");
  }

  if (!families.some((item) => item === "Apollo" || item === "HDBaseT" || item === "AVoIP")) {
    families.push("Apollo", "HDBaseT");
  }

  const unique = uniqueOrdered(families);
  return FAMILY_ORDER.filter((item) => unique.includes(item));
}

function pickTier(input: RoomDesignerInput): "Bronze" | "Silver" | "Gold" {
  if (input.targetTier === "Bronze" || input.targetTier === "Silver" || input.targetTier === "Gold") {
    return input.targetTier;
  }
  return "Silver";
}

function inferNextTool(families: string[]): string {
  if (families.includes("Video Wall")) return "/app/tools/video-wall";
  if (families.includes("Matrix") || families.includes("AVoIP")) return "/app/tools/proposal";
  if (families.includes("Apollo")) return "/app/tools/room-wizard";
  return "/app/tools/catalog";
}

function inferSkus(families: string[], tier: "Bronze" | "Silver" | "Gold"): string[] {
  return uniqueOrdered(
    recommendSkusForFamilies(families, tier as SolutionRecommendationTier, 8),
  ).slice(0, 8);
}

export async function designRoom(input: RoomDesignerInput): Promise<RoomDesignerResponse> {
  const discovery = normalizeDiscovery(input.discovery);
  const template = input.template ?? null;
  const videoWall = input.videoWall ?? null;

  let bundle: DesignBundle;
  try {
    bundle = buildDesignBundle(discovery, template, videoWall);
  } catch {
    bundle = buildFallbackBundle(discovery, template, videoWall);
  }

  writeDesignBundle(bundle);

  const families = inferFamilies(discovery, template, videoWall, bundle);
  const tier = pickTier(input);
  const suggestedSkus = inferSkus(families, tier);
  const nextTool = inferNextTool(families);
  const summary = summariseDesignBundle(bundle);

  const notes = [
    input.projectName ? `Design run for project: ${input.projectName}.` : "Design run completed.",
    input.roomId ? `Room scope: ${input.roomId}.` : "Room scope: active project.",
    `Tier profile used: ${tier}.`,
    `Generated ${bundle.devices.length} device item(s), ${bundle.cables.length} cable line(s), and ${bundle.edges.length} diagram link(s).`,
  ];

  return {
    ok: true,
    mode: "deterministic-fallback",
    service: "roomDesignerService",
    roomId: input.roomId,
    recommendedFamilies: families,
    suggestedSkus,
    nextTool,
    summary,
    notes,
    bundle,
  };
}
