import { useMemo, useState } from "react";

type TemplateStep = "recognise" | "assumptions" | "schematic" | "validate" | "handoff";

type SignalType =
  | "HDMI"
  | "USB"
  | "LAN / AVoIP"
  | "Audio"
  | "Dante"
  | "Control"
  | "Power";

type DiagramDevice = {
  id: string;
  label: string;
  sku?: string;
  role: string;
  category: string;
  wyrestorm?: boolean;
};

type DiagramLocation = {
  id: string;
  label: string;
  type: string;
  description: string;
  x: number;
  y: number;
  w: number;
  h: number;
  devices: DiagramDevice[];
};

type DiagramConnection = {
  id: string;
  from: string;
  to: string;
  type: SignalType;
  label: string;
  validationRequired?: boolean;
};

type AdvisoryTemplate = {
  id: string;
  name: string;
  vertical: string;
  roomType: string;
  technology: string;
  status: string;
  typicalCapacity: string;
  applicationLine: string;
  realWorldApplication: string;
  primaryOutcome: string;
  assumptions: {
    roomSize: string;
    audience: string;
    sources: string;
    displays: string;
    equipmentLocation: string;
    uc: string;
    audio: string;
    control: string;
    network: string;
    installation: string;
    unsuitableWhen: string;
  };
  advice: {
    useWhen: string[];
    avoidWhen: string[];
    questions: string[];
    upgradePath: string[];
    objection: string;
    salesAngle: string;
  };
  validation: string[];
  locations: DiagramLocation[];
  connections: DiagramConnection[];
};

