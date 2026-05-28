import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Cable,
  Camera,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutTemplate,
  Monitor,
  Network,
  PanelTop,
  PanelsTopLeft,
  Settings2,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  WingmanSelectionCard,
  type WingmanSelectionAccent,
} from "../ui/WingmanSelectionCard";
import { WingmanSelectionGrid } from "../ui/WingmanSelectionGrid";
type Option<T extends string> = {
  value: T;
  label: string;
  helper?: string;
  photo?: string;
  photoPosition?: string;
};

type ApplicationKey =
  | "meeting-room"
  | "boardroom"
  | "training-room"
  | "classroom"
  | "lecture-theatre"
  | "divisible-room"
  | "auditorium"
  | "house-of-worship"
  | "retail-showroom"
  | "reception-signage"
  | "command-control"
  | "hospitality"
  | "other";

type RoomSizeKey = "small" | "medium" | "large" | "extra-large" | "unknown";
type ConstructionKey = "new-build" | "retrofit" | "refresh" | "restricted" | "unknown";
type LevelKey = "single-level" | "multi-level" | "raked-seating" | "unknown";
type UsbHostKey = "none" | "usb-2-host" | "usb-3-host";
type ResolutionKey = "1080p" | "4k30" | "4k60-420" | "4k60-444" | "ultrawide" | "led-defined" | "unknown";
type ScalingKey = "none" | "display" | "switcher" | "video-wall" | "mixed" | "unknown";
type LatencyKey = "presentation" | "conferencing" | "live-camera" | "simulation" | "broadcast" | "unknown";

type LocationKey =
  | "table"
  | "floor-box"
  | "wall-plate"
  | "lectern"
  | "credenza"
  | "local-rack"
  | "central-rack"
  | "remote-comms"
  | "display-wall"
  | "ceiling"
  | "operator-position"
  | "overflow-area"
  | "mobile-rack"
  | "mobile-lectern"
  | "network"
  | "unknown";

type CableAccessKey =
  | "ceiling-void"
  | "floor-boxes"
  | "wall-containment"
  | "surface-trunking"
  | "existing-cat"
  | "existing-fibre"
  | "limited-route"
  | "unknown";

type OutputType =
  | "single-lcd"
  | "interactive-display"
  | "dual-lcd"
  | "multiple-lcd"
  | "lcd-video-wall"
  | "led-wall"
  | "single-projector"
  | "short-throw-projector"
  | "dual-projector"
  | "repeater"
  | "overflow"
  | "confidence-monitor"
  | "preview-monitor"
  | "stream-record-output";

type OutputBehaviour =
  | "duplicated"
  | "independent"
  | "dual-display"
  | "mst-extended"
  | "matrixed"
  | "single-canvas-wall"
  | "multi-window-wall"
  | "multiview"
  | "overflow-feed"
  | "preview-program";

type OutputFeedPoint =
  | "direct-source"
  | "display-input"
  | "projector-input"
  | "local-rack"
  | "central-rack"
  | "presentation-switcher"
  | "matrix"
  | "hdbaset-receiver"
  | "avoip-decoder"
  | "network-switch"
  | "video-wall-processor"
  | "streaming-encoder"
  | "unknown";

type SourceKind =
  | "byod"
  | "usb-c-laptop"
  | "hdmi-laptop"
  | "wireless-presentation"
  | "room-pc"
  | "mtr-device"
  | "media-player"
  | "external-feed"
  | "usb-camera"
  | "hdmi-ptz-camera"
  | "ndi-camera"
  | "microphone"
  | "audio-dsp"
  | "camera-bridge"
  | "streaming-recorder"
  | "interactive-display-touch"
  | "other";

type ConnectionPoint =
  | "direct"
  | "table-box"
  | "floor-box"
  | "wall-plate"
  | "lectern-plate"
  | "rack-equipment"
  | "presentation-switcher"
  | "matrix"
  | "hdbaset-receiver"
  | "avoip-endpoint"
  | "network-switch"
  | "usb-bridge"
  | "camera-bridge"
  | "dsp"
  | "display-input"
  | "video-wall-processor"
  | "unknown";

type DestinationKind =
  | "main-display"
  | "dual-displays"
  | "video-wall"
  | "projector"
  | "presentation-switcher"
  | "matrix-rack"
  | "avoip-network"
  | "network-switch"
  | "uc-system"
  | "mtr-device"
  | "camera-bridge"
  | "microphone-dsp"
  | "room-audio"
  | "streaming-recording"
  | "multiview"
  | "repeater-output"
  | "overflow-output"
  | "other";

type DistanceBand =
  | "under-2m"
  | "under-5m"
  | "under-10m"
  | "under-30m"
  | "under-50m"
  | "under-70m"
  | "over-100m"
  | "unknown";

type TransportKey =
  | "hdmi"
  | "usb-c"
  | "usb"
  | "hdbaset"
  | "avoip"
  | "ndi"
  | "network"
  | "audio"
  | "control"
  | "power"
  | "wireless";

type ProcessingKey =
  | "scaling"
  | "seamless-switching"
  | "multiview"
  | "video-wall-processing"
  | "led-processor-feed"
  | "mst"
  | "source-preview"
  | "pip"
  | "audio-deembed"
  | "audio-embed"
  | "usb-routing"
  | "usb-switching"
  | "camera-bridging"
  | "ndi-ingest"
  | "streaming-recording"
  | "control-integration";

type ControlKey =
  | "display-remote"
  | "touch-panel"
  | "mtr-touch-controller"
  | "keypad"
  | "mobile-app"
  | "third-party-control"
  | "auto-switching"
  | "manual-switching"
  | "scheduled-content"
  | "unknown";

type OutputItem = {
  id: string;
  type: OutputType;
  location: LocationKey;
  behaviour: OutputBehaviour;
  distance: DistanceBand;
  feedPoint: OutputFeedPoint;
  usbHost: UsbHostKey;
  notes: string;
  pairedOutputGroupId?: string;
};

type SignalPath = {
  id: string;
  sourceKind: SourceKind;
  sourceLocation: LocationKey;
  via: ConnectionPoint;
  destination: DestinationKind;
  destinationOutputId?: string;
  destinationLocation: LocationKey;
  distance: DistanceBand;
  transports: TransportKey[];
  notes: string;
};

type EngineeringBrief = {
  application: ApplicationKey;
  roomSize: RoomSizeKey;
  construction: ConstructionKey;
  levels: LevelKey;
  divisible: boolean;
  globalResolution: ResolutionKey;
  scaling: ScalingKey;
  latency: LatencyKey;
  cableAccess: CableAccessKey[];
  avPositions: LocationKey[];
  outputs: OutputItem[];
  sources: SourceKind[];
  processing: ProcessingKey[];
  control: ControlKey[];
  paths: SignalPath[];
  notes: string;
};

type Recommendation = {
  title: string;
  confidence: "High" | "Medium" | "Needs validation";
  reason: string;
  productDirection: string;
};

const STORAGE_KEY = "wingman.discovery.engineeringCanvas.v1";

const applications: Option<ApplicationKey>[] = [
  { value: "meeting-room", label: "Meeting room", helper: "BYOD, UC, simple display operation" },
  { value: "boardroom", label: "Boardroom", helper: "Dual display, MTR, table inputs, camera/audio" },
  { value: "training-room", label: "Training room", helper: "Lectern, presenter position, camera, repeaters" },
  { value: "classroom", label: "Classroom", helper: "Teacher position, display/projector, simple source switching" },
  { value: "lecture-theatre", label: "Lecture theatre", helper: "Longer cable paths, cameras, projection, capture" },
  { value: "divisible-room", label: "Divisible room", helper: "Combined/separate modes, matrixing, zoned audio" },
  { value: "auditorium", label: "Auditorium", helper: "Large-scale display, cameras, long-distance routing" },
  { value: "house-of-worship", label: "House of worship", helper: "Cameras, streaming, confidence, multiview" },
  { value: "retail-showroom", label: "Retail / showroom", helper: "Signage, video wall, multiple displays" },
  { value: "reception-signage", label: "Reception / signage", helper: "Media player, display, simple routing" },
  { value: "command-control", label: "Command / control", helper: "Multiview, AVoIP, multiple operators" },
  { value: "hospitality", label: "Hospitality", helper: "Simple operation, hidden kit, repeatable spaces" },
  { value: "other", label: "Other", helper: "Custom application" },
];

const roomSizes: Option<RoomSizeKey>[] = [
  { value: "small", label: "Small <10m" },
  { value: "medium", label: "Medium <25m" },
  { value: "large", label: "Large <50m" },
  { value: "extra-large", label: "Extra large 50m+" },
  { value: "unknown", label: "Unknown" },
];

const constructionOptions: Option<ConstructionKey>[] = [
  { value: "new-build", label: "New build" },
  { value: "retrofit", label: "Retrofit" },
  { value: "refresh", label: "Existing AV refresh" },
  { value: "restricted", label: "Restricted / listed / difficult construction" },
  { value: "unknown", label: "Unknown" },
];

const levelOptions: Option<LevelKey>[] = [
  { value: "single-level", label: "Single level" },
  { value: "multi-level", label: "Multilevel" },
  { value: "raked-seating", label: "Raked seating / tiered" },
  { value: "unknown", label: "Unknown" },
];

const cableAccessOptions: Option<CableAccessKey>[] = [
  { value: "ceiling-void", label: "Ceiling void" },
  { value: "floor-boxes", label: "Floor boxes" },
  { value: "wall-containment", label: "Wall containment" },
  { value: "surface-trunking", label: "Surface trunking likely" },
  { value: "existing-cat", label: "Existing Cat cable" },
  { value: "existing-fibre", label: "Existing fibre" },
  { value: "limited-route", label: "Limited cable route" },
  { value: "unknown", label: "Unknown" },
];

const avPositionOptions: Option<LocationKey>[] = [
  { value: "table", label: "Meeting table / BYOD point" },
  { value: "floor-box", label: "Floor box" },
  { value: "wall-plate", label: "Wall plate" },
  { value: "lectern", label: "Lectern / presenter position" },
  { value: "credenza", label: "Credenza" },
  { value: "local-rack", label: "Equipment rack / AV furniture" },
  { value: "central-rack", label: "Central rack" },
  { value: "remote-comms", label: "Remote comms room" },
  { value: "display-wall", label: "Display wall" },
  { value: "ceiling", label: "Ceiling devices" },
  { value: "operator-position", label: "Operator position" },
  { value: "overflow-area", label: "Overflow area" },
  { value: "mobile-rack", label: "Mobile rack" },
  { value: "mobile-lectern", label: "Mobile lectern" },
  { value: "network", label: "Network / IT position" },
];

