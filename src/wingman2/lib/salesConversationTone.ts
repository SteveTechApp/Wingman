export type SalesConversationToneId = "warm" | "problem" | "value" | "handoff";

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

export const DEFAULT_SALES_CONVERSATION_TONE_ID: SalesConversationToneId = "warm";

export const salesConversationToneOptions: SalesConversationToneOption[] = [
  {
    id: "warm",
    label: "Warm opener",
    shortDescription: "Friendly, low-pressure start.",
  },
  {
    id: "problem",
    label: "Problem first",
    shortDescription: "Start with the pain point.",
  },
  {
    id: "value",
    label: "Value-led",
    shortDescription: "Lead with the outcome.",
  },
  {
    id: "handoff",
    label: "Expert handoff",
    shortDescription: "Capture enough for pre-sales.",
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
  const match = salesConversationToneOptions.find((option) => option.id === value);

  return match?.id ?? DEFAULT_SALES_CONVERSATION_TONE_ID;
}

export function buildSalesConversationToneCopy(
  context: SalesConversationContext,
  toneId: SalesConversationToneId,
): SalesConversationToneCopy {
  const copy = contextCopy[context];

  if (toneId === "problem") {
    return {
      title: "Open on the customer pain point.",
      opener: `What is the main thing about ${copy.subject} that needs to be easier, cleaner, or more reliable?`,
      followUp: "What is causing frustration today?",
      handoff: "Capture the pain point, then leave detailed design validation for WyreStorm experts.",
    };
  }

  if (toneId === "value") {
    return {
      title: "Start with the outcome.",
      opener: `Let us start with the result you want from ${copy.subject}, then we can choose the simplest route.`,
      followUp: "What would make this feel like a successful project for the user or dealer?",
      handoff: `Tie the language to the outcome, then move to ${copy.nextStep}.`,
    };
  }

  if (toneId === "handoff") {
    return {
      title: "Gather enough for expert review.",
      opener: `I will capture the basics on ${copy.subject} so our WyreStorm specialists can validate the right path.`,
      followUp: "What do we know about sources, displays, USB, audio, control, distance, network, and budget?",
      handoff: "Do not force the answer. Capture unknowns and pass the summary to pre-sales.",
    };
  }

  return {
    title: "Keep the opening easy.",
    opener: `Can I get a quick feel for ${copy.subject} before we talk products?`,
    followUp: "What should people be able to do without thinking about the technology?",
    handoff: `Capture the headline need, then move to ${copy.nextStep}.`,
  };
}
