export type SalesConversationToneId = "trade" | "user" | "consultant";

export type SalesConversationContext =
  | "salesHelper"
  | "callCards"
  | "discovery"
  | "finder"
  | "compare"
  | "productPitch"
  | "productFamilies"
  | "templates"
  | "videowall";

export type SalesConversationToneOption = {
  id: SalesConversationToneId;
  label: string;
  shortDescription: string;
};

type SalesConversationContextCopy = {
  subject: string;
  nextStep: string;
};

export type SalesConversationToneCopy = {
  title: string;
  opener: string;
  followUp: string;
  handoff: string;
};

export const SALES_CONVERSATION_TYPE_STORAGE_KEY = "wingman:sales-conversation-type";

export const LEGACY_SALES_CONVERSATION_STORAGE_KEYS = [
  "wingman:sales-mode",
  "wingman.salesLanguageMode.v1",
];

export const DEFAULT_SALES_CONVERSATION_TONE_ID: SalesConversationToneId = "trade";

export const salesConversationToneOptions: SalesConversationToneOption[] = [
  {
    id: "trade",
    label: "Sell to Trade",
    shortDescription: "Dealer and installer language.",
  },
  {
    id: "user",
    label: "Sell to User",
    shortDescription: "Outcome and experience language.",
  },
  {
    id: "consultant",
    label: "Sell to Technical Consultant",
    shortDescription: "Specification and risk language.",
  },
];

const contextCopy: Record<SalesConversationContext, SalesConversationContextCopy> = {
  salesHelper: {
    subject: "the customer call",
    nextStep: "Sales Helper notes or Call Cards",
  },
  callCards: {
    subject: "this call subject",
    nextStep: "the selected Wingman workflow",
  },
  discovery: {
    subject: "the room or application",
    nextStep: "Discovery or Finder",
  },
  finder: {
    subject: "the technical requirement",
    nextStep: "Finder results or pre-sales validation",
  },
  compare: {
    subject: "the comparison",
    nextStep: "Compare output or a WyreStorm specialist",
  },
  productPitch: {
    subject: "the product fit",
    nextStep: "Product Pitch or proposal wording",
  },
  productFamilies: {
    subject: "the system family",
    nextStep: "Product Pitch or Finder",
  },
  templates: {
    subject: "the room template",
    nextStep: "Template review or Proposal",
  },
  videowall: {
    subject: "the wall behaviour",
    nextStep: "Video Wall Builder or pre-sales validation",
  },
};

export function normalizeSalesConversationToneId(value: unknown): SalesConversationToneId {
  if (value === "warm" || value === "problem") {
    return "trade";
  }

  if (value === "value") {
    return "user";
  }

  if (value === "expert" || value === "handoff") {
    return "consultant";
  }

  const match = salesConversationToneOptions.find((option) => option.id === value);

  return match?.id ?? DEFAULT_SALES_CONVERSATION_TONE_ID;
}

export function buildSalesConversationToneCopy(
  context: SalesConversationContext,
  toneId: SalesConversationToneId,
): SalesConversationToneCopy {
  const copy = contextCopy[context];

  if (toneId === "user") {
    return {
      title: "Sell the user experience.",
      opener: `What should people be able to do with ${copy.subject} without thinking about the technology?`,
      followUp: "What is frustrating users today, and what would make the space feel easier or more reliable?",
      handoff: `Capture the user outcome in plain language, then move to ${copy.nextStep}.`,
    };
  }

  if (toneId === "consultant") {
    return {
      title: "Sell the design logic.",
      opener: `Which parts of ${copy.subject} are fixed requirements, and which parts are still open for validation?`,
      followUp: "What are the required I/O, resolution, USB, latency, audio, control and network constraints?",
      handoff: "Capture hard requirements, assumptions and risks, then pass the summary to WyreStorm experts for validation.",
    };
  }

  return {
    title: "Sell the route to a dealer or installer.",
    opener: `For ${copy.subject}, what matters most to the trade: quick quoting, clean installation, supportability, or margin?`,
    followUp: "What would make this easier to specify, install, hand over and support?",
    handoff: `Capture install constraints and commercial priorities, then move to ${copy.nextStep}.`,
  };
}
