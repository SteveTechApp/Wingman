import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Cable,
  Camera,
  Check,
  Circle,
  Layers,
  MapPin,
  Minus,
  Monitor,
  Network,
  Plus,
  Save,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

type StepId =
  | "useCase"
  | "layout"
  | "sources"
  | "outputs"
  | "usb"
  | "infrastructure"
  | "review";

type DiscoveryState = {
  roomType: string;
  behaviours: string[];
  roomSize: string;
  userPosition: string;
  equipmentLocation: string;
  displayPosition: string;
  layoutFlags: string[];
  sourceCount: number;
  sourceTypes: string[];
  sourceLocations: string[];
  sourceConnections: string[];
  displayCount: number;
  outputTypes: string[];
  outputBehaviours: string[];
  wallLayout: string;
  wallInputMode: string;
  wallMultiview: string;
  meetingWorkflow: string;
  usbNeeds: string[];
  cameraPosition: string;
  audioNeeds: string[];
  longestRun: string;
  cableAvailable: string[];
  networkAvailability: string;
  cableRisks: string[];
  controlNeeds: string[];
  budgetStyle: string;
  confidenceFlags: string[];
  notes: string;
};

type Inference = {
  architecture: string;
  productDirection: string[];
  avoid: string[];
  confidence: "High" | "Medium" | "Low";
  missing: string[];
  risks: string[];
};

const steps: { id: StepId; label: string; description: string }[] = [
  {
    id: "useCase",
    label: "Use case",
    description: "Identify the room type before asking detailed design questions.",
  },
  {
    id: "layout",
    label: "Layout",
    description: "Build the spatial picture: users, displays, rack, and room shape.",
  },
  {
    id: "sources",
    label: "Sources",
    description: "Capture what connects and where each source is located.",
  },
  {
    id: "outputs",
    label: "Outputs",
    description: "Define displays, LCD/LED wall needs, multiview, and routing behaviour.",
  },
  {
    id: "usb",
    label: "USB / Conferencing",
    description: "Capture BYOD, BYOM, USB peripherals, cameras, and audio.",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    description: "Confirm cable distance, cable type, network availability, and risks.",
  },
  {
    id: "review",
    label: "Review",
    description: "Generate architecture direction, risks, and next workflow handoff.",
  },
];

const roomTypes = [
  "Meeting room",
  "Boardroom",
  "Classroom",
  "Training room",
  "Lecture space",
  "Retail signage",
  "Hospitality",
  "House of worship",
  "Control room",
  "Multi-zone venue",
  "Display wall / large format wall",
  "Other / not sure",
];

const behaviourOptions = [
  "Present only",
  "Video conferencing",
  "Wireless presentation",
  "Wireless conferencing",
  "BYOD",
  "BYOM",
  "Dual display",
  "Multiview",
  "LCD wall", "LED wall",
  "Streaming / recording",
  "Digital signage",
  "Central distribution",
];

const roomSizes = ["Small <10m", "Medium <25m", "Large <50m", "Extra-large 50m+", "Open / divisible space", "Unknown"];

const userPositions = [
  "Central table",
  "Lectern",
  "Front-of-house",
  "Operator desk",
  "Reception / counter",
  "No fixed user position",
  "Unknown",
];

const equipmentLocations = [
  "Behind display",
  "Local rack",
  "Central rack",
  "Lectern",
  "Credenza",
  "Under table",
  "Ceiling",
  "Unknown",
];

const standardDisplayPositions = [
  "Front wall",
  "Side wall",
  "Rear wall",
  "Ceiling projector",
  "Multiple walls",
  "Distributed displays",
  "Unknown",
];

const dualDisplayPositions = [
  "Dual displays on front wall",
  "Left and right of camera",
  "Content display + conferencing display",
  "Front display + side display",
  "Front display + confidence monitor",
  "Mirrored displays in same room",
  "Independent displays in same room",
  "Unknown dual-display position",
];

const wallDisplayPositions = [
  "Primary feature wall",
  "Front wall display wall",
  "Retail display wall",
  "Reception / atrium wall",
  "Control room wall",
  "Stage / event wall",
  "Unknown wall position",
];

const layoutFlags = [
  "Fixed orientation",
  "Divisible space",
  "Repeater displays",
  "Future expansion",
  "No rack available",
  "Customer unsure",
];

const sourceTypes = [
  "Laptop HDMI",
  "Laptop USB-C",
  "Room PC",
  "Media player",
  "Signage player",
  "Wireless presentation",
  "HDMI wall input",
  "USB-C wall input",
  "Document camera",
  "USB camera",
  "NDI camera",
  "PTZ camera",
  "Other source",
];

const sourceLocations = [
  "Table",
  "Floor box",
  "Wall plate",
  "Lectern",
  "Rack",
  "Credenza",
  "Ceiling",
  "Camera position",
  "Display wall",
  "Unknown",
];

