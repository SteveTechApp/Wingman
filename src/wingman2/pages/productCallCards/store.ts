import { salesConversationToneOptions } from "../../lib/salesConversationTone";

export type ProductCallContext = {
  productFamily?: string;
  family?: string;
  category?: string;
  technology?: string;
  selectedTechnology?: string;
  selectedCategory?: string;
  selectedFamily?: string;
  selectedProductPath?: string;
  productPath?: string;
  technicalRequirement?: string;
  audience?: string;
  callMode?: string;
  application?: string;
  roomType?: string;
  customerPriority?: string;
  salespersonConfidence?: string;
  selectedSku?: string;
  selectedName?: string;
  wordingMode?: string;
  environment?: string;
  knownRequirement?: string;
};

export type ProductCallProduct = {
  sku: string;
  name: string;
  category: string;
  family: string;
  tags: string[];
  confidence: "low" | "medium" | "high";
  bestFor: string;
  avoidIf: string;
  whatItIs: string;
  whatItDoes: string;
  whyItMatters: string;
  goodFit: string[];
  conversationStarters: string[];
  salesAngles: string[];
  objections: string[];
  askNext: string[];
  checks: string[];
  worthMentioning: string[];
  avoidSaying: string[];
  followUp: string;
};

const STORE_KEY = "wingman.productCallCards.context";

export const PRODUCT_CALL_CARDS_BASE = "/wingman/product-call-cards";
export const PRODUCT_CALL_CARDS_ROUTE_EVENT = "wingman-product-call-cards-route";
export const PRODUCT_CALL_CARDS_CONTEXT_EVENT = "wingman-product-call-cards-context";

export const PRODUCT_CALL_AUDIENCE_OPTIONS = [
  ...salesConversationToneOptions.map((option) => option.label),
  "Internal sales / pre-sales"
];