const templates: AdvisoryTemplate[] = [
  {
    id: "corporate-boardroom-networkhd500",
    name: "Corporate Boardroom - NetworkHD 500",
    vertical: "Corporate",
    roomType: "Executive boardroom / divisible meeting space",
    technology: "NetworkHD 500",
    status: "Advisory ready",
    typicalCapacity: "10-24 people",
    applicationLine: "Executive meeting room with multiple 4K sources, routed displays and future expansion path.",
    realWorldApplication: "A boardroom where local table sources, rack sources and conferencing equipment need to feed one or more high-quality 4K displays without locking the customer into a fixed local matrix design.",
    primaryOutcome: "Give the salesperson a credible boardroom starting point while making the network, USB, audio and physical-location assumptions obvious before proposal work.",
    assumptions: {
      roomSize: "Medium to large boardroom, usually with front display, confidence display or divisible-room output requirement.",
      audience: "Senior users, boardroom users, hybrid meeting participants and support staff.",
      sources: "User laptops, room PC, wireless presentation source, rack media source and optional camera/recording feed.",
      displays: "Primary front display plus optional confidence monitor, projector, overflow display or divisible-room display zone.",
      equipmentLocation: "AV endpoints and switching core are assumed to sit in a rack or AV network cabinet. Table inputs may be at the meeting table. Display receivers sit behind or near displays.",
      uc: "USB camera, microphones and speaker route must be validated. Do not assume USB follows HDMI automatically.",
      audio: "Display audio may be enough for simple rooms, but boardrooms commonly need DSP, amplifier, microphones and ceiling loudspeakers.",
      control: "Control may be third-party, web interface, touch panel, display control or simple source selection depending on the project.",
      network: "Managed AV network or VLAN is assumed. NetworkHD 500 requires suitable switch, multicast configuration and commissioning access.",
      installation: "Cable routes between table, rack, displays and ceiling must be confirmed before this template is used.",
      unsuitableWhen: "Do not use this as-is for simple one-display rooms, unmanaged networks, no-rack installations, Teams-certified room requirements, or where USB extension is the primary design challenge."
    },
    advice: {
      useWhen: [
        "The room needs premium 4K video quality and flexible display routing.",
        "Sources and displays are not all in one local equipment position.",
        "The customer wants future expansion or multi-room routing.",
        "There is a managed AV network path available."
      ],
      avoidWhen: [
        "The room only needs a small local switcher.",
        "The network is unmanaged or cannot support AV multicast traffic.",
        "The customer expects a certified Teams Room appliance rather than BYOD/BYOM support.",
        "USB topology has not been discussed."
      ],
      questions: [
        "Where are sources physically located: table, rack, lectern or local credenza?",
        "How many displays are required now and later?",
        "Is USB camera/microphone routing required, or is this video-only?",
        "Is the NetworkHD switch/VLAN already specified?",
        "Does the room need Dante, DSP, amplifier or only display audio?"
      ],
      upgradePath: [
        "Add multiview where the customer needs multiple sources visible at once.",
        "Add Dante/DSP where the audio requirement becomes room-wide rather than display audio.",
        "Move from local matrix to AVoIP when the number of outputs, distance or expansion requirement increases."
      ],
      objection: "The customer may say AVoIP is overkill for one room. The answer is that this template is for flexible routing, future expansion and distributed source/display locations.",
      salesAngle: "Position NetworkHD 500 as the routed AV layer for premium 4K rooms where the physical room layout and future expansion are more important than the cheapest local switch."
    },
    validation: [
      "Confirm NetworkHD series choice and switch readiness.",
      "Confirm encoder positions near sources and decoder positions near displays.",
      "Confirm if USB must follow source selection.",
      "Confirm audio system type: display audio, soundbar, amplifier, DSP or Dante.",
      "Confirm rack, table and display cable routes.",
      "Confirm control method and user operation expectation."
    ],
    locations: [
      {
        id: "sources",
        label: "Sources",
        type: "left",
        description: "User and rack-based content sources.",
        x: 40,
        y: 130,
        w: 210,
        h: 300,
        devices: [
          { id: "laptop", label: "User laptop", role: "HDMI / USB-C source", category: "source" },
          { id: "roompc", label: "Room PC", role: "Local meeting PC", category: "source" },
          { id: "wireless", label: "Wireless presentation", role: "Optional BYOD input", category: "source" },
          { id: "media", label: "Rack media player", role: "Scheduled content", category: "source" }
        ]
      },
      {
        id: "table",
        label: "Table / lectern",
        type: "input",
        description: "Local user connection point.",
        x: 320,
        y: 80,
        w: 230,
        h: 230,
        devices: [
          { id: "table-input", label: "Table input plate", role: "HDMI / USB-C input", category: "input" },
          { id: "table-usb", label: "USB table hub", role: "USB devices / host path", category: "usb" }
        ]
      },
      {
        id: "rack",
        label: "Rack / AV network",
        type: "core",
        description: "Core connectivity and switching area.",
        x: 610,
        y: 70,
        w: 260,
        h: 320,
        devices: [
          { id: "encoder", label: "NHD-500 encoder", sku: "NHD-500-TX", role: "Encode HDMI to AV network", category: "av", wyrestorm: true },
          { id: "switch", label: "Managed AV switch", role: "AV VLAN / multicast", category: "network" },
          { id: "ctl", label: "NetworkHD controller", sku: "NHD-CTL-PRO", role: "System control", category: "control", wyrestorm: true },
          { id: "dsp", label: "DSP / amplifier", role: "Room audio processing", category: "audio" }
        ]
      },
      {
        id: "displays",
        label: "Displays / outputs",
        type: "right",
        description: "Display endpoints and room outputs.",
        x: 940,
        y: 120,
        w: 220,
        h: 310,
        devices: [
          { id: "decoder-main", label: "NHD-500 decoder", sku: "NHD-500-RX", role: "Main display feed", category: "av", wyrestorm: true },
          { id: "main-display", label: "Main 4K display", role: "Primary room output", category: "display" },
          { id: "confidence", label: "Confidence display", role: "Optional secondary output", category: "display" }
        ]
      },
      {
        id: "audio",
        label: "Audio / UC",
        type: "bottom",
        description: "Audio and conferencing devices needing separate validation.",
        x: 320,
        y: 470,
        w: 610,
        h: 160,
        devices: [
          { id: "camera", label: "USB camera / PTZ", role: "Meeting camera", category: "usb" },
          { id: "mics", label: "Microphones", role: "Voice pickup", category: "audio" },
          { id: "speakers", label: "Ceiling speakers", role: "Room audio output", category: "audio" }
        ]
      }
    ],
    connections: [
      { id: "c1", from: "laptop", to: "table-input", type: "HDMI", label: "HDMI / USB-C" },
      { id: "c2", from: "roompc", to: "encoder", type: "HDMI", label: "HDMI" },
      { id: "c3", from: "table-input", to: "encoder", type: "HDMI", label: "HDMI to encoder" },
      { id: "c4", from: "encoder", to: "switch", type: "LAN / AVoIP", label: "AVoIP LAN" },
      { id: "c5", from: "switch", to: "decoder-main", type: "LAN / AVoIP", label: "AVoIP LAN" },
      { id: "c6", from: "decoder-main", to: "main-display", type: "HDMI", label: "HDMI" },
      { id: "c7", from: "table-usb", to: "camera", type: "USB", label: "USB path", validationRequired: true },
      { id: "c8", from: "mics", to: "dsp", type: "Audio", label: "Mic audio", validationRequired: true },
      { id: "c9", from: "dsp", to: "speakers", type: "Audio", label: "Amplified audio" },
      { id: "c10", from: "ctl", to: "switch", type: "Control", label: "Control LAN" }
    ]
  },
  {
    id: "corporate-huddle-room-apollo-byod",
    name: "Corporate Huddle Room - Apollo BYOD",
    vertical: "Corporate",
    roomType: "Small BYOD meeting room",
    technology: "Apollo BYOD",
    status: "Advisory ready",
    typicalCapacity: "2-6 people",
    applicationLine: "Compact meeting room where the user's laptop drives the call and room USB devices.",
    realWorldApplication: "A small meeting room where users bring a laptop and need quick access to display, camera, microphone and speaker without a full room-control system.",
    primaryOutcome: "Help a salesperson separate simple BYOD requirements from larger switching or AVoIP designs.",
    assumptions: {
      roomSize: "Small huddle or focus room.",
      audience: "Small internal teams and visiting users.",
      sources: "Primarily user laptop via USB-C/HDMI with optional wireless presentation.",
      displays: "Single front display is assumed.",
      equipmentLocation: "Most equipment is local to the display, table or small credenza.",
      uc: "Laptop is assumed to be the meeting host. USB device path is critical.",
      audio: "Room audio may be via USB speakerphone, soundbar or display audio depending on quality expectation.",
      control: "Simple source/input operation; no complex control system assumed.",
      network: "Network may only be required for management or wireless features depending on product selection.",
      installation: "Short local cable routes are assumed.",
      unsuitableWhen: "Do not use for multi-display routing, central rack distribution, divisible rooms or larger rooms needing DSP/microphone zoning."
    },
    advice: {
      useWhen: [
        "The customer wants a simple laptop-led meeting room.",
        "One display and one primary user position are enough.",
        "USB camera and audio access are more important than source routing.",
        "The salesperson needs a fast BYOD recommendation."
      ],
      avoidWhen: [
        "The room needs multiple independent outputs.",
        "The customer needs centralised routing across rooms.",
        "The USB path exceeds practical limits without extension.",
        "The customer requires certified Teams Room appliance behaviour."
      ],
      questions: [
        "Is the laptop the meeting host?",
        "Where will the user connect at the table?",
        "What USB devices are required?",
        "Is wireless presentation expected?",
        "Does the display need CEC, RS-232 or IR control?"
      ],
      upgradePath: [
        "Move to presentation switcher if several fixed local inputs are needed.",
        "Move to HDBaseT if display distance becomes the main problem.",
        "Move to AVoIP if the room needs routed outputs or expansion."
      ],
      objection: "The customer may compare against a simple USB-C adapter. The answer is reliability, installed-room usability and proper AV/USB integration.",
      salesAngle: "Position this as a fast, low-friction BYOD room for users who want the room to work like a professional extension of their laptop."
    },
    validation: [
      "Confirm laptop connection type.",
      "Confirm USB camera/mic/speaker requirements.",
      "Confirm cable length from table to display.",
      "Confirm whether wireless presentation is needed.",
      "Confirm display control expectation."
    ],
    locations: [
      {
        id: "table",
        label: "Table",
        type: "left",
        description: "User connection position.",
        x: 50,
        y: 140,
        w: 230,
        h: 250,
        devices: [
          { id: "laptop", label: "User laptop", role: "Meeting host", category: "source" },
          { id: "table-dock", label: "BYOD table connection", role: "USB-C / HDMI / USB", category: "input" }
        ]
      },
      {
        id: "display",
        label: "Display position",
        type: "right",
        description: "Local display and UC devices.",
        x: 800,
        y: 120,
        w: 310,
        h: 300,
        devices: [
          { id: "apollo", label: "Apollo BYOD device", role: "Room connectivity hub", category: "av", wyrestorm: true },
          { id: "display-main", label: "Main display", role: "Room output", category: "display" },
          { id: "camera", label: "USB camera", role: "Video capture", category: "usb" },
          { id: "speakerphone", label: "USB speakerphone", role: "Audio capture/playback", category: "audio" }
        ]
      },
      {
        id: "network",
        label: "Network / control",
        type: "top",
        description: "Optional network services.",
        x: 390,
        y: 80,
        w: 290,
        h: 150,
        devices: [
          { id: "network", label: "Room network", role: "Management / wireless", category: "network" }
        ]
      },
      {
        id: "audio",
        label: "Audio",
        type: "bottom",
        description: "Simple room audio path.",
        x: 390,
        y: 480,
        w: 300,
        h: 120,
        devices: [
          { id: "audio-note", label: "Audio via USB device", role: "Validate quality expectation", category: "audio" }
        ]
      }
    ],
    connections: [
      { id: "c1", from: "laptop", to: "table-dock", type: "USB", label: "USB-C / USB" },
      { id: "c2", from: "table-dock", to: "apollo", type: "USB", label: "USB / AV" },
      { id: "c3", from: "apollo", to: "display-main", type: "HDMI", label: "HDMI" },
      { id: "c4", from: "camera", to: "apollo", type: "USB", label: "USB device" },
      { id: "c5", from: "speakerphone", to: "apollo", type: "USB", label: "USB audio" },
      { id: "c6", from: "network", to: "apollo", type: "Control", label: "Optional LAN" }
    ]
  },
  {
    id: "education-classroom-front-of-room-hdbaset",
    name: "Education Classroom - Front-of-Room HDBaseT",
    vertical: "Education",
    roomType: "Teaching room / standard classroom",
    technology: "HDBaseT",
    status: "Advisory ready",
    typicalCapacity: "15-40 learners",
    applicationLine: "Lectern-led classroom with local sources extended to a front display or projector.",
    realWorldApplication: "A classroom where sources are mainly at the teacher position and the display/projector is at the front of the room, making point-to-point extension more appropriate than full AVoIP.",
    primaryOutcome: "Help users recognise when HDBaseT is the correct simple transport layer rather than over-specifying AVoIP.",
    assumptions: {
      roomSize: "Standard teaching room with front-of-room display or projector.",
      audience: "Teacher/presenter plus learners.",
      sources: "Lectern PC, laptop input, visualiser and optional wireless presentation.",
      displays: "Single front display or projector is assumed.",
      equipmentLocation: "Lectern or teaching wall contains switching/input equipment. Receiver is local to projector/display.",
      uc: "UC is optional. If camera/microphone capture is required, validate USB separately.",
      audio: "Programme audio may feed display, amplifier or classroom speakers.",
      control: "Simple wall/lectern control is common.",
      network: "LAN may be needed for control, monitoring or wireless presentation, not necessarily AV transport.",
      installation: "CAT cable path from lectern to display/projector is assumed.",
      unsuitableWhen: "Do not use for multi-room routed AV, many displays, mixed independent outputs or campus-wide distribution."
    },
    advice: {
      useWhen: [
        "There is one main teaching position.",
        "The display/projector is a fixed front-of-room output.",
        "A reliable point-to-point link is preferred.",
        "The customer wants a familiar classroom design."
      ],
      avoidWhen: [
        "Sources and displays are spread around the building.",
        "Multiple displays need independent routing.",
        "The room needs future expansion across an AV network.",
        "USB capture is the main design requirement and has not been validated."
      ],
      questions: [
        "Is there one front display/projector or several outputs?",
        "Where is the lectern or teacher input position?",
        "Is there an existing CAT cable route?",
        "Is USB camera capture required?",
        "Is audio through display, amplifier or classroom speakers?"
      ],
      upgradePath: [
        "Add presentation switching when more fixed sources are needed.",
        "Add audio DSP/amplification for better classroom coverage.",
        "Move to NetworkHD where the room becomes part of a larger routed estate."
      ],
      objection: "The customer may ask why this is not AVoIP. The answer is that a simple front-of-room classroom often needs reliability and clarity more than routing flexibility.",
      salesAngle: "Position HDBaseT as the clean, dependable classroom transport option when the room has one clear source position and one main display path."
    },
    validation: [
      "Confirm source count at lectern.",
      "Confirm projector/display input type.",
      "Confirm CAT cable route and distance.",
      "Confirm audio output method.",
      "Confirm USB/camera requirement before assuming conferencing support."
    ],
    locations: [
      {
        id: "lectern",
        label: "Lectern / teacher position",
        type: "left",
        description: "Main classroom source position.",
        x: 60,
        y: 120,
        w: 260,
        h: 300,
        devices: [
          { id: "lectern-pc", label: "Lectern PC", role: "Fixed source", category: "source" },
          { id: "laptop", label: "Teacher laptop", role: "Guest source", category: "source" },
          { id: "switcher", label: "Presentation switcher", role: "Source selection", category: "av", wyrestorm: true },
          { id: "hdbaset-tx", label: "HDBaseT transmitter", role: "Transport TX", category: "av", wyrestorm: true }
        ]
      },
      {
        id: "display",
        label: "Front display / projector",
        type: "right",
        description: "Main teaching output.",
        x: 820,
        y: 130,
        w: 280,
        h: 260,
        devices: [
          { id: "hdbaset-rx", label: "HDBaseT receiver", role: "Transport RX", category: "av", wyrestorm: true },
          { id: "projector", label: "Projector / display", role: "Main output", category: "display" }
        ]
      },
      {
        id: "audio",
        label: "Classroom audio",
        type: "bottom",
        description: "Programme audio path.",
        x: 380,
        y: 470,
        w: 410,
        h: 130,
        devices: [
          { id: "amp", label: "Amplifier / display audio", role: "Audio output method", category: "audio" },
          { id: "speakers", label: "Classroom speakers", role: "Playback", category: "audio" }
        ]
      },
      {
        id: "control",
        label: "Control",
        type: "top",
        description: "User operation.",
        x: 410,
        y: 80,
        w: 340,
        h: 130,
        devices: [
          { id: "control-panel", label: "Wall / lectern control", role: "Source and display control", category: "control" }
        ]
      }
    ],
    connections: [
      { id: "c1", from: "lectern-pc", to: "switcher", type: "HDMI", label: "HDMI" },
      { id: "c2", from: "laptop", to: "switcher", type: "HDMI", label: "HDMI / USB-C" },
      { id: "c3", from: "switcher", to: "hdbaset-tx", type: "HDMI", label: "HDMI" },
      { id: "c4", from: "hdbaset-tx", to: "hdbaset-rx", type: "LAN / AVoIP", label: "CAT / HDBaseT" },
      { id: "c5", from: "hdbaset-rx", to: "projector", type: "HDMI", label: "HDMI" },
      { id: "c6", from: "switcher", to: "amp", type: "Audio", label: "Audio de-embed" },
      { id: "c7", from: "amp", to: "speakers", type: "Audio", label: "Speaker cable" },
      { id: "c8", from: "control-panel", to: "switcher", type: "Control", label: "Control" }
    ]
  },
  {
    id: "hospitality-sports-bar-networkhd500-multi-zone",
    name: "Hospitality Sports Bar - NetworkHD 500 Multi-Zone",
    vertical: "Hospitality",
    roomType: "Sports bar / multi-zone venue",
    technology: "NetworkHD 500",
    status: "Advisory ready",
    typicalCapacity: "Venue dependent",
    applicationLine: "Multi-zone venue where several sources need to route to many displays across bar areas.",
    realWorldApplication: "A sports bar or hospitality venue where Sky boxes, signage players, music/video sources and event feeds need flexible routing to multiple display zones.",
    primaryOutcome: "Make clear that this is a routed venue design, not just a simple splitter or matrix.",
    assumptions: {
      roomSize: "Multiple bar, seating or function areas.",
      audience: "Customers, staff and event managers.",
      sources: "Sports receivers, signage players, media players, local event input and optional multiview feed.",
      displays: "Multiple displays across zones, potentially with different viewing requirements.",
      equipmentLocation: "Sources and encoders usually sit in a rack. Decoders sit behind displays. Network switch is central.",
      uc: "UC is normally not relevant unless the venue has private function rooms.",
      audio: "Audio zone strategy must be separately validated. Video routing does not automatically solve audio distribution.",
      control: "Staff-friendly control is important. Source-to-screen operation should be simple.",
      network: "A managed AV network/VLAN and correct multicast support are assumed.",
      installation: "Display locations, cable containment and power points must be confirmed.",
      unsuitableWhen: "Do not use for a single-zone bar with only one or two displays unless future expansion is a real requirement."
    },
    advice: {
      useWhen: [
        "There are many displays or zones.",
        "Different areas need different sources.",
        "The venue expects future display expansion.",
        "A central rack and managed AV network are realistic."
      ],
      avoidWhen: [
        "The venue only needs one source mirrored to all screens.",
        "The network cannot be managed for AV.",
        "Audio zoning is undefined.",
        "The budget expectation is for a very small fixed matrix."
      ],
      questions: [
        "How many display zones are there?",
        "How many unique source feeds are needed at the same time?",
        "Are any displays required to show multiview?",
        "How is audio handled per zone?",
        "Who controls the system during service?"
      ],
      upgradePath: [
        "Add NHD-0401-MV or suitable multiview where multiple games need to be shown on one screen.",
        "Add a control layer for staff presets.",
        "Move to larger AVoIP design as more displays or zones are added."
      ],
      objection: "The customer may compare it to HDMI splitters. The answer is zone flexibility, future expansion and simpler source-to-display management.",
      salesAngle: "Position NetworkHD as the flexible AV layer for venues where every display should not be locked to the same source."
    },
    validation: [
      "Confirm source rights and number of simultaneous channels.",
      "Confirm display count and physical zones.",
      "Confirm whether any video wall or multiview is needed.",
      "Confirm audio zone requirements.",
      "Confirm staff control method.",
      "Confirm network switch specification."
    ],
    locations: [
      {
        id: "rack",
        label: "Central rack",
        type: "core",
        description: "Central source and AV network position.",
        x: 440,
        y: 120,
        w: 310,
        h: 320,
        devices: [
          { id: "sports1", label: "Sports receiver 1", role: "Live TV source", category: "source" },
          { id: "sports2", label: "Sports receiver 2", role: "Live TV source", category: "source" },
          { id: "signage", label: "Signage player", role: "Menu/signage source", category: "source" },
          { id: "encoders", label: "NHD-500 encoders", role: "AVoIP source layer", category: "av", wyrestorm: true },
          { id: "switch", label: "Managed AV switch", role: "AV multicast network", category: "network" }
        ]
      },
      {
        id: "zones",
        label: "Display zones",
        type: "right",
        description: "Venue display areas.",
        x: 860,
        y: 100,
        w: 270,
        h: 360,
        devices: [
          { id: "bar-displays", label: "Bar displays", role: "Main screen group", category: "display" },
          { id: "booth-displays", label: "Booth displays", role: "Secondary zone", category: "display" },
          { id: "function-display", label: "Function display", role: "Private event zone", category: "display" },
          { id: "decoders", label: "NHD-500 decoders", role: "Display endpoints", category: "av", wyrestorm: true }
        ]
      },
      {
        id: "local",
        label: "Local input",
        type: "left",
        description: "Occasional venue source.",
        x: 70,
        y: 150,
        w: 250,
        h: 210,
        devices: [
          { id: "dj", label: "DJ / event laptop", role: "Local event source", category: "source" },
          { id: "wallplate", label: "Local input plate", role: "Occasional input", category: "input" }
        ]
      },
      {
        id: "audio",
        label: "Audio zones",
        type: "bottom",
        description: "Audio distribution to validate.",
        x: 350,
        y: 500,
        w: 540,
        h: 130,
        devices: [
          { id: "audio-matrix", label: "Audio matrix / DSP", role: "Zone audio routing", category: "audio" },
          { id: "zone-amps", label: "Zone amplifiers", role: "Speaker zones", category: "audio" }
        ]
      }
    ],
    connections: [
      { id: "c1", from: "sports1", to: "encoders", type: "HDMI", label: "HDMI" },
      { id: "c2", from: "sports2", to: "encoders", type: "HDMI", label: "HDMI" },
      { id: "c3", from: "signage", to: "encoders", type: "HDMI", label: "HDMI" },
      { id: "c4", from: "wallplate", to: "encoders", type: "HDMI", label: "HDMI" },
      { id: "c5", from: "encoders", to: "switch", type: "LAN / AVoIP", label: "AVoIP LAN" },
      { id: "c6", from: "switch", to: "decoders", type: "LAN / AVoIP", label: "AVoIP LAN" },
      { id: "c7", from: "decoders", to: "bar-displays", type: "HDMI", label: "HDMI" },
      { id: "c8", from: "decoders", to: "booth-displays", type: "HDMI", label: "HDMI" },
      { id: "c9", from: "encoders", to: "audio-matrix", type: "Audio", label: "Audio feed", validationRequired: true },
      { id: "c10", from: "audio-matrix", to: "zone-amps", type: "Audio", label: "Zone audio" }
    ]
  },
  {
    id: "local-pub-8x8-matrix-tv-distribution",
    name: "Local Pub - 8x8 Matrix TV Distribution",
    vertical: "Hospitality",
    roomType: "Small pub / local bar",
    technology: "Local HDMI matrix",
    status: "Advisory ready",
    typicalCapacity: "Small venue",
    applicationLine: "Small venue with a fixed number of displays and sources where a local matrix is clearer than AVoIP.",
    realWorldApplication: "A smaller pub or bar with several TVs and a small number of rack-based sources where an 8x8 matrix gives practical source selection without the overhead of AVoIP.",
    primaryOutcome: "Help the salesperson avoid overcomplicating smaller venue opportunities while still checking real-world installation details.",
    assumptions: {
      roomSize: "Small venue with displays within practical extender reach.",
      audience: "Pub staff and customers.",
      sources: "Sports receivers, media player and occasional local input.",
      displays: "Up to eight displays or zones are assumed.",
      equipmentLocation: "Sources and matrix sit in a rack or office/AV cupboard. Extenders may feed remote displays.",
      uc: "Not normally applicable.",
      audio: "Audio may be local display audio or separate zone audio. Must be checked.",
      control: "Staff needs simple source-to-screen selection.",
      network: "Network is not the main AV transport unless control or monitoring is required.",
      installation: "Cable routes from matrix to displays must be practical.",
      unsuitableWhen: "Do not use when display count will grow significantly, cable routes are impractical, or many zones need independent expansion."
    },
    advice: {
      useWhen: [
        "There are eight or fewer main outputs.",
        "Sources are mostly centralised.",
        "The customer wants a straightforward TV distribution system.",
        "Cable routes to displays are known and practical."
      ],
      avoidWhen: [
        "The venue needs many future displays.",
        "Sources are spread across the building.",
        "Cable routes are unknown or too long for the selected transport.",
        "The customer needs flexible multi-room routing."
      ],
      questions: [
        "How many TVs are required now and later?",
        "Where are Sky/media sources physically located?",
        "Are displays mirrored or independently switched?",
        "Will audio follow the display or use separate zones?",
        "Are extender distances known?"
      ],
      upgradePath: [
        "Move to AVoIP when outputs exceed practical matrix size.",
        "Add multiview where multiple games need to be shown on one display.",
        "Add a staff-friendly control interface if operation is a risk."
      ],
      objection: "The customer may ask why not use splitters. The answer is independent source selection and a cleaner installed system.",
      salesAngle: "Position the matrix as the sensible fixed-size option where the venue needs practical source control but not a full AV network."
    },
    validation: [
      "Confirm number of displays and future expansion expectation.",
      "Confirm source count.",
      "Confirm whether all screens need independent switching.",
      "Confirm cable distances.",
      "Confirm audio routing method."
    ],
    locations: [
      {
        id: "rack",
        label: "Rack / office",
        type: "core",
        description: "Central source and matrix position.",
        x: 410,
        y: 120,
        w: 330,
        h: 300,
        devices: [
          { id: "sky1", label: "Sports receiver 1", role: "TV source", category: "source" },
          { id: "sky2", label: "Sports receiver 2", role: "TV source", category: "source" },
          { id: "player", label: "Media player", role: "Signage/source", category: "source" },
          { id: "matrix", label: "8x8 HDMI matrix", role: "Source-to-display routing", category: "av", wyrestorm: true }
        ]
      },
      {
        id: "displays",
        label: "TV positions",
        type: "right",
        description: "Pub display locations.",
        x: 860,
        y: 120,
        w: 270,
        h: 300,
        devices: [
          { id: "tv1", label: "Bar TV group", role: "Primary screens", category: "display" },
          { id: "tv2", label: "Seating TV group", role: "Secondary screens", category: "display" },
          { id: "tv3", label: "Function room TV", role: "Optional output", category: "display" }
        ]
      },
      {
        id: "local",
        label: "Local input",
        type: "left",
        description: "Occasional event source.",
        x: 70,
        y: 150,
        w: 240,
        h: 180,
        devices: [
          { id: "event-input", label: "Local HDMI input", role: "Occasional source", category: "input" }
        ]
      },
      {
        id: "audio",
        label: "Audio",
        type: "bottom",
        description: "Pub audio to validate.",
        x: 390,
        y: 490,
        w: 430,
        h: 120,
        devices: [
          { id: "audio", label: "Display or zone audio", role: "Validate separately", category: "audio" }
        ]
      }
    ],
    connections: [
      { id: "c1", from: "sky1", to: "matrix", type: "HDMI", label: "HDMI" },
      { id: "c2", from: "sky2", to: "matrix", type: "HDMI", label: "HDMI" },
      { id: "c3", from: "player", to: "matrix", type: "HDMI", label: "HDMI" },
      { id: "c4", from: "event-input", to: "matrix", type: "HDMI", label: "HDMI extender/input" },
      { id: "c5", from: "matrix", to: "tv1", type: "HDMI", label: "HDMI / extender" },
      { id: "c6", from: "matrix", to: "tv2", type: "HDMI", label: "HDMI / extender" },
      { id: "c7", from: "matrix", to: "tv3", type: "HDMI", label: "HDMI / extender" },
      { id: "c8", from: "matrix", to: "audio", type: "Audio", label: "Audio check", validationRequired: true }
    ]
  }
];

