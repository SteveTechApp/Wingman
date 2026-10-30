/**
 * The room, decided before any design is chosen.
 *
 * The template library asks a room to be recognised from a picture of a room
 * somebody else built: a market rail, a grid of names, and an expectation that
 * the reader already knows a "divisible boardroom" is what they have. That works
 * for the specifier who has done it a hundred times and fails for the two people
 * this module is for — a junior who has the customer's words and no vocabulary,
 * and a designer who has the vocabulary and no spare hour. Both of them are
 * holding facts, not designs.
 *
 * So this reads the facts and answers the decision. Two things make it a
 * different method rather than a shorter form:
 *
 * 1. **Setup is three facts, not a form.** Market, what the room has to do, and
 *    how many people are in it. Each is a question the customer can answer
 *    without knowing anything about AV, and between them they rule most of the
 *    library out. The room's physical facts — a partition that moves, whether
 *    people stay or pass through, content that crosses a room boundary — are
 *    asked later, and only when they would change the answer.
 *
 * 2. **Every later question is chosen because it splits what is left.** The
 *    engine keeps the set of room types still possible and asks the unanswered
 *    question that divides that set most evenly, because a question whose
 *    answers all point the same way has already been answered by the room. It
 *    stops as soon as one type is left, so a huddle is decided in two questions
 *    and a divisible boardroom in three — not twelve.
 *
 * What comes out is a decision, and it is deliberately not a bill of materials:
 * the room type, what the room needs to do its job, what a person still has to
 * check on site, what was assumed, and what would change the answer. Products
 * come after that, from the catalogue or the wall builder, because a BOM chosen
 * from four answers is a guess wearing a schedule.
 *
 * The requirements carry their own reason. A rep who cannot say *why* a room
 * needs two screens will drop one under price pressure, and the answer to that
 * is a sentence tied to the answer that asked for it.
 */
import type { TemplateMarket } from "./templateMarkets";

/** A room type this method can decide. One per shape of job, not per product. */
export type RoomArchetypeId =
  | "huddle-byod"
  | "meeting-dual"
  | "divisible-boardroom"
  | "classroom"
  | "lecture-capture"
  | "all-hands"
  | "control-room"
  | "venue"
  | "signage-wall"
  | "campus-distribution";

export type RoomBriefAnswers = Record<string, string>;

/** One thing the room has to be able to do, and the answer that asked for it. */
export type RoomRequirement = {
  key: string;
  label: string;
  /** How much of it, in the room's own terms. */
  quantity: string;
  /** Why this room needs it, written so a rep can defend it. */
  because: string;
};

export type RoomDecision = {
  archetype: RoomArchetypeId;
  /** What this room type is, in a sentence a customer would recognise. */
  roomType: string;
  /** The job it is built for. */
  summary: string;
  requirements: RoomRequirement[];
  /** What a person still has to look at before this is priced. */
  verifyOnSite: string[];
  /** What the decision had to take for granted. */
  assumptions: string[];
  /** The answer that would move this to a different room type. */
  changesIf: string[];
  /** The market the catalogue should be browsed under, once decided. */
  market: TemplateMarket | "";
  /** How much of the ladder was actually needed, for the reading on screen. */
  questionsAsked: number;
  /** True when the answers still fit more than one room type. */
  unresolved: RoomArchetypeId[];
};

/** The four facts a customer can answer without being taught anything. */
export type RoomBriefSetup = {
  market: TemplateMarket | "";
  purpose: string;
  occupancy: string;
};

const OCCUPANCY = [
  { value: "squad", label: "1–4 people", seats: "two to four" },
  { value: "small", label: "5–10 people", seats: "five to ten" },
  { value: "medium", label: "11–20 people", seats: "eleven to twenty" },
  { value: "large", label: "21–50 people", seats: "twenty-one to fifty" },
  { value: "crowd", label: "More than 50", seats: "more than fifty" },
] as const;

/** What the room has to do — the customer's own words, not a product category. */
const PURPOSES = [
  { value: "present", label: "Share a laptop and present to the others in the room" },
  { value: "meet", label: "Meet people elsewhere on video, as a room" },
  { value: "teach", label: "Teach or train a group, with the teacher at the front" },
  { value: "show-many", label: "Show several sources at once" },
  { value: "address-crowd", label: "Address a large group or an audience" },
  { value: "signage", label: "Show content to people passing through" },
  { value: "campus", label: "Move video between rooms or around a building" },
] as const;

