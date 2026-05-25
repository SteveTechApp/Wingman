export type ConversationModeId = "endUser" | "technical" | "distributor" | "document";
export type StartingPointId =
  | "singleLink"
  | "localSwitching"
  | "oneToMany"
  | "manyToMany"
  | "meetingRoom"
  | "videoWall"
  | "cameraUc"
  | "competitor"
  | "document";

export type AnswerMap = Record<string, string>;

export type ConversationMode = {
  id: ConversationModeId;
  title: string;
  shortLabel: string;
  description: string;
  example: string;
};

export type StartingPoint = {
  id: StartingPointId;
  title: string;
  description: string;
  likelyRoute: string;
};

export type GuidedQuestion = {
  id: string;
  title: string;
  appliesTo: StartingPointId[] | "all";
  prompt: Record<ConversationModeId, string>;
  why: string;
  options?: Array<{
    value: string;
    label: string;
    hint?: string;
  }>;
  placeholder?: string;
};

export type ArchitectureGuidance = {
  route: string;
  confidence: "Low" | "Medium" | "High";
  why: string[];
  likelyTechnology: string[];
  needsToConfirm: string[];
};

export const conversationModes: ConversationMode[] = [
  {
    id: "endUser",
    title: "End-user discovery",
    shortLabel: "Customer wording",
    description: "Plain English questions for non-technical customers.",
    example: "Ask: how far is the laptop from the screen?"
  },
  {
    id: "technical",
    title: "Technical design",
    shortLabel: "Technical wording",
    description: "Detailed AV language for consultants, SIs and engineers.",
    example: "Ask: what is the installed cable path distance and required video format?"
  },
  {
    id: "distributor",
    title: "Distributor sales call",
    shortLabel: "Sales wording",
    description: "Fast qualification for AVM, Northamber, SolsticeAV and reseller sales calls.",
    example: "Ask: is this just screen sharing, or does the customer also need camera and audio?"
  },
  {
    id: "document",
    title: "RFP / email / PDF review",
    shortLabel: "Document wording",
    description: "Use when requirements arrive as written notes, tenders, PDFs or competitor links.",
    example: "Ask: what is confirmed, assumed, missing or risky?"
  }
];

export const startingPoints: StartingPoint[] = [
  {
    id: "singleLink",
    title: "One source to one display",
    description: "A simple connection, extension or replacement enquiry.",
    likelyRoute: "Point-to-point extension"
  },
  {
    id: "localSwitching",
    title: "Several sources to one display",
    description: "Meeting room, classroom, lectern or simple switching need.",
    likelyRoute: "Local switching / presentation switching"
  },
  {
    id: "oneToMany",
    title: "One source to several displays",
    description: "Duplicate or distribute content to multiple screens.",
    likelyRoute: "Distribution, matrix or AV-over-IP"
  },
  {
    id: "manyToMany",
    title: "Many sources to many displays",
    description: "Flexible routing between multiple inputs and outputs.",
    likelyRoute: "Matrix or AV-over-IP"
  },
  {
    id: "meetingRoom",
    title: "Meeting room / classroom",
    description: "BYOD, UC, presentation, camera, microphone or display workflow.",
    likelyRoute: "Presentation / UC switching"
  },
  {
    id: "videoWall",
    title: "Video wall",
    description: "LCD wall, LED wall, canvas, multiview or wall processor requirement.",
    likelyRoute: "Video wall processor or AV-over-IP"
  },
  {
    id: "cameraUc",
    title: "Cameras / microphones / UC",
    description: "Teams, Zoom, BYOM, cameras, bridge, USB or NDI workflow.",
    likelyRoute: "UC / USB / camera signal path"
  },
  {
    id: "competitor",
    title: "Competitor replacement",
    description: "Understand another product and position a WyreStorm equivalent.",
    likelyRoute: "Comparison-led product fit"
  },
  {
    id: "document",
    title: "Analyse email, RFP, PDF or web link",
    description: "Extract requirements first, then ask only for the missing items.",
    likelyRoute: "Document-led discovery"
  }
];

