$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Save-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Backup-File {
  param([string]$Path)
  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item -LiteralPath $Path -Destination "$Path.bak-$stamp" -Force
    Write-Host "Backup created: $Path.bak-$stamp" -ForegroundColor DarkGray
  }
}

$root = (Get-Location).Path
$discoveryPath = Join-Path $root "src\wingman2\pages\DiscoveryPage.tsx"
$handoffPath = Join-Path $root "src\wingman2\data\workflowHandoff.ts"
$cssPath = Join-Path $root "src\wingman2\styles\wingman-style-stack.css"

Write-Step "Checking files"

foreach ($path in @($discoveryPath, $cssPath)) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

foreach ($path in @($discoveryPath, $handoffPath, $cssPath)) {
  Backup-File $path
}

Write-Step "Writing simplified Discovery handoff model"

$handoff = @'
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  type StoredDiscoveryBrief,
} from "./projectStore";

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

  const roomModel = {
    ...state,
    sourceTypes: devices,
    sourceLocations: list(state.locations),
    sourceConnections: technicalTags,
    sourceCount: countBand(devices.filter((item) => !/microphone|speaker|camera/i.test(item) || /ndi|ptz/i.test(item)).length),
    displayCount: text(state.displayCount, "Unknown"),
    displays: text(state.displayBehaviour, "Not confirmed"),
    longestRun: text(state.cableRun, "Unknown"),
    usbNeeds: [usbFromBrief(state)].filter(Boolean),
    usbTransport: usbFromBrief(state),
    audioNeeds: [audioFromBrief(state)].filter(Boolean),
    controlNeeds: list(state.controlNeeds),
    networkAvailability: text(state.network, "Unknown"),
    budgetStyle: "Not confirmed",
    designDirection: meta.designDirection,
  };

  return {
    savedAt: timestamp,
    roomModel,
    inference: {
      architecture: meta.designDirection,
      summary: `${text(state.roomType, "Room")} / ${text(state.outcome, "Customer outcome")}. ${meta.designDirection}.`,
      confidence: meta.confidence,
      missing: meta.missingItems,
      risks: meta.missingItems,
      productDirection: [],
      avoid: [],
    },
    capturedPercent: meta.capturedPercent,
    returnRoute: meta.returnRoute ?? routeCatalogByKey.discovery.path,
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
    resolution: "Unknown",
    usb: usbFromBrief(roomModel),
    audio: audioFromBrief(roomModel),
    network: text(roomModel.network, ""),
    processing: processingFromBrief(roomModel),
    control: list(roomModel.controlNeeds).join(" + "),
  };
}
'@

Save-Utf8NoBom -Path $handoffPath -Content $handoff

Write-Step "Replacing Discovery page with simplified progressive workflow"

$discovery = @'
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  Monitor,
  Save,
  Sparkles,
} from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { saveDiscoveryBriefToProject } from "../data/projectStore";
import {
  buildDiscoveryBriefFromState,
  readLatestDiscoverySnapshot,
  writeLatestDiscoverySnapshot,
} from "../data/workflowHandoff";

type StepId = "outcome" | "room" | "devices" | "displays" | "exceptions" | "review";

type DiscoveryState = {
  outcome: string;
  roomType: string;
  roomSize: string;
  equipmentLocation: string;
  devices: string[];
  locations: string[];
  displayBehaviour: string;
  displayCount: string;
  cableRun: string;
  network: string;
  usbOwnership: string;
  audioPath: string;
  controlNeeds: string[];
  notes: string;
};

type Step = {
  id: StepId;
  label: string;
  helper: string;
};

type OptionCard = {
  label: string;
  helper: string;
  tags?: string[];
};

const steps: Step[] = [
  { id: "outcome", label: "Outcome", helper: "Start with what the customer wants to achieve." },
  { id: "room", label: "Room", helper: "Apply realistic room assumptions." },
  { id: "devices", label: "Devices", helper: "Select actual equipment, not connector jargon." },
  { id: "displays", label: "Displays", helper: "Confirm display behaviour only where it changes the design." },
  { id: "exceptions", label: "Checks", helper: "Only answer questions triggered by the model." },
  { id: "review", label: "Review", helper: "Move into Finder or Proposal." },
];

const outcomeOptions: OptionCard[] = [
  {
    label: "Present device to display",
    helper: "Laptop, USB-C, HDMI, wireless presentation or simple local switching.",
    tags: ["Presentation"],
  },
  {
    label: "Create meeting / UC room",
    helper: "Teams, Zoom, camera, microphone, soundbar, speakerphone or room PC workflow.",
    tags: ["USB", "Audio", "Camera"],
  },
  {
    label: "Route sources to multiple displays",
    helper: "Matrix, AV-over-IP, multi-zone venue, training space or sports bar routing.",
    tags: ["Routing"],
  },
  {
    label: "Build video wall or signage display",
    helper: "LCD wall, LED wall, signage loop, feature wall or canvas processing.",
    tags: ["Wall", "Signage"],
  },
  {
    label: "Capture, stream or record content",
    helper: "Lecture capture, camera bridge, NDI source, recording or monitoring workflow.",
    tags: ["Capture", "NDI"],
  },
  {
    label: "Replace or compare existing product",
    helper: "Known competitor SKU, legacy matrix, extender, switcher or processor replacement.",
    tags: ["Compare"],
  },
  {
    label: "Not sure - guide me",
    helper: "Use simple prompts and let Wingman infer the likely product path.",
    tags: ["Guided"],
  },
];

const roomOptions: OptionCard[] = [
  { label: "Huddle room", helper: "Small meeting space with simple presentation and UC." },
  { label: "Boardroom", helper: "Higher expectation meeting room with presentation, UC and control needs." },
  { label: "Classroom", helper: "Teaching space with repeatable source/display and audio requirements." },
  { label: "Training room", helper: "Flexible learning space, often with dual display or UC." },
  { label: "Lecture theatre", helper: "Larger presentation/capture space with distance and audio risk." },
  { label: "Retail signage", helper: "Media player, signage display, wall or distributed content." },
  { label: "Sports bar / hospitality", helper: "Multiple displays, source routing and simple control." },
  { label: "Control room", helper: "Monitoring, multiview, source routing and uptime considerations." },
  { label: "House of worship", helper: "Camera, projection, streaming and stage display workflows." },
  { label: "Healthcare simulation", helper: "Capture, camera, review and monitoring workflow." },
  { label: "Multi-zone venue", helper: "Several areas with different display/source needs." },
  { label: "Other / not sure", helper: "Keep the discovery generic until more detail is known." },
];

