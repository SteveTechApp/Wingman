export type WingmanAudienceMode = "dealer" | "technicalConsultant" | "endUser";

export type WingmanCoachingPageContext =
  | "dashboard"
  | "discovery"
  | "finder"
  | "productPitch"
  | "compare"
  | "proposal"
  | "visualStudio"
  | "general";

export interface WingmanAudienceProfile {
  id: WingmanAudienceMode;
  label: string;
  shortLabel: string;
  description: string;
  tone: string[];
  avoid: string[];
}

export interface WingmanAudienceCoaching {
  headline: string;
  framing: string;
  askThisNext: string;
  keepVisible: string;
  avoid: string;
}

export const defaultAudienceMode: WingmanAudienceMode = "dealer";

export const wingmanAudienceProfiles: WingmanAudienceProfile[] = [
  {
    id: "dealer",
    label: "Dealer / distributor",
    shortLabel: "Dealer",
    description:
      "Use practical sales coaching for distributor or dealer conversations. Focus on what to ask next and how to recognise the opportunity.",
    tone: [
      "Commercial",
      "Practical",
      "Confidence-building",
      "Plain English",
      "Question-led"
    ],
    avoid: [
      "Deep protocol explanations unless needed",
      "Overly technical warnings",
      "Internal engineering detail that could slow the conversation",
      "Long SKU-first explanations"
    ]
  },
  {
    id: "technicalConsultant",
    label: "Technical consultant / integrator",
    shortLabel: "Consultant",
    description:
      "Use architecture-led language for technically aware users. Focus on validation, dependencies, risk and design evidence.",
    tone: [
      "Precise",
      "Architecture-led",
      "Dependency-aware",
      "Direct about risk",
      "Suitable for pre-sales review"
    ],
    avoid: [
      "Oversimplified sales phrasing",
      "Benefit claims without design evidence",
      "Vague future-proofing language",
      "Hiding assumptions or quote blockers"
    ]
  },
  {
    id: "endUser",
    label: "End-user / customer",
    shortLabel: "End-user",
    description:
      "Use customer-safe language. Focus on outcomes, usability, business value and what still needs to be confirmed.",
    tone: [
      "Outcome-led",
      "Non-jargon",
      "Customer-safe",
      "Benefits first",
      "Careful with assumptions"
    ],
    avoid: [
      "Internal sales coaching language",
      "Too many part numbers",
      "Unnecessary engineering warnings",
      "Competitor positioning unless specifically requested"
    ]
  }
];

export function isWingmanAudienceMode(value: unknown): value is WingmanAudienceMode {
  return value === "dealer" || value === "technicalConsultant" || value === "endUser";
}

export function getAudienceProfile(mode: WingmanAudienceMode): WingmanAudienceProfile {
  const match = wingmanAudienceProfiles.find((profile) => profile.id === mode);

  if (match) {
    return match;
  }

  return wingmanAudienceProfiles[0];
}