export const PRODUCT_CALL_PRODUCTS: ProductCallProduct[] = [
  {
    sku: "APO-VX20-UC",
    name: "Apollo TM Video Bar & Switcher",
    category: "UC / meeting-room audio",
    family: "Apollo",
    tags: ["UC", "Audio", "USB", "BYOD"],
    confidence: "medium",
    bestFor: "Small meeting rooms, BYOD UC spaces and straightforward conferencing rooms.",
    avoidIf: "Avoid positioning for large-room DSP audio design, lecture-theatre pickup or complex multi-camera production.",
    whatItIs: "A compact UC video bar and switching solution for smaller meeting spaces.",
    whatItDoes: "It helps users join calls, present content and use room conferencing devices without building the room from several separate audio, camera and USB components.",
    whyItMatters: "It reduces room complexity and helps the salesperson move the conversation beyond a display or switcher into the complete meeting-room workflow.",
    goodFit: [
      "Small huddle and meeting rooms.",
      "BYOD UC spaces.",
      "Rooms where camera, microphone, speaker and USB handling need to be discussed together.",
      "Customers who want fewer separate products in the room."
    ],
    conversationStarters: [
      "Are users joining calls from their own laptops or from a fixed room PC?",
      "Is the room expected to handle both presentation and video calls?",
      "How many people normally sit around the table?",
      "Is the customer trying to avoid separate camera, microphone and speaker products?"
    ],
    salesAngles: [
      "Position as a simple small-room meeting workflow, not just as an audio product.",
      "Use it to attach audio and UC discussion to display or switching opportunities.",
      "Frame the value around user experience, fewer devices and simpler support."
    ],
    objections: [
      "If the customer says they only need video switching, confirm whether they also need camera, microphone, speaker and USB room device handling.",
      "If the customer already has room audio, confirm pickup distance, call quality and whether the existing audio path is suitable."
    ],
    askNext: [
      "How many people are normally in the room?",
      "Is this for Teams, Zoom, BYOD calls or mixed use?",
      "Will users bring their own laptop?",
      "Is there already room audio?",
      "What pickup distance is needed?"
    ],
    checks: [
      "Confirm room size.",
      "Confirm USB host path.",
      "Confirm audio pickup expectations.",
      "Confirm camera and framing expectations.",
      "Confirm whether a larger APO audio solution is required.",
      "Confirm room acoustics, room size and user behaviour."
    ],
    worthMentioning: [
      "Useful for smaller UC/BYOD rooms where microphone and speaker handling need to be considered.",
      "Helps attach audio to presentation and camera opportunities.",
      "Keeps the discussion focused on the complete meeting workflow, not only the display or switcher."
    ],
    avoidSaying: [
      "Do not position as a large-room audio design product.",
      "Do not replace a specified DSP system casually.",
      "Do not ignore microphone pickup distance.",
      "Do not claim it is suitable for lecture theatres or large rooms without checking the space."
    ],
    followUp: "This looks like a smaller UC or BYOD meeting-room requirement. APO-VX20-UC may be relevant if the room needs a compact USB audio and video path, but we should confirm room size, participant count, host device, camera/framing expectations and whether a larger audio solution is required."
  },
  {
    sku: "SW-620-TX-W",
    name: "Presentation Switcher with Wireless",
    category: "Presentation switching",
    family: "Switcher",
    tags: ["UC", "USB-C", "Wireless", "Switching"],
    confidence: "medium",
    bestFor: "Meeting rooms and classrooms needing source switching plus wireless presentation.",
    avoidIf: "Avoid where the requirement is large distributed video routing rather than room-level presentation switching.",
    whatItIs: "A room presentation switcher for spaces that need wired and wireless source options.",
    whatItDoes: "It gives users a practical way to connect common room sources and present to the display.",
    whyItMatters: "It helps the salesperson move from a simple display sale into the real source-selection workflow in the room.",
    goodFit: ["Meeting rooms.", "Classrooms.", "BYOD presentation spaces.", "Rooms needing wireless presentation attachment."],
    conversationStarters: ["How many source devices are in the room?", "Is wireless presentation required?", "Is USB-C part of the customer expectation?", "Does the room need simple local switching?"],
    salesAngles: ["Position around flexible room input choice.", "Use when the customer needs more than one way to present.", "Attach to display opportunities where source connection is unclear."],
    objections: ["If the customer only asks for HDMI, check whether USB-C or wireless would improve usability."],
    askNext: ["How many wired inputs are required?", "Is wireless presentation required?", "Is USB-C required?", "What display or projector is being used?"],
    checks: ["Confirm input count.", "Confirm output requirement.", "Confirm wireless expectations.", "Confirm control requirement."],
    worthMentioning: ["Useful when the display conversation needs a practical source connection answer."],
    avoidSaying: ["Do not position as a full building-wide distribution platform."],
    followUp: "This looks like a room-level presentation switching requirement. SW-620-TX-W may be relevant where the customer needs wired and wireless source options, but we should confirm input count, USB-C need, wireless expectations and display connection."
  },
  {
    sku: "SW-640-TX-W",
    name: "Advanced Presentation Switcher with Wireless",
    category: "Presentation switching",
    family: "Switcher",
    tags: ["UC", "USB-C", "Wireless", "Switching"],
    confidence: "medium",
    bestFor: "Rooms needing more input flexibility and a stronger presentation switching discussion.",
    avoidIf: "Avoid where the customer only needs a very small, single-source room.",
    whatItIs: "A higher-capability presentation switcher for rooms with multiple presentation sources.",
    whatItDoes: "It supports broader source connection and presentation workflows for more capable rooms.",
    whyItMatters: "It helps step the conversation up where the room is beyond a basic huddle space.",
    goodFit: ["Boardrooms.", "Training rooms.", "Meeting rooms with several source types.", "Rooms needing stronger switching capability."],
    conversationStarters: ["How many source devices need to connect?", "Are there wired and wireless users?", "Is dual-output behaviour required?", "Does the room need a more capable presentation layer?"],
    salesAngles: ["Position as the stronger switcher option where the room is above basic.", "Use to avoid underspecifying a multi-source room."],
    objections: ["If the customer thinks it is too much, compare against source count and expected user workflow."],
    askNext: ["How many sources are required?", "What outputs are required?", "Is wireless required?", "Will the room host BYOD users?"],
    checks: ["Confirm input count.", "Confirm output behaviour.", "Confirm UC/BYOD needs.", "Confirm control expectations."],
    worthMentioning: ["Useful where a lower switcher may not leave enough connection headroom."],
    avoidSaying: ["Do not position purely by price; position by workflow and source count."],
    followUp: "This looks like a stronger presentation switching requirement. SW-640-TX-W may be relevant where the customer needs multiple room inputs, wireless presentation and more capability than a basic huddle-room switcher."
  },
  {
    sku: "MX-1007-HYB",
    name: "Hybrid Presentation Matrix",
    category: "Hybrid matrix / education",
    family: "Matrix",
    tags: ["Matrix", "HDBaseT", "USB", "Education"],
    confidence: "medium",
    bestFor: "Teaching rooms and meeting rooms needing a hybrid local switching, extension and USB workflow.",
    avoidIf: "Avoid where the requirement is only a small simple switcher or a large AVoIP estate.",
    whatItIs: "A hybrid presentation matrix for more capable teaching and meeting-room designs.",
    whatItDoes: "It brings together room switching, extension and USB-style workflow discussion in one product conversation.",
    whyItMatters: "It gives salespeople a stronger room-solution story where simple switching is not enough.",
    goodFit: ["Teaching rooms.", "Training rooms.", "Hybrid meeting spaces.", "Rooms needing more integrated presentation routing."],
    conversationStarters: ["Is this a teaching room or standard meeting room?", "Do sources need to be local and remote?", "Is USB part of the room workflow?", "Is the room likely to grow?"],
    salesAngles: ["Position as a fuller room system discussion.", "Use where the customer needs more than a small presentation switcher."],
    objections: ["If it feels too complex, check whether the room really needs extension, matrixing and USB workflow support."],
    askNext: ["How many inputs and outputs are required?", "Where are the sources located?", "Is USB required?", "Is audio part of the room design?"],
    checks: ["Confirm IO count.", "Confirm display locations.", "Confirm USB requirements.", "Confirm rack and cabling plan."],
    worthMentioning: ["Useful where a room needs a more complete signal-management answer."],
    avoidSaying: ["Do not position as simple plug-and-play unless the room design has been checked."],
    followUp: "This appears to be a more capable room signal-management requirement. MX-1007-HYB may be relevant where the room needs hybrid presentation routing, extension and USB workflow support."
  },
  {
    sku: "MX-0408-EDU",
    name: "Education Presentation Matrix",
    category: "Education matrix",
    family: "Matrix",
    tags: ["Matrix", "Education", "HDBaseT"],
    confidence: "medium",
    bestFor: "Classrooms and teaching rooms needing structured presentation routing.",
    avoidIf: "Avoid for simple single-display rooms where a smaller switcher would be enough.",
    whatItIs: "A presentation matrix aimed at education-style room requirements.",
    whatItDoes: "It supports structured room routing for teaching spaces with multiple source and display requirements.",
    whyItMatters: "It lets the salesperson talk about the full teaching-room signal path rather than only the display.",
    goodFit: ["Classrooms.", "Teaching rooms.", "Training rooms.", "Rooms with multiple display paths."],
    conversationStarters: ["How many displays are in the room?", "How many teaching sources are required?", "Are there confidence displays?", "Is the room standardised across multiple spaces?"],
    salesAngles: ["Position around repeatable teaching-room design.", "Use in education conversations where display-only selling misses the full room workflow."],
    objections: ["If the room is simple, check whether a smaller switcher is more suitable."],
    askNext: ["How many sources?", "How many displays?", "Is there a confidence monitor?", "Is the design repeatable across multiple rooms?"],
    checks: ["Confirm IO count.", "Confirm room type.", "Confirm display roles.", "Confirm source locations."],
    worthMentioning: ["Strong fit for education conversations where standardisation matters."],
    avoidSaying: ["Do not force a matrix where a simple switcher is enough."],
    followUp: "This looks like an education presentation-routing requirement. MX-0408-EDU may be relevant if the room needs structured source and display routing rather than a simple one-output presentation switch."
  },
  {
    sku: "NHD-0401-MV",
    name: "4 Input Multiview Processor",
    category: "Multiview",
    family: "NetworkHD",
    tags: ["Multiview", "AVoIP", "Video wall"],
    confidence: "medium",
    bestFor: "Applications needing several sources shown together on one output.",
    avoidIf: "Avoid describing this as a matrix output product; multiview means multiple sources on one canvas.",
    whatItIs: "A multiview product for combining multiple sources into a single output canvas.",
    whatItDoes: "It allows more than one source to be shown at the same time on one display or downstream processor.",
    whyItMatters: "It gives salespeople a specific answer when the customer wants a single display to show several sources together.",
    goodFit: ["Control rooms.", "Sports bars.", "Signage displays.", "LED processor feeds.", "LFDs needing combined source views."],
    conversationStarters: ["Do they need to see multiple sources at once?", "Is this feeding an LFD or LED processor?", "How many sources need to be visible together?", "Is it a true multiview requirement?"],
    salesAngles: ["Clarify multiview as simultaneous source display, not simply multiple outputs.", "Use where customers ask for source monitoring or combined layouts."],
    objections: ["If the customer expects matrix switching, clarify whether they need switching, multiview, or both."],
    askNext: ["How many sources need to appear at once?", "What is the destination display or processor?", "Is layout control required?", "Is this standalone or part of a wider NHD design?"],
    checks: ["Confirm number of visible sources.", "Confirm output destination.", "Confirm layout expectations.", "Confirm whether AVoIP integration is needed."],
    worthMentioning: ["Useful as a standalone multiview answer or as part of a NetworkHD discussion."],
    avoidSaying: ["Do not confuse multiview with simply having multiple outputs."],
    followUp: "This appears to be a multiview requirement. NHD-0401-MV may be relevant if the customer needs several sources visible together on one output, but we should confirm source count, layout expectations and the destination display or processor."
  },
  {
    sku: "NHD-120-RX",
    name: "NetworkHD 100 Series Receiver",
    category: "AVoIP endpoint",
    family: "NetworkHD 100",
    tags: ["AVoIP", "Endpoint", "Receiver"],
    confidence: "medium",
    bestFor: "NetworkHD 100-series AVoIP display endpoints.",
    avoidIf: "Avoid mixing with other NetworkHD series unless the design uses separate VLANs and the correct architecture.",
    whatItIs: "A receiver endpoint in the NetworkHD 100-series AVoIP ecosystem.",
    whatItDoes: "It receives compatible NetworkHD 100-series streams and outputs to a display.",
    whyItMatters: "It lets the salesperson discuss scalable display-side AVoIP routing rather than fixed matrix output limits.",
    goodFit: ["Display endpoints.", "Distributed AV rooms.", "Hospitality displays.", "Campus-style routing with the correct network design."],
    conversationStarters: ["How many displays are required?", "Are sources and displays spread across rooms?", "Is there a suitable network or VLAN plan?", "Is this definitely a 100-series design?"],
    salesAngles: ["Position when the output side needs scalable AVoIP distribution.", "Use when matrix output count or distance becomes restrictive."],
    objections: ["If the customer asks whether it works with other NHD series, confirm that series interoperability must be handled carefully and not assumed."],
    askNext: ["How many displays?", "Which NetworkHD series is being used?", "Is an NHD controller included?", "What network infrastructure is available?"],
    checks: ["Confirm series compatibility.", "Confirm controller requirement.", "Confirm VLAN/network design.", "Confirm display resolution expectations."],
    worthMentioning: ["Useful in scalable AVoIP discussions where display endpoints are distributed."],
    avoidSaying: ["Do not imply cross-series interoperability without checking the design."],
    followUp: "This looks like a NetworkHD 100-series endpoint requirement. NHD-120-RX may be relevant for display-side decoding, but we must confirm the NetworkHD series, controller requirement and network/VLAN design."
  },
  {
    sku: "NHD-600-TRX",
    name: "NetworkHD 600 Series Transceiver",
    category: "AVoIP endpoint",
    family: "NetworkHD 600",
    tags: ["AVoIP", "10GbE", "SDVoE", "Endpoint"],
    confidence: "medium",
    bestFor: "High-performance 10GbE SDVoE AVoIP systems.",
    avoidIf: "Avoid where the network cannot support a 10GbE SDVoE design.",
    whatItIs: "A NetworkHD 600-series transceiver for high-performance AVoIP designs.",
    whatItDoes: "It can act within a 600-series AVoIP system where 10GbE SDVoE performance and flexible endpoint behaviour are required.",
    whyItMatters: "It supports stronger system conversations where image quality, latency and endpoint flexibility are key.",
    goodFit: ["High-performance AVoIP.", "Larger routed systems.", "Premium meeting spaces.", "Flexible encoder/decoder endpoint designs."],
    conversationStarters: ["Is the network 10GbE-ready?", "Is this a 600-series design?", "Is low latency important?", "Do endpoints need transceiver flexibility?"],
    salesAngles: ["Position as a high-performance AVoIP option when the infrastructure and requirement justify it."],
    objections: ["If the customer only needs a simple room matrix, check whether 600-series AVoIP is over-specified."],
    askNext: ["Is 10GbE infrastructure available?", "How many endpoints are required?", "Is this definitely a 600-series architecture?", "Is an NHD controller included?"],
    checks: ["Confirm network capability.", "Confirm controller requirement.", "Confirm endpoint count.", "Confirm series compatibility."],
    worthMentioning: ["Useful where high-performance AVoIP is part of the design story."],
    avoidSaying: ["Do not position without checking network infrastructure."],
    followUp: "This looks like a high-performance AVoIP requirement. NHD-600-TRX may be relevant where a 10GbE SDVoE NetworkHD 600-series architecture is suitable, but we should confirm infrastructure, controller and endpoint requirements."
  }
];