const primaryAvPositionValues: LocationKey[] = [
  "table",
  "floor-box",
  "lectern",
  "local-rack",
  "display-wall",
  "ceiling",
  "network",
];

const advancedAvPositionValues: LocationKey[] = [
  "wall-plate",
  "credenza",
  "central-rack",
  "remote-comms",
  "operator-position",
  "overflow-area",
  "mobile-rack",
  "mobile-lectern",
];

const primaryAvPositionOptions = avPositionOptions.filter((option) => primaryAvPositionValues.includes(option.value));
const advancedAvPositionOptions = avPositionOptions.filter((option) => advancedAvPositionValues.includes(option.value));

const outputOptions: Option<OutputType>[] = [
  { value: "single-lcd", label: "LCD Display" },
  { value: "interactive-display", label: "Interactive Display" },
  { value: "dual-lcd", label: "Dual LCD displays" },
  { value: "lcd-video-wall", label: "LCD Video Wall" },
  { value: "led-wall", label: "LED Wall" },
  { value: "single-projector", label: "Ceiling Projector" },
  { value: "short-throw-projector", label: "Short Throw Projector" },
  { value: "dual-projector", label: "Dual projectors" },
  { value: "repeater", label: "Repeater display" },
  { value: "overflow", label: "Overflow Room Display" },
  { value: "preview-monitor", label: "Preview monitor" },
  { value: "stream-record-output", label: "Streaming / recording output" },
];

const outputBehaviourOptions: Option<OutputBehaviour>[] = [
  { value: "duplicated", label: "Duplicated image" },
  { value: "independent", label: "Independent source" },
  { value: "dual-display", label: "Dual display presentation" },
  { value: "mst-extended", label: "MST / extended desktop" },
  { value: "matrixed", label: "Matrixed routing" },
  { value: "single-canvas-wall", label: "Single canvas wall" },
  { value: "multi-window-wall", label: "Multiple windows on wall" },
  { value: "multiview", label: "Multiview composition" },
  { value: "overflow-feed", label: "Overflow / repeater feed" },
  { value: "preview-program", label: "Preview / program" },
];
const outputFeedOptions: Option<OutputFeedPoint>[] = [
  { value: "direct-source", label: "Direct from source" },
  { value: "display-input", label: "Direct to display input" },
  { value: "projector-input", label: "Direct to projector input" },
  { value: "local-rack", label: "From local rack / credenza" },
  { value: "central-rack", label: "From central rack" },
  { value: "presentation-switcher", label: "From presentation switcher" },
  { value: "matrix", label: "From matrix output" },
  { value: "hdbaset-receiver", label: "Via HDBaseT receiver" },
  { value: "avoip-decoder", label: "Via AVoIP decoder" },
  { value: "network-switch", label: "Via network switch" },
  { value: "video-wall-processor", label: "Via video wall processor" },
  { value: "streaming-encoder", label: "From streaming / recording system" },
  { value: "unknown", label: "Unknown / needs review" },
];

const resolutionOptions: Option<ResolutionKey>[] = [
  { value: "1080p", label: "1080p" },
  { value: "4k30", label: "4K30" },
  { value: "4k60-420", label: "4K60 4:2:0" },
  { value: "4k60-444", label: "4K60 4:4:4" },
  { value: "ultrawide", label: "Ultrawide" },
  { value: "led-defined", label: "LED processor-defined" },
  { value: "unknown", label: "Unknown" },
];

const scalingOptions: Option<ScalingKey>[] = [
  { value: "none", label: "No scaling expected" },
  { value: "display", label: "Scaling at display" },
  { value: "switcher", label: "Scaling at switcher / matrix" },
  { value: "video-wall", label: "Video wall scaling" },
  { value: "mixed", label: "Mixed output scaling" },
  { value: "unknown", label: "Unknown" },
];

const latencyOptions: Option<LatencyKey>[] = [
  { value: "presentation", label: "Normal presentation" },
  { value: "conferencing", label: "Conferencing" },
  { value: "live-camera", label: "Live camera / IMAG" },
  { value: "simulation", label: "Gaming / simulation" },
  { value: "broadcast", label: "Broadcast / production" },
  { value: "unknown", label: "Unknown" },
];

const sourceOptions: Option<SourceKind>[] = [
  { value: "byod", label: "BYOD laptop" },
  { value: "usb-c-laptop", label: "USB-C laptop" },
  { value: "hdmi-laptop", label: "HDMI laptop" },
  { value: "wireless-presentation", label: "Wireless presentation" },
  { value: "room-pc", label: "Room PC / OPS" },
  { value: "mtr-device", label: "Microsoft Teams Room Device" },
  { value: "media-player", label: "Media player / signage" },
  { value: "external-feed", label: "External feed" },
  { value: "usb-camera", label: "USB camera" },
  { value: "hdmi-ptz-camera", label: "HDMI PTZ camera" },
  { value: "ndi-camera", label: "NDI PTZ camera" },
  { value: "microphone", label: "Microphone" },
  { value: "audio-dsp", label: "DSP / audio feed" },
  { value: "camera-bridge", label: "Camera bridge" },
  { value: "streaming-recorder", label: "Streaming / recorder" },
  { value: "interactive-display-touch", label: "Interactive display touch return" },
  { value: "other", label: "Other source" },
];

const connectionPointOptions: Option<ConnectionPoint>[] = [
  { value: "direct", label: "Direct" },
  { value: "table-box", label: "Table box" },
  { value: "floor-box", label: "Floor box" },
  { value: "wall-plate", label: "Wall plate" },
  { value: "lectern-plate", label: "Lectern plate" },
  { value: "rack-equipment", label: "Rack equipment" },
  { value: "presentation-switcher", label: "Presentation switcher" },
  { value: "matrix", label: "Matrix" },
  { value: "hdbaset-receiver", label: "HDBaseT receiver" },
  { value: "avoip-endpoint", label: "AVoIP endpoint" },
  { value: "network-switch", label: "Network switch" },
  { value: "usb-bridge", label: "USB bridge" },
  { value: "camera-bridge", label: "Camera bridge" },
  { value: "dsp", label: "DSP" },
  { value: "display-input", label: "Display input" },
  { value: "video-wall-processor", label: "Video wall processor" },
  { value: "unknown", label: "Unknown" },
];

const destinationOptions: Option<DestinationKind>[] = [
  { value: "main-display", label: "Main display" },
  { value: "dual-displays", label: "Dual displays" },
  { value: "video-wall", label: "Video wall" },
  { value: "projector", label: "Projector" },
  { value: "presentation-switcher", label: "Presentation switcher" },
  { value: "matrix-rack", label: "Matrix / rack system" },
  { value: "avoip-network", label: "AVoIP network" },
  { value: "network-switch", label: "Network switch" },
  { value: "uc-system", label: "UC system" },
  { value: "mtr-device", label: "MTR device" },
  { value: "camera-bridge", label: "Camera bridge" },
  { value: "microphone-dsp", label: "Microphone / DSP" },
  { value: "room-audio", label: "Room audio" },
  { value: "streaming-recording", label: "Streaming / recording" },
  { value: "multiview", label: "Multiview" },
  { value: "repeater-output", label: "Repeater output" },
  { value: "overflow-output", label: "Overflow output" },
  { value: "other", label: "Other" },
];

const distanceOptions: Option<DistanceBand>[] = [
  { value: "under-2m", label: "Under 2m" },
  { value: "under-5m", label: "Under 5m" },
  { value: "under-10m", label: "Under 10m" },
  { value: "under-30m", label: "Under 30m" },
  { value: "under-50m", label: "Under 50m" },
  { value: "under-70m", label: "Under 70m" },
  { value: "over-100m", label: "100m+" },
  { value: "unknown", label: "Unknown" },
];

const usbHostOptions: Option<UsbHostKey>[] = [
  { value: "none", label: "Select USB host" },
  { value: "usb-2-host", label: "USB 2.0 Host device" },
  { value: "usb-3-host", label: "USB 3.0 Host device" },
];

const transportOptions: Option<TransportKey>[] = [
  { value: "hdmi", label: "HDMI" },
  { value: "usb-c", label: "USB-C" },
  { value: "usb", label: "USB" },
  { value: "hdbaset", label: "HDBaseT" },
  { value: "avoip", label: "AVoIP" },
  { value: "ndi", label: "NDI" },
  { value: "network", label: "Network" },
  { value: "audio", label: "Audio" },
  { value: "control", label: "Control" },
  { value: "power", label: "Power" },
  { value: "wireless", label: "Wireless" },
];

const processingOptions: Option<ProcessingKey>[] = [
  { value: "scaling", label: "Scaling" },
  { value: "seamless-switching", label: "Seamless switching" },
  { value: "multiview", label: "Multiview" },
  { value: "video-wall-processing", label: "Video wall processing" },
  { value: "led-processor-feed", label: "LED processor feed" },
  { value: "mst", label: "MST / extended desktop" },
  { value: "source-preview", label: "Source preview" },
  { value: "pip", label: "Picture-in-picture" },
  { value: "audio-deembed", label: "Audio de-embed" },
  { value: "audio-embed", label: "Audio embed" },
  { value: "usb-routing", label: "USB routing" },
  { value: "usb-switching", label: "USB switching" },
  { value: "camera-bridging", label: "Camera bridging" },
  { value: "ndi-ingest", label: "NDI ingest" },
  { value: "streaming-recording", label: "Streaming / recording" },
  { value: "control-integration", label: "Control integration" },
];

const controlOptions: Option<ControlKey>[] = [
  { value: "display-remote", label: "Display remote" },
  { value: "touch-panel", label: "Touch panel" },
  { value: "mtr-touch-controller", label: "MTR touch controller" },
  { value: "keypad", label: "Keypad" },
  { value: "mobile-app", label: "Mobile app" },
  { value: "third-party-control", label: "Third-party control" },
  { value: "auto-switching", label: "Auto switching" },
  { value: "manual-switching", label: "Manual switching" },
  { value: "scheduled-content", label: "Scheduled content" },
  { value: "unknown", label: "Unknown" },
];

function applicationIcon(value: ApplicationKey): LucideIcon {
  if (value === "meeting-room" || value === "boardroom") return Users;
  if (value === "training-room" || value === "classroom" || value === "lecture-theatre") return ClipboardList;
  if (value === "divisible-room" || value === "auditorium") return PanelsTopLeft;
  if (value === "house-of-worship") return Building2;
  if (value === "retail-showroom") return LayoutTemplate;
  if (value === "reception-signage") return Monitor;
  if (value === "command-control") return Network;
  if (value === "hospitality") return Building2;
  return HelpCircle;
}

