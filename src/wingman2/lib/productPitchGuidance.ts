import { getBestProductPositioningCardForSku } from "../data/productPositioningCards";
import type { ProductPositioningCard } from "../types/productPositioning";
import { buildProductFeatureBenefits, cleanUsefulList, productText, type ProductNarrative, type ProductRole, type ProductSpec } from "./productStoryEngine";

export type ProductPitchSalesGuidance = {
  plainDescription: string;
  productRole: string;
  scenarioFit: string;
  confirmationQuestion: string;
  bestFitApplications: string[];
  poorFitApplications: string[];
  featureBenefits: string[];
  customerProblem: string;
  discoveryQuestions: string[];
  quoteChecks: string[];
  attachProducts: string[];
  alternatives: string[];
  customerSafeWording: string;
  internalSalesNotes: string[];
  doNotPromise: string[];
};

export type ProductSalesContext = {
  roomType?: string;
  application?: string;
};

const BANNED_FILLER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\brobust solution\b/gi, "suitable product route"],
  [/\bseamless experience\b/gi, "straightforward workflow"],
  [/\bfuture[ -]?proof(?:ed|ing)?\b/gi, "planned for the confirmed expansion requirement"],
  [/\bbest[ -]?in[ -]?class\b/gi, "appropriate for the confirmed requirement"],
];

function cleanSalesText(value: string): string {
  return BANNED_FILLER_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value.replace(/\s+/g, " ").trim(),
  );
}

function safeList(values: string[], limit: number): string[] {
  return cleanUsefulList(values.map(cleanSalesText), limit);
}

function roleJob(role: ProductRole): string {
  const jobs: Record<ProductRole, string> = {
    avoip: "send selected sources to the right displays over the AV network",
    matrix: "switch fixed sources to the required displays",
    extension: "carry the source signal to a display that is too far away for a direct cable",
    presentation: "connect room sources and put the selected content onto the room display",
    wireless: "let users share content to the room display without a cable",
    multiview: "show several sources together on one display",
    videoWall: "place source content across the displays that make up the video wall",
    camera: "capture the people in the room for a call, recording or stream",
    audio: "power and manage the room audio",
    general: "perform the product role shown in the current product record",
  };

  return jobs[role];
}

function confirmationForRole(role: ProductRole, scenario: string): string {
  const checks: Record<ProductRole, string> = {
    avoip: "the source count, display count and managed network are available",
    matrix: "the number of sources and independently controlled displays is correct",
    extension: "the cable distance and signals that must be carried are correct",
    presentation: "the room sources, display count and USB requirement are correct",
    wireless: "wireless sharing is allowed on the customer's network",
    multiview: "several sources must be visible on one display at the same time",
    videoWall: "the display count and required wall layouts are correct",
    camera: "the camera coverage and connection back to the meeting host are correct",
    audio: "the speaker load, room coverage and audio source are correct",
    general: "this is the job the customer needs the product to perform",
  };

  return `I'm treating this as ${scenario}, and assuming ${checks[role]}. Is that correct?`;
}

function cardEvidenceText(card: ProductPositioningCard | undefined): string {
  if (!card) return "";

  return [
    card.productName,
    card.productFamily,
    card.technologyType,
    card.salientPoint,
    card.oneLinePositioning,
    card.oneMinuteBrief,
    ...card.bestFitApplications,
    ...card.weakFitApplications,
    ...card.customerProblems,
    ...card.technicalCheckQuestions,
    ...card.caveats,
    ...card.reviewGates,
  ].join(" ");
}

function removeUnsupportedCertificationClaims(value: string, evidence: string): string {
  if (/\bteams (?:rooms? )?certif(?:ied|ication)\b/i.test(evidence)) {
    return value;
  }

  return value
    .replace(/\b(?:microsoft )?teams (?:rooms? )?certified\b/gi, "room-system certification to be confirmed")
    .replace(/\bteams certification\b/gi, "room-system certification");
}

