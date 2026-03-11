import type { RoomProfile } from "./types";

export const roomProfiles: RoomProfile[] = [
  {
    id: "huddle-room",
    label: "Huddle Room",
    synonyms: ["small meeting room", "focus room"],
    likelyUses: ["presentation", "small meetings", "video calls"],
    defaultAssumptions: [
      "Single display likely",
      "Laptop connectivity likely",
      "Simple operation important",
      "Video conferencing may be required"
    ],
    likelySolutionCategories: [
      "Wireless Presentation",
      "UC Room Integration",
      "USB Extension / Routing"
    ],
    starterQuestions: [
      "What will this room mainly be used for day to day?",
      "How many people would normally use it?",
      "Will users mainly plug in a laptop, share wirelessly, or both?"
    ],
    followUpQuestionGroups: ["display", "sources", "conferencing", "control", "installation"]
  },
  {
    id: "meeting-room",
    label: "Meeting Room",
    synonyms: ["conference room", "small boardroom"],
    likelyUses: ["presentation", "meetings", "hybrid meetings"],
    defaultAssumptions: [
      "Single front display likely",
      "Laptop presentation likely",
      "Video conferencing often required"
    ],
    likelySolutionCategories: [
      "Wireless Presentation",
      "UC Room Integration",
      "Matrix Switching"
    ],
    starterQuestions: [
      "Is this mainly for in-room presentations, video meetings, or both?",
      "How many people normally use the room?",
      "Do users need simple walk-in-and-start operation?"
    ],
    followUpQuestionGroups: ["display", "sources", "conferencing", "audio", "control", "installation"]
  },
  {
    id: "boardroom",
    label: "Boardroom",
    synonyms: ["executive room", "main meeting room"],
    likelyUses: ["presentation", "formal meetings", "video meetings"],
    defaultAssumptions: [
      "One or two front displays likely",
      "Professional camera and microphone integration likely",
      "Touch control likely",
      "Tidy installation important"
    ],
    likelySolutionCategories: [
      "Matrix Switching",
      "UC Room Integration",
      "Control System / Touch Panel",
      "HDBaseT Extension"
    ],
    starterQuestions: [
      "Is this mainly for presentations, video meetings, or both?",
      "Do you expect one display or two at the front of the room?",
      "Will this need Teams, Zoom, or bring-your-own-laptop meetings?"
    ],
    followUpQuestionGroups: ["display", "sources", "conferencing", "audio", "control", "installation"]
  },
  {
    id: "training-room",
    label: "Training Room",
    synonyms: ["training suite", "seminar room"],
    likelyUses: ["presentation", "training", "hybrid sessions"],
    defaultAssumptions: [
      "Presenter-led use likely",
      "Multiple participants likely",
      "Simple instructor control likely"
    ],
    likelySolutionCategories: [
      "Matrix Switching",
      "Wireless Presentation",
      "UC Room Integration",
      "Audio DSP / Reinforcement"
    ],
    starterQuestions: [
      "Will this mainly be used for local training, remote training, or both?",
      "Will there be one presenter position or multiple teaching points?",
      "Could the room ever be divided or combined?"
    ],
    followUpQuestionGroups: ["display", "sources", "conferencing", "audio", "capture", "control", "installation"]
  },
  {
    id: "classroom",
    label: "Classroom",
    synonyms: ["teaching room"],
    likelyUses: ["teaching", "presentation", "hybrid learning"],
    defaultAssumptions: [
      "Lecturer presentation point likely",
      "Laptop input required",
      "Simple lecturer controls important"
    ],
    likelySolutionCategories: [
      "Matrix Switching",
      "Lecture Capture Support",
      "Audio DSP / Reinforcement",
      "Wireless Presentation"
    ],
    starterQuestions: [
      "Will this room mainly be used for local teaching, hybrid teaching, or recorded sessions?",
      "Will lecturers connect their own laptops?",
      "Do students or remote attendees need to see the lecturer as well as the content?"
    ],
    followUpQuestionGroups: ["display", "sources", "audio", "capture", "control", "installation"]
  },
  {
    id: "lecture-theatre",
    label: "Lecture Theatre",
    synonyms: ["lecture hall"],
    likelyUses: ["teaching", "lecture capture", "streaming"],
    defaultAssumptions: [
      "Larger audience capacity likely",
      "Multiple displays or projection likely",
      "Audio reinforcement required",
      "Capture and streaming may be required"
    ],
    likelySolutionCategories: [
      "AV over IP",
      "Lecture Capture Support",
      "Streaming / Recording",
      "Audio DSP / Reinforcement",
      "Control System / Touch Panel"
    ],
    starterQuestions: [
      "Will sessions be recorded, streamed, or both?",
      "Do you need one screen, dual screens, or projection?",
      "Do lecturers need confidence monitoring or preview displays?"
    ],
    followUpQuestionGroups: ["display", "sources", "audio", "capture", "control", "installation"]
  },
  {
    id: "collaboration-space",
    label: "Collaboration Space",
    synonyms: ["open collaboration area", "pod", "informal space"],
    likelyUses: ["informal presentation", "ad hoc sharing", "team collaboration"],
    defaultAssumptions: [
      "Easy wireless sharing likely",
      "Little training expected",
      "Fast setup important"
    ],
    likelySolutionCategories: [
      "Wireless Presentation",
      "Matrix Switching"
    ],
    starterQuestions: [
      "Will this space mainly be used for informal content sharing or structured meetings?",
      "Do users need to plug in, share wirelessly, or both?",
      "Does it need to be almost self-explanatory for users?"
    ],
    followUpQuestionGroups: ["display", "sources", "control", "installation"]
  },
  {
    id: "reception-signage",
    label: "Reception / Signage",
    synonyms: ["reception", "lobby", "signage area"],
    likelyUses: ["branding", "information display", "promotional content"],
    defaultAssumptions: [
      "Scheduled content likely",
      "Central updates likely",
      "Low-touch operation likely"
    ],
    likelySolutionCategories: [
      "Digital Signage Distribution",
      "Video Wall Processing",
      "Central Monitoring / Management"
    ],
    starterQuestions: [
      "Is this mainly for branding, information, live data, or promotional video?",
      "Will content be updated regularly?",
      "Is this one display, several displays, or a video wall?"
    ],
    followUpQuestionGroups: ["display", "content-management", "installation"]
  },
  {
    id: "video-wall-control-room",
    label: "Video Wall / Control Room",
    synonyms: ["monitoring room", "operations room", "control room"],
    likelyUses: ["monitoring", "source overview", "operator switching"],
    defaultAssumptions: [
      "Multiple source routing likely",
      "High reliability likely",
      "Operator control required"
    ],
    likelySolutionCategories: [
      "Video Wall Processing",
      "Matrix Switching",
      "AV over IP",
      "Control System / Touch Panel"
    ],
    starterQuestions: [
      "Is this mainly for monitoring, switching sources, or both?",
      "Do operators need to move sources around the wall dynamically?",
      "How critical is uptime for this space?"
    ],
    followUpQuestionGroups: ["display", "sources", "control", "installation"]
  },
  {
    id: "hospitality-ballroom",
    label: "Hospitality / Ballroom",
    synonyms: ["ballroom", "banqueting", "event space"],
    likelyUses: ["presentations", "events", "divisible-room operation"],
    defaultAssumptions: [
      "Long cable distances likely",
      "Guest-friendly use important",
      "Flexible source routing likely"
    ],
    likelySolutionCategories: [
      "Matrix Switching",
      "HDBaseT Extension",
      "AV over IP",
      "Control System / Touch Panel"
    ],
    starterQuestions: [
      "Will the space always be used as one room, or can it be divided?",
      "Do guest presenters need easy laptop connection?",
      "Do screens need to show the same content or different content?"
    ],
    followUpQuestionGroups: ["display", "sources", "audio", "control", "installation"]
  },
  {
    id: "cafe-social-space",
    label: "Café / Social Space",
    synonyms: ["cafe", "social space", "breakout food area"],
    likelyUses: ["signage", "background audio", "information display"],
    defaultAssumptions: [
      "Signage likely",
      "Background audio may be needed",
      "Central updates may be preferred"
    ],
    likelySolutionCategories: [
      "Digital Signage Distribution",
      "Audio DSP / Reinforcement",
      "Central Monitoring / Management"
    ],
    starterQuestions: [
      "Is this mainly for menu boards, brand messaging, information screens, or entertainment?",
      "Do you need background music or only displays?",
      "Should content be centrally updated?"
    ],
    followUpQuestionGroups: ["display", "audio", "content-management", "installation"]
  },
  {
    id: "mixed-unknown",
    label: "Mixed / Not Sure",
    synonyms: ["not sure", "mixed use"],
    likelyUses: ["mixed use"],
    defaultAssumptions: [
      "Requirements may still be unclear",
      "Need conversational discovery first"
    ],
    likelySolutionCategories: [
      "Matrix Switching",
      "Wireless Presentation",
      "UC Room Integration"
    ],
    starterQuestions: [
      "What do users need to do in the space most often?",
      "How many people typically use it?",
      "Is the main goal presentation, meetings, teaching, signage, or monitoring?"
    ],
    followUpQuestionGroups: ["display", "sources", "conferencing", "audio", "control", "installation"]
  }
];