export const ROOM_BRIEF_OCCUPANCIES = OCCUPANCY;
export const ROOM_BRIEF_PURPOSES = PURPOSES;

type Archetype = {
  id: RoomArchetypeId;
  roomType: string;
  summary: string;
  /** Purposes this room type is built for. */
  purposes: string[];
  requirements: (answers: RoomBriefAnswers) => RoomRequirement[];
  verifyOnSite: string[];
  changesIf: string[];
  assumptions: string[];
};

const seatsFor = (answers: RoomBriefAnswers): string =>
  OCCUPANCY.find((band) => band.value === answers.occupancy)?.seats ?? "the stated number of";

const is = (answers: RoomBriefAnswers, id: string, ...values: string[]): boolean =>
  values.includes(String(answers[id] ?? ""));

/** Two screens per side, because a divisible room is two rooms when it splits. */
const divisibleDisplays = () => "four displays, two per side";

const ARCHETYPES: Archetype[] = [
  {
    id: "huddle-byod",
    roomType: "Huddle room, bring your own laptop",
    summary: "One small table, one screen, a visiting laptop on a cable, and a bar that carries the call.",
    purposes: ["present", "meet"],
    requirements: (answers) => [
      { key: "display", label: "One commercial display", quantity: "one 55–65 inch screen on the front wall", because: "one screen is the whole presentation surface, so nothing in the room competes with it." },
      { key: "source", label: "Laptop input at the table", quantity: "one USB-C connection with HDMI fallback", because: "the only source is the visitor's own machine, so the input has to be at the table rather than at the display." },
      ...(is(answers, "far-end", "yes")
        ? [{ key: "uc", label: "Conferencing bar as one device", quantity: "camera, microphone array and loudspeaker in one unit", because: `the far end joins this room for ${seatsFor(answers)} people, and a bar keeps the room one device to switch on.` }]
        : []),
      { key: "control", label: "Nothing to learn", quantity: "input select on the source, no control panel", because: "a room this size is used by whoever walks in, so any control surface is a support call waiting to happen." },
    ],
    verifyOnSite: [
      "Camera framing and microphone pickup at the furthest seat.",
      "Whether the visitor's laptop actually drives USB-C video and the room's USB devices.",
      "Wall construction for the display and a reachable ceiling or skirting path for the cable.",
    ],
    changesIf: [
      "Two independent screens or two cameras: this becomes a meeting room with a switcher.",
      "The room must also serve a fixed PC: add a second source position.",
    ],
    assumptions: ["A single enclosed room with a door, not an open-plan pocket."],
  },
  {
    id: "meeting-dual",
    roomType: "Meeting room, two screens",
    summary: "A fixed table, two screens showing different things, local presenters and a joined call.",
    purposes: ["present", "meet", "show-many"],
    requirements: () => [
      { key: "display", label: "Two displays", quantity: "two same-size screens, side by side or one per end", because: "the room shows people and content at once, and one screen forces the room to choose." },
      { key: "source", label: "Fixed and visiting sources", quantity: "two to three inputs, including one at the table", because: "the room has its own machine and still takes a visitor's laptop." },
      { key: "switch", label: "Local presentation switching", quantity: "one switcher driving both screens", because: "two screens with two sources is a matrix, and a bare splitter makes the far end the only answer." },
      { key: "uc", label: "Room video conferencing", quantity: "camera, microphones and speakers for the table", because: "the room joins as a room, so its audio and camera are fixed rather than carried by a laptop." },
    ],
    verifyOnSite: [
      "Seat positions and sight lines to both screens.",
      "Acoustic treatment over glazing and hard table surfaces.",
      "Cable route between the screens and the equipment position.",
    ],
    changesIf: [
      "The room must split in two while both halves work: that is a divisible boardroom.",
      "More than two sources displayed at once: the answer is a wall or a multiview processor.",
    ],
    assumptions: ["Both screens are watched by the same people, not by two separate groups."],
  },
  {
    id: "divisible-boardroom",
    roomType: "Divisible boardroom",
    summary: "One large room that becomes two, each half a working room on its own.",
    purposes: ["present", "meet", "show-many", "teach"],
    requirements: () => [
      { key: "display", label: "A display per side, per output", quantity: divisibleDisplays(), because: "each half is a room, so each half needs its own surface whether the partition is open or shut." },
      { key: "source", label: "Inputs in both halves", quantity: "a table input in each side, plus a shared one", because: "an input only on one side makes the other half unusable when the room splits." },
      { key: "switch", label: "Combined and split operation", quantity: "one control that sets the room to combined or split", because: "the room's most common fault is a partition state the equipment does not match." },
      { key: "uc", label: "Two conferencing systems or one that follows the partition", quantity: "one per side, able to join as one room when combined", because: "a single system in one half leaves the other half without a call when the partition closes." },
      { key: "audio", label: "Audio that follows the partition", quantity: "speakers and microphones per side, with a combined mode", because: "sound crossing a closed partition is how the two halves disturb each other." },
    ],
    verifyOnSite: [
      "The partition's own controls and whether they expose a combined/split signal.",
      "Ceiling height and structure above both halves for displays and speakers.",
      "Where each half's table sits relative to its screen.",
    ],
    changesIf: [
      "The halves never run at the same time: a single system with a switch is enough.",
      "One half is a training space with fixed rows: treat that half as a classroom.",
    ],
    assumptions: ["The partition is operable and each half has its own door and lighting control."],
  },
  {
    id: "classroom",
    roomType: "Teaching room",
    summary: "A teacher at the front, a group facing them, and one place where sources change.",
    purposes: ["teach"],
    requirements: (answers) => [
      { key: "display", label: "One large display or projector", quantity: `sized so the back row of ${seatsFor(answers)} can read it`, because: "legibility at the last row decides the size, not the wall it fits." },
      { key: "source", label: "Teacher sources at the front", quantity: "lectern input, a fixed machine and a visitor's laptop", because: "the teacher is the source of the session, so their position is the one that must be wired." },
      { key: "control", label: "One-button source choice", quantity: "a wall plate or simple control at the lectern", because: "a teacher has minutes between sessions and cannot be the room's technician." },
      { key: "audio", label: "Speech reinforcement", quantity: "ceiling speakers with a lectern microphone where the room needs it", because: "the back row hears the screen but not the teacher, which is the usual complaint in this room." },
    ],
    verifyOnSite: [
      "Row spacing and the furthest viewer's distance to the screen.",
      "Ambient light on the screen during the day.",
      "Whether the teacher walks while talking, which changes the microphone.",
    ],
    changesIf: [
      "Sessions must be recorded or streamed: that adds capture and a second camera.",
      "The room needs several sources visible at once: it becomes a wall or a multiview.",
    ],
    assumptions: ["One teacher at a fixed position, with the group facing them."],
  },
  {
    id: "lecture-capture",
    roomType: "Lecture theatre with capture",
    summary: "A tiered audience, one presenter, and every session recorded or streamed as it happens.",
    purposes: ["teach", "address-crowd"],
    requirements: () => [
      { key: "display", label: "Large-format display or projection", quantity: "sized for the furthest tier", because: "a tiered room's last row is further away than its floor plan suggests." },
      { key: "camera", label: "Presenter and audience cameras", quantity: "at least two, with automatic framing", because: "capture that shows only slides is a recording nobody watches twice." },
      { key: "audio", label: "Presenter and room audio mixed for the recording", quantity: "radio or gooseneck microphone plus a room feed", because: "the recording must hear the presenter and the questions, or the stream is half a session." },
      { key: "control", label: "Start and stop that a lecturer can run", quantity: "one control that starts recording and the stream together", because: "capture that needs a technician does not run every session." },
      { key: "network", label: "Uplink sized for streaming", quantity: "a wired connection for the capture host", because: "the stream is the session's only output when the room is full." },
    ],
    verifyOnSite: [
      "Tier heights and camera positions that see the front row and the last.",
      "The network drop and its sustained upload rate.",
      "Lighting on the presenter against the screen's brightness.",
    ],
    changesIf: [
      "Sessions are recorded but never streamed live: the uplink and its sizing drop away.",
    ],
    assumptions: ["Sessions run to a timetable, so the capture is started by the lecturer."],
  },
  {
    id: "all-hands",
    roomType: "All-hands space",
    summary: "One speaker, a large audience, and the same picture repeated so the back can see it.",
    purposes: ["address-crowd", "present"],
    requirements: (answers) => [
      { key: "display", label: "A main screen and repeat screens", quantity: `one primary display sized for the room, plus repeats for ${seatsFor(answers)}`, because: "one screen in a large room asks the back half to watch a phone." },
      { key: "distribution", label: "The same picture to every screen", quantity: "one source distributed to all displays", because: "this room shows one thing to everyone; independent screens are a different room." },
      { key: "audio", label: "Speech that carries without feedback", quantity: "distributed speakers with delay where the room is deep", because: "a single speaker pair in a deep room makes the back listen to the front's echo." },
      { key: "control", label: "A confident start", quantity: "one preset that brings up screens, audio and source", because: "the room is used in front of an audience, so nothing can be debugged live." },
    ],
    verifyOnSite: [
      "Sight lines from every position, including standing at the back.",
      "Reverberation and where the speakers can be hung.",
      "Whether the space is used for anything else, which decides the presets.",
    ],
    changesIf: [
      "The audience must see different content by area: that is signage, not one picture.",
    ],
    assumptions: ["One presenter, one picture, an audience sitting or standing in the same space."],
  },
  {
    id: "control-room",
    roomType: "Control room",
    summary: "Operators at fixed desks watching many sources, all day, with no room for a wrong switch.",
    purposes: ["show-many"],
    requirements: () => [
      { key: "display", label: "Operator displays and a shared wall", quantity: "one or two per desk plus a large shared surface", because: "the desk watches one thing and the room watches another, and both are in use at once." },
      { key: "switch", label: "Routing that an operator can trust", quantity: "a router with named sources and layouts, recalled by preset", because: "an incident is not the moment to remember which input feeds which screen." },
      { key: "control", label: "Presets rather than menus", quantity: "one control per desk and one for the room", because: "the room is staffed continuously, so the common layouts must be one press." },
      { key: "resilience", label: "Nothing single-pointed on the critical path", quantity: "redundant power and a path that survives one failure", because: "a control room that goes dark during an incident is worse than no control room." },
    ],
    verifyOnSite: [
      "Desk positions, operator sight lines and where the shared wall can hang.",
      "Heat load and whether the room has dedicated cooling.",
      "The source list and which of them must never be interrupted.",
    ],
    changesIf: [
      "The room is used for presentations as well as operations: add a present mode with its own preset.",
    ],
    assumptions: ["The room is staffed by trained operators on shifts."],
  },
  {
    id: "venue",
    roomType: "Hospitality venue",
    summary: "Several screens, several sources, staff who are not AV people, and a crowd that moves.",
    purposes: ["signage", "address-crowd", "show-many"],
    requirements: () => [
      { key: "display", label: "Multiple displays in zones", quantity: "one per viewing zone, sized for standing distance", because: "guests watch from where they stand, so each zone needs its own screen rather than one big one." },
      { key: "distribution", label: "Zones that can show different things", quantity: "a matrix or network distribution with per-zone sources", because: "the bar, the screen wall and the function room are rarely showing the same thing." },
      { key: "control", label: "Staff control that cannot break it", quantity: "a locked-down panel or remote with preset scenes", because: "the people operating it are hospitality staff, and a wrong setting runs until someone notices." },
      { key: "audio", label: "Programme audio by zone", quantity: "zone amplification with independent level per zone", because: "sound is the half of a venue that guests complain about first." },
    ],
    verifyOnSite: [
      "Viewing distances and sight lines from where guests actually sit and stand.",
      "Where cable can run between zones, and whether they share a ceiling.",
      "Licensing or content control for what plays on each screen.",
    ],
    changesIf: [
      "The venue hosts presentations as well: add a presentation input that takes over the zones.",
    ],
    assumptions: ["The screens are content surfaces first and presentation surfaces second."],
  },
  {
    id: "signage-wall",
    roomType: "Video wall or LED feature",
    summary: "One canvas made of several panels, showing one picture across the seam.",
    purposes: ["signage", "show-many", "address-crowd"],
    requirements: () => [
      { key: "canvas", label: "A wall treated as one canvas", quantity: "panels plus the processor that feeds them as one output", because: "a wall without a processor is a row of televisions showing the same thing nine times." },
      { key: "source", label: "Content sources for the canvas", quantity: "one player plus a live input", because: "the wall is usually signage with a presentation override." },
      { key: "control", label: "Layouts, not cabling changes", quantity: "presets for full-canvas, split and picture-in-picture", because: "the wall's value is the layout it can change to without touching a cable." },
      { key: "structure", label: "A mounting that is engineered", quantity: "a surveyed mount with service access", because: "a wall's weight and service access are building decisions, not AV ones." },
    ],
    verifyOnSite: [
      "Wall structure and the load it can take, with service access planned.",
      "Ambient light across the wall's face, which decides brightness.",
      "The viewing distance that sets the panel pitch or the screen size.",
    ],
    changesIf: [
      "The wall is only ever a single picture: a large-format display is cheaper and simpler.",
    ],
    assumptions: ["The wall has a dedicated processor and a feed that matches its canvas."],
  },
  {
    id: "campus-distribution",
    roomType: "Building-wide video distribution",
    summary: "Sources in one place, screens everywhere, and any source able to reach any screen.",
    purposes: ["campus", "signage", "show-many"],
    requirements: () => [
      { key: "transport", label: "A network-based video path", quantity: "encoders at the sources, decoders at the screens, on their own VLAN", because: "many-to-many is a network question; point-to-point cabling solves it once per pair." },
      { key: "network", label: "A network that carries it", quantity: "switching with multicast and QoS configured", because: "video over IP inherits whatever the network does with multicast, and that is not a default." },
      { key: "control", label: "Routing a person can change", quantity: "a control layer with named sources and screens", because: "the point of the system is that a screen can be given a different source on purpose." },
      { key: "power", label: "Remote power for endpoints", quantity: "PoE or switched power at each endpoint", because: "a decoder that needs a site visit to reboot is a recurring call-out." },
    ],
    verifyOnSite: [
      "The network: existing switches, VLANs, multicast behaviour and who owns it.",
      "Cable routes between the equipment room and each screen position.",
      "Which screens must keep working if the network has a bad day.",
    ],
    changesIf: [
      "Only two rooms share content: a pair of extenders is the honest answer, not a system.",
    ],
    assumptions: ["An IT owner exists who will carry the video VLAN as part of the network."],
  },
];

