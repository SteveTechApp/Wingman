import { routeCatalogByKey } from "../app/routeCatalog";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  type StoredQuoteSafetyStatus,
  type StoredDiscoveryBrief,
} from "./projectStore";
import { buildDiscoveryRecommendationEvidence } from "../lib/recommendationEvidence";

export const DISCOVERY_BRIEF_KEY = "wingman-discovery-brief";
export const DISCOVERY_SNAPSHOT_KEY = "wingman-discovery-snapshot-v3";

export type DiscoverySnapshot = {
  activeStepIndex: number;
  state: Record<string, unknown>;
  brief: StoredDiscoveryBrief;
  savedAt: string;
};

export type FinderNeedDraft = {
  query: string;
  technicalRequirement: string;
  productPath: string;
  technologyType: string;
  signalType: string;
  sourceConnector: string;
  displayConnector: string;
  inputs: string;
  outputs: string;
  distance: string;
  resolution: string;
  usb: string;
  audio: string;
  network: string;
  processing: string;
  control: string;
};

function nowIso() {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, fallback = "") {
  const valueText = String(value ?? "").trim();
  return valueText || fallback;
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function countBand(count: number) {
  if (!Number.isFinite(count) || count <= 0) return "Unknown";
  if (count === 1) return "1";
  if (count === 2) return "2";
  if (count <= 4) return "3-4";
  if (count <= 8) return "5-8";
  return "9+";
}

function includesAny(value: string, terms: string[]) {
  const haystack = value.toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function mapDistance(value: unknown) {
  const run = lower(value);
  if (includesAny(run, ["under 5m"])) return "Local <5m";
  if (includesAny(run, ["5-10m"])) return "Short 5-10m";
  if (includesAny(run, ["10-35m"])) return "Medium 10-35m";
  if (includesAny(run, ["35-70m"])) return "Long 35-70m";
  if (includesAny(run, ["70-100m", "100m+"])) return "Very long 70-100m";
  return "Unknown";
}

function technicalRequirementFromBrief(roomModel: Record<string, unknown>) {
  const outcome = lower(roomModel.outcome);
  const devices = list(roomModel.devices).join(" ").toLowerCase();
  const displays = lower(roomModel.displayBehaviour);
  const roomType = lower(roomModel.roomType);

  if (includesAny(outcome + displays, ["video wall", "signage", "large format", "wall"])) return "Build video wall or signage display";
  if (includesAny(outcome + devices, ["capture", "stream", "record", "ndi camera"])) return "Capture, stream or route camera/video sources";
  if (includesAny(outcome + roomType, ["route", "several displays", "multi-zone", "sports bar", "hospitality"])) return "Route sources to multiple displays";
  if (includesAny(outcome + devices, ["meeting", "teams", "zoom", "uc", "mtr", "camera", "microphone"])) return "Create meeting / UC room";
  return "Present device to display";
}

function productPathFromRequirement(requirement: string, roomModel: Record<string, unknown>) {
  const blob = [
    requirement,
    roomModel.recommendedProductPath,
    roomModel.displayBehaviour,
    roomModel.usbOwnership,
    roomModel.audioPath,
    list(roomModel.devices).join(" "),
  ].join(" ").toLowerCase();

  if (includesAny(blob, ["video wall", "signage", "wall"])) return "Video wall / signage";
  if (includesAny(blob, ["ndi", "camera", "capture", "stream"])) return "Camera / capture";
  if (includesAny(blob, ["multi-zone", "several displays", "route", "distributed", "av over ip", "avoip"])) return "AVoIP / matrix routing";
  if (includesAny(blob, ["uc", "meeting", "teams", "zoom", "mtr", "usb"])) return "Presentation / UC switcher";
  if (includesAny(blob, ["long", "hdbaset", "extension"])) return "Extender / HDBaseT";
  return "Presentation switcher";
}

function technologyTypeFromPath(path: string) {
  if (path.includes("AVoIP")) return "AVoIP";
  if (path.includes("matrix")) return "Matrix";
  if (path.includes("UC")) return "Presentation / Room Core";
  if (path.includes("Extender")) return "Extender / HDBaseT";
  if (path.includes("Camera")) return "Camera / Capture";
  if (path.includes("Video wall")) return "Video Wall / Multiview";
  return "Core hardware first";
}


function resolutionFromBrief(roomModel: Record<string, unknown>) {
  const signal = lower(roomModel.signalStandard ?? roomModel.signalStandardSummary);
  const tags = list(roomModel.downstreamQualityTags).join(" ").toLowerCase();

  if (signal.includes("hdr10") || tags.includes("hdr10")) return "4K60 HDR";
  if (signal.includes("4k60")) return "4K60";
  if (signal.includes("1080p")) return "1080p";
  return "Unknown";
}

function signalStandardAssumptions(roomModel: Record<string, unknown>) {
  const signal = lower(roomModel.signalStandard ?? roomModel.signalStandardSummary);
  const tags = list(roomModel.downstreamQualityTags);

  if (signal.includes("hdr10")) {
    return [
      ...tags,
      "Validate HDMI bandwidth / 18Gbps-class or better",
      "Validate HDCP 2.2/2.3",
      "Validate EDID management",
      "Validate display HDR capability",
    ];
  }

  return tags;
}

function quoteSafetyStatus(missingItems: string[]): StoredQuoteSafetyStatus {
  if (missingItems.length >= 3) return "do-not-quote-yet";
  if (missingItems.length > 0) return "validate-before-quote";
  return "quote-ready";
}

function nextQuestionFromMissingItems(missingItems: string[]) {
  const firstMissing = missingItems[0];
  if (!firstMissing) return "Can we confirm final product quantities, accessories and install constraints before quote?";
  return `Can we confirm ${firstMissing.toLowerCase()}?`;
}

function sourceConnectorFromDevices(devices: string[]) {
  const blob = devices.join(" ").toLowerCase();
  const connectors: string[] = [];
  if (blob.includes("hdmi")) connectors.push("HDMI");
  if (blob.includes("usb-c")) connectors.push("USB-C");
  if (blob.includes("wireless")) connectors.push("Wireless");
  if (blob.includes("ndi") || blob.includes("network")) connectors.push("RJ45 / network");
  return connectors.length ? connectors.join(" + ") : "Unknown";
}

function usbFromBrief(roomModel: Record<string, unknown>) {
  const blob = [
    roomModel.usbOwnership,
    roomModel.usbTopologyRisk,
    list(roomModel.devices).join(" "),
  ].join(" ").toLowerCase();

  if (includesAny(blob, ["usb 3", "high bandwidth"])) return "USB 3.x required";
  if (includesAny(blob, ["conflict", "multiple", "switchable"])) return "USB host switching required";
  if (includesAny(blob, ["mtr", "room pc", "camera", "microphone", "uc", "teams", "zoom"])) return "USB / UC path required";
  return "No USB";
}

function audioFromBrief(roomModel: Record<string, unknown>) {
  const blob = [roomModel.audioPath, list(roomModel.devices).join(" ")].join(" ").toLowerCase();
  if (includesAny(blob, ["dante", "aes67"])) return "Dante / AES67";
  if (includesAny(blob, ["amp-2210", "100v", "speaker"])) return "Amplifier / speakers";
  if (includesAny(blob, ["soundbar", "apo-vx20", "apo-210"])) return "UC soundbar";
  if (includesAny(blob, ["dsp", "microphone"])) return "DSP / microphone";
  return "Not confirmed";
}

function processingFromBrief(roomModel: Record<string, unknown>) {
  const blob = [roomModel.outcome, roomModel.displayBehaviour, roomModel.recommendedProductPath].join(" ").toLowerCase();
  if (includesAny(blob, ["video wall", "wall"])) return "Video wall processing";
  if (includesAny(blob, ["multiview"])) return "Multiview";
  if (includesAny(blob, ["same content"])) return "Distribution / mirrored output";
  if (includesAny(blob, ["different content", "source per display"])) return "Matrix / routing";
  return "Presentation switching";
}

export function buildDiscoveryBriefFromState(
  state: Record<string, unknown>,
  meta: {
    designDirection: string;
    confidence: string;
    missingItems: string[];
    capturedPercent: number;
    returnRoute?: string;
  },
): StoredDiscoveryBrief {
  const devices = list(state.devices);
  const technicalTags = list(state.technicalTags);
  const timestamp = nowIso();
  const resolutionRequirement = resolutionFromBrief(state);
  const usbTransport = usbFromBrief(state);
  const audioPath = audioFromBrief(state);
  const processing = processingFromBrief(state);
  const status = quoteSafetyStatus(meta.missingItems);
  const nextBestQuestion = nextQuestionFromMissingItems(meta.missingItems);

  const roomModel = {
    ...state,
    customerWording: text(state.notes, text(state.outcome, "Customer outcome not captured yet")),
    applicationType: text(state.outcome, "Not confirmed"),
    sourceTypes: devices,
    sourceLocations: list(state.locations),
    sourceConnections: technicalTags,
    sourceCount: countBand(devices.filter((item) => !/microphone|speaker|camera/i.test(item) || /ndi|ptz/i.test(item)).length),
    displayCount: text(state.displayCount, "Unknown"),
    displays: text(state.displayBehaviour, "Not confirmed"),
    longestRun: text(state.cableRun, "Unknown"),
    distanceInfrastructureNotes: text(state.cableRun, "Unknown"),
    resolutionRequirement,
    usbNeeds: [usbTransport].filter(Boolean),
    usbTransport,
    audioNeeds: [audioPath].filter(Boolean),
    audioPath,
    processingNeeds: [processing].filter(Boolean),
    processingRequirement: processing,
    controlNeeds: list(state.controlNeeds),
    networkAvailability: text(state.network, "Unknown"),
    videoWallRequirement: /wall|signage|multiview/i.test([state.outcome, state.displayBehaviour].join(" "))
      ? text(state.displayBehaviour, text(state.outcome, "Video wall or multiview requirement detected"))
      : "Not indicated",
    budgetStyle: "Not confirmed",
    designDirection: meta.designDirection,
    inferredArchitectureDirection: meta.designDirection,
    nextBestQuestion,
    quoteSafetyStatus: status,
    missingInformation: meta.missingItems,
  };

  const brief: StoredDiscoveryBrief = {
    savedAt: timestamp,
    roomModel,
    inference: {
      architecture: meta.designDirection,
      summary: `${text(state.roomType, "Room")} / ${text(state.outcome, "Customer outcome")}. ${meta.designDirection}.`,
      confidence: meta.confidence,
      missing: meta.missingItems,
      risks: meta.missingItems,
      evidence: signalStandardAssumptions(roomModel),
      quoteSafetyStatus: status,
      nextBestQuestion,
      productDirection: [],
      avoid: [],
    },
    capturedPercent: meta.capturedPercent,
    returnRoute: meta.returnRoute ?? routeCatalogByKey.discovery.path,
    missingInformation: meta.missingItems,
    nextBestQuestion,
    quoteSafetyStatus: status,
  };

  return {
    ...brief,
    recommendationEvidence: buildDiscoveryRecommendationEvidence(brief),
  };
}

export function writeLatestDiscoverySnapshot(snapshot: DiscoverySnapshot) {
  if (typeof window === "undefined") return;

  const payload = {
    ...snapshot,
    savedAt: nowIso(),
  };

  window.localStorage.setItem(DISCOVERY_SNAPSHOT_KEY, JSON.stringify(payload));
  window.localStorage.setItem(DISCOVERY_BRIEF_KEY, JSON.stringify(payload.brief));
  window.dispatchEvent(new CustomEvent("wingman:discovery-handoff-updated"));
}

export function readLatestDiscoverySnapshot(): DiscoverySnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DISCOVERY_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoverySnapshot;
    if (!parsed || typeof parsed !== "object" || !parsed.brief) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readLatestDiscoveryBrief(): StoredDiscoveryBrief | null {
  if (typeof window === "undefined") return null;

  const projectBrief = getCurrentWorkflowProject(readProjectStore())?.discoveryBrief;
  if (projectBrief) return projectBrief;

  const snapshotBrief = readLatestDiscoverySnapshot()?.brief;
  if (snapshotBrief) return snapshotBrief;

  try {
    const raw = window.localStorage.getItem(DISCOVERY_BRIEF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDiscoveryBrief;
    return parsed?.roomModel ? parsed : null;
  } catch {
    return null;
  }
}

export function discoveryBriefToFinderNeed(brief: StoredDiscoveryBrief | null): Partial<FinderNeedDraft> | null {
  if (!brief?.roomModel) return null;

  const roomModel = asRecord(brief.roomModel);
  const devices = list(roomModel.devices).length ? list(roomModel.devices) : list(roomModel.sourceTypes);
  const requirement = technicalRequirementFromBrief(roomModel);
  const productPath = productPathFromRequirement(requirement, roomModel);

  return {
    query: [
      text(roomModel.roomType),
      text(roomModel.outcome),
      requirement,
      devices.join(" "),
      text(roomModel.usbOwnership),
      text(roomModel.audioPath),
      text(roomModel.notes),
    ].filter(Boolean).join(" | ").slice(0, 260),
    technicalRequirement: requirement,
    productPath,
    technologyType: technologyTypeFromPath(productPath),
    signalType: devices.join(" ").toLowerCase().includes("usb") ? "HDMI + USB" : "HDMI video",
    sourceConnector: sourceConnectorFromDevices(devices),
    displayConnector: "",
    inputs: text(roomModel.sourceCount, countBand(devices.length)),
    outputs: text(roomModel.displayCount, "Unknown"),
    distance: mapDistance(roomModel.cableRun ?? roomModel.longestRun),
    resolution: resolutionFromBrief(roomModel),
    usb: usbFromBrief(roomModel),
    audio: audioFromBrief(roomModel),
    network: text(roomModel.network, ""),
    processing: processingFromBrief(roomModel),
    control: list(roomModel.controlNeeds).join(" + "),
  };
}