export const guidedQuestions: GuidedQuestion[] = [
  {
    id: "documentSource",
    title: "Document source",
    appliesTo: ["document"],
    prompt: {
      endUser: "What written information have you received from the customer?",
      technical: "Paste the relevant RFP, tender, email extract, PDF notes or competitor URL summary.",
      distributor: "Paste the customer email or notes so Wingman can pull out the useful sales/design clues.",
      document: "Paste the RFP, email, PDF notes, customer request or competitor link details."
    },
    why: "Written requirements are often incomplete. Wingman should separate confirmed facts from assumptions and missing design questions.",
    placeholder: "Paste the customer request, tender notes, PDF extract or competitor link notes here."
  },
  {
    id: "competitorSku",
    title: "Competitor product",
    appliesTo: ["competitor"],
    prompt: {
      endUser: "What product has the customer mentioned or already been quoted?",
      technical: "What competitor brand and SKU needs to be replaced or compared?",
      distributor: "What competitor product is in the opportunity?",
      document: "Which competitor product appears in the document or customer request?"
    },
    why: "Wingman should compare product role first, then I/O, transport, distance and required features.",
    placeholder: "Example: Blustream C88CS, HDAnywhere matrix, Just Add Power encoder/decoder, Kramer VP-440X."
  },
  {
    id: "roomUse",
    title: "Room or application",
    appliesTo: "all",
    prompt: {
      endUser: "What kind of space is this for, and what does the customer need people to do in the room?",
      technical: "Define the room type, application and operational use case.",
      distributor: "What is the customer actually trying to use the space for?",
      document: "What room/application does the document describe?"
    },
    why: "The same I/O can lead to different products depending on whether this is a meeting room, teaching space, hospitality venue, signage system or control room.",
    options: [
      { value: "meeting-room", label: "Meeting room", hint: "Presentation, BYOD, Teams/Zoom, dual display or room PC." },
      { value: "classroom", label: "Classroom / training", hint: "Lectern, teacher source, display/projector, capture or student interaction." },
      { value: "hospitality", label: "Hospitality / bar", hint: "Multiple displays, zones, Sky/BT/signage and easy control." },
      { value: "boardroom", label: "Boardroom", hint: "Higher finish, control, conferencing and reliability expectations." },
      { value: "signage", label: "Signage / distribution", hint: "Central source distribution or scheduled display content." },
      { value: "control-room", label: "Control room", hint: "Multiview, low latency, many sources and operator monitoring." },
      { value: "unknown", label: "Not sure yet", hint: "Capture what is known and keep moving." }
    ]
  },
  {
    id: "ioPattern",
    title: "Inputs and outputs",
    appliesTo: "all",
    prompt: {
      endUser: "How many things need to send a picture, and how many screens need to show it?",
      technical: "How many source inputs and display outputs are required?",
      distributor: "Is this 1-to-1, many-to-1, 1-to-many, or many-to-many?",
      document: "What source and display count is confirmed in the document?"
    },
    why: "I/O pattern is the quickest way to identify whether this is extension, switching, matrix, AV-over-IP or wall processing.",
    options: [
      { value: "1x1", label: "1 input to 1 output", hint: "Usually point-to-point extension or simple local connection." },
      { value: "many-to-one", label: "Several inputs to 1 display", hint: "Usually local switcher, presentation switcher or matrix input side." },
      { value: "one-to-many", label: "1 input to several displays", hint: "Distribution, splitter, matrix or AV-over-IP depending on distance and control." },
      { value: "many-to-many", label: "Many inputs to many displays", hint: "Matrix or AV-over-IP." },
      { value: "not-confirmed", label: "Not confirmed", hint: "Wingman should ask this next on the customer call." }
    ]
  },
  {
    id: "locations",
    title: "Device locations",
    appliesTo: "all",
    prompt: {
      endUser: "Where are the source devices compared with the screens?",
      technical: "Identify source, display, rack, table, lectern and wall plate locations.",
      distributor: "Are the devices in a rack, at the table, behind the screen, or spread around the room/building?",
      document: "What does the written request say about source/display/rack locations?"
    },
    why: "Location decides whether the design is local, centralised, point-to-point, matrix or network-distributed.",
    options: [
      { value: "same-location", label: "Same area", hint: "Short local switching may be possible." },
      { value: "table-to-display", label: "Table to display", hint: "Often presentation switching, USB-C, HDBaseT or USB extension." },
      { value: "rack-to-display", label: "Rack to display", hint: "Centralised source, matrix, HDBaseT or AVoIP." },
      { value: "spread-out", label: "Spread around building", hint: "AV-over-IP becomes more likely." },
      { value: "unknown", label: "Not sure yet", hint: "Ask the customer where each item physically lives." }
    ]
  },
  {
    id: "contentBehaviour",
    title: "Display behaviour",
    appliesTo: "all",
    prompt: {
      endUser: "Do all screens show the same thing, or does each screen need to show something different?",
      technical: "Is the output requirement mirrored, independently routed, multiview, wall canvas or mixed?",
      distributor: "Are we duplicating content, switching content, routing content, or building a wall/multiview?",
      document: "Does the document define mirrored, independent, multiview or wall behaviour?"
    },
    why: "Display behaviour separates simple distribution from matrix routing, AV-over-IP, multiview and video wall processing.",
    options: [
      { value: "mirror", label: "Same content on all screens", hint: "Distribution or mirrored matrix output may suit." },
      { value: "independent", label: "Different content per screen", hint: "Matrix or AV-over-IP is more likely." },
      { value: "multiview", label: "Several sources on one screen", hint: "Requires a true multiview processor/output." },
      { value: "video-wall", label: "One image across multiple displays", hint: "Requires wall processing." },
      { value: "mixed", label: "Mixed layouts", hint: "Likely processor, AVoIP, or more advanced matrix/scaling." }
    ]
  },
  {
    id: "distance",
    title: "Cable path distance",
    appliesTo: "all",
    prompt: {
      endUser: "Roughly how far is the computer/source from the screen, following the real cable route?",
      technical: "What is the installed cable path distance between source, rack and display endpoints?",
      distributor: "Is this a short local cable, across the room, back to a rack, or across the building?",
      document: "Does the document give installed cable lengths or room-to-rack distances?"
    },
    why: "Distance drives HDMI, HDBaseT, fibre or AV-over-IP decisions. Real cable route matters more than straight-line distance.",
    options: [
      { value: "under-5m", label: "Under 5m", hint: "Local HDMI/USB-C may be possible." },
      { value: "5-15m", label: "5m to 15m", hint: "Check cable quality and video bandwidth." },
      { value: "15-40m", label: "15m to 40m", hint: "HDBaseT or active extension is likely." },
      { value: "40-100m", label: "40m to 100m", hint: "HDBaseT, fibre or AVoIP should be considered." },
      { value: "over-100m", label: "Over 100m", hint: "Fibre or AV-over-IP is more likely." },
      { value: "unknown", label: "Unknown", hint: "Ask for room/rack/display locations and cable path estimate." }
    ]
  },
  {
    id: "resolution",
    title: "Video quality",
    appliesTo: "all",
    prompt: {
      endUser: "Does the customer only need normal HD, standard 4K, or the best possible 4K quality?",
      technical: "Required video format: 1080p, 4K30, 4K60 4:2:0, 4K60 4:4:4, HDR or low-latency?",
      distributor: "Is this basic display content, normal meeting-room 4K, or high-performance 4K/HDR?",
      document: "What resolution, refresh rate, colour sampling or HDR requirement is specified?"
    },
    why: "Video format determines whether value products are enough or whether higher-bandwidth HDBaseT, NetworkHD 500/600 or specialist processing is needed.",
    options: [
      { value: "1080p", label: "1080p / basic HD", hint: "Good for value-led extension, UC and many legacy systems." },
      { value: "4k-standard", label: "Standard 4K", hint: "Typical meeting room and signage requirement." },
      { value: "4k60-high", label: "High-performance 4K60", hint: "May need stronger switching, HDBaseT or NetworkHD 500/600." },
      { value: "hdr-critical", label: "HDR / colour critical", hint: "Avoid under-specifying bandwidth and processing." },
      { value: "unknown", label: "Not confirmed", hint: "Ask what source/display resolution is expected." }
    ]
  },
  {
    id: "usbUc",
    title: "USB, cameras and conferencing",
    appliesTo: "all",
    prompt: {
      endUser: "When someone plugs in a laptop, do they also need to use the room camera, microphone, speakerphone or touchscreen?",
      technical: "Is USB 2.0, USB 3.x, BYOD, BYOM, camera bridge, PTZ or KVM transport required?",
      distributor: "Is this just video to a screen, or does the laptop also need camera/audio/touch/KVM?",
      document: "Does the document specify Teams, Zoom, BYOD, USB cameras, microphones, touch or KVM?"
    },
    why: "USB is often missed. A working meeting room needs the camera/mic/touch path designed separately from the video path.",
    options: [
      { value: "none", label: "No USB needed", hint: "Video-only design may be enough." },
      { value: "camera-mic", label: "Camera / mic / speaker needed", hint: "UC or USB extension path required." },
      { value: "touch", label: "Interactive display / touch", hint: "Touchback USB must be included." },
      { value: "kvm", label: "Keyboard / mouse / KVM", hint: "Latency and USB reliability matter." },
      { value: "ndi-camera", label: "NDI camera / IP camera", hint: "Consider NDI bridge / NetworkHD 100 H.265 workflows." },
      { value: "unknown", label: "Not sure yet", hint: "Ask before choosing products." }
    ]
  },
  {
    id: "audio",
    title: "Audio path",
    appliesTo: "all",
    prompt: {
      endUser: "Where should the sound come from: the screen, ceiling speakers, soundbar or something else?",
      technical: "Define embedded audio, de-embed, analogue, balanced, DSP, amplifier, Dante or ARC/eARC requirements.",
      distributor: "Is display audio enough, or are there speakers, amp, DSP, microphones or Dante involved?",
      document: "What audio output, microphone, DSP, amplifier or Dante requirements are specified?"
    },
    why: "Audio requirements often add products, cabling and commissioning complexity beyond the video path.",
    options: [
      { value: "display-audio", label: "Display audio only", hint: "Simplest path if acceptable." },
      { value: "soundbar", label: "Soundbar / video bar", hint: "May combine audio, camera and USB." },
      { value: "amp-speakers", label: "Amp / ceiling speakers", hint: "Requires audio extraction or dedicated audio path." },
      { value: "dsp-dante", label: "DSP / Dante", hint: "Network/audio design needs confirmation." },
      { value: "unknown", label: "Not confirmed", hint: "Ask where the customer expects sound to come out." }
    ]
  },
  {
    id: "control",
    title: "Control requirement",
    appliesTo: "all",
    prompt: {
      endUser: "How does the customer want to change what appears on the screen?",
      technical: "Control requirement: auto-switching, IR, RS-232, TCP/IP, touch panel, app, API or third-party control?",
      distributor: "Does the customer need a simple button, auto switching, app control or a control system?",
      document: "Does the document specify control, switching method, RS-232, IR, TCP/IP or app control?"
    },
    why: "Control preference can change product family, required accessories and commissioning effort.",
    options: [
      { value: "manual", label: "Manual switching", hint: "Simple button/remote/front panel may be enough." },
      { value: "auto", label: "Auto switching", hint: "Useful for simple meeting rooms." },
      { value: "touch-app", label: "Touch panel / app", hint: "More suitable for flexible or multi-screen systems." },
      { value: "third-party", label: "Third-party control", hint: "Check RS-232, IR, IP and driver expectations." },
      { value: "unknown", label: "Not confirmed", hint: "Ask how users will operate the room." }
    ]
  },
  {
    id: "videoWallLayout",
    title: "Video wall layout",
    appliesTo: ["videoWall"],
    prompt: {
      endUser: "How are the screens arranged, and should they act like one big screen or several separate screens?",
      technical: "Confirm wall size, LCD/LED type, canvas behaviour, source windows, presets and processing location.",
      distributor: "Is this a simple 2x2 wall, an LED wall, or a flexible source/window layout?",
      document: "What wall size, layout, canvas and source-window behaviour is specified?"
    },
    why: "A video wall may need SW-0204-VW, SW-0206-VW, NetworkHD multiview/wall workflows or a different processor approach.",
    options: [
      { value: "2x2-simple", label: "Simple 2x2", hint: "Dedicated wall processor may suit." },
      { value: "larger-lcd", label: "Larger LCD wall", hint: "Confirm outputs, bezel/layout and processor capacity." },
      { value: "led-wall", label: "LED wall", hint: "Confirm LED processor input requirements." },
      { value: "flexible-windows", label: "Flexible windows / sources", hint: "AVoIP or advanced processing may be required." },
      { value: "unknown", label: "Not confirmed", hint: "Ask wall size and required behaviour." }
    ]
  },
  {
    id: "expansion",
    title: "Expansion and flexibility",
    appliesTo: "all",
    prompt: {
      endUser: "Is this likely to grow later, or is it a fixed one-room requirement?",
      technical: "Is future endpoint expansion, multi-room routing, source sharing or network scalability required?",
      distributor: "Is this a one-off room, or could it expand to more screens, rooms or sites?",
      document: "Does the document suggest future expansion, phases, multiple rooms or a wider estate?"
    },
    why: "Future expansion is one of the main reasons to choose AV-over-IP instead of a fixed matrix or simple extender.",
    options: [
      { value: "fixed", label: "Fixed requirement", hint: "A simpler fixed-I/O solution may be better value." },
      { value: "some-expansion", label: "May expand", hint: "Allow headroom in switching or endpoint choice." },
      { value: "multi-room", label: "Multi-room / estate", hint: "AV-over-IP becomes more attractive." },
      { value: "unknown", label: "Not sure", hint: "Treat as a risk/assumption." }
    ]
  }
];

