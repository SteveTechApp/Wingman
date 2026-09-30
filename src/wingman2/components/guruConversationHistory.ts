export type GuruStoredMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  time: string;
};

export type GuruConversation = {
  id: string;
  updatedAt: number;
  messages: GuruStoredMessage[];
};

export type GuruHistory = {
  activeId: string;
  conversations: GuruConversation[];
};

const STORAGE_KEY = "wingman-guru-conversations-v1";
const MAX_CONVERSATIONS = 20;
const MAX_MESSAGES = 80;

export function createGuruConversation(openingMessage: GuruStoredMessage): GuruConversation {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    updatedAt: Date.now(),
    messages: [openingMessage],
  };
}

export function guruConversationTitle(conversation: GuruConversation): string {
  const question = conversation.messages.find((message) => message.role === "user")?.content.trim();
  return question ? question.replace(/\s+/g, " ").slice(0, 72) : "New conversation";
}

export function loadGuruHistory(openingMessage: GuruStoredMessage): GuruHistory {
  const fresh = createGuruConversation(openingMessage);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<GuruHistory> | null;
    const conversations = (Array.isArray(parsed?.conversations) ? parsed.conversations : [])
      .filter((item): item is GuruConversation =>
        Boolean(item && typeof item.id === "string" && Number.isFinite(item.updatedAt) && Array.isArray(item.messages)))
      .map((item) => ({
        ...item,
        messages: item.messages
          .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
          .slice(-MAX_MESSAGES)
          .map((message) => message.content === "Checking Guru knowledge..."
            ? { ...message, content: "That answer was interrupted. Ask me again to continue." }
            : message),
      }))
      .filter((item) => item.messages.length > 0)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_CONVERSATIONS);
    if (!conversations.length) return { activeId: fresh.id, conversations: [fresh] };
    const activeId = conversations.some((item) => item.id === parsed?.activeId) ? parsed!.activeId! : conversations[0].id;
    return { activeId, conversations };
  } catch {
    return { activeId: fresh.id, conversations: [fresh] };
  }
}

export function saveGuruHistory(history: GuruHistory): void {
  try {
    const conversations = history.conversations
      .filter((item) => item.messages.some((message) => message.role === "user") || item.id === history.activeId)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_CONVERSATIONS)
      .map((item) => ({ ...item, messages: item.messages.slice(-MAX_MESSAGES) }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeId: history.activeId, conversations }));
  } catch {
    // History is optional when storage is unavailable or full.
  }
}
