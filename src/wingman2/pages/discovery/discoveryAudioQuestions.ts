import type { DiscoveryQuestion } from "./discoveryTypes";

export const discoveryAudioQuestions: DiscoveryQuestion[] = [
  {
    // One question for both ends of the programme-audio path, because a rep
    // decides them together in the room: "where do we take the sound out" is
    // only half an answer until "where must it arrive" is known. The values
    // are prefixed `extract-` and `route-` so the design can tell the two
    // halves apart without a second question.
    id: "audio-route", shortLabel: "Audio route", section: "Audio, control & conferencing", required: true,
    question: "Where is programme audio taken from, and where must it go?",
    prompt: "Select the extraction point and every destination. Sound pulled out at the matrix still needs a route to the amplifier, the meeting host, a recorder or the audio network.",
    why: "The extraction point decides whether a video box needs an audio output at all; the destinations decide which devices need an audio input and which connections another supplier must provide.",
    selectionMode: "multiple",
    exclusiveValues: ["no-programme-audio-route", "unknown-audio-route"],
    capturePlaceholder: "Example: programme audio de-embedded at the matrix, feeding the room amplifier and the Teams Room over USB, with a separate feed to the recorder.",
    options: [
      { value: "extract-at-source", label: "Taken from the source device", help: "The media player, set-top box or room PC has its own audio output, so no de-embedder is needed." },
      { value: "extract-at-switcher", label: "Extracted at the matrix, switcher or wall processor", help: "The video box separates the selected source's audio and presents it as analogue, digital or embedded audio." },
      { value: "extract-at-display", label: "Extracted at the display or projector", help: "The screen's own audio output carries programme sound; confirm the output type and level." },
      { value: "route-to-room-amplifier", label: "To the room amplifier, DSP or loudspeakers", help: "Programme sound is played back in the room through the house audio system." },
      { value: "route-to-uc-host", label: "To the UC host as USB audio", help: "The meeting host (Teams Room, room PC, codec) receives programme audio and returns the far end to the room." },
      { value: "route-to-recorder", label: "To a recorder, stream or production desk", help: "Programme sound is captured separately from what the room hears." },
      { value: "route-to-dante", label: "Onto the Dante / AES67 audio network", help: "Programme audio joins the building audio network rather than a point-to-point cable." },
      { value: "route-to-display-speakers", label: "To the display's own speakers only", help: "The screen plays the sound and no separate room audio system is used." },
      { value: "no-programme-audio-route", label: "No programme audio beyond the source", help: "Nothing else in the system carries or plays programme sound." },
      { value: "unknown-audio-route", label: "Not confirmed — audio route", help: "Record where sound is taken from and where it must arrive before pricing interfaces." },
    ],
  },
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
