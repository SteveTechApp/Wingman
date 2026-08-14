import { routeCatalogByKey } from "../app/routeCatalog";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  type ProjectStoreSnapshot,
  type StoredProject,
  type StoredQuoteSafetyStatus,
  type StoredDiscoveryBrief,
} from "./projectStore";
import { buildDiscoveryRecommendationEvidence } from "../lib/recommendationEvidence";

export const DISCOVERY_BRIEF_KEY = "wingman-discovery-brief";
export const DISCOVERY_SNAPSHOT_KEY = "wingman-discovery-snapshot-v3";

export type DiscoverySnapshot = {
  projectId?: string;
  projectName?: string;
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
  avoipProfile?: string;
  avoipSeriesHint?: string;
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

  const metres = Number.parseFloat(run.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(metres) && metres > 0) {
    if (metres < 5) return "Local <5m";
    if (metres <= 10) return "Short 5-10m";
    if (metres <= 35) return "Medium 10-35m";
    if (metres <= 70) return "Long 35-70m";
    return "Very long 70-100m";
  }

  return "Unknown";
}

function ucBlobFromBrief(roomModel: Record<string, unknown>) {
  return [
    roomModel.ucPurpose,
    roomModel.unifiedCommunicationsRequirement,
    list(roomModel.conferencingPlatform).join(" "),
    list(roomModel.cameraNeeds).join(" "),
    list(roomModel.cameraRouting).join(" "),
    list(roomModel.microphoneNeeds).join(" "),
    list(roomModel.microphoneConnections).join(" "),
  ].join(" ").toLowerCase();
}

function technicalRequirementFromBrief(roomModel: Record<string, unknown>) {
  const outcome = lower(roomModel.outcome);
  const devices = list(roomModel.devices).join(" ").toLowerCase();
  const displays = lower(roomModel.displayBehaviour);
  const roomType = lower(roomModel.roomType);
  const avoipProfile = lower(roomModel.avoipProfile);
  const uc = ucBlobFromBrief(roomModel);

  if (includesAny(avoipProfile + roomType, ["av-over-ip", "av over ip", "networkhd"])) return "Distribute AV over network";
  if (includesAny(displays, ["multiview", "several sources on one output"])) return "Create multiview layout";
  if (includesAny(outcome + displays, ["video wall", "signage", "large format", "wall processor", "wall"])) return "Build LCD video wall";
  if (includesAny(outcome + devices + uc, ["capture", "stream", "record", "ndi camera", "ndi / network"])) return "Bring NDI camera into AV system";
  if (includesAny(outcome + roomType, ["route", "several displays", "multi-zone", "sports bar", "hospitality"])) return "Route sources to multiple displays";
  if (includesAny(displays, ["different content", "independent routing"])) return "Route sources to multiple displays";
  if (includesAny(devices, ["wireless presentation", "wireless inputs"])) return "Wireless presentation";
  if (includesAny(outcome + devices + uc, ["meeting", "teams", "zoom", "uc", "mtr", "camera", "microphone", "speakerphone", "byod", "byom", "video conferencing", "conferencing"])) return "BYOD / UC conferencing";
  if (includesAny(devices, ["usb-c", "usb c"])) return "Connect USB-C laptop";
  return "";
}

function productPathFromRequirement(requirement: string, roomModel: Record<string, unknown>) {
  const uc = ucBlobFromBrief(roomModel);
  const blob = [
    requirement,
    roomModel.recommendedProductPath,
    roomModel.roomType,
    roomModel.application,
    roomModel.displayBehaviour,
    roomModel.usbOwnership,
    roomModel.audioPath,
    roomModel.avoipProfile,
    roomModel.avoipSeriesHint,
    list(roomModel.devices).join(" "),
    uc,
  ].join(" ").toLowerCase();

  if (includesAny(blob, ["video wall", "signage", "wall"])) return "Video wall";
  if (includesAny(blob, ["ndi", "camera", "capture", "stream"])) return "NDI / camera";
  if (includesAny(blob, ["av over ip", "avoip", "networkhd"])) return "AVoIP";
  if (includesAny(blob, ["multi-zone", "several displays", "route", "distributed"])) return "Matrix / routing";
  if (includesAny(blob, ["wireless", "casting", "airplay", "miracast"])) return "Wireless presentation";
  if (includesAny(blob, ["uc", "meeting", "teams", "zoom", "mtr", "byod", "byom", "microphone", "speakerphone"])) return "UC / conferencing";
  if (includesAny(blob, ["long", "hdbaset", "extension"])) return "HDBaseT extender";
  return "Presentation switcher";
}

function technologyTypeFromPath(path: string) {
  const normalisedPath = path.toLowerCase();
  if (normalisedPath.includes("avoip")) return "AVoIP";
  if (normalisedPath.includes("matrix")) return "Matrix";
  if (normalisedPath.includes("uc")) return "Unified Comms";
  if (normalisedPath.includes("extender")) return "Extender / HDBaseT";
  if (normalisedPath.includes("camera")) return "Camera / Capture";
  if (normalisedPath.includes("video wall")) return "Video Wall / Multiview";
  return "Core hardware first";
}


