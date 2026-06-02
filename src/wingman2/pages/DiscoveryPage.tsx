import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const callNotesStorageKey = "wingman-guru-call-notes-transcript";
import {
  readProjectStore,
  saveDiscoveryBriefToProject,
  type StoredDiscoveryBrief,
} from "../data/projectStore";

type StepKey =
  | "application"
  | "scale"
  | "sources"
  | "displays"
  | "usb"
  | "audio"
  | "control"
  | "infrastructure";

type DiscoveryOption = {
  id: string;
  label: string;
  description: string;
  evidence: string;
};

type DiscoveryStep = {
  key: StepKey;
  eyebrow: string;
  title: string;
  why: string;
  ask: string;
  options: DiscoveryOption[];
};

type DiscoveryAnswers = Partial<Record<StepKey, string>>;

type QuestionStrategy = {
  customerQuestion: string;
  internalCheck: string;
  workflowFocus: string;
};

const DISCOVERY_STEPS: DiscoveryStep[] = [
  {
    key: "application",
    eyebrow: "1 / 8",
    title: "What type of opportunity is this?",
    why: "The application narrows the system shape before Wingman thinks about products.",
    ask: "Select the closest customer application.",
    options: [
      {
        id: "meeting-room",
        label: "Meeting room / boardroom",
        description: "Presentation, Teams/Zoom, USB-C, dual display or BYOD/BYOM.",
        evidence: "Collaboration-led room.",
      },
      {
        id: "classroom",
        label: "Classroom / teaching space",
        description: "Lectern, display or projector, source switching and teacher-friendly operation.",
        evidence: "Education-led room.",
      },
      {
        id: "hospitality",
        label: "Pub / sports bar / hospitality",
        description: "Multiple screens, staff control, Sky/media sources and cost sensitivity.",
        evidence: "Hospitality distribution opportunity.",
      },
      {
        id: "video-wall",
        label: "LCD / LED video wall",
        description: "Wall layout, source behaviour, processor choice, signage or flexible routing.",
        evidence: "Video wall workflow.",
      },
      {
        id: "distributed-av",
        label: "Distributed AV / multi-room",
        description: "Many sources or displays across rooms, floors or larger buildings.",
        evidence: "Distributed routing opportunity.",
      },
      {
        id: "house-of-worship",
        label: "House of worship / auditorium",
        description: "Cameras, confidence monitors, projection, streaming or overflow display.",
        evidence: "Large-room presentation/capture workflow.",
      },
    ],
  },
  {
    key: "scale",
    eyebrow: "2 / 8",
    title: "What is the approximate room or system scale?",
    why: "Scale helps decide whether simple switching, extension, matrix or AV-over-IP is more appropriate.",
    ask: "Select the closest scale.",
    options: [
      {
        id: "small-room",
        label: "Small room",
        description: "Single display or simple local presentation room.",
        evidence: "Simple room scale.",
      },
      {
        id: "medium-room",
        label: "Medium room",
        description: "Boardroom, teaching room, divisible space or several user positions.",
        evidence: "Medium system scale.",
      },
      {
        id: "large-room",
        label: "Large room",
        description: "Auditorium, hall, training room or longer cable paths.",
        evidence: "Large-room infrastructure risk.",
      },
      {
        id: "multi-zone",
        label: "Multi-zone / multi-room",
        description: "Several areas, displays or independently routed zones.",
        evidence: "Distributed or matrix routing likely.",
      },
    ],
  },
  {
    key: "sources",
    eyebrow: "3 / 8",
    title: "How many source positions are likely?",
    why: "Source count and source location affect the switching architecture and cable strategy.",
    ask: "Select the closest source model.",
    options: [
      {
        id: "one-source",
        label: "One main source",
        description: "Laptop, signage player, room PC or single media source.",
        evidence: "Single-source workflow.",
      },
      {
        id: "two-four-sources",
        label: "2â€“4 sources",
        description: "Typical meeting room, teaching room or small venue switching.",
        evidence: "Small switching workflow.",
      },
      {
        id: "five-eight-sources",
        label: "5â€“8 sources",
        description: "Matrix, presentation switcher or hospitality source rack likely.",
        evidence: "Matrix or presentation system candidate.",
      },
      {
        id: "many-sources",
        label: "More than 8 sources",
        description: "Distributed AV, AV-over-IP or larger matrix architecture likely.",
        evidence: "Larger routed system candidate.",
      },
    ],
  },
  {
    key: "displays",
    eyebrow: "4 / 8",
    title: "How many displays or outputs are needed?",
    why: "Display count is one of the main drivers for matrix, AV-over-IP, wall processing and receiver count.",
    ask: "Select the closest output model.",
    options: [
      {
        id: "single-display",
        label: "Single display / projector",
        description: "One main output position.",
        evidence: "Single-output system.",
      },
      {
        id: "dual-display",
        label: "Dual display",
        description: "Common boardroom or Teams/BYOD room requirement.",
        evidence: "Dual-output room.",
      },
      {
        id: "three-eight-displays",
        label: "3â€“8 displays",
        description: "Small venue, teaching space, confidence display or matrix opportunity.",
        evidence: "Small-to-medium routed display system.",
      },
      {
        id: "many-displays",
        label: "More than 8 displays",
        description: "Large venue, multi-zone, signage or distributed AV workflow.",
        evidence: "Distributed display system.",
      },
      {
        id: "display-wall",
        label: "Video wall",
        description: "LCD tiled wall or LED processor input workflow.",
        evidence: "Wall processing required.",
      },
    ],
  },
  {
    key: "usb",
    eyebrow: "5 / 8",
    title: "Is USB, camera or conferencing needed?",
    why: "USB ownership must be confirmed before recommending a video-only path.",
    ask: "Select the closest USB/conferencing model.",
    options: [
      {
        id: "no-usb",
        label: "No USB required",
        description: "Video/audio presentation only.",
        evidence: "Video-first path acceptable.",
      },
      {
        id: "usb-c-laptop",
        label: "USB-C laptop sharing",
        description: "Laptop needs display, audio and possibly USB device access.",
        evidence: "BYOD/BYOM qualification required.",
      },
      {
        id: "room-camera-audio",
        label: "Room camera / mic / speakerphone",
        description: "USB devices must be connected to the meeting host.",
        evidence: "USB transport path required.",
      },
      {
        id: "multi-camera",
        label: "Multi-camera / capture",
        description: "PTZ, NDI, bridge, streaming, recording or production-style workflow.",
        evidence: "Camera/capture workflow required.",
      },
    ],
  },
  {
    key: "audio",
    eyebrow: "6 / 8",
    title: "What audio requirement is likely?",
    why: "Audio often creates hidden dependencies such as DSP, amplifier, speakers, microphones or Dante.",
    ask: "Select the closest audio model.",
    options: [
      {
        id: "display-audio",
        label: "Display audio only",
        description: "Audio follows the display or local soundbar.",
        evidence: "Simple audio requirement.",
      },
      {
        id: "room-audio",
        label: "Room speakers / amplifier",
        description: "Ceiling/wall speakers, amplifier or audio de-embedding may be needed.",
        evidence: "Installed audio path required.",
      },
      {
        id: "conference-audio",
        label: "Conference microphones/audio",
        description: "Microphones, speakerphone, DSP or USB audio ownership must be checked.",
        evidence: "Conference audio path required.",
      },
      {
        id: "distributed-audio",
        label: "Distributed / zoned audio",
        description: "Multiple rooms, zones or venue-wide audio routing.",
        evidence: "Audio distribution risk.",
      },
    ],
  },
  {
    key: "control",
    eyebrow: "7 / 8",
    title: "How should the user operate the system?",
    why: "Control defines whether the system is customer-friendly or becomes a support problem.",
    ask: "Select the closest control model.",
    options: [
      {
        id: "auto-simple",
        label: "Simple / automatic",
        description: "Minimal user interaction; walk in and use.",
        evidence: "Low-control complexity.",
      },
      {
        id: "button-panel",
        label: "Button panel / simple source select",
        description: "Clear source/display selection without complex control.",
        evidence: "Simple control interface likely.",
      },
      {
        id: "touch-control",
        label: "Touch panel / IP control",
        description: "More formal control interface or third-party control system.",
        evidence: "Control integration required.",
      },
      {
        id: "staff-managed",
        label: "Staff managed",
        description: "Hospitality, venue or events staff need repeatable operation.",
        evidence: "Operational workflow must be defined.",
      },
    ],
  },
  {
    key: "infrastructure",
    eyebrow: "8 / 8",
    title: "What infrastructure is available?",
    why: "Cable path, distance and network ownership decide whether HDMI, HDBaseT, matrix or NetworkHD is realistic.",
    ask: "Select the closest infrastructure condition.",
    options: [
      {
        id: "local-short",
        label: "Local / short cable paths",
        description: "Rack and display/source positions are close together.",
        evidence: "Simple copper path possible.",
      },
      {
        id: "cat-cable",
        label: "Category cable / HDBaseT distance",
        description: "Point-to-point extension or matrix receiver routes may fit.",
        evidence: "HDBaseT candidate.",
      },
      {
        id: "managed-network",
        label: "Managed AV network available",
        description: "NetworkHD may be suitable if multicast, VLAN and switch ownership are confirmed.",
        evidence: "AV-over-IP candidate.",
      },
      {
        id: "unknown-infrastructure",
        label: "Unknown / needs survey",
        description: "Cable, rack, power or network information still needs discovery.",
        evidence: "Infrastructure risk.",
      },
    ],
  },
];

