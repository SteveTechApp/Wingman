import type { DiscoveryQuestion } from "./discoveryTypes";

export const discoveryAudioQuestions: DiscoveryQuestion[] = [
  {
    id: "audio-zones", shortLabel: "Listening areas", section: "Audio, control & conferencing", required: true,
    question: "Which areas need separate audio control?",
    prompt: "Describe listening areas, independent sources and room-combine behaviour.",
    why: "Speaker circuits, amplifier channels and audio matrix outputs follow listening zones, not the number of televisions.",
    capturePlaceholder: "Example: Bar commentary, quiet dining music and a terrace, each with independent source, level and mute. Three zones.",
    options: [
      { value: "one-audio-zone", label: "One listening area" },
      { value: "independent-audio-zones", label: "Several independently controlled areas", help: "Record the number, names, source feeds and controls in the notes." },
      { value: "combinable-audio-zones", label: "Divisible or combinable rooms", help: "Keep divided-room microphones local; define linked event presets and partition sensing." },
      { value: "unknown-audio-zones", label: "Not confirmed — listening areas" },
    ],
  },
  {
    id: "audio-programme", shortLabel: "Listening experience", section: "Audio, control & conferencing", required: true,
    question: "What must the audience hear?",
    prompt: "Choose the required listening experience; a commercial room may need clear speech without cinema-level sound.",
    why: "Speech/background coverage, separate voice reinforcement, live performance and surround playback need different loudspeaker systems.",
    selectionMode: "multiple", exclusiveValues: ["unknown-audio-programme"],
    capturePlaceholder: "Example: Clear announcements and background music throughout; separate stage programme and lecturer voice reinforcement.",
    options: [
      { value: "speech-background", label: "Speech and background programme" },
      { value: "separate-speech-programme", label: "Programme playback with a separate reinforced voice mix" },
      { value: "full-range-programme", label: "Full-range music or film playback" },
      { value: "live-performance", label: "Live amplified performance" },
      { value: "surround-cinema", label: "Multichannel surround cinema" },
      { value: "unknown-audio-programme", label: "Not confirmed — listening experience" },
    ],
  },
  {
    id: "room-acoustics", shortLabel: "Room acoustics", section: "About the space", required: true,
    question: "What physical conditions affect sound in this space?",
    prompt: "Record dimensions, ceiling height, seating depth, construction, existing treatment and noise in the notes.",
    why: "Coverage and reverberation determine whether ordinary speakers, steerable columns, modular arrays or acoustic treatment are appropriate.",
    selectionMode: "multiple", exclusiveValues: ["unknown-room-acoustics"],
    capturePlaceholder: "Example: 24 × 18m tiered lecture hall, 6m hard ceiling, masonry and rear glazing; audible echo; two possible column positions and limited ceiling access.",
    options: [
      { value: "treated-room", label: "Absorptive finishes or existing treatment" },
      { value: "reflective-room", label: "Hard surfaces or audible reverberation" },
      { value: "deep-tiered-room", label: "Deep, tiered or high-ceiling audience area" },
      { value: "open-noisy-room", label: "Open-plan or high background noise" },
      { value: "outdoor-exposed", label: "Outdoor or environmentally exposed areas" },
      { value: "unknown-room-acoustics", label: "Not confirmed — acoustic conditions" },
    ],
  },
];
