import type { RoomProfileId, WalkthroughFlow } from "./types";

const commonQuestions = {
  displayCount: {
    id: "display-count",
    label: "How many displays or screens do you expect in the space?",
    groupId: "display" as const,
    suggestedAnswers: [
      { label: "One display", value: "one display" },
      { label: "Two displays", value: "two displays" },
      { label: "Projector", value: "projector" },
      { label: "Video wall", value: "video wall" },
      { label: "Not sure yet", value: "not sure yet" }
    ]
  },
  displayBehaviour: {
    id: "display-behaviour",
    label: "If there is more than one display, do they need to show the same content, different content, or either?",
    groupId: "display" as const,
    suggestedAnswers: [
      { label: "Same content", value: "same content" },
      { label: "Different content", value: "different content" },
      { label: "Either", value: "same or different content" }
    ],
    visibilityRules: [
      {
        dependsOnQuestionId: "display-count",
        includesAny: ["two displays", "video wall"]
      }
    ]
  },
  sources: {
    id: "sources-main",
    label: "What will users connect from most often?",
    groupId: "sources" as const,
    suggestedAnswers: [
      { label: "Laptop", value: "laptop" },
      { label: "In-room PC", value: "in-room pc" },
      { label: "Wireless sharing", value: "wireless sharing" },
      { label: "Camera source", value: "camera source" },
      { label: "TV source", value: "tv source" }
    ]
  },
  connectionMethods: {
    id: "connection-methods",
    label: "How will users usually connect?",
    groupId: "sources" as const,
    suggestedAnswers: [
      { label: "HDMI", value: "hdmi" },
      { label: "USB-C", value: "usb-c" },
      { label: "Wireless", value: "wireless" },
      { label: "Mix of wired and wireless", value: "hdmi usb-c and wireless" }
    ]
  },
  simultaneousSources: {
    id: "simultaneous-sources",
    label: "Do you need to show more than one source at the same time?",
    groupId: "sources" as const,
    suggestedAnswers: [
      { label: "No", value: "single source only" },
      { label: "Yes, occasionally", value: "occasionally two sources at once" },
      { label: "Yes, definitely", value: "two sources at once required" }
    ]
  },
  conferencingNeed: {
    id: "conferencing-need",
    label: "Does the space need to support video meetings?",
    groupId: "conferencing" as const,
    suggestedAnswers: [
      { label: "Teams", value: "microsoft teams" },
      { label: "Zoom", value: "zoom" },
      { label: "BYOM", value: "bring your own meeting byom" },
      { label: "No video meetings", value: "no video meetings" },
      { label: "Not sure", value: "video conferencing not yet confirmed" }
    ]
  },
  roomPeripherals: {
    id: "room-peripherals",
    label: "Do users need the room camera, microphones, and audio to work with their own laptop?",
    groupId: "conferencing" as const,
    suggestedAnswers: [
      { label: "Yes", value: "room camera microphones and audio must work with user laptops" },
      { label: "No", value: "room peripherals do not need to connect to user laptops" },
      { label: "Maybe", value: "possible byom requirement" }
    ],
    visibilityRules: [
      {
        dependsOnQuestionId: "conferencing-need",
        includesAny: ["teams", "zoom", "byom", "video conferencing"]
      }
    ]
  },
  audioNeed: {
    id: "audio-need",
    label: "What level of room audio is needed?",
    groupId: "audio" as const,
    suggestedAnswers: [
      { label: "Basic display audio", value: "basic room audio" },
      { label: "Clear speech reinforcement", value: "speech reinforcement required" },
      { label: "Microphones for participants", value: "microphones required" },
      { label: "Background music", value: "background music required" }
    ]
  },
  captureNeed: {
    id: "capture-need",
    label: "Does anything need to be recorded, streamed, or viewed in another space?",
    groupId: "capture" as const,
    suggestedAnswers: [
      { label: "No", value: "no recording or streaming" },
      { label: "Recording", value: "recording required" },
      { label: "Streaming", value: "streaming required" },
      { label: "Overflow / remote viewing", value: "overflow viewing required" },
      { label: "Lecture capture", value: "lecture capture required" }
    ]
  },
  controlNeed: {
    id: "control-need",
    label: "How simple does the room need to be for users?",
    groupId: "control" as const,
    suggestedAnswers: [
      { label: "Very simple", value: "very easy to use for non-technical users" },
      { label: "Touch panel would help", value: "touch panel control required" },
      { label: "Standard AV user level", value: "standard av usability" }
    ]
  },
  installLocation: {
    id: "install-location",
    label: "Where will the equipment most likely live?",
    groupId: "installation" as const,
    suggestedAnswers: [
      { label: "In the room", value: "equipment in room" },
      { label: "Under table / behind display", value: "equipment local to room" },
      { label: "Rack / comms room", value: "equipment in rack or comms room" },
      { label: "Not sure", value: "equipment location not confirmed" }
    ]
  },
  distance: {
    id: "install-distance",
    label: "Roughly how far is it from the user connection point to the display or rack?",
    groupId: "installation" as const,
    suggestedAnswers: [
      { label: "Less than 5m", value: "less than 5m" },
      { label: "5m to 15m", value: "10m" },
      { label: "15m to 30m", value: "20m" },
      { label: "30m+", value: "40m" }
    ]
  },
  networkUse: {
    id: "network-use",
    label: "Is there already a network infrastructure you want to make use of?",
    groupId: "installation" as const,
    suggestedAnswers: [
      { label: "Yes", value: "structured network available" },
      { label: "No", value: "no network infrastructure requirement" },
      { label: "Possibly", value: "network use under consideration" }
    ]
  },
  divisibleRoom: {
    id: "divisible-room",
    label: "Can the room be divided or combined?",
    groupId: "control" as const,
    suggestedAnswers: [
      { label: "No", value: "single room only" },
      { label: "Yes, divided sometimes", value: "divisible room with combined and divided modes" }
    ]
  },
  signageContent: {
    id: "signage-content",
    label: "What is the content mainly for?",
    groupId: "content-management" as const,
    suggestedAnswers: [
      { label: "Branding", value: "branding content" },
      { label: "Information", value: "information display" },
      { label: "Promotions", value: "promotional content" },
      { label: "Menu boards", value: "digital menu boards" },
      { label: "Mixed content", value: "mixed signage content" }
    ]
  },
  signageManagement: {
    id: "signage-management",
    label: "How should content be managed?",
    groupId: "content-management" as const,
    suggestedAnswers: [
      { label: "Local updates only", value: "local content updates" },
      { label: "Central management", value: "central content management required" },
      { label: "Central with local override", value: "central management with local override" }
    ]
  }
};