/**
 * The questions after setup, each with the room types its answers support.
 *
 * A question earns its place by splitting what is still possible: if every
 * option supports the same rooms, the room already answered it and asking would
 * only cost the rep a question.
 */
export type RoomBriefQuestion = {
  id: string;
  question: string;
  why: string;
  options: Array<{ value: string; label: string; supports: RoomArchetypeId[] }>;
};

export const ROOM_BRIEF_QUESTIONS: RoomBriefQuestion[] = [
  {
    id: "far-end",
    question: "Are people joining this room from somewhere else, on video?",
    why: "A room that only shows things to itself needs no camera, no microphone and no call.",
    options: [
      { value: "yes", label: "Yes, the room joins calls as a room", supports: ["huddle-byod", "meeting-dual", "divisible-boardroom", "classroom", "lecture-capture", "all-hands", "control-room"] },
      { value: "sometimes", label: "Sometimes, from a visiting laptop", supports: ["huddle-byod", "meeting-dual", "classroom"] },
      { value: "no", label: "No, everything stays in the room", supports: ["classroom", "all-hands", "venue", "signage-wall", "control-room"] },
    ],
  },
  {
    id: "partition",
    question: "Can this room be split into two, with both halves still in use?",
    why: "A partition turns one room into two, and every screen and microphone has to follow it.",
    options: [
      { value: "yes", label: "Yes, there is a movable partition", supports: ["divisible-boardroom", "classroom"] },
      { value: "no", label: "No, it is one room", supports: ["huddle-byod", "meeting-dual", "classroom", "lecture-capture", "all-hands", "control-room", "venue", "signage-wall", "campus-distribution"] },
    ],
  },
  {
    id: "screens",
    question: "Does the room need more than one screen showing different things?",
    why: "Two screens with two sources is a switcher; one screen is a cable.",
    options: [
      { value: "different", label: "Yes, different things on different screens", supports: ["meeting-dual", "divisible-boardroom", "control-room", "venue", "signage-wall", "all-hands"] },
      { value: "same", label: "No, the same thing everywhere is fine", supports: ["huddle-byod", "classroom", "lecture-capture", "all-hands", "campus-distribution"] },
    ],
  },
  {
    id: "audience",
    question: "Is this one audience watching one presenter?",
    why: "One presenter and one picture is a different room from one where groups watch different things.",
    options: [
      { value: "yes", label: "Yes, one presenter addressing everyone", supports: ["lecture-capture", "all-hands", "classroom"] },
      { value: "no", label: "No, people work at their own desks or in zones", supports: ["huddle-byod", "meeting-dual", "divisible-boardroom", "control-room", "venue", "signage-wall", "campus-distribution"] },
    ],
  },
  {
    id: "record",
    question: "Does a session have to be recorded or streamed as it happens?",
    why: "Capture adds a camera, a mixed audio feed and an uplink, and it must be startable by the presenter.",
    options: [
      { value: "yes", label: "Yes, every session is captured", supports: ["lecture-capture"] },
      { value: "no", label: "No, or only occasionally by hand", supports: ["classroom", "all-hands", "huddle-byod", "meeting-dual", "divisible-boardroom", "control-room", "venue", "signage-wall", "campus-distribution"] },
    ],
  },
  {
    id: "reach",
    question: "Does this screen need to show something from another room, or another screen this room's content?",
    why: "Content that crosses a room boundary is a network or transport question, not a cable.",
    options: [
      { value: "yes", label: "Yes, content crosses between rooms", supports: ["campus-distribution", "control-room", "venue"] },
      { value: "no", label: "No, the room is self-contained", supports: ["huddle-byod", "meeting-dual", "divisible-boardroom", "classroom", "lecture-capture", "all-hands", "signage-wall"] },
    ],
  },
  {
    id: "dwell",
    question: "Do people stay in this space, or pass through it?",
    why: "A screen people stop and watch is a room; a screen they walk past is a surface with no chairs to plan around.",
    options: [
      { value: "stay", label: "They stay: seats, a table, a reason to be there", supports: ["huddle-byod", "meeting-dual", "divisible-boardroom", "classroom", "lecture-capture", "all-hands", "control-room", "venue", "campus-distribution"] },
      { value: "pass", label: "They pass through: a foyer, a corridor, a shopfront", supports: ["signage-wall"] },
    ],
  },
  {
    id: "operated",
    question: "Who works the room — someone employed to run it, a presenter, or whoever turns up?",
    why: "This decides how much of the system has to be a preset rather than a menu, and whether a fault is noticed at all.",
    options: [
      { value: "staffed", label: "Staffed: an operator or a control desk runs it", supports: ["control-room"] },
      { value: "presenter", label: "A presenter or teacher runs it during a session", supports: ["classroom", "lecture-capture", "all-hands"] },
      { value: "anyone", label: "Whoever is in the room, with no training", supports: ["huddle-byod", "meeting-dual", "divisible-boardroom", "venue", "signage-wall", "campus-distribution"] },
    ],
  },
];

