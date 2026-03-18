export type SalesProcessStep = {
  id: string;
  stage: string;
  title: string;
  description: string;
  actionLabel: string;
  to: string;
};

export type SalesHintTone = "cyan" | "amber" | "green";

export type SalesHintCard = {
  id: string;
  title: string;
  promptLabel: string;
  prompt: string;
  guidance: string;
  actionLabel: string;
  to: string;
  tone: SalesHintTone;
};

export type SalesToolCue = {
  whenToUse: string;
  repeatableLine: string;
};

export const SALES_PROCESS_STEPS: SalesProcessStep[] = [
  {
    id: "qualify",
    stage: "Qualify",
    title: "Understand the customer outcome",
    description:
      "Capture the business goal, room context, and timeline before the conversation gets stuck in product detail.",
    actionLabel: "Capture brief",
    to: "/app/tools/import-intake",
  },
  {
    id: "shape",
    stage: "Shape",
    title: "Build the right first-pass solution",
    description:
      "Guide the rep toward a sensible system direction using room logic, templates, and solution patterns.",
    actionLabel: "Build room system",
    to: "/app/tools/room-wizard",
  },
  {
    id: "position",
    stage: "Position",
    title: "Handle competitors and objections",
    description:
      "Translate incumbent products into a safe Wingman direction and explain the commercial fit with confidence.",
    actionLabel: "Match competitor",
    to: "/app/tools/compare",
  },
  {
    id: "handoff",
    stage: "Handoff",
    title: "Send a safe next step",
    description:
      "Turn the recommendation into a customer-safe summary with the right assumptions and exclusions called out.",
    actionLabel: "Create quote pack",
    to: "/app/tools/proposal",
  },
];

export const SALES_HINT_CARDS: SalesHintCard[] = [
  {
    id: "outcome",
    title: "Start with the outcome",
    promptLabel: "Ask",
    prompt: "What has to work better for the customer after this project is finished?",
    guidance:
      "This keeps the conversation rooted in business value instead of jumping straight into boxes and specs.",
    actionLabel: "Capture brief",
    to: "/app/tools/import-intake",
    tone: "cyan",
  },
  {
    id: "confidence",
    title: "De-risk the recommendation",
    promptLabel: "Say",
    prompt: "Let€™s match the requirement first, then I€™ll show you the safest solution direction.",
    guidance:
      "Use this when the customer mentions another brand, an installed system, or asks for a like-for-like answer.",
    actionLabel: "Match competitor",
    to: "/app/tools/compare",
    tone: "amber",
  },
  {
    id: "next-step",
    title: "Land the next step",
    promptLabel: "Say",
    prompt: "I€™ll turn this into a customer-safe summary with the assumptions clearly called out.",
    guidance:
      "This helps the rep move from design discussion into pricing, proposal, or internal approval without overpromising.",
    actionLabel: "Create quote pack",
    to: "/app/tools/proposal",
    tone: "green",
  },
];

export const SALES_ACTION_LINES: Record<string, string> = {
  "new-opportunity":
    "Let€™s capture the outcome, room, and timeline before we talk products.",
  "competitor-match":
    "Let€™s match the requirement first, then compare the safest Wingman direction.",
  "build-room":
    "Let€™s turn this room type into a practical first-pass system.",
  "quote-pack":
    "I€™ll package this into a customer-safe summary with the assumptions called out.",
  "ask-wingman":
    "Let€™s sanity-check the recommendation before we send it on.",
};

export const SALES_TOOL_CUES: Record<string, SalesToolCue> = {
  guru: {
    whenToUse: "When you need a quick second opinion during the conversation.",
    repeatableLine:
      "Let€™s sense-check the best-fit direction before we commit to a recommendation.",
  },
  catalogue: {
    whenToUse: "When the customer wants options, ranges, or product families explained clearly.",
    repeatableLine:
      "I€™ll narrow this down to the options that fit the room and the outcome.",
  },
  videowall: {
    whenToUse: "When the opportunity is display-led and layout or visual impact matters.",
    repeatableLine:
      "Let€™s map the wall size, format, and supporting system before we lock in hardware.",
  },
  "competitor-compare": {
    whenToUse: "When an incumbent brand, competitor SKU, or objection appears early.",
    repeatableLine:
      "We can match the key requirement first and then explain where the better fit sits.",
  },
  "product-intelligence": {
    whenToUse: "When you need evidence behind a claim before repeating it externally.",
    repeatableLine:
      "I€™ll verify the approved detail so we stay accurate and commercially safe.",
  },
  training: {
    whenToUse: "When the rep needs product confidence or a stronger talk track before the next call.",
    repeatableLine:
      "Let€™s build the confidence to explain this clearly and consistently.",
  },
};