export type ProductCallModeProfile = {
  id: string;
  label: string;
  purpose: string;
  tone: string;
  emphasis: string;
};

export type ModeAwareWording = {
  headline: string;
  whatItIs: string;
  whatItDoes: string;
  whyItMatters: string;
  salespersonAngle: string;
  customerBenefit: string;
};

export const PRODUCT_CALL_MODE_PROFILES: ProductCallModeProfile[] = [
  {
    id: "sell-benefits",
    label: "Sell this product",
    purpose: "Give the salesperson confident, benefit-led wording for a known SKU.",
    tone: "Benefit-led, practical and commercially useful.",
    emphasis: "Customer value, room outcome and why the product is worth discussing."
  },
  {
    id: "dealer-enablement",
    label: "Dealer enablement",
    purpose: "Help a dealer or distributor salesperson attach the product to a live opportunity.",
    tone: "Commercial, concise and opportunity-led.",
    emphasis: "When to bring it up, what it helps sell and how it strengthens the conversation."
  },
  {
    id: "consultant-technical",
    label: "Consultant / technical",
    purpose: "Position the product for a more technical audience.",
    tone: "Specific, cautious and validation-led.",
    emphasis: "Application fit, design checks, limits and integration considerations."
  },
  {
    id: "end-user-outcome",
    label: "End-user benefits",
    purpose: "Explain the product in outcome language without unnecessary AV jargon.",
    tone: "Plain English, user-focused and benefit-led.",
    emphasis: "Ease of use, room experience, reliability and reduced complexity."
  },
  {
    id: "competitor-replacement",
    label: "Competitor replacement",
    purpose: "Frame the product as an alternative to something already being considered.",
    tone: "Balanced, evidence-led and gap-aware.",
    emphasis: "Similar job, important differences, checks before proposing as an alternative."
  },
  {
    id: "discovery-support",
    label: "Discovery support",
    purpose: "Ask only questions that change product fit, wording or next action.",
    tone: "Question-led, selective and practical.",
    emphasis: "Missing information that actually affects the recommendation."
  }
];

