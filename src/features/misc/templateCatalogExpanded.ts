import * as React from "react";

export type TierKey = "bronze" | "silver" | "gold";
export type UseCaseGroup = "meeting" | "training" | "signage" | "entertainment" | "collaboration";
export type BudgetBias = "cost" | "balanced" | "premium";

export type TierProfile = {
  label: string;
  summary: string;
  positioning: string;
  performance: string;
  commercialNote: string;
  includedSystems: string[];
  uplift: string[];
};

export type RoomTemplate = {
  id: string;
  name: string;
  short: string;
  story: string;
  designPurpose: string;
  useCases: string[];
  defaultTier: TierKey;
  tiers: Record<TierKey, TierProfile>;
  keywords: string[];
  useCaseGroup: UseCaseGroup;
  budgetBias: BudgetBias;
  recommendedFamilies: string[];
  nextTool: string;
};

type RoomNarrative = {
  story: string;
  designPurpose: string;
};

export type MarketTemplate = {
  id: string;
  name: string;
  summary: string;
  buyer: string;
  accentRgb: string;
  roomTypes: RoomTemplate[];
};

export const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold"];

export const TIER_ACCENTS: Record<TierKey, { rgb: string; label: string }> = {
  bronze: { rgb: "217,119,6", label: "Bronze" },
  silver: { rgb: "148,163,184", label: "Silver" },
  gold: { rgb: "251,191,36", label: "Gold" },
};

function makeTierProfile(
  label: "Bronze" | "Silver" | "Gold",
  summary: string,
  positioning: string,
  performance: string,
  commercialNote: string,
  includedSystems: string[],
  uplift: string[],
): TierProfile {
  return {
    label,
    summary,
    positioning,
    performance,
    commercialNote,
    includedSystems,
    uplift,
  };
}

function makeTiers(base: {
  bronze: {
    summary: string;
    positioning: string;
    performance: string;
    commercialNote: string;
    includedSystems: string[];
    uplift: string[];
  };
  silver: {
    summary: string;
    positioning: string;
    performance: string;
    commercialNote: string;
    includedSystems: string[];
    uplift: string[];
  };
  gold: {
    summary: string;
    positioning: string;
    performance: string;
    commercialNote: string;
    includedSystems: string[];
    uplift: string[];
  };
}): Record<TierKey, TierProfile> {
  return {
    bronze: makeTierProfile(
      "Bronze",
      base.bronze.summary,
      base.bronze.positioning,
      base.bronze.performance,
      base.bronze.commercialNote,
      base.bronze.includedSystems,
      base.bronze.uplift,
    ),
    silver: makeTierProfile(
      "Silver",
      base.silver.summary,
      base.silver.positioning,
      base.silver.performance,
      base.silver.commercialNote,
      base.silver.includedSystems,
      base.silver.uplift,
    ),
    gold: makeTierProfile(
      "Gold",
      base.gold.summary,
      base.gold.positioning,
      base.gold.performance,
      base.gold.commercialNote,
      base.gold.includedSystems,
      base.gold.uplift,
    ),
  };
}

function room(
  id: string,
  name: string,
  short: string,
  useCases: string[],
  defaultTier: TierKey,
  tiers: Record<TierKey, TierProfile>,
  keywords: string[],
  useCaseGroup: UseCaseGroup,
  budgetBias: BudgetBias,
  recommendedFamilies: string[],
  nextTool: string,
): RoomTemplate {
  const narrative = ROOM_NARRATIVES[id] ?? {
    story: `${name} is framed as a practical ${short.toLowerCase()}`,
    designPurpose: `Designed to align the ${name.toLowerCase()} template to its intended market and day-to-day application.`,
  };

  return {
    id,
    name,
    short,
    story: narrative.story,
    designPurpose: narrative.designPurpose,
    useCases,
    defaultTier,
    tiers,
    keywords,
    useCaseGroup,
    budgetBias,
    recommendedFamilies,
    nextTool,
  };
}