const roomSizeOptions = ["Small <10m", "Medium <25m", "Large <50m", "Extra large 50m+", "Unknown"];

const equipmentLocationOptions = [
  "Behind display",
  "Credenza",
  "Table / floor box",
  "Lectern",
  "Local rack",
  "Central rack",
  "Mixed locations",
  "Unknown",
];

const deviceOptions: OptionCard[] = [
  { label: "Laptop HDMI", helper: "Adds HDMI input. Needs separate USB path if using room camera/audio.", tags: ["HDMI"] },
  { label: "Laptop USB-C", helper: "Adds USB-C video input and possible BYOD USB host path.", tags: ["USB-C", "BYOD"] },
  { label: "Wireless presentation", helper: "Adds wireless/software source path.", tags: ["Wireless"] },
  { label: "Room PC", helper: "Adds HDMI source and fixed USB host candidate.", tags: ["HDMI", "USB host"] },
  { label: "Microsoft Teams Room Device", helper: "Adds UC host, display output and camera/audio ownership questions.", tags: ["MTR", "USB host"] },
  { label: "Media player", helper: "Adds fixed HDMI source.", tags: ["HDMI"] },
  { label: "Signage player", helper: "Adds fixed signage source.", tags: ["Signage"] },
  { label: "USB camera", helper: "Adds USB peripheral; needs clear host ownership.", tags: ["USB peripheral"] },
  { label: "PTZ camera", helper: "Confirm HDMI, USB, NDI and control path.", tags: ["Camera"] },
  { label: "NDI camera", helper: "Adds network video source and NDI bridge/AV-over-IP consideration.", tags: ["NDI"] },
  { label: "Microphone / DSP", helper: "Adds audio path and UC integration requirement.", tags: ["Audio"] },
  { label: "Other source", helper: "Flag for manual review.", tags: ["Review"] },
];

const locationOptions = [
  "Table",
  "Floor box",
  "Wall plate",
  "Lectern",
  "Behind display",
  "Local rack",
  "Central rack",
  "Network",
  "Ceiling",
  "Mixed locations",
  "Unknown",
];

const displayBehaviourOptions: OptionCard[] = [
  { label: "Single display", helper: "One main display or projector." },
  { label: "Dual mirrored displays", helper: "Two displays showing the same content." },
  { label: "Dual independent displays", helper: "Different content or extended desktop/MST consideration." },
  { label: "Presentation plus conferencing display", helper: "Content display and UC display behaviour." },
  { label: "Multiple displays same content", helper: "Distribution amplifier, splitter or mirrored routing." },
  { label: "Different content per display", helper: "Matrix or AV-over-IP routing likely." },
  { label: "Multiview display", helper: "One output canvas showing multiple sources." },
  { label: "LCD video wall", helper: "Dedicated wall processor or AV-over-IP wall routing." },
  { label: "LED wall", helper: "Single canvas feed to LED processor." },
  { label: "Not sure", helper: "Ask what the viewer should see during the main workflow." },
];

const displayCountOptions = ["1", "2", "3-4", "5-8", "9+", "Unknown"];

const cableRunOptions = ["Under 5m", "5-10m", "10-35m", "35-70m", "70-100m", "100m+", "Unknown"];

const networkOptions = [
  "No network needed",
  "Existing IT network",
  "Dedicated AV network possible",
  "Managed switch available",
  "10G available",
  "Unknown",
];

const usbOwnershipOptions: OptionCard[] = [
  {
    label: "Room PC / MTR owns USB",
    helper: "Prioritise fixed UC appliance or room PC as the camera/audio host.",
  },
  {
    label: "BYOD laptop owns USB",
    helper: "User laptop needs access to room camera/audio. Prefer USB-C where practical.",
  },
  {
    label: "Switchable USB host",
    helper: "Room PC/MTR and BYOD laptop both need camera/audio access.",
  },
  {
    label: "APO-DG2 / dongle-style BYOD path",
    helper: "Useful where BYOD should avoid consuming the main switcher USB host path.",
  },
  {
    label: "No room USB required",
    helper: "Video/audio only; no room camera, mic, touch or USB peripheral transport.",
  },
  {
    label: "Not sure",
    helper: "Keep as a validation item.",
  },
];

const audioPathOptions: OptionCard[] = [
  {
    label: "APO-VX20 / APO-210-UC soundbar",
    helper: "Small/medium UC room with all-in-one camera/audio endpoint.",
  },
  {
    label: "Room microphone + speakers",
    helper: "Separate mic and speaker path, likely needs switching/DSP consideration.",
  },
  {
    label: "AMP-2210 + 100V/low-Z speakers",
    helper: "Larger room speaker reinforcement with amplifier path.",
  },
  {
    label: "Dante / AES67",
    helper: "Network audio or DSP-integrated room path.",
  },
  {
    label: "Display speakers only",
    helper: "Simple audio from display; validate if suitable for the room size.",
  },
  {
    label: "Not sure",
    helper: "Keep as a validation item.",
  },
];

const controlOptions = [
  "No control",
  "Display power control",
  "IR",
  "RS-232",
  "Web UI",
  "Touch panel",
  "Third-party control",
  "Not sure",
];

const initialState: DiscoveryState = {
  outcome: "",
  roomType: "",
  roomSize: "Medium <25m",
  equipmentLocation: "Behind display",
  devices: [],
  locations: [],
  displayBehaviour: "",
  displayCount: "1",
  cableRun: "",
  network: "",
  usbOwnership: "",
  audioPath: "",
  controlNeeds: [],
  notes: "",
};