function roleDiscoveryQuestions(role: ProductRole): string[] {
  const shared = [
    "What job must this product perform in the complete signal path?",
    "How many sources, displays or user positions are required now?",
    "Where will the product sit, and what cable distances are involved?",
    "Who will operate the system and how should they control it?",
    "Which requirement would make the proposed product unsuitable?",
  ];

  const roleQuestions: Record<ProductRole, string[]> = {
    avoip: [
      "Are the sources and displays spread across rooms or expected to expand?",
      "Which NetworkHD family is required, and is the correct controller included?",
      "Who owns the AV network, switch configuration and commissioning?",
    ],
    matrix: [
      "Is this a fixed local system or likely to expand across rooms?",
      "How many independent inputs and outputs are genuinely required?",
      "Are any HDMI outputs mirrored rather than independently routed?",
    ],
    extension: [
      "Is the requirement only point-to-point extension, or is switching also needed?",
      "What signal types must travel between the source and display positions?",
      "Does USB, audio or control need to travel as well as video?",
    ],
    presentation: [
      "Is the room led by BYOD, BYOM, a room PC or fixed presentation sources?",
      "Which USB cameras, microphones, speakers or touch devices must reach the host?",
      "How many displays and independent room outputs are required?",
    ],
    wireless: [
      "Which user devices and casting methods must be supported?",
      "What does the customer's network and security policy allow?",
      "Is wireless sharing enough, or are wired inputs and USB conferencing also required?",
    ],
    multiview: [
      "How many sources must be visible at the same time?",
      "Is the required job multiview, matrix routing or video wall processing?",
      "Who selects layouts, and where does the composed output go?",
    ],
    videoWall: [
      "How many displays form the wall and what layouts are required?",
      "Does the customer need one wall processor or flexible routed endpoints?",
      "Is multiview composition required as well as wall scaling?",
    ],
    camera: [
      "Where must the camera image end up: a call, recorder, stream or network?",
      "What room coverage, mounting position and sightlines are required?",
      "How far is the camera from the USB host or other destination?",
    ],
    audio: [
      "What speakers, microphones and room coverage must the audio system support?",
      "Is a DSP, Dante network or conferencing audio path involved?",
      "Who is responsible for system tuning and commissioning?",
    ],
    general: shared,
  };

  return [...roleQuestions[role], ...shared];
}

function roleAlternatives(role: ProductRole): string[] {
  const alternatives: Record<ProductRole, string[]> = {
    avoip: [
      "Use a matrix for a smaller fixed local system with a known input and output count.",
      "Use HDBaseT extension where the job is a single point-to-point source and display run.",
      "Use a presentation switcher or UC product where the meeting-room workflow is the main requirement.",
      "Use a dedicated video wall processor where wall behaviour matters more than flexible distribution.",
    ],
    matrix: [
      "Use NetworkHD when sources and displays are distributed, flexible routing matters or expansion is expected.",
      "Use HDBaseT extension for a simple point-to-point transport requirement.",
      "Use a presentation switcher or UC product for a meeting-room, teaching-room or BYOD/BYOM-led workflow.",
      "Use a dedicated video wall processor when the requirement is wall layout processing rather than routing.",
    ],
    extension: [
      "Use a presentation switcher when several local sources need room-led switching.",
      "Use a matrix when several fixed sources need independent routes to several local displays.",
      "Use NetworkHD when distribution spans rooms or the endpoint count is expected to grow.",
    ],
    presentation: [
      "Use a matrix where the job is fixed multi-input, multi-output local routing rather than a room workflow.",
      "Use NetworkHD where sources and displays are distributed or future expansion matters.",
      "Use HDBaseT extension where display distance is the main problem.",
    ],
    wireless: [
      "Use a presentation switcher when reliable wired inputs and room switching are the priority.",
      "Use a UC product where camera, microphone, speakerphone and BYOM workflows drive the room.",
      "Use NetworkHD where content must be routed beyond one room.",
    ],
    multiview: [
      "Use a matrix when the requirement is to route one source at a time to independent outputs.",
      "Use a dedicated video wall processor when multi-display wall behaviour is the main requirement.",
      "Use NetworkHD multiview inside the correct family when the sources already live on an AVoIP system.",
    ],
    videoWall: [
      "Use NetworkHD where wall endpoints are part of a larger flexible distributed AV system.",
      "Use a matrix where a small fixed local system only needs independent source routing.",
      "Use a multiview processor where several sources need composing onto one output rather than a display wall.",
    ],
    camera: [
      "Use a camera bridge or processor where several cameras must become one controlled feed.",
      "Use an Apollo or UC room product where the requirement is an integrated camera, microphone and speaker workflow.",
      "Add the appropriate USB extension route where the host is beyond a practical local USB connection.",
    ],
    audio: [
      "Use a UC audio product where microphone and speakerphone behaviour is tied to a conferencing host.",
      "Use a dedicated DSP and amplifier route where room coverage, tuning or multiple audio zones drive the design.",
    ],
    general: [
      "Use a matrix for smaller fixed local routing.",
      "Use NetworkHD for distributed, flexible or expandable AV.",
      "Use HDBaseT for point-to-point transport.",
      "Use presentation or UC products for room-led BYOD/BYOM workflows.",
    ],
  };

  return alternatives[role];
}

