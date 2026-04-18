import type { CatalogPortCount, CatalogProduct } from "@/catalog/types";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import type { StoredProject } from "@/features/projects/projectStore";
import type { RoomTemplateScenario } from "@/features/templates/roomTemplateLibrary";

export type SalesConversationCard = {
  id: string;
  title: string;
  outcome: string;
  opener: string;
  qualificationQuestions: string[];
  wyrestormAngles: string[];
  keepConversationMoving: string[];
  sampleSkus: string[];
  recommendedFamilies: string[];
  route: string;
};

export type SalesPitchModule = {
  id: string;
  title: string;
  eyebrow: string;
  elevatorPitch: string;
  leadWith: string[];
  proofPoints: string[];
  keepConversationMoving: string[];
  relatedFamilies: string[];
  sampleSkus: string[];
  route: string;
};

export type ProductPositioningGuide = {
  headline: string;
  elevatorPitch: string;
  positioningHighlights: string[];
  discoveryQuestions: string[];
  proofPoints: string[];
  rangeConnection: string;
  recommendedPitchId: string;
  recommendedFlashCardId: string;
};

export type SalesMotionId =
  | "room-fit"
  | "competitive-refresh"
  | "reassurance"
  | "rollout";

export type SalesMotion = {
  id: SalesMotionId;
  title: string;
  summary: string;
  detail: string;
  focusFamilies: string[];
  preferredCardIds: string[];
  preferredPitchIds: string[];
  nextRoute: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function compact(values: Array<string | undefined | null>, limit = 6): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function totalPorts(ports?: CatalogPortCount[]): number {
  return Array.isArray(ports)
    ? ports.reduce((sum, port) => sum + (Number(port.count) || 0), 0)
    : 0;
}

function formatIo(product: CatalogProduct): string {
  if (tidy(product.ioSummary)) return tidy(product.ioSummary);

  const inputs = Number(product.inputTotal) || totalPorts(product.inputs);
  const outputs = Number(product.outputTotal) || totalPorts(product.outputs);

  if (inputs > 0 && outputs > 0) return `${inputs} inputs / ${outputs} outputs`;
  if (inputs > 0) return `${inputs} input${inputs === 1 ? "" : "s"}`;
  if (outputs > 0) return `${outputs} output${outputs === 1 ? "" : "s"}`;
  return "Flexible signal role";
}

function hasAny(product: CatalogProduct, pattern: RegExp): boolean {
  const blob = [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.transport,
    ...(product.features || []),
    ...(product.normalizedTags || []),
    ...(product.control || []),
    ...(product.audio || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return pattern.test(blob);
}

function inferRangeName(product: CatalogProduct): string {
  const sku = product.sku.toUpperCase();
  const family = `${product.family} ${product.category}`.toLowerCase();

  if (sku.startsWith("NHD") || family.includes("networkhd") || product.transport === "AVoIP") {
    return "NetworkHD";
  }
  if (sku.startsWith("SW-") || family.includes("synergy")) {
    return "Synergy";
  }
  if (sku.startsWith("APO") || family.includes("presentation") || family.includes("uc")) {
    return "Apollo";
  }
  return "WyreStorm ranges";
}

function inferPitchId(product: CatalogProduct): string {
  const range = inferRangeName(product);
  if (range === "NetworkHD") return "networkhd";
  if (range === "Synergy") return "synergy";
  if (range === "Apollo") return "apollo";
  return "ranges";
}

function pitchIdForFamily(family: string): string {
  const key = normalizeKey(family);
  if (key === "avoip") return "networkhd";
  if (key === "matrix") return "synergy";
  if (key === "apollo" || key === "usbextension") return "apollo";
  return "ranges";
}

function inferFlashCardId(product: CatalogProduct): string {
  const sku = product.sku.toUpperCase();
  const family = `${product.family} ${product.category}`.toLowerCase();

  if (sku.startsWith("NHD") || product.transport === "AVoIP") return "scale-distribution";
  if (sku.startsWith("APO") || family.includes("wireless") || family.includes("presentation")) {
    return "wireless-collaboration";
  }
  if (family.includes("matrix") || family.includes("switcher")) return "switch-between-sources";
  if (family.includes("extender") || family.includes("transmitter") || family.includes("receiver")) {
    return "extend-a-signal";
  }
  return "split-a-signal";
}

function inferOutcome(product: CatalogProduct): string {
  const sku = product.sku.toUpperCase();
  const family = `${product.family} ${product.category}`.toLowerCase();

  if (sku.startsWith("NHD") || product.transport === "AVoIP") {
    return "scale AV distribution across rooms without redesigning the whole system every time the brief grows";
  }
  if (sku.startsWith("APO") || family.includes("presentation") || family.includes("uc")) {
    return "start meetings faster with simpler sharing and collaboration workflows";
  }
  if (family.includes("matrix")) {
    return "route multiple sources to the right displays with a cleaner, more controlled signal path";
  }
  if (family.includes("switcher")) {
    return "make source switching feel simple for everyday users while keeping the room technically capable";
  }
  if (family.includes("extender") || family.includes("transmitter") || family.includes("receiver")) {
    return "move signal and control further without turning the conversation into a cable problem";
  }
  if (family.includes("controller")) {
    return "keep a larger AV deployment manageable, repeatable, and easier to support";
  }

  return "solve practical AV workflow problems with a supportable WyreStorm path";
}

function buildPitchSentence(product: CatalogProduct): string {
  const descriptor = compact([
    `${product.family} ${product.category}`.replace(/\s+/g, " ").trim(),
    product.category,
    product.family,
  ], 1)[0] || "WyreStorm product";

  const capability = compact([
    product.video?.maxResolution ? `supports ${product.video.maxResolution}` : "",
    formatIo(product),
    product.distance?.meters ? `runs up to ${product.distance.meters}m` : "",
    product.distance?.meters4k ? `handles 4K up to ${product.distance.meters4k}m` : "",
    product.usb?.kvmSupport || hasAny(product, /\bkvm\b|\busb\b/) ? "adds USB workflow support" : "",
    product.integration?.lanControl || hasAny(product, /\btcp\/ip\b|\blan\b|\bapi\b/) ? "stays easy to integrate and control" : "",
  ], 3).join(", ");

  return `${product.sku} is a ${descriptor.toLowerCase()} that helps teams ${inferOutcome(product)}. Lead with the customer problem first, then anchor the value on the fact it ${capability || "fits naturally into a cleaner AV workflow"}.`;
}

function buildPositioningHighlights(product: CatalogProduct): string[] {
  const range = inferRangeName(product);

  return compact([
    `Lead with the outcome, not the model number: ${product.sku} helps customers ${inferOutcome(product)}.`,
    product.transport === "HDBaseT"
      ? "Position it as a dependable way to extend AV over structured cabling without overcomplicating the install."
      : "",
    product.transport === "AVoIP"
      ? "Position it around scalability: start with today's rooms, then expand the same architecture as more endpoints arrive."
      : "",
    hasAny(product, /\bwireless\b|\bconference\b|\bcasting\b|\bbyod\b|\bbyom\b/)
      ? "Lead with faster room adoption: fewer adapters, cleaner switching, and less friction for the user."
      : "",
    hasAny(product, /\bmatrix\b|\bswitcher\b/)
      ? "Lead with control of the room experience: fast source changes, fewer support calls, and a clearer signal path."
      : "",
    hasAny(product, /\busb\b|\bkvm\b/)
      ? "Use USB support as a business value point, not just a spec: better collaboration, cleaner desk workflow, and fewer workarounds."
      : "",
    hasAny(product, /\bscaling\b|\bseamless\b|\bhdr\b|\bdolby vision\b/)
      ? "Promote picture confidence when it matters: spec alignment helps the customer avoid signal surprises after installation."
      : "",
    `Tie it back to ${range}: this product is easier to position when the customer sees the wider WyreStorm story, not a single standalone box.`,
  ]);
}

function buildDiscoveryQuestions(product: CatalogProduct): string[] {
  return compact([
    "What outcome does the customer actually want: extend, split, switch, share, or scale?",
    product.distance?.meters || product.distance?.meters4k || product.transport === "HDBaseT"
      ? "How far does the signal need to travel, and is that distance fixed or likely to change later?"
      : "",
    totalPorts(product.inputs) > 1 || totalPorts(product.outputs) > 1 || hasAny(product, /\bmatrix\b|\bswitcher\b/)
      ? `How many sources and displays need to be handled at the same time, and does ${formatIo(product)} cover the real brief?`
      : "",
    hasAny(product, /\busb\b|\bkvm\b|\bconference\b|\bwireless\b/)
      ? "Does the room also need USB, collaboration, or wireless sharing support alongside video transport?"
      : "",
    hasAny(product, /\blan\b|\brs-232\b|\bir\b|\bcec\b|\bapi\b|\bcontroller\b/)
      ? "Is control or third-party integration part of the sale, or is the customer only thinking about the signal path today?"
      : "",
    "Is the customer optimizing for one room today, or do they need a platform they can repeat across more spaces?"
  ], 5);
}

function buildProofPoints(product: CatalogProduct): string[] {
  return compact([
    product.summary,
    product.video?.maxResolution ? `Supports ${product.video.maxResolution}.` : "",
    product.video?.hdr ? "HDR support helps protect picture quality expectations." : "",
    product.video?.dolbyVision ? "Dolby Vision support gives you a premium video conversation point." : "",
    product.video?.scaling ? "Built-in scaling gives the salesperson a cleaner compatibility story." : "",
    product.video?.seamlessSwitching ? "Seamless switching helps keep source changes smooth and user-friendly." : "",
    product.distance?.meters ? `Designed for runs up to ${product.distance.meters}m.` : "",
    product.distance?.meters4k ? `Handles 4K extension up to ${product.distance.meters4k}m.` : "",
    formatIo(product) !== "Flexible signal role" ? `Signal shape: ${formatIo(product)}.` : "",
    product.control?.length ? `Control options include ${product.control.join(", ")}.` : "",
    product.audio?.length ? `Audio support includes ${product.audio.join(", ")}.` : "",
    product.usb?.kvmSupport ? "KVM support keeps the conversation anchored on real user workflow, not just transport." : "",
    ...(product.features || []).slice(0, 3).map((feature) => `${feature}.`),
  ], 6);
}

export function buildProductPositioningGuide(product: CatalogProduct): ProductPositioningGuide {
  const pitchId = inferPitchId(product);
  const pitchModule = SALES_PITCH_MODULES.find((item) => item.id === pitchId);

  return {
    headline: `${product.sku} gives the customer a clearer story around ${inferOutcome(product)}.`,
    elevatorPitch: buildPitchSentence(product),
    positioningHighlights: buildPositioningHighlights(product),
    discoveryQuestions: buildDiscoveryQuestions(product),
    proofPoints: buildProofPoints(product),
    rangeConnection:
      pitchModule?.elevatorPitch ||
      "Tie the conversation back to the wider WyreStorm platform so the customer sees the path beyond a single box.",
    recommendedPitchId: pitchId,
    recommendedFlashCardId: inferFlashCardId(product),
  };
}

export const SALES_MOTIONS: SalesMotion[] = [
  {
    id: "room-fit",
    title: "Lead the first recommendation",
    summary: "Start with the room and the user outcome, then bring in the most believable WyreStorm direction.",
    detail: "Best when the customer is still early and needs a clear room-first recommendation rather than a spec-sheet dump.",
    focusFamilies: ["Apollo", "HDBaseT", "Matrix"],
    preferredCardIds: ["wireless-collaboration", "switch-between-sources", "extend-a-signal"],
    preferredPitchIds: ["apollo", "synergy", "ranges"],
    nextRoute: WM_ROUTES.catalog,
  },
  {
    id: "competitive-refresh",
    title: "Refresh or replace an existing system",
    summary: "Frame the conversation around a cleaner upgrade path, not just a model-for-model swap.",
    detail: "Best for refresh work, legacy-system replacements, or competitor displacement where confidence and migration path matter.",
    focusFamilies: ["HDBaseT", "Matrix", "AVoIP"],
    preferredCardIds: ["extend-a-signal", "scale-distribution", "switch-between-sources"],
    preferredPitchIds: ["ranges", "networkhd", "synergy"],
    nextRoute: WM_ROUTES.compare,
  },
  {
    id: "reassurance",
    title: "Handle objections and prove the fit",
    summary: "Keep the language plain, reassure the buyer, and use only the proof points that reduce friction.",
    detail: "Best when the customer is worried about complexity, support, ease of use, or whether the recommendation is too much or too little.",
    focusFamilies: ["Apollo", "USB Extension", "Matrix"],
    preferredCardIds: ["wireless-collaboration", "switch-between-sources", "split-a-signal"],
    preferredPitchIds: ["apollo", "synergy", "ranges"],
    nextRoute: WM_ROUTES.guru,
  },
  {
    id: "rollout",
    title: "Standardise more rooms or scale the estate",
    summary: "Shift the conversation from one room and one box to repeatability, supportability, and growth.",
    detail: "Best when the customer is thinking about many rooms, venue scale, or a platform they can keep expanding.",
    focusFamilies: ["AVoIP", "Matrix", "HDBaseT"],
    preferredCardIds: ["scale-distribution", "split-a-signal", "extend-a-signal"],
    preferredPitchIds: ["networkhd", "ranges", "synergy"],
    nextRoute: WM_ROUTES.proposal,
  },
];

export function findSalesMotion(id?: string | null): SalesMotion | undefined {
  const key = tidy(id).toLowerCase();
  if (!key) return undefined;
  return SALES_MOTIONS.find((item) => item.id === key);
}

export function findSalesPitchModule(id?: string | null): SalesPitchModule | undefined {
  const key = tidy(id).toLowerCase();
  if (!key) return undefined;
  return SALES_PITCH_MODULES.find((item) => item.id === key);
}

export function labelSalesRoute(route: string): string {
  if (route === WM_ROUTES.catalog) return "Catalog";
  if (route === WM_ROUTES.compare) return "Competitor Compare";
  if (route === WM_ROUTES.proposal) return "Proposal Builder";
  if (route === WM_ROUTES.roomWizard) return "Room Wizard";
  if (route === WM_ROUTES.guru) return "Guru";
  if (route === WM_ROUTES.training) return "Training Hub";
  if (route === WM_ROUTES.productIntelligence) return "Product Intelligence";
  return "Next tool";
}

function buildRoomBlob(room?: RoomTemplateScenario | null): string {
  if (!room) return "";
  return [
    room.roomType,
    room.vertical,
    room.summary,
    room.story,
    room.designPurpose,
    ...room.useCases,
    ...room.sourceTypes,
    ...room.outputTypes,
    ...room.recommendedFamilies,
    ...room.includedSystems,
  ]
    .join(" ")
    .toLowerCase();
}

function buildProjectBlob(project?: StoredProject | null): string {
  if (!project) return "";
  return [
    project.name,
    project.customer,
    project.site,
    project.roomName,
    project.notes,
    project.discovery?.workflowTrack,
    project.discovery?.applicationType,
    project.discovery?.customerOutcome,
    project.discovery?.featureRequirements,
    project.template?.application,
    project.template?.summary,
  ]
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export function recommendSalesConversationCards(input: {
  room?: RoomTemplateScenario | null;
  motion?: SalesMotion | null;
  project?: StoredProject | null;
  limit?: number;
}): SalesConversationCard[] {
  const roomBlob = buildRoomBlob(input.room);
  const projectBlob = buildProjectBlob(input.project);
  const roomFamilies = new Set(
    compact(
      [
        ...(input.room?.recommendedFamilies || []),
        ...(input.motion?.focusFamilies || []),
        ...(input.project?.template?.recommendedFamilies || []),
        ...(input.project?.discovery?.recommendedFamilies || []),
      ],
      12,
    ).map(normalizeKey),
  );

  return [...SALES_CONVERSATION_CARDS]
    .map((card) => {
      let score = 0;

      for (const family of card.recommendedFamilies) {
        if (roomFamilies.has(normalizeKey(family))) {
          score += 14;
        }
      }

      if (input.motion?.preferredCardIds.includes(card.id)) {
        score += 12;
      }

      const blob = [
        card.title,
        card.outcome,
        card.opener,
        ...card.qualificationQuestions,
        ...card.wyrestormAngles,
        ...card.keepConversationMoving,
      ]
        .join(" ")
        .toLowerCase();

      if (roomBlob && blob.includes("wireless") && /meeting|classroom|boardroom|seminar|uc/i.test(roomBlob)) {
        score += 8;
      }
      if (roomBlob && blob.includes("scale") && /venue|sports bar|command|control|showroom|sanctuary|hotel/i.test(roomBlob)) {
        score += 8;
      }
      if (roomBlob && blob.includes("switch") && input.room && input.room.ioProfile.sourceCount >= 4) {
        score += 6;
      }
      if (roomBlob && blob.includes("extend") && input.room && input.room.ioProfile.displayCount <= 2) {
        score += 5;
      }
      if (projectBlob && blob.includes("support") && /support|simple|confidence|refresh/i.test(projectBlob)) {
        score += 5;
      }

      return { card, score };
    })
    .sort((left, right) => right.score - left.score || left.card.title.localeCompare(right.card.title))
    .map((item) => item.card)
    .slice(0, Math.max(1, input.limit ?? 3));
}

export function recommendSalesPitchModules(input: {
  room?: RoomTemplateScenario | null;
  motion?: SalesMotion | null;
  project?: StoredProject | null;
  limit?: number;
}): SalesPitchModule[] {
  const families = compact([
    ...(input.motion?.focusFamilies || []),
    ...(input.room?.recommendedFamilies || []),
    ...(input.project?.template?.recommendedFamilies || []),
    ...(input.project?.discovery?.recommendedFamilies || []),
  ], 8);

  const ids = compact([
    ...(input.motion?.preferredPitchIds || []),
    ...families.map((family) => pitchIdForFamily(family)),
    "wyrestorm",
  ], Math.max(2, input.limit ?? 2));

  return ids
    .map((id) => findSalesPitchModule(id))
    .filter((item): item is SalesPitchModule => Boolean(item))
    .slice(0, Math.max(1, input.limit ?? 2));
}

export const SALES_CONVERSATION_CARDS: SalesConversationCard[] = [
  {
    id: "extend-a-signal",
    title: "Extend a signal",
    outcome: "Distance-led AV conversations",
    opener:
      "When the real problem is distance, do not open with the SKU. Start with what needs to get from point A to point B, at what quality, and with what level of control.",
    qualificationQuestions: [
      "How far does the signal need to travel today, and is that likely to grow later?",
      "Is the customer only extending video, or do they also need USB, audio, or control in the same conversation?",
      "Is this a single source-to-display route, or could the brief evolve into multiple endpoints?"
    ],
    wyrestormAngles: [
      "Position WyreStorm as having a path from straightforward HDBaseT extension to scalable NetworkHD distribution, so the customer does not need to swap brands when scope grows.",
      "Lead with practical deployment language: reliable extension, cleaner installs, and fewer support headaches at handover.",
      "Use resolution, distance, USB, and control support as proof points only after the customer agrees the outcome is the right one."
    ],
    keepConversationMoving: [
      "Once distance is clear, move the conversation to endpoint count.",
      "If the customer mentions future expansion, bridge straight into NetworkHD rather than overselling a one-room product.",
      "If control matters, bring in RS-232, IR, LAN, or controller support as the next layer of value."
    ],
    sampleSkus: ["EX-70-H2", "SW-510-TX", "NHD-500-TX"],
    recommendedFamilies: ["HDBaseT", "NetworkHD"],
    route: WM_ROUTES.CATALOG,
  },
  {
    id: "split-a-signal",
    title: "Split a signal",
    outcome: "One source to more than one destination",
    opener:
      "If one source needs to feed several destinations, frame the conversation around coverage and control, not just duplication.",
    qualificationQuestions: [
      "How many displays need the source now, and could more be added later?",
      "Do all displays show the same content, or will routing flexibility become important?",
      "Does the customer also need local outputs, mirrored feeds, or downstream room expansion?"
    ],
    wyrestormAngles: [
      "Position WyreStorm as a brand that can start with a simple distribution story and step into switching or matrix control when the brief matures.",
      "Lead with a cleaner path for the installer and a clearer upgrade story for the customer.",
      "If the requirement becomes less about splitting and more about routing, use that to transition into matrix or NetworkHD."
    ],
    keepConversationMoving: [
      "Ask whether every display truly needs the same content all the time.",
      "Bridge from signal distribution into room count and source count to avoid underselling the solution.",
      "Use the conversation to qualify whether the customer wants convenience now or flexibility over time."
    ],
    sampleSkus: ["MX-0808-H2A-MK2", "MX-0808-KIT-V2"],
    recommendedFamilies: ["Switching and Control", "HDBaseT"],
    route: WM_ROUTES.CATALOG,
  },
  {
    id: "switch-between-sources",
    title: "Switch between sources",
    outcome: "Room control and source-selection conversations",
    opener:
      "When the customer says they need to switch between sources, lead with room simplicity and user confidence before you talk about signal format.",
    qualificationQuestions: [
      "How many sources need to be available to the user at the table or lectern?",
      "Does the room also need USB, presentation input, or collaboration workflows alongside switching?",
      "Is the decision being made by a technical operator, or by everyday users who need it to feel effortless?"
    ],
    wyrestormAngles: [
      "Use Synergy and matrix language to position WyreStorm around cleaner room workflows, not just port counts.",
      "Promote the idea of one platform handling switching, transport, and room-readiness together.",
      "If the room is likely to be standardized across more spaces, position repeatability and supportability as key value."
    ],
    keepConversationMoving: [
      "Bridge from source count into how the user actually starts or runs the room.",
      "If USB-C, wireless, or conferencing appears, transition toward Synergy or Apollo rather than staying in generic switching language.",
      "If the customer starts comparing by price only, move the conversation back to user friction and room adoption."
    ],
    sampleSkus: ["SW-510-TX", "MX-0808-H2A-MK2"],
    recommendedFamilies: ["Switching and Control", "Presentation and UC"],
    route: WM_ROUTES.SALES,
  },
  {
    id: "wireless-collaboration",
    title: "Present and collaborate wirelessly",
    outcome: "Meeting-room adoption conversations",
    opener:
      "When the customer cares about smoother meetings, talk about fewer barriers to sharing and collaboration before you talk about standards.",
    qualificationQuestions: [
      "Is the priority simple presentation, wireless conferencing, or a broader BYOD/BYOM workflow?",
      "How many user types need to connect, and what devices do they typically bring into the room?",
      "Is the room being judged on technical capability, or on how quickly users can get started?"
    ],
    wyrestormAngles: [
      "Position Apollo around confidence in the meeting experience: fewer dongles, less hesitation, and a cleaner first impression in the room.",
      "Use workflow language such as share, present, switch, and collaborate rather than feature-stacking too early.",
      "If the brief grows beyond simple casting, connect Apollo back into the wider WyreStorm switching and transport story."
    ],
    keepConversationMoving: [
      "Ask what normally slows the room down today.",
      "Bridge from sharing into USB and conferencing if hybrid meetings are part of the use case.",
      "Move from convenience into standardization if the customer has multiple rooms to refresh."
    ],
    sampleSkus: ["APO-DG2"],
    recommendedFamilies: ["Presentation and UC", "Switching and Control"],
    route: WM_ROUTES.TRAINING,
  },
  {
    id: "scale-distribution",
    title: "Scale AV distribution",
    outcome: "Multi-room and platform conversations",
    opener:
      "When the customer is thinking beyond one room, position the platform before the endpoint. That is where NetworkHD becomes easier to understand and easier to sell.",
    qualificationQuestions: [
      "Is this only one room today, or does the customer already know they will expand to more endpoints or spaces?",
      "Does the customer need centralized control, network isolation, or simpler rollout across multiple rooms?",
      "Are they trying to solve a one-off technical problem, or create a repeatable AV standard?"
    ],
    wyrestormAngles: [
      "Position NetworkHD around scale, consistency, and a cleaner path from today's deployment to tomorrow's estate.",
      "Use controller-led setup and network-ready language to build confidence without making the conversation feel too technical.",
      "Keep the value story outcome-led: more rooms, cleaner support, better control of distributed AV."
    ],
    keepConversationMoving: [
      "Bridge from room count into management and support effort.",
      "If the customer is nervous about complexity, return to the benefit of a repeatable platform.",
      "Move from architecture into real project examples once the customer accepts the scaling story."
    ],
    sampleSkus: ["NHD-500-TX", "NHD-CTL-PRO-V2"],
    recommendedFamilies: ["NetworkHD"],
    route: WM_ROUTES.PRODUCT_INTELLIGENCE,
  },
];

export const SALES_PITCH_MODULES: SalesPitchModule[] = [
  {
    id: "wyrestorm",
    title: "Position WyreStorm",
    eyebrow: "Company elevator pitch",
    elevatorPitch:
      "WyreStorm gives sales teams a complete AV conversation: extend signals, switch sources, distribute over the network, support collaboration, and keep growing the solution without abandoning the platform.",
    leadWith: [
      "Lead with practical AV outcomes, not isolated part numbers.",
      "Position WyreStorm as a joined-up portfolio that helps the customer move from a single room problem into a wider standard if the opportunity grows.",
      "Use confidence language: easier conversations, clearer system paths, and better support for non-specialist users."
    ],
    proofPoints: [
      "Coverage from HDBaseT extension through NetworkHD, switching, Apollo collaboration, and video wall workflows.",
      "Enough breadth to sell the right next step without handing the customer to another brand as the brief develops.",
      "Strong support story for salespeople who need an AV expert at their side during the conversation."
    ],
    keepConversationMoving: [
      "Ask whether the customer is solving one pain point or standardizing a broader environment.",
      "Bridge from the company story into the right product family once the outcome is clear.",
      "When confidence is low, simplify the message back to what the room needs to do for the user."
    ],
    relatedFamilies: ["HDBaseT", "NetworkHD", "Switching and Control", "Presentation and UC"],
    sampleSkus: ["SW-510-TX", "NHD-500-TX", "APO-DG2"],
    route: WM_ROUTES.TOOLS,
  },
  {
    id: "networkhd",
    title: "NetworkHD / NHD",
    eyebrow: "Scalable AV over network",
    elevatorPitch:
      "NetworkHD is the WyreStorm conversation for scalable AV distribution: move from room-by-room deployment to estate-wide distribution with a platform that stays manageable, repeatable, and easier to support.",
    leadWith: [
      "Lead with scale and repeatability, not raw technical jargon.",
      "Position NHD when the customer wants a system that can grow without starting again.",
      "Use controller and network isolation language to reassure the customer that growth does not need to mean chaos."
    ],
    proofPoints: [
      "Strong fit for multi-endpoint, multi-room, and network-based AV distribution conversations.",
      "Controller-led setup helps keep the story manageable for salespeople and customers alike.",
      "A better story when the opportunity is about platform value, not just a one-box transaction."
    ],
    keepConversationMoving: [
      "Ask how many endpoints the customer can already see on the horizon.",
      "Bridge into control, supportability, and expansion rather than staying at encoder / decoder level.",
      "If the customer starts with one room, position NHD as the safe path when the estate expands."
    ],
    relatedFamilies: ["NetworkHD"],
    sampleSkus: ["NHD-500-TX", "NHD-CTL-PRO-V2"],
    route: WM_ROUTES.SALES,
  },
  {
    id: "synergy",
    title: "Synergy",
    eyebrow: "Switching and room workflow",
    elevatorPitch:
      "Synergy is the WyreStorm story for easier switching, cleaner room workflows, and stronger meeting-room usability, especially when USB, presentation, and everyday user experience all matter at the same time.",
    leadWith: [
      "Lead with fewer barriers for the user: simpler switching, better presentation flow, and cleaner room starts.",
      "Position Synergy when the conversation is about how the room feels to use, not just what it can technically pass.",
      "Use it when USB and collaboration need to sit alongside transport and switching."
    ],
    proofPoints: [
      "Good fit for rooms where source switching, presentation, and user confidence all matter.",
      "Lets the salesperson connect technical capability to a better room experience.",
      "Creates a cleaner bridge between switching, USB workflow, and AV control."
    ],
    keepConversationMoving: [
      "Ask who actually uses the room day to day.",
      "Bridge from source count into user friction and room-readiness.",
      "If the opportunity broadens, connect Synergy back to the wider WyreStorm platform."
    ],
    relatedFamilies: ["Switching and Control", "Presentation and UC"],
    sampleSkus: ["SW-510-TX", "MX-0808-H2A-MK2"],
    route: WM_ROUTES.CATALOG,
  },
  {
    id: "apollo",
    title: "Apollo",
    eyebrow: "Presentation and UC story",
    elevatorPitch:
      "Apollo is the WyreStorm conversation for sharing content and supporting collaboration with less friction, helping customers move from technical enablement into smoother, more confident meeting-room behaviour.",
    leadWith: [
      "Lead with speed to share and speed to start the meeting.",
      "Position Apollo when the customer cares about participation, convenience, and adoption more than raw AV architecture.",
      "Use Apollo to give the salesperson a practical answer to wireless collaboration and USB-C conversation starters."
    ],
    proofPoints: [
      "Strong fit for wireless presentation and conferencing-led room conversations.",
      "Helps turn a technical sale into a user workflow sale.",
      "Works best when the customer values fewer adapters, simpler starts, and cleaner collaboration."
    ],
    keepConversationMoving: [
      "Ask what currently slows the room down.",
      "Bridge from sharing into conferencing or USB workflow if hybrid meetings are involved.",
      "If the customer has several spaces, move from convenience into room standardization."
    ],
    relatedFamilies: ["Presentation and UC", "Switching and Control"],
    sampleSkus: ["APO-DG2"],
    route: WM_ROUTES.TRAINING,
  },
  {
    id: "ranges",
    title: "WyreStorm product ranges",
    eyebrow: "Portfolio support",
    elevatorPitch:
      "WyreStorm product ranges let the salesperson keep the conversation inside one brand story: extension, switching, networked AV, collaboration, and specialist workflows like video wall can all be positioned as connected parts of one supported path.",
    leadWith: [
      "Use the ranges story when the customer is still exploring outcomes and you do not want to force a single SKU too early.",
      "Position the portfolio as a safe path from entry-level room fixes to broader rollout conversations.",
      "Keep it simple: right product family first, right SKU second."
    ],
    proofPoints: [
      "HDBaseT for extension, NetworkHD for scale, Synergy for room workflow, Apollo for collaboration, and wider switching / matrix options for routing.",
      "Lets the salesperson grow confidence without pretending to be the final technical authority on every call.",
      "Supports the wider Wingman promise: an AV expert in the sales conversation when confidence matters most."
    ],
    keepConversationMoving: [
      "Ask what the room needs to do before narrowing to one range.",
      "Bridge from product family into sample SKUs only when the outcome is agreed.",
      "Use Training Hub and Product Intelligence when the salesperson needs more evidence before closing the story."
    ],
    relatedFamilies: ["HDBaseT", "NetworkHD", "Switching and Control", "Presentation and UC"],
    sampleSkus: ["EX-70-H2", "NHD-500-TX", "SW-510-TX", "APO-DG2"],
    route: WM_ROUTES.TRAINING,
  },
];
