import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  Monitor,
  Save,
} from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { saveDiscoveryBriefToProject } from "../data/projectStore";

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
  roomSize: string;
  equipmentLocation: string;
  displayArrangement: string;
  designDirection: string;
  sourceTypes: string[];
  sourceLocations: string[];
  sourceConnection: string;
  displayBehaviour: string;
  usbNeed: string;
  audioNeed: string;
  controlNeed: string;
  cableRun: string;
  network: string;
  notes: string;
};

type Step = {
  id: StepId;
  label: string;
  helper: string;
};

type QuestionStrategy = {
  askFirst: string;
  listenFor: string[];
  nextBest: string;
};

const steps: Step[] = [
  { id: "useCase", label: "Use case", helper: "Identify the application first." },
  { id: "layout", label: "Layout", helper: "Confirm room size and kit position." },
  { id: "sources", label: "Sources", helper: "Capture source type, location and connector." },
  { id: "outputs", label: "Outputs", helper: "Confirm display behaviour." },
  { id: "usb", label: "USB / Conferencing", helper: "Check USB, camera, audio and BYOM needs." },
  { id: "infrastructure", label: "Infrastructure", helper: "Confirm distance, cable and network risk." },
  { id: "review", label: "Review", helper: "Review the model before product selection." },
];

const baseQuestionStrategyByStep: Record<StepId, QuestionStrategy> = {
  useCase: {
    askFirst: "What is the customer trying to make happen in this space?",
    listenFor: ["room role", "business outcome", "must-have workflow"],
    nextBest: "Classify the application before moving into products or signal formats.",
  },
  layout: {
    askFirst: "Where will users, displays, and equipment physically sit?",
    listenFor: ["longest cable path", "rack location", "table or lectern constraints"],
    nextBest: "Confirm distance and equipment position before deciding transport.",
  },
  sources: {
    askFirst: "Which source devices need to connect, and where are they located?",
    listenFor: ["HDMI or USB-C", "fixed source or bring-your-own", "local or remote source"],
    nextBest: "Separate device type, connector type, and physical location.",
  },
  outputs: {
    askFirst: "What should each display show during the main customer workflow?",
    listenFor: ["mirror or independent", "presentation plus conferencing", "wall or multiview"],
    nextBest: "Confirm display behaviour before selecting matrix, extender, or processor paths.",
  },
  usb: {
    askFirst: "Does the room need USB for cameras, touch, storage, or BYOM conferencing?",
    listenFor: ["USB 2.0 vs USB 3.x", "room PC or laptop host", "camera and audio path"],
    nextBest: "Pin down the USB class so the recommendation does not under-spec transport.",
  },
  infrastructure: {
    askFirst: "What cable, network, and control constraints can the installer actually rely on?",
    listenFor: ["Cat cable grade", "managed AV network", "control protocol", "distance risk"],
    nextBest: "Capture installation risk before the model is saved to Product Finder.",
  },
  review: {
    askFirst: "Is this model accurate enough to save and move into Product Finder?",
    listenFor: ["missing source details", "unknown cable run", "confidence blockers"],
    nextBest: "Save the brief when the model captures the real application and the open risks.",
  },
};