const baseQuestionStrategyByStep: Record<StepKey, QuestionStrategy> = {
  application: {
    customerQuestion: "What is the customer trying to make happen in this space?",
    internalCheck: "Identify the sales motion first: collaboration, distribution, video wall, venue, support or simple presentation.",
    workflowFocus: "Choose the application before thinking about SKUs.",
  },
  scale: {
    customerQuestion: "How large is the room or system, and how many zones or user areas are involved?",
    internalCheck: "Use scale to decide whether this is simple switching, extension, matrix or AV-over-IP.",
    workflowFocus: "Keep the system size visible before selecting a product path.",
  },
  sources: {
    customerQuestion: "How many source devices need to be connected now, and where are they located?",
    internalCheck: "Separate source count from source location so cable and switching decisions stay clear.",
    workflowFocus: "Confirm the source model before narrowing the architecture.",
  },
  displays: {
    customerQuestion: "How many displays or output positions need content, and do they show the same or different content?",
    internalCheck: "Display behavior drives splitter, matrix, wall processing and receiver count.",
    workflowFocus: "Treat display behavior as the route into Finder.",
  },
  usb: {
    customerQuestion: "Does any laptop or room PC need access to cameras, microphones, speakers or touch devices?",
    internalCheck: "USB ownership protects the recommendation from becoming video-only when the room needs conferencing.",
    workflowFocus: "Confirm USB before recommending a signal path.",
  },
  audio: {
    customerQuestion: "Where should audio be heard, and is it display audio, room audio, conferencing audio or zoned audio?",
    internalCheck: "Audio can add DSP, amplifier, Dante, de-embedding or control dependencies.",
    workflowFocus: "Use audio to expose hidden proposal dependencies.",
  },
  control: {
    customerQuestion: "How should the user operate the system during a normal day?",
    internalCheck: "Control must match the customer workflow, not just the hardware capability.",
    workflowFocus: "Use operation style to avoid support-heavy designs.",
  },
  infrastructure: {
    customerQuestion: "What cabling, rack location, network ownership and distance information is already known?",
    internalCheck: "Infrastructure decides whether HDMI, HDBaseT, matrix or NetworkHD is realistic.",
    workflowFocus: "Capture infrastructure risk before moving to quote language.",
  },
};