function applicationAccent(value: ApplicationKey): WingmanSelectionAccent {
  if (value === "meeting-room" || value === "boardroom") return "cyan";
  if (value === "training-room" || value === "classroom" || value === "lecture-theatre") return "blue";
  if (value === "divisible-room" || value === "auditorium") return "purple";
  if (value === "retail-showroom" || value === "reception-signage") return "teal";
  if (value === "command-control") return "green";
  if (value === "house-of-worship" || value === "hospitality") return "amber";
  return "cyan";
}

function outputIcon(value: OutputType): LucideIcon {
  if (value.includes("projector")) return Monitor;
  if (value === "lcd-video-wall" || value === "led-wall") return PanelTop;
  if (value === "interactive-display") return Sparkles;
  if (value === "stream-record-output" || value === "preview-monitor") return Camera;
  if (value === "dual-lcd" || value === "multiple-lcd") return PanelsTopLeft;
  return Monitor;
}

function outputAccent(value: OutputType): WingmanSelectionAccent {
  if (value === "lcd-video-wall" || value === "led-wall") return "purple";
  if (value === "interactive-display") return "teal";
  if (value.includes("projector")) return "blue";
  if (value === "stream-record-output" || value === "preview-monitor") return "green";
  return "cyan";
}

function sourceIcon(value: SourceKind): LucideIcon {
  if (value.includes("camera")) return Camera;
  if (value.includes("microphone") || value.includes("audio")) return Cable;
  if (value.includes("wireless") || value.includes("ndi")) return Network;
  if (value.includes("streaming")) return FileText;
  if (value.includes("touch")) return Sparkles;
  if (value.includes("room-pc") || value.includes("mtr")) return Monitor;
  return Cable;
}

function sourceAccent(value: SourceKind): WingmanSelectionAccent {
  if (value.includes("camera") || value.includes("ndi")) return "green";
  if (value.includes("audio") || value.includes("microphone")) return "amber";
  if (value.includes("wireless") || value.includes("streaming")) return "purple";
  if (value.includes("usb")) return "teal";
  return "cyan";
}

function genericOptionIcon(value: string): LucideIcon {
  if (value.includes("network") || value.includes("fibre") || value.includes("avoip") || value.includes("ndi")) return Network;
  if (value.includes("display") || value.includes("wall") || value.includes("projector")) return Monitor;
  if (value.includes("control") || value.includes("switch")) return Settings2;
  if (value.includes("rack") || value.includes("room") || value.includes("position")) return Building2;
  if (value.includes("camera") || value.includes("stream")) return Camera;
  return Cable;
}

function genericOptionAccent(value: string): WingmanSelectionAccent {
  if (value.includes("unknown") || value.includes("limited")) return "red";
  if (value.includes("network") || value.includes("fibre") || value.includes("avoip") || value.includes("ndi")) return "green";
  if (value.includes("wall") || value.includes("multiview") || value.includes("video")) return "purple";
  if (value.includes("usb") || value.includes("touch")) return "teal";
  if (value.includes("audio") || value.includes("control")) return "amber";
  return "blue";
}

const optionLabel = <T extends string>(options: Option<T>[], value: T) => {
  return options.find((option) => option.value === value)?.label ?? value;
};

function optionSubset<T extends string>(options: Option<T>[], values: T[], currentValue?: T) {
  const filtered = options.filter((option) => values.includes(option.value));

  if (!currentValue || filtered.some((option) => option.value === currentValue)) {
    return filtered;
  }

  const currentOption = options.find((option) => option.value === currentValue);

  if (!currentOption) {
    return filtered;
  }

  return [currentOption, ...filtered];
}

function getDefaultOutputFeedPoint(type: OutputType): OutputFeedPoint {
  if (type === "lcd-video-wall" || type === "led-wall") {
    return "video-wall-processor";
  }

  if (type === "single-projector" || type === "short-throw-projector" || type === "dual-projector") {
    return "hdbaset-receiver";
  }

  if (type === "repeater" || type === "overflow") {
    return "hdbaset-receiver";
  }

  if (type === "stream-record-output" || type === "preview-monitor") {
    return "streaming-encoder";
  }

  return "presentation-switcher";
}

function getOutputLocationValues(type: OutputType): LocationKey[] {
  if (type === "single-projector" || type === "short-throw-projector" || type === "dual-projector") {
    return ["ceiling", "display-wall", "mobile-lectern", "unknown"];
  }

  if (type === "repeater" || type === "overflow") {
    return ["overflow-area", "display-wall", "remote-comms", "unknown"];
  }

  if (type === "stream-record-output" || type === "preview-monitor") {
    return ["local-rack", "central-rack", "operator-position", "remote-comms", "unknown"];
  }

  if (type === "lcd-video-wall" || type === "led-wall") {
    return ["display-wall", "remote-comms", "unknown"];
  }

  return ["display-wall", "table", "mobile-rack", "unknown"];
}

function getOutputLocationSelectOptions(output: OutputItem) {
  return optionSubset(avPositionOptions, getOutputLocationValues(output.type), output.location);
}

function getOutputBehaviourValues(type: OutputType): OutputBehaviour[] {
  if (type === "lcd-video-wall" || type === "led-wall") {
    return ["single-canvas-wall", "multi-window-wall", "multiview", "matrixed"];
  }

  if (type === "dual-lcd") {
    return ["duplicated", "dual-display", "independent", "mst-extended", "matrixed"];
  }

  if (type === "single-projector" || type === "short-throw-projector" || type === "dual-projector") {
    return ["duplicated", "independent", "preview-program", "overflow-feed"];
  }

  if (type === "repeater" || type === "overflow") {
    return ["duplicated", "overflow-feed", "matrixed"];
  }

  if (type === "preview-monitor" || type === "stream-record-output") {
    return ["preview-program", "duplicated", "multiview"];
  }

  return ["duplicated", "independent", "dual-display", "matrixed"];
}

function getOutputBehaviourSelectOptions(output: OutputItem) {
  return optionSubset(outputBehaviourOptions, getOutputBehaviourValues(output.type), output.behaviour);
}

function getOutputFeedValues(type: OutputType): OutputFeedPoint[] {
  if (type === "lcd-video-wall" || type === "led-wall") {
    return ["video-wall-processor", "matrix", "avoip-decoder", "central-rack", "unknown"];
  }

  if (type === "single-projector" || type === "short-throw-projector" || type === "dual-projector") {
    return ["hdbaset-receiver", "avoip-decoder", "projector-input", "local-rack", "central-rack", "unknown"];
  }

  if (type === "repeater" || type === "overflow") {
    return ["hdbaset-receiver", "avoip-decoder", "matrix", "presentation-switcher", "local-rack", "unknown"];
  }

  if (type === "stream-record-output" || type === "preview-monitor") {
    return ["streaming-encoder", "matrix", "network-switch", "local-rack", "central-rack", "unknown"];
  }

  return ["presentation-switcher", "matrix", "hdbaset-receiver", "avoip-decoder", "display-input", "direct-source", "local-rack", "unknown"];
}

function getOutputFeedSelectOptions(output: OutputItem) {
  return optionSubset(outputFeedOptions, getOutputFeedValues(output.type), output.feedPoint);
}

function getOutputConnectionSummary(output: OutputItem) {
  const outputName = optionLabel(outputOptions, output.type);
  const feedPoint = optionLabel(outputFeedOptions, output.feedPoint);
  const location = optionLabel(avPositionOptions, output.location);
  const distance = optionLabel(distanceOptions, output.distance);

  if (output.feedPoint === "hdbaset-receiver") {
    return `${feedPoint} feeds ${outputName} at ${location}. Allow one HDBaseT receiver/output path. Approx. route: ${distance}.`;
  }

  if (output.feedPoint === "avoip-decoder") {
    return `${feedPoint} feeds ${outputName} at ${location}. Allow one AVoIP decoder endpoint and network switch capacity. Approx. route: ${distance}.`;
  }

  if (output.feedPoint === "video-wall-processor") {
    return `${feedPoint} feeds ${outputName} at ${location}. Launch the Video Wall configurator and confirm wall processing/canvas behaviour. Approx. route: ${distance}.`;
  }

  if (output.feedPoint === "presentation-switcher" || output.feedPoint === "matrix") {
    return `${feedPoint} feeds ${outputName} at ${location}. Count this as an output from the switching/routing system. Approx. route: ${distance}.`;
  }

  return `${feedPoint} feeds ${outputName} at ${location}. Approx. route: ${distance}.`;
}

function getSourceLocationValues(sourceKind: SourceKind): LocationKey[] {
  if (sourceKind === "mtr-device" || sourceKind === "room-pc" || sourceKind === "audio-dsp" || sourceKind === "streaming-recorder") {
    return ["local-rack", "central-rack", "credenza", "display-wall", "unknown"];
  }

  if (sourceKind === "byod" || sourceKind === "usb-c-laptop" || sourceKind === "hdmi-laptop") {
    return ["table", "floor-box", "wall-plate", "lectern", "credenza", "unknown"];
  }

  if (sourceKind === "usb-camera" || sourceKind === "hdmi-ptz-camera" || sourceKind === "ndi-camera") {
    return ["ceiling", "display-wall", "table", "remote-comms", "unknown"];
  }

  if (sourceKind === "microphone") {
    return ["table", "ceiling", "lectern", "local-rack", "unknown"];
  }

  if (sourceKind === "media-player" || sourceKind === "wireless-presentation") {
    return ["local-rack", "central-rack", "credenza", "display-wall", "unknown"];
  }

  if (sourceKind === "external-feed") {
    return ["wall-plate", "floor-box", "lectern", "remote-comms", "unknown"];
  }

  return ["table", "floor-box", "wall-plate", "lectern", "credenza", "local-rack", "central-rack", "display-wall", "ceiling", "remote-comms", "unknown"];
}

function getSourceLocationSelectOptions(path: SignalPath) {
  return optionSubset(avPositionOptions, getSourceLocationValues(path.sourceKind), path.sourceLocation);
}