const sourceConnections = [
  "HDMI",
  "USB-C video",
  "USB-C with charging",
  "USB only",
  "NDI",
  "Network",
  "Audio only",
  "Wireless",
  "Unknown",
];

const standardOutputTypes = [
  "Single display",
  "Dual mirrored displays",
  "Dual independent displays",
  "Projector",
  "Distributed displays",
  "Confidence monitor",
  "LCD wall",
  "LED wall",
];

const dualOutputTypes = [
  "Dual mirrored displays",
  "Dual independent displays",
  "Content display + conferencing display",
  "Primary display + confidence monitor",
];

const wallOutputTypes = ["LCD wall", "LED wall"];

const standardOutputBehaviours = [
  "Same content everywhere",
  "Choose source per display",
  "Presentation plus conferencing",
  "Signage loop",
  "Future expansion required",
];

const dualOutputBehaviours = [
  "Mirror same content on both displays",
  "Independent content per display",
  "Laptop dual extended desktop",
  "Presentation on one display, conferencing on the other",
  "Confidence monitor follows presenter",
];

const wallOutputBehaviours = [
  "Single full-screen input",
  "Single input tile-mode",
  "Screen-driven / input-per-display",
  "Multiview required",
  "Non-multiview",
];

const lcdWallLayouts = ["2x2 LCD wall", "3x3 LCD wall", "4x4 LCD wall", "1x3 LCD ribbon", "1x4 LCD ribbon", "Custom LCD layout"];
const ledWallLayouts = ["Single LED canvas", "Custom LED canvas"];
const lcdWallInputModes = ["Single input tile-mode", "Screen-driven / input-per-display"];
const ledWallInputModes = ["Single input canvas"];
const wallMultiviewModes = ["Multiview required", "Non-multiview"];

const meetingWorkflows = [
  "Presentation only",
  "BYOD presentation",
  "BYOM conferencing",
  "Room PC conferencing",
  "MTR / Zoom Room",
  "Wireless conferencing",
  "Streaming / recording",
  "Not sure",
];

const usbNeeds = [
  "No USB required",
  "USB camera",
  "Speakerphone",
  "Microphone",
  "Touch display return",
  "Keyboard / mouse",
  "Multiple USB devices",
  "USB 2.0 enough",
  "USB 3.x required",
  "Not sure",
];

const cameraPositions = ["No camera", "Above display", "Ceiling", "Rear of room", "Table camera", "Multiple cameras", "NDI camera", "Unknown"];

const audioNeeds = [
  "Display speakers only",
  "Speakerphone",
  "Microphones",
  "Audio de-embed",
  "Amplifier",
  "DSP integration",
  "Dante / AES67",
  "Hearing loop",
  "Unknown",
];

const runBands = ["Under 5m", "5ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“10m", "10ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“35m", "35ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“70m", "70ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“100m", "100m+", "Unknown"];

const cableTypes = ["HDMI", "Cat5e", "Cat6", "Cat6A", "Fibre", "Network only", "No cable installed", "Unknown"];

const networkOptions = [
  "No network needed",
  "Existing IT network",
  "Dedicated AV network possible",
  "Managed switch available",
  "10G available",
  "Unknown",
];

const cableRiskOptions = [
  "Cable not certified",
  "Distance not confirmed",
  "No new cable route",
  "Shared IT network",
  "Old installed cable",
  "Customer drawings needed",
  "None known",
];

const controlOptions = [
  "No control",
  "Display auto power",
  "IR",
  "RS-232",
  "Relay / contact closure",
  "Web UI",
  "Touch panel",
  "Button panel",
  "Third-party control",
];

const budgetOptions = ["Cost-sensitive", "Balanced", "Premium", "Expansion-led", "No budget yet", "Quote required quickly"];

const confidenceOptions = [
  "Enough to recommend",
  "Need site survey",
  "Need cable confirmation",
  "Need USB test",
  "Need network confirmation",
  "Need display spec",
  "Need customer drawings",
];

const initialState: DiscoveryState = {
  roomType: "Meeting room",
  behaviours: [],
  roomSize: "",
  userPosition: "",
  equipmentLocation: "",
  displayPosition: "",
  layoutFlags: [],
  sourceCount: 1,
  sourceTypes: [],
  sourceLocations: [],
  sourceConnections: [],
  displayCount: 1,
  outputTypes: [],
  outputBehaviours: [],
  wallLayout: "",
  wallInputMode: "",
  wallMultiview: "",
  meetingWorkflow: "",
  usbNeeds: [],
  cameraPosition: "",
  audioNeeds: [],
  longestRun: "",
  cableAvailable: [],
  networkAvailability: "",
  cableRisks: [],
  controlNeeds: [],
  budgetStyle: "",
  confidenceFlags: [],
  notes: "",
};

type MultiSelectKey =
  | "behaviours"
  | "layoutFlags"
  | "sourceTypes"
  | "sourceLocations"
  | "sourceConnections"
  | "outputTypes"
  | "outputBehaviours"
  | "usbNeeds"
  | "audioNeeds"
  | "cableAvailable"
  | "cableRisks"
  | "controlNeeds"
  | "confidenceFlags";