function selected(values: string[], option: string) {
  return values.includes(option);
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
  const text = value.toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function getInputModel(state: DiscoveryState) {
  const inputs = {
    hdmi: 0,
    usbC: 0,
    wireless: 0,
    networkVideo: 0,
    usbHostCandidates: [] as string[],
    fixedUsbHosts: [] as string[],
    byodUsbHosts: [] as string[],
    usbPeripherals: [] as string[],
    audioPaths: [] as string[],
    tags: [] as string[],
  };

  if (selected(state.devices, "Laptop HDMI")) {
    inputs.hdmi += 1;
    inputs.tags.push("Laptop HDMI: 1 HDMI input");
  }

  if (selected(state.devices, "Laptop USB-C")) {
    inputs.usbC += 1;
    inputs.tags.push("Laptop USB-C: 1 USB-C video input");
  }

  if (selected(state.devices, "Wireless presentation")) {
    inputs.wireless += 1;
    inputs.tags.push("Wireless presentation: software/network source");
  }

  if (selected(state.devices, "Room PC")) {
    inputs.hdmi += 1;
    inputs.fixedUsbHosts.push("Room PC");
    inputs.usbHostCandidates.push("Room PC USB host");
    inputs.tags.push("Room PC: HDMI source + fixed USB host");
  }

  if (selected(state.devices, "Microsoft Teams Room Device")) {
    inputs.hdmi += 1;
    inputs.fixedUsbHosts.push("Microsoft Teams Room Device");
    inputs.usbHostCandidates.push("MTR USB host");
    inputs.tags.push("MTR: UC host + display output path");
  }

  if (selected(state.devices, "Media player")) {
    inputs.hdmi += 1;
    inputs.tags.push("Media player: 1 HDMI input");
  }

  if (selected(state.devices, "Signage player")) {
    inputs.hdmi += 1;
    inputs.tags.push("Signage player: 1 HDMI input");
  }

  if (selected(state.devices, "PTZ camera")) {
    inputs.hdmi += 1;
    inputs.tags.push("PTZ camera: confirm HDMI / USB / NDI / control path");
  }

  if (selected(state.devices, "NDI camera")) {
    inputs.networkVideo += 1;
    inputs.tags.push("NDI camera: network video source");
  }

  if (selected(state.devices, "USB camera")) {
    inputs.usbPeripherals.push("USB camera");
    inputs.tags.push("USB camera: USB peripheral");
  }

  if (selected(state.devices, "Microphone / DSP")) {
    inputs.usbPeripherals.push("Microphone / DSP or USB audio path");
    inputs.audioPaths.push("Microphone / DSP");
    inputs.tags.push("Microphone / DSP: audio path");
  }

  const ucWorkflow =
    state.outcome === "Create meeting / UC room" ||
    state.displayBehaviour === "Presentation plus conferencing display" ||
    selected(state.devices, "USB camera") ||
    selected(state.devices, "Microphone / DSP") ||
    selected(state.devices, "Microsoft Teams Room Device") ||
    selected(state.devices, "Room PC") ||
    state.audioPath.includes("soundbar") ||
    state.audioPath.includes("Dante");

  if (ucWorkflow && selected(state.devices, "Laptop USB-C")) {
    inputs.byodUsbHosts.push("Laptop USB-C");
    inputs.usbHostCandidates.push("Laptop USB-C BYOD host");
  }

  if (ucWorkflow && selected(state.devices, "Laptop HDMI")) {
    inputs.byodUsbHosts.push("Laptop HDMI");
    inputs.usbHostCandidates.push("Laptop HDMI BYOD host requires separate USB path");
  }

  if (state.audioPath && state.audioPath !== "Not sure") {
    inputs.audioPaths.push(state.audioPath);
  }

  if (inputs.hdmi) inputs.tags.push(`Total HDMI-class inputs: ${inputs.hdmi}`);
  if (inputs.usbC) inputs.tags.push(`Total USB-C video inputs: ${inputs.usbC}`);
  if (inputs.networkVideo) inputs.tags.push(`Network video sources: ${inputs.networkVideo}`);
  if (inputs.usbHostCandidates.length) inputs.tags.push(`USB host candidates: ${inputs.usbHostCandidates.length}`);
  if (inputs.usbPeripherals.length) inputs.tags.push(`USB peripheral/audio paths: ${inputs.usbPeripherals.length}`);

  return inputs;
}

function getUsbTopology(state: DiscoveryState) {
  const inputModel = getInputModel(state);
  const warnings: string[] = [];
  const actions: string[] = [];

  if (selected(state.devices, "Laptop HDMI") && inputModel.byodUsbHosts.includes("Laptop HDMI")) {
    warnings.push("Laptop HDMI does not carry USB. If it must use the room camera/microphone, allow a separate USB path, USB-C alternative, or APO-DG2-style BYOD workflow.");
  }

  if (inputModel.usbHostCandidates.length > 1) {
    warnings.push("Multiple USB host candidates are present. Confirm whether the selected switcher/core can switch USB hosts, or choose a priority host.");
  }

  if (inputModel.fixedUsbHosts.length && inputModel.byodUsbHosts.length) {
    warnings.push("Fixed Room PC/MTR and BYOD laptop hosts are both present. Do not assume every host can own room USB devices at the same time.");
    actions.push("Prioritise Room PC/MTR USB if the room is normally a fixed UC room.");
    actions.push("Use USB-C or APO-DG2-style BYOD path if laptop users need camera/audio without consuming the main USB host path.");
  }

  if (!inputModel.usbHostCandidates.length && inputModel.usbPeripherals.length) {
    warnings.push("USB peripherals are selected but no clear USB host has been identified.");
    actions.push("Ask which device owns camera/audio: laptop, Room PC, MTR, or a UC soundbar/appliance.");
  }

  if (inputModel.usbPeripherals.length > 1) {
    warnings.push("Multiple USB/audio peripheral paths are present. Check bandwidth, hubs, ownership and USB 2.0 vs USB 3.x.");
  }

  if (!actions.length) {
    actions.push(inputModel.usbHostCandidates.length ? "Confirm host ownership and USB bandwidth." : "No USB host conflict detected yet.");
  }

  return {
    risk: warnings.length >= 2 ? "High USB design risk" : warnings.length ? "Medium USB design risk" : "Low USB design risk",
    warnings,
    actions,
    summary: inputModel.usbHostCandidates.length
      ? `${inputModel.usbHostCandidates.length} host candidate${inputModel.usbHostCandidates.length === 1 ? "" : "s"} / ${inputModel.usbPeripherals.length} peripheral path${inputModel.usbPeripherals.length === 1 ? "" : "s"}`
      : inputModel.usbPeripherals.length
        ? `No host selected / ${inputModel.usbPeripherals.length} peripheral path${inputModel.usbPeripherals.length === 1 ? "" : "s"}`
        : "No USB topology requirement captured",
  };
}

function getTriggeredChecks(state: DiscoveryState) {
  const checks: string[] = [];
  const inputModel = getInputModel(state);
  const usb = getUsbTopology(state);

  if (usb.warnings.length) checks.push("USB host ownership");
  if (inputModel.hdmi + inputModel.usbC + inputModel.wireless + inputModel.networkVideo > 3) checks.push("Switcher input capacity");
  if (state.displayBehaviour.includes("independent") || state.displayBehaviour.includes("Different")) checks.push("Independent display routing");
  if (state.displayBehaviour.includes("wall") || state.outcome.includes("video wall")) checks.push("Video wall processing");
  if (state.cableRun.includes("35-70m") || state.cableRun.includes("70-100m") || state.cableRun.includes("100m+")) checks.push("Long cable transport");
  if (state.audioPath.includes("Dante") || state.audioPath.includes("AMP-2210")) checks.push("Audio system design");
  if (state.network.includes("10G")) checks.push("10G network / NHD-600 consideration");

  return checks.length ? checks : ["No major exception triggered yet"];
}

function getRecommendedProductPath(state: DiscoveryState) {
  const blob = [
    state.outcome,
    state.roomType,
    state.displayBehaviour,
    state.devices.join(" "),
    state.usbOwnership,
    state.audioPath,
    state.network,
  ].join(" ");

  if (includesAny(blob, ["LED wall", "LCD video wall", "video wall", "signage"])) return "Video wall / signage processor path";
  if (includesAny(blob, ["NDI camera", "capture", "stream", "record"])) return "Camera / capture / NDI bridge path";
  if (includesAny(blob, ["Route sources", "multiple displays", "sports bar", "multi-zone", "Different content"])) return "AVoIP or matrix routing path";
  if (includesAny(blob, ["meeting", "UC", "Teams", "MTR", "USB camera", "Microphone", "soundbar"])) return "Presentation / UC switcher path";
  if (includesAny(blob, ["35-70m", "70-100m", "100m+"])) return "HDBaseT or AVoIP transport path";
  return "Presentation switcher / extender path";
}

function getDesignDirection(state: DiscoveryState) {
  return getRecommendedProductPath(state);
}

function getMissingItems(state: DiscoveryState) {
  const missing: string[] = [];

  if (!state.outcome) missing.push("Customer outcome");
  if (!state.roomType) missing.push("Room type");
  if (!state.devices.length) missing.push("Devices involved");
  if (!state.displayBehaviour) missing.push("Display behaviour");
  if (!state.cableRun) missing.push("Longest cable run");

  if (getUsbTopology(state).risk !== "Low USB design risk" && !state.usbOwnership) {
    missing.push("USB host ownership");
  }

  if (state.outcome === "Create meeting / UC room" && !state.audioPath) {
    missing.push("UC audio path");
  }

  return missing;
}

function getConfidence(missingCount: number) {
  if (missingCount <= 1) return "High confidence";
  if (missingCount <= 4) return "Medium confidence";
  return "Low confidence";
}

function capturedPercent(missingCount: number) {
  return Math.max(10, Math.round(((7 - Math.min(missingCount, 7)) / 7) * 100));
}

function OptionButton({
  option,
  active,
  onClick,
  multi,
}: {
  option: OptionCard;
  active: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wm-simple-discovery-card ${active ? "is-active" : ""}`}
    >
      <span className="wm-simple-discovery-check">{active ? <Check className="h-4 w-4" /> : multi ? "+" : ""}</span>
      <strong>{option.label}</strong>
      <small>{option.helper}</small>
      {option.tags?.length ? (
        <span className="wm-simple-discovery-tags">
          {option.tags.map((tag) => (
            <em key={tag}>{tag}</em>
          ))}
        </span>
      ) : null}
    </button>
  );
}

function PillGroup({
  title,
  helper,
  options,
  value,
  values,
  multi,
  onSelect,
}: {
  title: string;
  helper?: string;
  options: string[];
  value?: string;
  values?: string[];
  multi?: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="wm-simple-discovery-field">
      <p>{title}</p>
      {helper ? <span>{helper}</span> : null}
      <div>
        {options.map((option) => {
          const active = multi ? Boolean(values?.includes(option)) : value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={active ? "is-active" : ""}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ValueLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p>{label}</p>
      <strong>{value || "Not captured yet"}</strong>
    </div>
  );
}

function ListLine({ label, values }: { label: string; values: string[] }) {
  return <ValueLine label={label} value={values.length ? values.join(", ") : "Not captured yet"} />;
}

export function DiscoveryPage() {
  const navigate = useNavigate();
  const restoredDiscovery = readLatestDiscoverySnapshot();

  const [activeStepIndex, setActiveStepIndex] = useState(() => restoredDiscovery?.activeStepIndex ?? 0);
  const [state, setState] = useState<DiscoveryState>(() => ({
    ...initialState,
    ...(restoredDiscovery?.state ?? {}),
  }));
  const [fullModelOpen, setFullModelOpen] = useState(false);

  const currentStep = steps[activeStepIndex];
  const missingItems = useMemo(() => getMissingItems(state), [state]);
  const confidence = getConfidence(missingItems.length);
  const designDirection = getDesignDirection(state);
  const inputModel = getInputModel(state);
  const usbTopology = getUsbTopology(state);
  const triggeredChecks = getTriggeredChecks(state);
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === steps.length - 1;

  function setField<K extends keyof DiscoveryState>(key: K, value: DiscoveryState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "devices" | "locations" | "controlNeeds", value: string) {
    setState((current) => {
      const existing = current[key];
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];

      const updated = { ...current, [key]: next };

      if (key === "devices") {
        const ucTriggered =
          next.includes("Room PC") ||
          next.includes("Microsoft Teams Room Device") ||
          next.includes("USB camera") ||
          next.includes("Microphone / DSP");

        return {
          ...updated,
          audioPath: current.audioPath || (ucTriggered ? "APO-VX20 / APO-210-UC soundbar" : current.audioPath),
          usbOwnership: current.usbOwnership || (ucTriggered ? "Room PC / MTR owns USB" : current.usbOwnership),
        };
      }

      return updated;
    });
  }

  function currentBrief() {
    return buildDiscoveryBriefFromState(
      {
        ...state,
        technicalTags: inputModel.tags,
        usbTopology,
        usbTopologyRisk: usbTopology.risk,
        usbTopologySummary: usbTopology.summary,
        triggeredChecks,
        recommendedProductPath: designDirection,
      },
      {
        designDirection,
        confidence,
        missingItems,
        capturedPercent: capturedPercent(missingItems.length),
        returnRoute: routeCatalogByKey.discovery.path,
      },
    );
  }

  function persist(nextStepIndex = activeStepIndex) {
    const brief = currentBrief();

    writeLatestDiscoverySnapshot({
      activeStepIndex: nextStepIndex,
      state,
      brief,
      savedAt: brief.savedAt ?? new Date().toISOString(),
    });

    return brief;
  }

  function saveDiscoveryBrief() {
    const brief = persist(activeStepIndex);
    return saveDiscoveryBriefToProject(brief);
  }

  function goToStep(index: number) {
    const nextIndex = Math.max(0, Math.min(steps.length - 1, index));
    persist(nextIndex);
    setActiveStepIndex(nextIndex);
  }

  function goBack() {
    goToStep(activeStepIndex - 1);
  }

  function goNext() {
    goToStep(activeStepIndex + 1);
  }

  function openFinder() {
    saveDiscoveryBrief();
    navigate(routeCatalogByKey.finder.path);
  }

  function openProposal() {
    saveDiscoveryBrief();
    navigate(routeCatalogByKey.proposal.path);
  }

  useEffect(() => {
    persist(activeStepIndex);
  }, [activeStepIndex, state, designDirection, confidence]);

  function renderOutcomeStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 1</p>
          <h2>What is the customer trying to do?</h2>
          <span>Start with the recognisable outcome. Wingman will infer the technical path behind the scenes.</span>
        </div>

        <div className="wm-simple-discovery-grid">
          {outcomeOptions.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              active={state.outcome === option.label}
              onClick={() => setField("outcome", option.label)}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderRoomStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 2</p>
          <h2>What room or application is it?</h2>
          <span>Room type gives Wingman sensible defaults without forcing the user through every technical detail.</span>
        </div>

        <div className="wm-simple-discovery-grid">
          {roomOptions.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              active={state.roomType === option.label}
              onClick={() => setField("roomType", option.label)}
            />
          ))}
        </div>

        <div className="wm-simple-two-col">
          <PillGroup
            title="Room size"
            helper="Use installed cable path length rather than straight-line room width."
            options={roomSizeOptions}
            value={state.roomSize}
            onSelect={(value) => setField("roomSize", value)}
          />

          <PillGroup
            title="Main equipment position"
            helper="This affects transport, rack position and cable risk."
            options={equipmentLocationOptions}
            value={state.equipmentLocation}
            onSelect={(value) => setField("equipmentLocation", value)}
          />
        </div>
      </div>
    );
  }

  function renderDevicesStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 3</p>
          <h2>Which devices are involved?</h2>
          <span>Select the actual devices. Wingman converts them into HDMI, USB-C, USB host, USB peripheral, NDI and audio requirements.</span>
        </div>

        <div className="wm-simple-discovery-grid">
          {deviceOptions.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              active={state.devices.includes(option.label)}
              onClick={() => toggleList("devices", option.label)}
              multi
            />
          ))}
        </div>

        <PillGroup
          title="Where are the devices?"
          helper="Select all relevant positions. Keep it simple unless the room is complex."
          options={locationOptions}
          values={state.locations}
          onSelect={(value) => toggleList("locations", value)}
          multi
        />

        <div className="wm-simple-inference-panel">
          <p>Inferred signal model</p>
          <div>
            {inputModel.tags.length ? inputModel.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>No device inputs selected yet</span>}
          </div>
        </div>
      </div>
    );
  }

  function renderDisplaysStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 4</p>
          <h2>What should the displays show?</h2>
          <span>Only capture the behaviour that changes the product path.</span>
        </div>

        <div className="wm-simple-discovery-grid">
          {displayBehaviourOptions.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              active={state.displayBehaviour === option.label}
              onClick={() => setField("displayBehaviour", option.label)}
            />
          ))}
        </div>

        <div className="wm-simple-two-col">
          <PillGroup
            title="Display count"
            options={displayCountOptions}
            value={state.displayCount}
            onSelect={(value) => setField("displayCount", value)}
          />

          <PillGroup
            title="Longest cable path"
            helper="This is the installed cable route, not the room width."
            options={cableRunOptions}
            value={state.cableRun}
            onSelect={(value) => setField("cableRun", value)}
          />
        </div>
      </div>
    );
  }

  function renderExceptionsStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 5</p>
          <h2>Confirm only the design-critical checks.</h2>
          <span>These questions are triggered by the previous answers. This avoids showing every AV option to every user.</span>
        </div>

        <div className="wm-simple-alert" data-risk={usbTopology.risk.includes("High") ? "high" : usbTopology.risk.includes("Medium") ? "medium" : "low"}>
          <div>
            <p>USB host / peripheral topology</p>
            <h3>{usbTopology.summary}</h3>
            <span>{usbTopology.risk}</span>
          </div>
          <ul>
            {usbTopology.warnings.length ? usbTopology.warnings.map((item) => <li key={item}>{item}</li>) : <li>No USB host conflict detected yet.</li>}
          </ul>
        </div>

        <div className="wm-simple-two-col">
          <div className="wm-simple-option-section">
            <p>Who should own the room USB devices?</p>
            <div className="wm-simple-discovery-grid compact">
              {usbOwnershipOptions.map((option) => (
                <OptionButton
                  key={option.label}
                  option={option}
                  active={state.usbOwnership === option.label}
                  onClick={() => setField("usbOwnership", option.label)}
                />
              ))}
            </div>
          </div>

          <div className="wm-simple-option-section">
            <p>How is room audio handled?</p>
            <div className="wm-simple-discovery-grid compact">
              {audioPathOptions.map((option) => (
                <OptionButton
                  key={option.label}
                  option={option}
                  active={state.audioPath === option.label}
                  onClick={() => setField("audioPath", option.label)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="wm-simple-two-col">
          <PillGroup
            title="Network availability"
            helper="Only important where AVoIP, NDI, Dante, cloud control or networked control may be used."
            options={networkOptions}
            value={state.network}
            onSelect={(value) => setField("network", value)}
          />

          <PillGroup
            title="Control needs"
            helper="Select only if the user mentioned control, display power or third-party integration."
            options={controlOptions}
            values={state.controlNeeds}
            onSelect={(value) => toggleList("controlNeeds", value)}
            multi
          />
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 6</p>
          <h2>Review the inferred product path.</h2>
          <span>Wingman now has enough to move into Product Finder, or save this as the start of the proposal workflow.</span>
        </div>

        <div className="wm-simple-review-grid">
          <div>
            <p>Recommended product path</p>
            <h3>{designDirection}</h3>
            <span>{confidence} / {capturedPercent(missingItems.length)}% captured</span>
          </div>
          <div>
            <p>Triggered checks</p>
            <ul>{triggeredChecks.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <p>Open items</p>
            <ul>{missingItems.length ? missingItems.map((item) => <li key={item}>{item}</li>) : <li>Ready for product selection.</li>}</ul>
          </div>
        </div>

        <textarea
          value={state.notes}
          onChange={(event) => setField("notes", event.target.value)}
          placeholder="Optional customer wording, site notes, constraints or assumptions."
          className="wm-simple-notes"
        />

        <div className="wm-simple-review-actions">
          <button type="button" onClick={openFinder}>
            Open Product Finder
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={openProposal}>
            Save to project / proposal
            <Save className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  function renderStep() {
    if (currentStep.id === "outcome") return renderOutcomeStep();
    if (currentStep.id === "room") return renderRoomStep();
    if (currentStep.id === "devices") return renderDevicesStep();
    if (currentStep.id === "displays") return renderDisplaysStep();
    if (currentStep.id === "exceptions") return renderExceptionsStep();
    return renderReviewStep();
  }

  return (
    <main className="wm-simple-discovery-page">
      <section className="wm-simple-discovery-shell">
        <header className="wm-simple-discovery-head">
          <div>
            <p>Wingman workspace</p>
            <h1>Simplified Discovery</h1>
            <span>Ask fewer questions. Select recognisable outcomes and devices. Let Wingman infer the engineering model.</span>
          </div>

          <div className="wm-simple-discovery-head-actions">
            <span>{confidence}</span>
            <Link to={routeCatalogByKey.finder.path} onClick={() => persist(activeStepIndex)}>Open Finder</Link>
          </div>
        </header>

        <nav className="wm-simple-discovery-steps">
          {steps.map((step, index) => {
            const active = index === activeStepIndex;
            const complete = index < activeStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                title={step.helper}
                onClick={() => goToStep(index)}
                className={active ? "is-active" : complete ? "is-complete" : ""}
              >
                <span>{complete ? <Check className="h-3 w-3" /> : index + 1}</span>
                {step.label}
              </button>
            );
          })}
        </nav>

        <div className="wm-simple-discovery-body">
          <section className="wm-simple-discovery-main">
            <div className="wm-simple-guidance">
              <Sparkles className="h-4 w-4" />
              <div>
                <p>{currentStep.label} guidance</p>
                <span>{currentStep.helper}</span>
              </div>
            </div>

            {renderStep()}

            <footer className="wm-simple-discovery-footer">
              <button type="button" disabled={isFirstStep} onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div>
                <button type="button" onClick={() => { saveDiscoveryBrief(); navigate(routeCatalogByKey.callCards.path); }}>
                  Open call cards
                </button>

                <button type="button" onClick={openProposal}>
                  <Save className="h-4 w-4" />
                  Save to project / proposal
                </button>

                {isLastStep ? (
                  <button type="button" onClick={openFinder} className="primary">
                    Open Product Finder
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={goNext} className="primary">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </footer>
          </section>

          <aside className="wm-simple-model-panel">
            <div>
              <Monitor className="h-5 w-5" />
              <p>Current model</p>
              <span>{capturedPercent(missingItems.length)}%</span>
            </div>

            <div className="wm-simple-model-lines">
              <ValueLine label="Outcome" value={state.outcome} />
              <ValueLine label="Room" value={state.roomType || "Not captured yet"} />
              <ValueLine label="Product path" value={designDirection} />
              <ListLine label="Devices" values={state.devices} />
              <ValueLine label="Inputs" value={`${inputModel.hdmi} HDMI / ${inputModel.usbC} USB-C / ${inputModel.networkVideo} network`} />
              <ValueLine label="USB topology" value={usbTopology.summary} />
              <ValueLine label="USB risk" value={usbTopology.risk} />
              <ValueLine label="Audio path" value={state.audioPath} />
              <ValueLine label="Cable run" value={state.cableRun} />
            </div>

            <button type="button" onClick={() => setFullModelOpen((open) => !open)}>
              {fullModelOpen ? "Hide full model" : "View full model"}
            </button>

            {fullModelOpen ? (
              <div className="wm-simple-full-model">
                <p>Technical tags</p>
                <div>
                  {inputModel.tags.length ? inputModel.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>No tags yet</span>}
                </div>
                <p>Triggered checks</p>
                <div>
                  {triggeredChecks.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
            ) : null}

            <div className="wm-simple-missing">
              <div>
                <HelpCircle className="h-4 w-4" />
                <p>Open items</p>
              </div>
              <ul>
                {missingItems.length ? missingItems.slice(0, 5).map((item) => <li key={item}>- {item}</li>) : <li>- Ready for product selection.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default DiscoveryPage;
'@

Save-Utf8NoBom -Path $discoveryPath -Content $discovery

Write-Step "Adding simplified Discovery CSS"

$css = Get-Content -LiteralPath $cssPath -Raw
$css = $css -replace "`r`n", "`n"

$block = @'

/* WINGMAN-SIMPLIFIED-DISCOVERY-START */

.wm-simple-discovery-page {
  min-height: calc(100vh - var(--wm-topbar-height) - 24px) !important;
  display: grid !important;
  overflow: hidden !important;
}

.wm-simple-discovery-shell {
  min-height: 0 !important;
  display: grid !important;
  grid-template-rows: auto auto minmax(0, 1fr) !important;
  overflow: hidden !important;
  border: 1px solid rgba(148, 163, 184, 0.24) !important;
  border-radius: 24px !important;
  background: #ffffff !important;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1) !important;
}

.wm-simple-discovery-head {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 16px !important;
  padding: 18px 20px !important;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2) !important;
}

.wm-simple-discovery-head p,
.wm-simple-step > div:first-child > p,
.wm-simple-guidance p {
  margin: 0 !important;
  color: #b45309 !important;
  font-size: 0.68rem !important;
  font-weight: 850 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
}

.wm-simple-discovery-head h1 {
  margin: 5px 0 0 !important;
  color: #0f172a !important;
  font-size: clamp(1.55rem, 2.4vw, 2.4rem) !important;
  line-height: 1 !important;
  font-weight: 850 !important;
  letter-spacing: -0.045em !important;
}

.wm-simple-discovery-head span,
.wm-simple-step > div:first-child > span,
.wm-simple-guidance span {
  display: block !important;
  margin-top: 5px !important;
  color: #64748b !important;
  font-size: 0.86rem !important;
  line-height: 1.42 !important;
}

.wm-simple-discovery-head-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: flex-end !important;
  gap: 8px !important;
}

.wm-simple-discovery-head-actions > span,
.wm-simple-discovery-head-actions > a {
  min-height: 34px !important;
  display: inline-flex !important;
  align-items: center !important;
  border-radius: 999px !important;
  padding: 0 12px !important;
  font-size: 0.78rem !important;
  font-weight: 850 !important;
  text-decoration: none !important;
}

.wm-simple-discovery-head-actions > span {
  border: 1px solid rgba(245, 158, 11, 0.34) !important;
  background: #fff7ed !important;
  color: #b45309 !important;
}

.wm-simple-discovery-head-actions > a {
  border: 1px solid rgba(15, 23, 42, 0.16) !important;
  background: #0f172a !important;
  color: #ffffff !important;
}

.wm-simple-discovery-steps {
  display: flex !important;
  gap: 8px !important;
  overflow-x: auto !important;
  padding: 12px 20px !important;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2) !important;
}