function getConnectionPointValues(path: SignalPath): ConnectionPoint[] {
  if (path.sourceKind === "ndi-camera") {
    return ["network-switch", "avoip-endpoint", "unknown"];
  }

  if (path.sourceKind === "usb-camera") {
    return ["usb-bridge", "direct", "rack-equipment", "unknown"];
  }

  if (path.sourceKind === "hdmi-ptz-camera") {
    return ["hdbaset-receiver", "rack-equipment", "avoip-endpoint", "camera-bridge", "unknown"] as ConnectionPoint[];
  }

  if (path.sourceKind === "microphone" || path.sourceKind === "audio-dsp") {
    return ["dsp", "usb-bridge", "rack-equipment", "network-switch", "unknown"];
  }

  if (path.sourceKind === "byod" || path.sourceKind === "usb-c-laptop" || path.sourceKind === "hdmi-laptop") {
    if (path.sourceLocation === "table") {
      return ["table-box", "presentation-switcher", "direct", "unknown"];
    }

    if (path.sourceLocation === "floor-box") {
      return ["floor-box", "presentation-switcher", "hdbaset-receiver", "unknown"] as ConnectionPoint[];
    }

    if (path.sourceLocation === "wall-plate") {
      return ["wall-plate", "presentation-switcher", "hdbaset-receiver", "unknown"] as ConnectionPoint[];
    }

    if (path.sourceLocation === "lectern") {
      return ["lectern-plate", "presentation-switcher", "hdbaset-receiver", "unknown"] as ConnectionPoint[];
    }

    return ["presentation-switcher", "direct", "unknown"];
  }

  if (path.sourceKind === "mtr-device") {
    return ["rack-equipment", "presentation-switcher", "usb-bridge", "dsp", "network-switch", "unknown"];
  }

  return ["direct", "rack-equipment", "presentation-switcher", "matrix", "avoip-endpoint", "network-switch", "unknown"];
}

function getConnectionPointSelectOptions(path: SignalPath) {
  return optionSubset(connectionPointOptions, getConnectionPointValues(path), path.via);
}

function getTransportValues(path: SignalPath): TransportKey[] {
  if (path.sourceKind === "ndi-camera") {
    return ["ndi", "network", "control", "power"];
  }

  if (path.sourceKind === "usb-camera" || path.sourceKind === "interactive-display-touch") {
    return ["usb", "power"];
  }

  if (path.sourceKind === "microphone") {
    return ["audio", "usb", "network", "power"];
  }

  if (path.via === "hdbaset-receiver") {
    return ["hdmi", "hdbaset", "usb", "audio", "control", "power"];
  }

  if (path.via === "avoip-endpoint" || path.via === "network-switch") {
    return ["avoip", "network", "ndi", "audio", "control", "power"];
  }

  if (path.sourceKind === "mtr-device") {
    return ["hdmi", "usb", "network", "audio", "control", "power"];
  }

  if (path.sourceKind === "byod" || path.sourceKind === "usb-c-laptop") {
    return ["usb-c", "hdmi", "usb", "audio", "power"];
  }

  return ["hdmi", "usb-c", "usb", "hdbaset", "avoip", "network", "audio", "control", "power"];
}

function getTransportSelectOptions(path: SignalPath) {
  return optionSubset(transportOptions, getTransportValues(path));
}

function isVideoWallConfiguratorOutput(type: OutputType) {
  return type === "led-wall" || type === "lcd-video-wall";
}

function openVideoWallWizard(type: OutputType) {
  if (!isVideoWallConfiguratorOutput(type)) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  const handoff = {
    source: "discovery",
    outputType: type,
    requestedAt: new Date().toISOString(),
  };

  window.localStorage.setItem("wingman.videowall.handoff", JSON.stringify(handoff));

  window.dispatchEvent(
    new CustomEvent("wingman:open-videowall-wizard", {
      detail: handoff,
    }),
  );

  window.setTimeout(() => {
    if (window.location.pathname !== "/wingman/videowall") {
      window.location.assign("/wingman/videowall");
    }
  }, 120);
}

const outputOptionSet = (...values: OutputType[]) => values;

function getTypicalOutputTypes(application: ApplicationKey, roomSize: RoomSizeKey): OutputType[] {
  if (application === "meeting-room") {
    if (roomSize === "small" || roomSize === "unknown") {
      return outputOptionSet("single-lcd", "interactive-display", "dual-lcd");
    }

    return outputOptionSet("single-lcd", "interactive-display", "dual-lcd", "stream-record-output");
  }

  if (application === "boardroom") {
    if (roomSize === "small") {
      return outputOptionSet("single-lcd", "interactive-display", "dual-lcd");
    }

    return outputOptionSet("single-lcd", "interactive-display", "dual-lcd", "overflow", "stream-record-output");
  }

  if (application === "training-room" || application === "classroom") {
    if (roomSize === "small") {
      return outputOptionSet("single-lcd", "interactive-display", "dual-lcd", "single-projector", "short-throw-projector");
    }

    return outputOptionSet(
      "single-lcd",
      "interactive-display",
      "dual-lcd",
      "single-projector",
      "short-throw-projector",
      "dual-projector",
      "repeater",
      "overflow",
      "stream-record-output",
    );
  }

  if (application === "lecture-theatre" || application === "auditorium" || application === "house-of-worship") {
    return outputOptionSet(
      "single-projector",
      "short-throw-projector",
      "dual-projector",
      "single-lcd",
      "dual-lcd",
      "led-wall",
      "repeater",
      "overflow",
      "preview-monitor",
      "stream-record-output",
    );
  }

  if (application === "divisible-room") {
    if (roomSize === "small") {
      return outputOptionSet("single-lcd", "interactive-display", "dual-lcd");
    }

    return outputOptionSet(
      "single-lcd",
      "dual-lcd",
      "single-projector",
      "short-throw-projector",
      "dual-projector",
      "repeater",
      "overflow",
      "stream-record-output",
    );
  }

  if (application === "retail-showroom") {
    return outputOptionSet("single-lcd", "dual-lcd", "lcd-video-wall", "led-wall", "stream-record-output");
  }

  if (application === "reception-signage") {
    if (roomSize === "small" || roomSize === "unknown") {
      return outputOptionSet("single-lcd", "interactive-display", "dual-lcd");
    }

    return outputOptionSet("single-lcd", "interactive-display", "dual-lcd", "lcd-video-wall", "led-wall");
  }

  if (application === "command-control") {
    return outputOptionSet("dual-lcd", "lcd-video-wall", "led-wall", "preview-monitor", "overflow", "stream-record-output");
  }

  if (application === "hospitality") {
    if (roomSize === "small" || roomSize === "unknown") {
      return outputOptionSet("single-lcd", "interactive-display", "dual-lcd");
    }

    return outputOptionSet("single-lcd", "interactive-display", "dual-lcd", "single-projector", "short-throw-projector");
  }

  if (roomSize === "small") {
    return outputOptionSet("single-lcd", "interactive-display", "dual-lcd");
  }

  if (roomSize === "medium" || roomSize === "unknown") {
    return outputOptionSet("single-lcd", "interactive-display", "dual-lcd", "single-projector", "short-throw-projector", "stream-record-output");
  }

  return outputOptions.map((option) => option.value);
}

function getAvailableOutputOptions(brief: EngineeringBrief) {
  const typicalTypes = getTypicalOutputTypes(brief.application, brief.roomSize);

  return outputOptions.filter((option) => typicalTypes.includes(option.value));
}

function getUnusualSelectedOutputs(brief: EngineeringBrief) {
  const typicalTypes = getTypicalOutputTypes(brief.application, brief.roomSize);

  return brief.outputs.filter((output) => !typicalTypes.includes(output.type));
}


function outputTypeToDestinationKind(type: OutputType): DestinationKind {
  if (type === "dual-lcd") {
    return "dual-displays";
  }

  if (type === "lcd-video-wall" || type === "led-wall") {
    return "video-wall";
  }

  if (type === "single-projector" || type === "short-throw-projector" || type === "dual-projector") {
    return "projector";
  }

  if (type === "repeater") {
    return "repeater-output";
  }

  if (type === "overflow") {
    return "overflow-output";
  }

  if (type === "preview-monitor" || type === "stream-record-output") {
    return "streaming-recording";
  }

  return "main-display";
}

function applyOutputToPath(path: SignalPath, output: OutputItem | undefined): SignalPath {
  if (!output) {
    return {
      ...path,
      destinationOutputId: "",
      destination: "other",
      destinationLocation: "unknown",
      distance: "unknown",
    };
  }

  return {
    ...path,
    destinationOutputId: output.id,
    destination: outputTypeToDestinationKind(output.type),
    destinationLocation: output.location,
    distance: output.distance,
  };
}