function includesAny(values: string[], tests: string[]) {
  return values.some((value) => tests.includes(value));
}

function hasDualDisplay(state: DiscoveryState) {
  return (
    state.behaviours.includes("Dual display") ||
    includesAny(state.outputTypes, [
      "Dual mirrored displays",
      "Dual independent displays",
      "Content display + conferencing display",
      "Primary display + confidence monitor",
    ]) ||
    state.outputBehaviours.some((item) => item.toLowerCase().includes("dual") || item.toLowerCase().includes("both displays"))
  );
}

function hasLcdWall(state: DiscoveryState) {
  return state.behaviours.includes("LCD wall") || state.outputTypes.includes("LCD wall");
}

function hasLedWall(state: DiscoveryState) {
  return state.behaviours.includes("LED wall") || state.outputTypes.includes("LED wall");
}

function hasDisplayWall(state: DiscoveryState) {
  return state.roomType === "Display wall / large format wall" || hasLcdWall(state) || hasLedWall(state);
}

function hasVideoWall(state: DiscoveryState) {
  return hasDisplayWall(state);
}

function getDisplayPositionOptions(state: DiscoveryState) {
  if (hasDisplayWall(state)) {
    return wallDisplayPositions;
  }

  if (hasDualDisplay(state)) {
    return dualDisplayPositions;
  }

  return standardDisplayPositions;
}

function getDisplayPositionHelper(state: DiscoveryState) {
  if (hasDisplayWall(state)) {
    return "Wall requirement selected. Capture where the LCD/LED wall canvas will physically sit; detailed wall spec can be done in the wall wizard or quick pick below.";
  }

  if (hasDualDisplay(state)) {
    return "Dual display has been selected, so only dual-screen physical arrangements are shown.";
  }

  return "Creates the display endpoint in the room model.";
}

function getOutputTypeOptions(state: DiscoveryState) {
  if (hasDisplayWall(state)) {
    return wallOutputTypes;
  }

  if (hasDualDisplay(state)) {
    return dualOutputTypes;
  }

  return standardOutputTypes;
}

function getOutputBehaviourOptions(state: DiscoveryState) {
  if (hasDisplayWall(state)) {
    return wallOutputBehaviours;
  }

  if (hasDualDisplay(state)) {
    return dualOutputBehaviours;
  }

  return standardOutputBehaviours;
}

function hasUsbRequirement(state: DiscoveryState) {
  return (
    state.usbNeeds.length > 0 &&
    !state.usbNeeds.includes("No USB required") &&
    !state.usbNeeds.every((item) => item === "Not sure")
  );
}

function hasConferencing(state: DiscoveryState) {
  return (
    includesAny(state.behaviours, ["Video conferencing", "Wireless conferencing", "BYOM"]) ||
    includesAny([state.meetingWorkflow], ["BYOM conferencing", "Room PC conferencing", "MTR / Zoom Room", "Wireless conferencing"])
  );
}

function hasDistributedNeed(state: DiscoveryState) {
  return (
    state.roomType === "Multi-zone venue" ||
    state.behaviours.includes("Central distribution") ||
    state.outputBehaviours.includes("Choose source per display") ||
    state.outputBehaviours.includes("Future expansion required") ||
    state.layoutFlags.includes("Future expansion") ||
    state.outputTypes.includes("Distributed displays")
  );
}

function distanceRank(longestRun: string) {
  if (longestRun === "Under 5m") {
    return 1;
  }

  if (longestRun === "5ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“10m") {
    return 2;
  }

  if (longestRun === "10ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“35m") {
    return 3;
  }

  if (longestRun === "35ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“70m") {
    return 4;
  }

  if (longestRun === "70ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“100m") {
    return 5;
  }

  if (longestRun === "100m+") {
    return 6;
  }

  return 0;
}

