import type {
  ProductPositioningCard,
  WingmanApplicationContext,
  WingmanAudience,
  WingmanCallMode,
} from "../types/productPositioning";

export type SalesPositioningProduct = {
  sku: string;
  title: string;
  family?: string;
  category?: string;
  whatItIs?: string;
  summary?: string;
  realWorld?: string;
  customerValue?: string;
  howToTalk?: string;
  talkingPoints?: string[];
  applications?: string[];
  features?: string[];
};

export type ProductSalesNarrative = {
  heading: string;
  sayThis: string;
  whyItFits: string;
  applicationAngle: string;
  audienceAngle: string;
  callModeAngle: string;
  proofPoints: string[];
  askNext: string[];
  checkBeforeQuoting: string[];
  avoidSaying: string[];
  followUpWording: string;
  confidenceNote: string;
};

const AUDIENCE_ANGLE: Record<WingmanAudience, string> = {
  DISTRIBUTOR: "Give the reseller a simple opening question, then ask what the customer is actually trying to do before naming a SKU.",
  DEALER: "Make the practical install checks visible: source count, display behaviour, cable route, USB, audio, control and handover.",
  INTEGRATOR: "Talk in terms of signal path, dependencies and commissioning risk before treating the product as quote-ready.",
  CONSULTANT: "Frame the product as an architecture choice with assumptions, constraints and evidence, not just a feature match.",
  END_USER: "Lead with what people in the room will find easier or more reliable, and keep AV terms to a minimum.",
  INTERNAL_SALES: "Capture the missing information and escalation points so pre-sales can validate the recommendation quickly.",
};

const APPLICATION_ANGLE: Record<WingmanApplicationContext, string> = {
  GENERAL: "Keep the wording broad until the room, source path and user workflow are confirmed.",
  MEETING_ROOM: "For a meeting room, frame the value around people joining calls, sharing content and using room devices without support calls.",
  EDUCATION: "For education, frame the value around repeatable teaching, clear display behaviour and a room that works for different staff every day.",
  HOSPITALITY_RETAIL: "For hospitality or retail, frame the value around staff being able to route the right content to the right screens without making the system hard to operate.",
  CONTROL_ROOM: "For monitoring or control rooms, frame the value around seeing the right sources clearly and giving operators confidence before they switch or respond.",
  VIDEO_WALL: "For a wall or signage job, frame the value around wall behaviour first: one canvas, duplicated content, independent zones or multiview.",
  DISTRIBUTED_AV: "For distributed AV, frame the value around where sources and displays live, how many endpoints are needed and who owns the network.",
};

const APPLICATION_CHECKS: Record<WingmanApplicationContext, string[]> = {
  GENERAL: ["Confirm the room or market before writing customer-facing wording."],
  MEETING_ROOM: ["Confirm USB host ownership.", "Confirm camera, microphone and speaker path.", "Confirm Teams or Zoom platform expectations."],
  EDUCATION: ["Confirm teaching source count.", "Confirm capture or streaming need.", "Confirm who supports the room after handover."],
  HOSPITALITY_RETAIL: ["Confirm display zones and staff control method.", "Confirm content sources and opening hours support expectations."],
  CONTROL_ROOM: ["Confirm latency tolerance.", "Confirm operator layout and source visibility requirements."],
  VIDEO_WALL: ["Confirm wall layout and behaviour.", "Confirm source count, processing and control expectations."],
  DISTRIBUTED_AV: ["Confirm endpoint count and future expansion.", "Confirm network switch ownership and AV network design."],
};

const APPLICATION_FOLLOW_UP_LABELS: Record<WingmanApplicationContext, string> = {
  GENERAL: "AV requirement",
  MEETING_ROOM: "meeting-room use case",
  EDUCATION: "teaching-space use case",
  HOSPITALITY_RETAIL: "hospitality or retail use case",
  CONTROL_ROOM: "control-room use case",
  VIDEO_WALL: "video-wall or signage use case",
  DISTRIBUTED_AV: "distributed AV use case",
};

const CALL_MODE_ANGLE: Record<WingmanCallMode, string> = {
  INBOUND_SUPPORT: "Start with qualification. Do not answer as if the product is confirmed until the use case is clear.",
  PRODUCT_CALLOUT: "Use a short opener, then ask one useful question that reveals the project shape.",
  COMPETITOR_DISPLACEMENT: "Compare the product role and must-have functions before discussing a WyreStorm alternative.",
  PROJECT_DISCOVERY: "Capture the room/application facts first, then move into product selection.",
  TRAINING: "Explain the product by the job it performs and the checks that stop it being misused.",
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function firstClean(values: unknown[], fallback = ""): string {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }

  return fallback;
}

function uniq(values: string[], max = 6): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean))).slice(0, max);
}