.wm-simple-discovery-steps button {
  min-height: 36px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex: 0 0 auto !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  color: #475569 !important;
  padding: 0 12px !important;
  font-size: 0.8rem !important;
  font-weight: 850 !important;
}

.wm-simple-discovery-steps button span {
  width: 20px !important;
  height: 20px !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: 999px !important;
  background: #f1f5f9 !important;
  color: #0f172a !important;
  font-size: 0.72rem !important;
}

.wm-simple-discovery-steps button.is-active {
  border-color: #0f172a !important;
  background: #0f172a !important;
  color: #ffffff !important;
}

.wm-simple-discovery-steps button.is-complete {
  border-color: rgba(16, 185, 129, 0.32) !important;
  background: #ecfdf5 !important;
  color: #047857 !important;
}

.wm-simple-discovery-body {
  min-height: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 330px !important;
  gap: 14px !important;
  overflow: hidden !important;
  padding: 14px 20px 20px !important;
  background: #f8fafc !important;
}

.wm-simple-discovery-main,
.wm-simple-model-panel {
  min-height: 0 !important;
  overflow-y: auto !important;
  border: 1px solid rgba(148, 163, 184, 0.24) !important;
  border-radius: 22px !important;
  background: #ffffff !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.07) !important;
}

.wm-simple-discovery-main {
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) auto !important;
  gap: 12px !important;
  padding: 14px !important;
}