function normaliseMode(value?: string) {
  return String(value || "").trim().toLowerCase();
}

export function normaliseAudience(value?: string): string {
  const raw = String(value || "").trim();
  const audience = raw.toLowerCase();

  if (!raw) return "the customer";

  const canonicalTone = salesConversationToneOptions.find((option) => {
    return option.id === audience || option.label.toLowerCase() === audience;
  });

  if (canonicalTone) return canonicalTone.label;
  if (audience.includes("internal") || audience.includes("pre-sales") || audience.includes("presales")) return "Internal sales / pre-sales";
  if (audience.includes("end user") || audience === "user" || audience.includes("customer user")) return "End user";
  if (audience.includes("consultant") || audience.includes("designer") || audience.includes("specifier") || audience.includes("technical")) return "Technical consultant";
  if (
    audience.includes("dealer") ||
    audience.includes("reseller") ||
    audience.includes("installer") ||
    audience.includes("integrator") ||
    audience.includes("distributor") ||
    audience.includes("partner") ||
    audience.includes("trade")
  ) {
    return "Dealer / installer";
  }

  return raw;
}

function audienceAngle(value?: string): string {
  const audience = normaliseAudience(value).toLowerCase();

  if (audience.includes("end user")) {
    return "Keep it outcome-led and easy to repeat: what people in the room can do, what becomes simpler, and what still needs checking.";
  }

  if (audience.includes("technical consultant")) {
    return "Use defensible design language: role in the signal path, assumptions, limits and evidence before naming it as the selected product.";
  }

  if (audience.includes("dealer") || audience.includes("installer")) {
    return "Keep it commercially useful for the dealer or installer: clear reason to discuss it, simple qualification, practical install checks and no unsupported claims.";
  }

  if (audience.includes("internal")) {
    return "Capture the missing facts, caveats and escalation points so pre-sales can validate the recommendation quickly.";
  }

  return "Keep it commercially useful for a dealer or reseller: clear reason to discuss it, simple qualification and no unsupported claims.";
}