/** The room types the setup facts allow, before any later question is asked. */
export function setupArchetypes(answers: RoomBriefAnswers): RoomArchetypeId[] {
  const purpose = String(answers.purpose ?? "");
  const matching = ARCHETYPES.filter((archetype) => archetype.purposes.includes(purpose));
  return (matching.length ? matching : ARCHETYPES).map((archetype) => archetype.id);
}

/**
 * The room types still possible: setup first, then every answered question.
 *
 * An answer never narrows to nothing. Where the answers contradict each other —
 * a partition and a lecture theatre, say — the later answer wins and the earlier
 * one is kept only where it still fits, because a rep who answered "partition"
 * and then "one presenter" has a divided teaching space and not an error.
 */
export function survivingArchetypes(answers: RoomBriefAnswers): RoomArchetypeId[] {
  let surviving = setupArchetypes(answers);
  for (const question of ROOM_BRIEF_QUESTIONS) {
    const value = String(answers[question.id] ?? "");
    if (!value) continue;
    const option = question.options.find((candidate) => candidate.value === value);
    if (!option) continue;
    const narrowed = surviving.filter((id) => option.supports.includes(id));
    if (narrowed.length) surviving = narrowed;
  }
  return surviving;
}

/**
 * How evenly a question divides the rooms still possible.
 *
 * The count of rooms in the smallest group is the score, so a question whose
 * worst answer still leaves three rooms open tells the engine less than one that
 * can halve the set. Ties are broken by the question's own order, which is the
 * order a person would ask them in.
 */