const ROOM_NARRATIVES: Record<string, RoomNarrative> = {
  "corporate-huddle": {
    story: "A fast-turn meeting alcove where visiting laptops connect in seconds and the room clears between back-to-back catchups.",
    designPurpose: "Designed for laptop-first collaboration in compact corporate spaces where speed, low training overhead, and one-screen confidence matter more than feature depth.",
  },
  "corporate-boardroom": {
    story: "An executive room where dual displays, table connectivity, and polished handoffs shape client perception during leadership reviews.",
    designPurpose: "Designed for high-visibility decision making and client-facing presentations in corporate boardrooms that need premium switching confidence and professional finish.",
  },
  "corporate-training": {
    story: "A staff enablement room that must reset quickly between presenters, keeping the trainer in control and the audience focused.",
    designPurpose: "Designed for instructor-led corporate learning, onboarding, and sales enablement sessions where repeatable source flow and predictable display behaviour matter.",
  },
  "corporate-townhall": {
    story: "A company broadcast room for all-hands updates, mixed media cues, and leadership messaging that needs to scale beyond a simple meeting room.",
    designPurpose: "Designed for presentation-led corporate communications, hybrid briefings, and large internal events where room visibility, coverage, and operational polish are critical.",
  },
  "education-classroom": {
    story: "A daily teaching room built for first bell to last bell, where teachers need the same dependable routine every period.",
    designPurpose: "Designed for standard classroom instruction with simple presenter control, reliable front-of-room display, and supportable campus-wide repeatability.",
  },
  "education-training": {
    story: "A practical teaching space where lecturers switch between local content, guest devices, and demonstration material without derailing the lesson.",
    designPurpose: "Designed for hands-on education and lab-style delivery where mixed inputs, instructor control, and repeatable training workflows are essential.",
  },
  "education-lecture": {
    story: "A larger teaching venue where presenter confidence, audience sightlines, and clean transitions matter more than ad hoc flexibility.",
    designPurpose: "Designed for lecture-led delivery and formal campus presentations that need stronger routing confidence, audience coverage, and scalable AV infrastructure.",
  },
  "education-seminar": {
    story: "A discussion-focused room where conversation, shared content, and tutor-led interaction need to coexist without the space feeling over-engineered.",
    designPurpose: "Designed for collaborative higher-education seminars and small-group teaching where balanced presentation and discussion workflow are the priority.",
  },
  "hospitality-suite": {
    story: "A premium guest suite where the AV needs to feel effortless, discreet, and polished for sponsors, VIPs, or private hosts.",
    designPurpose: "Designed for hospitality lounges and suites where guest experience, presentation polish, and flexible entertainment carry commercial value.",
  },
  "hospitality-bar": {
    story: "A high-energy viewing zone where multiple screens must stay in sync and staff need fast control during busy service.",
    designPurpose: "Designed for sports bars and multi-screen hospitality venues that prioritise dependable distribution, quick source changes, and visible guest impact.",
  },
  "hospitality-event": {
    story: "A flexible hire space that shifts from ambient lounge mode to branded event mode without rebuilding the operating workflow.",
    designPurpose: "Designed for adaptable hospitality event areas where changing sources, temporary branding, and staff-friendly control must work night after night.",
  },
  "hospitality-ballroom": {
    story: "A divisible event suite that has to support banqueting, presentations, and live moments while the room layout changes around it.",
    designPurpose: "Designed for large-format hospitality events, banqueting, and conference use where scalable distribution, zone control, and premium room confidence are essential.",
  },
  "retail-showroom": {
    story: "A display-led retail bay where the screens help the product tell its story before a salesperson even starts the conversation.",
    designPurpose: "Designed for showroom merchandising and branded product presentation where visual consistency, repeatability, and simple day-to-day operation matter.",
  },
  "retail-consultation": {
    story: "A small high-conversion zone where a salesperson can move from conversation to product proof without making the customer wait.",
    designPurpose: "Designed for assisted selling, consultation, and product demo workflows where focused presentation and polished one-to-one interaction drive outcomes.",
  },
  "retail-window-signage": {
    story: "A street-facing attraction point that has seconds to stop passing traffic and push a clear promotional message.",
    designPurpose: "Designed for retail window campaigns and digital signage where brightness, repeatable playback, and easy promotional refresh cycles are the core goal.",
  },
  "retail-experience": {
    story: "A flagship environment where storytelling, immersion, and hands-on demo moments are part of the brand itself.",
    designPurpose: "Designed for premium retail experiences, launches, and immersive consultation journeys where technology must support theatre as well as sales.",
  },
  "healthcare-consultation": {
    story: "A private clinical room where the display supports explanation and reassurance without turning the session into a technical event.",
    designPurpose: "Designed for patient consultations and clinician review spaces that need simple, low-friction visual support, privacy, and dependable daily operation.",
  },
  "healthcare-training": {
    story: "A staff learning room where repeated demonstrations and structured teaching need clear control and consistent source handling.",
    designPurpose: "Designed for healthcare education and workshop delivery where repeatability, instructor confidence, and supportable system behaviour are key.",
  },
  "healthcare-waiting": {
    story: "A front-of-house healthcare zone where messaging reduces uncertainty, guides flow, and supports the patient experience.",
    designPurpose: "Designed for waiting rooms and patient communication areas where signage clarity, operational simplicity, and always-on reliability matter.",
  },
  "healthcare-operations": {
    story: "A coordination room where multidisciplinary teams review cases, compare information, and make time-sensitive decisions together.",
    designPurpose: "Designed for clinical operations, MDT reviews, and planning meetings that require secure collaboration, multi-source confidence, and high room credibility.",
  },
  "government-meeting": {
    story: "A dependable civic workspace for routine department meetings where value, consistency, and ease of use matter every day.",
    designPurpose: "Designed for standard public-sector collaboration with clear presentation workflow, sensible cost control, and repeatable deployment standards.",
  },
  "government-briefing": {
    story: "A formal presentation room where officials need to deliver updates clearly, confidently, and without avoidable friction.",
    designPurpose: "Designed for structured briefings and leadership communications in government settings where presentation discipline and reliable control matter.",
  },
  "government-chamber": {
    story: "A public-facing chamber where the room must support proceedings with the right level of ceremony, confidence, and transparency.",
    designPurpose: "Designed for council and civic debate environments that need formal presentation quality, dependable routing, and polished public-session workflow.",
  },
  "government-eoc": {
    story: "A mission-critical room where teams coordinate live information under pressure and the system has to stay ahead of the situation.",
    designPurpose: "Designed for emergency response and command-style government operations where resilience, visibility, and rapid decision support are fundamental.",
  },
  "leisure-studio": {
    story: "A class-based space where instructors need media, microphones, and displays to work instantly as the session starts.",
    designPurpose: "Designed for fitness studios and leisure teaching spaces where dependable playback, easy operation, and strong participant experience matter.",
  },
  "leisure-lounge": {
    story: "A relaxed social area where the AV should enhance dwell time and premium feel without demanding staff attention.",
    designPurpose: "Designed for lounges and member spaces that blend casual entertainment with hospitality polish and simple everyday control.",
  },
  "leisure-event": {
    story: "A flexible leisure venue that swings between private hire, live events, and day-to-day operation on the same infrastructure.",
    designPurpose: "Designed for mixed-use event spaces where routing flexibility, fast changeovers, and commercially visible performance are required.",
  },
  "leisure-reception": {
    story: "A welcome area that sets the tone on arrival with promotions, wayfinding, and a clean first impression.",
    designPurpose: "Designed for leisure reception and arrival environments where messaging clarity, brand impact, and supportable signage workflows are central.",
  },
  "residential-cinema": {
    story: "A dedicated home cinema where the client is buying immersion, not just a display on a wall.",
    designPurpose: "Designed for premium residential movie rooms that prioritise performance, theatre-like experience, and a polished integrated result.",
  },
  "residential-lounge": {
    story: "A daily-use living space where entertainment should feel premium but never complicated for the family.",
    designPurpose: "Designed for residential lounge viewing and casual media use where intuitive control, neat integration, and lifestyle fit are more important than feature overload.",
  },
  "residential-multiroom": {
    story: "A whole-home distribution setup where shared content needs to move cleanly between zones without becoming a maintenance burden.",
    designPurpose: "Designed for multiroom residential media systems that need dependable distribution, scalable zone planning, and simple user operation.",
  },
  "residential-outdoor": {
    story: "A terrace or garden extension where AV adds atmosphere for hosting without pretending the space is an indoor cinema.",
    designPurpose: "Designed for outdoor residential viewing and entertaining where practical scope, weather-aware distribution, and lifestyle-led usability are the right goals.",
  },
};