const dealerCoaching: Record<WingmanCoachingPageContext, WingmanAudienceCoaching> = {
  dashboard: {
    headline: "Coach the next sales move",
    framing:
      "Frame this as a guided opportunity conversation. Help the salesperson decide what to ask next before jumping to products.",
    askThisNext:
      "Ask what the customer is trying to achieve in the room and whether they need simple presentation, conferencing, distribution, video wall, or flexible routing.",
    keepVisible:
      "Keep missing information visible so the salesperson knows what must be checked before a quote.",
    avoid:
      "Avoid heavy technical explanations before the salesperson has qualified the application."
  },
  discovery: {
    headline: "Ask the next useful question",
    framing:
      "Use the customer's wording to uncover the application, room type, source/display count, USB needs, audio needs and control expectations.",
    askThisNext:
      "Ask: what does the customer need people to be able to do in this space when the system is working properly?",
    keepVisible:
      "Show the salesperson what has been captured and what is still unknown.",
    avoid:
      "Avoid turning discovery into a long technical form."
  },
  finder: {
    headline: "Turn requirements into product direction",
    framing:
      "Help the salesperson recognise whether this is a matrix, HDBaseT, NetworkHD, UC, presentation switcher, video wall or USB opportunity.",
    askThisNext:
      "Ask whether the customer needs fixed routing, flexible routing, conferencing, or future expansion.",
    keepVisible:
      "Show why a product family is suggested and what must be confirmed before quoting.",
    avoid:
      "Avoid SKU dumping before the architecture is understood."
  },
  productPitch: {
    headline: "Make the product easier to explain",
    framing:
      "Translate product facts into a practical customer conversation, with a clear reason why the product may fit.",
    askThisNext:
      "Ask what problem the customer is trying to solve and which feature would make the difference in the sale.",
    keepVisible:
      "Keep alternatives and do-not-quote-yet warnings visible.",
    avoid:
      "Avoid reading the datasheet back to the salesperson."
  },
  compare: {
    headline: "Use comparison as qualification",
    framing:
      "Help the dealer understand the competitor product class first, then qualify whether WyreStorm has the right direction.",
    askThisNext:
      "Ask what the competitor product is being used for, not just what ports it has.",
    keepVisible:
      "Keep direct-equivalent risk and missing public data visible.",
    avoid:
      "Avoid claiming a direct equivalent unless the product purpose and dependencies are clear."
  },
  proposal: {
    headline: "Keep the proposal safe",
    framing:
      "Use simple wording that helps the salesperson explain the proposed direction without overpromising.",
    askThisNext:
      "Ask what still needs confirmation before this can move from proposal starter to quote-ready.",
    keepVisible:
      "Keep required items, optional items, assumptions and quote blockers separated.",
    avoid:
      "Avoid making an incomplete requirement sound like a final design."
  },
  visualStudio: {
    headline: "Explain the system visually",
    framing:
      "Use the visual to help the salesperson explain source-to-display flow, USB ownership, network dependency and control needs.",
    askThisNext:
      "Ask whether the diagram matches how the customer expects the room or venue to operate.",
    keepVisible:
      "Keep assumptions and missing information beside the diagram.",
    avoid:
      "Avoid making the graphic look like a final engineering drawing unless all details are confirmed."
  },
  general: {
    headline: "Guide the conversation",
    framing:
      "Use practical sales language that helps the user ask better questions and avoid premature product selection.",
    askThisNext:
      "Ask the simplest question that reduces the biggest uncertainty.",
    keepVisible:
      "Keep risk, assumptions and missing information visible.",
    avoid:
      "Avoid jargon unless the audience needs it."
  }
};

const consultantCoaching: Record<WingmanCoachingPageContext, WingmanAudienceCoaching> = {
  dashboard: {
    headline: "Validate the design evidence",
    framing:
      "Frame the opportunity by application, signal path, endpoint count, USB ownership, audio path, control method and infrastructure.",
    askThisNext:
      "Confirm the functional requirement, endpoint topology, distances and required user workflows.",
    keepVisible:
      "Keep assumptions, dependencies and quote blockers visible for pre-sales review.",
    avoid:
      "Avoid commercial shortcuts that bypass design validation."
  },
  discovery: {
    headline: "Capture structured design evidence",
    framing:
      "Separate customer outcome from technical assumption. Capture source, display, USB, audio, control, distance and infrastructure data.",
    askThisNext:
      "Confirm source count, display count, signal distance, USB requirement, audio path, control requirement and network ownership.",
    keepVisible:
      "Show which system paths are confirmed and which remain assumed.",
    avoid:
      "Avoid treating a vague application description as a complete design brief."
  },
  finder: {
    headline: "Select architecture before product",
    framing:
      "Use the captured requirement to choose the architecture class before recommending a specific product.",
    askThisNext:
      "Confirm whether the requirement is fixed I/O switching, point-to-point extension, AV-over-IP, UC switching, wall processing or USB transport.",
    keepVisible:
      "Show required dependencies such as receivers, controllers, network switches, USB paths and control interfaces.",
    avoid:
      "Avoid recommending HDMI-only architecture where USB, camera or microphone workflows are required."
  },
  productPitch: {
    headline: "Check product fit and limitations",
    framing:
      "Explain why the product fits, where it does not fit, and what evidence is needed before quotation.",
    askThisNext:
      "Confirm the product is being matched to the correct application and signal workflow.",
    keepVisible:
      "Show alternatives, dependencies, interface assumptions and validation warnings.",
    avoid:
      "Avoid using product benefits without matching them to project evidence."
  },
  compare: {
    headline: "Compare product class and workflow",
    framing:
      "Identify product purpose, transport method, resolution class, USB/audio/control support and deployment model before comparing.",
    askThisNext:
      "Confirm whether the competitor item is acting as a switcher, extender, encoder, decoder, processor, UC device or control endpoint.",
    keepVisible:
      "Show confidence, evidence and missing public data.",
    avoid:
      "Avoid comparing encoders to decoders or port counts without workflow context."
  },
  proposal: {
    headline: "Protect quote safety",
    framing:
      "Keep the proposal architecture-led and show required validation before it becomes quote-ready.",
    askThisNext:
      "Confirm quantities, endpoints, cable paths, network design, USB requirements, audio handling and control method.",
    keepVisible:
      "Separate required items, optional items, assumptions, risks and dependencies.",
    avoid:
      "Avoid presenting a proposal starter as a final engineering design."
  },
  visualStudio: {
    headline: "Use the visual as design evidence",
    framing:
      "Read the diagram as a system topology: source path, transport layer, control layer, audio/USB paths and endpoints.",
    askThisNext:
      "Confirm whether every node and edge on the diagram maps to a real device, cable path or network dependency.",
    keepVisible:
      "Show unconfirmed network, USB, control and endpoint assumptions.",
    avoid:
      "Avoid hiding unresolved paths to make the schematic look cleaner."
  },
  general: {
    headline: "Validate before recommending",
    framing:
      "Use technical framing that preserves accuracy, dependencies and design risk.",
    askThisNext:
      "Ask the question that closes the highest-risk design assumption.",
    keepVisible:
      "Keep technical dependencies and missing information visible.",
    avoid:
      "Avoid vague claims or unsupported equivalence."
  }
};