export const walkthroughQuestionFlows: WalkthroughFlow[] = [
  {
    roomProfileId: "huddle-room",
    questions: [
      {
        id: "starter-use",
        label: "What will this room mainly be used for day to day?",
        suggestedAnswers: [
          { label: "Presentations", value: "small room presentations" },
          { label: "Video meetings", value: "video meetings" },
          { label: "Both", value: "presentations and video meetings" }
        ]
      },
      {
        id: "starter-capacity",
        label: "How many people would normally use it?",
        suggestedAnswers: [
          { label: "2 to 4", value: "4 people" },
          { label: "4 to 6", value: "6 people" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.conferencingNeed,
      commonQuestions.roomPeripherals,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance
    ]
  },
  {
    roomProfileId: "meeting-room",
    questions: [
      {
        id: "starter-use",
        label: "Is this mainly for in-room presentations, video meetings, or both?",
        suggestedAnswers: [
          { label: "Presentations", value: "presentation room" },
          { label: "Video meetings", value: "video meetings" },
          { label: "Both", value: "presentations and video meetings" }
        ]
      },
      {
        id: "starter-capacity",
        label: "How many people normally use the room?",
        suggestedAnswers: [
          { label: "4 to 6", value: "6 people" },
          { label: "6 to 10", value: "8 people" },
          { label: "10+", value: "12 people" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.displayBehaviour,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.simultaneousSources,
      commonQuestions.conferencingNeed,
      commonQuestions.roomPeripherals,
      commonQuestions.audioNeed,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "boardroom",
    questions: [
      {
        id: "starter-use",
        label: "Is this mainly for presentations, video meetings, or both?",
        suggestedAnswers: [
          { label: "Presentations", value: "formal presentations" },
          { label: "Video meetings", value: "boardroom video meetings" },
          { label: "Both", value: "presentations and boardroom video meetings" }
        ]
      },
      {
        id: "starter-capacity",
        label: "How many people normally use the room?",
        suggestedAnswers: [
          { label: "8 to 12", value: "10 people" },
          { label: "12 to 16", value: "14 people" },
          { label: "16+", value: "18 people" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.displayBehaviour,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.simultaneousSources,
      commonQuestions.conferencingNeed,
      commonQuestions.roomPeripherals,
      commonQuestions.audioNeed,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "training-room",
    questions: [
      {
        id: "starter-use",
        label: "Will this mainly be used for local training, remote training, or both?",
        suggestedAnswers: [
          { label: "Local training", value: "local training room" },
          { label: "Remote / hybrid training", value: "hybrid training room" },
          { label: "Both", value: "local and hybrid training" }
        ]
      },
      {
        id: "starter-capacity",
        label: "Roughly how many people is the room for?",
        suggestedAnswers: [
          { label: "10 to 20", value: "15 people" },
          { label: "20 to 40", value: "25 people" },
          { label: "40+", value: "50 people" }
        ]
      },
      commonQuestions.divisibleRoom,
      commonQuestions.displayCount,
      commonQuestions.displayBehaviour,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.simultaneousSources,
      commonQuestions.conferencingNeed,
      commonQuestions.audioNeed,
      commonQuestions.captureNeed,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "classroom",
    questions: [
      {
        id: "starter-use",
        label: "Will this room mainly be used for local teaching, hybrid teaching, or recorded sessions?",
        suggestedAnswers: [
          { label: "Local teaching", value: "classroom local teaching" },
          { label: "Hybrid teaching", value: "hybrid teaching" },
          { label: "Recorded sessions", value: "recorded teaching sessions" }
        ]
      },
      {
        id: "starter-capacity",
        label: "Roughly how many students is the room for?",
        suggestedAnswers: [
          { label: "20 to 30", value: "25 students" },
          { label: "30 to 50", value: "40 students" },
          { label: "50+", value: "60 students" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.simultaneousSources,
      commonQuestions.audioNeed,
      commonQuestions.captureNeed,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "lecture-theatre",
    questions: [
      {
        id: "starter-use",
        label: "Will sessions be recorded, streamed, or both?",
        suggestedAnswers: [
          { label: "Neither", value: "presentation only" },
          { label: "Recorded", value: "lecture recording required" },
          { label: "Streamed", value: "lecture streaming required" },
          { label: "Both", value: "lecture recording and streaming required" }
        ]
      },
      {
        id: "starter-capacity",
        label: "Roughly how many seats are there?",
        suggestedAnswers: [
          { label: "50 to 100", value: "80 seats" },
          { label: "100 to 200", value: "150 seats" },
          { label: "200+", value: "220 seats" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.displayBehaviour,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.simultaneousSources,
      commonQuestions.audioNeed,
      commonQuestions.captureNeed,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "collaboration-space",
    questions: [
      {
        id: "starter-use",
        label: "Will this space mainly be used for informal content sharing or structured meetings?",
        suggestedAnswers: [
          { label: "Informal sharing", value: "informal collaboration and content sharing" },
          { label: "Structured meetings", value: "structured meetings and presentations" },
          { label: "Both", value: "informal sharing and structured meetings" }
        ]
      },
      {
        id: "starter-capacity",
        label: "How many people typically gather here?",
        suggestedAnswers: [
          { label: "2 to 4", value: "4 people" },
          { label: "4 to 8", value: "6 people" },
          { label: "8+", value: "10 people" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.controlNeed,
      commonQuestions.installLocation
    ]
  },
  {
    roomProfileId: "reception-signage",
    questions: [
      {
        id: "starter-use",
        label: "Is this mainly for branding, information, live data, or promotional video?",
        suggestedAnswers: [
          { label: "Branding", value: "branding content" },
          { label: "Information", value: "information display" },
          { label: "Promotional video", value: "promotional video content" },
          { label: "Mixed", value: "mixed branding information and promotional content" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.displayBehaviour,
      commonQuestions.signageContent,
      commonQuestions.signageManagement,
      commonQuestions.installLocation,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "video-wall-control-room",
    questions: [
      {
        id: "starter-use",
        label: "Is this mainly for monitoring, switching sources, or both?",
        suggestedAnswers: [
          { label: "Monitoring", value: "monitoring environment" },
          { label: "Switching", value: "dynamic source switching" },
          { label: "Both", value: "monitoring and dynamic source switching" }
        ]
      },
      {
        id: "starter-criticality",
        label: "How critical is uptime for this space?",
        suggestedAnswers: [
          { label: "Standard", value: "standard reliability" },
          { label: "High", value: "high reliability" },
          { label: "24/7 critical", value: "24/7 critical environment" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.sources,
      commonQuestions.simultaneousSources,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "hospitality-ballroom",
    questions: [
      {
        id: "starter-divisible",
        label: "Will the space always be used as one room, or can it be divided?",
        suggestedAnswers: [
          { label: "One room only", value: "single ballroom" },
          { label: "Can be divided", value: "divisible ballroom with combined and divided modes" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.displayBehaviour,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.audioNeed,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "cafe-social-space",
    questions: [
      {
        id: "starter-use",
        label: "Is this mainly for menu boards, brand messaging, information screens, or entertainment?",
        suggestedAnswers: [
          { label: "Menu boards", value: "digital menu boards" },
          { label: "Brand messaging", value: "branding content" },
          { label: "Information", value: "information screens" },
          { label: "Entertainment", value: "entertainment screens" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.signageContent,
      commonQuestions.audioNeed,
      commonQuestions.signageManagement,
      commonQuestions.installLocation,
      commonQuestions.networkUse
    ]
  },
  {
    roomProfileId: "mixed-unknown",
    questions: [
      {
        id: "starter-use",
        label: "What do users need to do in the space most often?",
        suggestedAnswers: [
          { label: "Present", value: "presentations" },
          { label: "Hold meetings", value: "meetings" },
          { label: "Teach", value: "teaching" },
          { label: "Show signage", value: "digital signage" },
          { label: "Monitor sources", value: "monitoring" }
        ]
      },
      {
        id: "starter-capacity",
        label: "How many people typically use it?",
        suggestedAnswers: [
          { label: "1 to 4", value: "4 people" },
          { label: "5 to 10", value: "8 people" },
          { label: "10 to 30", value: "20 people" },
          { label: "30+", value: "40 people" }
        ]
      },
      commonQuestions.displayCount,
      commonQuestions.sources,
      commonQuestions.connectionMethods,
      commonQuestions.conferencingNeed,
      commonQuestions.audioNeed,
      commonQuestions.controlNeed,
      commonQuestions.installLocation,
      commonQuestions.distance,
      commonQuestions.networkUse
    ]
  }
];

export function getWalkthroughFlow(roomProfileId: RoomProfileId): WalkthroughFlow | undefined {
  return walkthroughQuestionFlows.find((flow) => flow.roomProfileId === roomProfileId);
}