const meetingTiers = makeTiers({
  bronze: {
    summary: "Functional room baseline with dependable switching and straightforward presentation.",
    positioning: "Best for cost-aware deployments where reliability matters more than advanced flexibility.",
    performance: "Provides a practical day-to-day presentation baseline.",
    commercialNote: "Lowest-cost viable route with limited enhancement features.",
    includedSystems: [
      "Core presentation switching",
      "Basic display routing",
      "Straightforward user workflow",
    ],
    uplift: [
      "Gets the room working without over-specifying.",
      "Good fit where the customer needs a dependable minimum system.",
    ],
  },
  silver: {
    summary: "Balanced room template with improved connectivity and smoother user workflow.",
    positioning: "Recommended default for most mainstream meeting and collaboration spaces.",
    performance: "Improves everyday usability and source flexibility.",
    commercialNote: "Best-value balance of usability and budget.",
    includedSystems: [
      "Improved switching flexibility",
      "Broader source support",
      "Cleaner user experience",
      "More adaptable room behaviour",
    ],
    uplift: [
      "Reduces friction for mixed user devices.",
      "Better fit for rooms used regularly by varied users.",
    ],
  },
  gold: {
    summary: "Premium room template with stronger performance, flexibility, and user polish.",
    positioning: "Best for executive, customer-facing, or high-usage spaces.",
    performance: "Highest confidence and strongest future-readiness.",
    commercialNote: "Premium room experience with broader long-term value.",
    includedSystems: [
      "Enhanced presentation flow",
      "Higher-end connectivity mix",
      "Stronger flexibility and workflow polish",
      "Greater long-term capability headroom",
    ],
    uplift: [
      "Improves room impression and user confidence.",
      "Best fit where presentation quality and workflow matter commercially.",
    ],
  },
});