export function splitScore(question: RoomBriefQuestion, surviving: RoomArchetypeId[]): number {
  const counts = question.options
    .filter((option) => option.supports.some((id) => surviving.includes(id)))
    .map((option) => surviving.filter((id) => option.supports.includes(id)).length);
  if (counts.length < 2) return 0;
  return Math.min(...counts);
}

/**
 * The next question, or null when the room is decided.
 *
 * Null is also the answer when no remaining question can narrow anything: two
 * rooms that no answer separates are reported as unresolved rather than guessed
 * between, because the rep can see which two and ask one question of their own.
 */
export function nextRoomBriefQuestion(answers: RoomBriefAnswers): RoomBriefQuestion | null {
  const surviving = survivingArchetypes(answers);
  if (surviving.length <= 1) return null;
  const asked = ROOM_BRIEF_QUESTIONS.filter((question) => answers[question.id]);
  let best: { question: RoomBriefQuestion; score: number } | null = null;
  for (const question of ROOM_BRIEF_QUESTIONS) {
    if (asked.includes(question)) continue;
    const score = splitScore(question, surviving);
    if (score > 0 && (!best || score > best.score)) best = { question, score };
  }
  return best?.question ?? null;
}

/** How many questions the ladder actually needed, for the reading on screen. */
export function questionsAsked(answers: RoomBriefAnswers): number {
  return ROOM_BRIEF_QUESTIONS.filter((question) => answers[question.id]).length;
}