function inferDesign(state: DiscoveryState): Inference {
  const missing: string[] = [];
  const risks: string[] = [];
  const productDirection: string[] = [];
  const avoid: string[] = [];

  if (!state.roomType) {
    missing.push("Room/application type");
  }

  if (!state.roomSize) {
    missing.push("Room size");
  }

  if (!state.userPosition) {
    missing.push("Main user/source position");
  }

  if (!state.equipmentLocation) {
    missing.push("Equipment/rack location");
  }

  if (!state.displayPosition) {
    missing.push("Display position");
  }

  if (!state.sourceTypes.length) {
    missing.push("Source types");
  }

  if (!state.sourceLocations.length) {
    missing.push("Source locations");
  }

  if (!state.outputTypes.length) {
    missing.push("Display/output type");
  }

  if (hasDisplayWall(state) && !state.wallLayout) {
    missing.push("LCD/LED wall layout");
  }

  if (hasDisplayWall(state) && !state.wallInputMode) {
    missing.push("Wall input mode");
  }

  if (hasDisplayWall(state) && !state.wallMultiview) {
    missing.push("Wall multiview requirement");
  }

  if (!state.longestRun || state.longestRun === "Unknown") {
    missing.push("Longest cable run");
  }

  if (!state.cableAvailable.length || state.cableAvailable.includes("Unknown")) {
    missing.push("Installed cable type/grade");
  }

  if (hasUsbRequirement(state) && (!state.meetingWorkflow || state.meetingWorkflow === "Not sure")) {
    missing.push("USB/conferencing workflow");
  }

  if (state.cableRisks.includes("Cable not certified")) {
    risks.push("Cable is not certified; avoid committing to maximum distance/resolution until verified.");
  }

  if (state.cableRisks.includes("Distance not confirmed")) {
    risks.push("Distance is not confirmed; product family and receiver choice may change.");
  }

  if (state.cableRisks.includes("Shared IT network")) {
    risks.push("Shared IT network may restrict AVoIP multicast, QoS, IGMP, or bandwidth behaviour.");
  }

  if (state.usbNeeds.includes("USB 3.x required")) {
    risks.push("USB 3.x requirement must be verified before selecting USB transport hardware.");
  }

  if (state.networkAvailability === "Existing IT network" && hasDistributedNeed(state)) {
    risks.push("NetworkHD / AVoIP design needs IT confirmation before final hardware selection.");
  }

  let architecture = "Structured presentation / extension system";

  if (hasLedWall(state) && !hasLcdWall(state)) {
    architecture =
      state.wallMultiview === "Multiview required"
        ? "LED wall with upstream multiview composition feeding a single LED canvas"
        : "LED wall single-input canvas path";

    productDirection.push("Treat LED as a single input canvas into the LED controller unless multiview composition is specifically required upstream.");
    productDirection.push("If multiview is required, define source composition before the LED processor/controller input.");
    productDirection.push("Use the wall wizard for detailed LED dimensions, pixel pitch, processor handoff, and source behaviour.");
    avoid.push("Do not treat LED as a normal multi-output LCD tile wall unless the LED processor specifically requires that topology.");
  }

  if (hasLcdWall(state)) {
    architecture =
      state.wallInputMode === "Screen-driven / input-per-display"
        ? "LCD wall with screen-driven / input-per-display processing"
        : "LCD wall single-input tile-mode processing";

    productDirection.push("Use quick-pick LCD layouts such as 2x2, 3x3, or 4x4 to size the wall before detailed design.");
    productDirection.push("For fixed tile-mode walls, consider SW-0204-VW or SW-0206-VW before escalating to AVoIP.");
    productDirection.push("If multiview or flexible source routing is required, consider NetworkHD / AVoIP or multiview processing.");
    avoid.push("Do not assume AVoIP is automatically required until wall layout, input mode, and multiview need are confirmed.");
  }

  if (!hasVideoWall(state) && hasDistributedNeed(state)) {
    architecture = "Distributed AV routing architecture";
    productDirection.push("Consider NetworkHD 100 for cost-effective flexible distribution.");
    productDirection.push("Consider NetworkHD 500 where 4K60 4:4:4, lower latency, stronger USB, or Dante-ready workflows matter.");
    productDirection.push("Consider NetworkHD 600 where lossless zero-latency 10G performance is required.");
    avoid.push("Avoid fixed small switchers if many-to-many routing or future expansion is required.");
  }

  if (!hasVideoWall(state) && !hasDistributedNeed(state) && hasUsbRequirement(state)) {
    architecture = "Integrated HDMI/USB or USB-C presentation transport";
    productDirection.push("Use an integrated solution path that carries video and USB together where possible.");
    productDirection.push("Check SW-130-TX-UK / SW-130-TX-US with RX-500 where in-wall HDMI/USB-C plus USB transport is required.");
    productDirection.push("Check SW-120-TX3 family with RX3-100 where HDBaseT 3.0 style performance is more appropriate.");
    avoid.push("Do not treat HDMI and USB as separate extender products unless the installation genuinely requires split paths.");
  }

  if (!hasVideoWall(state) && !hasDistributedNeed(state) && !hasUsbRequirement(state) && distanceRank(state.longestRun) >= 3) {
    architecture = "HDBaseT video transport";
    productDirection.push("Use HDBaseT when the source/display run exceeds practical HDMI distance.");
    productDirection.push("If video-only, select receiver family by distance: RX-35 for shorter HDBaseT runs, RX-70 for longer runs.");
    avoid.push("Avoid over-specifying USB-capable receiver paths if USB transport is not required.");
  }

  if (!hasVideoWall(state) && !hasDistributedNeed(state) && !hasUsbRequirement(state) && distanceRank(state.longestRun) <= 2 && distanceRank(state.longestRun) > 0) {
    architecture = "Local HDMI / presentation switching";
    productDirection.push("Use a simpler local switching or short HDMI path where distance and behaviour allow.");
    avoid.push("Avoid AVoIP or HDBaseT where a local switcher and short HDMI connection is enough.");
  }

  if (state.outputTypes.includes("Dual independent displays") || state.behaviours.includes("Dual display")) {
    productDirection.push("Dual-screen selection should drive whether mirrored output, independent output, MST, or presentation-plus-conferencing mode is required.");
  }

  if (state.outputTypes.includes("Multiview display") || state.behaviours.includes("Multiview") || state.wallMultiview === "Multiview required") {
    productDirection.push("Check multiview-capable paths such as NHD-150-RX or NHD-0401-MV depending on NetworkHD family.");
  }

  if (hasConferencing(state) && !hasUsbRequirement(state)) {
    risks.push("Conferencing selected but USB devices are not yet captured; camera/microphone path is likely missing.");
  }

  const confidence =
    missing.length <= 2 && risks.length <= 2
      ? "High"
      : missing.length <= 5
        ? "Medium"
        : "Low";

  return {
    architecture,
    productDirection,
    avoid,
    confidence,
    missing,
    risks,
  };
}

function ChipButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[34px] items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function ChipGroup({
  title,
  helper,
  options,
  value,
  onSelect,
  multi = false,
}: {
  title: string;
  helper: string;
  options: string[];
  value: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = multi ? Array.isArray(value) && value.includes(option) : value === option;

          return <ChipButton key={option} active={active} label={option} onClick={() => onSelect(option)} />;
        })}
      </div>
    </div>
  );
}

function CountControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-sm font-black text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">Use quick controls during the live call.</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
        >
          <Minus className="h-4 w-4" />
        </button>

        <span className="min-w-10 rounded-full bg-slate-900 px-3 py-1 text-center text-sm font-black text-white">
          {value}
        </span>

        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StepBadge({
  index,
  activeStepIndex,
  label,
  description,
  onClick,
}: {
  index: number;
  activeStepIndex: number;
  label: string;
  description: string;
  onClick: () => void;
}) {
  const stateClass =
    index < activeStepIndex
      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
      : index === activeStepIndex
        ? "border-amber-300 bg-amber-100 text-amber-900"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${stateClass}`}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-black">
        {index < activeStepIndex ? <Check className="h-4 w-4" /> : index + 1}
      </span>
      <span>
        <span className="block font-black">{label}</span>
        <span className="mt-1 block text-xs opacity-75">{description}</span>
      </span>
    </button>
  );
}

function ValueLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || "Not captured yet"}</p>
    </div>
  );
}

function ListLine({ label, values }: { label: string; values: string[] }) {
  return <ValueLine label={label} value={values.length ? values.join(", ") : "Not captured yet"} />;
}

export function DiscoveryPage() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [state, setState] = useState<DiscoveryState>(initialState);

  const inference = useMemo(() => inferDesign(state), [state]);
  const currentStep = steps[activeStepIndex];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === steps.length - 1;
  const displayPositionOptions = useMemo(() => getDisplayPositionOptions(state), [state]);
  const outputTypeOptions = useMemo(() => getOutputTypeOptions(state), [state]);
  const outputBehaviourOptions = useMemo(() => getOutputBehaviourOptions(state), [state]);
  const isWallMode = hasDisplayWall(state);
  const isLedMode = hasLedWall(state);
  const isLcdMode = hasLcdWall(state);
const capturedPercent = useMemo(() => {
    const required = [
      state.roomType,
      state.roomSize,
      state.userPosition,
      state.equipmentLocation,
      state.displayPosition,
      state.sourceTypes.length ? "sources" : "",
      state.sourceLocations.length ? "source locations" : "",
      state.outputTypes.length ? "outputs" : "",
      state.longestRun,
      state.cableAvailable.length ? "cable" : "",
      state.budgetStyle,
    ];

    const wallRequired = hasDisplayWall(state) ? [state.wallLayout, state.wallInputMode, state.wallMultiview] : [];
    const filled = [...required, ...wallRequired].filter(Boolean).length;
    return Math.round((filled / (required.length + wallRequired.length)) * 100);
  }, [state]);

  function setField<K extends keyof DiscoveryState>(key: K, value: DiscoveryState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function toggleMulti(key: MultiSelectKey, value: string) {
    setState((current) => {
      const existing = current[key];
      const nextValues = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];

      return {
        ...current,
        [key]: nextValues,
      } as DiscoveryState;
    });
  }

  function saveDiscoveryBrief() {
    const brief = {
      savedAt: new Date().toISOString(),
      roomModel: state,
      inference,
      capturedPercent,
      returnRoute: routeCatalogByKey.discovery.path,
    };

    window.localStorage.setItem("wingman-discovery-brief", JSON.stringify(brief));
    window.localStorage.setItem(
      "wingman-workflow-context",
      JSON.stringify({
        source: "discovery",
        savedAt: brief.savedAt,
        projectStage: "Discovery",
        nextRecommendedRoute: routeCatalogByKey.finder.path,
        returnRoute: routeCatalogByKey.discovery.path,
        brief,
      }),
    );

    window.dispatchEvent(new CustomEvent("wingman:discovery-brief-saved", { detail: brief }));
  }

  function renderWallQuickPick() {
    if (!isWallMode) {
      return null;
    }

    const wallLayoutOptions = isLedMode && !isLcdMode ? ledWallLayouts : lcdWallLayouts;
    const wallInputOptions = isLedMode && !isLcdMode ? ledWallInputModes : lcdWallInputModes;

    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-700" />
              <p className="text-sm font-black text-amber-950">Wall quick pick</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              Use quick pick for common LCD/LED wall assumptions, or open the wall wizard for detailed layout, source,
              multiview, and processor decisions.
            </p>
          </div>

          <Link
            to={routeCatalogByKey.videowall.path}
            onClick={saveDiscoveryBrief}
            className="rounded-full bg-amber-600 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-700"
          >
            Open wall wizard
          </Link>
        </div>

        <div className="mt-4 grid gap-4">
          <ChipGroup
            title={isLedMode && !isLcdMode ? "LED wall canvas" : "LCD wall layout"}
            helper={
              isLedMode && !isLcdMode
                ? "LED is treated as a single canvas/input unless upstream multiview composition is required."
                : "Choose a common LCD wall format for fast qualification. Detailed bezel, model, and processor work can happen in the wall wizard."
            }
            options={wallLayoutOptions}
            value={state.wallLayout}
            onSelect={(value) => setField("wallLayout", value)}
          />

          <ChipGroup
            title="Input mode"
            helper={
              isLedMode && !isLcdMode
                ? "LED should default to a single input canvas. Multiview, if needed, is normally composed before the LED input."
                : "Single input tile-mode is different from screen-driven / input-per-display behaviour."
            }
            options={wallInputOptions}
            value={state.wallInputMode}
            onSelect={(value) => setField("wallInputMode", value)}
          />

          <ChipGroup
            title="Multiview requirement"
            helper="This is required for both LCD and LED paths because it changes whether simple tile-mode is enough or composition/routing is needed."
            options={wallMultiviewModes}
            value={state.wallMultiview}
            onSelect={(value) => setField("wallMultiview", value)}
          />
        </div>
      </div>
    );
  }
  function renderStep(stepId: StepId) {
    if (stepId === "useCase") {
      return (
        <div className="grid gap-5">
          <ChipGroup
            title="Room / application type"
            helper="This sets the starting context only. Display behaviour, USB, wall, and routing choices are captured later where they are relevant."
            options={roomTypes}
            value={state.roomType}
            onSelect={(value) => setField("roomType", value)}
          />
<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">Customer wording / unusual notes</p>
            <textarea
              value={state.notes}
              onChange={(event) => setField("notes", event.target.value)}
              placeholder="Optional. Capture anything the customer says that does not fit the quick-click options."
              className="mt-3 min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
          </div>
        </div>
      );
    }

    if (stepId === "layout") {
      return (
        <div className="grid gap-5">
          <ChipGroup
            title="Room size"
            helper="Used to infer cable distance, solution complexity, and likely equipment positioning."
            options={roomSizes}
            value={state.roomSize}
            onSelect={(value) => setField("roomSize", value)}
          />

          <ChipGroup
            title="Main user / source position"
            helper="Where will the user normally connect or operate the system?"
            options={userPositions}
            value={state.userPosition}
            onSelect={(value) => setField("userPosition", value)}
          />

          <ChipGroup
            title="Equipment position"
            helper="This strongly affects HDMI, HDBaseT, AVoIP, and local switcher decisions."
            options={equipmentLocations}
            value={state.equipmentLocation}
            onSelect={(value) => setField("equipmentLocation", value)}
          />

          <ChipGroup
            title="Display position"
            helper={getDisplayPositionHelper(state)}
            options={displayPositionOptions}
            value={state.displayPosition}
            onSelect={(value) => setField("displayPosition", value)}
          />

          <ChipGroup
            title="Layout flags"
            helper="Only select flags that change the architecture or risk profile."
            options={layoutFlags}
            value={state.layoutFlags}
            onSelect={(value) => toggleMulti("layoutFlags", value)}
            multi
          />
        </div>
      );
    }

    if (stepId === "sources") {
      return (
        <div className="grid gap-5">
          <CountControl label="Number of source positions" value={state.sourceCount} onChange={(value) => setField("sourceCount", value)} />

          <ChipGroup
            title="Source types"
            helper="What needs to connect into the system?"
            options={sourceTypes}
            value={state.sourceTypes}
            onSelect={(value) => toggleMulti("sourceTypes", value)}
            multi
          />

          <ChipGroup
            title="Source locations"
            helper="Where are those sources physically located?"
            options={sourceLocations}
            value={state.sourceLocations}
            onSelect={(value) => toggleMulti("sourceLocations", value)}
            multi
          />

          <ChipGroup
            title="Source connection types"
            helper="Connection type affects presentation switcher, extender, and USB-C product selection."
            options={sourceConnections}
            value={state.sourceConnections}
            onSelect={(value) => toggleMulti("sourceConnections", value)}
            multi
          />
        </div>
      );
    }

    if (stepId === "outputs") {
      const selectedArrangement = state.outputTypes[0] ?? "";
      const selectedBehaviour = state.outputBehaviours[0] ?? "";

      return (
        <div className="grid gap-5">
          <CountControl
            label="Number of display/output positions"
            value={state.displayCount}
            onChange={(value) => setField("displayCount", value)}
          />

          <ChipGroup
            title="Display arrangement"
            helper={
              isWallMode
                ? "Wall mode is active. Choose LCD wall or LED wall only; detailed wall layout is handled by quick pick or the wall wizard."
                : hasDualDisplay(state)
                  ? "Dual display was selected earlier, so only dual-screen arrangements are shown."
                  : "Choose the physical output arrangement. This is not asking behaviour yet."
            }
            options={outputTypeOptions}
            value={selectedArrangement}
            onSelect={(value) => {
              setField("outputTypes", [value]);
              setField("outputBehaviours", []);
              setField("wallLayout", "");
              setField("wallInputMode", "");
              setField("wallMultiview", "");
            }}
          />

          <ChipGroup
            title="Display behaviour"
            helper={
              isWallMode
                ? "For LCD/LED walls, choose simple full-screen/tile-mode, screen-driven, multiview, or non-multiview."
                : hasDualDisplay(state)
                  ? "For dual displays, choose the required relationship between the two screens."
                  : "Choose what the display system needs to do. This drives switching, matrix, multiview, wall processing, or AVoIP logic."
            }
            options={outputBehaviourOptions}
            value={selectedBehaviour}
            onSelect={(value) => setField("outputBehaviours", [value])}
          />

          {renderWallQuickPick()}
        </div>
      );
    }
    if (stepId === "usb") {
      return (
        <div className="grid gap-5">
          <ChipGroup
            title="Meeting / user workflow"
            helper="Separates simple presentation from BYOM, MTR/Zoom Room, conferencing, streaming, or room PC workflows."
            options={meetingWorkflows}
            value={state.meetingWorkflow}
            onSelect={(value) => setField("meetingWorkflow", value)}
          />

          <ChipGroup
            title="USB requirement"
            helper="USB is often the deciding factor. Select the actual peripheral behaviour, not just the word USB."
            options={usbNeeds}
            value={state.usbNeeds}
            onSelect={(value) => toggleMulti("usbNeeds", value)}
            multi
          />

          <ChipGroup
            title="Camera position"
            helper="Camera position determines USB, HDMI, NDI, and cable routing requirements."
            options={cameraPositions}
            value={state.cameraPosition}
            onSelect={(value) => setField("cameraPosition", value)}
          />

          <ChipGroup
            title="Audio requirement"
            helper="Audio can change the required product family, DSP handoff, and proposal scope."
            options={audioNeeds}
            value={state.audioNeeds}
            onSelect={(value) => toggleMulti("audioNeeds", value)}
            multi
          />
        </div>
      );
    }

    if (stepId === "infrastructure") {
      return (
        <div className="grid gap-5">
          <ChipGroup
            title="Longest signal run"
            helper="This should drive transport recommendation. Do not ask non-technical users to guess HDMI vs HDBaseT too early."
            options={runBands}
            value={state.longestRun}
            onSelect={(value) => setField("longestRun", value)}
          />

          <ChipGroup
            title="Available cable / pathway"
            helper="Select what is installed or what can realistically be installed."
            options={cableTypes}
            value={state.cableAvailable}
            onSelect={(value) => toggleMulti("cableAvailable", value)}
            multi
          />

          <ChipGroup
            title="Network availability"
            helper="Only matters if AVoIP, NDI, control, streaming, or network audio may be required."
            options={networkOptions}
            value={state.networkAvailability}
            onSelect={(value) => setField("networkAvailability", value)}
          />

          <ChipGroup
            title="Known infrastructure risks"
            helper="These directly affect confidence and whether the rep should quote or request more information."
            options={cableRiskOptions}
            value={state.cableRisks}
            onSelect={(value) => toggleMulti("cableRisks", value)}
            multi
          />
        </div>
      );
    }

    return (
      <div className="grid gap-5">
        <ChipGroup
          title="Control needs"
          helper="Control and operation should be included before product recommendation."
          options={controlOptions}
          value={state.controlNeeds}
          onSelect={(value) => toggleMulti("controlNeeds", value)}
          multi
        />

        <ChipGroup
          title="Commercial direction"
          helper="Used to avoid over-engineering or under-specifying."
          options={budgetOptions}
          value={state.budgetStyle}
          onSelect={(value) => setField("budgetStyle", value)}
        />

        <ChipGroup
          title="Confidence / validation flags"
          helper="Select anything that should stop Wingman from producing an over-confident recommendation."
          options={confidenceOptions}
          value={state.confidenceFlags}
          onSelect={(value) => toggleMulti("confidenceFlags", value)}
          multi
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-slate-900">
            <Network className="h-5 w-5 text-amber-600" />
            <p className="font-black">Inferred architecture</p>
          </div>

          <p className="mt-3 text-lg font-black text-slate-950">{inference.architecture}</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-black text-slate-900">Likely product direction</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {inference.productDirection.length ? (
                  inference.productDirection.map((item) => <li key={item}>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {item}</li>)
                ) : (
                  <li>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ More information is required before a reliable product direction can be stated.</li>
                )}
              </ul>
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">Avoid / do not assume</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {inference.avoid.length ? (
                  inference.avoid.map((item) => <li key={item}>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {item}</li>)
                ) : (
                  <li>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ No avoid flags yet. Continue validating distance, USB, resolution, and behaviour.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Guided Customer Discovery"
        title="Build the room model before choosing products."
        purpose="This workflow is responsive to earlier answers. Dual-display choices filter display positions and output behaviour; LCD and LED wall requirements trigger relevant wall quick-pick options or handoff to the wall wizard."
        nextMove="Capture the fastest structured path, review inferred architecture, then save the brief into Finder, Projects, or Proposal."
        actions={[
          { label: "Open Product Finder", to: routeCatalogByKey.finder.path },
          { label: "Save to Projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Click-first discovery workflow"
        subtitle="The workflow is context-sensitive. Each section only asks questions that are relevant to the current design decision."
      >
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-900">Workflow path</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                {activeStepIndex + 1} / {steps.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {steps.map((step, index) => (
                <StepBadge
                  key={step.id}
                  index={index}
                  activeStepIndex={activeStepIndex}
                  label={step.label}
                  description={step.description}
                  onClick={() => setActiveStepIndex(index)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Current step: {currentStep.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{currentStep.description}</p>
              </div>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                {capturedPercent}% design model captured
              </span>
            </div>

            <div className="mt-6">{renderStep(currentStep.id)}</div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
                disabled={isFirstStep}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={routeCatalogByKey.callCards.path}
                  onClick={saveDiscoveryBrief}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Open call cards
                </Link>

                {isLastStep ? (
                  <Link
                    to={routeCatalogByKey.finder.path}
                    onClick={saveDiscoveryBrief}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4" />
                    Save & push to Finder
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-slate-500" />
                <p className="text-sm font-black text-slate-900">Live room model</p>
              </div>

              <div className="mt-4 space-y-4 text-sm">
                <ValueLine label="Room type" value={state.roomType} />
                <ValueLine label="Room size" value={state.roomSize} />
                <ValueLine label="User position" value={state.userPosition} />
                <ValueLine label="Equipment position" value={state.equipmentLocation} />
                <ValueLine label="Display position" value={state.displayPosition} />
                <ListLine label="Sources" values={state.sourceTypes} />
                <ListLine label="Source locations" values={state.sourceLocations} />
                <ListLine label="Outputs" values={state.outputTypes} />
                <ValueLine label="Wall layout" value={state.wallLayout} />
                <ValueLine label="Wall input mode" value={state.wallInputMode} />
                <ValueLine label="Wall multiview" value={state.wallMultiview} />
                <ListLine label="USB" values={state.usbNeeds} />
                <ValueLine label="Longest run" value={state.longestRun} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <Cable className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-black text-slate-900">Architecture direction</p>
              </div>

              <p className="mt-3 text-base font-black text-slate-950">{inference.architecture}</p>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Confidence</p>
                <p
                  className={`mt-1 text-lg font-black ${
                    inference.confidence === "High"
                      ? "text-emerald-700"
                      : inference.confidence === "Medium"
                        ? "text-amber-700"
                        : "text-red-700"
                  }`}
                >
                  {inference.confidence}
                </p>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    Missing detail
                  </div>
                  <ul className="mt-2 space-y-1 text-slate-600">
                    {inference.missing.length ? (
                      inference.missing.slice(0, 6).map((item) => <li key={item}>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {item}</li>)
                    ) : (
                      <li>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ No major missing details detected.</li>
                    )}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Risks
                  </div>
                  <ul className="mt-2 space-y-1 text-slate-600">
                    {inference.risks.length ? (
                      inference.risks.slice(0, 6).map((item) => <li key={item}>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {item}</li>)
                    ) : (
                      <li>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ No major risk flags yet.</li>
                    )}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <Camera className="h-4 w-4 text-slate-500" />
                    Next design move
                  </div>
                  <p className="mt-2 text-slate-600">
                    {isLastStep
                      ? "Save the structured brief and continue into Product Finder."
                      : "Continue the click-first workflow until the room model is complete enough to recommend with confidence."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default DiscoveryPage;