function getPathOutputLabel(brief: EngineeringBrief, path: SignalPath) {
  const output = brief.outputs.find((item) => item.id === path.destinationOutputId) ?? brief.outputs[0];

  if (!output) {
    return "No output selected in Step 3";
  }

  return `${optionLabel(outputOptions, output.type)} - ${optionLabel(avPositionOptions, output.location)}`;
}
const createId = (prefix: string) => {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const createEmptyBrief = (): EngineeringBrief => ({
  application: "meeting-room",
  roomSize: "unknown",
  construction: "unknown",
  levels: "unknown",
  divisible: false,
  globalResolution: "unknown",
  scaling: "unknown",
  latency: "presentation",
  cableAccess: [],
  avPositions: ["display-wall"],
  outputs: [],
  sources: [],
  processing: [],
  control: [],
  paths: [],
  notes: "",
});

const createOutput = (type: OutputType = "single-lcd"): OutputItem => ({
  id: createId("output"),
  type,
  location: "display-wall",
  behaviour: type === "led-wall" || type === "lcd-video-wall" ? "single-canvas-wall" : "duplicated",
  distance: "unknown",
  feedPoint: getDefaultOutputFeedPoint(type),
  usbHost: "none",
  notes: "",
});


function isPairableSideBySideOutput(output: OutputItem) {
  return output.type === "single-lcd" || output.type === "interactive-display";
}

function createSideBySideOutputPair(type: OutputType = "single-lcd", behaviour: OutputBehaviour = "dual-display") {
  const pairGroupId = createId("output-pair");
  const first = createOutput(type === "interactive-display" ? "interactive-display" : "single-lcd");
  const second = createOutput(type === "interactive-display" ? "interactive-display" : "single-lcd");

  const shared = {
    location: "display-wall" as LocationKey,
    behaviour,
    distance: "unknown" as DistanceBand,
    feedPoint: getDefaultOutputFeedPoint(type === "interactive-display" ? "interactive-display" : "single-lcd"),
    pairedOutputGroupId: pairGroupId,
  };

  return [
    {
      ...first,
      ...shared,
      notes: "Side-by-side display 1. Auto-created from a dual/duplicated display assumption.",
    },
    {
      ...second,
      ...shared,
      notes: "Side-by-side display 2. Auto-created to match the first display.",
    },
  ];
}

function syncSideBySideOutputPair(outputs: OutputItem[], sourceOutputId: string) {
  const source = outputs.find((output) => output.id === sourceOutputId);

  if (!source?.pairedOutputGroupId) {
    return outputs;
  }

  return outputs.map((output) => {
    if (output.id === source.id || output.pairedOutputGroupId !== source.pairedOutputGroupId) {
      return output;
    }

    return {
      ...output,
      type: source.type,
      location: source.location,
      behaviour: source.behaviour,
      distance: source.distance,
      feedPoint: source.feedPoint,
      usbHost: source.usbHost,
    };
  });
}

function ensureSideBySideOutputPair(outputs: OutputItem[], sourceOutputId: string, behaviour: OutputBehaviour) {
  const source = outputs.find((output) => output.id === sourceOutputId);

  if (!source || !isPairableSideBySideOutput(source)) {
    return outputs;
  }

  const pairGroupId = source.pairedOutputGroupId ?? createId("output-pair");
  const outputsWithSourceGrouped = outputs.map((output) =>
    output.id === source.id
      ? {
          ...output,
          behaviour,
          pairedOutputGroupId: pairGroupId,
        }
      : output,
  );

  const groupedOutputs = outputsWithSourceGrouped.filter((output) => output.pairedOutputGroupId === pairGroupId);

  if (groupedOutputs.length >= 2) {
    return syncSideBySideOutputPair(outputsWithSourceGrouped, source.id);
  }

  const matchedOutput: OutputItem = {
    ...source,
    id: createId("output"),
    behaviour,
    pairedOutputGroupId: pairGroupId,
    notes: source.notes
      ? `${source.notes}\nMatched side-by-side output auto-created by Wingman.`
      : "Matched side-by-side output auto-created by Wingman.",
  };

  return syncSideBySideOutputPair([...outputsWithSourceGrouped, matchedOutput], source.id);
}

function hasSideBySideOutputPairs(brief: EngineeringBrief) {
  return brief.outputs.some((output) => output.pairedOutputGroupId);
}

const createPath = (sourceKind: SourceKind = "byod"): SignalPath => ({
  id: createId("path"),
  sourceKind,
  sourceLocation:
    sourceKind === "ndi-camera" || sourceKind === "hdmi-ptz-camera"
      ? "ceiling"
      : sourceKind === "interactive-display-touch"
        ? "display-wall"
        : "table",
  via:
    sourceKind === "ndi-camera"
      ? "network-switch"
      : sourceKind === "mtr-device"
        ? "rack-equipment"
        : sourceKind === "interactive-display-touch"
          ? "display-input"
          : "table-box",
  destination:
    sourceKind === "ndi-camera"
      ? "avoip-network"
      : sourceKind === "mtr-device"
        ? "dual-displays"
        : sourceKind === "interactive-display-touch"
          ? "mtr-device"
          : "presentation-switcher",
  destinationLocation:
    sourceKind === "ndi-camera"
      ? "network"
      : sourceKind === "mtr-device"
        ? "display-wall"
        : sourceKind === "interactive-display-touch"
          ? "local-rack"
          : "local-rack",
  distance: sourceKind === "interactive-display-touch" ? "under-10m" : "unknown",
  transports:
    sourceKind === "ndi-camera"
      ? ["ndi", "network", "control", "power"]
      : sourceKind === "mtr-device"
        ? ["hdmi", "usb", "network", "audio", "power"]
        : sourceKind === "usb-camera"
          ? ["usb", "power"]
          : sourceKind === "interactive-display-touch"
            ? ["usb"]
            : ["hdmi", "usb-c"],
  notes:
    sourceKind === "interactive-display-touch"
      ? "Auto-added because an interactive display needs a USB touch-return path to a USB 2.0 or USB 3.0 host device."
      : "",
});
function syncInteractiveDisplaySupport(brief: EngineeringBrief): EngineeringBrief {
  const hasInteractiveDisplay = brief.outputs.some((output) => output.type === "interactive-display");
  const interactiveTouchSource: SourceKind = "interactive-display-touch";
  const usbRoutingProcessing: ProcessingKey = "usb-routing";

  if (hasInteractiveDisplay) {
    const sources: SourceKind[] = brief.sources.includes(interactiveTouchSource)
      ? brief.sources
      : [...brief.sources, interactiveTouchSource];

    const processing: ProcessingKey[] = brief.processing.includes(usbRoutingProcessing)
      ? brief.processing
      : [...brief.processing, usbRoutingProcessing];

    const hasTouchReturnPath = brief.paths.some((path) => path.sourceKind === interactiveTouchSource);
    const paths: SignalPath[] = hasTouchReturnPath ? brief.paths : [...brief.paths, createPath(interactiveTouchSource)];

    return {
      ...brief,
      sources,
      processing,
      paths,
    };
  }

  return {
    ...brief,
    sources: brief.sources.filter((source) => source !== interactiveTouchSource),
    paths: brief.paths.filter((path) => path.sourceKind !== interactiveTouchSource),
  };
}

function toggleValue<T extends string>(values: T[], value: T) {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
}

function countCameras(sources: SourceKind[]) {
  return sources.filter((source) => source === "usb-camera" || source === "hdmi-ptz-camera" || source === "ndi-camera").length;
}

function inferRecommendations(brief: EngineeringBrief): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const outputTypes = brief.outputs.map((output) => output.type);
  const outputBehaviours = brief.outputs.map((output) => output.behaviour);
  const pathDistances = brief.paths.map((path) => path.distance);
  const pathTransports = brief.paths.flatMap((path) => path.transports);
  const cameraCount = countCameras(brief.sources);

  const hasInteractiveDisplay = outputTypes.includes("interactive-display");

  const hasVideoWall =
    outputTypes.includes("led-wall") ||
    outputTypes.includes("lcd-video-wall") ||
    outputBehaviours.includes("single-canvas-wall") ||
    outputBehaviours.includes("multi-window-wall") ||
    brief.processing.includes("video-wall-processing") ||
    brief.processing.includes("led-processor-feed");

  const hasMultiview = outputBehaviours.includes("multiview") || brief.processing.includes("multiview");
  const hasMtr = brief.sources.includes("mtr-device") || brief.control.includes("mtr-touch-controller");
  const hasByod = brief.sources.includes("byod") || brief.sources.includes("usb-c-laptop") || brief.sources.includes("hdmi-laptop");
  const hasLongDistance =
    pathDistances.includes("under-30m") ||
    pathDistances.includes("under-50m") ||
    pathDistances.includes("under-70m") ||
    pathDistances.includes("over-100m") ||
    brief.roomSize === "large" ||
    brief.roomSize === "extra-large";

  const hasAvoip =
    pathTransports.includes("avoip") ||
    brief.paths.some((path) => path.destination === "avoip-network") ||
    brief.application === "command-control" ||
    outputTypes.length > 4;

  const hasNdi = brief.sources.includes("ndi-camera") || pathTransports.includes("ndi") || brief.processing.includes("ndi-ingest");
  const hasUsbComplexity = brief.processing.includes("usb-routing") || brief.processing.includes("usb-switching") || hasMtr || cameraCount > 0;

  if (hasVideoWall) {
    recommendations.push({
      title: "Video wall / LED wall architecture",
      confidence: brief.outputs.length > 0 ? "High" : "Medium",
      reason: "The output requirement includes wall behaviour, LED/LCD wall hardware or wall processing.",
      productDirection:
        "Consider SW-0206-VW / wall processor paths for simpler local walls, matrix/scaling paths for medium systems, or NetworkHD AVoIP for larger or more flexible wall routing.",
    });
  }

  if (hasMultiview) {
    recommendations.push({
      title: "True multiview processing required",
      confidence: "High",
      reason: "The design requires multiple sources to appear on one output canvas.",
      productDirection:
        "Do not treat this as simply multiple HDMI outputs. Consider NHD-0401-MV, NHD-150-RX composition workflows, or a suitable multiview-capable processing path.",
    });
  }

  if (hasAvoip) {
    recommendations.push({
      title: "Distributed AVoIP architecture",
      confidence: hasLongDistance || outputTypes.length > 4 ? "High" : "Medium",
      reason: "The design indicates distributed routing, many destinations, command/control behaviour or network-based transport.",
      productDirection:
        "Consider NetworkHD 100/500/600-series based on latency, resolution, distribution scale and network constraints. For 600-series, allow for 10G switching such as an appropriate Netgear AVLine design.",
    });
  }

  if (hasInteractiveDisplay) {
    recommendations.push({
      title: "Interactive display workflow",
      confidence: "High",
      reason: "Interactive displays need a valid USB touch-return path to a host device.",
      productDirection:
        "For every interactive display, confirm a USB 2.0 or USB 3.0 host device and the touch-return path. If multiple hosts are involved, allow for USB switching or routing.",
    });
  }

  if (hasMtr || hasByod || hasUsbComplexity) {
    recommendations.push({
      title: "UC / BYOM presentation architecture",
      confidence: hasMtr && hasByod ? "High" : "Medium",
      reason: "The design includes MTR/BYOD/USB camera or microphone paths, so the system is not just video switching.",
      productDirection:
        "Prioritise presentation switcher, USB routing, USB extension, HDMI ingest and table connectivity logic before selecting a matrix or extender.",
    });
  }

  if (cameraCount > 1 || brief.processing.includes("camera-bridging")) {
    recommendations.push({
      title: "Camera bridge / camera aggregation required",
      confidence: "High",
      reason: "Multiple cameras or explicit camera bridging has been selected.",
      productDirection:
        "Add camera bridge/mixer thinking. Validate USB, HDMI or NDI camera format, camera count, control method and whether a single UC/stream output is required.",
    });
  }

  if (hasNdi) {
    recommendations.push({
      title: "NDI ingest into AV workflow",
      confidence: "High",
      reason: "NDI camera/source handling has been selected.",
      productDirection:
        "Consider NHD-128-NDI-TRX for H.265 NDI-to-NetworkHD workflows and NHD-150-RX where 100-series multiview/composition is required.",
    });
  }

  if (hasLongDistance && !hasAvoip) {
    recommendations.push({
      title: "Extension / long-distance transport",
      confidence: "Medium",
      reason: "The room size or path distance suggests passive HDMI/USB is unlikely to be sufficient.",
      productDirection:
        "Consider HDBaseT, USB extension, Cat-based extender paths or AVoIP depending on routing flexibility, latency and resolution.",
    });
  }

  if (recommendations.length > 0) {
    return recommendations;
  }

  return [
    {
      title: "Local room switching architecture",
      confidence: "Needs validation",
      reason: "No complex routing, wall, AVoIP, multiview or long-distance requirement has been captured yet.",
      productDirection:
        "Start with a local presentation switcher or direct display path, then validate source count, USB requirements and display distance.",
    },
  ];
}