const signageTiers = makeTiers({
  bronze: {
    summary: "Functional signage baseline for dependable display distribution.",
    positioning: "Best for straightforward display-led spaces with simple routing needs.",
    performance: "Covers core content delivery without advanced operational overhead.",
    commercialNote: "Cost-aware route for repeatable display deployments.",
    includedSystems: [
      "Basic display distribution",
      "Simple signal routing",
      "Dependable everyday operation",
    ],
    uplift: [
      "Good minimum viable display solution.",
      "Keeps deployment practical and repeatable.",
    ],
  },
  silver: {
    summary: "Improved signage template with better control and more flexible content handling.",
    positioning: "Recommended for mainstream commercial and customer-facing display environments.",
    performance: "Adds better operator flexibility and content flow.",
    commercialNote: "Best-value signage tier for most routine opportunities.",
    includedSystems: [
      "Improved routing flexibility",
      "Better content handling",
      "Stronger operator workflow",
      "More adaptable display management",
    ],
    uplift: [
      "Improves day-to-day operational confidence.",
      "Better fit where content demands vary more often.",
    ],
  },
  gold: {
    summary: "Premium signage template with stronger control, flexibility, and visible polish.",
    positioning: "Best for flagship, complex, or customer-critical display environments.",
    performance: "Highest confidence and strongest content flexibility.",
    commercialNote: "Premium option where display quality and flexibility drive value.",
    includedSystems: [
      "Higher-end display workflow",
      "Advanced routing and content flexibility",
      "Premium operational control expectations",
      "Greater scaling headroom",
    ],
    uplift: [
      "Best fit where the display environment is commercially visible.",
      "Adds performance headroom for more complex deployments.",
    ],
  },
});