function getQuestionStrategy(stepKey: StepKey, answers: DiscoveryAnswers): QuestionStrategy {
  const base = baseQuestionStrategyByStep[stepKey];

  if (stepKey === "infrastructure" && answers.infrastructure === "managed-network") {
    return {
      ...base,
      internalCheck: "Confirm switch ownership, VLAN, multicast/IGMP, bandwidth and endpoint count before treating NetworkHD as quote-ready.",
    };
  }

  if (stepKey === "usb" && answers.application === "meeting-room") {
    return {
      ...base,
      customerQuestion: "Who hosts the call, and which cameras, microphones, speakers or touch displays must that host reach?",
    };
  }

  if (stepKey === "displays" && answers.application === "video-wall") {
    return {
      ...base,
      customerQuestion: "Does the wall need one full canvas, separate content per display, multiview, signage, or mixed layouts?",
    };
  }

  return base;
}

function getOption(step: DiscoveryStep, id: string | undefined) {
  return step.options.find((option) => option.id === id);
}

function getSelectedRows(answers: DiscoveryAnswers) {
  return DISCOVERY_STEPS.map((step) => ({
    step,
    option: getOption(step, answers[step.key]),
  })).filter((row) => Boolean(row.option));
}

function inferArchitecture(answers: DiscoveryAnswers) {
  const application = answers.application;
  const displays = answers.displays;
  const usb = answers.usb;
  const infrastructure = answers.infrastructure;
  const sources = answers.sources;

  if (application === "video-wall" || displays === "display-wall") {
    return {
      direction: "Dedicated video wall processor first, with AV-over-IP only where flexible routing is required.",
      family: "SW video wall processors / NetworkHD where justified",
      products: ["SW-0206-VW", "SW-0204-VW", "NetworkHD architecture if wider routing is needed"],
      warning: "Confirm wall layout, source behaviour and whether the wall needs full canvas, per-display content, signage or multiview.",
    };
  }

  if (application === "hospitality") {
    return {
      direction: "Cost-sensitive matrix or NetworkHD 100 depending on source/display count and flexibility.",
      family: "Matrix switching / NetworkHD 100",
      products: ["MX-0808-KIT direction", "NetworkHD 100 family", "NHD-150-RX if multiview is required"],
      warning: "Confirm staff operation, Sky/media source count, display zones and whether expansion is expected.",
    };
  }

  if (usb === "usb-c-laptop" || usb === "room-camera-audio") {
    return {
      direction: "Presentation / UC-led room design with USB ownership confirmed before product selection.",
      family: "Presentation switchers / UC products / USB transport",
      products: ["USB-C presentation switching direction", "UC/BYOD room products", "USB extension where devices are remote"],
      warning: "Do not quote a video-only path until camera, microphone, speakerphone and host ownership are confirmed.",
    };
  }

  if (application === "distributed-av" || displays === "many-displays" || sources === "many-sources" || infrastructure === "managed-network") {
    return {
      direction: "AV-over-IP or larger matrix architecture depending on network ownership, latency and expansion needs.",
      family: "NetworkHD 100 / 500 / 600 selected by performance requirement",
      products: ["NetworkHD 100", "NetworkHD 500", "NetworkHD 600", "NHD-CTL-PRO dependency"],
      warning: "Confirm NetworkHD family, switch class, multicast/IGMP, VLAN ownership and endpoint count.",
    };
  }

  if (infrastructure === "cat-cable") {
    return {
      direction: "HDBaseT extension or HDBaseT matrix depending on source/display count.",
      family: "HDBaseT extenders / HDBaseT matrix",
      products: ["HDBaseT extender direction", "HDBaseT matrix direction"],
      warning: "Confirm cable length, cable quality, required resolution, USB need and receiver pairing.",
    };
  }

  return {
    direction: "Simple application-led WyreStorm architecture. Confirm remaining details before selecting a final SKU.",
    family: "Presentation switching / matrix / extension depending on final I/O",
    products: ["Discovery workflow", "Product Finder next"],
    warning: "More detail is needed before Wingman should create a quote-ready recommendation.",
  };
}