function applyApplicationPreset(brief: EngineeringBrief, application: ApplicationKey): EngineeringBrief {
  const next: EngineeringBrief = { ...brief, application };

  if (application === "meeting-room") {
    return {
      ...next,
      roomSize: "small",
      avPositions: ["table", "display-wall", "local-rack"],
      sources: ["byod", "mtr-device", "usb-camera", "microphone"],
      outputs: [createOutput("single-lcd")],
      processing: ["usb-routing"],
      control: ["mtr-touch-controller", "auto-switching"],
      paths: [createPath("byod"), createPath("mtr-device"), createPath("usb-camera")],
    };
  }

  if (application === "boardroom") {
    return {
      ...next,
      roomSize: "medium",
      avPositions: ["table", "credenza", "display-wall", "ceiling"],
      sources: ["byod", "usb-c-laptop", "mtr-device", "hdmi-ptz-camera", "audio-dsp"],
      outputs: [createOutput("dual-lcd")],
      processing: ["usb-routing", "seamless-switching"],
      control: ["mtr-touch-controller", "touch-panel"],
      paths: [createPath("byod"), createPath("mtr-device"), createPath("hdmi-ptz-camera"), createPath("audio-dsp")],
    };
  }

  if (application === "divisible-room") {
    return {
      ...next,
      roomSize: "large",
      divisible: true,
      avPositions: ["lectern", "floor-box", "local-rack", "display-wall", "ceiling"],
      sources: ["byod", "external-feed", "room-pc", "audio-dsp"],
      outputs: [createOutput("dual-lcd"), createOutput("repeater")],
      processing: ["scaling", "seamless-switching", "control-integration"],
      control: ["touch-panel", "third-party-control"],
      paths: [createPath("byod"), createPath("external-feed"), createPath("room-pc")],
    };
  }

  if (application === "retail-showroom" || application === "reception-signage") {
    return {
      ...next,
      roomSize: application === "retail-showroom" ? "medium" : "small",
      avPositions: ["local-rack", "display-wall", "network"],
      sources: ["media-player", "byod"],
      outputs: [createOutput(application === "retail-showroom" ? "led-wall" : "single-lcd")],
      processing: application === "retail-showroom" ? ["video-wall-processing", "led-processor-feed", "scaling"] : ["scaling"],
      control: ["scheduled-content"],
      paths: [createPath("media-player"), createPath("byod")],
    };
  }

  if (application === "house-of-worship" || application === "auditorium" || application === "lecture-theatre") {
    return {
      ...next,
      roomSize: "extra-large",
      avPositions: ["lectern", "central-rack", "ceiling", "display-wall", "operator-position", "overflow-area"],
      sources: ["byod", "room-pc", "hdmi-ptz-camera", "hdmi-ptz-camera", "audio-dsp", "streaming-recorder"],
      outputs: [createOutput("single-projector"), createOutput("overflow"), createOutput("stream-record-output")],
      processing: ["camera-bridging", "streaming-recording", "multiview", "scaling"],
      control: ["touch-panel", "third-party-control"],
      paths: [createPath("byod"), createPath("hdmi-ptz-camera"), createPath("audio-dsp"), createPath("streaming-recorder")],
    };
  }

  if (application === "command-control") {
    return {
      ...next,
      roomSize: "large",
      avPositions: ["operator-position", "central-rack", "display-wall", "network"],
      sources: ["room-pc", "media-player", "external-feed"],
      outputs: [createOutput("dual-lcd"), createOutput("lcd-video-wall")],
      processing: ["multiview", "source-preview", "control-integration", "scaling"],
      control: ["third-party-control", "touch-panel"],
      paths: [createPath("room-pc"), createPath("media-player"), createPath("external-feed")],
    };
  }

  return next;
}

function FieldSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="wmg-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompactChipGroup<T extends string>({
  options,
  values,
  onToggle,
}: {
  options: Option<T>[];
  values: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <WingmanSelectionGrid columns={4} compact>
      {options.map((option) => {
        const selected = values.includes(option.value);

        return (
          <WingmanSelectionCard
            key={option.value}
            compact
            title={option.label}
            description={option.helper}
            icon={genericOptionIcon(option.value)}
            accent={genericOptionAccent(option.value)}
            selected={selected}
            onClick={() => onToggle(option.value)}
          />
        );
      })}
    </WingmanSelectionGrid>
  );
}