const trainingTiers = makeTiers({
  bronze: {
    summary: "Functional training baseline with core presentation and delivery capability.",
    positioning: "Best for smaller or simpler instructor-led spaces.",
    performance: "Covers essential room behaviour without advanced flexibility.",
    commercialNote: "Entry-level route for cost-aware training environments.",
    includedSystems: [
      "Basic instructor presentation path",
      "Simple display distribution",
      "Practical operating baseline",
    ],
    uplift: [
      "Keeps the space functional without overspending.",
      "Good for straightforward delivery needs.",
    ],
  },
  silver: {
    summary: "Balanced training template with stronger source handling and smoother delivery workflow.",
    positioning: "Recommended default for most structured training spaces.",
    performance: "Improves trainer usability and room confidence.",
    commercialNote: "Best-value tier for mainstream training deployments.",
    includedSystems: [
      "Improved source flexibility",
      "Better room workflow",
      "More dependable daily use",
      "Cleaner operator handling",
    ],
    uplift: [
      "Improves trainer confidence and repeatability.",
      "Better for rooms used regularly by multiple presenters.",
    ],
  },
  gold: {
    summary: "Premium training template for stronger flexibility, performance, and presentation polish.",
    positioning: "Best for premium learning spaces or strategic training environments.",
    performance: "Highest confidence and strongest flexibility for advanced delivery.",
    commercialNote: "Premium choice where training quality or user experience is important.",
    includedSystems: [
      "Higher-end source and display handling",
      "Greater room flexibility",
      "Better support for more demanding sessions",
      "Premium operational polish",
    ],
    uplift: [
      "Adds headroom for mixed-use and complex sessions.",
      "Best fit where training quality directly affects commercial value.",
    ],
  },
});