function audienceLead(value?: string): string {
  const audience = normaliseAudience(value);
  return `For ${audience.toLowerCase()}, `;
}

export function getCallModeProfile(mode?: string): ProductCallModeProfile {
  const requested = normaliseMode(mode);
  const found = PRODUCT_CALL_MODE_PROFILES.find((profile) => {
    return normaliseMode(profile.id) === requested || normaliseMode(profile.label) === requested;
  });

  if (found) {
    return found;
  }

  return PRODUCT_CALL_MODE_PROFILES[0];
}

export function getModeAwareWording(product: ProductCallProduct, context: ProductCallContext): ModeAwareWording {
  const profile = getCallModeProfile(context.wordingMode);
  const environment = context.environment || context.application || "this room";
  const audience = context.audience || "the customer";
  const audienceGuidance = audienceAngle(audience);
  const lead = audienceLead(audience);
  const requirement = context.knownRequirement || product.bestFor;
  const priorityText = context.customerPriority ? ` The known customer priority is ${context.customerPriority.toLowerCase()}.` : "";

  if (profile.id === "dealer-enablement") {
    return {
      headline: `${lead}${product.sku} gives the salesperson a practical way to turn a ${environment.toLowerCase()} discussion into a stronger WyreStorm solution conversation.`,
      whatItIs: `${product.whatItIs} For a dealer conversation, keep the description short and connect it directly to the opportunity.`,
      whatItDoes: `${product.whatItDoes} The useful sales point is that it helps join up the product, room workflow and customer need.`,
      whyItMatters: `${product.whyItMatters} It gives the dealer a reason to discuss the wider room requirement instead of only responding to a single box request. ${audienceGuidance}${priorityText}`,
      salespersonAngle: `Use it as an attachment and confidence-building conversation: “This may be the WyreStorm option to discuss if the customer needs ${requirement.toLowerCase()}.”`,
      customerBenefit: `The customer gets a clearer room outcome and the dealer has a stronger reason to stay involved in the design discussion.`
    };
  }

  if (profile.id === "consultant-technical") {
    return {
      headline: `${lead}${product.sku} should be positioned by application fit, system role and design limits, not by generic product claims.`,
      whatItIs: `${product.whatItIs} In a consultant or technical discussion, define exactly where it sits in the signal path or room workflow.`,
      whatItDoes: `${product.whatItDoes} Confirm the host path, signal path, control expectation, room size and any integration limits before treating it as the selected product.`,
      whyItMatters: `It matters because the right technical fit reduces design risk, avoids over-claiming and makes the recommendation easier to defend. ${audienceGuidance}${priorityText}`,
      salespersonAngle: `Lead with suitability: “This is the WyreStorm option I would check for this application, subject to confirming the room and integration details.”`,
      customerBenefit: `The customer gets a product conversation grounded in real system fit rather than a generic feature list.`
    };
  }

  if (profile.id === "end-user-outcome") {
    return {
      headline: `${lead}${product.sku} should be explained around what it helps people do in ${environment.toLowerCase()}, not around internal AV terminology.`,
      whatItIs: `It is a WyreStorm product designed to support ${requirement.toLowerCase()}. Keep the explanation focused on the room experience.`,
      whatItDoes: `${product.whatItDoes} Describe this in terms of what users can do more easily, not just the technical function.`,
      whyItMatters: `It matters because the room needs to be simple enough for everyday users while still giving the installer a sensible, supportable product choice. ${audienceGuidance}${priorityText}`,
      salespersonAngle: `Use plain wording: “This is worth discussing because it helps make the room easier to use and easier to support.”`,
      customerBenefit: `The customer hears how the product improves the room, reduces friction and supports the way people actually work.`
    };
  }

  if (profile.id === "competitor-replacement") {
    return {
      headline: `${lead}${product.sku} can be discussed as a possible alternative, but only after checking whether it does the same job in the customer's actual system.`,
      whatItIs: `${product.whatItIs} In replacement mode, compare role, technology type, inputs, outputs, control, power and application fit.`,
      whatItDoes: `${product.whatItDoes} Do not imply a direct match until the important system requirements are confirmed.`,
      whyItMatters: `It matters because competitor comparisons are rarely identical. The useful result is whether this is a good match, partial match or no match for the job. ${audienceGuidance}${priorityText}`,
      salespersonAngle: `Use balanced wording: “This may be a viable WyreStorm option, but we should compare the required connections, control features and room workflow before proposing it.”`,
      customerBenefit: `The customer gets a realistic comparison rather than a forced like-for-like claim.`
    };
  }

  if (profile.id === "discovery-support") {
    return {
      headline: `${lead}${product.sku} can be discussed now, but only ask extra questions where the answer changes product fit, wording or next action.`,
      whatItIs: `${product.whatItIs} Do not slow the conversation with unnecessary setup questions.`,
      whatItDoes: `${product.whatItDoes} Use the product as the anchor, then ask only the minimum useful questions.`,
      whyItMatters: `It matters because the salesperson may not know all the room details yet. Wingman should still provide helpful language without forcing a full discovery form. ${audienceGuidance}${priorityText}`,
      salespersonAngle: `Use selective discovery: “I can talk about this product now, but these few checks will confirm whether it is the right fit.”`,
      customerBenefit: `The customer gets immediate useful guidance, with only relevant follow-up questions.`
    };
  }

  return {
    headline: `${lead}${product.sku} is the WyreStorm product to discuss when the requirement is ${requirement.toLowerCase()}.`,
    whatItIs: `${product.whatItIs} Keep the first explanation simple and connect it directly to ${environment.toLowerCase()}.`,
    whatItDoes: `${product.whatItDoes} Focus on the practical room workflow rather than listing every feature.`,
    whyItMatters: `${product.whyItMatters} This helps the salesperson sell the benefit, not just name the product. ${audienceGuidance}${priorityText}`,
    salespersonAngle: `Lead with the customer problem: “This is relevant because it helps solve the room workflow, not just because it is another SKU.”`,
    customerBenefit: `The customer gets a clearer reason to consider the product and a simpler explanation of where it fits.`
  };
}
export function loadCallContext(): ProductCallContext {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as ProductCallContext;
    return {
      ...parsed,
      audience: parsed.audience ? normaliseAudience(parsed.audience) : undefined,
    };
  } catch {
    return {};
  }
}