function applies(question: GuidedQuestion, startingPoint: StartingPointId) {
  if (question.appliesTo === "all") return true;
  return question.appliesTo.includes(startingPoint);
}

export function getNextQuestion(startingPoint: StartingPointId | null, answers: AnswerMap) {
  if (!startingPoint) return null;
  return guidedQuestions.find((question) => applies(question, startingPoint) && !answers[question.id]) ?? null;
}

export function getAnsweredQuestionIds(startingPoint: StartingPointId | null, answers: AnswerMap) {
  if (!startingPoint) return [];
  return guidedQuestions
    .filter((question) => applies(question, startingPoint))
    .filter((question) => Boolean(answers[question.id]))
    .map((question) => question.id);
}

export function getTotalQuestionCount(startingPoint: StartingPointId | null) {
  if (!startingPoint) return 0;
  return guidedQuestions.filter((question) => applies(question, startingPoint)).length;
}

export function findQuestion(id: string) {
  return guidedQuestions.find((question) => question.id === id);
}

export function deriveArchitecture(
  startingPoint: StartingPointId | null,
  answers: AnswerMap,
): ArchitectureGuidance {
  const why: string[] = [];
  const likelyTechnology: string[] = [];
  const needsToConfirm: string[] = [];

  if (!startingPoint) {
    return {
      route: "Awaiting starting point",
      confidence: "Low",
      why: ["Wingman needs the basic task before choosing a route."],
      likelyTechnology: ["Guided discovery"],
      needsToConfirm: ["Conversation type", "Application", "I/O pattern"]
    };
  }

  const io = answers.ioPattern;
  const distance = answers.distance;
  const content = answers.contentBehaviour;
  const usb = answers.usbUc;
  const resolution = answers.resolution;
  const expansion = answers.expansion;

  if (startingPoint === "singleLink" || io === "1x1") {
    why.push("The I/O pattern looks like a simple source-to-display path.");
    likelyTechnology.push("HDMI / USB-C local connection", "HDBaseT extension", "Fibre extension for longer distances");
  }

  if (startingPoint === "localSwitching" || io === "many-to-one") {
    why.push("Multiple local sources into one display usually points to a switcher or presentation switcher.");
    likelyTechnology.push("Presentation switcher", "UC switcher", "HDBaseT output switcher");
  }

  if (startingPoint === "oneToMany" || io === "one-to-many") {
    why.push("One source feeding several displays may require distribution, matrix output or AV-over-IP.");
    likelyTechnology.push("Distribution amplifier", "Matrix switching", "NetworkHD if displays are distributed");
  }

  if (startingPoint === "manyToMany" || io === "many-to-many") {
    why.push("Many sources and many displays usually needs matrix switching or AV-over-IP.");
    likelyTechnology.push("Seamless / HDBaseT matrix", "NetworkHD 100", "NetworkHD 500", "NetworkHD 600 for 10G lossless");
  }

  if (startingPoint === "meetingRoom") {
    why.push("The application suggests presentation, BYOD, UC and simple user operation.");
    likelyTechnology.push("Presentation / UC switching", "USB extension", "HDBaseT display output");
  }

  if (startingPoint === "cameraUc" || usb === "camera-mic" || usb === "touch" || usb === "kvm" || usb === "ndi-camera") {
    why.push("USB, camera, microphone, touch or KVM changes this from video-only to a full signal-path design.");
    likelyTechnology.push("UC products", "USB extension", "Camera bridge", "NDI bridge / NetworkHD workflow where appropriate");
  }

  if (startingPoint === "videoWall" || content === "video-wall" || content === "multiview") {
    why.push("Wall or multiview behaviour requires processing, not just multiple outputs.");
    likelyTechnology.push("SW-0204-VW", "SW-0206-VW", "NetworkHD multiview / wall approach");
  }

  if (startingPoint === "competitor") {
    why.push("Competitor replacement should match product role before matching ports.");
    likelyTechnology.push("WyreStorm equivalent by role", "Architecture comparison", "Feature gap check");
  }

  if (startingPoint === "document") {
    why.push("Document-led discovery should extract confirmed, assumed, missing and risky items before product selection.");
    likelyTechnology.push("Requirement extraction", "Guided gap questions", "Architecture checkpoint");
  }

  if (distance === "40-100m" || distance === "over-100m") {
    why.push("The stated distance pushes the design beyond simple passive HDMI assumptions.");
    likelyTechnology.push("HDBaseT", "Fibre", "AV-over-IP");
  }

  if (content === "independent" || expansion === "multi-room") {
    why.push("Independent routing or multi-room expansion increases the case for matrix or AV-over-IP.");
    likelyTechnology.push("Matrix", "NetworkHD 100", "NetworkHD 500");
  }

  if (resolution === "4k60-high" || resolution === "hdr-critical") {
    why.push("High video quality requires care with bandwidth, colour, HDR and latency.");
    likelyTechnology.push("Higher-bandwidth matrix", "NetworkHD 500", "NetworkHD 600");
  }

  if (!answers.distance) needsToConfirm.push("Cable path distance");
  if (!answers.resolution) needsToConfirm.push("Video format / resolution");
  if (!answers.usbUc) needsToConfirm.push("USB, camera, microphone, touch or KVM requirement");
  if (!answers.audio) needsToConfirm.push("Audio output path");
  if (!answers.control) needsToConfirm.push("Control method");

  const uniqueTechnology = Array.from(new Set(likelyTechnology));
  const confidence: ArchitectureGuidance["confidence"] = why.length >= 4 ? "High" : why.length >= 2 ? "Medium" : "Low";

  const route = uniqueTechnology.includes("NetworkHD 600 for 10G lossless")
    ? "AV-over-IP / high-performance distributed system"
    : uniqueTechnology.includes("NetworkHD 100")
      ? "Matrix or AV-over-IP"
      : uniqueTechnology.includes("Presentation / UC switching")
        ? "Presentation / UC switching"
        : uniqueTechnology.includes("SW-0206-VW")
          ? "Video wall / multiview processing"
          : uniqueTechnology.includes("HDBaseT extension")
            ? "Point-to-point extension"
            : "Guided AV discovery";

  return {
    route,
    confidence,
    why: why.length ? why : ["Wingman is still gathering enough information to classify the system."],
    likelyTechnology: uniqueTechnology.length ? uniqueTechnology : ["Discovery still in progress"],
    needsToConfirm: needsToConfirm.length ? needsToConfirm : ["Enough information for an architecture checkpoint"]
  };
}

export function answerLabel(questionId: string, value: string) {
  const question = findQuestion(questionId);
  const option = question?.options?.find((item) => item.value === value);
  return option?.label ?? value;
}