.wm-simple-guidance {
  display: flex !important;
  gap: 10px !important;
  align-items: flex-start !important;
  border: 1px solid rgba(245, 158, 11, 0.2) !important;
  border-radius: 16px !important;
  background: #fff7ed !important;
  padding: 12px !important;
}

.wm-simple-guidance svg {
  color: #b45309 !important;
  flex: 0 0 auto !important;
  margin-top: 2px !important;
}

.wm-simple-step {
  min-height: 0 !important;
  display: grid !important;
  align-content: start !important;
  gap: 14px !important;
  overflow-y: auto !important;
  padding-right: 4px !important;
}

.wm-simple-step > div:first-child h2 {
  margin: 4px 0 0 !important;
  color: #0f172a !important;
  font-size: clamp(1.3rem, 2.1vw, 2rem) !important;
  line-height: 1.06 !important;
  font-weight: 850 !important;
  letter-spacing: -0.04em !important;
}

.wm-simple-discovery-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)) !important;
  gap: 10px !important;
}

.wm-simple-discovery-grid.compact {
  grid-template-columns: 1fr !important;
}

.wm-simple-discovery-card {
  min-height: 112px !important;
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) !important;
  grid-template-areas:
    "check title"
    "check helper"
    "check tags" !important;
  align-content: start !important;
  gap: 5px 10px !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 13px !important;
  text-align: left !important;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05) !important;
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease !important;
}