export function saveCallContext(patch: Partial<ProductCallContext>): ProductCallContext {
  const current = loadCallContext();
  const normalisedPatch: Partial<ProductCallContext> = {
    ...patch,
    audience: patch.audience ? normaliseAudience(patch.audience) : patch.audience,
  };
  const next = { ...current, ...normalisedPatch };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PRODUCT_CALL_CARDS_CONTEXT_EVENT));
  }

  return next;
}

export function findProduct(sku?: string): ProductCallProduct {
  const normalisedSku = String(sku || "").toUpperCase();
  const found = PRODUCT_CALL_PRODUCTS.find((product) => product.sku.toUpperCase() === normalisedSku);

  if (found) {
    return found;
  }

  const context = loadCallContext();
  const selected = PRODUCT_CALL_PRODUCTS.find((product) => product.sku === context.selectedSku);

  if (selected) {
    return selected;
  }

  return PRODUCT_CALL_PRODUCTS[0];
}

export function navigateCallCardPage(path: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  const nextPath = path.startsWith(PRODUCT_CALL_CARDS_BASE)
    ? path
    : `${PRODUCT_CALL_CARDS_BASE}${normalisedPath}`;
  window.history.pushState({}, "", nextPath);
  window.dispatchEvent(new CustomEvent(PRODUCT_CALL_CARDS_ROUTE_EVENT));
}