function buildSummary(answers: DiscoveryAnswers) {
  const rows = getSelectedRows(answers);

  if (rows.length === 0) {
    return "No discovery answers captured yet.";
  }

  return rows.map((row) => `${row.step.title}: ${row.option?.label}`).join(" | ");
}

function buildMissingInformation(answers: DiscoveryAnswers) {
  const missing = DISCOVERY_STEPS.filter((step) => !answers[step.key]).map((step) => step.title);

  if (missing.length > 0) {
    return missing;
  }

  const extra = [
    "Exact source count and source locations",
    "Exact display count and display locations",
    "Cable distances and cable type",
    "Required resolution / refresh rate / HDR requirement",
    "Rack location and power",
    "Control ownership",
  ];

  if (answers.usb !== "no-usb") {
    extra.unshift("USB host ownership and camera/microphone/speakerphone location");
  }

  if (answers.infrastructure === "managed-network") {
    extra.unshift("Network switch ownership, VLAN, multicast/IGMP and 1G/10G requirement");
  }

  return extra;
}

function buildDiscoveryBrief(answers: DiscoveryAnswers): StoredDiscoveryBrief {
  const selectedRows = getSelectedRows(answers);
  const summary = buildSummary(answers);
  const architecture = inferArchitecture(answers);
  const missingInformation = buildMissingInformation(answers);
  const now = new Date().toISOString();

  const selected = Object.fromEntries(
    selectedRows.map((row) => [
      row.step.key,
      {
        label: row.option?.label,
        evidence: row.option?.evidence,
        description: row.option?.description,
      },
    ])
  );

  return {
    summary,
    customerWording: summary,
    createdAt: now,
    updatedAt: now,
    source: "Discovery",
    roomModel: {
      roomType: selected.application?.label || "Discovery",
      application: selected.application?.label || "Unknown application",
      roomSize: selected.scale?.label || "Unknown scale",
    },
    sourceModel: {
      sourceCount: selected.sources?.label || "Unknown source count",
      notes: selected.sources?.description || "",
    },
    outputModel: {
      displayCount: selected.displays?.label || "Unknown display count",
      notes: selected.displays?.description || "",
    },
    usbModel: {
      requirement: selected.usb?.label || "Unknown USB requirement",
      notes: selected.usb?.description || "",
    },
    audioModel: {
      requirement: selected.audio?.label || "Unknown audio requirement",
      notes: selected.audio?.description || "",
    },
    controlModel: {
      requirement: selected.control?.label || "Unknown control requirement",
      notes: selected.control?.description || "",
    },
    infrastructureModel: {
      requirement: selected.infrastructure?.label || "Unknown infrastructure",
      notes: selected.infrastructure?.description || "",
    },
    recommendation: {
      likelyArchitecture: architecture.direction,
      suggestedFamily: architecture.family,
      recommendedProducts: architecture.products.map((sku) => ({
        sku,
        title: sku,
        family: architecture.family,
        category: "Discovery direction",
        reason: architecture.direction,
      })),
      missingInformation,
      quoteSafetyStatus: missingInformation.length > 0 ? "Review required" : "Qualified discovery - still validate before quote",
      warning: architecture.warning,
    },
    capturedAnswers: answers,
  } as unknown as StoredDiscoveryBrief;
}

