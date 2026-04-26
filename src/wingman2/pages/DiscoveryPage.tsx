import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const applicationProfiles = {
  "Meeting room": {
    knownNeeds: "Presentation, conferencing, laptop inputs, display output",
    missingInfo: "Camera USB path, audio handoff, cable distance, and control requirements",
  },
  Boardroom: {
    knownNeeds: "Multiple presentation sources, dual displays, control integration",
    missingInfo: "Table connectivity, camera count, and audio handoff",
  },
  Classroom: {
    knownNeeds: "Lectern input switching, display extension, simple instructor control",
    missingInfo: "USB teaching peripherals, recording workflow, and display distance",
  },
  "Retail signage": {
    knownNeeds: "Distributed displays, repeatable content routing, simple support path",
    missingInfo: "Display count, signal distance, and failover behaviour",
  },
  Hospitality: {
    knownNeeds: "Guest-facing displays, flexible sources, easy day-two support",
    missingInfo: "Centralised control and content scheduling requirements",
  },
  "Multi-zone": {
    knownNeeds: "Many-to-many routing, future expansion, mixed display endpoints",
    missingInfo: "Network availability, latency expectations, and USB needs",
  },
} as const;

const steps = [
  {
    id: "application",
    label: "Application Type",
    description: "Define the customer environment and primary use case.",
  },
  {
    id: "room",
    label: "Room / Space",
    description: "Capture size, layout, rack position, and physical constraints.",
  },
  {
    id: "sources",
    label: "Sources & Displays",
    description: "Map what connects, where it is, and where it needs to appear.",
  },
  {
    id: "transport",
    label: "Signal Transport",
    description: "Choose HDMI, HDBaseT, fibre, AVoIP, or mixed transport logic.",
  },
  {
    id: "usb",
    label: "USB / Control",
    description: "Capture cameras, microphones, touch, BYOD/BYOM, and control needs.",
  },
  {
    id: "cables",
    label: "Cable Constraints",
    description: "Identify cable routes, cable type, distance, and installation risk.",
  },
  {
    id: "budget",
    label: "Budget & Preferences",
    description: "Capture commercial direction and proposal assumptions.",
  },
] as const;

const applicationOptions = Object.keys(applicationProfiles) as (keyof typeof applicationProfiles)[];

type ApplicationOption = keyof typeof applicationProfiles;
type StepId = (typeof steps)[number]["id"];

type DiscoveryAnswers = {
  application: ApplicationOption;
  roomSize: string;
  roomLayout: string;
  rackLocation: string;
  sources: string;
  displays: string;
  transport: string;
  usbControl: string;
  cableConstraints: string;
  budget: string;
  notes: string;
};

const initialAnswers: DiscoveryAnswers = {
  application: "Meeting room",
  roomSize: "",
  roomLayout: "",
  rackLocation: "",
  sources: "",
  displays: "",
  transport: "",
  usbControl: "",
  cableConstraints: "",
  budget: "",
  notes: "",
};