export type ProductCallLanguageLevel = "Simple" | "Normal" | "Advanced";

export type ProductCallLanguageProfile = {
  level: ProductCallLanguageLevel;
  label: string;
  tone: string;
  instruction: string;
};

export const PRODUCT_CALL_LANGUAGE_LEVELS: ProductCallLanguageProfile[] = [
  {
    level: "Simple",
    label: "Simple",
    tone: "Plain, benefit-led and easy to say to a non-technical customer.",
    instruction: "Use short sentences, explain the customer benefit first, and avoid unnecessary acronyms."
  },
  {
    level: "Normal",
    label: "Normal",
    tone: "Balanced commercial and technical language for normal sales conversations.",
    instruction: "Use clear product language with some technical terms where they help explain the value."
  },
  {
    level: "Advanced",
    label: "Advanced",
    tone: "Technical, precise and suitable for experienced AV, consultant or integrator conversations.",
    instruction: "Use recognised AV terms, acronyms and system-role language, but do not invent unsupported specifications."
  }
];

function resolveLanguageLevel(value?: string): ProductCallLanguageLevel {
  const normalised = String(value || "").trim().toLowerCase();

  if (normalised === "low" || normalised === "simple") {
    return "Simple";
  }

  if (normalised === "high" || normalised === "advanced") {
    return "Advanced";
  }

  return "Normal";
}