.wm-simple-discovery-card:hover {
  border-color: rgba(245, 158, 11, 0.55) !important;
  background: #fffbeb !important;
  transform: translateY(-1px) !important;
}

.wm-simple-discovery-card.is-active {
  border-color: #0f172a !important;
  background: #0f172a !important;
  color: #ffffff !important;
}

.wm-simple-discovery-check {
  grid-area: check !important;
  width: 26px !important;
  height: 26px !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: 999px !important;
  border: 1px solid rgba(148, 163, 184, 0.34) !important;
  background: #f8fafc !important;
  color: #0f172a !important;
  font-size: 0.9rem !important;
  font-weight: 850 !important;
}

.wm-simple-discovery-card strong {
  grid-area: title !important;
  color: inherit !important;
  font-size: 0.96rem !important;
  line-height: 1.18 !important;
  font-weight: 850 !important;
}

.wm-simple-discovery-card small {
  grid-area: helper !important;
  color: inherit !important;
  opacity: 0.72 !important;
  font-size: 0.8rem !important;
  line-height: 1.36 !important;
}

.wm-simple-discovery-tags {
  grid-area: tags !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 5px !important;
  margin-top: 4px !important;
}

.wm-simple-discovery-tags em,
.wm-simple-inference-panel span,
.wm-simple-full-model span {
  border-radius: 999px !important;
  background: #f1f5f9 !important;
  color: #334155 !important;
  padding: 4px 8px !important;
  font-size: 0.68rem !important;
  font-style: normal !important;
  font-weight: 850 !important;
}