function roleAttachProducts(role: ProductRole): string[] {
  const attach: Record<ProductRole, string[]> = {
    avoip: [
      "Correct NetworkHD controller - confirm the controller matches the selected NetworkHD family.",
      "Managed network switch and commissioning - confirm bandwidth, power, VLAN and multicast requirements.",
      "Matching encoders and decoders - do not mix NetworkHD families casually.",
    ],
    matrix: [
      "Matching receivers or extender endpoints - include them where the matrix output uses an extended transport.",
      "Control interface or touch panel - confirm the required user-control method.",
      "Rack, power and cable dependencies - check the complete installed route.",
    ],
    extension: [
      "Matching transmitter and receiver - quote the complete compatible pair where the SKU is not already a kit.",
      "USB, audio or control accessories - include only the paths confirmed by discovery.",
    ],
    presentation: [
      "USB camera, microphone or speakerphone - include where BYOM or conferencing is required.",
      "HDBaseT receiver or display-side extender - include where the display run needs extension.",
      "Room control or touch interface - confirm how users operate source and display selection.",
    ],
    wireless: [
      "Casting dongles or table dock - include only where the selected sharing workflow requires them.",
      "USB camera and room audio - include where wireless presentation forms part of a BYOM room.",
    ],
    multiview: [
      "Source-side switching or AVoIP endpoints - confirm what feeds each multiview input.",
      "Display, recorder, streamer or LED processor - confirm the destination for the composed output.",
    ],
    videoWall: [
      "Source routing and control - confirm what feeds the processor and who changes wall layouts.",
      "Display mounts, cabling and power - validate the complete wall installation.",
    ],
    camera: [
      "Camera bridge or switcher - consider where several camera feeds must be selected or composed.",
      "USB extension - include where the camera is remote from the conferencing host.",
      "Microphones and speakers - treat the audio path as a separate confirmed requirement.",
    ],
    audio: [
      "Loudspeakers and microphone inputs - confirm load, room coverage and connection type.",
      "DSP, Dante network or UC host - include only where supported by the selected audio workflow.",
    ],
    general: [
      "Control, rack, power and cable dependencies - confirm the complete system around the SKU.",
    ],
  };

  return attach[role];
}

function formatAttachProducts(card: ProductPositioningCard | undefined): string[] {
  return card?.attachProducts.map((item) => {
    const label = item.sku || item.productFamily || "Companion product";
    return `${label} - ${item.reason}`;
  }) ?? [];
}

function specificSafetyGuidance(sku: string): Partial<ProductPitchSalesGuidance> {
  if (sku === "NHD-0401-MV") {
    return {
      productRole: "An HDMI multiview processor that composes several HDMI sources onto one output for monitoring, preview or onward processing.",
      poorFitApplications: [
        "Do not present it as a full matrix replacement; matrix switching and multiview composition are different jobs.",
        "Do not present it as a complete video wall processor without confirming the required wall behaviour.",
        "Do not use it by itself for distributed AV routing across rooms.",
      ],
      doNotPromise: [
        "Do not promise independent matrix routing from a single composed output.",
        "Do not promise complete video wall behaviour until layouts, scaling and output use are confirmed.",
      ],
    };
  }

  if (sku === "NHD-150-RX") {
    return {
      productRole: "A NetworkHD 100-series receiver for multiview or composed-output workflows inside a compatible NetworkHD 100 system.",
      poorFitApplications: [
        "Do not position it as a standalone HDMI quad viewer.",
        "Do not use it outside a confirmed NetworkHD 100 architecture.",
        "Do not assume compatibility with other NetworkHD families.",
      ],
      doNotPromise: [
        "Do not promise standalone HDMI multiview operation.",
        "Do not promise cross-family NetworkHD compatibility; confirm encoders, controller and system design.",
      ],
    };
  }

  if (sku === "NHD-600-TRX") {
    return {
      productRole: "A NetworkHD 600 10GbE SDVoE transceiver for high-performance distributed AV systems where an endpoint may encode or decode.",
      poorFitApplications: [
        "Do not lead with it for simple, low-cost local switching.",
        "Do not use it where the project only provides 1GbE network infrastructure.",
        "Do not mix it casually with another NetworkHD family.",
      ],
      doNotPromise: [
        "Do not promise a complete design until 10GbE switching, controller and endpoint counts are confirmed.",
        "Do not position premium distributed AV infrastructure as the default answer to a small local routing job.",
      ],
    };
  }

  if (sku === "MX-1007-HYB") {
    return {
      productRole: "A hybrid presentation and teaching-space matrix for rooms where source choice, USB workflow, displays, audio and control must be designed together.",
      quoteChecks: [
        "Confirm the real source count and source connector types.",
        "Map the complete USB host and device path for cameras, microphones, touch displays or BYOM.",
        "Confirm independent display requirements rather than counting mirrored outputs as matrix outputs.",
        "Confirm room audio, control and any extended display paths.",
      ],
      doNotPromise: [
        "Do not describe it as a generic HDMI switcher.",
        "Do not promise a conferencing workflow until USB ownership, cameras, microphones and speakers are confirmed.",
      ],
    };
  }

  return {};
}