export function getLanguageProfile(context: ProductCallContext): ProductCallLanguageProfile {
  const level = resolveLanguageLevel(context.salespersonConfidence);
  const found = PRODUCT_CALL_LANGUAGE_LEVELS.find((profile) => profile.level === level);

  return found || PRODUCT_CALL_LANGUAGE_LEVELS[1];
}

export function getLanguageAwareWording(product: ProductCallProduct, context: ProductCallContext): ModeAwareWording {
  const profile = getLanguageProfile(context);
  const environment = context.application || context.environment || "the room";
  const requirement = context.knownRequirement || product.bestFor;
  const priorityText = context.customerPriority ? ` The customer priority is ${context.customerPriority.toLowerCase()}.` : "";

  if (profile.level === "Simple") {
    return {
      headline: `${product.sku} is worth discussing when the customer needs a simple WyreStorm answer for ${environment.toLowerCase()}.`,
      whatItIs: `A WyreStorm product for ${environment.toLowerCase()} projects where the customer needs ${requirement.toLowerCase()}.`,
      whatItDoes: `It helps the room work in a cleaner, easier way by supporting the main connection or presentation job the customer is trying to solve.`,
      whyItMatters: `It gives the salesperson a simple benefit to explain: the room is easier to use, easier to discuss and easier to support.${priorityText}`,
      salespersonAngle: `Lead with the outcome: “This is relevant because it helps make the room easier for the customer to use.”`,
      customerBenefit: `The customer gets a clearer room solution rather than a confusing list of boxes and technical details.`
    };
  }

  if (profile.level === "Advanced") {
    return {
      headline: `${product.sku} should be positioned by system role, signal path and application fit within the ${environment.toLowerCase()} design.`,
      whatItIs: `${product.whatItIs} In advanced language, treat it as a defined WyreStorm system component rather than a generic product option.`,
      whatItDoes: `${product.whatItDoes} Discuss the relevant I/O path, host/device role, control or integration expectation and how it sits in the wider AV workflow.`,
      whyItMatters: `It helps qualify whether this SKU is the correct technical fit before moving into design, comparison or proposal support.${priorityText}`,
      salespersonAngle: `Lead with system fit: “This SKU is relevant if the I/O, control, signal path and application requirements match the room architecture.”`,
      customerBenefit: `The customer gets a more defensible recommendation based on topology, integration fit and the actual job the product must perform.`
    };
  }

  return {
    headline: `${product.sku} is the WyreStorm product to discuss when the requirement is ${requirement.toLowerCase()}.`,
    whatItIs: `${product.whatItIs} Keep the first explanation clear and connect it directly to ${environment.toLowerCase()}.`,
    whatItDoes: `${product.whatItDoes} Focus on the practical workflow first, then add technical detail where it supports the sale.`,
    whyItMatters: `${product.whyItMatters} This helps the salesperson sell the benefit, not just name the product.${priorityText}`,
    salespersonAngle: `Lead with the customer problem: “This is relevant because it helps solve the room workflow, not just because it is another SKU.”`,
    customerBenefit: `The customer gets a clearer reason to consider the product and a practical explanation of where it fits.`
  };
}