function stepClass(index: number, activeStepIndex: number) {
  if (index < activeStepIndex) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  if (index === activeStepIndex) {
    return "border-amber-300 bg-amber-100 text-amber-900";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function stepIcon(index: number, activeStepIndex: number) {
  if (index < activeStepIndex) {
    return <Check className="h-4 w-4" />;
  }

  return <span>{index + 1}</span>;
}

function FieldLabel({ label, helper }: { label: string; helper?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      {helper ? <span className="text-xs leading-5 text-slate-500">{helper}</span> : null}
    </label>
  );
}

function TextAreaField({
  label,
  helper,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2">
      <FieldLabel label={label} helper={helper} />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[108px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />
    </div>
  );
}

export function DiscoveryPage() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [answers, setAnswers] = useState<DiscoveryAnswers>(initialAnswers);

  const currentStep = steps[activeStepIndex];
  const selectedProfile = applicationProfiles[answers.application];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === steps.length - 1;

  const briefCompleteness = useMemo(() => {
    const values = [
      answers.application,
      answers.roomSize,
      answers.roomLayout,
      answers.sources,
      answers.displays,
      answers.transport,
      answers.usbControl,
      answers.cableConstraints,
      answers.budget,
    ];

    const filled = values.filter((value) => value.trim().length > 0).length;
    return Math.round((filled / values.length) * 100);
  }, [answers]);

  function updateAnswer<K extends keyof DiscoveryAnswers>(key: K, value: DiscoveryAnswers[K]) {
    setAnswers((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function goBack() {
    setActiveStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  function jumpToStep(index: number) {
    setActiveStepIndex(index);
  }

  function renderCurrentStep(stepId: StepId) {
    switch (stepId) {
      case "application":
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {applicationOptions.map((option) => {
                const isActive = option === answers.application;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateAnswer("application", option)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                    }`}
                  >
                    <p className="font-semibold">{option}</p>
                    <p className="mt-1 text-sm opacity-80">Apply a guided question branch</p>
                  </button>
                );
              })}
            </div>

            <TextAreaField
              label="Anything already known?"
              helper="Capture the customer's opening request in plain language."
              value={answers.notes}
              onChange={(value) => updateAnswer("notes", value)}
              placeholder="Example: Customer wants a Microsoft Teams room with laptop sharing, camera, wall display, and a simple table connection."
            />
          </div>
        );

      case "room":
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {["Small <10m", "Medium <25m", "Large <50m", "Extra-large 50m+"].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateAnswer("roomSize", size)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    answers.roomSize === size
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <TextAreaField
              label="Room layout"
              helper="Describe table, lectern, displays, wall/floor boxes, rack position, divisible spaces, or repeater needs."
              value={answers.roomLayout}
              onChange={(value) => updateAnswer("roomLayout", value)}
              placeholder="Example: Central table with BYOD input, display on front wall, local rack behind display, camera above screen."
            />

            <TextAreaField
              label="Rack / equipment location"
              helper="This helps decide HDMI, HDBaseT, AVoIP, or local switching."
              value={answers.rackLocation}
              onChange={(value) => updateAnswer("rackLocation", value)}
              placeholder="Example: Local rack behind display, central comms room, lectern, credenza, or no rack confirmed."
            />
          </div>
        );

      case "sources":
        return (
          <div className="grid gap-4">
            <TextAreaField
              label="Sources"
              helper="List source type, quantity, location, connection, and expected resolution."
              value={answers.sources}
              onChange={(value) => updateAnswer("sources", value)}
              placeholder="Example: 1x USB-C laptop at table, 1x HDMI guest input at wall plate, 1x room PC in rack."
            />

            <TextAreaField
              label="Displays / outputs"
              helper="List display count, location, orientation, resolution, and special behaviour."
              value={answers.displays}
              onChange={(value) => updateAnswer("displays", value)}
              placeholder="Example: 1x 4K front display, future second display, no video wall, no multiview required."
            />
          </div>
        );

      case "transport":
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {["Short HDMI", "HDBaseT", "Fibre", "NetworkHD AVoIP", "Mixed / not sure"].map((transport) => (
                <button
                  key={transport}
                  type="button"
                  onClick={() => updateAnswer("transport", transport)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    answers.transport === transport
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                  }`}
                >
                  {transport}
                </button>
              ))}
            </div>

            <TextAreaField
              label="Transport notes"
              helper="Capture distance, cable routes, network availability, or why a transport method was chosen."
              value={answers.transport}
              onChange={(value) => updateAnswer("transport", value)}
              placeholder="Example: Table to display is 18m over existing Cat6, USB camera return required, no managed AV network available."
            />
          </div>
        );

      case "usb":
        return (
          <div className="grid gap-4">
            <TextAreaField
              label="USB, camera, audio, and control needs"
              helper="Include cameras, microphones, speakerphones, touch displays, keyboard/mouse, BYOM, control panels, or IR/RS-232 needs."
              value={answers.usbControl}
              onChange={(value) => updateAnswer("usbControl", value)}
              placeholder="Example: Laptop must use room USB camera and speakerphone. No touch display. Basic display control only."
            />
          </div>
        );

      case "cables":
        return (
          <div className="grid gap-4">
            <TextAreaField
              label="Cable constraints"
              helper="Capture existing cables, new cable routes, maximum distance, cable grade, and installation risks."
              value={answers.cableConstraints}
              onChange={(value) => updateAnswer("cableConstraints", value)}
              placeholder="Example: Existing Cat6 from table box to display wall, about 25m. Unknown cable certification. No new conduit available."
            />
          </div>
        );

      case "budget":
        return (
          <div className="grid gap-4">
            <TextAreaField
              label="Budget and proposal preferences"
              helper="Capture good/better/best expectation, customer sensitivity, stock/timeline pressure, or preferred WyreStorm family."
              value={answers.budget}
              onChange={(value) => updateAnswer("budget", value)}
              placeholder="Example: Customer wants reliable mid-range solution, no AVoIP unless needed, quote required this week."
            />

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Discovery ready for next workflow</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Review the live summary, then push this into Product Finder or save it against the project.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Guided Customer Discovery"
        title="Turn a loose customer request into a usable technical brief."
        purpose="This workflow now moves step-by-step with Back and Next controls, so sales users can progress through the discovery conversation without losing structure."
        nextMove="Complete each step, review the live summary, then push the brief into Product Finder for a pre-filled recommendation path."
        actions={[
          { label: "Open Product Finder", to: routeCatalogByKey.finder.path },
          { label: "Save to Projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Discovery workflow"
        subtitle="Amber shows the current step, green shows completed steps, and grey shows steps still to complete."
      >
        <div className="grid gap-6 xl:grid-cols-[280px_1fr_340px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Steps</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {activeStepIndex + 1} / {steps.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => jumpToStep(index)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${stepClass(
                    index,
                    activeStepIndex,
                  )}`}
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-black">
                    {stepIcon(index, activeStepIndex)}
                  </span>
                  <span>
                    <span className="block font-semibold">{step.label}</span>
                    <span className="mt-1 block text-xs opacity-75">{step.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Current step: {currentStep.label}</p>
                <p className="mt-1 text-sm text-slate-500">{currentStep.description}</p>
              </div>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                {briefCompleteness}% captured
              </span>
            </div>

            <div className="mt-5">{renderCurrentStep(currentStep.id)}</div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={goBack}
                disabled={isFirstStep}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={routeCatalogByKey.callCards.path}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open call cards
                </Link>

                {isLastStep ? (
                  <Link
                    to={routeCatalogByKey.finder.path}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4" />
                    Push to Product Finder
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Live summary</p>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-slate-500">Application</p>
                <p className="font-semibold text-slate-900">{answers.application}</p>
              </div>

              <div>
                <p className="text-slate-500">Known needs</p>
                <p className="font-semibold text-slate-900">{selectedProfile.knownNeeds}</p>
              </div>

              <div>
                <p className="text-slate-500">Missing information</p>
                <p className="font-semibold text-amber-700">{selectedProfile.missingInfo}</p>
              </div>

              <div>
                <p className="text-slate-500">Room</p>
                <p className="font-semibold text-slate-900">{answers.roomSize || "Not captured yet"}</p>
              </div>

              <div>
                <p className="text-slate-500">Sources</p>
                <p className="font-semibold text-slate-900">{answers.sources || "Not captured yet"}</p>
              </div>

              <div>
                <p className="text-slate-500">Displays</p>
                <p className="font-semibold text-slate-900">{answers.displays || "Not captured yet"}</p>
              </div>

              <div>
                <p className="text-slate-500">USB / control</p>
                <p className="font-semibold text-slate-900">{answers.usbControl || "Not captured yet"}</p>
              </div>

              <div>
                <p className="text-slate-500">Suggested next action</p>
                <p className="font-semibold text-slate-900">
                  {isLastStep ? "Push to Product Finder" : "Continue discovery workflow"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default DiscoveryPage;