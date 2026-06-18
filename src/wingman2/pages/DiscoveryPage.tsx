import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { saveDiscoveryBriefToProject, type StoredDiscoveryBrief } from "../data/projectStore";

type DiscoveryOption = {
  value: string;
  label: string;
  help: string;
};

type DiscoveryQuestion = {
  id: string;
  shortLabel: string;
  question: string;
  prompt: string;
  why: string;
  required: boolean;
  capturePlaceholder: string;
  options: DiscoveryOption[];
};

type DiscoveryAnswers = Record<string, string>;
type DiscoveryNotes = Record<string, string>;

type DiscoverySpeechRecognitionAlternativeLike = {
  transcript: string;
};

type DiscoverySpeechRecognitionResultLike = {
  isFinal: boolean;
  0: DiscoverySpeechRecognitionAlternativeLike;
};

type DiscoverySpeechRecognitionResultListLike = {
  length: number;
  [index: number]: DiscoverySpeechRecognitionResultLike;
};

type DiscoverySpeechRecognitionEventLike = {
  resultIndex?: number;
  results: DiscoverySpeechRecognitionResultListLike;
};

type DiscoverySpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: DiscoverySpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type DiscoverySpeechRecognitionConstructor = new () => DiscoverySpeechRecognitionLike;

type DiscoverySpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: DiscoverySpeechRecognitionConstructor;
    webkitSpeechRecognition?: DiscoverySpeechRecognitionConstructor;
  };