const steps: Array<{ id: TemplateStep; label: string; helper: string }> = [
  { id: "recognise", label: "Recognise the room", helper: "Check whether the template represents the real room." },
  { id: "assumptions", label: "Review assumptions", helper: "Confirm what the design is assuming before using it." },
  { id: "schematic", label: "View schematic", helper: "See physical locations, devices and signal paths." },
  { id: "validate", label: "Validate requirements", helper: "Identify what must be checked before proposal handoff." },
  { id: "handoff", label: "Save / export", helper: "Capture next actions and hand off the design." }
];


function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/networkhd\s+/g, "networkhd")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function getRouteTemplateId() {
  if (typeof window === "undefined") return "";

  const marker = "/wingman/templates/";
  const pathName = window.location.pathname;

  if (!pathName.startsWith(marker)) return "";

  return decodeURIComponent(pathName.slice(marker.length)).replace(/\/+$/g, "");
}

function getTemplateHref(template: AdvisoryTemplate) {
  return "/wingman/templates/" + template.id;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function truncate(value: string, max = 28) {
  if (value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd() + "…";
}

function splitLabel(value: string, max = 24) {
  const words = value.split(/\s+/g);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? current + " " + word : word;

    if (next.length <= max) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);

  return lines.slice(0, 3);
}

function buildDevicePositions(template: AdvisoryTemplate) {
  const positions = new Map<string, { x: number; y: number; w: number; h: number; location: DiagramLocation; device: DiagramDevice }>();

  for (const location of template.locations) {
    const topPad = 58;
    const rowHeight = 44;
    const gap = 8;
    const deviceHeight = 34;
    const deviceWidth = Math.max(120, location.w - 30);

    location.devices.forEach((device, index) => {
      const x = location.x + 15;
      const y = location.y + topPad + index * (rowHeight + gap);

      positions.set(device.id, {
        x,
        y,
        w: deviceWidth,
        h: deviceHeight,
        location,
        device
      });
    });
  }

  return positions;
}

function connectionClass(type: SignalType) {
  if (type === "HDMI") return "wm-diagram-line wm-line-hdmi";
  if (type === "USB") return "wm-diagram-line wm-line-usb";
  if (type === "LAN / AVoIP") return "wm-diagram-line wm-line-lan";
  if (type === "Audio") return "wm-diagram-line wm-line-audio";
  if (type === "Dante") return "wm-diagram-line wm-line-audio";
  if (type === "Control") return "wm-diagram-line wm-line-control";
  return "wm-diagram-line";
}

function pointForConnection(
  box: { x: number; y: number; w: number; h: number },
  side: "left" | "right" | "top" | "bottom"
) {
  if (side === "left") return { x: box.x, y: box.y + box.h / 2 };
  if (side === "right") return { x: box.x + box.w, y: box.y + box.h / 2 };
  if (side === "top") return { x: box.x + box.w / 2, y: box.y };
  return { x: box.x + box.w / 2, y: box.y + box.h };
}

function chooseSides(fromBox: { x: number; y: number; w: number; h: number }, toBox: { x: number; y: number; w: number; h: number }) {
  const fromCx = fromBox.x + fromBox.w / 2;
  const toCx = toBox.x + toBox.w / 2;
  const fromCy = fromBox.y + fromBox.h / 2;
  const toCy = toBox.y + toBox.h / 2;

  const horizontal = Math.abs(toCx - fromCx) >= Math.abs(toCy - fromCy);

  if (horizontal && toCx >= fromCx) {
    return { fromSide: "right" as const, toSide: "left" as const };
  }

  if (horizontal && toCx < fromCx) {
    return { fromSide: "left" as const, toSide: "right" as const };
  }

  if (toCy >= fromCy) {
    return { fromSide: "bottom" as const, toSide: "top" as const };
  }

  return { fromSide: "top" as const, toSide: "bottom" as const };
}

function VisioRoomSchematic({ template }: { template: AdvisoryTemplate }) {
  const positions = useMemo(() => buildDevicePositions(template), [template]);

  return (
    <section className="wm-template-advisor-card wm-template-schematic-panel">
      <div className="wm-template-section-head">
        <div>
          <span>Visio-style room schematic</span>
          <h2>Physical locations, devices and signal paths</h2>
        </div>
        <p>Sources are left, outputs are right, core connectivity is central and audio/UC is separated at the bottom.</p>
      </div>

      <div className="wm-visio-shell" aria-label="Room schematic diagram">
        <svg viewBox="0 0 1200 680" role="img" aria-label={template.name + " schematic"}>
          <defs>
            <marker id="wmArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 8 4 L 0 8 z" className="wm-diagram-arrow" />
            </marker>
          </defs>

          <rect x="16" y="16" width="1168" height="648" rx="22" className="wm-diagram-bg" />

          {template.locations.map((location) => (
            <g key={location.id}>
              <rect x={location.x} y={location.y} width={location.w} height={location.h} rx="18" className="wm-diagram-location" />
              <text x={location.x + 16} y={location.y + 26} className="wm-diagram-location-title">
                {location.label}
              </text>
              <text x={location.x + 16} y={location.y + 45} className="wm-diagram-location-subtitle">
                {truncate(location.description, 42)}
              </text>

              {location.devices.map((device) => {
                const box = positions.get(device.id);
                if (!box) return null;

                const labelLines = splitLabel(device.label, 22);

                return (
                  <g key={device.id}>
                    <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="10" className={classNames("wm-diagram-device", device.wyrestorm && "is-wyrestorm")} />
                    {labelLines.map((line, index) => (
                      <text key={line + index} x={box.x + 10} y={box.y + 14 + index * 11} className="wm-diagram-device-label">
                        {line}
                      </text>
                    ))}
                    {device.sku ? (
                      <text x={box.x + box.w - 10} y={box.y + box.h - 8} textAnchor="end" className="wm-diagram-sku">
                        {device.sku}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          ))}

          {template.connections.map((connection) => {
            const fromBox = positions.get(connection.from);
            const toBox = positions.get(connection.to);

            if (!fromBox || !toBox) return null;

            const { fromSide, toSide } = chooseSides(fromBox, toBox);
            const start = pointForConnection(fromBox, fromSide);
            const end = pointForConnection(toBox, toSide);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            return (
              <g key={connection.id}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  className={classNames(connectionClass(connection.type), connection.validationRequired && "needs-validation")}
                  markerEnd="url(#wmArrow)"
                />
                <rect x={midX - 54} y={midY - 13} width="108" height="22" rx="11" className="wm-diagram-line-label-bg" />
                <text x={midX} y={midY + 4} textAnchor="middle" className="wm-diagram-line-label">
                  {truncate(connection.label, 18)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="wm-template-signal-legend">
        {["HDMI", "USB", "LAN / AVoIP", "Audio", "Control"].map((type) => (
          <span key={type}>
            <i className={connectionClass(type as SignalType)} />
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="wm-advisor-bullet-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function AssumptionGrid({ template }: { template: AdvisoryTemplate }) {
  const entries = [
    ["Typical room size", template.assumptions.roomSize],
    ["Audience", template.assumptions.audience],
    ["Sources", template.assumptions.sources],
    ["Displays / outputs", template.assumptions.displays],
    ["Equipment location", template.assumptions.equipmentLocation],
    ["USB / UC", template.assumptions.uc],
    ["Audio", template.assumptions.audio],
    ["Control", template.assumptions.control],
    ["Network", template.assumptions.network],
    ["Installation", template.assumptions.installation],
    ["Unsuitable when", template.assumptions.unsuitableWhen]
  ];

  return (
    <section className="wm-template-advisor-card">
      <div className="wm-template-section-head">
        <div>
          <span>Room assumptions</span>
          <h2>Check these before using the template</h2>
        </div>
        <p>These assumptions make the design recognisable and stop the template being used in the wrong real-world scenario.</p>
      </div>

      <div className="wm-assumption-grid">
        {entries.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <p>{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecognitionPanel({ template }: { template: AdvisoryTemplate }) {
  return (
    <section className="wm-template-advisor-card">
      <div className="wm-template-section-head">
        <div>
          <span>Real-world application</span>
          <h2>{template.roomType}</h2>
        </div>
        <strong>{template.technology}</strong>
      </div>

      <div className="wm-template-recognition-grid">
        <article>
          <span>What this room represents</span>
          <p>{template.realWorldApplication}</p>
        </article>
        <article>
          <span>Primary outcome</span>
          <p>{template.primaryOutcome}</p>
        </article>
        <article>
          <span>Typical capacity</span>
          <p>{template.typicalCapacity}</p>
        </article>
        <article>
          <span>Sales angle</span>
          <p>{template.advice.salesAngle}</p>
        </article>
      </div>

      <div className="wm-advisor-columns">
        <article>
          <h3>Use this template when</h3>
          <BulletList items={template.advice.useWhen} />
        </article>
        <article>
          <h3>Do not use this template when</h3>
          <BulletList items={template.advice.avoidWhen} />
        </article>
      </div>
    </section>
  );
}

function ValidationPanel({ template }: { template: AdvisoryTemplate }) {
  return (
    <section className="wm-template-advisor-card">
      <div className="wm-template-section-head">
        <div>
          <span>Validate before using</span>
          <h2>Information still needed before proposal handoff</h2>
        </div>
        <p>These checks should be asked in discovery before the template is treated as a reliable design recommendation.</p>
      </div>

      <div className="wm-advisor-columns">
        <article>
          <h3>Questions to ask</h3>
          <BulletList items={template.advice.questions} />
        </article>
        <article>
          <h3>Required validation checks</h3>
          <BulletList items={template.validation} />
        </article>
      </div>

      <div className="wm-advisor-columns">
        <article>
          <h3>Likely upgrade path</h3>
          <BulletList items={template.advice.upgradePath} />
        </article>
        <article>
          <h3>Common customer objection</h3>
          <p>{template.advice.objection}</p>
        </article>
      </div>
    </section>
  );
}

function HandoffPanel({ template }: { template: AdvisoryTemplate }) {
  function saveProject() {
    const payload = {
      templateId: template.id,
      templateName: template.name,
      savedAt: new Date().toISOString(),
      assumptions: template.assumptions,
      validation: template.validation
    };

    window.localStorage.setItem("wingman-room-template-last-project", JSON.stringify(payload, null, 2));
    window.alert("Template advisory snapshot saved locally.");
  }

  function exportBom() {
    const rows = template.locations.flatMap((location) =>
      location.devices
        .filter((device) => device.wyrestorm || device.sku)
        .map((device) => ({
          location: location.label,
          sku: device.sku || "TBC",
          item: device.label,
          role: device.role,
          validationRequired: !device.sku
        }))
    );

    const payload = {
      template: template.name,
      note: "Advisory BOM extract. Validate final product selection before customer-facing use.",
      rows
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = template.id + "-advisory-bom.json";
    anchor.click();

    window.URL.revokeObjectURL(url);
  }

  return (
    <section className="wm-template-advisor-card">
      <div className="wm-template-section-head">
        <div>
          <span>Save / export</span>
          <h2>Handoff actions</h2>
        </div>
        <p>Use this only after the room assumptions and validation checks have been reviewed.</p>
      </div>

      <div className="wm-template-handoff-grid">
        <button type="button" onClick={saveProject}>Save advisory snapshot</button>
        <button type="button" onClick={exportBom}>Export advisory BOM</button>
        <a href="/wingman/response-pack">Open response pack</a>
        <a href="/wingman/projects">Open projects</a>
      </div>

      <div className="wm-template-warning-box">
        <strong>Important:</strong>
        <p>This is a guided starting point, not a finished design. Confirm the physical room, cable routes, USB topology, audio design, control method and network readiness before using this in customer-facing material.</p>
      </div>
    </section>
  );
}

function TemplateLibrary() {
  const [query, setQuery] = useState("");
  const [vertical, setVertical] = useState("All");

  const verticals = useMemo(() => ["All", ...Array.from(new Set(templates.map((template) => template.vertical)))], []);

  const filtered = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesVertical = vertical === "All" || template.vertical === vertical;
      const haystack = [
        template.name,
        template.vertical,
        template.roomType,
        template.technology,
        template.applicationLine,
        template.realWorldApplication
      ].join(" ").toLowerCase();

      const matchesQuery = !normalisedQuery || haystack.includes(normalisedQuery);

      return matchesVertical && matchesQuery;
    });
  }, [query, vertical]);

  return (
    <main data-wingman-room-templates-page="true" className="wm-room-advisor-page wm-room-template-library-page">
      <section className="wm-room-advisor-hero">
        <div>
          <span>Room design advisor</span>
          <h1>Choose a recognisable room application.</h1>
          <p>Select a template only when the real-world assumptions match the customer conversation.</p>
        </div>
      </section>

      <section className="wm-room-template-controls" aria-label="Room template filters">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search room, source type, vertical or technology..."
          aria-label="Search room templates"
        />

        <div className="wm-room-template-filter-row">
          {verticals.map((item) => (
            <button
              type="button"
              key={item}
              className={classNames(item === vertical && "is-selected")}
              onClick={() => setVertical(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="wm-room-template-library-grid" aria-label="Room templates">
        {filtered.map((template) => (
          <a key={template.id} href={getTemplateHref(template)} className="wm-room-template-advice-card">
            <div>
              <span>{template.vertical}</span>
              <strong>{template.name}</strong>
              <p>{template.applicationLine}</p>
            </div>

            <dl>
              <div>
                <dt>Technology</dt>
                <dd>{template.technology}</dd>
              </div>
              <div>
                <dt>Room type</dt>
                <dd>{template.roomType}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{template.status}</dd>
              </div>
            </dl>
          </a>
        ))}
      </section>

      {filtered.length === 0 ? (
        <section className="wm-template-advisor-card">
          <h2>No matching room templates</h2>
          <p>Adjust the search or filter. A blank discovery flow should live in Discovery, not in the template library.</p>
        </section>
      ) : null}
    </main>
  );
}

function TemplateDetail({ template }: { template: AdvisoryTemplate }) {
  const [activeStep, setActiveStep] = useState<TemplateStep>("recognise");

  return (
    <main data-wingman-room-templates-page="true" data-wingman-template-detail-page="true" className="wm-room-advisor-page wm-room-template-detail-page">
      <section className="wm-room-advisor-detail-hero">
        <div>
          <span>Room template review</span>
          <h1>{template.name}</h1>
          <p>{template.applicationLine}</p>
        </div>

        <nav aria-label="Template actions">
          <a href="/wingman/templates">Back to templates</a>
          <a href="/wingman/response-pack">Open response pack</a>
        </nav>
      </section>

      <section className="wm-room-template-stepper" aria-label="Room template workflow">
        {steps.map((step) => (
          <button
            type="button"
            key={step.id}
            className={classNames(activeStep === step.id && "is-selected")}
            onClick={() => setActiveStep(step.id)}
          >
            <strong>{step.label}</strong>
            <span>{step.helper}</span>
          </button>
        ))}
      </section>

      {activeStep === "recognise" ? <RecognitionPanel template={template} /> : null}
      {activeStep === "assumptions" ? <AssumptionGrid template={template} /> : null}
      {activeStep === "schematic" ? <VisioRoomSchematic template={template} /> : null}
      {activeStep === "validate" ? <ValidationPanel template={template} /> : null}
      {activeStep === "handoff" ? <HandoffPanel template={template} /> : null}
    </main>
  );
}

export function RoomTemplatesPage() {
  const routeTemplateId = getRouteTemplateId();

  const selectedTemplate = templates.find((template) => template.id === routeTemplateId || toSlug(template.name) === routeTemplateId);

  if (routeTemplateId && selectedTemplate) {
    return <TemplateDetail template={selectedTemplate} />;
  }

  if (routeTemplateId && !selectedTemplate) {
    return (
      <main data-wingman-room-templates-page="true" className="wm-room-advisor-page">
        <section className="wm-template-advisor-card">
          <span>Room template not found</span>
          <h1>That template is not available in the advisory library.</h1>
          <p>Select one of the advisory-ready templates from the library.</p>
          <a className="wm-room-template-return-link" href="/wingman/templates">Back to templates</a>
        </section>
      </main>
    );
  }

  return <TemplateLibrary />;
}

export const TemplatesPage = RoomTemplatesPage;
export default RoomTemplatesPage;