function writeDiscoveryHandoff(brief: StoredDiscoveryBrief) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    brief,
    createdAt: new Date().toISOString(),
    source: "DiscoveryPage",
    returnRoute: "/wingman/discovery",
  };

  window.localStorage.setItem("wingman-discovery-brief", JSON.stringify(brief));
  window.localStorage.setItem("wingman-discovery-snapshot-v3", JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("wingman:discovery-handoff-updated"));
}

export function DiscoveryPage() {
  const navigate = useNavigate();
  const activePanelRef = useRef<HTMLDivElement | null>(null);

  const [answers, setAnswers] = useState<DiscoveryAnswers>({});

  useEffect(() => {
    function applyCallNotes(value: string) {
      const cleanValue = value.trim();

      if (!cleanValue) {
        return;
      }

      setAnswers((current) => ({
        ...current,
        callNotes: cleanValue,
        customerWords: cleanValue,
        discoverySummary: cleanValue,
      }) as DiscoveryAnswers);
    }

    function useStoredCallNotes() {
      const stored = window.sessionStorage.getItem(callNotesStorageKey);

      if (!stored) {
        return;
      }

      applyCallNotes(stored);
      window.sessionStorage.removeItem(callNotesStorageKey);
    }

    function handleGuruCallNotes(event: Event) {
      const customEvent = event as CustomEvent<string>;

      if (typeof customEvent.detail === "string" && customEvent.detail.trim()) {
        applyCallNotes(customEvent.detail);
      }
    }

    useStoredCallNotes();
    window.addEventListener("wingman:use-call-notes-in-discovery", handleGuruCallNotes);

    return () => {
      window.removeEventListener("wingman:use-call-notes-in-discovery", handleGuruCallNotes);
    };
  }, []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  const activeStep = DISCOVERY_STEPS[activeIndex];
  const selectedRows = useMemo(() => getSelectedRows(answers), [answers]);
  const summary = useMemo(() => buildSummary(answers), [answers]);
  const architecture = useMemo(() => inferArchitecture(answers), [answers]);
  const missingInformation = useMemo(() => buildMissingInformation(answers), [answers]);
  const activeQuestionStrategy = useMemo(
    () => getQuestionStrategy(activeStep.key, answers),
    [activeStep.key, answers],
  );
  const complete = DISCOVERY_STEPS.every((step) => Boolean(answers[step.key]));

  const moveToStep = (index: number) => {
    const safeIndex = Math.min(Math.max(index, 0), DISCOVERY_STEPS.length - 1);
    setActiveIndex(safeIndex);

    window.setTimeout(() => {
      activePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  };

  const selectOption = (step: DiscoveryStep, option: DiscoveryOption) => {
    setAnswers((current) => ({
      ...current,
      [step.key]: option.id,
    }));

    setSaved(false);

    window.setTimeout(() => {
      if (activeIndex < DISCOVERY_STEPS.length - 1) {
        moveToStep(activeIndex + 1);
      }
    }, 120);
  };

  const clearAnswer = (stepKey: StepKey) => {
    setAnswers((current) => {
      const next = { ...current };
      delete next[stepKey];
      return next;
    });

    setSaved(false);

    const index = DISCOVERY_STEPS.findIndex((step) => step.key === stepKey);

    if (index >= 0) {
      moveToStep(index);
    }
  };

  const saveDiscovery = () => {
    const brief = buildDiscoveryBrief(answers);
    saveDiscoveryBriefToProject(brief);
    writeDiscoveryHandoff(brief);
    setSaved(true);
  };

  const saveAndOpenProject = () => {
    saveDiscovery();
    const snapshot = readProjectStore();
    const route = snapshot.activeProjectId ? `/wingman/projects/${snapshot.activeProjectId}` : "/wingman/projects";
    navigate(route);
  };

  const saveAndOpenFinder = () => {
    saveDiscovery();
    navigate(`/wingman/finder?brief=${encodeURIComponent(summary)}`);
  };

  const saveAndOpenProposal = () => {
    saveDiscovery();
    navigate(`/wingman/proposal?brief=${encodeURIComponent(summary)}`);
  };

  return (
    <main data-wingman-discovery-screen="true" className="wm20-page">
      <section className="wm20-panel" data-wingman-discovery-capture="true">
        <div className="wm20-hero-copy">
          <p className="wm20-eyebrow">Guided discovery</p>
          <span className="wm20-badge">Live call mode</span>
          <h1>Ask one question, then move forward automatically</h1>
          <p>
            Select an answer and Wingman immediately moves to the next discovery step. The old global
            auto-advance listener has been removed so options should no longer de-select or jump to the
            wrong button.
          </p>
          <a className="wm-button-secondary" href="#wingman-discovery-current-model">
            View full model
          </a>
        </div>
      </section>

      <section className="wm20-panel">
        <div className="wm20-section-heading">
          <div>
            <p className="wm20-eyebrow">Captured answers</p>
            <h2>Discovery trail</h2>
          </div>
          <span className="wm20-badge">{selectedRows.length} / {DISCOVERY_STEPS.length} captured</span>
        </div>

        <div className="wm20-grid">
          {DISCOVERY_STEPS.map((step, index) => {
            const option = getOption(step, answers[step.key]);
            const isActive = index === activeIndex;

            return (
              <button
                key={step.key}
                type="button"
                className={isActive ? "wm20-card-action" : "wm-button-soft"}
                onClick={() => moveToStep(index)}
                aria-current={isActive ? "step" : undefined}
              >
                <strong>{step.eyebrow}</strong>
                <span>{option ? option.label : step.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section ref={activePanelRef} className="wm20-panel" data-wingman-current-panel="true">
        <div className="wm20-section-heading">
          <div>
            <p className="wm20-eyebrow">{activeStep.eyebrow}</p>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.ask}</p>
          </div>
          <span className="wm20-badge">Auto advances after selection</span>
        </div>

        <div className="wm20-next">
          <strong>Why this matters</strong>
          <p>{activeStep.why}</p>
        </div>

        <div className="wm20-grid">
          {activeStep.options.map((option) => {
            const selected = answers[activeStep.key] === option.id;

            return (
              <button
                key={option.id}
                type="button"
                className={selected ? "wm20-card-action" : "wm-button-soft"}
                onClick={() => selectOption(activeStep, option)}
                aria-pressed={selected}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            );
          })}
        </div>

        {answers[activeStep.key] ? (
          <div className="wm20-next">
            <strong>Selected</strong>
            <p>{getOption(activeStep, answers[activeStep.key])?.label}</p>
            <button type="button" className="wm-button-secondary" onClick={() => clearAnswer(activeStep.key)}>
              Change this answer
            </button>
          </div>
        ) : null}

        <div className="wm20-actions">
          <button
            type="button"
            className="wm-button-secondary"
            onClick={() => moveToStep(activeIndex - 1)}
            disabled={activeIndex === 0}
          >
            Back
          </button>

          <button
            type="button"
            className="wm-button-soft"
            onClick={() => moveToStep(activeIndex + 1)}
            disabled={activeIndex >= DISCOVERY_STEPS.length - 1}
          >
            Skip for now
          </button>
        </div>
      </section>

      <section className="wm20-panel" id="wingman-discovery-current-model">
        <div className="wm20-section-heading">
          <div>
            <p className="wm20-eyebrow">Live discovery model</p>
            <h2>Current model</h2>
          </div>
          <span className="wm20-badge">{complete ? "Ready to save" : "Discovery still incomplete"}</span>
        </div>

        <div className="wm20-next">
          <strong>Recommended architecture direction</strong>
          <p>{architecture.direction}</p>
        </div>

        <div className="wm20-next">
          <strong>Likely WyreStorm family direction</strong>
          <p>{architecture.family}</p>
          <p>{architecture.products.join(", ")}</p>
        </div>

        <div className="wm20-next">
          <strong>What to check before quoting</strong>
          <ul>
            {missingInformation.slice(0, 8).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="wm20-next">
          <strong>Discovery summary</strong>
          <p>{summary}</p>
        </div>

        {saved ? (
          <div className="wm20-next">
            <strong>Discovery saved</strong>
            <p>Discovery has been saved to the active opportunity and handoff storage.</p>
          </div>
        ) : null}

        <div className="wm20-actions">
          <button type="button" className="wm20-card-action" onClick={saveDiscovery}>
            Save discovery
          </button>

          <button type="button" className="wm-button-soft" onClick={saveAndOpenFinder}>
            Save and open Product Finder
          </button>

          <button type="button" className="wm-button-secondary" onClick={saveAndOpenProposal}>
            Save and create proposal draft
          </button>

          <button type="button" className="wm-button-secondary" onClick={saveAndOpenProject}>
            Save and open opportunity
          </button>
        </div>
      </section>

      <section className="wm20-panel">
        <div className="wm20-section-heading">
          <div>
            <p className="wm20-eyebrow">Discovery support</p>
            <h2>Ask this next</h2>
          </div>
          <Link className="wm-button-soft" to="/wingman/finder">
            Open Finder manually
          </Link>
        </div>

        <div className="wm20-grid">
          <div className="wm20-next">
            <strong>Customer-facing question</strong>
            <p>{activeQuestionStrategy.customerQuestion}</p>
          </div>

          <div className="wm20-next">
            <strong>Internal pre-sales check</strong>
            <p>{activeQuestionStrategy.internalCheck}</p>
          </div>

          <div className="wm20-next">
            <strong>Architecture reminder</strong>
            <p>{activeQuestionStrategy.workflowFocus}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DiscoveryPage;