function hideLegacyDynamicDiscoveryWorkflow() {
  if (typeof document === "undefined") {
    return;
  }

  const headingCandidates = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, h5, h6, strong, span, div"),
  ).filter((element) => (element.textContent ?? "").trim() === "Dynamic discovery workflow");

  headingCandidates.forEach((heading) => {
    let current = heading.parentElement;
    let selected: HTMLElement | null = null;

    while (current && current !== document.body) {
      const text = current.textContent ?? "";
      const className = (current.getAttribute("class") ?? "").toLowerCase();

      if (text.includes("AV Engineering Design Canvas")) {
        return;
      }

      const looksLikeWorkflowWrapper =
        current.tagName === "SECTION" ||
        current.tagName === "ARTICLE" ||
        className.includes("workflow") ||
        className.includes("panel") ||
        className.includes("card") ||
        className.includes("discovery");

      if (looksLikeWorkflowWrapper) {
        selected = current as HTMLElement;
      }

      const element = current as HTMLElement;
      const isSubstantialBlock = element.offsetWidth > 300 && element.offsetHeight > 250;
      const containsWorkflowContent = text.includes("Workflow") && text.includes("Review");

      if (selected && isSubstantialBlock && containsWorkflowContent) {
        break;
      }

      current = current.parentElement;
    }

    if (!selected) {
      return;
    }

    selected.style.display = "none";
    selected.setAttribute("data-wingman-hidden-legacy-discovery", "true");
  });
}
export function SourceDeviceCollator() {
  useEffect(() => {
    hideLegacyDynamicDiscoveryWorkflow();

    const timer = window.setTimeout(() => {
      hideLegacyDynamicDiscoveryWorkflow();
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  const [brief, setBrief] = useState<EngineeringBrief>(() => createEmptyBrief());
  const [activeStep, setActiveStep] = useState(0);
  const [showAdvancedPositions, setShowAdvancedPositions] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<EngineeringBrief>;
      const normalizedOutputs = Array.isArray(parsed.outputs)
        ? parsed.outputs.map((output) => ({
            ...createOutput((output.type as OutputType) ?? "single-lcd"),
            ...output,
            feedPoint: (output as Partial<OutputItem>).feedPoint ?? getDefaultOutputFeedPoint((output.type as OutputType) ?? "single-lcd"),
            usbHost: (output as Partial<OutputItem>).usbHost ?? "none",
            pairedOutputGroupId: (output as Partial<OutputItem>).pairedOutputGroupId,
          }))
        : [];

      setBrief({
        ...createEmptyBrief(),
        ...parsed,
        outputs: normalizedOutputs,
        paths: Array.isArray(parsed.paths) ? parsed.paths : [],
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));

    window.dispatchEvent(
      new CustomEvent("wingman:engineering-design-canvas-updated", {
        detail: {
          engineeringBrief: brief,
          recommendations: inferRecommendations(brief),
        },
      }),
    );

    window.dispatchEvent(
      new CustomEvent("wingman:discovery-source-devices-updated", {
        detail: {
          sourceDevices: brief.paths,
          sourceCount: brief.paths.length,
        },
      }),
    );
  }, [brief]);

  const recommendations = useMemo(() => inferRecommendations(brief), [brief]);

  const availableOutputOptions = useMemo(() => {
    return getAvailableOutputOptions(brief);
  }, [brief]);

  const unusualSelectedOutputs = useMemo(() => {
    return getUnusualSelectedOutputs(brief);
  }, [brief]);

  const topologySummary = useMemo(() => {
    const cameraTotal = countCameras(brief.sources);
    const outputTotal = brief.outputs.length;
    const pathTotal = brief.paths.length;

    return {
      cameraTotal,
      outputTotal,
      pathTotal,
      positionTotal: brief.avPositions.length,
    };
  }, [brief]);

  const interactiveDisplayMissingHost = useMemo(() => {
    return brief.outputs.some((output) => output.type === "interactive-display" && output.usbHost === "none");
  }, [brief.outputs]);

  const selectedSourceOptions = useMemo(() => {
    return sourceOptions.filter((option) => brief.sources.includes(option.value));
  }, [brief.sources]);

  function getPathSourceOptions(sourceKind: SourceKind) {
    if (selectedSourceOptions.some((option) => option.value === sourceKind)) {
      return selectedSourceOptions;
    }

    const currentOption = sourceOptions.find((option) => option.value === sourceKind);

    if (currentOption) {
      return [currentOption, ...selectedSourceOptions];
    }

    return selectedSourceOptions;
  }

  function patchBrief(updates: Partial<EngineeringBrief>) {
    setBrief((current) => ({ ...current, ...updates }));
  }

  function toggleBriefArray<T extends keyof EngineeringBrief>(key: T, value: string) {
    setBrief((current) => {
      const currentValue = current[key];

      if (!Array.isArray(currentValue)) {
        return current;
      }

      return {
        ...current,
        [key]: toggleValue(currentValue as string[], value),
      };
    });
  }    function addOutput(type: OutputType = "single-lcd") {
    setBrief((current) => {
      const newOutputs = type === "dual-lcd" ? createSideBySideOutputPair("single-lcd", "dual-display") : [createOutput(type)];
      const nextBrief = {
        ...current,
        outputs: [...current.outputs, ...newOutputs],
      };

      return syncInteractiveDisplaySupport(nextBrief);
    });

    if (isVideoWallConfiguratorOutput(type)) {
      openVideoWallWizard(type);
    }
  }    function updateOutput(id: string, updates: Partial<OutputItem>) {
    setBrief((current) => {
      const outputsWithChanges = current.outputs.map((output) => (output.id === id ? { ...output, ...updates } : output));
      const shouldEnsurePair = updates.behaviour === "duplicated" || updates.behaviour === "dual-display";
      const outputsWithPair =
        shouldEnsurePair && updates.behaviour
          ? ensureSideBySideOutputPair(outputsWithChanges, id, updates.behaviour)
          : syncSideBySideOutputPair(outputsWithChanges, id);

      const changedOutput = outputsWithPair.find((output) => output.id === id);
      const paths = changedOutput
        ? current.paths.map((path) => (path.destinationOutputId === id ? applyOutputToPath(path, changedOutput) : path))
        : current.paths;

      return syncInteractiveDisplaySupport({
        ...current,
        outputs: outputsWithPair,
        paths,
      });
    });
  }

  function removeOutput(id: string) {
    setBrief((current) => {
      const nextBrief = {
        ...current,
        outputs: current.outputs.filter((output) => output.id !== id),
        paths: current.paths.map((path) =>
          path.destinationOutputId === id
            ? {
                ...path,
                destinationOutputId: "",
                destination: "other" as DestinationKind,
                destinationLocation: "unknown" as LocationKey,
                distance: "unknown" as DistanceBand,
              }
            : path,
        ),
      };

      return syncInteractiveDisplaySupport(nextBrief);
    });
  }

  function addPath(sourceKind: SourceKind = "byod") {
    setBrief((current) => {
      const firstOutput = current.outputs[0];
      const newPath = applyOutputToPath(createPath(sourceKind), firstOutput);

      return {
        ...current,
        paths: [...current.paths, newPath],
      };
    });
  }

  function updatePath(id: string, updates: Partial<SignalPath>) {
    setBrief((current) => ({
      ...current,
      paths: current.paths.map((path) => (path.id === id ? { ...path, ...updates } : path)),
    }));
  }

  function removePath(id: string) {
    setBrief((current) => ({ ...current, paths: current.paths.filter((path) => path.id !== id) }));
  }

  function applyPreset(application: ApplicationKey) {
    setBrief((current) => applyApplicationPreset(current, application));
    setActiveStep(1);
  }

  function clearCanvas() {
    setBrief(createEmptyBrief());
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function copyBrief() {
    const payload = JSON.stringify(
      {
        engineeringBrief: brief,
        recommendations,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    navigator.clipboard.writeText(payload).catch(() => {
      window.localStorage.setItem("wingman.discovery.engineeringCanvas.exportFallback", payload);
    });
  }

  const steps = [
    "Application",
    "Environment",
    "Outputs",
    "Positions",
    "Sources",
    "Signal paths",
    "Processing",
    "Recommendation",
  ];
  const summaryPills = [
    { step: 0, label: "Application", value: optionLabel(applications, brief.application) },
    {
      step: 1,
      label: "Environment",
      value: `${optionLabel(roomSizes, brief.roomSize)} / ${optionLabel(resolutionOptions, brief.globalResolution)}`,
    },
    { step: 2, label: "Outputs", value: `${brief.outputs.length} selected` },
    { step: 3, label: "Positions", value: `${brief.avPositions.length} mapped` },
    { step: 4, label: "Sources", value: `${brief.sources.length} selected` },
    { step: 5, label: "Paths", value: `${brief.paths.length} built` },
    { step: 6, label: "Processing", value: `${brief.processing.length + brief.control.length} behaviours` },
  ].filter((item) => item.step <= activeStep);

  return (
    <section className="wmg-engineering-canvas" aria-label="AV Engineering Design Canvas">
      <div className="wmg-engineering-canvas__hero">
        <div>
          <p className="wmg-eyebrow">Engineering discovery</p>
          <h2>AV Engineering Design Canvas</h2>
          <p>
            Build the system the way an AV engineer would: understand the market application, map the
            physical space, define outputs, place equipment positions, then connect sources and peripherals
            into a working schematic.
          </p>
        </div>

        <div className="wmg-canvas-score">
          <strong>{recommendations[0]?.confidence ?? "Needs validation"}</strong>
          <span>{recommendations[0]?.title ?? "Architecture pending"}</span>
        </div>
      </div>

      <div className="wmg-step-rail" aria-label="Engineering canvas steps">
        {steps.map((step, index) => (
          <button
            className={activeStep === index ? "is-active" : activeStep > index ? "is-complete" : ""}
            key={step}
            type="button"
            onClick={() => setActiveStep(index)}
          >
            <span>{index + 1}</span>
            {step}
          </button>
        ))}
      </div>

      {summaryPills.length ? (
        <div className="wm-selection-summary" aria-label="Captured discovery selections">
          {summaryPills.map((item) => (
            <button
              key={item.label}
              type="button"
              className="wm-selection-summary__pill"
              onClick={() => setActiveStep(item.step)}
              aria-label={`Edit ${item.label}`}
            >
              {item.label}: <strong>{item.value}</strong>
            </button>
          ))}
        </div>
      ) : null}


      {activeStep === 0 ? (
        <article className="wmg-canvas-panel" data-wmg-step="application">
          <div className="wmg-panel-heading">
            <h3>1. Application</h3>
            <p>
              Select the closest application. Wingman applies practical AV assumptions first, then carries those
              assumptions into the environment, outputs, source paths, processing, and recommendation stages.
            </p>
          </div>

          <WingmanSelectionGrid columns={4} className="wmg-application-grid">
            {applications.map((application) => {
              const selected = brief.application === application.value;

              return (
                <WingmanSelectionCard
                  key={application.value}
                  title={application.label}
                  description={application.helper}
                  icon={applicationIcon(application.value)}
                  accent={applicationAccent(application.value)}
                  selected={selected}
                  indicator={selected ? "recommended" : undefined}
                  onClick={() => applyPreset(application.value)}
                />
              );
            })}
          </WingmanSelectionGrid>
        </article>
      ) : null}
      {activeStep === 1 ? (
        <article className="wmg-canvas-panel">
          <div className="wmg-panel-heading">
            <h3>2. Physical environment</h3>
            <p>Capture the room constraints that usually decide whether the design is direct, extended, matrixed or AVoIP.</p>
          </div>

          <h4>Room size / environment scale</h4>
          <WingmanSelectionGrid columns={5} compact>
            {roomSizes.map((option) => (
              <WingmanSelectionCard
                key={option.value}
                compact
                title={option.label}
                description="Use this as the baseline for transport and output assumptions"
                icon={Building2}
                accent={option.value === "unknown" ? "red" : "blue"}
                selected={brief.roomSize === option.value}
                onClick={() => {
                  patchBrief({ roomSize: option.value });
                  setActiveStep(2);
                }}
              />
            ))}
          </WingmanSelectionGrid>

          <div className="wmg-field-grid">
            <FieldSelect label="Construction" value={brief.construction} options={constructionOptions} onChange={(value) => patchBrief({ construction: value })} />
            <FieldSelect label="Levels" value={brief.levels} options={levelOptions} onChange={(value) => patchBrief({ levels: value })} />
            <FieldSelect label="Global resolution" value={brief.globalResolution} options={resolutionOptions} onChange={(value) => patchBrief({ globalResolution: value })} />
            <FieldSelect label="Scaling expectation" value={brief.scaling} options={scalingOptions} onChange={(value) => patchBrief({ scaling: value })} />
            <FieldSelect label="Latency sensitivity" value={brief.latency} options={latencyOptions} onChange={(value) => patchBrief({ latency: value })} />
          </div>

          <label className="wmg-checkline">
            <input checked={brief.divisible} type="checkbox" onChange={(event) => patchBrief({ divisible: event.target.checked })} />
            <span>This is a divisible / combined-mode space</span>
          </label>

          <h4>Cable access / route clues</h4>
          <CompactChipGroup
            options={cableAccessOptions}
            values={brief.cableAccess}
            onToggle={(value) => toggleBriefArray("cableAccess", value)}
          />

          <div className="wmg-inline-actions">
            <button type="button" onClick={() => setActiveStep(2)}>
              Continue to outputs
            </button>
          </div>
        </article>
      ) : null}

      {activeStep === 2 ? (
        <article className="wmg-canvas-panel">
          <div className="wmg-panel-heading">
            <h3>3. Display / output architecture</h3>
            <p>
              Define what the system has to feed before working backwards through sources and transport.
              Output choices are filtered by the selected application and room size, so unlikely options
              are removed unless the room context changes. Once an output is added, the output type is fixed.
            </p>
          </div>

          <WingmanSelectionGrid columns={3} compact className="wmg-output-add-row">
            {availableOutputOptions.map((option) => {
              const selectedCount = brief.outputs.filter((output) => output.type === option.value).length;

              return (
                <WingmanSelectionCard
                  key={option.value}
                  compact
                  title={option.label}
                  description={selectedCount ? `${selectedCount} already added` : "Add this output path"}
                  icon={outputIcon(option.value)}
                  accent={outputAccent(option.value)}
                  selected={selectedCount > 0}
                  onClick={() => addOutput(option.value)}
                  metaBadges={selectedCount ? [`${selectedCount} selected`] : undefined}
                />
              );
            })}
          </WingmanSelectionGrid>

          {interactiveDisplayMissingHost ? (
            <div className="wmg-warning-card">
              Interactive display selected. Choose a USB 2.0 Host device or USB 3.0 Host device for each interactive display before continuing.
            </div>
          ) : null}

          {unusualSelectedOutputs.length > 0 ? (
            <div className="wmg-warning-card">
              This output is unusual for the selected application and room size:{" "}
              {unusualSelectedOutputs.map((output) => optionLabel(outputOptions, output.type)).join(", ")}.
              Keep it if the project genuinely requires it, or change the room/application context.
            </div>
          ) : null}

          {hasSideBySideOutputPairs(brief) ? (
            <div className="wmg-warning-card">
              Side-by-side output pair created. Wingman has matched the output location, behaviour, feed method and distance so the two displays stay aligned as a credible starting assumption.
            </div>
          ) : null}

          {brief.outputs.length === 0 ? (
            <div className="wmg-empty-card">No outputs yet. Add at least the main display, projector, wall or stream output.</div>
          ) : (
            <div className="wmg-card-grid">
              {brief.outputs.map((output) => (
                <div className="wmg-mini-card" key={output.id}>
                  <div className="wmg-field-grid wmg-field-grid--compact">
                    <label className="wmg-field">
                      <span>Output type</span>
                      <div className="wmg-readonly-output">{optionLabel(outputOptions, output.type)}</div>
                    </label>
                    <FieldSelect label="Location" value={output.location} options={getOutputLocationSelectOptions(output)} onChange={(value) => updateOutput(output.id, { location: value })} />
                    <FieldSelect label="Behaviour" value={output.behaviour} options={getOutputBehaviourSelectOptions(output)} onChange={(value) => updateOutput(output.id, { behaviour: value })} />
                    <FieldSelect label="Distance" value={output.distance} options={distanceOptions} onChange={(value) => updateOutput(output.id, { distance: value })} />
                    <FieldSelect label="Connected from" value={output.feedPoint} options={getOutputFeedSelectOptions(output)} onChange={(value) => updateOutput(output.id, { feedPoint: value })} />
                    {output.type === "interactive-display" ? (
                      <FieldSelect label="USB host device" value={output.usbHost} options={usbHostOptions} onChange={(value) => updateOutput(output.id, { usbHost: value })} />
                    ) : null}
                  </div>

                  <div className="wmg-flow-summary">
                    <strong>Output feed path</strong>
                    <span>{getOutputConnectionSummary(output)}</span>
                  </div>

                  <label className="wmg-field">
                    <span>Output notes</span>
                    <textarea value={output.notes} onChange={(event) => updateOutput(output.id, { notes: event.target.value })} />
                  </label>

                  <div className="wmg-mini-card__footer">
                    <button type="button" onClick={() => removeOutput(output.id)}>
                      Remove output
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="wmg-inline-actions">
            <button type="button" onClick={() => setActiveStep(3)} disabled={interactiveDisplayMissingHost}>
              Continue to AV positions
            </button>
          </div>
        </article>
      ) : null}

      {activeStep === 3 ? (
        <article className="wmg-canvas-panel">
          <div className="wmg-panel-heading">
            <h3>4. AV positions / room topology</h3>
            <p>These are the physical nodes of the schematic: racks, lecterns, tables, ceiling devices and display locations.</p>
          </div>

          <div className="wmg-position-guide">
            <strong>Start with the main physical nodes only.</strong>
            <span>
              Add the table, rack/equipment position, display wall and any ceiling devices first.
              Use advanced positions only when the project genuinely needs them.
            </span>
          </div>

          <CompactChipGroup
            options={primaryAvPositionOptions}
            values={brief.avPositions}
            onToggle={(value) => toggleBriefArray("avPositions", value)}
          />

          <button
            className="wmg-secondary-toggle"
            type="button"
            onClick={() => setShowAdvancedPositions((current) => !current)}
          >
            {showAdvancedPositions ? "Hide advanced positions" : "Show advanced positions"}
          </button>

          {showAdvancedPositions ? (
            <div className="wmg-advanced-position-panel">
              <strong>Advanced / less common positions</strong>
              <CompactChipGroup
                options={advancedAvPositionOptions}
                values={brief.avPositions}
                onToggle={(value) => toggleBriefArray("avPositions", value)}
              />
            </div>
          ) : null}

          <div className="wmg-topology-card">
            <strong>Topology so far</strong>
            <span>{topologySummary.positionTotal} AV positions</span>
            <span>{topologySummary.outputTotal} outputs</span>
            <span>{topologySummary.pathTotal} signal paths</span>
            <span>{topologySummary.cameraTotal} camera sources</span>
          </div>

          <div className="wmg-inline-actions">
            <button type="button" onClick={() => setActiveStep(4)}>
              Continue to sources
            </button>
          </div>
        </article>
      ) : null}

      {activeStep === 4 ? (
        <article className="wmg-canvas-panel">
          <div className="wmg-panel-heading">
            <h3>5. Sources and fixed peripherals</h3>
            <p>Select the functional devices in the design. Accessories/software stay out unless they affect the signal architecture.</p>
          </div>

          <CompactChipGroup
            options={sourceOptions}
            values={brief.sources}
            onToggle={(value) => toggleBriefArray("sources", value)}
          />

          {countCameras(brief.sources) > 1 ? (
            <div className="wmg-warning-card">
              Multiple cameras detected. Add camera bridge, USB bridge, NDI bridge, capture or multiview monitoring logic in the next steps.
            </div>
          ) : null}

          {brief.sources.includes("interactive-display-touch") ? (
            <div className="wmg-warning-card">
              Interactive display has auto-added USB routing and a touch-return signal path. Confirm the USB host device and cable route in Signal Paths.
            </div>
          ) : null}

          <div className="wmg-inline-actions">
            <button type="button" onClick={() => setActiveStep(5)} disabled={brief.sources.length === 0}>
              Continue to signal paths
            </button>
          </div>
        </article>
      ) : null}

      {activeStep === 5 ? (
        <article className="wmg-canvas-panel">
          <div className="wmg-panel-heading">
            <h3>6. Signal path builder</h3>
            <p>Describe the schematic line: source location to connection method to destination. This keeps the signal flow clear enough for review and proposal hand-off.</p>
          </div>

          {brief.outputs.length === 0 ? (
            <div className="wmg-warning-card">
              Select outputs in step 3 before building display signal paths. This prevents users being asked to choose screen types again.
            </div>
          ) : null}

          {brief.sources.includes("interactive-display-touch") ? (
            <div className="wmg-warning-card">
              Touch-return path auto-added for the interactive display. Confirm whether the host is USB 2.0 or USB 3.0, and where that host device is located.
            </div>
          ) : null}

          {selectedSourceOptions.length === 0 ? (
            <div className="wmg-empty-card">
              Select sources and fixed peripherals in the previous section first. Wingman will then offer
              only the relevant signal paths for those selected devices.
            </div>
          ) : (
            <WingmanSelectionGrid columns={3} compact className="wmg-output-add-row">
              {selectedSourceOptions.map((option) => (
                <WingmanSelectionCard
                  key={option.value}
                  compact
                  title={`Add path: ${option.label}`}
                  description="Create a schematic signal route for this source"
                  icon={sourceIcon(option.value)}
                  accent={sourceAccent(option.value)}
                  onClick={() => addPath(option.value)}
                />
              ))}
            </WingmanSelectionGrid>
          )}

          {brief.paths.length === 0 ? (
            <div className="wmg-empty-card">No signal paths yet. Add one of the selected source paths above.</div>
          ) : (
            <div className="wmg-card-grid">
              {brief.paths.map((path) => (
                <div className="wmg-mini-card" key={path.id}>
                  <div className="wmg-schematic-strip">
                    <div>
                      <strong>{optionLabel(sourceOptions, path.sourceKind)}</strong>
                      <span>{optionLabel(avPositionOptions, path.sourceLocation)}</span>
                    </div>
                    <b>Signal path:</b>
                    <div>
                      <strong>{optionLabel(connectionPointOptions, path.via)}</strong>
                      <span>{path.transports.map((transport) => optionLabel(transportOptions, transport)).join(" + ") || "No signal selected"}</span>
                    </div>
                    <b>Design note:</b>
                    <div>
                      <strong>{optionLabel(destinationOptions, path.destination)}</strong>
                      <span>{optionLabel(avPositionOptions, path.destinationLocation)}</span>
                    </div>
                  </div>

                  <div className="wmg-field-grid wmg-field-grid--path">
                    <FieldSelect label="Source" value={path.sourceKind} options={getPathSourceOptions(path.sourceKind)} onChange={(value) => updatePath(path.id, { sourceKind: value })} />
                    <FieldSelect label="Source location" value={path.sourceLocation} options={getSourceLocationSelectOptions(path)} onChange={(value) => updatePath(path.id, { sourceLocation: value })} />
                    <FieldSelect label="Via" value={path.via} options={getConnectionPointSelectOptions(path)} onChange={(value) => updatePath(path.id, { via: value })} />
                    <label className="wmg-field">
                      <span>Selected output</span>
                      <div className="wmg-readonly-output">{getPathOutputLabel(brief, path)}</div>
                    </label>
                    <label className="wmg-field">
                      <span>Output location</span>
                      <div className="wmg-readonly-output">{optionLabel(avPositionOptions, path.destinationLocation)}</div>
                    </label>
                    <FieldSelect label="Source route distance" value={path.distance} options={distanceOptions} onChange={(value) => updatePath(path.id, { distance: value })} />
                  </div>

                  <CompactChipGroup
                    options={getTransportSelectOptions(path)}
                    values={path.transports}
                    onToggle={(value) => updatePath(path.id, { transports: toggleValue(path.transports, value) })}
                  />

                  <label className="wmg-field">
                    <span>Path notes</span>
                    <textarea value={path.notes} onChange={(event) => updatePath(path.id, { notes: event.target.value })} />
                  </label>

                  <div className="wmg-mini-card__footer">
                    <button type="button" onClick={() => removePath(path.id)}>
                      Remove path
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="wmg-inline-actions">
            <button type="button" onClick={() => setActiveStep(6)}>
              Continue to processing
            </button>
          </div>
        </article>
      ) : null}

      {activeStep === 6 ? (
        <article className="wmg-canvas-panel">
          <div className="wmg-panel-heading">
            <h3>7. Processing, routing and control</h3>
            <p>Capture the behaviours that change the architecture: scaling, multiview, USB routing, camera bridging and control.</p>
          </div>

          <h4>Processing / system behaviour</h4>
          <CompactChipGroup
            options={processingOptions}
            values={brief.processing}
            onToggle={(value) => toggleBriefArray("processing", value)}
          />

          <h4>Control / user operation</h4>
          <CompactChipGroup
            options={controlOptions}
            values={brief.control}
            onToggle={(value) => toggleBriefArray("control", value)}
          />

          <label className="wmg-field wmg-field--notes">
            <span>Design notes / assumptions</span>
            <textarea
              value={brief.notes}
              placeholder="Example: Rack may be mobile, lectern may move, confirm cable routes, customer wants simple one-button operation..."
              onChange={(event) => patchBrief({ notes: event.target.value })}
            />
          </label>

          <div className="wmg-inline-actions">
            <button type="button" onClick={() => setActiveStep(7)}>
              Generate architecture direction
            </button>
          </div>
        </article>
      ) : null}

      {activeStep === 7 ? (
        <article className="wmg-canvas-panel">
          <div className="wmg-panel-heading">
            <h3>8. Recommended architecture direction</h3>
            <p>Wingman now interprets the design canvas before selecting product families. This is a credible concept starting point and still requires qualified review before final specification.</p>
          </div>

          <div className="wmg-recommendation-grid">
            {recommendations.map((recommendation) => (
              <div className="wmg-recommendation-card" key={recommendation.title}>
                <div>
                  <strong>{recommendation.title}</strong>
                  <span>{recommendation.confidence}</span>
                </div>
                <p>{recommendation.reason}</p>
                <small>{recommendation.productDirection}</small>
              </div>
            ))}
          </div>

          <div className="wmg-brief-summary">
            <strong>Current design summary</strong>
            <span>Application: {optionLabel(applications, brief.application)}</span>
            <span>Room: {optionLabel(roomSizes, brief.roomSize)} / Signal flow captured for review</span>
            <span>Outputs: {brief.outputs.length}</span>
            <span>Sources/peripherals: {brief.sources.length}</span>
            <span>Signal paths: {brief.paths.length}</span>
            <span>Resolution: {optionLabel(resolutionOptions, brief.globalResolution)}</span>
          </div>

          <div className="wmg-inline-actions">
            <button type="button" onClick={copyBrief}>
              Copy structured engineering brief
            </button>
            <button type="button" onClick={clearCanvas}>
              Clear canvas
            </button>
          </div>
        </article>
      ) : null}
    </section>
  );
}

export default SourceDeviceCollator;