function stripInstructionPrefix(value: string): string {
  const text = clean(value)
    .replace(/^use this when\s+/i, "it is worth discussing when ")
    .replace(/^position as\s+/i, "position it as ")
    .replace(/^lead with\s+/i, "lead with ")
    .replace(/\bsignal-management partner\b/gi, "source-and-display workflow option")
    .replace(/\bsignal-management conversation\b/gi, "source-and-display design discussion")
    .replace(/\bsystem conversation\b/gi, "system design")
    .replace(/\bcomplete meeting-room signal-management option\b/gi, "complete meeting-room source, USB and display workflow");

  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function productRole(product: SalesPositioningProduct, card?: ProductPositioningCard): string {
  const sku = clean(product.sku).toUpperCase();
  const text = [sku, product.title, product.family, product.category, card?.technologyType, card?.productFamily]
    .join(" ")
    .toLowerCase();

  if (sku.startsWith("NHD-") || text.includes("networkhd") || text.includes("avoip")) return "an AV-over-IP / NetworkHD product";
  if (sku.startsWith("SW-") || text.includes("presentation")) return "a presentation switching product";
  if (sku.startsWith("MX-") || text.includes("matrix")) return "a matrix or room switching product";
  if (sku.startsWith("EX-") || sku.startsWith("TX-") || sku.startsWith("RX-") || text.includes("hdbaset")) return "an extension or point-to-point transport product";
  if (sku.startsWith("APO-") || text.includes("uc") || text.includes("audio")) return "a UC / meeting-room audio product";
  if (sku.startsWith("CAM-") || text.includes("camera")) return "a camera or capture workflow product";

  return "a WyreStorm product option";
}

function naturalProblem(product: SalesPositioningProduct, card?: ProductPositioningCard): string {
  return firstClean(
    [
      card?.customerProblems?.[0],
      product.customerValue,
      product.realWorld,
      card?.oneLinePositioning,
      product.whatItIs,
      product.summary,
    ],
    "the customer has a clear AV requirement that matches this product's role",
  );
}

function naturalFit(product: SalesPositioningProduct, card?: ProductPositioningCard): string {
  return firstClean(
    [
      card?.wyrestormFit?.[0],
      card?.salientPoint,
      product.howToTalk,
      product.summary,
    ],
    `${clean(product.sku)} should only be positioned when its role, connections and limits match the customer requirement.`,
  );
}

function buildFollowUp(product: SalesPositioningProduct, card?: ProductPositioningCard, application?: WingmanApplicationContext): string {
  if (card?.followUpWording) {
    return card.followUpWording;
  }

  const appLine = application && application !== "GENERAL"
    ? ` for this ${APPLICATION_FOLLOW_UP_LABELS[application]}`
    : "";

  return `${clean(product.sku)} looks relevant${appLine}, but we should confirm the source path, display behaviour, USB/audio/control needs and any installation constraints before treating it as the recommended option.`;
}

export function buildProductSalesNarrative({
  product,
  card,
  audience,
  callMode,
  application,
}: {
  product: SalesPositioningProduct;
  card?: ProductPositioningCard;
  audience: WingmanAudience;
  callMode: WingmanCallMode;
  application: WingmanApplicationContext;
}): ProductSalesNarrative {
  const sku = clean(product.sku);
  const title = firstClean([card?.productName, product.title], sku);
  const role = productRole(product, card);
  const problem = stripInstructionPrefix(naturalProblem(product, card));
  const fit = stripInstructionPrefix(naturalFit(product, card));
  const applicationAngle = APPLICATION_ANGLE[application];
  const audienceAngle = firstClean([card?.audienceNotes?.[audience], AUDIENCE_ANGLE[audience]]);
  const callModeAngle = firstClean([card?.callModeNotes?.[callMode], CALL_MODE_ANGLE[callMode]]);
  const bestFit = card?.bestFitApplications?.length ? `Best fit examples: ${card.bestFitApplications.slice(0, 4).join(", ")}.` : "";
  const weakFit = card?.weakFitApplications?.length ? `Weak fit examples: ${card.weakFitApplications.slice(0, 3).join(", ")}.` : "";

  return {
    heading: `${sku} - ${title}`,
    sayThis: `${sku} is ${role}. ${stripInstructionPrefix(card?.oneLinePositioning ?? problem)} ${applicationAngle}`,
    whyItFits: `${fit}${bestFit ? " " + bestFit : ""}`,
    applicationAngle,
    audienceAngle,
    callModeAngle,
    proofPoints: uniq([
      card?.salientPoint ?? "",
      ...(card?.wyrestormFit ?? []),
      ...(product.talkingPoints ?? []),
      ...(product.features ?? []),
    ], 5),
    askNext: uniq([
      ...(card?.openingQuestions ?? []),
      ...(card?.qualificationQuestions ?? []),
      ...APPLICATION_CHECKS[application],
    ], 6),
    checkBeforeQuoting: uniq([
      ...(card?.reviewGates ?? []),
      ...(card?.technicalCheckQuestions ?? []),
      ...(card?.caveats ?? []),
      ...APPLICATION_CHECKS[application],
    ], 7),
    avoidSaying: uniq([
      ...(card?.disqualifiers ?? []),
      weakFit,
      "Do not call it a like-for-like answer until the customer's actual signal path and product role are confirmed.",
    ], 6),
    followUpWording: buildFollowUp(product, card, application),
    confidenceNote: card
      ? `Curated call card: ${card.dataConfidence.toLowerCase()} confidence${card.lastReviewed ? `, reviewed ${card.lastReviewed}` : ""}.`
      : "Generated from product-index text. Treat as a starting point and validate before quoting.",
  };
}