const endUserCoaching: Record<WingmanCoachingPageContext, WingmanAudienceCoaching> = {
  dashboard: {
    headline: "Explain the outcome clearly",
    framing:
      "Frame the discussion around what the customer needs the space to do and what will make it easier for users.",
    askThisNext:
      "Ask what the room, venue or system needs to achieve day to day.",
    keepVisible:
      "Keep assumptions simple and explain what still needs to be confirmed.",
    avoid:
      "Avoid internal sales terms, product-heavy wording or unnecessary technical detail."
  },
  discovery: {
    headline: "Understand the customer need",
    framing:
      "Use plain language to understand how people will use the space, what content they need to show and how simple the system needs to be.",
    askThisNext:
      "Ask: what do users need to do in this room without needing technical help?",
    keepVisible:
      "Show a simple summary of what has been captured and what still needs checking.",
    avoid:
      "Avoid making the customer answer engineering questions too early."
  },
  finder: {
    headline: "Explain the system direction",
    framing:
      "Describe the recommended approach by outcome, not by part number.",
    askThisNext:
      "Ask whether the customer needs a simple fixed system or more flexibility for different content and future changes.",
    keepVisible:
      "Explain why the direction is being suggested and what still needs confirmation.",
    avoid:
      "Avoid SKU dumping or internal product-family language without explanation."
  },
  productPitch: {
    headline: "Turn product facts into customer value",
    framing:
      "Explain what the product or system direction helps the customer do and why it suits the application.",
    askThisNext:
      "Ask which user outcome matters most: simplicity, flexibility, conferencing, image quality, expansion or control.",
    keepVisible:
      "Keep final checks visible without making the solution sound uncertain.",
    avoid:
      "Avoid too many technical specifications unless the customer asks for them."
  },
  compare: {
    headline: "Compare in customer terms",
    framing:
      "Explain the difference in terms of use case, reliability, flexibility, user experience and support.",
    askThisNext:
      "Ask what the customer likes about the alternative product and what problem they need it to solve.",
    keepVisible:
      "Keep any uncertainty polite and customer-safe.",
    avoid:
      "Avoid aggressive competitor language or unsupported replacement claims."
  },
  proposal: {
    headline: "Use proposal-safe wording",
    framing:
      "Present the solution as a clear recommended approach with benefits, assumptions and next steps.",
    askThisNext:
      "Ask what needs to be confirmed before final quotation and installation planning.",
    keepVisible:
      "Show assumptions and dependencies in plain language.",
    avoid:
      "Avoid internal notes, quote-risk jargon or unnecessary SKU detail."
  },
  visualStudio: {
    headline: "Use the diagram to simplify the idea",
    framing:
      "Use the visual to show how content, devices and displays work together in a way the customer can understand.",
    askThisNext:
      "Ask whether the diagram reflects how users expect the space to work.",
    keepVisible:
      "Keep simple next checks beside the diagram.",
    avoid:
      "Avoid making the customer-facing visual look like a complex engineering schematic."
  },
  general: {
    headline: "Keep it customer-safe",
    framing:
      "Use outcome-led language that explains the recommendation without unnecessary jargon.",
    askThisNext:
      "Ask the question that helps the customer explain the desired outcome.",
    keepVisible:
      "Keep assumptions and next steps clear.",
    avoid:
      "Avoid internal sales or engineering language."
  }
};

export function getAudienceCoaching(
  mode: WingmanAudienceMode,
  context: WingmanCoachingPageContext
): WingmanAudienceCoaching {
  if (mode === "technicalConsultant") {
    return consultantCoaching[context];
  }

  if (mode === "endUser") {
    return endUserCoaching[context];
  }

  return dealerCoaching[context];
}