.wm-simple-discovery-card.is-active .wm-simple-discovery-tags em {
  background: rgba(255,255,255,0.16) !important;
  color: #ffffff !important;
}

.wm-simple-two-col {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)) !important;
  gap: 12px !important;
}

.wm-simple-discovery-field,
.wm-simple-option-section,
.wm-simple-inference-panel,
.wm-simple-alert,
.wm-simple-review-grid > div {
  border: 1px solid rgba(148, 163, 184, 0.24) !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  padding: 14px !important;
}

.wm-simple-discovery-field > p,
.wm-simple-option-section > p,
.wm-simple-inference-panel > p,
.wm-simple-review-grid p,
.wm-simple-model-panel > div:first-child p,
.wm-simple-missing p,
.wm-simple-full-model p {
  margin: 0 !important;
  color: #0f172a !important;
  font-size: 0.86rem !important;
  font-weight: 850 !important;
}

.wm-simple-discovery-field > span {
  display: block !important;
  margin-top: 4px !important;
  color: #64748b !important;
  font-size: 0.78rem !important;
  line-height: 1.35 !important;
}

.wm-simple-discovery-field > div,
.wm-simple-inference-panel > div,
.wm-simple-full-model > div {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 7px !important;
  margin-top: 10px !important;
}

.wm-simple-discovery-field button {
  min-height: 32px !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  color: #334155 !important;
  padding: 0 10px !important;
  font-size: 0.76rem !important;
  font-weight: 800 !important;
}

.wm-simple-discovery-field button.is-active {
  border-color: #0f172a !important;
  background: #0f172a !important;
  color: #ffffff !important;
}

.wm-simple-alert {
  display: grid !important;
  gap: 10px !important;
}

.wm-simple-alert[data-risk="high"] {
  border-color: rgba(244, 63, 94, 0.35) !important;
  background: #fff1f2 !important;
}