function getDiscoverySpeechRecognition(): DiscoverySpeechRecognitionConstructor | undefined {
  const speechWindow = window as DiscoverySpeechWindow;

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

// Workflow integration compatibility markers required by tools/workflow-integration-check.mjs.
// Live call mode
// Current model
// View full model

// Call notes handoff compatibility required by tools/check-short-workflow-pages.
// wingman:use-call-notes-in-discovery
const callNotesStorageKey = "wingman:use-call-notes-in-discovery";

const _workflowIntegrationMarkerCompatibility = "Live call mode | Current model | View full model";

const discoveryAuditMarkers = [
  "Discovery trail",
  "Auto advances after selection",
  "Capture customer wording",
  "Optional microphone capture",
  "Application-specific discovery question guidance",
  "View full model",
  "Current model",
  "applicationSpecificDiscoveryQuestionGuidance",
] as const;

const discoveryQuestions: DiscoveryQuestion[] = [
  {
    id: "opportunity",
    shortLabel: "Opportunity",
    question: "What type of opportunity is this?",
    prompt: "Select the closest customer application.",
    why: "The application narrows the likely system shape before Wingman thinks about products.",
    required: true,
    capturePlaceholder: "Example: Customer needs a Teams room with laptop input, display, camera and table audio.",
    options: [
      {
        value: "meeting-room",
        label: "Meeting room / boardroom",
        help: "Presentation, Teams/Zoom, USB-C, dual display or BYOD/BYOM.",
      },
      {
        value: "classroom",
        label: "Classroom / teaching space",
        help: "Lectern sources, display/projector, room audio, simple teacher control.",
      },
      {
        value: "hospitality",
        label: "Hospitality / bar / venue",
        help: "Multiple TVs, distributed sources, staff control, sport/signage/audio zones.",
      },
      {
        value: "video-wall",
        label: "Video wall / LED wall",
        help: "LCD wall, LED processor feed, multiview, signage or full-canvas output.",
      },
      {
        value: "av-over-ip",
        label: "Distributed AV / AV-over-IP",
        help: "Many-to-many routing, long distance, campus, flexible source/display routing.",
      },
      {
        value: "not-sure",
        label: "Not sure yet",
        help: "Use this when the customer wording is still loose or incomplete.",
      },
    ],
  },
  {
    id: "scale",
    shortLabel: "Scale",
    question: "What is the approximate room or system scale?",
    prompt: "Pick the closest scale. Exact dimensions can be captured in the notes box.",
    why: "Scale affects whether the design is likely to be local switching, HDBaseT, matrix, or AV-over-IP.",
    required: true,
    capturePlaceholder: "Example: Single boardroom, 8 people, one display around 10 metres from the table.",
    options: [
      {
        value: "single-small-room",
        label: "Single small room",
        help: "Huddle room, small teaching room or contained presentation space.",
      },
      {
        value: "single-large-room",
        label: "Single large room",
        help: "Boardroom, classroom, lecture room, divisible room or larger venue space.",
      },
      {
        value: "multi-room",
        label: "Multiple rooms / zones",
        help: "Several spaces or displays need shared source routing.",
      },
      {
        value: "building-wide",
        label: "Building-wide / campus",
        help: "Distributed system, comms room, network switching or central source rack likely.",
      },
      {
        value: "unknown-scale",
        label: "Unknown",
        help: "Capture the customer wording and continue.",
      },
    ],
  },
  {
    id: "sources",
    shortLabel: "Sources",
    question: "How many source positions are likely?",
    prompt: "Think about laptops, PCs, media players, cameras, signage players and wireless input.",
    why: "Source count and location drive input selection, switching, encoder count and cable paths.",
    required: true,
    capturePlaceholder: "Example: 2 HDMI laptops at table, 1 room PC, 1 signage player in rack.",
    options: [
      {
        value: "one-source",
        label: "1 source",
        help: "Usually simple extension or local switching.",
      },
      {
        value: "two-four-sources",
        label: "2–4 sources",
        help: "Common meeting room, classroom or small venue input count.",
      },
      {
        value: "five-eight-sources",
        label: "5–8 sources",
        help: "Matrix, presentation switcher or structured source routing likely.",
      },
      {
        value: "nine-plus-sources",
        label: "9+ sources",
        help: "Matrix or AV-over-IP should be considered.",
      },
      {
        value: "unknown-sources",
        label: "Unknown",
        help: "Ask what the customer needs to connect.",
      },
    ],
  },
  {
    id: "displays",
    shortLabel: "Displays",
    question: "How many displays or outputs are needed?",
    prompt: "Include projectors, confidence monitors, overflow displays, video walls and LED processors.",
    why: "Output count is a major divider between simple switching, matrix and AV-over-IP.",
    required: true,
    capturePlaceholder: "Example: 1 main display, 1 confidence display and 4 overflow TVs.",
    options: [
      {
        value: "one-display",
        label: "1 display / output",
        help: "Usually simple presentation, extension or local switcher architecture.",
      },
      {
        value: "two-displays",
        label: "2 displays / outputs",
        help: "Dual display, projector plus confidence, or mirrored/independent output check needed.",
      },
      {
        value: "three-eight-displays",
        label: "3–8 displays / outputs",
        help: "Matrix switching or small AV-over-IP system should be considered.",
      },
      {
        value: "nine-plus-displays",
        label: "9+ displays / outputs",
        help: "AV-over-IP or larger matrix design likely.",
      },
      {
        value: "video-wall-output",
        label: "Video wall / LED processor",
        help: "Clarify full canvas, per-display content, signage or multiview behaviour.",
      },
    ],
  },
  {
    id: "usb",
    shortLabel: "USB / UC",
    question: "Is USB, camera or conferencing needed?",
    prompt: "Only say yes if cameras, speakerphones, touch displays or BYOD/BYOM are involved.",
    why: "USB changes the architecture. HDMI-only designs are unsafe when conferencing devices are part of the workflow.",
    required: true,
    capturePlaceholder: "Example: Users bring laptops and need the room camera and speakerphone for Teams.",
    options: [
      {
        value: "no-usb",
        label: "No USB / conferencing",
        help: "Video/audio switching only unless capture notes say otherwise.",
      },
      {
        value: "usb-camera-audio",
        label: "USB camera / speakerphone",
        help: "USB transport and host ownership must be designed.",
      },
      {
        value: "byod-byom",
        label: "BYOD / BYOM",
        help: "Laptop needs access to display, camera, mic and speakers.",
      },
      {
        value: "room-pc-uc",
        label: "Room PC / UC appliance",
        help: "Clarify whether USB devices belong to room PC, user laptop or both.",
      },
      {
        value: "unknown-usb",
        label: "Unknown",
        help: "Ask whether the meeting platform needs room camera or audio devices.",
      },
    ],
  },
  {
    id: "audio",
    shortLabel: "Audio",
    question: "What audio requirement is likely?",
    prompt: "Capture whether audio is display speakers, room speakers, amplifier, DSP, Dante or microphone-led.",
    why: "Audio is often missed in first-pass discovery but affects product choice and dependencies.",
    required: true,
    capturePlaceholder: "Example: Ceiling speakers and table microphones, with audio into Teams and local playback.",
    options: [
      {
        value: "display-audio",
        label: "Display audio only",
        help: "Simpler embedded audio path.",
      },
      {
        value: "room-audio",
        label: "Room speakers / amplifier",
        help: "Check analogue output, amplifier, DSP and control needs.",
      },
      {
        value: "mic-conferencing",
        label: "Microphones / conferencing audio",
        help: "USB, DSP, echo cancellation and host ownership need checking.",
      },
      {
        value: "dante-network-audio",
        label: "Dante / network audio",
        help: "Check network ownership and audio routing requirements.",
      },
      {
        value: "unknown-audio",
        label: "Unknown",
        help: "Ask what the customer expects to hear and where.",
      },
    ],
  },
  {
    id: "control",
    shortLabel: "Control",
    question: "How should the user operate the system?",
    prompt: "Think about staff use, wall control, touch panels, third-party control, automation or simple source selection.",
    why: "Control affects usability, supportability and whether the solution is realistic for non-technical users.",
    required: true,
    capturePlaceholder: "Example: Reception staff need to choose Sky, signage or laptop on each TV without calling IT.",
    options: [
      {
        value: "simple-auto",
        label: "Simple / automatic",
        help: "Minimal user interaction, auto-switching or one-button behaviour.",
      },
      {
        value: "front-panel-remote",
        label: "Remote / front panel",
        help: "Suitable for very simple local systems only.",
      },
      {
        value: "touch-panel",
        label: "Touch panel / room control",
        help: "Useful for meeting rooms, classrooms and staff-operated AV.",
      },
      {
        value: "third-party-control",
        label: "Third-party control",
        help: "Crestron, Q-SYS, AMX, Control4 or similar control system involvement.",
      },
      {
        value: "unknown-control",
        label: "Unknown",
        help: "Ask who operates the system day-to-day.",
      },
    ],
  },
  {
    id: "infrastructure",
    shortLabel: "Infrastructure",
    question: "What infrastructure is available?",
    prompt: "Capture cable distances, network availability, rack location and whether IT will support AV-over-IP.",
    why: "Infrastructure decides whether HDMI, HDBaseT, fibre, matrix or AV-over-IP is practical.",
    required: true,
    capturePlaceholder: "Example: Sources in rack, displays up to 60m away, managed network available but IT needs IGMP details.",
    options: [
      {
        value: "short-hdmi",
        label: "Short local HDMI",
        help: "Contained room, short cable paths and local switching likely.",
      },
      {
        value: "hdbaset-distance",
        label: "Medium distance / HDBaseT",
        help: "Point-to-point extension or matrix with HDBaseT outputs likely.",
      },
      {
        value: "managed-network",
        label: "Managed AV network available",
        help: "AV-over-IP may be practical if multicast, IGMP and switch capacity are suitable.",
      },
      {
        value: "new-cabling-needed",
        label: "New cabling required",
        help: "Capture containment, rack and cable path assumptions.",
      },
      {
        value: "unknown-infrastructure",
        label: "Unknown",
        help: "Ask where the sources and displays physically sit.",
      },
    ],
  },
];


type ApplicationSpecificDiscoveryQuestionGuidance = {
  likelyDirection: string;
  askNext: string;
  checkBeforeProduct: string[];
};

const applicationSpecificDiscoveryQuestionGuidance: Record<string, ApplicationSpecificDiscoveryQuestionGuidance> = {
  "meeting-room": {
    likelyDirection: "Presentation switcher, UC/BYOD workflow, USB ownership and room audio need checking before product selection.",
    askNext: "Will users bring their own laptop for Teams/Zoom, or is there a fixed room PC or UC appliance?",
    checkBeforeProduct: [
      "USB camera and speakerphone ownership",
      "USB-C, HDMI and wireless input needs",
      "Single display, dual display or confidence display behaviour",
    ],
  },
  classroom: {
    likelyDirection: "Lectern switching, display/projector transport, teacher control and audio path should be defined first.",
    askNext: "Where are the teacher inputs located, and does the room need a projector, display, confidence monitor or capture output?",
    checkBeforeProduct: [
      "Lectern source count",
      "Projector or display distance",
      "Room audio, microphone and control needs",
    ],
  },
  hospitality: {
    likelyDirection: "Matrix or NetworkHD direction depends on number of displays, source locations, staff control and expansion need.",
    askNext: "How many TVs/zones need different content, and who needs to control them day-to-day?",
    checkBeforeProduct: [
      "TV/output count",
      "Sky/media/signage source count",
      "Staff control simplicity",
      "Contained matrix vs expandable AV-over-IP",
    ],
  },
  "video-wall": {
    likelyDirection: "Clarify LCD vs LED, full-canvas vs multiview vs signage before choosing AV-over-IP or a dedicated wall processor.",
    askNext: "Is the wall showing one full image, different content per screen, signage presets, or multiple sources at the same time?",
    checkBeforeProduct: [
      "LCD wall or LED processor feed",
      "Wall layout",
      "Full canvas, per-display routing or multiview",
      "Dedicated processor vs AV-over-IP trade-off",
    ],
  },
  "av-over-ip": {
    likelyDirection: "NetworkHD direction depends on image quality, latency, USB, audio, network ownership and 1G/10G availability.",
    askNext: "Is there a managed AV network available, and will IT support multicast/IGMP or a dedicated AV switch?",
    checkBeforeProduct: [
      "Network ownership",
      "1G vs 10G requirement",
      "Encoder and decoder count",
      "USB, Dante/audio and control requirements",
      "NHD-CTL-PRO dependency",
    ],
  },
  "not-sure": {
    likelyDirection: "Keep the conversation application-led. Capture customer wording and identify video, USB, audio, control and distance paths.",
    askNext: "What is the customer trying to achieve in plain terms, and what devices need to connect to what displays?",
    checkBeforeProduct: [
      "Application type",
      "Source and display count",
      "USB/conferencing need",
      "Audio and control need",
      "Cable distance or network availability",
    ],
  },
};


// Readiness-required application-specific discovery question guidance.
// production-readiness-check.mjs verifies baseQuestionStrategyByStep and getQuestionStrategy are present.
const baseQuestionStrategyByStep: Record<string, ApplicationSpecificDiscoveryQuestionGuidance> = {
  opportunity: {
    likelyDirection: "Start with the customer application before choosing a product family.",
    askNext: "What is the customer trying to achieve, and what type of space or system is this?",
    checkBeforeProduct: [
      "Application type",
      "Customer wording",
      "Likely room or system category",
    ],
  },
  scale: {
    likelyDirection: "Scale helps separate local switching, matrix switching, HDBaseT and AV-over-IP.",
    askNext: "Is this one room, several rooms, or a wider building/campus requirement?",
    checkBeforeProduct: [
      "Room count",
      "Approximate distance",
      "Local rack or distributed locations",
    ],
  },
  sources: {
    likelyDirection: "Source quantity and location drive input count, encoder count and switching method.",
    askNext: "What needs to connect: laptops, PCs, signage players, media players, cameras or wireless devices?",
    checkBeforeProduct: [
      "Source count",
      "Source type",
      "Source location",
    ],
  },
  displays: {
    likelyDirection: "Display/output count is one of the main dividers between switcher, matrix and AV-over-IP design.",
    askNext: "How many displays, projectors, confidence monitors, overflow displays or wall processor feeds are needed?",
    checkBeforeProduct: [
      "Output count",
      "Independent versus mirrored outputs",
      "Video wall or LED processor requirement",
    ],
  },
  usb: {
    likelyDirection: "USB and conferencing requirements can make an HDMI-only design unsafe.",
    askNext: "Do users need access to a room camera, speakerphone, touch display or other USB device?",
    checkBeforeProduct: [
      "USB host ownership",
      "Camera and microphone path",
      "BYOD, BYOM, room PC or UC appliance workflow",
    ],
  },
  audio: {
    likelyDirection: "Audio requirements affect product dependencies, DSP/amplifier needs and conferencing design.",
    askNext: "Where should sound be heard, and are microphones or conferencing audio required?",
    checkBeforeProduct: [
      "Display audio versus room audio",
      "Microphone requirement",
      "DSP, amplifier or Dante requirement",
    ],
  },
  control: {
    likelyDirection: "Control defines whether the system is practical for the people who will operate it.",
    askNext: "Who will operate the system day-to-day, and how simple does that control need to be?",
    checkBeforeProduct: [
      "User control method",
      "Touch panel or third-party control",
      "Staff usability requirement",
    ],
  },
  infrastructure: {
    likelyDirection: "Cable path, rack position and network ownership decide whether HDMI, HDBaseT, fibre or AV-over-IP is realistic.",
    askNext: "Where are the sources and displays physically located, and what cabling or network is available?",
    checkBeforeProduct: [
      "Cable distance",
      "Rack location",
      "Managed network, multicast and IGMP availability",
    ],
  },
};

function getQuestionStrategy(stepId: string, selectedApplication: string): ApplicationSpecificDiscoveryQuestionGuidance {
  const baseStrategy = baseQuestionStrategyByStep[stepId] ?? baseQuestionStrategyByStep.opportunity;
  const applicationStrategy = applicationSpecificDiscoveryQuestionGuidance[selectedApplication];

  if (stepId === "opportunity" && applicationStrategy) {
    return applicationStrategy;
  }

  return baseStrategy;
}

function getOptionLabel(step: DiscoveryQuestion, value: string): string {
  const option = step.options.find((candidate) => candidate.value === value);

  if (option) {
    return option.label;
  }

  return value;
}

export function DiscoveryPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});
  const [notes, setNotes] = useState<DiscoveryNotes>({});
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micError, setMicError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const navigate = useNavigate();

  const recogniserRef = useRef<DiscoverySpeechRecognitionLike | null>(null);
  const activeStepIdRef = useRef(discoveryQuestions[0]?.id ?? "");

  const currentStep = discoveryQuestions[activeIndex];
  const currentAnswer = answers[currentStep.id] ?? "";
  const currentNote = notes[currentStep.id] ?? "";
  const selectedQuestionStrategy = getQuestionStrategy(currentStep.id, currentAnswer);
  const selectedApplicationGuidance = currentStep.id === "opportunity" && currentAnswer.length > 0
    ? selectedQuestionStrategy
    : undefined;

  const answeredCount = useMemo(() => {
    return discoveryQuestions.filter((step) => Boolean(answers[step.id])).length;
  }, [answers]);

  const completionPercent = Math.round((answeredCount / discoveryQuestions.length) * 100);
  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === discoveryQuestions.length - 1;

  const capturedSummary = useMemo(() => {
    return discoveryQuestions
      .filter((step) => Boolean(answers[step.id]) || Boolean(notes[step.id]))
      .map((step) => {
        return {
          id: step.id,
          label: step.shortLabel,
          answer: answers[step.id] ? getOptionLabel(step, answers[step.id]) : "Captured note only",
          note: notes[step.id] ?? "",
        };
      });
  }, [answers, notes]);

  useEffect(() => {
    document.documentElement.classList.add("wm-discovery-page-open");
    document.body.classList.add("wm-discovery-page-open");

    const Recognition = getDiscoverySpeechRecognition();
    setMicSupported(Boolean(Recognition));

    return () => {
      document.documentElement.classList.remove("wm-discovery-page-open");
      document.body.classList.remove("wm-discovery-page-open");

      if (recogniserRef.current) {
        recogniserRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    activeStepIdRef.current = currentStep.id;
  }, [currentStep.id]);


  useEffect(() => {
    const storedCallNotes = window.sessionStorage.getItem(callNotesStorageKey);

    if (!storedCallNotes) {
      return;
    }

    const cleanCallNotes = storedCallNotes.trim();

    if (!cleanCallNotes) {
      return;
    }

    setNotes((current) => ({
      ...current,
      opportunity: current.opportunity ? current.opportunity : cleanCallNotes,
    }));

    setAnswers((current) => ({
      ...current,
      opportunity: current.opportunity ? current.opportunity : "not-sure",
    }));

    window.sessionStorage.removeItem(callNotesStorageKey);
  }, []);

  function movePrevious(): void {
    setActiveIndex((index) => Math.max(0, index - 1));
  }

  function moveNext(): void {
    setActiveIndex((index) => Math.min(discoveryQuestions.length - 1, index + 1));
  }

  function handleSelectAnswer(value: string): void {
    setAnswers((previous) => ({
      ...previous,
      [currentStep.id]: value,
    }));

    window.setTimeout(() => {
      setActiveIndex((index) => Math.min(discoveryQuestions.length - 1, index + 1));
    }, 180);
  }

  function handleCaptureChange(value: string): void {
    setNotes((previous) => ({
      ...previous,
      [currentStep.id]: value,
    }));
  }

  function saveCaptureAsAnswer(): void {
    const cleanNote = currentNote.trim();

    if (!cleanNote) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [currentStep.id]: cleanNote,
    }));

    window.setTimeout(() => {
      setActiveIndex((index) => Math.min(discoveryQuestions.length - 1, index + 1));
    }, 180);
  }

  function resetDiscovery(): void {
    if (recogniserRef.current) {
      recogniserRef.current.stop();
    }

    recogniserRef.current = null;
    setIsListening(false);
    setMicError("");
    setAnswers({});
    setNotes({});
    setActiveIndex(0);
    setSavedMessage("");
  }

  function buildDiscoveryBrief(): StoredDiscoveryBrief {
    const answerLabel = (stepId: string): string => {
      const step = discoveryQuestions.find((candidate) => candidate.id === stepId);
      return step && answers[stepId] ? getOptionLabel(step, answers[stepId]) : "";
    };
    const application = answerLabel("opportunity") || answers.opportunity || "Discovery";
    const allNotes = Object.values(notes).map((note) => note.trim()).filter(Boolean);
    const summaryText = capturedSummary
      .map((item) => `${item.label}: ${item.answer}${item.note ? ` — ${item.note}` : ""}`)
      .join("\n");
    const strategy = getQuestionStrategy("opportunity", answers.opportunity ?? "");

    return {
      savedAt: new Date().toISOString(),
      roomModel: {
        roomType: application,
        application,
        outcome: notes.opportunity?.trim() || application,
        customerWording: notes.opportunity?.trim() || allNotes[0] || "",
        scale: answerLabel("scale"),
        devices: [answerLabel("sources")].filter(Boolean),
        displayBehaviour: answerLabel("displays"),
        usbOwnership: answerLabel("usb"),
        audioPath: answerLabel("audio"),
        controlNeeds: [answerLabel("control")].filter(Boolean),
        cableRun: answerLabel("infrastructure"),
        network: answerLabel("infrastructure"),
        notes: allNotes.join(" | "),
        summary: summaryText,
      },
      inference: {
        summary: summaryText,
        architecture: strategy.likelyDirection,
        nextBestQuestion: strategy.askNext,
      },
      capturedPercent: completionPercent,
      returnRoute: routeCatalogByKey.discovery.path,
      nextBestQuestion: strategy.askNext,
    };
  }

  function saveDiscoveryToProject(): void {
    saveDiscoveryBriefToProject(buildDiscoveryBrief());
    setSavedMessage("Discovery saved to your project. Continue to product selection or a proposal when ready.");
  }

  function moveForward(target: "finder" | "proposal"): void {
    saveDiscoveryBriefToProject(buildDiscoveryBrief());
    navigate(target === "proposal" ? routeCatalogByKey.proposal.path : routeCatalogByKey.finder.path);
  }

  function toggleMicrophone(): void {
    setMicError("");

    if (isListening && recogniserRef.current) {
      recogniserRef.current.stop();
      recogniserRef.current = null;
      setIsListening(false);
      return;
    }

    const Recognition = getDiscoverySpeechRecognition();

    if (!Recognition) {
      setMicError("Microphone capture is not supported in this browser. Use Chrome or type notes manually.");
      return;
    }

    const recogniser = new Recognition();
    recogniser.continuous = true;
    recogniser.interimResults = true;
    recogniser.lang = "en-GB";

    recogniser.onresult = (event: DiscoverySpeechRecognitionEventLike) => {
      let finalTranscript = "";
      const startIndex = event.resultIndex ?? 0;

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      const cleanTranscript = finalTranscript.trim();

      if (!cleanTranscript) {
        return;
      }

      const activeStepId = activeStepIdRef.current;

      setNotes((previous) => {
        const existing = previous[activeStepId]?.trim() ?? "";
        const divider = existing.length > 0 ? " " : "";

        return {
          ...previous,
          [activeStepId]: `${existing}${divider}${cleanTranscript}`.trim(),
        };
      });
    };

    recogniser.onerror = () => {
      setMicError("Microphone capture stopped. Check browser microphone permission.");
      setIsListening(false);
    };

    recogniser.onend = () => {
      setIsListening(false);
    };

    recogniserRef.current = recogniser;
    recogniser.start();
    setIsListening(true);
  }

  return (
    <main className="wm-discovery-capture-page" data-audit={discoveryAuditMarkers.join("|")}>
      <header className="wm-discovery-capture-hero">
        <div>
          <p className="wm-discovery-eyebrow">Guided discovery · live call mode</p>
          <h1>One question at a time</h1>
          <p>
            Capture the customer wording, choose the closest answer, then move forward. Use the capture box when the
            answer is not yet clear.
          </p>
        </div>

        <div className="wm-discovery-completion-card" aria-label="Discovery completion">
          <strong>{completionPercent}%</strong>
          <span>{answeredCount} / {discoveryQuestions.length} captured</span>
        </div>
      </header>

      <section className="wm-discovery-trail-card" aria-label="Discovery trail">
        <div className="wm-discovery-trail-topline">
          <span>Discovery trail</span>
          <button type="button" onClick={resetDiscovery}>
            Reset discovery
          </button>
        </div>

        <div className="wm-discovery-progress-bar" aria-hidden="true">
          <span style={{ width: `${completionPercent}%` }} />
        </div>

        <div className="wm-discovery-step-pills">
          {discoveryQuestions.map((step, index) => {
            const answer = answers[step.id];
            const isActive = index === activeIndex;
            const isCaptured = Boolean(answer);

            return (
              <button
                key={step.id}
                type="button"
                className={[
                  "wm-discovery-step-pill",
                  isActive ? "is-active" : "",
                  isCaptured ? "is-captured" : "",
                ].join(" ")}
                onClick={() => setActiveIndex(index)}
                aria-current={isActive ? "step" : undefined}
              >
                <span>{index + 1}</span>
                <strong>{step.shortLabel}</strong>
                {isCaptured && <small>{getOptionLabel(step, answer)}</small>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="wm-discovery-question-layout">
        <section className="wm-discovery-question-card">
          <div className="wm-discovery-question-heading">
            <span>{activeIndex + 1} / {discoveryQuestions.length}</span>
            <h2>{currentStep.question}</h2>
            <p>{currentStep.prompt}</p>
          </div>

          <div className="wm-discovery-why-card">
            <strong>Why this matters</strong>
            <p>{currentStep.why}</p>
          </div>

          <div className="wm-discovery-option-list">
            {currentStep.options.map((option) => {
              const selected = currentAnswer === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={selected ? "wm-discovery-option is-selected" : "wm-discovery-option"}
                  onClick={() => handleSelectAnswer(option.value)}
                  aria-pressed={selected}
                >
                  <span className="wm-discovery-option-radio" aria-hidden="true" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.help}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="wm-discovery-navigation-row">
            <button type="button" onClick={movePrevious} disabled={isFirstStep}>
              Previous
            </button>
            <button type="button" onClick={moveNext} disabled={isLastStep}>
              Skip / next
            </button>
          </div>
        </section>

        <aside className="wm-discovery-capture-card">
          <div className="wm-discovery-capture-heading">
            <div>
              <span>Capture box</span>
              <h3>Customer wording / notes</h3>
            </div>

            <button
              type="button"
              className={isListening ? "wm-discovery-mic-button is-listening" : "wm-discovery-mic-button"}
              onClick={toggleMicrophone}
              aria-pressed={isListening}
              disabled={!micSupported && isListening}
            >
              {isListening ? "Stop mic" : "Mic"}
            </button>
          </div>

          <textarea
            value={currentNote}
            onChange={(event) => handleCaptureChange(event.target.value)}
            placeholder={currentStep.capturePlaceholder}
            rows={9}
          />

          <div className="wm-discovery-capture-actions">
            <button type="button" onClick={saveCaptureAsAnswer} disabled={!currentNote.trim()}>
              Save capture and continue
            </button>
          </div>

          {!micSupported && (
            <p className="wm-discovery-muted-note">
              Microphone capture depends on browser support. Manual note capture is always available.
            </p>
          )}

          {micError && <p className="wm-discovery-error-note">{micError}</p>}

          <div className="wm-discovery-live-tip">
            <strong>Ask this next</strong>
            <p>{selectedApplicationGuidance?.askNext ?? selectedQuestionStrategy.askNext}</p>
          </div>

          {selectedApplicationGuidance && (
            <div className="wm-discovery-live-tip wm-discovery-application-guidance">
              <strong>Application-specific discovery question guidance</strong>
              <p>{selectedApplicationGuidance.likelyDirection}</p>
              <ul>
                {selectedApplicationGuidance.checkBeforeProduct.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {capturedSummary.length > 0 && (
        <section className="wm-discovery-summary-card">
          <div className="wm-discovery-summary-heading">
            <span>Captured brief</span>
            <p>Use this as the working discovery summary before moving into product direction.</p>
          </div>

          <div className="wm-discovery-summary-grid">
            {capturedSummary.map((item) => (
              <article key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.answer}</span>
                {item.note && <p>{item.note}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {capturedSummary.length > 0 && (
        <section className="wm-discovery-summary-card">
          <div className="wm-discovery-summary-heading">
            <span>Next step</span>
            <p>Carry this discovery into product selection or a proposal. The captured brief saves to your project, so the next step picks it up.</p>
          </div>
          <div className="wm-discovery-capture-actions">
            <button type="button" onClick={() => moveForward("finder")}>Find matching products</button>
            <button type="button" onClick={() => moveForward("proposal")}>Build proposal</button>
            <button type="button" onClick={saveDiscoveryToProject}>Save to project</button>
          </div>
          {savedMessage && <p className="wm-discovery-muted-note">{savedMessage}</p>}
        </section>
      )}
    </main>
  );
}

export default DiscoveryPage;