const roomOptions = [
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

const roomSizeOptions = [
  "Small <10m",
  "Medium <25m",
  "Large <50m",
  "Extra large 50m+",
  "Unknown",
];

const equipmentOptions = [
  "Behind display",
  "Credenza",
  "Table / floor box",
  "Lectern",
  "Local rack",
  "Central rack",
  "Unknown",
];

const sourceTypeOptions = [
  "Laptop HDMI",
  "Laptop USB-C",
  "Wireless presentation",
  "Room PC",
  "Media player",
  "Signage player",
  "Microsoft Teams Room Device",
  "USB camera",
  "PTZ camera",
  "NDI camera",
  "Microphone / DSP",
  "Other source",
];

const sourceLocationOptions = [
  "Table",
  "Floor box",
  "Wall plate",
  "Lectern",
  "Behind display",
  "Local rack",
  "Central rack",
  "Network",
  "Ceiling",
  "Unknown",
];

const connectorOptions = [
  "HDMI",
  "USB-C video",
  "USB-C with charging",
  "USB only",
  "NDI",
  "Network",
  "Wireless",
  "Unknown",
];

const displayOptions = [
  "Single display",
  "Dual mirrored displays",
  "Dual independent displays",
  "Content display + conferencing display",
  "Projector",
  "Distributed displays",
  "Multiview display",
  "LCD wall",
  "LED wall",
];

const behaviourOptions = [
  "Same content everywhere",
  "Choose source per display",
  "Presentation plus conferencing",
  "Signage loop",
  "Multiview required",
  "Video wall processing",
  "Future expansion required",
  "Unknown",
];

const usbOptions = [
  "No USB required",
  "USB 2.0 is enough",
  "USB 3.x required",
  "BYOM conferencing",
  "Room PC / MTR conferencing",
  "Touch return",
  "Not sure",
];

const audioOptions = [
  "Display speakers only",
  "Speakerphone",
  "Microphones",
  "Audio de-embed",
  "DSP integration",
  "Dante / AES67",
  "Unknown",
];

const controlOptions = [
  "No control",
  "IR",
  "RS-232",
  "Display power control",
  "Web UI",
  "Touch panel",
  "Third-party control",
  "Unknown",
];

const cableRunOptions = [
  "Under 5m",
  "5-10m",
  "10-35m",
  "35-70m",
  "70-100m",
  "100m+",
  "Unknown",
];

const networkOptions = [
  "No network needed",
  "Existing IT network",
  "Dedicated AV network possible",
  "Managed switch available",
  "10G available",
  "Unknown",
];

const initialState: DiscoveryState = {
  roomType: "Meeting room",
  roomSize: "Medium <25m",
  equipmentLocation: "Behind display",
  displayArrangement: "Single display",
  designDirection: "Structured presentation / extension system",
  sourceTypes: [],
  sourceLocations: [],
  sourceConnection: "",
  displayBehaviour: "Presentation plus conferencing",
  usbNeed: "",
  audioNeed: "",
  controlNeed: "",
  cableRun: "",
  network: "",
  notes: "",
};

function getDesignDirection(state: DiscoveryState) {
  if (state.displayArrangement === "LCD wall") {
    return "LCD wall processing path";
  }

  if (state.displayArrangement === "LED wall") {
    return "LED wall single canvas path";
  }

  if (state.displayArrangement === "Distributed displays" || state.roomType === "Multi-zone venue") {
    return "Distributed AV routing architecture";
  }

  if (state.usbNeed.includes("USB") || state.usbNeed.includes("BYOM") || state.usbNeed.includes("MTR")) {
    return "Integrated video and USB presentation system";
  }

  if (state.cableRun === "35-70m" || state.cableRun === "70-100m" || state.cableRun === "100m+") {
    return "HDBaseT or AVoIP transport path";
  }

  return "Structured presentation / extension system";
}

function getMissingItems(state: DiscoveryState) {
  const missing: string[] = [];

  if (!state.roomType) missing.push("Room type");
  if (!state.roomSize) missing.push("Room size");
  if (!state.sourceTypes.length) missing.push("Source types");
  if (!state.sourceLocations.length) missing.push("Source locations");
  if (!state.sourceConnection) missing.push("Source connection type");
  if (!state.displayArrangement) missing.push("Display arrangement");
  if (!state.displayBehaviour) missing.push("Display behaviour");
  if (!state.cableRun) missing.push("Longest cable run");

  return missing;
}

function getConfidence(missingCount: number) {
  if (missingCount <= 1) return "High confidence";
  if (missingCount <= 4) return "Medium confidence";
  return "Low confidence";
}

function getQuestionStrategy(stepId: StepId, state: DiscoveryState): QuestionStrategy {
  const base = baseQuestionStrategyByStep[stepId];
  const listenFor = [...base.listenFor];
  let askFirst = base.askFirst;
  let nextBest = base.nextBest;

  if (state.roomType === "Display wall / large format wall" || state.displayArrangement.includes("wall")) {
    listenFor.push("processor type", "canvas layout", "input count");
    if (stepId === "outputs") {
      askFirst = "Is this a single canvas, LCD wall, LED wall, or multiview workflow?";
      nextBest = "Capture wall layout and content behaviour before narrowing processor choices.";
    }
  }

  if (state.usbNeed.includes("USB 3") || state.usbNeed.includes("BYOM")) {
    listenFor.push("USB bandwidth", "host handoff", "camera location");
    if (stepId === "usb") {
      askFirst = "Which host controls USB devices, and does the customer need USB 3.x bandwidth?";
      nextBest = "Keep USB bandwidth and host ownership explicit before saving the brief.";
    }
  }

  if (state.cableRun === "70-100m" || state.cableRun === "100m+") {
    listenFor.push("cable certification", "network alternative");
    if (stepId === "infrastructure") {
      nextBest = "Treat long-run risk as a design constraint, not a product afterthought.";
    }
  }

  return { askFirst, listenFor, nextBest };
}

function ChipGroup({
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
    <div>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = multi ? values?.includes(option) : value === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                selected
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50"
              }`}
            >
              <span
                className={`grid h-4 w-4 place-items-center rounded-full border ${
                  selected ? "border-white bg-white text-slate-950" : "border-slate-400"
                }`}
              >
                {selected ? <Check className="h-3 w-3" /> : null}
              </span>
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
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || "Not captured yet"}</p>
    </div>
  );
}

function ListLine({ label, values }: { label: string; values: string[] }) {
  return <ValueLine label={label} value={values.length ? values.join(", ") : "Not captured yet"} />;
}

export function DiscoveryPage() {
  const navigate = useNavigate();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [state, setState] = useState<DiscoveryState>(initialState);
  const [fullModelOpen, setFullModelOpen] = useState(false);

  const currentStep = steps[activeStepIndex];
  const missingItems = useMemo(() => getMissingItems(state), [state]);
  const confidence = getConfidence(missingItems.length);
  const designDirection = getDesignDirection(state);
  const currentQuestionStrategy = useMemo(
    () => getQuestionStrategy(currentStep.id, state),
    [currentStep.id, state],
  );

  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === steps.length - 1;

  function setField<K extends keyof DiscoveryState>(key: K, value: DiscoveryState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function toggleMulti(key: "sourceTypes" | "sourceLocations", value: string) {
    setState((current) => {
      const existing = current[key];
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];

      return { ...current, [key]: next };
    });
  }

  function saveDiscoveryBrief() {
    const brief = {
      savedAt: new Date().toISOString(),
      roomModel: { ...state, designDirection },
      inference: {
        architecture: designDirection,
        confidence,
        missing: missingItems,
        risks: [],
        productDirection: [],
        avoid: [],
      },
      capturedPercent: Math.max(10, Math.round(((8 - Math.min(missingItems.length, 8)) / 8) * 100)),
      returnRoute: routeCatalogByKey.discovery.path,
    };

    window.localStorage.setItem("wingman-discovery-brief", JSON.stringify(brief));
    saveDiscoveryBriefToProject(brief);
  }

  function renderStep() {
    if (currentStep.id === "useCase") {
      return (
        <div className="grid gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Step 1 of 7 - Use case
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">What type of space is this?</h3>
            <span className="mt-3 inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
              Next: Layout
            </span>
          </div>

          <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Why it matters
            </summary>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The application narrows the whole design before any product discussion starts.
            </p>
          </details>

          <ChipGroup
            title="Room / application"
            helper="Pick the closest room or application type. You can refine the details later."
            options={roomOptions}
            value={state.roomType}
            onSelect={(value) => setField("roomType", value)}
          />

          <div>
            <p className="text-sm font-semibold text-slate-950">Quick notes</p>
            <textarea
              value={state.notes}
              onChange={(event) => setField("notes", event.target.value)}
              placeholder="Optional customer wording."
              className="mt-3 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Optional: build required features and I/O</p>
            <p className="mt-1 text-sm text-slate-600">
              Open this if the customer already mentions USB-C, dual displays, multiview, control, audio, AVoIP or wall processing.
            </p>
          </div>
        </div>
      );
    }

    if (currentStep.id === "layout") {
      return (
        <div className="grid gap-5">
          <h3 className="text-xl font-semibold text-slate-950">Confirm the room layout.</h3>

          <ChipGroup
            title="Room size"
            helper="Use cable path length, not just straight-line room length."
            options={roomSizeOptions}
            value={state.roomSize}
            onSelect={(value) => setField("roomSize", value)}
          />

          <ChipGroup
            title="Equipment location"
            helper="This affects whether the system stays local or needs transport."
            options={equipmentOptions}
            value={state.equipmentLocation}
            onSelect={(value) => setField("equipmentLocation", value)}
          />
        </div>
      );
    }

    if (currentStep.id === "sources") {
      return (
        <div className="grid gap-5">
          <h3 className="text-xl font-semibold text-slate-950">What sources need to connect?</h3>

          <ChipGroup
            title="Source types"
            helper="Select all known source types."
            options={sourceTypeOptions}
            values={state.sourceTypes}
            multi
            onSelect={(value) => toggleMulti("sourceTypes", value)}
          />

          <ChipGroup
            title="Source locations"
            helper="Where are the sources physically located?"
            options={sourceLocationOptions}
            values={state.sourceLocations}
            multi
            onSelect={(value) => toggleMulti("sourceLocations", value)}
          />

          <ChipGroup
            title="Main source connection"
            helper="Choose the main connector mentioned by the customer."
            options={connectorOptions}
            value={state.sourceConnection}
            onSelect={(value) => setField("sourceConnection", value)}
          />
        </div>
      );
    }

    if (currentStep.id === "outputs") {
      return (
        <div className="grid gap-5">
          <h3 className="text-xl font-semibold text-slate-950">What should the displays show?</h3>

          <ChipGroup
            title="Display arrangement"
            options={displayOptions}
            value={state.displayArrangement}
            onSelect={(value) => setField("displayArrangement", value)}
          />

          <ChipGroup
            title="Display behaviour"
            options={behaviourOptions}
            value={state.displayBehaviour}
            onSelect={(value) => setField("displayBehaviour", value)}
          />
        </div>
      );
    }

    if (currentStep.id === "usb") {
      return (
        <div className="grid gap-5">
          <h3 className="text-xl font-semibold text-slate-950">Does the room need USB or conferencing?</h3>

          <ChipGroup
            title="USB / conferencing requirement"
            options={usbOptions}
            value={state.usbNeed}
            onSelect={(value) => setField("usbNeed", value)}
          />

          <ChipGroup
            title="Audio requirement"
            options={audioOptions}
            value={state.audioNeed}
            onSelect={(value) => setField("audioNeed", value)}
          />
        </div>
      );
    }

    if (currentStep.id === "infrastructure") {
      return (
        <div className="grid gap-5">
          <h3 className="text-xl font-semibold text-slate-950">Confirm distance, cable and control risk.</h3>

          <ChipGroup
            title="Longest cable run"
            options={cableRunOptions}
            value={state.cableRun}
            onSelect={(value) => setField("cableRun", value)}
          />

          <ChipGroup
            title="Network availability"
            options={networkOptions}
            value={state.network}
            onSelect={(value) => setField("network", value)}
          />

          <ChipGroup
            title="Control needs"
            options={controlOptions}
            value={state.controlNeed}
            onSelect={(value) => setField("controlNeed", value)}
          />
        </div>
      );
    }

    return (
      <div className="grid gap-5">
        <h3 className="text-xl font-semibold text-slate-950">Review before product selection.</h3>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Recommended design direction</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{designDirection}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Save this brief when the captured model is good enough to move into Product Finder.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">Missing information</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {missingItems.length ? (
              missingItems.map((item) => <li key={item}>- {item}</li>)
            ) : (
              <li>- No major missing items detected.</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <main className="pb-8">
      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Wingman workspace</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Wingman workspace / Discovery</h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose the closest application so Wingman can keep the rest of the call focused.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Live call mode
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {confidence}
            </span>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
          {steps.map((step, index) => {
            const active = index === activeStepIndex;
            const complete = index < activeStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                title={step.helper}
                onClick={() => setActiveStepIndex(index)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white"
                    : complete
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/90 text-xs text-slate-950">
                  {complete ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Live call guidance</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">{currentQuestionStrategy.askFirst}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{currentQuestionStrategy.nextBest}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentQuestionStrategy.listenFor.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {renderStep()}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                disabled={isFirstStep}
                onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate(routeCatalogByKey.callCards.path)}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                >
                  Open call cards
                </button>

                <button
                  type="button"
                  onClick={saveDiscoveryBrief}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
                >
                  <Save className="h-4 w-4" />
                  Save to project
                </button>

                {isLastStep ? (
                  <button
                    type="button"
                    onClick={() => {
                      saveDiscoveryBrief();
                      navigate(routeCatalogByKey.finder.path);
                    }}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white"
                  >
                    Open Product Finder
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-slate-500" />
                <p className="text-sm font-semibold text-slate-950">Current model</p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {confidence}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <ValueLine label="Room type" value={state.roomType} />
              <ValueLine label="Room size" value={state.roomSize} />
              <ValueLine label="Display arrangement" value={state.displayArrangement} />
              <ValueLine label="Design direction" value={designDirection} />
              <ListLine label="Source types" values={state.sourceTypes} />
              <ListLine label="Source locations" values={state.sourceLocations} />
              <ValueLine label="Source connection" value={state.sourceConnection} />
              <ValueLine label="Cable run" value={state.cableRun} />
            </div>

            <button
              type="button"
              onClick={() => setFullModelOpen((open) => !open)}
              className="mt-5 w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View full model
            </button>

            {fullModelOpen ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">Full captured model</p>
                <dl className="mt-3 grid gap-3 text-sm">
                  <ValueLine label="Equipment location" value={state.equipmentLocation} />
                  <ValueLine label="Display behaviour" value={state.displayBehaviour} />
                  <ValueLine label="USB / conferencing" value={state.usbNeed} />
                  <ValueLine label="Audio" value={state.audioNeed} />
                  <ValueLine label="Control" value={state.controlNeed} />
                  <ValueLine label="Network" value={state.network} />
                  <ValueLine label="Notes" value={state.notes} />
                </dl>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-950">Top missing items</p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {missingItems.length ? (
                  missingItems.slice(0, 4).map((item) => <li key={item}>- {item}</li>)
                ) : (
                  <li>- Ready for product selection.</li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default DiscoveryPage;