function resolutionFromBrief(roomModel: Record<string, unknown>) {
  const signal = lower(roomModel.signalStandard ?? roomModel.signalStandardSummary);
  const tags = list(roomModel.downstreamQualityTags).join(" ").toLowerCase();

  if (signal.includes("hdr10") || tags.includes("hdr10")) return "4K60 4:4:4";
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

function sourceConnectorFromDevices(devices: string[], roomModel: Record<string, unknown>) {
  const blob = devices.join(" ").toLowerCase();
  if (blob.includes("ndi") || blob.includes("network")) return "RJ45 / network";
  if (blob.includes("hdmi")) return "HDMI";
  if (blob.includes("usb-c")) return "USB-C";

  const cameraNeeds = list(roomModel.cameraNeeds).join(" ").toLowerCase();
  if (includesAny(cameraNeeds, ["ndi", "network"])) return "RJ45 / network";
  if (includesAny(cameraNeeds, ["usb"])) return "USB-A";
  if (includesAny(cameraNeeds, ["hdmi"])) return "HDMI";

  return "Unknown";
}

function usbFromBrief(roomModel: Record<string, unknown>) {
  const blob = [
    roomModel.usbOwnership,
    roomModel.usbTopologyRisk,
    list(roomModel.usbNeeds).join(" "),
    list(roomModel.devices).join(" "),
    ucBlobFromBrief(roomModel),
  ].join(" ").toLowerCase();

  if (includesAny(blob, ["no usb transport required", "no usb path needed"]) && !includesAny(blob, ["usb 3", "usb 2", "byod", "byom", "switchable", "camera", "speakerphone"])) {
    return "No USB";
  }
  if (includesAny(blob, ["usb 3", "high bandwidth", "high-bandwidth"])) return "USB 3.x required";
  if (includesAny(blob, ["touch or interactive usb", "touch return"])) return "Touch return";
  if (includesAny(blob, ["camera", "speakerphone", "microphone", "byod", "byom", "user laptop", "switchable"])) return "USB camera";
  if (includesAny(blob, ["room host", "room pc", "usb 2"])) return "USB 2.0 enough";
  return "Unknown";
}

function audioFromBrief(roomModel: Record<string, unknown>) {
  const blob = [
    roomModel.audioPath,
    list(roomModel.audioNeeds).join(" "),
    list(roomModel.microphoneConnections).join(" "),
    list(roomModel.devices).join(" "),
  ].join(" ").toLowerCase();
  if (includesAny(blob, ["dante", "aes67", "reach other rooms", "network audio", "networked audio"])) return "Dante / AES67";
  if (includesAny(blob, ["pull sound out", "de-embed", "deembed"])) return "Audio de-embed";
  if (includesAny(blob, ["amp-2210", "100v", "speaker"])) return "Amplifier / speakers";
  if (includesAny(blob, ["soundbar", "apo-vx20", "apo-210", "microphone", "conferencing"])) return "Mic / speakerphone";
  if (includesAny(blob, ["dsp"])) return "DSP integration";
  if (includesAny(blob, ["display audio"])) return "No audio requirement";
  return "Unknown";
}

function processingFromBrief(roomModel: Record<string, unknown>) {
  const blob = [roomModel.outcome, roomModel.displayBehaviour, roomModel.recommendedProductPath].join(" ").toLowerCase();
  const avoip = [roomModel.roomType, roomModel.avoipProfile, roomModel.avoipSeriesHint].map(lower).join(" ");
  if (includesAny(blob, ["video wall", "wall"])) return "Video wall processing";
  if (includesAny(blob, ["multiview"])) return "Multiview";
  if (includesAny(avoip, ["av-over-ip", "av over ip", "networkhd"])) return "AVoIP routing";
  if (includesAny(blob, ["same content"])) return "No processing";
  if (includesAny(blob, ["different content", "source per display"])) return "Matrix / routing";
  return "No processing";
}

function inputCountFromBrief(value: unknown) {
  const sourceCount = lower(value);
  if (includesAny(sourceCount, ["9+"])) return "9+";
  if (includesAny(sourceCount, ["5-8", "5–8"])) return "5-8";
  if (includesAny(sourceCount, ["2-4", "2–4", "3-4", "3–4"])) return "3-4";
  if (includesAny(sourceCount, ["2 source", "2 sources"])) return "2";
  if (includesAny(sourceCount, ["1 source"])) return "1";
  return "Unknown";
}

function outputCountFromBrief(value: unknown) {
  const displayCount = lower(value);
  if (includesAny(displayCount, ["9+"])) return "9+";
  if (includesAny(displayCount, ["3-8", "3–8", "3-4", "3–4"])) return "3-4";
  if (includesAny(displayCount, ["2 display", "2 displays"])) return "2";
  if (includesAny(displayCount, ["1 display"])) return "1";
  return "Unknown";
}

function networkFromBrief(roomModel: Record<string, unknown>) {
  const blob = [roomModel.network, roomModel.avoipProfile, roomModel.avoipSeriesHint].map(lower).join(" ");
  if (includesAny(blob, ["10gb", "10g", "networkhd 600", "sdvoe"])) return "10G network";
  if (includesAny(blob, ["dedicated av", "dedicated-av", "assume dedicated"])) return "Dedicated AV network";
  if (includesAny(blob, ["managed", "customer network", "existing network", "network available"])) return "Existing LAN";
  return "Unknown";
}

function controlFromBrief(roomModel: Record<string, unknown>) {
  const control = list(roomModel.controlNeeds).join(" ").toLowerCase();
  if (includesAny(control, ["third-party", "third party"])) return "Third-party control";
  if (includesAny(control, ["software", "app control", "browser", "desktop application", "mobile app"])) return "Web UI";
  if (includesAny(control, ["touch panel", "room control"])) return "Touch panel";
  if (includesAny(control, ["remote", "front panel"])) return "IR";
  if (includesAny(control, ["simple", "automatic"])) return "No control";
  return "Unknown";
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

  const project = getCurrentWorkflowProject(readProjectStore());
  const hasExplicitProjectIdentity =
    Object.prototype.hasOwnProperty.call(snapshot, "projectId") ||
    Object.prototype.hasOwnProperty.call(snapshot, "projectName");

  const payload = {
    ...snapshot,
    projectId: hasExplicitProjectIdentity ? snapshot.projectId : project?.id,
    projectName: hasExplicitProjectIdentity ? snapshot.projectName : project?.name,
    savedAt: nowIso(),
  };

  window.localStorage.setItem(DISCOVERY_SNAPSHOT_KEY, JSON.stringify(payload));
  window.localStorage.setItem(DISCOVERY_BRIEF_KEY, JSON.stringify(payload.brief));
  window.dispatchEvent(new CustomEvent("wingman:discovery-handoff-updated"));
}

function normalizedIdentity(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function discoveryIdentity(snapshot: DiscoverySnapshot) {
  const state = asRecord(snapshot.state);
  const roomModel = asRecord(snapshot.brief?.roomModel);
  return [
    snapshot.projectName,
    state.clientName,
    state.siteName,
    roomModel.customer,
    roomModel.customerName,
    roomModel.companyName,
    roomModel.site,
    roomModel.siteName,
  ].map(normalizedIdentity).filter(Boolean);
}

/** Resolve only a project with evidence that it owns this exact Discovery. */
export function resolveDiscoverySnapshotProject(
  snapshot: DiscoverySnapshot | null,
  store: ProjectStoreSnapshot = readProjectStore(),
): StoredProject | null {
  if (!snapshot) return null;
  if (snapshot.projectId) {
    return store.projects.find((project) => project.id === snapshot.projectId) ?? null;
  }

  const identities = discoveryIdentity(snapshot);
  if (!identities.length) return null;

  const matches = store.projects.filter((project) => {
    const projectSnapshot: DiscoverySnapshot = {
      activeStepIndex: 0,
      state: {},
      brief: project.discoveryBrief ?? {},
      projectName: project.name,
      savedAt: "",
    };
    const projectIdentities = discoveryIdentity(projectSnapshot);
    return identities.some((identity) => projectIdentities.includes(identity));
  });

  return matches.length === 1 ? matches[0] : null;
}

export function clearLatestDiscoverySnapshot() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(DISCOVERY_SNAPSHOT_KEY);
  window.localStorage.removeItem(DISCOVERY_BRIEF_KEY);
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
  const usbRequirement = usbFromBrief(roomModel);
  const requiresUsb = usbRequirement !== "No USB" && usbRequirement !== "Unknown";

  return {
    // The Finder query box is an explicit product-text search. A customer brief is
    // deliberately not placed here: making every narrative word a filter is what
    // previously reduced a complete Discovery to zero results.
    query: "",
    technicalRequirement: requirement,
    productPath,
    technologyType: technologyTypeFromPath(productPath),
    signalType: requiresUsb || devices.join(" ").toLowerCase().includes("usb") ? "HDMI + USB" : "HDMI video",
    sourceConnector: sourceConnectorFromDevices(devices, roomModel),
    displayConnector: "",
    inputs: inputCountFromBrief(roomModel.sourceCount),
    outputs: outputCountFromBrief(roomModel.displayCount),
    distance: mapDistance(roomModel.cableRun ?? roomModel.longestRun),
    resolution: resolutionFromBrief(roomModel),
    usb: usbRequirement,
    audio: audioFromBrief(roomModel),
    network: networkFromBrief(roomModel),
    processing: processingFromBrief(roomModel),
    control: controlFromBrief(roomModel),
    avoipProfile: text(roomModel.avoipProfile),
    avoipSeriesHint: text(roomModel.avoipSeriesHint),
  };
}
