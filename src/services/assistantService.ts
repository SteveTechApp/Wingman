type ChatMessageInput =
  | string
  | {
      message?: string;
      text?: string;
      prompt?: string;
    };

type ChatSendResult = {
  text: string;
};

type UserProfileLike = {
  name?: string;
  companyName?: string;
};

type ChatHistoryEntry = {
  role: "user" | "model";
  content: string;
};

function normalizePrompt(input: ChatMessageInput): string {
  if (typeof input === "string") return input.trim();
  if (input && typeof input === "object") {
    return String(input.message ?? input.text ?? input.prompt ?? "").trim();
  }
  return "";
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function suggestReply(prompt: string, userProfile?: UserProfileLike): string {
  const text = prompt.toLowerCase();
  const company = userProfile?.companyName?.trim();
  const name = userProfile?.name?.trim();
  const prefix = company ? `For ${company}, ` : "";

  if (!text) {
    return "Share a project brief, product requirement, or design challenge and I will suggest the best Wingman workflow next step.";
  }

  if (hasAny(text, ["video wall", "videowall", "led wall", "lcd wall"])) {
    return `${prefix}start with Video Wall Designer, confirm wall dimensions and viewing distance, then move to Proposal Builder for commercial packaging.`;
  }

  if (hasAny(text, ["hdbaset", "distance", "cat6", "long run", "long distance"])) {
    return `${prefix}HDBaseT is usually a strong fit for longer point-to-point transport. Capture distance and endpoint counts in Discovery, then shortlist in Product Catalog.`;
  }

  if (hasAny(text, ["av over ip", "avoip", "networkhd", "nhd"])) {
    return `${prefix}this looks like an AVoIP style requirement. Prioritize network design checks (IGMP/QoS/uplinks), then build a staged BOM in Proposal Builder.`;
  }

  if (hasAny(text, ["proposal", "quote", "pricing", "commercial", "handoff"])) {
    return `${prefix}open Proposal Builder after Discovery data is complete. Include assumptions, exclusions, and BOM summary so the readiness score reaches commercial-ready status.`;
  }

  if (hasAny(text, ["competitor", "replacement", "alternative", "vs ", "versus"])) {
    return `${prefix}use Competitor Comparison to map competitor SKU context to WyreStorm direction, then save it into the active project for proposal positioning.`;
  }

  if (hasAny(text, ["usb-c", "byod", "teams", "zoom", "meeting room"])) {
    return `${prefix}this reads like a collaboration room scenario. Start in Discovery, validate USB and switching needs, then evaluate Apollo and room workflow options.`;
  }

  const greeting = name ? `${name}, ` : "";
  return `${greeting}${prefix}start with Discovery Wizard to structure requirements, then continue to Product Catalog and Proposal Builder based on recommended families.`;
}

export async function askAssistant(prompt: string): Promise<string> {
  return suggestReply(prompt);
}

export function createChatSession(userProfile?: UserProfileLike): any {
  const history: ChatHistoryEntry[] = [];

  return {
    history,
    sendMessage: async (message: ChatMessageInput): Promise<ChatSendResult> => {
      const prompt = normalizePrompt(message);
      history.push({ role: "user", content: prompt });

      const text = suggestReply(prompt, userProfile);
      history.push({ role: "model", content: text });

      return { text };
    },
  };
}