export const MARKETS: MarketTemplate[] = [
  {
    id: "corporate",
    name: "Corporate",
    summary: "Meeting spaces, collaboration rooms, boardrooms, and presentation-led workplaces.",
    buyer: "Sales teams usually need a fast route to a functional meeting-room design.",
    accentRgb: "94,234,212",
    roomTypes: [
      room("corporate-huddle", "Huddle Room", "Small collaboration room for quick meetings and content sharing.", ["Small team meetings", "BYOD spaces", "Fast presentation rooms"], "bronze", meetingTiers, ["huddle", "small room", "byod", "meeting", "usb-c"], "collaboration", "cost", ["Apollo", "HDBaseT"], "/app/tools/room-wizard"),
      room("corporate-boardroom", "Boardroom", "Premium multi-source room with stronger switching and presentation demands.", ["Leadership meetings", "Client presentations", "Executive use"], "silver", meetingTiers, ["boardroom", "executive", "presentation", "multi-source"], "meeting", "balanced", ["Apollo", "Matrix", "HDBaseT"], "/app/tools/proposal"),
      room("corporate-training", "Training Room", "Instructor-led corporate room with repeatable delivery workflow.", ["Staff training", "Sales enablement", "Instructor-led sessions"], "silver", trainingTiers, ["training", "instructor", "learning", "presentation"], "training", "balanced", ["Matrix", "Apollo"], "/app/tools/room-wizard"),
      room("corporate-townhall", "Town Hall / All Hands", "Larger briefing and broadcast-style room for company updates and stakeholder sessions.", ["All-hands meetings", "Quarterly updates", "Leadership broadcasts"], "gold", trainingTiers, ["town hall", "all hands", "briefing", "broadcast"], "meeting", "premium", ["AVoIP", "Matrix", "Apollo"], "/app/tools/proposal"),
    ],
  },
  {
    id: "education",
    name: "Education",
    summary: "Teaching spaces, training areas, lecture delivery, and campus presentation environments.",
    buyer: "Education projects usually need robustness, clarity, and repeatable room standards.",
    accentRgb: "125,211,252",
    roomTypes: [
      room("education-classroom", "Classroom", "Daily teaching room with repeatable, practical AV workflow.", ["Daily teaching", "Front-of-room presentation", "Hybrid-ready teaching"], "bronze", trainingTiers, ["classroom", "teaching", "teacher", "student"], "training", "cost", ["HDBaseT", "Apollo"], "/app/tools/room-wizard"),
      room("education-training", "Training Lab", "Instructor-led practical room with stronger source and display needs.", ["Hands-on training", "Lecturer-led delivery", "Mixed device use"], "silver", trainingTiers, ["lab", "training", "mixed devices", "hands-on"], "training", "balanced", ["Matrix", "HDBaseT"], "/app/tools/room-wizard"),
      room("education-lecture", "Lecture Space", "Larger teaching space with stronger presentation confidence requirements.", ["Lecture delivery", "Campus presentations", "Formal instruction"], "silver", meetingTiers, ["lecture", "hall", "presentation", "audience"], "meeting", "balanced", ["Matrix", "AVoIP"], "/app/tools/proposal"),
      room("education-seminar", "Seminar Room", "Discussion-led teaching space for smaller cohorts needing balanced presentation and collaboration.", ["Seminars", "Tutor-led sessions", "Discussion rooms"], "silver", meetingTiers, ["seminar", "discussion", "small cohort"], "collaboration", "balanced", ["Apollo", "HDBaseT"], "/app/tools/room-wizard"),
    ],
  },
  {
    id: "hospitality",
    name: "Hospitality",
    summary: "Guest-facing spaces, lounges, bars, suites, and event-driven display environments.",
    buyer: "Hospitality designs need to stay intuitive while improving customer-facing experience.",
    accentRgb: "251,191,36",
    roomTypes: [
      room("hospitality-suite", "VIP Suite / Lounge", "Premium guest-facing room with polished presentation or entertainment needs.", ["VIP viewing", "Private hospitality", "Flexible guest entertainment"], "silver", meetingTiers, ["suite", "vip", "lounge", "guest"], "entertainment", "premium", ["Apollo", "Matrix"], "/app/tools/proposal"),
      room("hospitality-bar", "Sports Bar / Multi-Screen Zone", "Multi-display space requiring reliable routing and strong content distribution.", ["Sports viewing", "Live feed distribution", "Guest engagement"], "bronze", signageTiers, ["sports bar", "multi-screen", "distribution", "tv wall"], "signage", "balanced", ["AVoIP", "Matrix"], "/app/tools/video-wall"),
      room("hospitality-event", "Event Lounge", "Flexible guest event space with changing source and display requirements.", ["Events", "Private hire", "Flexible entertainment"], "silver", signageTiers, ["event", "lounge", "hire", "flexible"], "entertainment", "balanced", ["AVoIP", "Matrix"], "/app/tools/proposal"),
      room("hospitality-ballroom", "Ballroom / Banqueting Suite", "Divisible hospitality event room with staging, presentation, and changing layout demands.", ["Banqueting", "Weddings", "Conference events"], "gold", trainingTiers, ["ballroom", "banqueting", "divisible", "conference"], "training", "premium", ["AVoIP", "Matrix"], "/app/tools/proposal"),
    ],
  },
  {
    id: "retail",
    name: "Retail",
    summary: "Showroom, signage, demo, and customer-engagement spaces.",
    buyer: "Retail designs need clear visual impact, repeatability, and simple operational workflow.",
    accentRgb: "244,114,182",
    roomTypes: [
      room("retail-showroom", "Showroom Display Zone", "Customer-facing display environment built around product or content presentation.", ["Brand storytelling", "Product showcase", "Display-led engagement"], "bronze", signageTiers, ["showroom", "display", "engagement", "brand"], "signage", "balanced", ["AVoIP", "HDBaseT"], "/app/tools/catalog"),
      room("retail-consultation", "Demo / Consultation Zone", "Smaller customer interaction space with focused product presentation needs.", ["Product demos", "Assisted selling", "Small-format consultation"], "silver", meetingTiers, ["demo", "consultation", "assisted selling"], "meeting", "balanced", ["Apollo", "HDBaseT"], "/app/tools/room-wizard"),
      room("retail-window-signage", "Window / Signage Zone", "Display-led customer attraction space with repeatable playback needs.", ["Digital signage", "Promotional content", "Retail attraction"], "bronze", signageTiers, ["window", "signage", "promo", "attraction"], "signage", "cost", ["AVoIP", "Matrix"], "/app/tools/catalog"),
      room("retail-experience", "Experience Centre", "Immersive retail room combining storytelling, demos, and premium customer interaction.", ["Immersive demo", "Brand launch", "High-touch consultation"], "gold", meetingTiers, ["experience centre", "immersive", "flagship"], "entertainment", "premium", ["AVoIP", "Apollo", "Matrix"], "/app/tools/proposal"),
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare",
    summary: "Clinical consultation, admin collaboration, patient communication, and training spaces.",
    buyer: "Healthcare spaces need reliability, clarity, and low-friction daily operation.",
    accentRgb: "52,211,153",
    roomTypes: [
      room("healthcare-consultation", "Consultation Room", "Private patient-facing room with simple presentation and display needs.", ["Patient consultation", "Clinical review", "Private discussion"], "bronze", meetingTiers, ["consultation", "clinical", "private"], "meeting", "cost", ["HDBaseT", "Apollo"], "/app/tools/room-wizard"),
      room("healthcare-training", "Clinical Training Room", "Staff learning space with structured content delivery and instructor workflow.", ["Clinical training", "Internal learning", "Workshop delivery"], "silver", trainingTiers, ["training", "clinical", "staff"], "training", "balanced", ["Matrix", "Apollo"], "/app/tools/room-wizard"),
      room("healthcare-waiting", "Waiting Area Display Zone", "Customer-facing display area for information and engagement content.", ["Information display", "Queue communications", "Patient messaging"], "bronze", signageTiers, ["waiting area", "messaging", "display"], "signage", "cost", ["AVoIP", "HDBaseT"], "/app/tools/catalog"),
      room("healthcare-operations", "Operations / MDT Room", "Decision-making room for multidisciplinary review, planning, and secure collaboration.", ["MDT reviews", "Operations planning", "Clinical coordination"], "gold", meetingTiers, ["operations", "mdt", "review", "coordination"], "meeting", "premium", ["Matrix", "AVoIP", "Apollo"], "/app/tools/proposal"),
    ],
  },
  {
    id: "government",
    name: "Government",
    summary: "Council, civic, briefing, and public-sector meeting environments.",
    buyer: "Public-sector projects often need dependable workflow, repeatability, and sensible value.",
    accentRgb: "96,165,250",
    roomTypes: [
      room("government-meeting", "Meeting Room", "Standard public-sector collaboration room with clear day-to-day workflow needs.", ["Department meetings", "Routine presentations", "Internal collaboration"], "bronze", meetingTiers, ["government", "meeting", "department"], "meeting", "cost", ["HDBaseT", "Apollo"], "/app/tools/room-wizard"),
      room("government-briefing", "Briefing Room", "Formal room with stronger presenter confidence and structured delivery.", ["Briefings", "Leadership updates", "Structured presentations"], "silver", meetingTiers, ["briefing", "formal", "presentation"], "meeting", "balanced", ["Matrix", "Apollo"], "/app/tools/proposal"),
      room("government-chamber", "Council Chamber", "Formal civic environment where room confidence and workflow polish matter.", ["Council meetings", "Public proceedings", "Formal presentations"], "silver", meetingTiers, ["council", "chamber", "public"], "meeting", "premium", ["Matrix", "AVoIP"], "/app/tools/proposal"),
      room("government-eoc", "Emergency Operations Room", "Critical-response coordination room with resilient briefing and decision support expectations.", ["Emergency response", "Crisis coordination", "Command briefings"], "gold", trainingTiers, ["eoc", "operations", "command", "response"], "meeting", "premium", ["AVoIP", "Matrix"], "/app/tools/proposal"),
    ],
  },
  {
    id: "leisure",
    name: "Leisure",
    summary: "Fitness, club, member, and venue spaces needing customer-facing AV impact.",
    buyer: "Leisure projects usually need simple operation with strong visible user impact.",
    accentRgb: "251,146,60",
    roomTypes: [
      room("leisure-studio", "Gym / Studio", "Instructor-led or content-led room with dependable playback and presentation needs.", ["Fitness sessions", "Studio classes", "Instructional playback"], "bronze", signageTiers, ["gym", "studio", "fitness", "playback"], "entertainment", "cost", ["HDBaseT", "AVoIP"], "/app/tools/catalog"),
      room("leisure-lounge", "Member Lounge", "Relaxed customer-facing space with mixed display and presentation requirements.", ["Member viewing", "Casual entertainment", "Hospitality crossover"], "silver", signageTiers, ["member lounge", "casual", "viewing"], "entertainment", "balanced", ["AVoIP", "Apollo"], "/app/tools/proposal"),
      room("leisure-event", "Venue Event Space", "Flexible event room requiring stronger routing and changing source behaviour.", ["Events", "Private hire", "Mixed-use venue operation"], "silver", trainingTiers, ["venue", "event", "mixed-use"], "entertainment", "balanced", ["AVoIP", "Matrix"], "/app/tools/proposal"),
      room("leisure-reception", "Reception / Arrival Zone", "Front-of-house welcome space with signage, messaging, and brand-impact requirements.", ["Arrival messaging", "Membership promotions", "Wayfinding"], "bronze", signageTiers, ["reception", "arrival", "wayfinding"], "signage", "cost", ["HDBaseT", "AVoIP"], "/app/tools/catalog"),
    ],
  },
  {
    id: "residential",
    name: "Residential",
    summary: "High-end home cinema, lounge, multiroom, and lifestyle AV environments.",
    buyer: "Residential opportunities need polish, simplicity, and clear lifestyle-led value.",
    accentRgb: "168,85,247",
    roomTypes: [
      room("residential-cinema", "Cinema Room", "Dedicated entertainment environment where performance and experience matter.", ["Movie viewing", "Premium entertainment", "Lifestyle AV"], "silver", meetingTiers, ["cinema", "home theater", "entertainment"], "entertainment", "premium", ["Matrix", "HDBaseT"], "/app/tools/proposal"),
      room("residential-lounge", "Smart Lounge", "Daily-use home living space with simple premium AV expectations.", ["Daily TV", "Casual entertainment", "Lifestyle control"], "bronze", meetingTiers, ["lounge", "smart home", "tv"], "entertainment", "balanced", ["Apollo", "HDBaseT"], "/app/tools/room-wizard"),
      room("residential-multiroom", "Multiroom Media Zone", "Flexible zone requiring dependable distribution and simple operation.", ["Distributed media", "Whole-home zones", "Shared content use"], "silver", signageTiers, ["multiroom", "distributed media", "zones"], "signage", "premium", ["AVoIP", "Matrix"], "/app/tools/catalog"),
      room("residential-outdoor", "Outdoor Entertainment Zone", "Garden or terrace space needing credible AV distribution with practical system scope.", ["Outdoor viewing", "Entertaining", "Lifestyle extension"], "bronze", signageTiers, ["outdoor", "garden", "terrace"], "entertainment", "balanced", ["HDBaseT", "AVoIP"], "/app/tools/proposal"),
    ],
  },
];

export const USE_CASE_GROUPS: Array<{ id: "all" | UseCaseGroup; label: string }> = [
  { id: "all", label: "All use cases" },
  { id: "meeting", label: "Meeting" },
  { id: "training", label: "Training" },
  { id: "signage", label: "Signage" },
  { id: "entertainment", label: "Entertainment" },
  { id: "collaboration", label: "Collaboration" },
];

export const BUDGET_BIASES: Array<{ id: "all" | BudgetBias; label: string }> = [
  { id: "all", label: "All budgets" },
  { id: "cost", label: "Cost-led" },
  { id: "balanced", label: "Balanced" },
  { id: "premium", label: "Premium" },
];