export function buildProductPitchSalesGuidance(
  product: ProductSpec,
  narrative: ProductNarrative,
  context: ProductSalesContext = {},
): ProductPitchSalesGuidance {
  const sku = product.sku.trim().toUpperCase();
  const card = getBestProductPositioningCardForSku(sku);
  const productEvidence = productText(product);
  const evidence = `${productEvidence} ${cardEvidenceText(card)}`;
  const specific = specificSafetyGuidance(sku);
  const isUcProduct = /\b(?:APO|UC|BYOD|BYOM|CONFERENC)/i.test(evidence);

  const productRole = cleanSalesText(specific.productRole || card?.oneMinuteBrief || narrative.whatItIs);
  const roomType = cleanSalesText(context.roomType || "");
  const application = cleanSalesText(context.application || "");
  const scenario = roomType && application && roomType.toLowerCase() !== application.toLowerCase()
    ? `${roomType} - ${application}`
    : roomType || application || cleanSalesText(product.applications[0] || "the customer's application");
  // Lead with the practical, product-specific "what it does for the customer"
  // copy (governed story whatItDoes -> narrative.whyItHelps) rather than the
  // role-generic template, which reads identically for every SKU of a role.
  const practicalDescription = cleanSalesText(narrative.whyItHelps || "");
  const plainDescription = practicalDescription || `This product is used to ${roleJob(narrative.role)}.`;
  const scenarioFit = `For ${scenario}, use it to ${roleJob(narrative.role)}.`;
  const featureBenefits = safeList(buildProductFeatureBenefits(product, 6), 6);
  const bestFitApplications = safeList([
    ...(card?.bestFitApplications ?? []),
    ...product.applications,
  ], 8);
  const poorFitApplications = safeList([
    ...(specific.poorFitApplications ?? []),
    ...(card?.weakFitApplications ?? []),
    ...(card?.disqualifiers ?? []),
    narrative.avoidIf,
  ], 8);
  const discoveryQuestions = safeList([
    ...(card?.openingQuestions ?? []),
    ...(card?.qualificationQuestions ?? []),
    ...narrative.askNow,
    ...roleDiscoveryQuestions(narrative.role),
  ], 8);
  const quoteChecks = safeList([
    ...(specific.quoteChecks ?? []),
    ...(card?.technicalCheckQuestions ?? []),
    ...(card?.reviewGates ?? []),
    ...(card?.caveats ?? []),
    ...product.checks,
    "Confirm the exact SKU, regional variant and complete system design before committing it to a quote.",
  ], 8);
  const attachProducts = safeList([
    ...formatAttachProducts(card),
    ...roleAttachProducts(narrative.role),
    ...product.related.map((item) => `${item} - related in the current product record; confirm compatibility and purpose.`),
  ], 8);
  const alternatives = safeList(roleAlternatives(narrative.role), 6);
  const rawCustomerSafeWording = card?.followUpWording || narrative.suggestedWording;
  const customerSafeWording = cleanSalesText(removeUnsupportedCertificationClaims(rawCustomerSafeWording, productEvidence));
  const internalSalesNotes = safeList([
    ...(card?.disqualifiers ?? []),
    ...(card?.caveats ?? []),
    card?.audienceNotes.INTERNAL_SALES ?? "",
    narrative.reviewNote ?? "",
    "Keep customer-facing wording separate from internal checks and qualification traps.",
    "Confirm the exact SKU and system design when the requirement depends on a variant, accessory or product family.",
  ], 8);
  const doNotPromise = safeList([
    ...(specific.doNotPromise ?? []),
    ...(isUcProduct
      ? ["Do not describe this as a Teams-certified room system unless that certification is explicitly confirmed for the exact SKU."]
      : []),
    "Do not promise USB-C, Dante, codec, latency, HDMI version or control features unless the current product evidence explicitly supports them.",
  ], 6);

  return {
    plainDescription,
    productRole,
    scenarioFit,
    confirmationQuestion: confirmationForRole(narrative.role, scenario),
    bestFitApplications,
    poorFitApplications,
    featureBenefits,
    customerProblem: cleanSalesText(card?.customerProblems[0] || narrative.customerChallenge),
    discoveryQuestions,
    quoteChecks,
    attachProducts,
    alternatives,
    customerSafeWording,
    internalSalesNotes,
    doNotPromise,
  };
}