/**
 * The decision.
 *
 * With more than one room type still standing, the first survives: it is the
 * narrower room, and the unresolved list on the result names what a person would
 * have to ask to tell them apart.
 */
export function resolveRoomBrief(answers: RoomBriefAnswers, market: TemplateMarket | "" = ""): RoomDecision {
  const surviving = survivingArchetypes(answers);
  const chosen = ARCHETYPES.find((archetype) => archetype.id === surviving[0]) ?? ARCHETYPES[0];
  return {
    archetype: chosen.id,
    roomType: chosen.roomType,
    summary: chosen.summary,
    requirements: chosen.requirements(answers),
    verifyOnSite: chosen.verifyOnSite,
    assumptions: chosen.assumptions,
    changesIf: chosen.changesIf,
    market,
    questionsAsked: questionsAsked(answers),
    unresolved: surviving.slice(1),
  };
}

/**
 * The answers the discovery flow already understands, so a decision is a
 * starting point rather than a dead end.
 *
 * Only keys whose values this module can guarantee are written. `opportunity`
 * carries the room shape, `scale` the occupancy band, and `displays` the count
 * the decision implies — all three read by the existing capture steps.
 */
export function roomBriefDiscoveryAnswers(decision: RoomDecision): Record<string, string | string[]> {
  const opportunity: Record<RoomArchetypeId, string> = {
    "huddle-byod": "meeting-room",
    "meeting-dual": "meeting-room",
    "divisible-boardroom": "meeting-room",
    classroom: "classroom",
    "lecture-capture": "classroom",
    "all-hands": "meeting-room",
    "control-room": "av-over-ip",
    venue: "hospitality",
    "signage-wall": "video-wall",
    "campus-distribution": "av-over-ip",
  };
  const displays = decision.requirements
    .find((requirement) => requirement.key === "display")
    ?.quantity.match(/\b(one|two|three|four)\b/)?.[1];
  const count = { one: "1", two: "2", three: "3", four: "4" }[displays ?? ""] ?? "";
  return {
    opportunity: opportunity[decision.archetype],
    ...(count ? { displays: count } : {}),
  };
}

/** Every room type, so a surface can explain what the method can decide. */
export function roomArchetypes(): Array<{ id: RoomArchetypeId; roomType: string; summary: string }> {
  return ARCHETYPES.map(({ id, roomType, summary }) => ({ id, roomType, summary }));
}