.wm-simple-alert[data-risk="medium"] {
  border-color: rgba(245, 158, 11, 0.35) !important;
  background: #fffbeb !important;
}

.wm-simple-alert[data-risk="low"] {
  border-color: rgba(16, 185, 129, 0.28) !important;
  background: #ecfdf5 !important;
}

.wm-simple-alert > div {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 12px !important;
}

.wm-simple-alert h3,
.wm-simple-review-grid h3 {
  margin: 4px 0 0 !important;
  color: #0f172a !important;
  font-size: 1.1rem !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
}

.wm-simple-alert span {
  border-radius: 999px !important;
  background: rgba(255,255,255,0.85) !important;
  color: #0f172a !important;
  padding: 5px 9px !important;
  font-size: 0.72rem !important;
  font-weight: 850 !important;
}

.wm-simple-alert ul,
.wm-simple-review-grid ul,
.wm-simple-missing ul {
  margin: 0 !important;
  padding-left: 16px !important;
  color: #475569 !important;
  font-size: 0.82rem !important;
  line-height: 1.45 !important;
}

.wm-simple-review-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)) !important;
  gap: 12px !important;
}

.wm-simple-review-grid span {
  display: block !important;
  margin-top: 7px !important;
  color: #64748b !important;
  font-size: 0.82rem !important;
}

.wm-simple-notes {
  min-height: 95px !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 12px !important;
  font-size: 0.88rem !important;
  outline: none !important;
  resize: vertical !important;
}

.wm-simple-review-actions,
.wm-simple-discovery-footer,
.wm-simple-discovery-footer > div {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
}

.wm-simple-review-actions button,
.wm-simple-discovery-footer button {
  min-height: 38px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  border: 1px solid rgba(148, 163, 184, 0.32) !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  color: #334155 !important;
  padding: 0 13px !important;
  font-size: 0.8rem !important;
  font-weight: 850 !important;
}

.wm-simple-discovery-footer {
  justify-content: space-between !important;
  border-top: 1px solid rgba(148, 163, 184, 0.2) !important;
  padding-top: 12px !important;
}

.wm-simple-discovery-footer button.primary,
.wm-simple-review-actions button:first-child {
  border-color: #0f172a !important;
  background: #0f172a !important;
  color: #ffffff !important;
}

.wm-simple-discovery-footer button:disabled {
  opacity: 0.42 !important;
}

.wm-simple-model-panel {
  display: grid !important;
  align-content: start !important;
  gap: 14px !important;
  padding: 15px !important;
  background: #f8fafc !important;
}

.wm-simple-model-panel > div:first-child {
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
}

.wm-simple-model-panel > div:first-child svg {
  color: #64748b !important;
}

.wm-simple-model-panel > div:first-child span {
  margin-left: auto !important;
  border-radius: 999px !important;
  background: #fff7ed !important;
  color: #b45309 !important;
  padding: 5px 9px !important;
  font-size: 0.72rem !important;
  font-weight: 850 !important;
}

.wm-simple-model-lines {
  display: grid !important;
  gap: 11px !important;
}

.wm-simple-model-lines div {
  border-bottom: 1px solid rgba(148, 163, 184, 0.18) !important;
  padding-bottom: 9px !important;
}

.wm-simple-model-lines p {
  margin: 0 !important;
  color: #64748b !important;
  font-size: 0.68rem !important;
  font-weight: 850 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}

.wm-simple-model-lines strong {
  display: block !important;
  margin-top: 4px !important;
  color: #0f172a !important;
  font-size: 0.82rem !important;
  line-height: 1.3 !important;
  font-weight: 780 !important;
}

.wm-simple-model-panel > button {
  min-height: 36px !important;
  border: 1px solid rgba(148, 163, 184, 0.3) !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  color: #334155 !important;
  font-size: 0.78rem !important;
  font-weight: 850 !important;
}

.wm-simple-full-model,
.wm-simple-missing {
  display: grid !important;
  gap: 10px !important;
  border: 1px solid rgba(148, 163, 184, 0.24) !important;
  border-radius: 16px !important;
  background: #ffffff !important;
  padding: 12px !important;
}

.wm-simple-missing > div {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.wm-simple-missing svg {
  color: #64748b !important;
}

@media (max-width: 1180px) {
  .wm-simple-discovery-page,
  .wm-simple-discovery-shell,
  .wm-simple-discovery-body {
    min-height: auto !important;
    overflow: visible !important;
  }

  .wm-simple-discovery-body {
    grid-template-columns: 1fr !important;
  }

  .wm-simple-discovery-main,
  .wm-simple-model-panel,
  .wm-simple-step {
    overflow: visible !important;
  }
}

@media (max-width: 720px) {
  .wm-simple-discovery-head,
  .wm-simple-discovery-footer,
  .wm-simple-discovery-footer > div {
    display: grid !important;
  }

  .wm-simple-discovery-grid,
  .wm-simple-two-col,
  .wm-simple-review-grid {
    grid-template-columns: 1fr !important;
  }
}
/* WINGMAN-SIMPLIFIED-DISCOVERY-END */
'@

if ($css -match "/\* WINGMAN-SIMPLIFIED-DISCOVERY-START \*/[\s\S]*?/\* WINGMAN-SIMPLIFIED-DISCOVERY-END \*/") {
  $css = [regex]::Replace($css, "/\* WINGMAN-SIMPLIFIED-DISCOVERY-START \*/[\s\S]*?/\* WINGMAN-SIMPLIFIED-DISCOVERY-END \*/", $block.Trim(), 1)
} else {
  $css = $css.TrimEnd() + "`n" + $block + "`n"
}

Save-Utf8NoBom -Path $cssPath -Content $css

Write-Step "Running validation"

npm run typecheck
npm run build

Write-Host ""
Write-Host "Simplified Discovery workflow installed." -ForegroundColor Green
Write-Host ""
Write-Host "Test:"
Write-Host "npm run dev"
Write-Host "Open http://127.0.0.1:3000/wingman/discovery"
Write-Host ""
Write-Host "Expected behaviour:"
Write-Host "- 6 clearer pages: Outcome, Room, Devices, Displays, Checks, Review"
Write-Host "- No redundant Main source connection selector"
Write-Host "- Device selection infers HDMI, USB-C, USB host, USB peripheral, NDI and audio tags"
Write-Host "- USB conflict checks appear only when triggered"
Write-Host "- Back/Next saves the current model"
Write-Host "- Finder receives the Discovery brief automatically"
